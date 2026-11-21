/* ================= INDUCTION TEMPLATE: the firm's own standard site induction, and every site's induction, in the Site inductions tab ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { IND_DETAILS, IND_ITEMS, indFor, openIndEditor } from "./site-inductions.js";
import { siteLabel } from "../sites/job-details.js";
export { istCardHtml, istDef, istItems, istWire };
/* James (Nov 2026): "make sure site inductions can be modified and added to as necessary. this would be within site
   induction tab". At the top of Site inductions: 📋 Your standard induction – the points everyone ticks, the working
   hours, PPE and site rules every new site's induction starts with (change any line, add your own) – and each site
   with its induction to change (or set up). Saved in settings/app.indStd { items: [..], details: {hours, ppe, rules}
   }; a site's own induction is still changed on its own (safety/site-inductions.js › openIndEditor). */
const IST_KEYS = ["hours", "ppe", "rules"];
const istStd = () => (S.settings || {}).indStd || {};
const istItems = () => {
  const it = istStd().items;
  return Array.isArray(it) && it.length ? it : IND_ITEMS;
};
const istDef = (k, def) => {
  const d = istStd().details || {};
  return d[k] != null && d[k] !== "" ? d[k] : def;
};
function istCardHtml() {
  const sites = [...new Set((S.sites || []).filter((s) => !s.archived).map((s) => s.name))]
    .filter(Boolean)
    .sort();
  return `<section class="card ist-card"><div class="cardbody"><b>📋 Your standard induction</b>
    <div class="who">What every new site's induction starts with: ${istItems().length} points they tick, your working hours, PPE and site rules.${istStd().items ? " Your own version." : ""}</div>
    <div class="actions"><button type="button" class="btn primary" id="ist-edit">Change the standard induction</button></div>
    <details class="ist-sites"><summary><b>Each site's induction</b> <span class="who">– change one, or set one up</span></summary>
      ${
        sites
          .map((s) => {
            const ind = indFor(s);
            return `<div class="ist-row"><span><b>${esc(siteLabel(s))}</b><small>${ind ? `${(ind.items || []).length} points · version ${ind.version || 1}` : "No induction yet"}</small></span><button type="button" class="pillbtn ist-site" data-s="${esc(s)}">${ind ? "Change" : "Set up"}</button></div>`;
          })
          .join("") || '<div class="who">No live sites.</div>'
      }
    </details>
  </div></section>`;
}
function istWire() {
  if (!$("ist-edit")) return;
  $("ist-edit").onclick = istEdit;
  document
    .querySelectorAll("#main .ist-site")
    .forEach((b) => (b.onclick = () => openIndEditor(b.dataset.s)));
}
function istEdit() {
  const lab = Object.fromEntries(IND_DETAILS.map(([k, l, def]) => [k, [l, def]]));
  openSheet(
    `<h3 id="sheettitle">📋 Your standard induction</h3><div class="who">Every new site's induction starts with this. Sites that already have one keep theirs – change them in Each site's induction.</div>
    ${IST_KEYS.map((k) => `<label for="ist-${k}">${esc(lab[k][0])}<textarea id="ist-${k}" rows="3" maxlength="1500">${esc(istDef(k, lab[k][1]))}</textarea></label>`).join("")}
    <label for="ist-items">Points they tick (one per line – change any, add your own)<textarea id="ist-items" style="min-height:260px" maxlength="6000">${esc(istItems().join("\n"))}</textarea></label>
    <button type="button" class="linkbtn" id="ist-std">↺ Back to the app's standard points</button>
    ${formFoot(false, "Save the standard induction")}`,
    async () => {
      const items = $("ist-items")
        .value.split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      if (!items.length) return showErr("Keep at least one point to tick");
      const details = {};
      IST_KEYS.forEach((k) => (details[k] = $("ist-" + k).value.trim()));
      try {
        await S.db.doc("settings/app").update({ indStd: { items, details } });
        S.settings = Object.assign({}, S.settings, { indStd: { items, details } });
        closeForm();
        toast("Standard induction saved – new sites start with it");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "ist-items",
  );
  $("ist-std").onclick = () => ($("ist-items").value = IND_ITEMS.join("\n"));
}
