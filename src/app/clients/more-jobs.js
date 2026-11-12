/* ================= MORE JOBS: a client with more than one job on the go – each with its own stage, estimate and site ================= */
import { clientSites } from "./address-book.js";
import { CL_STAGES, CL_WORK, clStage, saveClient } from "./clients.js";
import { viewClient } from "./quick-enquiry.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { newId } from "../files/outbox.js";
import { same } from "../sites/project-pages.js";
export { mjEdit, mjHas };
/* James (Nov 2026): one client can have several jobs at once (a kitchen and a garden wall), or another job later. The
   client's own fields (work, desc, quote, stage…) stay their first job, as before; every other job running at the same
   time is in c.moreJobs [{ id, work, desc, budget, quote, timescale, site, stage, enqAt }]. "＋ Another job" on the
   client's page adds one; tapping it under 🔨 Jobs opens it, and ✎ Edit this job changes it. Its site is one of the
   client's sites, or a new site made there and then at another address (sites/{id} with client = their name, the name
   added to c.sites). When a job is marked Completed or Rejected it moves to their earlier jobs (c.pastJobs), like the
   first job does. The client list counts each job under its own stage (mjHas). */
const mjStages = () => CL_STAGES.filter(([k]) => k !== "contact");
const mjAll = (c) => (c && c.moreJobs) || [];
/* does this client have a job (their first or another) at this stage? */
const mjHas = (c, stage) => c.stage === stage || mjAll(c).some((j) => j.stage === stage);
function mjEdit(c, j0) {
  const j = j0 || { stage: "enquiry" };
  const sites = clientSites(c);
  const curSite = j.site || "";
  openSheet(
    `<h3 id="sheettitle">🔨 ${j0 ? esc(j.work || "Job") : "Another job for " + esc(c.name)}</h3>
    <div class="who">${j0 ? "" : "Their other jobs stay as they are. This one has its own stage, estimate and site."}</div>
    <label for="mj-work">What's the job?<input id="mj-work" list="mj-wl" maxlength="80" value="${esc(j.work || "")}" placeholder="e.g. Garden wall"><datalist id="mj-wl">${CL_WORK.map((w) => `<option value="${esc(w)}">`).join("")}</datalist></label>
    <label for="mj-desc">What they want (optional)<textarea id="mj-desc" maxlength="2000" placeholder="e.g. Rebuild the front wall, 8 m, brick to match">${esc(j.desc || "")}</textarea></label>
    <div class="grid2"><label for="mj-stage">Stage<select id="mj-stage">${mjStages()
      .map(([k, l]) => `<option value="${k}"${k === j.stage ? " selected" : ""}>${esc(l)}</option>`)
      .join("")}</select></label>
    <label for="mj-quote">Estimate £ (optional)<input id="mj-quote" inputmode="decimal" value="${esc(j.quote || "")}" placeholder="e.g. 4500"></label></div>
    <div class="grid2"><label for="mj-budget">Their budget (optional)<input id="mj-budget" maxlength="40" value="${esc(j.budget || "")}"></label>
    <label for="mj-when">Wanted by (optional)<input id="mj-when" maxlength="40" value="${esc(j.timescale || "")}" placeholder="e.g. spring"></label></div>
    <label for="mj-site">Where<select id="mj-site"><option value="">Not a site yet</option>${sites.map((s) => `<option${same(s, curSite) ? " selected" : ""}>${esc(s)}</option>`).join("")}<option value="__new">➕ A new site at another address…</option></select></label>
    <label for="mj-addr" id="mj-addrw" hidden>Address of the new site<input id="mj-addr" maxlength="120" placeholder="e.g. 7 Beach Road, Exmouth EX8 1AA"></label>
    ${formFoot(false, j0 ? "Save" : "Add the job")}`,
    async () => {
      const work = $("mj-work").value.trim();
      if (!work) {
        showErr("Say what the job is");
        return;
      }
      let site = $("mj-site").value;
      const fresh = Object.assign({}, (S.clients || []).find((x) => x.id === c.id) || c);
      let mySites = (fresh.sites || []).slice();
      if (site === "__new") {
        site = $("mj-addr").value.trim().replace(/\s+/g, " ");
        if (!site) {
          showErr("Type the address of the new site");
          return;
        }
        $("f-save").disabled = true;
        if (!siteNames().some((n) => same(n, site)))
          try {
            await S.db
              .collection("sites")
              .add({ name: site, project: work, client: c.name, created: Date.now() });
          } catch (e) {
            $("f-save").disabled = false;
            showErr("Couldn't make the site. Check your connection.");
            return;
          }
        if (!mySites.some((s) => same(s, site))) mySites.push(site);
      }
      const rec = Object.assign({}, j, {
        id: j.id || "mj-" + newId(),
        work,
        desc: $("mj-desc").value.trim(),
        stage: $("mj-stage").value,
        quote: $("mj-quote").value.replace(/[£,\s]/g, ""),
        budget: $("mj-budget").value.trim(),
        timescale: $("mj-when").value.trim(),
        site,
        enqAt: j.enqAt || Date.now(),
      });
      let more = mjAll(fresh).filter((x) => x.id !== rec.id);
      let past = (fresh.pastJobs || []).slice();
      const notes = (fresh.notes || []).slice();
      if (!j0) notes.push({ text: "Another job: " + work, at: Date.now() });
      else if (j0.stage !== rec.stage)
        notes.push({ text: work + ": " + clStage(rec.stage), at: Date.now(), auto: true });
      if (rec.stage === "done" || rec.stage === "lost")
        past = past
          .concat([
            {
              work: rec.work,
              desc: rec.desc,
              budget: rec.budget,
              quote: rec.quote,
              timescale: rec.timescale,
              site: rec.site,
              stage: rec.stage,
              startAt: rec.enqAt,
              at: Date.now(),
            },
          ])
          .slice(-20);
      else more = more.concat([rec]);
      $("f-save").disabled = true;
      try {
        const saved = await saveClient(
          Object.assign(fresh, { moreJobs: more, pastJobs: past, sites: mySites, notes }),
        );
        closeForm();
        toast(
          rec.stage === "done" || rec.stage === "lost"
            ? "Moved to their earlier jobs"
            : j0
              ? "Job saved"
              : "Job added",
        );
        viewClient(saved);
      } catch (e) {
        $("f-save").disabled = false;
        showErr("Couldn't save. Check your connection.");
      }
    },
    "mj-work",
  );
  $("mj-site").onchange = () => {
    $("mj-addrw").hidden = $("mj-site").value !== "__new";
    if (!$("mj-addrw").hidden) $("mj-addr").focus();
  };
}
