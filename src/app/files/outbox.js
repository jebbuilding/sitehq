/* ================= SENDING (keeps work when signal drops) ================= */
import { esc, shortDay, toast } from "../core/helpers.js";
import { touch } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadErr, uploadFile } from "./files.js";
import { autoClearPrompts, promptForJob } from "../people/reminders.js";
export {
  OB,
  flushOutbox,
  initOutbox,
  isNetErr,
  newId,
  obOpen,
  obPending,
  outboxBanner,
  refreshOutbox,
  saveOrKeep,
  sentToast,
  sphotoPut,
  sphotoWanted,
  submitJob,
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const PERM = new Set([
  "invalid_argument",
  "quota_exceeded",
  "not_granted",
  "capability_disabled",
  "capability_removed",
  "transform_error",
  "revoked",
  "too_large",
  "unsupported_type",
  "quota_or_state",
  "not_uploader",
  "upstream_auth",
]);
const isNetErr = (e) => !(e && PERM.has(e.code));
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, r) => setTimeout(() => r({ code: "timeout" }), ms))]);
const OB = { db: null, mem: [], busy: false };
function obOpen() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open("jeb-outbox", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("jobs", { keyPath: "qid" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) {
      res(null);
    }
  });
}
function obTx(mode, fn) {
  return new Promise((res) => {
    try {
      const t = OB.db.transaction("jobs", mode);
      const st = t.objectStore("jobs");
      const r = fn(st);
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => res(null);
    } catch (e) {
      res(null);
    }
  });
}
async function obAll() {
  if (!OB.db) return OB.mem.filter((j) => j.me === S.me);
  const all = await obTx("readonly", (st) => st.getAll());
  return (all || []).filter((j) => j.me === S.me).sort((a, b) => a.queued - b.queued);
}
async function obPut(j) {
  if (!OB.db) {
    OB.mem = OB.mem.filter((x) => x.qid !== j.qid).concat([j]);
    return;
  }
  await obTx("readwrite", (st) => st.put(j));
}
async function obDel(qid) {
  if (!OB.db) {
    OB.mem = OB.mem.filter((x) => x.qid !== qid);
    return;
  }
  await obTx("readwrite", (st) => st.delete(qid));
}
async function runJob(j) {
  const d = Object.assign({}, j.data);
  for (const f of j.files || []) {
    if (!f.id) {
      const up = await withTimeout(
        uploadFile(f.blob, f.name),
        f.blob && f.blob.size > 3e6 ? 300000 : 90000,
      );
      f.id = up.id;
      f.ct = up.contentType;
      f.size = up.sizeBytes;
      if (j.qid) await obPut(j);
    }
  }
  if (j.write) {
    /* a record saved as it is: each file's id goes where f.field says, e.g. "deliveries.2.photo" */
    for (const f of j.files || []) {
      const ks = String(f.field).split(".");
      let o = d;
      ks.slice(0, -1).forEach((k) => {
        o[k] = Array.isArray(o[k]) ? o[k].slice() : Object.assign({}, o[k]);
        o = o[k];
      });
      o[ks[ks.length - 1]] = f.id;
    }
    const ref = S.db.doc(j.write.path);
    await withTimeout(j.write.op === "update" ? ref.update(d) : ref.set(d), 20000);
    return;
  }
  for (const f of j.files || []) {
    if (f.field === "photos") d.photos = (d.photos || []).concat([f.id]);
    else {
      d[f.field] = f.id;
      if (f.meta) {
        d.contentType = f.ct || d.contentType;
        d.size = f.size || d.size;
      }
    }
  }
  d.deliveredAt = Date.now();
  await withTimeout(
    S.db.doc((j.path || "sheets/" + S.me + "/" + j.coll) + "/" + j.docId).set(d),
    20000,
  );
  if (!j.path && j.coll === "photos" && sphotoWanted(d)) sphotoPut(S.me, j.docId, d);
  if (j.also) await withTimeout(S.db.doc(j.also.path).update(j.also.data), 20000).catch(() => {});
}
/* site photos everyone on the site can see: a light copy of each photo's details under sphotos/<who>/p/<id> */
const sphotoOf = (d, who) => ({
  assetId: d.assetId,
  site: d.site || "",
  category: d.category || "",
  caption: d.caption || "",
  plot: d.plot || "",
  takenAt: d.takenAt || d.created || Date.now(),
  kind: d.kind || "",
  contentType: d.contentType || "",
  lat: d.lat ?? null,
  lon: d.lon ?? null,
  who: who || S.me,
  at: Date.now(),
});
const sphotoWanted = (d) =>
  d &&
  d.assetId &&
  d.site &&
  d.kind !== "sketch" &&
  d.kind !== "audio" &&
  d.kind !== "page" &&
  !d.title;
