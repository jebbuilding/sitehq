/* ================= JOBS DESK: Jobs & clients as in the layout picture – the jobs down the side, the chosen job beside ================= */
import { openClientChat } from "../chat/chat.js";
import { clShowBook, clShowToSee } from "../clients/address-book.js";
import { mjHas } from "../clients/more-jobs.js";
import { ptOf } from "../clients/portal.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { $, addDays, esc, gbp, iso, shortDay } from "../core/helpers.js";
import { S, isArchivedSite } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl } from "../files/files.js";
import { allTeam, nameOf, teamIds } from "./owner.js";
import { nlGo, nlOpenTab, nlSectionView } from "./today.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { siteRec } from "../photos/photos.js";
import { jcData } from "../sales/job-costs.js";
import { sdR2 } from "../sales/sales-calc.js";
import { empTypeOf, jobNameOf, siteLabel } from "../sites/job-details.js";
import { projectSites, same } from "../sites/project-pages.js";
import { onSiteNow } from "../sites/roll-call.js";
import { stgEdit, stgSign } from "../sites/stage-signoff.js";
import { siteClient } from "../sites/summary.js";
export { jbView };
/* Tabs: Jobs, Clients, Enquiries, Planner, More (everything else in the section). Jobs: the live jobs on the left
   (stage and who's on site), the chosen one on the right – its client and dates, Message client, Sign-off to the
   client, the stages (tap one to move the job on; ✎ to change the list), Money on this job (only James: spent so
   far against the price, materials / labour / subbies), the latest photos, who's on it, and its paperwork (RAMS,
   plans and drawings, day work this week), with Open the full site page. On a phone the list sits above the job.
   A job's stages are kept on its site record: sites/<id> { stages: [...], stage: n }. */
const JB_STAGES = ["Groundworks", "Shell", "First fix", "Plastering", "Second fix", "Finishing"];
const jbStagesOf = (sr) =>
  sr && Array.isArray(sr.stages) && sr.stages.length ? sr.stages : JB_STAGES;
