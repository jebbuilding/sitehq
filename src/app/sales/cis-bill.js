/* ================= CIS BILLS: a subbie's bill entered line by line, like a bill in an accounts package ================= */
import { $, esc, gbp, iso, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import {
  cisDown,
  cisLab,
  cisMonthOf,
  cisRateOf,
  cisRec,
  cisSaveMonth,
  cisSub,
  cisSubList,
} from "./cis-returns.js";
import { SD_VATC, sdR2 } from "./sales-calc.js";
export { cisBill, cisBillCalc };
/* From (the subbie), date, due date, their reference, amounts with or without VAT, then lines: description, qty,
   unit price, account (CIS labour, CIS materials, plant hire, other – not CIS) and tax rate (20%, 5%, reverse
   charge 20% or 5%, zero, exempt, no VAT). Totals: subtotal, VAT, total, less the CIS deduction (on the labour lines,
   at the subbie's rate), amount due. Save as a draft, approve it, or approve and record the payment; the date it's
   paid puts it in that CIS tax month (a bill not paid yet isn't on a return). Kept in the month's record
   (todos/cis-YYYY-MM, extra[]): { who, date, due, inv, inc, lines: [{ d, q, r, acct, vc }], status, paidOn,
   lab, mat, vat, other } – the totals are kept too so the return and statements read them simply. */
const CIS_ACCTS = {
  lab: "CIS labour",
  mat: "CIS materials",
  plant: "Plant hire",
  other: "Other (not CIS)",
};
/* the money on a bill */
function cisBillCalc(b) {
  let lab = 0,
    mat = 0,
    other = 0,
    vat = 0,
    rc = 0;
  (b.lines || []).forEach((l) => {
    const v = SD_VATC[l.vc] || SD_VATC.S20;
    let n = sdR2((l.q === "" || l.q == null ? 1 : +l.q) * (+l.r || 0));
    if (b.inc && v.r && !v.rc) n = sdR2(n / (1 + v.r / 100));
    const t = sdR2((n * v.r) / 100);
    if (v.rc) rc += t;
    else vat += t;
    if (l.acct === "lab") lab += n;
    else if (l.acct === "other") other += n;
    else mat += n;
  });
  const net = sdR2(lab + mat + other);
  return {
    lab: sdR2(lab),
    mat: sdR2(mat),
    other: sdR2(other),
    net,
    vat: sdR2(vat),
    rc: sdR2(rc),
    total: sdR2(net + vat),
  };
}
/* save a bill into the month it's paid in (or dated, until paid), moving it if that changed */
async function cisSaveBill(b, oldKey, oldIdx) {
  const key = cisMonthOf(b.status === "paid" && b.paidOn ? b.paidOn : b.date);
  if (oldKey != null && oldKey !== key) {
    const ex = (cisRec(oldKey).extra || []).slice();
    ex.splice(oldIdx, 1);
    await cisSaveMonth(oldKey, { extra: ex });
  }
  const ex = (cisRec(key).extra || []).slice();
  const c = cisBillCalc(b);
  const rec = Object.assign({}, b, { lab: c.lab, mat: c.mat, vat: c.vat, other: c.other });
  if (oldKey === key && oldIdx != null) ex[oldIdx] = rec;
  else ex.push(rec);
  await cisSaveMonth(key, { extra: ex });
  return key;
}
function cisBill(key, x0, idx) {
  const subs = cisSubList();
  if (!subs.length) return toast("Add your CIS subcontractors first (Subcontractors tab)");
  const td = iso(new Date());
  const b = Object.assign(
    { who: subs[0].id, date: td, due: "", inv: "", inc: false, status: "draft", lines: [] },
    JSON.parse(JSON.stringify(x0 || {})),
  );
  /* an older payment typed as labour / materials / VAT becomes lines */
  if (!b.lines.length && x0 && (x0.lab != null || x0.amt != null)) {
    if (+x0.lab)
      b.lines.push({
        d: x0.desc || "Labour",
        q: 1,
        r: +x0.lab,
        acct: "lab",
        vc: +x0.vat ? "S20" : "NV",
      });
    if (+x0.mat)
      b.lines.push({ d: "Materials", q: 1, r: +x0.mat, acct: "mat", vc: +x0.vat ? "S20" : "NV" });
    b.status = "paid";
    b.paidOn = x0.date;
  }
  if (!b.lines.length)
    b.lines.push({
      d: "Labour",
      q: 1,
      r: "",
      acct: "lab",
      vc: cisSub(b.who).drc ? "RC20" : cisSub(b.who).vatNo ? "S20" : "NV",
    });
  const row = (l, i) => `<div class="cb-line" data-i="${i}">
      <input class="cb-d" maxlength="160" value="${esc(l.d || "")}" placeholder="Description" aria-label="Description">
      <input class="cb-q" type="number" inputmode="decimal" step="any" value="${esc(l.q == null ? 1 : l.q)}" aria-label="Quantity">
      <input class="cb-r" type="number" inputmode="decimal" step="0.01" value="${esc(l.r == null ? "" : l.r)}" placeholder="0.00" aria-label="Unit price">
      <select class="cb-a" aria-label="Account">${Object.entries(CIS_ACCTS)
        .map(
          ([k, v]) =>
            `<option value="${k}"${k === (l.acct || "lab") ? " selected" : ""}>${v}</option>`,
        )
        .join("")}</select>
      <select class="cb-v" aria-label="Tax rate">${Object.entries(SD_VATC)
        .map(
          ([k, v]) =>
            `<option value="${k}"${k === (l.vc || "S20") ? " selected" : ""}>${esc(v.l.split(" (")[0])}</option>`,
        )
        .join("")}</select>
      <b class="cb-amt"></b>
      <button type="button" class="iconbtn cb-del" aria-label="Remove line">✕</button>
    </div>`;
  openViewer(`<div class="cb-page">
    <h3 style="margin:0 0 8px">${x0 ? "CIS bill" : "New CIS bill"}${b.status === "paid" ? ' <span class="tag ok">Paid</span>' : b.status === "approved" ? ' <span class="tag day">Approved</span>' : ' <span class="tag">Draft</span>'}</h3>
    <div class="cb-head">
      <label for="cb-who">From<select id="cb-who">${subs.map((s) => `<option value="${esc(s.id)}"${s.id === b.who ? " selected" : ""}>${esc(s.name)} (${cisRateOf(s.id)}%)</option>`).join("")}</select></label>
      <label for="cb-date">Date<input id="cb-date" type="date" value="${esc(b.date)}"></label>
      <label for="cb-due">Due date<input id="cb-due" type="date" value="${esc(b.due || "")}"></label>
      <label for="cb-ref">Reference<input id="cb-ref" maxlength="40" value="${esc(b.inv || "")}" placeholder="Their invoice no."></label>
      <label for="cb-site">Site<input id="cb-site" maxlength="120" value="${esc(b.site || "")}" list="cb-sites"></label>
    </div>
    <datalist id="cb-sites">${(S.sites || []).map((s) => `<option value="${esc(s.name)}">`).join("")}</datalist>
    <div class="cb-inc"><label for="cb-inc">Amounts are<select id="cb-inc"><option value="">Before VAT (tax exclusive)</option><option value="1"${b.inc ? " selected" : ""}>Including VAT (tax inclusive)</option></select></label></div>
    <div class="cb-th"><span>Description</span><span>Qty</span><span>Unit price</span><span>Account</span><span>Tax rate</span><span>Amount £</span><span></span></div>
    <div id="cb-lines">${b.lines.map(row).join("")}</div>
    <button type="button" class="btn" id="cb-add">+ Add a new line</button>
    <div class="cb-tot" id="cb-tot"></div>
    <div class="grid2"><label for="cb-paid">Date paid (puts it in that CIS month)<input id="cb-paid" type="date" value="${esc(b.paidOn || "")}"></label><label for="cb-note">Note<input id="cb-note" maxlength="160" value="${esc(b.desc || "")}"></label></div>
    <div class="sd-edacts">
      <button type="button" class="btn" id="cb-save">Save as draft</button>
      <button type="button" class="btn" id="cb-appr">Approve</button>
      <button type="button" class="btn primary" id="cb-pay">Approve and record payment</button>
      ${x0 ? `<button type="button" class="linkdanger" id="cb-del">Delete</button>` : ""}
      <button type="button" class="btn" id="cb-cancel">Cancel</button>
    </div>
  </div>`);
  const read = () => {
    const lines = [...document.querySelectorAll("#cb-lines .cb-line")]
      .map((r) => ({
        d: r.querySelector(".cb-d").value.trim(),
        q: r.querySelector(".cb-q").value === "" ? 1 : +r.querySelector(".cb-q").value,
        r: r.querySelector(".cb-r").value === "" ? "" : sdR2(r.querySelector(".cb-r").value),
        acct: r.querySelector(".cb-a").value,
        vc: r.querySelector(".cb-v").value,
      }))
      .filter((l) => l.d || l.r !== "");
    return Object.assign({}, b, {
      who: $("cb-who").value,
      date: $("cb-date").value || td,
      due: $("cb-due").value,
      inv: $("cb-ref").value.trim(),
      site: $("cb-site").value.trim(),
      inc: $("cb-inc").value === "1",
      desc: $("cb-note").value.trim(),
      paidOn: $("cb-paid").value,
      lines,
    });
  };
  const totals = () => {
    const o = read(),
      c = cisBillCalc(o),
      rate = +cisRateOf(o.who);
    document.querySelectorAll("#cb-lines .cb-line").forEach((r) => {
      const q = r.querySelector(".cb-q").value === "" ? 1 : +r.querySelector(".cb-q").value;
      r.querySelector(".cb-amt").textContent = gbp(
        sdR2(q * (+r.querySelector(".cb-r").value || 0)),
      );
    });
    const ded = cisDown((c.lab * rate) / 100);
    $("cb-tot").innerHTML =
      `<div class="drow"><span>Subtotal${o.inc ? " (VAT taken out)" : ""}</span><span>${gbp(c.net)}</span></div>
      <div class="drow"><span>VAT</span><span>${gbp(c.vat)}</span></div>
      ${c.rc ? `<div class="drow"><span>Reverse charge VAT (you pay HMRC, not them)</span><span>${gbp(c.rc)}</span></div>` : ""}
      <div class="drow"><span><b>Total</b></span><b>${gbp(c.total)}</b></div>
      <div class="drow"><span>Less CIS deduction (${rate}% of labour ${gbp(c.lab)})</span><span>-${gbp(ded)}</span></div>
      <div class="drow sd-due"><span><b>Amount due to ${esc(cisSub(o.who).name)}</b></span><b>${gbp(sdR2(c.total - ded))}</b></div>
      <div class="who">On the CIS return: ${gbp(sdR2(c.lab + c.mat))} paid (no VAT), materials ${gbp(c.mat)}${c.other ? ` · ${gbp(c.other)} other (not CIS) left off` : ""}.</div>`;
  };
  const wire = () => {
    document
      .querySelectorAll("#cb-lines input, #cb-lines select")
      .forEach((x) => (x.oninput = x.onchange = totals));
    document.querySelectorAll("#cb-lines .cb-del").forEach(
      (x) =>
        (x.onclick = () => {
          x.closest(".cb-line").remove();
          totals();
        }),
    );
  };
  $("cb-add").onclick = () => {
    const n = document.querySelectorAll("#cb-lines .cb-line").length;
    const last = document.querySelector("#cb-lines .cb-line:last-child");
    $("cb-lines").insertAdjacentHTML(
      "beforeend",
      row(
        { d: "", q: 1, r: "", acct: "mat", vc: last ? last.querySelector(".cb-v").value : "S20" },
        n,
      ),
    );
    wire();
    totals();
    const ds = document.querySelectorAll("#cb-lines .cb-d");
    ds[ds.length - 1].focus();
  };
  ["cb-who", "cb-inc"].forEach((id) => ($(id).onchange = totals));
  wire();
  totals();
  const done = (k) => {
    closeViewer();
    S.f.cism = k;
    S.f.cisv = "month";
    render();
  };
  const save = async (status) => {
    const o = read();
    if (!o.lines.length) return toast("Add at least one line");
    o.status = status;
    if (status === "paid" && !o.paidOn) o.paidOn = td;
    try {
      const k = await cisSaveBill(o, x0 ? key : null, x0 ? idx : null);
      toast(
        status === "paid"
          ? `Payment recorded – on the CIS return for ${cisLab(k)}`
          : status === "approved"
            ? "Approved – record the payment when you pay it"
            : "Saved as a draft",
      );
      done(k);
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  $("cb-save").onclick = () => save("draft");
  $("cb-appr").onclick = () => save("approved");
  $("cb-pay").onclick = () => save("paid");
  $("cb-cancel").onclick = () => closeViewer();
  if ($("cb-del"))
    $("cb-del").onclick = async () => {
      const ex = (cisRec(key).extra || []).slice();
      ex.splice(idx, 1);
      try {
        await cisSaveMonth(key, { extra: ex });
        toast("Bill deleted");
        done(key);
      } catch (e) {
        toast("Couldn't delete");
      }
    };
}