async function sphotoPut(who, id, d) {
  try {
    await S.db.doc("sphotos/" + who).set({ at: Date.now() });
    await S.db.doc("sphotos/" + who + "/p/" + id).set(sphotoOf(d, who));
  } catch (e) {}
}
async function submitJob(j) {
  j.me = S.me;
  j.queued = Date.now();
  if (navigator.onLine === false) {
    j.qid = newId();
    await obPut(j);
    await refreshOutbox();
    const pq = promptForJob(j);
    if (pq[0]) autoClearPrompts(pq[0], pq[1]);
    return "queued";
  }
  const pf = promptForJob(j);
  try {
    await runJob(j);
    touch();
    if (pf[0]) autoClearPrompts(pf[0], pf[1]);
    return "sent";
  } catch (e) {
    if (isNetErr(e)) {
      j.qid = newId();
      await obPut(j);
      await refreshOutbox();
      if (pf[0]) autoClearPrompts(pf[0], pf[1]);
      return "queued";
    }
    throw e;
  }
}
/* save a record now or, with no signal, keep it on this device and send it when there is. op is "set" or "update";
   files are [{blob, name, field}], uploaded first, each id put into the record at field. Gives "sent" or "queued". */
/* a record as it will be once what's waiting to send has gone: its queued writes laid over it (so a list redrawn
   from the last copy the database sent still shows them) */
function obPending(path, rec) {
  const js = (S.outbox || []).filter((j) => j.write && j.write.path === path);
  return js.length ? js.reduce((r, j) => Object.assign({}, r, j.data), rec) : rec;
}
function saveOrKeep(path, op, data, label, files) {
  return submitJob({ write: { path, op }, data, label, files: files || [] });
}
async function refreshOutbox() {
  S.outbox = await obAll();
  render();
}
async function flushOutbox() {
  if (OB.busy || !S.db || !S.me) return;
  OB.busy = true;
  try {
    for (const j of await obAll()) {
      try {
        await runJob(j);
        await obDel(j.qid);
        touch();
      } catch (e) {
        if (isNetErr(e)) break;
        await obDel(j.qid);
        toast("One item couldn't be sent: " + uploadErr(e));
      }
    }
  } finally {
    OB.busy = false;
    await refreshOutbox();
  }
}
const jobLabel = (j) =>
  j.label ||
  ({
    entries: j.data.type === "hours" ? "Timesheet" : "Job time",
    checks: "Check",
    photos: "Photo",
    invoices:
      j.data.kind === "receipt"
        ? "Receipt"
        : j.data.kind === "materials"
          ? "Materials & tools request"
          : "Invoice",
    signoffs:
      j.data.type === "todo"
        ? "To-do ticked"
        : j.data.type === "induction"
          ? "Site induction"
          : j.data.type === "talk"
            ? "Toolbox talk"
            : j.data.type === "cert"
              ? "Card or certificate"
              : j.data.type === "leave"
                ? "Time-off request"
                : "RAMS sign-off",
    jobdone: "Task update",
    msgs: "Message",
    visitinds: "Induction",
    profile: "Your details",
  }[j.coll] || "Item") + (j.data.date ? " · " + shortDay(j.data.date) : "");
function outboxBanner() {
  if (!S.outbox || !S.outbox.length) return "";
  return `<div class="notice warn"><b>${S.outbox.length} item${S.outbox.length === 1 ? "" : "s"} waiting to send.</b> ${navigator.onLine === false ? "You have no signal right now." : "The connection dropped."} They're saved on this phone and will send when you have signal. Don't clear this browser's data.
    <div class="who" style="margin-top:4px">${S.outbox.map(jobLabel).map(esc).join(" · ")}</div>
    <button type="button" class="pillbtn" id="ob-send" style="margin-top:8px">Try sending now</button></div>`;
}
function sentToast(r, what) {
  what = what.replace(/:$/, "");
  toast(
    r === "queued"
      ? what + " kept on this phone. It will send when you have signal."
      : what + (what === "Saved" ? "" : " sent"),
  );
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initOutbox() {
  window.addEventListener("online", () => {
    flushOutbox();
    render();
  });
  window.addEventListener("offline", () => render());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flushOutbox();
  });
  setInterval(() => {
    if (S.outbox && S.outbox.length) flushOutbox();
  }, 30000);
}
