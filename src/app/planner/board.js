/* ===== PLANNER v2: full-screen board (people × days), job timeline, tidy menu, day sheet for trades ===== */
import { initials } from "../chat/chat.js";
import { clientSites } from "../clients/address-book.js";
import { clStage } from "../clients/clients.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { clAddr } from "../clients/stages-planner.js";
import { pickField, pickVal } from "../core/fields.js";
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
import { armDelete, closeForm, formFoot, myDoc, openSheet, showErr } from "../core/sheet.js";
import { S, inWeek, liveSite, ownerMode, siteNames, weekDays } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { isImg, uploadFile } from "../files/files.js";
import { newId, submitJob } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { noBin } from "../owner/deleted-items.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { nlOn } from "../owner/today.js";
import { avatarHtml } from "../people/profile-photos.js";
import { siteRec } from "../photos/photos.js";
import { diaryHtml, diaryRows, wireDiary } from "./diary.js";
import {
  plClashHtml,
  plClashes,
  plCopyLastWeek,
  plSendWeek,
  plWhereHtml,
  plWireWhere,
} from "./planner-extras.js";
import {
  LEAVE_TYPES,
  PTYPES,
  VIS,
  entryChip,
  leaveOf,
  onDay,
  planEntries,
  workDays,
} from "./time-off.js";
import { openDayPlan, openPlanDetail, openPlanImport, planListHtml, planMatch } from "./views.js";
import { wpPlannerTop } from "./weather-plan.js";
import { shrinkImage } from "../safety/training.js";
import { myJobs } from "../sites/job-sheets.js";
import { same } from "../sites/project-pages.js";
import { onSiteNow } from "../sites/roll-call.js";
import { myName } from "../survey/door-window-survey.js";
export {
  answerLeave,
  keyDatesFor,
  keyTimeline,
  openKeyDates,
  openPlanEditor,
  openPlanView,
  pbEntryDays,
  pbPlanWeek,
  pbSiteOf,
  pbSiteShort,
  plannerView,
  siteHue,
};
const PB_HUES = [210, 150, 25, 285, 0, 190, 60, 330, 110, 245];
function siteHue(site) {
  const all = [
    ...new Set(
      (S.plan || [])
        .concat(S.planPrivate || [])
        .map(pbSiteOf)
        .filter(Boolean)
        .map((x) => x.toLowerCase()),
    ),
  ].sort();
  let i = all.indexOf(String(site || "").toLowerCase());
  if (i < 0) {
    let h = 0;
    for (const ch of String(site || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    i = h;
  }
  return PB_HUES[i % PB_HUES.length];
}
const pbShort = (t) =>
  String(t || "")
    .replace(/^(Visit|Due|Work|Meeting|Delivery):\s*/i, "")
    .split(/,|·|\(/)[0]
    .trim();
const pbSiteShort = (s) =>
  String(s || "")
    .split(",")[0]
    .replace(/^\d+\s+/, "")
    .trim();
function pbSiteOf(p) {
  return (
    p.site ||
    (p.clientId ? ((S.clients || []).find((c) => c.id === p.clientId) || {}).name : "") ||
    ""
  );
}
function pbChipStyle(p) {
  if (p.type === "holiday") return "";
  const site = pbSiteOf(p);
  if (!site) return `--pc:var(--c-${p.type === "meeting" ? "meet" : "work"})`;
  return `--pc:hsl(${siteHue(site)} 55% 42%)`;
}
function pbPlanWeek() {
  return iso(monday(S.week || new Date()));
}
function pbEntryDays(p) {
  const out = [];
  let d = parse(p.from);
  const to = parse(p.to || p.from);
  while (d <= to && out.length < 400) {
    out.push(iso(d));
    d = addDays(d, 1);
  }
  return out;
}
function pbPending() {
  return allTeam("signoffs")
    .filter((s) => s.type === "leave" && s.status === "pending")
    .sort((a, b) => a.from.localeCompare(b.from));
}
/* jobs that are won / on site but have nothing in the planner for the next 4 weeks */
function pbWaiting(entries) {
  const from = iso(new Date()),
    to = iso(addDays(new Date(), 28));
  const out = [];
  (S.clients || [])
    .filter((c) => ["won", "onsite"].includes(c.stage))
    .forEach((c) => {
      const sites = clientSites(c);
      const names = sites.length ? sites : [c.site].filter(Boolean);
      const has = entries.some(
        (p) =>
          (p.to || p.from) >= from &&
          p.from <= to &&
          p.type !== "holiday" &&
          (names.some((n) => same(n, p.site)) || p.clientId === c.id),
      );
      if (!has) out.push({ name: c.name, site: names[0] || clAddr(c) || "", c });
    });
  return out;
}
function pbMenu(anchor, owner) {
  const old = document.querySelector(".pb-menu");
  if (old) {
    old.remove();
    return;
  }
  const pending = pbPending().length;
  const d = document.createElement("div");
  d.className = "pb-menu";
  const items = owner
    ? [
        ["add", "➕ Add to planner"],
        ["copy", "📋 Copy last week into this week"],
        ["send", "📣 Send this week to the team"],
        ["key", "📌 Key dates for a job"],
        ["stages", "🧱 Job timeline"],
        ["leave", "🌴 Book time off for someone"],
        ["req", `✅ Time-off requests${pending ? " (" + pending + ")" : ""}`],
        ["imp", "📥 Add lots (from a spreadsheet)"],
        ["find", "🔍 Search & filter"],
        ["list", "📋 List view"],
        ["year", "🗓 Year view"],
        ["taken", "📊 Time off taken this year"],
      ]
    : [
        ["leave", "🌴 Ask for time off"],
        ["list", "📋 List view"],
        ["month", "🗓 Month view"],
      ];
  d.innerHTML = items.map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join("");
  document.body.appendChild(d);
  const r = anchor.getBoundingClientRect();
  d.style.top = r.bottom + 6 + window.scrollY + "px";
  d.style.right = Math.max(8, window.innerWidth - r.right) + "px";
  const close = () => {
    d.remove();
    document.removeEventListener("click", onDoc, true);
  };
  const onDoc = (e) => {
    if (!d.contains(e.target)) close();
  };
  setTimeout(() => document.addEventListener("click", onDoc, true), 0);
  d.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () => {
        close();
        const k = b.dataset.k;
        const today = iso(new Date());
        if (k === "add") openPlanEditor(null, today);
        else if (k === "copy") plCopyLastWeek();
        else if (k === "send") plSendWeek();
        else if (k === "key")
          openKeyDates(S.f.psite && !S.f.psite.startsWith("job:") ? S.f.psite : "", "");
        else if (k === "stages") {
          S.f.pmode = "stages";
          render();
        } else if (k === "leave") openLeave(owner);
        else if (k === "req") pbRequests();
        else if (k === "imp") openPlanImport();
        else if (k === "find") pbFind();
        else if (k === "list") {
          S.f.pmode = "list";
          render();
        } else if (k === "year") {
          S.f.pmode = "year";
          S.f.pyear = new Date().getFullYear();
          render();
        } else if (k === "month") {
          S.f.pmode = "month";
          render();
        } else if (k === "taken") pbTaken();
      }),
  );
}
function pbRequests() {
  const pending = pbPending();
  openViewer(
    `<h3 style="font-family:var(--f-display);font-size:22px;margin:0 0 8px;color:var(--accent)">Time-off requests</h3>${pending.length ? pending.map((l) => leaveCard(l, true)).join("") : '<div class="nothing">Nothing waiting for you.</div>'}`,
  );
  wireLeave(true, $("viewer-body"));
}
function pbTaken() {
  const yr = String(new Date().getFullYear());
  openViewer(
    `<h3 style="font-family:var(--f-display);font-size:22px;margin:0 0 4px;color:var(--accent)">Time off taken in ${yr}</h3><div class="who">Approved working days off, not counting weekends.</div><div class="details" style="margin-top:8px">${
      teamIds()
        .map((id) => {
          const ls = leaveOf(S.data.signoffs[id]).filter(
            (l) => l.status === "approved" && l.from.startsWith(yr),
          );
          const tot = {};
          ls.forEach((l) => {
            tot[l.leaveType] = (tot[l.leaveType] || 0) + workDays(l.from, l.to, l.half);
          });
          return `<div class="drow"><span>${esc(nameOf(id))}</span><span>${
            Object.entries(tot)
              .map(([k, v]) => `${LEAVE_TYPES[k] || k} ${v} day${v === 1 ? "" : "s"}`)
              .join(" · ") || "None"
          }</span></div>`;
        })
        .join("") || '<div class="nothing">No employees yet.</div>'
    }</div>`,
  );
}
function pbFind() {
  const entries = planEntries();
  const siteOpts = [
    ...new Set(siteNames().concat(entries.map((p) => p.site).filter(liveSite))),
  ].sort();
  openSheet(
    `<h3 id="sheettitle">🔍 Search &amp; filter the planner</h3>
    <label for="pf-q">Search<input id="pf-q" type="search" value="${esc(S.f.pq || "")}" placeholder="e.g. skip, scaffold, Kahn"></label>
    <label for="pf-site">Site or job<select id="pf-site"><option value="">All sites and jobs</option>${siteOpts.map((x) => `<option value="${esc(x)}" ${x === (S.f.psite || "") ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
    <label for="pf-who">Person<select id="pf-who"><option value="">Everyone</option>${teamIds()
      .map(
        (id) =>
          `<option value="${esc(id)}" ${id === (S.f.pwho || "") ? "selected" : ""}>${esc(nameOf(id))}</option>`,
      )
      .join("")}</select></label>
    ${formFoot(false, "Show")}`,
    () => {
      S.f.pq = $("pf-q").value.trim();
      S.f.psite = $("pf-site").value;
      S.f.pwho = $("pf-who").value;
      closeForm();
      render();
    },
    "pf-q",
  );
  $("form").insertAdjacentHTML(
    "beforeend",
    `<button type="button" class="linkbtn" id="pf-clear" style="margin-top:6px">Clear search and filters</button>`,
  );
  $("pf-clear").onclick = () => {
    S.f.pq = "";
    S.f.psite = "";
    S.f.pwho = "";
    closeForm();
    render();
  };
}
/* ---------- the board ---------- */
function pbBoardHtml(shown, entries) {
  const wk = parse(pbPlanWeek());
  const all7 = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  const wkendUsed = all7
    .slice(5)
    .some((d) => shown.some((p) => onDay(p, iso(d)) && p.type !== "holiday"));
  const showWe = S.f.pbwe || wkendUsed;
  const days = showWe ? all7 : all7.slice(0, 5);
  const today = iso(new Date());
  const rows = diaryRows(true);
  const onsite = onSiteNow();
  const pending = pbPending();
  const waiting = pbWaiting(entries);
  const sitesThisWeek = [
    ...new Set(
      shown
        .filter((p) => days.some((d) => onDay(p, iso(d))) && pbSiteOf(p) && p.type !== "holiday")
        .map(pbSiteOf),
    ),
  ];
  const filt =
    S.f.pq || S.f.psite || S.f.pwho
      ? `<div class="pb-filt">Showing: ${esc([S.f.pq && "“" + S.f.pq + "”", S.f.psite, S.f.pwho && nameOf(S.f.pwho)].filter(Boolean).join(" · "))} <button type="button" class="linkbtn" id="pb-clear">Clear</button></div>`
      : "";
  const clashes = plClashes(shown, days);
  const cell = (r, d) => {
    const di = iso(d);
    const list = shown
      .filter(
        (p) =>
          onDay(p, di) &&
          ((p.people || []).includes(r.id) ||
            (r.id === S.me && p.vis === "me" && !(p.people || []).length)),
      )
      .sort(
        (a, b) =>
          (a.type === "holiday" ? -1 : 0) - (b.type === "holiday" ? -1 : 0) ||
          (a.time || "99").localeCompare(b.time || "99"),
      );
    const off = list.find((p) => p.type === "holiday");
    const os = di === today && onsite.find((e) => e.who === r.id);
    const clash = clashes.some((c) => c.who === r.id && c.day === di);
    return `<div class="pb-cell ${clash ? "pb-clashc" : ""} ${off ? "off" : ""} ${di === today ? "today" : ""} ${d.getDay() === 0 || d.getDay() === 6 ? "wkend" : ""}" data-d="${di}" data-w="${esc(r.id)}">${os ? `<i class="pb-os" title="On site now"></i>` : ""}${list.map((p) => `<button type="button" class="pb-chip t-${esc(p.type)} ${p.auto || p.pending ? "" : "drag"}" data-p="${esc(p.id)}" style="${pbChipStyle(p)}" title="${esc(p.title + (p.site ? " · " + p.site : ""))}">${p.type === "holiday" ? "🌴 Off" : `${p.time ? `<i>${esc(p.time)}</i>` : ""}${esc(pbSiteShort(pbSiteOf(p)) || pbShort(p.title))}`}</button>`).join("")}</div>`;
  };
  const freeRow = days
    .map((d) => {
      const di = iso(d);
      if (d.getDay() === 0 || d.getDay() === 6)
        return `<div class="pb-cell pb-free wkend" data-d="${di}"></div>`;
      const free = rows.filter(
        (r) => r.id !== S.me && !shown.some((p) => onDay(p, di) && (p.people || []).includes(r.id)),
      );
      return `<div class="pb-cell pb-free ${di === today ? "today" : ""}" data-d="${di}">${free.length ? `<button type="button" class="pb-freeb" data-d="${di}" title="${esc(free.map((r) => r.name).join(", "))}">${free.length} free</button>` : ""}</div>`;
    })
    .join("");
  const unRow = (() => {
    const un = days.map((d) =>
      shown.filter(
        (p) =>
          onDay(p, iso(d)) && !(p.people || []).length && p.type !== "holiday" && p.vis !== "me",
      ),
    );
    if (!un.some((x) => x.length)) return "";
    return `<div class="pb-name"><b>Not assigned</b></div>${un.map((l, i) => `<div class="pb-cell ${iso(days[i]) === today ? "today" : ""}" data-d="${iso(days[i])}" data-w="">${l.map((p) => `<button type="button" class="pb-chip t-${esc(p.type)} drag" data-p="${esc(p.id)}" style="${pbChipStyle(p)}">${p.time ? `<i>${esc(p.time)}</i>` : ""}${esc(pbSiteShort(pbSiteOf(p)) || pbShort(p.title))}</button>`).join("")}</div>`).join("")}`;
  })();
  /* the board first: requests as one line, clashes, the grid; jobs with nothing booked below it */
  return `${pending.length ? `<button type="button" class="pb-reqline" id="pb-reqline">⚠ ${pending.length} time-off request${pending.length === 1 ? "" : "s"} to answer ›</button>` : ""}${plClashHtml(clashes)}${filt}
  <div class="pb-wrap"><div class="pb-grid" style="grid-template-columns:78px repeat(${days.length},minmax(${days.length > 5 ? 48 : 60}px,1fr))">
    <div class="pb-corner"><button type="button" class="pb-we" id="pb-we" title="${showWe ? "Hide" : "Show"} weekend">${showWe ? "Mon–Sun" : "+ Sat/Sun"}</button></div>${days.map((d) => `<div class="pb-dh ${iso(d) === today ? "today" : ""} ${d.getDay() === 0 || d.getDay() === 6 ? "wkend" : ""}"><small>${esc(d.toLocaleDateString("en-GB", { weekday: "short" }))}</small><b>${d.getDate()}</b></div>`).join("")}
    <div class="pb-name pb-freen"><small>Free</small></div>${freeRow}
    ${rows.map((r) => `<div class="pb-name" data-w="${esc(r.id)}">${r.id !== S.me ? avatarHtml(r.id, 26) : `<span class="pav pavi" style="width:26px;height:26px;font-size:10px">${esc(initials(myName()))}</span>`}<span>${esc(r.id === S.me ? "Me" : r.name.split(" ")[0])}</span></div>${days.map((d) => cell(r, d)).join("")}`).join("")}
    ${unRow}
  </div></div>
  ${
    waiting.length
      ? `<div class="pb-strip">${
          waiting.length
            ? `<div class="pb-wait"><span class="who">Jobs with nothing booked in the next 4 weeks:</span>${waiting
                .slice(0, 6)
                .map(
                  (w, i) =>
                    `<button type="button" class="pillbtn pb-waitb" data-i="${i}">📍 ${esc(pbSiteShort(w.site) || w.name)} · Book ›</button>`,
                )
                .join("")}</div>`
            : ""
        }</div>`
      : ""
  }
  ${sitesThisWeek.length ? `<div class="pb-legend">${sitesThisWeek.map((s) => `<span><i style="background:hsl(${siteHue(s)} 55% 42%)"></i>${esc(pbSiteShort(s))}</span>`).join("")}</div>` : ""}
  <div class="who" style="margin-top:6px">Tap an empty square to book someone. Hold a booking and drag it to another day or person. Tap a booking to see or change it.</div>`;
}
function pbWireBoard(shown, entries) {
  const main = $("main");
  const req = $("pb-req");
  if (req) req.onclick = pbRequests;
  const we = $("pb-we");
  if (we)
    we.onclick = () => {
      S.f.pbwe = !S.f.pbwe;
      render();
    };
  const cl = $("pb-clear");
  if (cl)
    cl.onclick = () => {
      S.f.pq = "";
      S.f.psite = "";
      S.f.pwho = "";
      render();
    };
  const waiting = pbWaiting(entries);
  main.querySelectorAll(".pb-waitb").forEach(
    (b) =>
      (b.onclick = () => {
        const w = waiting[+b.dataset.i];
        if (!w) return;
        openPlanEditor(null, iso(new Date()), {
          title: "",
          type: "work",
          site: w.site,
          people: [],
          vis: "all",
          clientId: w.c.id,
        });
      }),
  );
  main
    .querySelectorAll(".pb-freeb")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openPlanEditor(null, b.dataset.d, { title: "", type: "work", people: [], vis: "all" })),
    );
  main.querySelectorAll(".pb-cell[data-w]").forEach(
    (c) =>
      (c.onclick = (e) => {
        if (e.target.closest(".pb-chip")) return;
        if (c.classList.contains("off")) return;
        openPlanEditor(null, c.dataset.d, {
          title: "",
          type: c.dataset.w === S.me ? "meeting" : "work",
          people: c.dataset.w && c.dataset.w !== S.me ? [c.dataset.w] : [],
          vis: c.dataset.w === S.me ? "me" : "all",
        });
      }),
  );
  /* tap = open; hold-and-drag = move to another day / person */
  let st = null,
    ghost = null,
    over = null;
  main.querySelectorAll(".pb-chip").forEach((ch) => {
    const p = shown.find((x) => x.id === ch.dataset.p);
    if (!p) return;
    ch.addEventListener("click", (e) => {
      if (st && st.moved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      openPlanDetail(p);
    });
    if (!ch.classList.contains("drag")) return;
    ch.addEventListener("pointerdown", (e) => {
      if (e.button && e.button !== 0) return;
      st = {
        x: e.clientX,
        y: e.clientY,
        moved: false,
        t: setTimeout(() => {
          if (!st) return;
          st.armed = true;
          ch.classList.add("lift");
          try {
            navigator.vibrate && navigator.vibrate(15);
          } catch (x) {}
        }, 220),
      };
      ch.setPointerCapture(e.pointerId);
    });
    ch.addEventListener("pointermove", (e) => {
      if (!st) return;
      const dx = e.clientX - st.x,
        dy = e.clientY - st.y;
      if (!st.armed) {
        if (Math.hypot(dx, dy) > 8) {
          clearTimeout(st.t);
          st = null;
        }
        return;
      }
      e.preventDefault();
      if (!st.moved && Math.hypot(dx, dy) > 4) {
        st.moved = true;
        ghost = ch.cloneNode(true);
        ghost.className = "pb-chip pb-ghost";
        ghost.style.cssText =
          ch.style.cssText +
          ";position:fixed;z-index:200;pointer-events:none;width:" +
          ch.offsetWidth +
          "px";
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = e.clientX - ch.offsetWidth / 2 + "px";
        ghost.style.top = e.clientY - 18 + "px";
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest(".pb-cell[data-w]");
      if (over && over !== cell) over.classList.remove("over");
      over = cell || null;
      if (over && !over.classList.contains("off")) over.classList.add("over");
    });
    const done = async (e) => {
      if (!st) return;
      const s0 = st;
      st = null;
      clearTimeout(s0.t);
      ch.classList.remove("lift");
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      const cell = over;
      if (over) {
        over.classList.remove("over");
        over = null;
      }
      if (!s0.moved || !cell || cell.classList.contains("off")) return;
      const toD = cell.dataset.d,
        toW = cell.dataset.w;
      const fromCell = ch.closest(".pb-cell");
      const fromD = fromCell.dataset.d,
        fromW = fromCell.dataset.w;
      if (toD === fromD && toW === fromW) return;
      const shift = Math.round((parse(toD) - parse(fromD)) / 864e5);
      const data = {};
      if (shift) {
        data.from = iso(addDays(parse(p.from), shift));
        data.to = iso(addDays(parse(p.to || p.from), shift));
      }
      if (toW !== fromW) {
        let ppl = (p.people || []).slice();
        if (fromW && fromW !== S.me) ppl = ppl.filter((x) => x !== fromW);
        if (toW && toW !== S.me && !ppl.includes(toW)) ppl.push(toW);
        data.people = ppl;
        if (toW === S.me && !ppl.length && p.vis !== "me") data.vis = "people";
      }
      try {
        await S.db.doc((p.vis === "me" ? "planprivate" : "plan") + "/" + p.id).update(data);
        if (toW && toW !== S.me && toW !== fromW && S.team[toW]) {
          try {
            await S.db.doc("sheets/" + toW + "/signoffs/pr-pl" + newId()).set({
              type: "prompt",
              form: "plan",
              ref: p.id,
              refLabel: p.title,
              note:
                "Booked: " +
                shortDay(data.from || p.from) +
                (p.time ? " " + p.time : "") +
                (p.site ? " · " + p.site : ""),
              status: "open",
              created: Date.now(),
            });
          } catch (x) {}
        }
        toast(
          "Moved" +
            (shift ? " to " + shortDay(data.from) : "") +
            (toW !== fromW
              ? toW
                ? " · " + (toW === S.me ? "you" : nameOf(toW))
                : " · not assigned"
              : ""),
        );
        render();
      } catch (err) {
        toast("Couldn't move it");
        render();
      }
    };
    ch.addEventListener("pointerup", done);
    ch.addEventListener("pointercancel", done);
  });
}
/* ---------- job timeline: each site's stages across the coming weeks ---------- */
function pbStagesHtml(shown) {
  const start = monday(parse(pbPlanWeek()));
  const weeks = 12;
  const days = weeks * 7;
  const today = iso(new Date());
  const end = addDays(start, days);
  const list = shown.filter(
    (p) =>
      p.type !== "holiday" &&
      !p.auto &&
      p.vis !== "me" &&
      pbSiteOf(p) &&
      parse(p.to || p.from) >= start &&
      parse(p.from) < end,
  );
  const sites = [...new Set(list.map(pbSiteOf))].sort();
  const colW = 22;
  const dx = (d) => Math.max(0, Math.round((parse(d) - start) / 864e5));
  const wkHead = Array.from({ length: weeks }, (_, i) => {
    const d = addDays(start, i * 7);
    return `<div class="pbs-wh" style="left:${i * 7 * colW}px;width:${7 * colW}px">${esc(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}</div>`;
  }).join("");
  return `<div class="who" style="margin-bottom:6px">One row per site, a bar for each booking or stage. Hold and drag a bar to move it; you'll be asked whether to move the later stages with it. <button type="button" class="linkbtn" id="pbs-add">📌 Add key dates / stages</button></div>
  <div class="pb-wrap"><div class="pbs" style="width:${150 + days * colW}px"><div class="pbs-head"><div class="pbs-corner">Site</div><div class="pbs-weeks" style="width:${days * colW}px">${wkHead}</div></div>
  ${
    sites
      .map((s) => {
        const rows = list
          .filter((p) => same(pbSiteOf(p), s))
          .sort((a, b) => a.from.localeCompare(b.from));
        const lanes = [];
        rows.forEach((p) => {
          const a = dx(p.from),
            b = dx(p.to || p.from) + 1;
          let k = lanes.findIndex((l) => l <= a);
          if (k < 0) {
            lanes.push(b);
            k = lanes.length - 1;
          } else lanes[k] = b;
          p.__lane = k;
        });
        return `<div class="pbs-row" style="height:${Math.max(1, lanes.length) * 30 + 8}px"><div class="pbs-name"><b>${esc(pbSiteShort(s))}</b><small>${rows.length} booked</small></div><div class="pbs-lane" style="width:${days * colW}px" data-site="${esc(s)}">${Array.from({ length: weeks }, (_, i) => `<i class="pbs-wl" style="left:${i * 7 * colW}px"></i>`).join("")}${dx(today) >= 0 && dx(today) < days ? `<i class="pbs-today" style="left:${dx(today) * colW}px;width:${colW}px"></i>` : ""}
      ${rows
        .map((p) => {
          const a = dx(p.from),
            b = Math.min(days, dx(p.to || p.from) + 1);
          return `<button type="button" class="pbs-bar t-${esc(p.type)} drag" data-p="${esc(p.id)}" style="left:${a * colW}px;width:${Math.max(colW, (b - a) * colW - 2)}px;top:${4 + p.__lane * 30}px;${pbChipStyle(p)}" title="${esc(p.title)}">${esc(pbShort(p.title))}${(p.people || []).length ? ` <small>${esc(p.people.map((id) => nameOf(id).split(" ")[0]).join(", "))}</small>` : ""}</button>`;
        })
        .join("")}</div></div>`;
      })
      .join("") ||
    '<div class="nothing" style="padding:14px">Nothing booked against a site in the next 12 weeks. Use 📌 Add key dates / stages.</div>'
  }
  </div></div>`;
}
function pbWireStages(shown) {
  const add = $("pbs-add");
  if (add) add.onclick = () => openKeyDates("", "");
  const colW = 22;
  let st = null;
  $("main")
    .querySelectorAll(".pbs-bar")
    .forEach((bar) => {
      const p = shown.find((x) => x.id === bar.dataset.p);
      if (!p) return;
      bar.addEventListener("click", (e) => {
        if (st && st.moved) {
          e.preventDefault();
          return;
        }
        openPlanDetail(p);
      });
      bar.addEventListener("pointerdown", (e) => {
        st = {
          x: e.clientX,
          l: bar.offsetLeft,
          moved: false,
          armed: false,
          t: setTimeout(() => {
            if (st) {
              st.armed = true;
              bar.classList.add("lift");
            }
          }, 220),
        };
        bar.setPointerCapture(e.pointerId);
      });
      bar.addEventListener("pointermove", (e) => {
        if (!st) return;
        const dx = e.clientX - st.x;
        if (!st.armed) {
          if (Math.abs(dx) > 8) {
            clearTimeout(st.t);
            st = null;
          }
          return;
        }
        e.preventDefault();
        if (Math.abs(dx) > 4) st.moved = true;
        bar.style.left = st.l + dx + "px";
      });
      const done = async () => {
        if (!st) return;
        const s0 = st;
        st = null;
        clearTimeout(s0.t);
        bar.classList.remove("lift");
        if (!s0.moved) return;
        const shift = Math.round((bar.offsetLeft - s0.l) / colW);
        if (!shift) {
          bar.style.left = s0.l + "px";
          return;
        }
        const site = pbSiteOf(p);
        const later = shown.filter(
          (x) =>
            x !== p &&
            !x.auto &&
            x.type !== "holiday" &&
            same(pbSiteOf(x), site) &&
            x.from >= p.from,
        );
        const mv = async (list) => {
          for (const x of list) {
            try {
              await S.db.doc((x.vis === "me" ? "planprivate" : "plan") + "/" + x.id).update({
                from: iso(addDays(parse(x.from), shift)),
                to: iso(addDays(parse(x.to || x.from), shift)),
              });
            } catch (e) {}
          }
          toast(
            `Moved ${list.length} by ${Math.abs(shift)} day${Math.abs(shift) === 1 ? "" : "s"} ${shift > 0 ? "later" : "earlier"}`,
          );
          render();
        };
        if (!later.length) {
          mv([p]);
          return;
        }
        const d = document.createElement("div");
        d.className = "dimask";
        d.innerHTML = `<div class="dimbox"><b>Move “${esc(pbShort(p.title))}” ${Math.abs(shift)} day${Math.abs(shift) === 1 ? "" : "s"} ${shift > 0 ? "later" : "earlier"}</b><div class="who">${later.length} later booking${later.length === 1 ? "" : "s"} on ${esc(pbSiteShort(site))} ${later.length === 1 ? "comes" : "come"} after it.</div><div class="dimbtns" style="flex-direction:column;align-items:stretch"><button type="button" class="btn primary mv-all">Move this and everything after it</button><button type="button" class="btn mv-one">Move just this one</button><button type="button" class="btn mv-x">Cancel</button></div></div>`;
        document.body.appendChild(d);
        d.querySelector(".mv-all").onclick = () => {
          d.remove();
          mv([p].concat(later));
        };
        d.querySelector(".mv-one").onclick = () => {
          d.remove();
          mv([p]);
        };
        d.querySelector(".mv-x").onclick = () => {
          d.remove();
          render();
        };
      };
      bar.addEventListener("pointerup", done);
      bar.addEventListener("pointercancel", done);
    });
}
/* ---------- trades: today / tomorrow day sheet ---------- */
function pbDaySheet(shown) {
  const today = iso(new Date()),
    tom = iso(addDays(new Date(), 1));
  const co = coData();
  const card = (di, label) => {
    const list = shown
      .filter((p) => onDay(p, di) && p.type !== "holiday" && !p.pending)
      .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    const off = shown.find((p) => onDay(p, di) && p.type === "holiday");
    return `<div class="pb-ds"><div class="pb-dsh"><b>${label}</b><span class="who">${esc(shortDay(di))}</span></div>${off ? `<div class="notice">🌴 ${esc(off.pending ? "Time off requested" : "Time off")}</div>` : ""}${
      list.length
        ? list
            .map((p) => {
              const sr = p.site ? siteRec(p.site) : null;
              const addr = p.site || "";
              const others = (p.people || []).filter((x) => x !== S.me).map(nameOf);
              return `<button type="button" class="pb-dsi t-${esc(p.type)}" data-p="${esc(p.id)}" style="${pbChipStyle(p)}"><span class="pb-dst">${p.time ? esc(p.time) + (p.endTime ? "–" + esc(p.endTime) : "") : "All day"}</span><span class="pb-dsm"><b>${esc(p.title)}</b>${addr ? `<span>📍 ${esc(addr)}</span>` : ""}${others.length ? `<span>👥 With ${esc(others.join(", "))}</span>` : ""}${p.notes ? `<span class="pb-dsn">${esc(p.notes.length > 160 ? p.notes.slice(0, 160) + "…" : p.notes)}</span>` : ""}</span></button>${addr ? `<div class="actions pb-dsa"><button type="button" class="pillbtn maplink" data-addr="${esc(addr)}" data-label="${esc(p.title)}">📍 Directions</button>${co.mobile || co.phone ? `<a class="pillbtn" href="tel:${esc(String(co.mobile || co.phone).replace(/\s+/g, ""))}" style="text-decoration:none">📞 Call ${esc((co.owner || "James").split(" ")[0])}</a>` : ""}</div>` : ""}`;
            })
            .join("")
        : off
          ? ""
          : '<div class="nothing">Nothing booked. Check with James.</div>'
    }</div>`;
  };
  return card(today, "Today") + card(tom, "Tomorrow");
}
function pbHeader(owner, mode) {
  const wk = parse(pbPlanWeek());
  const end = addDays(wk, 6);
  const lab =
    mode === "stages"
      ? "From " + wk.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : mode === "day"
        ? ""
        : `${wk.toLocaleDateString("en-GB", { day: "numeric", month: wk.getMonth() === end.getMonth() ? undefined : "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const views = owner
    ? [
        ["where", "Who's where"],
        ["board", "Board"],
        ["day", "Day"],
        ["stages", "Jobs"],
        ["month", "Month"],
      ]
    : [
        ["week", "Week"],
        ["month", "Month"],
      ];
  return `<div class="pb-top">${mode !== "day" && mode !== "where" ? `<button type="button" class="iconbtn" id="pb-prev" aria-label="Previous week">‹</button><b class="pb-lab">${esc(lab)}</b><button type="button" class="iconbtn" id="pb-next" aria-label="Next week">›</button>${pbPlanWeek() !== iso(monday(new Date())) ? `<button type="button" class="pillbtn" id="pb-today">Today</button>` : ""}` : `<b class="pb-lab"></b>`}
    </div><div class="pb-top pb-top2"><div class="seg pb-seg" id="pb-mode">${views.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</div><button type="button" class="iconbtn" id="pb-menu" aria-label="More" title="More">⋯</button></div>`;
}
function pbWireHeader(owner) {
  const go = (w) => {
    S.week = monday(parse(w));
    render();
  };
  const p = $("pb-prev");
  if (p) p.onclick = () => go(iso(addDays(parse(pbPlanWeek()), -7)));
  const n = $("pb-next");
  if (n) n.onclick = () => go(iso(addDays(parse(pbPlanWeek()), 7)));
  const t = $("pb-today");
  if (t) t.onclick = () => go(iso(monday(new Date())));
  $("pb-mode")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.pmode = b.dataset.v;
          if (b.dataset.v === "month") {
            const t = parse(pbPlanWeek());
            S.f.pmonth = new Date(t.getFullYear(), t.getMonth(), 1);
          }
          if (b.dataset.v === "day") {
            S.f.pdmode = "day";
            if (!S.f.pdday) S.f.pdday = iso(new Date());
          }
          render();
        }),
    );
  $("pb-menu").onclick = (e) => pbMenu(e.currentTarget, owner);
}
function plannerView() {
  const owner = ownerMode();
  let mode =
    S.f.pmode || (owner ? (nlOn() && window.innerWidth < 700 ? "where" : "board") : "week");
  if (owner && mode === "diary") mode = "day";
  if (owner && mode === "week") mode = "board";
  if (!owner && ["where", "board", "day", "stages", "diary", "year", "list"].includes(mode))
    mode = "week";
  const entries = planEntries();
  const who = owner ? S.f.pwho || "" : "";
  const psite = S.f.psite || "";
  const pq = S.f.pq || "";
  const shown = entries.filter(
    (p) =>
      planMatch(p, pq) &&
      (!who || (p.people || []).includes(who)) &&
      (!psite || (psite.startsWith("job:") ? p.jobId === psite.slice(4) : same(p.site, psite))),
  );
  const siteOpts = [
    ...new Set(siteNames().concat(entries.map((p) => p.site).filter(liveSite))),
  ].sort();
  const jobOpts = (owner ? S.jobs : myJobs()).filter((j) => j.status !== "closed");
  const pending = owner
    ? allTeam("signoffs")
        .filter((s) => s.type === "leave" && s.status === "pending")
        .sort((a, b) => a.from.localeCompare(b.from))
    : [];
  let html = pbHeader(owner, mode);
  const today = iso(new Date());
  if (!owner) html += pbDaySheet(shown);
  if (mode === "where") {
    html += plWhereHtml(shown);
  } else if (mode === "board") {
    html += pbBoardHtml(shown, entries);
  } else if (mode === "stages") {
    html += pbStagesHtml(shown);
  } else if (mode === "day") {
    html += diaryHtml(shown, owner);
  } else if (mode === "list") {
    html += planListHtml(shown, owner);
  } else if (mode === "week") {
    weekDays().forEach((day) => {
      const di = iso(day);
      const list = shown
        .filter((p) => onDay(p, di))
        .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
      html += `<div class="day"><div class="dayh ${di === today ? "today" : ""}"><span>${dayLabel(day)}${di === today ? " · Today" : ""}</span>${owner ? `<button type="button" class="pillbtn pl-addday" data-d="${di}" style="padding:4px 10px;font-size:12.5px">+ Add</button>` : ""}</div>
        ${list.length ? list.map((p) => entryChip(p, owner)).join("") : '<div class="nothing">Nothing planned</div>'}</div>`;
    });
  } else if (mode === "year") {
    const yr = S.f.pyear || addDays(S.week, 3).getFullYear();
    html += `<div class="mhead"><button type="button" class="iconbtn" id="py-prev" aria-label="Previous year"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3 5 8l5 5"/></svg></button><b style="flex:1;text-align:center">${yr}</b><button type="button" class="iconbtn" id="py-next" aria-label="Next year"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 3 5 5-5 5"/></svg></button></div>
      <div class="ylegend">${Object.entries(PTYPES)
        .map(([k, l]) => `<span class="t-${k}"><i></i>${l}</span>`)
        .join(
          "",
        )}</div><div class="who">Tap a day to see everything on it.</div><div class="ygrid">`;
    for (let m = 0; m < 12; m++) {
      const first = new Date(yr, m, 1),
        start = monday(first),
        last = new Date(yr, m + 1, 0);
      const inMonth = shown.filter((p) => p.from <= iso(last) && (p.to || p.from) >= iso(first));
      const notable = inMonth
        .filter((p) => ["keydate", "holiday", "inspection"].includes(p.type))
        .sort((a, b) => a.from.localeCompare(b.from));
      html += `<div class="ymonth"><b>${first.toLocaleDateString("en-GB", { month: "long" })}</b><div class="ymini">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span class="ydow">${d}</span>`).join("")}`;
      for (let i = 0; i < 42; i++) {
        const d = addDays(start, i),
          di = iso(d);
        if (i % 7 === 0 && d > last) break;
        if (d.getMonth() !== m) {
          html += `<span class="yday out"></span>`;
          continue;
        }
        const list = shown.filter((p) => onDay(p, di));
        const t = list.length
          ? (
              list.find((p) => p.type === "keydate") ||
              list.find((p) => p.type === "holiday") ||
              list[0]
            ).type
          : "";
        html += `<button type="button" class="yday ${list.length ? "has t-" + t : ""} ${di === today ? "today" : ""}" data-d="${di}" title="${esc(list.map((p) => p.title).join(", "))}" aria-label="${esc(dayLabel(d) + (list.length ? ": " + list.map((p) => p.title).join(", ") : ""))}">${d.getDate()}</button>`;
      }
      html += `</div>${
        notable.length
          ? `<div class="ynotes">${notable
              .slice(0, 5)
              .map(
                (p) =>
                  `<div class="t-${p.type}"><i></i>${parse(p.from).getDate()}${p.to && p.to !== p.from ? "–" + parse(p.to).getDate() + (parse(p.to).getMonth() !== m ? " " + parse(p.to).toLocaleDateString("en-GB", { month: "short" }) : "") : ""} ${esc(p.title)}</div>`,
              )
              .join(
                "",
              )}${notable.length > 5 ? `<div class="who">+${notable.length - 5} more</div>` : ""}</div>`
          : ""
      }</div>`;
    }
    html += `</div>`;
  } else {
    if (!S.f.pmonth) {
      const t = addDays(S.week, 3);
      S.f.pmonth = new Date(t.getFullYear(), t.getMonth(), 1);
    }
    const first = S.f.pmonth,
      start = monday(first);
    html += `<div class="mhead"><button type="button" class="iconbtn" id="pm-prev" aria-label="Previous month"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3 5 8l5 5"/></svg></button><b style="flex:1;text-align:center">${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</b><button type="button" class="iconbtn" id="pm-next" aria-label="Next month"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 3 5 5-5 5"/></svg></button></div><div class="who">Tap a day to see everything on it</div><div class="mgrid">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="mdow">${d}</div>`).join("")}`;
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i),
        di = iso(d);
      if (
        i % 7 === 0 &&
        i >= 28 &&
        d > addDays(new Date(first.getFullYear(), first.getMonth() + 1, 1), -1)
      )
        break;
      const list = shown.filter((p) => onDay(p, di));
      html += `<button type="button" class="mcell ${d.getMonth() !== first.getMonth() ? "out" : ""} ${di === today ? "today" : ""}" data-d="${di}"><span class="mnum">${d.getDate()}</span>${list
        .slice(0, 4)
        .map(
          (p) =>
            `<span class="mitem t-${esc(p.type)}">${p.time ? esc(p.time) + " " : ""}${esc(p.title)}</span>`,
        )
        .join(
          "",
        )}${list.length > 3 ? `<span class="mmore">+${list.length - 3}</span>` : ""}</button>`;
    }
    html += `</div>`;
  }
  const myLeave = owner
    ? []
    : leaveOf(S.mine.signoffs).sort((a, b) => b.from.localeCompare(a.from));
  if (!owner)
    html += `<div class="day"><div class="dayh"><span>My time-off requests</span><span class="sum">${myLeave.length}</span></div>${myLeave.length ? myLeave.map((l) => leaveCard(l, false)).join("") : '<div class="nothing">No requests yet.</div>'}</div>`;
  if (false) {
    const yr = String(new Date().getFullYear());
    html += `<details class="card" data-id="__leave" ${S.open.has("__leave") ? "open" : ""}><summary><div class="nm">Time off taken this year<small>Approved working days off in ${yr}, not counting weekends</small></div></summary><div class="cardbody">
      ${
        teamIds()
          .map((id) => {
            const ls = leaveOf(S.data.signoffs[id]).filter(
              (l) => l.status === "approved" && l.from.startsWith(yr),
            );
            const tot = {};
            ls.forEach((l) => {
              tot[l.leaveType] = (tot[l.leaveType] || 0) + workDays(l.from, l.to, l.half);
            });
            return `<div class="citem"><span><b>${esc(nameOf(id))}</b></span><span class="who">${
              Object.entries(tot)
                .map(([k, v]) => `${LEAVE_TYPES[k] || k} ${v} day${v === 1 ? "" : "s"}`)
                .join(" · ") || "None"
            }</span></div>`;
          })
          .join("") || '<div class="nothing">No employees yet.</div>'
      }
      </div></details>`;
  }
  $("main").innerHTML = html;
  wpPlannerTop();
  pbWireHeader(owner);
  if (mode === "where") plWireWhere(entries);
  if (mode === "board") pbWireBoard(shown, entries);
  if ($("pb-reqline")) $("pb-reqline").onclick = pbRequests;
  if (mode === "stages") pbWireStages(shown);
  if ($("pl-mode"))
    $("pl-mode")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.pmode = b.dataset.v;
            if (b.dataset.v === "month") {
              const t = addDays(S.week, 3);
              S.f.pmonth = new Date(t.getFullYear(), t.getMonth(), 1);
            }
            if (b.dataset.v === "year") S.f.pyear = addDays(S.week, 3).getFullYear();
            render();
          }),
      );
  if ($("py-prev")) {
    const yr = S.f.pyear || addDays(S.week, 3).getFullYear();
    $("py-prev").onclick = () => {
      S.f.pyear = yr - 1;
      render();
    };
    $("py-next").onclick = () => {
      S.f.pyear = yr + 1;
      render();
    };
  }
  $("main")
    .querySelectorAll(".yday[data-d]")
    .forEach((b) => (b.onclick = () => openDayPlan(b.dataset.d)));
  if ($("pm-prev")) {
    $("pm-prev").onclick = () => {
      const f = S.f.pmonth;
      S.f.pmonth = new Date(f.getFullYear(), f.getMonth() - 1, 1);
      render();
    };
    $("pm-next").onclick = () => {
      const f = S.f.pmonth;
      S.f.pmonth = new Date(f.getFullYear(), f.getMonth() + 1, 1);
      render();
    };
  }
  if ($("pl-who"))
    $("pl-who").onchange = (e) => {
      S.f.pwho = e.target.value;
      e.target.blur();
      render();
    };
  if ($("pl-q")) {
    let t = null;
    $("pl-q").oninput = (e) => {
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => {
        S.f.pq = v;
        const pos = e.target.selectionStart;
        plannerView();
        const n = $("pl-q");
        if (n) {
          n.focus();
          try {
            n.setSelectionRange(pos, pos);
          } catch (x) {}
        }
      }, 250);
    };
  }
  if ($("pl-imp")) $("pl-imp").onclick = openPlanImport;
  if (mode === "day") wireDiary(shown, owner);
  if ($("pll-prev")) {
    const f = S.f.plfrom || iso(new Date());
    $("pll-prev").onclick = () => {
      S.f.plfrom = iso(addDays(parse(f), -84));
      render();
    };
    $("pll-next").onclick = () => {
      S.f.plfrom = iso(addDays(parse(f), 84));
      render();
    };
    if ($("pll-today"))
      $("pll-today").onclick = () => {
        S.f.plfrom = "";
        render();
      };
  }
  if ($("pl-site"))
    $("pl-site").onchange = (e) => {
      S.f.psite = e.target.value;
      e.target.blur();
      render();
    };
  if ($("pl-key"))
    $("pl-key").onclick = () =>
      openKeyDates(
        psite && !psite.startsWith("job:") ? psite : "",
        psite.startsWith("job:") ? psite.slice(4) : "",
      );
  if (psite && mode !== "board" && mode !== "stages") {
    const kd = shown
      .filter((p) => p.type === "keydate")
      .sort((a, b) => a.from.localeCompare(b.from));
    if (kd.length)
      $("main").querySelector(".pb-top").insertAdjacentHTML("afterend", keyTimeline(kd, owner));
  }
  $("main")
    .querySelectorAll(".kd-row")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = entries.find((x) => x.id === b.dataset.p);
          if (p) openPlanDetail(p);
        }),
    );
  if ($("pl-add"))
    $("pl-add").onclick = () => openPlanEditor(null, inWeek({ date: today }) ? today : iso(S.week));
  if ($("pl-leave")) $("pl-leave").onclick = () => openLeave(owner);
  $("main")
    .querySelectorAll(".pl-addday")
    .forEach((b) => (b.onclick = () => openPlanEditor(null, b.dataset.d)));
  $("main")
    .querySelectorAll(".mcell")
    .forEach((b) => (b.onclick = () => openDayPlan(b.dataset.d)));
  $("main")
    .querySelectorAll(".pentry,.pb-dsi")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = entries.find((x) => x.id === b.dataset.p);
          if (p) openPlanDetail(p);
        }),
    );
  $("main")
    .querySelectorAll("details.card")
    .forEach((dt) =>
      dt.addEventListener("toggle", () => {
        dt.open ? S.open.add(dt.dataset.id) : S.open.delete(dt.dataset.id);
      }),
    );
  wireLeave(owner);
}
const KEY_DATES = [
  "Start on site",
  "Groundworks start",
  "Foundations inspection (building control)",
  "Drainage test",
  "DPC / oversite inspection",
  "Scaffold up",
  "Steel / structural delivery",
  "Roof on / watertight",
  "Windows fitted",
  "First fix",
  "Pre-plaster inspection",
  "Plastering",
  "Second fix",
  "Kitchen fit",
  "Scaffold down",
  "Final building control inspection",
  "Snagging",
  "Completion / handover",
  "Client meeting",
];
function keyTimeline(list, owner) {
  const today = iso(new Date());
  return `<div class="card"><div class="cardbody" style="border:0"><b>Key dates</b><div class="ktl">${list
    .map((p) => {
      const past = (p.to || p.from) < today,
        now = onDay(p, today);
      return `<button type="button" class="kd-row ${past ? "past" : ""} ${now ? "now" : ""}" data-p="${esc(p.id)}"><span class="kdot"></span><span class="kdate">${esc(parse(p.from).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }))}${p.to && p.to !== p.from ? " – " + esc(parse(p.to).toLocaleDateString("en-GB", { day: "numeric", month: "short" })) : ""}</span><span class="ktitle">${esc(p.title)}${p.jobTitle ? ` <span class="who">· ${esc(p.jobTitle)}</span>` : ""}${now ? ' <span class="tag day">Today</span>' : ""}</span></button>`;
    })
    .join("")}</div></div></div>`;
}
function keyDatesFor(site, jobId) {
  return planEntries()
    .filter(
      (p) =>
        p.type === "keydate" &&
        ((jobId && p.jobId === jobId) ||
          (!jobId && same(p.site, site)) ||
          (jobId && !p.jobId && same(p.site, site))),
    )
    .sort((a, b) => a.from.localeCompare(b.from));
}
function openKeyDates(site, jobId) {
  const jobs = S.jobs.filter((j) => j.status !== "closed");
  const jj = jobId ? S.jobs.find((j) => j.id === jobId) : null;
  let rows = [
    { t: "Start on site", d: "", to: "" },
    { t: "", d: "", to: "" },
  ];
  openSheet(
    `<h3 id="sheettitle">Key dates for a job</h3>
    ${pickField("kd-site", "Site", siteNames(), jj ? jj.site : site, "e.g. 12 Marine Way, Exmouth")}
    <label for="kd-job">Job sheet (optional)<select id="kd-job"><option value="">Whole site, not one job sheet</option>${jobs.map((j) => `<option value="${esc(j.id)}" ${j.id === jobId ? "selected" : ""}>${esc(j.title)} · ${esc(j.site)}</option>`).join("")}</select></label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Dates</span><span class="who">Name, date, and an end date if it runs over several days</span></div><div id="kd-rows"></div>
      <button type="button" class="pillbtn" id="kd-add" style="margin-top:6px">+ Add another date</button></div>
    <datalist id="kd-names">${KEY_DATES.map((k) => `<option value="${esc(k)}">`).join("")}</datalist>
    <div><div class="flabel">Who can see them?</div><div class="seg" id="kd-vis">${Object.entries(
      VIS,
    )
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${k === "all"}">${l}</button>`,
      )
      .join("")}</div></div>
    ${formFoot(false, "Add to planner")}`,
    async () => {
      const sitev = pickVal("kd-site");
      if (!sitev) {
        showErr("Choose the site.");
        return;
      }
      const jsel = $("kd-job").value,
        job = jsel ? S.jobs.find((j) => j.id === jsel) : null;
      const good = rows.filter((r) => r.t.trim() && r.d);
      if (!good.length) {
        showErr("Add at least one date with a name.");
        return;
      }
      const v = $("kd-vis").querySelector('[aria-pressed="true"]').dataset.v;
      const people = v === "people" ? (job ? job.assignees || [] : []) : [];
      if (v === "people" && !people.length) {
        showErr(
          "'Only the people on it' needs a job sheet with people on it. Choose a job sheet or another option.",
        );
        return;
      }
      $("f-save").disabled = true;
      try {
        for (const r of good) {
          const id = newId();
          const coll = v === "me" ? "planprivate" : "plan";
          await S.db.doc(coll + "/" + id).set(
            Object.assign(
              {
                title: r.t.trim(),
                type: "keydate",
                from: r.d,
                to: r.to && r.to >= r.d ? r.to : r.d,
                time: "",
                site: sitev,
                jobId: job ? job.id : "",
                jobTitle: job ? job.title : "",
                people,
                notes: "",
                created: Date.now(),
                updated: Date.now(),
              },
              v === "me" ? {} : { vis: v },
            ),
          );
        }
        closeForm();
        S.f.psite = job ? "job:" + job.id : sitev;
        S.week = monday(parse(good.map((r) => r.d).sort()[0]));
        toast(`Added ${good.length} key date${good.length === 1 ? "" : "s"}`);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  const draw = () => {
    $("kd-rows").innerHTML = rows
      .map(
        (
          r,
          i,
        ) => `<div class="kdrow" data-i="${i}"><input class="kd-t" list="kd-names" maxlength="80" placeholder="e.g. Scaffold up" value="${esc(r.t)}" aria-label="Key date ${i + 1} name">
      <input class="kd-d" type="date" value="${esc(r.d)}" aria-label="Key date ${i + 1} date"><input class="kd-to" type="date" value="${esc(r.to)}" aria-label="Key date ${i + 1} end date (optional)" title="End date (optional)">
      <button type="button" class="linkdanger kd-x" aria-label="Remove">✕</button></div>`,
      )
      .join("");
    $("kd-rows")
      .querySelectorAll(".kdrow")
      .forEach((el) => {
        const i = +el.dataset.i;
        el.querySelector(".kd-t").oninput = (e) => (rows[i].t = e.target.value);
        el.querySelector(".kd-d").oninput = (e) => (rows[i].d = e.target.value);
        el.querySelector(".kd-to").oninput = (e) => (rows[i].to = e.target.value);
        el.querySelector(".kd-x").onclick = () => {
          rows.splice(i, 1);
          if (!rows.length) rows.push({ t: "", d: "", to: "" });
          draw();
        };
      });
  };
  draw();
  $("kd-add").onclick = () => {
    rows.push({ t: "", d: "", to: "" });
    draw();
    const l = $("kd-rows").lastElementChild;
    if (l) l.querySelector(".kd-t").focus();
  };
  $("kd-vis")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $("kd-vis")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
  $("kd-job").addEventListener("change", () => {
    const j = S.jobs.find((x) => x.id === $("kd-job").value);
    const sel = $("kd-site");
    if (j && sel) {
      if (sel.tagName === "SELECT" && [...sel.options].some((o) => o.value === j.site))
        sel.value = j.site;
      else if (sel.tagName === "INPUT") sel.value = j.site;
    }
  });
}
function openPlanView(p) {
  openViewer(`<span class="tag">${esc(PTYPES[p.type] || "")}</span><h3 style="font-family:var(--f-display);font-size:22px;margin:6px 0 0;color:var(--accent);text-transform:uppercase">${esc(p.title)}</h3>
    <div class="who">${shortDay(p.from)}${p.to && p.to !== p.from ? " – " + shortDay(p.to) : ""}${p.time ? " · " + esc(p.time) : ""}${p.site ? " · " + esc(p.site) : ""}</div>
    ${p.notes ? `<div class="talkbody">${esc(p.notes)}</div>` : ""}`);
}
function leaveCard(l, owner) {
  const st = {
    pending: ["Waiting", "day"],
    approved: ["Approved", "ok"],
    declined: ["Declined", "bad"],
    cancelled: ["Cancelled", ""],
  }[l.status] || ["", ""];
  const days = workDays(l.from, l.to, l.half);
  return `<div class="entry lv" data-l="${esc(l.id)}" data-w="${esc(l.who || "")}"><div class="main">
    <div class="job"><span class="tag ${st[1]}">${st[0]}</span>${owner ? esc(nameOf(l.who)) + " · " : ""}${esc(LEAVE_TYPES[l.leaveType] || "Time off")}</div>
    <div class="sub">${shortDay(l.from)}${l.to !== l.from ? " – " + shortDay(l.to) : ""}${l.half ? " · half day (" + esc(l.half) + ")" : ""} · ${days} working day${days === 1 ? "" : "s"}</div>
    ${l.note ? `<div class="sub">${esc(l.note)}</div>` : ""}
    ${l.reply ? `<div class="sub"><b>James:</b> ${esc(l.reply)}</div>` : ""}
    <div class="sub">${l.requestedAt || l.created ? "Requested " + stamp(l.requestedAt || l.created) : "Waiting for an answer"}${l.answeredAt ? " · answered " + stamp(l.answeredAt) : ""}</div>
    <div class="filerow">${owner && l.status === "pending" ? `<button type="button" class="btn primary lv-yes" style="padding:7px 14px">Approve</button><button type="button" class="btn lv-no" style="padding:7px 14px">Decline</button>` : ""}
    ${!owner && l.status === "pending" ? `<button type="button" class="linkdanger lv-cancel">Cancel request</button>` : ""}</div></div></div>`;
}
function wireLeave(owner, root) {
  (root || $("main")).querySelectorAll(".lv").forEach((row) => {
    const l = owner
      ? allTeam("signoffs").find((x) => x.id === row.dataset.l && x.who === row.dataset.w)
      : leaveOf(S.mine.signoffs).find((x) => x.id === row.dataset.l);
    if (!l) return;
    const y = row.querySelector(".lv-yes"),
      n = row.querySelector(".lv-no"),
      c = row.querySelector(".lv-cancel");
    if (y) y.onclick = () => answerLeave(l, true);
    if (n) n.onclick = () => answerLeave(l, false);
    if (c) {
      let a = false;
      c.onclick = async () => {
        if (!a) {
          a = true;
          c.textContent = "Tap again to cancel";
          return;
        }
        try {
          await myDoc("signoffs", l.id).update({ status: "cancelled" });
          toast("Request cancelled");
        } catch (e) {
          toast("Couldn't cancel");
        }
      };
    }
  });
}
function answerLeave(l, yes) {
  openSheet(
    `<h3 id="sheettitle">${yes ? "Approve" : "Decline"} time off</h3>
    <div><b>${esc(nameOf(l.who))}</b> · ${esc(LEAVE_TYPES[l.leaveType] || "Time off")}<div class="who">${shortDay(l.from)}${l.to !== l.from ? " – " + shortDay(l.to) : ""}${l.half ? " · half day" : ""}</div></div>
    <label for="lv-reply">Message to ${esc(nameOf(l.who))} (optional)<textarea id="lv-reply" maxlength="300" placeholder="${yes ? "e.g. Enjoy your break" : "e.g. Sorry, we need you on site that week"}"></textarea></label>
    ${yes ? `<div><div class="flabel">Who can see it on the planner?</div><div class="seg" id="lv-vis"><button type="button" data-v="all" aria-pressed="true">Everyone (shows as "${esc(nameOf(l.who))} – off")</button><button type="button" data-v="people" aria-pressed="false">Only ${esc(nameOf(l.who))} and you</button></div></div>` : ""}
    ${formFoot(false, yes ? "Approve" : "Decline")}`,
    async () => {
      $("f-save").disabled = true;
      const now = Date.now();
      try {
        await S.db.doc("sheets/" + l.who + "/signoffs/" + l.id).update({
          status: yes ? "approved" : "declined",
          reply: $("lv-reply").value.trim(),
          answeredAt: now,
        });
        if (yes) {
          const vis = $("lv-vis").querySelector('[aria-pressed="true"]').dataset.v;
          await S.db.doc("plan/leave-" + l.id).set({
            from: l.from,
            to: l.to,
            type: "holiday",
            title: nameOf(l.who) + " – off",
            people: [l.who],
            vis,
            notes: "",
            leaveId: l.id,
            created: now,
            updated: now,
          });
        }
        closeForm();
        if (!$("viewer").hidden && $("viewer-body").querySelector(".lv")) closeViewer();
        toast(yes ? "Approved and added to the planner" : "Declined");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "lv-reply",
  );
  const v = $("lv-vis");
  if (v)
    v.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = () =>
          v
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
}
function openLeave(owner) {
  const ids = teamIds();
  const today = iso(new Date());
  openSheet(
    `<h3 id="sheettitle">${owner ? "Book time off" : "Request time off"}</h3>
    ${owner ? `<label for="lv-who">For<select id="lv-who" required><option value="" disabled selected>Choose…</option>${ids.map((id) => `<option value="${esc(id)}">${esc(nameOf(id))}</option>`).join("")}</select></label>` : ""}
    <div><div class="flabel">Type</div><div class="seg" id="lv-type">${Object.entries(LEAVE_TYPES)
      .map(
        ([k, l], i) =>
          `<button type="button" data-v="${k}" aria-pressed="${i === 0}">${l}</button>`,
      )
      .join("")}</div></div>
    <div class="grid2"><label for="lv-from">First day off<input id="lv-from" type="date" required value="${today}"></label>
    <label for="lv-to">Last day off<input id="lv-to" type="date" required value="${today}"></label></div>
    <label for="lv-half">Half day? (one day only)<select id="lv-half"><option value="">No, full day(s)</option><option value="morning">Morning off</option><option value="afternoon">Afternoon off</option></select></label>
    <div class="calc" id="lv-days"></div>
    <label for="lv-note">Note (optional)<textarea id="lv-note" maxlength="300"></textarea></label>
    ${formFoot(false, owner ? "Book and add to planner" : "Send request")}`,
    async () => {
      const type = $("lv-type").querySelector('[aria-pressed="true"]').dataset.v;
      const from = $("lv-from").value,
        to = $("lv-to").value,
        half = from === to ? $("lv-half").value : "";
      if (!from || !to || to < from) {
        showErr("The last day must be on or after the first day.");
        return;
      }
      const now = Date.now(),
        id = "leave-" + newId();
      const data = {
        type: "leave",
        leaveType: type,
        from,
        to,
        half,
        note: $("lv-note").value.trim(),
        status: owner ? "approved" : "pending",
        requestedAt: now,
        created: now,
      };
      $("f-save").disabled = true;
      try {
        if (owner) {
          const w = $("lv-who").value;
          if (!w) {
            showErr("Choose who it's for.");
            $("f-save").disabled = false;
            return;
          }
          await S.db
            .doc("sheets/" + w + "/signoffs/" + id)
            .set(Object.assign(data, { answeredAt: now, reply: "Booked by James" }));
          await S.db.doc("plan/leave-" + id).set({
            from,
            to,
            type: "holiday",
            title: nameOf(w) + " – off",
            people: [w],
            vis: "all",
            notes: "",
            leaveId: id,
            created: now,
            updated: now,
          });
          closeForm();
          toast("Booked and added to the planner");
          render();
          return;
        }
        const r = await submitJob({ coll: "signoffs", docId: id, data });
        closeForm();
        toast(
          r === "queued"
            ? "Request kept on this phone. It will send when you have signal."
            : "Request sent to James",
        );
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    owner ? "lv-who" : "lv-from",
  );
  $("lv-type")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $("lv-type")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
  const upd = () => {
    const f = $("lv-from").value,
      t = $("lv-to").value;
    if (t < f) $("lv-to").value = f;
    const n = workDays(f, $("lv-to").value, f === $("lv-to").value && $("lv-half").value);
    $("lv-days").textContent = `${n} working day${n === 1 ? "" : "s"} (weekends not counted)`;
  };
  ["lv-from", "lv-to", "lv-half"].forEach((id) => $(id).addEventListener("input", upd));
  upd();
}
function openPlanEditor(p, date, copy) {
  const ids = teamIds();
  const isNew = !p;
  if (copy) p = null;
  const src = p || copy || null;
  const vis = src ? src.vis || "all" : "all";
  let files = ((src && src.files) || []).slice();
  const pcl =
    src && src.clientId && ownerMode()
      ? (S.clients || []).find((x) => x.id === src.clientId)
      : null;
  openSheet(
    `<h3 id="sheettitle">${isNew ? "Add to planner" : "Edit planner entry"}</h3>${pcl ? `<button type="button" class="btn backbtn" id="pe-client" style="align-self:flex-start">👤 Open client: ${esc(pcl.name)} (${esc(clStage(pcl.stage))})</button>` : ""}
    <label for="pe-title">What<input id="pe-title" required maxlength="100" placeholder="e.g. Kitchen fit, Building control visit, Skip delivery" value="${esc(src ? src.title : "")}"></label>
    <div><div class="flabel">Type</div><div class="seg" id="pe-type">${Object.entries(PTYPES)
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${(src ? src.type : "work") === k}">${l}</button>`,
      )
      .join("")}</div></div>
    <div class="grid2"><label for="pe-from">From<input id="pe-from" type="date" required value="${esc(p ? p.from : date)}"></label><label for="pe-to">To<input id="pe-to" type="date" required value="${esc(p ? p.to || p.from : copy ? date : date)}"></label></div>
    <div class="grid2"><label for="pe-time">Start time (optional)<input id="pe-time" type="time" value="${esc(src ? src.time || "" : "")}"></label><label for="pe-etime">End time (optional)<input id="pe-etime" type="time" value="${esc(src ? src.endTime || "" : "")}"></label></div>
    ${pickField("pe-site", "Site (optional)", siteNames(), src ? src.site || "" : "", "e.g. 12 Marine Way, Exmouth", false)}
    <label for="pe-job">Job sheet (optional)<select id="pe-job"><option value="">Not linked to a job sheet</option>${S.jobs
      .filter((j) => j.status !== "closed" || (src && src.jobId === j.id))
      .map(
        (j) =>
          `<option value="${esc(j.id)}" ${src && src.jobId === j.id ? "selected" : ""}>${esc(j.title)} · ${esc(j.site)}</option>`,
      )
      .join("")}</select></label>
    <div><div class="flabel">People</div><div class="seg" id="pe-who">${ids.map((id) => `<button type="button" data-v="${esc(id)}" aria-pressed="${src ? (src.people || []).includes(id) : false}">${esc(nameOf(id))}</button>`).join("") || '<span class="nothing">No employees yet.</span>'}</div></div>
    <div class="grid2"><label for="pe-contact">Contact name (optional)<input id="pe-contact" maxlength="80" value="${esc(src ? src.contact || "" : "")}" placeholder="e.g. Building control, Mr Smith"></label><label for="pe-phone">Contact phone (optional)<input id="pe-phone" type="tel" maxlength="20" value="${esc(src ? src.phone || "" : "")}"></label></div>
    <div><div class="flabel">Who can see it?</div><div class="seg" id="pe-vis">${Object.entries(VIS)
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${vis === k}">${l}</button>`,
      )
      .join("")}</div></div>
    <label for="pe-notes">Notes (optional)<textarea id="pe-notes" maxlength="3000" style="min-height:110px" placeholder="Everything people need to know: access, what to bring, who to ask for…">${esc(src ? src.notes || "" : "")}</textarea></label>
    <div><div class="flabel">Attach drawings, photos or documents (optional)</div><div id="pe-files" class="filerow"></div><input id="pe-up" type="file" accept="application/pdf,image/*,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple></div>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="pe-notify" ${isNew ? "checked" : ""}> <span id="pe-notifyl">${isNew ? "Tell them about it" : "Tell them it's changed"}</span> (pops up on their phone, and you'll see when they've opened it)</label>
    ${isNew ? `<div class="grid2"><label for="pe-rep">Repeat<select id="pe-rep"><option value="">Doesn't repeat</option><option value="wd">Every weekday (Mon–Fri)</option><option value="w1">Every week</option><option value="w2">Every 2 weeks</option><option value="m1">Every month</option></select></label><label for="pe-until" id="pe-untill" hidden>Until<input id="pe-until" type="date"></label></div>` : ""}
    ${formFoot(!isNew, isNew ? "Add" : "Save")}`,
    async () => {
      const one = (id) => $(id).querySelector('[aria-pressed="true"]').dataset.v;
      const jsel = $("pe-job").value,
        jj = jsel ? S.jobs.find((j) => j.id === jsel) : null;
      const data = {
        jobId: jj ? jj.id : "",
        jobTitle: jj ? jj.title : "",
        title: $("pe-title").value.trim(),
        type: one("pe-type"),
        from: $("pe-from").value,
        to: $("pe-to").value || $("pe-from").value,
        time: $("pe-time").value,
        site: pickVal("pe-site"),
        people: [...$("pe-who").querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.v),
        notes: $("pe-notes").value.trim(),
        updated: Date.now(),
        endTime: $("pe-etime").value,
        contact: $("pe-contact").value.trim(),
        phone: $("pe-phone").value.trim(),
      };
      const rep = $("pe-rep") ? $("pe-rep").value : "",
        until = $("pe-until") ? $("pe-until").value : "";
      if (rep && !until) {
        showErr("Choose the date it repeats until.");
        return;
      }
      const v = one("pe-vis");
      if (!data.title) {
        showErr("Say what it is.");
        return;
      }
      if (data.to < data.from) {
        showErr("The end date must be on or after the start date.");
        return;
      }
      if (v === "people" && !data.people.length) {
        showErr("Choose the people who can see it, or choose Everyone.");
        return;
      }
      $("f-save").disabled = true;
      try {
        const ups = [...($("pe-up").files || [])];
        for (const f of ups) {
          $("f-save").textContent = "Uploading…";
          const img = isImg(f.type) && !/svg/.test(f.type);
          const a = await uploadFile(img ? await shrinkImage(f) : f, f.name);
          files.push({
            id: a.id,
            name: f.name,
            type: img ? "image/jpeg" : a.contentType || f.type,
          });
        }
        data.files = files;
        const id = p ? p.id : newId();
        const coll = v === "me" ? "planprivate" : "plan";
        const oldColl = p ? (p.vis === "me" ? "planprivate" : "plan") : coll;
        if (p && oldColl !== coll) await noBin(() => S.db.doc(oldColl + "/" + id).delete());
        await S.db
          .doc(coll + "/" + id)
          .set(
            Object.assign(
              { created: (p && p.created) || Date.now() },
              data,
              v === "me" ? {} : { vis: v },
              p && p.leaveId ? { leaveId: p.leaveId } : {},
              src && src.clientId ? { clientId: src.clientId } : {},
            ),
          );
        let extra = 0;
        if (rep) {
          const len = Math.round((parse(data.to) - parse(data.from)) / 864e5);
          const series = id;
          let d = parse(data.from);
          const step = (x) =>
            rep === "wd"
              ? addDays(x, x.getDay() === 5 ? 3 : x.getDay() === 6 ? 2 : 1)
              : rep === "w1"
                ? addDays(x, 7)
                : rep === "w2"
                  ? addDays(x, 14)
                  : new Date(x.getFullYear(), x.getMonth() + 1, x.getDate());
          d = step(d);
          while (iso(d) <= until && extra < 120) {
            $("f-save").textContent = `Adding repeats (${extra + 1})…`;
            await S.db
              .doc(coll + "/" + newId())
              .set(
                Object.assign(
                  { created: Date.now() },
                  data,
                  { from: iso(d), to: iso(addDays(d, len)), series },
                  v === "me" ? {} : { vis: v },
                ),
              );
            extra++;
            d = step(d);
          }
          await S.db.doc(coll + "/" + id).update({ series });
        }
        let told = 0;
        if ($("pe-notify").checked && v !== "me") {
          const to =
            v === "all" && !data.people.length
              ? teamIds()
              : data.people.filter((x) => x !== S.me && S.team[x]);
          const when =
            shortDay(data.from) +
            (data.to !== data.from ? " – " + shortDay(data.to) : "") +
            (data.time ? " " + data.time : "");
          for (const w of to) {
            try {
              await S.db.doc("sheets/" + w + "/signoffs/pr-pl" + newId()).set({
                type: "prompt",
                form: "plan",
                ref: id,
                refLabel: data.title,
                note: (p ? "Changed: " : "") + when + (data.site ? " · " + data.site : ""),
                status: "open",
                created: Date.now(),
              });
              told++;
            } catch (e) {}
          }
        }
        S.week = monday(parse(data.from));
        closeForm();
        toast(
          (extra ? `Saved, plus ${extra} repeat${extra === 1 ? "" : "s"}` : "Saved") +
            (told ? ` · ${told} ${told === 1 ? "person" : "people"} told` : ""),
        );
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "pe-title",
  );
  if ($("pe-client"))
    $("pe-client").onclick = () => {
      closeForm();
      viewClient(pcl);
    };
  ["pe-type", "pe-vis"].forEach((g) =>
    $(g)
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            $(g)
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
      ),
  );
  $("pe-who")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
    );
  $("pe-job").addEventListener("change", () => {
    const j = S.jobs.find((x) => x.id === $("pe-job").value);
    if (j && !pickVal("pe-site")) {
      const sel = $("pe-site");
      if (sel.tagName === "SELECT" && [...sel.options].some((o) => o.value === j.site))
        sel.value = j.site;
      else if (sel.tagName === "INPUT") sel.value = j.site;
    }
  });
  $("pe-from").addEventListener("change", () => {
    if ($("pe-to").value < $("pe-from").value) $("pe-to").value = $("pe-from").value;
  });
  const drawFiles = () => {
    $("pe-files").innerHTML = files
      .map(
        (f, i) =>
          `<span class="pillbtn">📎 ${esc(f.name)} <button type="button" class="linkdanger pe-fx" data-i="${i}" aria-label="Remove ${esc(f.name)}">✕</button></span>`,
      )
      .join("");
    $("pe-files")
      .querySelectorAll(".pe-fx")
      .forEach(
        (b) =>
          (b.onclick = () => {
            files.splice(+b.dataset.i, 1);
            drawFiles();
          }),
      );
  };
  drawFiles();
  if ($("pe-rep"))
    $("pe-rep").onchange = (e) => {
      $("pe-untill").hidden = !e.target.value;
      if (e.target.value && !$("pe-until").value)
        $("pe-until").value = iso(addDays(parse($("pe-from").value || iso(new Date())), 27));
    };
  if (p)
    armDelete(async () => {
      await S.db.doc((p.vis === "me" ? "planprivate" : "plan") + "/" + p.id).delete();
    });
}
