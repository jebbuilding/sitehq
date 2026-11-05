/* ================= PLANNER: more detail, list view, day view, import ================= */
import { chatPeople } from "../chat/chat.js";
import {
  $,
  addDays,
  dayLabel,
  esc,
  iso,
  monday,
  parse,
  shortDay,
  stamp,
  toast,
} from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { csvSave } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { myOpenPrompts } from "../people/reminders.js";
import { openPlanEditor } from "./board.js";
import { PTYPES, VIS, entryChip, onDay, planEntries } from "./time-off.js";
import { same } from "../sites/project-pages.js";
import { openJob } from "../survey/door-window-survey.js";
export {
  openDayPlan,
  openPlanDetail,
  openPlanImport,
  planListHtml,
  planMatch,
  planPeopleNames,
  planSeen,
  planTimeTxt,
};
function planPeopleNames(p, owner) {
  return (p.people || [])
    .map((id) =>
      owner
        ? nameOf(id)
        : id === S.me
          ? "You"
          : (chatPeople().find((x) => x.id === id) || {}).name || "",
    )
    .filter(Boolean);
}
function planTimeTxt(p) {
  return p.time ? p.time + (p.endTime ? "–" + p.endTime : "") : "";
}
function planMatch(p, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return [p.title, p.notes, p.site, p.jobTitle, p.contact, PTYPES[p.type]]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
function planSeen(id) {
  const ps = allTeam("signoffs").filter(
    (x) => x.type === "prompt" && x.form === "plan" && x.ref === id && x.status !== "cancelled",
  );
  const by = {};
  ps.forEach((x) => {
    const c = by[x.who];
    if (!c || (x.created || 0) > (c.created || 0)) by[x.who] = x;
  });
  return Object.values(by);
}
function openPlanDetail(p) {
  const owner = ownerMode();
  if (p.auto === "job") {
    openJob(p.jobId);
    return;
  }
  if (p.pending) {
    toast("Waiting for James to answer");
    return;
  }
  if (!owner)
    myOpenPrompts()
      .filter((x) => x.form === "plan" && x.ref === p.id)
      .forEach((x) =>
        S.db
          .doc("sheets/" + S.me + "/signoffs/" + x.id)
          .update({ status: "done", doneAt: Date.now(), seenAt: Date.now() })
          .catch(() => {}),
      );
  const seen = owner ? planSeen(p.id) : [];
  const names = planPeopleNames(p, owner),
    tel = p.phone ? p.phone.replace(/\s+/g, "") : "";
  const rows = [
    [
      "When",
      shortDay(p.from) +
        (p.to && p.to !== p.from ? " – " + shortDay(p.to) : "") +
        (planTimeTxt(p) ? " · " + planTimeTxt(p) : ""),
    ],
    ["Site", p.site],
    ["Job sheet", p.jobTitle],
    ["People", names.join(", ")],
    ["Contact", [p.contact, p.phone].filter(Boolean).join(" · ")],
    owner
      ? [
          "Who can see it",
          p.vis === "me" ? "Only you" : p.vis === "people" ? "Only the people on it" : "Everyone",
        ]
      : null,
  ].filter((r) => r && r[1]);
  openViewer(`<span class="tag t-${esc(p.type)} ptag">${esc(PTYPES[p.type] || "")}</span>
    <h3 style="font-family:var(--f-display);font-size:24px;margin:8px 0 4px;color:var(--accent);text-transform:uppercase;line-height:1.15">${esc(p.title)}</h3>
    <div class="details">${rows.map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${p.notes ? `<div class="flabel" style="margin-top:12px">Notes</div><div class="talkbody pnotes">${esc(p.notes)}</div>` : ""}
    ${
      seen.length
        ? `<div class="flabel" style="margin-top:12px">Seen by ${seen.filter((x) => x.status === "done").length} of ${seen.length}</div><div class="seenlist">${seen
            .sort((a, b) => (a.status === "done" ? 0 : 1) - (b.status === "done" ? 0 : 1))
            .map(
              (x) =>
                `<div class="citem"><span>${esc(nameOf(x.who))}</span>${x.status === "done" ? `<span class="tag ok">Seen ${esc(stamp(x.seenAt || x.doneAt))}</span>` : '<span class="tag day">Not opened yet</span>'}</div>`,
            )
            .join("")}</div>`
        : ""
    }
    ${(p.files || []).length ? `<div class="flabel" style="margin-top:12px">Attached</div><div class="filerow">${p.files.map((f, i) => `<button type="button" class="pillbtn pf-open" data-i="${i}">📎 ${esc(f.name || "File " + (i + 1))}</button>`).join("")}</div>` : ""}
    <div class="actions" style="margin-top:14px">${tel ? `<a class="btn" href="tel:${esc(tel)}" style="text-decoration:none;color:var(--ink)">📞 Call ${esc(p.contact || "contact")}</a>` : ""}${p.jobId && S.jobs.find((j) => j.id === p.jobId) ? `<button type="button" class="btn" id="pd-job">Open job sheet</button>` : ""}
      ${owner ? `<button type="button" class="btn primary" id="pd-edit">Edit</button><button type="button" class="btn" id="pd-dup">Copy to another date</button>` : ""}</div>`);
  $("viewer")
    .querySelectorAll(".pf-open")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const f = p.files[+b.dataset.i];
          openFile(f.id, f.name, f.type);
        }),
    );
  if ($("pd-job"))
    $("pd-job").onclick = () => {
      closeViewer();
      openJob(p.jobId);
    };
  if ($("pd-edit"))
    $("pd-edit").onclick = () => {
      closeViewer();
      openPlanEditor(p);
    };
  if ($("pd-dup"))
    $("pd-dup").onclick = () => {
      closeViewer();
      const c = Object.assign({}, p);
      delete c.id;
      delete c.created;
      delete c.series;
      openPlanEditor(null, p.from, c);
    };
}
function openDayPlan(di) {
  const owner = ownerMode();
  const q = S.f.pq || "",
    who = owner ? S.f.pwho || "" : "",
    psite = S.f.psite || "";
  const list = planEntries()
    .filter(
      (p) =>
        onDay(p, di) &&
        planMatch(p, q) &&
        (!who || (p.people || []).includes(who)) &&
        (!psite || (psite.startsWith("job:") ? p.jobId === psite.slice(4) : same(p.site, psite))),
    )
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  openViewer(`<h3 style="font-family:var(--f-display);font-size:22px;margin:0 0 8px">${esc(dayLabel(parse(di)))}</h3>
    <div class="plist">${list.map((p) => entryChip(p, owner)).join("") || '<div class="nothing">Nothing planned.</div>'}</div>
    ${owner ? `<div class="actions" style="margin-top:12px"><button type="button" class="btn primary" id="dp-add">+ Add to this day</button></div>` : ""}`);
  $("viewer")
    .querySelectorAll(".pentry")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = list.find((x) => x.id === b.dataset.p);
          if (p) {
            closeViewer();
            openPlanDetail(p);
          }
        }),
    );
  if ($("dp-add"))
    $("dp-add").onclick = () => {
      closeViewer();
      openPlanEditor(null, di);
    };
}
function planListHtml(shown, owner) {
  const today = iso(new Date());
  const from = S.f.plfrom || today;
  const to = iso(addDays(parse(from), 83));
  const items = shown.filter((p) => (p.to || p.from) >= from && p.from <= to);
  let html = `<div class="mhead"><button type="button" class="iconbtn" id="pll-prev" aria-label="Earlier"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3 5 8l5 5"/></svg></button><b style="flex:1;text-align:center">${esc(shortDay(from))} – ${esc(shortDay(to))}</b>${from !== today ? `<button type="button" class="pillbtn" id="pll-today">Today</button>` : ""}<button type="button" class="iconbtn" id="pll-next" aria-label="Later"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3l5 5-5 5"/></svg></button></div>`;
  if (!items.length)
    return (
      html +
      '<div class="empty"><strong>Nothing planned in these 12 weeks</strong>Use the arrows to look further ahead or back.</div>'
    );
  let lastM = "";
  for (let d = parse(from); iso(d) <= to; d = addDays(d, 1)) {
    const di = iso(d);
    const list = items
      .filter((p) => p.from === di || (di === from && p.from < from))
      .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    if (!list.length) continue;
    const m = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (m !== lastM) {
      html += `<div class="pmonth">${esc(m)}</div>`;
      lastM = m;
    }
    html += `<div class="day pday"><div class="dayh ${di === today ? "today" : ""}"><span>${esc(dayLabel(d))}${di === today ? " · Today" : ""}</span></div>${list.map((p) => entryChip(p, owner)).join("")}</div>`;
  }
  return html;
}
function parsePlanDate(v) {
  v = String(v || "").trim();
  if (!v) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(v);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(v);
  return isNaN(d) ? "" : iso(d);
}
function parsePlanTime(v) {
  v = String(v || "").trim();
  const m = /^(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?$/i.exec(v);
  if (!m) return "";
  let h = +m[1];
  const mi = m[2] || "00";
  if (m[3]) {
    if (/pm/i.test(m[3]) && h < 12) h += 12;
    if (/am/i.test(m[3]) && h === 12) h = 0;
  }
  return h < 24 ? String(h).padStart(2, "0") + ":" + mi : "";
}
function splitRow(line) {
  const tab = line.includes("\t");
  if (tab) return line.split("\t").map((x) => x.trim());
  const out = [];
  let cur = "",
    q = false;
  for (const ch of line) {
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
function parsePlanImport(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (!lines.length) return { rows: [], bad: 0 };
  let start = 0;
  const h = splitRow(lines[0]).map((x) => x.toLowerCase());
  const col = {
    date: 0,
    end: 1,
    time: 2,
    endTime: 3,
    title: 4,
    type: 5,
    site: 6,
    people: 7,
    notes: 8,
  };
  if (h.some((x) => /date|what|title/.test(x))) {
    start = 1;
    const f = (re) => h.findIndex((x) => re.test(x));
    col.date = f(/^(start )?date|^from|^day/);
    col.end = f(/end date|^to$|until/);
    col.time = f(/^(start )?time|^from time/);
    col.endTime = f(/end time|finish/);
    col.title = f(/what|title|task|description/);
    col.type = f(/type|kind/);
    col.site = f(/site|job|address/);
    col.people = f(/people|who|trade|staff/);
    col.notes = f(/note/);
  }
  const ids = teamIds();
  const byName = (n) => {
    n = n.trim().toLowerCase();
    if (!n) return null;
    return (
      ids.find((id) => nameOf(id).toLowerCase() === n) ||
      ids.find((id) => nameOf(id).toLowerCase().split(" ")[0] === n) ||
      null
    );
  };
  const typeOf = (t) => {
    t = String(t || "")
      .trim()
      .toLowerCase();
    const e = Object.entries(PTYPES).find(([k, l]) => k === t || l.toLowerCase() === t);
    return e
      ? e[0]
      : /key/.test(t)
        ? "keydate"
        : /deliver/.test(t)
          ? "delivery"
          : /inspect|visit|control/.test(t)
            ? "inspection"
            : /meet/.test(t)
              ? "meeting"
              : /holiday|off|leave/.test(t)
                ? "holiday"
                : "work";
  };
  const rows = [];
  let bad = 0;
  lines.slice(start).forEach((l) => {
    const c = splitRow(l),
      g = (i) => (i >= 0 ? c[i] || "" : "");
    const from = parsePlanDate(g(col.date)),
      title = g(col.title);
    if (!from || !title) {
      bad++;
      return;
    }
    const to = parsePlanDate(g(col.end));
    const people = g(col.people)
      .split(/[;\/,&]| and /)
      .map(byName)
      .filter(Boolean);
    rows.push({
      title: title.slice(0, 100),
      type: typeOf(g(col.type)),
      from,
      to: to && to >= from ? to : from,
      time: parsePlanTime(g(col.time)),
      endTime: parsePlanTime(g(col.endTime)),
      site: g(col.site).slice(0, 120),
      people: [...new Set(people)],
      notes: g(col.notes).slice(0, 1000),
    });
  });
  return { rows, bad };
}
function openPlanImport() {
  openSheet(
    `<h3 id="sheettitle">Add lots to the planner</h3>
    <div class="who">Copy the rows from Excel or Google Sheets and paste them below, or choose a CSV file. Columns in this order (or with these headings): <b>Date, End date, Start time, End time, What, Type, Site, People, Notes</b>. Only Date and What are needed. Dates like 03/11/2026 are fine; people can be first names.</div>
    <button type="button" class="pillbtn" id="pi-tpl" style="align-self:flex-start">Download a template (CSV)</button>
    <label for="pi-file">CSV file (optional)<input id="pi-file" type="file" accept=".csv,text/csv,text/plain"></label>
    <label for="pi-text">Or paste here<textarea id="pi-text" style="min-height:160px;font-family:var(--f-mono);font-size:13px" placeholder="03/11/2026&#9;05/11/2026&#9;08:00&#9;&#9;Kitchen fit&#9;Work&#9;Kennford&#9;Sam&#9;Units arrive Monday"></textarea></label>
    <div><div class="flabel">Who can see them?</div><div class="seg" id="pi-vis">${Object.entries(
      VIS,
    )
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${k === "all"}">${l}</button>`,
      )
      .join("")}</div></div>
    <div class="notice" id="pi-prev" style="margin:0">Paste rows to see a preview.</div>
    ${formFoot(false, "Add to planner")}`,
    async () => {
      const { rows } = parsePlanImport($("pi-text").value);
      if (!rows.length) {
        showErr("No rows with a date and a 'What' found.");
        return;
      }
      const v = $("pi-vis").querySelector('[aria-pressed="true"]').dataset.v;
      const coll = v === "me" ? "planprivate" : "plan";
      if (v === "people" && rows.some((r) => !r.people.length)) {
        showErr(
          "Some rows have no people, so nobody could see them. Pick Everyone, or add people to every row.",
        );
        return;
      }
      $("f-save").disabled = true;
      let n = 0;
      try {
        for (const r of rows) {
          $("f-save").textContent = `Adding ${++n} of ${rows.length}…`;
          await S.db
            .doc(coll + "/" + newId())
            .set(
              Object.assign(
                {},
                r,
                { jobId: "", jobTitle: "", created: Date.now(), updated: Date.now() },
                v === "me" ? {} : { vis: v },
              ),
            );
        }
        closeForm();
        S.week = monday(parse(rows.map((r) => r.from).sort()[0]));
        toast(`Added ${rows.length} to the planner`);
        render();
      } catch (e) {
        showErr(`Stopped after ${n - 1}. Check your connection and try the rest.`);
        $("f-save").disabled = false;
        $("f-save").textContent = "Add to planner";
      }
    },
    "pi-text",
  );
  const prev = () => {
    const { rows, bad } = parsePlanImport($("pi-text").value);
    $("pi-prev").innerHTML = rows.length
      ? `<b>${rows.length} entr${rows.length === 1 ? "y" : "ies"} ready</b>${bad ? `, ${bad} row${bad === 1 ? "" : "s"} skipped (no date or no 'What')` : ""}.<br>${rows
          .slice(0, 6)
          .map(
            (r) =>
              `${esc(shortDay(r.from))}${r.to !== r.from ? "–" + esc(shortDay(r.to)) : ""}: ${esc(r.title)} <span class="who">(${esc(PTYPES[r.type])}${r.site ? ", " + esc(r.site) : ""}${r.people.length ? ", " + r.people.map(nameOf).map(esc).join(", ") : ""})</span>`,
          )
          .join("<br>")}${rows.length > 6 ? "<br>…" : ""}`
      : "Paste rows to see a preview.";
  };
  $("pi-text").addEventListener("input", prev);
  $("pi-file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    $("pi-text").value = await f.text();
    prev();
  };
  $("pi-vis")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $("pi-vis")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
  $("pi-tpl").onclick = () =>
    csvSave("Planner template.csv", [
      ["Date", "End date", "Start time", "End time", "What", "Type", "Site", "People", "Notes"],
      [
        iso(addDays(new Date(), 3)).split("-").reverse().join("/"),
        "",
        "08:00",
        "",
        "Skip delivery",
        "Delivery",
        siteNames()[0] || "",
        "",
        "Front drive",
      ],
    ]);
}
