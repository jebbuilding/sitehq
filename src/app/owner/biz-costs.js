/* ================= BUSINESS COSTINGS (owner): what it costs a year to run the business, by category ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { wcCalc, wcMoney } from "../people/wage-calc.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
export { costsView };
/* One page: the yearly total (with month and week), a bar for each category, and one list of every cost grouped
   under its category, each with its yearly figure. Pricing (the day rate that covers it all) is tucked away at the
   bottom. One owner-private record, todos/bizcosts (kind "bizcosts"): items [{ name, cat, amt, often, notes }].
   James's "Business costing" workbook can be brought in; people can be added from the Wage calculator. */
const BC_OFTEN = { Weekly: 52, Fortnightly: 26, Monthly: 12, Quarterly: 4, Yearly: 1 };
const BC_CATS = [
  "Vehicles, fuel & van costs",
  "Loan, finance & leasing",
  "Insurance",
  "Wages, NI & pensions",
  "Plant & equipment hire",
  "Tools & small equipment",
  "Premises, yard & storage",
  "Phone, software & subscriptions",
  "Accountant & professional fees",
  "Marketing & advertising",
  "Workwear, PPE & training",
  "Permits, licences & memberships",
  "Tax, VAT & CIS",
  "Other",
];
/* the workbook's sheets, and the category their rows go under (Running Costs uses each row's own type) */
const BC_SHEETS = [
  ["Running Costs", null],
  ["Wages NI Pensions", "Wages, NI & pensions"],
  ["Tax VAT CIS", "Tax, VAT & CIS"],
];
const bcYearly = (r) => (+r.amt || 0) * (BC_OFTEN[r.often] || 0);
const bcCat = (c) => (BC_CATS.includes(c) ? c : "Other");

/* the saved record as items (an earlier version kept costs in areas) */
function bcItems(rec) {
  if (!rec) return [];
  if (Array.isArray(rec.items)) return rec.items.map((r) => Object.assign({}, r));
  const out = [];
  Object.entries(rec.areas || {}).forEach(([k, rows]) =>
    (rows || []).forEach((r) =>
      out.push({
        name: r.name || "",
        cat:
          k === "wages" ? "Wages, NI & pensions" : k === "tax" ? "Tax, VAT & CIS" : bcCat(r.type),
        amt: +r.amt || 0,
        often: r.often || "Monthly",
        notes: r.notes || "",
      }),
    ),
  );
  return out;
}

function bcCalc(b) {
  const items = (b.items || []).filter((r) => r.name || +r.amt);
  const year = items.reduce((s, r) => s + bcYearly(r), 0);
  const cats = BC_CATS.map((c) => ({
    c,
    y: items.filter((r) => bcCat(r.cat) === c).reduce((s, r) => s + bcYearly(r), 0),
  }))
    .filter((x) => x.y > 0)
    .sort((a, b2) => b2.y - a.y);
  const days = +b.workDays || 0,
    people = +b.people || 0,
    margin = (+b.margin || 0) / 100,
    month = year / 12,
    dayRate = days > 0 && people > 0 ? month / days / people : 0;
  const by = (o) => items.filter((r) => r.often === o).reduce((s, r) => s + (+r.amt || 0), 0);
  return {
    year,
    month,
    week: year / 52,
    cats,
    biggest: items.reduce((x, r) => (!x || bcYearly(r) > bcYearly(x) ? r : x), null),
    setYearly: by("Yearly") / 12,
    setQuarterly: by("Quarterly") / 3,
    noOften: items.filter((r) => +r.amt && !BC_OFTEN[r.often]).length,
    dayRate,
    hourRate: dayRate && +b.dayHrs ? dayRate / +b.dayHrs : 0,
    turnover: margin < 1 ? year / (1 - margin) : 0,
  };
}

