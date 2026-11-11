/* ================= TRADES' LOOK: the trades' app in the new look – a Today page, five buttons along the bottom and everything else under More ================= */
import { $, esc, iso, store } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { curTab, empTabs, render } from "../core/tabs-week.js";
import { coData } from "./company-details.js";
import { amForeman } from "../people/foreman.js";
import { onDay, planEntries } from "../planner/time-off.js";
import { signOnly } from "../sites/sign-in-book.js";
export { tlApply, tlHome, tlMore };
/* The trades get the same look as James (body.nl-on, the styles in owner.css): no wall of buttons at the top, but a bar
   along the bottom on a phone (a side menu on an iPad or computer) with 🏠 Today, ⏱️ Time (📍 Sign in for sign-in-only
   people), 📋 Forms, 📷 Photos and ☰ More. Today says where they're booked, whether they're signed in, their hours so
   far, and what's waiting for them (forms, things to sign, checks due, talks, policies, chat), each a tap away; big
   buttons for the things they do most. More lists every other page they're allowed (Setup › People & access), in
   groups. It opens on Today each time the app is opened. Tests (navigator.webdriver) start in the old layout, which
   the older tests are written for; store "jeb.tradelook" true switches it on (tests/features/h500.js). */
const TL_BAR = [
  ["home", "Today", "🏠"],
  ["time", "Time", "⏱️"],
  ["jobs", "Forms", "📋"],
  ["photos", "Photos", "📷"],
  ["more", "More", "☰"],
];
const TL_GROUPS = [
  ["Work", ["foreman", "signin", "time", "mydw", "planner", "plans", "draw", "calc"]],
  ["Checks, safety and training", ["checks", "training", "policies"]],
  ["Materials", ["materials", "suppliers"]],
  ["Money", ["receipts", "invoices"]],
  ["You and the team", ["chat", "details"]],
];
let tlLanded = false;
const tlOn = () => {
  if (S.owner || ownerMode() || S.client) return false;
  if (!navigator.webdriver) return true;
  return !!store.get("jeb.tradelook", false);
};
/* the tabs this person has, as [key, label] (role access and sign-in-only already applied) */
const tlTabs = () => (amForeman() ? [["foreman", "🦺 Foreman"]] : []).concat(empTabs());
const tlLabel = (k) =>
  ((tlTabs().find((x) => x[0] === k) || [0, k])[1] || "").replace(/^\S+\s/, "");
