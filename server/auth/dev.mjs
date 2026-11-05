// Sign-in for local development and tests ONLY: a token "dev:<user id>" selects one of a fixed list of made-up
// users. Nothing checks who is asking, so this must never be reachable from the internet – the Lambda handlers
// (server/handlers/) cannot use it; only the local runner and the tests construct it.
//
// The auth interface, shared with cognito.mjs:
//   verify(token) → { id, role, name?, exp? }, or null if the token is not acceptable
//     role is "owner" | "trade" | "client" (core/roles.mjs); exp is epoch seconds, absent if it never runs out

/** The made-up people in the test seed (tests/harness8src.js, tests/crawl.js). */
export const SEED_USERS = {
  owner: { role: "owner", name: "James Bray" },
  emp1: { role: "trade", name: "Sam Test" },
  u9: { role: "client", name: "Sue Jones" },
};

export function createDevAuth(users = SEED_USERS) {
  return {
    async verify(token) {
      const m = /^dev:([\w-]{1,64})$/.exec(typeof token === "string" ? token : "");
      const u = m && Object.prototype.hasOwnProperty.call(users, m[1]) ? users[m[1]] : null;
      return u ? { id: m[1], role: u.role, name: u.name || "" } : null;
    },
  };
}
