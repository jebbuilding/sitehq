// Live-update transport on an API Gateway WebSocket API: a message is delivered with PostToConnection. The
// connection ids are API Gateway's; the connection and subscription records live in the store (core/live.mjs).
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

/**
 * @param options.endpoint  the WebSocket API's management endpoint:
 *                          https://<api id>.execute-api.<region>.amazonaws.com/<stage>
 * @param options.client    an ApiGatewayManagementApiClient (optional, for tests)
 */
export function createApiGatewayTransport({ endpoint, client }) {
  if (!endpoint && !client) throw new Error("createApiGatewayTransport: endpoint is required");
  const api = client || new ApiGatewayManagementApiClient({ endpoint });
  return {
    async send(connectionId, message) {
      try {
        await api.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: Buffer.from(JSON.stringify(message)) }));
        return true;
      } catch (e) {
        // 410 Gone: the client went away without a $disconnect reaching us. Anything else: leave the records, the
        // client reconnects and re-reads if it missed a message.
        if (e.name === "GoneException" || (e.$metadata && e.$metadata.httpStatusCode === 410)) return false;
        console.error("live: post to connection failed:", e.name);
        return true;
      }
    },
  };
}
