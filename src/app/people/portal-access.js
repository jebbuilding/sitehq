/* ================= PORTAL ACCESS: Setup › 🏡 Client portal – which parts of the portal clients see, for everyone or one client ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { auditLog } from "../owner/deletion-record.js";
export { pvOn, pvView };
/* Kept in settings/app as portalAccess: { tabs: { key: false } (parts switched off for every client),
   clients: { uid: { key: true|false } } (where one client differs from everyone) }. Nothing set = clients see
   every part, as before. Home is always there. Each change is written to the deletion record (audit). Clients'
   apps read settings/app, so the portal follows it straight away. */
const PV_PARTS = [
  ["story", "📖 Job story", "price agreed, invoiced, paid, and the timeline"],
  ["photos", "📷 Photos", "progress photos you share"],
  ["docs", "📄 Documents", "drawings, certificates and paperwork you send"],
  ["draw", "✏️ Drawing", "they sketch ideas for you"],
  ["cal", "📅 Dates", "key dates and visits"],
  ["signs", "✍️ Sign-offs", "stages, variations and documents to sign"],
  ["choices", "🎨 Choices", "finishes to pick within an allowance"],
  ["chat", "💬 Messages", "chat with you and the trades you choose"],
  ["about", "🏢 About us & policies", "your company page and policies"],
];
const pvAccess = () => (S.settings || {}).portalAccess || {};
/* is this part of the portal on for this client (uid)? */
function pvOn(k, uid) {
  if (k === "home") return true;
  const a = pvAccess();
  const c = uid && (a.clients || {})[uid];
  if (c && c[k] != null) return !!c[k];
  return !((a.tabs || {})[k] === false);
}
const pvClients = () =>
  (S.clients || [])
    .filter((c) => c.portalUid && c.stage !== "lost")
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
function pvView(seg) {
  const cls = pvClients();
  const log = (S.audit || [])
    .filter((x) => x.action === "Portal access")
    .sort((x, y) => (y.seq || 0) - (x.seq || 0))
    .slice(0, 12);
  const cell = (k, who, on, label) =>
    `<td class="pa-c"><label class="pa-hit"><input type="checkbox" class="pv-on" data-k="${k}" data-w="${esc(who)}"${on ? " checked" : ""} aria-label="${esc(label)}"></label></td>`;
  $("main").innerHTML = `${seg}
    <div class="notice">Choose what your clients see in their portal. Each client only ever sees their own job; this decides which parts of it. 🏠 Home is always there.</div>
    <section class="card"><div class="cardbody"><b>What clients see</b>
      <div class="who">Tick under <b>Everyone</b> for all clients${cls.length ? ", or under one client to give them something different" : ""}.</div>
      <div class="tablewrap"><table class="pa-tbl"><thead><tr><th>Part of the portal</th><th class="pa-c">Everyone</th>${cls.map((c) => `<th class="pa-c">${esc(c.name || "Client")}</th>`).join("")}</tr></thead><tbody>${PV_PARTS.map(
        ([k, l, why]) =>
          `<tr><td>${esc(l)}<div class="who">${esc(why)}</div></td>${cell(k, "", pvOn(k, ""), l + " for everyone")}${cls.map((c) => cell(k, c.portalUid, pvOn(k, c.portalUid), l + " for " + (c.name || "the client"))).join("")}</tr>`,
      ).join("")}</tbody></table></div>
      ${cls.length ? "" : `<div class="who">No clients have joined their portal yet. Invite one from their client page.</div>`}
    </div></section>
    <div class="actions"><button type="button" class="btn primary" id="pv-save">Save what clients see</button></div>
    ${log.length ? `<section class="card"><div class="cardbody"><b>Changes</b>${log.map((x) => `<div class="drow"><span>${esc(x.details || x.title || "")}</span><span class="who">${esc(new Date(x.at || x.time || 0).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }))}</span></div>`).join("")}</div></section>` : ""}`;
  /* ticking Everyone carries across the clients who matched it */
  document.querySelectorAll('.pv-on[data-w=""]').forEach(
    (e) =>
      (e.onchange = () => {
        document
          .querySelectorAll(`.pv-on[data-k="${e.dataset.k}"]:not([data-w=""])`)
          .forEach((x) => {
            if (x.checked === !e.checked) x.checked = e.checked;
          });
      }),
  );
  $("pv-save").onclick = pvSave;
}
async function pvSave() {
  const tabs = {},
    clients = {};
  const lab = (k) => (PV_PARTS.find((x) => x[0] === k) || [k, k])[1].replace(/^\S+\s/, "");
  const said = [];
  PV_PARTS.forEach(([k]) => {
    const all = document.querySelector(`.pv-on[data-k="${k}"][data-w=""]`).checked;
    if (!all) tabs[k] = false;
    if (pvOn(k, "") !== all) said.push(`Everyone: ${all ? "+ " : "− "}${lab(k)}`);
    document.querySelectorAll(`.pv-on[data-k="${k}"]:not([data-w=""])`).forEach((x) => {
      const uid = x.dataset.w;
      if (x.checked !== all) (clients[uid] = clients[uid] || {})[k] = x.checked;
      if (pvOn(k, uid) !== x.checked) {
        const c = pvClients().find((y) => y.portalUid === uid);
        said.push(`${(c && c.name) || "A client"}: ${x.checked ? "+ " : "− "}${lab(k)}`);
      }
    });
  });
  try {
    const portalAccess = { tabs, clients, updated: Date.now() };
    await S.db.doc("settings/app").update({ portalAccess });
    S.settings = Object.assign({}, S.settings, { portalAccess });
    if (said.length) await auditLog("Portal access", "What clients see", said.join(" · "), null);
    toast(
      said.length ? "Saved: " + said.length + " change" + (said.length === 1 ? "" : "s") : "Saved",
    );
    render();
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