const tlIcon = (k) => ((tlTabs().find((x) => x[0] === k) || [0, ""])[1] || "").split(" ")[0];
/* the bar's buttons for this person: Time becomes Sign in for sign-in-only people; parts they don't have are left out */
function tlBar() {
  const have = new Set(tlTabs().map((x) => x[0]));
  return TL_BAR.map((b) =>
    b[0] === "time" && signOnly(S.me) ? ["signin", "Sign in", "📍"] : b,
  ).filter(([k]) => k === "home" || k === "more" || have.has(k));
}
function tlGo(k) {
  if (k === "checks") S.f.rcat = "";
  if (k === "policies") S.f.polf = "";
  S.tab = k;
  store.set("jeb.tab", k);
  render();
  window.scrollTo(0, 0);
}
/* called on every render, after the owner's nlApply: the body class and the bar */
function tlApply() {
  const on = tlOn();
  let bar = $("tlbar");
  if (!on) {
    if (bar) bar.hidden = true;
    return;
  }
  if (!tlLanded) {
    tlLanded = true;
    S.tab = "home";
  }
  document.body.classList.add("nl-on");
  document.body.classList.toggle("nl-home", S.tab === "home");
  if (!bar) {
    bar = document.createElement("nav");
    bar.id = "tlbar";
    bar.className = "nlbar";
    bar.setAttribute("aria-label", "Sections");
    document.body.appendChild(bar);
  }
  bar.hidden = false;
  const hd = document.querySelector("header.top>div");
  const items = tlBar();
  const inBar = new Set(items.map((x) => x[0]));
  const badge = S.badgeNow || {};
  const t = curTab();
  const moreN = tlTabs()
    .filter(([k]) => !inBar.has(k))
    .reduce((s, [k]) => s + (badge[k] || 0), 0);
  const cur = inBar.has(t) ? t : "more";
  const co = (coData().name || "SiteHQ").trim();
  const tile = co
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  /* the letters in the square beside the page title, as on James's */
  if (hd) hd.dataset.tile = tile;
  bar.innerHTML =
    `<div class="nl-brand"><span class="nl-tile2" aria-hidden="true">${esc(tile)}</span><b>SiteHQ</b></div>` +
    items
      .map(([k, l, i]) => {
        const n = k === "more" ? moreN : k === "home" ? 0 : badge[k] || 0;
        return `<button type="button" class="nl-b tl-b" data-t="${k}"${k === cur ? ' aria-current="page"' : ""}><span class="nl-ic"><span class="tl-i" aria-hidden="true">${i}</span>${n ? `<span class="nl-dot">${n}</span>` : ""}</span><span class="nl-l">${esc(l)}</span></button>`;
      })
      .join("");
  bar.querySelectorAll(".tl-b").forEach((b) => (b.onclick = () => tlGo(b.dataset.t)));
}
/* 🏠 Today */
function tlHome() {
  const today = iso(new Date());
  const badge = S.badgeNow || {};
  const first = String((S.myProfile && S.myProfile.name) || "").split(" ")[0];
  const hr = new Date().getHours();
  const hello = hr < 12 ? "Morning" : hr < 18 ? "Afternoon" : "Evening";
  const have = new Set(tlTabs().map((x) => x[0]));
  /* where they're booked today */
  let booked = [];
  try {
    booked = planEntries().filter((p) => onDay(p, today) && !p.pending);
  } catch (e) {}
  /* signed in? */
  const sins = (S.mine.signins || []).filter((x) => x.date === today);
  const inNow = sins.find((x) => !x.out);
  /* hours so far today */
  const hrs = (S.mine.entries || [])
    .filter((e) => e.date === today && e.type === "hours")
    .reduce((s, e) => s + (+e.hours || 0), 0);
  /* what's waiting */
  const waits = [
    ["jobs", badge.jobs, "form, job or to-do to do", "forms, jobs or to-dos to do"],
    [
      "plans",
      badge.plans,
      "thing to read and sign for a site",
      "things to read and sign for a site",
    ],
    ["checks", badge.checks, "check due", "checks due"],
    ["training", badge.training, "toolbox talk to sign", "toolbox talks to sign"],
    ["policies", badge.policies, "policy to read", "policies to read"],
    ["chat", badge.chat, "new chat message", "new chat messages"],
    ["time", badge.time, "timesheet reminder", "timesheet reminders"],
  ].filter(([k, n]) => n && have.has(k));
  const tiles = [
    signOnly(S.me) || have.has("signin")
      ? [
          "signin",
          inNow ? "📍 Signed in" : "📍 Sign in",
          inNow
            ? `At ${inNow.site || "site"} since ${inNow.in || ""}`
            : "At a site, when you get there",
        ]
      : null,
    have.has("time")
      ? [
          "time",
          "⏱️ My hours",
          hrs ? `${hrs} hour${hrs === 1 ? "" : "s"} today` : "Fill in today's",
        ]
      : null,
    have.has("checks")
      ? ["checks", "🚐 Do a check", "Van, digger or machine – scan its sticker"]
      : null,
    have.has("photos") ? ["photos", "📷 Take a photo", "Progress, a problem or a drawing"] : null,
    have.has("jobs")
      ? ["jobs", "📋 Forms", badge.jobs ? `${badge.jobs} to do` : "Jobs, snags and to-dos"]
      : null,
    have.has("chat")
      ? ["chat", "💬 Chat", badge.chat ? `${badge.chat} new` : "Talk to the team"]
      : null,
  ].filter(Boolean);
  $("main").innerHTML = `<div class="nl-today tl-home">
    <h2 class="nl-h">${esc(hello)}${first ? ", " + esc(first) : ""}</h2>
    <section class="nl-card"><div class="nl-cardh"><h2>Where you're working</h2></div>
      ${
        booked.length
          ? booked
              .map(
                (p) =>
                  `<div class="nl-row"><b>${esc(p.site || p.title || "Booked")}</b><span class="who">${esc([p.site ? p.title : "", p.type === "holiday" ? "Time off" : ""].filter(Boolean).join(" · "))}</span></div>`,
              )
              .join("")
          : `<div class="who">Nothing booked for you on the planner today.</div>`
      }
      ${have.has("planner") ? `<button type="button" class="btn nl-wide tl-go" data-t="planner">🗓️ My week on the planner</button>` : ""}
    </section>
    ${
      waits.length
        ? `<section class="nl-card"><div class="nl-cardh"><h2>Waiting for you</h2></div>${waits
            .map(
              ([k, n, l1, l2]) =>
                `<button type="button" class="nl-row2 tl-go" data-t="${k}"><span class="nl-rl"><b>${n}</b> ${esc(n === 1 ? l1 : l2)}</span><span class="nl-chev" aria-hidden="true">›</span></button>`,
            )
            .join("")}</section>`
        : `<section class="nl-card"><div class="who">✓ Nothing waiting for you. Good work.</div></section>`
    }
    <div class="nl-tiles">${tiles
      .map(
        ([k, l, s]) =>
          `<button type="button" class="nl-tile tl-go" data-t="${k}"><span>${esc(l)}</span><span class="who">${esc(s)}</span></button>`,
      )
      .join("")}</div>
  </div>`;
  $("main")
    .querySelectorAll(".tl-go")
    .forEach((b) => (b.onclick = () => tlGo(b.dataset.t)));
}
/* ☰ More: every page they have that isn't in the bar */
function tlMore() {
  const inBar = new Set(tlBar().map((x) => x[0]));
  const have = tlTabs().map((x) => x[0]);
  const badge = S.badgeNow || {};
  const groups = TL_GROUPS.map(([t, ks]) => [
    t,
    ks.filter((k) => have.includes(k) && !inBar.has(k)),
  ]);
  const left = have.filter((k) => !inBar.has(k) && !groups.some((g) => g[1].includes(k)));
  if (left.length) groups.push(["Other", left]);
  $("main").innerHTML = `<div class="nl-secpage tl-more"><div class="nl-groups">${groups
    .filter((g) => g[1].length)
    .map(
      ([t, ks]) =>
        `<section class="nl-grp"><div class="nl-grph"><h2>${esc(t)}</h2></div>${ks
          .map(
            (k) =>
              `<button type="button" class="nl-row2 tl-go" data-t="${k}"><span class="nl-rl">${tlIcon(k)} ${esc(tlLabel(k))}</span>${badge[k] ? `<span class="nl-new">${badge[k]}</span>` : ""}<span class="nl-chev" aria-hidden="true">›</span></button>`,
          )
          .join("")}</section>`,
    )
    .join("")}</div></div>`;
  $("main")
    .querySelectorAll(".tl-go")
    .forEach((b) => (b.onclick = () => tlGo(b.dataset.t)));
}
