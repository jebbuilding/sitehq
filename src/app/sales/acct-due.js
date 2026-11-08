/* ================= ACCOUNTS PAID / NOT PAID: money owed to you and bills you owe, overdue first ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "../owner/company-details.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { acLinkRcpt, acReceipts, acSaveRcpt } from "./acct-receipts.js";
import { cisBill, cisBillCalc } from "./cis-bill.js";
import { sdCalc, sdCounts, sdDueDate, sdNo, sdR2, sdSales, sdSaveRec } from "./sales-calc.js";
import { sdEdit, sdPayment } from "./sales-edit.js";
export { adView };
/* Like the "Invoices owed to you" and "Bills to pay" panels in accounting packages: everything not paid yet, by how
   overdue it is (not due yet, 1–30, 31–60, 61–90, over 90 days), with the action beside each – record a payment
   or chase it (an email ready to send) for your invoices; mark paid for bills on account and trades' invoices; CIS
   bills open in the CIS bill screen so the return stays right. Below: what's been paid in the last 30 days. */
const AD_BUCKETS = [
  ["0", "Not due yet"],
  ["30", "1–30 days over"],
  ["60", "31–60 days over"],
  ["90", "61–90 days over"],
  ["99", "Over 90 days"],
];
const adOver = (due) => Math.floor((parse(iso(new Date())) - parse(due)) / 864e5);
const adBucket = (n) => (n <= 0 ? "0" : n <= 30 ? "30" : n <= 60 ? "60" : n <= 90 ? "90" : "99");
/* everything owed to you */
function adOwedIn() {
  return sdSales()
    .filter((d) => sdCounts(d) && sdCalc(d).balance > 0.005)
    .map((d) => {
      const due = sdDueDate(d);
      return {
        k: "inv",
        d,
        who: d.client || "",
        ref: sdNo(d),
        date: d.date,
        due,
        amt: sdCalc(d).balance,
        over: adOver(due),
      };
    })
    .sort((a, b) => b.over - a.over);
}
/* everything you owe */
function adOwedOut() {
  const out = [];
  acReceipts()
    .filter(
      (r) => r.status === "done" && r.paid === "acct" && !r.tx && !r.paidOn && r.type !== "credit",
    )
    .forEach((r) => {
      const due = r.due || iso(addDays(parse(r.date || iso(new Date())), 30));
      out.push({
        k: "rc",
        r,
        who: r.supplier || "Bill",
        ref: r.ref || "",
        date: r.date,
        due,
        amt: +r.total || 0,
        over: adOver(due),
      });
    });
  allTeam("invoices")
    .filter(
      (v) =>
        isInv(v) && !v.fromOwner && v.status !== "paid" && v.status !== "rejected" && +v.amount > 0,
    )
    .forEach((v) => {
      const d0 = v.invDate || iso(new Date(v.sentAt || Date.now()));
      const due = iso(addDays(parse(d0), 30));
      out.push({
        k: "tr",
        v,
        who: nameOf(v.who),
        ref: v.number ? "Invoice " + v.number : "",
        date: d0,
        due,
        amt: +v.amount,
        over: adOver(due),
        site: v.site || "",
      });
    });
  (S.cisMonths || []).forEach((m) =>
    (m.extra || []).forEach((b, i) => {
      if (b.status !== "approved") return;
      const c = cisBillCalc(b);
      const due = b.due || b.date;
      out.push({
        k: "cis",
        m,
        i,
        b,
        who: nameOf(b.who),
        ref: b.inv ? "Bill " + b.inv : "CIS bill",
        date: b.date,
        due,
        amt: c.total,
        over: adOver(due),
        site: b.site || "",
      });
    }),
  );
  return out.sort((a, b) => b.over - a.over);
}
/* paid in the last 30 days */
function adPaidRecently() {
  const from = iso(addDays(new Date(), -30));
  const out = [];
  sdSales()
    .filter((d) => d.type === "invoice")
    .forEach((d) =>
      (d.payments || []).forEach(
        (p) =>
          p.date >= from &&
          out.push({
            dir: "in",
            who: d.client || "",
            ref: sdNo(d),
            date: p.date,
            amt: +p.amt || 0,
          }),
      ),
    );
  allTeam("invoices")
    .filter((v) => isInv(v) && v.status === "paid" && (v.paidOn || "") >= from)
    .forEach((v) =>
      out.push({
        dir: "out",
        who: nameOf(v.who),
        ref: v.number ? "Invoice " + v.number : "",
        date: v.paidOn,
        amt: +v.amount || 0,
      }),
    );
  acReceipts()
    .filter((r) => r.paidOn && r.paidOn >= from)
    .forEach((r) =>
      out.push({
        dir: "out",
        who: r.supplier || "Bill",
        ref: r.ref || "",
        date: r.paidOn,
        amt: +r.total || 0,
      }),
    );
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
function adView(tabs) {
  const inn = adOwedIn(),
    outs = adOwedOut();
  const f = S.f.adf || "all";
  const show = (l) =>
    l.filter((x) => f === "all" || (f === "over" ? x.over > 0 : x.over > -8 && x.over <= 0));
  const sum = (l) => sdR2(l.reduce((a, x) => a + x.amt, 0));
  const aged = (l) =>
    `<div class="ad-aged">${AD_BUCKETS.map(([k, lab]) => {
      const v = sum(l.filter((x) => adBucket(x.over) === k));
      return `<div class="ad-b${k !== "0" && v ? " bad" : ""}"><small>${lab}</small><b>${gbp(v)}</b></div>`;
    }).join("")}</div>`;
  const badge = (x) =>
    x.over > 0
      ? `<span class="tag bad">${x.over} day${x.over === 1 ? "" : "s"} overdue</span>`
      : x.over > -8
        ? `<span class="tag warn">Due ${x.over === 0 ? "today" : esc(shortDay(x.due))}</span>`
        : `<span class="who">Due ${esc(shortDay(x.due))}</span>`;
  const rowIn = (x, i) => {
    const em =
      x.d.email || ((S.clients || []).find((c) => c.id === x.d.clientId) || {}).email || "";
    const body = `Dear ${x.who},\n\nJust a reminder that invoice ${x.ref} for ${gbp(x.amt)} was due on ${shortDay(x.due)}. If you've already paid, thank you and please ignore this.\n\nMany thanks,\n${coData().name || ""}`;
    return `<div class="ad-row"><span class="ad-main"><b>${esc(x.who || "Client")}</b> <span class="who">${esc(x.ref)} · ${esc(shortDay(x.date))}</span><br>${badge(x)}${x.d.chasedAt ? ` <span class="who">chased ${esc(shortDay(iso(new Date(x.d.chasedAt))))}</span>` : ""}</span><b class="ad-amt">${gbp(x.amt)}</b><span class="ad-acts"><button type="button" class="btn primary ad-pay" data-i="${i}">💷 Paid</button>${x.over > 0 && em ? `<a class="btn ad-chase" data-i="${i}" href="mailto:${esc(em)}?subject=${encodeURIComponent("Invoice " + x.ref + " – payment reminder")}&body=${encodeURIComponent(body)}">✉ Chase</a>` : ""}<button type="button" class="btn ad-open" data-i="${i}">Open</button></span></div>`;
  };
  const rowOut = (x, i) =>
    `<div class="ad-row"><span class="ad-main"><b>${esc(x.who)}</b> <span class="who">${esc([x.ref, shortDay(x.date), x.site, x.k === "cis" ? "CIS" : x.k === "rc" ? "on account" : "trade"].filter(Boolean).join(" · "))}</span><br>${badge(x)}</span><b class="ad-amt">${gbp(x.amt)}</b><span class="ad-acts"><button type="button" class="btn primary ad-paid" data-i="${i}">✓ Mark paid</button></span></div>`;
  const sIn = show(inn),
    sOut = show(outs);
  const recent = adPaidRecently();
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="sd-boxes">
      <div class="sd-box${inn.some((x) => x.over > 0) ? " bad" : ""}"><small>Owed to you</small><b>${gbp(sum(inn))}</b><span>${inn.filter((x) => x.over > 0).length} overdue · ${gbp(sum(inn.filter((x) => x.over > 0)))}</span></div>
      <div class="sd-box${outs.some((x) => x.over > 0) ? " bad" : ""}"><small>You owe</small><b>${gbp(sum(outs))}</b><span>${outs.filter((x) => x.over > 0).length} overdue · ${gbp(sum(outs.filter((x) => x.over > 0)))}</span></div>
      <div class="sd-box ok"><small>Paid in, last 30 days</small><b>${gbp(sum(recent.filter((x) => x.dir === "in")))}</b><span>paid out ${gbp(sum(recent.filter((x) => x.dir === "out")))}</span></div>
    </div>
    <div class="seg" id="ad-f">${[
      ["all", "Everything not paid"],
      ["over", "Overdue"],
      ["week", "Due in the next week"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
      )
      .join("")}</div>
    <section class="card"><div class="cardbody"><b>💷 Owed to you (${sIn.length})</b>${aged(inn)}${sIn.map(rowIn).join("") || '<div class="who">Nothing here. 👍</div>'}</div></section>
    <section class="card"><div class="cardbody"><b>🧾 You owe (${sOut.length})</b><div class="who">Bills on account, trades' invoices and approved CIS bills not paid yet.</div>${aged(outs)}${sOut.map(rowOut).join("") || '<div class="who">Nothing here. 👍</div>'}</div></section>
    <section class="card"><div class="cardbody"><b>Paid in the last 30 days</b>${
      recent.length
        ? recent
            .slice(0, 30)
            .map(
              (x) =>
                `<div class="drow"><span>${x.dir === "in" ? "⬇ In" : "⬆ Out"} · ${esc(shortDay(x.date))} · ${esc(x.who)}${x.ref ? " · " + esc(x.ref) : ""}</span><span>${gbp(x.amt)}</span></div>`,
            )
            .join("")
        : '<div class="who">No payments in the last 30 days.</div>'
    }</div></section>
  </div>`;
  $("ad-f")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.adf = b.dataset.v;
          render();
        }),
    );
  document
    .querySelectorAll("#main .ad-pay")
    .forEach((b) => (b.onclick = () => sdPayment(sIn[+b.dataset.i].d)));
  document
    .querySelectorAll("#main .ad-open")
    .forEach((b) => (b.onclick = () => sdEdit(sIn[+b.dataset.i].d)));
  document.querySelectorAll("#main .ad-chase").forEach((a) =>
    a.addEventListener("click", () => {
      const d = sIn[+a.dataset.i].d;
      sdSaveRec(Object.assign({}, d, { chasedAt: Date.now() })).catch(() => {});
    }),
  );
  document
    .querySelectorAll("#main .ad-paid")
    .forEach((b) => (b.onclick = () => adMarkPaid(sOut[+b.dataset.i])));
}
/* a bill paid: the date and how; a CIS bill is paid in the CIS bill screen (so it goes on the right return) */
function adMarkPaid(x) {
  if (x.k === "cis") return cisBill(String(x.m.id).replace(/^cis-/, ""), x.b, x.i);
  openSheet(
    `<h3 id="sheettitle">✓ Paid: ${esc(x.who)} ${gbp(x.amt)}</h3>
    <div class="grid2"><label for="adp-d">Date paid<input id="adp-d" type="date" value="${iso(new Date())}"></label><label for="adp-h">How<select id="adp-h"><option value="bank">Bank transfer / card</option><option value="cash">Cash</option></select></label></div>
    <label for="adp-r">Payment reference (optional)<input id="adp-r" maxlength="60"></label>
    <div class="who">A bank payment is matched to your statement when it comes in.</div>
    ${formFoot(false, "Mark paid")}`,
    async () => {
      const on = $("adp-d").value || iso(new Date()),
        how = $("adp-h").value,
        ref = $("adp-r").value.trim();
      try {
        if (x.k === "rc") {
          const r = await acSaveRcpt(
            Object.assign({}, x.r, {
              paidOn: on,
              paidRef: ref,
              paid: how === "cash" ? "cash" : "acct",
            }),
          );
          if (how !== "cash") await acLinkRcpt(r);
        } else
          await S.db.doc("sheets/" + x.v.who + "/invoices/" + x.v.id).update({
            status: "paid",
            paidAt: Date.now(),
            paidOn: on,
            paidRef: ref,
            receivedAt: x.v.receivedAt || Date.now(),
            approvedAt: x.v.approvedAt || Date.now(),
          });
        closeForm();
        toast("Marked as paid");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "adp-d",
  );
}
