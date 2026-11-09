/* ================= PEOPLE AND ACCESS: Setup › 👥 People & access – what each role sees, and which jobs each person sees ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { EMP_TABS, render } from "../core/tabs-week.js";
import { auditLog } from "../owner/deletion-record.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { EMP_TYPES } from "./employment-types.js";
import { empTypeOf } from "../sites/job-details.js";
export { acMySites, acTabAllowed, acView };
/* Kept in settings/app (which everyone's app reads, so each trade's app can follow it) as access:
     { roles: { emp|sub|agency: { tabs: [trade tab keys] } },
       people: { uid: { role: "emp"|"sub"|"agency", sites: null (every job) | [site names] } } }
   Nothing set = everyone sees what they always have. Sign in and My details are always there. Money, pay, bank,
   clients and the owner's own records were never sent to trades' apps in the first place; this decides which parts
   of the trades' app each person gets. On claude.ai the app hides what isn't theirs; on our own server the server
   will refuse it too (platform/capabilities.json). Every change is written to the deletion record (audit). */
const AC_ROLES = [
  ["emp", "Employees"],
  ["sub", "Subcontractors"],
  ["agency", "Agency & other firms"],
];
const AC_ALWAYS = new Set(["signin", "details"]);
/* a sensible start for each role: employees and subbies see everything they do now; agency workers just what they
   need on site */
