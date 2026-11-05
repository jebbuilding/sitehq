/* ================= FALLS / GRADIENTS ================= */
import { calcSave, calcState, fmtN, mmMt, numv } from "./calculator.js";
import { $, esc } from "../core/helpers.js";
export { calcFalls };
const FL_RATIOS = [10, 20, 30, 40, 50, 60, 80];
function flState() {
  const C = calcState();
  if (!C.falls) C.falls = { r: "40", other: "", L: "", start: "", mL: "", mD: "" };
  return C.falls;
}
function calcFalls() {
  const F = flState(),
    B = $("calcbody");
  const pct = (n) => fmtN(100 / n, n >= 40 ? 2 : 1) + "%",
    deg = (n) => fmtN((Math.atan(1 / n) * 180) / Math.PI, 2) + "°",
    mmpm = (n) => fmtN(1000 / n, 1) + " mm";
  B.innerHTML = `<div class="flabel">Pick a fall</div>
    <div class="flchips" role="group" aria-label="Fall">${FL_RATIOS.map((n) => `<button type="button" class="chip flr" data-r="${n}" aria-pressed="${F.r === String(n)}">1:${n}</button>`).join("")}<button type="button" class="chip flr" data-r="other" aria-pressed="${F.r === "other"}">Other 1:</button><button type="button" class="chip flr" data-r="pct" aria-pressed="${F.r === "pct"}">Enter %</button></div>
    ${F.r === "pct" ? `<label for="fl-pct" style="max-width:220px">Fall as a percentage (%)<input id="fl-pct" data-k="pct" inputmode="decimal" value="${esc(F.pct || "")}" placeholder="e.g. 2.5"></label>` : ""}
    ${F.r === "other" ? `<label for="fl-other" style="max-width:220px">1 in …<input id="fl-other" data-k="other" inputmode="decimal" value="${esc(F.other)}" placeholder="e.g. 100"></label>` : ""}
    <div id="fl-sel"></div>
    <div class="rfgrid" style="margin-top:12px">
      <div class="grid2"><label for="fl-L">Length of the run (mm)<input id="fl-L" data-k="L" inputmode="decimal" value="${esc(F.L)}" placeholder="e.g. 6000"></label>
      <label for="fl-start">Level at the high end (mm, optional)<input id="fl-start" data-k="start" inputmode="decimal" value="${esc(F.start)}" placeholder="e.g. 150"></label></div>
    </div>
    <div class="actions"><button type="button" class="pillbtn" id="fl-clear">✕ Clear</button></div>
    <div id="fl-out" aria-live="polite"></div>
    <div class="flabel" style="margin-top:14px">All the falls</div>
    <div class="tblwrap"><table class="fltbl"><thead><tr><th>Fall</th><th>%</th><th>Angle</th><th>Per metre</th><th id="fl-th">Drop over run</th></tr></thead><tbody id="fl-tb"></tbody></table></div>
    <div class="flabel" style="margin-top:14px">What fall have I got?</div>
    <div class="grid2"><label for="fl-mL">Length (mm)<input id="fl-mL" data-k="mL" inputmode="decimal" value="${esc(F.mL)}" placeholder="e.g. 4000"></label><label for="fl-mD">Drop (mm)<input id="fl-mD" data-k="mD" inputmode="decimal" value="${esc(F.mD)}" placeholder="e.g. 75"></label></div>
    <div id="fl-meas" aria-live="polite"></div>
    <div class="actions"><button type="button" class="pillbtn" id="fl-mclear">✕ Clear</button></div>
    <div class="who" style="margin-top:12px">Guide only, check the spec: 100 mm drains are usually laid at 1:40 to 1:80. Patios and paving are usually 1:60 to 1:80, away from the house. Flat roofs are usually designed at 1:40 so they end up at least 1:80 once built.</div>`;
  const card = (n, l, hi) =>
    `<div class="tot ${hi ? "hi" : ""}"><div class="n">${n}</div><div class="l">${l}</div></div>`;
  const out = () => {
    const r =
        F.r === "other"
          ? numv(F.other)
          : F.r === "pct"
            ? numv(F.pct) > 0
              ? 100 / numv(F.pct)
              : 0
            : numv(F.r),
      L = numv(F.L) / 1000,
      st = F.start === "" ? NaN : numv(F.start);
    $("fl-sel").innerHTML =
      r > 0
        ? `<div class="totals rftots">${card(F.r === "pct" ? fmtN(100 / r, 2) + "%" : "1:" + fmtN(r, r % 1 ? 1 : 0), F.r === "pct" ? "Percentage" : "Fall", 1)}${card(F.r === "pct" ? "1:" + fmtN(r, r < 20 ? 1 : 0) : pct(r), F.r === "pct" ? "Same as a fall of" : "Percentage")}${card(deg(r), "Angle")}${card(mmpm(r), "Drop per metre")}</div>`
        : `<div class="nothing">${F.r === "pct" ? "Enter the percentage, e.g. 2.5 for 2.5%." : "Enter the fall, e.g. 100 for 1:100."}</div>`;
    const drop = r > 0 && L > 0 ? (L * 1000) / r : NaN;
    $("fl-out").innerHTML = isFinite(drop)
      ? `<div class="totals rftots">${card(fmtN(drop, 1) + " mm", "Drop over " + mmMt(L), 1)}${isFinite(st) ? card(fmtN(st - drop, 1) + " mm", "Level at the low end") : ""}</div>` +
        (L >= 1
          ? `<div class="flabel">Every 1000 mm (1 m)</div><div class="flsteps">${Array.from(
              { length: Math.min(Math.floor(L), 30) },
              (_, i) => i + 1,
            )
              .map(
                (m) =>
                  `<span>At <b>${fmtN(m * 1000, 0)} mm</b> (${m} m): drop ${fmtN((m * 1000) / r, 1)} mm${isFinite(st) ? ", level " + fmtN(st - (m * 1000) / r, 1) + " mm" : ""}</span>`,
              )
              .join("")}</div>`
          : "")
      : "";
    $("fl-th").textContent = L > 0 ? "Over " + fmtN(L * 1000, 0) + " mm" : "Over 1000 mm";
    $("fl-tb").innerHTML = FL_RATIOS.map(
      (n) =>
        `<tr${String(n) === F.r ? ' class="on"' : ""}><td><b>1:${n}</b></td><td>${pct(n)}</td><td>${deg(n)}</td><td>${mmpm(n)}</td><td>${fmtN(((L > 0 ? L : 1) * 1000) / n, 1)} mm</td></tr>`,
    ).join("");
    const mL = numv(F.mL) / 1000,
      mD = numv(F.mD);
    $("fl-meas").innerHTML =
      mL > 0 && mD > 0
        ? (() => {
            const n = (mL * 1000) / mD;
            const near = FL_RATIOS.filter((x) => x >= n).sort((a, b) => a - b)[0];
            return `<div class="totals rftots">${card("1:" + fmtN(n, n < 20 ? 1 : 0), "Your fall", 1)}${card(fmtN(mD / mL / 10, 2) + "%", "Percentage")}${card(fmtN((Math.atan(mD / (mL * 1000)) * 180) / Math.PI, 2) + "°", "Angle")}</div>
        <div class="who">${
          n > 80.5
            ? "⚠ Flatter than 1:80. Most drains and paving need more fall than this."
            : n < 9.5
              ? "Steeper than 1:10."
              : (() => {
                  const ex = FL_RATIOS.find((x) => Math.abs(x - n) < 0.5);
                  if (ex) return "That's right on 1:" + ex + ".";
                  const lo = [...FL_RATIOS].reverse().find((x) => x < n);
                  return (
                    "Between 1:" +
                    lo +
                    " and 1:" +
                    near +
                    ": steeper than 1:" +
                    near +
                    ", flatter than 1:" +
                    lo +
                    "."
                  );
                })()
        }</div>`;
          })()
        : "";
  };
  $("fl-clear").onclick = () => {
    F.L = "";
    F.start = "";
    F.other = "";
    F.pct = "";
    calcSave();
    calcFalls();
    const f = $(F.r === "pct" ? "fl-pct" : F.r === "other" ? "fl-other" : "fl-L");
    if (f) f.focus();
  };
  $("fl-mclear").onclick = () => {
    F.mL = "";
    F.mD = "";
    calcSave();
    calcFalls();
    $("fl-mL").focus();
  };
  B.querySelectorAll(".flr").forEach(
    (b) =>
      (b.onclick = () => {
        F.r = b.dataset.r;
        calcSave();
        calcFalls();
        const fi = $(F.r === "pct" ? "fl-pct" : "fl-other");
        if (fi) fi.focus();
      }),
  );
  B.querySelectorAll("[data-k]").forEach((el) =>
    el.addEventListener("input", () => {
      F[el.dataset.k] = el.value;
      calcSave();
      out();
    }),
  );
  out();
}
