/* ================= OWNER ================= */
import { startEmployee } from "../core/data.js";
import { askOwnerPin } from "../core/dictation.js";
import { lastOf, pickField, pickVal } from "../core/fields.js";
import {
  $,
  addDays,
  calcHours,
  esc,
  gbp,
  hrs,
  iso,
  lunchBreak,
  monday,
  nowHM,
  parse,
  shortDay,
  toMin,
  toast,
} from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, equipOf, inWeek, siteGone, siteNames } from "../core/state.js";
import { empTabs, render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { isSketch, ownerDrawing } from "../drawing/trade-drawings.js";
import { blobUrl, saveAsset } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { ACS } from "./account-setup.js";
import { backupCard, wireBackup } from "./backup.js";
import { companyCard, wireCompany } from "./company-details.js";
import { auditFirst } from "./deletion-record.js";
import { openMonthly } from "./reports.js";
import { qaSetupCard, qaSetupWire } from "./today-desk.js";
import { acView } from "../people/access.js";
import { detailsDone, myDetails, openDetails } from "../people/personal-details.js";
import { pvView } from "../people/portal-access.js";
import { DOW, openPromptSender } from "../people/reminders.js";
import { openEditFolders, photoTile, photoViewer, siteRec } from "../photos/photos.js";
import { kitView } from "../planner/kit-out.js";
import { eqmView } from "../planner/plant-care.js";
import { invCard, wireInvoices } from "../purchasing/invoices.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { KINDS, ck } from "../safety/checklists.js";
import { EQ_DATES, dueSoonCard, eqWarn, openEqDates } from "../safety/expiry-dates.js";
import { lhCard, lhWire } from "../sales/letterhead-setup.js";
import { sdSigCard, sdWireSig } from "../sales/sig-setup.js";
import { siteHeadHtml } from "../sites/job-details.js";
import { openRollCall } from "../sites/roll-call.js";
import { pickPersonFor } from "../timesheets/day-work.js";
import { fltBar, fltSiteOk, fltWhoOk, fltWhos, wireFlt } from "../timesheets/filters.js";
import { openPersonMonth } from "../timesheets/monthly-sheet.js";
import { otmButtons, otmLine, otmWire } from "../timesheets/overtime.js";
import { openPaySummary } from "../timesheets/pay-summary.js";
import { openEntry, sumH, typeTag } from "../timesheets/time.js";
import { WE, WS, dayFor } from "../timesheets/working-day.js";
export {
  allIds,
  allTeam,
  checkDetail,
  companyOf,
  nameOf,
  ownerInvoices,
  ownerPhotos,
  ownerSetup,
  ownerTime,
  roleOf,
  roleShort,
  roleTag,
  startPreview,
  teamIds,
  teamPlusMe,
  weekEntries,
};
function teamIds() {
  return Object.keys(S.team)
    .filter((id) => id !== S.me && !(S.team[id] || {}).left)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
}
function allIds() {
  return Object.keys(S.team).filter((id) => id !== S.me);
}
function nameOf(id) {
  if (id && String(id).startsWith("px:")) return String(id).slice(3);
  if (id && String(id).startsWith("off:")) {
    const o = S.offapp.find((x) => "off:" + x.id === id);
    return (o && o.details && o.details.fullName) || "Trade";
  }
  if (id && id === S.me && S.owner)
    return (S.myProfile && S.myProfile.name) || S.ownerName || "James";
  return (S.team[id] && S.team[id].name) || S.names[id] || "New employee";
}
function allTeam(coll) {
  const out = [];
  allIds().forEach((id) =>
    (S.data[coll][id] || []).forEach((x) => out.push(Object.assign({ who: id }, x))),
  );
  if (S.owner && S.me && S.mine[coll])
    S.mine[coll].forEach((x) => out.push(Object.assign({ who: S.me }, x)));
  return out;
}
function roleOf(id) {
  if (String(id).startsWith("off:")) {
    const o = S.offapp.find((x) => "off:" + x.id === id);
    return (o && o.role) || "sub";
  }
  if (id === S.me && S.owner) return "owner";
  const t = S.team[id] || {};
  if (t.role) return t.role;
  const e = t.details && t.details.empType;
  return e === "cis" || e === "selfemp" ? "sub" : e === "company" ? "company" : e ? "employee" : "";
}
function companyOf(id) {
  if (String(id).startsWith("off:")) {
    const o = S.offapp.find((x) => "off:" + x.id === id) || {};
    return o.roleCompany || (o.details || {}).company || "";
  }
  const t = S.team[id] || {};
  return t.roleCompany || (t.details || {}).company || "";
}
function roleTag(id) {
  if (String(id).startsWith("px:"))
    return '<span class="tag">Not on the app · added by foreman</span>';
  const r = roleOf(id);
  const off = String(id).startsWith("off:") ? '<span class="tag">Not on the app</span>' : "";
  return (
    off +
    (S.team[id] && S.team[id].foreman ? '<span class="tag fm">Foreman</span>' : "") +
    (r === "sub"
      ? '<span class="tag rsub">Subcontractor</span>' +
        (companyOf(id) ? '<span class="tag">' + esc(companyOf(id)) + "</span>" : "")
      : r === "employee"
        ? '<span class="tag remp">Employee</span>'
        : r === "company"
          ? '<span class="tag rco">🏢 ' + esc(companyOf(id) || "Another company") + "</span>"
          : r === "owner"
            ? '<span class="tag rown">Owner · account holder</span>'
            : '<span class="tag">Not set</span>')
  );
}
function roleShort(id) {
  const r = roleOf(id);
  return r === "sub"
    ? " · Sub"
    : r === "employee"
      ? " · Emp"
      : r === "company"
        ? " · " + (companyOf(id) || "Co")
        : "";
}
function teamPlusMe() {
  const gone = allIds().filter((id) => (S.team[id] || {}).left && weekEntries(id).length);
  const pxs = [
    ...new Set(
      allIds().flatMap((src) =>
        (S.data.entries[src] || [])
          .filter((e) => e.forName && !e.forId && inWeek(e))
          .map((e) => "px:" + e.forName),
      ),
    ),
  ];
  return teamIds().concat(gone, pxs, S.owner && S.mine.entries.length ? [S.me] : []);
}
function weekEntries(id) {
  const pxName = String(id).startsWith("px:") ? id.slice(3) : null;
  const own = pxName
    ? []
    : ((id === S.me ? S.mine.entries : S.data.entries[id]) || []).filter(
        (e) => inWeek(e) && !e.forName,
      );
  const px = [];
  if (!String(id).startsWith("off:"))
    allIds().forEach((src) => {
      if (src === id) return;
      (S.data.entries[src] || []).forEach((e) => {
        if (inWeek(e) && e.forName && (pxName ? !e.forId && e.forName === pxName : e.forId === id))
          px.push(Object.assign({}, e, { _src: src }));
      });
    });
  return own
    .concat(px)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || ""));
}
/* timesheets and day work still logged against a site you've deleted: move them to the right site or delete them */
function goneWorkList() {
  const keep = new Set((S.settings || {}).gwKeep || []);
  const out = [];
  teamIds()
    .concat(S.owner ? [S.me] : [])
    .forEach((id) =>
      ((id === S.me ? S.mine.entries : S.data.entries[id]) || []).forEach((e) => {
        if (e.job && siteGone(e.job) && !keep.has(e.id)) out.push(Object.assign({ who: id }, e));
      }),
    );
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
function goneWorkCard() {
  const L = goneWorkList();
  if (!L.length) return "";
  return `<div class="notice warn gonecard"><b>⚠ ${L.length} timesheet / day work entr${L.length === 1 ? "y is" : "ies are"} logged against a site you deleted.</b> Move ${L.length === 1 ? "it" : "them"} to the right site, or delete ${L.length === 1 ? "it" : "them"}.
    <div class="gonelist">${L.map((e) => `<label class="tick"><input type="checkbox" class="gw-c" data-w="${esc(e.who)}" data-e="${esc(e.id)}" checked> <span><b>${esc(nameOf(e.who))}</b> · ${esc(shortDay(e.date))} · ${e.type === "hours" ? "timesheet" : "day work"} ${e.hours != null ? esc(hrs(e.hours)) + " h" : ""} · <span class="tag bad">${esc(e.job)}</span>${e.task ? " · " + esc(e.task) : ""}</span></label>`).join("")}</div>
    <div class="actions" style="align-items:flex-end"><label style="flex:1;min-width:200px">Move ticked to<select id="gw-site"><option value="">Choose a site…</option>${siteNames()
      .map((n) => `<option>${esc(n)}</option>`)
      .join(
        "",
      )}</select></label><button type="button" class="btn primary" id="gw-move">Move</button><button type="button" class="btn delbtn" id="gw-del">🗑 Delete ticked</button><button type="button" class="btn" id="gw-keep">Leave them as they are</button></div><div class="who">They're here because the hours were logged on a site you've since deleted. Moving them keeps the hours on a live site; leaving them keeps the old name in the records.</div></div>`;
}
function wireGoneWork() {
  if (!$("gw-move")) return;
  $("gw-keep").onclick = async () => {
    const ids = goneWorkList().map((e) => e.id);
    const keep = [...new Set(((S.settings || {}).gwKeep || []).concat(ids))].slice(-500);
    try {
      await S.db.doc("settings/app").set(Object.assign({}, S.settings, { gwKeep: keep }));
      S.settings = Object.assign({}, S.settings, { gwKeep: keep });
      toast("OK, left as they are");
      render();
    } catch (e) {
      toast("Couldn't save");
    }
  };
  const picked = () =>
    [...document.querySelectorAll(".gw-c:checked")].map((c) => ({
      who: c.dataset.w,
      id: c.dataset.e,
    }));
  const loc = (w, id) =>
    ((w === S.me ? S.mine.entries : S.data.entries[w]) || []).find((x) => x.id === id);
  $("gw-move").onclick = async () => {
    const site = $("gw-site").value;
    const P = picked();
    if (!site) {
      toast("Choose the site to move them to");
      return;
    }
    if (!P.length) {
      toast("Tick at least one");
      return;
    }
    try {
      for (const p of P) {
        await S.db.doc("sheets/" + p.who + "/entries/" + p.id).update({ job: site });
        const e = loc(p.who, p.id);
        if (e) e.job = site;
      }
      toast(P.length + " moved to " + site);
      render();
    } catch (e) {
      toast("Couldn't move them. Check your connection.");
    }
  };
  let armed = 0;
  $("gw-del").onclick = () => {
    const P = picked();
    if (!P.length) {
      toast("Tick at least one");
      return;
    }
    if (Date.now() - armed > 5000) {
      armed = Date.now();
      $("gw-del").textContent = `Tap again to delete ${P.length}`;
      return;
    }
    askOwnerPin(
      `Enter your PIN to delete ${P.length} entr${P.length === 1 ? "y" : "ies"}.`,
      async () => {
        if (
          !(await auditFirst(
            "Timesheet entries deleted",
            `${P.length} entr${P.length === 1 ? "y" : "ies"}`,
            P.map((p) => `${nameOf ? nameOf(p.who) : p.who}: ${p.date || ""} ${p.site || ""}`)
              .join("; ")
              .slice(0, 1800),
            P,
          ))
        )
          return;
        try {
          for (const p of P) {
            await S.db.doc("sheets/" + p.who + "/entries/" + p.id).delete();
            if (p.who === S.me) S.mine.entries = S.mine.entries.filter((x) => x.id !== p.id);
            else S.data.entries[p.who] = (S.data.entries[p.who] || []).filter((x) => x.id !== p.id);
          }
          toast(P.length + " deleted");
          render();
        } catch (e) {
          toast("Couldn't delete them. Check your connection.");
        }
      },
    );
  };
}
function onSiteToday() {
  const today = iso(new Date());
  const ids = teamIds().concat(S.owner ? [S.me] : []);
  const rows = [];
  ids.forEach((id) =>
    ((id === S.me ? S.mine.entries : S.data.entries[id]) || [])
      .filter((e) => e.type === "hours" && e.date === today)
      .forEach((e) => rows.push(Object.assign({ who: id }, e))),
  );
  ids.forEach((id) =>
    ((id === S.me ? S.mine.signins : (S.data.signins || {})[id]) || [])
      .filter((x) => x.date === today)
      .forEach((x) =>
        rows.push({
          who: id,
          job: x.site,
          start: x.in,
          actualIn: x.in,
          finish: x.out,
          actualOut: x.out,
          open: x.open,
          signin: true,
        }),
      ),
  );
  const notIn = teamIds().filter((id) => !rows.some((r) => r.who === id));
  const bySite = {};
  rows.forEach((r) => {
    (bySite[r.job || "No site"] = bySite[r.job || "No site"] || []).push(r);
  });
  return `<div class="card"><div class="cardbody" style="border:0"><div class="dayh" style="padding:0"><span style="font-family:var(--f-display);font-size:17px">On site today</span><span class="sum">${rows.filter((r) => r.open).length} on site now</span></div>
    <div><button type="button" class="btn danger" id="rollcall">Roll call: who's on site now</button></div>
    ${
      Object.keys(bySite)
        .sort()
        .map((site) => {
          const sr = siteRec(site) || {};
          return `<div class="osite"><div><b>${esc(site)}</b>${sr.project ? ` <span class="who">· ${esc(sr.project)}</span>` : ""}</div>
      ${bySite[site]
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
        .map(
          (r) =>
            `<div class="citem"><span>${esc(nameOf(r.who))} ${roleTag(r.who)}</span><span class="otime">${r.open ? '<span class="tag ok">On site</span>' : ""} in <b class="${toMin(r.actualIn || r.start) > toMin(WS()) ? "lateT" : ""}">${esc(r.actualIn || r.start)}</b>${r.finish ? ` · out <b>${esc(r.actualOut || r.finish)}</b>` : ""}</span></div>`,
        )
        .join("")}</div>`;
        })
        .join("") || '<div class="nothing">Nobody has checked in yet today.</div>'
    }
    ${notIn.length && rows.length ? `<div class="who">Not checked in: ${notIn.map(nameOf).map(esc).join(", ")}</div>` : ""}</div></div>`;
}
function ownerTime() {
  const ids0 = teamPlusMe();
  const fw = fltWhos().length;
  const ids = ids0.filter(fltWhoOk);
  const fe = (id) => weekEntries(id).filter(fltSiteOk);
  const fsites = siteNames().slice();
  ids0.forEach((id) => weekEntries(id).forEach((e) => fsites.push(e.job)));
  const all = [];
  ids.forEach((id) => fe(id).forEach((e) => all.push(Object.assign({ who: id }, e))));
  let html =
    dueSoonCard("all") +
    (iso(S.week) === iso(monday(new Date())) ? onSiteToday() : "") +
    fltBar(ids0, fsites) +
    (fw || S.f.fltSite
      ? `<div class="who" style="margin:-4px 0 8px">Showing ${fw ? "<b>" + esc(fltWhos().map(nameOf).join(", ")) + "</b>" : "everyone"}${S.f.fltSite ? " on <b>" + esc((all[0] && all[0].job) || S.f.fltSite) + "</b>" : ""} · totals below are for this view only</div>`
      : "") +
    `<div class="totals"><div class="tot"><div class="n">${hrs(sumH(all, (e) => e.type === "hours"))}</div><div class="l">Team timesheet hours</div></div>
    <div class="tot hi"><div class="n">${hrs(sumH(all, (e) => e.type === "job" && e.kind === "extra"))}</div><div class="l">Extra work hours</div></div>
    <div class="tot"><div class="n">${hrs(sumH(all, (e) => e.type === "job"))}</div><div class="l">Job log hours</div></div></div>
    ${all.length ? `<div class="who">Timesheet hours: employees ${hrs(sumH(all, (e) => e.type === "hours" && roleOf(e.who) === "employee"))} h · subcontractors ${hrs(sumH(all, (e) => e.type === "hours" && roleOf(e.who) === "sub"))} h${all.some((e) => !["employee", "sub", "owner"].includes(roleOf(e.who))) ? " · not set " + hrs(sumH(all, (e) => e.type === "hours" && !["employee", "sub", "owner"].includes(roleOf(e.who)))) + " h" : ""}</div>` : ""}
    <div class="actions"><button class="btn primary" id="ot-addh" type="button">+ Add a timesheet day</button><button class="btn hv" id="ot-addj" type="button">+ Add day work</button></div>
    <div class="actions"><button class="btn primary" id="paysum" type="button">Weekly pay summary</button><button class="btn" id="csv" type="button">Download this week (CSV)</button>
    <button class="btn" id="monthly" type="button">Monthly report by site</button>
    <button class="btn" id="preview" type="button">Fill in forms as me</button></div>`;
  if (!S.sites.length)
    html += `<div class="notice">Add your job sites in <b>Setup</b> so employees can pick them from a list.</div>`;
  if (!ids.length)
    html += `<div class="empty"><strong>No employees yet</strong>Share this page with each employee by email as an <b>Editor</b>. When they open it and enter their name, they appear here and update live.</div>`;
  const jobs = {};
  all
    .filter((e) => e.type === "job")
    .forEach((e) => {
      const k = (e.job || "").trim() || "No site given";
      const key = k.toLowerCase();
      jobs[key] = jobs[key] || { name: k, h: 0, x: 0, tasks: [] };
      jobs[key].h += +e.hours || 0;
      if (e.kind === "extra") jobs[key].x += +e.hours || 0;
      jobs[key].tasks.push(e);
    });
  const jl = Object.values(jobs).sort((a, b) => b.h - a.h);
  if (jl.length)
    html += `<details class="card" ${S.open.has("__jobs") ? "open" : ""} data-id="__jobs"><summary><div class="nm">Time by job<small>How long each job took this week, all employees</small></div>
      <div class="figs"><span><b>${jl.length}</b> job${jl.length === 1 ? "" : "s"}</span></div></summary><div class="cardbody"><div class="tablewrap"><table>
      <thead><tr><th>Site</th><th>Tasks</th><th class="num">Extra work</th><th class="num">Total hours</th></tr></thead><tbody>
      ${jl
        .map(
          (
            j,
          ) => `<tr><td class="job"><b>${esc(j.name)}</b></td><td>${j.tasks.map((t) => `<div>${esc(t.task)} <span class="who">· ${esc(nameOf(t.who))}, ${hrs(t.hours)} h</span></div>`).join("")}</td>
        <td class="num">${j.x ? hrs(j.x) + " h" : "–"}</td><td class="num"><b>${hrs(j.h)} h</b></td></tr>`,
        )
        .join("")}</tbody></table></div></div></details>`;
  ids.forEach((id) => {
    const we = fe(id);
    if (S.f.fltSite && !we.length) return;
    const pend = we.filter((e) => !e.approved).length;
    const upd = S.team[id] && S.team[id].updated ? new Date(S.team[id].updated) : null;
    html += `<details class="card" data-id="${esc(id)}" ${S.open.has(id) ? "open" : ""}><summary>
      <div class="nm">${esc(nameOf(id))} ${roleTag(id)}<small>${upd ? "Last updated " + upd.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Nothing yet"}${pend ? ` · ${pend} to approve` : ""}</small></div>
      <div class="figs"><span><b>${hrs(sumH(we, (e) => e.type === "hours"))}</b> h worked</span><span><b>${hrs(sumH(we, (e) => e.type === "job" && e.kind === "extra"))}</b> h extra</span><span><b>${hrs(sumH(we, (e) => e.type === "job"))}</b> h on jobs</span></div></summary>
      <div class="cardbody">${!String(id).startsWith("px:") && !String(id).startsWith("off:") ? `<button type="button" class="btn sjbig pm-open" data-w="${esc(id)}" style="margin:0 0 10px">📅 ${esc(nameOf(id))}: all details &amp; month timesheet ›</button>` : ""}${id !== S.me && !String(id).startsWith("px:") ? timeControls(id) : id === S.me ? `<div class="tctl"><button type="button" class="pillbtn me-addh">+ Timesheet day</button><button type="button" class="pillbtn me-addj">🧱 + Day work / job time</button></div>` : ""}<div class="actions">${pend ? `<button type="button" class="btn" data-approveall="1">Approve all this week</button>` : ""}${id !== S.me && !String(id).startsWith("px:") ? `<button type="button" class="pillbtn pr-send" data-w="${esc(id)}">Ask ${esc(nameOf(id))} to fix or fill in…</button>` : ""}</div>
        ${
          we.length
            ? `<div class="tablewrap"><table><thead><tr><th>Day</th><th>Sheet</th><th>Site / task</th><th>Time</th><th class="num">Hours</th><th>OK</th><th></th></tr></thead><tbody>
          ${we
            .map(
              (
                e,
              ) => `<tr><td style="white-space:nowrap">${parse(e.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</td><td style="white-space:nowrap">${typeTag(e)}</td>
            <td class="job">${esc(e.job)}${e.task ? `<div>${esc(e.task)}</div>` : ""}${e.notes ? `<div class="who">${esc(e.notes)}</div>` : ""}${e.forName ? `<div class="who">${e.forId ? "" : "<b>For " + esc(e.forName) + "</b> · "}Filled in by ${esc(e.byForeman || nameOf(e._src || id))} (foreman)</div>` : ""}${e.editedBy || e.startedBy || e.stoppedBy ? `<div class="who">${[e.startedBy ? "Started by " + e.startedBy : "", e.stoppedBy ? "Stopped by " + e.stoppedBy : "", e.editedBy ? "Changed by " + e.editedBy : ""].filter(Boolean).map(esc).join(" · ")}</div>` : ""}</td>
            <td style="white-space:nowrap">${e.type === "hours" ? `${esc(e.start)}–${esc(e.finish)}${+e.breakMin ? `<div class="who">${e.breakMin}m break</div>` : ""}` : "–"}${otmLine(e)}${otmButtons(e)}</td>
            <td class="num">${hrs(e.hours)} h</td><td><input type="checkbox" class="appr" data-e="${esc(e.id)}" ${e.approved ? "checked" : ""} data-src="${esc(e._src || "")}" aria-label="Approve" style="width:22px;height:22px"></td><td><button type="button" class="pillbtn te-edit" data-e="${esc(e.id)}">Edit</button></td></tr>`,
            )
            .join("")}
          </tbody></table></div>`
            : `<div class="nothing">Nothing logged this week.</div>`
        }</div></details>`;
  });
  html = goneWorkCard() + html;
  $("main").innerHTML = html;
  wireFlt();
  wireGoneWork();
  $("csv").onclick = downloadCsv;
  $("paysum").onclick = openPaySummary;
  if ($("rollcall")) $("rollcall").onclick = openRollCall;
  $("main")
    .querySelectorAll(".pr-send")
    .forEach((b) => (b.onclick = () => openPromptSender([b.dataset.w], { form: "timesheet" })));
  $("monthly").onclick = openMonthly;
  $("ot-addh").onclick = () => pickPersonFor("hours");
  $("ot-addj").onclick = () => pickPersonFor("job");
  $("main")
    .querySelectorAll(".pm-open")
    .forEach((b) => (b.onclick = () => openPersonMonth(b.dataset.w)));
  $("preview").onclick = startPreview;
  $("main")
    .querySelectorAll("details.card")
    .forEach((dt) => {
      const id = dt.dataset.id;
      dt.addEventListener("toggle", () => {
        dt.open ? S.open.add(id) : S.open.delete(id);
      });
      dt.querySelectorAll(".appr").forEach((cb) =>
        cb.addEventListener("change", async () => {
          cb.disabled = true;
          try {
            await S.db
              .doc("sheets/" + (cb.dataset.src || id) + "/entries/" + cb.dataset.e)
              .update({ approved: cb.checked });
          } catch (e) {
            toast("Couldn't save");
            cb.checked = !cb.checked;
          }
          cb.disabled = false;
        }),
      );
      dt.querySelectorAll(".te-edit").forEach(
        (b) =>
          (b.onclick = () => {
            const e = weekEntries(id).find((x) => x.id === b.dataset.e);
            if (e) openEntry(e.type, e, id === S.me ? null : id);
          }),
      );
      wireTimeControls(dt, id);
      otmWire(dt, id, () => weekEntries(id));
      const mh = dt.querySelector(".me-addh");
      if (mh) mh.onclick = () => openEntry("hours");
      const mj = dt.querySelector(".me-addj");
      if (mj) mj.onclick = () => openEntry("job");
      const aa = dt.querySelector("[data-approveall]");
      if (aa)
        aa.onclick = async () => {
          aa.disabled = true;
          let n = 0;
          for (const e of weekEntries(id).filter((e) => !e.approved)) {
            try {
              await S.db
                .doc("sheets/" + (e._src || id) + "/entries/" + e.id)
                .update({ approved: true });
              n++;
            } catch (_) {}
          }
          toast("Approved " + n + " entr" + (n === 1 ? "y" : "ies"));
        };
    });
}
function timeControls(id) {
  const open = (S.data.entries[id] || [])
    .filter((e) => e.open)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return `<div class="tctl">${
    open
      ? `<span class="tag ok">On site</span> <span class="who">${esc(open.job)} · in ${esc(open.start)}${open.date !== iso(new Date()) ? " on " + esc(shortDay(open.date)) : ""}</span>
      <button type="button" class="btn danger tc-stop" data-e="${esc(open.id)}">Stop (check out)</button><button type="button" class="pillbtn tc-edit" data-e="${esc(open.id)}">Change times</button>`
      : `<span class="who">Not checked in</span><button type="button" class="btn primary tc-start">Start (check in)</button>`
  }<button type="button" class="pillbtn tc-add">+ Add a day</button><button type="button" class="pillbtn tc-job">🧱 + Day work / job time</button></div>`;
}
function wireTimeControls(root, id) {
  if (!root.querySelector(".tctl")) return;
  const all = () => S.data.entries[id] || [];
  const st = root.querySelector(".tc-start");
  if (st) st.onclick = () => openStartFor(id);
  const sp = root.querySelector(".tc-stop");
  if (sp)
    sp.onclick = () => {
      const e = all().find((x) => x.id === sp.dataset.e);
      if (e) openStopFor(id, e);
    };
  const ed = root.querySelector(".tc-edit");
  if (ed)
    ed.onclick = () => {
      const e = all().find((x) => x.id === ed.dataset.e);
      if (e) openEntry("hours", e, id);
    };
  /* James's own week has its own add buttons, without these */
  const ad = root.querySelector(".tc-add"),
    jb = root.querySelector(".tc-job");
  if (ad) ad.onclick = () => openEntry("hours", null, id);
  if (jb) jb.onclick = () => openEntry("job", null, id);
}
function openStartFor(id) {
  const D = dayFor(id);
  const now = nowHM(),
    st = toMin(now) < toMin(D.s) ? D.s : now;
  openSheet(
    `<h3 id="sheettitle">Start ${esc(nameOf(id))}'s timesheet</h3><div class="who">Checks them in. The clock runs until they, or you, check them out.</div>
    ${pickField(
      "sf-site",
      "Site",
      siteNames(),
      lastOf(S.data.entries[id] || [], () => true, "job"),
      "e.g. 12 Marine Way, Exmouth",
    )}
    <div class="grid2"><label for="sf-date">Date<input id="sf-date" type="date" value="${iso(new Date())}"></label><label for="sf-start">Start time<input id="sf-start" type="time" value="${st}"></label></div>
    ${formFoot(false, "Start")}`,
    async () => {
      const site = pickVal("sf-site"),
        start = $("sf-start").value,
        date = $("sf-date").value;
      if (!site || !start || !date) {
        showErr("Choose the site, date and start time.");
        return;
      }
      if ((S.data.entries[id] || []).some((e) => e.open)) {
        showErr(nameOf(id) + " is already checked in. Stop that first.");
        return;
      }
      const now = Date.now();
      try {
        await S.db.doc("sheets/" + id + "/entries/" + newId()).set({
          type: "hours",
          date,
          job: site,
          start,
          actualIn: start,
          finish: "",
          breakMin: 0,
          hours: 0,
          open: true,
          inAt: now,
          checkIn: true,
          notes: "",
          approved: false,
          startedBy: S.ownerName || "James",
          created: now,
          updated: now,
        });
        closeForm();
        toast(nameOf(id) + " checked in at " + start);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    null,
  );
}
function openStopFor(id, e) {
  const D = dayFor(id);
  const now = nowHM();
  const fin = e.date === iso(new Date()) ? (toMin(now) > toMin(D.e) ? D.e : now) : D.e;
  openSheet(
    `<h3 id="sheettitle">Stop ${esc(nameOf(id))}'s timesheet</h3><div class="who">${esc(e.job)} · ${esc(shortDay(e.date))} · started ${esc(e.start)}</div>
    <label for="sp-fin">Finish time<input id="sp-fin" type="time" value="${fin}"></label><div class="calc" id="sp-calc"></div>
    ${formFoot(false, "Stop and save")}`,
    async () => {
      const f = $("sp-fin").value;
      const br = lunchBreak(e.start, f, D);
      const h = Math.round(calcHours(e.start, f, br) * 100) / 100;
      if (!h) {
        showErr("The finish must be after " + e.start + ".");
        return;
      }
      const d = Object.assign({}, e, {
        finish: f,
        breakMin: br,
        hours: h,
        outAt: Date.now(),
        updated: Date.now(),
        stoppedBy: S.ownerName || "James",
      });
      delete d.id;
      delete d.who;
      delete d.open;
      try {
        await S.db.doc("sheets/" + id + "/entries/" + e.id).set(d);
        closeForm();
        toast(`${nameOf(id)} checked out at ${f} · ${hrs(h)} hours`);
        render();
      } catch (err) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "sp-fin",
  );
  const u = () => {
    const f = $("sp-fin").value;
    $("sp-calc").textContent =
      `Total: ${hrs(calcHours(e.start, f, lunchBreak(e.start, f, D)))} hours (${D.lm ? D.lm + " min lunch unpaid" : "no unpaid lunch"})`;
  };
  $("sp-fin").oninput = u;
  u();
}
function startPreview() {
  S.preview = true;
  if (!S.employeeStarted) {
    S.employeeStarted = true;
    startEmployee();
  }
  if (!empTabs().some((t) => t[0] === S.tab)) S.tab = empTabs()[0][0];
  render();
}
async function downloadCsv() {
  const cols = [
    "Name",
    "Employee or subcontractor",
    "Date",
    "Sheet",
    "Site",
    "What they did",
    "Start",
    "Finish",
    "Break (min)",
    "Hours",
    "Extra work",
    "Notes",
    "Approved",
  ];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.join(",")];
  teamPlusMe().forEach((id) =>
    weekEntries(id).forEach((e) =>
      rows.push(
        [
          nameOf(id),
          {
            sub: "Subcontractor",
            employee: "Employee",
            owner: "Owner",
            company: "From " + (companyOf(id) || "another company"),
          }[roleOf(id)] || "Not set",
          e.date,
          e.type === "hours" ? "Timesheet" : "Job log",
          e.job,
          e.task || "",
          e.start || "",
          e.finish || "",
          e.type === "hours" ? e.breakMin : "",
          e.hours,
          e.type === "job" ? (e.kind === "extra" ? "Yes" : "No") : "",
          e.notes || "",
          e.approved ? "Yes" : "No",
        ]
          .map(q)
          .join(","),
      ),
    ),
  );
  if (rows.length === 1) {
    toast("Nothing logged this week");
    return;
  }
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  try {
    await S.dl.save({
      filename: "Timesheets week of " + iso(S.week) + ".csv",
      data: rows.join("\r\n"),
    });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
function checkDetail(c0) {
  const c = ck(c0),
    K = KINDS[c.kind] || KINDS.vehicle;
  openViewer(`<h3 style="font-family:var(--f-display);margin:0 0 4px">${K.name} check · ${esc(c.asset)}</h3>
    <div class="who">${esc(nameOf(c0.who))} · ${shortDay(c.date)}${c.reading ? ` · ${K.reading} ${esc(c.reading)}` : ""} · ${c.safe === false ? "<b style='color:var(--danger)'>Not safe to use</b>" : "Safe to use"}</div>
    <div style="margin-top:10px">${K.items
      .map(([k, l]) => {
        const v = c.items && c.items[k];
        return `<div class="citem"><span>${esc(l)}</span><span class="tag ${v === "defect" ? "bad" : v === "ok" ? "ok" : ""}">${v === "defect" ? "Defect" : v === "ok" ? "OK" : v === "na" ? "N/A" : "–"}</span></div>`;
      })
      .join("")}</div>
    ${c.notes ? `<p><b>Notes:</b> ${esc(c.notes)}</p>` : ""}
    ${c0.who && c0.who !== S.me ? `<div class="actions"><button type="button" class="pillbtn" id="cd-redo">Ask ${esc(nameOf(c0.who))} to redo this check</button></div>` : ""}
    ${c.photos && c.photos.length ? `<div class="flabel" style="margin-top:10px">Defect photos</div>${c.photos.map((id, i) => `<img src="${blobUrl(id)}" alt="Defect photo" style="width:100%;border-radius:8px;margin-bottom:6px"><button type="button" class="pillbtn cd-save" data-id="${esc(id)}" style="margin-bottom:12px">Save photo ${i + 1}</button>`).join("")}` : ""}`);
  if ($("cd-redo"))
    $("cd-redo").onclick = () =>
      openPromptSender([c0.who], {
        form: "check-" + c.kind,
        note: `Please redo your ${K.name} ${K.inspect ? "inspection" : "check"} for ${c.asset} (${shortDay(c.date)}).`,
      });
  $("viewer-body")
    .querySelectorAll(".cd-save")
    .forEach(
      (b) =>
        (b.onclick = () =>
          saveAsset(
            b.dataset.id,
            `${(c.asset || "defect").replace(/[^\w\s-]/g, "").trim()} defect ${c.date}.jpg`,
          )),
    );
}
function ownerPhotos() {
  const ids = teamIds();
  const pw = S.f.pwhen || "all";
  const cut =
    pw === "month"
      ? iso(addDays(new Date(), -30))
      : pw === "3m"
        ? iso(addDays(new Date(), -91))
        : "";
  const every = allTeam("photos");
  let all = every.filter((p) => (pw === "week" ? inWeek(p) : !cut || (p.date || "") >= cut));
  const sites = [
    ...new Set(
      every
        .map((p) => p.site || "No site")
        .concat((S.sites || []).filter((x) => !x.archived && x.name).map((x) => x.name)),
    ),
  ]
    .filter((n) => !siteGone(n))
    .sort();
  const siteN = (n) => all.filter((p) => (p.site || "No site") === n).length;
  if (S.f.site && !sites.includes(S.f.site)) S.f.site = "";
  if (S.f.who && !ids.includes(S.f.who)) S.f.who = "";
  const stages = [
    ...new Set(
      all
        .filter((p) => !S.f.site || (p.site || "No site") === S.f.site)
        .map((p) => p.category || "Other photos"),
    ),
  ].sort();
  if (S.f.stage && !stages.includes(S.f.stage)) S.f.stage = "";
  const list = all
    .filter(
      (p) =>
        (!S.f.site || (p.site || "No site") === S.f.site) &&
        (!S.f.who || p.who === S.f.who) &&
        (!S.f.stage || (p.category || "Other photos") === S.f.stage),
    )
    .sort((a, b) => b.takenAt - a.takenAt);
  const myd = (S.mine.photos || [])
    .filter((p) => isSketch(p))
    .map((p) => Object.assign({ who: S.me }, p))
    .sort((a, b) => (b.editedAt || b.created) - (a.editedAt || a.created));
  const tochk = allTeam("photos")
    .filter((p) => isSketch(p) && p.check === "open" && (!S.f.who || p.who === S.f.who))
    .sort((a, b) => (a.editedAt || a.created) - (b.editedAt || b.created));
  $("main").innerHTML =
    `<div class="actions"><button class="btn primary" id="addD" type="button">✏️ Draw it out</button></div>
    <div class="notice">✏️ Trades have a <b>Draw it out</b> button on their Photos tab. When they send you a drawing it appears here under <b>Drawings to check</b>.</div>
    ${myd.length ? `<div class="flabel">My drawings</div><div class="phgrid">${myd.map((p) => photoTile(p, true, S.me)).join("")}</div>` : ""}
    ${tochk.length ? `<div class="flabel" style="margin-top:14px">Drawings to check (${tochk.length})</div><div class="phgrid sk-chk">${tochk.map((p) => photoTile(p, true, p.who)).join("")}</div><div class="flabel" style="margin-top:14px">This week</div>` : ""}<div class="filters"><label for="pf-when">Show<select id="pf-when">${[
      ["all", "All photos"],
      ["3m", "Last 3 months"],
      ["month", "Last 30 days"],
      ["week", "One week at a time"],
    ]
      .map(([v, l]) => `<option value="${v}" ${pw === v ? "selected" : ""}>${l}</option>`)
      .join(
        "",
      )}</select></label><label for="pf-site">Site<select id="pf-site"><option value="">All sites (${all.length})</option>${sites.map((s) => `<option value="${esc(s)}" ${s === S.f.site ? "selected" : ""}>${esc(s)} (${siteN(s)})</option>`).join("")}</select></label>
    <label for="pf-stage">Stage<select id="pf-stage"><option value="">All stages</option>${stages.map((x) => `<option ${x === S.f.stage ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
    <label for="pf-who">Employee<select id="pf-who"><option value="">Everyone</option>${ids.map((id) => `<option value="${esc(id)}" ${id === S.f.who ? "selected" : ""}>${esc(nameOf(id))}</option>`).join("")}</select></label></div>
    ${list.length ? `<div class="phgrid">${list.map((p) => photoTile(p, true, p.who)).join("")}</div>` : '<div class="empty"><strong>No photos ${pw==="week"?"this week":S.f.site?"for this site":"yet"}</strong>Photos your employees send appear here, stamped with site, time and location.</div>'}`;
  $("addD").onclick = ownerDrawing;
  $("pf-site").onchange = (e) => {
    S.f.site = e.target.value;
    e.target.blur();
    render();
  };
  $("pf-when").onchange = (e) => {
    S.f.pwhen = e.target.value;
    e.target.blur();
    render();
  };
  $("pf-who").onchange = (e) => {
    S.f.who = e.target.value;
    e.target.blur();
    render();
  };
  $("pf-stage").onchange = (e) => {
    S.f.stage = e.target.value;
    e.target.blur();
    render();
  };
  $("main")
    .querySelectorAll(".ph")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = list
            .concat(tochk, myd)
            .find((x) => x.id === b.dataset.p && x.who === b.dataset.w);
          if (p) photoViewer(p, true, p.who);
        }),
    );
}
function ownerInvoices() {
  const all = allTeam("invoices")
    .filter(isInv)
    .sort((a, b) => b.sentAt - a.sentAt);
  const f = S.f.inv;
  const list = all.filter(
    (v) =>
      f === "all" || (f === "open" ? (v.status || "sent") !== "paid" : (v.status || "sent") === f),
  );
  const unpaid = all.filter((v) => (v.status || "sent") !== "paid");
  const owed = unpaid.reduce((a, v) => a + (+v.amount || 0), 0);
  $("main").innerHTML =
    `<div class="totals"><div class="tot hi"><div class="n">${all.filter((v) => (v.status || "sent") === "sent").length}</div><div class="l">New, not yet received</div></div>
    <div class="tot"><div class="n">${unpaid.length}</div><div class="l">Not paid yet</div></div>${owed ? `<div class="tot"><div class="n">${gbp(owed)}</div><div class="l">Unpaid total</div></div>` : ""}</div>
    <div class="seg" id="if">${[
      ["open", "Not paid"],
      ["sent", "New"],
      ["approved", "Approved"],
      ["query", "Query"],
      ["paid", "Paid"],
      ["all", "All"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
      )
      .join("")}</div>
    ${list.length ? `<div class="day">${list.map((v) => invCard(v, true, v.who)).join("")}</div>` : '<div class="empty"><strong>No invoices here</strong>Invoices from self-employed workers appear here with the date and time they were sent.</div>'}`;
  $("if")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.inv = b.dataset.v;
          render();
        }),
    );
  wireInvoices(list, true);
}
function ownerSetup() {
  const stSeg = `<div class="seg st-tabs" id="st-tabs"><button type="button" data-v="setup" aria-pressed="${S.f.stab !== "access" && S.f.stab !== "portal"}">⚙️ Setup</button><button type="button" data-v="access" aria-pressed="${S.f.stab === "access"}">👥 People &amp; access</button><button type="button" data-v="portal" aria-pressed="${S.f.stab === "portal"}">🏡 Client portal</button></div>`;
  const stWire = () =>
    $("st-tabs")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.stab = b.dataset.v;
            render();
            window.scrollTo(0, 0);
          }),
      );
  if (S.f.stab === "access") {
    acView(stSeg);
    stWire();
    return;
  }
  if (S.f.stab === "portal") {
    pvView(stSeg);
    stWire();
    return;
  }
  const sec = (
    key,
    title,
    help,
    names,
    ph,
  ) => `<details class="card" data-id="__${key}" ${S.open.has("__" + key) || !names.length ? "open" : ""}><summary><div class="nm">${title}<small>${names.length ? names.length + " in the list" : help}</small></div></summary>
    <div class="cardbody"><form class="addform" data-k="${key}" style="display:flex;gap:8px;flex-wrap:wrap"><input id="add-${key}" maxlength="100" placeholder="${esc(ph)}" aria-label="Add to ${esc(title)}" style="flex:1;min-width:200px"><button class="btn primary" type="submit">Add</button></form>
    ${names.length ? `<div>${names.map((x) => `<div class="citem"><span>${key === "sites" ? siteHeadHtml(x.name) : esc(x.name)}${key === "sites" && (x.project || (x.plots || []).length) ? `<br><span class="who">${[x.project, (x.plots || []).join(", ")].filter(Boolean).map(esc).join(" · ")}</span>` : ""}</span><span style="display:flex;gap:6px;flex:none">${key === "sites" ? `<button type="button" class="pillbtn editsite" data-id="${esc(x.id)}">${x.jobName ? "Details" : "✎ Name & details"}</button><button type="button" class="pillbtn editfold" data-n="${esc(x.name)}">Photo folders</button>` : `<button type="button" class="pillbtn editsched" data-id="${esc(x.id)}">${x.assignee && x.freq && x.freq !== "none" ? esc(nameOf(x.assignee)) + " · " + (x.freq === "weekly" ? "weekly " + DOW[+(x.dueDay ?? 1)].slice(0, 3) : "daily") : "Driver & checks"}</button>${(EQ_DATES[key] || []).length ? `<button type="button" class="pillbtn eqdates" data-id="${esc(x.id)}">${(x.dates && Object.keys(x.dates).length) || (x.info && Object.keys(x.info).length) || (x.files || []).length ? "Details ✓" : "Details"}${eqWarn(x)}</button>` : ""}`}<button type="button" class="linkdanger delitem" data-k="${key}" data-id="${esc(x.id)}">Remove</button></span></div>`).join("")}</div>` : '<div class="nothing">Nothing added yet.</div>'}</div></details>`;
  $("main").innerHTML =
    `${stSeg}<div class="card"><div class="cardbody" style="border:0"><b>Working day</b>
      <div class="grid2"><label for="wd-s">Paid start<input id="wd-s" type="time" value="${esc(WS())}"></label><label for="wd-e">Paid finish<input id="wd-e" type="time" value="${esc(WE())}"></label></div>
      <div class="who">People who check in before the start or check out after the finish are paid from the start to the finish, unless they ask for overtime when they check out and you approve it (on Timesheets: ✓ Pay overtime). The 1pm half hour is unpaid. Each person can also set their own usual day.</div>
      <div><button class="btn primary" id="wd-save" type="button">Save working day</button></div></div></div>
    <div class="card"><div class="cardbody" style="border:0"><b>📷 Site photos for trades</b><div class="who">Trades see a <b>Site photos</b> tab on each of their sites.</div>
      <div class="seg" id="tp-seg"><button type="button" data-v="all" aria-pressed="${(S.settings || {}).tradePhotos !== "james"}">Everyone's photos for the site</button><button type="button" data-v="james" aria-pressed="${(S.settings || {}).tradePhotos === "james"}">Only my photos (and their own)</button></div></div></div>
    <div class="card"><div class="cardbody" style="border:0"><b>Your mobile number</b><div class="who">Trades can call or video call you from Chat with this.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="op-tel" type="tel" maxlength="20" value="${esc(S.f.opTel != null ? S.f.opTel : (S.settings || {}).ownerPhone || "")}" placeholder="e.g. 07700 900123" style="flex:1;min-width:180px" aria-label="Your mobile number"><button class="btn primary" id="op-save" type="button">Save</button></div></div></div>
    ${ACS.cardHtml("setup")}
    <div class="card"><div class="cardbody" style="border:0"><b>🪪 My own details</b><div class="who">${detailsDone(myDetails()) ? "✓ Filled in. " : ""}Your name, trade, CSCS card, next of kin and medical info. Used to fill in inductions, toolbox talks, briefings and other forms for you automatically, the same as the trades.</div><div><button class="btn ${detailsDone(myDetails()) ? "" : "primary"}" id="op-det" type="button">${detailsDone(myDetails()) ? "Check my details" : "Fill in my details"}</button><button class="btn op-me" data-t="time" type="button">⏱️ My timesheet</button><button class="btn op-me" data-t="mydw" type="button">🧱 My day sheet</button></div></div></div>
    ${qaSetupCard()}
    <div class="flabel" style="margin-top:6px">My company details</div><div class="who" style="margin-bottom:6px">Shown to everyone at the top of Policies &amp; insurance.</div>
    ${companyCard()}
    ${lhCard()}
    ${sdSigCard()}
    ${backupCard()}
    <div class="notice">These lists fill the drop-downs your employees pick from. Only you can change them.</div>
    <div class="actions"><button type="button" class="btn" id="eqm-reg">🚐 Vehicles &amp; plant: due dates, bookings and history</button><button type="button" class="btn" id="kit-reg">🧰 Tools &amp; plant: who has what</button></div>
    ${sec("sites", "Sites", "Job sites for timesheets, photos and plans", S.sites, "e.g. 12 Marine Way, Exmouth")}
    ${Object.entries(KINDS)
      .map(([k, K]) =>
        sec(
          k,
          K.plural,
          "For " + K.name + (K.inspect ? " inspections" : " checks"),
          S.equipment.filter((x) => x.kind === k),
          K.ph,
        ),
      )
      .join("")}
    <div class="actions"><button class="btn" id="preview" type="button">Fill in forms as me</button></div>`;
  $("preview").onclick = startPreview;
  if ($("eqm-reg")) $("eqm-reg").onclick = eqmView;
  if ($("kit-reg")) $("kit-reg").onclick = () => kitView();
  stWire();
  wireBackup();
  wireCompany();
  lhWire();
  sdWireSig();
  $("op-det").onclick = () => openDetails();
  ACS.wire();
  /* James working like a trade (Nov 2026): his own timesheet and day sheet, as the trades fill them in */
  document.querySelectorAll(".op-me").forEach(
    (b) =>
      (b.onclick = () => {
        S.tab = b.dataset.t;
        startPreview();
        window.scrollTo(0, 0);
      }),
  );
  $("op-tel").addEventListener("input", (e) => {
    S.f.opTel = e.target.value;
  });
  $("op-tel").addEventListener("change", () => opSave());
  const opSave = async () => {
    const el = $("op-tel");
    if (!el) return;
    const v = (S.f.opTel != null ? S.f.opTel : el.value).trim();
    if (v === ((S.settings || {}).ownerPhone || "")) {
      S.f.opTel = null;
      if (v) toast("Number saved");
      return;
    }
    if (v && v.replace(/\D/g, "").length < 10) {
      toast("That number looks too short");
      return;
    }
    $("op-save").disabled = true;
    try {
      await S.db.doc("settings/app").update({ ownerPhone: v });
      S.settings = Object.assign({}, S.settings, { ownerPhone: v });
      S.f.opTel = null;
      toast(v ? "Number saved" : "Number removed");
      if ($("op-tel")) $("op-tel").blur();
    } catch (e) {
      try {
        await S.db.doc("settings/app").set(Object.assign({}, S.settings, { ownerPhone: v }));
        toast("Number saved");
      } catch (x) {
        toast("Couldn't save. Check your connection.");
      }
    }
    if ($("op-save")) $("op-save").disabled = false;
  };
  $("op-save").addEventListener("pointerdown", (e) => e.preventDefault());
  $("op-save").onclick = opSave;
  qaSetupWire();
  $("op-tel").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      opSave();
    }
  });
  $("main")
    .querySelectorAll("#tp-seg button")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await S.db
              .doc("settings/app")
              .set(Object.assign({}, S.settings, { tradePhotos: b.dataset.v }));
            S.settings = Object.assign({}, S.settings, { tradePhotos: b.dataset.v });
            $("main")
              .querySelectorAll("#tp-seg button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            toast("Saved");
          } catch (e) {
            toast("Couldn't save");
          }
        }),
    );
  $("wd-save").onclick = async () => {
    const a = $("wd-s").value,
      b = $("wd-e").value;
    if (!a || !b || toMin(b) <= toMin(a)) {
      toast("The finish must be after the start");
      return;
    }
    try {
      await S.db
        .doc("settings/app")
        .set(Object.assign({}, S.settings, { workStart: a, workEnd: b }));
      toast("Working day saved");
    } catch (e) {
      toast("Couldn't save");
    }
  };
  $("main")
    .querySelectorAll("details.card")
    .forEach((dt) =>
      dt.addEventListener("toggle", () => {
        dt.open ? S.open.add(dt.dataset.id) : S.open.delete(dt.dataset.id);
      }),
    );
  $("main")
    .querySelectorAll(".addform")
    .forEach(
      (fm) =>
        (fm.onsubmit = async (ev) => {
          ev.preventDefault();
          const k = fm.dataset.k,
            inp = $("add-" + k),
            n = inp.value.trim();
          if (!n) return;
          const existing = k === "sites" ? siteNames() : equipOf(k);
          if (existing.some((x) => x.toLowerCase() === n.toLowerCase())) {
            toast("That's already on the list");
            return;
          }
          inp.value = "";
          inp.blur();
          S.open.add("__" + k);
          try {
            if (k === "sites") await S.db.collection("sites").add({ name: n, created: Date.now() });
            else await S.db.collection("equipment").add({ kind: k, name: n, created: Date.now() });
            toast("Added");
          } catch (e) {
            toast("Couldn't add it");
            inp.value = n;
          }
        }),
    );
  $("main")
    .querySelectorAll(".editsched")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const eq = S.equipment.find((x) => x.id === b.dataset.id);
          if (!eq) return;
          const K = KINDS[eq.kind];
          openSheet(
            `<h3 id="sheettitle">${esc(eq.name)}</h3><div class="who">${esc(K.name)}</div>
      <label for="es-who">${eq.kind === "vehicle" || eq.kind === "trailer" ? "Who drives or tows it?" : "Who uses it?"}<select id="es-who"><option value="">Nobody set</option>${teamIds()
        .concat([S.me])
        .map(
          (id) =>
            `<option value="${esc(id)}" ${eq.assignee === id ? "selected" : ""}>${esc(nameOf(id))}</option>`,
        )
        .join("")}</select></label>
      <div><div class="flabel">How often must they check it?</div><div class="seg" id="es-freq">${[
        ["none", "No schedule"],
        ["weekly", "Weekly"],
        ["daily", "Daily (Mon–Fri)"],
      ]
        .map(
          ([k, l]) =>
            `<button type="button" data-v="${k}" aria-pressed="${(eq.freq || "none") === k}">${l}</button>`,
        )
        .join("")}</div></div>
      <label for="es-day" id="es-dayl">Weekly check due on<select id="es-day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}" ${+(eq.dueDay ?? 1) === d ? "selected" : ""}>${DOW[d]}</option>`).join("")}</select></label>
      <div class="who">They get a pop-up and a reminder each time they open the app, from the due day until the check is done. The app can't send notifications to a phone that's closed.</div>
      ${formFoot(false, "Save")}`,
            async () => {
              const freq = $("es-freq").querySelector('[aria-pressed="true"]').dataset.v,
                who = $("es-who").value;
              if (freq !== "none" && !who) {
                showErr("Choose who needs to do the check.");
                return;
              }
              try {
                await S.db
                  .doc("equipment/" + eq.id)
                  .update({ assignee: who, freq, dueDay: +$("es-day").value });
                closeForm();
                toast("Saved");
                render();
              } catch (e) {
                showErr("Couldn't save.");
              }
            },
            null,
          );
          const sync = () => {
            $("es-dayl").hidden =
              $("es-freq").querySelector('[aria-pressed="true"]').dataset.v !== "weekly";
          };
          $("es-freq")
            .querySelectorAll("button")
            .forEach(
              (x) =>
                (x.onclick = () => {
                  $("es-freq")
                    .querySelectorAll("button")
                    .forEach((y) => y.setAttribute("aria-pressed", String(y === x)));
                  sync();
                }),
            );
          sync();
        }),
    );
  $("main")
    .querySelectorAll(".editfold")
    .forEach((b) => (b.onclick = () => openEditFolders(b.dataset.n)));
  $("main")
    .querySelectorAll(".eqdates")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const eq = S.equipment.find((x) => x.id === b.dataset.id);
          if (eq) openEqDates(eq);
        }),
    );
  $("main")
    .querySelectorAll(".editsite")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const x = S.sites.find((y) => y.id === b.dataset.id);
          if (!x) return;
          openSheet(
            `<h3 id="sheettitle">Site details</h3>
      <label for="sd-jname">Job name (shows big everywhere, with the address small under it)<input id="sd-jname" maxlength="60" value="${esc(x.jobName || "")}" placeholder="e.g. Carpenter renovation"></label>
      <label for="sd-name">Site address<input id="sd-name" required maxlength="120" value="${esc(x.name)}"></label>
      <div class="who">Use the full address with postcode, e.g. 9 Old Teignmouth Rd, Dawlish EX7 0NJ. It's printed on every photo. Changing it doesn't change older records.</div>
      <label for="sd-proj">Project name (printed on photos)<input id="sd-proj" maxlength="80" value="${esc(x.project || "")}" placeholder="e.g. La Falaise"></label>
      <label for="sd-loc">Site location (latitude, longitude)<input id="sd-loc" maxlength="60" value="${x.lat != null ? esc(x.lat + ", " + x.lon) : ""}" placeholder="e.g. 50.5744373, -3.4704849"></label>
      <div class="who">Used on photos when the phone doesn't record a location. In Google Maps, press and hold on the site, then copy the numbers that appear.</div>
      <label for="sd-plots">Plots (separate with commas)<input id="sd-plots" maxlength="400" value="${esc((x.plots || []).join(", "))}" placeholder="e.g. Plot 1, Plot 2, Plot 3"></label>
      ${formFoot(false, "Save")}`,
            async () => {
              const name = $("sd-name").value.trim();
              if (!name) {
                showErr("Add the address.");
                return;
              }
              const lm = $("sd-loc")
                .value.trim()
                .match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
              if ($("sd-loc").value.trim() && !lm) {
                showErr("Enter the location as two numbers, e.g. 50.5744373, -3.4704849");
                return;
              }
              try {
                await S.db.doc("sites/" + x.id).update({
                  lat: lm ? +lm[1] : null,
                  lon: lm ? +lm[2] : null,
                  name,
                  jobName: $("sd-jname").value.trim().replace(/\s+/g, " "),
                  project: $("sd-proj").value.trim(),
                  plots: $("sd-plots")
                    .value.split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                });
                closeForm();
                toast("Saved");
              } catch (e) {
                showErr("Couldn't save.");
              }
            },
            "sd-proj",
          );
        }),
    );
  $("main")
    .querySelectorAll(".delitem")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Tap again to remove";
            return;
          }
          try {
            await S.db
              .doc((b.dataset.k === "sites" ? "sites/" : "equipment/") + b.dataset.id)
              .delete();
            toast("Removed");
          } catch (e) {
            toast("Couldn't remove");
          }
        }),
    );
}
