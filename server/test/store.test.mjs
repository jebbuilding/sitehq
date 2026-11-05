// The store contract, run against both implementations: in memory, and DynamoDB.
// DynamoDB here is `dynalite` (a DynamoDB emulator in JavaScript, in this process) unless DYNAMODB_ENDPOINT points
// at a real DynamoDB Local, e.g.
//   docker run -p 8000:8000 amazon/dynamodb-local
//   DYNAMODB_ENDPOINT=http://127.0.0.1:8000 node --test server/test/store.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import { createDynamoStore, TABLE_SCHEMA } from "../store/dynamodb.mjs";
import { createMemoryStore } from "../store/memory.mjs";

function contract(name, make) {
  test(`${name}: a missing document is null, a missing collection is empty`, async () => {
    const s = await make();
    assert.equal(await s.get("sites", "nope"), null);
    assert.deepEqual(await s.list("nothing/here/yet"), []);
    await s.delete("sites", "nope"); // not an error
  });

  test(`${name}: a document reads back exactly as written`, async () => {
    const s = await make();
    const doc = {
      zebra: 1, apple: 2, mango: { z: 1, a: 2 }, // key order
      empty: "", none: null, list: [], map: {}, yes: true, no: false,
      text: "Mañana – “quotes” · 🏗️ \n tab\t", nested: { a: [1, { b: [2, { c: 3 }] }] },
      numbers: [0, -0.5, 0.1 + 0.2, 1e-200, 1.7976931348623157e308, 9007199254740993, 1793912475033, 123456789.12345679],
    };
    await s.set("todos", "t1", doc);
    const back = await s.get("todos", "t1");
    assert.deepEqual(back, doc);
    assert.equal(JSON.stringify(back), JSON.stringify(doc), "same key order");
    back.mango.z = 99; // what get() returns is a copy
    assert.equal((await s.get("todos", "t1")).mango.z, 1);
  });

  test(`${name}: set replaces the whole document`, async () => {
    const s = await make();
    await s.set("sites", "s1", { name: "A", client: "c1" });
    await s.set("sites", "s1", { name: "B" });
    assert.deepEqual(await s.get("sites", "s1"), { name: "B" });
  });

  test(`${name}: update merges at the top level only, and creates a missing document`, async () => {
    const s = await make();
    await s.set("sheets", "emp1", { name: "Sam", details: { mobile: "1", email: "e" }, reads: { team: 1 } });
    const merged = await s.update("sheets", "emp1", { details: { mobile: "2" }, day: null });
    assert.deepEqual(merged, { name: "Sam", details: { mobile: "2" }, reads: { team: 1 }, day: null });
    assert.deepEqual(await s.get("sheets", "emp1"), merged);
    await s.update("sheets", "new", { updated: 5 });
    assert.deepEqual(await s.get("sheets", "new"), { updated: 5 });
  });

  test(`${name}: updates made at the same moment all land`, async () => {
    const s = await make();
    await s.set("jobdone", "j1", { start: true });
    await Promise.all(Array.from({ length: 6 }, (_, i) => s.update("jobdone", "j1", { ["k" + i]: i })));
    assert.deepEqual(await s.get("jobdone", "j1"), { start: true, k0: 0, k1: 1, k2: 2, k3: 3, k4: 4, k5: 5 });
  });

  test(`${name}: list gives a collection's own documents in id order, not those nested deeper`, async () => {
    const s = await make();
    for (const id of ["b", "a", "c10", "c2", "B"]) await s.set("sheets/emp1/entries", id, { id });
    await s.set("sheets/emp1/entries/a/parts", "0", { deeper: true });
    await s.set("sheets/emp1/checks", "x", { other: true });
    await s.set("sheets", "emp1", { parent: true });
    assert.deepEqual((await s.list("sheets/emp1/entries")).map((d) => d.id), ["B", "a", "b", "c10", "c2"]);
    assert.deepEqual(await s.list("sheets/emp1/entries/a/parts"), [{ id: "0", data: { deeper: true } }]);
    assert.deepEqual((await s.list("sheets")).map((d) => d.id), ["emp1"]);
  });

  test(`${name}: delete removes one document and leaves those nested under it`, async () => {
    const s = await make();
    await s.set("wfiles/emp1/f", "x", { parts: 1 });
    await s.set("wfiles/emp1/f/x/parts", "0", { d: "AAAA" });
    await s.delete("wfiles/emp1/f", "x");
    assert.equal(await s.get("wfiles/emp1/f", "x"), null);
    assert.deepEqual(await s.get("wfiles/emp1/f/x/parts", "0"), { d: "AAAA" });
  });

  test(`${name}: a large collection comes back whole`, async () => {
    const s = await make();
    const big = "x".repeat(200 * 1024); // 12 documents of 200 KB: more than one 1 MB DynamoDB page
    for (let i = 0; i < 12; i++) await s.set("portal/u9/uploads/up1/parts", String(i).padStart(2, "0"), { d: big, i });
    const all = await s.list("portal/u9/uploads/up1/parts");
    assert.deepEqual(all.map((d) => d.data.i), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.equal(all[11].data.d.length, big.length);
  });

  test(`${name}: the server's own "$" records, with a time to live`, async () => {
    const s = await make();
    await s.set("$sub:sheets/emp1/entries", "conn=1.sub1", { c: "conn=1", s: "sub1" }, { ttl: 60 });
    assert.deepEqual(await s.list("$sub:sheets/emp1/entries"), [{ id: "conn=1.sub1", data: { c: "conn=1", s: "sub1" } }]);
    assert.deepEqual(await s.list("sheets/emp1/entries"), [], "not visible as a document");
  });
}

contract("memory store", async () => createMemoryStore());

// --- DynamoDB ---
let endpoint = process.env.DYNAMODB_ENDPOINT, emulator = null, n = 0;
const client = async () => {
  if (!endpoint) {
    const { default: dynalite } = await import("dynalite");
    emulator = dynalite({ createTableMs: 0, deleteTableMs: 0 });
    await new Promise((resolve) => emulator.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${emulator.address().port}`;
  }
  return new DynamoDBClient({ endpoint, region: "eu-west-2", credentials: { accessKeyId: "local", secretAccessKey: "local" } });
};
let db = null;
const tables = [];
contract(`DynamoDB store (${process.env.DYNAMODB_ENDPOINT ? "DynamoDB Local" : "dynalite"})`, async () => {
  db = db || (await client());
  const tableName = `sitehq-test-${process.pid}-${n++}`;
  await db.send(new CreateTableCommand({ TableName: tableName, ...TABLE_SCHEMA }));
  await waitUntilTableExists({ client: db, maxWaitTime: 20, minDelay: 0.05, maxDelay: 0.2 }, { TableName: tableName });
  tables.push(tableName);
  return createDynamoStore({ tableName, client: db });
});

test.after(async () => {
  if (db && process.env.DYNAMODB_ENDPOINT) for (const t of tables) await db.send(new DeleteTableCommand({ TableName: t })).catch(() => {});
  if (db) db.destroy();
  if (emulator) await new Promise((resolve) => emulator.close(resolve));
});
