// The HTTP API end to end in one process: core/api.mjs on the in-memory store, dev sign-in, files on disk.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevAuth } from "../auth/dev.mjs";
import { createDiskBlobs } from "../blobs/disk.mjs";
import { createApi } from "../core/api.mjs";
import { siteRules } from "../core/roles.mjs";
import { lambdaHttp } from "../handlers/http.mjs";
import { createMemoryStore } from "../store/memory.mjs";

const capabilities = JSON.parse(await fs.readFile(new URL("../../platform/capabilities.json", import.meta.url), "utf8"));
const OWNER = "dev:owner", SAM = "dev:emp1", SUE = "dev:u9";
const dirs = [];
test.after(() => Promise.all(dirs.map((d) => fs.rm(d, { recursive: true, force: true }))));

async function setup(opts = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitehq-api-test-"));
  dirs.push(dir);
  const store = createMemoryStore(), published = [];
  const blobs = opts.blobs ? opts.blobs(createDiskBlobs(dir)) : createDiskBlobs(dir);
  const api = createApi({ store, rules: siteRules(capabilities), auth: opts.auth || createDevAuth(), blobs, live: { publish: async (p, o) => void published.push([p, o || ""]) } });
  const call = async (token, method, p, body, headers = {}) => {
    const raw = Buffer.isBuffer(body) ? body : body === undefined ? null : Buffer.from(JSON.stringify(body));
    const r = await api({ method, path: p, headers: { ...(token ? { authorization: "Bearer " + token } : {}), ...headers }, body: raw });
    const isJson = /json/.test(r.headers["content-type"] || "");
    return { status: r.status, headers: r.headers, body: isJson ? JSON.parse(r.body) : r.body };
  };
  const dbc = (token, op, body, headers) => call(token, "POST", "/api/db/" + op, body, headers);
  return { store, published, api, call, dbc };
}

test("nobody signed in gets nothing, on every route", async () => {
  const { call, store } = await setup();
  await store.set("sites", "s1", { name: "x" });
  await store.set("$assets", "abc", { by: "owner", type: "image/png", size: 1, at: 1, ready: true });
  for (const token of ["", "nonsense", "dev:nobody", "dev:"]) {
    for (const [m, p, b] of [["GET", "/api/me"], ["POST", "/api/db/get", { path: "sites/s1" }], ["POST", "/api/db/list", { path: "sites" }],
      ["POST", "/api/db/set", { path: "sites/s1", data: {} }], ["POST", "/api/profiles", { ids: [] }], ["GET", "/api/assets"], ["POST", "/api/assets", {}], ["GET", "/_blob/abc"]]) {
      const r = await call(token, m, p, b);
      assert.equal(r.status, 401, `${m} ${p} with token ${JSON.stringify(token)}`);
      assert.equal(r.body.error.code, "unauthenticated");
    }
  }
  assert.equal((await call("", "GET", "/_blob/abc", undefined, { cookie: "sitehq_token=nonsense" })).status, 401);
});

test("who am I", async () => {
  const { call } = await setup();
  assert.deepEqual((await call(OWNER, "GET", "/api/me")).body, { id: "owner", role: "owner", isOwner: true, name: "James Bray", canUpload: true });
  assert.deepEqual((await call(SAM, "GET", "/api/me")).body, { id: "emp1", role: "trade", isOwner: false, name: "Sam Test", canUpload: true });
  assert.deepEqual((await call(SUE, "GET", "/api/me")).body, { id: "u9", role: "client", isOwner: false, name: "Sue Jones", canUpload: false });
});

