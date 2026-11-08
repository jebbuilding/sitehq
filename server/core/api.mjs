// The HTTP API: one function from a plain request to a plain response, so it runs the same behind API Gateway
// (handlers/http.mjs), behind node:http (local.mjs) and in tests.
//
//   request  { method, path, headers (lower-case names), body (Buffer or null) }
//   response { status, headers, body (Buffer, string or null) }
//
// Routes (server/README.md › HTTP API has the request and response bodies):
//   GET    /api/me                       who am I
//   POST   /api/profiles                 display names for a list of user ids
//   POST   /api/db/get|list|set|update|delete|add
//   GET    /api/assets                   list files            POST /api/assets          start an upload
//   PUT    /api/assets/<id>/content      send the bytes (only when the file store has no direct upload)
//   POST   /api/assets/<id>/complete     finish an upload      DELETE /api/assets/<id>   delete a file
//   GET    /_blob/<id>                   the file itself
//   POST   /api/public/enquiry|hit       the public website's contact form and page counter (core/public.mjs)
//
// Every route but /api/public/* needs a signed-in caller. A read the rules refuse answers exactly like a read of something that is
// not there (so nothing can be learned by probing); a write the rules refuse is 403 "forbidden".
// Document paths travel in request bodies, never in URLs, so they do not end up in access logs.
import { randomBytes } from "node:crypto";
import { ApiError, forbidden, invalid, notFound, unauthenticated } from "./errors.mjs";
import { parseCollPath, parseDocPath } from "./paths.mjs";
import { applyQuery, parseQuery } from "./query.mjs";
import { createPublic } from "./public.mjs";
import { callerFor } from "./roles.mjs";

export const MAX_DOC_BYTES = 256 * 1024; // one document, as JSON
export const MAX_DOC_DEPTH = 32;
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // one uploaded file
const MAX_JSON_BODY = 1024 * 1024;
const INLINE_IMAGE_BYTES = 4 * 1024 * 1024; // images up to this size are served by the API itself (same origin)
// What may be stored as a file. No HTML, SVG or script types: files are served from the app's own origin.
const FILE_TYPES = /^(image\/(jpeg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm|3gpp)|application\/pdf)$/;
const FILE_ID = /^[\w-]{1,64}$/;
const CLIENT_ID = /^[\w-]{1,40}$/;
const NO_STORE = { "cache-control": "no-store" };

const json = (status, body) => ({ status, headers: { "content-type": "application/json; charset=utf-8", ...NO_STORE }, body: JSON.stringify(body) });

function depth(v) {
  if (v === null || typeof v !== "object") return 0;
  let d = 0;
  for (const k in v) d = Math.max(d, depth(v[k]));
  return d + 1;
}

/** A document body a client sent: a plain JSON object within the size and depth limits. */
function checkDoc(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw invalid("a document must be an object");
  if (depth(data) > MAX_DOC_DEPTH) throw invalid("a document can be at most 32 levels deep");
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > MAX_DOC_BYTES) throw invalid("a document can be at most 256 KiB");
  return data;
}

function cookie(headers, name) {
  for (const part of String(headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) { try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return ""; } }
  }
  return "";
}

/** One "bytes=a-b" range of a body of `size` bytes, or null to send it all. */
function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}

/**
 * @param deps.store   document store (store/memory.mjs, store/dynamodb.mjs)
 * @param deps.rules   compiled rules (core/roles.mjs › siteRules)
 * @param deps.auth    { verify(token) } (auth/dev.mjs, auth/cognito.mjs)
 * @param deps.blobs   file store (blobs/disk.mjs, blobs/s3.mjs)
 * @param deps.live    { publish(path, origin) } (core/live.mjs) – optional
 * @param deps.onRefused  called with { op, path, role } when the rules refuse something – local diagnosis only;
 *                        never wire this to a log in production (paths can contain ids)
 */
