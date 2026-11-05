// Sign-in (dev tokens, Cognito JWTs) and the two file stores. Nothing here talks to AWS: Cognito tokens are signed
// with a key made in the test and checked against that key; S3 links are signed with made-up credentials and only
// looked at; S3 calls go to a stand-in client.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCognitoAuth } from "../auth/cognito.mjs";
import { createDevAuth } from "../auth/dev.mjs";
import { createDiskBlobs } from "../blobs/disk.mjs";
import { createS3Blobs } from "../blobs/s3.mjs";

test("dev tokens select one of the made-up users, and nothing else", async () => {
  const auth = createDevAuth();
  assert.deepEqual(await auth.verify("dev:owner"), { id: "owner", role: "owner", name: "James Bray" });
  assert.deepEqual(await auth.verify("dev:emp1"), { id: "emp1", role: "trade", name: "Sam Test" });
  assert.deepEqual(await auth.verify("dev:u9"), { id: "u9", role: "client", name: "Sue Jones" });
  for (const bad of ["", "owner", "dev:", "dev:nobody", "dev:owner ", "DEV:owner", "dev:constructor", "dev:__proto__", null, undefined, 7, {}]) assert.equal(await auth.verify(bad), null, String(bad));
  assert.deepEqual(await createDevAuth({ x1: { role: "trade" } }).verify("dev:x1"), { id: "x1", role: "trade", name: "" });
});

// ---- Cognito ----
const POOL = "eu-west-2_TestPool1", CLIENT = "testclient123", ISS = `https://cognito-idp.eu-west-2.amazonaws.com/${POOL}`;
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" }] };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(claims, key = privateKey, kid = "k1") {
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: "RS256", kid, typ: "JWT" }) + "." + b64({ iss: ISS, sub: "3f0e6a52-1c1d-4f0a-9d53-0a1b2c3d4e5f", token_use: "access", client_id: CLIENT, iat: now, exp: now + 3600, "cognito:groups": ["trade"], ...claims });
  return body + "." + crypto.sign("RSA-SHA256", Buffer.from(body), key).toString("base64url");
}

test("Cognito: a good token gives the user's id and role", async () => {
  const auth = createCognitoAuth({ userPoolId: POOL, clientId: CLIENT, jwks });
  const u = await auth.verify(jwt({}));
  assert.deepEqual({ id: u.id, role: u.role, name: u.name }, { id: "3f0e6a52-1c1d-4f0a-9d53-0a1b2c3d4e5f", role: "trade", name: "" });
  assert.ok(u.exp > Date.now() / 1000);
  assert.equal((await auth.verify(jwt({ "cognito:groups": ["owner"] }))).role, "owner");
  assert.equal((await auth.verify(jwt({ "cognito:groups": ["some-other-group", "client"] }))).role, "client");
  const id = createCognitoAuth({ userPoolId: POOL, clientId: CLIENT, tokenUse: "id", jwks });
  assert.deepEqual(await id.verify(jwt({ token_use: "id", aud: CLIENT, client_id: undefined, name: "Sam Test" })).then((x) => [x.role, x.name]), ["trade", "Sam Test"]);
});

test("Cognito: everything else is refused", async () => {
  const auth = createCognitoAuth({ userPoolId: POOL, clientId: CLIENT, jwks });
  const now = Math.floor(Date.now() / 1000);
  const refused = {
    "expired": jwt({ exp: now - 10 }),
    "signed with another key": jwt({}, other.privateKey),
    "another app client": jwt({ client_id: "someone-else" }),
    "another user pool": jwt({ iss: "https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_Other" }),
    "an ID token where an access token is expected": jwt({ token_use: "id", aud: CLIENT }),
    "no group": jwt({ "cognito:groups": undefined }),
    "no role group": jwt({ "cognito:groups": ["staff"] }),
    "two role groups": jwt({ "cognito:groups": ["trade", "owner"] }),
    "no sub": jwt({ sub: undefined }),
    "tampered claims": (() => { const [h, , s] = jwt({}).split("."); return `${h}.${b64({ iss: ISS, sub: "x", token_use: "access", client_id: CLIENT, exp: now + 3600, "cognito:groups": ["owner"] })}.${s}`; })(),
    "unsigned": b64({ alg: "none" }) + "." + b64({ iss: ISS, sub: "x", token_use: "access", client_id: CLIENT, exp: now + 3600, "cognito:groups": ["owner"] }) + ".",
    "a dev token": "dev:owner",
    "nothing": "",
  };
  for (const [why, token] of Object.entries(refused)) assert.equal(await auth.verify(token), null, why);
  assert.equal(await auth.verify(null), null);
});

