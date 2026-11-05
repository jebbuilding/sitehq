/* ================= PHOTO MULTI-SELECT + DOWNLOAD AS ZIP ================= */
import { iso, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl } from "../files/files.js";
import { loadZip } from "../owner/backup.js";
import { BIN_DAYS, binDelete } from "../owner/deleted-items.js";
import { photoDelete } from "../sites/tiles.js";
export { enhancePhotoGrids, initSelectZip };
const PS = { on: new Set(), sel: new Set() };
function enhancePhotoGrids(root) {
  if (!root) return;
  root.querySelectorAll(".phgrid").forEach((g, gi) => {
    const tiles = [...g.querySelectorAll(".ph[data-a]")];
    if (
      tiles.length < 2 ||
      (g.previousElementSibling && g.previousElementSibling.classList.contains("phsel"))
    )
      return;
    const key = (S.tab || "") + (S.otab || "") + gi;
    g.dataset.k = key;
    const on = PS.on.has(key);
    g.classList.toggle("selmode", on);
    tiles.forEach((t) => t.classList.toggle("picked", on && PS.sel.has(t.dataset.a)));
    const bar = document.createElement("div");
    bar.className = "phsel";
    g.before(bar);
    const draw = () => {
      const n = tiles.filter((t) => PS.sel.has(t.dataset.a)).length;
      const canDel = tiles.every((t) => t.dataset.p);
      bar.innerHTML = PS.on.has(key)
        ? `<b>${n} selected</b><button type="button" class="pillbtn ps-all">${n === tiles.length ? "Clear all" : "Select all " + tiles.length}</button><button type="button" class="btn primary ps-dl" ${n ? "" : "disabled"}>⬇ Download ${n || ""}</button>${canDel ? `<button type="button" class="btn delbtn ps-del" ${n ? "" : "disabled"}>🗑 Delete ${n || ""}</button>` : ""}<button type="button" class="pillbtn ps-x">Cancel</button>`
        : `<button type="button" class="pillbtn ps-on">☑ Select photos${canDel ? " to download or delete" : " to download"}</button>`;
      const q = (c) => bar.querySelector(c);
      if (q(".ps-on"))
        q(".ps-on").onclick = () => {
          PS.on.add(key);
          g.classList.add("selmode");
          draw();
        };
      if (q(".ps-x"))
        q(".ps-x").onclick = () => {
          PS.on.delete(key);
          tiles.forEach((t) => {
            PS.sel.delete(t.dataset.a);
            t.classList.remove("picked");
          });
          g.classList.remove("selmode");
          draw();
        };
      if (q(".ps-all"))
        q(".ps-all").onclick = () => {
          const all = n === tiles.length;
          tiles.forEach((t) => {
            if (all) {
              PS.sel.delete(t.dataset.a);
              t.classList.remove("picked");
            } else {
              PS.sel.add(t.dataset.a);
              t.classList.add("picked");
            }
          });
          draw();
        };
      if (q(".ps-dl"))
        q(".ps-dl").onclick = () =>
          downloadPhotos(
            tiles
              .filter((t) => PS.sel.has(t.dataset.a))
              .map((t) => ({ id: t.dataset.a, name: t.dataset.n })),
            q(".ps-dl"),
          );
      const del = q(".ps-del");
      if (del)
        del.onclick = async () => {
          const pick = tiles.filter((t) => PS.sel.has(t.dataset.a));
          if (!pick.length) return;
          if (del.dataset.armed !== "1") {
            del.dataset.armed = "1";
            del.textContent = `Tap again to delete ${pick.length}`;
            return;
          }
          del.disabled = true;
          let ok = 0;
          for (const t of pick) {
            try {
              if (ownerMode()) {
                if (
                  await binDelete({
                    assets: [t.dataset.a],
                    title: (t.dataset.n || "Photo").replace(/\.\w+$/, ""),
                    type: "image/jpeg",
                    thumb: t.dataset.a,
                  })
                )
                  ok++;
              } else {
                await photoDelete(t.dataset.p, t.dataset.w || S.me, t.dataset.a);
                ok++;
              }
              PS.sel.delete(t.dataset.a);
            } catch (e) {}
          }
          PS.on.delete(key);
          toast(
            `${ok} photo${ok === 1 ? "" : "s"} deleted` +
              (ownerMode() ? ` · in Setup › Deleted items for ${BIN_DAYS} days` : ""),
          );
          render();
        };
    };
    g._draw = draw;
    draw();
  });
}
async function downloadPhotos(items, btn) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  if (!items.length) return;
  const lab = btn.textContent;
  btn.disabled = true;
  try {
    if (items.length === 1) {
      const b = await (await fetch(blobUrl(items[0].id))).blob();
      await S.dl.save({ filename: items[0].name || "photo.jpg", data: b });
      return;
    }
    btn.textContent = "Getting ready…";
    await loadZip();
    const zip = new window.JSZip();
    const used = {};
    for (let i = 0; i < items.length; i++) {
      btn.textContent = `Adding ${i + 1} of ${items.length}…`;
      try {
        const b = await (await fetch(blobUrl(items[i].id))).blob();
        let n = (items[i].name || "photo.jpg").replace(/[\\/:*?"<>|]+/g, "-");
        if (used[n]) {
          const k = ++used[n];
          n = n.replace(/(\.\w+)?$/, ` (${k})$1`);
        } else used[n] = 1;
        zip.file(n, b);
      } catch (e) {}
    }
    btn.textContent = "Zipping…";
    const blob = await zip.generateAsync({ type: "blob" });
    await S.dl.save({
      filename: `JEB photos ${iso(new Date())} (${items.length}).zip`,
      data: blob,
    });
    toast(`${items.length} photos saved in one zip file`);
  } catch (e) {
    if (!(e && e.code === "declined"))
      toast(
        e && e.message === "load"
          ? "Couldn't load the zip tool. Check your connection."
          : "Download didn't go through",
      );
  } finally {
    btn.disabled = false;
    btn.textContent = lab;
  }
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initSelectZip() {
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target.closest && e.target.closest(".phgrid.selmode .ph[data-a]");
      if (!t) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const a = t.dataset.a;
      if (PS.sel.has(a)) PS.sel.delete(a);
      else PS.sel.add(a);
      t.classList.toggle("picked", PS.sel.has(a));
      const g = t.closest(".phgrid");
      if (g && g._draw) g._draw();
    },
    true,
  );
}
