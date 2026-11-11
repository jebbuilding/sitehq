/* ================= PHOTOS ================= */
import { ptExitPreview } from "../clients/portal-calendar.js";
import { PT } from "../clients/portal.js";
import { lastOf, pickField, pickVal } from "../core/fields.js";
import { $, esc, iso, monday, pad, stamp, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S, inWeek, ownerMode, siteNames } from "../core/state.js";
import { empTabs, render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import {
  isSketch,
  newDrawing,
  skState,
  sketchStrip,
  sketchViewer,
} from "../drawing/trade-drawings.js";
import { blobUrl, saveAsset, uploadErr } from "../files/files.js";
import { closeFile, getFileBlob } from "../files/in-app-files.js";
import { newId, sphotoPut, sphotoWanted, submitJob } from "../files/outbox.js";
import { binFromViewer } from "../owner/deleted-items.js";
import { nameOf } from "../owner/owner.js";
import { markPrompt, myOpenPrompts } from "../people/reminders.js";
import { markupBlock, markupSend } from "./mark-up.js";
import { lhLogoId } from "../sales/letterhead-setup.js";
import { hereNow } from "../sites/maps-pins.js";
import { same } from "../sites/project-pages.js";
import { photoDelete } from "../sites/tiles.js";
import { loadSitePhotos } from "../sites/trade-sites.js";
export {
  BRAND_COLS,
  BRAND_DEF,
  BRGB,
  LOGO_ID,
  VID_MAX,
  applyBrand,
  applyColour,
  audExt,
  audTag,
  brandHex,
  empPhotos,
  exifDate,
  feedNear,
  isAud,
  isVid,
  loadImage,
  logoId,
  myTrade,
  openAddFolder,
  openEditFolders,
  openPhoto,
  pdfLogo,
  photoTile,
  photoViewer,
  readExif,
  siteFolders,
  siteRec,
  stampPhoto,
  vidExt,
  vidTag,
  wireVoice,
};
function readExif(buf) {
  const v = new DataView(buf);
  const out = {};
  try {
    if (v.getUint16(0) !== 0xffd8) return out;
    let o = 2;
    while (o < v.byteLength - 4) {
      const m = v.getUint16(o);
      const len = v.getUint16(o + 2);
      if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) {
        const t = o + 10,
          le = v.getUint16(t) === 0x4949;
        const u16 = (p) => v.getUint16(t + p, le),
          u32 = (p) => v.getUint32(t + p, le);
        const ifd = (off) => {
          const n = u16(off),
            r = {};
          for (let i = 0; i < n; i++) {
            const e = off + 2 + i * 12;
            r[u16(e)] = { type: u16(e + 2), count: u32(e + 4), vo: e + 8 };
          }
          return r;
        };
        const rat = (p, i) => {
          const a = u32(p + i * 8),
            b = u32(p + i * 8 + 4);
          return b ? a / b : 0;
        };
        const asc = (en) => {
          const p = en.count <= 4 ? en.vo : u32(en.vo);
          let s = "";
          for (let i = 0; i < en.count - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i));
          return s;
        };
        const i0 = ifd(u32(4));
        if (i0[0x8769]) {
          const ex = ifd(u32(i0[0x8769].vo));
          if (ex[0x9003]) out.date = asc(ex[0x9003]);
        }
        if (!out.date && i0[0x0132]) out.date = asc(i0[0x0132]);
        if (i0[0x8825]) {
          const g = ifd(u32(i0[0x8825].vo));
          if (g[2] && g[4]) {
            const la = u32(g[2].vo),
              lo = u32(g[4].vo);
            let lat = rat(la, 0) + rat(la, 1) / 60 + rat(la, 2) / 3600,
              lon = rat(lo, 0) + rat(lo, 1) / 60 + rat(lo, 2) / 3600;
            if (g[1] && asc(g[1]) === "S") lat = -lat;
            if (g[3] && asc(g[3]) === "W") lon = -lon;
            if (lat || lon) {
              out.lat = Math.round(lat * 1e7) / 1e7;
              out.lon = Math.round(lon * 1e7) / 1e7;
            }
          }
          if (g[6]) {
            let alt = rat(u32(g[6].vo), 0);
            if (g[5] && v.getUint8(t + g[5].vo) === 1) alt = -alt;
            if (isFinite(alt)) out.alt = Math.round(alt * 100) / 100;
          }
        }
        return out;
      }
      if ((m & 0xff00) !== 0xff00) break;
      o += 2 + len;
    }
  } catch (e) {}
  return out;
}
const fmtCoord = (lat, lon) => `Lat ${(+lat).toFixed(7)}, Long ${(+lon).toFixed(7)}`;
const mapLink = (lat, lon) => `https://www.google.com/maps?q=${lat},${lon}`;
function exifDate(s) {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime() : null;
}
const stampTime = (t) => {
  const d = new Date(t);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
function loadImage(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("decode"));
    i.src = u;
  });
}
const LOGO_ID = "f4e7a0ecb7e0c19e43bdcc16b3a5cbc0";
let logoImgP = null,
  logoImgK = null;
