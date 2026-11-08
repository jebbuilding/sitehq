/* ================= ESTIMATING: the place kept for James's Job Pack Estimator ================= */
import { $ } from "../core/helpers.js";
export { estView };
/* James's estimating app (the Job Pack Estimator, a separate claude.ai page) comes in here when he says so (Nov 2026).
   Until then this page only holds its place in the menu (Paperwork › Money, next to Estimates & invoices) and opens
   the estimator where it is now. Nothing from it is copied in and it has no data of its own here yet. */
const EST_LINK = "https://claude.ai/artifact/9f6KEUV4ZWW2dwTLR7o2Be";
function estView() {
  $("main").innerHTML = `<div class="empty" style="text-align:left">
    <strong>📐 Estimating</strong>
    Your Job Pack Estimator will go here. It hasn't been brought in yet; it will be when you say.
    <br><br>Until then it stays where it is now:
    <div class="actions" style="margin-top:12px"><a class="btn primary" href="${EST_LINK}" target="_blank" rel="noopener">Open the Job Pack Estimator</a></div>
    <div class="who" style="margin-top:12px">Estimates you send to clients are still made in 💰 Estimates &amp; invoices.</div>
  </div>`;
}
