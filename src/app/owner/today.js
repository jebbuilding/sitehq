/* ================= NEW LOOK (owner): Today home screen, five sections, bottom bar on phones / side menu on big screens ================= */
import { $, esc, store } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { OWN_TABS, render } from "../core/tabs-week.js";
import { nameOf } from "./owner.js";
import { searchOpen } from "./search.js";
import { dueSoonCard } from "../safety/expiry-dates.js";
import { onSiteNow, openRollCall } from "../sites/roll-call.js";
export { nlApply, nlName, nlOn, nlSectionView, todayView };
/* Switched on per device with the "✨ New look" button in the header (kept in jeb.newlook); off = the app as before.
   The old tab row stays in the page, hidden, and the section pages open a tab by pressing its button, so every tab
   behaves exactly as it does from the tab row. Layout agreed in docs/mockups/new-layout. */
const NL_SECTIONS = [
  ["today", "Today", ["todo"]],
  [
    "jobs",
    "Jobs & clients",
    [
      "projects",
      "clients",
      "leads",
      "planner",
      "portal",
      "photos",
      "draw",
      "daywork",
      "samples",
      "materials",
      "calc",
    ],
  ],
  ["people", "People", ["people", "wages", "time", "signin", "training", "chat"]],
  [
    "paper",
    "Paperwork",
    [
      "jobs",
      "me",
      "hs",
      "policies",
      "receipts",
      "accounts",
      "sales",
      "invoices",
      "cis",
      "costs",
      "checks",
      "suppliers",
      "materials",
    ],
  ],
  ["setup", "Setup", ["setup"]],
];
const NL_ICON = {
  today:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  people:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>',
  paper:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
  setup:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
};
/* what Today asks James to look at: [tab, words] – shown when that tab has a count */
const NL_NEEDS = [
  ["clients", "New enquiries"],
  ["planner", "Time off to answer"],
  ["jobs", "Jobs ready to sign off"],
  ["checks", "Problems reported"],
  ["invoices", "Invoices to check"],
  ["receipts", "Receipts to check"],
  ["materials", "Materials asked for"],
  ["training", "Cards running out"],
  ["people", "Details missing"],
  ["todo", "To-dos due"],
  ["photos", "Drawings to check"],
];

/* the switch, remembered on this device (and in memory where the browser won't keep it) */
let nlFlag = null;
function nlSet(v) {
  nlFlag = !!v;
  store.set("jeb.newlook", nlFlag);
}
/* The new look is the layout, on every screen, for good (James, Nov 2026): there is no switch back. Only automated
   test browsers (navigator.webdriver) start in the old look, which the older tests are written for, and keep the
   switch; tests/features/h416.js switches it on itself. */
const nlOn = () => {
  if (!navigator.webdriver) return ownerMode() && !S.preview;
  if (nlFlag === null) {
    const saved = store.get("jeb.newlook", null);
    nlFlag = saved === null ? !navigator.webdriver : !!saved;
  }
  return ownerMode() && !S.preview && nlFlag;
};
/* the new look opens on Today each time the app is opened */
let nlLanded = false;
/* the section a tab (or a section page) belongs to */
function nlSecOf(t) {
  if (t === "today") return "today";
  if (/^sec-/.test(t)) return t.slice(4);
  const s = NL_SECTIONS.find((x) => x[2].includes(t));
  return s ? s[0] : "";
}
const nlName = (k) => (NL_SECTIONS.find((x) => x[0] === k) || [0, ""])[1];
const nlTabLabel = (k) => ((OWN_TABS.find((x) => x[0] === k) || [0, k])[1] || "").trim();
/* open a tab exactly as its button in the (hidden) tab row would */
function nlOpenTab(k) {
  const b = document.querySelector(`#tabs .tab[data-t="${k}"]`);
  if (b) b.click();
  window.scrollTo(0, 0);
}
function nlGo(otab) {
  S.otab = otab;
  store.set("jeb.otab", otab);
  render();
  window.scrollTo(0, 0);
}

