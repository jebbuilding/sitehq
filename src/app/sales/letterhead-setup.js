/* ================= LETTERHEAD SETUP: one place in Setup to bring in the letterhead every PDF uses ================= */
import { $, esc, iso, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { loadPdfJs } from "../files/in-app-files.js";
import { loadImage, logoId } from "../photos/photos.js";
import { sdSet } from "./sales-calc.js";
import { sdHeadLines, sdImgData, sdPdf } from "./sales-pdf.js";
import { sdQuickLetterhead, sdSaveSet, sdSettings } from "./sales-settings.js";
export { lhCard, lhLogoId, lhPics, lhPutBot, lhPutTop, lhWire };
/* The letterhead is kept with the estimate and invoice settings (todos/salesset). Two ways in:
   - a PDF, photo or scan of the letterhead (the exact look): its top (logo, address, line) and bottom (line, foot
     lines) are found on the page and kept as two pictures, lhTop { id, h } and lhBot { id, y, h } (mm on A4), drawn
     where they were on the page – so it prints exactly like the original;
   - a Word letterhead (.docx): its header lines, foot line, VAT number and logo are read out (head, tagline, vatNo,
     logoId) and the PDFs lay them out themselves – close, but not the same fonts or spacing.
   The pictures win when there are both. Letters – estimates, invoices, payment receipts, wage sheets, CIS statements,
   supplier letters – print the letterhead; every other PDF (RAMS, inductions, sign-in books, day work…) puts its
   logo in the corner. */

/* the logo for PDFs: the letterhead's, else the company logo, else the original one */
const lhLogoId = () => sdSet().logoId || logoId();
const lhHasPics = () => !!(sdSet().lhTop && sdSet().lhTop.id);
/* the letterhead pictures ready for jsPDF, or null */
async function lhPics() {
  const s = sdSet();
  if (!s.lhTop || !s.lhTop.id) return null;
  const top = await sdImgData(s.lhTop.id);
  if (!top) return null;
  const bot = s.lhBot && s.lhBot.id ? await sdImgData(s.lhBot.id) : null;
  return {
    top: Object.assign(top, { h: +s.lhTop.h }),
    bot: bot ? Object.assign(bot, { y: +s.lhBot.y, h: +s.lhBot.h }) : null,
  };
}
/* the top of the letterhead on this page; `room` is how tall the PDF's own header is (mm) – a taller top is shrunk
   to fit. Returns where the letterhead ends (mm), or 0 if there is no picture. */
function lhPutTop(doc, pics, room) {
  if (!pics || !pics.top) return 0;
  const t = pics.top;
  const k = room && t.h > room ? room / t.h : 1;
  doc.addImage(t.u, t.f, 0, 0, 210 * k, t.h * k, "lhtop", "FAST");
  return t.h * k;
}
/* the bottom of the letterhead on this page. Returns where it starts (mm), or 0 if there is no picture. */
function lhPutBot(doc, pics) {
  if (!pics || !pics.bot) return 0;
  const b = pics.bot;
  doc.addImage(b.u, b.f, 0, b.y, 210, b.h, "lhbot", "FAST");
  return b.y;
}
/* ---------- a PDF, photo or scan of the letterhead → the top and bottom as pictures ---------- */
const LH_PX = 1654; /* A4 width at 200 dots an inch */
async function lhPageCanvas(file) {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name || "");
  const c = document.createElement("canvas");
  if (isPdf) {
    await loadPdfJs();
    const pdf = await window.pdfjsLib.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pg = await pdf.getPage(1);
    const vp0 = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: LH_PX / vp0.width });
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: x, viewport: vp }).promise;
  } else {
    const im = await loadImage(file);
    c.width = LH_PX;
    c.height = Math.round((im.naturalHeight / im.naturalWidth) * LH_PX);
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0, c.width, c.height);
  }
  return c;
}
/* rows with ink on them; the top block is everything from the top down to the first clear gap of 5 mm (the body
   of a letter, if the PDF has one, starts below that), the bottom block the same from the bottom up */
