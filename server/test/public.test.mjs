// The public website's two routes (core/public.mjs): the contact form and the page counter, with nobody signed in.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevAuth } from "../auth/dev.mjs";
import { createDiskBlobs } from "../blobs/disk.mjs";
import { createApi } from "../core/api.mjs";
import { MAX_ENQUIRIES_A_DAY } from "../core/public.mjs";
import { siteRules } from "../core/roles.mjs";
import { createMemoryStore } from "../store/memory.mjs";

const capabilities = JSON.parse(await fs.readFile(new URL("../../platform/capabilities.json", import.meta.url), "utf8"));
const dirs = [];
test.after(() => Promise.all(dirs.map((d) => fs.rm(d, { recursive: true, force: true }))));
const NOW = Date.parse("2026-11-08T10:00:00Z");

async function setup() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitehq-public-test-"));
  dirs.push(dir);
  const store = createMemoryStore(), published = [];
  const api = createApi({ store, rules: siteRules(capabilities), auth: createDevAuth(), blobs: createDiskBlobs(dir), live: { publish: async (p) => void published.push(p) }, now: () => NOW });
  const post = async (p, body, type = "application/json", method = "POST") => {
    const raw = body == null ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    return api({ method, path: p, headers: { "content-type": type }, body: raw });
  };
  const all = async (coll) => (await store.list(coll)).map((d) => d.data);
  return { store, published, post, all };
}

test("an enquiry from the website: stored for the owner, the owner's app told, the answer says nothing", async () => {
  const { post, all, published } = await setup();
  const r = await post("/api/public/enquiry", { name: " Jo Test ", email: "jo@example.com", phone: "07000 000000", location: "Exmouth", "project-type": "House extension", message: "A single-storey rear extension.", page: "/contact.html" });
  assert.equal(r.status, 200);
  assert.equal(r.body, '{"ok":true}');
  assert.equal(r.headers["access-control-allow-origin"], "*");
  const [e] = await all("webenq");
  assert.deepEqual(
    { ...e, at: 0 },
    { name: "Jo Test", email: "jo@example.com", phone: "07000 000000", location: "Exmouth", type: "House extension", message: "A single-storey rear extension.", page: "/contact.html", at: 0, status: "new" },
  );
  assert.equal(e.at, NOW);
  assert.ok(published.some((p) => p.startsWith("webenq/")));
  assert.equal((await all("webstats"))[0].enquiries, 1);
});

test("the form's own encoding works too (no script on the page)", async () => {
  const { post, all } = await setup();
  await post("/api/public/enquiry", "name=Al+Test&email=al%40example.com&project-type=Loft+conversion&message=Hi", "application/x-www-form-urlencoded");
  const [e] = await all("webenq");
  assert.equal(e.name, "Al Test");
  assert.equal(e.type, "Loft conversion");
});

test("bots and rubbish are thanked and thrown away", async () => {
  const { post, all } = await setup();
  for (const b of [
    { name: "Bot", email: "b@example.com", "company-website": "http://spam.example" }, // the honeypot
    { name: "", email: "x@example.com" }, // no name
    { name: "No way to reply" }, // no email or phone
    "not json",
    null,
  ]) assert.equal((await post("/api/public/enquiry", b, b === "not json" ? "text/plain" : "application/json")).status, 200);
  assert.equal((await post("/api/public/enquiry", "x".repeat(20000))).status, 200);
  assert.deepEqual(await all("webenq"), []);
  const big = await post("/api/public/enquiry", { name: "N".repeat(500), email: "bad-address", phone: "1", message: "m".repeat(9000) });
  assert.equal(big.status, 200);
  const [e] = await all("webenq");
  assert.equal(e.name.length, 80);
  assert.equal(e.email, "");
  assert.equal(e.message.length, 4000);
});

test("no more than the daily cap of enquiries", async () => {
  const { post, all } = await setup();
  for (let i = 0; i < MAX_ENQUIRIES_A_DAY + 5; i++) await post("/api/public/enquiry", { name: "P" + i, phone: "1" });
  assert.equal((await all("webenq")).length, MAX_ENQUIRIES_A_DAY);
});

test("page views are counted by day, page, where visitors came from and device – nothing about who", async () => {
  const { post, store } = await setup();
  await post("/api/public/hit", { p: "/index.html", r: "www.google.com", m: true, n: 1 }, "text/plain");
  await post("/api/public/hit", { p: "/contact.html", r: "www.google.com", m: true, n: 0 }, "text/plain");
  await post("/api/public/hit", { p: "/services.html", r: "", m: false, n: 1 }, "text/plain");
  await post("/api/public/hit", { p: "javascript:alert(1)", r: "<b>", n: 0 }, "text/plain");
  const s = await store.get("webstats", "2026-11-08");
  assert.deepEqual(s, {
    views: 4,
    visits: 2,
    pages: { "/": 1, "/contact.html": 1, "/services.html": 1, other: 1 },
    dev: { phone: 2, computer: 2 },
    refs: { "google.com": 1, direct: 1 },
    entry: { "/": 1, "/services.html": 1 },
  });
});

test("nothing can be read through the public routes, and other methods get the same answer", async () => {
  const { post, store } = await setup();
  await store.set("todos", "c1", { kind: "client", name: "Secret" });
  for (const [p, m] of [["/api/public/enquiry", "GET"], ["/api/public/hit", "GET"], ["/api/public/other", "POST"], ["/api/public/enquiry", "DELETE"]]) {
    const r = await post(p, { path: "todos/c1" }, "application/json", m);
    assert.equal(r.body, '{"ok":true}');
  }
  const pre = await post("/api/public/enquiry", null, "", "OPTIONS");
  assert.equal(pre.status, 204);
});

test("time on a page, the landing page and the town (from the hosting's own header, nothing else kept)", async () => {
  const { post, store, published } = await setup();
  const hit = (b, h = {}) => {
    const raw = Buffer.from(JSON.stringify(b));
    return createApiFor(store, published)({ method: "POST", path: "/api/public/hit", headers: { "content-type": "text/plain", ...h }, body: raw });
  };
  void post;
  await hit({ p: "/house-extensions.html", r: "google.com", n: 1 }, { "cloudfront-viewer-city": "Exmouth" });
  await hit({ p: "/contact.html", n: 0 }, { "cloudfront-viewer-city": "Exmouth" });
  await hit({ p: "/", r: "", n: 1 }, { "cloudfront-viewer-city": "Exeter" });
  await hit({ p: "/", n: 1 }, { "cloudfront-viewer-city": "<script>" });
  await hit({ p: "/house-extensions.html", s: 95 });
  await hit({ p: "/house-extensions.html", s: 25 });
  await hit({ p: "/contact.html", s: 40 });
  await hit({ p: "/contact.html", s: 99999 });
  await hit({ p: "/contact.html", s: 0 });
  const s = await store.get("webstats", "2026-11-08");
  assert.deepEqual(s.secs, { "/house-extensions.html": 120, "/contact.html": 40 });
  assert.deepEqual(s.secsN, { "/house-extensions.html": 2, "/contact.html": 1 });
  assert.equal(s.visitSecs, 160);
  assert.deepEqual(s.entry, { "/house-extensions.html": 1, "/": 2 });
  assert.deepEqual(s.places, { Exmouth: 1, Exeter: 1 });
  assert.equal(s.views, 4);
});

function createApiFor(store, published) {
  return createApi({ store, rules: siteRules(capabilities), auth: createDevAuth(), blobs: createDiskBlobs(os.tmpdir()), live: { publish: async (p) => void published.push(p) }, now: () => NOW });
}
