/* ===== Delete a client or a site (PIN protected) ===== */
import { clientSites } from "../clients/address-book.js";
import { saveClient } from "../clients/clients.js";
import { ptCl, ptOf } from "../clients/portal.js";
import { clAddr } from "../clients/stages-planner.js";
import { askOwnerPin } from "../core/dictation.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { RAW, S, applyGone, archivedSites, docRef, isArchivedSite } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { auditFirst } from "./deletion-record.js";
import { siteRec } from "../photos/photos.js";
import { projectSites, same } from "../sites/project-pages.js";
import { siteClient } from "../sites/summary.js";
export { deleteClientFlow, deleteSiteFlow, deleteSitesPicker };
function deleteClientFlow(c) {
  c = ptCl(c);
  const sites = clientSites(c).filter((n) => siteRec(n));
  const p = ptOf(c);
  openSheet(
    `<h3 id="sheettitle">🗑 Delete ${esc(c.name)}?</h3><div class="notice warn" style="margin:0">This permanently removes the client: their details, notes, photos list, sign-off history${c.gdpr ? ", GDPR consent record" : ""}. It can't be undone.${c.gdpr ? " Download the GDPR record first if you need to keep it." : ""}</div>
    ${p ? `<div class="who">Their portal will be closed, so they can no longer log in to it.</div>` : ""}
    ${sites.length ? `<label class="inl" style="margin-top:8px;color:var(--ink);font-weight:500"><input type="checkbox" id="dc-sites"> Also delete their site${sites.length === 1 ? "" : "s"}: ${esc(sites.join(", "))}</label><div class="who">Leave this unticked to keep the site${sites.length === 1 ? "" : "s"} (timesheets and photos stay either way).</div>` : ""}
    ${formFoot(false, "Delete client")}`,
    () => {
      const alsoSites = $("dc-sites") ? $("dc-sites").checked : false;
      askOwnerPin("Enter your PIN to delete " + c.name + ".", async () => {
        if (
          !(await auditFirst(
            "Client deleted",
            c.name,
            [
              clAddr(c),
              c.phone,
              c.email,
              c.stage && "Stage: " + c.stage,
              c.gdpr && c.gdpr.status === "signed" ? "Had a signed GDPR form" : "",
            ]
              .filter(Boolean)
              .join(" · "),
            c,
          ))
        )
          return;
        $("f-save").disabled = true;
        try {
          if (p)
            await S.db
              .doc("portal/" + p.id)
              .update({ revoked: true, linked: false })
              .catch(() => {});
          if (alsoSites) for (const n of sites) await deleteSiteNow(n, true);
          try {
            for (const x of (RAW.plan || []).filter((x) => x.clientId === c.id))
              await S.db.doc("plan/" + x.id).delete();
            for (const x of (RAW.planPrivate || []).filter((x) => x.clientId === c.id))
              await S.db.doc("planprivate/" + x.id).delete();
          } catch (e) {}
          await S.db.doc("todos/" + c.id).delete();
          S.clients = (S.clients || []).filter((x) => x.id !== c.id);
          applyGone();
          closeForm();
          closeViewer();
          toast(
            c.name +
              " deleted" +
              (alsoSites && sites.length
                ? " with their site" + (sites.length === 1 ? "" : "s")
                : ""),
          );
          render();
        } catch (e) {
          showErr("Couldn't delete. Check your connection.");
          $("f-save").disabled = false;
        }
      });
    },
    null,
  );
  $("f-save").classList.add("danger");
}
async function deleteSiteNow(site, quiet, withDocs) {
  const sr = siteRec(site);
  {
    const ind = (RAW.inductions || []).filter((x) => same(x.site, site)),
      jobs = (RAW.jobs || []).filter((x) => same(x.site, site)),
      docs = withDocs
        ? (RAW.docs || [])
            .concat(RAW.privDocs || [])
            .filter((x) => same(x.site, site))
            .map((d) => ({
              name: d.name || d.title,
              path: d.path,
              assetId: d.assetId,
              at: d.at || d.created,
            }))
        : [];
    if (
      !(await auditFirst(
        "Site deleted",
        site,
        `${ind.length} induction record${ind.length === 1 ? "" : "s"} (with signatures), ${jobs.length} job sheet${jobs.length === 1 ? "" : "s"}${withDocs ? `, ${docs.length} document${docs.length === 1 ? "" : "s"}` : ""}.`,
        { site: sr || { name: site }, inductions: ind, jobs, docs },
      ))
    )
      throw new Error("audit");
  }
  /* tidy up what belongs only to this site: its induction, planner entries, site chat (archived), and (if asked) its documents */
  try {
    for (const i of (RAW.inductions || []).filter((x) => same(x.site, site)))
      await S.db.doc("inductions/" + i.id).delete();
  } catch (e) {}
  try {
    for (const p of (RAW.plan || []).filter((x) => same(x.site, site)))
      await S.db.doc("plan/" + p.id).delete();
    for (const p of (RAW.planPrivate || []).filter((x) => same(x.site, site)))
      await S.db.doc("planprivate/" + p.id).delete();
  } catch (e) {}
  try {
    for (const c of (RAW.chats || []).filter((x) => x.site && same(x.site, site) && !x.archived))
      await S.db.doc("chats/" + c.id).update({ archived: true });
  } catch (e) {}
  try {
    for (const j of (RAW.jobs || []).filter((x) => same(x.site, site)))
      await S.db.doc("jobs/" + j.id).delete();
  } catch (e) {}
  if (withDocs) {
    try {
      for (const d of (RAW.docs || []).concat(RAW.privDocs || []).filter((x) => same(x.site, site)))
        await docRef(d).delete();
    } catch (e) {}
  }
  if (sr && sr.id) {
    await S.db.doc("sites/" + sr.id).delete();
    try {
      await S.db.doc("todos/sj-" + sr.id).delete();
    } catch (e) {}
  }
  /* gone from everywhere (James, Nov 2026): the site's own notes – programme, site diary, building control – and every
     client that pointed at it (their site, their other sites, their other jobs' sites) no longer does */
  try {
    const mine = (L) => (L || []).filter((x) => x && same(x.site, site));
    for (const r of mine(S.programmes)
      .concat(mine(S.siteDiary))
      .concat(mine(S.bcReports))
      .filter((r) => r.id))
      await S.db.doc("todos/" + r.id).delete();
    S.programmes = (S.programmes || []).filter((x) => !same(x.site, site));
    S.siteDiary = (S.siteDiary || []).filter((x) => !same(x.site, site));
    S.bcReports = (S.bcReports || []).filter((x) => !same(x.site, site));
  } catch (e) {}
  try {
    for (const c of S.clients || []) {
      const hit =
        same(c.site, site) ||
        (c.sites || []).some((n) => same(n, site)) ||
        (c.moreJobs || []).some((j) => same(j.site, site));
      if (!hit) continue;
      await saveClient(
        Object.assign({}, c, {
          site: same(c.site, site) ? "" : c.site || "",
          sites: (c.sites || []).filter((n) => !same(n, site)),
          moreJobs: (c.moreJobs || []).map((j) =>
            same(j.site, site) ? Object.assign({}, j, { site: "" }) : j,
          ),
          notes: (c.notes || []).concat([
            { text: "Site deleted: " + site, at: Date.now(), auto: true },
          ]),
        }),
      );
    }
  } catch (e) {}
  try {
    const gone = ((S.settings || {}).deletedSites || [])
      .filter((n) => !same(n, site))
      .concat([site])
      .slice(-200);
    await S.db.doc("settings/app").update({ deletedSites: gone });
    S.settings = Object.assign({}, S.settings, { deletedSites: gone });
  } catch (e) {}
  if (sr) S.sites = (S.sites || []).filter((x) => x.id !== sr.id);
  if (same(S.f.proj, site)) {
    S.f.proj = "";
    S.f.projList = true;
  }
  if (!quiet) toast(site + " deleted");
}
/* delete several sites at once (including ones that only exist because something was logged against the name) */
function deleteSitesPicker() {
  const cur = projectSites(),
    arc = archivedSites()
      .map((x) => x.name)
      .filter((n) => !cur.some((c) => same(c, n)));
  const all = cur.concat(arc);
  openSheet(
    `<h3 id="sheettitle">🗑 Delete sites</h3><div class="who">Tick the sites to delete. Their timesheets, day work, photos and documents are kept for your records; the site just disappears from the lists for you and the trades. Clients are kept.</div>
    <input type="search" id="dsp-q" placeholder="🔍 Search sites" aria-label="Search sites">
    <div class="dsp-list">${all.map((n) => `<label class="tick dsp-row" data-q="${esc(n.toLowerCase())}"><input type="checkbox" class="dsp-c" value="${esc(n)}"> <span>${esc(n)}${isArchivedSite(n) ? ' <span class="tag">In storage</span>' : ""}${siteRec(n) ? "" : ' <span class="who">(only a name on logged work)</span>'}</span></label>`).join("") || '<div class="nothing">No sites.</div>'}</div>
    <label class="tick"><input type="checkbox" id="dsp-docs" checked> <span>Also delete their plans, RAMS and documents</span></label>
    <div class="notice warn" style="margin:0">Deleting can't be undone. Inductions, jobs, planner entries and site chats go too. If you just want a site out of the way, open it and use <b>Move to storage</b>.</div>
    ${formFoot(false, "Delete ticked sites")}`,
    () => {
      const wd = $("dsp-docs").checked;
      const pick = [...document.querySelectorAll(".dsp-c:checked")].map((i) => i.value);
      if (!pick.length) {
        showErr("Tick at least one site.");
        return;
      }
      askOwnerPin(
        `Enter your PIN to delete ${pick.length} site${pick.length === 1 ? "" : "s"}.`,
        async () => {
          $("f-save").disabled = true;
          try {
            for (const n of pick) await deleteSiteNow(n, true, wd);
            closeForm();
            toast(pick.length + " site" + (pick.length === 1 ? "" : "s") + " deleted");
            render();
          } catch (e) {
            showErr("Couldn't delete them all. Check your connection.");
            $("f-save").disabled = false;
          }
        },
      );
    },
    null,
  );
  $("f-save").classList.add("danger");
  const q = $("dsp-q");
  q.oninput = () => {
    const v = q.value.toLowerCase().trim();
    document
      .querySelectorAll(".dsp-row")
      .forEach((r) => (r.hidden = !!v && !r.dataset.q.includes(v)));
  };
  document.querySelectorAll(".dsp-c").forEach(
    (i) =>
      (i.onchange = () => {
        const n = document.querySelectorAll(".dsp-c:checked").length;
        $("f-save").textContent = n
          ? `Delete ${n} site${n === 1 ? "" : "s"}`
          : "Delete ticked sites";
      }),
  );
}
function deleteSiteFlow(site) {
  const sr = siteRec(site);
  const c = siteClient(site);
  openSheet(
    `<h3 id="sheettitle">🗑 Delete ${esc(site)}?</h3><div class="notice warn" style="margin:0">This permanently removes the site${sr ? ", its job details and who-sees-what settings" : " from your lists"}. Trades will no longer see it. It can't be undone.</div>
    <div class="who">Its induction, jobs, planner entries and site chat go with it. Timesheets, day work and photos already logged against it are kept for your records.${c ? ` The client ${esc(c.name)} is kept.` : ""} If you just want it out of the way, use <b>Move to storage</b> instead.</div>
    ${(() => {
      const n = (RAW.docs || []).filter((x) => same(x.site, site)).length;
      return n
        ? `<label class="tick"><input type="checkbox" id="ds-docs" checked> <span>Also delete its ${n} plan${n === 1 ? "" : "s"}, RAMS and documents</span></label>`
        : "";
    })()}
    ${formFoot(false, "Delete site")}`,
    () => {
      const wd = $("ds-docs") ? $("ds-docs").checked : false;
      askOwnerPin("Enter your PIN to delete " + site + ".", async () => {
        $("f-save").disabled = true;
        try {
          await deleteSiteNow(site, false, wd);
          closeForm();
          render();
        } catch (e) {
          showErr("Couldn't delete. Check your connection.");
          $("f-save").disabled = false;
        }
      });
    },
    null,
  );
  $("f-save").classList.add("danger");
}
