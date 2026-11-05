// Live updates: core/live.mjs with a recording transport, then the real thing – a WebSocket client against the
// local server (server/local.mjs), and the Lambda wrapper for API Gateway WebSocket events.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { WebSocket } from "ws";
import { createDevAuth } from "../auth/dev.mjs";
import { createLive } from "../core/live.mjs";
import { siteRules } from "../core/roles.mjs";
import { lambdaWs } from "../handlers/ws.mjs";
import { startLocal } from "../local.mjs";
import { createMemoryStore } from "../store/memory.mjs";
import { createApiGatewayTransport } from "../transport/apigw-ws.mjs";

const capabilities = JSON.parse(fs.readFileSync(new URL("../../platform/capabilities.json", import.meta.url), "utf8"));
const rules = siteRules(capabilities);

function setup(opts = {}) {
  const store = createMemoryStore(), sent = [], gone = new Set();
  const transport = { send: async (id, m) => { if (gone.has(id)) return false; sent.push([id, m]); return true; } };
  const auth = opts.auth || createDevAuth();
  const live = createLive({ store, transport, rules, auth, now: opts.now });
  const say = (conn, m) => live.onMessage(conn, JSON.stringify(m));
  const to = (conn) => sent.filter(([id]) => id === conn).map(([, m]) => m);
  const serverRecords = () => Object.keys(store.dump()).filter((k) => k.startsWith("$"));
  return { store, live, sent, gone, say, to, serverRecords };
}

test("a connection must say who it is before it can subscribe", async () => {
  const t = setup();
  await t.say("c1", { t: "sub", id: "s1", path: "sites" });
  await t.say("c1", { t: "auth", token: "wrong" });
  await t.say("c1", { t: "sub", id: "s1", path: "sites" });
  assert.deepEqual(t.to("c1"), [{ t: "error", code: "unauthenticated", id: "s1" }, { t: "error", code: "unauthenticated" }, { t: "error", code: "unauthenticated", id: "s1" }]);
  assert.deepEqual(t.serverRecords(), []);
  await t.live.publish("sites/s1");
  assert.equal(t.sent.length, 3, "nothing more was sent");
});

test("a write reaches the subscribers of the document and of its collection who may read it – nobody else", async () => {
  const t = setup();
  for (const [conn, who] of [["owner", "dev:owner"], ["sam", "dev:emp1"], ["sue", "dev:u9"]]) await t.say(conn, { t: "auth", token: who });
  // everyone asks for the same things; what each is allowed differs
  for (const conn of ["owner", "sam", "sue"]) {
    await t.say(conn, { t: "sub", id: "sites", path: "sites" });
    await t.say(conn, { t: "sub", id: "sheets", path: "sheets" });
    await t.say(conn, { t: "sub", id: "todos", path: "todos" });
    await t.say(conn, { t: "sub", id: "portal-u9", path: "portal/u9" });
    await t.say(conn, { t: "sub", id: "sam-entries", path: "sheets/emp1/entries" });
  }
  const answers = (conn) => t.to(conn).slice(1).map((m) => `${m.t} ${m.id}`);
  assert.deepEqual(t.to("owner")[0], { t: "ready" });
  assert.deepEqual(answers("owner"), ["subd sites", "subd sheets", "subd todos", "subd portal-u9", "subd sam-entries"]);
  assert.deepEqual(answers("sam"), ["subd sites", "subd sheets", "denied todos", "denied portal-u9", "subd sam-entries"]);
  assert.deepEqual(answers("sue"), ["denied sites", "denied sheets", "denied todos", "subd portal-u9", "denied sam-entries"]);

  t.sent.length = 0;
  await t.live.publish("sites/s1", "tab7");
  await t.live.publish("sheets/emp1");
  await t.live.publish("sheets/emp2"); // sam subscribes to "sheets" but may only read his own profile
  await t.live.publish("todos/c1");
  await t.live.publish("portal/u9");
  await t.live.publish("sheets/emp1/entries/a");
  await t.live.publish("sheets/emp2/entries/a"); // nobody subscribed
  const got = (conn) => t.to(conn).map((m) => `${m.id} ${m.path}${m.o ? " from " + m.o : ""}`);
  assert.deepEqual(got("owner"), ["sites sites/s1 from tab7", "sheets sheets/emp1", "sheets sheets/emp2", "todos todos/c1", "portal-u9 portal/u9", "sam-entries sheets/emp1/entries/a"]);
  assert.deepEqual(got("sam"), ["sites sites/s1 from tab7", "sheets sheets/emp1", "sam-entries sheets/emp1/entries/a"]);
  assert.deepEqual(got("sue"), ["portal-u9 portal/u9"]);
  assert.ok(t.sent.every(([, m]) => m.t === "change" && !("data" in m)), "messages carry the path, never the data");
});