test("who am I: a sign-in that carries no name (Cognito) is named from the person's own profile", async () => {
  // the dev sign-in normally supplies names; this one does not, like a Cognito token
  const { call, store } = await setup({ auth: createDevAuth({ owner: { role: "owner" }, emp1: { role: "trade" }, u9: { role: "client" } }) });
  await store.set("sheets", "owner", { name: "James Bray" });
  await store.set("sheets", "emp1", { details: { fullName: "Samuel Test" } });
  await store.set("sheets", "u9", { name: "Not Sue" });
  assert.equal((await call(OWNER, "GET", "/api/me")).body.name, "James Bray", "owner: the name on their profile");
  assert.equal((await call(SAM, "GET", "/api/me")).body.name, "Samuel Test", "trade: the full name from their details when the profile has no name");
  assert.equal((await call(SUE, "GET", "/api/me")).body.name, "", "client: nothing – the portal has their name");
  const fresh = await setup({ auth: createDevAuth({ owner: { role: "owner" } }) });
  assert.equal((await fresh.call(OWNER, "GET", "/api/me")).body.name, "", "no profile yet: no name, no made-up one");
});

test("documents: set, get, update, delete, add", async () => {
  const { dbc, published } = await setup();
  assert.deepEqual((await dbc(OWNER, "get", { path: "sites/s1" })).body, { exists: false });
  assert.deepEqual((await dbc(OWNER, "set", { path: "sites/s1", data: { name: "12 Marine Way", client: "c1" } })).body, {});
  assert.deepEqual((await dbc(OWNER, "get", { path: "sites/s1" })).body, { exists: true, data: { name: "12 Marine Way", client: "c1" } });
  await dbc(OWNER, "update", { path: "sites/s1", data: { frontPhoto: "a1", job: { a: 1 } } });
  await dbc(OWNER, "update", { path: "sites/s1", data: { job: { b: 2 } } }); // shallow: replaces job
  assert.deepEqual((await dbc(OWNER, "get", { path: "sites/s1" })).body.data, { name: "12 Marine Way", client: "c1", frontPhoto: "a1", job: { b: 2 } });
  await dbc(OWNER, "update", { path: "sites/new", data: { name: "made by update" } }); // creates, as the test fake does
  assert.equal((await dbc(OWNER, "get", { path: "sites/new" })).body.exists, true);
  const added = (await dbc(OWNER, "add", { path: "todos", data: { text: "Order skip" } }, { "x-sitehq-client": "tab1" })).body;
  assert.match(added.id, /^[0-9a-f]{20}$/);
  assert.deepEqual((await dbc(OWNER, "get", { path: "todos/" + added.id })).body.data, { text: "Order skip" });
  assert.deepEqual((await dbc(OWNER, "delete", { path: "sites/s1" })).body, {});
  assert.deepEqual((await dbc(OWNER, "delete", { path: "sites/s1" })).body, {}, "deleting twice is fine");
  assert.deepEqual((await dbc(OWNER, "get", { path: "sites/s1" })).body, { exists: false });
  // every accepted write is announced, with the writer's client id when it sent one
  assert.deepEqual(published, [["sites/s1", ""], ["sites/s1", ""], ["sites/s1", ""], ["sites/new", ""], ["todos/" + added.id, "tab1"], ["sites/s1", ""], ["sites/s1", ""]]);
});

