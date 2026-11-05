/* =====================================================================================
 * PLACEHOLDER LAMBDA HANDLER – NOT THE SITEHQ API.
 *
 * infra/lib/sitehq-stack.ts deploys this file only when the real handler named in
 * infra/config.ts (server/handlers/http.mjs, server/handlers/ws.mjs) does not exist in
 * the repository. It lets `cdk synth` and a first dev deploy work before server/ lands.
 * It reads nothing, writes nothing and answers every request with "not implemented".
 * A deploy to an environment with `allowPlaceholderHandlers: false` (prod) refuses to
 * use it.
 * ===================================================================================== */
export const handler = async (event) => {
  // WebSocket events carry a routeKey like "$connect"; refuse the connection.
  if (event?.requestContext?.connectionId) return { statusCode: 501 };
  return {
    statusCode: 501,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({ error: "not_implemented", detail: "placeholder handler" }),
  };
};
