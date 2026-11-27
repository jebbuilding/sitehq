/* ================= SCAFFOLD JOBS: the scaffold designer on each job – opening it, one design saved per job, the firm's scaffold settings ================= */
import { bossFirst } from "../core/company-names.js";
import { $, esc, toast } from "../core/helpers.js";
import { S, isArchivedSite, ownerMode } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { hrLoad } from "./house-render.js";
import { SCF_CSS, SCF_HTML, scfEngine } from "./scaffold-designer.js";
import { isSketch } from "./trade-drawings.js";
import { blobUrl, uploadAnyFile, uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob, loadPdfJs, loadScript, openFile } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { allTeam } from "../owner/owner.js";
import { BRGB, siteRec } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { lhFinish, lhFrame, lhLogoId } from "../sales/letterhead-setup.js";
import { siteLabel } from "../sites/job-details.js";
import { projectSites, same } from "../sites/project-pages.js";
import { siteClient } from "../sites/summary.js";
export { scfBlank, scfDesign };
/* James (Nov 2026): "add the scaffolding software into the app". His Scaffold Designer (drawing/scaffold-designer.js)
   opens full-page in the viewer from 🏗️ Design scaffold on a job, or from Jobs & clients › Vans, tools and plant ›
   🏗️ Scaffold designer (pick the job). Only James: the designer has his costing in it, and what it saves is
   owner-only.
   - scaffold/job-<site id>: the job's design – the designer's state without the firm-wide keys, its traced drawing
     kept as a file (bgimgId). { site, data, updated }
   - scaffold/est-<id>: a scaffold not on a current job (＋ New scaffold) – for an estimate or enquiry (clientId) or on its
     own: { name, clientId, client, siteAddr, data, updated }; listed under Estimates and other scaffolds.
   - scaffold/settings: the firm's scaffold settings, shared by every design – PDF wording, drawing style, text size,
     layers, the tube and board lengths stocked – and the sign board picture (signImgId, signAR). { shared, … }
   The job name, client and address come from the job; the company name, address, phone, email, website and logo from
   Setup › My company details, every time it opens. Pictures are files, not part of the record (a record is at most
   256 KB). A design opened and left as it was isn't saved, so opening a job doesn't make a record. */
let scfLive = null;
let scfQ = Promise.resolve();
const scfImgs = new Map();
const scfKeyOf = (n) => {
  const sr = siteRec(n) || {};
  return (
    "job-" +
    (sr.id ||
      String(n || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80))
  );
};
const scfAddrOf = (n) => String((siteRec(n) || {}).address || n || "");
function scfBlobUrl(b) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(b);
  });
}
function scfUrlBlob(u) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(u || "");
  if (!m) return null;
  const s = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return new Blob([a], { type: m[1] || "image/jpeg" });
}
/* a saved picture back as the data URL the designer draws with ('' if it can't be had) */
async function scfImgUrl(id) {
  if (!id) return "";
  if (scfImgs.has(id)) return scfImgs.get(id);
  try {
    const u = await scfBlobUrl(await getFileBlob(id));
    scfImgs.set(id, u);
    return u;
  } catch (e) {
    return "";
  }
}
/* a picture from the designer saved as a file: the same picture keeps its file (also when copied from another job) */
async function scfImgPut(u, name) {
  if (!u) return "";
  for (const [id, v] of scfImgs) if (v === u) return id;
  const b = scfUrlBlob(u);
  if (!b) return "";
  const a = await uploadFile(b, name);
  const id = a && a.id ? a.id : a;
  scfImgs.set(id, u);
  return id;
}
/* the company details and logo from Setup, as the designer keeps them */
async function scfCompany() {
  const c = coData();
  const co = {
    name: c.name || "",
    addr: c.address || "",
    tel: c.phone || c.mobile || "",
    email: c.email || "",
    web: c.website || "",
    logo: "",
  };
  try {
    const u = await scfImgUrl(lhLogoId());
    if (u) {
      /* as a PNG no wider than 600 px, as the designer made its own */
      const im = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = u;
      });
      const k = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(im.naturalWidth * k));
      cv.height = Math.max(1, Math.round(im.naturalHeight * k));
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      co.logo = cv.toDataURL("image/png");
    }
  } catch (e) {}
  return co;
}
const scfSetSig = (sh, signId, ar) => JSON.stringify([sh, signId || "", ar || null]);
/* a client's address on one line */
const scfClAddr = (c) =>
  [String((c && c.address) || "").replace(/\s*\n\s*/g, ", "), (c && c.postcode) || ""]
    .filter(Boolean)
    .join(", ");
