// The local stand-in for Cognito (auth/local-cognito.mjs) and the local server with it switched on: its tokens are
// accepted through the ordinary Cognito verifier, the dev tokens still work beside them, and the three operations
// the sign-in screen uses answer the way Cognito's documentation describes. The screen itself is tested in a
// browser by tests/backend-signin.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import { createCognitoAuth } from "../auth/cognito.mjs";
import { createLocalCognito, LOCAL_POOL } from "../auth/local-cognito.mjs";
import { startLocal } from "../local.mjs";

const TARGET = "AWSCognitoIdentityProviderService.";
const call = (cognito, op, body, headers) => {
  const r = cognito.handle({ method: "POST", headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": TARGET + op, ...headers }, body: JSON.stringify({ ClientId: cognito.clientId, ...body }) });
  return { status: r.status, ...JSON.parse(r.body) };
};
const start = (cognito, email) => call(cognito, "InitiateAuth", { AuthFlow: "USER_AUTH", AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: "EMAIL_OTP" } });
const answer = (cognito, email, session, code) => call(cognito, "RespondToAuthChallenge", { ChallengeName: "EMAIL_OTP", Session: session, ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: code } });
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());

test("stand-in: email → code → tokens the ordinary Cognito verifier accepts", async () => {
  const sent = [], cognito = createLocalCognito({ onCode: (email, code) => sent.push([email, code]) });
  const c = start(cognito, "Trade@SiteHQ.test");
  assert.deepEqual([c.status, c.ChallengeName, c.ChallengeParameters.CODE_DELIVERY_DELIVERY_MEDIUM], [200, "EMAIL_OTP", "EMAIL"]);
  assert.ok(!JSON.stringify(c).includes("trade@sitehq.test"), "the reply does not spell the address out");
  assert.deepEqual(sent, [["trade@sitehq.test", cognito.codeFor("trade@sitehq.test")]]);
  const r = answer(cognito, "trade@sitehq.test", c.Session, sent[0][1]);
  assert.equal(r.status, 200);
  const a = r.AuthenticationResult;
  assert.deepEqual([a.TokenType, a.ExpiresIn, typeof a.RefreshToken], ["Bearer", 3600, "string"]);

  // a verifier built the way the Lambda handlers build theirs, told this pool's public key instead of fetching it
  const auth = createCognitoAuth({ userPoolId: cognito.userPoolId, clientId: cognito.clientId, jwks: cognito.jwks });
  const u = await auth.verify(a.AccessToken);
  assert.deepEqual([u.id, u.role, u.name], ["emp1", "trade", ""]);
  assert.equal(await auth.verify(a.IdToken), null, "the ID token is not what the server takes");
  assert.equal(await auth.verify(a.RefreshToken), null);
  const access = claims(a.AccessToken);
  assert.deepEqual([access.token_use, access.client_id, access.iss], ["access", LOCAL_POOL.clientId, `https://cognito-idp.eu-west-2.amazonaws.com/${LOCAL_POOL.userPoolId}`]);
  assert.ok(!JSON.stringify(access).includes("@"), "the access token carries no email address");
  assert.equal(await createCognitoAuth({ userPoolId: cognito.userPoolId, clientId: cognito.clientId, jwks: createLocalCognito().jwks }).verify(a.AccessToken), null, "another stand-in's key does not verify it");

  assert.equal(answer(cognito, "trade@sitehq.test", c.Session, sent[0][1]).__type, "NotAuthorizedException", "a code works once");
  assert.equal(cognito.codeFor("trade@sitehq.test"), undefined);
});

