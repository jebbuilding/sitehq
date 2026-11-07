/* ================= WAGE CALCULATOR (owner): what an employee takes home, and what they really cost per hour, day and year ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
export { wagesView, wcCalc, wcMoney };
/* One saved calculation per person or role (owner-private todos record, kind "wagecalc"). The sums follow James's
   own spreadsheet (UK 2026/27: income tax with the allowance taper, employee and employer Class 1 NI, pensions, a
   company van as a taxable benefit with Class 1A NI, or taken from pay), with one fix: days actually worked are the
   working days less holiday. Tax figures are editable per calculation because they change each April. */
const WC_RATES = {
  pa: 12570,
  taper: 100000,
  band: 37700,
  higher: 125140,
  basic: 0.2,
  higherRate: 0.4,
  addl: 0.45,
  eePT: 12570,
  eeUEL: 50270,
  eeNI: 0.08,
  eeNI2: 0.02,
  erST: 5000,
  erNI: 0.15,
  c1a: 0.15,
};
const WC_RATE_LABELS = [
  ["pa", "Personal allowance £"],
  ["taper", "Allowance taper starts £"],
  ["band", "Basic rate band width £"],
  ["higher", "Higher rate band limit £"],
  ["basic", "Basic rate (0.2 = 20%)"],
  ["higherRate", "Higher rate"],
  ["addl", "Additional rate"],
  ["eePT", "Employee NI starts £"],
  ["eeUEL", "Employee NI upper limit £"],
  ["eeNI", "Employee NI rate"],
  ["eeNI2", "Employee NI rate above the limit"],
  ["erST", "Employer NI starts £"],
  ["erNI", "Employer NI rate"],
  ["c1a", "Class 1A NI on the van"],
];
const WC_NEW = {
  name: "",
  salary: 30000,
  van: 0,
  vanMode: "none",
  eePen: 5,
  erPen: 3,
  other: 0,
  hol: 28,
  days: 260,
  hrs: 8,
  charge: 0,
};
const wcMoney = (v, dp) =>
  (v < 0 ? "−£" : "£") +
  Math.abs(v).toLocaleString("en-GB", {
    minimumFractionDigits: dp || 0,
    maximumFractionDigits: dp || 0,
  });

/* every figure for one calculation */
function wcCalc(r0) {
  const r = Object.assign({}, WC_NEW, r0),
    R = Object.assign({}, WC_RATES, r0.rates || {});
  const sal = +r.salary || 0,
    van = +r.van || 0,
    benefit = r.vanMode === "benefit" && van > 0,
    fromPay = r.vanMode === "deduct" ? van : 0,
    eePen = (sal * (+r.eePen || 0)) / 100;
  const taxable = sal - eePen + (benefit ? van : 0),
    pa = Math.max(0, R.pa - Math.max(0, (taxable - R.taper) / 2)),
    ti = Math.max(0, taxable - pa),
    tax =
      Math.min(ti, R.band) * R.basic +
      Math.min(Math.max(ti - R.band, 0), R.higher - R.band) * R.higherRate +
      Math.max(ti - R.higher, 0) * R.addl,
    eeNI =
      Math.max(0, Math.min(sal, R.eeUEL) - R.eePT) * R.eeNI + Math.max(0, sal - R.eeUEL) * R.eeNI2,
    other = +r.other || 0,
    deductions = tax + eeNI + eePen + fromPay + other,
    net = sal - deductions;
  const erNI = Math.max(0, sal - R.erST) * R.erNI,
    erPen = (sal * (+r.erPen || 0)) / 100,
    vanCost = r.vanMode === "none" ? 0 : van,
    c1a = benefit ? van * R.c1a : 0,
    total = sal + erNI + erPen + vanCost + c1a - fromPay;
  const days = +r.days || 0,
    hol = +r.hol || 0,
    hrs = +r.hrs || 0,
    worked = Math.max(0, days - hol),
    hoursWorked = worked * hrs,
    perHour = hoursWorked ? total / hoursWorked : 0,
    charge = +r.charge || 0;
  return {
    sal,
    taxable,
    pa,
    tax,
    eeNI,
    eePen,
    fromPay,
    other,
    deductions,
    net,
    erNI,
    erPen,
    vanCost,
    c1a,
    total,
    extra: total - sal,
    worked,
    hoursWorked,
    perHour,
    perPaidHour: days * hrs ? total / (days * hrs) : 0,
    perDay: worked ? total / worked : 0,
    perWeek: total / 52,
    perMonth: total / 12,
    holCost: days ? (total / days) * hol : 0,
    netPerDay: days ? net / days : 0,
    charge,
    margin: charge ? charge - perHour : 0,
    yearMargin: charge ? (charge - perHour) * hoursWorked : 0,
  };
}

