/* ================= ACCOUNT SET-UP: the account holder sets up the company, its emergency contacts and their own details ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "./company-details.js";
import { detailsDone, myDetails, openDetails } from "../people/personal-details.js";
export { ACS };
/* James, Nov 2026: "to set up the app at the start i would be classed as account holder first … if i sell this
   software to another business it needs to be set up to accommodate this". The person who owns the account does three
   steps: the company, the company's emergency contacts, then their own details – the same form as everyone else. Until
   they tap Finish, a card on Today shows what's left; Setup always has it. Kept in settings/app: company.* (the same
   record as Setup › Company details) and acctSetupAt when finished. */
const ACS = (() => {
  const co = () => Object.assign({}, (S.settings || {}).company || {});
  const finished = () => !!(S.settings || {}).acctSetupAt;
  const steps = () => {
    const c = co();
    return [
      ["co", "🏢 Your company", !!(c.name && c.owner && (c.address || c.phone || c.mobile))],
      ["em", "🚑 Emergency contacts", !!c.oohPhone],
      ["me", "🪪 Your own details", detailsDone(myDetails())],
    ];
  };
  function cardHtml(where) {
    if (!ownerMode()) return "";
    if (where === "today" && finished()) return "";
    const st = steps();
    const n = st.filter((s) => s[2]).length;
    const nextK = (st.find((x) => !x[2]) || [])[0];
    return `<section class="card acs-card" id="acs-card"><div class="cardbody" style="border:0">
      <b>${finished() ? "✓ Your account is set up" : "👤 Set up your account"}</b>
      <div class="who">${finished() ? "You're the account holder. Check or change any step here." : "You're the account holder. Three steps: your company, its emergency contacts, then your own details, the same as everyone else on the app."} ${n} of 3 done.</div>
      <div class="acs-steps">${st.map(([k, l, ok]) => `<button type="button" class="acs-step" data-k="${k}" aria-pressed="${ok}"><span class="acs-tick" aria-hidden="true">${ok ? "✓" : k === nextK ? "→" : "○"}</span>${esc(l)}</button>`).join("")}</div>
      ${!finished() && n === 3 ? `<div><button type="button" class="btn primary" id="acs-finish">Finish set-up</button></div>` : ""}</div></section>`;
  }
  const field = (k, l, v, ph, type) =>
    `<label for="acs-${k}">${esc(l)}<input id="acs-${k}" maxlength="120" ${type ? `type="${type}"` : ""} value="${esc(v || "")}" placeholder="${esc(ph || "")}"></label>`;
  async function saveCo(vals, msg, next) {
    const c = Object.assign(co(), vals);
    const up = { company: c };
    if (vals.owner) up.ownerName = vals.owner;
    if (c.mobile && c.mobile !== ((S.settings || {}).ownerPhone || "")) up.ownerPhone = c.mobile;
    try {
      await S.db.doc("settings/app").update(up);
      S.settings = Object.assign({}, S.settings, up);
      closeForm();
      toast(msg);
      render();
      if (next) setTimeout(next, 250);
    } catch (e) {
      showErr("Couldn't save. Check your connection.");
    }
  }
  function companyStep() {
    const c = coData();
    openSheet(
      `<h3 id="sheettitle">🏢 Your company</h3><div class="who">Step 1 of 3. Shown to everyone on the app and on your paperwork. Your logo, insurance and the rest are in Setup › Company details.</div>
      ${field("name", "Company name", c.name, "e.g. Smith Building Ltd")}
      ${field("owner", "Account holder (you)", c.owner, "Your full name")}
      <div class="grid2">${field("shortName", "Short name (for the app icon)", c.shortName || "", "e.g. SBL")}${field("town", "Town you're based in", c.town || "", "e.g. Exeter")}</div>
      <label for="acs-address">Business address<textarea id="acs-address" maxlength="300" placeholder="e.g. 1 High Street">${esc(c.address || "")}</textarea></label>
      <div class="grid2">${field("mobile", "Mobile", c.mobile, "", "tel")}${field("phone", "Office phone", c.phone, "", "tel")}</div>
      ${field("email", "Email", c.email, "", "email")}
      ${formFoot(false, "Save and next")}`,
      () => {
        const v = {};
        ["name", "shortName", "owner", "town", "address", "mobile", "phone", "email"].forEach(
          (k) => {
            v[k] = $("acs-" + k).value.trim();
          },
        );
        if (!v.name || !v.owner) {
          showErr("Add the company name and your name.");
          return;
        }
        if (!v.mobile && !v.phone) {
          showErr("Add a phone number so people can reach the company.");
          return;
        }
        return saveCo(v, "Company saved", emergencyStep);
      },
      "acs-name",
    );
  }
  function emergencyStep() {
    const c = co();
    openSheet(
      `<h3 id="sheettitle">🚑 Emergency contacts</h3><div class="who">Step 2 of 3. Who your people call if something goes wrong on a job, day or night. Shown to everyone on the app with the company details. (Each person's own next of kin goes in their own details.)</div>
      ${field("oohName", "Emergency / out-of-hours contact", c.oohName || c.owner, "e.g. Alex Smith")}
      ${field("oohPhone", "Their number", c.oohPhone || c.mobile, "e.g. 07700 900123", "tel")}
      ${field("oohName2", "If they can't be reached: who? (optional)", c.oohName2, "e.g. office manager")}
      ${field("oohPhone2", "Their number (optional)", c.oohPhone2, "", "tel")}
      ${field("firstAid", "First aider(s) (optional)", c.firstAid, "e.g. Sam (first aid at work, until 2027)")}
      ${formFoot(false, "Save and next")}`,
      () => {
        const v = {};
        ["oohName", "oohPhone", "oohName2", "oohPhone2", "firstAid"].forEach((k) => {
          v[k] = $("acs-" + k).value.trim();
        });
        if (!v.oohName || !v.oohPhone) {
          showErr("Add the emergency contact and their number.");
          return;
        }
        return saveCo(v, "Emergency contacts saved", () => openDetails());
      },
      "acs-oohName",
    );
  }
  async function finish() {
    try {
      await S.db.doc("settings/app").update({ acctSetupAt: Date.now() });
      S.settings = Object.assign({}, S.settings, { acctSetupAt: Date.now() });
      toast("Your account is set up");
      render();
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  }
  function wire() {
    const card = $("acs-card");
    if (!card) return;
    card
      .querySelectorAll(".acs-step")
      .forEach(
        (b) =>
          (b.onclick = () =>
            b.dataset.k === "co"
              ? companyStep()
              : b.dataset.k === "em"
                ? emergencyStep()
                : openDetails()),
      );
    if ($("acs-finish")) $("acs-finish").onclick = finish;
  }
  return { cardHtml, wire, finished };
})();