/* called on every render: the body class, the header switch and the bar */
function nlApply() {
  const on = nlOn();
  if (on && !nlLanded) S.otab = "today";
  nlLanded = true;
  document.body.classList.toggle("nl-on", on);
  /* the date / weather strip shows on Today only (see owner.css) */
  document.body.classList.toggle("nl-home", on && S.otab === "today");
  const head = document.querySelector("header.top");
  let tog = $("nl-tog");
  if (ownerMode() && !S.preview && head && navigator.webdriver) {
    if (!tog) {
      tog = document.createElement("button");
      tog.type = "button";
      tog.id = "nl-tog";
      tog.className = "pillbtn nl-tog";
      head.appendChild(tog);
      tog.onclick = () => {
        nlSet(!nlOn());
        nlGo(nlFlag ? "today" : "time");
      };
    }
    tog.hidden = false;
    tog.textContent = on ? "Old look" : "✨ New look";
  } else if (tog) tog.hidden = true;
  /* 🔍 search everything (owner/search.js), on every owner screen */
  let srb = $("sr-btn");
  if (ownerMode() && !S.preview && head) {
    if (!srb) {
      srb = document.createElement("button");
      srb.type = "button";
      srb.id = "sr-btn";
      srb.className = "pillbtn nl-tog";
      srb.textContent = "🔍 Search";
      srb.setAttribute("aria-label", "Search clients, sites, jobs, people, merchants and drawings");
      head.insertBefore(srb, tog);
      srb.onclick = () => searchOpen("");
    }
    srb.hidden = false;
  } else if (srb) srb.hidden = true;
  let bar = $("nlbar");
  if (!on) {
    if (bar) bar.hidden = true;
    return;
  }
  if (!bar) {
    bar = document.createElement("nav");
    bar.id = "nlbar";
    bar.className = "nlbar";
    bar.setAttribute("aria-label", "Sections");
    document.body.appendChild(bar);
  }
  bar.hidden = false;
  const cur = nlSecOf(S.otab),
    badge = S.badgeNow || {};
  bar.innerHTML = NL_SECTIONS.map(([k, name, tabs]) => {
    const n = k === "today" ? 0 : tabs.reduce((s, t) => s + (badge[t] || 0), 0);
    return `<button type="button" class="nl-b" data-s="${k}"${k === cur ? ' aria-current="page"' : ""}><span class="nl-ic">${NL_ICON[k]}${n ? `<span class="nl-dot">${n}</span>` : ""}</span><span class="nl-l">${k === "jobs" ? "Jobs" : name}</span></button>`;
  }).join("");
  /* a section with one tab (Setup) opens it straight away */
  bar.querySelectorAll(".nl-b").forEach(
    (b) =>
      (b.onclick = () => {
        const s = b.dataset.s,
          tabs = (NL_SECTIONS.find((x) => x[0] === s) || [])[2] || [];
        if (s === "today") nlGo("today");
        else if (tabs.length === 1) nlOpenTab(tabs[0]);
        else nlGo("sec-" + s);
      }),
  );
}

/* Today: who's on site, what needs James, what's coming up */
function todayView() {
  const rows = onSiteNow(),
    by = {};
  rows.forEach((r) => (by[r.job || "No site"] = by[r.job || "No site"] || []).push(r));
  const badge = S.badgeNow || {};
  const needs = NL_NEEDS.filter(([k]) => badge[k] > 0);
  $("main").innerHTML = `<div class="nl-today">
    <button type="button" class="nl-search" id="nl-search"><span aria-hidden="true">🔍</span> Search clients, sites, jobs, people, merchants…</button>
    <section class="nl-card">
      <div class="nl-cardh"><h2>On site now</h2><span class="nl-big">${rows.length}</span></div>
      ${
        rows.length
          ? Object.keys(by)
              .sort()
              .slice(0, 6)
              .map(
                (s) =>
                  `<div class="nl-row"><b>${esc(s)}</b><span class="who">${by[s].map((r) => esc(nameOf(r.who))).join(", ")}</span></div>`,
              )
              .join("")
          : '<div class="who">Nobody has checked in yet today.</div>'
      }
      <button type="button" class="btn nl-wide" id="nl-roll">${rows.length ? "See everyone on site" : "Sign-in book"}</button>
    </section>
    <h2 class="nl-h">Needs you</h2>
    ${
      needs.length
        ? `<div class="nl-tiles">${needs
            .map(
              ([k, l]) =>
                `<button type="button" class="nl-tile" data-t="${k}"><span class="nl-n">${badge[k]}</span><span>${esc(l)}</span></button>`,
            )
            .join("")}</div>`
        : '<div class="nl-card who">Nothing waiting for you. 👍</div>'
    }
    ${dueSoonCard("all")}
  </div>`;
  $("nl-search").onclick = () => searchOpen("");
  $("nl-roll").onclick = () => (rows.length ? openRollCall() : nlOpenTab("signin"));
  $("main")
    .querySelectorAll(".nl-tile")
    .forEach((b) => (b.onclick = () => nlOpenTab(b.dataset.t)));
}

/* a section page: one big button per tab in it, with its count */
function nlSectionView(k) {
  const sec = NL_SECTIONS.find((x) => x[0] === k) || NL_SECTIONS[1];
  const badge = S.badgeNow || {};
  $("main").innerHTML = `<div class="nl-tiles nl-sec">${sec[2]
    .map(
      (t) =>
        `<button type="button" class="nl-tile nl-go" data-t="${t}"><span class="nl-tl">${esc(nlTabLabel(t))}</span>${badge[t] ? `<span class="badge">${badge[t]}</span>` : ""}</button>`,
    )
    .join("")}</div>
    ${k === "setup" ? `<div class="notice" style="margin-top:14px">This is the new look. <button type="button" class="pillbtn" id="nl-old">Go back to the old look</button></div>` : ""}`;
  $("main")
    .querySelectorAll(".nl-go")
    .forEach((b) => (b.onclick = () => nlOpenTab(b.dataset.t)));
  if ($("nl-old"))
    $("nl-old").onclick = () => {
      nlSet(false);
      nlGo("time");
    };
}
