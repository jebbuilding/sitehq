/* ================= BEFORE & AFTER: pairs of photos from a job, side by side – a PDF for the client and their portal ================= */
import { ptOf, ptOnFor, ptSrc } from "./portal.js";
import { $, esc, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { blobUrl, uploadAnyFile, uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { allTeam } from "../owner/owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { siteLabel } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
import { dlgEsc } from "../survey/glass-colours.js";
export { BAF };
/* James (Nov 2026, "before and after photos"): on a client's job, 📸 Before & after. + Add a pair, then for each side
   choose one of the job's photos (newest first) or 📷 upload one, and give the pair a name (Kitchen, Back wall…).
   They show side by side. 📄 Make the PDF puts the pairs on the letterhead; 📤 Put it in their portal adds the PDF to
   the client's 📷 Photos. Kept on the client record (todos/{client}: beforeAfter [{ id, cap, before, after }] – asset
   ids; baSentAt). */
const BAF = (() => {
  const pairsOf = (c) => (c.beforeAfter || []).slice();
  const jobPhotos = (c) =>
    c.site
      ? allTeam("photos")
          .filter((p) => same(p.site, c.site) && p.assetId && !isSketch(p))
          .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0))
      : [];
  function statusTxt(c) {
    const n = pairsOf(c).filter((x) => x.before && x.after).length;
    return n ? String(n) : "";
  }
  async function save(c, patch) {
    await S.db.doc("todos/" + c.id).update(Object.assign({}, patch, { updated: Date.now() }));
    const i = (S.clients || []).findIndex((x) => x.id === c.id);
    if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], patch);
  }
  /* choose a photo: the job's photos, or upload one */
  function choose(c, title, done) {
    const L = jobPhotos(c);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "160";
    d.innerHTML = `<div class="dimbox baf-pick" role="dialog" aria-label="${esc(title)}"><b>${esc(title)}</b>
      <label class="btn baf-up">📷 Upload a photo<input type="file" accept="image/*" class="baf-file"></label>
      ${L.length ? `<div class="who">Or one from the job (newest first):</div><div class="baf-grid">${L.map((p) => `<button type="button" class="baf-ph" data-a="${esc(p.assetId)}"><img src="${blobUrl(p.assetId)}" alt="${esc(p.caption || "")}" loading="lazy"><span class="who">${esc(p.date ? shortDay(p.date) : "")}</span></button>`).join("")}</div>` : '<div class="who">No photos on this job yet – upload one.</div>'}
      <div class="dimbtns"><button type="button" class="btn baf-c">Cancel</button></div></div>`;
    document.body.appendChild(d);
    dlgEsc(d);
    d.querySelector(".baf-c").onclick = () => d.remove();
    d.querySelectorAll(".baf-ph").forEach(
      (b) =>
        (b.onclick = () => {
          d.remove();
          done(b.dataset.a);
        }),
    );
    const fi = d.querySelector(".baf-file");
    fi.onchange = async () => {
      const f = fi.files && fi.files[0];
      fi.value = "";
      if (!f) return;
      if (!S.assets) return toast(uploadErr({ code: "not_granted" }));
      toast("Saving the photo…");
      try {
        let b = f;
        try {
          b = await shrinkImage(f, 1600);
        } catch (x) {}
        const a = await uploadFile(b, "Before and after.jpg");
        d.remove();
        done(a.id);
      } catch (x) {
        toast(uploadErr(x));
      }
    };
  }
  function open(c0) {
    const c = JSON.parse(JSON.stringify((S.clients || []).find((x) => x.id === c0.id) || c0));
    let L = pairsOf(c);
    const read = () =>
      document.querySelectorAll(".baf-pair").forEach((el) => {
        const x = L.find((y) => y.id === el.dataset.id);
        if (x) x.cap = el.querySelector(".baf-cap").value.trim();
      });
    const slot = (x, side) =>
      `<button type="button" class="baf-slot" data-side="${side}" aria-label="Choose the ${side} photo">${x[side] ? `<img src="${blobUrl(x[side])}" alt="">` : `<span>＋ Choose</span>`}<b class="baf-lbl">${side === "before" ? "Before" : "After"}</b></button>`;
    const draw = () => {
      openSheet(
        `<h3 id="sheettitle">📸 Before &amp; after – ${esc(c.name || "")}</h3>
        <div class="who">Pairs of photos side by side. Tap a side to choose one of the job's photos or upload one.</div>
        <div class="baf-list">${L.map(
          (
            x,
          ) => `<div class="card baf-pair" data-id="${esc(x.id)}"><input class="baf-cap" maxlength="60" value="${esc(x.cap || "")}" placeholder="e.g. Kitchen" aria-label="Name of this pair">
          <div class="baf-two">${slot(x, "before")}${slot(x, "after")}</div>
          <button type="button" class="linkdanger baf-x">✕ Take this pair off</button></div>`,
        ).join("")}</div>
        <button type="button" class="btn" id="baf-add">+ Add a pair</button>
        ${L.some((x) => x.before && x.after) ? `<div class="actions"><button type="button" class="btn" id="baf-pdf">📄 Make the PDF</button>${ptOnFor(c) || ptOf(c) ? '<button type="button" class="btn primary" id="baf-send">📤 Put it in their portal</button>' : ""}</div>` : ""}
        ${c.baSentAt ? `<div class="who">Put in their portal ${esc(stamp(c.baSentAt))}.</div>` : ""}
        ${formFoot(false, "Save")}`,
        async () => {
          read();
          try {
            await save(c, { beforeAfter: L });
            closeForm();
            toast("Before & after saved");
          } catch (e) {
            showErr("Couldn't save. Try again.");
          }
        },
      );
      $("baf-add").onclick = () => {
        read();
        L.push({ id: newId(), cap: "", before: "", after: "" });
        draw();
      };
      document.querySelectorAll(".baf-pair").forEach((el) => {
        const x = L.find((y) => y.id === el.dataset.id);
        el.querySelectorAll(".baf-slot").forEach(
          (b) =>
            (b.onclick = () => {
              read();
              choose(
                c,
                b.dataset.side === "before" ? "The before photo" : "The after photo",
                (a) => {
                  x[b.dataset.side] = a;
                  draw();
                },
              );
            }),
        );
        el.querySelector(".baf-x").onclick = (e) => {
          const b = e.currentTarget;
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure? Tap again";
            return;
          }
          read();
          L = L.filter((y) => y.id !== x.id);
          draw();
        };
      });
      if ($("baf-pdf"))
        $("baf-pdf").onclick = async () => {
          read();
          toast("Making the PDF…");
          const out = await pdf(c, L);
          try {
            await S.dl.save({ filename: out.fn, data: out.blob });
          } catch (e) {}
        };
      if ($("baf-send"))
        $("baf-send").onclick = async () => {
          read();
          toast("Making the PDF…");
          try {
            const out = await pdf(c, L);
            const a = await uploadAnyFile(
              new File([out.blob], out.fn, { type: "application/pdf" }),
              out.fn,
            );
            await ptSrc(c).addDoc("baf-" + c.id, {
              title: "Before & after",
              fileName: out.fn,
              assetId: a.id,
              contentType: "application/pdf",
              folder: "photos",
              sharedAt: Date.now(),
            });
            try {
              await ptSrc(c).bump();
            } catch (e) {}
            c.baSentAt = Date.now();
            await save(c, { beforeAfter: L, baSentAt: c.baSentAt });
            toast("It's in " + (c.name || "their") + "'s portal");
            draw();
          } catch (e) {
            toast("Couldn't put it in their portal");
          }
        };
    };
    draw();
  }
  const toData = async (id) => {
    const b = await getFileBlob(id);
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(b);
    });
  };
  async function pdf(c, L) {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 16,
      CW = W - 2 * M;
    const RED = BRGB();
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[^\x20-\x7E£]/g, "");
    if (!LH.pics) {
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
    }
    let y = LH.top || 34;
    const bot = LH.pics ? LH.bot : 282;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...RED);
    doc.text("Before & after", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      clean(
        [c.name, c.site ? siteLabel(c.site) : c.address, coData().name].filter(Boolean).join(" · "),
      ),
      M,
      y,
    );
    y += 8;
    const pw = (CW - 6) / 2;
    for (const x of L.filter((p) => p.before && p.after)) {
      const imgs = [];
      for (const k of ["before", "after"]) {
        try {
          const u = await toData(x[k]);
          const pr = doc.getImageProperties(u);
          imgs.push({ u, h: Math.min(95, (pw * pr.height) / pr.width) });
        } catch (e) {
          imgs.push(null);
        }
      }
      const h = Math.max(...imgs.map((i) => (i ? i.h : 20)));
      if (y + h + 14 > bot) {
        doc.addPage();
        y = LH.top || 22;
      }
      if (x.cap) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 17, 17);
        doc.text(clean(x.cap), M, y);
        y += 5;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...RED);
      doc.text("BEFORE", M, y);
      doc.text("AFTER", M + pw + 6, y);
      y += 2;
      imgs.forEach((im, i) => {
        if (im) doc.addImage(im.u, "JPEG", M + i * (pw + 6), y, pw, im.h);
      });
      y += h + 8;
    }
    lhFinish(doc, LH);
    return {
      blob: doc.output("blob"),
      fn: `Before and after ${clean(c.name || "")}`.replace(/[^\w\s-]/g, "").trim() + ".pdf",
    };
  }
  return { open, statusTxt, pdf };
})();
