// `npm run seed:dev` (scripts/seed-dev.mjs): the tests' made-up data written into a deployed dev environment.
// Here the table is dynalite (the DynamoDB emulator the store test uses, in this process) and S3 is a stand-in
// client that records what it is sent. Nothing talks to AWS.
import assert from "node:assert/strict";
import test from "node:test";
import { CreateTableCommand, DynamoDBClient, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import { seedFiles, testSeed } from "../../scripts/seed.mjs";
import { checkTarget, peopleMap, remapPeople, seedEnvironment } from "../../scripts/seed-dev.mjs";
import { bundleApp } from "../../scripts/bundle.mjs";
import { startLocal } from "../local.mjs";
import { createDynamoStore, TABLE_SCHEMA } from "../store/dynamodb.mjs";

const TABLE = "sitehq-dev-data", BUCKET = "sitehq-dev-files-111111111111";
const SUB = "3f0e6a52-1c1d-4f0a-9d53-0a1b2c3d4e5f";
let emulator = null, db = null;

/** A stand-in for S3Client: objects are kept in a Map, every call is recorded. */
function fakeS3() {
  const objects = new Map(), calls = [];
  return {
    objects, calls,
    async send(cmd) {
      const name = cmd.constructor.name, { Bucket, Key } = cmd.input;
      calls.push(`${name} ${Bucket}/${Key}`);
      if (name === "PutObjectCommand") objects.set(Key, { bucket: Bucket, type: cmd.input.ContentType, size: cmd.input.Body.length });
      else if (name === "DeleteObjectCommand") objects.delete(Key);
      else throw new Error("unexpected S3 call " + name);
      return {};
    },
  };
}
const untouchable = { send: async () => { throw new Error("nothing may be asked of AWS"); } };
const seed = testSeed(), files = seedFiles(bundleApp()); // made once: the seed stamps some documents with the time it is read

test.before(async () => {
  const { default: dynalite } = await import("dynalite");
  emulator = dynalite({ createTableMs: 0, deleteTableMs: 0 });
  await new Promise((resolve) => emulator.listen(0, "127.0.0.1", resolve));
  db = new DynamoDBClient({ endpoint: `http://127.0.0.1:${emulator.address().port}`, region: "eu-west-2", credentials: { accessKeyId: "local", secretAccessKey: "local" } });
  await db.send(new CreateTableCommand({ TableName: TABLE, ...TABLE_SCHEMA }));
  await waitUntilTableExists({ client: db, maxWaitTime: 20, minDelay: 0.05, maxDelay: 0.2 }, { TableName: TABLE });
});
test.after(async () => {
  if (db) db.destroy();
  if (emulator) await new Promise((resolve) => emulator.close(resolve));
});

test("seed:dev refuses every environment but dev, before asking AWS anything", async () => {
  for (const env of ["prod", "production", "Dev", "dev ", "development", "", undefined, null])
    await assert.rejects(seedEnvironment({ env, table: TABLE, bucket: BUCKET, dynamo: untouchable, s3: untouchable }), /only ever writes to the "dev" environment/, String(env));
  // …and a table or bucket that is not dev's, whatever the environment is called
  for (const [table, bucket] of [["sitehq-prod-data", BUCKET], [TABLE, "sitehq-prod-files-222222222222"], ["sitehq-development-data", BUCKET], ["data", BUCKET], [undefined, BUCKET]])
    await assert.rejects(seedEnvironment({ env: "dev", table, bucket, dynamo: untouchable, s3: untouchable }), /is not one of the dev environment's/, `${table} ${bucket}`);
  assert.doesNotThrow(() => checkTarget({ env: "dev", table: TABLE, bucket: BUCKET }));
});

test("seed:dev writes the test seed and its files, as the server reads them", async () => {
  const s3 = fakeS3(), log = [];
  const done = await seedEnvironment({ env: "dev", table: TABLE, bucket: BUCKET, dynamo: db, s3, seed, files, log: (m) => log.push(m) });
  assert.deepEqual([done.documents, done.files, done.removed], [Object.keys(seed).length, Object.keys(files).length, { documents: 0, files: 0 }]);
  assert.equal(Object.values(done.collections).reduce((a, b) => a + b, 0), done.documents);
  assert.ok(done.collections.sites >= 1 && done.collections.sheets >= 1);

  const store = createDynamoStore({ tableName: TABLE, client: db });
  for (const [path, data] of Object.entries(seed)) {
    const i = path.lastIndexOf("/");
    assert.deepEqual(await store.get(path.slice(0, i), path.slice(i + 1)), JSON.parse(JSON.stringify(data)), path);
  }
  const records = await store.list("$assets");
  assert.deepEqual(records.map((r) => r.id).sort(), Object.keys(files).sort());
  for (const r of records) {
    assert.deepEqual([r.data.by, r.data.ready, r.data.type, r.data.size], ["owner", true, files[r.id].type, files[r.id].bytes.length]);
    assert.deepEqual(s3.objects.get("assets/" + r.id), { bucket: BUCKET, type: files[r.id].type, size: files[r.id].bytes.length });
  }
  assert.equal(s3.objects.size, Object.keys(files).length);

  // the real API, on that table: the owner sees the seeded sites, the seeded trade their own timesheet entries
  const local = await startLocal({ store });
  try {
    const list = (token, path) => fetch(local.url + "/api/db/list", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ path }) }).then((r) => r.json()).then((j) => j.docs.map((d) => d.id).sort());
    assert.deepEqual(await list("dev:owner", "sites"), Object.keys(seed).filter((p) => p.startsWith("sites/")).map((p) => p.slice(6)).sort());
    assert.ok((await list("dev:emp1", "sheets/emp1/entries")).length >= 1);
  } finally {
    await local.close();
  }
});

