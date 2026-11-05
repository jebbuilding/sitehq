// The browser adapter (src/platform/aws-adapter.js) against the local backend, run here in Node with a few
// stand-ins for the browser. The first half is a contract both the adapter and the tests' fake platform
// (tests/harness8src.js – what the app has always been tested on) must meet, run against each; the second half is
// what only a real backend has: rules, other people's writes arriving live, files, sign-in.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { WebSocket } from "ws";
import { startLocal } from "../local.mjs";

const read = (f) => fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8");
const adapterSource = read("src/platform/aws-adapter.js");

const cleanups = [];
test.after(async () => { for (const c of cleanups.reverse()) await c(); });

/** A page's worth of adapter: its own window, signed in with `token` (or not at all). */
function page(baseUrl, token, extra = {}) {
  const clicks = [];
  const document = { cookie: "", visibilityState: "visible", addEventListener() {}, body: { appendChild() {} }, createElement: () => { const a = { click: () => clicks.push(a), remove() {} }; return a; } };
  const window = { SITEHQ_CONFIG: { api: baseUrl + "/api", ws: baseUrl.replace(/^http/, "ws") + "/ws", devToken: token }, addEventListener() {}, ...extra };
  const timer = (fn, ms) => { const t = setTimeout(fn, ms); t.unref(); return t; }; // a page's timers must not keep the test process alive
  new Function("window", "document", "location", "WebSocket", "setTimeout", adapterSource)(window, document, new URL(baseUrl + "/owner"), WebSocket, timer);
  return { window, document, clicks, use: (n) => window.claude.use(n) };
}

/** The tests' fake platform, as a page would get it. */
function fakePage(owner) {
  const src = read("tests/harness8src.js");
  const from = src.indexOf("const fake="), to = src.indexOf("(async()=>{\n  const b=await chromium.launch();");
  assert.ok(from >= 0 && to > from, "tests/harness8src.js has changed shape");
  const html = new Function(src.slice(from, to) + "\nreturn fake;")()(owner);
  const window = {};
  new Function("window", html.replace(/^<script>/, "").replace(/<\/script>\s*$/, ""))(window);
  return { window, use: (n) => window.claude.use(n) };
}

async function until(what, check, ms = 3000) {
  const t0 = Date.now();
  for (;;) {
    const v = await check();
    if (v) return v;
    if (Date.now() - t0 > ms) assert.fail("timed out waiting for " + what);
    await new Promise((r) => setTimeout(r, 10));
  }
}
const plain = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const local = await startLocal();
cleanups.push(() => local.close());

