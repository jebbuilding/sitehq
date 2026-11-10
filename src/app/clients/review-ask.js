/* ================= REVIEW REQUESTS: when a job is finished, thank the client and ask for a Google review ================= */
import { saveClient } from "./clients.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet } from "../core/sheet.js";
import { S } from "../core/state.js";
import { coData } from "../owner/company-details.js";
export { rqAsk };
/* Moving a client to Completed offers to thank them and ask for a review: a ready-written message with James's Google
   review link (kept in Company details) to send by WhatsApp, text or email, or copy. The first time, the link can be
   pasted in here. When it was asked is noted on the client (reviewAskedAt), and the client page offers to ask again. */
function rqText(c, url) {
  const co = coData();
  const first =
    String(c.name || "")
      .trim()
      .split(/\s+/)[0] || "there";
  const work = c.work || c.project || "job";
  return `Hi ${first},\n\nThank you for choosing ${co.name} for your ${String(work).toLowerCase()}. It was a pleasure working with you.\n\nIf you're happy with the work, we'd be really grateful if you could leave us a quick Google review – it makes a big difference to a small firm:\n${url || co.reviewUrl || ""}\n\nThanks again,\n${co.owner || ""}`;
}
function rqAsk(c) {
  if (!c) return;
  const co = coData();
  const has = !!co.reviewUrl;
  openSheet(
    `<h3 id="sheettitle">⭐ Thank ${esc(c.name)} and ask for a review</h3>
    ${has ? "" : `<label for="rq-url">Your Google review link<input id="rq-url" maxlength="300" placeholder="e.g. https://g.page/r/…/review"></label><div class="who">In Google, open your business profile and tap <b>Ask for reviews</b> to get the link. It's kept in Company details for next time.</div>`}
    <label for="rq-msg">The message</label><textarea id="rq-msg" rows="9">${esc(rqText(c))}</textarea>
    <div class="actions rq-acts">${c.phone ? `<button type="button" class="btn primary" data-v="wa">WhatsApp</button><button type="button" class="btn" data-v="sms">💬 Text</button>` : ""}${c.email ? `<button type="button" class="btn${c.phone ? "" : " primary"}" data-v="mail">✉ Email</button>` : ""}<button type="button" class="btn" data-v="copy">📋 Copy</button></div>
    ${formFoot(false, "Done")}`,
    async () => {
      closeForm();
    },
    has ? "rq-msg" : "rq-url",
  );
  if ($("rq-url"))
    $("rq-url").oninput = () => {
      const u = $("rq-url").value.trim();
      $("rq-msg").value = rqText(c, u);
    };
  document.querySelectorAll(".rq-acts button").forEach(
    (b) =>
      (b.onclick = async () => {
        const msg = $("rq-msg").value;
        const url = $("rq-url") ? $("rq-url").value.trim() : "";
        try {
          if (url && /^https?:\/\//.test(url) && S.owner) {
            const company = Object.assign({}, (S.settings || {}).company || {}, { reviewUrl: url });
            await S.db.doc("settings/app").update({ company });
            S.settings = Object.assign({}, S.settings, { company });
          }
          await saveClient(Object.assign({}, c, { reviewAskedAt: Date.now() }));
        } catch (e) {}
        const v = b.dataset.v;
        if (v === "copy") {
          try {
            await navigator.clipboard.writeText(msg);
            toast("Copied – paste it to them");
          } catch (e) {
            toast("Couldn't copy");
          }
          return;
        }
        const tel = String(c.phone || "").replace(/\s+/g, "");
        const href =
          v === "wa"
            ? `https://wa.me/${tel.replace(/\D/g, "").replace(/^0/, "44")}?text=${encodeURIComponent(msg)}`
            : v === "sms"
              ? `sms:${tel}?&body=${encodeURIComponent(msg)}`
              : `mailto:${encodeURIComponent(c.email || "")}?subject=${encodeURIComponent("Thank you from " + coData().name)}&body=${encodeURIComponent(msg)}`;
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast("Noted that you asked for a review");
      }),
  );
}
