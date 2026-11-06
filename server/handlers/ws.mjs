// Lambda entry point for live updates: API Gateway WebSocket API. Point the $connect, $disconnect and $default
// routes here (route selection expression can be anything; every message goes to $default).
// Environment variables: see env.mjs. The messages are described in core/live.mjs.
//
//   export handler(event) → { statusCode }
//
// $connect accepts everyone: a browser cannot send a sign-in header on a WebSocket, and a token in the URL would
// be logged. The first message must be { t: "auth", token }; until then the connection can subscribe to nothing.
import { createLive } from "../core/live.mjs";
import { createApiGatewayTransport } from "../transport/apigw-ws.mjs";
import { base, liveStore } from "./env.mjs";

/** Turn a live layer factory into a Lambda handler. `liveFor(event)` → the live layer. Exported for tests. */
export function lambdaWs(liveFor) {
  return async function handler(event) {
    const { routeKey, connectionId } = event.requestContext;
    const live = liveFor(event);
    if (routeKey === "$disconnect") await live.disconnect(connectionId);
    else if (routeKey !== "$connect") await live.onMessage(connectionId, event.body || "");
    return { statusCode: 200 };
  };
}

let live = null;
function production(event) {
  if (!live) {
    const { domainName, stage } = event.requestContext;
    const endpoint = process.env.WS_ENDPOINT || `https://${domainName}/${stage}`; // set WS_ENDPOINT if the API has a custom domain
    live = createLive({ ...base(), store: liveStore(), transport: createApiGatewayTransport({ endpoint }) });
  }
  return live;
}

export const handler = lambdaWs(production);
