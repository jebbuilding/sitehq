// Inviting people (core/people.mjs): POST /api/people, with the local account-maker and an outbox for email,
// and the production account-maker (auth/cognito-admin.mjs) against a stand-in for the Cognito client.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCognitoDirectory, unusablePassword } from "../auth/cognito-admin.mjs";
import { createDevAuth, SEED_USERS } from "../auth/dev.mjs";
import { createLocalDirectory } from "../auth/local-directory.mjs";
import { createDiskBlobs } from "../blobs/disk.mjs";
import { createApi } from "../core/api.mjs";
import { welcomeEmail } from "../core/people.mjs";
import { siteRules } from "../core/roles.mjs";
import { createOutboxMailer } from "../mail/outbox.mjs";
import { createMemoryStore } from "../store/memory.mjs";

const capabilities = JSON.parse(await fs.readFile(new URL("../../platform/capabilities.json", import.meta.url), "utf8"));
const dirs = [];
test.after(() => Promise.all(dirs.map((d) => fs.rm(d, { recursive: true, force: true }))));

async function setup({ directory, mailer, appUrl = "https://app.example.test/", store = createMemoryStore() } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitehq-people-test-"));
  dirs.push(dir);
  const users = { ...SEED_USERS }, people = {}, published = [];
  directory = directory === undefined ? createLocalDirectory({ users, people }) : directory;
  mailer = mailer === undefined ? createOutboxMailer() : mailer;
  const api = createApi({ store, rules: siteRules(capabilities), auth: createDevAuth(users), blobs: createDiskBlobs(dir), live: { publish: async (p) => void published.push(p) }, directory, mailer, appUrl });
  const call = async (token, p, body, method = "POST") => {
    const r = await api({ method, path: p, headers: { authorization: "Bearer " + token, "x-sitehq-client": "page1" }, body: body === undefined ? null : Buffer.from(JSON.stringify(body)) });
    return { status: r.status, body: JSON.parse(r.body) };
  };
  return { api, call, store, users, people, mailer, published };
}
const SAM2 = { email: "Sam.Two@Example.TEST ", name: "Sam Two", role: "trade", profile: { details: { fullName: "Sam Two", trade: "Plasterer", confirmedAt: 1 }, role: "employee" }, company: "JEB Building Services", ownerName: "James Bray" };

test("the owner invites a trade: account, profile, live update and welcome email", async () => {
  const { call, store, users, people, mailer, published } = await setup();
  const r = await call("dev:owner", "/api/people", SAM2);
  assert.equal(r.status, 200);
  assert.equal(r.body.emailed, true);
  const id = r.body.id;
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(people["sam.two@example.test"], { sub: id, groups: ["trade"] }, "the address is stored in lower case, in the trade group");
  assert.equal(users[id].role, "trade");
  const prof = await store.get("sheets", id);
  assert.equal(prof.name, "Sam Two");
  assert.equal(prof.role, "employee");
  assert.equal(prof.details.trade, "Plasterer");
  assert.equal(prof.invitedBy, "owner");
  assert.ok(prof.invitedAt > 0);
  assert.deepEqual(published, ["sheets/" + id]);
  assert.equal(mailer.sent.length, 1);
  const m = mailer.sent[0];
  assert.equal(m.to, "sam.two@example.test");
  assert.equal(m.subject, "Welcome to the JEB Building Services app");
  assert.match(m.text, /^Hi Sam,/);
  assert.match(m.text, /Open https:\/\/app\.example\.test\//);
  assert.match(m.text, /sam\.two@example\.test/);
  assert.match(m.text, /speak to James Bray/);
  // the new person can now use the app as themselves
  const me = await call("dev:" + id, "/api/me", undefined, "GET");
  assert.deepEqual(me.body, { id, role: "trade", isOwner: false, name: "Sam Two", canUpload: true });
});

test("only the owner can invite", async () => {
  const { call, mailer } = await setup();
  for (const t of ["dev:emp1", "dev:u9"]) {
    const r = await call(t, "/api/people", SAM2);
    assert.equal(r.status, 403, t);
    assert.equal(r.body.error.code, "forbidden");
  }
  assert.equal((await call("nonsense", "/api/people", SAM2)).status, 401);
  assert.equal(mailer.sent.length, 0);
});

test("what an invite must have", async () => {
  const { call, people } = await setup();
  for (const [body, why] of [
    [{ ...SAM2, email: "" }, "no email"],
    [{ ...SAM2, email: "not an email" }, "not an email"],
    [{ ...SAM2, email: "a@b" }, "no domain ending"],
    [{ ...SAM2, name: "  " }, "no name"],
    [{ ...SAM2, role: "owner" }, "another owner"],
    [{ ...SAM2, role: "client" }, "a client"],
    [{ ...SAM2, profile: [] }, "profile not an object"],
    [{ ...SAM2, profile: { big: "x".repeat(300 * 1024) } }, "profile too big"],
  ]) {
    const r = await call("dev:owner", "/api/people", body);
    assert.equal(r.status, 400, why);
    assert.equal(r.body.error.code, "invalid_argument", why);
  }
  assert.deepEqual(people, {}, "no account was made");
});

test("an address that already has an account is refused, and nothing changes", async () => {
  const { call, store, mailer } = await setup();
  const first = await call("dev:owner", "/api/people", SAM2);
  const again = await call("dev:owner", "/api/people", { ...SAM2, email: "sam.two@example.test", name: "Someone Else" });
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, "already_exists");
  assert.equal((await store.list("sheets")).length, 1);
  assert.equal((await store.get("sheets", first.body.id)).name, "Sam Two");
  assert.equal(mailer.sent.length, 1);
});