let bcDraft = null;
function costsView() {
  if (!bcDraft) {
    const rec = S.bizCosts || {};
    bcDraft = {
      items: bcItems(rec),
      workDays: rec.workDays || 20,
      people: rec.people || 1,
      margin: rec.margin || 0,
      dayHrs: rec.dayHrs || 8,
    };
  }
  const b = bcDraft;
  $("main").innerHTML = `<div id="bc-top"></div>
    <div class="actions"><button type="button" class="btn primary" id="bc-save">Save</button><button type="button" class="btn" id="bc-add">+ Add a cost</button><label class="btn" id="bc-xl">📥 Bring in my spreadsheet<input type="file" accept=".xlsx,.xls" class="bc-file"></label>${(S.wageCalcs || []).length ? `<select id="bc-wcpick" class="bc-wcpick" aria-label="Add a person from the wage calculator"><option value="">+ A person from 💷 Wage calculator…</option>${S.wageCalcs.map((r) => `<option value="${esc(r.id)}">${esc(r.name || "")}</option>`).join("")}</select>` : ""}</div>
    <div id="bc-list"></div>
    <details class="card bc-price"><summary>Pricing: the day rate that covers all this</summary><div class="cardbody" id="bc-pricing"></div></details>`;
  const draw = () => {
    bcTop(b);
    bcList(b, draw);
    bcPricing(b);
  };
  $("bc-add").onclick = () => {
    b.items.push({ name: "", cat: "Other", amt: 0, often: "Monthly", notes: "" });
    draw();
    const last = [...document.querySelectorAll("#bc-list .bc-f[data-f=name]")].pop();
    if (last) last.focus();
  };
  $("bc-save").onclick = async () => {
    try {
      const rec = {
        kind: "bizcosts",
        updated: Date.now(),
        items: b.items.filter((r) => r.name || +r.amt),
        workDays: b.workDays,
        people: b.people,
        margin: b.margin,
        dayHrs: b.dayHrs,
      };
      await S.db.doc("todos/bizcosts").set(rec);
      b.items = rec.items.map((r) => Object.assign({}, r));
      draw();
      toast("Saved");
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  document.querySelector("#main .bc-file").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      await loadXlsx();
      const got = bcFromWorkbook(window.XLSX.read(await f.arrayBuffer(), { type: "array" }));
      if (!got.length) return toast("No costs found. Is it the Business costing workbook?");
      b.items = b.items.filter((r) => r.name || +r.amt).concat(got);
      draw();
      toast(`Brought in ${got.length} costs. Check them, then tap Save.`);
    } catch (er) {
      toast("Couldn't read that spreadsheet.");
    }
  };
  if ($("bc-wcpick"))
    $("bc-wcpick").onchange = (e) => {
      const rec = (S.wageCalcs || []).find((r) => r.id === e.target.value);
      e.target.value = "";
      if (!rec) return;
      const c = wcCalc(rec);
      b.items.push({
        name: (rec.name || "Employee") + " (wages, NI, pension, van)",
        cat: "Wages, NI & pensions",
        /* paid monthly, so it is not counted in the money to put aside for yearly bills */
        amt: Math.round(c.perMonth * 100) / 100,
        often: "Monthly",
        notes: "From the wage calculator",
      });
      draw();
    };
  draw();
}

/* the workbook: rows from 6, columns A–D (name, type, amount, how often) and F notes */
function bcFromWorkbook(wb) {
  const out = [];
  BC_SHEETS.forEach(([sheet, cat]) => {
    const ws = wb.Sheets[sheet];
    if (!ws) return;
    window.XLSX.utils.sheet_to_json(ws, { header: 1, range: 5, defval: "" }).forEach((r) => {
      const name = String(r[0] || "").trim(),
        amt = parseFloat(r[2]) || 0,
        often = String(r[3] || "").trim();
      if (!name || !amt) return;
      out.push({
        name,
        cat: cat || bcCat(String(r[1] || "").trim()),
        amt,
        often: BC_OFTEN[often] ? often : "",
        notes: String(r[5] || "").trim(),
      });
    });
  });
  return out;
}