test("listing: id order, where ==, orderBy, limit", async () => {
  const { dbc, store } = await setup();
  const msgs = { m3: { at: 30, site: "A", text: "c" }, m1: { at: 10, site: "B", text: "a" }, m2: { at: 20, site: "A", text: "b" }, m4: { site: "A", text: "no time" } };
  for (const [id, d] of Object.entries(msgs)) await store.set("msgs/team/m", id, d);
  const ids = async (q) => (await dbc(SAM, "list", { path: "msgs/team/m", ...q })).body.docs.map((d) => d.id);
  assert.deepEqual(await ids({}), ["m1", "m2", "m3", "m4"]);
  assert.deepEqual(await ids({ where: [["site", "==", "A"]] }), ["m2", "m3", "m4"]);
  assert.deepEqual(await ids({ orderBy: ["at", "desc"] }), ["m3", "m2", "m1", "m4"], "documents without the field come last");
  assert.deepEqual(await ids({ orderBy: ["at", "asc"], limit: 2 }), ["m1", "m2"]);
  assert.deepEqual(await ids({ where: [["site", "==", "A"]], orderBy: ["at", "desc"], limit: 1 }), ["m3"]);
  assert.deepEqual((await dbc(SAM, "list", { path: "msgs/team/m", limit: 1 })).body.docs, [{ id: "m1", data: msgs.m1 }]);
  for (const bad of [{ where: [["site", ">", "A"]] }, { where: "site" }, { orderBy: ["at", "up"] }, { limit: 0.5 }, { limit: 1001 }, { where: [["site", "==", { a: 1 }]] }]) {
    const r = await dbc(SAM, "list", { path: "msgs/team/m", ...bad });
    assert.equal(r.status, 400, JSON.stringify(bad));
    assert.equal(r.body.error.code, "invalid_argument");
  }
});

test("a refused read looks exactly like nothing being there; a refused write is 403", async () => {
  const { dbc, store, published } = await setup();
  await store.set("todos", "c1", { kind: "client", name: "Sue Jones" });
  await store.set("sheets", "emp1", { name: "Sam Test" });
  await store.set("sheets", "emp2", { name: "Ann Other" });
  await store.set("sheets/emp2/entries", "a", { hours: 8 });
  await store.set("portal", "u9", { name: "Sue Jones" });
  await store.set("portal", "u8", { name: "Bob Lee" });
  await store.set("sites", "s1", { name: "x" });
  // trade
  assert.deepEqual((await dbc(SAM, "get", { path: "todos/c1" })).body, { exists: false });
  assert.deepEqual((await dbc(SAM, "get", { path: "todos/missing" })).body, { exists: false });
  assert.deepEqual((await dbc(SAM, "list", { path: "todos" })).body, { docs: [] });
  assert.deepEqual((await dbc(SAM, "get", { path: "sheets/emp2" })).body, { exists: false });
  assert.deepEqual((await dbc(SAM, "list", { path: "sheets/emp2/entries" })).body, { docs: [] });
  assert.deepEqual((await dbc(SAM, "list", { path: "sheets" })).body, { docs: [{ id: "emp1", data: { name: "Sam Test" } }] }, "only their own profile");
  assert.deepEqual((await dbc(SAM, "list", { path: "portal" })).body, { docs: [] });
  for (const [op, body] of [["set", { path: "todos/c1", data: { x: 1 } }], ["update", { path: "todos/c1", data: { x: 1 } }], ["delete", { path: "todos/c1" }], ["add", { path: "todos", data: { x: 1 } }],
    ["set", { path: "sheets/emp2", data: { name: "hacked" } }], ["set", { path: "sheets/emp2/entries/a", data: {} }], ["set", { path: "sites/s1", data: {} }], ["delete", { path: "portal/u9" }]]) {
    const r = await dbc(SAM, op, body);
    assert.equal(r.status, 403, `${op} ${body.path}`);
    assert.equal(r.body.error.code, "forbidden");
  }
  // client
  assert.deepEqual((await dbc(SUE, "get", { path: "portal/u9" })).body, { exists: true, data: { name: "Sue Jones" } });
  assert.deepEqual((await dbc(SUE, "list", { path: "portal" })).body, { docs: [{ id: "u9", data: { name: "Sue Jones" } }] });
  assert.deepEqual((await dbc(SUE, "get", { path: "portal/u8" })).body, { exists: false });
  assert.deepEqual((await dbc(SUE, "get", { path: "sites/s1" })).body, { exists: false });
  assert.deepEqual((await dbc(SUE, "list", { path: "sites" })).body, { docs: [] });
  assert.equal((await dbc(SUE, "set", { path: "sites/s1", data: {} })).status, 403);
  assert.equal((await dbc(SUE, "set", { path: "portal/u8/docs/d", data: {} })).status, 403);
  assert.equal((await dbc(SUE, "set", { path: "portal/u9/uploads/x", data: { name: "photo.jpg" } })).status, 200);
  // nothing was changed or announced by the refused writes
  assert.deepEqual(await store.get("todos", "c1"), { kind: "client", name: "Sue Jones" });
  assert.deepEqual(await store.get("sheets", "emp2"), { name: "Ann Other" });
  assert.deepEqual(published, [["portal/u9/uploads/x", ""]]);
});

