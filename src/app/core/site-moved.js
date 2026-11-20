/* ================= SITE MOVED: the old claude.ai copy sends everyone to the firm's own website ================= */
import { $ } from "./helpers.js";
import { S } from "./state.js";
export { smvBanner, smvBlock, smvIsOld };
/* James (Nov 2026): the firm moved to its own website (sitehq.jevul.com) on 5 Nov, but the old claude.ai link still
   worked, so hours could be saved in one and looked for in the other ("kahns hours are in his time sheet but they
   arent going on to my view"). On claude.ai, trades and clients now get one screen: SiteHQ has moved, with a button
   to the website and nothing to fill in. Anything still waiting on their phone keeps sending, so nothing is lost.
   The owner keeps the old copy to look things up, with a banner on every page saying it's the old one. */
const SMV_URL = "https://sitehq.jevul.com";
/* the claude.ai copy (claude.ai or its file host); our own website and the test pages are never "old" */
const smvIsOld = () => /(^|\.)claude(usercontent)?\.(ai|com)$/i.test(location.hostname || "");
function smvBlock() {
  S.moved = true;
  ["weekbar", "tabs"].forEach((id) => {
    const el = $(id);
    if (el) el.hidden = true;
  });
  $("main").innerHTML =
    `<div class="smv-box"><div class="smv-ic" aria-hidden="true">🏗️</div><h2>SiteHQ has moved</h2>
    <p>This is the old copy. Your timesheets, sign-ins and everything else now go on the new website.</p>
    <a class="btn primary smv-go" href="${SMV_URL}" target="_blank" rel="noopener">Open the new SiteHQ ›</a>
    <p class="who">Save that page to your home screen and use it from now on. Sign in with the email address you were invited with.</p>
    <p class="who">If this phone says something is waiting to send, leave it open with signal for a minute first.</p></div>`;
}
function smvBanner() {
  if ($("smv-bar")) return;
  const d = document.createElement("div");
  d.id = "smv-bar";
  d.className = "smv-bar";
  d.innerHTML = `<b>This is the old copy of SiteHQ.</b> Trades and clients now use the new website, so their hours and forms only show there. <a href="${SMV_URL}" target="_blank" rel="noopener">Open the new SiteHQ ›</a>`;
  document.body.insertBefore(d, document.body.firstChild);
}
