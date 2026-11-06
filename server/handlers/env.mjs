// Builds the production pieces from environment variables, once per Lambda container. Shared by http.mjs and ws.mjs.
// There is deliberately no way to select the dev sign-in or the in-memory store from here.
//
//   TABLE_NAME             DynamoDB table for the documents (store/dynamodb.mjs describes its keys)  http (ws: only without the next one)
//   CONNECTIONS_TABLE_NAME DynamoDB table for the live-update records ($conn, $sub:…, $cs:…),        both, optional
//                          same keys and TTL attribute. Without it they go in TABLE_NAME.
//   USER_POOL_ID           Cognito user pool id                                                      both
//   USER_POOL_CLIENT_ID    Cognito app client id (comma-separated if several)                        both
//   TOKEN_USE              "access" (default) or "id": which Cognito token the page sends            both
//   ASSETS_BUCKET          S3 bucket for uploaded files                                              http
//   ASSETS_PREFIX          key prefix in that bucket, default "assets/"                              http
//   WS_ENDPOINT            the WebSocket API's management endpoint,                                  http (ws: optional)
//                          https://<api id>.execute-api.<region>.amazonaws.com/<stage>
import capabilities from "../../platform/capabilities.json" with { type: "json" };
import { createCognitoAuth } from "../auth/cognito.mjs";
import { createS3Blobs } from "../blobs/s3.mjs";
import { siteRules } from "../core/roles.mjs";
import { createDynamoStore } from "../store/dynamodb.mjs";

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

let shared = null, documents = null, liveRecords = null;
/** Rules and sign-in – what both handlers need. */
export function base() {
  if (!shared) {
    const clientId = need("USER_POOL_CLIENT_ID").split(",").map((s) => s.trim()).filter(Boolean);
    shared = {
      rules: siteRules(capabilities),
      auth: createCognitoAuth({ userPoolId: need("USER_POOL_ID"), clientId: clientId.length === 1 ? clientId[0] : clientId, tokenUse: process.env.TOKEN_USE || "access" }),
    };
  }
  return shared;
}

/** The store that holds the documents (and the file records). */
export const dataStore = () => documents || (documents = createDynamoStore({ tableName: need("TABLE_NAME") }));

/**
 * The store core/live.mjs keeps connections and subscriptions in: the connections table if there is one, so the
 * WebSocket function needs no access to the documents at all and these short-lived rows stay out of the table
 * that is backed up; otherwise the documents' table.
 */
export const liveStore = () =>
  liveRecords || (liveRecords = process.env.CONNECTIONS_TABLE_NAME ? createDynamoStore({ tableName: process.env.CONNECTIONS_TABLE_NAME }) : dataStore());

export const blobsFromEnv = () => createS3Blobs({ bucket: need("ASSETS_BUCKET"), prefix: process.env.ASSETS_PREFIX || "assets/" });
