/* ================= WEEK CLOSE: Friday's close – approve the week, pay with CIS taken off, day work to bill ================= */
import {
  $,
  addDays,
  esc,
  gbp,
  hrs,
  iso,
  shortDay,
  stamp,
  store,
  toMin,
  toast,
} from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { nameOf, teamPlusMe, weekEntries } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { cisDown, cisRateOf } from "../sales/cis-returns.js";
import { siteLabel } from "../sites/job-details.js";
import { siteClient } from "../sites/summary.js";
import { dwRate } from "./day-work.js";
import { openPaySummary } from "./pay-summary.js";
import { sumH } from "./time.js";
import { dayFor } from "./working-day.js";
export { wkcOpen, wkcRec };
/* James (Nov 2026): "close the week and pay in one go". Timesheets › ✅ Close the week, for the week shown:
   1. Check: days never checked out, days still to approve, and ✅ Approve everything (open check-ins are left – they
      count 0 until a finish is put in).
   2. Pay: each person's hours × their rate (typed once, kept private to James: todos/payrates); for a CIS subcontractor
      the deduction at their CIS rate (20%, 30% or gross, from CIS returns) and what to pay them; for an employee the
      gross, with tax and NI left to payroll. Copy the list, or the pay summary PDF.
   3. Day work to bill: each job's day work this week with its value at the day work rates, opening Day work for
      that job to make the sheet for the client.
   🔒 Close the week keeps a record of what was paid (todos/wkclose-{monday}). */
