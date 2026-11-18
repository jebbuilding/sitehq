/* ================= INDUCTION SEND: send a site induction to people from Site inductions, induct on this device, set one up ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { indFor, openIndEditor, openInduction } from "../safety/site-inductions.js";
import { siteLabel } from "../sites/job-details.js";
export { isendBarHtml, isendOpen, isendWaiting, isendWire };
/* James (Nov 2026): "in site inductions how do people take them … I also need to be able to make or send an induction
   for someone to take within inductions". From People › Site inductions (and a site's induction card): 📤 Send an
   induction – pick the site's induction and the people (those who need it already ticked), add a note; each gets a
   reminder (sheets/{uid}/signoffs/pr-*, type "prompt", form "induction", ref = the induction id – the same record as
   Send a reminder) that pops up when they open the app, opens the induction to read, tick and sign, and clears itself
   once they've signed. 📱 Induct someone on this device for people not on the app (agency, visitors). + Set up an
   induction for a site that hasn't one. On the grid, Needed / Old squares are buttons to send it, and a sent one
   still waiting shows "Sent". */
const isendWaiting = (id, indId) =>
  ((S.data.signoffs || {})[id] || []).some(
    (s) => s.type === "prompt" && s.form === "induction" && s.ref === indId && s.status === "open",
  );
const isendSigned = (id, ind) =>
  ((S.data.signoffs || {})[id] || []).some(
    (s) =>
      s.type === "induction" && s.inductionId === ind.id && (s.version || 1) >= (ind.version || 1),
  );
function isendOpen(indId, preIds) {
  const inds = (S.inductions || [])
    .slice()
    .sort((a, b) => (a.site || "").localeCompare(b.site || ""));
  if (!inds.length) return toast("Set up a site's induction first");
  const team = teamIds();
  const people = (ind) =>
    team
      .map((id) => {
        const tag = !ind
          ? ""
          : isendSigned(id, ind)
            ? '<small class="isd-tag ok">Signed</small>'
            : isendWaiting(id, ind.id)
              ? '<small class="isd-tag">Sent</small>'
              : "";
        return `<button type="button" class="isd-p" data-v="${esc(id)}" aria-pressed="${(preIds || []).includes(id)}">${esc(nameOf(id))}${tag}</button>`;
      })
      .join("") || '<span class="nothing">No one on the app yet.</span>';
  openSheet(
    `<h3 id="sheettitle">📤 Send a site induction</h3>
    <label for="isd-ind">Which site's induction<select id="isd-ind">${inds.map((i) => `<option value="${esc(i.id)}"${i.id === indId ? " selected" : ""}>${esc(siteLabel(i.site))}</option>`).join("")}</select></label>
    <div><div class="flabel">Who to</div><div class="seg isd-who" id="isd-who"></div></div>
    <label for="isd-note">Note (optional)<textarea id="isd-note" maxlength="400" placeholder="e.g. Please do this before you start on Monday."></textarea></label>
    <div class="who">It pops up the next time they open the app: they read it, tick each point and sign. It clears itself once they've signed, and shows on the grid.<br>Not on the app (agency, a visitor)? Use <b>📱 Induct someone on this device</b> instead.</div>
    ${formFoot(false, "Send")}`,
    async () => {
      const ind = inds.find((i) => i.id === $("isd-ind").value);
      const who = [...$("isd-who").querySelectorAll('[aria-pressed="true"]')].map(
        (b) => b.dataset.v,
      );
      if (!ind) return showErr("Choose the site.");
      if (!who.length) return showErr("Choose at least one person.");
      $("f-save").disabled = true;
      const note = $("isd-note").value.trim();
      try {
        for (const w of who)
          await S.db.doc("sheets/" + w + "/signoffs/pr-" + newId()).set({
            type: "prompt",
            form: "induction",
            ref: ind.id,
            refLabel: ind.site,
            note,
            status: "open",
            created: Date.now(),
          });
        closeForm();
        toast("Induction sent to " + who.map(nameOf).join(", "));
        render();
      } catch (e) {
        showErr("Couldn't send. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  const fill = () => {
    const ind = inds.find((i) => i.id === $("isd-ind").value);
    const keep = [...$("isd-who").querySelectorAll('[aria-pressed="true"]')].map(
      (b) => b.dataset.v,
    );
    if (keep.length) preIds = keep;
    $("isd-who").innerHTML = people(ind);
    $("isd-who")
      .querySelectorAll(".isd-p")
      .forEach(
        (b) =>
          (b.onclick = () =>
            b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
      );
  };
  $("isd-ind").onchange = () => {
    preIds = [];
    fill();
  };
  fill();
}
/* pick a site, then do something with it (induct on this device / set up an induction) */
function isendPickSite(title, list, go) {
  if (!list.length) return toast("No sites to choose from");
  openSheet(
    `<h3 id="sheettitle">${esc(title)}</h3>
    <label for="isd-site">Site<select id="isd-site">${list.map((s) => `<option value="${esc(s)}">${esc(siteLabel(s))}</option>`).join("")}</select></label>
    ${formFoot(false, "Next")}`,
    () => {
      const s = $("isd-site").value;
      closeForm();
      go(s);
    },
    "isd-site",
  );
}
function isendBarHtml() {
  return `<div class="actions isd-bar"><button type="button" class="btn primary" id="isd-send">📤 Send an induction</button><button type="button" class="btn" id="isd-dev">📱 Induct someone on this device</button><button type="button" class="btn" id="isd-new">+ Set up an induction</button></div>`;
}
function isendWire() {
  if ($("isd-send"))
    $("isd-send").onclick = () => isendOpen(S.f.imsite ? (indFor(S.f.imsite) || {}).id : "", []);
  if ($("isd-dev"))
    $("isd-dev").onclick = () =>
      isendPickSite(
        "📱 Induct someone on this device",
        (S.inductions || []).map((i) => i.site),
        (s) => {
          const i = indFor(s);
          if (i) openInduction(i, true);
        },
      );
  if ($("isd-new"))
    $("isd-new").onclick = () =>
      isendPickSite(
        "+ Set up a site induction",
        siteNames().filter((s) => !indFor(s)),
        (s) => openIndEditor(s),
      );
}
