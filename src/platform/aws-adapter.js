/* ================= PLATFORM ADAPTER: window.claude.use(...) on SiteHQ's own backend (server/) =================
   The app gets its database, files, identity and downloads from window.claude.use(name) (src/app/core/boot.js).
   On claude.ai the platform provides that. On our own hosting this file does, with the same shapes, talking to the
   API in server/: documents over HTTP, live updates over a WebSocket, files at the same /_blob/<id> address.
   It is put in the page ahead of the app by the web build (scripts/bundle.mjs › webPage) and is not part of
   src/app/ – nothing in the app knows it exists.

   Settings, from window.SITEHQ_CONFIG if the page sets it, otherwise from /config.json:
     api        where the API is, default "/api"
     ws         where the WebSocket is, default "/ws" (a path on this host, or a full ws:// or wss:// address)
     devToken   local development only: the sign-in token to use (the local server puts it in the page)
   Sign-in: if window.SITEHQ_AUTH.token is a function it is asked for the token before every request. The sign-in
   screen (sign-in.js, ahead of this file in the page) provides it: its token() does not resolve until somebody
   has signed in, so use() simply waits. If the server then will not have the token, or cannot be reached, the
   screen is told (SITEHQ_AUTH.failed) and deals with it. Without a sign-in screen (the local dev pages) and with
   no token, use() resolves null and the app shows its "Sign in" message.

   How live updates work: onSnapshot reads the document or collection once over HTTP and subscribes on the
   WebSocket. The server then sends "this path changed" – never the data – and the adapter reads it again. So what
   is shown always comes from a read, and the order messages arrive in cannot matter. After one of this page's own
   writes the affected listeners are re-read straight away, without waiting for the message.
   Not provided: use("sample") (Ask Claude) resolves null. */