// ---------- the contract, on both ----------
function contract(name, getDb) {
  const unsubs = [];
  test.after(() => unsubs.forEach((u) => u()));

  test(`${name}: document get, set, update, delete`, async () => {
    const db = await getDb(), ref = db.doc("talks/t1");
    assert.equal(ref.id, "t1");
    let s = await ref.get();
    assert.deepEqual([s.id, s.exists, s.data()], ["t1", false, undefined]);
    await ref.set({ title: "Ladders", items: { a: 1, b: 2 }, tags: ["x"] });
    s = await ref.get();
    assert.deepEqual([s.id, s.exists, s.data()], ["t1", true, { title: "Ladders", items: { a: 1, b: 2 }, tags: ["x"] }]);
    await ref.update({ items: { c: 3 }, done: true }); // top-level merge: items is replaced
    assert.deepEqual((await ref.get()).data(), { title: "Ladders", items: { c: 3 }, tags: ["x"], done: true });
    await ref.set({ title: "Only this" }); // set replaces everything
    assert.deepEqual((await ref.get()).data(), { title: "Only this" });
    await ref.delete();
    assert.equal((await ref.get()).exists, false);
    await db.doc("talks/made-by-update").update({ a: 1 }); // update creates a missing document
    assert.deepEqual((await db.doc("talks/made-by-update").get()).data(), { a: 1 });
    await db.doc("talks/made-by-update").delete();
  });

  test(`${name}: what data() returns is the caller's own copy`, async () => {
    const db = await getDb();
    await db.doc("plan/p1").set({ title: "Pour slab", who: ["emp1"] });
    const s = await db.doc("plan/p1").get(), d = s.data();
    d.who.push("emp2");
    d.title = "changed";
    assert.deepEqual(s.data(), { title: "Pour slab", who: ["emp1"] });
    const c = await db.collection("plan").get(), d2 = c.docs[0].data();
    d2.title = "changed";
    assert.equal(c.docs[0].data().title, "Pour slab");
    await db.doc("plan/p1").delete();
  });

  test(`${name}: collection get, where, orderBy, limit, add, doc()`, async () => {
    const db = await getDb(), col = db.collection("jobdone");
    assert.equal(col.path, "jobdone");
    assert.deepEqual((await col.get()).docs, []);
    await col.doc("a").set({ n: 3, site: "X" });
    await col.doc("b").set({ n: 1, site: "Y" });
    await col.doc("c").set({ n: 2, site: "X" });
    assert.deepEqual(plain(await col.get()), [{ id: "a", n: 3, site: "X" }, { id: "b", n: 1, site: "Y" }, { id: "c", n: 2, site: "X" }]);
    assert.deepEqual(plain(await col.where("site", "==", "X").get()).map((d) => d.id), ["a", "c"]);
    assert.deepEqual(plain(await col.orderBy("n", "asc").get()).map((d) => d.id), ["b", "c", "a"]);
    assert.deepEqual(plain(await col.orderBy("n", "desc").limit(2).get()).map((d) => d.id), ["a", "c"]);
    assert.deepEqual(plain(await col.where("site", "==", "X").orderBy("n").limit(1).get()).map((d) => d.id), ["c"]);
    const added = await col.add({ n: 9, site: "Z" });
    assert.ok(added.id && typeof added.id === "string");
    assert.deepEqual((await added.get()).data(), { n: 9, site: "Z" });
    assert.deepEqual((await col.doc(added.id).get()).data(), { n: 9, site: "Z" });
    const fresh = [col.doc(), col.doc()];
    assert.ok(fresh[0].id && fresh[0].id !== fresh[1].id, "doc() with no id makes a new one each time");
    await fresh[0].set({ n: 5 });
    assert.equal((await col.get()).docs.length, 5);
    for (const d of (await col.get()).docs) await col.doc(d.id).delete();
    assert.deepEqual((await col.get()).docs, []);
  });

  test(`${name}: subcollections are separate from their parent`, async () => {
    const db = await getDb();
    await db.doc("chats/c1").set({ name: "Chat" });
    await db.doc("msgs/c1/m/m1").set({ text: "hello", at: 1 });
    await db.collection("msgs/c1/m").doc("m2").set({ text: "again", at: 2 });
    assert.deepEqual(plain(await db.collection("msgs/c1/m").orderBy("at", "desc").limit(300).get()).map((d) => d.text), ["again", "hello"]);
    assert.ok(!plain(await db.collection("chats").get()).some((d) => d.text), "messages are not in chats");
    await db.doc("chats/c1").delete();
    assert.equal((await db.doc("msgs/c1/m/m1").get()).exists, true, "deleting a document leaves what is nested under it");
    await db.doc("msgs/c1/m/m1").delete();
    await db.doc("msgs/c1/m/m2").delete();
  });

  test(`${name}: onSnapshot on a document – the current state, then every change`, async () => {
    const db = await getDb(), ref = db.doc("talks/live"), seen = [];
    unsubs.push(ref.onSnapshot((s) => seen.push(s.exists ? s.data() : null)));
    await until("the first snapshot", () => seen.length >= 1);
    assert.equal(seen[0], null);
    await ref.set({ title: "A" });
    await until("the set", () => seen.at(-1) && seen.at(-1).title === "A");
    await ref.update({ extra: 1 });
    await until("the update", () => seen.at(-1) && seen.at(-1).extra === 1);
    assert.deepEqual(seen.at(-1), { title: "A", extra: 1 });
    await ref.delete();
    await until("the delete", () => seen.at(-1) === null);
  });

  test(`${name}: onSnapshot on a collection and on a query; unsubscribing stops it`, async () => {
    const db = await getDb(), col = db.collection("plan"), all = [], top = [];
    const stopAll = col.onSnapshot((s) => all.push(plain(s).map((d) => d.id).join()));
    unsubs.push(stopAll, col.orderBy("n", "desc").limit(1).onSnapshot((s) => top.push(plain(s).map((d) => d.id).join())));
    await until("first snapshots", () => all.length >= 1 && top.length >= 1);
    assert.deepEqual([all[0], top[0]], ["", ""]);
    await col.doc("p1").set({ n: 1 });
    await until("p1", () => all.at(-1) === "p1" && top.at(-1) === "p1");
    await col.doc("p2").set({ n: 2 });
    await until("p2", () => all.at(-1) === "p1,p2" && top.at(-1) === "p2");
    await col.doc("p2").delete();
    await until("p2 gone", () => all.at(-1) === "p1" && top.at(-1) === "p1");
    stopAll();
    const count = all.length;
    await col.doc("p3").set({ n: 3 });
    await until("p3 on the listener that is still on", () => top.at(-1) === "p3");
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(all.length, count, "nothing after unsubscribing");
    await col.doc("p1").delete();
    await col.doc("p3").delete();
  });
}