test("bad requests are refused before anything is stored", async () => {
  const { dbc, call, store } = await setup();
  const bad = async (op, body, why) => {
    const r = await dbc(OWNER, op, body);
    assert.equal(r.status, 400, why);
    assert.equal(r.body.error.code, "invalid_argument", why);
  };
  await bad("get", { path: "sites" }, "collection path given for a document");
  await bad("list", { path: "sites/s1" }, "document path given for a collection");
  await bad("get", {}, "no path");
  await bad("get", { path: "sites/has space" }, "bad character");
  await bad("get", { path: "sites//x/y" }, "empty segment");
  await bad("get", { path: "$assets/abc" }, "the server's own records cannot be addressed");
  await bad("list", { path: "$sub:sites" }, "the server's own records cannot be addressed");
  await bad("get", { path: "sites/.." }, "dot segments");
  await bad("get", { path: Array(18).fill("a").join("/") }, "too many segments");
  await bad("set", { path: "sites/s1", data: [1, 2] }, "array body");
  await bad("set", { path: "sites/s1", data: "text" }, "string body");
  await bad("set", { path: "sites/s1" }, "no body");
  await bad("set", { path: "sites/s1", data: { big: "x".repeat(257 * 1024) } }, "over 256 KiB");
  let deep = {};
  for (let i = 0; i < 40; i++) deep = { d: deep };
  await bad("set", { path: "sites/s1", data: deep }, "too deep");
  await store.set("sites", "s2", { a: "x".repeat(200 * 1024) });
  await bad("update", { path: "sites/s2", data: { b: "x".repeat(100 * 1024) } }, "update that makes the document too big");
  assert.equal((await call(OWNER, "POST", "/api/db/get", Buffer.from("{not json"))).status, 400);
  assert.equal((await call(OWNER, "POST", "/api/db/nonsense", {})).status, 404);
  assert.equal((await call(OWNER, "GET", "/api/db/get")).status, 404);
  assert.deepEqual(Object.keys(store.dump()), ["sites/s2"]);
});

test("display names: from people's profiles; a client is told nobody's", async () => {
  const { call, store } = await setup();
  await store.set("sheets", "emp1", { name: "Sam Test", details: { ni: "secret" } });
  await store.set("sheets", "emp2", { updated: 1 });
  const ask = async (token) => (await call(token, "POST", "/api/profiles", { ids: ["emp1", "emp2", "ghost", "owner"] })).body.profiles;
  assert.deepEqual(await ask(SAM), { emp1: { id: "emp1", name: "Sam Test", isMe: true }, emp2: { id: "emp2", name: "", isMe: false }, ghost: { id: "ghost", name: "", isMe: false }, owner: { id: "owner", name: "", isMe: false } });
  assert.equal((await ask(OWNER)).emp1.name, "Sam Test");
  assert.deepEqual(Object.values(await ask(SUE)).map((p) => p.name), ["", "", "", ""]);
  assert.equal((await call(SAM, "POST", "/api/profiles", { ids: "emp1" })).status, 400);
});

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
async function upload(t, token, bytes = PNG, contentType = "image/png") {
  const start = await t.call(token, "POST", "/api/assets", { contentType, size: bytes.length });
  assert.equal(start.status, 200);
  assert.deepEqual(start.body.upload, { url: `/api/assets/${start.body.id}/content`, method: "PUT", headers: { "content-type": contentType } });
  assert.equal((await t.call(token, "PUT", start.body.upload.url, bytes)).status, 200);
  const done = await t.call(token, "POST", `/api/assets/${start.body.id}/complete`);
  assert.equal(done.status, 200);
  return done.body;
}

