/* ================= JOB DETAILS FOR TRADES (kept on the site record, which trades can read) ================= */
import { clConCard, clContactsHtml, clMainHtml } from "../clients/address-book.js";
import { CL_WORK, clList, openClientForm, saveClient } from "../clients/clients.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { clAddr } from "../clients/stages-planner.js";
import { $, esc, gbp, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { nameOf, roleOf, teamIds } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { siteRec } from "../photos/photos.js";
import { shrinkImage } from "../safety/training.js";
import { gmapDir } from "./maps-pins.js";
import { same } from "./project-pages.js";
import { siteClient } from "./summary.js";
export {
  clientJobCard,
  editSiteJob,
  editSiteVis,
  empTypeOf,
  jobNameOf,
  siteFromClient,
  siteFront,
  siteJobCard,
  siteLabel,
  siteSumHtml,
  sjClientOK,
  sjCopy,
  sjEffective,
  sjMaster,
  sjPayload,
  syncSiteJobs,
  wireSiteSum,
  wireSjPhotos,
};
const SJ_FIELDS = [
  ["work", "Type of work", "e.g. Single-storey rear extension"],
  [
    "scope",
    "What's being done",
    "e.g. Strip out kitchen, knock through to dining room, new steel, re-plaster",
    1,
  ],
  ["start", "Start date", "", 0, "date"],
  ["finish", "Finish date (planned)", "", 0, "date"],
  ["hours", "Site working hours", "e.g. 8am to 5pm, no noisy work before 9am"],
  ["contactName", "Site contact", "e.g. Mrs Smith, or site manager"],
  ["contactPhone", "Site contact phone", "", 0, "tel"],
  ["otherContacts", "Other contacts", "e.g. Bob Jones (husband) · 07700 900456", 1],
  [
    "access",
    "Access, parking & keys",
    "e.g. Park on the drive, key in the key safe 1234, side gate",
    1,
  ],
  ["welfare", "Toilet, welfare, power & water", "e.g. Use the downstairs WC, power in garage", 1],
  ["waste", "Skips & waste", "e.g. Skip on the drive, no plasterboard in it", 1],
  [
    "safety",
    "Hazards & things to watch",
    "e.g. Asbestos survey done, dog in the house, live cables in the loft",
    1,
  ],
  ["notes", "Other notes", "", 1],
];
const SJ_GROUPS = [
  ["overview", "📋 Job overview", ["work", "scope", "start", "finish", "hours"]],
  ["contact", "📞 Site contact", ["contactName", "contactPhone", "otherContacts"]],
  ["access", "🔑 Access, parking & keys", ["access"]],
  ["welfare", "🚻 Welfare, power & water", ["welfare"]],
  ["waste", "🗑 Skips & waste", ["waste"]],
  ["safety", "⚠ Hazards", ["safety"]],
  ["notes", "📝 Other notes", ["notes"]],
  ["front", "🏠 Photo of the front", []],
  ["photos", "📷 Photos & sketches", []],
];
const SJ_TYPES = Object.entries(EMP_TYPES).map(([k, l]) => ["t:" + k, l + " only"]);
const SJ_VIS = [
  ["all", "Everyone (trades and client)"],
  ["trades", "All trades"],
  ["sub", "All self-employed"],
].concat(SJ_TYPES, [
  ["client", "Just the client"],
  ["some", "Pick people"],
]);
const SJ_GVIS = [
  ["site", "Same as the site"],
  ["all", "Everyone"],
  ["trades", "All trades"],
  ["sub", "All self-employed"],
].concat(SJ_TYPES, [
  ["client", "Just the client"],
  ["me", "Only me"],
  ["some", "Pick people…"],
]);
function empTypeOf(id) {
  const t = S.team[id] || {};
  const e = t.details && t.details.empType;
  if (e) return e;
  const r = roleOf(id);
  return r === "employee" ? "employed" : r === "company" ? "company" : r === "sub" ? "selfemp" : "";
}
const sjRoleOK = (v, id) => {
  if (!v) return false;
  if (v.startsWith("t:")) return empTypeOf(id) === v.slice(2);
  if (v === "emp") return empTypeOf(id) === "employed";
  if (v === "sub")
    return ["cis", "selfemp", "company"].includes(empTypeOf(id)) || roleOf(id) === "sub";
  return false;
};
const sjMaster = (site) => (S.sitejobs || []).find((x) => same(x.site, site));
const sjCopy = (site) => {
  if (S.owner && S.preview) {
    const m = sjMaster(site);
    if (!m) return null;
    const tm = teamIds();
    const who = tm.find((id) => visMatch(m, id)) || "__none";
    if (!sjTradeOK(m, who)) return { type: "sitejob", site: m.site, hidden: true };
    const pl = sjPayload(m, who);
    return {
      type: "sitejob",
      site: m.site,
      address: pl.address,
      job: pl.job,
      photo: pl.photo,
      photos: pl.photos,
    };
  }
  return (S.mine.signoffs || []).find((x) => x.type === "sitejob" && same(x.site, site));
};
/* a "who sees it" choice: {vis:"all"} or {vis:"multi",groups:[...],people:[...],toClient}; older single choices still work */
function visNorm(p) {
  p = p || {};
  const v = p.vis || "all";
  if (v === "all" || v === "site" || v === "me" || v === "multi")
    return Object.assign({ groups: [], people: [] }, p, {
      groups: p.groups || [],
      people: p.people || [],
    });
  return {
    vis: "multi",
    groups: v === "some" ? [] : [v],
    people: p.people || [],
    toClient: !!p.toClient || v === "client",
  };
}
function visMatch(p, who) {
  const n = visNorm(p);
  if (n.vis === "all") return true;
  if (n.vis === "me") return false;
  const cl = who === "__client";
  if (cl) return n.groups.includes("client") || !!n.toClient;
  if (n.groups.includes("trades")) return true;
  if (n.groups.some((g) => g !== "client" && sjRoleOK(g, who))) return true;
  return n.people.includes(who);
}
function visLabel(p) {
  const n = visNorm(p);
  if (n.vis === "all") return "Everyone";
  if (n.vis === "me") return "Only me";
  if (n.vis === "site") return "Same as the site";
  const L = {
    trades: "all trades",
    sub: "all self-employed",
    emp: "employed",
    client: "the client",
  };
  const out = n.groups.map((g) => L[g] || (g.startsWith("t:") ? EMP_TYPES[g.slice(2)] || g : g));
  n.people.filter((id) => S.team[id]).forEach((id) => out.push(nameOf(id)));
  if (n.toClient && !n.groups.includes("client")) out.push("the client");
  const t = out.join(", ");
  return t ? t[0].toUpperCase() + t.slice(1) : "Nobody";
}
function sjTradeOK(m, id) {
  return visMatch(m, id);
}
function sjClientOK(m) {
  return visMatch(m, "__client");
}
function sjGroupOK(m, g, who) {
  const p = (m.perms || {})[g] || { vis: "site" };
  if (p.vis === "site" || !p.vis) return visMatch(m, who);
  return visMatch(p, who);
}
function sjWho(m) {
  if (!m) return "";
  const n = visNorm(m);
  if (n.vis === "all") return "Everyone on this job can see this site: the trades and the client.";
  const l = visLabel(m);
  return l === "Nobody" ? "Nobody can see this site yet." : "Can see this site: " + l + ".";
}
function sjGroupWho(m, g) {
  return visLabel((m.perms || {})[g] || { vis: "site" });
}
function sjMedia(c) {
  return ((c && c.media) || [])
    .filter((x) => x && x.id)
    .map((x) => ({ id: x.id, kind: x.kind || "photo", note: x.note || "" }));
}
/* what's on your side already (site + client record) fills any box you've left empty */
const clOtherText = (c) =>
  ((c && c.contacts) || [])
    .filter((x) => x && (x.name || x.phone || x.email))
    .map((x) =>
      [(x.name || "Contact") + (x.role ? " (" + x.role + ")" : ""), x.phone, x.email]
        .filter(Boolean)
        .join(" · "),
    )
    .join("\n");
function sjEffective(m) {
  const c = siteClient(m.site),
    sr = siteRec(m.site) || {};
  const j = Object.assign({}, m.job || {});
  const set = (k, v) => {
    if (v && !j[k]) j[k] = v;
  };
  set("work", (c && c.work) || sr.project);
  set("scope", c && c.desc);
  if (c) {
    set("contactName", c.name);
    set("contactPhone", c.phone);
    set("otherContacts", clOtherText(c));
  }
  if (c && c.timescale) set("notes", "Timescale: " + c.timescale);
  return j;
}
function sjPayload(m, who) {
  const c = siteClient(m.site);
  const job = {};
  let any = false;
  const ej = sjEffective(m);
  SJ_GROUPS.forEach(([g, , fs]) => {
    if (!fs.length || !sjGroupOK(m, g, who)) return;
    fs.forEach((k) => {
      if (ej[k]) {
        job[k] = ej[k];
        any = true;
      }
    });
  });
  const photo = sjGroupOK(m, "front", who)
    ? (siteRec(m.site) || {}).frontPhoto || (c && c.frontPhoto) || ""
    : "";
  const photos = sjGroupOK(m, "photos", who) ? sjMedia(c) : [];
  const address = c ? clAddr(c) : "";
  return { job, photo, photos, address, any: any || !!photo || photos.length > 0 };
}
let sjQ = Promise.resolve();
const sjSent = {};
function syncSiteJobs(onlyId) {
  if (!S.owner) return Promise.resolve({ trades: 0, client: 0 });
  const run = sjQ.then(() => sjSyncNow(onlyId)).catch(() => ({ trades: 0, client: 0 }));
  sjQ = run.then(
    () => {},
    () => {},
  );
  return run;
}
async function sjSyncNow(onlyId) {
  let nt = 0,
    nc = 0;
  for (const m of S.sitejobs || []) {
    if (onlyId && m.id !== onlyId) continue;
    const key = "sj-" + String(m.id).replace(/^sj-/, "");
    const u = m.updated || 0;
    for (const id of teamIds()) {
      const ok = sjTradeOK(m, id);
      const pl = ok ? sjPayload(m, id) : null;
      const want = ok
        ? {
            type: "sitejob",
            site: m.site,
            address: pl.address,
            job: pl.job,
            photo: pl.photo,
            photos: pl.photos,
            updated: u,
          }
        : { type: "sitejob", site: m.site, hidden: true, updated: u };
      const sig = JSON.stringify([
        want.site,
        want.hidden || false,
        want.job || {},
        want.photo || "",
        want.photos || [],
        want.address || "",
      ]);
      const have = (S.data.signoffs[id] || []).find((x) => x.id === key);
      const hsig = have
        ? JSON.stringify([
            have.site,
            have.hidden || false,
            have.job || {},
            have.photo || "",
            have.photos || [],
            have.address || "",
          ])
        : "";
      if (hsig === sig || (!onlyId && sjSent[id + key] === sig)) {
        sjSent[id + key] = sig;
        if (ok) nt++;
        continue;
      }
      try {
        await S.db.doc("sheets/" + id + "/signoffs/" + key).set(want);
        sjSent[id + key] = sig;
        if (ok) nt++;
      } catch (e) {}
    }
    const c = siteClient(m.site);
    if (c && c.portalUid) {
      const ok = sjClientOK(m);
      const pl = ok ? sjPayload(m, "__client") : null;
      const want =
        ok && pl.any
          ? {
              site: m.site,
              address: pl.address,
              job: pl.job,
              photo: pl.photo,
              photos: pl.photos,
              updated: u,
            }
          : null;
      const sig = JSON.stringify(want);
      if (sjSent["__c" + key] !== sig || onlyId) {
        try {
          await S.db.doc("portal/" + c.portalUid).update({ siteJob: want });
          sjSent["__c" + key] = sig;
          if (want) nc++;
        } catch (e) {}
      } else if (want) nc++;
    }
  }
  for (const sr of S.sites || []) {
    if (!sr.job) continue;
    if (!sjMaster(sr.name)) {
      const id = "sj-" + sr.id;
      const d = {
        kind: "sitejob",
        site: sr.name,
        siteId: sr.id,
        job: sr.job,
        vis: "trades",
        people: [],
        toClient: false,
        perms: {},
        updated: Date.now(),
      };
      await S.db
        .doc("todos/" + id)
        .set(d)
        .catch(() => {});
      S.sitejobs = (S.sitejobs || []).concat([Object.assign({ id }, d)]);
    }
    await S.db
      .doc("sites/" + sr.id)
      .update({ job: null })
      .catch(() => {});
  }
  return { trades: nt, client: nc };
}
function sjBody(j, extra) {
  const row = (l, v) =>
    v ? `<div class="drow"><span>${esc(l)}</span><span>${v}</span></div>` : "";
  const tel = String(j.contactPhone || "").replace(/\s+/g, "");
  const body = [
    row("Type of work", esc(j.work || extra || "")),
    row("Start", j.start ? esc(shortDay(j.start)) : ""),
    row("Finish", j.finish ? esc(shortDay(j.finish)) : ""),
    row("Working hours", esc(j.hours || "")),
  ].join("");
  const others = String(j.otherContacts || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const ps = l.split(/\s*·\s*/);
      let nm = ps.shift() || "Contact",
        role = "";
      const m = nm.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      if (m) {
        nm = m[1];
        role = m[2];
      }
      const phone =
          ps.find((x) => /\d{6,}/.test(x.replace(/\s+/g, ""))) ||
          (/\d{6,}/.test(nm.replace(/\s+/g, "")) ? "" : ""),
        email = ps.find((x) => /@/.test(x)) || "";
      const rest = ps.filter((x) => x !== phone && x !== email).join(" · ");
      return clConCard({ name: nm, role: [role, rest].filter(Boolean).join(" · "), phone, email });
    });
  const cons =
    j.contactName || j.contactPhone || others.length
      ? `<div class="flabel" style="margin-top:8px">📞 Contacts</div><div class="clcons">${j.contactName || j.contactPhone ? clConCard({ name: j.contactName || "Site contact", role: "Site contact", phone: j.contactPhone }) : ""}${others.join("")}</div>`
      : "";
  const long = [
    ["scope", "What's being done"],
    ["access", "Access, parking & keys"],
    ["welfare", "Toilet, welfare, power & water"],
    ["waste", "Skips & waste"],
    ["safety", "⚠ Hazards & things to watch"],
    ["notes", "Other notes"],
  ]
    .filter(([k]) => j[k])
    .map(
      ([k, l]) =>
        `<div class="sjblock${k === "safety" ? " sjwarn" : ""}"><b>${esc(l)}</b><div>${esc(j[k])}</div></div>`,
    )
    .join("");
  return {
    html: (body ? `<div class="details">${body}</div>` : "") + cons + long,
    tel,
    has: SJ_FIELDS.some(([k]) => j[k]),
  };
}
function sjPhotosHtml(list) {
  return list && list.length
    ? `<div class="flabel" style="margin-top:10px">📷 Photos &amp; sketches</div><div class="phgrid sjph">${list.map((x) => `<button type="button" class="ph sj-ph" data-a="${esc(x.id)}"><img src="${blobUrl(x.id)}" alt="${esc(x.note || (x.kind === "photo" ? "Photo" : "Sketch"))}" loading="lazy">${x.note ? `<span class="phcap">${esc(x.note)}</span>` : ""}</button>`).join("")}</div>`
    : "";
}
function wireSjPhotos(root) {
  (root || document)
    .querySelectorAll(".sj-ph")
    .forEach((b) => (b.onclick = () => openFile(b.dataset.a, "photo.jpg", "image/jpeg")));
}
function siteJobCard(site, owner, embed) {
  const sr = siteRec(site);
  const W = embed ? "sjinner" : "card sjcard";
  if (owner) {
    const m = sjMaster(site);
    const b = sjBody(m ? sjEffective(m) : sjEffective({ site, job: {} }), sr && sr.project);
    const c = siteClient(site);
    const media = sjMedia(c);
    return `<div class="${W}"><div class="sjhead"><b>📋 Job details</b><button type="button" class="pillbtn" id="sj-edit">✎ ${b.has ? "Edit" : "Add details"}</button></div>
      <button type="button" class="sjwho sjperm" id="sj-perm">👁 <span>${esc(m ? sjWho(m) : "Everyone on this job can see this site: the trades and the client.")}</span><b>Change who sees it ›</b></button>
      ${
        m && m.perms && Object.values(m.perms).some((p) => p && p.vis && p.vis !== "site")
          ? `<div class="sjperms">${SJ_GROUPS.filter(
              ([g]) => ((m.perms || {})[g] || {}).vis && m.perms[g].vis !== "site",
            )
              .map(([g, l]) => `<span><b>${l}</b> ${esc(sjGroupWho(m, g))}</span>`)
              .join("")}</div>`
          : ""
      }
      ${!b.has ? `<div class="who">Add the scope, access, parking, site contact and hazards so everyone has it in one place.</div>` : ""}
      ${b.html}${media.length ? `<div class="who" style="margin-top:8px">📷 ${media.length} photo${media.length === 1 ? "" : "s"}/sketch${media.length === 1 ? "" : "es"} from ${esc(c.name)}'s record: ${esc(m ? sjGroupWho(m, "photos") : "Same as the site")}</div>` : ""}</div>`;
  }
  const cp = sjCopy(site);
  if (!cp || cp.hidden) return "";
  const b = sjBody(cp.job || {}, sr && sr.project);
  if (!b.has && !(cp.photos || []).length) return "";
  return `<div class="${W}"><div class="sjhead"><b>📋 Job details</b></div>${b.html}${sjPhotosHtml(cp.photos)}${b.tel ? `<div class="actions"><a class="btn primary" href="tel:${esc(b.tel)}">📞 Call site contact</a></div>` : ""}</div>`;
}
function clientJobCard(sj) {
  if (!sj) return "";
  const b = sjBody(sj.job || {});
  if (!b.has && !(sj.photos || []).length) return "";
  return `<div class="card sjcard"><div class="sjhead"><b>📋 Your job</b></div>${b.html}${sjPhotosHtml(sj.photos)}</div>`;
}
async function ensureSiteRec(site, extra) {
  let sr = siteRec(site);
  if (sr) return sr;
  const d = Object.assign({ name: site, created: Date.now() }, extra || {});
  const ref = await S.db.collection("sites").add(d);
  sr = Object.assign({ id: ref.id }, d);
  S.sites = (S.sites || []).concat([sr]);
  return sr;
}
async function saveSiteJob(site, patch) {
  const sr = await ensureSiteRec(site);
  const m = sjMaster(site) || {};
  const id = m.id || "sj-" + sr.id;
  const rec = Object.assign(
    {
      kind: "sitejob",
      site,
      siteId: sr.id,
      job: m.job || {},
      vis: m.vis || "all",
      groups: m.groups || [],
      people: m.people || [],
      toClient: m.toClient != null ? m.toClient : !!siteClient(site),
      perms: m.perms || {},
    },
    patch,
    { updated: Date.now() },
  );
  await S.db.doc("todos/" + id).set(rec);
  const i = (S.sitejobs || []).findIndex((x) => x.id === id);
  const r2 = Object.assign({ id }, rec);
  if (i >= 0) S.sitejobs[i] = r2;
  else S.sitejobs = (S.sitejobs || []).concat([r2]);
  r2.sent = await syncSiteJobs(id);
  return r2;
}
function sjSentMsg(r) {
  const t = (r.sent || {}).trades || 0,
    c = (r.sent || {}).client || 0;
  const c0 = siteClient(r.site);
  return (
    "Saved. Sent to " +
    (t ? t + " trade" + (t === 1 ? "" : "s") : "no trades") +
    (sjClientOK(r)
      ? c
        ? " and the client"
        : c0 && !c0.portalUid
          ? " (the client sees it once they join the portal)"
          : c0
            ? ""
            : " (no client linked to this site)"
      : "") +
    "."
  );
}
/* when a client is accepted: make the site and fill the job details from everything on their record */
async function siteFromClient(c, start, finish) {
  const name = (c.site || clAddr(c) || c.name).trim();
  if (!name) return null;
  await ensureSiteRec(
    name,
    Object.assign(
      { project: c.work || "", client: c.name },
      c.lat != null ? { lat: c.lat, lon: c.lon, pins: c.pins || [] } : {},
    ),
  );
  const m = sjMaster(name);
  const j = Object.assign({}, (m && m.job) || {});
  const set = (k, v) => {
    if (v && !j[k]) j[k] = v;
  };
  set("work", c.work);
  set("scope", c.desc);
  set("start", start);
  set("finish", finish);
  set("contactName", c.name);
  set("contactPhone", c.phone);
  set("otherContacts", clOtherText(c));
  if (c.timescale && !j.notes) j.notes = "Client's timescale: " + c.timescale;
  await saveSiteJob(
    name,
    m
      ? { job: j }
      : {
          job: j,
          vis: "all",
          people: [],
          toClient: true,
          perms: {
            contact: { vis: "multi", groups: ["trades"], people: [] },
            access: { vis: "multi", groups: ["trades"], people: [] },
            welfare: { vis: "multi", groups: ["trades"], people: [] },
            photos: { vis: "multi", groups: ["trades"], people: [] },
          },
        },
  );
  return name;
}
function visPicker(p, site, pre, isPart) {
  pre = pre || "sj";
  const c = siteClient(site);
  const team = teamIds();
  const n = visNorm(p || { vis: isPart ? "site" : "all" });
  const on = (v) =>
    v === "all"
      ? n.vis === "all"
      : v === "site"
        ? n.vis === "site"
        : v === "me"
          ? n.vis === "me"
          : n.vis === "multi" && (n.groups.includes(v) || (v === "client" && n.toClient));
  const chip = (v, l, cls) =>
    `<button type="button" class="${cls || ""}" data-v="${esc(v)}" aria-pressed="${on(v)}">${l}</button>`;
  const ex = isPart
    ? [
        ["site", "Same as the site"],
        ["all", "Everyone"],
        ["me", "Only me"],
      ]
    : [["all", "Everyone (trades and client)"]];
  const grp = [
    ["trades", "All trades"],
    ["sub", "All self-employed"],
  ].concat(
    Object.entries(EMP_TYPES).map(([k, l]) => ["t:" + k, l]),
    [["client", "👤 " + (c ? esc(c.name) + " (client)" : "The client")]],
  );
  return `<div class="vispick" id="${pre}-vp"><div class="seg">${ex.map(([v, l]) => chip(v, l, "vx")).join("")}</div>
    <div class="flabel" style="margin:8px 0 2px">Or tick as many groups as you like</div><div class="seg">${grp.map(([v, l]) => chip(v, l, "vg")).join("")}</div>
    <div class="flabel" style="margin:8px 0 2px">And/or individual people</div><div class="seg pplgrp">${
      Object.entries(EMP_TYPES)
        .concat([["", "Not set yet"]])
        .map(([r, l]) => {
          const ids = team.filter((id) => (EMP_TYPES[empTypeOf(id)] ? empTypeOf(id) : "") === r);
          return ids.length
            ? `<span class="pplh">${l}</span>` +
                ids
                  .map(
                    (id) =>
                      `<button type="button" class="vp" data-v="${esc(id)}" aria-pressed="${n.vis === "multi" && n.people.includes(id)}">${esc(nameOf(id))}</button>`,
                  )
                  .join("")
            : "";
        })
        .join("") || '<span class="who">No trades on the app yet.</span>'
    }</div></div>
    ${!isPart ? (c && !c.portalUid ? `<div class="who">${esc(c.name)} hasn't joined the client portal yet. They'll see it once they join.</div>` : !c ? `<div class="who">No client is linked to this site yet, so the client option only takes effect once you link one.</div>` : "") : ""}`;
}
function wireVisPicker(pre) {
  pre = pre || "sj";
  document.querySelectorAll(`#${CSS.escape(pre)}-vp button`).forEach(
    (b) =>
      (b.onclick = () => {
        const box = $(pre + "-vp");
        if (b.classList.contains("vx")) {
          box
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          return;
        }
        b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
        box.querySelectorAll(".vx").forEach((x) => x.setAttribute("aria-pressed", "false"));
        if (
          ![...box.querySelectorAll("button")].some(
            (x) => x.getAttribute("aria-pressed") === "true",
          )
        ) {
          const d =
            box.querySelector('.vx[data-v="site"]') || box.querySelector('.vx[data-v="all"]');
          if (d) d.setAttribute("aria-pressed", "true");
        }
      }),
  );
}
function readVisPicker(pre) {
  pre = pre || "sj";
  const box = $(pre + "-vp");
  const x = box.querySelector('.vx[aria-pressed="true"]');
  if (x) return { vis: x.dataset.v, groups: [], people: [], toClient: false };
  const groups = [...box.querySelectorAll('.vg[aria-pressed="true"]')].map((b) => b.dataset.v);
  const people = [...box.querySelectorAll('.vp[aria-pressed="true"]')].map((b) => b.dataset.v);
  return { vis: "multi", groups, people, toClient: groups.includes("client") };
}
function editSiteVis(site) {
  const m = sjMaster(site) || { vis: "all", people: [], toClient: !!siteClient(site) };
  openSheet(
    `<h3 id="sheettitle">Who can see ${esc(site)}?</h3><div class="who">This decides who sees this site at all. In <b>✎ Edit</b> you can then choose who sees each part of the details.</div>
    ${visPicker(m, site)}${formFoot(false, "Save")}`,
    async () => {
      const v = readVisPicker();
      $("f-save").disabled = true;
      try {
        const r = await saveSiteJob(site, v);
        closeForm();
        toast(sjSentMsg(r));
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  wireVisPicker();
}
async function editSiteJob(site) {
  let sr = siteRec(site);
  if (!sr) {
    try {
      sr = await ensureSiteRec(site);
    } catch (e) {
      toast("Couldn't set up this site");
      return;
    }
  }
  const m = sjMaster(site) || { vis: "all", people: [], toClient: !!siteClient(site), perms: {} };
  const j = sjEffective(Object.assign({ site }, m));
  const c = siteClient(site);
  const perms = Object.assign({}, m.perms || {});
  if (!j.work) j.work = sr.project || (c && c.work) || "";
  const media = sjMedia(c);
  const field = ([k, l, ph, big, type]) =>
    big
      ? `<label for="sj-${k}">${esc(l)}<textarea id="sj-${k}" maxlength="1500" placeholder="${esc(ph)}">${esc(j[k] || "")}</textarea></label>`
      : `<label for="sj-${k}">${esc(l)}<input id="sj-${k}" ${type ? `type="${type}"` : ""} maxlength="200" value="${esc(j[k] || "")}" placeholder="${esc(ph)}"></label>`;
  const gpick = (g) =>
    `<div class="gpbox"><div class="gplab">👁 Who sees this part</div>${visPicker(perms[g] || { vis: "site" }, site, "gp-" + g, true)}</div>`;
  const gpickOld = (g) => {
    const p = perms[g] || { vis: "site" };
    return `<div class="gpbox"><label class="gplab">👁 Who sees this part<select class="gp-sel" data-g="${g}">${SJ_GVIS.map(([v, l]) => `<option value="${v}" ${(p.vis || "site") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="seg gp-ppl pplgrp" data-g="${g}" ${p.vis === "some" ? "" : "hidden"}>${Object.entries(
      EMP_TYPES,
    )
      .concat([["", "Not set yet"]])
      .map(([r, l]) => {
        const ids = teamIds().filter((id) => (EMP_TYPES[empTypeOf(id)] ? empTypeOf(id) : "") === r);
        return ids.length
          ? `<span class="pplh">${l}</span>` +
              ids
                .map(
                  (id) =>
                    `<button type="button" data-v="${esc(id)}" aria-pressed="${(p.people || []).includes(id)}">${esc(nameOf(id))}</button>`,
                )
                .join("")
          : "";
      })
      .join(
        "",
      )}<span class="pplh">Client</span><button type="button" data-v="__client" aria-pressed="${!!p.toClient}">👤 ${c ? esc(c.name) : "Client"}</button></div></div>`;
  };
  openSheet(
    `<h3 id="sheettitle">Job details: ${esc(site)}</h3>
    <div class="flabel">Who can see this site?</div>${visPicker(m, site)}
    <div class="who">Then choose who sees each part below. "Same as the site" follows the choice above.</div>
    ${c ? `<div class="actions"><button type="button" class="pillbtn" id="sj-fill">Fill in from ${esc(c.name)}'s record</button></div>` : ""}
    ${SJ_GROUPS.map(
      ([
        g,
        l,
        fs,
      ]) => `<fieldset class="sjgrp"><legend>${l}</legend>${gpick(g)}${fs.map((k) => field(SJ_FIELDS.find((f) => f[0] === k))).join("")}
      ${g === "front" ? (c && c.frontPhoto ? `<img class="ssph" src="${blobUrl(c.frontPhoto)}" alt="Front of the property">` : `<div class="who">No front photo on the client record yet. Add one by editing the client.</div>`) : ""}
      ${g === "photos" ? (media.length ? `<div class="phgrid sjph">${media.map((x) => `<span class="ph"><img src="${blobUrl(x.id)}" alt="" loading="lazy"></span>`).join("")}</div><div class="who">These come from ${esc(c.name)}'s client record. Add more there.</div>` : `<div class="who">${c ? "No photos or sketches on the client record yet." : "Link a client to share their photos and sketches."}</div>`) : ""}</fieldset>`,
    ).join("")}
    <div class="who">Don't put prices or anything private here.</div>
    ${formFoot(false, "Save job details")}`,
    async () => {
      const d = {};
      SJ_FIELDS.forEach(([k]) => {
        d[k] = $("sj-" + k).value.trim();
      });
      const sv = readVisPicker();
      const np = {};
      SJ_GROUPS.forEach(([g]) => {
        const v = readVisPicker("gp-" + g);
        if (v.vis !== "site") np[g] = v;
      });
      document.querySelectorAll(".gp-sel").forEach((sel) => {
        const g = sel.dataset.g;
        const v = sel.value;
        if (v === "site") return;
        const o = { vis: v };
        if (v === "some") {
          const picked = [
            ...document.querySelectorAll(`.gp-ppl[data-g="${g}"] [aria-pressed="true"]`),
          ].map((b) => b.dataset.v);
          o.people = picked.filter((x) => x !== "__client");
          o.toClient = picked.includes("__client");
        }
        np[g] = o;
      });
      $("f-save").disabled = true;
      try {
        const r = await saveSiteJob(site, Object.assign({ job: d, perms: np }, sv));
        closeForm();
        toast(sjSentMsg(r));
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "sj-work",
  );
  wireVisPicker();
  SJ_GROUPS.forEach(([g]) => wireVisPicker("gp-" + g));
  document.querySelectorAll(".gp-sel").forEach(
    (sel) =>
      (sel.onchange = () => {
        document.querySelector(`.gp-ppl[data-g="${sel.dataset.g}"]`).hidden = sel.value !== "some";
      }),
  );
  document
    .querySelectorAll(".gp-ppl button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
    );
  if ($("sj-fill"))
    $("sj-fill").onclick = () => {
      const set = (k, v) => {
        if (v && !$("sj-" + k).value.trim()) $("sj-" + k).value = v;
      };
      set("work", c.work);
      set("scope", c.desc);
      set("contactName", c.name);
      set("contactPhone", c.phone);
      set("otherContacts", clOtherText(c));
      toast("Filled in the empty boxes from " + c.name);
    };
}
/* the one photo that stands for a site: the front of the property. It only changes when you change it */
const siteFront = (site) => {
  const sr = siteRec(site) || {};
  const c = siteClient(site);
  return sr.frontPhoto || (c && c.frontPhoto) || "";
};
function siteFrontPick(site) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    if (!S.assets) {
      toast(uploadErr({ code: "not_granted" }));
      return;
    }
    toast("Saving the front photo…");
    try {
      const b = await shrinkImage(f, 2000);
      const a = await uploadFile(b, "front.jpg");
      const sr = await ensureSiteRec(site);
      await S.db.doc("sites/" + sr.id).update({ frontPhoto: a.id });
      sr.frontPhoto = a.id;
      const c = siteClient(site);
      if (c && !c.frontPhoto) {
        try {
          await saveClient(Object.assign({}, c, { frontPhoto: a.id }));
        } catch (e) {}
      }
      try {
        syncSiteJobs();
      } catch (e) {}
      toast("Front photo saved");
      render();
    } catch (e) {
      toast(uploadErr(e));
    }
  };
  inp.click();
}
/* a job's own name (James, Nov 2026: "a job name that I can add that then comes up as the job for everyone to see",
   as one person can have several jobs): sites/{id}.jobName; shown as the job's title with the address under it */
const jobNameOf = (site) => String((siteRec(site) || {}).jobName || "").trim();
const siteLabel = (site) => jobNameOf(site) || site;
function siteSumHtml(site, compact, inner) {
  const sr = siteRec(site) || {};
  const jn = jobNameOf(site);
  const c = siteClient(site);
  const work = (c && c.work) || sr.project || "";
  const tel = c ? String(c.phone || "").replace(/\s+/g, "") : "";
  if (compact)
    return `<div class="sscompact">${jn ? `<b class="ssjname">🔨 ${esc(jn)}</b> · ` : ""}<b>📍 ${esc(site)}</b>${work ? ` · ${esc(work)}` : ""}${c ? ` · 👤 ${esc(c.name)}${tel ? ` <a href="tel:${esc(tel)}" class="sstel">📞 ${esc(c.phone)}</a>` : ""}${c.email ? ` <a href="mailto:${esc(c.email)}" class="sstel">✉ ${esc(c.email)}</a>` : ""}` : ""}</div>`;
  const row = (l, v) =>
    v ? `<div class="drow"><span>${esc(l)}</span><span>${v}</span></div>` : "";
  return `<div class="sitesum">
    <div class="sshead">${siteFront(site) ? `<button type="button" class="ssphb" id="ss-front" title="Change the front photo"><img class="ssph" src="${blobUrl(siteFront(site))}" alt="Front of the property"><span>📷 Change</span></button>` : `<button type="button" class="ssphb ssphadd" id="ss-front">🏠<span>Add front photo</span></button>`}<div style="flex:1">${jn ? `<div class="ssjname">🔨 ${esc(jn)}</div>` : ""}<div class="who">Job address</div><button type="button" class="maplink ssaddr" data-addr="${esc((c && clAddr(c)) || site)}">📍 ${esc((c && clAddr(c)) || site)}</button>${work ? `<div class="sswork">${esc(work)}</div>` : ""}</div>
      <button type="button" class="pillbtn" id="ss-edit">✎ Edit</button></div>
    <div class="actions"><a class="btn primary" href="${esc(gmapDir(sr.lat != null ? sr.lat + "," + sr.lon : site))}" target="_blank" rel="noopener">🚗 Directions</a><button type="button" class="btn maplink" data-addr="${esc(site)}">📍 Maps &amp; share</button><button type="button" class="btn hv" id="pj-pin">Drop a pin</button></div>
    ${c ? `<button type="button" class="btn sjbig sscltab" id="ss-cltab">👤 Client details: <b>${esc(c.name)}</b> ›</button>` : ""}<button type="button" class="btn sjbig" id="ss-perm">👁 Who sees what on this site ›</button>
    <div class="sscl">${
      c
        ? `${clMainHtml(c)}${clContactsHtml(c)}<div class="details" style="margin-top:8px">${[row("Type of work", esc(c.work || "")), row("Estimate", c.quote ? gbp(+c.quote) : ""), row("What they want", c.desc ? esc(c.desc.length > 160 ? c.desc.slice(0, 160) + "…" : c.desc) : "")].join("")}</div>
      <div class="actions" style="margin-top:6px">${tel ? `<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a><a class="btn" href="sms:${esc(tel)}">💬 Text</a>` : ""}${c.email ? `<a class="btn" href="mailto:${esc(c.email)}">✉ Email</a>` : ""}<button type="button" class="btn" id="ss-client">👤 Open client page ›</button></div>`
        : `<div class="who"><b>No client linked to this job yet.</b></div><div class="actions"><button type="button" class="btn primary" id="ss-link">Link a client</button></div>`
    }</div>${inner || ""}</div>`;
}
function wireSiteSum(site) {
  const c = siteClient(site);
  if ($("ss-client")) $("ss-client").onclick = () => viewClient(c);
  if ($("ss-cltab")) $("ss-cltab").onclick = () => viewClient(c);
  const edit = () => {
    const sr = siteRec(site) || {};
    const cl = siteClient(site);
    openSheet(
      `<h3 id="sheettitle">Job details</h3><div class="who">${esc(site)}</div>
      <label for="ss-jname">Job name (everyone sees this as the job)<input id="ss-jname" maxlength="60" value="${esc(sr.jobName || "")}" placeholder="e.g. Jones kitchen extension"></label>
      <label for="ss-work">Type of work<input id="ss-work" maxlength="80" list="ss-wl" value="${esc((cl && cl.work) || sr.project || "")}" placeholder="e.g. Single-storey extension"><datalist id="ss-wl">${CL_WORK.map((w) => `<option value="${esc(w)}">`).join("")}</datalist></label>
      <label for="ss-cl">Client<select id="ss-cl"><option value="">No client</option>${clList()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map(
          (x) =>
            `<option value="${esc(x.id)}" ${cl && cl.id === x.id ? "selected" : ""}>${esc(x.name)}${x.postcode ? " · " + esc(x.postcode) : ""}</option>`,
        )
        .join("")}</select></label>
      <button type="button" class="linkbtn" id="ss-newcl" style="align-self:flex-start">+ Add a new client for this job</button>
      ${formFoot(false, "Save")}`,
      async () => {
        const w = $("ss-work").value.trim(),
          cid = $("ss-cl").value;
        try {
          if (sr.id)
            await S.db
              .doc("sites/" + sr.id)
              .update({ project: w, jobName: $("ss-jname").value.trim().replace(/\s+/g, " ") });
          if (cl && cl.id !== cid) {
            const r = Object.assign({}, cl);
            if (same(r.site, site)) r.site = "";
            r.sites = (r.sites || []).filter((x) => !same(x, site));
            await saveClient(r);
          }
          if (cid) {
            const n = (S.clients || []).find((x) => x.id === cid);
            if (n) {
              const r = Object.assign({}, n, { work: w || n.work });
              if (!r.site) r.site = site;
              else if (!same(r.site, site)) r.sites = [...new Set((r.sites || []).concat([site]))];
              await saveClient(r);
            }
          }
          closeForm();
          toast("Saved");
          render();
        } catch (e) {
          showErr("Couldn't save");
        }
      },
    );
    $("ss-newcl").onclick = () => {
      closeForm();
      openClientForm({
        stage: "won",
        site,
        address: site,
        work: (cl && cl.work) || sr.project || "",
        notes: [],
      });
    };
  };
  if ($("ss-perm")) $("ss-perm").onclick = () => editSiteJob(site);
  if ($("ss-edit")) $("ss-edit").onclick = edit;
  if ($("ss-link")) $("ss-link").onclick = edit;
  if ($("ss-front")) $("ss-front").onclick = () => siteFrontPick(site);
}