const fake = fakePage(true);
contract("the tests' fake platform", () => fake.use("db"));
const ownerPage = page(local.url, "dev:owner");
contract("adapter + local backend", () => ownerPage.use("db"));

// ---------- only on the real backend ----------
test("adapter: use() gives the app what it asks for, and null for what is not provided", async () => {
  const p = page(local.url, "dev:owner");
  const [db, user, assets, downloads, sample, other] = await Promise.all(["db", "user", "assets", "downloads", "sample", "room"].map((n) => p.use(n)));
  assert.deepEqual(Object.keys(db).sort(), ["collection", "doc"]);
  assert.deepEqual(Object.keys(db.doc("a/b")).sort(), ["collection", "delete", "get", "id", "onSnapshot", "path", "set", "update"]);
  assert.deepEqual(Object.keys(db.collection("a")).sort(), ["add", "doc", "get", "limit", "onSnapshot", "orderBy", "path", "where"]);
  assert.deepEqual([await user.id(), await user.isOwner(), await user.name()], ["owner", true, "James Bray"]);
  assert.deepEqual(Object.keys(assets).sort(), ["delete", "list", "upload"]);
  assert.deepEqual(Object.keys(downloads), ["save"]);
  assert.deepEqual([sample, other], [null, null]);
  const sam = await page(local.url, "dev:emp1").use("user");
  assert.deepEqual([await sam.id(), await sam.isOwner()], ["emp1", false]);
});

test("adapter: not signed in – every use() is null, so the app shows its sign-in message", async () => {
  for (const token of [undefined, "", "dev:nobody"]) {
    const p = page(local.url, token);
    assert.deepEqual(await Promise.all(["db", "user", "assets", "downloads", "sample"].map((n) => p.use(n))), [null, null, null, null, null], String(token));
  }
  const down = page("http://127.0.0.1:1", "dev:owner"); // nothing is listening there
  assert.equal(await down.use("db"), null);
});

test("adapter: the token can come from the sign-in screen (window.SITEHQ_AUTH), and goes in the /_blob cookie", async () => {
  let asked = 0;
  const p = page(local.url, undefined, { SITEHQ_AUTH: { token: async () => { asked++; return "dev:emp1"; } } });
  assert.equal(await (await p.use("user")).id(), "emp1");
  assert.ok(asked >= 1);
  assert.equal(p.document.cookie, "sitehq_token=dev%3Aemp1; path=/_blob; SameSite=Strict");
});

test("adapter: bad paths throw at once, as on the platform", async () => {
  const db = await ownerPage.use("db");
  const typeError = (fn, why) => assert.throws(fn, (e) => e instanceof TypeError, why);
  typeError(() => db.doc("sites"), "odd number of segments for a document");
  typeError(() => db.collection("sites/s1"), "even number of segments for a collection");
  typeError(() => db.doc("sites/has space"), "bad character");
  typeError(() => db.doc("sites//x/y"), "empty segment");
  typeError(() => db.doc(""), "empty");
  typeError(() => db.doc(undefined), "not a string");
  typeError(() => db.doc("sites/s1").collection("a/b"), "subcollection parity");
  typeError(() => db.collection("sites").doc("a/b"), "id with a slash");
  assert.equal(db.doc("sites/s1").collection("jobs").path, "sites/s1/jobs");
  assert.equal(db.doc("wfiles/emp1/f/w~emp1~x+y@z:1.2").id, "w~emp1~x+y@z:1.2");
});