/* the Wage calculator tab: a card per saved calculation */
function wagesView() {
  const list = (S.wageCalcs || [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  $("main").innerHTML =
    `<div class="notice">What each person takes home, and what they <b>really cost you</b> per hour once NI, pension, van and holiday are added. Only you can see this.</div>
    <div class="actions"><button type="button" class="btn primary" id="wc-new">+ New calculation</button></div>
    ${
      list.length
        ? `<div class="wc-list">${list
            .map((r) => {
              const c = wcCalc(r);
              return `<button type="button" class="card wc-card" data-id="${esc(r.id)}"><b>${esc(r.name || "Calculation")}</b>
              <span class="wc-big">${wcMoney(c.perHour, 2)}<small> an hour to employ</small></span>
              <span class="who">${wcMoney(c.total)} a year · takes home ${wcMoney(c.net / 12)} a month</span>
              ${c.charge ? `<span class="tag ${c.margin >= 0 ? "ok" : "bad"}">Charged at ${wcMoney(c.charge, 2)}: ${c.margin >= 0 ? "+" : ""}${wcMoney(c.margin, 2)} an hour</span>` : ""}</button>`;
            })
            .join("")}</div>`
        : `<div class="empty"><strong>No calculations yet</strong>Tap "New calculation" and put in a salary to see what someone really costs.</div>`
    }`;
  $("wc-new").onclick = () => wcOpen(null);
  $("main")
    .querySelectorAll(".wc-card")
    .forEach(
      (b) => (b.onclick = () => wcOpen((S.wageCalcs || []).find((r) => r.id === b.dataset.id))),
    );
}

/* one calculation: the inputs, and every result worked out live as they are typed */
function wcOpen(rec) {
  const r = Object.assign({}, WC_NEW, rec || {}, {
    rates: Object.assign({}, WC_RATES, (rec && rec.rates) || {}),
  });
  const num = (id, label, val, step, note) =>
    `<label for="${id}">${label}<input id="${id}" class="wc-in" type="number" inputmode="decimal" step="${step || "any"}" value="${val}">${note ? `<span class="who">${note}</span>` : ""}</label>`;
  openViewer(`<div class="wc-wrap">
    <h3 style="margin:0 0 8px">💷 Wage calculator</h3>
    <label for="wc-name">Who or what role<input id="wc-name" maxlength="60" value="${esc(r.name)}" placeholder="e.g. Carpenter, or a person's name"></label>
    <div class="wc-grid">
      ${num("wc-salary", "Gross salary a year (£)", r.salary, "100")}
      ${num("wc-charge", "You charge them out at (£ an hour)", r.charge || "", "0.5", "Optional: shows your margin")}
      ${num("wc-van", "Company van (£ a year)", r.van, "100", "What the van costs you a year")}
      <label for="wc-vanmode">Van is<select id="wc-vanmode"><option value="none"${r.vanMode === "none" ? " selected" : ""}>No van</option><option value="benefit"${r.vanMode === "benefit" ? " selected" : ""}>A taxable benefit (you pay, they're taxed)</option><option value="deduct"${r.vanMode === "deduct" ? " selected" : ""}>Paid by them from their pay</option></select></label>
      ${num("wc-eepen", "Their pension (% of pay)", r.eePen, "0.5")}
      ${num("wc-erpen", "Your pension (% of pay)", r.erPen, "0.5", "3% is the auto-enrolment minimum")}
      ${num("wc-other", "Other deductions a year (£)", r.other, "10", "e.g. loans, union fees")}
      ${num("wc-hol", "Holiday days a year", r.hol, "1", "28 includes bank holidays")}
      ${num("wc-days", "Working days a year, before holiday", r.days, "1", "260 for Monday to Friday")}
      ${num("wc-hrs", "Hours a day", r.hrs, "0.5")}
    </div>
    <details class="wc-rates"><summary>Tax and NI figures (2026/27 – check gov.uk each April)</summary><div class="wc-grid">${WC_RATE_LABELS.map(([k, l]) => num("wc-r-" + k, l, r.rates[k])).join("")}</div><div class="who">Scottish income tax bands are different; these are the rest-of-UK rates.</div></details>
    <div id="wc-out"></div>
    <div class="actions"><button type="button" class="btn primary" id="wc-save">Save</button>${rec ? `<button type="button" class="linkdanger" id="wc-del">Delete</button>` : ""}</div>
  </div>`);
  const read = () => {
    const v = (id) => parseFloat($(id).value) || 0;
    const o = {
      name: $("wc-name").value.trim(),
      salary: v("wc-salary"),
      charge: v("wc-charge"),
      van: v("wc-van"),
      vanMode: $("wc-vanmode").value,
      eePen: v("wc-eepen"),
      erPen: v("wc-erpen"),
      other: v("wc-other"),
      hol: v("wc-hol"),
      days: v("wc-days"),
      hrs: v("wc-hrs"),
      rates: {},
    };
    WC_RATE_LABELS.forEach(([k]) => {
      const x = parseFloat($("wc-r-" + k).value);
      if (isFinite(x) && x !== WC_RATES[k]) o.rates[k] = x;
    });
    if (!Object.keys(o.rates).length) delete o.rates;
    return o;
  };
  const row = (l, v, b) =>
    `<tr${b ? ' class="wc-tot"' : ""}><td>${l}</td><td class="num">${v}</td></tr>`;
  const show = () => {
    const c = wcCalc(read());
    $("wc-out").innerHTML = `
      <div class="wc-head">
        <div class="tot"><div class="n">${wcMoney(c.perHour, 2)}</div><div class="l">Costs you an hour worked</div></div>
        <div class="tot"><div class="n">${wcMoney(c.net / 12)}</div><div class="l">They take home a month</div></div>
        <div class="tot"><div class="n">${wcMoney(c.total)}</div><div class="l">Costs you a year</div></div>
        ${c.charge ? `<div class="tot ${c.margin >= 0 ? "" : "wc-bad"}"><div class="n">${c.margin >= 0 ? "+" : ""}${wcMoney(c.margin, 2)}</div><div class="l">Your margin an hour at ${wcMoney(c.charge, 2)} (${wcMoney(c.yearMargin)} a year if every hour is charged)</div></div>` : ""}
      </div>
      <div class="flabel">What they pay</div>
      <div class="tablewrap"><table class="wc-t"><tbody>
        ${row("Income tax", wcMoney(c.tax))}${row("National Insurance", wcMoney(c.eeNI))}${row("Pension", wcMoney(c.eePen))}
        ${c.fromPay ? row("Van, from their pay", wcMoney(c.fromPay)) : ""}${c.other ? row("Other deductions", wcMoney(c.other)) : ""}
        ${row("Total deductions (" + (c.sal ? Math.round((c.deductions / c.sal) * 1000) / 10 : 0) + "% of salary)", wcMoney(c.deductions), 1)}
        ${row("Take-home a year", wcMoney(c.net), 1)}${row("Take-home a month", wcMoney(c.net / 12))}${row("Take-home a day (paid days)", wcMoney(c.netPerDay, 2))}
      </tbody></table></div>
      <div class="flabel">What they cost you</div>
      <div class="tablewrap"><table class="wc-t"><tbody>
        ${row("Salary", wcMoney(c.sal))}${row("Employer's NI", wcMoney(c.erNI))}${row("Your pension", wcMoney(c.erPen))}
        ${c.vanCost ? row("Van", wcMoney(c.vanCost)) : ""}${c.c1a ? row("Class 1A NI on the van", wcMoney(c.c1a)) : ""}${c.fromPay ? row("Van paid back by them", wcMoney(-c.fromPay)) : ""}
        ${row("Total cost a year", wcMoney(c.total), 1)}${row("On top of their salary", wcMoney(c.extra))}
        ${row("A month", wcMoney(c.perMonth))}${row("A week", wcMoney(c.perWeek))}
        ${row("A day actually worked (" + c.worked + " days)", wcMoney(c.perDay, 2))}
        ${row("An hour actually worked (" + c.hoursWorked + " hours)", wcMoney(c.perHour, 2), 1)}
        ${row("A paid hour, holiday included", wcMoney(c.perPaidHour, 2))}
        ${row("Their paid holiday costs you", wcMoney(c.holCost))}
      </tbody></table></div>`;
  };
  document
    .querySelectorAll(".wc-wrap input, .wc-wrap select")
    .forEach((el) => (el.oninput = el.onchange = show));
  show();
  $("wc-save").onclick = async () => {
    const o = read();
    if (!o.name) return toast("Give it a name, e.g. Carpenter");
    const id = (rec && rec.id) || "wc-" + newId();
    try {
      await S.db
        .doc("todos/" + id)
        .set(Object.assign({ kind: "wagecalc", updated: Date.now() }, o));
      toast("Saved");
      closeViewer();
      render();
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  if ($("wc-del"))
    $("wc-del").onclick = async () => {
      try {
        await S.db.doc("todos/" + rec.id).delete();
        toast("Deleted (it's in Deleted items for 30 days)");
        closeViewer();
        render();
      } catch (e) {
        toast("Couldn't delete");
      }
    };
}
