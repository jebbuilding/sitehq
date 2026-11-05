// Sign-in in production: a JSON Web Token issued by the Cognito user pool, checked with AWS's own verifier
// (signature against the pool's published keys, issuer, expiry, app client, token use).
//
// Who the caller is comes from the token alone:
//   id   = the "sub" claim (Cognito's permanent id for the user)
//   role = the user's Cognito group: exactly one of "owner", "trade", "client" in "cognito:groups".
//          No such group, or more than one, and the token is refused – a user is one kind of person.
//   name = the "name" claim if the token has one (ID tokens can; access tokens do not)
//
// Same interface as dev.mjs: verify(token) → { id, role, name, exp } | null.
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { ROLES } from "../core/roles.mjs";

/**
 * @param options.userPoolId  e.g. "eu-west-2_AbCdEfGhI"
 * @param options.clientId    the app client id (or a list of them)
 * @param options.tokenUse    "access" (default) or "id" – which of Cognito's two tokens the page sends
 * @param options.jwks        the pool's public keys, to skip fetching them (tests)
 */
export function createCognitoAuth({ userPoolId, clientId, tokenUse = "access", jwks }) {
  if (!userPoolId || !clientId) throw new Error("createCognitoAuth: userPoolId and clientId are required");
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse });
  if (jwks) verifier.cacheJwks(jwks);
  return {
    async verify(token) {
      if (typeof token !== "string" || !token) return null;
      let claims;
      try { claims = await verifier.verify(token); } catch (e) { return null; }
      const groups = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];
      const roles = groups.filter((g) => Object.prototype.hasOwnProperty.call(ROLES, g));
      if (roles.length !== 1 || typeof claims.sub !== "string" || !claims.sub) return null;
      return { id: claims.sub, role: roles[0], name: typeof claims.name === "string" ? claims.name : "", exp: claims.exp };
    },
  };
}