test("unsubscribing, and closing a connection, leave no records behind", async () => {
  const t = setup();
  await t.say("c1", { t: "auth", token: "dev:owner" });
  await t.say("c2", { t: "auth", token: "dev:emp1" });
  await t.say("c1", { t: "sub", id: "a", path: "sites" });
  await t.say("c1", { t: "sub", id: "b", path: "sites/s1" });
  await t.say("c2", { t: "sub", id: "a", path: "sites" });
  await t.say("c1", { t: "unsub", id: "a" });
  await t.say("c1", { t: "unsub", id: "never-was" });
  t.sent.length = 0;
  await t.live.publish("sites/s1");
  assert.deepEqual(t.sent.map(([c, m]) => `${c} ${m.id}`).sort(), ["c1 b", "c2 a"]);
  await t.live.disconnect("c1");
  assert.deepEqual(t.serverRecords().sort(), ["$conn/c2", "$cs:c2/a", "$sub:sites/c2.a"]);
  await t.live.disconnect("c2");
  await t.live.disconnect("c2"); // twice is fine
  assert.deepEqual(t.serverRecords(), []);
});

test("a connection that has gone is forgotten the first time a message cannot be delivered", async () => {
  const t = setup();
  await t.say("c1", { t: "auth", token: "dev:owner" });
  await t.say("c1", { t: "sub", id: "a", path: "sites" });
  await t.say("c1", { t: "sub", id: "b", path: "jobs" });
  t.gone.add("c1");
  await t.live.publish("sites/s1");
  assert.deepEqual(t.serverRecords(), []);
});

test("a sign-in that has run out stops receiving changes and is told to connect again", async () => {
  let clock = 1_000_000;
  const auth = { verify: async (token) => (token === "jwt" ? { id: "owner", role: "owner", exp: 1500 } : null) };
  const t = setup({ auth, now: () => clock });
  await t.say("c1", { t: "auth", token: "jwt" });
  await t.say("c1", { t: "sub", id: "a", path: "sites" });
  t.sent.length = 0;
  await t.live.publish("sites/s1");
  assert.deepEqual(t.to("c1"), [{ t: "change", id: "a", path: "sites/s1" }]);
  clock = 1_501_000; // one second past exp
  await t.live.publish("sites/s1");
  assert.deepEqual(t.to("c1").slice(1), [{ t: "expired" }]);
  assert.deepEqual(t.serverRecords(), []);
});

test("odd input does no harm", async () => {
  const t = setup();
  await t.say("c1", { t: "auth", token: "dev:owner" });
  await t.live.onMessage("c1", "not json");
  await t.live.onMessage("c1", "null");
  await t.say("c1", { t: "sub", id: "bad id!", path: "sites" });
  await t.say("c1", { t: "sub", id: "a", path: "sites/has space" });
  await t.say("c1", { t: "sub", id: "b", path: "$conn" });
  await t.say("c1", { t: "sub", id: "c" });
  await t.say("c1", { t: "dance" });
  await t.say("c1", { t: "ping" });
  assert.deepEqual(t.to("c1").slice(1).map((m) => m.t + (m.id ? " " + m.id : "")), ["error", "error", "error", "denied a", "denied b", "denied c", "error", "pong"]);
  assert.deepEqual(t.serverRecords(), ["$conn/c1"]);
  // at most 200 subscriptions per connection
  for (let i = 0; i < 201; i++) await t.say("c1", { t: "sub", id: "n" + i, path: "sites" });
  assert.deepEqual(t.to("c1").at(-1), { t: "denied", id: "n200" });
});

