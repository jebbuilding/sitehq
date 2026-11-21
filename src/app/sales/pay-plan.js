/* ================= PAY PLAN: how the client will pay, on the estimate – deposit, stages, the balance ================= */
import { $, esc } from "../core/helpers.js";
export { spnHtml, spnRead, spnWire };
/* James (Nov 2026): "In estimates allow a good way to break down a job for a client". With the sections and the
   optional extras (sales/sales-calc.js › sdOptions), the estimate says how they'll pay: rows of a name and a % (e.g.
   Deposit 25%, Stage 1 – to wall plate 35%, Completion 40%), each with its £ worked out from the total, ready-made
   plans to start from, and a warning when the %s don't come to 100. Printed on the estimate as "How you'll pay". */
const SPN_PRESETS = [
  [
    "Deposit, then the balance",
    [
      ["Deposit", 25],
      ["On completion", 75],
    ],
  ],
  [
    "Deposit, two stages, completion",
    [
      ["Deposit", 20],
      ["Stage 1", 30],
      ["Stage 2", 30],
      ["On completion", 20],
    ],
  ],
  ["All on completion", [["On completion", 100]]],
];
function spnHtml(d) {
  const rows = (d.plan || []).length ? d.plan : [];
  return `<details class="spn-det"${rows.length ? " open" : ""}><summary><b>📅 How you'll pay</b><span class="who"> – deposit and stage payments, printed on the estimate</span></summary>
    <div class="spn-pre">${SPN_PRESETS.map(([l], i) => `<button type="button" class="pillbtn spn-p" data-i="${i}">${esc(l)}</button>`).join("")}</div>
    <div id="spn-rows">${rows.map((p) => spnRow(p)).join("")}</div>
    <div class="actions"><button type="button" class="btn" id="spn-add">+ Add a payment</button>${rows.length ? '<button type="button" class="linkdanger" id="spn-clear">No payment plan</button>' : ""}</div>
    <div class="who" id="spn-sum"></div></details>`;
}
const spnRow = (p) =>
  `<div class="spn-row"><input class="spn-l" maxlength="80" value="${esc(p.l || "")}" placeholder="e.g. Stage 1 – to wall plate" aria-label="Payment name"><label class="spn-pl"><input class="spn-pc" type="number" inputmode="decimal" min="0" max="100" step="any" value="${esc(p.p == null ? "" : p.p)}" aria-label="Percent of the total">%</label><button type="button" class="iconbtn spn-x" aria-label="Take this payment out">✕</button></div>`;
function spnRead() {
  return [...document.querySelectorAll("#spn-rows .spn-row")]
    .map((r) => ({
      l: r.querySelector(".spn-l").value.trim(),
      p: +r.querySelector(".spn-pc").value || 0,
    }))
    .filter((p) => p.l || p.p);
}
function spnWire(onChange) {
  if (!$("spn-rows")) return;
  const sum = () => {
    const t = spnRead().reduce((a, p) => a + p.p, 0);
    $("spn-sum").innerHTML = spnRead().length
      ? Math.abs(t - 100) < 0.01
        ? "✓ Comes to 100%"
        : `<span class="spn-bad">⚠ Comes to ${Math.round(t * 100) / 100}% – the last payment takes whatever's left</span>`
      : "";
    onChange();
  };
  const wireRows = () => {
    document.querySelectorAll("#spn-rows .spn-row").forEach((r) => {
      r.querySelector(".spn-x").onclick = () => {
        r.remove();
        sum();
      };
      r.querySelectorAll("input").forEach((i) => (i.oninput = sum));
    });
  };
  document.querySelectorAll(".spn-p").forEach(
    (b) =>
      (b.onclick = () => {
        $("spn-rows").innerHTML = SPN_PRESETS[+b.dataset.i][1]
          .map(([l, p]) => spnRow({ l, p }))
          .join("");
        wireRows();
        sum();
      }),
  );
  $("spn-add").onclick = () => {
    $("spn-rows").insertAdjacentHTML("beforeend", spnRow({ l: "", p: "" }));
    wireRows();
    sum();
  };
  if ($("spn-clear"))
    $("spn-clear").onclick = () => {
      $("spn-rows").innerHTML = "";
      sum();
    };
  wireRows();
  sum();
}
