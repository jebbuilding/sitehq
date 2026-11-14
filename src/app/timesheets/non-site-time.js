/* ================= NON-SITE TIME: time that isn't on a site (office, quoting, yard, a job not a site yet) ================= */
import { S, liveSite } from "../core/state.js";
export { nstClientId, nstGroups, nstIs };
/* James, Nov 2026: "a way to add my time to a job that is not a site yet or maybe office/paperwork or other item
   within the business". These are extra choices in the Site box when adding or checking in time. The job not a site
   yet list is James's own clients (owner only – trades never see client names). James, Nov 2026: "allow that options
   for not of site, paper work, office for managers only" – so only James and anyone he's made a Manager in Setup ›
   People & access › Office access get these choices; everyone else just picks a site. */
function nstAllowed() {
  if (S.owner) return true;
  const off = ((S.settings || {}).access || {}).office || {};
  return (off.people || {})[S.me] === "manager";
}
const NST_KINDS = [
  "Office / paperwork",
  "Pricing & quoting",
  "Van, tools & yard",
  "Collecting materials",
  "Training & courses",
];
const NST_PRE = "Not a site yet: ";
function nstClients() {
  if (!S.owner) return [];
  return (S.clients || [])
    .filter(
      (c) =>
        c.name &&
        ["enquiry", "visit", "quote", "won"].includes(c.stage || "enquiry") &&
        !(c.site && liveSite(c.site)),
    )
    .sort((a, b) => (b.updated || 0) - (a.updated || 0))
    .slice(0, 30)
    .map((c) => ({ v: NST_PRE + c.name + (c.address ? " – " + c.address : ""), id: c.id }));
}
function nstGroups() {
  if (!nstAllowed()) return [];
  const g = [["Not on a site", NST_KINDS]];
  const cl = nstClients();
  if (cl.length) g.push(["Job not a site yet", cl.map((x) => x.v)]);
  return g;
}
function nstIs(job) {
  return NST_KINDS.includes(job) || String(job || "").startsWith(NST_PRE);
}
function nstClientId(job) {
  const x = nstClients().find((c) => c.v === job);
  return x ? x.id : "";
}