/* what a saved design is called in the lists */
const scfLabelOf = (x) => (x.site ? siteLabel(x.site) : x.name || "Scaffold");
/* 🏗️ Design scaffold: the designer for job `n` */
function scfDesign(n) {
  const c = siteClient(n);
  return scfOpen({
    key: scfKeyOf(n),
    title: siteLabel(n),
    job: siteLabel(n),
    client: (c && c.name) || "",
    site: scfAddrOf(n),
    meta: { site: n },
  });
}
/* a scaffold that isn't on a current job – for an estimate or enquiry (tied to its client) or on its own
   (James, Nov 2026: "i need to make new scaffold for estimate or jobs not just current jobs") */
function scfOther(key, rec, isNew) {
  const c = rec.clientId ? (S.clients || []).find((x) => x.id === rec.clientId) : null;
  const name =
    rec.name || (c ? [c.name, c.work].filter(Boolean).join(" – ") : "") || "New scaffold";
  return scfOpen({
    key,
    title: name,
    job: name,
    client: c ? c.name || "" : rec.client || "",
    site: c ? scfClAddr(c) || rec.siteAddr || "" : rec.siteAddr || "",
    meta: { name, clientId: (c && c.id) || "" },
    free: true,
    tied: !!c,
    isNew: !!isNew,
  });
}
/* the designer for one design: a job's (meta.site) or another (meta.name, meta.clientId) */
async function scfOpen(o) {
  if (!ownerMode()) return toast("Only " + bossFirst() + " can open the scaffold designer");
  if (scfLive) {
    const p = scfLive.destroy();
    scfLive = null;
    if (p) scfQ = scfQ.then(() => p);
  }
  openViewer(
    `<div class="scf-page"><div class="vhead"><b>🏗️ Scaffold designer</b> <span class="who">${esc(o.title)}</span></div><div id="scf-house"></div><div id="scf-host"><div class="who">Opening the scaffold design…</div></div></div>`,
  );
  const hostEl = $("scf-host");
  const key = o.key;
  let jd, sd, co;
  try {
    await scfQ;
    [jd, sd, co] = await Promise.all([
      S.db.doc("scaffold/" + key).get(),
      S.db.doc("scaffold/settings").get(),
      scfCompany(),
    ]);
  } catch (e) {
    hostEl.innerHTML = `<div class="notice">Couldn't open the scaffold design. Check your signal and try again.</div>`;
    return;
  }
  if (!hostEl.isConnected) return;
  const job = jd && jd.exists ? jd.data() || {} : null;
  const set = sd && sd.exists ? sd.data() || {} : null;
  /* nothing saved yet: a blank design, not the sample house (James, Nov 2026: "it should open blank ready for a new
     design") */
  const data =
    job && job.data
      ? Object.assign({}, job.data)
      : { wings: [], chims: [], blocks: [], access: [], removed: [] };
  if (data.bgimgId) data.bgimg = await scfImgUrl(data.bgimgId);
  const shared = Object.assign({}, (set && set.shared) || {});
  delete shared.co;
  const signImg = set && set.signImgId ? await scfImgUrl(set.signImgId) : "";
  const initial = Object.assign({}, data, shared, {
    job: o.job,
    client: o.client,
    site: o.site,
    co: Object.assign(co, { signImg, signAR: (set && set.signAR) || undefined }),
  });
  /* the design as it opened (the designer's first save, straight after it starts): only a change after that is
     saved – a new one made with ＋ New scaffold is saved straight away, so it is in the list */
  let lastJob = null;
  let lastSet = null;
  const meta = Object.assign({}, o.meta);
  if (job && job.house) meta.house = job.house;
  const host = {
    owner: true,
    initial,
    save(d, sh) {
      const run = async () => {
        try {
          const img = d.bgimg;
          delete d.bgimg;
          d.bgimgId = img ? await scfImgPut(img, "Scaffold drawing.jpg") : "";
          /* a design not on a job keeps the name, client and address typed into it */
          if (o.free) {
            meta.name = String(d.job || "").trim() || meta.name;
            if (!o.tied) Object.assign(meta, { client: d.client || "", siteAddr: d.site || "" });
          }
          const js = JSON.stringify([d, meta]);
          if (lastJob === null && !o.isNew) lastJob = js;
          else if (js !== lastJob) {
            lastJob = js;
            await S.db
              .doc("scaffold/" + key)
              .set(Object.assign({}, meta, { data: d, updated: Date.now() }));
          }
          const sc = sh.co || {};
          delete sh.co;
          const signId = sc.signImg ? await scfImgPut(sc.signImg, "Sign board.jpg") : "";
          const ss = scfSetSig(sh, signId, sc.signAR);
          if (lastSet === null) lastSet = ss;
          else if (ss !== lastSet) {
            lastSet = ss;
            await S.db.doc("scaffold/settings").set({
              shared: sh,
              signImgId: signId,
              signAR: sc.signAR || null,
              updated: Date.now(),
            });
          }
        } catch (e) {
          toast("Couldn't save the scaffold design – check your signal");
        }
      };
      scfQ = scfQ.then(run);
      return scfQ;
    },
    brand: () => BRGB(),
    async frame() {
      const fr = await lhFrame();
      return fr && fr.pics ? { top: fr.top, bot: fr.bot, lh: fr } : { top: 20, bot: 275, lh: null };
    },
    finish: (doc, fr) => lhFinish(doc, fr),
    async loadPdf() {
      await loadJsPdf();
      if (!window.jspdf.jsPDF.API.autoTable)
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
        );
    },
    loadPdfJs: () => loadPdfJs(),
    loadThree: () => hrLoad(),
    savePdf: (blob, fn) => S.dl.save({ filename: fn, data: blob }),
    pickCopy: (cb) => scfCopyPick(key, cb),
    pickOpen: () => scfPick(),
  };
  hostEl.innerHTML = "";
  const R = hostEl.attachShadow({ mode: "open" });
  R.innerHTML = `<style>${SCF_CSS}</style>${SCF_HTML}`;
  /* not on a job: the name can be typed (and the client and address when it isn't tied to a client) */
  if (o.free) {
    const note = [...R.querySelectorAll(".sub")].find((e) =>
      /come from the job/.test(e.textContent),
    );
    if (note)
      note.textContent = o.tied
        ? "Not on a job yet. Type a name for it; the client and address come from the client in SiteHQ."
        : "Not on a job yet. Type a name for it, and the client and address if you know them.";
    R.getElementById("job").readOnly = false;
    if (!o.tied) R.getElementById("client").readOnly = R.getElementById("site").readOnly = false;
  }
  try {
    scfLive = scfEngine(R, host);
    scfLive.flush();
    scfHouse(meta, R);
  } catch (e) {
    R.innerHTML = `<p style="padding:12px">The scaffold designer couldn't start: ${esc(e && e.message)}</p>`;
  }
}
/* every saved design (not the settings), newest first */
async function scfAll() {
  return ((await S.db.collection("scaffold").get()).docs || [])
    .filter((d) => d.id !== "settings")
    .map((d) => Object.assign({ id: d.id }, d.data() || {}))
    .filter((d) => d.data && Array.isArray(d.data.blocks))
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));
}
/* Copy scaffold design from another job (or another scaffold not on a job) */
async function scfCopyPick(key, cb) {
  let docs = [];
  try {
    docs = (await scfAll()).filter((d) => d.id !== key);
  } catch (e) {}
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "160";
  d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Copy a scaffold design"><b>🏗️ Copy scaffold design from another job</b>
    <div class="who">That job's building and scaffold replace this drawing. This job's details and costing stay. Undo puts your drawing back.</div>
    <div class="scf-list">${
      docs.length
        ? docs
            .map(
              (x, i) =>
                `<button type="button" class="btn scf-pick" data-i="${i}"><b>${esc(scfLabelOf(x))}</b><small class="who">${esc([x.site ? "" : "Not on a job", x.updated ? new Date(x.updated).toLocaleDateString("en-GB") : ""].filter(Boolean).join(" · "))}</small></button>`,
            )
            .join("")
        : '<div class="who">No other job has a scaffold design yet.</div>'
    }</div>
    <div class="dimbtns"><button type="button" class="btn scf-x">Cancel</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector(".scf-x").onclick = () => d.remove();
  d.querySelectorAll(".scf-pick").forEach(
    (b) =>
      (b.onclick = async () => {
        const x = docs[+b.dataset.i];
        d.remove();
        const data = JSON.parse(JSON.stringify(x.data));
        if (data.bgimgId) data.bgimg = await scfImgUrl(data.bgimgId);
        cb(data);
      }),
  );
}
/* 🏗️ Scaffold designer from the tools list: ＋ New scaffold, the scaffolds not on a job, or a current job */
async function scfPick() {
  if (!ownerMode()) return toast("Only " + bossFirst() + " can open the scaffold designer");
  const live = projectSites()
    .filter((n) => !isArchivedSite(n))
    .sort((a, b) => siteLabel(a).localeCompare(siteLabel(b)));
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "160";
  d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Scaffold designer"><b>🏗️ Scaffold designer</b>
    <div class="who">Each job keeps its own scaffold design. For an estimate, an enquiry or a job that isn't on site yet, make a new one.</div>
    <button type="button" class="btn primary" id="scf-new">＋ New scaffold (estimate or not a current job)</button>
    <div id="scf-others"></div>
    <div class="flabel" style="margin-top:10px">Current jobs</div>
    ${live.length > 8 ? '<input id="scf-q" placeholder="Search jobs" autocomplete="off">' : ""}
    <div class="scf-list">${
      live.length
        ? live
            .map(
              (n, i) =>
                `<button type="button" class="btn scf-pick" data-i="${i}"><b>${esc(siteLabel(n))}</b><small class="who scf-has"></small></button>`,
            )
            .join("")
        : '<div class="who">No live jobs.</div>'
    }</div>
    <div class="dimbtns"><button type="button" class="btn scf-x">Cancel</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector(".scf-x").onclick = () => d.remove();
  d.querySelector("#scf-new").onclick = () => {
    d.remove();
    scfNew();
  };
  d.querySelectorAll(".scf-pick").forEach(
    (b) =>
      (b.onclick = () => {
        d.remove();
        scfDesign(live[+b.dataset.i]);
      }),
  );
  const q = d.querySelector("#scf-q");
  if (q)
    q.oninput = () => {
      const t = q.value.trim().toLowerCase();
      d.querySelectorAll(".scf-pick").forEach(
        (b) => (b.hidden = !!t && !b.textContent.toLowerCase().includes(t)),
      );
    };
  /* which jobs have a design already, and the scaffolds not on a job */
  try {
    const all = await scfAll();
    const have = new Set(all.map((x) => x.id));
    d.querySelectorAll(".scf-pick").forEach((b) => {
      if (have.has(scfKeyOf(live[+b.dataset.i])))
        b.querySelector(".scf-has").textContent = "✓ Scaffold design started";
    });
    const oth = all.filter((x) => !x.site);
    if (oth.length) {
      const box = d.querySelector("#scf-others");
      box.innerHTML = `<div class="flabel" style="margin-top:10px">Estimates and other scaffolds</div><div class="scf-list">${oth
        .map((x, i) => {
          const c = x.clientId ? (S.clients || []).find((y) => y.id === x.clientId) : null;
          return `<button type="button" class="btn scf-oth" data-i="${i}"><b>${esc(scfLabelOf(x))}</b><small class="who">${esc([c ? c.name : x.client || "", x.updated ? new Date(x.updated).toLocaleDateString("en-GB") : ""].filter(Boolean).join(" · "))}</small></button>`;
        })
        .join("")}</div>`;
      box.querySelectorAll(".scf-oth").forEach(
        (b) =>
          (b.onclick = () => {
            const x = oth[+b.dataset.i];
            d.remove();
            scfOther(x.id, x);
          }),
      );
    }
  } catch (e) {}
}
/* ＋ New scaffold: a name, and the client or enquiry it's for (or none) */
function scfNew() {
  const cls = (S.clients || [])
    .filter((c) => c && c.name && c.stage !== "lost")
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "160";
  d.innerHTML = `<div class="dimbox" role="dialog" aria-label="New scaffold"><b>🏗️ New scaffold</b>
    <div class="who">For an estimate, an enquiry or a job that isn't on site yet. It's kept with the client, under Scaffold designer.</div>
    <label for="scf-cl">For which client or enquiry<select id="scf-cl"><option value="">Not for a client yet</option>${cls
      .map(
        (c) =>
          `<option value="${esc(c.id)}">${esc([c.name, c.work, c.stage === "enquiry" ? "enquiry" : ""].filter(Boolean).join(" – "))}</option>`,
      )
      .join("")}</select></label>
    <label for="scf-nm">Name<input id="scf-nm" maxlength="80" placeholder="e.g. 12 High Street – re-roof estimate" autocomplete="off"></label>
    <div class="dimbtns"><button type="button" class="btn scf-x">Cancel</button><button type="button" class="btn primary" id="scf-go">Start drawing</button></div></div>`;
  document.body.appendChild(d);
  const sel = d.querySelector("#scf-cl"),
    nm = d.querySelector("#scf-nm");
  sel.onchange = () => {
    const c = cls.find((x) => x.id === sel.value);
    if (c && !nm.value.trim()) nm.value = [c.name, c.work].filter(Boolean).join(" – ");
  };
  d.querySelector(".scf-x").onclick = () => d.remove();
  d.querySelector("#scf-go").onclick = () => {
    const c = cls.find((x) => x.id === sel.value);
    const name = nm.value.trim() || (c ? [c.name, c.work].filter(Boolean).join(" – ") : "");
    if (!name) {
      nm.focus();
      return toast("Give it a name, or pick the client");
    }
    d.remove();
    const key = "est-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const o = { name, clientId: c ? c.id : "" };
    scfOther(key, o, true);
  };
}
/* 🏗️ Scaffold designer from the tools list opens straight on a blank design (James, Nov 2026: "when i open the
   scaffold tab it should open blank ready for a new design"); it's only kept once something is drawn, and
   📂 Open a saved scaffold or a job inside it lists the rest */