const APP_NAME = "SiteHQ";
function logoId() {
  return ((S.settings || {}).company || {}).logoId || LOGO_ID;
}
function logoImage() {
  const id = logoId();
  if (!logoImgP || logoImgK !== id) {
    logoImgK = id;
    logoImgP = getFileBlob(id)
      .then(loadImage)
      .catch(() => {
        logoImgP = null;
        return null;
      });
  }
  return logoImgP;
}
/* draws the company logo into a jsPDF doc, fitted inside a box whose top-right corner is (right,top) */
async function pdfLogo(doc, right, top, maxW, maxH) {
  try {
    const b = await getFileBlob(lhLogoId());
    const u = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
    if (!u) return;
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = u;
    });
    const k = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
    const w = im.naturalWidth * k,
      h = im.naturalHeight * k;
    doc.addImage(
      u,
      /^data:image\/jpe?g/.test(u) ? "JPEG" : "PNG",
      right - w,
      top + (maxH - h) / 2,
      w,
      h,
    );
  } catch (e) {}
}
const BRAND_DEF = "#7F191D";
const BRAND_COLS = [
  ["#7F191D", "Red (JEB)"],
  ["#1F3A68", "Navy"],
  ["#1D5E3A", "Green"],
  ["#2F3438", "Charcoal"],
  ["#B4501A", "Orange"],
  ["#5A2A7A", "Purple"],
  ["#135F63", "Teal"],
];
function brandHex() {
  const c = ((S.settings || {}).company || {}).brandColor;
  return /^#[0-9a-f]{6}$/i.test(c || "") ? c : BRAND_DEF;
}
function BRGB() {
  const h = brandHex();
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mixHex(h, t, k) {
  const a = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)),
    b = [1, 3, 5].map((i) => parseInt(t.slice(i, i + 2), 16));
  return (
    "#" +
    a
      .map((v, i) =>
        Math.round(v + (b[i] - v) * k)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function applyColour(hex) {
  hex = hex || brandHex();
  const r = document.documentElement.style;
  const dark =
    document.documentElement.dataset.theme === "dark" ||
    (document.documentElement.dataset.theme !== "light" &&
      window.matchMedia &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  if (hex.toUpperCase() === BRAND_DEF) {
    ["--brand", "--accent", "--folder"].forEach((v) => r.removeProperty(v));
    return;
  }
  r.setProperty("--brand", hex);
  r.setProperty("--accent", dark ? mixHex(hex, "#ffffff", 0.45) : hex);
  r.setProperty("--folder", mixHex(hex, "#ffffff", dark ? 0.35 : 0.2));
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", hex);
}
/* tap the logo / SiteHQ name: close whatever is open and go back to the start, like opening the app fresh */
function goHome() {
  try {
    closeFile();
  } catch (e) {}
  try {
    closeViewer();
  } catch (e) {}
  try {
    closeForm();
  } catch (e) {}
  document.querySelectorAll(".dimask,.cutov,#wsx-root").forEach((x) => {
    try {
      x.remove();
    } catch (e) {}
  });
  document.body.style.overflow = "";
  if (S.client && S.owner) {
    try {
      ptExitPreview();
    } catch (e) {}
  }
  if (S.preview) {
    S.preview = false;
  }
  if (ownerMode() || S.owner) {
    S.otab = "time";
    store.set("jeb.otab", "time");
  } else {
    S.tab = empTabs()[0][0];
    store.set("jeb.tab", S.tab);
  }
  if (S.client && !S.owner) {
    PT.tab = "home";
    PT.folder = "";
  }
  render();
  window.scrollTo(0, 0);
}
function wireHome() {
  const r = document.querySelector(".brandrow");
  if (!r || r.dataset.home) return;
  r.dataset.home = "1";
  r.style.cursor = "pointer";
  r.setAttribute("role", "button");
  r.setAttribute("tabindex", "0");
  r.setAttribute("aria-label", "Back to the start");
  r.onclick = goHome;
  r.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goHome();
    }
  };
}
function applyBrand() {
  try {
    wireHome();
  } catch (e) {}
  applyColour();
  const id = logoId();
  const im = document.getElementById("hlogo");
  if (im && im.getAttribute("src") !== blobUrl(id)) im.setAttribute("src", blobUrl(id));
  const nm = ((S.settings || {}).company || {}).name || "JEB Building Services";
  if (im) im.alt = nm;
  document.title = APP_NAME;
}
const PHOTO_CATS = [
  "General photo",
  "Groundworks and excavation",
  "Foundations",
  "Drainage",
  "Below DPC / substructure",
  "DPC and oversite",
  "Walls / superstructure",
  "Lintels and steels",
  "Roof structure",
  "Roof covering",
  "Insulation",
  "First fix",
  "Second fix",
  "Fire stopping",
  "Plaster and finishes",
  "Windows and doors",
  "External works",
  "Defect or issue",
  "Completion / handover",
];
function siteFolders(site) {
  const r = siteRec(site);
  return r && Array.isArray(r.photoFolders) && r.photoFolders.length ? r.photoFolders : PHOTO_CATS;
}
async function saveFolders(site, list) {
  const r = siteRec(site);
  if (!r) {
    toast("Add this site in Setup first, then you can change its folders");
    return false;
  }
  const clean = [...new Set(list.map((x) => x.trim()).filter(Boolean))];
  if (!clean.length) {
    toast("Keep at least one folder");
    return false;
  }
  try {
    await S.db.doc("sites/" + r.id).update({ photoFolders: clean });
    return true;
  } catch (e) {
    toast("Couldn't save the folders");
    return false;
  }
}
function openAddFolder(site) {
  openSheet(
    `<h3 id="sheettitle">Add a photo folder</h3><div class="who">${esc(site)}</div>
    <label for="nf-name">Folder name<input id="nf-name" required maxlength="60" placeholder="e.g. Steel beam installation"></label>${formFoot(false, "Add folder")}`,
    async () => {
      const n = $("nf-name").value.trim();
      if (!n) return;
      const cur = siteFolders(site);
      if (cur.some((x) => x.toLowerCase() === n.toLowerCase())) {
        showErr("That folder already exists.");
        return;
      }
      if (await saveFolders(site, cur.concat([n]))) {
        closeForm();
        toast("Folder added");
        render();
      }
    },
    "nf-name",
  );
}
function openEditFolders(site) {
  openSheet(
    `<h3 id="sheettitle">Photo folders</h3><div class="who">${esc(site)}</div>
    <label for="ef-list">One folder per line, in the order you want them<textarea id="ef-list" style="min-height:300px">${esc(siteFolders(site).join("\n"))}</textarea></label>
    <div class="who">Renaming or removing a folder doesn't change photos already taken. They'll show under "Other photos" until you move them.</div>
    ${formFoot(false, "Save folders")}`,
    async () => {
      if (await saveFolders(site, $("ef-list").value.split("\n"))) {
        closeForm();
        toast("Folders saved");
        render();
      }
    },
    "ef-list",
  );
}
const WEATHER = [
  "Dry / sunny",
  "Dry / cloudy",
  "Overcast",
  "Drizzle",
  "Light rain",
  "Heavy rain",
  "Windy",
  "Fog / mist",
  "Frost / ice",
  "Snow",
];
const myTrade = () => ((S.myProfile && S.myProfile.details) || {}).trade || "";
function wmoText(c) {
  return c === 0 || c === 1
    ? "Dry / sunny"
    : c === 2
      ? "Dry / cloudy"
      : c === 3
        ? "Overcast"
        : c === 45 || c === 48
          ? "Fog / mist"
          : [51, 53, 55, 56, 57].includes(c)
            ? "Drizzle"
            : [61, 80, 66].includes(c)
              ? "Light rain"
              : [63, 65, 67, 81, 82].includes(c)
                ? "Heavy rain"
                : [71, 73, 75, 77, 85, 86].includes(c)
                  ? "Snow"
                  : c >= 95
                    ? "Thunderstorm"
                    : "";
}
function accuKind(ic, windMph) {
  ic = +ic;
  let k = "";
  if ([1, 2, 30, 33, 34].includes(ic)) k = "Dry / sunny";
  else if ([3, 4, 5, 35, 36, 37].includes(ic)) k = "Dry / cloudy";
  else if ([6, 7, 8, 38].includes(ic)) k = "Overcast";
  else if (ic === 11) k = "Fog / mist";
  else if ([12, 13, 14, 39, 40].includes(ic)) k = "Light rain";
  else if (ic === 18) k = "Heavy rain";
  else if ([15, 16, 17, 41, 42].includes(ic)) k = "Thunderstorm";
  else if ([19, 20, 21, 22, 23, 29, 43, 44].includes(ic)) k = "Snow";
  else if ([24, 25, 26, 31].includes(ic)) k = "Frost / ice";
  else if (ic === 32) k = "Windy";
  if ((windMph || 0) >= 25 && !/rain|snow|thunder/i.test(k)) k = "Windy";
  return k;
}
function feedNear(lat, lon, site) {
  const f = S.wxFeed;
  if (!f || !Array.isArray(f.places) || !f.at || Date.now() - f.at > 3 * 3600e3) return null;
  const bySite = site && f.places.find((p) => p.site && same(p.site, site));
  if (bySite) {
    lat = bySite.lat;
    lon = bySite.lon;
  }
  if (lat == null) {
    const ex = f.places.find((p) => /exmouth/i.test(p.name)) || f.places[0];
    lat = ex && ex.lat;
    lon = ex && ex.lon;
  }
  let best = null,
    bd = 1e9;
  f.places.forEach((p) => {
    if (p.lat == null) return;
    const d = lat == null ? 0 : Math.hypot((p.lat - lat) * 111, (p.lon - lon) * 70);
    if (d < bd) {
      bd = d;
      best = p;
    }
  });
  if (!best || bd > 30) best = f.places.find((p) => /exmouth/i.test(p.name)) || best;
  if (!best) return null;
  return {
    kind: accuKind(best.icon, best.wind) || best.phrase || "",
    temp: best.temp != null ? Math.round(best.temp) : null,
    wind: best.wind != null ? Math.round(best.wind) : null,
    phrase: best.phrase,
    place: (best.name || "").split(",")[0],
    at: f.at,
  };
}
async function liveWeather(lat, lon, site) {
  return feedNear(lat, lon, site);
}
function weatherText(w) {
  if (!w || !w.kind) return "";
  return (
    w.kind +
    (w.temp != null && w.temp !== "" ? ", " + w.temp + "°C" : "") +
    (w.wind ? ", wind " + w.wind + " mph" : "")
  );
}
function stampLines(info) {
  const L = [];
  L.push({ t: info.site || "Site not given", b: true });
  if (!info.noGeo)
    L.push(
      info.lat != null
        ? {
            t:
              fmtCoord(info.lat, info.lon) +
              (info.siteLoc ? " (site location)" : info.phoneLoc ? " (phone location)" : ""),
          }
        : { t: "Location : not recorded in photo", warn: true },
    );
  if (info.alt != null) L.push({ t: `Altitude : ${(+info.alt).toFixed(2)} m` });
  L.push({ t: `Date & Time : ${stampTime(info.takenAt)}` });
  L.push({ t: "Company Name : JEB Building Services" });
  if (info.project) L.push({ t: `Project Name : ${info.project}` });
  if (info.plot) L.push({ t: `Plot : ${info.plot}` });
  if (info.note) L.push({ t: `Note : ${info.note}` });
  if (info.category) L.push({ t: info.category });
  const wt = info.weather != null ? info.weather : "";
  if (wt) L.push({ t: `Weather : ${wt}` });
  if (info.name) L.push({ t: `Taken by : ${info.name}` });
  const tr = info.trade != null ? info.trade : myTrade();
  if (tr) L.push({ t: `Trade : ${tr}` });
  return L;
}
async function stampPhoto(file, info) {
  const img = await loadImage(file);
  const logo = await logoImage();
  const max = 2400,
    sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * sc),
    h = Math.round(img.naturalHeight * sc);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  g.drawImage(img, 0, 0, w, h);
  const base = Math.min(w, h * 0.8),
    fs = Math.max(13, Math.round(base * 0.03)),
    lh = Math.round(fs * 1.38),
    m = Math.round(w * 0.022),
    pd = Math.round(fs * 0.9);
  const font = (b) =>
    `${b ? "600" : "400"} ${fs}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  const pw = w - 2 * m,
    lw = Math.round(pw * 0.22),
    tx = m + pd + lw + pd,
    tw = pw - (tx - m) - pd;
  // wrap lines to the text width
  const rows = [];
  stampLines(info).forEach((l) => {
    g.font = font(l.b);
    const words = l.t.split(" ");
    let cur = "";
    words.forEach((wd) => {
      const tryS = cur ? cur + " " + wd : wd;
      if (g.measureText(tryS).width > tw && cur) {
        rows.push(Object.assign({}, l, { t: cur }));
        cur = wd;
      } else cur = tryS;
    });
    if (cur) rows.push(Object.assign({}, l, { t: cur }));
  });
  const show = rows.slice(0, 16);
  const ph = Math.max(pd * 2 + lh * show.length, Math.round(lw * 0.62) + pd * 2);
  const r = Math.round(fs * 0.7);
  g.save();
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.moveTo(m + r, m);
  g.arcTo(m + pw, m, m + pw, m + ph, r);
  g.arcTo(m + pw, m + ph, m, m + ph, r);
  g.arcTo(m, m + ph, m, m, r);
  g.arcTo(m, m, m + pw, m, r);
  g.closePath();
  g.fill();
  g.restore();
  // logo plate
  const lx = m + pd,
    ly = m + pd,
    lhgt = Math.round(lw * 0.5);
  g.fillStyle = "#ffffff";
  g.fillRect(lx, ly, lw, lhgt);
  if (logo) {
    const ar = logo.naturalWidth / logo.naturalHeight;
    let dw = lw * 0.9,
      dh = dw / ar;
    if (dh > lhgt * 0.86) {
      dh = lhgt * 0.86;
      dw = dh * ar;
    }
    g.drawImage(logo, lx + (lw - dw) / 2, ly + (lhgt - dh) / 2, dw, dh);
  } else {
    g.fillStyle = "#7F191D";
    g.font = `700 ${Math.round(lhgt * 0.42)}px system-ui, sans-serif`;
    g.textBaseline = "middle";
    g.fillText("JEB", lx + lw * 0.08, ly + lhgt / 2);
  }
  g.fillStyle = "#7F191D";
  g.fillRect(lx, ly + lhgt, lw, Math.max(3, Math.round(fs * 0.25)));
  g.textBaseline = "top";
  g.shadowColor = "rgba(0,0,0,0.6)";
  g.shadowBlur = Math.round(fs * 0.25);
  show.forEach((l, i) => {
    g.font = font(l.b);
    g.fillStyle = l.warn ? "#ffd36b" : "#ffffff";
    g.fillText(l.t, tx, m + pd + i * lh);
  });
  g.shadowBlur = 0;
  return new Promise((res, rej) =>
    cv.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88),
  );
}
const isVid = (p) => !!p && (p.kind === "video" || /^video\//.test(p.contentType || p.type || ""));
const VID_MAX = 19 * 1048576;
const isAud = (f) =>
  !!f &&
  (f.kind === "audio" ||
    f.voice === true ||
    /^audio\//.test(f.type || f.contentType || "") ||
    /\.(m4a|mp3|aac|ogg|wav|amr|opus)$/i.test(f.name || ""));
const audExt = (t) =>
  /webm/.test(t || "")
    ? "webm"
    : /ogg|opus/.test(t || "")
      ? "ogg"
      : /mpeg|mp3/.test(t || "")
        ? "mp3"
        : /wav/.test(t || "")
          ? "wav"
          : /amr/.test(t || "")
            ? "amr"
            : "m4a";
const audTag = (src, attrs) =>
  `<audio src="${src}" controls preload="metadata" ${attrs || ""}></audio>`;
/* 🎤 voice notes: records in the page when the browser allows the microphone, otherwise opens the phone's own recorder */
const VR = { rec: null, stream: null, chunks: [], t0: 0, timer: 0, btn: null };
function voiceStop(cancel) {
  if (!VR.rec) return;
  VR.cancel = !!cancel;
  try {
    VR.rec.state !== "inactive" && VR.rec.stop();
  } catch (e) {}
}
function wireVoice(btn, onFile) {
  if (!btn) return;
  const label = btn.innerHTML;
  const fb = document.createElement("input");
  fb.type = "file";
  fb.accept = "audio/*";
  fb.setAttribute("capture", "");
  fb.hidden = true;
  fb.className = "vr-fb";
  btn.after(fb);
  fb.onchange = () => {
    const f = fb.files[0];
    fb.value = "";
    if (f) onFile(f);
  };
  const reset = () => {
    clearInterval(VR.timer);
    btn.classList.remove("vrec-on");
    btn.innerHTML = label;
    if (VR.stream) VR.stream.getTracks().forEach((t) => t.stop());
    VR.rec = null;
    VR.stream = null;
    VR.btn = null;
  };
  btn.onclick = async (e) => {
    e.preventDefault();
    if (VR.rec && VR.btn === btn) {
      voiceStop();
      return;
    }
    if (VR.rec) {
      voiceStop(true);
    }
    let stream = null;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder)
        throw 0;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (x) {
      fb.click();
      return;
    }
    const mt =
      ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => {
        try {
          return MediaRecorder.isTypeSupported(t);
        } catch (e) {
          return false;
        }
      }) || "";
    let rec;
    try {
      rec = mt ? new MediaRecorder(stream, { mimeType: mt }) : new MediaRecorder(stream);
    } catch (x) {
      stream.getTracks().forEach((t) => t.stop());
      fb.click();
      return;
    }
    VR.rec = rec;
    VR.stream = stream;
    VR.chunks = [];
    VR.t0 = Date.now();
    VR.btn = btn;
    VR.cancel = false;
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) VR.chunks.push(ev.data);
    };
    rec.onstop = () => {
      const cancel = VR.cancel,
        ch = VR.chunks,
        secs = Math.round((Date.now() - VR.t0) / 1000);
      reset();
      if (cancel || !ch.length) return;
      const type = (rec.mimeType || mt || "audio/webm").split(";")[0] || "audio/webm";
      const f = new File(
        ch,
        `Voice note ${iso(new Date())} ${new Date().toTimeString().slice(0, 5).replace(":", "")}.${audExt(type)}`,
        { type, lastModified: Date.now() },
      );
      f.secs = secs;
      onFile(f);
    };
    rec.start(1000);
    btn.classList.add("vrec-on");
    const tick = () => {
      const s = Math.floor((Date.now() - VR.t0) / 1000);
      btn.innerHTML = `⏹ Stop ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (s >= 600) voiceStop();
    };
    tick();
    VR.timer = setInterval(tick, 500);
  };
}
const vidExt = (t) =>
  /quicktime|mov/.test(t || "")
    ? "mov"
    : /webm/.test(t || "")
      ? "webm"
      : /3gp/.test(t || "")
        ? "3gp"
        : "mp4";