/* the overview: the yearly total and a bar per category */
function bcTop(b) {
  const c = bcCalc(b),
    max = c.cats.length ? c.cats[0].y : 1;
  $("bc-top").innerHTML = `<section class="card bc-hero"><div class="cardbody">
      <div class="bc-kicker">Costs to run the business</div>
      <div class="bc-year">${wcMoney(c.year)}<small> a year</small></div>
      <div class="who">${wcMoney(c.month)} a month · ${wcMoney(c.week)} a week${c.biggest ? ` · biggest: ${esc(c.biggest.name)} (${wcMoney(bcYearly(c.biggest))} a year)` : ""}</div>
      ${
        c.cats.length
          ? `<div class="bc-bars">${c.cats
              .map(
                (x) =>
                  `<div class="bc-bar"><span class="bc-bl">${esc(x.c)}</span><span class="bc-bt"><span style="width:${Math.max(2, (x.y / max) * 100)}%"></span></span><span class="bc-bv">${wcMoney(x.y)}<small> ${c.year ? Math.round((x.y / c.year) * 100) : 0}%</small></span></div>`,
              )
              .join("")}</div>`
          : `<div class="who" style="margin-top:8px">Add your costs below, or bring in your spreadsheet.</div>`
      }
      ${c.setYearly || c.setQuarterly ? `<div class="notice bc-set">Put aside <b>${wcMoney(c.setYearly + c.setQuarterly)} a month</b> for the bills that come yearly (${wcMoney(c.setYearly)}) and quarterly (${wcMoney(c.setQuarterly)}), so they're never a surprise.</div>` : ""}
      ${c.noOften ? `<div class="notice warn">${c.noOften} cost${c.noOften === 1 ? " has" : "s have"} no "How often", so ${c.noOften === 1 ? "it isn't" : "they aren't"} counted.</div>` : ""}
    </div></section>`;
}

/* every cost, grouped under its category */
function bcList(b, draw) {
  const groups = BC_CATS.map((c) => ({
    c,
    rows: b.items.map((r, i) => [r, i]).filter(([r]) => bcCat(r.cat) === c),
  })).filter((g) => g.rows.length);
  $("bc-list").innerHTML = groups
    .map(
      (
        g,
      ) => `<section class="bc-group"><div class="bc-gh"><b>${esc(g.c)}</b><span>${wcMoney(g.rows.reduce((s, [r]) => s + bcYearly(r), 0))} a year</span></div>
      ${g.rows
        .map(
          ([r, i]) => `<div class="bc-cost" data-i="${i}">
          <input class="bc-f bc-name" data-f="name" maxlength="80" value="${esc(r.name || "")}" placeholder="What, e.g. Van payment" aria-label="What">
          <label class="bc-amt">£<input class="bc-f" data-f="amt" type="number" inputmode="decimal" step="any" value="${r.amt || ""}" aria-label="Amount"></label>
          <select class="bc-f" data-f="often" aria-label="How often"><option value="">How often?</option>${Object.keys(
            BC_OFTEN,
          )
            .map((o) => `<option${r.often === o ? " selected" : ""}>${o}</option>`)
            .join("")}</select>
          <select class="bc-f" data-f="cat" aria-label="Category">${BC_CATS.map((c) => `<option${bcCat(r.cat) === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
          <span class="bc-y">${wcMoney(bcYearly(r))}<small> a year</small></span>
          <button type="button" class="pillbtn bc-x" aria-label="Remove ${esc(r.name || "this cost")}">✕</button>
        </div>`,
        )
        .join("")}</section>`,
    )
    .join("");
  document.querySelectorAll("#bc-list .bc-cost").forEach((row) => {
    const r = b.items[+row.dataset.i];
    row.querySelectorAll(".bc-f").forEach(
      (el) =>
        (el.onchange = el.oninput =
          (ev) => {
            r[el.dataset.f] = el.dataset.f === "amt" ? parseFloat(el.value) || 0 : el.value;
            /* a new category, or leaving the box: redraw the list; while typing just the figures */
            if (el.dataset.f === "cat" || ev.type === "change") draw();
            else {
              row.querySelector(".bc-y").innerHTML =
                wcMoney(bcYearly(r)) + "<small> a year</small>";
              bcTop(b);
            }
          }),
    );
    row.querySelector(".bc-x").onclick = () => {
      b.items.splice(+row.dataset.i, 1);
      draw();
    };
  });
}

/* tucked away: the day rate per person that covers the year's costs */
function bcPricing(b) {
  const c = bcCalc(b),
    n = (id, v, step) =>
      `<input id="${id}" class="bc-sum" type="number" inputmode="decimal" step="${step || "any"}" value="${v}">`;
  $("bc-pricing").innerHTML = `<div class="bc-grid">
      <label for="bc-wd">Working days a month${n("bc-wd", b.workDays, "1")}</label>
      <label for="bc-pp">People earning on site (you included)${n("bc-pp", b.people, "1")}</label>
      <label for="bc-dh">Hours in a working day${n("bc-dh", b.dayHrs, "0.5")}</label>
      <label for="bc-mg">Profit on top %${n("bc-mg", b.margin, "1")}</label>
    </div>
    <div class="tablewrap"><table class="wc-t"><tbody>
      <tr class="wc-tot"><td>Day rate per person just to cover costs</td><td class="num">${c.dayRate ? wcMoney(c.dayRate, 2) : "–"}</td></tr>
      <tr><td>…an hour</td><td class="num">${c.hourRate ? wcMoney(c.hourRate, 2) : "–"}</td></tr>
      <tr class="wc-tot"><td>Turnover needed a year with that profit</td><td class="num">${wcMoney(c.turnover)}</td></tr>
    </tbody></table></div>`;
  document.querySelectorAll("#bc-pricing .bc-sum").forEach(
    (el) =>
      (el.onchange = () => {
        const v = (id) => parseFloat(($(id) || {}).value) || 0;
        Object.assign(b, {
          workDays: v("bc-wd"),
          people: v("bc-pp"),
          dayHrs: v("bc-dh") || 8,
          margin: v("bc-mg"),
        });
        bcPricing(b);
      }),
  );
}
