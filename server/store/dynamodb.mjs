// The store interface (see memory.mjs) on one DynamoDB table.
//
//   pk  (S, partition key)  the collection path, e.g. "sheets/emp1/entries"
//   sk  (S, sort key)       the document id
//   d   (S)                 the document body as JSON text
//   v   (S)                 a fresh random value on every write; lets update() notice a concurrent write
//   ttl (N, optional)       epoch seconds; only on the server's own "$" records. Enable TTL on this attribute.
//
// The body is kept as JSON text, not as DynamoDB attributes, so that a document reads back exactly as it was
// written: key order, empty values and every number survive, and nothing depends on DynamoDB's own type rules.
// Nothing queries inside documents (filters and sorts run in the API), so nothing is lost by it.
// A collection read is one Query on pk (paged), strongly consistent, which returns ids in ascending order.
import { randomUUID } from "node:crypto";
import {
  ConditionalCheckFailedException, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { unavailable } from "../core/errors.mjs";

/**
 * @param options.tableName  the table
 * @param options.client     a DynamoDBClient (optional; one is made from options.clientConfig otherwise)
 */
export function createDynamoStore({ tableName, client, clientConfig }) {
  if (!tableName) throw new Error("createDynamoStore: tableName is required");
  const db = client || new DynamoDBClient(clientConfig || {});
  const key = (coll, id) => ({ pk: { S: coll }, sk: { S: id } });

  async function read(coll, id) {
    const r = await db.send(new GetItemCommand({ TableName: tableName, Key: key(coll, id), ConsistentRead: true }));
    return r.Item ? { data: JSON.parse(r.Item.d.S), v: r.Item.v.S } : null;
  }
  function item(coll, id, data, ttl) {
    const it = { ...key(coll, id), d: { S: JSON.stringify(data) }, v: { S: randomUUID() } };
    if (ttl) it.ttl = { N: String(Math.floor(Date.now() / 1000) + ttl) };
    return it;
  }

  return {
    async get(coll, id) {
      const r = await read(coll, id);
      return r ? r.data : null;
    },
    async list(coll) {
      const out = [];
      let from;
      do {
        const r = await db.send(new QueryCommand({
          TableName: tableName, ConsistentRead: true, ExclusiveStartKey: from,
          KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": { S: coll } },
          ProjectionExpression: "sk, d",
        }));
        for (const it of r.Items || []) out.push({ id: it.sk.S, data: JSON.parse(it.d.S) });
        from = r.LastEvaluatedKey;
      } while (from);
      return out;
    },
    async set(coll, id, data, opts) {
      await db.send(new PutItemCommand({ TableName: tableName, Item: item(coll, id, data, opts && opts.ttl) }));
    },
    // Read, merge, write back only if nobody else wrote in between; otherwise start again.
    async update(coll, id, patch) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const cur = await read(coll, id), next = Object.assign(cur ? cur.data : {}, patch);
        try {
          await db.send(new PutItemCommand({
            TableName: tableName, Item: item(coll, id, next),
            ...(cur
              ? { ConditionExpression: "v = :v", ExpressionAttributeValues: { ":v": { S: cur.v } } }
              : { ConditionExpression: "attribute_not_exists(pk)" }),
          }));
          return next;
        } catch (e) {
          if (!(e instanceof ConditionalCheckFailedException) && e.name !== "ConditionalCheckFailedException") throw e;
        }
      }
      throw unavailable("the document is being written by someone else; try again");
    },
    async delete(coll, id) {
      await db.send(new DeleteItemCommand({ TableName: tableName, Key: key(coll, id) }));
    },
  };
}

/** The table definition the store expects (for DynamoDB Local in tests; the CDK stack declares the real one). */
export const TABLE_SCHEMA = {
  KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }, { AttributeName: "sk", KeyType: "RANGE" }],
  AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }, { AttributeName: "sk", AttributeType: "S" }],
  BillingMode: "PAY_PER_REQUEST",
};