(function () {
  "use strict";
  const W = window;
  const CLIENT = randomId(16); // this page load; lets the server's change messages be told apart from our own writes
  let cfg = { api: "/api", ws: "/ws" };

  function randomId(n) {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(n);
    crypto.getRandomValues(b);
    let s = "";
    for (let i = 0; i < n; i++) s += A[b[i] % A.length];
    return s;
  }
  const fail = (code, message) => ({ code, message: message || code });

  /* ---------- settings and sign-in ---------- */
  const settings = (async () => {
    let c = W.SITEHQ_CONFIG;
    if (!c) {
      try {
        const r = await fetch("/config.json", { cache: "no-store" });
        if (r.ok) c = await r.json();
      } catch (e) {}
    }
    cfg = Object.assign(cfg, c || {});
  })();

  let lastToken = "", cookieVersion = 0;
  async function token() {
    const a = W.SITEHQ_AUTH;
    let t = "";
    try {
      t = (a && typeof a.token === "function" ? await a.token() : cfg.devToken) || "";
    } catch (e) {}
    if (t !== lastToken) {
      lastToken = t;
      // <img src="/_blob/…"> cannot send a header, so the same token also goes in a cookie that is only ever sent
      // to /_blob/ on this site.
      try {
        document.cookie = "sitehq_token=" + encodeURIComponent(t) + "; path=/_blob; SameSite=Strict" + (location.protocol === "https:" ? "; Secure" : "") + (t ? "" : "; Max-Age=0");
      } catch (e) {}
      cookieVersion++;
    }
    return t;
  }
  // A file's <img> that was asked for before the cookie was current fails: the logo in the page's own markup is
  // requested before anybody has signed in, or with yesterday's token. Ask for it again once there is a token –
  // once per cookie, so a file that is really missing is not asked for for ever.
  document.addEventListener("error", (ev) => {
    const img = ev.target;
    if (!img || img.tagName !== "IMG" || !/^\/_blob\//.test(img.getAttribute("src") || "")) return;
    token().then((t) => {
      if (!t || img.dataset.sitehqRetried === String(cookieVersion)) return;
      img.dataset.sitehqRetried = String(cookieVersion);
      img.src = img.getAttribute("src");
    });
  }, true);

  /* ---------- HTTP ---------- */
  // Resolves the parsed reply, or rejects { status, code, message } (status 0 = the server could not be reached).
  async function http(method, path, body) {
    const t = await token(), headers = { authorization: "Bearer " + t, "x-sitehq-client": CLIENT };
    if (body !== undefined) headers["content-type"] = "application/json";
    let r;
    try {
      r = await fetch(cfg.api + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    } catch (e) {
      throw { status: 0, code: "unavailable", message: "The server could not be reached" };
    }
    let j = null;
    try {
      j = await r.json();
    } catch (e) {}
    if (r.ok) return j || {};
    const er = (j && j.error) || {};
    throw { status: r.status, code: er.code || "unavailable", message: er.message || "" };
  }
  // The error codes the app was written against (platform/types/db.d.ts): a refused write is "invalid_argument".
  const dbError = (e) =>
    fail(e.status === 401 ? "revoked" : e.status === 400 || e.status === 403 || e.status === 413 ? "invalid_argument" : "unavailable", e.message);
  const dbCall = (op, body) => http("POST", "/db/" + op, body).catch((e) => { throw dbError(e); });

  /* ---------- paths ---------- */
  const SEGMENT = /^[A-Za-z0-9_\-.~:@+]+$/;
  function checkPath(path, odd) {
    if (typeof path !== "string" || !path) throw new TypeError("db: a path must be a non-empty string");
    const segs = path.split("/");
    for (const s of segs) if (!SEGMENT.test(s) || s === "." || s === "..") throw new TypeError("db: bad path segment in " + JSON.stringify(path) + " (letters, digits and _ - . ~ : @ + only)");
    if (segs.length > 16) throw new TypeError("db: a path can have at most 16 segments");
    if (segs.length % 2 !== (odd ? 1 : 0)) throw new TypeError("db: " + JSON.stringify(path) + " has " + segs.length + " segments; a " + (odd ? "collection path needs an odd" : "document path needs an even") + " number");
    return segs;
  }

  /* ---------- snapshots ---------- */
  // data() hands out a fresh copy every time, so nothing the app does to it can reach another listener.
  const docSnap = (id, text) => ({ id, exists: text !== null, data: () => (text === null ? undefined : JSON.parse(text)) });
  const querySnap = (docs) => {
    const list = docs.map((d) => docSnap(d.id, JSON.stringify(d.data)));
    return { docs: list, size: list.length, empty: !list.length };
  };

  /* ---------- live updates ---------- */
  const subs = new Map(); // subscription id → { id, path, load, next, error, alive, busy, dirty, key, fails }
  let sock = null, sockReady = false, retries = 0, retryTimer = null;

  function deliver(sub, snap) {
    try {
      sub.next(snap);
    } catch (e) {
      setTimeout(() => { throw e; }, 0); // a listener's own error is the page's to report, as if called from a timer
    }
  }
  // Read a subscription's document or collection again and tell the listener if it is different. One read at a
  // time per subscription; a change that arrives during a read causes one more read afterwards.
  function refresh(sub) {
    if (!sub.alive) return;
    if (sub.busy) { sub.dirty = true; return; }
    sub.busy = true;
    sub.dirty = false;
    sub.load().then(
      (r) => {
        sub.fails = 0;
        if (sub.alive && r.key !== sub.key) { sub.key = r.key; deliver(sub, r.snap); }
      },
      (e) => {
        if (!sub.alive) return;
        if (e && e.code === "invalid_argument") { // a query the server will never accept: this listener is over
          stop(sub);
          if (sub.error) sub.error(e);
          return;
        }
        sub.fails = (sub.fails || 0) + 1; // offline or a server hiccup: try again, more slowly each time
        setTimeout(() => refresh(sub), Math.min(30000, 1000 * 2 ** Math.min(sub.fails, 5)));
      },
    ).finally(() => {
      sub.busy = false;
      if (sub.dirty) refresh(sub);
    });
  }
  // After one of our own writes: re-read every listener on that document or on its collection.
  function touched(docPath) {
    const coll = docPath.slice(0, docPath.lastIndexOf("/"));
    for (const sub of subs.values()) if (sub.path === docPath || sub.path === coll) refresh(sub);
  }
  const say = (m) => { if (sock && sockReady) sock.send(JSON.stringify(m)); };

  function connect() {
    clearTimeout(retryTimer);
    if (sock || !subs.size || typeof WebSocket === "undefined") return;
    let s;
    try {
      const u = /^wss?:/.test(cfg.ws) ? cfg.ws : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + cfg.ws;
      s = new WebSocket(u);
    } catch (e) {
      return again();
    }
    sock = s;
    s.onopen = async () => {
      const t = await token();
      if (sock === s && s.readyState === 1) s.send(JSON.stringify({ t: "auth", token: t }));
    };
    s.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === "ready") {
        sockReady = true;
        retries = 0;
        for (const sub of subs.values()) say({ t: "sub", id: sub.id, path: sub.path });
      } else if (m.t === "subd") {
        const sub = subs.get(m.id);
        if (sub) refresh(sub); // picks up anything that changed between the first read and the subscription
      } else if (m.t === "change") {
        const sub = subs.get(m.id);
        if (sub && m.o !== CLIENT) refresh(sub);
      } else if (m.t === "expired" || (m.t === "error" && m.code === "unauthenticated")) s.close();
    };
    s.onerror = () => {};
    s.onclose = () => {
      if (sock !== s) return;
      sock = null;
      sockReady = false;
      again();
    };
  }
  function again() {
    if (!subs.size) return;
    retries = Math.min(retries + 1, 6);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, 250 * 2 ** retries * (0.5 + Math.random() / 2));
  }
  function stop(sub) {
    if (!sub.alive) return;
    sub.alive = false;
    subs.delete(sub.id);
    say({ t: "unsub", id: sub.id });
    if (!subs.size && sock) { // nothing left to listen for: let the connection go
      const s = sock;
      sock = null;
      sockReady = false;
      clearTimeout(retryTimer);
      s.close();
    }
  }
  function listen(path, load, next, error) {
    if (typeof next !== "function") throw new TypeError("db: onSnapshot needs a function");
    const sub = { id: randomId(12), path, load, next, error: typeof error === "function" ? error : null, alive: true, busy: false, dirty: false, key: undefined, fails: 0 };
    subs.set(sub.id, sub);
    refresh(sub);
    if (sockReady) say({ t: "sub", id: sub.id, path });
    else connect();
    return () => stop(sub);
  }
  // Without a working socket fall back to re-reading every 30 seconds; with one, keep it from idling out.
  const tick = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    token(); // gives the sign-in screen the chance to renew a token that is running out, and keeps the /_blob cookie current
    if (!subs.size) return;
    if (sockReady) say({ t: "ping" });
    else subs.forEach((sub) => refresh(sub));
  }, 30000);
  if (tick && tick.unref) tick.unref(); // only when run outside a browser (tests)
  const wake = () => { if (!sock && subs.size) { retries = 0; connect(); } };
  W.addEventListener("online", wake);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "hidden") { token(); wake(); } });

  /* ---------- db ---------- */
  function docRef(path) {
    checkPath(path, false);
    const id = path.slice(path.lastIndexOf("/") + 1);
    const read = async () => {
      const r = await dbCall("get", { path }), text = r.exists ? JSON.stringify(r.data) : null;
      return { key: String(text), snap: docSnap(id, text) };
    };
    const write = (op, data) => async () => {
      try {
        await dbCall(op, data === undefined ? { path } : { path, data });
      } finally {
        touched(path);
      }
    };
    return {
      id,
      path,
      get: async () => (await read()).snap,
      set: (data) => write("set", data)(),
      update: (data) => write("update", data)(),
      delete: () => write("delete")(),
      onSnapshot: (next, error) => listen(path, read, next, error),
      collection: (p) => collRef(path + "/" + p),
    };
  }
  function collRef(path, q) {
    checkPath(path, true);
    q = q || { where: [], orderBy: null, limit: 0 };
    const read = async () => {
      const r = await dbCall("list", { path, where: q.where, orderBy: q.orderBy, limit: q.limit });
      return { key: JSON.stringify(r.docs), snap: querySnap(r.docs) };
    };
    return {
      path,
      doc: (id) => docRef(path + "/" + (id || randomId(20))),
      add: async (data) => {
        let r;
        try {
          r = await dbCall("add", { path, data });
        } finally {
          for (const sub of subs.values()) if (sub.path === path) refresh(sub);
        }
        return docRef(path + "/" + r.id);
      },
      where: (field, op, value) => collRef(path, Object.assign({}, q, { where: q.where.concat([[field, op, value]]) })),
      orderBy: (field, dir) => collRef(path, Object.assign({}, q, { orderBy: [field, dir || "asc"] })),
      limit: (n) => collRef(path, Object.assign({}, q, { limit: n })),
      get: async () => (await read()).snap,
      onSnapshot: (next, error) => listen(path, read, next, error),
    };
  }
  const db = { doc: (path) => docRef(path), collection: (path) => collRef(path) };

  /* ---------- files ---------- */
  // The codes the app's upload messages know (platform/types/assets.d.ts).
  const fileError = (e) =>
    fail(
      ["too_large", "unsupported_type", "not_uploader", "invalid_request"].includes(e.code) ? e.code
        : e.code === "invalid_argument" ? "invalid_request"
        : e.status === 403 ? "not_granted"
        : e.status === 401 ? "upstream_auth"
        : "store_unavailable",
      e.message,
    );
  const assets = {
    async upload(blob, options) {
      const contentType = (options && options.type) || (blob && blob.type) || "";
      try {
        const { id, upload } = await http("POST", "/assets", { contentType, size: blob.size });
        const headers = Object.assign({}, upload.headers);
        let url = upload.url;
        if (url.startsWith("/")) { // the API takes the bytes itself (local development); otherwise the link is already signed
          url = new URL(url, new URL(cfg.api, location.href)).href;
          headers.authorization = "Bearer " + (await token());
        }
        let r;
        try {
          r = await fetch(url, { method: upload.method, headers, body: blob });
        } catch (e) {
          throw { status: 0 };
        }
        if (!r.ok) throw { status: r.status, code: r.status === 413 ? "too_large" : "" };
        const done = await http("POST", "/assets/" + id + "/complete");
        return { id: done.id, url: done.url, sizeBytes: done.sizeBytes, contentType: done.contentType };
      } catch (e) {
        throw fileError(e);
      }
    },
    delete: (id) => http("DELETE", "/assets/" + encodeURIComponent(id)).then(() => ({}), (e) => { throw fileError(e); }),
    list: () => http("GET", "/assets").catch((e) => { throw fileError(e); }),
  };

  /* ---------- downloads ---------- */
  const downloads = {
    async save(request) {
      const data = request && request.data, blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (request && request.filename) || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      return {};
    },
  };

  /* ---------- who is signed in ---------- */
  const session = settings.then(async () => {
    if (!(await token())) return null;
    try {
      return await http("GET", "/me");
    } catch (e) {
      // With a sign-in screen in the page, it takes over: it signs out a token the server refuses, or says the
      // server cannot be reached. Either way the page starts again, so the app is left waiting, not told "nobody".
      const a = W.SITEHQ_AUTH;
      if (a && typeof a.failed === "function" && a.failed(e.status === 401 ? "refused" : "unreachable")) return new Promise(() => {});
      return null;
    }
  });
  const user = (me) => ({
    id: async () => me.id,
    isOwner: async () => !!me.isOwner,
    name: async () => me.name || "",
    // Never rejects, and every id asked for gets an entry (name "" when it cannot be resolved).
    async profiles(ids) {
      const list = [...new Set(typeof ids === "string" ? [ids] : ids || [])];
      let found = {};
      try {
        found = (await http("POST", "/profiles", { ids: list })).profiles || {};
      } catch (e) {}
      const out = {};
      for (const id of list) out[id] = Object.assign({ id, name: "", avatarUrl: "", color: "", email: null, isMe: id === me.id, guest: false }, found[id]);
      return out;
    },
  });

  W.claude = {
    async use(name) {
      const me = await session;
      if (!me) return null;
      if (name === "db") return db;
      if (name === "user") return user(me);
      if (name === "assets") return me.canUpload ? assets : null;
      if (name === "downloads") return downloads;
      return null;
    },
  };
})();
