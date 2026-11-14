/* ================= COMPANY NAMES: the company's and account holder's names, from the company details ================= */
import { S } from "./state.js";
export { bossFirst, bossName, coName, coShort, coTown };
/* James, Nov 2026: "if i sell this software to another business it needs to be set up to accommodate this". Nothing
   in the app says "James" or "JEB" any more: wording uses these, which read Setup › Company details (settings/app
   company.*), set by the account holder in Set up your account. Plain text – esc() them when they go into HTML. */
function coRec() {
  return (S.settings || {}).company || {};
}
function coName() {
  return String(coRec().name || "").trim() || "Your company";
}
/* a short name for the app icon and labels like "I'm a JEB client": set in Company details, else the first word */
function coShort() {
  const c = coRec();
  return (
    String(c.shortName || "").trim() ||
    String(c.name || "")
      .trim()
      .split(/\s+/)[0] ||
    "the company"
  );
}
function bossName() {
  const s = S.settings || {};
  return String(coRec().owner || s.ownerName || S.ownerName || "").trim() || "the boss";
}
function bossFirst() {
  const n = bossName();
  return n === "the boss" ? n : n.split(/\s+/)[0];
}
/* where the company is based (town), for distances and the weather */
function coTown() {
  return String(coRec().town || "").trim();
}
