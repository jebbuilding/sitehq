/* ================= JOB COSTS: what each job costs, what's been charged and the profit; cost-plus jobs invoiced from their costs ================= */
import { clAddr } from "../clients/stages-planner.js";
import { $, esc, gbp, hrs, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf, teamPlusMe } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { wcCalc } from "../people/wage-calc.js";
import { acAllTx, acCatKind, acCatName } from "./acct-data.js";
import { acRcptParts, acReceipts, acSaveRcpt } from "./acct-receipts.js";
import { acRcptSheet } from "./acct-review.js";
import { jbBudget, jbCard, jbTag, jbWire } from "./job-budget.js";
import { SD_VATC, sdCalc, sdCounts, sdNo, sdR2, sdSales, sdSaveRec } from "./sales-calc.js";
import { sdEdit } from "./sales-edit.js";
import { empTypeOf } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
import { siteClient } from "../sites/summary.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
import { dwRate } from "../timesheets/day-work.js";
export { jcData, jcJob, jcSave, jcView };
/* For each site: labour from the timesheets (hours × what each person costs you an hour), materials and hire from
   receipts and bills booked to the site, subbies from their invoices and CIS bills for the site; against what's
   been invoiced (and, for a fixed-price job, the accepted estimate). A cost-plus job charges labour at each
   person's day-work rate (or cost + a %), materials and subbies at cost + a %; every cost is ticked off once it's
   on an invoice, and "Invoice what's not been charged" makes a draft invoice of the rest. Costs not booked to a job
   are listed so they can be. The spreadsheet has every hour, rate, cost, mark-up, charge and the profit %.
   Owner-private: todos/jcset (kind "jcset": { cost: { who: £/h }, defCost }) and todos/jc-<id> (kind "jobcost":
   { site, mode "fixed"|"costplus", labMode "rates"|"markup", labPct, matPct, subPct, invoiced: { key: invoiceId } }). */
const JC_DEF = { mode: "fixed", labMode: "rates", labPct: 15, matPct: 15, subPct: 15 };
const jcSet = () => Object.assign({ cost: {}, defCost: 0 }, S.jcSet || {});
const jcJob = (site) =>
  Object.assign(
    { site, invoiced: {} },
    JC_DEF,
    (S.jobCosts || []).find((j) => same(j.site, site)) || {},
  );
