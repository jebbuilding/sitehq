/* ================= LEAVERS ================= */
import { $, esc, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { nameOf } from "../owner/owner.js";
export { accessNotice, leaversBlock, openLeaver, wireLeavers };
function openLeaver(id) {
  const name = nameOf(id),
    sd = S.data.signoffs[id] || [],
    pd = sd.filter((x) => x.type === "persdoc"),
    ph = S.data.photos[id] || [];
  openSheet(
    `<h3 id="sheettitle">${esc(name)} has left</h3>
    <div class="who">Choose what to delete now. Work records the law says you must keep stay in the app.</div>
    <label class="inl lv"><input type="checkbox" id="lv-det" checked> Delete personal details and next of kin (their name is kept on old records)</label>
    <label class="inl lv"><input type="checkbox" id="lv-pd" ${pd.length ? "checked" : ""} ${pd.length ? "" : "disabled"}> Delete personal documents (${pd.length}: licence, passport and so on)</label>
    <label class="inl lv"><input type="checkbox" id="lv-ph"> Delete their site photos (${ph.length})</label>
    <div class="notice" style="margin:0"><b>Kept:</b> timesheets, pay and invoices (keep for 6 years), accident reports, checks, inductions, RAMS and training signatures (keep for at least 3 years).</div>
    <div class="notice warn" style="margin:0"><b>Last step, after this:</b> remove ${esc(name)} from this page's <b>Share</b> menu so they can't open the app any more.</div>
    ${formFoot(false, "Mark as left")}`,
    async () => {
      $("f-save").disabled = true;
      $("f-save").textContent = "Working…";
      try {
        if ($("lv-pd").checked)
          for (const x of pd) {
            await S.db.doc("sheets/" + id + "/signoffs/" + x.id).delete();
            (x.photos || []).forEach((a) => S.assets && S.assets.delete(a).catch(() => {}));
          }
        if ($("lv-ph").checked)
          for (const x of ph) {
            await S.db.doc("sheets/" + id + "/photos/" + x.id).delete();
            if (x.assetId && S.assets) S.assets.delete(x.assetId).catch(() => {});
          }
        const prof = Object.assign({}, S.team[id] || {}, { left: true, leftAt: Date.now() });
        if ($("lv-det").checked) {
          prof.details = {
            fullName: (prof.details && prof.details.fullName) || name,
            removedAt: Date.now(),
          };
        }
        prof.name = prof.name || name;
        await S.db.doc("sheets/" + id).set(prof);
        closeForm();
        toast(name + " marked as left");
        render();
        setTimeout(
          () =>
            openViewer(
              `<h3 style="font-family:var(--f-display);margin:0">One more step</h3><p>Now remove <b>${esc(name)}</b> from this page's <b>Share</b> menu (top right of the page in Claude) so they can no longer open the app.</p><p class="who">Their records are under "People who have left" in Employees if you need them.</p>`,
            ),
          300,
        );
      } catch (e) {
        showErr("Something didn't save. Check your connection and try again.");
        $("f-save").disabled = false;
        $("f-save").textContent = "Mark as left";
      }
    },
    null,
  );
}
function leaversBlock() {
  const ls = Object.keys(S.team)
    .filter((id) => id !== S.me && (S.team[id] || {}).left)
    .sort((a, b) => (S.team[b].leftAt || 0) - (S.team[a].leftAt || 0));
  if (!ls.length) return "";
  return `<details class="card" data-id="__leavers" ${S.open.has("__leavers") ? "open" : ""}><summary><div class="nm">People who have left<small>${ls.length} · their work records are kept</small></div></summary><div class="cardbody">
    ${ls
      .map((id) => {
        const t = S.team[id];
        const due =
          t.leftAt && Date.now() - t.leftAt > 80 * 864e5 && t.details && !t.details.removedAt;
        return `<div class="citem"><span><b>${esc(nameOf(id))}</b><br><span class="who">Left ${t.leftAt ? stamp(t.leftAt) : ""}${t.details && t.details.removedAt ? " · personal details deleted" : ""}</span>${due ? '<br><span class="sub" style="color:var(--danger)">Personal details should be deleted now (3 months since leaving)</span>' : ""}</span>
      <span style="display:flex;gap:6px;flex:none">${t.details && !t.details.removedAt ? `<button type="button" class="pillbtn lv-wipe" data-w="${esc(id)}">Delete details</button>` : ""}<button type="button" class="pillbtn lv-back" data-w="${esc(id)}">Bring back</button></span></div>`;
      })
      .join("")}</div></details>`;
}
function wireLeavers() {
  $("main")
    .querySelectorAll(".lv-back")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          const id = b.dataset.w;
          const p = Object.assign({}, S.team[id]);
          delete p.left;
          delete p.leftAt;
          try {
            await S.db.doc("sheets/" + id).set(p);
            toast(nameOf(id) + " is back on the team. Add them again in the Share menu if needed.");
          } catch (e) {
            toast("Couldn't save");
          }
        }),
    );
  $("main")
    .querySelectorAll(".lv-wipe")
    .forEach((b) => (b.onclick = () => openLeaver(b.dataset.w)));
}
function accessNotice() {
  return `<div class="notice"><b>Who can open the app.</b> Invite each trade by email as an <b>Editor</b> from the page's Share menu, and keep "Anyone with the link" turned off. When someone leaves, use <b>They've left</b> on their card below, then remove them in the Share menu straight away.</div>`;
}
