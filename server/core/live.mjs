// Live updates. A client holds one connection, says who it is, and subscribes to document or collection paths.
// After every accepted write the API calls publish(): each subscriber of the document, or of the collection it is
// in, who is allowed to read that document is sent a small "this changed" message, and reads the new state over the
// HTTP API. The message carries the path only, never the data, so the order messages arrive in cannot matter.
//
// Connections and subscriptions are records in the store, so this works the same in one local process and across
// separate Lambda invocations:
//   $conn            / <connection id>               { uid, role, exp }
//   $sub:<path>      / <connection id>.<sub id>      { c, s, uid, role, exp }     who to tell when <path> changes
//   $cs:<connection> / <sub id>                      { path }                     what to tidy up when it closes
//
// The transport is whatever can deliver a message to a connection id:
//   transport.send(connectionId, object) → true, or false if the connection has gone
//
// Messages, as JSON.  Client → server:
//   { t: "auth", token }            first message; answered { t: "ready" } or { t: "error", code: "unauthenticated" }
//   { t: "sub", id, path }          answered { t: "subd", id } or { t: "denied", id }
//   { t: "unsub", id }
//   { t: "ping" }                   answered { t: "pong" } (keeps an idle connection open)
// Server → client:
//   { t: "change", id, path, o }    the document at `path` changed; `id` is the subscription, `o` the writer's
//                                   client id if it sent one (so a page can ignore the echo of its own write)
//   { t: "expired" }                the sign-in this connection used has run out; connect again
import { parsePath } from "./paths.mjs";
import { callerFor } from "./roles.mjs";

const TTL = 24 * 3600; // seconds; abandoned records are dropped by the store after this
const MAX_SUBS = 200; // per connection (the app uses about 40)
const SUB_ID = /^[\w-]{1,40}$/;

export function createLive({ store, transport, rules, auth, now = () => Date.now() }) {
  const subKey = (connId, subId) => connId + "." + subId;

  async function disconnect(connId) {
    const subs = await store.list("$cs:" + connId);
    await Promise.all(subs.flatMap((s) => [store.delete("$sub:" + s.data.path, subKey(connId, s.id)), store.delete("$cs:" + connId, s.id)]));
    await store.delete("$conn", connId);
  }

  async function authenticate(connId, token) {
    const user = await auth.verify(token);
    if (!callerFor(user)) return transport.send(connId, { t: "error", code: "unauthenticated" });
    await disconnect(connId); // a second "auth" starts the connection afresh
    await store.set("$conn", connId, { uid: user.id, role: user.role, exp: user.exp || 0 }, { ttl: TTL });
    if ((await transport.send(connId, { t: "ready" })) === false) await disconnect(connId); // it left before we could answer
  }

  async function subscribe(connId, subId, path) {
    const conn = await store.get("$conn", connId);
    if (!conn) return transport.send(connId, { t: "error", code: "unauthenticated", id: subId });
    const caller = callerFor({ id: conn.uid, role: conn.role });
    let allowed = false;
    try {
      const segs = parsePath(path);
      if (segs.length % 2 === 0) allowed = rules.decide(caller, segs, "read");
      else { const s = rules.listScope(caller, segs); allowed = s.others || s.own || s.mixed; }
    } catch (e) { /* a bad path is simply not subscribable */ }
    if (allowed && (await store.list("$cs:" + connId)).length >= MAX_SUBS) allowed = false;
    if (!allowed) return transport.send(connId, { t: "denied", id: subId });
    await store.set("$sub:" + path, subKey(connId, subId), { c: connId, s: subId, uid: conn.uid, role: conn.role, exp: conn.exp }, { ttl: TTL });
    await store.set("$cs:" + connId, subId, { path }, { ttl: TTL });
    return transport.send(connId, { t: "subd", id: subId });
  }

  async function unsubscribe(connId, subId) {
    const s = await store.get("$cs:" + connId, subId);
    if (!s) return;
    await store.delete("$sub:" + s.path, subKey(connId, subId));
    await store.delete("$cs:" + connId, subId);
  }

  /** Handle one message from a connection. Never throws for bad input. */
  async function onMessage(connId, text) {
    let m;
    try { m = JSON.parse(String(text).slice(0, 8192)); } catch (e) { m = null; }
    if (!m || typeof m !== "object") return transport.send(connId, { t: "error", code: "invalid_argument" });
    if (m.t === "ping") return transport.send(connId, { t: "pong" });
    if (m.t === "auth") return authenticate(connId, typeof m.token === "string" ? m.token : "");
    if ((m.t === "sub" || m.t === "unsub") && !SUB_ID.test(String(m.id))) return transport.send(connId, { t: "error", code: "invalid_argument" });
    if (m.t === "sub") return subscribe(connId, m.id, m.path);
    if (m.t === "unsub") return unsubscribe(connId, m.id);
    return transport.send(connId, { t: "error", code: "invalid_argument" });
  }

  /** Tell the subscribers who may read `docPath` that it changed. `origin` is the writer's client id, if any. */
  async function publish(docPath, origin) {
    const segs = docPath.split("/"), coll = segs.slice(0, -1).join("/");
    const subs = (await Promise.all([store.list("$sub:" + docPath), store.list("$sub:" + coll)])).flat();
    const gone = new Set(), expired = new Set(), at = now() / 1000;
    await Promise.all(subs.map(async ({ data: s }) => {
      if (s.exp && s.exp < at) return void expired.add(s.c);
      if (!rules.decide(callerFor({ id: s.uid, role: s.role }), segs, "read")) return;
      const ok = await transport.send(s.c, { t: "change", id: s.s, path: docPath, ...(origin ? { o: origin } : {}) });
      if (ok === false) gone.add(s.c);
    }));
    await Promise.all([...expired].map(async (c) => { await transport.send(c, { t: "expired" }); gone.add(c); }));
    await Promise.all([...gone].map(disconnect));
  }

  return { onMessage, disconnect, publish };
}
