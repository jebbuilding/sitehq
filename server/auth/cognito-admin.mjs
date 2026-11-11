// Making sign-in accounts in production: the Cognito user pool's admin calls, for core/people.mjs.
//
//   create({ email, role }) → { id }   the account, in the one group that is its role; id is Cognito's `sub`
//   remove(email)                      deletes it again (used when the rest of an invite fails)
//
// Cognito sends nothing itself (MessageAction SUPPRESS): the welcome email is ours (core/people.mjs). An account
// an administrator creates starts in FORCE_CHANGE_PASSWORD, a state built for temporary passwords; it is given a
// long random permanent password at once – nobody is told it and nobody can reset it – so the account is
// CONFIRMED and signs in with the emailed code like any other. (Not yet tried against the real service:
// server/README.md › Sign-in lists what is assumed.)
import crypto from "node:crypto";
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

/** 40 random characters with at least one of each kind the pool's password policy asks for. */
export function unusablePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!#$%&*+-=?@^_"];
  const all = sets.join(""), pick = (s) => s[crypto.randomInt(s.length)];
  const chars = [...sets.map(pick), ...Array.from({ length: 36 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

export function createCognitoDirectory({ userPoolId, client = new CognitoIdentityProviderClient({}) }) {
  if (!userPoolId) throw new Error("createCognitoDirectory: userPoolId is required");
  const remove = (email) => client.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: email }));
  return {
    async create({ email, role }) {
      let out;
      try {
        out = await client.send(new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: email,
          UserAttributes: [{ Name: "email", Value: email }, { Name: "email_verified", Value: "true" }],
          MessageAction: "SUPPRESS",
        }));
      } catch (e) {
        if (e && (e.name === "UsernameExistsException" || e.name === "AliasExistsException")) throw Object.assign(new Error("exists"), { code: "exists" });
        throw e;
      }
      const attrs = (out.User && out.User.Attributes) || [];
      const id = (attrs.find((a) => a.Name === "sub") || {}).Value || (out.User && out.User.Username);
      try {
        await client.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: email, GroupName: role }));
        await client.send(new AdminSetUserPasswordCommand({ UserPoolId: userPoolId, Username: email, Password: unusablePassword(), Permanent: true }));
      } catch (e) {
        try { await remove(email); } catch (e2) {}
        throw e;
      }
      return { id };
    },
    remove,
  };
}
