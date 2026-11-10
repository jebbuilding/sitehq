// The access rules, as a matrix: the table in docs/DATA_MODEL.md › Access rules, row by row, for an owner, two
// trades, two clients and nobody. If platform/capabilities.json changes, the first test fails until the table here
// (and the one in the docs) is brought into line.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { callerFor, siteRules } from "../core/roles.mjs";
import { compileRules } from "../core/rules.mjs";

const capabilities = JSON.parse(fs.readFileSync(new URL("../../platform/capabilities.json", import.meta.url), "utf8"));
const rules = siteRules(capabilities);

const owner = callerFor({ id: "owner", role: "owner" });
const sam = callerFor({ id: "emp1", role: "trade" });
const ann = callerFor({ id: "emp2", role: "trade" });
const sue = callerFor({ id: "u9", role: "client" });
const bob = callerFor({ id: "u8", role: "client" });

const can = (who, action, path) => rules.decide(who, path.split("/"), action);
/** Assert what `who` may do at each path: "rw", "r", or "" (nothing). */
function expect(name, who, table) {
  for (const [path, want] of Object.entries(table)) {
    assert.equal(can(who, "read", path), want.includes("r"), `${name} read ${path}`);
    assert.equal(can(who, "write", path), want.includes("w"), `${name} write ${path}`);
  }
}

// docs/DATA_MODEL.md › Access rules, as data: path → [read level, write level]
const TABLE = {
  sheets: ["owner", "owner"], "sheets/{self}": ["interact", "interact"],
  sites: ["view", "owner"], equipment: ["view", "owner"], docs: ["view", "owner"], inductions: ["view", "owner"],
  settings: ["view", "owner"], wfiles: ["view", "owner"], "wfiles/{self}": ["view", "interact"],
  jobs: ["interact", "owner"], talks: ["interact", "owner"], plan: ["interact", "owner"], sphotos: ["interact", "owner"],
  "sphotos/{self}": ["interact", "interact"],
  jobdone: ["interact", "interact"], chats: ["interact", "interact"], msgs: ["interact", "interact"],
  planprivate: ["owner", "owner"], visitinds: ["owner", "owner"], offapp: ["owner", "owner"], todos: ["owner", "owner"],
  webenq: ["owner", "owner"], webstats: ["owner", "owner"],
  portal: ["owner", "owner"], "portal/{self}": ["interact", "interact"],
};

test("platform/capabilities.json is the table in docs/DATA_MODEL.md", () => {
  const declared = Object.fromEntries(capabilities.db.rules.map((r) => [r.path, [r.read, r.write]]));
  assert.deepEqual(declared, TABLE);
  assert.equal(capabilities.db.rules.length, 25);
});

test("owner: reads and writes everything that is declared", () => {
  expect("owner", owner, {
    "sheets/emp1": "rw", "sheets/emp1/entries/a": "rw", "sheets/owner/signins/x": "rw",
    "sites/s1": "rw", "equipment/e1": "rw", "docs/d1": "rw", "inductions/i1": "rw", "settings/app": "rw",
    "wfiles/emp1/f/x": "rw", "wfiles/owner/f/x/parts/0": "rw",
    "jobs/j1": "rw", "talks/t1": "rw", "plan/p1": "rw", "sphotos/emp1/p/x": "rw",
    "jobdone/j1": "rw", "chats/team": "rw", "msgs/team/m/a1": "rw",
    "planprivate/p1": "rw", "visitinds/v1": "rw", "offapp/o1": "rw", "todos/c1": "rw",
    "webenq/w1": "rw", "webstats/2026-11-08": "rw",
    "portal/u9": "rw", "portal/u9/docs/d1": "rw", "portal/u9/uploads/x/parts/0": "rw",
  });
});