function lhFindBlocks(c) {
  const W = c.width,
    H = c.height;
  const d = c.getContext("2d").getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(H),
    wide = new Uint8Array(H);
  for (let y = 0; y < H; y++) {
    let n = 0;
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      if (d[i] + d[i + 1] + d[i + 2] < 690) n++;
    }
    ink[y] = n > 2 ? 1 : 0;
    /* a line across the page (more than half its width) */
    wide[y] = n > W / 4 ? 1 : 0;
  }
  const mm = H / 297;
  const gap = Math.round(5 * mm);
  const block = (from, step) => {
    let y = from;
    while (y >= 0 && y < H && !ink[y]) y += step;
    if (y < 0 || y >= H) return null;
    const start = y;
    let last = y,
      clear = 0;
    for (; y >= 0 && y < H; y += step) {
      if (ink[y]) {
        last = y;
        clear = 0;
      } else if (++clear >= gap) break;
    }
    return step > 0 ? [start, last] : [last, start];
  };
  /* a line across the page a little way under the top block (or over the bottom one) belongs to it */
  const reach = Math.round(15 * mm);
  const withRule = (b, step) => {
    if (!b) return b;
    const from = step > 0 ? b[1] + 1 : b[0] - 1;
    for (let y = from; Math.abs(y - from) <= reach && y >= 0 && y < H; y += step)
      if (wide[y]) {
        while (y + step >= 0 && y + step < H && ink[y + step]) y += step;
        return step > 0 ? [b[0], y] : [y, b[1]];
      }
    return b;
  };
  const top = withRule(block(0, 1), 1);
  const bot = withRule(block(H - 1, -1), -1);
  if (!top || top[1] > H * 0.45) return null;
  const pad = Math.round(2 * mm);
  return {
    mm,
    top: [0, Math.min(H, top[1] + pad)],
    bot: bot && bot[0] > H * 0.7 && bot[0] > top[1] ? [Math.max(0, bot[0] - pad), H] : null,
  };
}
async function lhCropUpload(c, y0, y1, name, x0, x1) {
  x0 = x0 || 0;
  x1 = x1 || c.width;
  const p = document.createElement("canvas");
  p.width = x1 - x0;
  p.height = y1 - y0;
  p.getContext("2d").drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  const blob = await new Promise((res) => p.toBlob(res, "image/png"));
  return (await uploadFile(blob, name)).id;
}
/* the logo in the top block: the first thing from the left (above the line under the letterhead), up to a clear
   gap of 5 mm across. [x0, y0, x1, y1] in pixels, or null when it isn't on the left half of the page. */
function lhFindLogo(c, topEnd, mm) {
  const W = c.width;
  const d = c.getContext("2d").getImageData(0, 0, W, topEnd).data;
  const dark = (x, y) => {
    const i = (y * W + x) * 4;
    return d[i] + d[i + 1] + d[i + 2] < 690;
  };
  /* rows that are a line across the page don't count */
  const rows = [];
  for (let y = 0; y < topEnd; y++) {
    let n = 0;
    for (let x = 0; x < W; x += 2) if (dark(x, y)) n++;
    if (n <= W / 4) rows.push(y);
  }
  const colInk = (x) => rows.some((y) => dark(x, y));
  let x = 0;
  while (x < W && !colInk(x)) x++;
  if (x >= W / 2) return null;
  const x0 = x,
    gap = Math.round(5 * mm);
  let last = x,
    clear = 0;
  for (; x < W; x++) {
    if (colInk(x)) {
      last = x;
      clear = 0;
    } else if (++clear >= gap) break;
  }
  const x1 = last + 1;
  if (x1 > W * 0.6 || x1 - x0 < 10 * mm) return null;
  let y0 = -1,
    y1 = -1;
  rows.forEach((y) => {
    for (let xx = x0; xx < x1; xx += 2)
      if (dark(xx, y)) {
        if (y0 < 0) y0 = y;
        y1 = y;
        break;
      }
  });
  if (y0 < 0 || y1 - y0 < 5 * mm) return null;
  const pad = Math.round(mm);
  return [
    Math.max(0, x0 - pad),
    Math.max(0, y0 - pad),
    Math.min(W, x1 + pad),
    Math.min(topEnd, y1 + 1 + pad),
  ];
}
async function lhFromPage(file) {
  toast("Reading " + (file.name || "your letterhead") + "…");
  try {
    const c = await lhPageCanvas(file);
    const b = lhFindBlocks(c);
    if (!b) {
      toast(
        "Couldn't find the top of a letterhead on that page. Use a PDF or picture of the whole page.",
      );
      return false;
    }
    const r = (v) => Math.round(v * 10) / 10;
    const lg = lhFindLogo(c, b.top[1], b.mm);
    const patch = {
      /* its logo becomes the logo on every other PDF */
      logoId: lg ? await lhCropUpload(c, lg[1], lg[3], "letterhead-logo.png", lg[0], lg[2]) : null,
      lhTop: {
        id: await lhCropUpload(c, b.top[0], b.top[1], "letterhead-top.png"),
        h: r(b.top[1] / b.mm),
      },
      lhBot: b.bot
        ? {
            id: await lhCropUpload(c, b.bot[0], b.bot[1], "letterhead-bottom.png"),
            y: r(b.bot[0] / b.mm),
            h: r((b.bot[1] - b.bot[0]) / b.mm),
          }
        : null,
    };
    if (!patch.logoId) delete patch.logoId;
    await sdSaveSet(patch);
    toast("Letterhead saved – it will print exactly like this");
    render();
    return true;
  } catch (e) {
    toast("Couldn't read that file. Use a PDF or a picture of your letterhead.");
    return false;
  }
}
/* any letterhead file: a Word file is read for its lines; a PDF or picture is kept as it looks */
async function lhBringIn(file) {
  if (/\.docx$/i.test(file.name || "")) {
    const ok = await sdQuickLetterhead(file);
    if (ok && lhHasPics()) await sdSaveSet({ lhTop: null, lhBot: null });
    if (ok) render();
    return ok;
  }
  return lhFromPage(file);
}
const LH_ACCEPT =
  ".pdf,application/pdf,.docx,image/png,image/jpeg,image/heic,image/heif,.heic,.heif";