test("adapter: the rules – refused reads are empty, refused writes reject invalid_argument", async () => {
  const owner = await ownerPage.use("db"), sam = await page(local.url, "dev:emp1").use("db"), sue = await page(local.url, "dev:u9").use("db");
  await owner.doc("todos/c1").set({ kind: "client", name: "Sue Jones" });
  await owner.doc("sheets/emp1").set({ name: "Sam Test" });
  await owner.doc("sheets/emp2").set({ name: "Ann Other" });
  await owner.doc("portal/u9").set({ name: "Sue Jones" });
  assert.equal((await sam.doc("todos/c1").get()).exists, false);
  assert.deepEqual((await sam.collection("todos").get()).docs, []);
  assert.equal((await sam.doc("sheets/emp2").get()).exists, false);
  assert.deepEqual(plain(await sam.collection("sheets").get()), [{ id: "emp1", name: "Sam Test" }]);
  const rejects = (p, why) => assert.rejects(p, (e) => e.code === "invalid_argument" && typeof e.message === "string", why);
  await rejects(sam.doc("todos/c1").set({ x: 1 }), "trade writes todos");
  await rejects(sam.doc("todos/c1").update({ x: 1 }), "trade updates todos");
  await rejects(sam.doc("todos/c1").delete(), "trade deletes todos");
  await rejects(sam.collection("todos").add({ x: 1 }), "trade adds to todos");
  await rejects(sam.doc("sheets/emp2/entries/a").set({ hours: 99 }), "trade writes another person's timesheet");
  await rejects(sam.doc("sites/s1").set({ name: "x" }), "trade writes shared reference data");
  await sam.doc("sheets/emp1/entries/a").set({ hours: 8 });
  assert.deepEqual((await owner.doc("sheets/emp1/entries/a").get()).data(), { hours: 8 }, "the owner reads a trade's entries");
  assert.deepEqual((await sue.doc("portal/u9").get()).data(), { name: "Sue Jones" });
  assert.equal((await sue.doc("sheets/emp1").get()).exists, false);
  assert.deepEqual((await sue.collection("sites").get()).docs, []);
  await rejects(sue.doc("chats/team").set({ x: 1 }), "client writes outside the portal");
  await rejects(owner.doc("sites/s1").set("not an object"), "bad body");
  await rejects(owner.collection("sites").where("name", ">", "a").get(), "a filter the backend does not do");
  assert.deepEqual((await owner.doc("todos/c1").get()).data(), { kind: "client", name: "Sue Jones" }, "nothing was changed");
});

test("adapter: another person's write arrives live – to those who may see it", async () => {
  const owner = await page(local.url, "dev:owner").use("db"), samPage = page(local.url, "dev:emp1"), sam = await samPage.use("db");
  const sites = [], mine = [], todos = [], others = [], errors = [];
  const stops = [
    sam.collection("sites").onSnapshot((s) => sites.push(plain(s).map((d) => d.name).join("|"))),
    sam.doc("sheets/emp1").onSnapshot((s) => mine.push(s.exists ? s.data() : null)),
    sam.collection("todos").onSnapshot((s) => todos.push(s.docs.length), (e) => errors.push(e)),
    sam.collection("sheets/emp2/entries").onSnapshot((s) => others.push(s.docs.length), (e) => errors.push(e)),
  ];
  try {
    await until("first snapshots", () => sites.length && mine.length && todos.length && others.length);
    await new Promise((r) => setTimeout(r, 150)); // let the socket subscribe, so what follows can only arrive by push
    await owner.doc("sites/live1").set({ name: "1 Live Lane" });
    await until("the new site in the trade's page", () => sites.at(-1).includes("1 Live Lane"));
    await owner.doc("sheets/emp1").update({ day: { site: "1 Live Lane" } });
    await until("the owner's change to the trade's own profile", () => mine.at(-1) && mine.at(-1).day);
    await owner.doc("todos/secret").set({ text: "private" });
    await owner.doc("sheets/emp2/entries/x").set({ hours: 8 });
    await owner.doc("sites/live1").delete();
    await until("the site going away again", () => !sites.at(-1).includes("1 Live Lane"));
    assert.deepEqual([todos, others, errors], [[0], [0], []], "owner-private changes never reach the trade; listeners simply stay empty");
  } finally {
    stops.forEach((s) => s());
  }
});

