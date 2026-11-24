/* ================= REFERRALS: who recommended each client, and saying thank you ================= */
import { clStage } from "./clients.js";
import { viewClient } from "./quick-enquiry.js";
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { coData } from "../owner/company-details.js";
export { RFL };
/* James (Nov 2026, "referrals: who sent you each job, and a thank-you"): when an enquiry came from a Recommendation,
   the enquiry asks who recommended them (one of his clients, or just a name). The new client's page says who sent
   them; the recommender's page lists everyone they've sent and how it went. When a recommended job is won, Today says
   🤝 Say thank you: a note to them (email or text, words to change), with a gift if he gives one (e.g. a £50
   voucher), and it's marked thanked. 🤝 Referrals lists everyone who's sent work, most first, with how many were won
   and what they were worth. Kept on the new client's record (todos/{client}: refBy { name, clientId }, refThanked
   { at, gift, how }). */
const RFL = (() => {
  const WON = ["won", "onsite", "done"];
  let lastHow = "";
  const byOf = (c) => (c && c.refBy && (c.refBy.name || c.refBy.clientId) ? c.refBy : null);
  const refName = (r) => {
    const x = r.clientId && (S.clients || []).find((y) => y.id === r.clientId);
    return (x && x.name) || r.name || "";
  };
  const sentBy = (c) =>
    (S.clients || []).filter((x) => {
      const r = byOf(x);
      return (
        r &&
        x.id !== c.id &&
        (r.clientId
          ? r.clientId === c.id
          : refName(r).toLowerCase() === String(c.name || "").toLowerCase())
      );
    });
  const first = (n) =>
    String(n || "")
      .replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "")
      .split(" ")[0] || "";
  /* in the enquiry form, next to "How they found you" */
  function formHtml(c) {
    const r = byOf(c) || {};
    const show = (c.source || "") === "Recommendation" || !!byOf(c);
    return `<label for="cf-refby" class="rfl-ask" id="cf-refrow"${show ? "" : " hidden"}>🤝 Who recommended them?<input id="cf-refby" maxlength="80" list="cf-reflist" value="${esc(refName(r))}" placeholder="Start typing a client's name, or any name"></label>
      <datalist id="cf-reflist">${(S.clients || [])
        .filter((x) => x.id !== c.id && x.name)
        .map((x) => `<option value="${esc(x.name)}">`)
        .join("")}</datalist>`;
  }
  function formWire() {
    const sel = $("cf-src");
    if (!sel || !$("cf-refrow")) return;
    sel.addEventListener("change", () => {
      $("cf-refrow").hidden = sel.value !== "Recommendation" && !$("cf-refby").value.trim();
    });
  }
  function formRead(c) {
    const el = $("cf-refby");
    if (!el) return c.refBy || null;
    const name = el.value.trim();
    if (!name) return null;
    const x = (S.clients || []).find(
      (y) => y.id !== c.id && (y.name || "").toLowerCase() === name.toLowerCase(),
    );
    return x ? { name: x.name, clientId: x.id } : { name, clientId: "" };
  }
  /* on a client's page: who sent them, and who they've sent */
  function clientHtml(c) {
    if (!S.owner) return "";
    const r = byOf(c);
    const sent = sentBy(c);
    if (!r && !sent.length) return "";
    return `<div class="card rfl-card"><b>🤝 Recommendations</b>
      ${r ? `<div class="rfl-by">Recommended by ${r.clientId ? `<button type="button" class="linkbtn rfl-open" data-id="${esc(r.clientId)}">${esc(refName(r))}</button>` : `<b>${esc(refName(r))}</b>`}${WON.includes(c.stage) ? (c.refThanked ? ` · <span class="rfl-ok">✓ thanked ${esc(shortDay(iso(new Date(c.refThanked.at))))}${c.refThanked.gift ? " (" + esc(c.refThanked.gift) + ")" : ""}</span>` : ` · <button type="button" class="btn rfl-ty" data-id="${esc(c.id)}">🤝 Say thank you</button>`) : ""}</div>` : ""}
      ${sent.length ? `<div class="who">${esc(first(c.name))} has recommended you to ${sent.length} ${sent.length === 1 ? "person" : "people"}:</div>${sent.map((x) => `<button type="button" class="incrow rfl-open" data-id="${esc(x.id)}"><span><b>${esc(x.name)}</b><br><span class="who">${esc([x.work, clStage(x.stage), x.quote ? gbp(+x.quote) : ""].filter(Boolean).join(" · "))}</span></span><span>${x.refThanked ? "✓ thanked" : WON.includes(x.stage) ? "🤝 to thank" : ""}</span></button>`).join("")}` : ""}</div>`;
  }
  function wireClient() {
    document.querySelectorAll(".rfl-open").forEach(
      (b) =>
        (b.onclick = () => {
          const x = (S.clients || []).find((y) => y.id === b.dataset.id);
          if (x) {
            closeViewer();
            viewClient(x);
          }
        }),
    );
    document.querySelectorAll(".rfl-ty").forEach(
      (b) =>
        (b.onclick = () => {
          const x = (S.clients || []).find((y) => y.id === b.dataset.id);
          if (x) {
            closeViewer();
            thank(x);
          }
        }),
    );
  }
  /* the thank-you: words to change, how it's sent, and any gift */
  function thank(c) {
    const r = byOf(c);
    if (!r) return;
    const who = r.clientId ? (S.clients || []).find((y) => y.id === r.clientId) : null;
    const co = coData();
    const txt = `Hi ${first(refName(r)) || "there"},

Just a quick note to say thank you for recommending us to ${c.name || "your friend"}. We're doing ${c.work ? "their " + String(c.work).toLowerCase() : "the work"} and really appreciate you passing our name on – it means a lot to a small firm like ours.

Thanks again,
${co.owner || ""}
${co.name || ""}`;
    openSheet(
      `<h3 id="sheettitle">🤝 Say thank you to ${esc(refName(r))}</h3>
      <div class="who">For recommending ${esc(c.name || "")}.</div>
      <label for="rfl-tx">The note<textarea id="rfl-tx" maxlength="2000" style="min-height:180px">${esc(txt)}</textarea></label>
      <label for="rfl-gift">A gift (optional)<input id="rfl-gift" maxlength="80" placeholder="e.g. £50 restaurant voucher"></label>
      <div class="actions">${who && who.email ? '<button type="button" class="btn" id="rfl-em">✉️ Email it</button>' : ""}${who && who.phone ? '<button type="button" class="btn" id="rfl-sms">💬 Text it</button>' : ""}</div>
      <div class="who">${who && (who.email || who.phone) ? "" : "No email or phone saved for them – send it your own way, then tap Mark as thanked."}</div>
      ${formFoot(false, "Mark as thanked")}`,
      async () => {
        const at = Date.now();
        const refThanked = { at, gift: $("rfl-gift").value.trim(), how: lastHow };
        try {
          await S.db.doc("todos/" + c.id).update({ refThanked, updated: at });
          const i = (S.clients || []).findIndex((x) => x.id === c.id);
          if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], { refThanked });
          closeForm();
          toast("Marked as thanked");
          render();
        } catch (e) {
          showErr("Couldn't save. Try again.");
        }
      },
    );
    const go = (href, how) => {
      lastHow = how;
      const a = document.createElement("a");
      a.href = href;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    if ($("rfl-em"))
      $("rfl-em").onclick = () =>
        go(
          `mailto:${encodeURIComponent(who.email)}?subject=${encodeURIComponent("Thank you")}&body=${encodeURIComponent($("rfl-tx").value)}`,
          "email",
        );
    if ($("rfl-sms"))
      $("rfl-sms").onclick = () =>
        go(
          `sms:${String(who.phone).replace(/\s+/g, "")}?&body=${encodeURIComponent($("rfl-tx").value)}`,
          "text",
        );
  }
  const toThank = () =>
    (S.clients || []).filter((c) => byOf(c) && WON.includes(c.stage) && !c.refThanked);
  function todayCard() {
    if (!S.owner) return "";
    const L = toThank();
    if (!L.length) return "";
    return `<div class="card rfl-today"><div class="cardbody"><b>🤝 Say thank you</b><div class="who">These jobs came from a recommendation and you've won them.</div>${L.map((c) => `<button type="button" class="incrow rfl-tgo" data-id="${esc(c.id)}"><span><b>${esc(refName(byOf(c)))}</b><br><span class="who">recommended ${esc(c.name || "")}</span></span><span>›</span></button>`).join("")}<button type="button" class="linkbtn" id="rfl-all">🤝 All referrals</button></div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".rfl-tgo").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.id);
          if (c) thank(c);
        }),
    );
    if ($("rfl-all")) $("rfl-all").onclick = open;
  }
  /* everyone who's sent work, most first */
  function open() {
    const by = {};
    (S.clients || []).forEach((c) => {
      const r = byOf(c);
      if (!r) return;
      const k = r.clientId || "n:" + refName(r).toLowerCase();
      (by[k] = by[k] || { r, L: [] }).L.push(c);
    });
    const rows = Object.values(by).sort((a, b) => b.L.length - a.L.length);
    openViewer(`<div class="rfl"><div class="vhead"><b>🤝 Referrals</b></div>
      <div class="who">Who's sent you work. Set "How they found you" to Recommendation on an enquiry and say who.</div>
      ${
        rows
          .map((x) => {
            const won = x.L.filter((c) => WON.includes(c.stage));
            const val = won.reduce((s, c) => s + (+c.quote || 0), 0);
            return `<div class="card rfl-row"><div class="rfl-h"><b>${esc(refName(x.r))}</b><span class="who">${x.L.length} sent · ${won.length} won${val ? " · " + gbp(val) : ""}</span></div>${x.L.map((c) => `<button type="button" class="incrow rfl-open" data-id="${esc(c.id)}"><span>${esc(c.name)}<br><span class="who">${esc([c.work, clStage(c.stage)].filter(Boolean).join(" · "))}</span></span><span>${c.refThanked ? "✓ thanked" : WON.includes(c.stage) ? "🤝 to thank" : ""}</span></button>`).join("")}</div>`;
          })
          .join("") || '<div class="nothing">No recommendations recorded yet.</div>'
      }</div>`);
    wireClient();
  }
  return {
    formHtml,
    formWire,
    formRead,
    clientHtml,
    wireClient,
    thank,
    todayCard,
    wireToday,
    open,
  };
})();