const vidTag = (id, attrs) =>
  `<video src="${blobUrl(id)}#t=0.1" preload="metadata" playsinline muted ${attrs || ""}></video>`;
function photoTile(p, owner, who) {
  const fnm = `${(isSketch(p) ? p.title || "drawing" : p.site || "photo")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .slice(
      0,
      50,
    )} ${iso(new Date(p.takenAt || p.created || Date.now()))} ${new Date(p.takenAt || p.created || Date.now()).toTimeString().slice(0, 5).replace(":", "")}${owner && who ? " " + String(nameOf(who)).replace(/[^\w\s-]/g, "") : ""}.jpg`;
  return `<button type="button" class="ph${isVid(p) ? " phvid" : ""}" data-p="${esc(p.id)}" data-w="${esc(who || "")}" data-a="${esc(p.assetId)}" data-n="${esc(isVid(p) ? fnm.replace(/\.jpg$/, "." + vidExt(p.contentType)) : fnm)}">${isVid(p) ? vidTag(p.assetId) + '<span class="vidplay" aria-hidden="true">▶</span>' : `<img src="${blobUrl(p.assetId)}" alt="${esc(p.caption || p.site || "Site photo")}" loading="lazy">`}
    ${isSketch(p) ? `<span class="mkbadge skb sk-${skState(p)[0]}">✏️ ${esc(skState(p)[0] === "open" ? (owner ? "Check this" : "Waiting for James") : skState(p)[0] === "ok" ? "Right ✓" : skState(p)[0] === "change" ? "Needs changing" : p.mine ? "Mine" : p.fromOwner ? (owner ? "Sent" : "From James") : "Drawing")}</span>` : (p.markups || []).length ? `<span class="mkbadge">✎ ${owner ? "Marked up" : "Notes from James"}</span>` : ""}<span class="phcap"><b>${isSketch(p) ? esc(p.title || "Drawing") + "</b> · " + esc(p.site || "No site") + "<b>" : esc(p.site || "No site")}</b>${p.plot ? " · " + esc(p.plot) : ""}${owner && !p.mine ? ` · ${esc(nameOf(who))}` : ""}<br>${new Date(p.takenAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${p.lat != null ? "" : " · no location"}</span></button>`;
}
function photoViewer(p, owner, who) {
  if (isSketch(p)) return sketchViewer(p, owner, who);
  const rows = [
    ["Address", p.site],
    [
      "Location",
      p.lat != null
        ? fmtCoord(p.lat, p.lon) +
          (p.siteLoc
            ? " (site's saved location: the phone didn't record one)"
            : " (from the phone's GPS)")
        : "Not recorded in photo. The phone didn't save a location with it.",
    ],
    ["Altitude", p.alt != null ? (+p.alt).toFixed(2) + " m" : ""],
    ["Date & time", stampTime(p.takenAt)],
    ["Weather", p.weather],
    ["Project", p.project],
    ["Plot", p.plot],
    ["Folder (stage)", p.category],
    ["Note", p.caption],
    ["Taken by", owner ? nameOf(who) : S.myProfile && S.myProfile.name],
    ["Trade", p.trade],
    ["Sent", stamp(p.created)],
  ].filter((x) => x[1]);
  openViewer(`${isVid(p) ? `<video src="${blobUrl(p.assetId)}" controls playsinline preload="metadata" style="max-height:70vh;width:100%;display:block;border-radius:8px;background:#000"></video>` : `<img src="${blobUrl(p.assetId)}" alt="${esc(p.caption || "Site photo")}" style="max-height:70vh;width:auto;max-width:100%;margin:0 auto;display:block;border-radius:8px">`}
    <div class="details" style="margin-top:10px">${rows.map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${p.lat != null ? `<div style="margin-top:8px"><button type="button" class="btn maplink" data-addr="${esc(p.site || "")}" data-lat="${p.lat}" data-lon="${p.lon}" data-label="Where this photo was taken">📍 Where it was taken: maps &amp; share</button></div>` : ""}
    ${owner ? `<label for="v-move" style="margin-top:10px;max-width:360px">Move to folder<select id="v-move">${[...new Set(siteFolders(p.site).concat(p.category ? [p.category] : []))].map((c) => `<option ${c === p.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
    ${markupBlock(p, owner)}
    <div class="actions" style="margin-top:12px">${owner && who && !isVid(p) ? `<button class="btn primary" id="v-mark" type="button">✎ Draw or write on it &amp; send back</button>` : ""}<button class="btn ${owner && who ? "" : "primary"}" id="v-save" type="button">Save photo</button><button class="btn delbtn" id="v-del" type="button">🗑 Delete</button></div>`);
  if ($("v-mark")) $("v-mark").onclick = () => markupSend(p, who);
  $("viewer")
    .querySelectorAll(".mk-save")
    .forEach(
      (b) =>
        (b.onclick = () =>
          saveAsset(
            b.dataset.a,
            `${(p.site || "photo").replace(/[^\w\s-]/g, "").trim()} marked up.jpg`,
          )),
    );
  if (!owner)
    myOpenPrompts()
      .filter((x) => x.form === "markup" && x.ref === p.id)
      .forEach((x) => markPrompt(x, "done"));
  if ($("v-move"))
    $("v-move").onchange = async (e) => {
      const c = e.target.value;
      try {
        await S.db.doc("sheets/" + who + "/photos/" + p.id).update({ category: c });
        p.category = c;
        if (sphotoWanted(p)) sphotoPut(who || S.me, p.id, p);
        toast("Moved to " + c + ". The words printed on the photo stay as they were.");
      } catch (err) {
        toast("Couldn't move it");
      }
    };
  $("v-save").onclick = () =>
    saveAsset(
      p.assetId,
      `${(p.site || "photo").replace(/[^\w\s-]/g, "").trim()} ${iso(new Date(p.takenAt))}.${isVid(p) ? vidExt(p.contentType) : "jpg"}`,
    );
  const d = $("v-del");
  if (d) {
    if (owner) {
      d.onclick = () =>
        binFromViewer(
          {
            assets: [p.assetId],
            title:
              (p.caption || p.category || (isVid(p) ? "Video" : "Photo")) +
              (p.site ? " · " + p.site : ""),
            type: isVid(p) ? p.contentType || "video/mp4" : "image/jpeg",
            thumb: isVid(p) ? "" : p.assetId,
          },
          () => {
            closeViewer();
            render();
          },
        );
    } else {
      let armed = false;
      d.onclick = async () => {
        if (!armed) {
          armed = true;
          d.textContent = "Tap again to delete";
          return;
        }
        try {
          await photoDelete(p.id, S.me, p.assetId);
          closeViewer();
          toast("Photo deleted");
          render();
        } catch (e) {
          toast("Couldn't delete");
        }
      };
    }
  }
}
function empPhotos() {
  const wp = S.mine.photos
    .filter((p) => inWeek(p) && !isSketch(p))
    .sort((a, b) => b.takenAt - a.takenAt);
  const sk = S.mine.photos
    .filter(
      (p) =>
        isSketch(p) &&
        (p.check === "open" ||
          p.check === "change" ||
          Date.now() - (p.editedAt || p.created || 0) < 45 * 864e5),
    )
    .sort((a, b) => (b.editedAt || b.created) - (a.editedAt || a.created));
  $("main").innerHTML =
    `<div class="actions"><button class="btn primary" id="addP" type="button">+ Add photos</button><button class="btn primary" id="addD" type="button">✏️ Draw it out</button></div>
    <div class="notice">✏️ <b>Draw it out</b>: sketch a layout or detail, add photos and writing, and send it to James to check it's right.</div>
    ${sk.length ? `<div class="flabel">My drawings</div>${sketchStrip(sk, false)}<div class="flabel" style="margin-top:14px">Photos this week</div>` : ""}
    <details class="notice"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer">📍 Each photo is stamped with where and when it was taken</summary>The address, GPS position, altitude, date and time, company, project, plot and your note. For the position to show, turn on <b>location</b> for your phone's camera. On iPhone, when you choose photos, tap <b>Options</b> at the top and turn on <b>Location</b>.</details>
    ${wp.length ? `<div class="phgrid">${wp.map((p) => photoTile(p, false)).join("")}</div>` : '<div class="empty"><strong>No photos this week</strong>Tap “Add photos” to take or choose photos of the work.</div>'}`;
  $("addP").onclick = openPhoto;
  $("addD").onclick = newDrawing;
  $("main")
    .querySelectorAll(".ph")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = S.mine.photos.find((x) => x.id === b.dataset.p);
          if (p) photoViewer(p, false);
        }),
    );
}
const siteRec = (n) => S.sites.find((x) => same(x.name, n));
function openPhoto() {
  if (!S.assets) {
    toast("You don't have permission to upload. Ask James to make you an Editor on this page.");
    return;
  }
  setFormType("photo");
  setEditing(null);
  const lastSite =
    lastOf(S.mine.photos, () => true, "site") || lastOf(S.mine.entries, () => true, "job");
  openSheet(
    `<h3 id="sheettitle">Add photos</h3>
    <label for="p-file">Photos or videos<input id="p-file" type="file" accept="image/*,video/*" multiple required></label><div class="who">Videos: keep them short (about 20 seconds) so they upload quickly.</div>
    ${pickField("p-site", "Site address", siteNames(), lastSite, "e.g. 9 Old Teignmouth Rd, Dawlish EX7 0NJ")}
    <div class="grid2"><label for="p-proj">Project name<input id="p-proj" maxlength="80" placeholder="e.g. La Falaise"></label>
    <label for="p-plot">Plot<input id="p-plot" maxlength="40" list="p-plots" placeholder="e.g. Plot 1"><datalist id="p-plots"></datalist></label></div>
    <label for="p-cat">Stage (which folder it goes in)<select id="p-cat" required></select></label>
    <label for="p-cap">Note (optional)<input id="p-cap" maxlength="140" placeholder="e.g. Drainage runs ready for inspection"></label>
    <div class="grid2"><label for="p-wx">Weather<select id="p-wx"><option value="">Not recorded</option>${WEATHER.map((w) => `<option>${w}</option>`).join("")}</select></label>
    <label for="p-temp">Temperature °C (optional)<input id="p-temp" inputmode="numeric" maxlength="4" placeholder="e.g. 12"></label></div>
    <div class="who" id="p-wxnote"></div>
    <label class="tick"><input type="checkbox" id="p-geo" ${store.get("jeb.geo", true) ? "checked" : ""}> <span>📍 <b>Geo-tag the photos</b> (add the GPS position to the photo and its stamp). Untick to leave the location off.</span></label>
    <div class="who">The address, date and time, company, your name${myTrade() ? " and trade (" + esc(myTrade()) + ")" : " and trade"} are added automatically.</div>
    <div class="who" id="p-prog"></div>
    ${formFoot(false, "Send photos")}`,
    savePhotos,
    null,
  );
  const fill = () => {
    const s = siteRec(pickVal("p-site")) || {};
    const prev = store.get("jeb.photo." + (s.name || pickVal("p-site")), {});
    $("p-proj").value = prev.project || s.project || "";
    $("p-plot").value = prev.plot || "";
    const fl = siteFolders(s.name || pickVal("p-site"));
    const want = fl.includes(prev.category) ? prev.category : "";
    {
      const w2 = want || (fl.includes("General photo") ? "General photo" : "");
      $("p-cat").innerHTML =
        `<option value="" disabled ${w2 ? "" : "selected"}>Choose the stage…</option>` +
        fl.map((c) => `<option ${c === w2 ? "selected" : ""}>${esc(c)}</option>`).join("");
    }
    $("p-plots").innerHTML = (s.plots || []).map((p) => `<option value="${esc(p)}">`).join("");
  };
  const wx = async () => {
    if (S.wxTouched) return;
    const s = siteRec(pickVal("p-site")) || {};
    const w = await liveWeather(s.lat, s.lon, s.name || pickVal("p-site"));
    const nw = S.nowWx;
    if (
      !w &&
      nw &&
      Date.now() - nw.at < 2 * 3600e3 &&
      !S.wxTouched &&
      $("p-wx") &&
      !$("p-wx").value
    ) {
      if (!WEATHER.includes(nw.kind))
        $("p-wx").insertAdjacentHTML("beforeend", `<option>${esc(nw.kind)}</option>`);
      $("p-wx").value = nw.kind;
      $("p-temp").value = nw.temp ?? "";
      $("p-wxnote").textContent =
        "Weather filled in from today's forecast. Change it if it's wrong.";
      return;
    }
    if (!w || !$("p-wx") || S.wxTouched) return;
    if (w.kind && !WEATHER.includes(w.kind))
      $("p-wx").insertAdjacentHTML("beforeend", `<option>${esc(w.kind)}</option>`);
    $("p-wx").value = w.kind || "";
    $("p-temp").value = w.temp != null ? w.temp : "";
    S.wxWind = w.wind;
    $("p-wxnote").textContent =
      "Weather filled in from AccuWeather for this site. Change it if it's wrong.";
  };
  S.wxTouched = false;
  S.wxWind = null;
  const last = store.get("jeb.wx", null);
  if (last && Date.now() - last.at < 3 * 3600e3) {
    $("p-wx").value = last.kind;
    $("p-temp").value = last.temp ?? "";
  }
  $("p-wx").addEventListener("change", () => {
    S.wxTouched = true;
    S.wxWind = null;
  });
  $("p-temp").addEventListener("input", () => {
    S.wxTouched = true;
    S.wxWind = null;
  });
  $("p-site").addEventListener("change", fill);
  if ($("p-site-other")) $("p-site-other").addEventListener("change", fill);
  fill();
  $("p-site").addEventListener("change", wx);
  if ($("p-site-other")) $("p-site-other").addEventListener("change", wx);
  wx();
}
async function savePhotos() {
  const site = pickVal("p-site"),
    files = [...($("p-file").files || [])],
    cap = $("p-cap").value.trim();
  const project = $("p-proj").value.trim(),
    plot = $("p-plot").value.trim(),
    category = $("p-cat").value.trim();
  if (!files.length) {
    showErr("Choose at least one photo.");
    return;
  }
  if (!site) {
    showErr("Choose the site.");
    return;
  }
  if (!category) {
    showErr("Choose the stage the photo was taken at.");
    return;
  }
  store.set("jeb.photo." + site, { project, plot, category });
  const wxk = $("p-wx").value,
    wxt = $("p-temp")
      .value.trim()
      .replace(/[^\d.-]/g, "");
  const weather = weatherText({ kind: wxk, temp: wxt, wind: S.wxWind });
  const trade = myTrade();
  if (wxk) store.set("jeb.wx", { kind: wxk, temp: wxt, at: Date.now() });
  const geo = !!($("p-geo") && $("p-geo").checked);
  store.set("jeb.geo", geo);
  let here = null;
  $("f-save").disabled = true;
  let ok = 0,
    noLoc = 0,
    queued = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    $("p-prog").textContent =
      `${/^video\//.test(f.type || "") ? "Sending video" : "Stamping and sending photo"} ${i + 1} of ${files.length}…`;
    if (/^video\//.test(f.type || "") || /\.(mp4|mov|webm|3gp)$/i.test(f.name || "")) {
      if (f.size > VID_MAX) {
        showErr(
          `Video ${i + 1} is too big (${(f.size / 1048576).toFixed(0)} MB). Keep videos to about 20 seconds, or lower the video quality in your camera settings.`,
        );
        continue;
      }
      try {
        const takenAt = f.lastModified || Date.now();
        const ct = f.type || "video/mp4";
        const sr = siteRec(site) || {};
        const r = await submitJob({
          coll: "photos",
          docId: newId(),
          data: {
            kind: "video",
            contentType: ct,
            site,
            project,
            plot,
            category,
            caption: cap,
            takenAt,
            date: iso(new Date(takenAt)),
            lat: geo ? (sr.lat ?? null) : null,
            lon: geo ? (sr.lon ?? null) : null,
            siteLoc: geo && sr.lat != null,
            weather,
            trade,
            created: Date.now(),
          },
          files: [{ blob: f, name: "video." + vidExt(ct), field: "assetId" }],
        });
        if (r === "queued") queued++;
        ok++;
      } catch (e) {
        showErr(uploadErr(e));
      }
      continue;
    }
    try {
      const ex = readExif(await f.slice(0, 262144).arrayBuffer());
      const takenAt = exifDate(ex.date) || f.lastModified || Date.now();
      const sr = siteRec(site) || {};
      if (geo && ex.lat == null && here === null) {
        $("p-prog").textContent = "Finding where you are for the geo-tag…";
        try {
          here = await Promise.race([
            hereNow(),
            new Promise((_, rj) => setTimeout(() => rj(new Error("slow")), 9000)),
          ]);
        } catch (e) {
          here = false;
        }
      }
      const ph = geo && ex.lat == null && here ? here : null;
      const useSite = geo && ex.lat == null && !ph && sr.lat != null;
      const info = geo
        ? {
            site,
            project,
            plot,
            category,
            note: cap,
            takenAt,
            lat: ex.lat ?? (ph ? ph.lat : useSite ? sr.lat : null),
            lon: ex.lon ?? (ph ? ph.lon : useSite ? sr.lon : null),
            alt: ex.alt ?? null,
            siteLoc: useSite,
            phoneLoc: !!ph,
            name: S.myProfile.name,
            weather,
            trade,
          }
        : {
            site,
            project,
            plot,
            category,
            note: cap,
            takenAt,
            lat: null,
            lon: null,
            alt: null,
            siteLoc: false,
            noGeo: true,
            name: S.myProfile.name,
            weather,
            trade,
          };
      if (geo && info.lat == null) noLoc++;
      const blob = await stampPhoto(f, info);
      const r = await submitJob({
        coll: "photos",
        docId: newId(),
        data: {
          site,
          project,
          plot,
          category,
          caption: cap,
          takenAt,
          date: iso(new Date(takenAt)),
          lat: info.lat,
          lon: info.lon,
          alt: info.alt,
          siteLoc: !!info.siteLoc,
          weather,
          trade,
          created: Date.now(),
        },
        files: [{ blob, name: "photo.jpg", field: "assetId" }],
      });
      if (r === "queued") queued++;
      ok++;
    } catch (e) {
      showErr(
        e && e.message === "decode"
          ? `Photo ${i + 1} couldn't be opened. Set your camera to save photos as JPG ("Most Compatible" on iPhone).`
          : uploadErr(e),
      );
    }
  }
  $("f-save").disabled = false;
  if (ok) {
    S.week = monday(new Date());
    closeForm();
    setTimeout(() => loadSitePhotos(true), 1500);
    toast(
      queued
        ? `${queued} photo${queued === 1 ? "" : "s"} kept on this phone. They'll send when you have signal.`
        : `Sent ${ok} photo${ok === 1 ? "" : "s"}${noLoc ? ` · ${noLoc} without location` : ""}`,
    );
    render();
  }
}
