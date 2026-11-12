/* ================= TRADES: SITES (plans, RAMS, specs, induction, chat per site) ================= */
import { openChat, siteChatId } from "../chat/chat.js";
import { mapDocs } from "../core/data.js";
import { pickField, pickVal } from "../core/fields.js";
import { $, esc, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S, docRef, ownerMode, siteGone, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, isWord, uploadErr, wordType } from "../files/files.js";
import { keepFolder, openFile } from "../files/in-app-files.js";
import { isNetErr } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { openPhoto, siteRec, vidExt, vidTag } from "../photos/photos.js";
import { keyDatesFor, keyTimeline } from "../planner/board.js";
import {
  empIndTodo,
  indFor,
  indSectionWithId,
  myInd,
  wireInduction,
} from "../safety/site-inductions.js";
import { docFolders } from "./doc-visibility.js";
import { jobNameOf, siteJobCard, siteLabel, sjCopy, wireSjPhotos } from "./job-details.js";
import { jobCard, myJobs } from "./job-sheets.js";
import { gmapDir, miniMap } from "./maps-pins.js";
import {
  DOC_CATS,
  RAMS_SIGN,
  docPath,
  docRow,
  docSite,
  mySign,
  unsignedRams,
  wireDocs,
} from "./plans-specs.js";
import { same } from "./project-pages.js";
import { openJob } from "../survey/door-window-survey.js";
export { empSitesView, folderIcon, loadSitePhotos, openDoc, plansView0, typeFor };
function sitePhotosFor(site) {
  if (!S.sph || !S.sph.loaded) return null;
  const own = ownerMode(),
    oid = (S.settings || {}).ownerId;
  const onlyJ = !own && (S.settings || {}).tradePhotos === "james";
  return S.sph.list
    .filter((p) => same(p.site, site) && (!onlyJ || p.who === S.me || p.who === oid))
    .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0));
}
async function loadSitePhotos(force) {
  if (S.sph && (S.sph.busy || (!force && Date.now() - S.sph.at < 60000))) return;
  S.sph = Object.assign(S.sph || { list: [] }, { busy: true, at: Date.now() });
  try {
    const us = await S.db.collection("sphotos").get();
    const out = [];
    for (const d of us.docs) {
      try {
        const snap = await S.db.collection("sphotos/" + d.id + "/p").get();
        mapDocs(snap).forEach((x) => {
          if (x.assetId) out.push(Object.assign({}, x, { who: x.who || d.id }));
        });
      } catch (e) {}
    }
    S.sph.list = out;
    S.sph.loaded = true;
  } catch (e) {
    S.sph.loaded = true;
  } finally {
    S.sph.busy = false;
  }
  render();
}
function empSitesView() {
  const names = new Set(S.docs.map(docSite));
  S.inductions.forEach((i) => names.add(i.site));
  (S.sites || []).filter((x) => !x.archived && x.name).forEach((x) => names.add(x.name));
  (S.sites || [])
    .filter((x) => x.archived)
    .forEach((x) => {
      [...names].forEach((n) => {
        if (same(n, x.name)) names.delete(n);
      });
    });
  ((S.settings || {}).deletedSites || []).forEach((g) => {
    [...names].forEach((n) => {
      if (same(n, g) && !siteRec(n)) names.delete(n);
    });
  });
  (S.mine.signoffs || [])
    .filter((x) => x.type === "sitejob" && x.hidden)
    .forEach((x) => {
      [...names].forEach((n) => {
        if (same(n, x.site)) names.delete(n);
      });
    });
  const sites = [...names].sort((a, b) =>
    a === "General" ? 1 : b === "General" ? -1 : a.localeCompare(b),
  );
  const todo = unsignedRams(),
    indTodo = empIndTodo();
  const site = S.f.folder && sites.includes(S.f.folder) ? S.f.folder : "";
  const toSign = (f) =>
    S.docs.filter((d) => RAMS_SIGN && docSite(d) === f && d.cat === "rams" && !mySign(d.id))
      .length + (indTodo.some((i) => i.site === f) ? 1 : 0);
  if (!site) {
    $("main").innerHTML =
      `${todo.length || indTodo.length ? `<div class="notice warn"><b>You have ${todo.length + indTodo.length} thing${todo.length + indTodo.length === 1 ? "" : "s"} to read and sign.</b> Open the site with the red tag.</div>` : ""}
      ${
        sites.length
          ? `<div class="folders">${sites
              .map((f) => {
                const g = S.docs.filter((d) => docSite(d) === f),
                  un = toSign(f);
                return `<button type="button" class="folder" data-f="${esc(f)}">${folderIcon()}<span class="fname">${esc(siteLabel(f))}</span>${jobNameOf(f) ? `<span class="who">📍 ${esc(f)}</span>` : ""}<span class="fmeta">${g.length ? g.length + " file" + (g.length === 1 ? "" : "s") : "No files yet"}${indFor(f) ? " · induction" : ""}</span>${un ? `<span class="tag bad">${un} to sign</span>` : ""}</button>`;
              })
              .join("")}</div>`
          : `<div class="empty"><strong>No sites yet</strong>James will add each job here with its plans, RAMS and documents.</div>`
      }`;
    $("main")
      .querySelectorAll(".folder")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.folder = b.dataset.f;
            S.f.stab = "";
            render();
          }),
      );
    return;
  }
  const docs = S.docs.filter((d) => docSite(d) === site);
  const dPlans = docs.filter((d) => (d.cat || "other") === "plans"),
    dRams = docs.filter((d) => d.cat === "rams"),
    dSpecs = docs.filter((d) => ["specs", "other"].includes(d.cat || "other"));
  const ramsTodo = RAMS_SIGN ? dRams.filter((d) => !mySign(d.id)).length : 0,
    ind = indFor(site),
    indDue = indTodo.some((i) => i.site === site);
  const kd = site === "General" ? [] : keyDatesFor(site, ""),
    sj =
      site === "General" ? [] : myJobs().filter((j) => same(j.site, site) && j.status !== "closed");
  const T = [
    ["plans", "Plans & drawings", "📐", dPlans.length],
    [
      "rams",
      "RAMS",
      "📝",
      dRams.length
        ? ramsTodo
          ? ramsTodo + " to sign"
          : RAMS_SIGN
            ? "All signed ✓"
            : dRams.length
        : 0,
    ],
    ["specs", "Specs & docs", "📄", dSpecs.length],
    ["induction", "Induction", "🦺", ind ? (indDue ? "To do" : "Done ✓") : "None"],
  ]
    .concat(
      site === "General"
        ? []
        : [
            [
              "photos",
              "Site photos",
              "📷",
              sitePhotosFor(site) === null ? "…" : sitePhotosFor(site).length || "None",
            ],
            ["jobs", "Jobs & snags", "✅", sj.length ? sj.length + " open" : "None"],
            ["dates", "Key dates", "📅", kd.length || "None"],
          ],
    )
    .concat([["chat", "Site chat", "💬", ""]]);
  if (site !== "General") loadSitePhotos();
  const tab = T.some((t) => t[0] === S.f.stab) ? S.f.stab : "";
  const grp = (list) => {
    if (!list.length) return '<div class="nothing">Nothing here yet.</div>';
    const g = {};
    list.forEach((d) => {
      const p = docPath(d) || "";
      (g[p] = g[p] || []).push(d);
    });
    return Object.keys(g)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map(
        (p) =>
          `<div class="day">${p ? `<div class="dayh"><span>${esc(p)}</span><span class="sum">${g[p].length}</span></div>` : ""}${g[
            p
          ]
            .sort((a, b) =>
              (a.title || "").localeCompare(b.title || "", undefined, { numeric: true }),
            )
            .map((d) => docRow(d, false))
            .join("")}</div>`,
      )
      .join("");
  };
  const P = {
    plans: grp(dPlans),
    rams:
      (ramsTodo
        ? `<div class="notice warn">Read and sign the RAMS marked below before you start work.</div>`
        : "") + grp(dRams),
    specs: grp(dSpecs),
    jobs: sj.length
      ? sj.map((j) => jobCard(j, false)).join("")
      : '<div class="nothing">No open jobs for you on this site.</div>',
    dates: kd.length
      ? keyTimeline(kd, false)
      : '<div class="nothing">No key dates for this site yet.</div>',
    photos: (() => {
      const L = sitePhotosFor(site);
      if (L === null) return '<div class="nothing">Loading photos…</div>';
      if (!L.length)
        return '<div class="nothing">No photos for this site yet. Add some from 📷 Photos.</div>';
      const g = {};
      L.forEach((p) => {
        const k = p.category || "Photos";
        (g[k] = g[k] || []).push(p);
      });
      return (
        `<div class="actions"><button type="button" class="btn primary" id="es-addph">+ Add photos</button></div>` +
        Object.keys(g)
          .sort()
          .map(
            (k) =>
              `<div class="flabel" style="margin-top:10px">${esc(k)} (${g[k].length})</div><div class="phgrid">${g[k].map((p) => `<button type="button" class="ph sph${/^video\//.test(p.contentType || "") || p.kind === "video" ? " phvid" : ""}" data-a="${esc(p.assetId)}" data-ct="${esc(p.contentType || "")}" data-k="${esc(p.kind || "")}">${p.kind === "video" ? vidTag(p.assetId) + '<span class="vidplay" aria-hidden="true">▶</span>' : `<img src="${blobUrl(p.assetId)}" alt="${esc(p.caption || "Site photo")}" loading="lazy">`}<span class="phcap"><b>${esc(p.who === S.me ? "You" : nameOf(p.who))}</b>${p.caption ? " · " + esc(p.caption) : ""}<br>${new Date(p.takenAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${p.lat != null ? " · 📍" : ""}</span></button>`).join("")}</div>`,
          )
          .join("")
      );
    })(),
    induction: ind
      ? indSectionWithId(site, false)
      : '<div class="nothing">There\'s no site induction for this site.</div>',
    chat: `<div class="actions"><button type="button" class="btn primary" id="es-chat">💬 Open the ${esc(site)} chat</button></div>`,
  };
  const head = `<div class="crumbs"><button type="button" class="pillbtn" id="es-all">‹ All sites</button><b>${esc(site)}</b></div>`;
  const sr = siteRec(site) || {};
  $("main").innerHTML =
    head +
    (tab
      ? `<div class="actions pjback"><button type="button" class="btn" id="es-back">‹ Back to ${esc(site)}</button><b class="pjsec">${(T.find((t) => t[0] === tab) || [])[2]} ${esc((T.find((t) => t[0] === tab) || [])[1])}</b></div>${P[tab]}`
      : `${
          site !== "General"
            ? (() => {
                const cp = sjCopy(site);
                const j = (cp && !cp.hidden && cp.job) || {};
                const work = j.work || sr.project || "";
                const q =
                  sr.lat != null ? sr.lat + "," + sr.lon : (cp && !cp.hidden && cp.address) || site;
                return `<div class="sitesum"><div class="sshead">${cp && !cp.hidden && cp.photo ? `<img class="ssph" src="${blobUrl(cp.photo)}" alt="Front of the property">` : ""}<div style="flex:1"><div class="who">Job address</div>${(() => {
                  const ad = (cp && !cp.hidden && cp.address) || "";
                  return `<button type="button" class="maplink ssaddr" data-addr="${esc(ad || site)}" ${sr.lat != null ? `data-lat="${sr.lat}" data-lon="${sr.lon}"` : ""} data-label="${esc(site)}">📍 ${esc(ad || site)}</button>${j.contactName || j.contactPhone ? `<div class="sscl2">👤 <b>${esc(j.contactName || "")}</b>${j.contactPhone ? ` <a href="tel:${esc(String(j.contactPhone).replace(/\s+/g, ""))}">📞 ${esc(j.contactPhone)}</a>` : ""}</div>` : ""}`;
                })()}${work ? `<div class="sswork">${esc(work)}</div>` : ""}
          ${j.start || j.finish ? `<div class="who">${j.start ? "Starts " + esc(shortDay(j.start)) : ""}${j.start && j.finish ? " · " : ""}${j.finish ? "Finishes " + esc(shortDay(j.finish)) : ""}</div>` : ""}</div></div>
          ${sr.lat != null ? `<div class="mmwrap">${miniMap(sr.lat, sr.lon, { addr: site, label: site })}</div>` : ""}
          <div class="actions"><a class="btn primary" href="${esc(gmapDir(q))}" target="_blank" rel="noopener">🚗 Directions</a><button type="button" class="btn maplink" data-addr="${esc(site)}" ${sr.lat != null ? `data-lat="${sr.lat}" data-lon="${sr.lon}"` : ""} data-label="${esc(site)}">📍 Maps &amp; share</button></div>
        ${siteJobCard(site, false, true) || `<div class="sjinner"><b>📋 Job details</b><div class="who">No job details have been written for this site yet. James adds them on his Sites tab.</div></div>`}</div>`;
              })()
            : ""
        }
      ${ramsTodo || indDue ? `<div class="notice warn"><b>To do here:</b> ${[indDue ? "site induction" : "", ramsTodo ? ramsTodo + " RAMS to read and sign" : ""].filter(Boolean).join(" and ")}.</div>` : ""}
      <div class="folders">${T.map(([k, l, ic, c]) => `<button type="button" class="folder pjtile es-tile" data-t="${k}"><span class="ricon" aria-hidden="true">${ic}</span><span class="fname">${esc(l)}</span><span class="who">${esc(String(c))}</span>${(k === "rams" && ramsTodo) || (k === "induction" && indDue) ? '<span class="tag bad">To sign</span>' : ""}</button>`).join("")}</div>`);
  $("es-all").onclick = () => {
    S.f.folder = "";
    S.f.stab = "";
    render();
  };
  if ($("es-back"))
    $("es-back").onclick = () => {
      S.f.stab = "";
      render();
    };
  $("main")
    .querySelectorAll(".es-tile")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.stab = b.dataset.t;
          render();
        }),
    );
  $("main")
    .querySelectorAll(".sph")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openFile(
            b.dataset.a,
            "Site photo" + (b.dataset.k === "video" ? "." + vidExt(b.dataset.ct) : ".jpg"),
            b.dataset.ct || (b.dataset.k === "video" ? "video/mp4" : "image/jpeg"),
          )),
    );
  if ($("es-addph"))
    $("es-addph").onclick = () => {
      openPhoto();
      setTimeout(() => {
        try {
          const sel = $("p-site");
          if (sel && [...sel.options].some((o) => o.value === site)) {
            sel.value = site;
            sel.dispatchEvent(new Event("change"));
          }
        } catch (e) {}
      }, 50);
    };
  if ($("es-chat"))
    $("es-chat").onclick = () => {
      const id = siteChatId(site);
      if (S.chats.find((c) => c.id === id)) openChat(id);
      else toast("There's no chat for this site yet. Ask James to start one.");
    };
  $("main")
    .querySelectorAll(".jobc")
    .forEach((b) => (b.onclick = () => openJob(b.dataset.j)));
  wireSjPhotos($("main"));
  wireDocs(false);
  wireInduction();
}
function plansView0() {
  const owner = ownerMode();
  const names = new Set(S.docs.map(docSite));
  S.inductions.forEach((i) => names.add(i.site));
  if (owner) siteNames().forEach((n) => names.add(n));
  [...names].forEach((n) => {
    if (n !== "General" && siteGone(n)) names.delete(n);
  });
  const folders = [...names].sort((a, b) =>
    a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b),
  );
  const todo = owner ? [] : unsignedRams(),
    indTodo = owner ? [] : empIndTodo();
  const open = S.f.folder && folders.includes(S.f.folder) ? S.f.folder : "";
  const banner =
    todo.length || indTodo.length
      ? `<div class="notice warn"><b>You have ${todo.length + indTodo.length} thing${todo.length + indTodo.length === 1 ? "" : "s"} to read and sign.</b> ${indTodo
          .map((i) => "Site induction (" + esc(i.site) + ")")
          .concat(todo.map((d) => esc(d.title) + " (" + esc(docSite(d)) + ")"))
          .join(", ")}</div>`
      : "";
  if (!open) {
    let html = `${owner ? `<div class="actions"><button class="btn primary" id="addDoc" type="button">+ Upload files or folders</button></div>` : ""}${banner}`;
    if (!folders.length)
      html += `<div class="empty"><strong>No folders yet</strong>${owner ? "Add your sites in Setup and each one gets a folder here. Upload plans, specs and RAMS into it." : "James will add a folder of plans, specs and RAMS for each job here."}</div>`;
    else
      html += `<div class="folders">${folders
        .map((f) => {
          const g = S.docs.filter((d) => docSite(d) === f);
          const ind = indFor(f);
          const un = owner
            ? 0
            : g.filter((d) => RAMS_SIGN && d.cat === "rams" && !mySign(d.id)).length +
              (ind && !myInd(ind) && indTodo.includes(ind) ? 1 : 0);
          const subs = new Set(g.map((d) => docPath(d).split("/")[0]).filter(Boolean)).size;
          let missing = 0;
          if (owner && RAMS_SIGN) {
            const ids = teamIds();
            g.filter((d) => d.cat === "rams").forEach((d) =>
              ids.forEach((id) => {
                if (!(S.data.signoffs[id] || []).some((s) => s.docId === d.id)) missing++;
              }),
            );
          }
          return `<button type="button" class="folder" data-f="${esc(f)}">${folderIcon()}
        <span class="fname">${esc(siteLabel(f))}</span>${jobNameOf(f) ? `<span class="who">📍 ${esc(f)}</span>` : ""}
        <span class="fmeta">${g.length ? `${g.length} file${g.length === 1 ? "" : "s"}${subs ? ` · ${subs} folder${subs === 1 ? "" : "s"}` : ""}` : "No files"}${ind ? " · induction" : ""}</span>
        ${un ? `<span class="tag bad">${un} to sign</span>` : ""}${missing ? `<span class="tag bad">${missing} RAMS signature${missing === 1 ? "" : "s"} missing</span>` : ""}</button>`;
        })
        .join("")}</div>`;
    $("main").innerHTML = html;
    if ($("addDoc")) $("addDoc").onclick = () => openDoc("", "");
    $("main")
      .querySelectorAll(".folder")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.folder = b.dataset.f;
            S.f.path = "";
            render();
          }),
      );
    return;
  }
  const path = S.f.path || "";
  const inSite = S.docs.filter((d) => docSite(d) === open);
  const pre = path ? path + "/" : "";
  const below = inSite.filter((d) => (docPath(d) + "/").startsWith(pre) || !path);
  const subs = [
    ...new Set(
      below
        .map((d) => docPath(d))
        .filter((p) => p && (p + "/").startsWith(pre) && p !== path)
        .map((p) => p.slice(pre.length).split("/")[0]),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const here = inSite.filter((d) => docPath(d) === path);
  const segs = path ? path.split("/") : [];
  let html = `<div class="crumbs"><button type="button" class="pillbtn" data-crumb="-1">‹ All folders</button>
    <button type="button" class="crumb" data-crumb="0">${esc(open)}</button>${segs.map((s, i) => `<span class="who">›</span><button type="button" class="crumb" data-crumb="${i + 1}">${esc(s)}</button>`).join("")}</div>
    <div class="actions">${owner ? `<button class="btn primary" id="addDoc" type="button">+ Upload here</button>` : ""}${inSite.length ? `<button class="btn" id="keepFolder" type="button">Keep this folder in the app</button>` : ""}${owner && path ? `<button class="btn" id="delFolder" type="button">Delete this folder</button>` : ""}</div>${!path ? banner : ""}`;
  if (!path) html += indSectionWithId(open, owner);
  if (subs.length)
    html += `<div class="folders">${subs
      .map((s) => {
        const p = pre + s;
        const n = inSite.filter((d) => (docPath(d) + "/").startsWith(p + "/")).length;
        return `<button type="button" class="folder sub" data-p="${esc(p)}">${folderIcon()}<span class="fname">${esc(s)}</span><span class="fmeta">${n} file${n === 1 ? "" : "s"}</span></button>`;
      })
      .join("")}</div>`;
  if (!here.length && !subs.length)
    html += `<div class="empty"><strong>This folder is empty</strong>${owner ? "Upload files or a whole folder of plans, specs or RAMS for this site." : "Nothing has been added here yet."}</div>`;
  DOC_CATS.forEach(([k, l]) => {
    const list = here
      .filter((d) => (d.cat || "other") === k)
      .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { numeric: true }));
    if (!list.length) return;
    html += `<div class="day"><div class="dayh"><span>${esc(l)}</span><span class="sum">${list.length}</span></div>${list.map((d) => docRow(d, owner)).join("")}</div>`;
  });
  $("main").innerHTML = html;
  $("main")
    .querySelectorAll("[data-crumb]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.crumb;
          if (i < 0) {
            S.f.folder = "";
            S.f.path = "";
          } else S.f.path = segs.slice(0, i).join("/");
          render();
        }),
    );
  $("main")
    .querySelectorAll(".folder.sub")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.path = b.dataset.p;
          render();
        }),
    );
  if ($("addDoc")) $("addDoc").onclick = () => openDoc(open, path);
  if ($("keepFolder"))
    $("keepFolder").onclick = () =>
      keepFolder(inSite.filter((d) => (docPath(d) + "/").startsWith(pre) || !path));
  const df = $("delFolder");
  if (df)
    df.onclick = async () => {
      const list = inSite.filter((d) => (docPath(d) + "/").startsWith(pre));
      if (df.dataset.armed !== "1") {
        df.dataset.armed = "1";
        df.textContent = `Tap again to delete ${list.length} file${list.length === 1 ? "" : "s"}`;
        return;
      }
      df.disabled = true;
      let n = 0;
      for (const d of list) {
        try {
          await docRef(d).delete();
          S.assets && S.assets.delete(d.assetId).catch(() => {});
          n++;
        } catch (e) {}
      }
      S.f.path = segs.slice(0, -1).join("/");
      toast(`Deleted ${n} file${n === 1 ? "" : "s"}`);
      render();
    };
  wireDocs(owner);
  wireInduction();
}
function folderIcon() {
  return `<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M2 6a3 3 0 0 1 3-3h10l4 4h16a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="var(--accent)"/><path d="M2 11h36v16a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="var(--folder)"/></svg>`;
}
const OK_TYPES =
  /^(application\/pdf|image\/(jpeg|png|webp|gif|svg\+xml)|text\/(plain|csv|markdown)|application\/json)$/;
