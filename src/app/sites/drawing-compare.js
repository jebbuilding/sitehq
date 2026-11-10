/* ================= DRAWING COMPARE: two versions of a drawing laid over each other – what's new in green, what's gone in red ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { sqDrawingUrl, sqDrawings } from "./snag-quick.js";
export { dcmOpen };
/* On a site's Plans & drawings, 🔍 Compare two drawings: pick the old and the new version (pictures or PDFs – the
   first page). They're drawn the same width and laid over each other: lines in both stay dark grey, lines only in the
   new one show green, lines only in the old one show red. A slider fades between the plain old and new drawings, and
   the changes can be saved as a picture to send. Nothing is changed or saved on the drawings themselves. */
const DCM_W = 1400;
async function dcmImage(dw) {
  const url = await sqDrawingUrl(dw);
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}
/* how dark each pixel is (0 white – 1 black) at a set width */
function dcmInk(im, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, w, h);
  x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const ink = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    ink[i] = 1 - (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  return { ink, c };
}
/* the changes picture: a line counts as in both if the other drawing has ink within a pixel or two */
function dcmDiff(A, B, w, h) {
  const near = (ink, i) => {
    const x = i % w,
      y = (i / w) | 0;
    let m = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx,
          yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) m = Math.max(m, ink[yy * w + xx]);
      }
    return m;
  };
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  const out = x.createImageData(w, h);
  let added = 0,
    gone = 0;
  for (let i = 0; i < w * h; i++) {
    const a = A[i],
      b = B[i];
    let r = 255,
      g = 255,
      bl = 255;
    if (a > 0.35 || b > 0.35) {
      if (b > 0.35 && near(A, i) < 0.25) {
        r = 20;
        g = 150;
        bl = 40;
        added++;
      } else if (a > 0.35 && near(B, i) < 0.25) {
        r = 210;
        g = 30;
        bl = 30;
        gone++;
      } else {
        const v = Math.round(255 - Math.max(a, b) * 200);
        r = g = bl = v;
      }
    }
    out.data[i * 4] = r;
    out.data[i * 4 + 1] = g;
    out.data[i * 4 + 2] = bl;
    out.data[i * 4 + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  return { c, added, gone };
}
function dcmOpen(site) {
  const dws = sqDrawings(site);
  if (dws.length < 2) {
    toast("Upload both versions of the drawing to Plans & drawings first");
    return;
  }
  openSheet(
    `<h3 id="sheettitle">🔍 Compare two drawings</h3>
    <label for="dcm-a">The old version<select id="dcm-a">${dws.map((d, i) => `<option value="${esc(d.k)}"${i === 1 ? " selected" : ""}>${esc(d.title)}</option>`).join("")}</select></label>
    <label for="dcm-b">The new version<select id="dcm-b">${dws.map((d, i) => `<option value="${esc(d.k)}"${i === 0 ? " selected" : ""}>${esc(d.title)}</option>`).join("")}</select></label>
    <div class="who">Works best with two versions of the same drawing at the same scale.</div>
    ${formFoot(false, "Compare")}`,
    async () => {
      const a = dws.find((d) => d.k === $("dcm-a").value),
        b = dws.find((d) => d.k === $("dcm-b").value);
      if (!a || !b || a.k === b.k) return showErr("Pick two different drawings");
      $("f-save").disabled = true;
      $("f-save").textContent = "Comparing…";
      try {
        const [ia, ib] = await Promise.all([dcmImage(a), dcmImage(b)]);
        const w = Math.min(DCM_W, Math.max(ia.naturalWidth, ib.naturalWidth));
        const h = Math.round(
          w * Math.max(ia.naturalHeight / ia.naturalWidth, ib.naturalHeight / ib.naturalWidth),
        );
        const A = dcmInk(ia, w, h),
          B = dcmInk(ib, w, h);
        const D = dcmDiff(A.ink, B.ink, w, h);
        closeForm();
        dcmShow(a, b, A.c, B.c, D);
      } catch (e) {
        $("f-save").disabled = false;
        $("f-save").textContent = "Compare";
        showErr("Couldn't open one of the drawings");
      }
    },
    "dcm-a",
  );
}
function dcmShow(a, b, ca, cb, D) {
  const u = (c) => c.toDataURL("image/png");
  const pc = (n) => (n / (D.c.width * D.c.height)) * 100;
  openViewer(`<div class="dcm"><div class="vhead"><b>🔍 ${esc(a.title)} → ${esc(b.title)}</b></div>
    <div class="who"><span class="dcm-key dcm-new"></span> New in ${esc(b.title)} · <span class="dcm-key dcm-gone"></span> Gone from ${esc(a.title)} · grey: the same in both${D.added + D.gone ? "" : " – no differences found"}</div>
    <div class="seg dcm-mode" id="dcm-mode"><button type="button" data-v="diff" aria-pressed="true">Changes</button><button type="button" data-v="fade" aria-pressed="false">Fade between</button></div>
    <div class="dcm-stage"><img id="dcm-diff" src="${u(D.c)}" alt="The changes"><div id="dcm-fade" hidden><img src="${u(ca)}" alt="${esc(a.title)}"><img id="dcm-top" src="${u(cb)}" alt="${esc(b.title)}" style="opacity:.5"></div></div>
    <label for="dcm-sl" id="dcm-sll" hidden>Old ◀ ▶ New<input id="dcm-sl" type="range" min="0" max="100" value="50"></label>
    <div class="actions"><button type="button" class="btn" id="dcm-save">⬇ Save the changes picture</button></div>
    <div class="who">${pc(D.added) < 0.01 && pc(D.gone) < 0.01 ? "" : `About ${pc(D.added).toFixed(2)}% of the page is new and ${pc(D.gone).toFixed(2)}% has gone.`}</div></div>`);
  $("dcm-mode")
    .querySelectorAll("button")
    .forEach(
      (btn) =>
        (btn.onclick = () => {
          $("dcm-mode")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
          const f = btn.dataset.v === "fade";
          $("dcm-diff").hidden = f;
          $("dcm-fade").hidden = !f;
          $("dcm-sll").hidden = !f;
        }),
    );
  $("dcm-sl").oninput = (e) => ($("dcm-top").style.opacity = String(+e.target.value / 100));
  $("dcm-save").onclick = async () => {
    const blob = await new Promise((r) => D.c.toBlob(r, "image/png"));
    try {
      await S.dl.save({
        filename: `Changes – ${a.title} to ${b.title}.png`.replace(/[\\/:*?"<>|]+/g, " "),
        data: blob,
      });
    } catch (e) {
      toast("Couldn't save the picture");
    }
  };
}
