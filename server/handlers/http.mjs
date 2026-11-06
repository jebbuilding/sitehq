// Lambda entry point for the HTTP API: API Gateway HTTP API, Lambda proxy integration, payload format 2.0.
// Route every method of /api/{proxy+} and /_blob/{proxy+} here, on the $default stage (so the path the function
// sees is the path the browser asked for). Environment variables: see env.mjs.
//
//   export handler(event) → { statusCode, headers, body, isBase64Encoded }
import { createApi } from "../core/api.mjs";
import { createLive } from "../core/live.mjs";
import { createApiGatewayTransport } from "../transport/apigw-ws.mjs";
import { base, blobsFromEnv, dataStore, liveStore } from "./env.mjs";

/** Turn an API function (core/api.mjs) into a Lambda handler. Exported for tests. */
export function lambdaHttp(api) {
  return async function handler(event) {
    const headers = {};
    for (const [k, v] of Object.entries(event.headers || {})) headers[k.toLowerCase()] = v;
    if (Array.isArray(event.cookies) && event.cookies.length) headers.cookie = event.cookies.join("; "); // format 2.0 moves cookies here
    const res = await api({
      method: event.requestContext.http.method,
      path: event.rawPath,
      headers,
      body: event.body ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8") : null,
    });
    const binary = Buffer.isBuffer(res.body);
    return { statusCode: res.status, headers: res.headers, body: binary ? res.body.toString("base64") : res.body || "", isBase64Encoded: binary };
  };
}

let ready = null;
function production() {
  const { rules, auth } = base(), store = dataStore();
  // Without WS_ENDPOINT writes still work; nobody is told about them (pages then refresh on a timer).
  const live = process.env.WS_ENDPOINT
    ? createLive({ store: liveStore(), rules, auth, transport: createApiGatewayTransport({ endpoint: process.env.WS_ENDPOINT }) })
    : null;
  return lambdaHttp(createApi({ store, rules, auth, blobs: blobsFromEnv(), live }));
}

export const handler = (event) => (ready || (ready = production()))(event);