test("stand-in: wrong codes, a code that has run out, an address with no account", () => {
  const cognito = createLocalCognito();
  let c = start(cognito, "owner@sitehq.test");
  const code = cognito.codeFor("owner@sitehq.test"), wrong = code === "00000000" ? "00000001" : "00000000";
  assert.deepEqual([answer(cognito, "owner@sitehq.test", c.Session, wrong).__type, answer(cognito, "owner@sitehq.test", c.Session, "").__type], ["CodeMismatchException", "CodeMismatchException"]);
  assert.equal(answer(cognito, "client@sitehq.test", c.Session, code).__type, "NotAuthorizedException", "a code belongs to the address it was sent to");
  assert.equal(answer(cognito, "owner@sitehq.test", c.Session, wrong).__type, "NotAuthorizedException", "the third wrong answer ends it");
  assert.equal(answer(cognito, "owner@sitehq.test", c.Session, code).__type, "NotAuthorizedException", "…for the right code too");

  cognito.settings.sessionSeconds = -1;
  c = start(cognito, "owner@sitehq.test");
  assert.equal(answer(cognito, "owner@sitehq.test", c.Session, cognito.codeFor("owner@sitehq.test")).__type, "NotAuthorizedException", "run out");
  cognito.settings.sessionSeconds = 180;

  // no account: answered like anyone else, no code exists, nothing signs in
  const known = start(cognito, "client@sitehq.test"), nobody = start(cognito, "nobody@example.test");
  assert.deepEqual(Object.keys(nobody).sort(), Object.keys(known).sort());
  assert.equal(nobody.ChallengeName, "EMAIL_OTP");
  assert.equal(cognito.codeFor("nobody@example.test"), undefined);
  assert.equal(answer(cognito, "nobody@example.test", nobody.Session, "12345678").__type, "CodeMismatchException");
  cognito.settings.unknownUserChallenge = "PASSWORD";
  assert.equal(start(cognito, "nobody@example.test").ChallengeName, "PASSWORD");
  assert.equal(start(cognito, "owner@sitehq.test").ChallengeName, "EMAIL_OTP");

  assert.equal(call(cognito, "InitiateAuth", { ClientId: "someone-else", AuthFlow: "USER_AUTH", AuthParameters: { USERNAME: "owner@sitehq.test" } }).__type, "ResourceNotFoundException");
  assert.equal(call(cognito, "AdminCreateUser", {}).__type, "UnknownOperationException");
  assert.equal(call(cognito, "InitiateAuth", {}, { "content-type": "application/json" }).__type, "UnknownOperationException");
});

test("stand-in: renewing with the refresh token, until it is revoked", async () => {
  const cognito = createLocalCognito({ accessTokenSeconds: 120 });
  const c = start(cognito, "client@sitehq.test");
  const first = answer(cognito, "client@sitehq.test", c.Session, cognito.codeFor("client@sitehq.test")).AuthenticationResult;
  assert.equal(first.ExpiresIn, 120);
  const renew = () => call(cognito, "InitiateAuth", { AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: first.RefreshToken } });
  const again = renew();
  assert.equal(again.status, 200);
  assert.equal(again.AuthenticationResult.RefreshToken, undefined, "a renewal gives no new refresh token");
  assert.notEqual(again.AuthenticationResult.AccessToken, first.AccessToken);
  assert.deepEqual(await cognito.auth.verify(again.AuthenticationResult.AccessToken).then((u) => [u.id, u.role]), ["u9", "client"]);
  assert.equal(call(cognito, "RevokeToken", { Token: first.RefreshToken }).status, 200);
  assert.deepEqual([renew().status, renew().__type], [400, "NotAuthorizedException"]);
  assert.equal(call(cognito, "InitiateAuth", { AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: "made-up" } }).__type, "NotAuthorizedException");
});

test("local server with the stand-in: its tokens and the dev tokens both sign in; an account with no role does not", async () => {
  const cognito = createLocalCognito({ accessTokenSeconds: 1 });
  const local = await startLocal({ cognito });
  try {
    const post = (op, body) => fetch(local.url + "/cognito", { method: "POST", headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": TARGET + op }, body: JSON.stringify({ ClientId: cognito.clientId, ...body }) }).then((r) => r.json());
    const me = (token) => fetch(local.url + "/api/me", { headers: { authorization: "Bearer " + token } }).then(async (r) => [r.status, (await r.json()).role]);
    const signIn = async (email) => {
      const c = await post("InitiateAuth", { AuthFlow: "USER_AUTH", AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: "EMAIL_OTP" } });
      return (await post("RespondToAuthChallenge", { ChallengeName: "EMAIL_OTP", Session: c.Session, ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: cognito.codeFor(email) } })).AuthenticationResult;
    };
    const owner = await signIn("owner@sitehq.test");
    assert.deepEqual(await me(owner.AccessToken), [200, "owner"]);
    assert.deepEqual(await me("dev:emp1"), [200, "trade"], "the dev tokens the other tests use still work");
    assert.deepEqual(await me(owner.IdToken), [401, undefined]);
    assert.deepEqual(await me((await signIn("norole@sitehq.test")).AccessToken), [401, undefined], "no role group, no access");
    await new Promise((r) => setTimeout(r, 1100));
    assert.deepEqual(await me(owner.AccessToken), [401, undefined], "an access token past its time is refused");
  } finally {
    await local.close();
  }
  const plain = await startLocal();
  try {
    assert.equal((await fetch(plain.url + "/cognito", { method: "POST" })).status, 404, "without the stand-in there is no /cognito");
  } finally {
    await plain.close();
  }
});