test("trade: own profile and subcollections, shared reference data read-only, nothing owner-private", () => {
  expect("trade", sam, {
    // sheets: only their own
    "sheets/emp1": "rw", "sheets/emp1/entries/a": "rw", "sheets/emp1/signoffs/x": "rw", "sheets/emp1/signins/x": "rw",
    "sheets/emp2": "", "sheets/emp2/entries/a": "", "sheets/emp2/invoices/i": "", "sheets/owner": "", "sheets/owner/signins/x": "",
    // shared reference data: read, never write
    "sites/s1": "r", "equipment/e1": "r", "docs/d1": "r", "inductions/i1": "r", "settings/app": "r", "settings/weather": "r",
    // Word files: read all, write only under their own id
    "wfiles/emp1/f/x": "rw", "wfiles/emp1/f/x/parts/0": "rw", "wfiles/emp2/f/x": "r", "wfiles/owner/f/x": "r",
    // read, owner writes
    "jobs/j1": "r", "talks/t1": "r", "plan/p1": "r",
    // site photos: read all, write only their own
    "sphotos/emp1/p/x": "rw", "sphotos/emp2/p/x": "r",
    // read and write
    "jobdone/j1": "rw", "chats/team": "rw", "msgs/team/m/a1": "rw",
    // owner-private
    "planprivate/p1": "", "visitinds/v1": "", "offapp/o1": "", "todos/c1": "", "todos/t1": "",
    "webenq/w1": "", "webstats/2026-11-08": "",
    "portal/u9": "", "portal/u9/docs/d1": "", "portal/emp2": "",
  });
  // a trade's own id under portal is theirs (this is how someone joins as a client before they are one)
  expect("trade", sam, { "portal/emp1": "rw" });
  expect("another trade", ann, { "sheets/emp2": "rw", "sheets/emp1": "", "sheets/emp1/entries/a": "" });
});

test("client: only portal/<their id>, and nothing else at all", () => {
  expect("client", sue, {
    "portal/u9": "rw", "portal/u9/docs/d1": "rw", "portal/u9/signs/s1": "rw", "portal/u9/uploads/x/parts/0": "rw",
    "portal/u8": "", "portal/u8/docs/d1": "", "portal/emp1": "",
    "sheets/u9": "", "sheets/u9/entries/a": "", "sheets/emp1": "",
    "sites/s1": "", "equipment/e1": "", "docs/d1": "", "inductions/i1": "", "settings/app": "",
    "wfiles/u9/f/x": "", "sphotos/u9/p/x": "", "jobs/j1": "", "talks/t1": "", "plan/p1": "",
    "jobdone/j1": "", "chats/team": "", "msgs/team/m/a1": "",
    "planprivate/p1": "", "visitinds/v1": "", "offapp/o1": "", "todos/c1": "", "data/users/u9/pin": "",
    "webenq/w1": "", "webstats/2026-11-08": "",
  });
  expect("another client", bob, { "portal/u8": "rw", "portal/u9": "", "portal/u9/docs/d1": "" });
});

// the records added in Nov 2026 (v339–364): where each lives decides who can see it
test("new records: owner-only ones stay owner-only, shared ones are read-only, a client's picks are theirs", () => {
  const ownerOnly = ["todos/firm-1", "todos/rfq-1", "todos/val-1", "todos/vat-2026-09-30", "todos/sdi-x", "todos/prog-1", "todos/po-1"];
  expect("trade", sam, Object.fromEntries(ownerOnly.map((p) => [p, ""]).concat([["plan/eqb-1", "r"], ["plan/prg-1", "r"], ["equipment/e1", "r"], ["portal/u9/picks/p1", ""]])));
  expect("client", sue, Object.fromEntries(ownerOnly.map((p) => [p, ""]).concat([["portal/u9/picks/p1", "rw"], ["portal/u8/picks/p1", ""], ["plan/prg-1", ""], ["plan/eqb-1", ""]])));
  expect("owner", owner, Object.fromEntries(ownerOnly.map((p) => [p, "rw"]).concat([["portal/u9/picks/p1", "rw"], ["plan/eqb-1", "rw"]])));
});

test("nobody signed in: nothing", () => {
  const paths = ["sheets/emp1", "sites/s1", "settings/app", "docs/d1", "chats/team", "msgs/team/m/a1", "todos/c1", "portal/u9", "wfiles/emp1/f/x", "data/users/owner/pin"];
  for (const who of [null, undefined, callerFor(null), callerFor({ id: "x", role: "admin" }), callerFor({ id: "", role: "owner" }), callerFor({ role: "owner" }), { id: "x", level: "god" }])
    for (const p of paths) for (const action of ["read", "write"]) assert.equal(can(who, action, p), false, `${JSON.stringify(who)} ${action} ${p}`);
});

test("the per-user private area: data/users/<id> is its user's alone, the owner included", () => {
  expect("owner", owner, { "data/users/owner/pin": "rw", "data/users/owner/leads/apps": "rw", "data/users/emp1/pin": "", "data/users/u9/x": "" });
  // with SiteHQ's root default only the owner has anything there (only the owner's screens use it)
  expect("trade", sam, { "data/users/emp1/pin": "", "data/users/owner/pin": "", "data/users/emp2/pin": "" });
  // with the platform's own root default each signed-in user has their own, and still nobody else's
  const platform = compileRules(capabilities);
  assert.equal(platform.decide(sam, ["data", "users", "emp1", "pin"], "write"), true);
  assert.equal(platform.decide(sam, ["data", "users", "emp2", "pin"], "read"), false);
  assert.equal(platform.decide(owner, ["data", "users", "emp1", "pin"], "read"), false);
});

