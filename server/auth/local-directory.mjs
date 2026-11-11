// Making sign-in accounts locally and in tests ONLY, for core/people.mjs: a new person is added to the dev sign-in's
// list of users (so "dev:<id>" works for them) and, when there is one, to the Cognito stand-in's list of people
// (so they can sign in at /app with an emailed code, printed in the terminal).
import crypto from "node:crypto";

/**
 * @param options.users   the dev users object auth/dev.mjs was built with (changed in place)
 * @param options.people  the Cognito stand-in's email → { sub, groups } (changed in place) – optional
 */
export function createLocalDirectory({ users, people }) {
  const taken = (email) => (people && Object.hasOwn(people, email)) || Object.values(users).some((u) => u.email === email);
  return {
    async create({ email, role }) {
      if (taken(email)) throw Object.assign(new Error("exists"), { code: "exists" });
      const id = crypto.randomUUID();
      users[id] = { role, email };
      if (people) people[email] = { sub: id, groups: [role] };
      return { id };
    },
    async remove(email) {
      for (const [id, u] of Object.entries(users)) if (u.email === email) delete users[id];
      if (people) delete people[email];
    },
  };
}
