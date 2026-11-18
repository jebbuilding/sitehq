/* ================= GENERIC FIELDS ================= */
import { $, esc } from "./helpers.js";
import { liveSite } from "./state.js";
import { siteLabel } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
export { lastOf, pickField, pickVal, wirePicks };
function pickField(id, label, names, val, ph, required = true, groups = []) {
  names = (names || []).filter((n) => liveSite(n) || same(n, val));
  /* groups: extra choices under their own heading, e.g. [["Not on a site", ["Office / paperwork", …]]] */
  const gv = groups.flatMap((g) => g[1]);
  if (!names.length && !gv.length)
    return `<label for="${id}">${label}<input id="${id}" maxlength="100" ${required ? "required" : ""} placeholder="${esc(ph)}" value="${esc(val)}"></label>`;
  const other = val && !names.includes(val) && !gv.includes(val);
  return `<label for="${id}">${label}<select id="${id}" ${required ? "required" : ""} data-pick="1">
    <option value="" ${!val ? "selected" : ""} ${required ? "disabled" : ""}>${required ? "Choose…" : "None"}</option>
    ${groups.length && names.length ? `<optgroup label="Sites">` : ""}${names.map((n) => `<option value="${esc(n)}" ${n === val ? "selected" : ""}>${esc(siteLabel(n))}</option>`).join("")}${groups.length && names.length ? "</optgroup>" : ""}
    ${groups.map(([g, l]) => `<optgroup label="${esc(g)}">${l.map((n) => `<option value="${esc(n)}" ${n === val ? "selected" : ""}>${esc(n)}</option>`).join("")}</optgroup>`).join("")}
    <option value="__other" ${other ? "selected" : ""}>Other (type it in)</option></select></label>
    <input id="${id}-other" maxlength="100" placeholder="${esc(ph)}" aria-label="${esc(label)}, other" value="${other ? esc(val) : ""}" ${other ? "" : "hidden"}>`;
}
function wirePicks(root) {
  root.querySelectorAll("select[data-pick]").forEach((s) =>
    s.addEventListener("change", () => {
      const o = $(s.id + "-other");
      o.hidden = s.value !== "__other";
      if (!o.hidden) o.focus();
    }),
  );
}
function pickVal(id) {
  const s = $(id);
  if (!s) return "";
  if (s.tagName === "SELECT")
    return s.value === "__other" ? $(id + "-other").value.trim() : s.value;
  return s.value.trim();
}
function lastOf(list, f, key) {
  const l = list
    .slice()
    .sort((a, b) => (b.created || 0) - (a.created || 0))
    .find((x) => f(x) && x[key]);
  return l ? l[key] : "";
}
