/* ================= JOB FIRST: job / site name, type of work, domestic or commercial – the top of every enquiry form ================= */
import { CL_WORK } from "./clients.js";
import { $, esc } from "../core/helpers.js";
export { jtHtml, jtRead, jtWire };
/* James (Nov 2026): "the top of the enquiry form should have the site name i want to use and what type of job it is and
   domestic or commercial should be at the top also" – and the same on ⚡ Quick enquiry and ＋ Another job as on 📝 New
   enquiry. jtHtml(px, v, opts) gives the three (ids px-jn, px-work, px-ctype); opts.workHtml replaces the type-of-work
   box where a form already has its own. jtWire(px) makes the two buttons a choice; jtRead(px) gives { jobName, work,
   clientType }. */
function jtHtml(px, v, opts) {
  v = v || {};
  opts = opts || {};
  const ct = v.clientType || "";
  return `<div class="jt-top">
    <label for="${px}-jn">Job / site name (what you'll call it)<input id="${px}-jn" maxlength="60" placeholder="e.g. Jones garden room" value="${esc(v.jobName || "")}"></label>
    ${opts.workHtml || `<label for="${px}-work">Type of work<select id="${px}-work"><option value="">Choose…</option>${CL_WORK.map((w) => `<option ${w === v.work ? "selected" : ""}>${esc(w)}</option>`).join("")}</select></label>`}
    <div class="flabel">Domestic or commercial?</div><div class="seg" id="${px}-ctype" role="group" aria-label="Domestic or commercial">${[
      ["domestic", "🏠 Domestic"],
      ["commercial", "🏢 Commercial"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${ct === k}">${l}</button>`,
      )
      .join("")}</div></div>`;
}
function jtWire(px) {
  const seg = $(px + "-ctype");
  if (!seg) return;
  seg.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () => {
        const on = b.getAttribute("aria-pressed") !== "true";
        seg
          .querySelectorAll("button")
          .forEach((x) => x.setAttribute("aria-pressed", String(on && x === b)));
      }),
  );
}
function jtRead(px) {
  const seg = $(px + "-ctype");
  const on = seg && seg.querySelector('[aria-pressed="true"]');
  return {
    jobName: ($(px + "-jn") ? $(px + "-jn").value : "").trim().replace(/\s+/g, " "),
    work: $(px + "-work") ? $(px + "-work").value.trim() : "",
    clientType: on ? on.dataset.v : "",
  };
}