function jbView() {
  const t = S.f.jbt || "jobs";
  const enq = (S.clients || []).filter((c) => mjHas(c, "enquiry")).length;
  const tabs = [
    ["jobs", "Jobs"],
    ["clients", "Clients"],
    ["enq", "Enquiries" + (enq ? " " + enq : "")],
    ["book", "📒 Address book"],
    ["planner", "Planner"],
    ["more", "More"],
  ];
  const seg = `<div class="jb-tabs" role="tablist" aria-label="Show">${tabs.map(([k, l]) => `<button type="button" role="tab" data-v="${k}" aria-selected="${t === k}">${esc(l)}</button>`).join("")}</div>`;
  if (t === "more") {
    nlSectionView("jobs", seg);
    jbWireTabs();
    return;
  }
  const live = projectSites().filter((n) => !isArchivedSite(n));
  const on = onSiteNow();
  const today = iso(new Date());
  const list = live
    .map((n) => {
      const sr = siteRec(n) || {};
      const st = jbStagesOf(sr);
      const k = on.filter((r) => same(r.job, n)).length;
      const j = sr.job || {};
      const sub =
        sr.stage != null && st[sr.stage]
          ? st[sr.stage]
          : j.start && j.start > today
            ? "Starts " + shortDay(j.start)
            : (siteClient(n) || {}).name || "";
      return { n, k, sub: [sub, k ? k + " on site" : ""].filter(Boolean).join(" · ") };
    })
    .sort((a, b) => b.k - a.k || a.n.localeCompare(b.n));
  const sel = list.find((x) => x.n === S.f.jbSel) ? S.f.jbSel : list.length ? list[0].n : "";
  $("main").innerHTML = `<div class="jb-page">${seg}
    ${
      list.length
        ? `<div class="jb-two"><section class="jb-list" aria-label="Jobs">${list
            .map(
              (x) =>
                `<button type="button" class="jb-item" data-s="${esc(x.n)}"${x.n === sel ? ' aria-current="true"' : ""}><b>${esc(siteLabel(x.n))}</b><small>${esc([jobNameOf(x.n) ? x.n : "", x.sub].filter(Boolean).join(" · "))}</small></button>`,
            )
            .join("")}</section>${jbJobHtml(sel)}</div>`
        : `<div class="empty"><strong>No live jobs</strong>Add a site in Setup, or make an enquiry into a site.</div>`
    }</div>`;
  jbWireTabs();
  document.querySelectorAll("#main .jb-item").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.jbSel = b.dataset.s;
        render();
        const d = document.querySelector("#main .jb-job");
        if (d && d.getBoundingClientRect().top > window.innerHeight * 0.6)
          d.scrollIntoView({ block: "start" });
      }),
  );
  if (sel) jbWireJob(sel);
}
function jbWireTabs() {
  document.querySelectorAll("#main .jb-tabs button").forEach(
    (b) =>
      (b.onclick = () => {
        const v = b.dataset.v;
        /* the address book has its own tab (James, Nov 2026): the Clients page on its 📒 Address book list */
        if (v === "book") {
          clShowBook(true);
          return nlGo("clients");
        }
        if (v === "clients") {
          clShowBook(false);
          return nlOpenTab("clients");
        }
        if (v === "planner") return nlOpenTab("planner");
        if (v === "enq") {
          clShowToSee();
          return nlOpenTab("clients");
        }
        S.f.jbt = v;
        render();
      }),
  );
}
/* the chosen job */
function jbJobHtml(n) {
  const sr = siteRec(n) || {};
  const j = sr.job || {};
  const c = siteClient(n);
  const st = jbStagesOf(sr);
  const cur = sr.stage != null ? +sr.stage : -1;
  const d = jcData(n);
  const pct = d.price ? Math.min(100, Math.round((d.cost / d.price) * 100)) : 0;
  const sum = (k) => sdR2(d.items.filter((i) => i.kind === k).reduce((a, i) => a + i.cost, 0));
  const photos = allTeam("photos")
    .filter((p) => same(p.site, n) && p.assetId && !/^video/.test(p.contentType || ""))
    .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0))
    .slice(0, 6);
  const m0 = iso(addDays(new Date(), -30));
  const ents = allTeam("entries").filter((e) => same(e.job, n));
  const people = [...new Set(ents.filter((e) => e.date >= m0).map((e) => e.who))];
  const docs = (S.docs || []).filter((x) => same(x.site, n));
  const rams = docs.filter((x) => x.cat === "rams");
  const ramsMissing = rams.reduce(
    (a, x) =>
      a +
      teamIds().filter((id) => !(S.data.signoffs[id] || []).some((y) => y.docId === x.id)).length,
    0,
  );
  const plans = docs.filter((x) => (x.cat || "other") === "plans").length;
  const wk0 = iso(addDays(new Date(), -6));
  const dw = ents.filter((e) => e.type === "job" && e.kind === "extra" && e.date >= wk0).length;
  const dates = [
    c ? c.name : "",
    j.start ? (j.start > iso(new Date()) ? "starts " : "started ") + shortDay(j.start) : "",
    j.finish ? "due to finish " + shortDay(j.finish) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<section class="jb-job" aria-label="${esc(n)}">
    <div class="jb-card"><div class="jb-head"><div><h2>${esc(n)}</h2><span class="who">${esc(dates || "No client or dates yet")}</span></div>
      <div class="jb-acts">${c ? `<button type="button" class="btn" id="jb-msg">Message client</button><button type="button" class="btn primary" id="jb-sign">Sign-off to client</button>` : ""}<button type="button" class="btn" id="jb-open">Open the site page</button></div></div>
      <div class="jb-stages" role="group" aria-label="Stages – tap one to sign it off">${st
        .map(
          (s, i) =>
            `<button type="button" class="jb-st${i <= cur ? " done" : ""}${i === cur ? " now" : ""}" data-i="${i}" aria-pressed="${i === cur}"><span></span>${esc(s)}</button>`,
        )
        .join(
          "",
        )}<button type="button" class="iconbtn jb-sted" id="jb-sted" aria-label="Change the stages">✎</button></div>
    </div>
    <div class="jb-card"><div class="jb-h3"><h3>Money on this job</h3><span class="nl-only">🔒 Only you can see this</span></div>
      <div class="jb-money"><b>${gbp(d.cost)}</b><span class="who">spent of ${d.price ? gbp(d.price) + (d.cp ? " to charge (cost plus)" : " quoted") : "– no accepted estimate yet"}</span></div>
      ${d.price ? `<div class="jb-bar" role="img" aria-label="${pct}% of the price spent"><span style="width:${pct}%"${pct > 90 ? ' class="bad"' : ""}></span></div>` : ""}
      <div class="jb-split"><span>Materials and hire <b>${gbp(sum("mat"))}</b></span><span>Labour <b>${gbp(sum("lab"))}</b></span><span>Subcontractors <b>${gbp(sum("sub"))}</b></span><span>Invoiced <b>${gbp(d.invoiced)}</b></span></div>
      <button type="button" class="btn" id="jb-costs">💷 Job costs</button>
    </div>
    <div class="jb-three">
      <div class="jb-card"><h3>Latest photos</h3>${photos.length ? `<div class="jb-ph">${photos.map((p) => `<img src="${esc(blobUrl(p.assetId))}" alt="${esc(p.caption || "Site photo")}" loading="lazy">`).join("")}</div>` : '<div class="who">No photos yet.</div>'}<button type="button" class="linkbtn" id="jb-photos">All photos ›</button></div>
      <div class="jb-card"><h3>On this job</h3>${people.length ? people.map((w) => `<div>${esc(nameOf(w))} <span class="who">${esc(((S.team[w] || {}).details || {}).trade || EMP_TYPES[empTypeOf(w)] || "")}</span></div>`).join("") : '<div class="who">Nobody in the last 30 days.</div>'}</div>
      <div class="jb-card"><h3>Paperwork</h3>
        <div>RAMS <span class="${rams.length && !ramsMissing ? "jb-ok" : "who"}">· ${rams.length ? (ramsMissing ? ramsMissing + " signatures missing" : "signed") : "none yet"}</span></div>
        <div>Plans and drawings <span class="who">· ${plans}</span></div>
        <div>Day work sheets <span class="who">· ${dw} this week</span></div>
      </div>
    </div>
  </section>`;
}
function jbWireJob(n) {
  const sr = siteRec(n) || {};
  const c = siteClient(n);
  const openSite = (tab) => {
    S.f.proj = n;
    S.f.projList = false;
    S.f.pjtab = tab || "overview";
    nlGo("projects");
  };
  $("jb-open").onclick = () => openSite();
  $("jb-photos").onclick = () => openSite("photos");
  $("jb-costs").onclick = () => {
    S.f.act = "jobs";
    S.f.jcs = n;
    nlGo("accounts");
  };
  if ($("jb-msg")) $("jb-msg").onclick = () => (ptOf(c) ? openClientChat(c) : viewClient(c));
  if ($("jb-sign")) $("jb-sign").onclick = () => viewClient(c);
  /* stages are signed off, with a record kept (sites/stage-signoff.js) */
  document
    .querySelectorAll("#main .jb-st")
    .forEach((b) => (b.onclick = () => stgSign(n, +b.dataset.i)));
  $("jb-sted").onclick = () => stgEdit(n);
}