// ---- files ----
test("files on disk: put, stat, read, delete; ids cannot leave the folder", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitehq-blob-test-"));
  try {
    const blobs = createDiskBlobs(path.join(dir, "made-on-demand"));
    assert.equal(await blobs.stat("abc"), null);
    assert.equal(await blobs.read("abc"), null);
    await blobs.put("abc", Buffer.from("hello"), "text/plain");
    assert.deepEqual(await blobs.stat("abc"), { size: 5 });
    assert.equal((await blobs.read("abc")).toString(), "hello");
    assert.equal(await blobs.uploadTarget("abc", { contentType: "image/png", size: 5 }), null, "bytes go through the API");
    assert.equal(await blobs.url("abc"), null, "and are served by the API");
    await blobs.delete("abc");
    await blobs.delete("abc");
    assert.equal(await blobs.stat("abc"), null);
    for (const bad of ["../x", "a/b", "", "a b", "x".repeat(65)]) await assert.rejects(() => blobs.put(bad, Buffer.from("x")), /bad file id/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("files on S3: pre-signed links are for one object, type and size, and expire", async () => {
  const blobs = createS3Blobs({ bucket: "sitehq-dev-assets", clientConfig: { region: "eu-west-2", credentials: { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "made-up" } } });
  const up = await blobs.uploadTarget("0123abcd", { contentType: "image/jpeg", size: 4321 });
  const u = new URL(up.url);
  assert.equal(up.method, "PUT");
  assert.deepEqual(up.headers, { "content-type": "image/jpeg" });
  assert.equal(u.hostname, "sitehq-dev-assets.s3.eu-west-2.amazonaws.com");
  assert.equal(u.pathname, "/assets/0123abcd");
  assert.equal(u.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(u.searchParams.get("X-Amz-SignedHeaders"), "content-length;content-type;host", "S3 will refuse another type or size");
  assert.ok(![...u.searchParams.keys()].some((k) => /checksum/i.test(k)), "no checksum of an empty body in the link");
  const down = new URL(await blobs.url("0123abcd", { contentType: "application/pdf" }));
  assert.equal(down.pathname, "/assets/0123abcd");
  assert.equal(down.searchParams.get("X-Amz-Expires"), "900");
  assert.equal(down.searchParams.get("response-content-type"), "application/pdf");
});

test("files on S3: the calls made for put, stat, read and delete", async () => {
  const objects = new Map(), calls = [];
  const client = { // a stand-in for S3Client
    async send(cmd) {
      const name = cmd.constructor.name, { Bucket, Key } = cmd.input;
      calls.push(`${name} ${Bucket}/${Key}`);
      if (name === "PutObjectCommand") return void objects.set(Key, { body: Buffer.from(cmd.input.Body), type: cmd.input.ContentType });
      if (name === "DeleteObjectCommand") return void objects.delete(Key);
      const o = objects.get(Key);
      if (!o) throw Object.assign(new Error("missing"), { name: name === "HeadObjectCommand" ? "NotFound" : "NoSuchKey", $metadata: { httpStatusCode: 404 } });
      return name === "HeadObjectCommand" ? { ContentLength: o.body.length } : { Body: { transformToByteArray: async () => new Uint8Array(o.body) } };
    },
  };
  const blobs = createS3Blobs({ bucket: "b", prefix: "files/", client });
  assert.equal(await blobs.stat("id1"), null);
  assert.equal(await blobs.read("id1"), null);
  await blobs.put("id1", Buffer.from("hello"), "image/png");
  assert.deepEqual(objects.get("files/id1").type, "image/png");
  assert.deepEqual(await blobs.stat("id1"), { size: 5 });
  assert.equal((await blobs.read("id1")).toString(), "hello");
  await blobs.delete("id1");
  assert.equal(await blobs.stat("id1"), null);
  assert.deepEqual(calls, ["HeadObjectCommand b/files/id1", "GetObjectCommand b/files/id1", "PutObjectCommand b/files/id1", "HeadObjectCommand b/files/id1", "GetObjectCommand b/files/id1", "DeleteObjectCommand b/files/id1", "HeadObjectCommand b/files/id1"]);
  // any other failure is not swallowed
  await assert.rejects(() => createS3Blobs({ bucket: "b", client: { send: async () => { throw Object.assign(new Error("denied"), { name: "AccessDenied", $metadata: { httpStatusCode: 403 } }); } } }).stat("x"), /denied/);
});
