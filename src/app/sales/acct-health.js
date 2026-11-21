/* ================= ACCOUNTS HEALTH CHECK: everything the accounts are missing, in one list, each a tap from being put right ================= */
import { addDays, esc, iso, parse, shortDay } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { allTeam } from "../owner/owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { acAllTx } from "./acct-data.js";
import { acReceipts } from "./acct-receipts.js";
import { acrSorted } from "./acct-reconcile.js";
import { cisLab, cisMonthOf, cisRange, cisRec, cisSubList } from "./cis-returns.js";
import { sdSales, sdSet, sdStatus, sdTaxYear } from "./sales-calc.js";
import { vtFiled, vtQuarters } from "./vat-return.js";
export { ahcCardHtml, ahcWire };
/* James (Nov 2026): "the accounts area really needs to … make sure all details needed is taken from other parts of the
   app and that it talks to all the area it needs". At the top of Accounts › Overview: receipts and bills to check,
   bank payments not sorted or with no receipt, CIS subbies not verified, last month's CIS return and any ended VAT
   quarter not filed, trades' invoices waiting, customers' invoices overdue and bills due. All clear says so. */
function ahcItems() {
  const today = iso(new Date());
  const out = [];
  const add = (n, one, many, go, bad, noN) => {
    if (n > 0) out.push({ n: noN ? "" : n, l: n === 1 ? one : many, go, bad: !!bad });
  };
  const accts = (k, extra) => () => {
    S.otab = "accounts";
    S.f.act = k;
    Object.assign(S.f, extra || {});
    render();
    window.scrollTo(0, 0);
  };
  /* receipts and bills */
  const rc = acReceipts();
  add(
    rc.filter((r) => r.status !== "done").length,
    "receipt or bill to check",
    "receipts and bills to check",
    accts("rcpt"),
  );
  add(
    rc.filter((r) => r.status === "done" && r.paid === "acct" && !r.tx && r.due && r.due < today)
      .length,
    "bill overdue to pay",
    "bills overdue to pay",
    accts("due"),
    true,
  );
  /* the bank, this tax year */
  const ty = sdTaxYear(today);
  const from = ty + "-04-06";
  const tx = acAllTx().filter((t) => t.date >= from && t.date <= today);
  add(
    tx.filter((t) => !acrSorted(t)).length,
    "bank payment not sorted",
    "bank payments not sorted",
    accts("bank"),
  );
  const from90 = iso(addDays(new Date(), -90));
  add(
    tx.filter(
      (t) =>
        t.amt < 0 &&
        t.date >= from90 &&
        !t.rcpt &&
        !t.link &&
        ["mat", "tools", "veh", "hire", "train", "oexp"].includes(t.cat),
    ).length,
    "payment out in the last 90 days with no receipt",
    "payments out in the last 90 days with no receipt",
    accts("bank"),
  );
  /* CIS */
  const cisGo = (v, m) => () => {
    S.otab = "cis";
    S.f.cisv = v;
    if (m) S.f.cism = m;
    render();
    window.scrollTo(0, 0);
  };
  add(
    cisSubList().filter((s) => !s.verifiedOn).length,
    "CIS subcontractor not verified with HMRC",
    "CIS subcontractors not verified with HMRC",
    cisGo("subs"),
    true,
  );
  const curM = cisMonthOf(today);
  const prevM = cisMonthOf(iso(addDays(parse(cisRange(curM)[0]), -1)));
  if (today >= curM + "-06" && !cisRec(prevM).filedAt)
    add(
      1,
      `CIS return for ${cisLab(prevM)} not marked as filed – due by ${shortDay(prevM + "-19")}`,
      "",
      cisGo("month", prevM),
      today > prevM + "-19",
      true,
    );
  /* VAT */
  if (sdSet().vatReg !== false)
    add(
      vtQuarters(4).filter((q) => q.to < today && !vtFiled(q)).length,
      "VAT quarter ended and not filed",
      "VAT quarters ended and not filed",
      accts("vat"),
      true,
    );
  /* invoices */
  add(
    allTeam("invoices")
      .filter(isInv)
      .filter((v) => ["sent", "received", "approved"].includes(v.status || "sent")).length,
    "trade's invoice waiting to be approved or paid",
    "trades' invoices waiting to be approved or paid",
    accts("due"),
  );
  add(
    sdSales().filter((d) => d.type === "invoice" && sdStatus(d) === "overdue").length,
    "customer invoice overdue",
    "customer invoices overdue",
    accts("gp"),
    true,
  );
  return out;
}
function ahcCardHtml() {
  const L = ahcItems();
  return `<section class="card ahc-card"><div class="cardbody"><b>✅ Accounts health check</b>${
    L.length
      ? `<div class="who">What the accounts are missing. Tap one to put it right.</div>${L.map(
          (x, i) =>
            `<button type="button" class="ahc-row${x.bad ? " ahc-bad" : ""}" data-i="${i}"><span class="ahc-rl">${x.n !== "" ? `<b>${x.n}</b> ` : ""}${esc(x.l)}</span><span class="ahc-chev" aria-hidden="true">›</span></button>`,
        ).join("")}`
      : '<div class="who ahc-ok">✓ All up to date – nothing missing.</div>'
  }</div></section>`;
}
function ahcWire() {
  const L = ahcItems();
  document.querySelectorAll("#main .ahc-row").forEach((b) => {
    const x = L[+b.dataset.i];
    if (x) b.onclick = x.go;
  });
}
