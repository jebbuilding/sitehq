/* ================= NEW LOOK (owner): Today home screen, five sections, bottom bar on phones / side menu on big screens ================= */
import { webEnqNew, webView } from "../clients/web-enquiries.js";
import { $, esc, store } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { OWN_TABS, render } from "../core/tabs-week.js";
import { coData } from "./company-details.js";
import { searchOpen } from "./search.js";
import { tdChatCard, tdSitesCard, tdWire } from "./today-cards.js";
import { qaOpen, tdDeskWire, tdjCard, tdoCard, tdwCard } from "./today-desk.js";
import { dueSoonCard } from "../safety/expiry-dates.js";
import { onSiteNow, openRollCall } from "../sites/roll-call.js";
export { nlApply, nlGo, nlName, nlOn, nlOpenTab, nlSectionView, todayView };
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
      "signin",
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
  ["people", "People", ["people", "inductions", "wages", "time", "training", "chat"]],
  [
    "paper",
    "Paperwork",
    [
      "jobs",
      "me",
      "hs",
      "policies",
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
/* each section's page: groups of tabs, as in the layout pictures (a third item true = only James sees it) */
const NL_GROUPS = {
  jobs: [
    ["Jobs and sites", ["projects", "signin", "planner", "daywork", "photos", "draw"]],
    ["Clients", ["clients", "leads", "portal", "samples"]],
    ["Materials and tools", ["materials", "calc"]],
  ],
  people: [
    ["Your team", ["people", "inductions", "training", "chat"]],
    ["Time and pay", ["time", "wages"]],
  ],
  paper: [
    ["Health & safety", ["hs", "checks", "jobs", "me"]],
    ["Money", ["accounts", "sales", "invoices", "cis", "costs"], true],
    ["Company and suppliers", ["policies", "suppliers", "materials"]],
  ],
};
/* what Today asks James to look at: [tab, words] – shown when that tab has a count */
const NL_NEEDS = [
  ["clients", "New enquiries"],
  ["planner", "Time off to answer"],
  ["jobs", "Jobs ready to sign off"],
  ["checks", "Problems reported"],
  ["invoices", "Invoices to check"],
  ["accounts", "Receipts to file"],
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
  const coName = (coData().name || "SiteHQ").trim();
  const tile = (/^[A-Z]{2,4}\b/.exec(coName) || [
    coName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
  ])[0];
  bar.innerHTML =
    `<div class="nl-brand"><span class="nl-tile2" aria-hidden="true">${esc(tile)}</span><b>SiteHQ</b></div>` +
    NL_SECTIONS.map(([k, name, tabs]) => {
      const n = k === "today" ? 0 : tabs.reduce((s, t) => s + (badge[t] || 0), 0);
      return `<button type="button" class="nl-b" data-s="${k}"${k === cur ? ' aria-current="page"' : ""}><span class="nl-ic">${NL_ICON[k]}${n ? `<span class="nl-dot">${n}</span>` : ""}</span><span class="nl-l nl-ls">${k === "jobs" ? "Jobs" : name}</span><span class="nl-l nl-lw">${esc(name)}</span></button>`;
    }).join("") +
    `<button type="button" class="nl-add" id="nl-add" aria-label="Add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span class="nl-lw">Add</span></button>`;
  $("nl-add").onclick = qaOpen;
  /* the page title: the date above it on Today */
  const hd = document.querySelector("header.top>div");
  if (hd) hd.dataset.tile = tile;
  const h1 = $("h1");
  if (h1)
    h1.dataset.date =
      S.otab === "today"
        ? new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
        : "";
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
  const badge = S.badgeNow || {};
  const needs = NL_NEEDS.filter(([k]) => badge[k] > 0);
  $("main").innerHTML = `<div class="nl-today">
    <button type="button" class="nl-search" id="nl-search"><span aria-hidden="true">🔍</span> Search a job, a name, or RAMS, MOT, snags…</button>
    ${
      needs.length
        ? `<div class="nl-tiles nl-needs">${needs
            .map(
              ([k, l]) =>
                `<button type="button" class="nl-tile" data-t="${k}"><span class="nl-n">${badge[k]}</span><span>${esc(l)}</span></button>`,
            )
            .join("")}</div>`
        : '<div class="nl-card who">Nothing waiting for you. 👍</div>'
    }
    ${tdwCard()}
    <div class="nl-cols">
      <div class="nl-colL">${tdjCard()}<div class="td-two">${tdChatCard()}${tdSitesCard()}</div></div>
      <div class="nl-colR">${tdoCard()}${dueSoonCard("all")}</div>
    </div>
    ${webEnqNew().length ? `<button type="button" class="nl-card nl-web" id="nl-web"><b>🌐 ${webEnqNew().length} new enquir${webEnqNew().length === 1 ? "y" : "ies"} from your website</b><span class="who">Tap to see and make quick enquiries</span></button>` : ""}
  </div>`;
  $("nl-search").onclick = () => searchOpen("");
  tdWire();
  tdDeskWire();
  if ($("nl-web")) $("nl-web").onclick = () => webView();
  const rows = onSiteNow();
  $("nl-roll").onclick = () => (rows.length ? openRollCall() : nlOpenTab("signin"));
  $("main")
    .querySelectorAll(".nl-tile")
    .forEach((x) => (x.onclick = () => nlOpenTab(x.dataset.t)));
}

/* a section page: one big button per tab in it, with its count */
function nlSectionView(k) {
  const sec = NL_SECTIONS.find((x) => x[0] === k) || NL_SECTIONS[1];
  const badge = S.badgeNow || {};
  const groups = (NL_GROUPS[sec[0]] || [[sec[1], sec[2]]]).map(([t, tabs, priv]) => [
    t,
    tabs.filter((x) => sec[2].includes(x)),
    priv,
  ]);
  const left = sec[2].filter((t) => !groups.some((g) => g[1].includes(t)));
  if (left.length) groups.push(["More", left]);
  const waiting = NL_NEEDS.filter(([t]) => sec[2].includes(t) && badge[t] > 0);
  const nWait = waiting.reduce((a, [t]) => a + badge[t], 0);
  $("main").innerHTML = `<div class="nl-secpage">
    ${nWait ? `<button type="button" class="nl-banner" data-t="${waiting[0][0]}"><span class="nl-bn">${nWait}</span><span><b>${nWait} waiting for you</b><br><small>${waiting.map(([t, l]) => badge[t] + " " + l.toLowerCase()).join(", ")}</small></span><span aria-hidden="true">Open ›</span></button>` : ""}
    <div class="nl-groups">${groups
      .filter((g) => g[1].length)
      .map(
        ([t, tabs, priv]) =>
          `<section class="nl-grp"><div class="nl-grph"><h2>${esc(t)}</h2>${priv ? '<span class="nl-only">🔒 Only you</span>' : ""}</div>${tabs
            .map(
              (x) =>
                `<button type="button" class="nl-row2 nl-go" data-t="${x}"><span class="nl-rl">${esc(nlTabLabel(x))}</span>${badge[x] ? `<span class="nl-new">${badge[x]} new</span>` : ""}<span class="nl-chev" aria-hidden="true">›</span></button>`,
            )
            .join("")}</section>`,
      )
      .join("")}</div>
    ${k === "setup" ? `<div class="notice" style="margin-top:14px">This is the new look. <button type="button" class="pillbtn" id="nl-old">Go back to the old look</button></div>` : ""}</div>`;
  $("main")
    .querySelectorAll(".nl-go, .nl-banner")
    .forEach((x) => (x.onclick = () => nlOpenTab(x.dataset.t)));
  if ($("nl-old"))
    $("nl-old").onclick = () => {
      nlSet(false);
      nlGo("time");
    };
}