test("adapter: a listener's first snapshot does not depend on the socket", async () => {
  const p = page(local.url, "dev:owner", { SITEHQ_CONFIG: { api: local.url + "/api", ws: "ws://127.0.0.1:1/ws", devToken: "dev:owner" } });
  const db = await p.use("db"), seen = [];
  const stop = db.doc("settings/app").onSnapshot((s) => seen.push(s.exists ? s.data() : null));
  try {
    await until("first snapshot", () => seen.length);
    await db.doc("settings/app").set({ ownerName: "James Bray" });
    await until("this page's own write", () => seen.at(-1) && seen.at(-1).ownerName === "James Bray");
  } finally {
    stop();
  }
});

test("adapter: files – upload, fetch, list, delete; a client has no file store", async () => {
  const owner = await ownerPage.use("assets"), sam = await page(local.url, "dev:emp1").use("assets");
  assert.equal(await page(local.url, "dev:u9").use("assets"), null);
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const a = await sam.upload(new Blob([bytes], { type: "image/png" }));
  assert.deepEqual(Object.keys(a).sort(), ["contentType", "id", "sizeBytes", "url"]);
  assert.deepEqual([a.url, a.sizeBytes, a.contentType], ["/_blob/" + a.id, 11, "image/png"]);
  const got = await fetch(local.url + a.url, { headers: { cookie: "sitehq_token=" + encodeURIComponent("dev:u9") } });
  assert.equal(got.status, 200);
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), bytes);
  const b = await owner.upload(new Blob(["%PDF-1.4"]), { type: "application/pdf" }); // type from options, as files.js passes it
  assert.equal(b.contentType, "application/pdf");
  assert.deepEqual((await sam.list()).assets.map((x) => x.id), [a.id]);
  await assert.rejects(sam.upload(new Blob(["<h1>hi</h1>"], { type: "text/html" })), (e) => e.code === "unsupported_type");
  await assert.rejects(sam.upload(new Blob(["x"])), (e) => e.code === "unsupported_type", "no type at all");
  await assert.rejects(sam.delete(b.id), (e) => e.code === "not_uploader");
  assert.deepEqual(await sam.delete(a.id), {});
  assert.deepEqual(await owner.delete(b.id), {});
  assert.equal((await fetch(local.url + a.url, { headers: { authorization: "Bearer dev:owner" } })).status, 404);
});

test("adapter: profiles never rejects and answers for every id; downloads.save hands the file to the browser", async () => {
  const p = page(local.url, "dev:emp1"), user = await p.use("user"), downloads = await p.use("downloads");
  const ps = await user.profiles(["emp1", "ghost", "emp1"]);
  assert.deepEqual(Object.keys(ps), ["emp1", "ghost"]);
  assert.deepEqual(ps.emp1, { id: "emp1", name: "Sam Test", avatarUrl: "", color: "", email: null, isMe: true, guest: false });
  assert.deepEqual([ps.ghost.name, ps.ghost.isMe], ["", false]);
  assert.deepEqual(Object.keys(await user.profiles("emp1")), ["emp1"]);
  assert.deepEqual(await user.profiles([]), {});
  assert.deepEqual(await downloads.save({ filename: "timesheet.pdf", data: new Blob(["%PDF"]) }), {});
  assert.equal(p.clicks.length, 1);
  assert.equal(p.clicks[0].download, "timesheet.pdf");
  assert.match(p.clicks[0].href, /^blob:/);
});
