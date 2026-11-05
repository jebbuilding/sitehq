/* ================= SCALING: one live feed, fetch each trade on change ================= */
import { mapDocs } from "./data.js";
import { S } from "./state.js";
import { refreshJobDetail, render } from "./tabs-week.js";
import { binRecord } from "../owner/deleted-items.js";
import { scheduleSupSync } from "../purchasing/suppliers.js";
export { TR, TR_COLLS, fetchTrade, queueTrade, refreshAllTrades, syncTradeFetches, wrapDb };
const TR_COLLS = ["entries", "checks", "photos", "invoices", "signoffs", "signins"];
const TR = { stamp: {}, queue: [], busy: 0, want: {} };
function wrapRef(ref, path, hook) {
  return new Proxy(
    {},
    {
      get: (_, k) => {
        if (k === "delete")
          return async (...a) => {
            try {
              await binRecord(path);
            } catch (e) {}
            const r = await ref.delete(...a);
            hook(path);
            return r;
          };
        if (k === "set" || k === "update")
          return async (...a) => {
            const r = await ref[k](...a);
            hook(path);
            return r;
          };
        if (k === "collection") return (p) => wrapColl(ref.collection(p), path + "/" + p, hook);
        const v = ref[k];
        return typeof v === "function" ? v.bind(ref) : v;
      },
    },
  );
}
function wrapColl(c, path, hook) {
  return new Proxy(
    {},
    {
      get: (_, k) => {
        if (k === "doc")
          return (id) => wrapRef(id ? c.doc(id) : c.doc(), path + "/" + (id || "_"), hook);
        if (k === "add")
          return async (...a) => {
            const r = await c.add(...a);
            hook(path + "/_");
            return r;
          };
        const v = c[k];
        return typeof v === "function" ? v.bind(c) : v;
      },
    },
  );
}
let bumpT = null;
function writeHook(p) {
  const m = /^sheets\/([^/]+)\/./.exec(p);
  if (!m) return;
  const id = m[1];
  if (id === S.me) {
    clearTimeout(bumpT);
    bumpT = setTimeout(() => {
      S.rawDb
        .doc("sheets/" + S.me)
        .update({ updated: Date.now() })
        .catch(() => {});
    }, 1200);
  } else if (S.owner) queueTrade(id);
}
function wrapDb(db) {
  S.rawDb = db;
  return new Proxy(
    {},
    {
      get: (_, k) => {
        if (k === "doc") return (p) => wrapRef(db.doc(p), p, writeHook);
        if (k === "collection") return (p) => wrapColl(db.collection(p), p, writeHook);
        const v = db[k];
        return typeof v === "function" ? v.bind(db) : v;
      },
    },
  );
}
function queueTrade(id) {
  if (!id || id === S.me) return;
  if (!TR.queue.includes(id)) TR.queue.push(id);
  pumpTrades();
}
function pumpTrades() {
  while (TR.busy < 3 && TR.queue.length) {
    const id = TR.queue.shift();
    TR.busy++;
    fetchTrade(id).finally(() => {
      TR.busy--;
      setTimeout(pumpTrades, 120);
    });
  }
}
let trRenderT = null;
const trRender = () => {
  clearTimeout(trRenderT);
  trRenderT = setTimeout(render, 150);
};
async function fetchTrade(id, attempt) {
  attempt = attempt || 0;
  const st = (S.team[id] || {}).updated || 0;
  try {
    for (const c of TR_COLLS) {
      const snap = await S.rawDb.collection("sheets/" + id + "/" + c).get();
      S.data[c][id] = mapDocs(snap);
    }
    TR.stamp[id] = st;
    scheduleSupSync();
    S.loadedTrades = (S.loadedTrades || 0) + (TR.want[id] ? 0 : 1);
    TR.want[id] = true;
    trRender();
    if (S.openJob) refreshJobDetail();
  } catch (e) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1) + Math.random() * 800));
      return fetchTrade(id, attempt + 1);
    }
  }
}
function syncTradeFetches() {
  Object.keys(S.team).forEach((id) => {
    if (id === S.me) return;
    const st = (S.team[id] || {}).updated || 0;
    if (TR.stamp[id] === undefined || TR.stamp[id] !== st) queueTrade(id);
  });
}
function refreshAllTrades() {
  Object.keys(S.team).forEach((id) => {
    if (id !== S.me && !(S.team[id] || {}).left) queueTrade(id);
  });
}