function scfBlank() {
  if (!ownerMode()) return toast("Only " + bossFirst() + " can open the scaffold designer");
  const name =
    "New scaffold " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const key = "est-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return scfOther(key, { name }, false);
}
/* 🏠 About the house (James, Nov 2026: "need to add more details about the house like drawings or photos from saved and
   while on site"): notes about the house, photos taken on site (📷 Take a photo opens the camera), drawings or photos
   from the iPad, and ones already saved in SiteHQ – the job's site photos, its plans & drawings, and the client's
   enquiry photos and documents. Tap one to look at it; ✏️ Trace puts a drawing or photo under the Plan to trace round.
   Kept with the design: house { notes, media [{ assetId, name, type }] } on its scaffold record. */
const scfIsImg = (m) =>
  /^image\//.test(m.type || "") || /\.(jpe?g|png|webp|heic)$/i.test(m.name || "");
const scfIsPdf = (m) => /pdf/i.test(m.type || "") || /\.pdf$/i.test(m.name || "");
function scfHouse(meta, R) {
  const box = $("scf-house");
  if (!box) return;
  const H = () => (meta.house = meta.house || { notes: "", media: [] });
  const store = () => {
    try {
      if (scfLive && scfLive.saveNow) scfLive.saveNow();
    } catch (e) {}
  };
  const client = meta.site
    ? siteClient(meta.site)
    : meta.clientId
      ? (S.clients || []).find((c) => c.id === meta.clientId)
      : null;
  const site = meta.site || (client && client.site) || "";
  /* what's already saved for this job or client */
  function saved() {
    const out = [];
    if (site) {
      allTeam("photos")
        .filter((p) => same(p.site, site) && p.assetId && !isSketch(p))
        .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0))
        .forEach((p) =>
          out.push({
            g: "📷 Site photos",
            assetId: p.assetId,
            name: p.caption || "Site photo",
            type: "image/jpeg",
          }),
        );
      (S.docs || [])
        .filter((d) => same(d.site, site) && d.assetId && (d.cat === "plans" || d.cat === "specs"))
        .forEach((d) =>
          out.push({
            g: "📐 Plans & drawings",
            assetId: d.assetId,
            name: d.title || d.fileName || "Drawing",
            type: d.contentType || "",
          }),
        );
    }
    if (client) {
      (client.media || [])
        .filter((m) => m.id && (m.kind || "photo") !== "video" && m.kind !== "voice")
        .forEach((m) =>
          out.push({
            g: "🏡 " + (client.name || "Client") + "'s photos & sketches",
            assetId: m.preview || m.id,
            name: m.note || (m.kind === "sketch" ? "Sketch" : "Photo"),
            type: "image/jpeg",
          }),
        );
      (client.docs || [])
        .filter((d) => d.assetId)
        .forEach((d) =>
          out.push({
            g: "📄 " + (client.name || "Client") + "'s documents",
            assetId: d.assetId,
            name: d.name || "Document",
            type: d.type || "application/pdf",
          }),
        );
    }
    return out;
  }
  function draw() {
    const h = H();
    box.innerHTML = `<details class="scf-hs" open><summary><b>🏠 About the house</b> <span class="who">${h.media.length ? h.media.length + " photo" + (h.media.length === 1 ? "" : "s") + " & drawing" + (h.media.length === 1 ? "" : "s") : "photos, drawings and notes"}</span></summary>
      <label for="scf-hn">Notes about the house<textarea id="scf-hn" maxlength="3000" placeholder="e.g. Access down the side path. Glass conservatory roof at the back. Overhead cable on the left. Soft ground at the front.">${esc(h.notes || "")}</textarea></label>
      <div class="scf-hg">${h.media
        .map(
          (m, i) =>
            `<div class="scf-hm"><button type="button" class="scf-ho" data-i="${i}" aria-label="Open ${esc(m.name || "photo")}">${scfIsImg(m) ? `<img src="${blobUrl(m.assetId)}" alt="">` : `<span class="scf-hp">📄</span>`}<span class="who">${esc(m.name || "")}</span></button><span class="scf-hb">${scfIsImg(m) || scfIsPdf(m) ? `<button type="button" class="pillbtn scf-ht" data-i="${i}">✏️ Trace</button>` : ""}<button type="button" class="linkdanger scf-hx" data-i="${i}" aria-label="Take out ${esc(m.name || "this one")}">✕</button></span></div>`,
        )
        .join("")}</div>
      <div class="actions"><label class="btn primary scf-hf">📷 Take a photo<input type="file" accept="image/*" capture="environment" multiple id="scf-hcam"></label><label class="btn scf-hf">📄 Add a drawing or photo<input type="file" accept="image/*,application/pdf,.pdf" multiple id="scf-hfile"></label><button type="button" class="btn" id="scf-hsaved">📁 From what's saved</button></div>
      <div class="who" id="scf-hst" role="status"></div></details>`;
    let nt = 0;
    $("scf-hn").oninput = (e) => {
      clearTimeout(nt);
      nt = setTimeout(() => {
        H().notes = e.target.value;
        store();
      }, 800);
    };
    box.querySelectorAll(".scf-ho").forEach(
      (b) =>
        (b.onclick = () => {
          const m = H().media[+b.dataset.i];
          if (m) openFile(m.assetId, m.name, m.type);
        }),
    );
    box.querySelectorAll(".scf-hx").forEach(
      (b) =>
        (b.onclick = (e) => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure?";
            return;
          }
          H().media.splice(+b.dataset.i, 1);
          store();
          draw();
        }),
    );
    box.querySelectorAll(".scf-ht").forEach(
      (b) =>
        (b.onclick = async () => {
          const m = H().media[+b.dataset.i];
          if (!m) return;
          try {
            const bl = await getFileBlob(m.assetId);
            const f = new File([bl], m.name || (scfIsPdf(m) ? "Drawing.pdf" : "Photo.jpg"), {
              type: bl.type || m.type || (scfIsPdf(m) ? "application/pdf" : "image/jpeg"),
            });
            const inp = R.getElementById("tracefile");
            const dt = new DataTransfer();
            dt.items.add(f);
            inp.files = dt.files;
            inp.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (x) {
            toast("Couldn't open that one to trace");
          }
        }),
    );
    const add = async (files, from) => {
      const L = [...(files || [])];
      if (!L.length) return;
      if (!S.assets) return toast(uploadErr({ code: "not_granted" }));
      const st = $("scf-hst");
      for (let i = 0; i < L.length; i++) {
        const f = L[i];
        if (st) st.textContent = `Saving ${i + 1} of ${L.length}…`;
        try {
          const img = /^image\//.test(f.type || "");
          let b = f;
          if (img)
            try {
              b = await shrinkImage(f, 1800);
            } catch (x) {}
          const nm = img
            ? (from === "cam"
                ? "On site " + new Date().toLocaleDateString("en-GB")
                : (f.name || "Photo").replace(/\.[^.]+$/, "")) + ".jpg"
            : f.name || "Drawing.pdf";
          const a = await uploadAnyFile(b, nm);
          H().media.push({
            assetId: a.id,
            name: nm,
            type: img ? "image/jpeg" : f.type || "application/pdf",
          });
        } catch (x) {
          toast("Couldn't save " + (f.name || "that one"));
        }
      }
      store();
      draw();
    };
    $("scf-hcam").onchange = (e) => {
      const f = e.target.files;
      add(f, "cam").then(() => {});
      e.target.value = "";
    };
    $("scf-hfile").onchange = (e) => {
      const f = e.target.files;
      add(f, "file").then(() => {});
      e.target.value = "";
    };
    $("scf-hsaved").onclick = () => pickSaved();
  }
  function pickSaved() {
    const L = saved();
    const have = new Set(H().media.map((m) => m.assetId));
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "160";
    const groups = [...new Set(L.map((x) => x.g))];
    d.innerHTML = `<div class="dimbox scf-hpick" role="dialog" aria-label="Photos and drawings already saved"><b>📁 From what's saved</b>
      <div class="who">${site || client ? "Tick the ones to keep with this scaffold." : "This scaffold isn't for a job or a client yet, so there's nothing saved to pick from."}</div>
      ${
        groups
          .map(
            (g) =>
              `<div class="flabel">${esc(g)}</div><div class="scf-hg">${L.map((x, i) => (x.g === g ? `<label class="scf-hm scf-hpk"><input type="checkbox" data-i="${i}" ${have.has(x.assetId) ? "checked disabled" : ""}>${scfIsImg(x) ? `<img src="${blobUrl(x.assetId)}" alt="">` : `<span class="scf-hp">📄</span>`}<span class="who">${esc(x.name)}</span></label>` : "")).join("")}</div>`,
          )
          .join("") ||
        (site || client ? '<div class="who">Nothing saved for this job yet.</div>' : "")
      }
      <div class="dimbtns"><button type="button" class="btn scf-hpx">Cancel</button><button type="button" class="btn primary scf-hpok">Add the ticked ones</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".scf-hpx").onclick = () => d.remove();
    d.querySelector(".scf-hpok").onclick = () => {
      d.querySelectorAll("input[data-i]:checked:not(:disabled)").forEach((c) => {
        const x = L[+c.dataset.i];
        if (x && !have.has(x.assetId))
          H().media.push({ assetId: x.assetId, name: x.name, type: x.type });
      });
      d.remove();
      store();
      draw();
    };
  }
  draw();
}