const wkcId = () => "wkclose-" + iso(S.week);
const wkcRec = () => (S.weekCloses || []).find((x) => x.id === wkcId()) || null;
const wkcRateOf = (id) => {
  const p = ((S.payRates || {}).per || {})[id];
  if (p != null && p !== "") return +p || 0;
  const det = (S.team[id] && S.team[id].details) || {};
  const D = dayFor(id);
  const h = (toMin(D.e) - toMin(D.s) - (+D.lm || 0)) / 60;
  return +det.dayRate && h > 0 ? Math.round((+det.dayRate / h) * 100) / 100 : 0;
};
const wkcIsCis = (id) => ((S.team[id] && S.team[id].details) || {}).empType === "cis";
function wkcData() {
  const ids = teamPlusMe().filter((id) => id !== S.me);
  const people = ids
    .map((id) => {
      const we = weekEntries(id);
      const hours = sumH(we, (e) => e.type === "hours");
      const rate = wkcRateOf(id);
      const gross = Math.round(hours * rate * 100) / 100;
      const cis = wkcIsCis(id);
      const pc = cis ? +cisRateOf(id) : 0;
      const ded = cis ? cisDown((gross * pc) / 100) : 0;
      return {
        id,
        we,
        hours,
        rate,
        gross,
        cis,
        pc,
        ded,
        net: Math.round((gross - ded) * 100) / 100,
        open: we.filter((e) => e.open).length,
        unapp: we.filter((e) => !e.approved && !e.open).length,
      };
    })
    .filter((r) => r.we.length);
  const jobs = {};
  people.forEach((r) =>
    r.we
      .filter((e) => e.type === "job" && e.kind === "extra")
      .forEach((e) => {
        const k = (e.job || "").trim() || "No site given";
        const j = (jobs[k.toLowerCase()] = jobs[k.toLowerCase()] || { site: k, h: 0, v: 0 });
        j.h += +e.hours || 0;
        j.v += (+e.hours || 0) * dwRate(r.id);
      }),
  );
  return { people, jobs: Object.values(jobs).sort((a, b) => b.v - a.v || b.h - a.h) };
}
function wkcHtml() {
  const { people, jobs } = wkcData();
  const rec = wkcRec();
  const wk = `${shortDay(iso(S.week))} – ${shortDay(iso(addDays(S.week, 6)))}`;
  const open = people.reduce((a, r) => a + r.open, 0),
    unapp = people.reduce((a, r) => a + r.unapp, 0);
  const tot = (k) => people.reduce((a, r) => a + r[k], 0);
  return `<h2 class="wkc-h">✅ Close the week</h2><div class="who">Week of ${esc(wk)}${rec ? ` · <b>closed ${esc(stamp(rec.closedAt))}</b>` : ""}</div>
    <div class="wkc-step"><h3>1 · Check</h3>
    ${people.length ? "" : '<div class="nothing">No timesheets this week.</div>'}
    ${
      open
        ? `<div class="notice warn">⚠️ ${open} day${open === 1 ? "" : "s"} never checked out (${people
            .filter((r) => r.open)
            .map((r) => esc(nameOf(r.id)))
            .join(", ")}). They count 0 hours until a finish is put in on Timesheets.</div>`
        : ""
    }
    ${unapp ? `<div class="actions"><button type="button" class="btn primary" id="wkc-appr">✅ Approve everything this week (${unapp})</button></div>` : people.length ? '<div class="who">✓ Everything is approved.</div>' : ""}</div>
    <div class="wkc-step"><h3>2 · Pay</h3><div class="who">Type each person's hourly rate once and it's kept (only you see it). CIS is taken off at each subcontractor's rate from CIS returns, as if it's all labour – take materials off on their invoice if not. Employees' tax and NI come from your payroll.</div>
    ${
      people.length
        ? `<div class="tablewrap"><table class="wkc-tbl"><thead><tr><th>Who</th><th class="num">Hours</th><th class="num">£ / hour</th><th class="num">Gross</th><th class="num">CIS off</th><th class="num">To pay</th></tr></thead><tbody>
      ${people.map((r) => `<tr><td><b>${esc(nameOf(r.id))}</b><div class="who">${r.cis ? "CIS subcontractor · " + r.pc + "%" : esc(EMP_TYPES[((S.team[r.id] || {}).details || {}).empType] || "Employee / not set")}</div></td><td class="num">${hrs(r.hours)}</td><td class="num"><input class="wkc-rate" data-w="${esc(r.id)}" inputmode="decimal" value="${r.rate ? esc(String(r.rate)) : ""}" placeholder="0.00" aria-label="Hourly rate for ${esc(nameOf(r.id))}"></td><td class="num">${gbp(r.gross)}</td><td class="num">${r.cis ? gbp(r.ded) : "–"}</td><td class="num"><b>${r.cis ? gbp(r.net) : gbp(r.gross) + '<div class="who">before tax/NI</div>'}</b></td></tr>`).join("")}
      <tr class="wkc-tot"><td><b>Total</b></td><td class="num"><b>${hrs(tot("hours"))}</b></td><td></td><td class="num"><b>${gbp(tot("gross"))}</b></td><td class="num"><b>${gbp(tot("ded"))}</b></td><td class="num"><b>${gbp(tot("net"))}</b></td></tr></tbody></table></div>
      <div class="actions"><button type="button" class="btn" id="wkc-copy">📋 Copy the pay list</button><button type="button" class="btn" id="wkc-pdf">📄 Pay summary PDF</button></div>`
        : ""
    }</div>
    <div class="wkc-step"><h3>3 · Day work to bill</h3>
    ${
      jobs.length
        ? jobs
            .map(
              (j) =>
                `<button type="button" class="wkc-job" data-s="${esc(j.site)}"><span><b>${esc(siteLabel(j.site))}</b><span class="who">${(siteClient(j.site) || {}).name ? esc(siteClient(j.site).name) + " · " : ""}${hrs(j.h)} h day work</span></span><span><b>${j.v ? gbp(j.v) : "Rates not set"}</b> ›</span></button>`,
            )
            .join("") +
          '<div class="who">Tap a job to open its day work and make the sheet for the client.</div>'
        : '<div class="who">No day work this week.</div>'
    }</div>
    <div class="actions wkc-end"><button type="button" class="btn primary" id="wkc-close"${people.length ? "" : " disabled"}>🔒 ${rec ? "Close it again (update the record)" : "Close the week"}</button></div>`;
}
function wkcOpen() {
  openViewer(wkcHtml());
  wkcWire();
}
function wkcWire() {
  const root = $("viewer-body");
  const again = () => {
    root.innerHTML = wkcHtml();
    wkcWire();
  };
  if ($("wkc-appr"))
    $("wkc-appr").onclick = async (e) => {
      e.target.disabled = true;
      let n = 0;
      for (const r of wkcData().people)
        for (const x of r.we.filter((x) => !x.approved && !x.open)) {
          try {
            await S.db
              .doc("sheets/" + (x._src || r.id) + "/entries/" + x.id)
              .update({ approved: true });
            x.approved = true;
            n++;
          } catch (er) {}
        }
      toast("Approved " + n);
      setTimeout(again, 400);
    };
  root.querySelectorAll(".wkc-rate").forEach(
    (inp) =>
      (inp.onchange = async () => {
        const v = Math.max(0, +String(inp.value).replace(/[£,\s]/g, "") || 0);
        const per = Object.assign({}, (S.payRates || {}).per || {}, { [inp.dataset.w]: v });
        S.payRates = Object.assign({}, S.payRates || {}, { id: "payrates", kind: "payrates", per });
        again();
        try {
          await S.db.doc("todos/payrates").set({ kind: "payrates", per, updated: Date.now() });
        } catch (er) {
          toast("Couldn't save the rate");
        }
      }),
  );
  if ($("wkc-copy"))
    $("wkc-copy").onclick = async () => {
      const t = wkcData()
        .people.map(
          (r) =>
            `${nameOf(r.id)}: ${hrs(r.hours)} h × ${gbp(r.rate)} = ${gbp(r.gross)}${r.cis ? `, CIS ${r.pc}% ${gbp(r.ded)}, pay ${gbp(r.net)}` : " (before tax/NI)"}`,
        )
        .join("\n");
      try {
        await navigator.clipboard.writeText("Pay, week of " + shortDay(iso(S.week)) + "\n\n" + t);
        toast("Copied");
      } catch (e) {
        toast("Couldn't copy here");
      }
    };
  if ($("wkc-pdf")) $("wkc-pdf").onclick = () => openPaySummary();
  root.querySelectorAll(".wkc-job").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.fltSite = String(b.dataset.s).trim().toLowerCase();
        S.f.fltWho = [];
        closeViewer();
        S.otab = "daywork";
        store.set("jeb.otab", "daywork");
        render();
        window.scrollTo(0, 0);
      }),
  );
  if ($("wkc-close"))
    $("wkc-close").onclick = async (e) => {
      e.target.disabled = true;
      const rows = wkcData().people.map((r) => ({
        id: r.id,
        name: nameOf(r.id),
        hours: r.hours,
        rate: r.rate,
        gross: r.gross,
        cis: r.cis ? r.pc : null,
        ded: r.ded,
        net: r.net,
      }));
      const rec = { kind: "weekclose", week: iso(S.week), closedAt: Date.now(), rows };
      try {
        await S.db.doc("todos/" + wkcId()).set(rec);
        S.weekCloses = (S.weekCloses || [])
          .filter((x) => x.id !== wkcId())
          .concat([Object.assign({ id: wkcId() }, rec)]);
        toast("Week closed");
        again();
      } catch (er) {
        toast("Couldn't save. Check your connection.");
        e.target.disabled = false;
      }
    };
}
