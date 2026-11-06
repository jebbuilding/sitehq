// A stand-in for Cognito's public endpoint, for local development and tests ONLY: the three calls the sign-in
// screen (src/platform/sign-in.js) makes, answered in this process. No email is sent – the one-time code is handed
// to `onCode` (the local run prints it) and kept for tests to read (`codeFor`).
//
//   InitiateAuth            AuthFlow USER_AUTH + PREFERRED_CHALLENGE EMAIL_OTP → an EMAIL_OTP challenge and a Session
//                           AuthFlow REFRESH_TOKEN_AUTH                        → a new access token
//   RespondToAuthChallenge  ChallengeName EMAIL_OTP + EMAIL_OTP_CODE          → access, ID and refresh tokens
//   RevokeToken             a refresh token                                    → it stops working
//
// The tokens are real JWTs, shaped like Cognito's and signed with a key made here. `auth` is the server's ordinary
// Cognito verifier (auth/cognito.mjs) given that key's public half, so a token from here goes through exactly the
// checks a real one does: signature, issuer, app client, token use, expiry, one role group.
//
// It copies what Cognito's documentation says, as read in November 2026 – it has NOT been compared with the real
// service (server/README.md › Sign-in lists what is assumed). Like auth/dev.mjs it must never be reachable from
// the internet: only server/local.mjs builds it, the Lambda handlers cannot.
import crypto from "node:crypto";
import { createCognitoAuth } from "./cognito.mjs";

/** The made-up pool the local run pretends to be. */
export const LOCAL_POOL = { region: "eu-west-2", userPoolId: "eu-west-2_LocalPool", clientId: "localwebclient" };

/**
 * The made-up people who can sign in locally: email → { sub, groups }. `sub` is the person's id in the test seed
 * (auth/dev.mjs › SEED_USERS), so each lands in their own seeded data. The last has an account but no role, as
 * someone does when `admin-add-user-to-group` was forgotten.
 */
export const LOCAL_PEOPLE = {
  "owner@sitehq.test": { sub: "owner", groups: ["owner"] },
  "trade@sitehq.test": { sub: "emp1", groups: ["trade"] },
  "client@sitehq.test": { sub: "u9", groups: ["client"] },
  "norole@sitehq.test": { sub: "x-norole", groups: [] },
};

const TARGET = "AWSCognitoIdentityProviderService.";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const random = (n) => crypto.randomBytes(n).toString("base64url");

/**
 * @param options.people              email → { sub, groups } (default LOCAL_PEOPLE)
 * @param options.accessTokenSeconds  how long an access token lasts (default 3600, as infra/config.ts)
 * @param options.sessionSeconds      how long a code can be used (default 180, Cognito's default)
 * @param options.onCode              (email, code) – called when a code "is sent"
 */
