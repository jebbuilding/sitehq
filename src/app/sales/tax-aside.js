/* ================= TAX TO PUT ASIDE: corporation or income tax on the profit so far, the VAT building up, and sole traders' quarterly figures ================= */
import { $, esc, gbp, iso, toast } from "../core/helpers.js";
import { render } from "../core/tabs-week.js";
import { ukDate } from "../safety/rams-maker.js";
import { acCatKind, acCfg, acSaveCfg, acSums } from "./acct-data.js";
import { sdR2, sdSigned, sdTaxYear } from "./sales-calc.js";
import { vtBoxes, vtName, vtQuarters } from "./vat-return.js";
export { txView };
/* Accounts › 💰 Tax. James says whether the business is a limited company or he's a sole trader. From the profit so
   far this tax year it works out the tax on it (2026/27 rates: corporation tax 19% to £50,000 rising to 25% at
   £250,000 with marginal relief; or income tax with the personal allowance and Class 4 National Insurance), adds the
   VAT built up in the current VAT quarter, and says how much to have put aside. Sole traders also get the quarterly
   figures for Making Tax Digital for Income Tax (income and costs for each quarter of the tax year, by HMRC's
   headings), ready to copy. A guide, not tax advice: his accountant has the final word. The business type is
   bizType ("ltd" / "sole") on the accounts record. */
