// Builds the production pieces from environment variables, once per Lambda container. Shared by http.mjs and ws.mjs.
// There is deliberately no way to select the dev sign-in or the in-memory store from here.
//
//   TABLE_NAME             DynamoDB table (store/dynamodb.mjs describes its keys)                    both
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

let shared = null;
/** Store, rules and sign-in – what both handlers need. */
export function base() {
  if (!shared) {
    const clientId = need("USER_POOL_CLIENT_ID").split(",").map((s) => s.trim()).filter(Boolean);
    shared = {
      store: createDynamoStore({ tableName: need("TABLE_NAME") }),
      rules: siteRules(capabilities),
      auth: createCognitoAuth({ userPoolId: need("USER_POOL_ID"), clientId: clientId.length === 1 ? clientId[0] : clientId, tokenUse: process.env.TOKEN_USE || "access" }),
    };
  }
  return shared;
}

export const blobsFromEnv = () => createS3Blobs({ bucket: need("ASSETS_BUCKET"), prefix: process.env.ASSETS_PREFIX || "assets/" });
