/* ================= OWNER: SITE PROJECT PAGES ================= */
import { chatTitle, ensureSiteChat, openChat, siteMessages } from "../chat/chat.js";
import { $, addDays, esc, gbp, hrs, iso, monday, shortDay, stamp, toast } from "../core/helpers.js";
import { S, isArchivedSite, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, csvSave } from "../files/files.js";
import { deleteSiteFlow } from "../owner/delete-client-site.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import {
  openAddFolder,
  openEditFolders,
  photoTile,
  photoViewer,
  siteFolders,
  siteRec,
} from "../photos/photos.js";
import { keyDatesFor, keyTimeline, openKeyDates, openPlanEditor } from "../planner/board.js";
import { pgHtml, pgRec, pgWire } from "../planner/programme.js";
import { planEntries } from "../planner/time-off.js";
import { invCard, wireInvoices } from "../purchasing/invoices.js";
import { isInv, matCard, openMat, rcRow, wireReceipts } from "../purchasing/materials-receipts.js";
import { ramsMaker } from "../safety/rams-maker.js";
import { indFor, indSectionWithId, wireInduction } from "../safety/site-inductions.js";
import { dcmOpen } from "./drawing-compare.js";
import {
  editSiteJob,
  editSiteVis,
  siteJobCard,
  siteSumHtml,
  syncSiteJobs,
  wireSiteSum,
} from "./job-details.js";
import { jkOpen } from "./job-pack.js";
import { jobCard } from "./job-sheets.js";
import { dropPin } from "./maps-pins.js";
import { RAMS_SIGN, docPath, docRow, wireDocs } from "./plans-specs.js";
import { QRSITE } from "./qr-sign-in.js";
import { sdiHtml, sdiWire } from "./site-diary.js";
import { sqMap, sqOpen } from "./snag-quick.js";
import { arcWhy, siteArchive, siteRestore, storageHtml, wireStorage } from "./storage.js";
import { siteTiles } from "./tiles.js";
import { folderIcon, openDoc } from "./trade-sites.js";
import { openJob } from "../survey/door-window-survey.js";
import { sumH } from "../timesheets/time.js";
export { ownerProjects, projectSites, same };
function projectSites() {
  const set = new Set(siteNames());
  ["entries", "photos", "invoices"].forEach((c) =>
    allTeam(c).forEach((x) => {
      const n = c === "entries" ? x.job : x.site;
      if (n) set.add(n);
    }),
  );
  S.docs.forEach((d) => {
    if (d.site && d.site !== "General") set.add(d.site);
  });
  [...set].forEach((n) => {
    if (isArchivedSite(n) && !same(n, S.f.proj)) set.delete(n);
  });
  if (S.f.proj && isArchivedSite(S.f.proj)) set.add(S.f.proj);
  const gone = (S.settings || {}).deletedSites || [];
  [...set].forEach((n) => {
    if (gone.some((g) => same(g, n)) && !siteRec(n)) set.delete(n);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}
function inRange(date) {
  const r = S.f.range;
  if (r === "all") return true;
  const now = new Date();
  if (r === "month") return date.slice(0, 7) === iso(now).slice(0, 7);
  const m = iso(monday(now)),
    e = iso(addDays(monday(now), 6));
  return date >= m && date <= e;
}
const same = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
function ownerProjects() {
  const sites = projectSites();
  if (!sites.length) {
    $("main").innerHTML =
      `<div class="empty"><strong>No sites yet</strong>Add your job sites in Setup. Each site gets its own page here with hours, extra work, photos, plans and RAMS.</div>` +
      storageHtml();
    wireStorage();
    return;
  }
  if (S.f.projList !== false || !sites.includes(S.f.proj)) {
    siteTiles(sites);
    return;
  }
  const site = S.f.proj;
  const ents = allTeam("entries").filter((e) => same(e.job, site) && inRange(e.date));
  const ts = ents.filter((e) => e.type === "hours"),
    jobs = ents.filter((e) => e.type === "job");
  const extra = jobs.filter((e) => e.kind === "extra"),
    tracked = jobs.filter((e) => e.kind !== "extra");
  const photos = allTeam("photos")
    .filter((p) => same(p.site, site) && inRange(p.date))
    .sort((a, b) => b.takenAt - a.takenAt);
  const docs = S.docs.filter((d) => same(d.site, site));
  const invs = allTeam("invoices").filter((v) => isInv(v) && same(v.site, site));
  const rcs = allTeam("invoices").filter(
      (v) => v.kind === "receipt" && same(v.site, site) && inRange(v.date || ""),
    ),
    mats = allTeam("invoices").filter((v) => v.kind === "materials" && same(v.site, site));
  const people = [...new Set(ents.map((e) => e.who))];
  if (S.f.pjSite !== site) {
    S.f.pjSite = site;
    S.f.pjtab = "overview";
  }
  const showAll = S.open.has("__allph");
  const byDate = (a, b) => b.date.localeCompare(a.date);
  const taskTable = (
    list,
    showNotes,
  ) => `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Who</th><th>What they did</th><th class="num">Hours</th></tr></thead><tbody>
    ${list
      .sort(byDate)
      .map(
        (e) =>
          `<tr><td style="white-space:nowrap">${shortDay(e.date)}</td><td style="white-space:nowrap">${esc(nameOf(e.who))}</td><td class="job">${esc(e.task)}${showNotes && e.notes ? `<div class="who">${esc(e.notes)}</div>` : ""}</td><td class="num">${hrs(e.hours)} h</td></tr>`,
      )
      .join("")}
    </tbody><tfoot><tr><td colspan="3"><b>Total</b></td><td class="num"><b>${hrs(sumH(list, () => true))} h</b></td></tr></tfoot></table></div>`;
  let html = `<div class="filters">
    <div><div class="flabel">Period</div><div class="seg" id="pj-range">${[
      ["all", "All time"],
      ["month", "This month"],
      ["week", "This week"],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${S.f.range === k}">${l}</button>`,
      )
      .join("")}</div></div></div>
    </div>`;
  const P = {};
  P.hours = `<div class="totals"><div class="tot"><div class="n">${hrs(sumH(ts, () => true))}</div><div class="l">Timesheet hours</div></div>
    <div class="tot hi"><div class="n">${hrs(sumH(extra, () => true))}</div><div class="l">Extra work hours</div></div>
    <div class="tot"><div class="n">${hrs(sumH(tracked, () => true))}</div><div class="l">Tracked task hours</div></div>
    <div class="tot"><div class="n">${photos.length}</div><div class="l">Photos</div></div></div>
    <div class="actions"><button class="btn primary" id="pj-dl" type="button">Download site report (CSV)</button></div>`;
  P.hours += `<div class="day"><div class="dayh"><span>Who worked here</span><span class="sum">${people.length}</span></div>${
    people.length
      ? `<div class="card"><div class="tablewrap"><table><thead><tr><th>Employee</th><th class="num">Days</th><th class="num">Timesheet</th><th class="num">Extra</th><th class="num">Tracked</th></tr></thead><tbody>
    ${people
      .map((id) => {
        const m = ents.filter((e) => e.who === id);
        return `<tr><td>${esc(nameOf(id))}</td><td class="num">${new Set(m.filter((e) => e.type === "hours").map((e) => e.date)).size}</td><td class="num">${hrs(sumH(m, (e) => e.type === "hours"))} h</td><td class="num">${hrs(sumH(m, (e) => e.type === "job" && e.kind === "extra"))} h</td><td class="num">${hrs(sumH(m, (e) => e.type === "job" && e.kind !== "extra"))} h</td></tr>`;
      })
      .join("")}
    </tbody></table></div></div>`
      : '<div class="nothing">No hours logged on this site in this period.</div>'
  }</div>`;
  P.hours += `<div class="day"><div class="dayh"><span>Extra work</span><span class="sum">${hrs(sumH(extra, () => true))} h</span></div>${extra.length ? `<div class="card">${taskTable(extra, true)}</div>` : '<div class="nothing">No extra work logged.</div>'}</div>`;
  P.hours += `<div class="day"><div class="dayh"><span>How long tasks took</span><span class="sum">${hrs(sumH(tracked, () => true))} h</span></div>${tracked.length ? `<div class="card">${taskTable(tracked, true)}</div>` : '<div class="nothing">No task times logged.</div>'}</div>`;
  {
    if (S.f.pfoldSite !== site) {
      S.f.pfold = "";
      S.f.pfoldSite = site;
    }
    const fl = siteFolders(site);
    const cnt = (f) =>
      photos.filter((p) => (f === "Other photos" ? !fl.includes(p.category) : p.category === f));
    const tiles = fl.concat(cnt("Other photos").length ? ["Other photos"] : []);
    const pf = S.f.pfold;
    P.photos = `<div class="day"><div class="dayh"><span>Photos by stage</span><span class="sum">${photos.length}</span></div>
    <div class="actions"><button type="button" class="pillbtn" id="pj-addfold">+ Add folder</button><button type="button" class="pillbtn" id="pj-editfold">Edit folders</button></div>
    ${
      pf
        ? (() => {
            const ps = cnt(pf);
            return `<div class="crumbs"><button type="button" class="pillbtn" id="pj-foldback">‹ All stages</button><b>${esc(pf)}</b><span class="who">${ps.length} photo${ps.length === 1 ? "" : "s"}</span></div>${ps.length ? `<div class="phgrid">${(showAll ? ps : ps.slice(0, 24)).map((p) => photoTile(p, true, p.who)).join("")}</div>${ps.length > 24 ? `<button type="button" class="pillbtn" id="pj-allph">${showAll ? "Show fewer" : "Show all " + ps.length + " photos"}</button>` : ""}` : '<div class="nothing">No photos in this folder for this period.</div>'}`;
          })()
        : `<div class="folders">${tiles
            .map((f) => {
              const ps = cnt(f);
              return `<button type="button" class="folder pfold ${ps.length ? "" : "emptyf"}" data-f="${esc(f)}">${ps.length ? `<img src="${blobUrl(ps[0].assetId)}" alt="" class="fthumb" loading="lazy">` : folderIcon()}<span class="fname">${esc(f)}</span><span class="fmeta">${ps.length} photo${ps.length === 1 ? "" : "s"}</span></button>`;
            })
            .join("")}</div>`
    }</div>`;
  }
  P.chat = `<div class="day"><div class="dayh"><span>Chat messages about this site</span></div><div class="actions"><button type="button" class="btn primary" id="pj-chat">Open the site chat</button></div><div id="pj-msgs"><button type="button" class="pillbtn" id="pj-loadmsgs">Show messages tagged with this site</button></div></div>`;
  const kd = keyDatesFor(site, "");
  {
    P.dates = `<div class="day"><div class="dayh"><span>Key dates</span><button type="button" class="pillbtn" id="pj-kd" style="padding:4px 10px;font-size:12.5px">+ Add key dates</button></div>${kd.length ? keyTimeline(kd, true) : '<div class="nothing">No key dates for this site yet.</div>'}</div>`;
  }
  const sj = S.jobs.filter((j) => same(j.site, site));
  P.jobs = `<div class="actions"><button type="button" class="btn primary" id="sq-new2">📸 Snag</button><button type="button" class="btn" id="sq-map">🗺 Snags on drawings</button></div><div class="day"><div class="dayh"><span>Job sheets and snag lists</span><span class="sum">${sj.length}</span></div>${sj.length ? sj.map((j) => jobCard(j, true)).join("") : '<div class="nothing">None for this site yet. Create one in the Jobs tab.</div>'}</div>`;
  P.induction = `<div class="day"><div class="dayh"><span>Site induction</span></div>${indSectionWithId(site, true)}</div>`;
  const dSec = (k, title, up, empty, list) => {
    const groups = {};
    list.forEach((d) => {
      const p = docPath(d) || "";
      (groups[p] = groups[p] || []).push(d);
    });
    return `<div class="actions"><button type="button" class="btn primary pj-up" data-c="${k}">${up}</button></div>${
      list.length
        ? Object.keys(groups)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map(
              (p) =>
                `<div class="day"><div class="dayh"><span>${esc(p || title)}</span><span class="sum">${groups[p].length}</span></div>${groups[
                  p
                ]
                  .sort((a, b) =>
                    (a.title || "").localeCompare(b.title || "", undefined, { numeric: true }),
                  )
                  .map((d) => docRow(d, true))
                  .join("")}</div>`,
            )
            .join("")
        : `<div class="nothing">${empty}</div>`
    }`;
  };
  const dPlans = docs.filter((d) => (d.cat || "other") === "plans"),
    dRams = docs.filter((d) => d.cat === "rams"),
    dSpecs = docs.filter((d) => ["specs", "other"].includes(d.cat || "other"));
  const ramsMissing = (() => {
    let m = 0;
    if (!RAMS_SIGN) return 0;
    const ids = teamIds();
    dRams.forEach((d) =>
      ids.forEach((id) => {
        if (!(S.data.signoffs[id] || []).some((x) => x.docId === d.id)) m++;
      }),
    );
    return m;
  })();
  P.plans =
    `<div class="actions"><button type="button" class="btn" id="dcm-open">🔍 Compare two drawings</button></div>` +
    dSec(
      "plans",
      "Plans & drawings",
      "+ Upload plans & drawings",
      "No plans for this site yet. Upload drawings here and the trades can open and measure them.",
      dPlans,
    );
  P.rams =
    `<div class="notice ramsmk"><b>📝 Make RAMS for this site</b><span class="who">Start from your existing RAMS, tick the ones this job needs and fill in the blanks (address, client, dates, first aiders…). They're saved here as Word files.</span><button type="button" class="btn primary" id="mkrams">📝 Make RAMS from my set</button></div>` +
    dSec(
      "rams",
      "RAMS",
      "+ Upload RAMS",
      "No RAMS for this site yet. Trades can read any RAMS you upload here.",
      dRams,
    );
  P.specs = dSec(
    "specs",
    "Specs & other documents",
    "+ Upload specs or documents",
    "No specs or other documents yet.",
    dSpecs,
  );
  P.money = `<div class="day"><div class="dayh"><span>Receipts for this site</span><span class="sum">${gbp(rcs.reduce((a, r) => a + (+r.amount || 0), 0))}</span></div>${
    rcs.length
      ? rcs
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((r) => rcRow(r, true, r.who))
          .join("")
      : '<div class="nothing">No receipts for this site in this period.</div>'
  }</div>`;
  if (mats.length)
    P.money += `<div class="day"><div class="dayh"><span>Materials & tools requested</span><span class="sum">${mats.length}</span></div>${mats
      .sort((a, b) => b.sentAt - a.sentAt)
      .map((m) => matCard(m, true, m.who))
      .join("")}</div>`;
  if (invs.length)
    P.money += `<div class="day"><div class="dayh"><span>Invoices for this site</span><span class="sum">${invs.length}</span></div>${invs
      .sort((a, b) => b.sentAt - a.sentAt)
      .map((v) => invCard(v, true, v.who))
      .join("")}</div>`;
  const ind = indFor(site);
  const today = iso(new Date());
  const nextKd = kd.find((p) => (p.to || p.from) >= today);
  const openJobs = sj.filter((j) => j.status !== "closed").length;
  const T = [
    ["overview", "Overview"],
    ["hours", "Hours", hrs(sumH(ts, () => true)) + " h"],
    ["photos", "Photos", photos.length],
    ["plans", "Plans & drawings", dPlans.length],
    [
      "rams",
      "RAMS",
      dRams.length
        ? dRams.length + (ramsMissing ? ` · ${ramsMissing} to sign` : " · all signed")
        : 0,
    ],
    ["specs", "Specs & docs", dSpecs.length],
    ["induction", "Induction", ind ? "Set up" : "Not set up"],
    ["jobs", "Jobs & snags", openJobs ? openJobs + " open" : sj.length],
    ["dates", "Key dates", kd.length],
    ["programme", "Programme", (pgRec(site) || { stages: [] }).stages.length + " stages"],
    [
      "diary",
      "Site diary",
      (S.siteDiary || []).filter((r) => same(r.site, site)).length + " notes",
    ],
    ["chat", "Chat", ""],
  ];
  const ICON = {
    hours: "⏱️",
    photos: "📷",
    docs: "📐",
    plans: "📐",
    rams: "📝",
    specs: "📄",
    induction: "🦺",
    jobs: "✅",
    dates: "📅",
    chat: "💬",
    diary: "📔",
    programme: "📊",
    money: "🧾",
  };
  P.diary = sdiHtml(site);
  P.programme = pgHtml(site);
  let tab = S.f.pjtab || "overview";
  if (!T.some((t) => t[0] === tab)) tab = "overview";
  const sr0 = siteRec(site) || {};
  P.overview = `${QRSITE.cardHtml(site)}${siteSumHtml(site, false, siteJobCard(site, true, true))}
    <div class="actions"><button type="button" class="btn" id="sq-new">📸 Snag</button><button type="button" class="btn" id="jk-open">📦 Send job details to someone not on the app</button></div>
    <div class="totals"><div class="tot"><div class="n">${hrs(sumH(ts, () => true))}</div><div class="l">Timesheet hours</div></div><div class="tot hi"><div class="n">${hrs(sumH(extra, () => true))}</div><div class="l">Extra work hours</div></div><div class="tot"><div class="n">${people.length}</div><div class="l">People worked here</div></div></div>
    ${nextKd ? `<div class="notice"><b>Next key date:</b> ${esc(nextKd.title)} · ${esc(shortDay(nextKd.from))}</div>` : ""}
    <div class="folders">${T.slice(1)
      .map(
        ([k, l, c]) =>
          `<button type="button" class="folder pjtile" data-t="${k}"><span class="ricon" aria-hidden="true">${ICON[k]}</span><span class="fname">${esc(l)}</span><span class="who">${esc(String(c))}</span></button>`,
      )
      .join("")}</div>
    ${
      photos.length
        ? `<div class="flabel" style="margin-top:8px">Latest photos</div><div class="phgrid">${photos
            .slice(0, 6)
            .map((p) => photoTile(p, true, p.who))
            .join("")}</div>`
        : ""
    }`;
  html +=
    (tab === "overview"
      ? ""
      : siteSumHtml(site, true) +
        `<div class="actions pjback"><button type="button" class="btn" data-t="overview" id="pj-back">‹ Back to overview</button><b class="pjsec">${ICON[tab] || ""} ${esc((T.find((t) => t[0] === tab) || [])[1] || "")}</b></div>`) +
    (P[tab] || "");
  $("main").innerHTML = html;
  $("main")
    .querySelectorAll("#pj-back,.pjtile")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.pjtab = b.dataset.t;
          render();
        }),
    );
  if ($("pj-pin")) $("pj-pin").onclick = () => dropPin({ site: siteRec(site), addr: site });
  if (!S.sjTabSync) {
    S.sjTabSync = true;
    setTimeout(() => {
      S.sjTabSync = false;
    }, 60000);
    syncSiteJobs();
  }
  wireSiteSum(site);
  if ($("mkrams")) $("mkrams").onclick = () => ramsMaker(site);
  if ($("jk-open")) $("jk-open").onclick = () => jkOpen(site);
  if ($("sq-new")) $("sq-new").onclick = () => sqOpen(site);
  if ($("sq-new2")) $("sq-new2").onclick = () => sqOpen(site);
  if ($("sq-map")) $("sq-map").onclick = () => sqMap(site);
  if ($("sj-edit")) $("sj-edit").onclick = () => editSiteJob(site);
  if ($("sj-perm")) $("sj-perm").onclick = () => editSiteVis(site);
  if ($("pj-site"))
    $("pj-site").onchange = (e) => {
      S.f.proj = e.target.value;
      e.target.blur();
      render();
    };
  $("main").insertAdjacentHTML(
    "afterbegin",
    `<button type="button" class="btn backbtn" id="pj-all" style="margin-bottom:10px">‹ All sites</button>`,
  );
  $("pj-all").onclick = () => {
    S.f.projList = true;
    render();
    window.scrollTo(0, 0);
  };
  {
    const sh = storageHtml(site);
    if (sh) {
      $("main").insertAdjacentHTML("beforeend", sh);
      wireStorage();
    }
    if (isArchivedSite(site)) {
      $("main").insertAdjacentHTML(
        "afterbegin",
        `<div class="notice warn arcbar"><span>🗄 <b>${esc(site)}</b> is in storage (the job is ${esc(arcWhy(site))}). Trades can't see it and it's left out of site lists.</span><button type="button" class="btn" id="arc-restore">↩ Take out of storage</button></div>`,
      );
      $("arc-restore").onclick = () => siteRestore(site);
    } else if (siteRec(site)) {
      $("main").insertAdjacentHTML(
        "beforeend",
        `<div class="actions" style="margin-top:14px"><button type="button" class="btn" id="arc-put">🗄 Move ${esc(site)} to storage</button></div>`,
      );
      {
        $("arc-put").onclick = () => {
          const d = document.createElement("div");
          d.className = "dimask";
          d.style.zIndex = "125";
          d.innerHTML = `<div class="dimbox" role="alertdialog" aria-label="Move to storage"><b>🗄 Move ${esc(site)} to storage?</b><div class="who">It will disappear from your Sites list. Nothing is deleted: documents, drawings and photos are kept, and you can bring it back from Sites › Storage.</div><div class="dimbtns"><button type="button" class="btn primary arc-no">Keep it in Sites</button><button type="button" class="btn delbtn arc-yes">Move to storage</button></div></div>`;
          document.body.appendChild(d);
          d.querySelector(".arc-no").onclick = () => d.remove();
          d.onclick = (e) => {
            if (e.target === d) d.remove();
          };
          d.querySelector(".arc-yes").onclick = () => {
            d.remove();
            siteArchive(site, true);
          };
        };
      }
    }
    {
      $("main").insertAdjacentHTML(
        "beforeend",
        `<div class="actions" style="margin-top:8px;justify-content:flex-end"><button type="button" class="btn delbtn" id="site-del">🗑 Delete ${esc(site)}</button></div>`,
      );
      $("site-del").onclick = () => deleteSiteFlow(site);
    }
  }
  $("pj-range")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.range = b.dataset.v;
          render();
        }),
    );
  if ($("pj-addfold")) $("pj-addfold").onclick = () => openAddFolder(site);
  if ($("pj-editfold")) $("pj-editfold").onclick = () => openEditFolders(site);
  if ($("pj-foldback"))
    $("pj-foldback").onclick = () => {
      S.f.pfold = "";
      render();
    };
  $("main")
    .querySelectorAll(".pfold")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.pfold = b.dataset.f;
          S.open.delete("__allph");
          render();
        }),
    );
  if ($("pj-allph"))
    $("pj-allph").onclick = () => {
      showAll ? S.open.delete("__allph") : S.open.add("__allph");
      render();
    };
  $("main")
    .querySelectorAll(".ph")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = photos.find((x) => x.id === b.dataset.p && x.who === b.dataset.w);
          if (p) photoViewer(p, true, p.who);
        }),
    );
  wireDocs(true);
  wireInvoices(invs, true);
  if (tab === "diary") sdiWire(site);
  if (tab === "programme") pgWire(site);
  if ($("dcm-open")) $("dcm-open").onclick = () => dcmOpen(site);
  wireInduction();
  wireReceipts(rcs, true);
  $("main")
    .querySelectorAll(".pj-up")
    .forEach(
      (b) => (b.onclick = () => openDoc(site, "", b.dataset.c === "specs" ? "specs" : b.dataset.c)),
    );
  $("main")
    .querySelectorAll(".matc")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const m = mats.find((x) => x.id === b.dataset.m && x.who === b.dataset.w);
          if (m) openMat(m);
        }),
    );
  $("main")
    .querySelectorAll(".jobc")
    .forEach((b) => (b.onclick = () => openJob(b.dataset.j)));
  if ($("pj-kd")) $("pj-kd").onclick = () => openKeyDates(site, "");
  $("main")
    .querySelectorAll(".kd-row")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = planEntries().find((x) => x.id === b.dataset.p);
          if (p) openPlanEditor(p);
        }),
    );
  if ($("pj-chat"))
    $("pj-chat").onclick = async () => {
      try {
        const id = await ensureSiteChat(site);
        openChat(id);
      } catch (e) {
        toast("Couldn't open the chat");
      }
    };
  if ($("pj-loadmsgs"))
    $("pj-loadmsgs").onclick = async () => {
      const box = $("pj-msgs");
      box.innerHTML = '<div class="nothing">Loading…</div>';
      const ms = await siteMessages(site);
      box.innerHTML = ms.length
        ? ms
            .slice(0, 100)
            .map(
              (m) =>
                `<button type="button" class="entry pjm" data-c="${esc(m.chat.id)}"><div class="main"><div class="job">${esc(m.byName || "")} <span class="who">in ${esc(chatTitle(m.chat))} · ${stamp(m.at)}</span></div>${m.jobTitle ? `<div class="sub">${esc(m.jobTitle)}</div>` : ""}<div class="sub" style="color:var(--ink)">${esc(m.text || "Photo")}${m.deleted ? " (deleted by sender)" : ""}</div></div>${m.photo ? `<img src="${blobUrl(m.photo)}" alt="" class="sigthumb" style="height:56px">` : ""}</button>`,
            )
            .join("")
        : '<div class="nothing">No chat messages have been tagged with this site yet.</div>';
      box.querySelectorAll(".pjm").forEach((b) => (b.onclick = () => openChat(b.dataset.c)));
    };
  if ($("pj-dl"))
    $("pj-dl").onclick = () => {
      const rows = [
        [
          "Site",
          "Date",
          "Employee",
          "Sheet",
          "What they did",
          "Start",
          "Finish",
          "Break (min)",
          "Hours",
          "Extra work",
          "Notes",
          "Approved",
        ],
      ];
      ents
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((e) =>
          rows.push([
            site,
            e.date,
            nameOf(e.who),
            e.type === "hours" ? "Timesheet" : "Job log",
            e.task || "",
            e.start || "",
            e.finish || "",
            e.type === "hours" ? e.breakMin : "",
            e.hours,
            e.type === "job" ? (e.kind === "extra" ? "Yes" : "No") : "",
            e.notes || "",
            e.approved ? "Yes" : "No",
          ]),
        );
      if (rows.length === 1) {
        toast("Nothing logged on this site in this period");
        return;
      }
      rows.push(
        [],
        ["Timesheet hours", sumH(ts, () => true)],
        ["Extra work hours", sumH(extra, () => true)],
        ["Tracked task hours", sumH(tracked, () => true)],
      );
      csvSave(
        `${site.replace(/[^\w\s-]/g, "").trim()} - ${{ all: "all time", month: "this month", week: "this week" }[S.f.range]}.csv`,
        rows,
      );
    };
}