function txCorp(p) {
  if (p <= 0) return 0;
  if (p <= 50000) return p * 0.19;
  if (p >= 250000) return p * 0.25;
  return p * 0.25 - (3 / 200) * (250000 - p);
}
function txSole(p) {
  if (p <= 0) return { it: 0, ni: 0 };
  /* the personal allowance tapers away above £100,000 */
  const pa = Math.max(0, 12570 - Math.max(0, p - 100000) / 2);
  const band = (lo, hi) => Math.max(0, Math.min(p, hi) - lo);
  const taxable = Math.max(0, p - pa);
  const it =
    Math.min(taxable, 37700) * 0.2 +
    Math.max(0, Math.min(taxable, 125140 - pa) - 37700) * 0.4 +
    Math.max(0, taxable - (125140 - pa)) * 0.45;
  const ni = band(12570, 50270) * 0.06 + Math.max(0, p - 50270) * 0.02;
  return { it, ni };
}
/* HMRC's headings for the quarterly updates, from the app's categories */
const TX_HEAD = {
  mat: "Cost of goods bought for resale or goods used",
  subs: "Construction industry – payments to subcontractors",
  wages: "Wages, salaries and other staff costs",
  veh: "Car, van and travel expenses",
  hire: "Rent, rates, power and insurance costs",
  prem: "Rent, rates, power and insurance costs",
  ins: "Rent, rates, power and insurance costs",
  tools: "Repairs and maintenance of property and equipment",
  phone: "Phone, fax, stationery and other office costs",
  adv: "Advertising and business entertainment costs",
  bank: "Bank, credit card and other financial charges",
  prof: "Accountancy, legal and other professional fees",
  train: "Other allowable business expenses",
  oexp: "Other allowable business expenses",
};
function txView(tabs) {
  const cfg = acCfg();
  const type = cfg.bizType || "";
  const today = iso(new Date());
  const ty = sdTaxYear(today);
  const from = `${ty}-04-06`;
  const s = acSums(from, today);
  /* the VAT quarter running now */
  const q = vtQuarters(1)[0];
  const vq = vtBoxes(q.from, today < q.to ? today : q.to).B[5];
  let tax = 0,
    lines = [];
  if (type === "ltd") {
    tax = txCorp(s.profit);
    lines = [["Corporation tax on the profit so far", tax]];
  } else if (type === "sole") {
    const t = txSole(s.profit);
    tax = t.it + t.ni;
    lines = [
      ["Income tax on the profit so far", t.it],
      ["Class 4 National Insurance", t.ni],
    ];
  }
  const aside = sdR2(tax + Math.max(0, vq));
  const qs = [
    [`${ty}-04-06`, `${ty}-07-05`],
    [`${ty}-07-06`, `${ty}-10-05`],
    [`${ty}-10-06`, `${ty + 1}-01-05`],
    [`${ty + 1}-01-06`, `${ty + 1}-04-05`],
  ];
  const qFig = qs.map(([a, b]) => {
    const x = acSums(a, b < today ? b : today);
    const heads = {};
    Object.entries(x.byCat).forEach(([k, v]) => {
      if (acCatKind(k) !== "out") return;
      const h = TX_HEAD[k] || "Other allowable business expenses";
      heads[h] = sdR2((heads[h] || 0) - v);
    });
    return { a, b, inc: x.inc, heads, started: a <= today };
  });
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="seg tx-type" id="tx-type"><button type="button" data-v="ltd" aria-pressed="${type === "ltd"}">Limited company</button><button type="button" data-v="sole" aria-pressed="${type === "sole"}">Sole trader</button></div>
    ${
      !type
        ? `<div class="notice">Tap whether the business is a limited company or you're a sole trader, and it works out the tax.</div>`
        : `<div class="sd-boxes"><div class="sd-box ${s.profit >= 0 ? "ok" : "bad"}"><small>Profit so far this tax year</small><b>${sdSigned(s.profit)}</b><span>since 6 April ${ty}</span></div>
      <div class="sd-box bad"><small>Put aside for tax and VAT</small><b>${gbp(aside)}</b><span>so far</span></div></div>
      <section class="card"><div class="cardbody"><b>💰 What to have put aside</b>
        ${lines.map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${gbp(v)}</span></div>`).join("")}
        <div class="drow"><span>VAT building up this quarter (${esc(vtName(q))})</span><span>${gbp(Math.max(0, vq))}</span></div>
        <div class="drow sd-due"><span><b>Total to keep aside</b></span><b>${gbp(aside)}</b></div>
        <div class="who">2026/27 rates, on the profit in SiteHQ so far (${s.unsorted ? s.unsorted + " bank payments not sorted yet, so it may change" : "every bank payment sorted"}). ${type === "ltd" ? "Corporation tax is due 9 months and a day after your year end; dividends you take are taxed on you separately." : "Income tax and Class 4 are paid by 31 January and 31 July (payments on account)."} A guide, not tax advice: your accountant has the final figure.</div>
      </div></section>`
    }
    ${
      type === "sole"
        ? `<section class="card"><div class="cardbody"><b>📊 Quarterly figures (Making Tax Digital for Income Tax)</b><div class="who">Your income and costs for each quarter of the tax year, under HMRC's headings – ready to copy into your software, or give to your accountant.</div>
        ${qFig
          .map(
            (f) =>
              `<details class="tx-q"${f.started && f.b >= today && f.a <= today ? " open" : ""}><summary><b>${esc(ukDate(f.a))} – ${esc(ukDate(f.b))}</b>${f.started ? "" : ' <span class="who">not started</span>'}</summary>
              <div class="drow"><span>Turnover (income)</span><b>${gbp(f.inc)}</b></div>${Object.entries(
                f.heads,
              )
                .map(
                  ([h, v]) =>
                    `<div class="drow"><span>${esc(h)}</span><span>${gbp(v)}</span></div>`,
                )
                .join(
                  "",
                )}<button type="button" class="pillbtn tx-copy" data-a="${esc(f.a)}">📋 Copy</button></details>`,
          )
          .join("")}</div></section>`
        : ""
    }</div>`;
  $("tx-type")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await acSaveCfg({ bizType: b.dataset.v });
            render();
          } catch (e) {
            toast("Couldn't save");
          }
        }),
    );
  document.querySelectorAll(".tx-copy").forEach(
    (b) =>
      (b.onclick = async () => {
        const f = qFig.find((x) => x.a === b.dataset.a);
        const t = [`Quarter ${ukDate(f.a)} – ${ukDate(f.b)}`, `Turnover: ${f.inc.toFixed(2)}`]
          .concat(Object.entries(f.heads).map(([h, v]) => `${h}: ${v.toFixed(2)}`))
          .join("\n");
        try {
          await navigator.clipboard.writeText(t);
          toast("Copied");
        } catch (e) {
          toast("Couldn't copy");
        }
      }),
  );
}
