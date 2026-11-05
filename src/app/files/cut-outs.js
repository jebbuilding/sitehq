/* ================= CUT-OUTS: drag a box over part of any PDF page or photo and keep it, to put on a client go-ahead / sign-off sheet ================= */
import { ptAskSign } from "../clients/portal.js";
import { $, esc, toast } from "../core/helpers.js";
import { S, clActive, ownerMode } from "../core/state.js";
import { SIGNSHEET } from "../drawing/sign-off-sheet.js";
import { SK_CAT } from "../drawing/trade-drawings.js";
import { blobUrl, saveAsset, uploadErr, uploadFile } from "./files.js";
import { FV, closeFile, getFileBlob, loadPdfJs } from "./in-app-files.js";
import { newId } from "./outbox.js";
import { nameOf } from "../owner/owner.js";
import { avatarHtml, personPhoto } from "../people/profile-photos.js";
import { loadImage } from "../photos/photos.js";
import { shrinkImage } from "../safety/training.js";
import { same } from "../sites/project-pages.js";
export { CUT, personPhotoClear, personPhotoDlg, personPhotoSet };
const CUT = (() => {
  const clips = () => (S.clips || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  async function sourceCanvas(pageNo, X) {
    const cv = document.createElement("canvas");
    X = X || { pdf: FV.pdf, img: $("fv-img") };
    if (X.pdf) {
      const pg = await X.pdf.getPage(pageNo);
      const b = pg.getViewport({ scale: 1 });
      let sc = 2200 / Math.max(b.width, b.height);
      if (b.width * b.height * sc * sc > 9e6) sc = Math.sqrt(9e6 / (b.width * b.height));
      const vp = pg.getViewport({ scale: sc });
      cv.width = Math.floor(vp.width);
      cv.height = Math.floor(vp.height);
      const g = cv.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      return cv;
    }
    const im = X.img;
    if (!im) return null;
    const k = Math.min(1, 4000 / Math.max(im.naturalWidth, im.naturalHeight));
    cv.width = Math.round(im.naturalWidth * k);
    cv.height = Math.round(im.naturalHeight * k);
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(im, 0, 0, cv.width, cv.height);
    return cv;
  }
  function visiblePage() {
    if (!FV.pages || !FV.pages.length) return 1;
    const body = $("fv-body");
    const top = body.scrollTop + body.clientHeight * 0.3;
    let best = 1,
      bd = 1e12;
    FV.pages.forEach((p, i) => {
      const d = Math.abs(p.el.offsetTop - top);
      if (d < bd) {
        bd = d;
        best = i + 1;
      }
    });
    return best;
  }
  async function start() {
    if (!ownerMode()) return;
    if (!FV.pdf && !$("fv-img")) {
      toast("Open a PDF or photo first");
      return;
    }
    run({ pdf: FV.pdf, img: $("fv-img"), name: FV.name, page: visiblePage() });
  }
  /* cut from any file (a drawing, a site document, a PDF or photo from the device) without opening the viewer; cb gets the saved cut-out */
  async function startBlob(blob, name, type, cb) {
    if (!blob) {
      toast("Couldn't open that file");
      return;
    }
    const isPdf = /pdf/.test(type || blob.type || "") || /\.pdf$/i.test(name || "");
    const X = { name, cb, page: 1 };
    try {
      if (isPdf) {
        try {
          await loadPdfJs();
        } catch (e) {
          toast("The PDF reader needs signal the first time. Try again when you have signal.");
          return;
        }
        X.pdf = await window.pdfjsLib.getDocument({
          data: new Uint8Array(await blob.arrayBuffer()),
        }).promise;
      } else {
        X.img = await loadImage(blob);
      }
    } catch (e) {
      toast("Couldn't open that file");
      return;
    }
    run(X);
  }
  async function run(X) {
    const n = X.pdf ? X.pdf.numPages : 1;
    let page = X.page || 1;
    const d = document.createElement("div");
    d.className = "cutov";
    d.innerHTML = `<div class="cutbar"><button type="button" class="btn cut-x">Cancel</button><b class="cut-t">✂️ Drag a box round what you want</b>${n > 1 ? `<span class="cutpg"><button type="button" class="iconbtn cut-prev" aria-label="Previous page">‹</button><span class="cut-pn"></span><button type="button" class="iconbtn cut-next" aria-label="Next page">›</button></span>` : ""}<button type="button" class="btn primary cut-ok" disabled>✓ Use this</button></div><div class="cutwrap"><div class="cutstage"><canvas class="cutcv"></canvas><div class="cutbox" hidden></div></div><div class="who cutmsg">Getting the page ready…</div></div>`;
    document.body.appendChild(d);
    const cv = d.querySelector(".cutcv"),
      box = d.querySelector(".cutbox"),
      ok = d.querySelector(".cut-ok"),
      stage = d.querySelector(".cutstage");
    let src = null,
      sel = null,
      drag = null;
    const show = async () => {
      d.querySelector(".cutmsg").hidden = false;
      ok.disabled = true;
      box.hidden = true;
      sel = null;
      if (d.querySelector(".cut-pn"))
        d.querySelector(".cut-pn").textContent = `Page ${page} of ${n}`;
      try {
        src = await sourceCanvas(page, X);
      } catch (e) {
        src = null;
      }
      if (!src) {
        d.querySelector(".cutmsg").textContent = "Couldn't get that page ready.";
        return;
      }
      cv.width = src.width;
      cv.height = src.height;
      cv.getContext("2d").drawImage(src, 0, 0);
      d.querySelector(".cutmsg").hidden = true;
    };
    const pt = (e) => {
      const r = cv.getBoundingClientRect();
      return [
        Math.max(0, Math.min(r.width, e.clientX - r.left)),
        Math.max(0, Math.min(r.height, e.clientY - r.top)),
      ];
    };
    const drawBox = () => {
      if (!sel) {
        box.hidden = true;
        return;
      }
      const [x0, y0, x1, y1] = sel;
      box.hidden = false;
      box.style.left = Math.min(x0, x1) + "px";
      box.style.top = Math.min(y0, y1) + "px";
      box.style.width = Math.abs(x1 - x0) + "px";
      box.style.height = Math.abs(y1 - y0) + "px";
    };
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (x) {}
      const p = pt(e);
      drag = true;
      sel = [p[0], p[1], p[0], p[1]];
      drawBox();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      e.preventDefault();
      const p = pt(e);
      sel[2] = p[0];
      sel[3] = p[1];
      drawBox();
    });
    const end = () => {
      if (!drag) return;
      drag = false;
      if (sel && Math.abs(sel[2] - sel[0]) > 12 && Math.abs(sel[3] - sel[1]) > 12)
        ok.disabled = false;
      else {
        sel = null;
        drawBox();
      }
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    d.querySelector(".cut-x").onclick = () => {
      d.remove();
      if (X.cb && X.pdf && X.pdf !== FV.pdf) {
        try {
          X.pdf.destroy();
        } catch (e) {}
      }
    };
    if (d.querySelector(".cut-prev")) {
      d.querySelector(".cut-prev").onclick = () => {
        if (page > 1) {
          page--;
          show();
        }
      };
      d.querySelector(".cut-next").onclick = () => {
        if (page < n) {
          page++;
          show();
        }
      };
    }
    ok.onclick = async () => {
      if (!sel || !src) return;
      const r = cv.getBoundingClientRect(),
        k = src.width / r.width;
      const x = Math.min(sel[0], sel[2]) * k,
        y = Math.min(sel[1], sel[3]) * k,
        w = Math.abs(sel[2] - sel[0]) * k,
        h = Math.abs(sel[3] - sel[1]) * k;
      const out = document.createElement("canvas");
      out.width = Math.round(w);
      out.height = Math.round(h);
      const g = out.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, out.width, out.height);
      g.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
      ok.disabled = true;
      ok.textContent = "Saving…";
      const blob = await new Promise((res) => out.toBlob(res, "image/jpeg", 0.9));
      d.remove();
      if (X.cb && X.pdf && X.pdf !== FV.pdf) {
        try {
          X.pdf.destroy();
        } catch (e) {}
      }
      await saveClip(blob, X.name, page, !!X.pdf, X.cb);
    };
    show();
  }
  async function saveClip(blob, from, page, isPdf, cb) {
    if (!blob) return;
    const base = String(from || "Cut-out").replace(/\.[^.]+$/, "");
    const name = (base + (isPdf ? " p" + page : "") + " cut-out").slice(0, 80);
    try {
      const a = await uploadFile(blob, "cutout.jpg");
      const id = "clip-" + newId();
      const rec = {
        kind: "clip",
        assetId: a.id,
        name,
        from: from || "",
        page: page || 1,
        at: Date.now(),
      };
      await S.db.doc("todos/" + id).set(rec);
      S.clips = (S.clips || []).concat([Object.assign({ id }, rec)]);
      if (cb) {
        toast("Cut-out added");
        cb(Object.assign({ id }, rec));
      } else after(Object.assign({ id }, rec));
    } catch (e) {
      toast(uploadErr(e));
    }
  }
  function after(c) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "140";
    d.innerHTML = `<div class="dimbox"><b>✂️ Cut-out saved</b><img src="${blobUrl(c.assetId)}" alt="" style="max-height:200px;max-width:100%;object-fit:contain;border:1px solid var(--line);border-radius:8px;background:#fff;margin:6px auto;display:block"><input class="ct-name" maxlength="80" value="${esc(c.name)}" aria-label="Name">
    <div class="who">It's kept in your cut-outs. Tick it when you make a <b>client go-ahead</b> (from a drawing) or a <b>sign-off sheet</b> (Sign-offs tab) and it goes on the sheet.</div>
    <div class="actions" style="flex-direction:column;align-items:stretch"><button type="button" class="btn primary" data-a="so">✍️ Start a client sign-off with it now</button><button type="button" class="btn" data-a="more">✂️ Cut out another bit</button></div><div class="dimbtns"><button type="button" class="btn ct-x">Done</button></div></div>`;
    document.body.appendChild(d);
    const rename = async () => {
      const v = d.querySelector(".ct-name").value.trim();
      if (v && v !== c.name) {
        c.name = v;
        try {
          await S.db.doc("todos/" + c.id).update({ name: v });
        } catch (e) {}
        const i = (S.clips || []).findIndex((x) => x.id === c.id);
        if (i >= 0) S.clips[i].name = v;
      }
    };
    d.querySelector(".ct-x").onclick = async () => {
      await rename();
      d.remove();
    };
    d.querySelector("[data-a=more]").onclick = async () => {
      await rename();
      d.remove();
      start();
    };
    d.querySelector("[data-a=so]").onclick = async () => {
      await rename();
      const cl = (S.clients || [])
        .filter(clActive)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      d.querySelector(".dimbox").innerHTML =
        `<b>Which client?</b><select class="ct-cl"><option value="__manual">✏️ Type their details in (not in Clients)</option>${cl.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}${x.site ? " · " + esc(x.site) : ""}</option>`).join("")}</select><div class="dimbtns"><button type="button" class="btn ct-x2">Cancel</button><button type="button" class="btn primary ct-go">Next</button></div>`;
      d.querySelector(".ct-x2").onclick = () => d.remove();
      d.querySelector(".ct-go").onclick = () => {
        const v = d.querySelector(".ct-cl").value;
        const c2 = cl.find((x) => x.id === v);
        d.remove();
        try {
          closeFile();
        } catch (e) {}
        if (v === "__manual") {
          SIGNSHEET.openSolo({ manual: true, kind: "materials", clips: [c.id], title: c.name });
          return;
        }
        if (!c2) return;
        S.preClips = [c.id];
        ptAskSign(c2, null, "materials");
        setTimeout(() => {
          const t = $("pa-title");
          if (t && !t.value) t.value = c.name;
        }, 60);
      };
    };
  }
  /* inside a sign-off form: pick a drawing / site document / file from the device, cut the bit you want, and it's ticked straight away */
  function chooseAndCut(cb, ctx) {
    const sites = (ctx && ctx.sites) || null;
    const onSite = (n) => !sites || sites.some((x) => same(x, n || ""));
    const dws = (S.mine.photos || [])
      .filter((p) => p.assetId && (p.kind === "sketch" || p.category === SK_CAT) && onSite(p.site))
      .sort((a, b) => (b.takenAt || b.created || 0) - (a.takenAt || a.created || 0))
      .slice(0, 40);
    const docs = (S.docs || [])
      .filter(
        (d) =>
          d.assetId &&
          onSite(d.site) &&
          (/pdf|image/.test(d.contentType || "") ||
            /\.(pdf|jpe?g|png|webp)$/i.test(d.fileName || "")),
      )
      .sort((a, b) => (b.uploaded || 0) - (a.uploaded || 0))
      .slice(0, 60);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "134";
    d.innerHTML = `<div class="dimbox" style="width:min(560px,100%);max-height:88vh;overflow:auto"><b>✂️ Cut a bit out of…</b>${sites ? `<div class="who">${sites.length ? "Drawings and documents for " + esc(sites.join(", ")) + "." : "Choose the client first to see the drawings and documents for their site."}</div>` : ""}
    <label class="btn primary" style="position:relative;overflow:hidden;margin:8px 0;display:block;text-align:center">📱 A PDF or photo on this device<input type="file" class="cc-file" accept="application/pdf,image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
    ${dws.length ? `<div class="flabel">✏️ Drawings</div>${dws.map((p) => `<div style="display:flex;gap:6px;align-items:center"><button type="button" class="incrow cc-pick" style="flex:1" data-k="dw" data-id="${esc(p.id)}"><span><b>${esc(p.title || "Drawing")}</b><br><span class="who">${esc(p.site || "")}</span></span><span>›</span></button><button type="button" class="pillbtn cc-dl" data-a="${esc(p.assetId)}" data-n="${esc((p.title || "Drawing") + ".jpg")}" aria-label="Download">⬇</button></div>`).join("")}` : ""}
    ${docs.length ? `<div class="flabel">📁 Site documents</div>${docs.map((x) => `<div style="display:flex;gap:6px;align-items:center"><button type="button" class="incrow cc-pick" style="flex:1" data-k="doc" data-id="${esc(x.id)}"><span><b>${esc(x.title || x.fileName)}</b><br><span class="who">${esc(x.site || "")}${/pdf/.test(x.contentType || "") || /\.pdf$/i.test(x.fileName || "") ? " · PDF" : ""}</span></span><span>›</span></button><button type="button" class="pillbtn cc-dl" data-a="${esc(x.assetId)}" data-n="${esc(x.fileName || x.title || "Document")}" aria-label="Download">⬇</button></div>`).join("")}` : ""}
    <div class="dimbtns"><button type="button" class="btn cc-x">Cancel</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".cc-x").onclick = () => d.remove();
    d.querySelector(".cc-file").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      d.remove();
      startBlob(f, f.name, f.type, cb);
    };
    d.querySelectorAll(".cc-dl").forEach(
      (b) => (b.onclick = () => saveAsset(b.dataset.a, b.dataset.n)),
    );
    d.querySelectorAll(".cc-pick").forEach(
      (b) =>
        (b.onclick = async () => {
          const it =
            b.dataset.k === "dw"
              ? dws.find((x) => x.id === b.dataset.id)
              : docs.find((x) => x.id === b.dataset.id);
          if (!it) return;
          b.disabled = true;
          toast("Opening…");
          try {
            const bl = await getFileBlob(it.assetId);
            d.remove();
            startBlob(
              bl,
              b.dataset.k === "dw" ? it.title || "Drawing" : it.fileName || it.title,
              b.dataset.k === "dw" ? bl.type || "image/jpeg" : it.contentType || bl.type,
              cb,
            );
          } catch (e) {
            b.disabled = false;
            toast("Couldn't open it. Check your connection.");
          }
        }),
    );
  }
  /* the cut-out picker plus a "cut a bit out" button, kept in a box so a new cut-out appears ticked */
  function pickerBox(cls, pre) {
    return `<div class="cutpick" data-cls="${esc(cls)}">${pickerHtml(cls, pre, () => false)}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center"><label class="btn" style="position:relative;overflow:hidden">📷 Take photo<input type="file" class="cutpick-phin" data-cls="${esc(cls)}" data-cam="1" accept="image/*" capture="environment" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Take a photo"></label><label class="btn" style="position:relative;overflow:hidden">🖼 Choose photos<input type="file" class="cutpick-phin" data-cls="${esc(cls)}" data-cam="1" accept="image/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Choose photos"></label><button type="button" class="btn cutpick-add" data-cls="${esc(cls)}">✂️ Cut a bit from a PDF or drawing</button></div>`;
  }
  function wireBox(root, ctxFn) {
    root = root || document;
    const ctx = () => (ctxFn ? ctxFn() : null) || {};
    /* only this client's cut-outs and photos (plus anything added in this form) – nothing from other jobs */
    const rer = (box, cls, on) => {
      const own = box._own || (box._own = new Set());
      const cid = ctx().client;
      box.innerHTML = pickerHtml(cls, on, (c) => (cid && c.client === cid) || own.has(c.id));
      wirePicker(box);
    };
    const tag = async (id) => {
      const cid = ctx().client;
      if (!cid) return;
      try {
        await S.db.doc("todos/" + id).update({ client: cid });
        const x = (S.clips || []).find((y) => y.id === id);
        if (x) x.client = cid;
      } catch (e) {}
    };
    root.querySelectorAll(".cutpick").forEach((box) =>
      rer(
        box,
        box.dataset.cls,
        [...box.querySelectorAll("input:checked")].map((x) => x.value),
      ),
    );
    root.querySelectorAll("select").forEach((sel) => {
      if (/-cl$/.test(sel.id))
        sel.addEventListener("change", () =>
          root.querySelectorAll(".cutpick").forEach((box) =>
            rer(
              box,
              box.dataset.cls,
              [...box.querySelectorAll("input:checked")].map((x) => x.value),
            ),
          ),
        );
    });
    root.querySelectorAll(".cutpick-add").forEach(
      (b) =>
        (b.onclick = () => {
          const cls = b.dataset.cls;
          const box = root.querySelector(`.cutpick[data-cls="${cls}"]`);
          chooseAndCut(
            async (c) => {
              (box._own || (box._own = new Set())).add(c.id);
              await tag(c.id);
              const on = [...box.querySelectorAll("." + cls + ":checked")]
                .map((x) => x.value)
                .concat([c.id]);
              rer(box, cls, on);
            },
            ctxFn ? ctxFn() : null,
          );
        }),
    );
    root.querySelectorAll(".cutpick-phin").forEach(
      (inp) =>
        (inp.onchange = async () => {
          const cls = inp.dataset.cls;
          const box = root.querySelector(`.cutpick[data-cls="${cls}"]`);
          const msg = null;
          const files = [...inp.files];
          inp.value = "";
          if (!files.length) return;
          const added = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            toast(`Adding photo ${i + 1} of ${files.length}…`);
            try {
              const b = await shrinkImage(f, 2000);
              const a = await uploadFile(b, f.name || "photo.jpg");
              const id = "clip-" + newId();
              const nm = (
                /^image\.|^IMG_|^\d/i.test(f.name || "") || !f.name
                  ? "Photo " +
                    new Date().toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : f.name.replace(/\.[^.]+$/, "")
              ).slice(0, 80);
              const rec = {
                kind: "clip",
                assetId: a.id,
                name: nm,
                from: "photo",
                page: 1,
                at: Date.now() + i,
              };
              if (ctx().client) rec.client = ctx().client;
              await S.db.doc("todos/" + id).set(rec);
              S.clips = (S.clips || []).concat([Object.assign({ id }, rec)]);
              added.push(id);
              (box._own || (box._own = new Set())).add(id);
            } catch (e) {
              toast(uploadErr(e));
            }
          }
          if (added.length)
            toast(added.length + " photo" + (added.length === 1 ? "" : "s") + " added");
          const on = [...box.querySelectorAll("." + cls + ":checked")]
            .map((x) => x.value)
            .concat(added);
          rer(box, cls, on);
        }),
    );
  }
  /* tick-list of saved cut-outs, used on both sheets */
  function pickerHtml(cls, pre, keep) {
    const all = clips();
    const L = all.filter((c) => !keep || keep(c) || (pre || []).includes(c.id));
    const loose = keep ? all.filter((c) => !c.client && !L.includes(c)) : [];
    if (!L.length && !loose.length) return "";
    const tile = (c) =>
      `<label class="clipt"><input type="checkbox" class="${cls}" value="${esc(c.id)}" ${(pre || []).includes(c.id) ? "checked" : ""}><img src="${blobUrl(c.assetId)}" alt=""><span>${esc(c.name)}</span><button type="button" class="clipdel" data-id="${esc(c.id)}" aria-label="Delete cut-out">✕</button><button type="button" class="clipdl" data-a="${esc(c.assetId)}" data-n="${esc(c.name)}.jpg" aria-label="Download">⬇</button></label>`;
    return (
      (L.length ? `<div class="clipgrid">${L.map(tile).join("")}</div>` : "") +
      (loose.length
        ? `<details class="pmdet"><summary>Other cut-outs, not linked to a client (${loose.length})</summary><div class="clipgrid">${loose.map(tile).join("")}</div></details>`
        : "")
    );
  }
  function wirePicker(root, rerender) {
    (root || document).querySelectorAll(".clipdl").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          saveAsset(b.dataset.a, b.dataset.n);
        }),
    );
    (root || document).querySelectorAll(".clipdel").forEach(
      (b) =>
        (b.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Delete?";
            return;
          }
          try {
            await S.db.doc("todos/" + b.dataset.id).delete();
            S.clips = (S.clips || []).filter((x) => x.id !== b.dataset.id);
            b.closest(".clipt").remove();
          } catch (x) {
            toast("Couldn't delete");
          }
        }),
    );
  }
  return { start, startBlob, chooseAndCut, clips, pickerHtml, wirePicker, pickerBox, wireBox };
})();

