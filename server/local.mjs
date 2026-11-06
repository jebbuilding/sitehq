// The whole backend in one local process, for development and tests: the HTTP API, the WebSocket and the files on
// one port, on the in-memory store, with dev sign-in tokens (auth/dev.mjs). No AWS account, nothing leaves the
// machine. The data lives as long as the process: it survives page reloads and is shared by every tab and browser.
// Given a Cognito stand-in (auth/local-cognito.mjs) it also answers the sign-in screen's calls at /cognito and
// accepts the tokens that hands out, through the ordinary Cognito verifier – beside the dev tokens, not instead.
//
//   const local = await startLocal({ port, seed, files, page, cognito });
//   local.url        "http://127.0.0.1:<port>"
//   local.store      the in-memory store (tests look inside it)
//   local.refused    every read or write the rules refused, as { op, path, role } (tests and diagnosis)
//   local.close()
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDevAuth } from "./auth/dev.mjs";
import { createDiskBlobs } from "./blobs/disk.mjs";
import { createApi, MAX_FILE_BYTES } from "./core/api.mjs";
import { createLive } from "./core/live.mjs";
import { siteRules } from "./core/roles.mjs";
import { createMemoryStore } from "./store/memory.mjs";
import { createLocalWsTransport } from "./transport/local-ws.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param options.port   0 (default) picks a free port
 * @param options.seed   documents to start with: { "collection/id": data, … }
 * @param options.files  files to start with: { id: { bytes, type } }
 * @param options.users  dev users: { id: { role, name } } (default: the people in the test seed)
 * @param options.page   (request) → { status, headers, body } | null for anything that is not the API – the page itself
 * @param options.store  a store to use instead of a new in-memory one
 * @param options.cognito  a Cognito stand-in (auth/local-cognito.mjs › createLocalCognito): served at /cognito, and
 *                         its tokens are accepted as well as the dev ones
 */
/**
 * Put starting documents and files into a store and a file store, the way the API itself would have recorded
 * them: each file gets its `$assets` record, uploaded by the owner. Used by startLocal and scripts/seed-dev.mjs.
 * Resolves { documents, files }: how many of each were written.
 */
export async function writeSeed({ store, blobs, seed = {}, files = {}, by = "owner" }) {
  for (const [p, data] of Object.entries(seed)) {
    const i = p.lastIndexOf("/");
    await store.set(p.slice(0, i), p.slice(i + 1), data);
  }
  for (const [id, f] of Object.entries(files)) {
    await blobs.put(id, f.bytes, f.type);
    await store.set("$assets", id, { by, type: f.type, size: f.bytes.length, at: Date.now(), ready: true });
  }
  return { documents: Object.keys(seed).length, files: Object.keys(files).length };
}

export async function startLocal({ port = 0, host = "127.0.0.1", seed = {}, files = {}, users, page, store = createMemoryStore(), cognito } = {}) {
  const capabilities = JSON.parse(await fs.readFile(path.join(here, "../platform/capabilities.json"), "utf8"));
  const rules = siteRules(capabilities), dev = createDevAuth(users);
  const auth = cognito ? { verify: async (token) => (await dev.verify(token)) || cognito.auth.verify(token) } : dev;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitehq-files-"));
  const blobs = createDiskBlobs(dir);
  await writeSeed({ store, blobs, seed, files });

  const refused = [];
  let api = null;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const send = (r) => {
      const body = r.body === null || r.body === undefined ? "" : r.body;
      res.writeHead(r.status, { ...r.headers, "content-length": Buffer.byteLength(body) });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    const failed = (e) => { console.error(e); if (!res.headersSent) send({ status: 500, headers: {}, body: "" }); };
    if (cognito && url.pathname === "/cognito") { // the sign-in screen's calls; small JSON bodies
      const parts = [];
      let n = 0;
      req.on("data", (c) => { n += c.length; if (n <= 65536) parts.push(c); });
      req.on("end", () => { try { send(cognito.handle({ method: req.method, headers: req.headers, body: Buffer.concat(parts) })); } catch (e) { failed(e); } });
      return;
    }
    if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_blob/")) {
      Promise.resolve().then(() => (page ? page({ method: req.method, path: url.pathname, query: url.searchParams }) : null))
        .then((r) => send(r || { status: 404, headers: { "content-type": "text/plain; charset=utf-8" }, body: "Not found" })).catch(failed);
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size <= MAX_FILE_BYTES + 1024) chunks.push(c); });
    req.on("end", () => {
      if (size > MAX_FILE_BYTES + 1024) return send({ status: 413, headers: { "content-type": "application/json" }, body: '{"error":{"code":"too_large"}}' });
      api({ method: req.method, path: url.pathname, headers: req.headers, body: Buffer.concat(chunks) }).then(send).catch(failed);
    });
  });
  const transport = createLocalWsTransport(server, "/ws");
  const live = createLive({ store, transport, rules, auth });
  transport.attach(live);
  api = createApi({ store, rules, auth, blobs, live, onRefused: (r) => refused.push(r) });

  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
  return {
    url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${server.address().port}`,
    port: server.address().port,
    store,
    refused,
    cognito,
    async close() {
      transport.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
