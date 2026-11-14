/* ================= FILES ================= */
import { bossFirst } from "../core/company-names.js";
import { toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { loadScript } from "./in-app-files.js";
import { newId } from "./outbox.js";
export {
  assetBlob,
  blobUrl,
  csvSave,
  isImg,
  isWord,
  isWordId,
  loadMammoth,
  saveAsset,
  uploadErr,
  uploadFile,
  wordType,
  wrapAssets,
};
async function uploadFile(blob, name) {
  if (!S.assets) throw { code: "not_granted" };
  if (isWord(blob, name)) return wordStore(blob, name || blob.name);
  let type = blob.type;
  if (!type) {
    const ext = (name || "").split(".").pop().toLowerCase();
    type =
      {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        "3gp": "video/3gpp",
        m4a: "audio/mp4",
        mp3: "audio/mpeg",
        aac: "audio/aac",
        ogg: "audio/ogg",
        wav: "audio/wav",
        amr: "audio/amr",
      }[ext] || "";
  }
  /* the file store takes video but not audio, so voice notes go in as audio-only video files (they play the same) */
  if (/^audio\//.test(type)) type = /webm|ogg/.test(type) ? "video/webm" : "video/mp4";
  return S.assets.upload(blob, type ? { type } : undefined);
}
/* Word documents: the file store doesn't take them, so they're kept in the app's database in pieces and rebuilt when opened */
const WORD_RE = /\.(docx?|dotx?|rtf|odt)$/i;
const isWord = (f, name) =>
  !!f &&
  (WORD_RE.test(name || f.name || "") ||
    /msword|wordprocessingml|opendocument\.text|\/rtf/.test(f.type || f.contentType || ""));
const wordType = (name, t) =>
  t && /msword|wordprocessingml|opendocument|rtf/.test(t)
    ? t
    : /\.docx$/i.test(name || "")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : /\.odt$/i.test(name || "")
        ? "application/vnd.oasis.opendocument.text"
        : /\.rtf$/i.test(name || "")
          ? "application/rtf"
          : "application/msword";
const isWordId = (id) => typeof id === "string" && id.startsWith("w~");
const W_CHUNK = 450000,
  W_MAX = 15 * 1048576;
async function wordStore(blob, name) {
  if (blob.size > W_MAX) throw { code: "too_large" };
  const uid = S.me,
    fid = newId();
  const type = wordType(name || blob.name, blob.type);
  const fr = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  const parts = Math.ceil(fr.length / W_CHUNK) || 1;
  for (let k = 0; k < parts; k++)
    await S.db
      .doc(`wfiles/${uid}/f/${fid}/parts/${k}`)
      .set({ d: fr.slice(k * W_CHUNK, (k + 1) * W_CHUNK) });
  await S.db.doc(`wfiles/${uid}/f/${fid}`).set({
    name: name || blob.name || "Document.docx",
    type,
    size: blob.size,
    parts,
    at: Date.now(),
  });
  return { id: "w~" + uid + "~" + fid, url: "", sizeBytes: blob.size, contentType: type };
}
async function wordBlob(id) {
  const [, uid, fid] = id.split("~");
  const m = await S.db.doc(`wfiles/${uid}/f/${fid}`).get();
  if (!m.exists) throw new Error("gone");
  const md = m.data();
  const ps = [];
  for (let k = 0; k < (md.parts || 1); k++) {
    const d = await S.db.doc(`wfiles/${uid}/f/${fid}/parts/${k}`).get();
    ps.push(d.exists ? d.data().d || "" : "");
  }
  const bin = atob(ps.join(""));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: md.type || "application/msword" });
}
async function wordDelete(id) {
  const [, uid, fid] = id.split("~");
  try {
    const m = await S.db.doc(`wfiles/${uid}/f/${fid}`).get();
    const n = m.exists ? m.data().parts || 1 : 1;
    for (let k = 0; k < n; k++) await S.db.doc(`wfiles/${uid}/f/${fid}/parts/${k}`).delete();
    await S.db.doc(`wfiles/${uid}/f/${fid}`).delete();
  } catch (e) {}
}
async function assetBlob(id) {
  if (isWordId(id)) return wordBlob(id);
  const r = await fetch(blobUrl(id));
  if (!r.ok) throw new Error("fetch");
  return r.blob();
}
function wrapAssets(a) {
  if (!a) return a;
  return {
    upload: (b, o) =>
      isWord(b, b && b.name) ||
      (o && o.type && /msword|wordprocessingml|opendocument\.text|\/rtf/.test(o.type))
        ? wordStore(b, b && b.name)
        : a.upload(b, o),
    list: (...x) => a.list(...x),
    delete: (id) =>
      isWordId(id)
        ? wordDelete(id)
        : ownerMode() &&
            !window.__binPurging &&
            (S.bin || []).some((b) => (b.assets || []).includes(id))
          ? Promise.resolve()
          : a.delete(id),
  };
}
let mammothP = null;
function loadMammoth() {
  if (window.mammoth) return Promise.resolve();
  if (mammothP) return mammothP;
  mammothP = loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js",
  )
    .catch(() => loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"))
    .catch((e) => {
      mammothP = null;
      throw e;
    });
  return mammothP;
}
function uploadErr(e) {
  const c = e && e.code;
  return c === "too_large"
    ? "That file is too big. The limit is 20 MB (15 MB for Word)."
    : c === "unsupported_type"
      ? "That file type can't be stored. Use a PDF, a Word document or a photo (JPG or PNG)."
      : c === "not_granted" || c === "capability_disabled"
        ? `You don't have permission to upload. Ask ${bossFirst()} to make you an Editor on this page.`
        : c === "quota_or_state"
          ? `Storage is full. Ask ${bossFirst()} to remove old files.`
          : "Upload didn't go through. Check your connection and try again.";
}
const blobUrl = (id) => "/_blob/" + id;
async function saveAsset(id, filename) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  try {
    const b = await assetBlob(id);
    await S.dl.save({ filename, data: b });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Couldn't download the file");
  }
}
const isImg = (t) => /^image\//.test(t || "");
function csvSave(name, rows) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  S.dl
    .save({ filename: name, data: rows.map((r) => r.map(q).join(",")).join("\r\n") })
    .catch((e) => {
      if (!(e && e.code === "declined")) toast("Download didn't go through");
    });
}
