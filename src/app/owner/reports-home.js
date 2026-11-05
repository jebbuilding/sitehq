/* ================= REPORTS HOME (category tiles) ================= */
import { $, esc, iso, shortDay, toast } from "../core/helpers.js";
import { S, equipOf, inWeek } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { allTeam, checkDetail, nameOf, teamIds } from "./owner.js";
import { openCheckHistory } from "./reports.js";
import { DOW, mySchedDue, schedStatus } from "../people/reminders.js";
import { incidentsBlock, wireIncidents } from "../safety/accidents.js";
import { KINDS, ck, hasProblem } from "../safety/checklists.js";
import { checkCard, openCheck } from "../safety/checks.js";
import { raAll, raBlock, wireRa } from "../safety/rams.js";
export { empChecks, ownerChecks };
const REP_ICON = {
  ra: "📋",
  vehicle:
    '<svg class="digsvg" viewBox="0 0 64 48" width="1.25em" height="1em"><path d="M4 14a3 3 0 0 1 3-3h31v26H4z" fill="#f4f4f4" stroke="#555" stroke-width="1.5"/><path d="M38 15h10c2 0 3.5 1 4.5 2.5L58 26c1 1.5 1.5 3 1.5 4.5V37H38z" fill="#f4f4f4" stroke="#555" stroke-width="1.5"/><path d="M41 18h7l5 8H41z" fill="#bfe3f5" stroke="#555" stroke-width="1"/><rect x="4" y="27" width="55.5" height="4" fill="#7F191D"/><rect x="2" y="35" width="59" height="3" rx="1.5" fill="#3b3b3b"/><circle cx="15" cy="38" r="5.5" fill="#2b2b2b"/><circle cx="15" cy="38" r="2.2" fill="#aaa"/><circle cx="49" cy="38" r="5.5" fill="#2b2b2b"/><circle cx="49" cy="38" r="2.2" fill="#aaa"/><rect x="56" y="31" width="3.5" height="2.5" fill="#ffd36b"/></svg>',
  digger:
    '<svg class="digsvg" viewBox="0 0 64 48" width="1.25em" height="1em"><rect x="4" y="36" width="34" height="9" rx="4.5" fill="#3b3b3b"/><circle cx="9" cy="40.5" r="2.6" fill="#9a9a9a"/><circle cx="21" cy="40.5" r="2.6" fill="#9a9a9a"/><circle cx="33" cy="40.5" r="2.6" fill="#9a9a9a"/><rect x="6" y="27" width="30" height="9" rx="2" fill="#f2b705"/><path d="M12 27V15a2 2 0 0 1 2-2h11l4 8v6z" fill="#f2b705"/><path d="M15 16h8.5l2.8 5.5H15z" fill="#bfe3f5"/><path d="M33 27 47 9l3 2-12 18z" fill="#e0a100"/><path d="M47 9l9 13-3 2-8-12z" fill="#e0a100"/><path d="M52 22l8 3-2 11c-5 1-9-2-10-6z" fill="#555"/></svg>',
  trailer:
    '<svg class="digsvg" viewBox="0 0 64 48" width="1.25em" height="1em"><path d="M2 31h12" stroke="#555" stroke-width="2.5" stroke-linecap="round"/><circle cx="3" cy="31" r="2.2" fill="#555"/><rect x="12" y="20" width="48" height="12" rx="1.5" fill="#9aa3ab" stroke="#4a5158" stroke-width="1.5"/><path d="M12 24h48M12 28h48" stroke="#7d868e" stroke-width="1"/><path d="M57 20l5-8" stroke="#4a5158" stroke-width="2.5" stroke-linecap="round"/><path d="M28 32h20v3H28z" fill="#3b3b3b"/><circle cx="33" cy="37" r="5.5" fill="#2b2b2b"/><circle cx="33" cy="37" r="2.2" fill="#aaa"/><circle cx="45" cy="37" r="5.5" fill="#2b2b2b"/><circle cx="45" cy="37" r="2.2" fill="#aaa"/><rect x="58" y="29" width="3" height="3" fill="#e11d2a"/></svg>',
  machine: "⚙️",
  scaffold: "🏗️",
  excavation: "🕳️",
  ladder: "🪜",
  incidents: "⚠️",
};
function reportCats() {
  return Object.entries(KINDS)
    .map(([k, K]) => [k, K.name + (K.inspect ? " inspections" : " checks")])
    .concat([
      ["ra", "Risk assessments (RAMS)"],
      ["incidents", "Accidents & near misses"],
    ]);
}
function reportsHome(owner) {
  const today = iso(new Date());
  const checks = owner
    ? allTeam("checks")
    : S.mine.checks.map((c) => Object.assign({ who: S.me }, c));
  const inc = owner
    ? allTeam("signoffs").filter((x) => x.type === "incident")
    : S.mine.signoffs.filter((x) => x.type === "incident");
  const due = owner ? [] : mySchedDue();
  const tile = ([k, l]) => {
    let sub = "",
      badge = 0,
      bad = false;
    if (k === "ra") {
      const ra = raAll(owner);
      badge = owner ? ra.filter((x) => !x.reviewedAt).length : 0;
      sub = badge ? badge + " to review" : ra.length ? ra.length + " done" : "Fill one in here";
    } else if (k === "incidents") {
      badge = owner ? inc.filter((x) => x.status !== "reviewed").length : 0;
      sub = owner
        ? badge
          ? badge + " to review"
          : inc.length + " reported"
        : inc.length
          ? inc.length + " reported"
          : "Report one here";
    } else {
      const mine = checks.filter((c) => ck(c).kind === k);
      const wk = mine.filter(inWeek).length;
      const def = mine.filter((c) => hasProblem(c) && !c.fixed).length;
      const td = mine.some((c) => c.date === today);
      const dueK = due.filter((x) => x.eq.kind === k).length;
      badge = owner ? def : dueK;
      bad = owner && def > 0;
      sub = owner
        ? def
          ? def + " defect" + (def === 1 ? "" : "s") + " to fix"
          : wk + " this week"
        : dueK
          ? "Due now"
          : td
            ? "Done today ✓"
            : wk + " this week";
    }
    return `<button type="button" class="folder rcat" data-r="${k}"><span class="ricon" aria-hidden="true">${REP_ICON[k] || "📋"}</span><span class="fname">${esc(l)}</span><span class="who" style="${bad ? "color:var(--danger);font-weight:600" : ""}">${esc(sub)}</span>${badge ? `<span class="badge">${badge}</span>` : ""}</button>`;
  };
  const cats = reportCats();
  const ids = teamIds();
  const notToday = owner
    ? ids.filter((id) => !(S.data.checks[id] || []).some((c) => c.date === today)).map(nameOf)
    : [];
  const doneToday = !owner
    ? [...new Set(S.mine.checks.filter((c) => c.date === today).map((c) => KINDS[ck(c).kind].name))]
    : [];
  $("main").innerHTML =
    `${owner ? (ids.length && notToday.length ? `<div class="notice">No check done yet today: ${esc(notToday.join(", "))}</div>` : "") : `<div class="notice">Do a check before you use a vehicle, digger or machine each day. ${doneToday.length ? `<b>Done today:</b> ${esc(doneToday.join(", "))}.` : "<b>No checks done today yet.</b>"}</div>`}
    <div class="flabel">Checks</div><div class="folders">${cats
      .filter(([k]) => KINDS[k] && !KINDS[k].inspect)
      .map(tile)
      .join("")}</div>
    <div class="flabel" style="margin-top:6px">Inspections</div><div class="folders">${cats
      .filter(([k]) => KINDS[k] && KINDS[k].inspect)
      .map(tile)
      .join("")}</div>
    <div class="flabel" style="margin-top:6px">Safety</div><div class="folders">${tile(cats.find((c) => c[0] === "ra"))}${tile(cats.find((c) => c[0] === "incidents"))}</div>
    ${owner ? `<div class="actions" style="margin-top:8px"><button class="btn" id="chkdl" type="button">Download check history</button></div>` : ""}`;
  $("main")
    .querySelectorAll(".rcat")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.rcat = b.dataset.r;
          render();
        }),
    );
  if ($("chkdl")) $("chkdl").onclick = openCheckHistory;
}
const repBack = () =>
  `<div class="actions"><button class="btn" id="rep-back" type="button">‹ All reports</button></div>`;
