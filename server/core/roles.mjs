// How SiteHQ's three kinds of user map onto the levels the rules are written in (rules.mjs).
//
// The claude.ai platform has no "client": on it a client and a trade hold the same level, and the app keeps clients
// to their portal in page code only. Here the token says which kind of user someone is, and a client is CONFINED to
// their own portal subtree on the server – nothing outside `portal/<their id>` can be read, written or subscribed to,
// whatever the level rules would otherwise allow. See server/README.md › Rules for what that changes for clients.
import { compileRules } from "./rules.mjs";

export const ROLES = {
  owner: { level: "owner", uploads: "any" },
  trade: { level: "interact", uploads: "own" },
  client: { level: "interact", confine: ["portal/{self}"], uploads: "none" },
};

// Paths no rule covers are owner-only here. (The platform would let any signed-in user read them and any trade
// write them; every collection the app uses is declared, so the only effect is that a new collection needs a rule.)
const ROOT = { read: "owner", write: "owner" };

/** The caller the rules see, for a verified user `{id, role}`; null if the role is unknown. */
export function callerFor(user) {
  const role = user && ROLES[user.role];
  if (!role || typeof user.id !== "string" || !user.id) return null;
  return { id: user.id, role: user.role, level: role.level, uploads: role.uploads, confine: role.confine && role.confine.map((p) => p.split("/")) };
}

/** The compiled rules with SiteHQ's root default. */
export const siteRules = (capabilities) => compileRules(capabilities, { root: ROOT });
