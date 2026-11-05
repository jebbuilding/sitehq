// Live-update transport for local development and tests: a WebSocket server (the `ws` package) on an existing
// node:http server. Each socket gets a connection id; core/live.mjs does the rest.
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

/**
 * @param server   a node:http Server; sockets are accepted on `path`
 * @returns { send, attach(live), close() } – call attach() with the live layer once it exists
 */
export function createLocalWsTransport(server, path = "/ws") {
  const sockets = new Map(); // connection id → socket
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  let live = null;

  server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url, "http://localhost").pathname !== path) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => {
      const id = randomUUID();
      sockets.set(id, ws);
      let queue = Promise.resolve(); // one message at a time per connection, in the order they arrived
      ws.on("message", (data) => { queue = queue.then(() => live && live.onMessage(id, data.toString())).catch(() => {}); });
      ws.on("close", () => { sockets.delete(id); if (live) live.disconnect(id).catch(() => {}); });
      ws.on("error", () => {});
    });
  });

  return {
    async send(id, message) {
      const ws = sockets.get(id);
      if (!ws || ws.readyState !== 1) return false;
      ws.send(JSON.stringify(message));
      return true;
    },
    attach(l) { live = l; },
    close() { for (const ws of sockets.values()) ws.terminate(); wss.close(); },
  };
}
