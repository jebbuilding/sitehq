/* ================= PERSONAL DETAILS & NEXT OF KIN ================= */
import { $, esc, toast } from "../core/helpers.js";
import { privacyBlock } from "../core/privacy-notice.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId, submitJob } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { nameOf } from "../owner/owner.js";
import { EMP_TYPES } from "./employment-types.js";
import { autoClearPrompts, markPrompt, promptsOf } from "./reminders.js";
export { DET_SECTIONS, detailsDone, meBtn, meInfo, myDetails, openDetails, renderDetailsNeeded };
const DET_SECTIONS = [
  [
    "About you",
    [
      ["fullName", "Full name", 1],
      ["dob", "Date of birth", 1, "date"],
      ["mobile", "Mobile number", 1, "tel"],
      ["email", "Email address", 0, "email"],
      ["address", "Home address", 1, "area"],
      ["postcode", "Postcode", 1],
    ],
  ],
  [
    "Work",
    [
      ["empType", "Employed or self-employed", 1, "emptype"],
      ["trade", "Trade", 1],
      ["company", "Company name (if self-employed or from another company)", 0],
      ["ni", "National Insurance number", 0],
      ["utr", "UTR (if self-employed)", 0],
      ["cscs", "CSCS card number", 0],
      ["driving", "Do you hold a UK driving licence?", 0, "yesno"],
    ],
  ],
  [
    "Your business (if you're self-employed or a company – leave blank if employed)",
    [
      ["tradingName", "Trading name", 0],
      ["companyNo", "Company number (if a limited company)", 0],
      ["vatNo", "VAT number (if VAT registered)", 0],
      ["plInsurer", "Public liability insurer", 0],
      ["plCover", "Public liability cover (e.g. £5,000,000)", 0],
      ["plExpiry", "Public liability insurance runs out on", 0, "date"],
      ["accred", "Qualifications and schemes (e.g. Gas Safe 123456, NICEIC, CSCS)", 0, "area"],
      ["dayRate", "Day rate £ (optional)", 0],
    ],
  ],
  [
    "Next of kin (emergency contact)",
    [
      ["nokName", "Name", 1],
      ["nokRel", "Relationship to you", 1],
      ["nokPhone", "Phone number", 1, "tel"],
      ["nokPhone2", "Other phone (optional)", 0, "tel"],
      ["nokAddress", "Their address (optional)", 0, "area"],
    ],
  ],
  [
    "Health (optional)",
    [
      [
        "medical",
        "Medical conditions, allergies or medication we should know about in an emergency",
        0,
        "area",
      ],
    ],
  ],
];
const myDetails = () => (S.myProfile && S.myProfile.details) || S.detailsLocal || null;
/* everything we know about the person using the app, for filling in forms automatically */
const meInfo = () => {
  const d = myDetails() || {};
  const own = ownerMode();
  return {
    name: d.fullName || (S.myProfile && S.myProfile.name) || (own ? S.ownerName || "" : ""),
    company: d.company || (own || ["employed", ""].includes(d.empType || "") ? coData().name : ""),
    trade: d.trade || "",
    mobile: d.mobile || "",
    email: d.email || "",
    cscs: d.cscs || "",
    nokName: d.nokName || "",
    nokPhone: d.nokPhone || "",
    medical: d.medical || "",
  };
};
const meBtn = (id, label) =>
  `<button type="button" class="pillbtn mefill" id="${id}">👤 ${esc(label || "That's me")}</button>`;
