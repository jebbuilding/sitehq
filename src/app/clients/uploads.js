/* ================= CLIENT UPLOADS (photos & documents from the client to James), stored in chunks in their own portal area ================= */
import { PT, ptManager } from "./portal.js";
import { $, esc, fsize, iso, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { openNotePage } from "../drawing/paving.js";
import { attachPicker } from "../files/attachment-picker.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { fcOpen, fcPut, openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { audExt, audTag, loadImage, vidExt } from "../photos/photos.js";
import { shrinkImage } from "../safety/training.js";
export { cuDraw, cuListHtml, cuOpen, cuQuickPhoto, cuQuickVideo, cuQuickVoice, cuSend };
const CU_CHUNK = 450000,
  CU_MAX = 15 * 1048576;
const b64of = (blob) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1] || "");
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
async function cuThumb(blob) {
  try {
    const img = await loadImage(blob);
    const sc = Math.min(1, 220 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * sc);
    cv.height = Math.round(img.naturalHeight * sc);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.7);
  } catch (e) {
    return "";
  }
}
async function cuSendBlobs(items, note, prog) {
  let sent = 0;
  for (let i = 0; i < items.length; i++) {
    let { blob, name, type } = items[i];
    prog && prog(`Sending ${i + 1} of ${items.length}…`);
    if (blob.size > CU_MAX) {
      toast(`${name} is too big (over 15 MB). Send a smaller copy.`);
      continue;
    }
    const b64 = await b64of(blob);
    const parts = Math.ceil(b64.length / CU_CHUNK) || 1;
    const id = newId();
    for (let k = 0; k < parts; k++) {
      prog &&
        prog(`Sending ${i + 1} of ${items.length} (${Math.round(((k + 1) / parts) * 100)}%)…`);
      await S.db
        .doc(`portal/${S.me}/uploads/${id}/parts/${k}`)
        .set({ d: b64.slice(k * CU_CHUNK, (k + 1) * CU_CHUNK) });
    }
    await S.db.doc(`portal/${S.me}/uploads/${id}`).set({
      name,
      type,
      size: blob.size,
      parts,
      note,
      kind: items[i].kind || "",
      thumb: /^image\//.test(type) ? await cuThumb(blob) : "",
      at: Date.now(),
    });
    sent++;
  }
  if (sent)
    await S.db.doc("portal/" + S.me).update({
      lastAct: Date.now(),
      lastWhat:
        `sent you ${sent} ${items.some((x) => x.kind === "drawing") ? "drawing" : "file"}${sent === 1 ? "" : "s"}` +
        (note ? `: "${note.slice(0, 60)}"` : ""),
    });
  return sent;
}
/* client: one photo straight from the camera or library */
async function cuQuickPhoto(f) {
  const fs = (Array.isArray(f) ? f : [f]).filter(Boolean);
  if (!fs.length) return;
  const pv = S.client && S.client._preview;
  toast(fs.length > 1 ? "Getting your photos ready…" : "Getting your photo ready…");
  const items = [];
  for (const x of fs) {
    let blob = x,
      type = x.type || "image/jpeg",
      name = x.name || "photo.jpg";
    try {
      blob = await shrinkImage(x, 2000);
      type = "image/jpeg";
      name = name.replace(/\.[^.]+$/, "") + ".jpg";
    } catch (e) {
      if (!/^image\/(jpe?g|png|webp|gif)$/i.test(type)) {
        toast("That photo couldn't be opened. On iPhone set Camera › Formats to Most Compatible.");
        continue;
      }
    }
    items.push({ blob, name, type });
  }
  if (!items.length) return;
  const urls = items.map((i) => URL.createObjectURL(i.blob));
  const n1 = items.length === 1;
  openSheet(
    `<h3 id="sheettitle">📷 Send ${n1 ? "this photo" : "these " + items.length + " photos"} to James?</h3>${pv ? `<div class="notice warn" style="margin:0">Preview: this is what the client sees. Nothing will actually be sent.</div>` : ""}<div class="cqgrid">${urls.map((u) => `<img src="${u}" alt="Your photo">`).join("")}</div>
    <label for="cq-note">Message (optional)<textarea id="cq-note" maxlength="500" placeholder="e.g. Crack has appeared above the back door"></textarea></label><div class="who" id="cq-prog"></div>${formFoot(false, "Send to James")}`,
    async () => {
      if (pv) {
        closeForm();
        toast("Preview only. When the client does this it goes straight to you.");
        return;
      }
      $("f-save").disabled = true;
      try {
        const n = await cuSendBlobs(items, $("cq-note").value.trim(), (t) => {
          $("cq-prog").textContent = t;
        });
        closeForm();
        urls.forEach((u) => URL.revokeObjectURL(u));
        toast(
          n ? (n === 1 ? "Photo sent to James" : n + " photos sent to James") : "Nothing was sent",
        );
        render();
      } catch (e) {
        showErr("Couldn't send. Check your connection and try again.");
        $("f-save").disabled = false;
      }
    },
    "cq-note",
  );
}
function cuQuickVideo(f) {
  const pv = S.client && S.client._preview;
  if (f.size > CU_MAX) {
    toast(
      `That video is too big (${(f.size / 1048576).toFixed(0)} MB). Keep it to about 20 seconds.`,
    );
    return;
  }
  const url = URL.createObjectURL(f);
  const name = (f.name || "video").replace(/\.[^.]+$/, "") + "." + vidExt(f.type);
  openSheet(
    `<h3 id="sheettitle">🎥 Send this video to James?</h3>${pv ? `<div class="notice warn" style="margin:0">Preview: this is what the client sees. Nothing will actually be sent.</div>` : ""}<video src="${url}" controls playsinline style="width:100%;max-height:42vh;border-radius:10px;background:#000"></video>
    <label for="cv-note2">Message (optional)<textarea id="cv-note2" maxlength="500" placeholder="e.g. The noise the boiler makes"></textarea></label><div class="who" id="cv-prog"></div>${formFoot(false, "Send to James")}`,
    async () => {
      if (pv) {
        closeForm();
        toast("Preview only. When the client does this it goes straight to you.");
        return;
      }
      $("f-save").disabled = true;
      try {
        const n = await cuSendBlobs(
          [{ blob: f, name, type: f.type || "video/mp4" }],
          $("cv-note2").value.trim(),
          (t) => {
            $("cv-prog").textContent = t;
          },
        );
        closeForm();
        URL.revokeObjectURL(url);
        toast(n ? "Video sent to James" : "Nothing was sent");
        render();
      } catch (e) {
        showErr("Couldn't send. Check your connection and try again.");
        $("f-save").disabled = false;
      }
    },
    "cv-note2",
  );
}
function cuQuickVoice(f) {
  const pv = S.client && S.client._preview;
  if (f.size > CU_MAX) {
    toast("That recording is too big. Keep it under about 10 minutes.");
    return;
  }
  const url = URL.createObjectURL(f);
  const type = f.type || "audio/mp4";
  const name = `Voice note ${iso(new Date())}.${audExt(type)}`;
  openSheet(
    `<h3 id="sheettitle">🎤 Send this voice note to James?</h3>${pv ? `<div class="notice warn" style="margin:0">Preview: this is what the client sees. Nothing will actually be sent.</div>` : ""}<div class="audview">${audTag(url, 'style="width:100%"')}</div>
    <label for="cv-note3">Message (optional)<textarea id="cv-note3" maxlength="500" placeholder="e.g. Quick update about the driveway"></textarea></label><div class="who" id="cv-prog3"></div>${formFoot(false, "Send to James")}`,
    async () => {
      if (pv) {
        closeForm();
        toast("Preview only. When the client does this it goes straight to you.");
        return;
      }
      $("f-save").disabled = true;
      try {
        const n = await cuSendBlobs(
          [{ blob: f, name, type, kind: "voice" }],
          $("cv-note3").value.trim(),
          (t) => {
            $("cv-prog3").textContent = t;
          },
        );
        closeForm();
        URL.revokeObjectURL(url);
        toast(n ? "Voice note sent to James" : "Nothing was sent");
        render();
      } catch (e) {
        showErr("Couldn't send. Check your connection and try again.");
        $("f-save").disabled = false;
      }
    },
    "cv-note3",
  );
}
function cuDraw() {
  if (S.client && S.client._preview) {
    toast("This is a preview. Only the client can send drawings.");
    return;
  }
  openNotePage({
    title: "",
    local: true,
    onSave: (r) => {
      const url = URL.createObjectURL(r.blob);
      const nm = (r.title || "Drawing").replace(/[^\w\s-]/g, "").trim() || "Drawing";
      openSheet(
        `<h3 id="sheettitle">✏️ Send your drawing to James?</h3><img src="${url}" alt="Your drawing" style="max-height:42vh;max-width:100%;border-radius:10px;align-self:center;border:1px solid var(--line);background:#fff">
      <label for="cd-note">Message (optional)<textarea id="cd-note" maxlength="500" placeholder="e.g. This is where we'd like the kitchen island"></textarea></label><div class="who" id="cd-prog"></div>${formFoot(false, "Send to James")}`,
        async () => {
          $("f-save").disabled = true;
          try {
            const n = await cuSendBlobs(
              [{ blob: r.blob, name: nm + ".jpg", type: "image/jpeg", kind: "drawing" }],
              $("cd-note").value.trim(),
              (t) => {
                $("cd-prog").textContent = t;
              },
            );
            closeForm();
            toast(n ? "Drawing sent to James" : "Nothing was sent");
            PT.tab = "draw";
            render();
          } catch (e) {
            showErr("Couldn't send. Check your connection and try again.");
            $("f-save").disabled = false;
          }
        },
        "cd-note",
      );
    },
  });
}
function cuSend() {
  openSheet(
    `<h3 id="sheettitle">📤 Send to James</h3><div class="who">Photos, drawings or documents you'd like James to see. Only James can see them.</div>
    <div class="flabel">Photos or files (you can add several)</div><div id="cu-pick"></div>
    <label for="cu-note">Message (optional)<textarea id="cu-note" maxlength="500" placeholder="e.g. Here's the tile we'd like in the bathroom"></textarea></label>
    <div class="who" id="cu-prog"></div>${formFoot(false, "Send to James")}`,
    async () => {
      if (S.client && S.client._preview) {
        showErr("This is a preview. Only the client can send files.");
        return;
      }
      const files = cuPick.files();
      if (!files.length) {
        showErr("Add at least one photo or file");
        return;
      }
      $("f-save").disabled = true;
      const note = $("cu-note").value.trim();
      let sent = 0;
      try {
        for (let i = 0; i < files.length; i++) {
          let f = files[i];
          $("cu-prog").textContent = `Sending ${i + 1} of ${files.length}…`;
          let blob = f,
            type = f.type || "application/octet-stream",
            name = f.name || "file";
          if (/^image\//.test(type) && !/svg|gif/.test(type)) {
            try {
              blob = await shrinkImage(f, 2000);
              type = "image/jpeg";
              name = name.replace(/\.[^.]+$/, "") + ".jpg";
            } catch (e) {}
          }
          if (blob.size > CU_MAX) {
            toast(`${name} is too big (over 15 MB). Send a smaller copy.`);
            continue;
          }
          const b64 = await b64of(blob);
          const parts = Math.ceil(b64.length / CU_CHUNK) || 1;
          const id = newId();
          for (let k = 0; k < parts; k++) {
            $("cu-prog").textContent =
              `Sending ${i + 1} of ${files.length} (${Math.round(((k + 1) / parts) * 100)}%)…`;
            await S.db
              .doc(`portal/${S.me}/uploads/${id}/parts/${k}`)
              .set({ d: b64.slice(k * CU_CHUNK, (k + 1) * CU_CHUNK) });
          }
          await S.db.doc(`portal/${S.me}/uploads/${id}`).set({
            name,
            type,
            size: blob.size,
            parts,
            note,
            thumb: /^image\//.test(type) ? await cuThumb(blob) : "",
            at: Date.now(),
          });
          sent++;
        }
        if (sent)
          await S.db.doc("portal/" + S.me).update({
            lastAct: Date.now(),
            lastWhat:
              `sent you ${sent} file${sent === 1 ? "" : "s"}` +
              (note ? `: "${note.slice(0, 60)}"` : ""),
          });
        closeForm();
        toast(sent ? `Sent to James (${sent})` : "Nothing was sent");
      } catch (e) {
        showErr("Couldn't send. Check your connection and try again.");
        $("f-save").disabled = false;
      }
    },
    "cu-files",
  );
  const cuPick = attachPicker($("cu-pick"));
}
function cuListHtml(list, owner) {
  return list.length
    ? `<div class="cugrid">${list.map((u) => `<button type="button" class="cuitem" data-id="${esc(u.id)}">${u.thumb ? `<img src="${u.thumb}" alt="">` : `<span class="cuicon">${/pdf/.test(u.type) ? "📄" : "📎"}</span>`}<span class="cucap"><b>${esc(u.name)}</b><br><span class="who">${esc(stamp(u.at))}${u.saved ? " · saved to site" : ""}</span>${u.note ? `<br><span class="who">“${esc(u.note)}”</span>` : ""}</span></button>`).join("")}</div>`
    : `<div class="nothing">${owner ? "Nothing sent by the client yet." : "You haven't sent anything yet."}</div>`;
}
async function cuBlob(uid, u) {
  const parts = [];
  for (let k = 0; k < (u.parts || 1); k++) {
    const d = await S.db.doc(`portal/${uid}/uploads/${u.id}/parts/${k}`).get();
    parts.push(d.exists ? d.data().d || "" : "");
  }
  const bin = atob(parts.join(""));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: u.type || "application/octet-stream" });
}
async function cuOpen(uid, u, owner, c) {
  toast("Opening…");
  let blob;
  try {
    blob = await cuBlob(uid, u);
  } catch (e) {
    toast("Couldn't open it. Check your connection.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const img = /^image\//.test(u.type);
  openViewer(`${owner ? `<button type="button" class="btn backbtn" id="cu-back">‹ Back to portal</button>` : ""}<h3 style="margin:8px 0 4px">${esc(u.name)}</h3><div class="who">${owner ? "Sent by the client " : "Sent "}${esc(stamp(u.at))}${u.note ? ` · “${esc(u.note)}”` : ""}</div>
    ${/^audio\//.test(u.type || "") ? `<div class="audview" style="margin-top:10px">🎤 ${audTag(url, 'style="width:100%"')}</div>` : /^video\//.test(u.type || "") ? `<video src="${url}" controls playsinline style="width:100%;border-radius:8px;margin-top:10px;background:#000"></video>` : img ? `<img src="${url}" alt="${esc(u.name)}" style="max-width:100%;border-radius:8px;margin-top:10px">` : `<div class="notice" style="margin-top:10px">📄 ${esc(u.name)} · ${fsize(u.size || blob.size)}</div>`}
    <div class="actions" style="margin-top:10px">${!img && !/^audio\//.test(u.type || "") ? `<button type="button" class="btn primary" id="cu-view">Open</button>` : ""}${owner ? `<button type="button" class="btn ${img ? "primary" : ""}" id="cu-dl">⬇ Download</button>${c && c.site ? `<button type="button" class="btn" id="cu-site">${u.saved ? "✓ Saved to site" : "Add to " + esc(c.site)}</button>` : ""}<button type="button" class="linkdanger" id="cu-del">Delete</button>` : ""}</div>`);
  if ($("cu-back"))
    $("cu-back").onclick = () => {
      URL.revokeObjectURL(url);
      ptManager(c);
    };
  if ($("cu-view"))
    $("cu-view").onclick = async () => {
      const key = "cu-" + u.id;
      await fcOpen();
      await fcPut(key, blob);
      openFile(key, u.name, u.type);
    };
  if ($("cu-dl"))
    $("cu-dl").onclick = async () => {
      if (!S.dl) {
        toast("Downloads only work when the page is opened in claude.ai");
        return;
      }
      try {
        await S.dl.save({ filename: u.name, data: blob });
      } catch (e) {
        if (!(e && e.code === "declined")) toast("Download didn't go through");
      }
    };
  if ($("cu-site"))
    $("cu-site").onclick = async () => {
      if (u.saved) {
        toast("Already saved to the site");
        return;
      }
      if (!S.assets) {
        toast("Uploads aren't available here");
        return;
      }
      const b = $("cu-site");
      b.disabled = true;
      b.textContent = "Saving…";
      try {
        const a = await uploadFile(blob, u.name);
        if (img) {
          await S.db.doc(`sheets/${S.me}/photos/${newId()}`).set({
            assetId: a.id,
            site: c.site,
            category: "From the client",
            caption: (u.note || "From " + c.name).slice(0, 140),
            takenAt: u.at,
            date: iso(new Date(u.at)),
            created: Date.now(),
            fromClient: true,
          });
        } else
          await S.db.collection("docs").add({
            site: c.site,
            cat: "specs",
            title: u.name.replace(/\.[^.]+$/, ""),
            fileName: u.name,
            assetId: a.id,
            contentType: u.type,
            size: blob.size,
            path: "From the client",
            uploaded: Date.now(),
          });
        await S.db.doc(`portal/${uid}/uploads/${u.id}`).update({ saved: true });
        u.saved = true;
        b.textContent = "✓ Saved to site";
        toast(img ? "Added to the site's photos" : "Added to the site's Specs & docs");
      } catch (e) {
        b.disabled = false;
        b.textContent = "Add to " + c.site;
        toast(uploadErr(e));
      }
    };
  if ($("cu-del")) {
    let a = false;
    $("cu-del").onclick = async () => {
      if (!a) {
        a = true;
        $("cu-del").textContent = "Tap again to delete";
        return;
      }
      try {
        for (let k = 0; k < (u.parts || 1); k++)
          await S.db.doc(`portal/${uid}/uploads/${u.id}/parts/${k}`).delete();
        await S.db.doc(`portal/${uid}/uploads/${u.id}`).delete();
        toast("Deleted");
        ptManager(c);
      } catch (e) {
        toast("Couldn't delete");
      }
    };
  }
}