test("the email failing still leaves them set up, and says so", async () => {
  const { call, store } = await setup({ mailer: { send: async () => { throw new Error("SES says no to someone@example.test"); } } });
  const errors = [], log = console.error;
  console.error = (...a) => errors.push(a.join(" "));
  try {
    const r = await call("dev:owner", "/api/people", SAM2);
    assert.equal(r.status, 200);
    assert.equal(r.body.emailed, false);
    assert.ok(await store.get("sheets", r.body.id));
  } finally { console.error = log; }
  assert.ok(errors.length && errors.every((e) => !e.includes("@")), "the address is not logged");
});

test("a profile that cannot be stored removes the account again", async () => {
  const store = createMemoryStore(), set = store.set.bind(store);
  store.set = async (c, i, d) => { if (c === "sheets") throw new Error("table unavailable"); return set(c, i, d); };
  const { call, people, users, mailer } = await setup({ store });
  const log = console.error;
  console.error = () => {};
  try { assert.equal((await call("dev:owner", "/api/people", SAM2)).status, 500); } finally { console.error = log; }
  assert.deepEqual(people, {});
  assert.deepEqual(Object.keys(users).sort(), Object.keys(SEED_USERS).sort());
  assert.equal(mailer.sent.length, 0);
});

test("without an account-maker or mailer, inviting answers 501", async () => {
  const { call } = await setup({ directory: null, mailer: null });
  const r = await call("dev:owner", "/api/people", SAM2);
  assert.equal(r.status, 501);
  assert.equal(r.body.error.code, "not_available");
});

test("the welcome email keeps every value on one line and escapes it in the HTML", () => {
  const m = welcomeEmail({ name: "<b>Eve</b>\nBcc: x@y.z", email: "eve@example.test", company: "A & B <Builders>", ownerName: "Jo\r\nO'Neil", appUrl: "https://app.example.test/" });
  assert.equal(m.subject, "Welcome to the A & B <Builders> app");
  assert.ok(!/[\r\n]/.test(m.subject));
  assert.match(m.text, /^Hi <b>Eve<\/b>,/);
  assert.match(m.text, /speak to Jo O'Neil\./);
  assert.ok(!m.html.includes("<b>Eve"));
  assert.ok(m.html.includes("A &amp; B &lt;Builders&gt;"));
  assert.ok(m.html.includes("Jo O&#39;Neil"));
  const plain = welcomeEmail({ name: "", email: "x@example.test", appUrl: "https://a.test/" });
  assert.match(plain.text, /^Hi there,/);
  assert.match(plain.text, /speak to the office/);
});

test("production account-maker: the calls Cognito is sent, and clean-up on failure", async () => {
  const sent = [];
  let failOn = "";
  const client = { async send(cmd) {
    const name = cmd.constructor.name;
    sent.push([name, cmd.input]);
    if (name === failOn) throw Object.assign(new Error("no"), { name: failOn === "AdminCreateUserCommand" ? "UsernameExistsException" : "InternalErrorException" });
    if (name === "AdminCreateUserCommand") return { User: { Username: "u-1", Attributes: [{ Name: "email", Value: cmd.input.Username }, { Name: "sub", Value: "sub-123" }] } };
    return {};
  } };
  const dir = createCognitoDirectory({ userPoolId: "eu-west-2_X", client });
  assert.deepEqual(await dir.create({ email: "a@example.test", role: "trade" }), { id: "sub-123" });
  assert.deepEqual(sent.map((s) => s[0]), ["AdminCreateUserCommand", "AdminAddUserToGroupCommand", "AdminSetUserPasswordCommand"]);
  assert.equal(sent[0][1].MessageAction, "SUPPRESS", "Cognito sends no email of its own");
  assert.deepEqual(sent[1][1], { UserPoolId: "eu-west-2_X", Username: "a@example.test", GroupName: "trade" });
  assert.equal(sent[2][1].Permanent, true);

  sent.length = 0; failOn = "AdminCreateUserCommand";
  await assert.rejects(dir.create({ email: "a@example.test", role: "trade" }), (e) => e.code === "exists");

  sent.length = 0; failOn = "AdminAddUserToGroupCommand";
  await assert.rejects(dir.create({ email: "b@example.test", role: "trade" }));
  assert.deepEqual(sent.map((s) => s[0]), ["AdminCreateUserCommand", "AdminAddUserToGroupCommand", "AdminDeleteUserCommand"], "a half-made account is removed");
});

test("the unusable password meets the pool's policy", () => {
  for (let i = 0; i < 200; i++) {
    const p = unusablePassword();
    assert.ok(p.length >= 20 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p), p);
  }
});