function typeFor(f) {
  if (isWord(f)) return wordType(f.name, f.type);
  if (f.type && OK_TYPES.test(f.type)) return f.type;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  return (
    {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      txt: "text/plain",
      csv: "text/csv",
      md: "text/markdown",
      json: "application/json",
    }[ext] || ""
  );
}
function openDoc(folder, path, cat0) {
  if (!S.assets) {
    toast("Uploads aren't available here. Open the page in claude.ai.");
    return;
  }
  setFormType("doc");
  setEditing(null);
  const canDir = "webkitdirectory" in document.createElement("input");
  openSheet(
    `<h3 id="sheettitle">Upload plans, specs or RAMS</h3>
    ${pickField("d-site", "Site folder", ["General"].concat(siteNames()), folder || "", "e.g. 12 Marine Way, Exmouth")}
    <label for="d-path">Inside folder (optional: pick one or type a new name)<input id="d-path" list="d-pathlist" maxlength="200" placeholder="e.g. Drawings/Structural" value="${esc(path || "")}"></label><datalist id="d-pathlist">${docFolders(
      folder || "",
      null,
    )
      .map((f) => `<option value="${esc(f)}">`)
      .join("")}</datalist>
    <div><div class="flabel">Type</div><div class="seg" id="d-cat">${DOC_CATS.map(([k, l], i) => `<button type="button" data-v="${k}" aria-pressed="${cat0 ? k === cat0 : i === 0}">${l}</button>`).join("")}</div>
      <div class="who" style="margin-top:6px">Files with "RAMS", "risk assessment" or "method statement" in the name are put under RAMS automatically.</div></div>
    <label for="d-file">Choose files<input id="d-file" type="file" accept="application/pdf,image/*,.txt,.csv,.md,.json,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple></label>
    ${canDir ? `<label for="d-dir">Or choose a whole folder (keeps its subfolders)<input id="d-dir" type="file" webkitdirectory multiple></label>` : `<div class="who">To upload a whole folder, use a computer. On a phone you can choose several files at once.</div>`}
    <label for="d-title">Title (only when uploading one file)<input id="d-title" maxlength="100" placeholder="e.g. Ground floor plan rev C"></label>
    <label class="tick"><input type="checkbox" id="d-repl" checked> <span>If a file with the same name is already in this folder, replace it with the new one and keep the old one under 🕘 Previous versions</span></label>
    <div class="who">PDFs, Word documents and images up to 20 MB each (Word up to 15 MB). Excel and CAD files can't be stored, so save them as PDF first. They'll be skipped and listed.</div>
    <div class="who" id="d-prog"></div>
    ${formFoot(false, "Upload")}`,
    saveDocs,
    null,
  );
  $("d-cat")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $("d-cat")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
  if ($("d-dir"))
    $("d-dir").onchange = () => {
      const n = $("d-dir").files.length;
      $("d-prog").textContent = n ? `${n} file${n === 1 ? "" : "s"} in that folder.` : "";
    };
}
async function saveDocs() {
  const site = pickVal("d-site"),
    cat = $("d-cat").querySelector('[aria-pressed="true"]').dataset.v,
    title = $("d-title").value.trim();
  const base = $("d-path")
    .value.trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  const files = [...($("d-file").files || []), ...(($("d-dir") && $("d-dir").files) || [])].filter(
    (f) =>
      !/^\./.test(f.name) &&
      !/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/.test(f.webkitRelativePath || f.name),
  );
  if (!site) {
    showErr("Choose the site folder.");
    return;
  }
  if (!files.length) {
    showErr("Choose some files or a folder.");
    return;
  }
  $("f-save").disabled = true;
  let ok = 0;
  const skipped = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const rel = (f.webkitRelativePath || "").split("/").slice(0, -1).join("/");
    const path = [base, rel].filter(Boolean).join("/");
    $("d-prog").textContent = `Uploading ${i + 1} of ${files.length}: ${f.name}`;
    const type = typeFor(f);
    if (!type) {
      skipped.push(f.name + " (type)");
      continue;
    }
    if (f.size > 20 * 1048576) {
      skipped.push(f.name + " (over 20 MB)");
      continue;
    }
    const fcat = /\b(rams|risk assessment|method statement|induction)\b/i.test(f.name)
      ? "rams"
      : cat;
    try {
      const up = await S.assets.upload(f, { type });
      const old =
        $("d-repl") && $("d-repl").checked
          ? (S.docs || []).find(
              (d) =>
                same(d.site || "General", site) &&
                String(d.path || "") === path &&
                d.assetId &&
                ((d.fileName || "").toLowerCase() === f.name.toLowerCase() ||
                  (files.length === 1 && title && same(d.title || "", title))),
            )
          : null;
      if (old) {
        const prev = {
          assetId: old.assetId,
          fileName: old.fileName,
          contentType: old.contentType,
          size: old.size || 0,
          uploaded: old.uploaded,
          replacedAt: Date.now(),
        };
        const vers = (old.versions || []).concat([prev]);
        await docRef(old).update({
          assetId: up.id,
          fileName: f.name,
          contentType: up.contentType || type,
          size: up.sizeBytes || f.size,
          uploaded: Date.now(),
          versions: vers,
        });
        Object.assign(old, { assetId: up.id, versions: vers });
        ok++;
        S.__repl = (S.__repl || 0) + 1;
        continue;
      }
      await S.db.collection("docs").add({
        site,
        path,
        cat: fcat,
        title: files.length === 1 && title ? title : f.name.replace(/\.[^.]+$/, ""),
        fileName: f.name,
        assetId: up.id,
        contentType: up.contentType || type,
        size: up.sizeBytes || f.size,
        uploaded: Date.now(),
      });
      ok++;
    } catch (e) {
      skipped.push(
        f.name +
          " (" +
          (e && e.code === "too_large"
            ? "too big"
            : e && e.code === "unsupported_type"
              ? "type"
              : "failed") +
          ")",
      );
      if (e && !isNetErr(e) && e.code !== "too_large" && e.code !== "unsupported_type") {
        showErr(uploadErr(e));
        break;
      }
    }
  }
  $("f-save").disabled = false;
  if (skipped.length) {
    $("d-prog").innerHTML =
      `Uploaded ${ok}. <b>Not uploaded (${skipped.length}):</b> ${skipped.slice(0, 30).map(esc).join(", ")}${skipped.length > 30 ? "…" : ""}`;
    $("f-save").textContent = "Upload again";
    S.f.folder = site;
    S.f.path = base;
    if (ok) render();
    return;
  }
  const rp = S.__repl || 0;
  S.__repl = 0;
  S.f.folder = site;
  S.f.path = base;
  closeForm();
  toast(
    `Uploaded ${ok} file${ok === 1 ? "" : "s"}${rp ? ` · ${rp} replaced an older version (see 🕘 Previous versions)` : ""}`,
  );
  render();
}
