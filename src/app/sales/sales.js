/* ================= ESTIMATES & INVOICES (owner): money in – an overview like an accounts package, estimates and invoices to clients ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import {
  SD_IK,
  sdCalc,
  sdDueDate,
  sdIk,
  sdIsPf,
  sdNo,
  sdSales,
  sdStatus,
  sdTag,
  sdTaxYear,
} from "./sales-calc.js";
import { sdEdit } from "./sales-edit.js";
import { sdImportWord, sdSettings, sdSetupCard, sdWireSetup } from "./sales-settings.js";
export { salesView };
/* The page: tabs Invoices | Estimates. Invoices: boxes for drafts, waiting to be paid, overdue and paid in the last
   30 days, money invoiced and paid over 6 months, this tax year's totals (VAT, CIS taken off), then the list.
   Estimates: drafts, sent, accepted and the win rate. Each opens full screen to edit, make the PDF on the
   letterhead, mark sent, record a payment, or turn an estimate into an invoice (all, a deposit or a stage). */
function salesView() {
  const all = sdSales();
  const est = (S.f.sv || "inv") === "est";
  const today = iso(new Date());
  const list0 = all.filter((d) => d.type === (est ? "estimate" : "invoice"));
  const f = (est ? S.f.sef : S.f.sif) || "all";
  const q = String(S.f.sq || "").toLowerCase();
  const list = list0
    .filter(
      (d) =>
        f === "all" ||
        (f === "proforma" ? sdIsPf(d) : sdStatus(d) === f) ||
        (f === "awaiting" && sdStatus(d) === "part"),
    )
    .filter((d) => !q || [d.number, d.client, d.title, d.site].join(" ").toLowerCase().includes(q))
    .sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (+b.number || 0) - (+a.number || 0),
    );
  const box = (k, n, money, label, cls) =>
    `<button type="button" class="sd-box ${cls || ""}" data-f="${k}"><small>${label}</small><b>${money}</b><span>${n} ${n === 1 ? "item" : "items"}</span></button>`;
  let tiles = "",
    extra = "";
  if (!est) {
    /* pro formas and extra work held for the final invoice aren't money invoiced */
    const real = list0.filter((d) => !sdIsPf(d) && !d.af);
    const pfOut = list0.filter(
      (d) => sdIsPf(d) && ["awaiting", "part", "overdue"].includes(sdStatus(d)),
    );
    const by = (st) => real.filter((d) => sdStatus(d) === st);
    const sum = (arr, k) => arr.reduce((a, d) => a + sdCalc(d)[k], 0);
    const aw = real.filter((d) => ["awaiting", "part"].includes(sdStatus(d)));
    const od = by("overdue");
    const from30 = iso(addDays(new Date(), -30));
    const paid30 = real.reduce(
      (a, d) =>
        a +
        (d.payments || []).filter((p) => p.date >= from30).reduce((x, p) => x + (+p.amt || 0), 0),
      0,
    );
    tiles =
      box("draft", by("draft").length, gbp(sum(by("draft"), "due")), "Draft") +
      box("awaiting", aw.length, gbp(sum(aw, "balance")), "Awaiting payment") +
      box("overdue", od.length, gbp(sum(od, "balance")), "Overdue", od.length ? "bad" : "") +
      box("paid", by("paid").length, gbp(paid30), "Paid in last 30 days", "ok") +
      (pfOut.length
        ? box(
            "proforma",
            pfOut.length,
            gbp(pfOut.reduce((a, d) => a + sdCalc(d).balance, 0)),
            "Pro formas waiting",
          )
        : "");
    /* 6 months: invoiced (by invoice date) and paid (by payment date) */
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 5 + i);
      return iso(d).slice(0, 7);
    });
    const inv = months.map((m) =>
      list0
        .filter((d) => sdStatus(d) !== "draft" && (d.date || "").slice(0, 7) === m)
        .reduce((a, d) => a + sdCalc(d).gross, 0),
    );
    const pd = months.map((m) =>
      real.reduce(
        (a, d) =>
          a +
          (d.payments || [])
            .filter((p) => (p.date || "").slice(0, 7) === m)
            .reduce((x, p) => x + (+p.amt || 0), 0),
        0,
      ),
    );
    const top = Math.max(1, ...inv, ...pd);
    extra = `<div class="card sd-chart"><div class="cardbody"><b>Money invoiced and paid</b><div class="sd-key"><i class="sd-ki"></i> Invoiced <i class="sd-kp"></i> Paid</div>
      <div class="sd-bars">${months
        .map(
          (m, i) =>
            `<div class="sd-mon" title="${esc(m)}: invoiced ${gbp(inv[i])}, paid ${gbp(pd[i])}"><div class="sd-pair"><i class="sd-bi" style="height:${Math.round((inv[i] / top) * 100)}%"></i><i class="sd-bp" style="height:${Math.round((pd[i] / top) * 100)}%"></i></div><small>${esc(parse(m + "-01").toLocaleDateString("en-GB", { month: "short" }))}</small></div>`,
        )
        .join("")}</div></div></div>`;
    const ty = sdTaxYear(today);
    const inTy = real.filter((d) => sdStatus(d) !== "draft" && d.date && sdTaxYear(d.date) === ty);
    const tyc = inTy.map(sdCalc);
    extra += `<div class="who sd-ty">This tax year (from 6 April ${ty}): invoiced <b>${gbp(tyc.reduce((a, c) => a + c.net, 0))}</b> before VAT · VAT charged <b>${gbp(tyc.reduce((a, c) => a + c.vat, 0))}</b>${tyc.some((c) => c.cis) ? ` · CIS taken off you <b>${gbp(tyc.reduce((a, c) => a + c.cis, 0))}</b>` : ""}</div>`;
  } else {
    const by = (st) => list0.filter((d) => sdStatus(d) === st);
    const sum = (arr) => arr.reduce((a, d) => a + sdCalc(d).net, 0);
    const won = list0.filter((d) => ["accepted", "invoiced"].includes(sdStatus(d)));
    const decided = won.length + by("declined").length;
    tiles =
      box("draft", by("draft").length, gbp(sum(by("draft"))), "Draft") +
      box("sent", by("sent").length, gbp(sum(by("sent"))), "Sent, waiting to hear") +
      box("accepted", won.length, gbp(sum(won)), "Accepted", "ok") +
      box("declined", by("declined").length, gbp(sum(by("declined"))), "Declined");
    extra = decided
      ? `<div class="who sd-ty">Won ${won.length} of ${decided} decided (${Math.round((won.length / decided) * 100)}%). Prices before VAT.</div>`
      : `<div class="who sd-ty">Prices before VAT.</div>`;
  }
  const filters = est
    ? [
        ["all", "All"],
        ["draft", "Draft"],
        ["sent", "Sent"],
        ["accepted", "Accepted"],
        ["declined", "Declined"],
        ["invoiced", "Invoiced"],
      ]
    : [
        ["all", "All"],
        ["draft", "Draft"],
        ["awaiting", "Awaiting payment"],
        ["overdue", "Overdue"],
        ["paid", "Paid"],
        ["proforma", "Pro forma"],
        ["held", "For final invoice"],
      ];
  $("main").innerHTML = `<div class="sd-page">
    <div class="seg sd-tabs" id="sd-tabs"><button type="button" data-v="inv" aria-pressed="${!est}">Invoices</button><button type="button" data-v="est" aria-pressed="${est}">Estimates</button></div>
    <div class="sd-acts"><button type="button" class="btn primary" id="sd-new">+ New ${est ? "estimate" : "invoice"}</button>${est ? `<span class="btn sd-filebtn">📄 Bring in a Word estimate<input type="file" class="sd-file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Bring in a Word estimate"></span>` : ""}<button type="button" class="btn" id="sd-set">⚙️ Letterhead, terms & bank</button></div>
    ${sdSetupCard()}
    <div class="sd-boxes">${tiles}</div>
    ${extra}
    <div class="sd-filt"><div class="seg" id="sd-f">${filters.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div><input id="sd-q" type="search" placeholder="Search number, client or job" value="${esc(S.f.sq || "")}" aria-label="Search"></div>
    ${
      list.length
        ? `<div class="sd-list">${list
            .map((d) => {
              const c = sdCalc(d),
                st = sdStatus(d);
              return `<button type="button" class="sd-row" data-id="${esc(d.id)}"><span class="sd-no">${esc(sdNo(d))}</span><span class="sd-who"><b>${esc(d.client || "No client yet")}</b><small>${esc([!est && sdIk(d) !== "oneoff" ? SD_IK[sdIk(d)] : "", d.title, d.site].filter(Boolean).join(" · "))}</small></span><span class="sd-dt"><small>${d.date ? esc(shortDay(d.date)) : ""}</small>${!est && st !== "draft" && st !== "paid" ? `<small class="${st === "overdue" ? "sd-late" : ""}">due ${esc(shortDay(sdDueDate(d)))}</small>` : ""}</span><span class="sd-amt"><b>${gbp(est ? c.net : st === "paid" || st === "draft" ? c.due : c.balance)}</b>${sdTag(d)}</span></button>`;
            })
            .join("")}</div>`
        : `<div class="empty"><strong>${list0.length ? "Nothing here" : est ? "No estimates yet" : "No invoices yet"}</strong>${list0.length ? "Try another filter." : est ? "Tap + New estimate, or bring in one you wrote in Word." : "Tap + New invoice, or turn an accepted estimate into one."}</div>`
    }
  </div>`;
  $("sd-tabs")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.sv = b.dataset.v;
          render();
        }),
    );
  const setF = (v) => {
    if (est) S.f.sef = v;
    else S.f.sif = v;
    render();
  };
  $("sd-f")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => setF(b.dataset.v)));
  $("main")
    .querySelectorAll(".sd-box")
    .forEach((b) => (b.onclick = () => setF(b.dataset.f === f ? "all" : b.dataset.f)));
  $("sd-q").oninput = (e) => {
    S.f.sq = e.target.value;
    clearTimeout(window.__sdQ);
    window.__sdQ = setTimeout(() => {
      render();
      const el = $("sd-q");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 300);
  };
  $("sd-new").onclick = () => sdEdit({ type: est ? "estimate" : "invoice" });
  $("sd-set").onclick = sdSettings;
  $("main")
    .querySelectorAll(".sd-row")
    .forEach((b) => (b.onclick = () => sdEdit(all.find((d) => d.id === b.dataset.id))));
  sdWireSetup();
  const fi = $("main").querySelector(".sd-file");
  if (fi)
    fi.onchange = async () => {
      const file = fi.files[0];
      fi.value = "";
      if (file) sdImportWord(file);
    };
}