function lhCard() {
  const s = sdSet();
  const pics = lhHasPics();
  const has = pics || !!(s.head || s.logoId);
  const lines = has && !pics ? sdHeadLines().filter((t) => t.trim()) : [];
  return `<div class="card lh-card"><div class="cardbody" style="border:0"><b>📄 My letterhead</b>
    <div class="who">Used on every PDF the app makes. Estimates, invoices, payment receipts, wage sheets, CIS statements and letters to suppliers are printed on it; forms such as RAMS, inductions and sign-in sheets carry its logo.</div>
    ${
      pics
        ? `<div class="lh-prev lh-pics" aria-label="Your letterhead"><img src="${esc(blobUrl(s.lhTop.id))}" alt="Top of your letterhead" class="lh-ptop">${s.lhBot && s.lhBot.id ? `<div class="lh-gap">…</div><img src="${esc(blobUrl(s.lhBot.id))}" alt="Bottom of your letterhead" class="lh-pbot">` : ""}</div><div class="who">✓ Kept exactly as your letterhead looks.</div>`
        : has
          ? `<div class="lh-prev" aria-label="Your letterhead"><div class="lh-top"><img src="${esc(blobUrl(lhLogoId()))}" alt="Logo" class="lh-logo"><div class="lh-lines">${lines.map((t) => `<div>${esc(t)}</div>`).join("")}</div></div><div class="lh-rule"></div><div class="lh-foot">${s.tagline ? `<div>${esc(s.tagline)}</div>` : ""}${s.vatNo ? `<div>VAT Number ${esc(s.vatNo)}</div>` : ""}</div></div>
      <div class="notice">This was read from a Word file, so the app lays it out itself: the words are right but the fonts and spacing won't match exactly. For an exact copy, bring in a <b>PDF</b> of your letterhead (in Word: File › Save As › PDF), or a photo or scan of it.</div>`
          : `<div class="notice warn">Not set up yet: estimates and invoices come out without your letterhead. Bring in a PDF of your letterhead (in Word: File › Save As › PDF) – or a photo or scan of it, or the Word file itself.</div>`
    }
    <div class="actions"><span class="btn ${pics ? "" : "primary "}sd-filebtn">📄 ${has ? "Bring in a new letterhead" : "Bring in my letterhead"}<input type="file" class="lh-file" accept="${LH_ACCEPT}" aria-label="Bring in my letterhead (PDF, picture or Word)"></span>${has ? `<button type="button" class="btn" id="lh-pdf">👁 See a sample page</button>` : ""}${has && !pics ? `<button type="button" class="btn" id="lh-edit">✎ Change the lines or logo</button>` : ""}</div>
  </div></div>`;
}
function lhWire() {
  const fi = document.querySelector(".lh-file");
  if (!fi) return;
  fi.onchange = async () => {
    const f = fi.files[0];
    fi.value = "";
    if (f) await lhBringIn(f);
  };
  if ($("lh-edit")) $("lh-edit").onclick = () => sdSettings();
  if ($("lh-pdf")) $("lh-pdf").onclick = lhSample;
}
/* a sample page on the letterhead, to check it */
async function lhSample() {
  const sample = {
    type: "invoice",
    number: "SAMPLE",
    date: iso(new Date()),
    client: "Sample customer",
    address: "1 Sample Street\nYour town",
    title: "A sample page to check your letterhead",
    lines: [{ d: "Sample work", a: 100, vc: "S20", k: "lab" }],
    payments: [],
  };
  toast("Making a sample page…");
  try {
    const blob = await sdPdf(sample);
    await S.dl.save({ filename: "Letterhead sample.pdf", data: blob });
  } catch (e) {
    toast("Couldn't make the sample. Check your connection.");
  }
}