/* a subbie's rate from their latest subcontractor agreement: an hourly rate, or a day rate over 8 hours */
const jcAgreeRate = (who) => {
  const a = (S.data && S.data.signoffs ? allTeam("signoffs") : [])
    .filter((x) => x.who === who && x.kind === "subagree" && x.agree)
    .sort((x, y) => (y.created || 0) - (x.created || 0))[0];
  if (!a) return 0;
  const r = +a.agree.rate || 0;
  if (!r) return 0;
  if (a.agree.rateType === "hour") return r;
  if (a.agree.rateType === "day" || a.agree.rateType === "mixed") return sdR2(r / 8);
  return 0;
};
/* what someone costs an hour: set in Cost rates, else their agreement's rate, else the rate for everyone else */
const jcCostRate = (who) => {
  const s = jcSet(),
    v = s.cost[who];
  if (v != null && v !== "") return +v || 0;
  return jcAgreeRate(who) || +s.defCost || 0;
};
async function jcSave(j) {
  const rec = Object.assign({}, j, { kind: "jobcost", updated: Date.now() });
  const id = rec.id || "jc-" + newId();
  delete rec.id;
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  S.jobCosts = (S.jobCosts || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
const JC_KIND = { lab: "Labour", mat: "Materials & hire", sub: "Subcontractors" };
/* every cost on a job, and what it's charged at */
function jcData(site) {
  const j = jcJob(site);
  const cp = j.mode === "costplus";
  const items = [];
  const subInv = allTeam("invoices").filter(
    (v) => v.kind !== "receipt" && same(v.site, site) && v.status !== "rejected",
  );
  const invoicers = new Set(subInv.map((v) => v.who));
  /* labour, from the timesheets */
  allTeam("entries")
    .filter((e) => e.type === "hours" && !e.open && same(e.job, site) && +e.hours > 0)
    .forEach((e) => {
      const who = e.who,
        h = +e.hours;
      const viaInv = invoicers.has(who) && empTypeOf(who) !== "employed";
      const cr = viaInv ? 0 : jcCostRate(who);
      const cost = sdR2(h * cr);
      const chR = j.labMode === "rates" ? dwRate(who) : 0;
      items.push({
        key: "h|" + who + "|" + e.id,
        kind: "lab",
        date: e.date,
        who,
        desc: nameOf(who),
        hours: h,
        costRate: cr,
        cost,
        chargeRate: chR,
        charge: j.labMode === "rates" ? sdR2(h * chR) : sdR2(cost * (1 + (+j.labPct || 0) / 100)),
        note: viaInv ? "cost on their invoice" : "",
      });
    });
  /* receipts and bills booked to the site */
  acReceipts()
    .filter((r) => r.status === "done")
    .forEach((r) =>
      acRcptParts(r).forEach((p, i) => {
        if (!same(p.site, site)) return;
        const sub = p.cat === "subs";
        const pct = +(sub ? j.subPct : j.matPct) || 0;
        items.push({
          key: "r|" + r.id + "|" + i,
          kind: sub ? "sub" : "mat",
          date: r.date,
          desc: [r.supplier, p.desc].filter(Boolean).join(" – "),
          cat: acCatName(p.cat),
          cost: p.net,
          pct,
          charge: sdR2(p.net * (1 + pct / 100)),
          rcpt: r.id,
        });
      }),
    );
  /* subbies' invoices sent from their app */
  subInv.forEach((v) =>
    items.push({
      key: "i|" + v.who + "|" + v.id,
      kind: "sub",
      date: v.invDate || iso(new Date(v.sentAt || Date.now())),
      who: v.who,
      desc: nameOf(v.who) + (v.number ? " – invoice " + v.number : ""),
      cost: +v.amount || 0,
      pct: +j.subPct || 0,
      charge: sdR2((+v.amount || 0) * (1 + (+j.subPct || 0) / 100)),
    }),
  );
  /* CIS bills put in by hand */
  (S.cisMonths || []).forEach((m) =>
    (m.extra || []).forEach((b, bi) => {
      if (!same(b.site, site) || b.status === "draft") return;
      (b.lines || []).forEach((l, li) => {
        let n = sdR2((l.q === "" || l.q == null ? 1 : +l.q) * (+l.r || 0));
        const v = SD_VATC[l.vc] || SD_VATC.S20;
        if (b.inc && v.r && !v.rc) n = sdR2(n / (1 + v.r / 100));
        const k = l.acct === "lab" ? "sub" : "mat";
        const pct = +(k === "sub" ? j.subPct : j.matPct) || 0;
        items.push({
          key: "c|" + m.id + "|" + bi + "|" + li,
          kind: k,
          date: b.paidOn || b.date,
          who: b.who,
          desc: [nameOf(b.who), l.d].filter(Boolean).join(" – "),
          cost: n,
          pct,
          charge: sdR2(n * (1 + pct / 100)),
        });
      });
    }),
  );
  /* bank payments booked to the job – not ones with a receipt or matched to a subbie's invoice (counted above), not
     wages (the timesheets count those), not money moved about */
  acAllTx().forEach((t) => {
    if (!same(t.site, site) || t.amt >= 0 || t.rcpt || t.link || t.cat === "wages") return;
    if (acCatKind(t.cat) === "move") return;
    const net = sdR2(-t.amt - (+t.vat || 0));
    const sub = t.cat === "subs";
    const pct = +(sub ? j.subPct : j.matPct) || 0;
    items.push({
      key: "b|" + t.rec + "|" + t.id,
      kind: sub ? "sub" : "mat",
      date: t.date,
      desc: "Bank: " + t.desc,
      cat: t.cat ? acCatName(t.cat) : "",
      cost: net,
      pct,
      charge: sdR2(net * (1 + pct / 100)),
    });
  });
  items.forEach((it) => (it.inv = j.invoiced[it.key] || ""));
  items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  /* what the client's been invoiced, and the estimate */
  const cl = siteClient(site);
  const mine = (d) => same(d.site, site) || (!d.site && cl && d.clientId === cl.id);
  const invs = sdSales().filter((d) => sdCounts(d) && mine(d));
  const invoiced = sdR2(invs.reduce((a, d) => a + sdCalc(d).net, 0));
  const est = sdSales()
    .filter((d) => d.type === "estimate" && d.status === "accepted" && mine(d))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const estNet = est ? sdCalc(est).net : 0;
  /* signed variations put the price up */
  const vars = (S.variations || []).filter((v) => v.status === "signed" && same(v.site, site));
  const varNet = sdR2(vars.reduce((a, v) => a + (+v.amt || 0), 0));
  const cost = sdR2(items.reduce((a, i) => a + i.cost, 0));
  const charge = sdR2(items.reduce((a, i) => a + i.charge, 0));
  const notInv = items.filter((i) => !i.inv);
  const price = cp ? Math.max(charge, invoiced) : Math.max(sdR2(estNet + varNet), invoiced);
  const profit = sdR2(price - cost);
  return {
    j,
    cp,
    cl,
    items,
    invs,
    invoiced,
    est,
    estNet,
    vars,
    varNet,
    cost,
    charge,
    notInv,
    notInvCharge: sdR2(notInv.reduce((a, i) => a + i.charge, 0)),
    price,
    profit,
    pctProfit: price ? Math.round((profit / price) * 1000) / 10 : 0,
    hours:
      Math.round(items.filter((i) => i.kind === "lab").reduce((a, i) => a + i.hours, 0) * 100) /
      100,
  };
}
/* costs not booked to any job */
function jcLoose() {
  const out = [];
  acReceipts()
    .filter(
      (r) => r.status === "done" && !acRcptParts(r).some((p) => p.site) && r.type !== "credit",
    )
    .forEach((r) =>
      out.push({
        t: "r",
        id: r.id,
        date: r.date,
        desc: r.supplier || "Receipt",
        amt: sdR2((+r.total || 0) - (+r.vat || 0)),
      }),
    );
  allTeam("invoices")
    .filter((v) => v.kind !== "receipt" && !v.site && v.status !== "rejected")
    .forEach((v) =>
      out.push({
        t: "i",
        id: v.id,
        who: v.who,
        date: v.invDate || "",
        desc: nameOf(v.who) + (v.number ? " – invoice " + v.number : ""),
        amt: +v.amount || 0,
      }),
    );
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
const jcSites = () => {
  const names = new Set((S.sites || []).filter((s) => !s.archived).map((s) => s.name));
  (S.jobCosts || []).forEach((j) => names.add(j.site));
  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
};
/* the Jobs tab in Accounts */
function jcView(tabs) {
  if (S.f.jcs) return jcJobView(tabs, S.f.jcs);
  const rows = jcSites()
    .map((s) => Object.assign({ site: s }, jcData(s)))
    .filter((d) => d.items.length || d.invoiced || d.estNet || d.varNet || d.j.id);
  const loose = jcLoose();
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="who">What each job has cost (labour from the timesheets, receipts and bills booked to it, subbies' invoices), what's been invoiced, and the profit. Cost-plus jobs show what hasn't been charged yet.</div>
    <div class="actions"><button type="button" class="btn" id="jc-rates">⚙️ What each person costs you an hour</button></div>
    ${
      rows.length
        ? `<div class="tablewrap"><table class="jc-tbl"><thead><tr><th>Job</th><th>Type</th><th class="num">Costs</th><th class="num">Invoiced</th><th class="num">Profit</th><th class="num">%</th><th>Budget</th></tr></thead><tbody>${rows
            .map(
              (d) =>
                `<tr class="jc-row" data-s="${esc(d.site)}"><td><b>${esc(d.site)}</b>${d.cp && d.notInv.length ? `<div class="jc-warn">${gbp(d.notInvCharge)} not invoiced yet</div>` : ""}</td><td>${d.cp ? "Cost plus" : "Fixed price"}</td><td class="num">${gbp(d.cost)}</td><td class="num">${gbp(d.invoiced)}</td><td class="num${d.profit < 0 ? " jc-neg" : ""}">${gbp(d.profit)}</td><td class="num">${d.price ? d.pctProfit + "%" : "–"}</td><td>${jbTag(jbBudget(d)) || (d.cp ? "Cost plus" : "–")}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : `<div class="empty"><strong>No job costs yet</strong>Book receipts to a site, and hours on the timesheets count by themselves.</div>`
    }
    ${
      loose.length
        ? `<section class="card"><div class="cardbody"><b>Not booked to a job (${loose.length})</b><div class="who">Pick the job each one was for.</div>${loose
            .slice(0, 40)
            .map(
              (x) =>
                `<div class="jc-loose"><span>${esc(x.date ? shortDay(x.date) : "")} · ${esc(x.desc)} · ${gbp(x.amt)}</span><select class="jc-book" data-t="${x.t}" data-id="${esc(x.id)}" data-who="${esc(x.who || "")}" aria-label="Job for ${esc(x.desc)}"><option value="">Book to…</option>${jcSites()
                  .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
                  .join("")}</select></div>`,
            )
            .join("")}</div></section>`
        : ""
    }
  </div>`;
  document.querySelectorAll("#main .jc-row").forEach(
    (r) =>
      (r.onclick = () => {
        S.f.jcs = r.dataset.s;
        render();
        window.scrollTo(0, 0);
      }),
  );
  $("jc-rates").onclick = jcRates;
  document.querySelectorAll("#main .jc-book").forEach(
    (s) =>
      (s.onchange = async () => {
        if (!s.value) return;
        try {
          if (s.dataset.t === "r") {
            const r = acReceipts().find((x) => x.id === s.dataset.id);
            if (r) await acSaveRcpt(Object.assign({}, r, { site: s.value, multi: false }));
          } else
            await S.db
              .doc("sheets/" + s.dataset.who + "/invoices/" + s.dataset.id)
              .update({ site: s.value });
          toast("Booked to " + s.value);
          render();
        } catch (e) {
          toast("Couldn't save. Check your connection.");
        }
      }),
  );
}
/* one job */
function jcJobView(tabs, site) {
  const d = jcData(site);
  const j = d.j;
  const sec = (k) => d.items.filter((i) => i.kind === k);
  const tick = (i) =>
    i.inv
      ? '<span class="tag ok">Invoiced</span>'
      : d.cp
        ? '<span class="tag warn">Not invoiced</span>'
        : "";
  const labBy = {};
  sec("lab").forEach((i) => {
    const b = (labBy[i.who] = labBy[i.who] || {
      who: i.who,
      hours: 0,
      cost: 0,
      charge: 0,
      costRate: i.costRate,
      chargeRate: i.chargeRate,
      open: 0,
      note: i.note,
    });
    b.hours += i.hours;
    b.cost += i.cost;
    b.charge += i.charge;
    if (!i.inv) b.open += i.hours;
  });
  const tot = (k, f) => sdR2(sec(k).reduce((a, i) => a + i[f], 0));
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="actions"><button type="button" class="btn" id="jc-back">‹ All jobs</button></div>
    <h2 class="jc-h">💷 ${esc(site)}</h2>${d.cl ? `<div class="who">Client: ${esc(d.cl.name)}</div>` : ""}
    <div class="seg" id="jc-mode"><button type="button" data-v="fixed" aria-pressed="${!d.cp}">Fixed price</button><button type="button" data-v="costplus" aria-pressed="${d.cp}">Cost plus</button></div>
    ${
      d.cp
        ? `<div class="jc-set"><label for="jc-lm">Labour charged at<select id="jc-lm"><option value="rates"${j.labMode === "rates" ? " selected" : ""}>Each person's day-work rate</option><option value="markup"${j.labMode === "markup" ? " selected" : ""}>What they cost + a %</option></select></label>${j.labMode === "markup" ? `<label for="jc-lp">Labour +%<input id="jc-lp" type="number" inputmode="decimal" value="${esc(j.labPct)}"></label>` : ""}<label for="jc-mp">Materials & hire +%<input id="jc-mp" type="number" inputmode="decimal" value="${esc(j.matPct)}"></label><label for="jc-sp">Subcontractors +%<input id="jc-sp" type="number" inputmode="decimal" value="${esc(j.subPct)}"></label></div>`
        : ""
    }
    <div class="sd-boxes">
      <div class="sd-box"><small>Costs so far</small><b>${gbp(d.cost)}</b><span>${d.hours} h labour</span></div>
      <div class="sd-box"><small>${d.cp ? "Charge (cost plus)" : d.varNet ? "Price (estimate + variations)" : "Price (estimate)"}</small><b>${gbp(d.cp ? d.charge : d.estNet + d.varNet)}</b><span>${d.cp ? "costs + mark-ups" : (d.est ? "estimate " + esc(d.est.number) : "no accepted estimate") + (d.varNet ? ` + ${d.vars.length} variation${d.vars.length === 1 ? "" : "s"} ${gbp(d.varNet)}` : "")}</span></div>
      <div class="sd-box"><small>Invoiced</small><b>${gbp(d.invoiced)}</b><span>${d.invs.length} invoice${d.invs.length === 1 ? "" : "s"}</span></div>
      <div class="sd-box${d.profit < 0 ? " bad" : " ok"}"><small>Profit</small><b>${gbp(d.profit)}</b><span>${d.price ? d.pctProfit + "% of the price" : "–"}</span></div>
      ${d.cp ? `<div class="sd-box${d.notInv.length ? " bad" : " ok"}"><small>Not invoiced yet</small><b>${gbp(d.notInvCharge)}</b><span>${d.notInv.length} cost${d.notInv.length === 1 ? "" : "s"}</span></div>` : ""}
    </div>
    ${jbCard(d)}
    <div class="actions">${d.cp && d.notInv.length ? `<button type="button" class="btn primary" id="jc-inv">🧾 Invoice what's not been charged (${gbp(d.notInvCharge)})</button>` : ""}<button type="button" class="btn" id="jc-xls">⬇ Spreadsheet</button><button type="button" class="btn" id="jc-rates">⚙️ Cost rates</button></div>
    <section class="card"><div class="cardbody"><b>Labour</b><div class="tablewrap"><table class="jc-tbl"><thead><tr><th>Who</th><th class="num">Hours</th><th class="num">Cost £/h</th><th class="num">Cost</th>${d.cp ? `<th class="num">Charge £/h</th><th class="num">Charge</th><th class="num">Not invoiced</th>` : ""}</tr></thead><tbody>${
      Object.values(labBy)
        .map(
          (b) =>
            `<tr><td>${esc(nameOf(b.who))}<div class="who">${esc(EMP_TYPES[empTypeOf(b.who)] || "")}${b.note ? " · " + esc(b.note) : ""}</div></td><td class="num">${hrs(b.hours)}</td><td class="num">${b.note ? "–" : gbp(b.costRate)}</td><td class="num">${gbp(b.cost)}</td>${d.cp ? `<td class="num">${j.labMode === "rates" ? gbp(b.chargeRate) : "+" + j.labPct + "%"}</td><td class="num">${gbp(b.charge)}</td><td class="num">${b.open ? hrs(b.open) + " h" : "✓"}</td>` : ""}</tr>`,
        )
        .join("") ||
      `<tr><td colspan="7" class="who">No hours on the timesheets for this job yet.</td></tr>`
    }</tbody><tfoot><tr><th>Total</th><th class="num">${d.hours}</th><th></th><th class="num">${gbp(tot("lab", "cost"))}</th>${d.cp ? `<th></th><th class="num">${gbp(tot("lab", "charge"))}</th><th></th>` : ""}</tr></tfoot></table></div></div></section>
    ${["mat", "sub"]
      .map(
        (k) =>
          `<section class="card"><div class="cardbody"><b>${JC_KIND[k]}</b>${
            sec(k).length
              ? `<div class="tablewrap"><table class="jc-tbl"><thead><tr><th>Date</th><th>What</th><th class="num">Cost (no VAT)</th>${d.cp ? `<th class="num">+%</th><th class="num">Charge</th><th></th>` : ""}</tr></thead><tbody>${sec(
                  k,
                )
                  .map(
                    (i) =>
                      `<tr${i.rcpt ? ` class="jc-rc" data-id="${esc(i.rcpt)}"` : ""}><td>${esc(shortDay(i.date))}</td><td>${esc(i.desc)}${i.cat ? `<div class="who">${esc(i.cat)}</div>` : ""}</td><td class="num">${gbp(i.cost)}</td>${d.cp ? `<td class="num">${i.pct}%</td><td class="num">${gbp(i.charge)}</td><td>${tick(i)}</td>` : ""}</tr>`,
                  )
                  .join(
                    "",
                  )}</tbody><tfoot><tr><th></th><th>Total</th><th class="num">${gbp(tot(k, "cost"))}</th>${d.cp ? `<th></th><th class="num">${gbp(tot(k, "charge"))}</th><th></th>` : ""}</tr></tfoot></table></div>`
              : `<div class="who">None booked to this job yet.</div>`
          }</div></section>`,
      )
      .join("")}
    <section class="card"><div class="cardbody"><b>Invoiced to the client</b>${
      d.invs.length
        ? d.invs
            .map(
              (x) =>
                `<div class="drow"><span>${esc(sdNo(x))} · ${esc(shortDay(x.date))}${x.title ? " · " + esc(x.title) : ""}</span><span>${gbp(sdCalc(x).net)} + VAT</span></div>`,
            )
            .join("")
        : `<div class="who">Nothing invoiced for this job yet.</div>`
    }</div></section>
  </div>`;
  $("jc-back").onclick = () => {
    S.f.jcs = "";
    render();
  };
  $("jc-rates").onclick = jcRates;
  $("jc-xls").onclick = () => jcXlsx(site);
  if ($("jc-inv")) $("jc-inv").onclick = () => jcInvoice(site);
  document
    .querySelectorAll("#main .jc-rc")
    .forEach(
      (r) => (r.onclick = () => acRcptSheet(acReceipts().find((x) => x.id === r.dataset.id))),
    );
  $("jc-mode")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          await jcSave(Object.assign({}, j, { mode: b.dataset.v }));
          render();
        }),
    );
  const setF = (id, key, num) =>
    $(id) &&
    ($(id).onchange = async () => {
      await jcSave(
        Object.assign({}, jcJob(site), { [key]: num ? +$(id).value || 0 : $(id).value }),
      );
      render();
    });
  setF("jc-lm", "labMode");
  setF("jc-lp", "labPct", 1);
  setF("jc-mp", "matPct", 1);
  setF("jc-sp", "subPct", 1);
  jbWire(site);
}
/* what each person costs an hour (wages + on-costs, or their agreed rate) */
function jcRates() {
  const s = jcSet();
  const ids = teamPlusMe();
  openSheet(
    `<h3 id="sheettitle">⚙️ What each person costs you an hour</h3>
    <div class="who">Used for the labour cost on each job: their hourly pay plus your on-costs (NI, pension, holiday, van). For subbies who send invoices for a job, the invoice is the cost instead. The charge rates for cost-plus jobs are your day-work rates.</div>
    <div class="who">Subbies with a subcontractor agreement use its rate (a day rate counts as 8 hours) unless you put one in. For employees, pick a saved wage calculation and it fills in what they cost you an hour – their pay plus NI, pension and holiday.</div>
    <label for="jr-def">Everyone else £/h<input id="jr-def" type="number" inputmode="decimal" step="0.01" value="${esc(s.defCost || "")}"></label>
    ${ids.map((id) => `<div class="jr-row"><label for="jr-${esc(id)}">${esc(nameOf(id))} <span class="who">${esc(EMP_TYPES[empTypeOf(id)] || "")}${jcAgreeRate(id) ? " · agreement " + gbp(jcAgreeRate(id)) + "/h" : ""}</span><input id="jr-${esc(id)}" class="jr-p" data-w="${esc(id)}" type="number" inputmode="decimal" step="0.01" placeholder="${esc(jcAgreeRate(id) || s.defCost || "")}" value="${esc(s.cost[id] != null ? s.cost[id] : "")}"></label>${(S.wageCalcs || []).length ? `<select class="jr-wc" data-w="${esc(id)}" aria-label="Fill in from a wage calculation for ${esc(nameOf(id))}"><option value="">From a wage calculation…</option>${(S.wageCalcs || []).map((w) => `<option value="${esc(w.id)}">${esc(w.name || "Wage calculation")} – ${gbp(wcCalc(w).perHour)}/h</option>`).join("")}</select>` : ""}</div>`).join("")}
    ${formFoot(false, "Save")}`,
    async () => {
      const cost = {};
      document.querySelectorAll(".jr-p").forEach((i) => {
        if (i.value !== "") cost[i.dataset.w] = +i.value;
      });
      try {
        const rec = Object.assign({}, S.jcSet || {}, {
          kind: "jcset",
          cost,
          defCost: +$("jr-def").value || 0,
          updated: Date.now(),
        });
        delete rec.id;
        await S.db.doc("todos/jcset").set(rec);
        S.jcSet = Object.assign({ id: "jcset" }, rec);
        closeForm();
        toast("Cost rates saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "jr-def",
  );
  document.querySelectorAll(".jr-wc").forEach(
    (sel) =>
      (sel.onchange = () => {
        const w = (S.wageCalcs || []).find((x) => x.id === sel.value);
        if (w) $("jr-" + sel.dataset.w).value = sdR2(wcCalc(w).perHour).toFixed(2);
      }),
  );
}
/* a draft invoice of every cost not charged yet, and those costs ticked off */
async function jcInvoice(site) {
  const d = jcData(site);
  if (!d.notInv.length) return;
  const lines = [];
  const byWho = {};
  d.notInv
    .filter((i) => i.kind === "lab")
    .forEach((i) => {
      const b = (byWho[i.who] = byWho[i.who] || { h: 0, a: 0, r: i.chargeRate });
      b.h += i.hours;
      b.a += i.charge;
    });
  Object.entries(byWho).forEach(([who, b]) =>
    lines.push({
      d:
        `Labour – ${nameOf(who)}: ${hrs(b.h)} h` +
        (d.j.labMode === "rates" ? ` @ ${gbp(b.r)}/h` : ""),
      a: sdR2(b.a),
      vc: "S20",
      k: "lab",
    }),
  );
  [
    ["mat", "Materials and hire", d.j.matPct, "mat"],
    ["sub", "Subcontractors", d.j.subPct, "lab"],
  ].forEach(([k, l, pct, kk]) => {
    const its = d.notInv.filter((i) => i.kind === k);
    if (!its.length) return;
    lines.push({
      d: `${l} at cost (${gbp(its.reduce((a, i) => a + i.cost, 0))}) + ${pct}% – listed on the spreadsheet`,
      a: sdR2(its.reduce((a, i) => a + i.charge, 0)),
      vc: "S20",
      k: kk,
    });
  });
  try {
    const dates = d.notInv
      .map((i) => i.date)
      .filter(Boolean)
      .sort();
    const inv = await sdSaveRec({
      type: "invoice",
      ik: "oneoff",
      date: iso(new Date()),
      clientId: d.cl ? d.cl.id : "",
      client: d.cl ? d.cl.name : "",
      email: d.cl ? d.cl.email || "" : "",
      address: d.cl ? clAddr(d.cl) : "",
      title: `Cost plus – ${site}${dates.length ? ` (${shortDay(dates[0])} to ${shortDay(dates[dates.length - 1])})` : ""}`,
      site,
      lines,
      status: "draft",
    });
    const invoiced = Object.assign({}, d.j.invoiced);
    d.notInv.forEach((i) => (invoiced[i.key] = inv.id));
    await jcSave(Object.assign({}, d.j, { invoiced }));
    toast("Draft invoice made – check it and send it");
    S.otab = "sales";
    render();
    sdEdit(inv);
  } catch (e) {
    toast("Couldn't make the invoice. Check your connection.");
  }
}
/* the spreadsheet: summary with formulas, every hour and rate, every cost and mark-up, the invoices */
async function jcXlsx(site) {
  const d = jcData(site);
  const fn = `Job costs – ${site}`.replace(/[\\/:*?"<>|]+/g, "");
  try {
    await loadXlsx();
    const X = window.XLSX;
    const wb = X.utils.book_new();
    const lab = d.items.filter((i) => i.kind === "lab");
    const mat = d.items.filter((i) => i.kind === "mat");
    const sub = d.items.filter((i) => i.kind === "sub");
    /* the worked-out values, stored beside each formula so the sheet shows them before it's recalculated */
    const sumOf = (l, k) => sdR2(l.reduce((a, i) => a + (+i[k] || 0), 0));
    const JX = {
      labH: Math.round(sumOf(lab, "hours") * 100) / 100,
      labC: sumOf(lab, "cost"),
      labCh: sumOf(lab, "charge"),
      matC: sumOf(mat, "cost"),
      matCh: sumOf(mat, "charge"),
      subC: sumOf(sub, "cost"),
      subCh: sumOf(sub, "charge"),
      price: d.cp ? d.charge : d.estNet,
    };
    const L = [
      [
        "Date",
        "Person",
        "Type",
        "Hours",
        "Cost £/h",
        "Cost £",
        d.j.labMode === "rates" ? "Charge £/h" : "Mark-up %",
        "Charge £",
        "Invoiced",
      ],
    ];
    lab.forEach((i, n) => {
      const r = n + 2;
      L.push([
        i.date,
        nameOf(i.who),
        EMP_TYPES[empTypeOf(i.who)] || "",
        i.hours,
        i.costRate,
        { t: "n", f: `D${r}*E${r}`, v: i.cost },
        d.j.labMode === "rates" ? i.chargeRate : +d.j.labPct || 0,
        { t: "n", f: d.j.labMode === "rates" ? `D${r}*G${r}` : `F${r}*(1+G${r}/100)`, v: i.charge },
        i.inv ? "Yes" : "No",
      ]);
    });
    const lr = lab.length + 1;
    L.push([
      "Total",
      "",
      "",
      { t: "n", f: `SUM(D2:D${lr})`, v: JX.labH },
      "",
      { t: "n", f: `SUM(F2:F${lr})`, v: JX.labC },
      "",
      { t: "n", f: `SUM(H2:H${lr})`, v: JX.labCh },
      "",
    ]);
    const costSheet = (list, who) => {
      const A = [["Date", who, "Category", "Cost £ (no VAT)", "Mark-up %", "Charge £", "Invoiced"]];
      list.forEach((i, n) => {
        const r = n + 2;
        A.push([
          i.date,
          i.desc,
          i.cat || "",
          i.cost,
          i.pct,
          { t: "n", f: `D${r}*(1+E${r}/100)`, v: i.charge },
          i.inv ? "Yes" : "No",
        ]);
      });
      const e = list.length + 1;
      A.push([
        "Total",
        "",
        "",
        { t: "n", f: `SUM(D2:D${e})`, v: sdR2(list.reduce((a, i) => a + i.cost, 0)) },
        "",
        { t: "n", f: `SUM(F2:F${e})`, v: sdR2(list.reduce((a, i) => a + i.charge, 0)) },
        "",
      ]);
      return A;
    };
    const M = costSheet(mat, "Supplier / what");
    const Sb = costSheet(sub, "Who / what");
    const I = [["Invoice", "Date", "Title", "Net £", "VAT £", "Total £"]];
    d.invs.forEach((x) => {
      const c = sdCalc(x);
      I.push([sdNo(x), x.date, x.title || "", c.net, c.vat, c.gross]);
    });
    I.push([
      "Total",
      "",
      "",
      { t: "n", f: `SUM(D2:D${d.invs.length + 1})`, v: d.invoiced },
      "",
      "",
    ]);
    const lt = lab.length + 2,
      mt = mat.length + 2,
      st = sub.length + 2,
      it = d.invs.length + 2;
    const Sm = [
      ["Job", site],
      ["Client", d.cl ? d.cl.name : ""],
      ["Type", d.cp ? "Cost plus" : "Fixed price"],
      ["Made", iso(new Date())],
      [],
      ["", "Cost £", "Charge £"],
      [
        "Labour",
        { t: "n", f: `Labour!F${lt}`, v: JX.labC },
        { t: "n", f: `Labour!H${lt}`, v: JX.labCh },
      ],
      [
        "Materials & hire",
        { t: "n", f: `'Materials & hire'!D${mt}`, v: JX.matC },
        { t: "n", f: `'Materials & hire'!F${mt}`, v: JX.matCh },
      ],
      [
        "Subcontractors",
        { t: "n", f: `Subcontractors!D${st}`, v: JX.subC },
        { t: "n", f: `Subcontractors!F${st}`, v: JX.subCh },
      ],
      ["Total", { t: "n", f: "SUM(B7:B9)", v: d.cost }, { t: "n", f: "SUM(C7:C9)", v: d.charge }],
      [],
      ["Labour hours", { t: "n", f: `Labour!D${lt}`, v: JX.labH }],
      [
        d.cp ? "Price (costs + mark-ups)" : "Price (accepted estimate)",
        d.cp ? { t: "n", f: "C10", v: d.charge } : d.estNet,
      ],
      ["Invoiced so far", { t: "n", f: `Invoices!D${it}`, v: d.invoiced }],
      [
        "Still to invoice",
        { t: "n", f: "MAX(0,B13-B14)", v: Math.max(0, sdR2(JX.price - d.invoiced)) },
      ],
      ["Profit £", { t: "n", f: "B13-B10", v: sdR2(JX.price - d.cost) }],
      [
        "Profit %",
        {
          t: "n",
          f: "IF(B13=0,0,ROUND(B16/B13*100,1))",
          v: JX.price ? Math.round(((JX.price - d.cost) / JX.price) * 1000) / 10 : 0,
        },
      ],
    ];
    const add = (rows, name, widths) => {
      const ws = X.utils.aoa_to_sheet(rows);
      ws["!cols"] = widths.map((w) => ({ wch: w }));
      X.utils.book_append_sheet(wb, ws, name);
    };
    add(Sm, "Summary", [26, 14, 14]);
    add(L, "Labour", [11, 20, 18, 8, 9, 10, 11, 10, 9]);
    add(M, "Materials & hire", [11, 40, 22, 14, 10, 12, 9]);
    add(Sb, "Subcontractors", [11, 40, 22, 14, 10, 12, 9]);
    add(I, "Invoices", [12, 11, 34, 12, 10, 12]);
    const out = X.write(wb, { bookType: "xlsx", type: "array" });
    await S.dl.save({
      filename: fn + ".xlsx",
      data: new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    });
  } catch (e) {
    /* no spreadsheet library (no signal): the same as a CSV */
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const rows = [
      [
        "Section",
        "Date",
        "Who / what",
        "Hours",
        "Cost £",
        "Mark-up / rate",
        "Charge £",
        "Invoiced",
      ],
    ];
    d.items.forEach((i) =>
      rows.push([
        JC_KIND[i.kind],
        i.date,
        i.kind === "lab" ? nameOf(i.who) : i.desc,
        i.hours || "",
        i.cost.toFixed(2),
        i.kind === "lab" ? i.chargeRate || "" : i.pct + "%",
        i.charge.toFixed(2),
        i.inv ? "Yes" : "No",
      ]),
    );
    rows.push(
      [],
      ["Costs", "", "", "", d.cost.toFixed(2)],
      ["Invoiced", "", "", "", d.invoiced.toFixed(2)],
      ["Profit", "", "", "", d.profit.toFixed(2)],
      ["Profit %", "", "", "", d.pctProfit],
    );
    try {
      await S.dl.save({
        filename: fn + ".csv",
        data: new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }),
      });
    } catch (x) {
      toast("Couldn't save the file");
    }
  }
}
