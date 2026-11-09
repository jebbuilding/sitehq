/* ================= PLANS & SPECS ================= */
import { $, esc, fsize, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S, docRef, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { saveAsset } from "../files/files.js";
import { FC, openFile } from "../files/in-app-files.js";
import { submitJob } from "../files/outbox.js";
import { BIN_DAYS, binDelete, binIsImg } from "../owner/deleted-items.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { sigPad } from "../safety/site-inductions.js";
import { cdmShare, docMove } from "./doc-visibility.js";
import { empSitesView, plansView0 } from "./trade-sites.js";
export {
  DOC_CATS,
  RAMS_SIGN,
  catName,
  docPath,
  docRow,
  docSite,
  mySign,
  openSign,
  plansView,
  unsignedRams,
  wireDocs,
};
const DOC_CATS = [
  ["plans", "Plans"],
  ["specs", "Specs"],
  ["rams", "RAMS & inductions"],
  ["other", "Other"],
];
const catName = (k) => (DOC_CATS.find((c) => c[0] === k) || DOC_CATS[3])[1];
function mySign(docId) {
  return S.mine.signoffs.find((s) => s.docId === docId);
}
/* trades no longer have to sign RAMS (James turned it off); RAMS are still there to read */
const RAMS_SIGN = false;
function unsignedRams() {
  return RAMS_SIGN ? S.docs.filter((d) => d.cat === "rams" && !mySign(d.id)) : [];
}
function signStatus(d) {
  const ids = teamIds();
  const signed = [],
    not = [];
  ids.forEach((id) => {
    const s = (S.data.signoffs[id] || []).find((x) => x.docId === d.id);
    s
      ? signed.push(
          `${esc(nameOf(id))} (${new Date(s.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`,
        )
      : not.push(esc(nameOf(id)));
  });
  return `<div class="sub"><b style="color:var(--ink)">Signed ${signed.length} of ${ids.length}</b>${signed.length ? ": " + signed.join(", ") : ""}</div>${not.length ? `<div class="sub" style="color:var(--danger)">Not signed yet: ${not.join(", ")}</div>` : ""}`;
}
function docRow(d, owner) {
  const s = !owner && d.cat === "rams" ? mySign(d.id) : null;
  return `<div class="entry doc" data-d="${esc(d.id)}"><div class="main">
    <div class="job"><span class="tag ${d.cat === "plans" ? "day" : d.cat === "rams" ? "bad" : ""}">${esc(catName(d.cat))}</span>${s ? '<span class="tag ok">Signed</span>' : ""}${d._priv ? '<span class="tag" title="Only you can see this">🔒 Only me</span>' : ""}${(d.who || []).length && !d._priv ? `<span class="tag" title="${esc(d.who.map(nameOf).join(", "))}">👤 ${d.who.length} trade${d.who.length === 1 ? "" : "s"}</span>` : ""}${d.clientShared ? '<span class="tag" title="Sent to the client portal">🏡 Client</span>' : ""}${esc(d.title || d.fileName)}</div>
    <div class="sub">${esc(d.site || "General")}${docPath(d) ? " › " + esc(docPath(d).split("/").join(" › ")) : ""} · ${esc(d.fileName || "")}${d.size ? ` · ${fsize(d.size)}` : ""} · added ${stamp(d.uploaded)}</div>
    ${owner && d.cat === "rams" && RAMS_SIGN ? signStatus(d) : ""}
    ${s ? `<div class="sub">You signed this on ${stamp(s.signedAt)}</div>` : ""}
    <div class="filerow"><button type="button" class="pillbtn d-open">Open</button>${(d.versions || []).length ? `<button type="button" class="pillbtn d-vers">🕘 Previous versions (${d.versions.length})</button><span class="tag ok">Rev ${(d.versions || []).length + 1} · latest</span>` : ""}${FC.ids.has(d.assetId) ? '<span class="who">Kept in the app</span>' : ""}${owner ? `<button type="button" class="pillbtn d-save">Download</button><button type="button" class="pillbtn d-share">👁 Who can see</button><button type="button" class="pillbtn d-move">📁 Move</button>` : ""}
    ${!owner && d.cat === "rams" && !s && RAMS_SIGN ? `<button type="button" class="btn primary d-sign" style="padding:7px 14px">Read and sign</button>` : ""}
    ${owner ? `<button type="button" class="linkdanger d-del">Remove</button>` : ""}</div></div></div>`;
}
function wireDocs(owner) {
  $("main")
    .querySelectorAll(".doc")
    .forEach((row) => {
      const d = S.docs.find((x) => x.id === row.dataset.d);
      if (!d) return;
      row.querySelector(".d-open").onclick = () =>
        openFile(d.assetId, d.fileName || d.title, d.contentType);
      const sv = row.querySelector(".d-save");
      if (sv) sv.onclick = () => saveAsset(d.assetId, d.fileName || "document");
      const sg = row.querySelector(".d-sign");
      if (sg) sg.onclick = () => openSign(d);
      const vb = row.querySelector(".d-vers");
      if (vb) vb.onclick = () => docVersions(d, owner);
      const shb = row.querySelector(".d-share");
      if (shb) shb.onclick = () => cdmShare(d, null);
      const mvb = row.querySelector(".d-move");
      if (mvb) mvb.onclick = () => docMove(d);
      const x = row.querySelector(".d-del");
      if (x)
        x.onclick = async () => {
          if (x.dataset.armed !== "1") {
            x.dataset.armed = "1";
            x.textContent = (d.versions || []).length
              ? "Tap again to remove (and its old versions)"
              : "Tap again to remove";
            return;
          }
          try {
            const ok = await binDelete({
              assets: [d.assetId],
              title:
                (d.title || d.name || d.fileName || "Document") + (d.site ? " · " + d.site : ""),
              type: d.contentType || d.type || "application/pdf",
              thumb: binIsImg(d.contentType || d.type || "") ? d.assetId : "",
            });
            if (ok) toast("Removed · in Setup › Deleted items for " + BIN_DAYS + " days");
          } catch (e) {
            toast("Couldn't remove");
          }
        };
    });
}
/* earlier versions of a drawing / document that was replaced by uploading a file with the same name */
function docVersions(d, owner) {
  const vs = (d.versions || []).slice().sort((a, b) => (b.uploaded || 0) - (a.uploaded || 0));
  const n = vs.length + 1;
  openViewer(`<h3 style="font-family:var(--f-display);margin:0">🕘 ${esc(d.title || d.fileName)}</h3><div class="who">${esc(d.site || "General")}</div>
    <div class="vrow cur"><span><b>Rev ${n} · current</b><br><span class="who">${esc(d.fileName || "")} · uploaded ${esc(stamp(d.uploaded))}</span></span><button type="button" class="btn v-open" data-i="-1">Open</button></div>
    <div class="notice warn" style="margin:8px 0">Older versions below are kept for reference only. Don't build from them.</div>
    ${vs.map((v, i) => `<div class="vrow"><span><b>Rev ${n - 1 - i}</b> <span class="tag">Superseded</span><br><span class="who">${esc(v.fileName || "")} · uploaded ${esc(stamp(v.uploaded))}${v.replacedAt ? " · replaced " + esc(stamp(v.replacedAt)) : ""}</span></span><button type="button" class="btn v-open" data-i="${i}">Open</button>${owner ? `<button type="button" class="pillbtn v-cur" data-i="${i}">Make current</button><button type="button" class="linkdanger v-del" data-i="${i}">Delete</button>` : ""}</div>`).join("")}`);
  document.querySelectorAll("#viewer .v-open").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.i;
        const v = i < 0 ? d : vs[i];
        openFile(v.assetId, v.fileName || d.title, v.contentType || d.contentType);
      }),
  );
  document.querySelectorAll("#viewer .v-del").forEach(
    (b) =>
      (b.onclick = async () => {
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Tap again to delete";
          return;
        }
        const v = vs[+b.dataset.i];
        const rest = (d.versions || []).filter((x) => x.assetId !== v.assetId);
        try {
          await docRef(d).update({ versions: rest });
          d.versions = rest;
          S.assets && S.assets.delete(v.assetId).catch(() => {});
          toast("Old version deleted");
          if (rest.length) docVersions(d, owner);
          else {
            closeViewer();
            render();
          }
        } catch (e) {
          toast("Couldn't delete");
        }
      }),
  );
  document.querySelectorAll("#viewer .v-cur").forEach(
    (b) =>
      (b.onclick = async () => {
        const v = vs[+b.dataset.i];
        const cur = {
          assetId: d.assetId,
          fileName: d.fileName,
          contentType: d.contentType,
          size: d.size || 0,
          uploaded: d.uploaded,
          replacedAt: Date.now(),
        };
        const rest = (d.versions || []).filter((x) => x.assetId !== v.assetId).concat([cur]);
        const patch = {
          assetId: v.assetId,
          fileName: v.fileName,
          contentType: v.contentType,
          size: v.size || 0,
          uploaded: Date.now(),
          versions: rest,
        };
        try {
          await docRef(d).update(patch);
          Object.assign(d, patch);
          toast("That version is now the current one");
          docVersions(d, owner);
          render();
        } catch (e) {
          toast("Couldn't change it");
        }
      }),
  );
}
function openSign(d) {
  setFormType("sign");
  setEditing(null);
  openSheet(
    `<h3 id="sheettitle">Read and sign</h3>
    <div><b>${esc(d.title)}</b><div class="who">${esc(d.site || "General")} · ${esc(catName(d.cat))}</div></div>
    <div class="notice">Open and read the whole document before you sign.</div>
    <button type="button" class="btn" id="s-dl">Open ${esc(d.fileName || "document")}</button>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="s-ok"> ${d.needSign && d.signStmt ? esc(d.signStmt) : "I have read and understood this document and will follow it."}</label>
    ${d.needSign ? `<label for="s-name">Your full name<input id="s-name" maxlength="80" value="${esc(S.myProfile.name || "")}"></label><div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn" id="s-clr">Clear</button></div><canvas id="s-sig" class="sigpad" aria-label="Signature box"></canvas></div>` : `<div class="who">Signing as <b>${esc(S.myProfile.name)}</b>. The date and time are recorded.</div>`}
    ${formFoot(false, "Sign")}`,
    async () => {
      if (!$("s-ok").checked) {
        showErr("Tick the box to confirm you've read it.");
        return;
      }
      const nm = $("s-name") ? $("s-name").value.trim() : S.myProfile.name;
      if (d.needSign) {
        if (!nm) {
          showErr("Add your name");
          return;
        }
        if (!sSig || !sSig.drawn) {
          showErr("Please sign in the box");
          return;
        }
      }
      $("f-save").disabled = true;
      try {
        const r = await submitJob({
          coll: "signoffs",
          docId: d.id,
          data: Object.assign(
            {
              docId: d.id,
              title: d.title,
              site: d.site || "General",
              name: nm,
              signedAt: Date.now(),
              created: Date.now(),
            },
            d.needSign ? { sig: sSig.data(), signOf: d.signOf || "" } : {},
          ),
        });
        closeForm();
        toast(
          r === "queued"
            ? "Signature kept on this phone. It will send when you have signal."
            : "Signed",
        );
        render();
      } catch (e) {
        showErr("Couldn't save. Ask James to check you're an Editor on this page.");
        $("f-save").disabled = false;
      }
    },
    "s-dl",
  );
  let sSig = null;
  if ($("s-sig")) {
    sSig = sigPad($("s-sig"));
    $("s-clr").onclick = () => sSig.clear();
  }
  $("s-dl").onclick = () => openFile(d.assetId, d.fileName || d.title, d.contentType);
}
const docSite = (d) => d.site || "General";
const docPath = (d) => (d.path || "").replace(/^\/+|\/+$/g, "");
function plansView() {
  if (!ownerMode()) return empSitesView();
  const keep = S.docs;
  S.docs = keep.filter((d) => (d.cat || "other") !== "plans");
  try {
    plansView0();
  } finally {
    S.docs = keep;
  }
  const n = keep.filter((d) => d.cat === "plans").length;
  $("main").insertAdjacentHTML(
    "afterbegin",
    `<div class="notice">📐 Plans and drawings${n ? ` (${n})` : ""} are now kept in each site: <b>Sites</b> › choose the site › <b>Plans &amp; drawings</b>. Trades still see them in their Plans &amp; RAMS tab.</div>`,
  );
}