test("files: upload, fetch at /_blob/<id>, list, delete", async () => {
  const t = await setup();
  const a = await upload(t, SAM);
  assert.match(a.id, /^[0-9a-f]{32}$/);
  assert.deepEqual({ url: a.url, sizeBytes: a.sizeBytes, contentType: a.contentType }, { url: "/_blob/" + a.id, sizeBytes: PNG.length, contentType: "image/png" });
  // fetched with the header, or with the cookie an <img> sends; by anyone signed in who knows the id
  for (const [token, headers] of [[SAM, {}], [OWNER, {}], ["", { cookie: "other=1; sitehq_token=" + encodeURIComponent(SUE) }]]) {
    const r = await t.call(token, "GET", a.url, undefined, headers);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, PNG);
    assert.equal(r.headers["content-type"], "image/png");
    assert.equal(r.headers["x-content-type-options"], "nosniff");
  }
  const part = await t.call(SAM, "GET", a.url, undefined, { range: "bytes=2-5" });
  assert.equal(part.status, 206);
  assert.equal(part.headers["content-range"], `bytes 2-5/${PNG.length}`);
  assert.deepEqual(part.body, PNG.subarray(2, 6));
  assert.equal((await t.call(SAM, "GET", "/_blob/" + "0".repeat(32))).status, 404);
  assert.equal((await t.call(SAM, "GET", "/_blob/../../etc/passwd")).status, 404);
  assert.equal((await t.call(SAM, "POST", a.url)).status, 405);

  const b = await upload(t, OWNER, Buffer.from("%PDF-1.4 test"), "application/pdf");
  const list = async (token) => (await t.call(token, "GET", "/api/assets")).body;
  assert.deepEqual((await list(SAM)).assets.map((x) => x.id), [a.id], "a trade lists their own uploads");
  assert.deepEqual((await list(OWNER)).assets.map((x) => x.id).sort(), [a.id, b.id].sort(), "the owner lists everything");
  assert.deepEqual((await list(SAM)).usage, { bytes: PNG.length + 13, count: 2 });

  const no = await t.call(SAM, "DELETE", "/api/assets/" + b.id);
  assert.equal(no.status, 403);
  assert.equal(no.body.error.code, "not_uploader");
  assert.equal((await t.call(SAM, "GET", b.url)).status, 200, "still there");
  assert.equal((await t.call(SAM, "DELETE", "/api/assets/" + a.id)).status, 200);
  assert.equal((await t.call(SAM, "GET", a.url)).status, 404);
  assert.equal((await t.call(OWNER, "DELETE", "/api/assets/" + b.id)).status, 200);
  assert.equal((await t.call(OWNER, "DELETE", "/api/assets/" + b.id)).status, 200, "deleting twice is fine");
  assert.deepEqual((await list(OWNER)).assets, []);
});