function wireRepBack() {
  $("rep-back").onclick = () => {
    S.f.rcat = "";
    render();
  };
}
function empChecks() {
  const k = S.f.rcat;
  if (!k || !(KINDS[k] || k === "incidents" || k === "ra")) {
    reportsHome(false);
    return;
  }
  if (k === "ra") {
    $("main").innerHTML = repBack() + raBlock(false);
    wireRepBack();
    wireRa(false);
    return;
  }
  if (k === "incidents") {
    $("main").innerHTML = repBack() + incidentsBlock(false);
    wireRepBack();
    wireIncidents(false);
    return;
  }
  const K = KINDS[k];
  const mine = S.mine.checks
    .filter((c) => ck(c).kind === k)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
  const wc = mine.filter(inWeek),
    older = mine.filter((c) => !inWeek(c)).slice(0, 15);
  const due = mySchedDue().filter((x) => x.eq.kind === k);
  $("main").innerHTML =
    repBack() +
    `<div class="actions"><button class="btn primary" type="button" id="rep-new">+ New ${esc(K.name)} ${K.inspect ? "inspection" : "check"}</button></div>
    ${due.length ? `<div class="notice warn">${due.map((x) => `<b>${esc(x.eq.name)}</b> is due (${x.eq.freq === "weekly" ? "weekly" : "daily"} check).`).join(" ")}</div>` : ""}
    <div class="day"><div class="dayh"><span>This week</span><span class="sum">${wc.length}</span></div>${wc.length ? wc.map((c) => checkCard(c, false)).join("") : '<div class="nothing">None this week.</div>'}</div>
    ${older.length ? `<div class="day"><div class="dayh"><span>Earlier</span><span class="sum">${older.length}</span></div>${older.map((c) => checkCard(c, false)).join("")}</div>` : ""}`;
  wireRepBack();
  $("rep-new").onclick = () => openCheck(k, null, due[0] ? due[0].eq.name : undefined);
  $("main")
    .querySelectorAll(".chk")
    .forEach((b) => {
      const go = () => {
        const c = S.mine.checks.find((x) => x.id === b.dataset.c);
        if (c) openCheck(ck(c).kind, c);
      };
      b.onclick = go;
      b.onkeydown = (e) => {
        if (e.key === "Enter") go();
      };
    });
}
function ownerChecks() {
  const k = S.f.rcat;
  if (!k || !(KINDS[k] || k === "incidents" || k === "ra")) {
    reportsHome(true);
    return;
  }
  if (k === "ra") {
    $("main").innerHTML = repBack() + raBlock(true);
    wireRa(true);
    wireRepBack();
    return;
  }
  if (k === "incidents") {
    $("main").innerHTML = repBack() + incidentsBlock(true);
    wireRepBack();
    wireIncidents(true);
    return;
  }
  const K = KINDS[k];
  const all = allTeam("checks").filter((c) => ck(c).kind === k);
  const openDef = all
    .filter((c) => hasProblem(c) && !c.fixed)
    .sort((a, b) => b.date.localeCompare(a.date));
  const week = all
    .filter(inWeek)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
  const sched = S.equipment
    .filter((eq) => eq.kind === k && eq.assignee && eq.freq && eq.freq !== "none")
    .map((eq) => {
      const who = eq.assignee;
      const cs = who === S.me ? S.mine.checks : S.data.checks[who] || [];
      return Object.assign({ eq, who }, schedStatus(eq, cs));
    });
  let html =
    repBack() +
    `<div class="totals"><div class="tot ${openDef.length ? "bad" : ""}"><div class="n">${openDef.length}</div><div class="l">Defects open</div></div><div class="tot"><div class="n">${week.length}</div><div class="l">${esc(K.name)} ${K.inspect ? "inspections" : "checks"} this week</div></div></div>`;
  if (sched.length)
    html += `<div class="card"><div class="cardbody" style="border:0"><b>Scheduled</b>${sched
      .map(
        (
          x,
        ) => `<div class="citem"><span><b>${esc(x.eq.name)}</b> <span class="who">· ${esc(nameOf(x.who))} · ${x.eq.freq === "weekly" ? "weekly, due " + DOW[+(x.eq.dueDay ?? 1)] : "daily"}${x.last ? " · last " + shortDay(x.last) : " · never done"}</span></span>
    ${x.state === "done" ? '<span class="tag ok">Done</span>' : x.state === "overdue" ? '<span class="tag bad">Overdue</span>' : x.state === "due" ? '<span class="tag day">Due today</span>' : x.state === "upcoming" ? '<span class="tag">Not due yet</span>' : '<span class="tag">Weekend</span>'}</div>`,
      )
      .join("")}</div></div>`;
  if (!equipOf(k).length && !K.sites)
    html += `<div class="notice">Add your ${esc(K.plural.toLowerCase())} in <b>Setup</b> so people can pick them from a list.</div>`;
  if (openDef.length)
    html += `<div class="day"><div class="dayh"><span>Defects to fix</span><span class="sum">${openDef.length}</span></div>${openDef.map((c) => checkCard(c, true, c.who)).join("")}</div>`;
  const rest = week.filter((c) => !openDef.includes(c));
  html += `<div class="day"><div class="dayh"><span>This week</span><span class="sum">${week.length}</span></div>${rest.length ? rest.map((c) => checkCard(c, true, c.who)).join("") : '<div class="nothing">Nothing else this week.</div>'}</div>`;
  $("main").innerHTML = html;
  wireRepBack();
  $("main")
    .querySelectorAll(".chk .fix")
    .forEach((cb) =>
      cb.addEventListener("change", async () => {
        const row = cb.closest(".chk");
        cb.disabled = true;
        try {
          await S.db
            .doc("sheets/" + row.dataset.w + "/checks/" + row.dataset.c)
            .update({ fixed: cb.checked });
          toast(cb.checked ? "Marked as fixed" : "Marked as not fixed");
        } catch (e) {
          toast("Couldn't save");
          cb.checked = !cb.checked;
        }
        cb.disabled = false;
      }),
    );
  $("main")
    .querySelectorAll(".chk")
    .forEach((row) =>
      row.addEventListener("click", (ev) => {
        if (ev.target.closest("label")) return;
        const c = all.find((x) => x.id === row.dataset.c && x.who === row.dataset.w);
        if (c) checkDetail(c);
      }),
    );
}
