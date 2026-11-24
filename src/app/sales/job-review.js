/* ================= JOB REVIEW: at the end of a job – the money made against the estimate, and what went well or badly ================= */
import { $, esc, gbp, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { jbBudget } from "./job-budget.js";
import { jcData } from "./job-costs.js";
import { siteLabel } from "../sites/job-details.js";
export { JRV };
/* James (Nov 2026, "job review: what went well or badly, money made against the estimate"): on a finished (or nearly
   finished) client's job, 📝 Job review. The numbers come from the job's costs: the price (estimate plus variations,
   or what's been invoiced), what it cost (labour from the timesheets, materials, subbies), the profit against the
   profit he aims for, labour and materials each against their share of the estimate, the hours, variations and
   callbacks. Then he fills in: what went well, what went badly, what to do differently next time (and in pricing), and
   stars out of 5. Saved on the client record with the numbers at the time (todos/{client}: review { at, well, bad,
   next, price, stars, nums }). Today lists finished jobs from the last 60 days with no review. 📝 Job reviews lists
   them all with the lessons, to read before pricing the next one. */
const JRV = (() => {
  const nums = (c) => {
    if (!c.site) return null;
    let d = null,
      b = null;
    try {
      d = jcData(c.site);
      b = jbBudget(d);
    } catch (e) {
      return null;
    }
    if (!d) return null;
    const cbs = (S.callbacks || []).filter((x) => x.clientId === c.id).length;
    return {
      price: d.price || 0,
      cost: d.cost || 0,
      profit: d.profit || 0,
      pct: d.pctProfit || 0,
      target: b ? b.tgt : null,
      hours: d.hours || 0,
      vars: (d.vars || []).length,
      varNet: d.varNet || 0,
      parts: b ? b.parts.map((p) => ({ name: p.name, budget: p.budget, spent: p.spent })) : [],
      callbacks: cbs,
    };
  };
  const numsHtml = (n) => {
    if (!n || !n.price)
      return '<div class="who">No price on this job yet, so there are no money figures – add its estimate or invoices to see them.</div>';
    const good = n.target == null || n.pct >= n.target;
    return `<div class="jrv-nums">
      <div class="jrv-big ${good ? "jrv-good" : "jrv-bad"}"><span>Profit</span><b>${gbp(n.profit)}</b><span>${n.pct}%${n.target != null ? " · aiming for " + n.target + "%" : ""}</span></div>
      <div class="jrv-grid"><span>Price</span><b>${gbp(n.price)}</b><span>Cost</span><b>${gbp(n.cost)}</b><span>Hours</span><b>${n.hours}</b>${n.vars ? `<span>Variations</span><b>${n.vars} · ${gbp(n.varNet)}</b>` : ""}${n.callbacks ? `<span>Callbacks</span><b>${n.callbacks}</b>` : ""}</div>
      ${n.parts.map((p) => `<div class="jrv-part"><span>${esc(p.name)}</span><span class="${p.spent > p.budget ? "jrv-over" : ""}">${gbp(p.spent)} of ${gbp(p.budget)}${p.budget ? " (" + Math.round((p.spent / p.budget) * 100) + "%)" : ""}</span></div>`).join("")}
    </div>`;
  };
  const stars = (n) => "★".repeat(n || 0) + "☆".repeat(5 - (n || 0));
  function open(c0) {
    const c = (S.clients || []).find((x) => x.id === c0.id) || c0;
    const r = Object.assign({ well: "", bad: "", next: "", price: "", stars: 0 }, c.review || {});
    const n = nums(c);
    openSheet(
      `<h3 id="sheettitle">📝 Job review – ${esc(c.name || "")}</h3>
      <div class="who">${esc([c.work, c.site ? siteLabel(c.site) : ""].filter(Boolean).join(" · "))}</div>
      ${numsHtml(n)}
      <label for="jrv-well">What went well<textarea id="jrv-well" maxlength="1500" placeholder="e.g. Steel went in first time, client really happy with the finish">${esc(r.well)}</textarea></label>
      <label for="jrv-bad">What went badly<textarea id="jrv-bad" maxlength="1500" placeholder="e.g. Lost 3 days to rain on the footings; plasterer let us down">${esc(r.bad)}</textarea></label>
      <label for="jrv-next">Next time we'd…<textarea id="jrv-next" maxlength="1500" placeholder="e.g. Book the plasterer earlier, cover the footings">${esc(r.next)}</textarea></label>
      <label for="jrv-price">Pricing – what to change<textarea id="jrv-price" maxlength="800" placeholder="e.g. Allow 2 more days for knocking through; skips cost more than priced">${esc(r.price)}</textarea></label>
      <div class="flabel">How did it go overall?</div>
      <div class="seg jrv-stars" role="group" aria-label="Stars">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-v="${i}" aria-pressed="${i === +r.stars}" aria-label="${i} star${i === 1 ? "" : "s"}">${"★".repeat(i)}</button>`).join("")}</div>
      ${c.review ? `<div class="who">Last saved ${esc(stamp(c.review.at))}.</div>` : ""}
      ${formFoot(false, "Save the review")}`,
      async () => {
        const sel = document.querySelector('.jrv-stars [aria-pressed="true"]');
        const review = {
          at: Date.now(),
          well: $("jrv-well").value.trim(),
          bad: $("jrv-bad").value.trim(),
          next: $("jrv-next").value.trim(),
          price: $("jrv-price").value.trim(),
          stars: sel ? +sel.dataset.v : 0,
          nums: n,
        };
        if (!review.well && !review.bad && !review.next && !review.stars)
          return showErr("Put a few words in, or the stars.");
        try {
          await S.db.doc("todos/" + c.id).update({ review, updated: Date.now() });
          const i = (S.clients || []).findIndex((x) => x.id === c.id);
          if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], { review });
          closeForm();
          toast("Job review saved");
          render();
        } catch (e) {
          showErr("Couldn't save. Try again.");
        }
      },
    );
    document
      .querySelectorAll(".jrv-stars button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            document
              .querySelectorAll(".jrv-stars button")
              .forEach((x) => x.setAttribute("aria-pressed", x === b))),
      );
  }
  const statusTxt = (c) => (c.review ? stars(c.review.stars) : "");
  /* finished in the last 60 days, no review */
  const due = () =>
    (S.clients || []).filter(
      (c) =>
        c.stage === "done" &&
        c.site &&
        !c.review &&
        Date.now() - (c.doneAt || c.updated || 0) < 60 * 86400000,
    );
  function todayCard() {
    if (!S.owner) return "";
    const L = due();
    if (!L.length) return "";
    return `<div class="card jrv-today"><div class="cardbody"><b>📝 Review finished jobs</b><div class="who">Five minutes now saves money on the next one.</div>${L.map((c) => `<button type="button" class="incrow jrv-go" data-id="${esc(c.id)}"><span><b>${esc(c.name)}</b><br><span class="who">${esc(c.work || siteLabel(c.site))}</span></span><span>›</span></button>`).join("")}<button type="button" class="linkbtn jrv-all">📝 All job reviews</button></div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".jrv-go").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.id);
          if (c) open(c);
        }),
    );
    document.querySelectorAll(".jrv-all").forEach((b) => (b.onclick = list));
  }
  /* every review, newest first, with the lessons – and a search */
  function list(q) {
    const f = String(q || "")
      .toLowerCase()
      .trim();
    const L = (S.clients || [])
      .filter((c) => c.review)
      .filter(
        (c) =>
          !f ||
          [c.name, c.work, c.review.well, c.review.bad, c.review.next, c.review.price]
            .join(" ")
            .toLowerCase()
            .includes(f),
      )
      .sort((a, b) => b.review.at - a.review.at);
    openViewer(`<div class="jrv-list"><div class="vhead"><b>📝 Job reviews</b></div>
      <input type="search" id="jrv-q" placeholder="Search the lessons, e.g. plasterer, footings" value="${esc(q || "")}" aria-label="Search job reviews">
      ${
        L.map((c) => {
          const r = c.review,
            n = r.nums;
          return `<div class="card jrv-row"><div class="jrv-h"><b>${esc(c.name)}</b><span class="jrv-st">${stars(r.stars)}</span></div>
          <div class="who">${esc([c.work, stamp(r.at)].filter(Boolean).join(" · "))}${n && n.price ? ` · profit ${gbp(n.profit)} (${n.pct}%${n.target != null ? ", aiming for " + n.target + "%" : ""})` : ""}</div>
          ${[
            ["👍", r.well],
            ["👎", r.bad],
            ["➡️ Next time", r.next],
            ["💷 Pricing", r.price],
          ]
            .filter(([, t]) => t)
            .map(([l, t]) => `<div class="jrv-l"><b>${l}</b> ${esc(t)}</div>`)
            .join("")}
          <button type="button" class="linkbtn jrv-ed" data-id="${esc(c.id)}">✎ Change</button></div>`;
        }).join("") ||
        `<div class="nothing">${f ? "Nothing matches." : "No job reviews yet. Finished jobs show on Today to review."}</div>`
      }</div>`);
    let t = null;
    $("jrv-q").oninput = (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        list(e.target.value);
        const el = $("jrv-q");
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 300);
    };
    document.querySelectorAll(".jrv-ed").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.id);
          if (c) {
            closeViewer();
            open(c);
          }
        }),
    );
  }
  return { open, list, statusTxt, todayCard, wireToday, due, nums };
})();