/* change someone's photo (owner): used on the People list and on their page */
async function personPhotoSet(id, f) {
  if (!f) return;
  if (!S.assets) {
    toast(uploadErr({ code: "not_granted" }));
    return;
  }
  let b = null;
  try {
    const im = await loadImage(f);
    const sz = Math.min(im.naturalWidth, im.naturalHeight);
    const cv = document.createElement("canvas");
    cv.width = cv.height = Math.min(600, sz);
    cv.getContext("2d").drawImage(
      im,
      (im.naturalWidth - sz) / 2,
      (im.naturalHeight - sz) / 2,
      sz,
      sz,
      0,
      0,
      cv.width,
      cv.height,
    );
    b = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.88));
  } catch (x) {}
  if (!b) {
    toast("That photo couldn't be opened. On iPhone set Camera › Formats to Most Compatible.");
    return false;
  }
  toast("Saving the photo…");
  try {
    const a = await uploadFile(b, "person.jpg");
    {
      const cur = Object.assign({}, S.team[id] || {});
      delete cur.id;
      await S.db.doc("sheets/" + id).set(Object.assign(cur, { photo: a.id, updated: Date.now() }));
    }
    S.team[id] = Object.assign({}, S.team[id] || {}, { photo: a.id });
    if (id === S.me) S.myProfile = Object.assign({}, S.myProfile || {}, { photo: a.id });
    toast("Photo saved");
    return true;
  } catch (x) {
    toast(uploadErr(x));
    return false;
  }
}
/* one dialog for a person's photo: take / choose a new one, or remove it (works on iPad – the picker isn't inside a tappable row) */
function personPhotoDlg(id, after) {
  const has = !!personPhoto(id);
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "140";
  d.innerHTML = `<div class="dimbox" style="text-align:center"><b>${esc(nameOf(id))}'s photo</b><div style="margin:10px auto;display:flex;justify-content:center">${avatarHtml(id, 96)}</div>
    <div class="actions" style="flex-direction:column;align-items:stretch"><label class="btn primary" style="position:relative;overflow:hidden">📷 ${has ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" class="ppd-in" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer" aria-label="Take or choose a photo"></label>
    ${has ? `<button type="button" class="btn danger ppd-rm">🗑 Remove photo</button>` : ""}</div><div class="dimbtns"><button type="button" class="btn ppd-x">Cancel</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector(".ppd-x").onclick = () => d.remove();
  d.onclick = (e) => {
    if (e.target === d) d.remove();
  };
  d.querySelector(".ppd-in").onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    d.remove();
    if ((await personPhotoSet(id, f)) && after) after();
  };
  const rm = d.querySelector(".ppd-rm");
  if (rm)
    rm.onclick = async () => {
      if (rm.dataset.armed !== "1") {
        rm.dataset.armed = "1";
        rm.textContent = "Tap again to remove";
        return;
      }
      rm.disabled = true;
      if (await personPhotoClear(id)) {
        d.remove();
        if (after) after();
      } else rm.disabled = false;
    };
}
async function personPhotoClear(id) {
  try {
    const cur = Object.assign({}, S.team[id] || {});
    delete cur.id;
    delete cur.photo;
    await S.db.doc("sheets/" + id).set(Object.assign(cur, { updated: Date.now() }));
    S.team[id] = Object.assign({}, S.team[id] || {});
    delete S.team[id].photo;
    if (id === S.me && S.myProfile) {
      S.myProfile = Object.assign({}, S.myProfile);
      delete S.myProfile.photo;
    }
    toast("Photo removed");
    return true;
  } catch (x) {
    toast("Couldn't remove it. Check your connection.");
    return false;
  }
}
