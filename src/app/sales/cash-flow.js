/* ================= CASH FLOW: the bank balance 13 weeks ahead, from what's owed in and out, VAT due and the usual running costs ================= */
import { $, addDays, esc, gbp, iso, monday, parse, shortDay } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { acBalance, acCatKind, acCfg, acSaveCfg, acSums } from "./acct-data.js";
import { adOwedIn, adOwedOut } from "./acct-due.js";
import { sdR2, sdSigned } from "./sales-calc.js";
import { vtBoxes, vtFiled, vtName, vtQuarters } from "./vat-return.js";
export { csfPlan, csfView };
/* Accounts › 📈 Cash flow. Starts from today's bank balances. Money in: invoices not yet paid, in the week they're due
   (overdue ones in this week, marked). Money out: bills and trades' invoices not yet paid, by their due dates; the VAT
   for the quarter just gone (and the one running) on its due date; and the usual week's running costs (the average
   of the last 12 weeks' bank payments, leaving out materials and subcontractors, which come in as bills). James can
   add his own one-off lines (a van payment, a big deposit due). The weeks are a bar chart with the balance; the
   lowest week is picked out, red if it goes below zero. Own lines: in the accounts record, cashLines [{ id, date,
   what, amt }] (+ in, − out). */
const CSF_WEEKS = 13;
function csfWeeks() {
  const m = monday(new Date());
  return Array.from({ length: CSF_WEEKS }, (_, i) => {
    const from = iso(addDays(m, i * 7));
    return { from, to: iso(addDays(m, i * 7 + 6)), ins: [], outs: [] };
  });
}
/* the usual week's running costs: the last 12 weeks of bank payments, without materials and subbies (they come in as
   bills), HMRC, drawings, loans and transfers */