test("files: what is refused", async () => {
  const t = await setup();
  const start = (token, body) => t.call(token, "POST", "/api/assets", body);
  const code = async (p) => { const r = await p; return [r.status, r.body.error.code]; };
  for (const type of ["text/html", "image/svg+xml", "application/javascript", "text/javascript", "application/xhtml+xml", "application/zip", "", "image/png; charset=x"])
    assert.deepEqual(await code(start(OWNER, { contentType: type, size: 10 })), [415, "unsupported_type"], type);
  /* what the app does store besides pictures, video and PDFs: a drawing's data, voice notes, Word and Excel files, text and CSV */
  for (const type of ["application/json", "audio/mp4", "audio/webm", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/msword", "text/plain", "text/csv"])
    assert.equal((await start(OWNER, { contentType: type, size: 10 })).status, 200, type);
  assert.deepEqual(await code(start(OWNER, { contentType: "image/png", size: 20 * 1024 * 1024 + 1 })), [413, "too_large"]);
  assert.deepEqual(await code(start(OWNER, { contentType: "image/png", size: 0 })), [400, "invalid_argument"]);
  assert.deepEqual(await code(start(SUE, { contentType: "image/png", size: 10 })), [403, "forbidden"], "a client cannot store files");
  assert.deepEqual(await code(t.call(SUE, "GET", "/api/assets")), [403, "forbidden"]);
  // an upload belongs to whoever started it, is not served until it is finished, and cannot grow past what was agreed
  const s = (await start(SAM, { contentType: "image/png", size: 8 })).body;
  assert.equal((await t.call(SAM, "GET", "/_blob/" + s.id)).status, 404, "not served before it is complete");
  assert.deepEqual(await code(t.call(SAM, "POST", `/api/assets/${s.id}/complete`)), [400, "invalid_argument"], "nothing uploaded yet");
  assert.deepEqual(await code(t.call("dev:u9", "PUT", `/api/assets/${s.id}/content`, PNG.subarray(0, 8))), [403, "not_uploader"]);
  assert.deepEqual(await code(t.call(SAM, "PUT", `/api/assets/${s.id}/content`, PNG)), [413, "too_large"], "more bytes than agreed");
  assert.equal((await t.call(SAM, "PUT", `/api/assets/${s.id}/content`, PNG.subarray(0, 8))).status, 200);
  assert.equal((await t.call(SAM, "POST", `/api/assets/${s.id}/complete`)).status, 200);
  assert.deepEqual(await code(t.call(SAM, "PUT", `/api/assets/${s.id}/content`, PNG.subarray(0, 8))), [404, "not_found"], "a finished file cannot be overwritten");
});

test("files: a store with direct links – images stay with the API, other files are redirected", async () => {
  const t = await setup({ blobs: (disk) => ({ ...disk, url: async (id, o) => `https://files.example/${id}?type=${o.contentType}` }) });
  const img = await upload(t, OWNER), pdf = await upload(t, OWNER, Buffer.from("%PDF-1.4 test"), "application/pdf");
  assert.equal((await t.call(OWNER, "GET", img.url)).status, 200);
  const r = await t.call(OWNER, "GET", pdf.url);
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, `https://files.example/${pdf.id}?type=application/pdf`);
});

test("as a Lambda behind API Gateway (HTTP API, payload format 2.0)", async () => {
  const t = await setup();
  const handler = lambdaHttp(t.api);
  const event = (method, rawPath, extra = {}) => ({ version: "2.0", rawPath, requestContext: { http: { method } }, headers: {}, ...extra });
  const set = await handler(event("POST", "/api/db/set", { headers: { Authorization: "Bearer " + OWNER, "Content-Type": "application/json" }, body: JSON.stringify({ path: "sites/s1", data: { name: "x" } }) }));
  assert.deepEqual({ statusCode: set.statusCode, body: set.body, isBase64Encoded: set.isBase64Encoded }, { statusCode: 200, body: "{}", isBase64Encoded: false });
  const b64 = await handler(event("POST", "/api/db/get", { headers: { authorization: "Bearer " + OWNER }, body: Buffer.from(JSON.stringify({ path: "sites/s1" })).toString("base64"), isBase64Encoded: true }));
  assert.deepEqual(JSON.parse(b64.body), { exists: true, data: { name: "x" } });
  assert.equal((await handler(event("GET", "/api/me"))).statusCode, 401);
  const a = await upload(t, OWNER);
  const blob = await handler(event("GET", a.url, { cookies: ["x=1", "sitehq_token=" + encodeURIComponent(SAM)] })); // format 2.0 sends cookies separately
  assert.equal(blob.statusCode, 200);
  assert.equal(blob.isBase64Encoded, true);
  assert.deepEqual(Buffer.from(blob.body, "base64"), PNG);
});