test("seed:dev refuses a table that already holds documents, unless told to replace them", async () => {
  const store = createDynamoStore({ tableName: TABLE, client: db });
  await store.set("sites", "made-by-hand", { name: "9 Tried It Out Lane" });
  await store.set("$assets", "handmade", { by: "owner", type: "image/png", size: 3, at: 1, ready: true });
  await store.set("$conn", "abc=", { user: "owner" }, { ttl: 600 }); // somebody has the page open
  const count = Object.keys(seed).length + Object.keys(files).length + 2;

  const s3 = fakeS3();
  s3.objects.set("assets/handmade", { bucket: BUCKET, type: "image/png", size: 3 });
  await assert.rejects(seedEnvironment({ env: "dev", table: TABLE, bucket: BUCKET, dynamo: db, s3, seed, files }), new RegExp(`already holds ${count} documents – nothing was changed.*--replace`));
  assert.deepEqual(s3.calls, [], "nothing was written or deleted");
  assert.deepEqual(await store.get("sites", "made-by-hand"), { name: "9 Tried It Out Lane" });

  const done = await seedEnvironment({ env: "dev", table: TABLE, bucket: BUCKET, dynamo: db, s3, seed, files, replace: true });
  assert.deepEqual(done.removed, { documents: Object.keys(seed).length + 1, files: Object.keys(files).length + 1 });
  assert.equal(await store.get("sites", "made-by-hand"), null);
  assert.equal(await store.get("$assets", "handmade"), null);
  assert.ok(!s3.objects.has("assets/handmade") && s3.calls.includes(`DeleteObjectCommand ${BUCKET}/assets/handmade`), "the file it recorded went too");
  assert.deepEqual(await store.get("$conn", "abc="), { user: "owner" }, "live-update records are left alone");
  assert.deepEqual((await store.list("sites")).map((d) => d.id).sort(), Object.keys(seed).filter((p) => p.startsWith("sites/")).map((p) => p.slice(6)).sort());
  assert.equal(s3.objects.size, Object.keys(files).length);
});

test("seed:dev --person gives a made-up person a real sign-in's id, everywhere it appears", async () => {
  assert.deepEqual(peopleMap(["emp1=" + SUB, "owner=abc-123"]), { emp1: SUB, owner: "abc-123" });
  assert.deepEqual(peopleMap(undefined), {});
  for (const bad of [["nobody=" + SUB], ["emp1"], ["emp1="], ["emp1=has spaces"], ["emp1=a/b"], ["emp1=" + SUB, "emp1=other"], ["emp1=" + SUB, "u9=" + SUB], ["emp1=owner"], ["__proto__=x"]])
    assert.throws(() => peopleMap(bad), /--person/, bad.join(" "));

  const moved = remapPeople(seed, { emp1: SUB });
  assert.equal(Object.keys(moved).length, Object.keys(seed).length);
  assert.ok(!JSON.stringify(moved).includes('"emp1"') && !Object.keys(moved).some((p) => p.split("/").includes("emp1")), "the made-up id is gone");
  assert.deepEqual(moved[`sheets/${SUB}`], seed["sheets/emp1"]);
  assert.deepEqual(moved["jobs/j1"].assignees, seed["jobs/j1"].assignees.map((a) => (a === "emp1" ? SUB : a)));
  assert.equal(moved["settings/app"].people[0].id, SUB);
  assert.deepEqual(moved["sites/s1"], seed["sites/s1"], "documents that do not mention them are unchanged");
  assert.deepEqual(remapPeople(seed, {}), seed);

  const s3 = fakeS3();
  const done = await seedEnvironment({ env: "dev", table: TABLE, bucket: BUCKET, dynamo: db, s3, seed, files, replace: true, people: { emp1: SUB, owner: "abc-123" } });
  assert.deepEqual(done.people, { emp1: SUB, owner: "abc-123" });
  const store = createDynamoStore({ tableName: TABLE, client: db });
  assert.ok((await store.list(`sheets/${SUB}/entries`)).length >= 1);
  assert.deepEqual(await store.list("sheets/emp1/entries"), []);
  assert.equal((await store.get("settings", "app")).ownerId, "abc-123");
  assert.ok((await store.list("$assets")).every((r) => r.data.by === "abc-123"), "the files are recorded as the owner's uploads");
});
