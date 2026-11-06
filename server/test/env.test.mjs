// The production wiring (handlers/env.mjs, handlers/http.mjs, handlers/ws.mjs) with every AWS service pointed at
// this machine: which table the documents go in, and which the live-update records go in. DynamoDB is the
// in-process emulator; the SDK is sent there by AWS_ENDPOINT_URL_DYNAMODB. Nothing reaches AWS.
import assert from "node:assert/strict";
import test from "node:test";
import { CreateTableCommand, DynamoDBClient, ScanCommand, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import dynalite from "dynalite";
import { TABLE_SCHEMA } from "../store/dynamodb.mjs";

const emulator = dynalite({ createTableMs: 0 });
await new Promise((resolve) => emulator.listen(0, "127.0.0.1", resolve));
Object.assign(process.env, {
  AWS_ENDPOINT_URL_DYNAMODB: `http://127.0.0.1:${emulator.address().port}`, AWS_REGION: "eu-west-2", AWS_ACCESS_KEY_ID: "local", AWS_SECRET_ACCESS_KEY: "local",
  TABLE_NAME: "sitehq-test-data", CONNECTIONS_TABLE_NAME: "sitehq-test-connections",
  USER_POOL_ID: "eu-west-2_TestPool1", USER_POOL_CLIENT_ID: "testclient123", ASSETS_BUCKET: "sitehq-test-files", WS_ENDPOINT: "http://127.0.0.1:1/test",
});
const db = new DynamoDBClient({});
for (const TableName of ["sitehq-test-data", "sitehq-test-connections"]) {
  await db.send(new CreateTableCommand({ TableName, ...TABLE_SCHEMA }));
  await waitUntilTableExists({ client: db, maxWaitTime: 20, minDelay: 0.05, maxDelay: 0.2 }, { TableName });
}
const keys = async (TableName) => ((await db.send(new ScanCommand({ TableName }))).Items || []).map((i) => `${i.pk.S} / ${i.sk.S}`).sort();
test.after(async () => { db.destroy(); await new Promise((resolve) => emulator.close(resolve)); });

test("documents go in TABLE_NAME, live-update records in CONNECTIONS_TABLE_NAME", async () => {
  const env = await import("../handlers/env.mjs");
  assert.notEqual(env.liveStore(), env.dataStore());
  await env.dataStore().set("sites", "s1", { name: "12 Marine Way" });
  await env.liveStore().set("$conn", "A=", { uid: "owner", role: "owner", exp: 0 }, { ttl: 60 });
  await env.liveStore().set("$sub:sites", "A=.s", { c: "A=", s: "s", uid: "owner", role: "owner", exp: 0 }, { ttl: 60 });
  assert.deepEqual(await keys("sitehq-test-data"), ["sites / s1"]);
  assert.deepEqual(await keys("sitehq-test-connections"), ["$conn / A=", "$sub:sites / A=.s"]);
});

test("the WebSocket function touches only the connections table", async () => {
  const { handler } = await import("../handlers/ws.mjs");
  const event = (routeKey, body) => ({ requestContext: { routeKey, connectionId: "B=", domainName: "ws.example", stage: "test" }, body: body && JSON.stringify(body) });
  assert.deepEqual(await handler(event("$connect")), { statusCode: 200 });
  await handler(event("$default", { t: "sub", id: "s", path: "sites" })); // not signed in: refused, nothing stored
  await handler(event("$disconnect"));
  assert.deepEqual(await keys("sitehq-test-data"), ["sites / s1"], "the documents' table is as it was");
  assert.ok(!(await keys("sitehq-test-connections")).some((k) => k.includes("B=")));
});

test("the HTTP function answers from the same wiring", async () => {
  const { handler } = await import("../handlers/http.mjs");
  const r = await handler({ version: "2.0", rawPath: "/api/me", requestContext: { http: { method: "GET" } }, headers: {} });
  assert.equal(r.statusCode, 401);
  assert.equal(JSON.parse(r.body).error.code, "unauthenticated");
});

test("without CONNECTIONS_TABLE_NAME the live-update records share the documents' table", async () => {
  delete process.env.CONNECTIONS_TABLE_NAME;
  const env = await import("../handlers/env.mjs?one-table"); // a fresh copy of the module, which reads the environment anew
  assert.equal(env.liveStore(), env.dataStore());
  await env.liveStore().set("$conn", "C=", { uid: "owner", role: "owner", exp: 0 }, { ttl: 60 });
  assert.deepEqual(await keys("sitehq-test-data"), ["$conn / C=", "sites / s1"]);
});