test("paths no rule covers are owner-only here (the platform would open them)", () => {
  expect("owner", owner, { "newthing/x": "rw" });
  expect("trade", sam, { "newthing/x": "", "data/other": "" });
  const platform = compileRules(capabilities);
  assert.equal(platform.decide(sam, ["newthing", "x"], "read"), true);
  assert.equal(platform.decide(sam, ["newthing", "x"], "write"), true);
});

test("matching: deepest rule wins, unset levels inherit, {self} is the caller's id only", () => {
  const r = compileRules({ db: { rules: [
    { path: "", read: "interact", write: "admin" },
    { path: "a", write: "owner" }, // read inherits "interact" from the root rule
    { path: "a/b/c", read: "owner" }, // write inherits "owner" from "a"
    { path: "votes", read: "view", write: "owner" },
    { path: "votes/{self}", write: "interact" }, // read inherits "view" from "votes"
    { path: "sealed/{self}", read: "interact", write: "interact" }, // no rule at "sealed": other people's are private
  ] } });
  const lvl = (level, id = "u1") => ({ id, level });
  const d = (who, action, path) => r.decide(who, path.split("/"), action);
  assert.equal(d(lvl("interact"), "read", "x/y"), true);
  assert.equal(d(lvl("view"), "read", "x/y"), false);
  assert.equal(d(lvl("interact"), "write", "x/y"), false);
  assert.equal(d(lvl("admin"), "write", "x/y"), true);
  assert.equal(d(lvl("interact"), "read", "a/b"), true, "read inherited from the root rule");
  assert.equal(d(lvl("admin"), "write", "a/b"), false, "write set at a");
  assert.equal(d(lvl("admin"), "read", "a/b/c/d"), false, "deeper rule is stricter");
  assert.equal(d(lvl("owner"), "write", "a/b/c/d"), true);
  assert.equal(d(lvl("view"), "read", "votes/u2"), true, "the prefix rule opens other people's");
  assert.equal(d(lvl("interact"), "write", "votes/u1"), true);
  assert.equal(d(lvl("interact"), "write", "votes/u1/more/x"), true, "subcollections inherit");
  assert.equal(d(lvl("interact"), "write", "votes/u2"), false);
  assert.equal(d(lvl("owner"), "write", "votes/u2"), true);
  assert.equal(d(lvl("interact"), "read", "sealed/u1/x/y"), true);
  assert.equal(d(lvl("owner", "boss"), "read", "sealed/u1/x/y"), false, "private from the owner too");
  assert.equal(d(lvl("owner", "boss"), "read", "sealed/boss"), true);
});

test("listing a collection: what a caller can see in it", () => {
  const scope = (who, path) => rules.listScope(who, path.split("/"));
  assert.deepEqual(scope(owner, "sheets"), { others: true, own: true, mixed: false });
  assert.deepEqual(scope(sam, "sheets"), { others: false, own: true, mixed: false }, "a trade sees only their own profile");
  assert.deepEqual(scope(sam, "sheets/emp1/entries"), { others: true, own: true, mixed: false });
  assert.deepEqual(scope(sam, "sheets/emp2/entries"), { others: false, own: false, mixed: false });
  assert.deepEqual(scope(sam, "todos"), { others: false, own: false, mixed: false });
  assert.deepEqual(scope(sam, "sites"), { others: true, own: true, mixed: false });
  assert.deepEqual(scope(sue, "portal"), { others: false, own: true, mixed: false }, "a client sees only their own portal");
  assert.deepEqual(scope(sue, "portal/u9/docs"), { others: true, own: true, mixed: false });
  assert.deepEqual(scope(sue, "sites"), { others: false, own: false, mixed: false });
  assert.deepEqual(scope(null, "sites"), { others: false, own: false, mixed: false });
});

test("a bad declaration is refused when the rules are loaded", () => {
  const bad = (rulesList, pattern) => assert.throws(() => compileRules({ db: { rules: rulesList } }), pattern);
  bad([{ path: "a/{self}/b", read: "view" }], /\{self\} may only be the last segment/);
  bad([{ path: "a", read: "boss" }], /read must be one of/);
  bad([{ path: "a", read: "owner", write: "view" }], /write level is below read level/);
  bad([{ path: "a", read: "view" }, { path: "a", read: "owner" }], /declared twice/);
  bad([{ path: "a", read: "view" }, { path: "a/{self}", write: "interact" }], /must set both read and write/);
  bad(Array.from({ length: 65 }, (_, i) => ({ path: "c" + i, read: "view" })), /at most 64/);
});
