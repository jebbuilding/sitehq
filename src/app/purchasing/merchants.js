/* ================= MERCHANTS: who sees what (merchants and suppliers/brochures), and copies of suppliers sent to the trades allowed to see them ================= */
import { $, esc, toast } from "../core/helpers.js";
import { TR } from "../core/live-feed.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openFile } from "../files/in-app-files.js";
import { noBin } from "../owner/deleted-items.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { makersAll } from "./makers.js";
import { scheduleSupSync, supMaster } from "./suppliers.js";
export { mkCopies, scheduleMkSync, syncMakers, tradeMakersHtml, whoSeesDlg, wireTradeMakers };
const mkAllowed = (r, id) =>
  r && (r.vis === "all" ? true : r.vis === "some" ? (r.people || []).includes(id) : false);
const mkCopies = (list) =>
  (list || [])
    .filter((x) => x.type === "makercopy")
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
let mkSyncing = false;
async function syncMakers() {
  if (!S.owner || mkSyncing || typeof makersAll !== "function") return;
  mkSyncing = true;
  try {
    const A = makersAll();
    for (const id of teamIds()) {
      if (TR.stamp[id] === undefined && !S.data.signoffs[id]) continue;
      const have = mkCopies(S.data.signoffs[id]);
      for (const M of Object.values(A)) {
        if (M.key === "other") continue;
        const r = M.rec || {};
        const c = have.find((x) => x.key === M.key);
        const br = (S.brochures || [])
          .filter((b) => b.maker === M.key)
          .map((b) => ({
            title: b.title,
            assetId: b.assetId,
            contentType: b.contentType || "",
            fileName: b.fileName || "",
          }));
        const stamp = (r.updated || 0) + "|" + br.map((b) => b.assetId).join(",");
        if (mkAllowed(r, id)) {
          if (!c || c.stamp !== stamp)
            await S.db
              .doc("sheets/" + id + "/signoffs/mkc-" + M.key)
              .set({
                type: "makercopy",
                key: M.key,
                name: M.m,
                cat: M.cat,
                phone: r.phone || "",
                email: r.email || "",
                website: r.website || "",
                address: r.address || "",
                contact: r.contact || "",
                contactPhone: r.contactPhone || "",
                accountNo: r.accountNo || "",
                via: r.via || "",
                notes: r.notes || "",
                links: M.l || [],
                brochures: br,
                stamp,
                updated: Date.now(),
              })
              .catch(() => {});
        } else if (c)
          await noBin(() =>
            S.db
              .doc("sheets/" + id + "/signoffs/" + c.id)
              .delete()
              .catch(() => {}),
          );
      }
      for (const c of have)
        if (!A[c.key])
          await noBin(() =>
            S.db
              .doc("sheets/" + id + "/signoffs/" + c.id)
              .delete()
              .catch(() => {}),
          );
    }
  } finally {
    mkSyncing = false;
  }
}
let mkSyncT = null;
function scheduleMkSync() {
  if (!S.owner) return;
  clearTimeout(mkSyncT);
  mkSyncT = setTimeout(syncMakers, 3000);
}
/* a trade's read-only view of the suppliers James shares */
function tradeMakersHtml() {
  const L = mkCopies(S.mine.signoffs);
  if (!L.length)
    return '<div class="nothing">James hasn\'t shared any suppliers with you yet.</div>';
  return L.map((r) => {
    const tel = String(r.phone || "").replace(/\s+/g, "");
    const web = r.website ? (/^https?:/.test(r.website) ? r.website : "https://" + r.website) : "";
    return `<details class="card supcard"><summary><div class="nm">${esc(r.name)}<small>${esc(r.cat || "")}</small></div>${(r.brochures || []).length ? `<div class="figs"><span class="tag ok">📖 ${r.brochures.length}</span></div>` : ""}</summary><div class="cardbody">
      <div class="actions">${tel ? `<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a>` : ""}${r.email ? `<a class="btn" href="mailto:${esc(r.email)}">✉ Email</a>` : ""}${web ? `<a class="btn" href="${esc(web)}" target="_blank" rel="noopener">Website ↗</a>` : ""}</div>
      <div class="details">${[
        ["Phone", r.phone],
        ["Email", r.email],
        ["Address", r.address],
        ["Rep / contact", [r.contact, r.contactPhone].filter(Boolean).join(" · ")],
        ["Account no.", r.accountNo],
        ["Bought through", r.via],
        ["Notes", r.notes],
      ]
        .filter((x) => x[1])
        .map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`)
        .join("")}</div>
      ${(r.brochures || []).length ? `<div class="flabel" style="margin-top:8px">📖 Brochures</div>${r.brochures.map((b) => `<button type="button" class="incrow tmk-open" data-a="${esc(b.assetId)}" data-n="${esc(b.fileName || b.title)}" data-t="${esc(b.contentType || "application/pdf")}"><span>📄 ${esc(b.title)}</span><span>›</span></button>`).join("")}` : ""}
      ${(r.links || []).map(([t, u]) => `<div class="dwsrow"><a href="${esc(u)}" target="_blank" rel="noopener">🌐 ${esc(t)}</a></div>`).join("")}</div></details>`;
  }).join("");
}
/* the brochure buttons in tradeMakersHtml open the file */
function wireTradeMakers(root) {
  (root || document)
    .querySelectorAll(".tmk-open")
    .forEach((b) => (b.onclick = () => openFile(b.dataset.a, b.dataset.n, b.dataset.t)));
}
/* one screen to choose who sees each merchant and supplier */
function whoSeesDlg(fk, fid) {
  const team = teamIds();
  const mers = supMaster();
  const A = makersAll();
  const mks = Object.values(A)
    .filter((M) => M.key !== "other")
    .sort((a, b) => a.m.localeCompare(b.m));
  const row = (
    kind,
    id,
    name,
    vis,
    people,
  ) => `<div class="wsrow2" data-kind="${kind}" data-id="${esc(id)}"><div class="wsr-h"><b>${esc(name)}</b><select class="wsr-v"><option value="all" ${vis === "all" ? "selected" : ""}>Everyone</option><option value="some" ${vis === "some" ? "selected" : ""}>Chosen trades</option><option value="me" ${vis !== "all" && vis !== "some" ? "selected" : ""}>Only me</option></select></div>
    <div class="wsr-p" ${vis === "some" ? "" : "hidden"}>${team.map((t) => `<label class="inl"><input type="checkbox" class="wsr-t" value="${esc(t)}" ${(people || []).includes(t) ? "checked" : ""}> ${esc(nameOf(t))}</label>`).join("") || '<span class="who">No trades yet.</span>'}</div></div>`;
  openSheet(
    `<h3 id="sheettitle">👥 Who sees what in Merchants</h3><div class="who">Choose who can see each merchant and supplier. Trades only ever get the ones you choose for them – account numbers and PINs included, so keep anything private on <b>Only me</b>.</div>
    <div class="actions"><button type="button" class="pillbtn wsa" data-v="all">Set all to Everyone</button><button type="button" class="pillbtn wsa" data-v="me">Set all to Only me</button>${team.length ? `<button type="button" class="pillbtn wsa" data-v="some">Set all to Chosen trades…</button>` : ""}</div>
    <div id="wsa-trades" hidden class="card" style="padding:8px"><div class="who">Tick the trades, then tap Apply to all.</div>${team.map((t) => `<label class="inl"><input type="checkbox" class="wsa-t" value="${esc(t)}"> ${esc(nameOf(t))}</label>`).join("")}<button type="button" class="btn" id="wsa-apply" style="margin-top:6px">Apply to all</button></div>
    <div class="flabel" style="margin-top:8px">🏪 Merchants (${mers.length})</div>${mers.map((sp) => row("sup", sp.id, sp.name + (sp.loc ? " · " + sp.loc : ""), sp.vis, sp.people)).join("") || '<div class="nothing">No merchants yet.</div>'}
    <div class="flabel" style="margin-top:10px">🏭 Suppliers &amp; brochures (${mks.length})</div>${mks.map((M) => row("mk", M.key, M.m, (M.rec || {}).vis || "me", (M.rec || {}).people)).join("")}
    ${formFoot(false, "Save")}`,
    async () => {
      $("f-save").disabled = true;
      $("f-save").textContent = "Saving…";
      let n = 0;
      try {
        for (const el of document.querySelectorAll(".wsrow2")) {
          const vis = el.querySelector(".wsr-v").value;
          const people =
            vis === "some" ? [...el.querySelectorAll(".wsr-t:checked")].map((x) => x.value) : [];
          if (el.dataset.kind === "sup") {
            const sp = mers.find((x) => x.id === el.dataset.id);
            if (!sp) continue;
            if (sp.vis === vis && JSON.stringify(sp.people || []) === JSON.stringify(people))
              continue;
            const now = Date.now();
            await S.db.doc("todos/" + sp.id).update({ vis, people, updated: now });
            Object.assign(sp, { vis, people, updated: now });
            n++;
          } else {
            const M = A[el.dataset.id];
            if (!M) continue;
            const r = M.rec || {};
            if (
              (r.vis || "me") === vis &&
              JSON.stringify(r.people || []) === JSON.stringify(people)
            )
              continue;
            const id = r.id || "mk-" + M.key.replace(/^mk-/, "");
            const d = Object.assign({ kind: "maker", key: M.key, name: M.m, cat: M.cat }, r, {
              vis,
              people,
              updated: Date.now(),
            });
            delete d.id;
            await S.db.doc("todos/" + id).set(d);
            S.makers = (S.makers || [])
              .filter((x) => x.key !== M.key)
              .concat([Object.assign({ id }, d)]);
            n++;
          }
        }
        closeForm();
        toast(n ? "Saved – trades will see the changes shortly" : "No changes");
        scheduleSupSync();
        scheduleMkSync();
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
        $("f-save").textContent = "Save";
      }
    },
  );
  const F = $("form");
  if (fk) {
    const el = F.querySelector(`.wsrow2[data-kind="${fk}"][data-id="${CSS.escape(fid)}"]`);
    if (el) {
      el.style.outline = "3px solid var(--accent)";
      setTimeout(() => el.scrollIntoView({ block: "center" }), 150);
    }
  }
  F.querySelectorAll(".wsr-v").forEach(
    (sel) =>
      (sel.onchange = () => {
        sel.closest(".wsrow2").querySelector(".wsr-p").hidden = sel.value !== "some";
      }),
  );
  F.querySelectorAll(".wsa").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.v === "some") {
          $("wsa-trades").hidden = false;
          return;
        }
        F.querySelectorAll(".wsr-v").forEach((sel) => {
          sel.value = b.dataset.v;
          sel.onchange();
        });
      }),
  );
  if ($("wsa-apply"))
    $("wsa-apply").onclick = () => {
      const ts = [...F.querySelectorAll(".wsa-t:checked")].map((x) => x.value);
      F.querySelectorAll(".wsrow2").forEach((el) => {
        el.querySelector(".wsr-v").value = "some";
        el.querySelector(".wsr-p").hidden = false;
        el.querySelectorAll(".wsr-t").forEach((c) => (c.checked = ts.includes(c.value)));
      });
      $("wsa-trades").hidden = true;
    };
}
