// The access rules: who may read and write which paths. The rules are the `db.rules` list in
// platform/capabilities.json – the same file the claude.ai platform enforces today – interpreted the way
// platform/types/db.d.ts › ACCESS RULES describes:
//
//   - Levels are ordered view < interact < admin < owner. A caller may do something when their level is at least
//     the level the rule asks for.
//   - A rule applies to its path and everything below it (subcollections inherit).
//   - When several rules cover a path, the deepest one wins. `read` and `write` are looked up separately: a rule
//     that leaves one unset inherits it from the nearest rule above, and finally from the root default.
//   - A path ending in `/{self}` is each caller's own subtree: `sheets/{self}` covers `sheets/<my id>` and below,
//     for me only. `{self}` may only be the last segment.
//   - Somebody else's subtree under a `{self}` rule is covered by the rule AT the prefix (`sheets`) if one is
//     declared. If none is, it is private from everyone, the owner included (this is how `data/users/<id>` works).
//   - `data/users/{self}` exists without being declared (the platform's per-user private area).
//   - No caller, or a caller with no level, may do nothing.
//
// On top of the levels a caller can be confined to a list of subtrees (roles.mjs uses this for clients).
// The assumptions made here are listed in server/README.md › Rules.

export const LEVELS = ["view", "interact", "admin", "owner"];
const rank = (level) => LEVELS.indexOf(level);
const SELF = "{self}";
const SEGMENT = /^[A-Za-z0-9_\-.~:@+]+$/;

const startsWith = (segs, prefix) => prefix.length <= segs.length && prefix.every((s, i) => segs[i] === s);

function compileRule(rule, i) {
  const where = `db.rules[${i}]`;
  if (!rule || typeof rule.path !== "string") throw new Error(`${where}: path must be a string`);
  const segs = rule.path === "" ? [] : rule.path.split("/");
  const self = segs[segs.length - 1] === SELF;
  const prefix = self ? segs.slice(0, -1) : segs;
  for (const s of prefix) if (!SEGMENT.test(s)) throw new Error(`${where}: bad path "${rule.path}" ({self} may only be the last segment)`);
  for (const action of ["read", "write"])
    if (rule[action] !== undefined && rank(rule[action]) < 0) throw new Error(`${where}: ${action} must be one of ${LEVELS.join(", ")}`);
  if (rule.read && rule.write && rank(rule.write) < rank(rule.read)) throw new Error(`${where}: write level is below read level`);
  return { path: rule.path, prefix, self, read: rule.read, write: rule.write, depth: prefix.length + (self ? 0.5 : 0) };
}

/**
 * Compile a capabilities declaration into a decision function.
 * @param capabilities  the parsed platform/capabilities.json
 * @param options.root  levels for paths no rule covers. The platform's default is { read: "view", write: "interact" }.
 */
export function compileRules(capabilities, options = {}) {
  const root = options.root || { read: "view", write: "interact" };
  const declared = (capabilities && capabilities.db && capabilities.db.rules) || [];
  if (declared.length > 64) throw new Error("db.rules: at most 64 rules");
  const rules = declared.map(compileRule);
  const seen = new Set();
  for (const r of rules) {
    if (seen.has(r.path)) throw new Error(`db.rules: "${r.path}" is declared twice`);
    seen.add(r.path);
  }
  if (!seen.has("data/users/" + SELF)) rules.push(compileRule({ path: "data/users/" + SELF }, "implicit"));
  for (const r of rules) {
    if (!r.self) continue;
    const at = rules.find((x) => !x.self && x.path === r.prefix.join("/"));
    if (at && !(at.read && at.write)) throw new Error(`db.rules: "${at.path}" is the prefix of a {self} rule, so it must set both read and write`);
    r.opened = !!at; // a rule at the prefix opens other people's subtrees at its own levels
  }

  /** May this caller `read` or `write` the document or collection at `segs`? */
  function decide(caller, segs, action) {
    if (!caller || typeof caller.id !== "string" || !caller.id || rank(caller.level) < 0) return false;
    if (caller.confine && !caller.confine.some((c) => startsWith(segs, c.map((s) => (s === SELF ? caller.id : s))))) return false;
    let need = null, depth = -1;
    for (const r of rules) {
      if (!startsWith(segs, r.prefix)) continue;
      if (r.self) {
        if (segs.length === r.prefix.length) continue; // the prefix itself is in nobody's subtree
        if (segs[r.prefix.length] !== caller.id) {
          if (!r.opened) return false; // somebody else's private subtree
          continue;
        }
      }
      if (r[action] && r.depth > depth) { need = r[action]; depth = r.depth; }
    }
    return rank(caller.level) >= rank(need || root[action]);
  }

  const OTHER = "\u0000"; // stands for "any id that is not the caller's"; cannot be a real segment

  /**
   * What a caller can see when listing a collection, so the API can avoid reading what it would only throw away.
   *   others – documents that are not the caller's own id are readable
   *   own    – the document whose id is the caller's id is readable
   *   mixed  – a rule is declared below this collection, so documents must be checked one by one
   */
  function listScope(caller, collSegs) {
    if (!caller) return { others: false, own: false, mixed: false };
    const below = (r) => r.prefix.length > collSegs.length && startsWith(r.prefix, collSegs);
    return {
      others: decide(caller, [...collSegs, OTHER], "read"),
      own: decide(caller, [...collSegs, caller.id], "read"),
      mixed: rules.some(below),
    };
  }

  return { decide, listScope, rules: rules.map((r) => ({ path: r.path, read: r.read, write: r.write })) };
}