function csfUsual() {
  const to = iso(new Date()),
    from = iso(addDays(new Date(), -84));
  const s = acSums(from, to);
  let tot = 0;
  Object.entries(s.byCat).forEach(([k, v]) => {
    if (acCatKind(k) === "out" && k !== "mat" && k !== "subs") tot += -v;
  });
  return sdR2(tot / 12);
}
function csfPlan() {
  const W = csfWeeks();
  const today = iso(new Date());
  const put = (date, list, row) => {
    const d = !date || date < W[0].from ? W[0].from : date;
    const w = W.find((x) => d >= x.from && d <= x.to);
    if (w) w[list].push(Object.assign({ late: date && date < today }, row));
  };
  adOwedIn().forEach((x) => put(x.due, "ins", { what: `${x.who} · ${x.ref}`, amt: x.amt }));
  adOwedOut().forEach((x) =>
    put(x.due, "outs", { what: `${x.who}${x.ref ? " · " + x.ref : ""}`, amt: x.amt }),
  );
  /* VAT: each quarter whose due date falls in the 13 weeks, not filed */
  try {
    vtQuarters(3).forEach((q) => {
      if (q.due < W[0].from || q.due > W[W.length - 1].to || vtFiled(q)) return;
      const b5 = vtBoxes(q.from, q.to).B[5];
      if (b5 > 0) put(q.due, "outs", { what: `VAT ${vtName(q)}`, amt: b5 });
    });
  } catch (e) {}
  const usual = csfUsual();
  if (usual > 0)
    W.forEach((w) => w.outs.push({ what: "Usual running costs", amt: usual, usual: true }));
  (acCfg().cashLines || []).forEach((l) => {
    if (l.date < W[0].from || l.date > W[W.length - 1].to) return;
    put(l.date, +l.amt >= 0 ? "ins" : "outs", { what: l.what, amt: Math.abs(+l.amt), own: l.id });
  });
  let bal = sdR2(acCfg().accounts.reduce((a, x) => a + (+acBalance(x) || 0), 0));
  const start = bal;
  W.forEach((w) => {
    w.in = sdR2(w.ins.reduce((a, x) => a + x.amt, 0));
    w.out = sdR2(w.outs.reduce((a, x) => a + x.amt, 0));
    bal = sdR2(bal + w.in - w.out);
    w.bal = bal;
  });
  return { W, start, usual };
}
function csfView(tabs) {
  const { W, start, usual } = csfPlan();
  const low = W.reduce((a, w) => (w.bal < a.bal ? w : a), W[0]);
  const top = Math.max(1, ...W.map((w) => Math.max(w.in, w.out)));
  const open = S.f.csfw || "";
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="sd-boxes"><div class="sd-box"><small>In the bank now</small><b>${sdSigned(start)}</b><span>${acCfg().accounts.length} account${acCfg().accounts.length === 1 ? "" : "s"}</span></div>
    <div class="sd-box ${low.bal < 0 ? "bad" : "ok"}"><small>Lowest in the next 13 weeks</small><b>${sdSigned(low.bal)}</b><span>week of ${esc(shortDay(low.from))}</span></div>
    <div class="sd-box"><small>In 13 weeks</small><b>${sdSigned(W[W.length - 1].bal)}</b><span>if it all goes to plan</span></div></div>
    ${low.bal < 0 ? `<div class="notice warn">⚠ The bank goes overdrawn in the week of ${esc(shortDay(low.from))}. Chase what's owed, or move a payment.</div>` : ""}
    <div class="card"><div class="cardbody"><div class="csf-bars" role="img" aria-label="Money in and out each week">${W.map((w) => `<div class="csf-col${w === low ? " low" : ""}"><div class="csf-pair"><i class="csf-in" style="height:${Math.round((w.in / top) * 100)}%"></i><i class="csf-out" style="height:${Math.round((w.out / top) * 100)}%"></i></div><small>${esc(parse(w.from).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}</small></div>`).join("")}</div><div class="sd-key"><i class="ac-ki"></i> In <i class="ac-ko"></i> Out</div></div></div>
    <section class="card"><div class="cardbody"><b>Week by week</b>
    ${W.map(
      (w, i) =>
        `<button type="button" class="csf-w${w.bal < 0 ? " neg" : ""}" data-i="${i}" aria-expanded="${open === String(i)}"><span>Week of ${esc(shortDay(w.from))}</span><span class="csf-in-t">+${gbp(w.in)}</span><span class="csf-out-t">−${gbp(w.out)}</span><b>${sdSigned(w.bal)}</b></button>${
          open === String(i)
            ? `<div class="csf-det">${w.ins.map((x) => `<div class="drow"><span>💷 ${esc(x.what)}${x.late ? ' <span class="tag bad">overdue</span>' : ""}</span><span>+${gbp(x.amt)}${x.own ? ` <button type="button" class="linkdanger csf-del" data-id="${esc(x.own)}">✕</button>` : ""}</span></div>`).join("")}${w.outs.map((x) => `<div class="drow"><span>${x.usual ? "🔁" : "📤"} ${esc(x.what)}${x.late ? ' <span class="tag bad">overdue</span>' : ""}</span><span>−${gbp(x.amt)}${x.own ? ` <button type="button" class="linkdanger csf-del" data-id="${esc(x.own)}">✕</button>` : ""}</span></div>`).join("") || '<div class="who">Nothing this week.</div>'}</div>`
            : ""
        }`,
    ).join("")}
    </div></section>
    <div class="sd-acts"><button type="button" class="btn" id="csf-add">+ Add money in or out</button></div>
    <div class="who">A forecast from what's in SiteHQ: invoices and bills by their due dates, VAT when it's due, and usual running costs of ${gbp(usual)} a week (the last 12 weeks' bank payments, leaving out materials and subcontractors, which come in as bills). Add anything else you know is coming.</div></div>`;
  document.querySelectorAll(".csf-w").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.csfw = S.f.csfw === b.dataset.i ? "" : b.dataset.i;
        render();
      }),
  );
  document.querySelectorAll(".csf-del").forEach(
    (b) =>
      (b.onclick = async (e) => {
        e.stopPropagation();
        await acSaveCfg({
          cashLines: (acCfg().cashLines || []).filter((x) => x.id !== b.dataset.id),
        });
        render();
      }),
  );
  $("csf-add").onclick = () => {
    openSheet(
      `<h3 id="sheettitle">+ Money in or out</h3>
      <div class="seg" id="csf-dir"><button type="button" data-v="in" aria-pressed="false">💷 Coming in</button><button type="button" data-v="out" aria-pressed="true">📤 Going out</button></div>
      <label for="csf-what">What<input id="csf-what" maxlength="80" placeholder="e.g. Van finance, deposit from Mr Smith"></label>
      <div class="grid2"><label for="csf-amt">Amount £<input id="csf-amt" type="number" inputmode="decimal" min="0" step="0.01"></label><label for="csf-date">When<input id="csf-date" type="date" value="${iso(new Date())}"></label></div>
      ${formFoot(false, "Add")}`,
      async () => {
        const amt = +$("csf-amt").value || 0;
        if (!$("csf-what").value.trim() || !(amt > 0))
          return showErr("Say what it is and how much");
        const out = $("csf-dir").querySelector('[aria-pressed="true"]').dataset.v === "out";
        try {
          await acSaveCfg({
            cashLines: (acCfg().cashLines || []).concat([
              {
                id: newId(),
                date: $("csf-date").value || iso(new Date()),
                what: $("csf-what").value.trim(),
                amt: out ? -amt : amt,
              },
            ]),
          });
          closeForm();
          render();
        } catch (e) {
          showErr("Couldn't save");
        }
      },
      "csf-what",
    );
    csfWireDir();
  };
}
function csfWireDir() {
  const s = $("csf-dir");
  if (!s) return;
  s.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () =>
        s
          .querySelectorAll("button")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
  );
}