function saveErrMsg(e) {
  const c = e && e.code;
  if (c === "invalid_argument" || c === "not_granted" || c === "revoked")
    return (
      "This phone isn't allowed to save. Ask James to check you're an Editor on the app, then close and reopen it. (Code: " +
      c +
      ")"
    );
  if (c === "quota_exceeded")
    return "The app's storage is full. Tell James. (Code: quota_exceeded)";
  return (
    "Couldn't save" +
    (c ? " (code: " + c + ")" : "") +
    ". Close the app, open it again and try once more. If it keeps happening, send James a screenshot of this message."
  );
}
function detailsDone(d) {
  return !!(d && d.confirmedAt);
}
function detField([k, l, req, type], d, noReq) {
  if (noReq) req = 0;
  const v = esc(d[k] || "");
  if (type === "area")
    return `<label for="dt-${k}">${esc(l)}<textarea id="dt-${k}" ${req ? "required" : ""} maxlength="500">${v}</textarea></label>`;
  if (type === "emptype")
    return `<label for="dt-${k}">${esc(l)}<select id="dt-${k}" ${req ? "required" : ""}><option value="" ${d[k] ? "" : "selected"} disabled>Choose…</option>${Object.entries(
      EMP_TYPES,
    )
      .map(([a, b]) => `<option value="${a}" ${d[k] === a ? "selected" : ""}>${b}</option>`)
      .join("")}</select></label>`;
  if (type === "yesno")
    return `<label for="dt-${k}">${esc(l)}<select id="dt-${k}"><option value="">Choose…</option><option ${d[k] === "Yes" ? "selected" : ""}>Yes</option><option ${d[k] === "No" ? "selected" : ""}>No</option></select></label>`;
  return `<label for="dt-${k}">${esc(l)}<input id="dt-${k}" ${req ? "required" : ""} maxlength="120" type="${type || "text"}" value="${v}" ${k === "postcode" ? 'style="text-transform:uppercase"' : ""}></label>`;
}
function openDetails(target) {
  if (target && !target.id && !target.off) target = undefined; // a click event is not a person
  // target: undefined = my own; {id} = a trade on the app (owner editing); {off:true,rec} = trade not on the app
  const forOther = !!target;
  const cur = !target
    ? myDetails() || {}
    : target.off
      ? (target.rec || {}).details || {}
      : (S.team[target.id] || {}).details || {};
  const nm = !target ? S.myProfile && S.myProfile.name : target.off ? "" : nameOf(target.id);
  const d = Object.assign({ fullName: nm || "" }, cur);
  openSheet(
    `<h3 id="sheettitle">${!target ? "My details" : target.off && !target.rec ? "Add a trade not on the app" : "Details for " + esc(d.fullName || "trade")}</h3>
    <div class="who">${forOther ? "You're filling this in for them. " + (target.off ? "They won't have access to the app." : "They can still check and update it themselves.") : "Only you and James can see these. Keep them up to date, especially your next of kin."}</div>
    ${target && target.off ? `<label for="dt-role">Employee or subcontractor<select id="dt-role"><option value="sub" ${(target.rec || {}).role !== "employee" ? "selected" : ""}>Subcontractor</option><option value="employee" ${(target.rec || {}).role === "employee" ? "selected" : ""}>Employee</option><option value="company" ${(target.rec || {}).role === "company" ? "selected" : ""}>From another company</option></select></label><label for="dt-rco">Company they're from (if a subcontractor or another company)<input id="dt-rco" maxlength="80" value="${esc((target.rec || {}).roleCompany || "")}"></label>` : ""}
    ${DET_SECTIONS.map(([title, fields]) => `<div class="flabel" style="margin:6px 0 -4px;font-size:14px;color:var(--accent)">${esc(title)}</div>${fields.map((f) => detField(f, d, forOther)).join("")}`).join("")}
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="dt-ok" ${detailsDone(cur) ? "checked" : ""}> ${forOther ? "I've checked these details with them, and they've been told how JEB uses their information." : "These details are correct, and I've read how JEB Building Services uses my information (below)."}</label>
    ${forOther ? `<div class="who">Not checked with them yet? Leave it unticked – you can save with just their name or email${target.off ? "" : ", and they'll be asked to check and confirm their details themselves when they next open the app"}.</div>` : ""}
    ${privacyBlock(false)}
    ${formFoot(!!(target && target.off && target.rec), forOther ? "Save details" : "Save my details")}`,
    async () => {
      const out = {};
      let missing = null;
      DET_SECTIONS.forEach(([, fields]) =>
        fields.forEach(([k, l, req]) => {
          const el = $("dt-" + k);
          out[k] = (el.value || "").trim();
          if (req && !out[k] && !missing) missing = l;
        }),
      );
      /* James adding someone (Nov 2026): just a name or an email is enough to save; the rest can follow */
      if (forOther && !out.fullName && !out.email) {
        showErr("Put in at least their name or their email address.");
        return;
      }
      if (missing && !forOther) {
        showErr(`Please fill in: ${missing}.`);
        return;
      }
      const okd = $("dt-ok").checked;
      if (!okd && !forOther) {
        showErr(
          forOther
            ? "Tick the box to confirm you've checked the details with them."
            : "Tick the box to confirm your details are correct.",
        );
        return;
      }
      out.postcode = out.postcode.toUpperCase();
      out.ni = out.ni.toUpperCase().replace(/\s+/g, " ");
      /* unticked for someone else: saved, but not confirmed – they're asked to check it themselves */
      if (okd) out.confirmedAt = Date.now();
      if (forOther) out.enteredBy = "James";
      $("f-save").disabled = true;
      if (forOther) {
        try {
          if (target.off) {
            const id = target.rec ? target.rec.id : "t-" + newId();
            await S.db.doc("offapp/" + id).set({
              details: out,
              role: $("dt-role").value,
              roleCompany: $("dt-rco").value.trim(),
              created: (target.rec || {}).created || Date.now(),
              updated: Date.now(),
            });
          } else {
            const p = Object.assign({}, S.team[target.id] || {}, {
              details: out,
              name: out.fullName || nameOf(target.id),
              updated: Date.now(),
            });
            await S.db.doc("sheets/" + target.id).set(p);
            promptsOf(S.data.signoffs[target.id])
              .filter((p) => okd && p.status === "open" && p.form === "details")
              .forEach((p) => markPrompt(Object.assign({ who: target.id }, p), "done"));
          }
          closeForm();
          toast("Details saved");
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection and try again.");
          $("f-save").disabled = false;
        }
        return;
      }
      try {
        const before = S.myProfile;
        const prof = JSON.parse(
          JSON.stringify(
            Object.assign({}, S.myProfile || {}, {
              details: out,
              name: out.fullName || (S.myProfile || {}).name,
              updated: Date.now(),
            }),
          ),
        );
        delete prof.deliveredAt;
        let r;
        try {
          r = await submitJob({ path: "sheets", coll: "profile", docId: S.me, data: prof });
        } catch (e) {
          S.myProfile = before;
          showErr(saveErrMsg(e));
          $("f-save").disabled = false;
          return;
        }
        S.myProfile = prof;
        S.detailsLocal = prof.details;
        autoClearPrompts("details");
        closeForm();
        toast(
          r === "queued"
            ? "Details kept on this phone. They'll send when you have signal."
            : "Details saved",
        );
        try {
          render();
        } catch (e) {}
      } catch (e) {
        showErr(saveErrMsg(e));
        $("f-save").disabled = false;
      }
    },
    forOther ? "dt-fullName" : "dt-dob",
  );
  if (target && target.off && target.rec)
    armDelete(() => S.db.doc("offapp/" + target.rec.id).delete());
}
function renderDetailsNeeded() {
  $("h1").textContent = "Your details";
  $("main").innerHTML =
    `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
    <b style="font-family:var(--f-display);font-size:19px">One more step</b>
    <div>Before you start, fill in your details and your <b>next of kin</b>, so James knows who to contact in an emergency. It takes about two minutes.</div>
    <button class="btn primary" id="dt-start" type="button">Fill in my details</button></div>`;
  $("dt-start").onclick = () => openDetails();
}