export function createLocalCognito({ region = LOCAL_POOL.region, userPoolId = LOCAL_POOL.userPoolId, clientId = LOCAL_POOL.clientId, people = LOCAL_PEOPLE, accessTokenSeconds = 3600, sessionSeconds = 180, onCode } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = "local-" + random(6);
  const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" }] };
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const sessions = new Map(); // Session → { email, code (null: nobody to send one to), until, tries }
  const refreshTokens = new Map(); // refresh token → { email, originJti }
  const codes = new Map(); // email → the last code "sent"
  const settings = {
    accessTokenSeconds,
    sessionSeconds,
    // What an address with no account is answered with. Cognito picks at random among the sign-in methods the pool
    // allows (here: an emailed code, or a password), so that the answer does not give the account's absence away.
    unknownUserChallenge: "EMAIL_OTP",
  };
  const calls = []; // every operation asked for, in order (tests)

  function jwt(claims) {
    const body = b64({ kid, alg: "RS256", typ: "JWT" }) + "." + b64(claims);
    return body + "." + crypto.sign("RSA-SHA256", Buffer.from(body), privateKey).toString("base64url");
  }
  function tokensFor(email, originJti = crypto.randomUUID()) {
    const p = people[email], now = Math.floor(Date.now() / 1000), exp = now + settings.accessTokenSeconds;
    const groups = p.groups.length ? { "cognito:groups": p.groups } : {};
    return {
      AccessToken: jwt({ sub: p.sub, ...groups, iss: issuer, client_id: clientId, origin_jti: originJti, token_use: "access", scope: "aws.cognito.signin.user.admin", auth_time: now, exp, iat: now, jti: crypto.randomUUID(), username: p.sub }),
      IdToken: jwt({ sub: p.sub, ...groups, iss: issuer, aud: clientId, origin_jti: originJti, token_use: "id", auth_time: now, exp, iat: now, jti: crypto.randomUUID(), "cognito:username": p.sub, email, email_verified: true }),
      ExpiresIn: settings.accessTokenSeconds,
      TokenType: "Bearer",
    };
  }
  const ok = (body) => ({ status: 200, headers: { "content-type": "application/x-amz-json-1.1" }, body: JSON.stringify(body) });
  const error = (type, message, status = 400) => ({ status, headers: { "content-type": "application/x-amz-json-1.1", "x-amzn-errortype": type + ":" }, body: JSON.stringify({ __type: type, message }) });
  const mask = (email) => email.replace(/^(.)[^@]*@(.).*$/, "$1***@$2***");

  function initiateAuth(q) {
    const p = q.AuthParameters || {};
    if (q.AuthFlow === "REFRESH_TOKEN_AUTH") {
      const held = refreshTokens.get(p.REFRESH_TOKEN);
      if (!held || !people[held.email]) return error("NotAuthorizedException", held ? "Refresh Token has been revoked" : "Invalid Refresh Token");
      return ok({ AuthenticationResult: tokensFor(held.email, held.originJti), ChallengeParameters: {} });
    }
    if (q.AuthFlow !== "USER_AUTH") return error("InvalidParameterException", "Initiate Auth method not supported.");
    const email = String(p.USERNAME || "").trim().toLowerCase();
    if (!email) return error("InvalidParameterException", "Missing required parameter USERNAME");
    const session = random(48), known = Object.hasOwn(people, email);
    const until = Date.now() + settings.sessionSeconds * 1000;
    if (!known && settings.unknownUserChallenge !== "EMAIL_OTP") {
      sessions.set(session, { email, code: null, until, tries: 0 });
      return ok({ ChallengeName: settings.unknownUserChallenge, Session: session, ChallengeParameters: {}, AvailableChallenges: [settings.unknownUserChallenge] });
    }
    if (p.PREFERRED_CHALLENGE !== "EMAIL_OTP") {
      sessions.set(session, { email, code: null, until, tries: 0 });
      return ok({ ChallengeName: "SELECT_CHALLENGE", Session: session, ChallengeParameters: {}, AvailableChallenges: ["EMAIL_OTP", "PASSWORD"] });
    }
    let code = null;
    if (known) {
      code = String(crypto.randomInt(0, 1e8)).padStart(8, "0");
      codes.set(email, code);
      if (onCode) onCode(email, code);
    }
    sessions.set(session, { email, code, until, tries: 0 });
    return ok({ ChallengeName: "EMAIL_OTP", Session: session, ChallengeParameters: { CODE_DELIVERY_DELIVERY_MEDIUM: "EMAIL", CODE_DELIVERY_DESTINATION: mask(email) } });
  }

  function respondToAuthChallenge(q) {
    const s = sessions.get(q.Session), r = q.ChallengeResponses || {};
    if (!s || s.until < Date.now()) {
      sessions.delete(q.Session);
      return error("NotAuthorizedException", "Invalid session for the user, session is expired.");
    }
    if (q.ChallengeName !== "EMAIL_OTP" || String(r.USERNAME || "").trim().toLowerCase() !== s.email) return error("NotAuthorizedException", "Invalid session for the user.");
    const given = Buffer.from(String(r.EMAIL_OTP_CODE || "")), want = Buffer.from(s.code || "");
    if (!s.code || given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      if (++s.tries >= 3) { // three wrong answers and the code is finished
        sessions.delete(q.Session);
        return error("NotAuthorizedException", "Invalid session for the user.");
      }
      return error("CodeMismatchException", "Invalid code or auth state for the user.");
    }
    sessions.delete(q.Session);
    codes.delete(s.email);
    const originJti = crypto.randomUUID(), refresh = random(64);
    refreshTokens.set(refresh, { email: s.email, originJti });
    return ok({ AuthenticationResult: { ...tokensFor(s.email, originJti), RefreshToken: refresh }, ChallengeParameters: {} });
  }

  return {
    region, userPoolId, clientId, jwks, settings, calls,
    /** The server's ordinary Cognito verifier, checking against this stand-in's key. */
    auth: createCognitoAuth({ userPoolId, clientId, jwks }),
    /** The code last "sent" to an address and not yet used, or undefined. */
    codeFor: (email) => codes.get(String(email).toLowerCase()),
    /** End every session: no refresh token works afterwards (as when a person is removed, or 30 days pass). */
    revokeRefreshTokens: () => refreshTokens.clear(),
    /** One request to the endpoint: { method, headers (lower-case names), body (Buffer or string) } → { status, headers, body }. */
    handle({ method, headers, body }) {
      if (method !== "POST") return error("UnknownOperationException", "Only POST", 404);
      const target = String(headers["x-amz-target"] || "");
      let q;
      try { q = JSON.parse(String(body || "")); } catch (e) { return error("SerializationException", "The body is not JSON"); }
      if (!target.startsWith(TARGET) || !/^application\/x-amz-json-1\.1\b/.test(String(headers["content-type"] || ""))) return error("UnknownOperationException", "Unknown operation");
      const op = target.slice(TARGET.length);
      calls.push(op === "InitiateAuth" ? op + ":" + q.AuthFlow : op);
      if (q.ClientId !== clientId) return error("ResourceNotFoundException", "User pool client does not exist.");
      if (op === "InitiateAuth") return initiateAuth(q);
      if (op === "RespondToAuthChallenge") return respondToAuthChallenge(q);
      if (op === "RevokeToken") { refreshTokens.delete(q.Token); return ok({}); }
      return error("UnknownOperationException", "Unknown operation");
    },
  };
}
