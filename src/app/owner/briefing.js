/* ================= MORNING BRIEFING: the day in one card at the top of Today – who's where, what's on, weather, money, and what's waiting ================= */
import { addDays, esc, gbp, iso, shortDay } from "../core/helpers.js";
import { S } from "../core/state.js";
import { coData } from "./company-details.js";
import { nlGo } from "./today.js";
import { pbPending } from "../planner/board.js";
import { eqmToBook, eqmView } from "../planner/plant-care.js";
import { onDay, planEntries } from "../planner/time-off.js";
import { wpProblems } from "../planner/weather-plan.js";
import { daysTo } from "../safety/expiry-dates.js";
import { acCfg } from "../sales/acct-data.js";
import { adOwedIn, adOwedOut } from "../sales/acct-due.js";
import { csfPlan } from "../sales/cash-flow.js";
import { gpToChase } from "../sales/getting-paid.js";
import { sdSigned } from "../sales/sales-calc.js";
import { appAll, appCalc } from "../sales/valuations.js";
import { taskDone } from "../sites/job-sheets.js";
import { onSiteNow } from "../sites/roll-call.js";
export { brfCardHtml, brfWire };
/* One card that reads like a briefing: who's on site and who's booked in today, what's happening today (deliveries,
   inspections, key dates, vehicles in for MOT), weather problems in the next three days, money (overdue invoices and
   reminders due, bills due this week, the lowest the bank goes in the next 13 weeks, pay less notice deadlines), and
   what's waiting for James (holiday requests, vans and plant to book in, open snags). Only the lines with something in
   them show; each one opens the place to deal with it. Everything is read from what's already in the app. */
function brfLines() {
  const L = [];
  const today = iso(new Date());
  const add = (icon, text, go, warn) => L.push({ icon, text, go, warn });
  const safe = (f) => {
    try {
      f();
    } catch (e) {}
  };
  const toTab = (otab, f) => () => {
    if (f) Object.assign(S.f, f);
    nlGo(otab);
  };
  safe(() => {
    const rows = onSiteNow();
    const sites = [...new Set(rows.map((r) => r.site))];
    const booked = planEntries().filter((p) => onDay(p, today) && p.type === "work");
    const people = [...new Set(booked.flatMap((p) => p.people || []))];
    if (rows.length || booked.length)
      add(
        "👷",
        `${rows.length ? `${rows.length} on site now${sites.length ? " (" + sites.slice(0, 3).join(", ") + (sites.length > 3 ? "…" : "") + ")" : ""}` : "Nobody signed in yet"}${people.length ? ` · ${people.length} booked in on the planner` : ""}`,
        toTab("planner"),
      );
  });
  safe(() => {
    const on = planEntries().filter(
      (p) =>
        onDay(p, today) &&
        ["delivery", "inspection", "keydate", "meeting", "vehicle"].includes(p.type),
    );
    if (on.length)
      add(
        "📅",
        `Today: ${on
          .slice(0, 3)
          .map((p) => p.title)
          .join(" · ")}${on.length > 3 ? ` and ${on.length - 3} more` : ""}`,
        toTab("planner"),
      );
  });
  safe(() => {
    const wp = wpProblems().filter((x) => x.d && x.d <= iso(addDays(new Date(), 3)));
    if (wp.length)
      add(
        "🌧",
        `${wp.length} booking${wp.length === 1 ? "" : "s"} at risk from the weather in the next 3 days`,
        toTab("planner"),
        true,
      );
  });
  safe(() => {
    const ow = adOwedIn().filter((x) => x.over > 0);
    const chase = gpToChase().filter((x) => x.due).length;
    if (ow.length)
      add(
        "💷",
        `${gbp(ow.reduce((a, x) => a + x.amt, 0))} overdue on ${ow.length} invoice${ow.length === 1 ? "" : "s"}${chase ? ` · ${chase} reminder${chase === 1 ? "" : "s"} to send today` : ""}`,
        toTab("accounts", { act: "gp" }),
        true,
      );
  });
  safe(() => {
    const week = iso(addDays(new Date(), 7));
    const bills = adOwedOut().filter((x) => x.due <= week);
    if (bills.length)
      add(
        "🧾",
        `${bills.length} bill${bills.length === 1 ? "" : "s"} to pay this week: ${gbp(bills.reduce((a, x) => a + x.amt, 0))}`,
        toTab("accounts", { act: "due" }),
      );
  });
  safe(() => {
    if (!acCfg().accounts.length) return;
    const { W } = csfPlan();
    const low = W.reduce((a, w) => (w.bal < a.bal ? w : a), W[0]);
    if (low.bal < 0)
      add(
        "📉",
        `The bank goes overdrawn (${sdSigned(low.bal)}) in the week of ${shortDay(low.from)}`,
        toTab("accounts", { act: "cf" }),
        true,
      );
  });
  safe(() => {
    const due = appAll().filter(
      (v) => !v.paidAt && appCalc(v).plDate >= today && daysTo(appCalc(v).plDate) <= 3,
    );
    if (due.length)
      add(
        "🏗",
        `Pay less notice deadline${due.length === 1 ? "" : "s"} in the next 3 days on ${due.map((v) => v.site).join(", ")}`,
        toTab("accounts", { act: "app" }),
        true,
      );
  });
  safe(() => {
    const n = pbPending().length;
    if (n)
      add("🌴", `${n} holiday request${n === 1 ? "" : "s"} waiting for an answer`, toTab("people"));
  });
  safe(() => {
    const n = eqmToBook().length;
    if (n)
      add(
        "🚐",
        `${n} van${n === 1 ? "" : "s"} or plant to book in (MOT, service or inspection)`,
        () => eqmView(),
      );
  });
  safe(() => {
    let n = 0;
    (S.jobs || [])
      .filter((j) => j.kind === "snag" && j.status !== "closed")
      .forEach((j) => (j.tasks || []).forEach((t) => !(taskDone(j, t) || {}).done && n++));
    if (n) add("📸", `${n} snag${n === 1 ? "" : "s"} still open`, toTab("jobs"));
  });
  return L;
}
function brfCardHtml() {
  const h = new Date().getHours();
  const hi = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = String(S.ownerName || coData().owner || "").split(" ")[0];
  const L = brfLines();
  return `<section class="nl-card brf"><div class="brf-h"><b>${hi}${first ? " " + esc(first) : ""}</b><span class="who">${esc(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}</span></div>
    ${L.length ? L.map((l, i) => `<button type="button" class="brf-l${l.warn ? " warn" : ""}" data-i="${i}"><span class="brf-i" aria-hidden="true">${l.icon}</span><span>${esc(l.text)}</span><span class="nl-chev" aria-hidden="true">›</span></button>`).join("") : `<div class="who">A quiet one – nothing needs you this morning.</div>`}</section>`;
}
function brfWire() {
  const L = brfLines();
  document.querySelectorAll(".brf-l").forEach(
    (b) =>
      (b.onclick = () => {
        const l = L[+b.dataset.i];
        if (l && l.go) l.go();
      }),
  );
}