const AC_PRESET = {
  emp: null,
  sub: null,
  agency: ["time", "chat", "plans", "checks", "photos", "training", "policies"],
};
const acAccess = () => (S.settings || {}).access || {};
/* the role someone has: set here, else from their employment type */
function acRoleOf(uid) {
  const p = (acAccess().people || {})[uid];
  if (p && p.role) return p.role;
  const t = empTypeOf(uid);
  return t === "employed" ? "emp" : t === "cis" || t === "selfemp" ? "sub" : "agency";
}
/* the trade tabs a role gets (null = all of them) */
function acRoleTabs(role) {
  const r = (acAccess().roles || {})[role];
  return r && Array.isArray(r.tabs) ? r.tabs : null;
}
/* for the trades' app: is this tab allowed for me? */
function acTabAllowed(key) {
  if (ownerMode() || AC_ALWAYS.has(key) || key === "foreman") return true;
  const tabs = acRoleTabs(acRoleOf(S.me));
  return !tabs || tabs.includes(key);
}
/* for the trades' app: which jobs can I see? null = all */
function acMySites() {
  if (ownerMode()) return null;
  const p = (acAccess().people || {})[S.me];
  return p && Array.isArray(p.sites) ? p.sites : null;
}
/* ---------- the Setup tab ---------- */
function acView(seg) {
  const a = acAccess();
  const team = teamIds();
  const sites = (S.sites || []).filter((s) => !s.archived && s.name).map((s) => s.name);
  const areas = EMP_TABS.filter(([k]) => !AC_ALWAYS.has(k));
  const roleTabs = (r) =>
    acRoleTabs(r) || (a.roles ? areas.map(([k]) => k) : AC_PRESET[r] || areas.map(([k]) => k));
  const log = (S.audit || [])
    .filter((x) => x.action === "Access")
    .sort((x, y) => (y.seq || 0) - (x.seq || 0))
    .slice(0, 12);
  $("main").innerHTML = `${seg}
    <div class="notice">Choose what each kind of person sees in their app, and which jobs each person is on. Money, pay, bank, client details and your own records are never shown to anyone but you. Clients only ever see their own page: set that in 🏡 Client portal.</div>
    <section class="card"><div class="cardbody"><b>What each role sees</b>
      <div class="who">Sign in and My details are always there.${a.roles ? "" : " These are suggestions until you save."}</div>
      <div class="tablewrap"><table class="pa-tbl"><thead><tr><th>Part of the app</th>${AC_ROLES.map(([, l]) => `<th class="pa-c">${esc(l)}</th>`).join("")}</tr></thead><tbody>${areas
        .map(
          ([k, l]) =>
            `<tr><td>${esc(l)}</td>${AC_ROLES.map(([r]) => `<td class="pa-c"><label class="pa-hit"><input type="checkbox" class="pa-tab" data-r="${r}" data-k="${k}"${roleTabs(r).includes(k) ? " checked" : ""} aria-label="${esc(l)} for ${esc(r)}"></label></td>`).join("")}</tr>`,
        )
        .join("")}</tbody></table></div>
    </div></section>
    <section class="card"><div class="cardbody"><b>Each person</b>
      <div class="who">Their role (from their employment type until you change it), and the jobs they see: every job, or only the ones you tick.</div>
      ${
        team.length
          ? team
              .map((id) => {
                const p = (a.people || {})[id] || {};
                const only = Array.isArray(p.sites);
                return `<div class="pa-person" data-w="${esc(id)}"><div class="pa-ph"><b>${esc(nameOf(id))}</b><span class="who">${esc(EMP_TYPES[empTypeOf(id)] || "")}</span><select class="pa-role" aria-label="Role for ${esc(nameOf(id))}">${AC_ROLES.map(([r, l]) => `<option value="${r}"${acRoleOf(id) === r ? " selected" : ""}>${esc(l.replace(/s( &.*)?$/, "$1"))}</option>`).join("")}</select></div>
                <div class="seg pa-mode"><button type="button" data-v="all" aria-pressed="${!only}">Every job</button><button type="button" data-v="only" aria-pressed="${only}">Only these jobs</button></div>
                <div class="pa-sites"${only ? "" : " hidden"}>${sites.map((s) => `<label class="inl pa-sitel"><input type="checkbox" class="pa-site" value="${esc(s)}"${only && p.sites.includes(s) ? " checked" : ""}> ${esc(s)}</label>`).join("") || `<span class="who">No jobs yet.</span>`}</div></div>`;
              })
              .join("")
          : `<div class="who">No one on the team yet.</div>`
      }
    </div></section>
    <div class="actions"><button type="button" class="btn primary" id="pa-save">Save who sees what</button></div>
    ${log.length ? `<section class="card"><div class="cardbody"><b>Changes</b>${log.map((x) => `<div class="drow"><span>${esc(x.details || x.title || "")}</span><span class="who">${esc(new Date(x.at || x.time || 0).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }))}</span></div>`).join("")}</div></section>` : ""}
    <div class="who">Today the app hides what isn't someone's. When SiteHQ moves to our own server, the server will refuse it as well.</div>`;
  document.querySelectorAll("#main .pa-person").forEach((row) => {
    row.querySelectorAll(".pa-mode button").forEach(
      (b) =>
        (b.onclick = () => {
          row
            .querySelectorAll(".pa-mode button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          row.querySelector(".pa-sites").hidden = b.dataset.v !== "only";
        }),
    );
  });
  $("pa-save").onclick = acSave;
}
async function acSave() {
  const before = acAccess();
  const roles = {};
  AC_ROLES.forEach(([r]) => {
    roles[r] = {
      tabs: [...document.querySelectorAll(`#main .pa-tab[data-r="${r}"]:checked`)].map(
        (i) => i.dataset.k,
      ),
    };
  });
  const people = {};
  document.querySelectorAll("#main .pa-person").forEach((row) => {
    const only =
      row.querySelector('.pa-mode [data-v="only"]').getAttribute("aria-pressed") === "true";
    people[row.dataset.w] = {
      role: row.querySelector(".pa-role").value,
      sites: only ? [...row.querySelectorAll(".pa-site:checked")].map((i) => i.value) : null,
    };
  });
  /* what changed, in words, for the record */
  const said = [];
  AC_ROLES.forEach(([r, l]) => {
    const was = acRoleTabs(r) || [];
    const now = roles[r].tabs;
    const lab = (k) => (EMP_TABS.find((x) => x[0] === k) || [k, k])[1].replace(/^\S+\s/, "");
    const add = now.filter((k) => !was.includes(k)),
      gone = before.roles ? was.filter((k) => !now.includes(k)) : [];
    if (before.roles && (add.length || gone.length))
      said.push(
        `${l}: ${add.length ? "+ " + add.map(lab).join(", ") : ""}${add.length && gone.length ? "; " : ""}${gone.length ? "− " + gone.map(lab).join(", ") : ""}`,
      );
  });
  if (!before.roles) said.push("Roles set up");
  Object.entries(people).forEach(([id, p]) => {
    const was = (before.people || {})[id] || {};
    if ((was.role || acRoleOf(id)) !== p.role)
      said.push(
        `${nameOf(id)}: role ${{ emp: "Employee", sub: "Subcontractor", agency: "Agency / other firm" }[p.role]}`,
      );
    if (JSON.stringify(was.sites || null) !== JSON.stringify(p.sites))
      said.push(
        `${nameOf(id)}: ${p.sites ? (p.sites.length ? "only " + p.sites.join(", ") : "no jobs") : "every job"}`,
      );
  });
  try {
    const access = { roles, people, updated: Date.now() };
    await S.db.doc("settings/app").update({ access });
    S.settings = Object.assign({}, S.settings, { access });
    if (said.length) await auditLog("Access", "Who sees what", said.join(" · "), null);
    toast(
      said.length ? "Saved: " + said.length + " change" + (said.length === 1 ? "" : "s") : "Saved",
    );
    render();
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