// ---- the real transport: a WebSocket client against the local server ----
function client(url, token) {
  const ws = new WebSocket(url.replace("http", "ws") + "/ws"), inbox = [], waiting = [];
  ws.on("message", (d) => { const m = JSON.parse(d.toString()); const i = waiting.findIndex((w) => w.match(m)); if (i >= 0) waiting.splice(i, 1)[0].resolve(m); else inbox.push(m); });
  const next = (match, ms = 2000) => {
    const i = inbox.findIndex(match);
    if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => { const w = { match, resolve }; waiting.push(w); setTimeout(() => { if (waiting.includes(w)) reject(new Error("timed out waiting for a message")); }, ms); });
  };
  const say = (m) => ws.send(JSON.stringify(m));
  const open = new Promise((resolve, reject) => { ws.on("open", resolve); ws.on("error", reject); }).then(async () => { say({ t: "auth", token }); return next((m) => m.t === "ready" || m.t === "error"); });
  return { ws, inbox, next, say, open };
}
const post = (url, token, op, body) => fetch(`${url}/api/db/${op}`, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json", "x-sitehq-client": "writer" }, body: JSON.stringify(body) }).then((r) => r.status);

test("over a real WebSocket: an owner's write reaches a trade who may read it, and not one who may not", async () => {
  const local = await startLocal();
  try {
    const sam = client(local.url, "dev:emp1"), sue = client(local.url, "dev:u9"), stranger = client(local.url, "nope");
    assert.equal((await sam.open).t, "ready");
    assert.equal((await sue.open).t, "ready");
    assert.deepEqual(await stranger.open, { t: "error", code: "unauthenticated" });
    sam.say({ t: "sub", id: "s", path: "sites" });
    sam.say({ t: "sub", id: "me", path: "sheets/emp1" });
    sue.say({ t: "sub", id: "s", path: "sites" });
    sue.say({ t: "sub", id: "p", path: "portal/u9/docs" });
    stranger.say({ t: "sub", id: "s", path: "sites" });
    assert.deepEqual(await sam.next((m) => m.id === "s"), { t: "subd", id: "s" });
    assert.deepEqual(await sam.next((m) => m.id === "me"), { t: "subd", id: "me" });
    assert.deepEqual(await sue.next((m) => m.id === "s"), { t: "denied", id: "s" });
    assert.deepEqual(await sue.next((m) => m.id === "p"), { t: "subd", id: "p" });
    assert.equal((await stranger.next((m) => m.id === "s")).t, "error");

    assert.equal(await post(local.url, "dev:owner", "set", { path: "sites/s9", data: { name: "9 New Road" } }), 200);
    assert.deepEqual(await sam.next((m) => m.t === "change"), { t: "change", id: "s", path: "sites/s9", o: "writer" });
    assert.equal(await post(local.url, "dev:owner", "set", { path: "portal/u9/docs/d1", data: { title: "Quote" } }), 200);
    assert.deepEqual(await sue.next((m) => m.t === "change"), { t: "change", id: "p", path: "portal/u9/docs/d1", o: "writer" });
    assert.equal(await post(local.url, "dev:emp1", "set", { path: "sites/s9", data: { name: "hacked" } }), 403, "a refused write");
    assert.equal(await post(local.url, "dev:owner", "update", { path: "sheets/emp1", data: { day: null } }), 200);
    assert.deepEqual(await sam.next((m) => m.t === "change"), { t: "change", id: "me", path: "sheets/emp1", o: "writer" }, "the refused write announced nothing");
    assert.deepEqual([sam.inbox, sue.inbox, stranger.inbox], [[], [], []], "nothing else was sent to anyone");

    sam.ws.close();
    sue.ws.close();
    stranger.ws.close();
    for (let i = 0; i < 100 && Object.keys(local.store.dump()).some((k) => k.startsWith("$")); i++) await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(Object.keys(local.store.dump()).filter((k) => k.startsWith("$")), [], "closed connections leave nothing behind");
  } finally {
    await local.close();
  }
});

test("as a Lambda behind an API Gateway WebSocket API", async () => {
  const store = createMemoryStore(), posted = [];
  // a stand-in for the API Gateway management API: records PostToConnection calls; connection "dead" is gone
  const apigw = { send: async (cmd) => { if (cmd.input.ConnectionId === "dead") throw Object.assign(new Error("gone"), { name: "GoneException" }); posted.push([cmd.input.ConnectionId, JSON.parse(Buffer.from(cmd.input.Data).toString())]); } };
  const live = createLive({ store, rules, auth: createDevAuth(), transport: createApiGatewayTransport({ client: apigw }) });
  const handler = lambdaWs(() => live);
  const event = (routeKey, connectionId, body) => ({ requestContext: { routeKey, connectionId, domainName: "abc.execute-api.eu-west-2.amazonaws.com", stage: "dev" }, body: body && JSON.stringify(body) });
  assert.deepEqual(await handler(event("$connect", "A=")), { statusCode: 200 });
  await handler(event("$default", "A=", { t: "auth", token: "dev:emp1" }));
  await handler(event("$default", "A=", { t: "sub", id: "s", path: "sites" }));
  await handler(event("$default", "dead", { t: "auth", token: "dev:owner" }));
  assert.equal(await store.get("$conn", "dead"), null, "a connection that cannot be answered is not kept… ");
  await store.set("$conn", "dead", { uid: "owner", role: "owner", exp: 0 }); // …so put one in place by hand, as if it had died later
  await store.set("$sub:sites", "dead.s", { c: "dead", s: "s", uid: "owner", role: "owner", exp: 0 });
  await store.set("$cs:dead", "s", { path: "sites" });
  posted.length = 0;
  await live.publish("sites/s1");
  assert.deepEqual(posted, [["A=", { t: "change", id: "s", path: "sites/s1" }]]);
  assert.equal(await store.get("$conn", "dead"), null);
  assert.deepEqual(await store.list("$sub:sites"), [{ id: "A=.s", data: { c: "A=", s: "s", uid: "emp1", role: "trade", exp: 0 } }]);
  await handler(event("$disconnect", "A="));
  assert.deepEqual(Object.keys(store.dump()), []);
});