export function createApi({ store, rules, auth, blobs, live, onRefused, now }) {
  const can = (caller, op, segs, action, path) => {
    const ok = rules.decide(caller, segs, action);
    if (!ok && onRefused) onRefused({ op, path, role: caller.role });
    return ok;
  };
  const changed = async (path, origin) => {
    if (!live) return;
    try { await live.publish(path, origin); } catch (e) { console.error("live: publish failed:", e.name); }
  };

  const pub = createPublic({ store, changed: (path) => changed(path, ""), now });

  const db = {
    async get(caller, { path }) {
      const { segs, coll, id } = parseDocPath(path);
      const data = can(caller, "get", segs, "read", path) ? await store.get(coll, id) : null;
      return { exists: data !== null, ...(data !== null ? { data } : {}) };
    },
    async list(caller, { path, where, orderBy, limit }) {
      const { segs, coll } = parseCollPath(path), q = parseQuery({ where, orderBy, limit });
      const scope = rules.listScope(caller, segs);
      let docs = [];
      if (scope.others || scope.mixed) docs = (await store.list(coll)).filter((d) => rules.decide(caller, [...segs, d.id], "read"));
      else if (scope.own) { const data = await store.get(coll, caller.id); if (data) docs = [{ id: caller.id, data }]; }
      else if (onRefused) onRefused({ op: "list", path, role: caller.role });
      return { docs: applyQuery(docs, q) };
    },
    async set(caller, { path, data }, origin) {
      const { segs, coll, id } = parseDocPath(path);
      checkDoc(data);
      if (!can(caller, "set", segs, "write", path)) throw forbidden();
      await store.set(coll, id, data);
      await changed(path, origin);
      return {};
    },
    // Shallow merge, creating the document if it is missing – what the app's tests have always run against
    // (tests/harness8src.js). The merged document must still fit the limits.
    async update(caller, { path, data }, origin) {
      const { segs, coll, id } = parseDocPath(path);
      checkDoc(data);
      if (!can(caller, "update", segs, "write", path)) throw forbidden();
      checkDoc(Object.assign((await store.get(coll, id)) || {}, data));
      await store.update(coll, id, data);
      await changed(path, origin);
      return {};
    },
    async delete(caller, { path }, origin) {
      const { segs, coll, id } = parseDocPath(path);
      if (!can(caller, "delete", segs, "write", path)) throw forbidden();
      await store.delete(coll, id);
      await changed(path, origin);
      return {};
    },
    async add(caller, { path, data }, origin) {
      const { segs, coll } = parseCollPath(path), id = randomBytes(10).toString("hex");
      checkDoc(data);
      if (!can(caller, "add", [...segs, id], "write", path)) throw forbidden();
      await store.set(coll, id, data);
      await changed(coll + "/" + id, origin);
      return { id };
    },
  };

  const assetView = (id, a) => ({ id, url: "/_blob/" + id, sizeBytes: a.size, contentType: a.type, createdAt: a.at });
  const mayUpload = (caller) => { if (caller.uploads === "none") throw forbidden("this account cannot store files"); };
  // The file record, if this caller may change it. `ready` (optional) is the state it must be in.
  async function ownAsset(caller, id, ready) {
    if (!FILE_ID.test(id)) throw notFound();
    const a = await store.get("$assets", id);
    if (!a || (ready !== undefined && !!a.ready !== ready)) throw notFound();
    if (caller.uploads !== "any" && a.by !== caller.id) throw new ApiError(403, "not_uploader", "Only the person who uploaded a file, or the owner, can change it");
    return a;
  }

  const assets = {
    async list(caller) {
      mayUpload(caller);
      const all = (await store.list("$assets")).filter((a) => a.data.ready);
      const mine = all.filter((a) => caller.uploads === "any" || a.data.by === caller.id);
      return { assets: mine.map((a) => assetView(a.id, a.data)), usage: { bytes: all.reduce((n, a) => n + a.data.size, 0), count: all.length } };
    },
    async start(caller, { contentType, size }) {
      mayUpload(caller);
      if (typeof contentType !== "string" || !FILE_TYPES.test(contentType)) throw new ApiError(415, "unsupported_type", "That kind of file cannot be stored");
      if (!Number.isInteger(size) || size < 1) throw invalid("size must be the file's size in bytes");
      if (size > MAX_FILE_BYTES) throw new ApiError(413, "too_large", "Files can be at most 20 MB");
      const id = randomBytes(16).toString("hex");
      await store.set("$assets", id, { by: caller.id, type: contentType, size, at: Date.now(), ready: false });
      const upload = (await blobs.uploadTarget(id, { contentType, size })) || { url: `/api/assets/${id}/content`, method: "PUT", headers: { "content-type": contentType } };
      return { id, upload };
    },
    async content(caller, id, body) {
      const a = await ownAsset(caller, id, false);
      if (!body || !body.length) throw invalid("no file content");
      if (body.length > MAX_FILE_BYTES || body.length > a.size) throw new ApiError(413, "too_large", "Files can be at most 20 MB");
      await blobs.put(id, body, a.type);
      return {};
    },
    async complete(caller, id) {
      const a = await ownAsset(caller, id, false), stored = await blobs.stat(id);
      if (!stored) throw invalid("the file has not been uploaded");
      if (stored.size > MAX_FILE_BYTES) { await blobs.delete(id); await store.delete("$assets", id); throw new ApiError(413, "too_large", "Files can be at most 20 MB"); }
      const done = { ...a, size: stored.size, ready: true };
      await store.set("$assets", id, done);
      return assetView(id, done);
    },
    async delete(caller, id) {
      mayUpload(caller);
      if (!FILE_ID.test(id) || !(await store.get("$assets", id))) return {}; // deleting what is not there is not an error
      await ownAsset(caller, id);
      await blobs.delete(id);
      await store.delete("$assets", id);
      return {};
    },
  };

  // Any signed-in user may fetch a file whose id they know: ids are 128 random bits and are only ever handed out
  // inside documents the rules let that user read. Images are sent by the API itself so they stay same-origin
  // (the app draws them onto canvases, which a cross-origin image would lock); other files, and anything big, are
  // redirected to a short-lived direct link when the file store has one.
  async function blob(id, headers) {
    const a = FILE_ID.test(id) ? await store.get("$assets", id) : null;
    if (!a || !a.ready) throw notFound();
    const inline = /^image\//.test(a.type) && a.size <= INLINE_IMAGE_BYTES;
    const direct = inline ? null : await blobs.url(id, { contentType: a.type });
    if (direct) return { status: 302, headers: { location: direct, "cache-control": "private, max-age=300" }, body: null };
    const bytes = await blobs.read(id);
    if (!bytes) throw notFound();
    const common = { "content-type": a.type, "x-content-type-options": "nosniff", "accept-ranges": "bytes", "cache-control": "private, max-age=31536000, immutable" };
    const r = byteRange(headers.range, bytes.length);
    if (r) return { status: 206, headers: { ...common, "content-range": `bytes ${r.start}-${r.end}/${bytes.length}` }, body: bytes.subarray(r.start, r.end + 1) };
    return { status: 200, headers: common, body: bytes };
  }

  async function profiles(caller, { ids }) {
    if (!Array.isArray(ids) || ids.length > 500 || ids.some((i) => typeof i !== "string")) throw invalid("ids must be a list of at most 500 strings");
    // Names come from people's own profiles (sheets/<id>.name); a client is told nobody's name.
    const names = new Map();
    if (!caller.confine && ids.length) for (const d of await store.list("sheets")) if (typeof d.data.name === "string") names.set(d.id, d.data.name);
    const out = {};
    for (const id of ids) out[id] = { id, name: names.get(id) || "", isMe: id === caller.id };
    return { profiles: out };
  }

  async function route(req) {
    const { method, path, headers } = req;
    if (path.startsWith("/api/public/")) return pub(req);
    const bearer = /^Bearer (.+)$/.exec(headers.authorization || "");
    const isBlob = path.startsWith("/_blob/");
    const user = await auth.verify(bearer ? bearer[1] : isBlob ? cookie(headers, "sitehq_token") : "");
    const caller = callerFor(user);
    if (!caller) throw unauthenticated();
    if (isBlob) {
      if (method !== "GET" && method !== "HEAD") throw new ApiError(405, "method_not_allowed");
      return blob(path.slice(7), headers);
    }
    const body = () => {
      if (!req.body || !req.body.length) return {};
      if (req.body.length > MAX_JSON_BODY) throw new ApiError(413, "too_large", "request is too large");
      let v;
      try { v = JSON.parse(req.body.toString("utf8")); } catch (e) { throw invalid("request body is not JSON"); }
      if (v === null || typeof v !== "object" || Array.isArray(v)) throw invalid("request body must be an object");
      return v;
    };
    const origin = CLIENT_ID.test(headers["x-sitehq-client"] || "") ? headers["x-sitehq-client"] : "";

    if (path === "/api/me" && method === "GET") return json(200, { id: caller.id, role: caller.role, isOwner: caller.role === "owner", name: user.name || "", canUpload: caller.uploads !== "none" });
    if (path === "/api/profiles" && method === "POST") return json(200, await profiles(caller, body()));
    let m = /^\/api\/db\/(get|list|set|update|delete|add)$/.exec(path);
    if (m && method === "POST") return json(200, await db[m[1]](caller, body(), origin));
    if (path === "/api/assets" && method === "GET") return json(200, await assets.list(caller));
    if (path === "/api/assets" && method === "POST") return json(200, await assets.start(caller, body()));
    m = /^\/api\/assets\/([^/]+)(\/content|\/complete)?$/.exec(path);
    if (m && m[2] === "/content" && method === "PUT") return json(200, await assets.content(caller, m[1], req.body));
    if (m && m[2] === "/complete" && method === "POST") return json(200, await assets.complete(caller, m[1]));
    if (m && !m[2] && method === "DELETE") return json(200, await assets.delete(caller, m[1]));
    throw notFound();
  }

  /** Handle one request. Always resolves a response; errors become { error: { code, message } }. */
  return async function handle(req) {
    try {
      return await route(req);
    } catch (e) {
      if (e instanceof ApiError) return json(e.status, { error: { code: e.code, message: e.message } });
      console.error("api: unexpected error:", e && e.name); // the name only: messages can quote data
      return json(500, { error: { code: "unavailable", message: "Something went wrong" } });
    }
  };
}
