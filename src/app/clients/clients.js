/* ================= CLIENTS (owner only, stored in the private todos collection as kind:"client") ================= */
import { initials } from "../chat/chat.js";
import { docPicker } from "./documents.js";
import { ptCl } from "./portal.js";
import { viewClient } from "./quick-enquiry.js";
import { clientPdf } from "./record-pdf.js";
import { $, esc, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, applyGone, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openNotePage } from "../drawing/paving.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { newId, saveOrKeep } from "../files/outbox.js";
import { VID_MAX, audExt, audTag, vidExt, wireVoice } from "../photos/photos.js";
import { shrinkImage } from "../safety/training.js";
import { syncSiteJobs } from "../sites/job-details.js";
import { hereNow, miniMap, parseLatLon } from "../sites/maps-pins.js";
import { siteArchiveForClient } from "../sites/storage.js";
import { DWS } from "../survey/door-window-survey.js";
export {
  CL_SOURCE,
  CL_STAGES,
  CL_WORK,
  clAddNote,
  clInitials,
  clList,
  clStage,
  newEnquiryFor,
  nmParts,
  nmSortKey,
  openClientForm,
  saveClient,
};
const CL_STAGES = [
  ["enquiry", "Job to see"],
  ["visit", "Job to cost"],
  ["quote", "Estimate sent"],
  ["won", "Accepted"],
  ["onsite", "On site"],
  ["done", "Completed"],
  ["lost", "Rejected"],
  ["contact", "📒 Address book (no job yet)"],
];
const CL_WORK = [
  "Extension",
  "Loft conversion",
  "Kitchen",
  "Bathroom",
  "Renovation",
  "New build",
  "Garage conversion",
  "Groundworks / drainage",
  "Landscaping",
  "Repairs / maintenance",
  "Other",
];
const CL_SOURCE = [
  "Recommendation",
  "Website",
  "Facebook / Instagram",
  "Google",
  "Checkatrade / MyBuilder",
  "Planning lead",
  "Repeat client",
  "Sign board",
  "Other",
];
const clStage = (k) => (CL_STAGES.find((s) => s[0] === k) || CL_STAGES[0])[1];
const clList = () => (S.clients || []).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
/* add a note to a client without overwriting anything saved a moment ago */
async function clAddNote(c, text) {
  let cur = ptCl(c);
  try {
    const d = await S.db.doc("todos/" + c.id).get();
    if (d.exists) cur = Object.assign({}, d.data(), { id: c.id });
  } catch (e) {}
  const notes = (cur.notes || []).concat([{ text, at: Date.now(), auto: true }]);
  await saveOrKeep(
    "todos/" + c.id,
    "update",
    { notes, updated: Date.now() },
    "Client note: " + (cur.name || ""),
  );
  const i = (S.clients || []).findIndex((x) => x.id === c.id);
  if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], cur, { notes });
}
async function saveClient(c) {
  const d = Object.assign({}, c);
  delete d.id;
  d.kind = "client";
  d.updated = Date.now();
  {
    const old = (S.clients || []).find((x) => x.id === c.id);
    if (old) {
      let fresh = null;
      try {
        const g = await S.db.doc("todos/" + c.id).get();
        if (g.exists) fresh = g.data();
      } catch (e) {}
      if (fresh)
        ["ptDocs", "ptSigns", "ptDates", "recordPdfs"].forEach((k) => {
          if (JSON.stringify(d[k] || []) === JSON.stringify(old[k] || []) && fresh[k])
            d[k] = fresh[k];
        });
    }
  }
  {
    const old = (S.clients || []).find((x) => x.id === c.id);
    if (old && old.stage !== d.stage)
      setTimeout(() => siteArchiveForClient(Object.assign({}, d, { id: c.id }), old.stage), 400);
  }
  {
    const old = (S.clients || []).find((x) => x.id === c.id);
    if (
      old &&
      old.gdpr &&
      old.gdpr.status === "signed" &&
      !S.gdprUnlock &&
      JSON.stringify(old.gdpr) !== JSON.stringify(d.gdpr)
    )
      d.gdpr = old.gdpr;
  }
  /* no signal on site: kept on this phone and sent when there is (James, Nov 2026: "working with no signal, for important
     information taking") */
  const how = await saveOrKeep("todos/" + c.id, "set", d, "Client: " + (d.name || ""));
  if (how === "queued") toast("No signal – saved on this phone, it sends when you're back online");
  const i = (S.clients || []).findIndex((x) => x.id === c.id);
  const rec = Object.assign({}, d, { id: c.id });
  if (i >= 0) S.clients[i] = rec;
  else S.clients = (S.clients || []).concat([rec]);
  return rec;
}
/* names: title, first name and surname kept separately; older records are split from the full name */
const NM_TITLES = [
  "Mr & Mrs",
  "Mr and Mrs",
  "Mr",
  "Mrs",
  "Miss",
  "Ms",
  "Mx",
  "Dr",
  "Prof",
  "Rev",
  "Sir",
  "Lady",
  "Lord",
];
function nmParts(x) {
  x = x || {};
  if (x.first || x.last || x.title)
    return { title: x.title || "", first: x.first || "", last: x.last || "" };
  let n = String(x.name || "")
    .trim()
    .replace(/\s+/g, " ");
  let title = "";
  for (const t of NM_TITLES) {
    const re = new RegExp(
      "^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+") + "\\.?(\\s+|$)",
      "i",
    );
    if (re.test(n)) {
      title = t;
      n = n.replace(re, "").trim();
      break;
    }
  }
  const w = n.split(" ").filter(Boolean);
  if (!w.length) return { title, first: "", last: "" };
  if (w.length === 1) return { title, first: "", last: w[0] };
  return { title, first: w.slice(0, -1).join(" "), last: w[w.length - 1] };
}
const nmJoin = (p) =>
  [p.title, p.first, p.last]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" ");
const nmSortKey = (x) => {
  const p = nmParts(x);
  return (
    ((p.last || "") + " " + (p.first || "")).trim().toLowerCase() ||
    String((x && x.name) || "").toLowerCase()
  );
};
const nmInputs = (cls, p, lab) =>
  `<div class="nmrow"><input class="${cls}-t" list="nm-titles" maxlength="20" placeholder="Title" value="${esc(p.title || "")}" aria-label="${lab} title"><input class="${cls}-f" maxlength="60" placeholder="First name" value="${esc(p.first || "")}" aria-label="${lab} first name" autocapitalize="words"><input class="${cls}-l" maxlength="60" placeholder="Surname" value="${esc(p.last || "")}" aria-label="${lab} surname" autocapitalize="words"></div>`;
const clInitials = (c) => {
  const p = nmParts(c);
  const t = ((p.first || "")[0] || "") + ((p.last || "")[0] || "");
  return (t || initials(c.name || "?")).toUpperCase();
};
function newEnquiryFor() {
  const cls = (S.clients || [])
    .slice()
    .sort((a, b) => nmSortKey(a).localeCompare(nmSortKey(b), "en", { sensitivity: "base" }));
  openSheet(
    `<h3 id="sheettitle">📝 New enquiry – who's it for?</h3>
    <label for="ne-q">Find someone in your address book<input id="ne-q" type="search" placeholder="Name, phone or address" autocomplete="off"></label>
    <div id="ne-list" style="max-height:44vh;overflow:auto"></div>
    <div class="actions"><button type="button" class="btn primary" id="ne-new">+ Someone new (details and enquiry together)</button></div>
    ${formFoot(false, "Cancel")}`,
    () => closeForm(),
  );
  const hay = (c) => [c.name, c.phone, c.email, c.address, c.postcode].join(" ").toLowerCase();
  const draw = () => {
    const q = $("ne-q").value.toLowerCase().trim();
    const L = cls.filter((c) => !q || hay(c).includes(q)).slice(0, 60);
    $("ne-list").innerHTML =
      L.map(
        (c) =>
          `<button type="button" class="incrow ne-pick" data-id="${esc(c.id)}"><span><b>${esc(c.name)}</b><br><span class="who">${esc([c.phone, String(c.address || "").replace(/\s*\n\s*/g, ", ")].filter(Boolean).join(" · "))} · ${esc(clStage(c.stage))}</span></span><span>›</span></button>`,
      ).join("") || '<div class="nothing">Nobody found – add them as someone new.</div>';
    $("ne-list")
      .querySelectorAll(".ne-pick")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const c = cls.find((x) => x.id === b.dataset.id);
            closeForm();
            setTimeout(() => openClientForm(c, "enquiry"), 120);
          }),
      );
  };
  $("ne-q").oninput = draw;
  draw();
  $("ne-new").onclick = () => {
    closeForm();
    setTimeout(() => openClientForm(null), 120);
  };
  $("f-save").hidden = true;
}
function openClientForm(c, mode) {
  const ed = !!(c && c.id);
  mode = mode || "full";
  const prevStage = c && c.stage;
  c = Object.assign(
    { stage: mode === "contact" ? "contact" : "enquiry", source: "", notes: [] },
    c || {},
  );
  /* starting a new enquiry for someone already in the address book: keep the last job's details in their history and start fresh */
  let archived = null,
    fresh = false,
    goWs = false;
  if (
    mode === "enquiry" &&
    ed &&
    (c.stage === "contact" || c.stage === "done" || c.stage === "lost")
  ) {
    fresh = true;
    if (c.work || c.desc || c.quote) {
      archived = {
        work: c.work || "",
        desc: c.desc || "",
        budget: c.budget || "",
        quote: c.quote || "",
        timescale: c.timescale || "",
        planning: c.planning || "",
        site: c.site || "",
        stage: c.stage,
        source: c.source || "",
        startAt: c.enqAt || ((c.pastJobs || []).length ? c.pastJobs[c.pastJobs.length - 1].at : 0),
        at: Date.now(),
      };
    }
    c = Object.assign({}, c, {
      stage: "enquiry",
      work: "",
      desc: "",
      budget: "",
      timescale: "",
      planning: "",
      quote: "",
      follow: "",
    });
  }
  const conOnly = mode === "contact",
    enqOnly = mode === "enquiry";
  openSheet(
    `<h3 id="sheettitle">${conOnly ? (ed ? "Edit client details" : "New client – details") : enqOnly ? (fresh ? "New enquiry" : "Edit enquiry") + (c.name ? " – " + esc(c.name) : "") : ed ? "Edit client" : "New enquiry"}</h3>
    ${enqOnly ? `<div class="who" style="margin-bottom:6px">👤 ${esc([c.name, c.phone || c.email, [String(c.address || "").replace(/\s*\n\s*/g, ", "), c.postcode].filter(Boolean).join(" ")].filter(Boolean).join(" · "))}</div>` : ""}
    ${conOnly && !ed ? `<div class="who" style="margin-bottom:6px">Just their contact details for your address book. Add an enquiry whenever they ask for a job – from their page, tap <b>📝 New enquiry</b>.</div>` : ""}
    <div id="cf-consec" class="cfsec" ${enqOnly ? "hidden" : ""}>
    <div class="flabel" style="margin-top:4px">Main contact</div>
    <datalist id="nm-titles">${NM_TITLES.filter((t) => t !== "Mr and Mrs")
      .map((t) => `<option value="${esc(t)}">`)
      .join("")}</datalist>
    <div class="cfcon cfmain" id="cf-main">${nmInputs("cfm", nmParts(c), "Client")}<div class="grid2"><input id="cf-phone" type="tel" maxlength="30" placeholder="Phone" value="${esc(c.phone || "")}" aria-label="Phone"><input id="cf-email" type="email" maxlength="120" placeholder="Email" value="${esc(c.email || "")}" aria-label="Email"></div></div>
    <div class="flabel" style="margin-top:4px">Other contacts <span class="who">(partner, tenant, letting agent, site contact…)</span></div>
    <div id="cf-contacts"></div><button type="button" class="btn" id="cf-addc" style="align-self:flex-start">+ Add another contact</button>
    <div class="flabel" style="margin-top:4px">${conOnly ? "Address" : "Where the work is"}</div>
    <div class="fhrow"><div class="fhbox" id="cf-fhbox">${c.frontPhoto ? `<img src="${blobUrl(c.frontPhoto)}" alt="Front of the property">` : `<span>🏠</span>`}</div>
      <div class="fhbtns"><b>Photo of the front</b><span class="who">Take one now, or choose one you've already taken.</span>
        <span style="display:flex;gap:6px;flex-wrap:wrap"><label class="btn primary fhpickbtn">📷 Take photo<input type="file" id="cf-fhcam" accept="image/*" capture="environment" data-cam="1"></label><label class="btn fhpickbtn">🖼 Choose<input type="file" id="cf-fhpick" accept="image/*" data-cam="1"></label>
        <button type="button" class="linkdanger" id="cf-fhx" ${c.frontPhoto ? "" : "hidden"}>Remove</button></span></div></div>
    <div class="addrrow"><label for="cf-addr">Address<input id="cf-addr" maxlength="300" autocomplete="street-address" value="${esc(String(c.address || "").replace(/\s*\n\s*/g, ", "))}" placeholder="e.g. 12 Marine Way, Exmouth"></label>
      <label for="cf-pc">Postcode<input id="cf-pc" maxlength="10" autocomplete="postal-code" value="${esc(c.postcode || "")}" placeholder="EX8 1AA" style="text-transform:uppercase"></label></div>
    <details class="pindet" ${c.lat != null ? "open" : ""}><summary>📍 Add a map pin (optional)</summary>
      <span style="display:flex;gap:6px;margin-top:6px"><input id="cf-pin" style="flex:1" value="${c.lat != null ? esc((+c.lat).toFixed(6) + ", " + (+c.lon).toFixed(6)) : ""}" placeholder="Paste from Maps, e.g. 50.6197, -3.4135" aria-label="Map pin"><button type="button" class="pillbtn" id="cf-here">📡 Here</button></span>
      <div class="mmwrap" id="cf-mm">${c.lat != null ? miniMap(c.lat, c.lon, { label: "Property", still: true }) : ""}</div>
      <div class="who" id="cf-pinmsg">Standing at the property? Tap 📡 Here. Or in Google Maps press and hold the spot and paste the numbers.</div></details>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="cf-invdiff" ${c.invAddress ? "checked" : ""}> Invoice address is different</label>
    <div id="cf-invbox" ${c.invAddress ? "" : "hidden"} class="cfinv"><label for="cf-invname">Invoice to (name or company)<input id="cf-invname" maxlength="100" value="${esc(c.invName || "")}" placeholder="e.g. Smith Lettings Ltd"></label>
      <div class="addrrow"><label for="cf-invaddr">Invoice address<input id="cf-invaddr" maxlength="300" value="${esc(String(c.invAddress || "").replace(/\s*\n\s*/g, ", "))}" placeholder="e.g. 4 High St, Exeter"></label>
      <label for="cf-invpc">Postcode<input id="cf-invpc" maxlength="10" value="${esc(c.invPostcode || "")}" placeholder="EX1 1AA" style="text-transform:uppercase"></label></div>
      <div class="grid2"><label for="cf-invemail">Email invoices to<input id="cf-invemail" type="email" maxlength="120" value="${esc(c.invEmail || "")}" placeholder="if different"></label></div></div>
    <div class="flabel" style="margin-top:4px">🔑 Keys &amp; alarm <span class="who">(only you see these)</span></div>
    <div class="grid2"><label for="cf-keyloc">Where the house key is<input id="cf-keyloc" maxlength="200" value="${esc(c.keyLoc || "")}" placeholder="e.g. Key safe by the back door"></label><label for="cf-keycode">Key safe code<input id="cf-keycode" maxlength="40" value="${esc(c.keyCode || "")}" autocomplete="off" placeholder="e.g. 4821"></label></div>
    <div class="grid2"><label for="cf-alarmloc">Where the alarm panel is<input id="cf-alarmloc" maxlength="200" value="${esc(c.alarmLoc || "")}" placeholder="e.g. Hallway cupboard, left of front door"></label><label for="cf-alarmcode">Alarm code<input id="cf-alarmcode" maxlength="40" value="${esc(c.alarmCode || "")}" autocomplete="off" placeholder="e.g. 1357"></label></div>
    </div>
    <div id="cf-enqsec" class="cfsec" ${conOnly ? "hidden" : ""}>
    ${conOnly ? "" : `<div class="flabel" style="margin-top:6px">📝 The enquiry</div>`}
    <label for="cf-work">Type of work<select id="cf-work"><option value="">Choose…</option>${CL_WORK.map((w) => `<option ${w === c.work ? "selected" : ""}>${w}</option>`).join("")}</select></label>
    <label for="cf-desc">What they want done<textarea id="cf-desc" maxlength="3000" style="min-height:100px" placeholder="e.g. Single-storey rear extension, about 4 m × 5 m, open-plan kitchen, roof lights">${esc(c.desc || "")}</textarea></label>
    <div class="grid2"><label for="cf-budget">Budget (if they said)<input id="cf-budget" maxlength="60" value="${esc(c.budget || "")}" placeholder="e.g. £40–50k"></label><label for="cf-time">When they want it done<input id="cf-time" maxlength="80" value="${esc(c.timescale || "")}" placeholder="e.g. Spring 2027"></label></div>
    <div class="grid2"><label for="cf-src">How they found you<select id="cf-src"><option value="">Choose…</option>${CL_SOURCE.map((w) => `<option ${w === c.source ? "selected" : ""}>${w}</option>`).join("")}</select></label>
      <label for="cf-plan">Planning / drawings<select id="cf-plan">${["", "Not needed", "Not started", "Drawings being done", "Applied", "Approved", "Building regs approved"].map((w) => `<option ${w === (c.planning || "") ? "selected" : ""}>${w || "Don't know yet"}</option>`).join("")}</select></label></div>
    <div class="grid2"><label for="cf-stage">Stage<select id="cf-stage">${CL_STAGES.map(([k, l]) => `<option value="${k}" ${k === c.stage ? "selected" : ""}>${l}</option>`).join("")}</select></label><label for="cf-quote">Estimate £ (optional)<input id="cf-quote" inputmode="decimal" maxlength="12" value="${esc(c.quote || "")}"></label></div>
    <label for="cf-follow">Follow up on (optional)<input id="cf-follow" type="date" value="${esc(c.follow || "")}"></label>
    ${ed && !enqOnly ? "" : `<label for="cf-note">${enqOnly ? "Note (optional)" : "First note (optional)"}<textarea id="cf-note" maxlength="1000" placeholder="e.g. Rang Tuesday, wants a visit after 4pm"></textarea></label>`}
    </div>
    <div class="cfmedia"><div class="flabel">Photos &amp; sketches${ed && (c.media || []).length ? ` (${c.media.length} already saved)` : ""}</div>
      <label for="cf-ph">Photos and videos (you can pick several)<input id="cf-ph" type="file" accept="image/*,video/*" multiple></label><button type="button" class="linkbtn" style="align-self:flex-start" onclick="window.__photoTest&&window.__photoTest()">📷 Camera not opening? Test it here</button>
      <div class="actions" style="margin:0"><button type="button" class="btn hv" id="cf-sk">📝 Add a notebook page</button><button type="button" class="btn vrec" id="cf-voice">🎤 Voice note</button>${ownerMode() ? `<button type="button" class="btn hv" id="cf-ws">🪟 Door &amp; window survey</button>` : ""}</div>${ownerMode() ? `<div class="who">🪟 Door &amp; window survey saves ${ed ? "the client" : "the new client"} first, then opens a survey linked to them.</div>` : ""}
      <div id="cf-pend" class="cfpend"></div></div>
    <div class="flabel" style="margin-top:8px">📄 Documents</div><div class="who">Plans, quotes, letters or photos of paperwork. Tick the ones you want added to the client PDF.</div><div id="cf-docs"></div>
    ${formFoot(ed && !enqOnly, enqOnly ? (fresh ? "Save enquiry" : "Save") : conOnly && !ed ? "Add to address book" : ed ? "Save" : "Add client")}`,
    async () => {
      const wantWs = goWs;
      goWs = false;
      const mp = {
        title: $("cf-main").querySelector(".cfm-t").value.trim(),
        first: $("cf-main").querySelector(".cfm-f").value.trim(),
        last: $("cf-main").querySelector(".cfm-l").value.trim(),
      };
      const name = nmJoin(mp);
      if (!mp.first && !mp.last) {
        showErr("Add the client's first name or surname.");
        return;
      }
      if (!$("cf-phone").value.trim() && !$("cf-email").value.trim()) {
        showErr("Add a phone number or email so you can get back to them.");
        return;
      }
      const contacts = [...document.querySelectorAll("#cf-contacts .cfcon")]
        .map((r) => ({
          title: r.querySelector(".cc-t").value.trim(),
          first: r.querySelector(".cc-f").value.trim(),
          last: r.querySelector(".cc-l").value.trim(),
          name: nmJoin({
            title: r.querySelector(".cc-t").value,
            first: r.querySelector(".cc-f").value,
            last: r.querySelector(".cc-l").value,
          }),
          role: r.querySelector(".cc-r").value.trim(),
          phone: r.querySelector(".cc-p").value.trim(),
          email: r.querySelector(".cc-e").value.trim(),
        }))
        .filter((x) => x.name || x.phone || x.email);
      const invOn = $("cf-invdiff").checked;
      const d = Object.assign({}, c, {
        contacts,
        invName: invOn ? $("cf-invname").value.trim() : "",
        invAddress: invOn ? $("cf-invaddr").value.trim() : "",
        invPostcode: invOn ? $("cf-invpc").value.trim().toUpperCase() : "",
        invEmail: invOn ? $("cf-invemail").value.trim() : "",
        name,
        title: mp.title,
        first: mp.first,
        last: mp.last,
        phone: $("cf-phone").value.trim(),
        email: $("cf-email").value.trim(),
        address: $("cf-addr").value.trim(),
        postcode: $("cf-pc").value.trim().toUpperCase(),
        work: $("cf-work").value,
        desc: $("cf-desc").value.trim(),
        budget: $("cf-budget").value.trim(),
        timescale: $("cf-time").value.trim(),
        source: $("cf-src").value,
        planning: $("cf-plan").value === "Don't know yet" ? "" : $("cf-plan").value,
        stage: $("cf-stage").value,
        quote: $("cf-quote")
          .value.trim()
          .replace(/[£,\s]/g, ""),
        follow: $("cf-follow").value,
        keyLoc: $("cf-keyloc").value.trim(),
        keyCode: $("cf-keycode").value.trim(),
        alarmLoc: $("cf-alarmloc").value.trim(),
        alarmCode: $("cf-alarmcode").value.trim(),
        quick: false,
      });
      const pinV = $("cf-pin").value.trim();
      if (pinV) {
        const ll = parseLatLon(pinV);
        if (!ll) {
          showErr(
            /goo\.gl|maps\.app/.test(pinV)
              ? "Short maps links can't be read. In Maps, press and hold the spot and copy the numbers."
              : "The map pin should look like 50.6197, -3.4135",
          );
          return;
        }
        if (c.lat !== ll.lat || c.lon !== ll.lon) {
          d.lat = ll.lat;
          d.lon = ll.lon;
          d.pinApprox = false;
          const others = (c.pins || []).filter((x) => x.label !== "Property");
          d.pins = [
            { id: newId(), label: "Property", lat: ll.lat, lon: ll.lon, note: "", at: Date.now() },
          ].concat(others);
        }
      } else if (ed && c.lat != null) {
        d.lat = null;
        d.lon = null;
        d.pins = (c.pins || []).filter((x) => x.label !== "Property");
      }
      if (!ed) {
        d.id = "cl-" + newId();
        d.created = Date.now();
        d.notes = [];
        const n = $("cf-note").value.trim();
        if (n) d.notes.push({ text: n, at: Date.now() });
      }
      if (enqOnly && ed) {
        d.notes = (d.notes || []).slice();
        const n = $("cf-note").value.trim();
        if (fresh || n)
          d.notes.push({
            text:
              (fresh ? "New enquiry" : "Note") +
              (d.work ? ": " + d.work : "") +
              (n ? " – " + n : ""),
            at: Date.now(),
          });
        d.enqAt = Date.now();
        d.quick = false;
        if (archived) d.pastJobs = (c.pastJobs || []).concat([archived]).slice(-20);
      }
      if ((enqOnly ? prevStage : c.stage) !== d.stage)
        (d.notes = d.notes || []).push({
          text: "Stage: " + clStage(d.stage),
          at: Date.now(),
          auto: true,
        });
      $("f-save").disabled = true;
      if (fh.blob) {
        try {
          if (!S.assets) throw { code: "not_granted" };
          $("f-save").textContent = "Uploading the house photo…";
          const a = await uploadFile(fh.blob, "front.jpg");
          d.frontPhoto = a.id;
        } catch (e) {
          showErr(uploadErr(e));
          $("f-save").disabled = false;
          $("f-save").textContent = ed ? "Save" : "Add client";
          return;
        }
      } else if (fh.removed) d.frontPhoto = "";
      try {
        const ph = [...($("cf-ph").files || [])];
        const items = ph
          .map((f) => ({
            f,
            kind:
              /^video\//.test(f.type || "") || /\.(mp4|mov|webm|3gp)$/i.test(f.name || "")
                ? "video"
                : "photo",
          }))
          .concat(pend);
        const added = [];
        if (items.length && !S.assets) {
          showErr(uploadErr({ code: "not_granted" }));
          $("f-save").disabled = false;
          return;
        }
        for (let i = 0; i < items.length; i++) {
          $("f-save").textContent = `Uploading ${i + 1} of ${items.length}…`;
          const it = items[i];
          if (it.done) {
            added.push(Object.assign({}, it.done, { at: Date.now() + i }));
            continue;
          }
          if (it.kind === "video") {
            if (it.f.size > VID_MAX) {
              toast(
                `A video is too big (${(it.f.size / 1048576).toFixed(0)} MB) and was left out. Keep videos to about 20 seconds.`,
              );
              continue;
            }
            const a = await uploadFile(it.f, "video." + vidExt(it.f.type));
            added.push({
              id: a.id,
              kind: "video",
              type: it.f.type || "video/mp4",
              at: Date.now() + i,
            });
            continue;
          }
          if (it.kind === "audio") {
            const a = await uploadFile(it.blob, "voice." + audExt(it.type));
            added.push({
              id: a.id,
              kind: "audio",
              type: it.type,
              secs: it.secs || 0,
              at: Date.now() + i,
            });
            continue;
          }
          const blob = it.kind === "photo" ? await shrinkImage(it.f) : it.blob;
          const a = await uploadFile(blob, it.kind + ".jpg");
          added.push({ id: a.id, kind: it.kind, note: it.note || "", at: Date.now() + i });
        }
        if (added.length) d.media = (d.media || []).concat(added);
        {
          const dl = docPick.items();
          const nd = [];
          for (let i = 0; i < dl.length; i++) {
            const it = dl[i];
            if (it.existing) {
              nd.push(Object.assign({}, it.existing, { inPdf: it.inPdf }));
              continue;
            }
            if (!S.assets) {
              showErr(uploadErr({ code: "not_granted" }));
              $("f-save").disabled = false;
              return;
            }
            $("f-save").textContent = `Document ${i + 1}/${dl.length}…`;
            const img = /^image\//.test(it.file.type || "");
            let blob = it.file;
            if (img) {
              try {
                blob = await shrinkImage(it.file, 2200);
              } catch (e) {}
            }
            const a = await uploadFile(blob, it.file.name || "document");
            nd.push({
              assetId: a.id,
              name: it.file.name || (img ? "Document photo.jpg" : "Document"),
              type: img ? "image/jpeg" : it.file.type || "application/pdf",
              size: blob.size,
              at: Date.now() + i,
              inPdf: it.inPdf,
            });
          }
          d.docs = nd;
        }
        const rec = await saveClient(d);
        syncSiteJobs();
        closeForm();
        toast(
          (ed ? "Saved" : "Client added") +
            (added.length
              ? ` with ${added.length} photo${added.length === 1 ? "" : "s"}/sketch${added.length === 1 ? "" : "es"}`
              : ""),
        );
        render();
        if (wantWs) setTimeout(() => DWS.open(null, { client: rec }), 200);
        else setTimeout(() => viewClient(rec), 200);
        if (!wantWs && !ed && (added.length || (rec.docs || []).some((x) => x.inPdf)))
          setTimeout(() => clientPdf(rec, null, { download: false }), 900);
      } catch (e) {
        showErr(
          e && e.message === "decode"
            ? 'A photo couldn\'t be opened. Set the camera to JPG ("Most Compatible" on iPhone).'
            : "Couldn't save. Check your connection.",
        );
        $("f-save").disabled = false;
        $("f-save").textContent = ed ? "Save" : "Add client";
      }
    },
    null,
  );
  if ($("cf-ws"))
    $("cf-ws").onclick = () => {
      goWs = true;
      $("f-save").click();
      goWs = false;
    };
  setTimeout(() => {
    const f = $("cf-main") && $("cf-main").querySelector(".cfm-f");
    if (f && !f.value) f.focus();
  }, 60);
  const fh = { blob: null, removed: false };
  const fhSet = async (f) => {
    if (!f) return;
    let b = null;
    try {
      b = await shrinkImage(f, 1600);
    } catch (e) {
      if (/^image\/(jpe?g|png|webp)$/.test(f.type || "")) b = f;
    }
    if (!b) {
      toast(
        "That photo couldn't be opened. On iPhone set Camera › Formats to Most Compatible, or pick a different photo.",
      );
      return;
    }
    fh.blob = b;
    fh.removed = false;
    $("cf-fhbox").innerHTML = `<img src="${URL.createObjectURL(b)}" alt="Front of the property">`;
    $("cf-fhx").hidden = false;
    toast("Photo added. It saves when you tap Save.");
  };
  ["cf-fhpick", "cf-fhcam"].forEach((id) => {
    $(id).onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      fhSet(f).finally(() => {
        e.target.value = "";
      });
    };
  });
  $("cf-fhx").onclick = () => {
    fh.blob = null;
    fh.removed = true;
    $("cf-fhbox").innerHTML = "<span>🏠</span>";
    $("cf-fhx").hidden = true;
  };
  const docPick = docPicker($("cf-docs"), c.docs || []);
  const pend = [];
  const drawPend = () => {
    $("cf-pend").innerHTML = pend
      .map(
        (p, i) =>
          `<span class="cfp${p.kind === "audio" ? " cfpaud" : ""}">${p.kind === "audio" ? `<span class="cfpa">🎤 Voice note${p.secs ? " " + p.secs + "s" : ""}</span>${audTag(p.url)}` : `<img src="${p.url}" alt="Sketch ${i + 1}">`}<button type="button" class="linkdanger cfp-x" data-i="${i}" aria-label="Remove sketch ${i + 1}">✕</button></span>`,
      )
      .join("");
    $("cf-pend")
      .querySelectorAll(".cfp-x")
      .forEach(
        (b) =>
          (b.onclick = () => {
            pend.splice(+b.dataset.i, 1);
            drawPend();
          }),
      );
  };
  wireVoice($("cf-voice"), (f) => {
    if (f.size > VID_MAX) {
      toast("That recording is too big. Keep it under about 10 minutes.");
      return;
    }
    pend.push({
      kind: "audio",
      blob: f,
      type: f.type || "audio/mp4",
      secs: f.secs || 0,
      url: URL.createObjectURL(f),
    });
    drawPend();
    toast("Voice note added. It saves with the client.");
  });
  $("cf-sk").onclick = () =>
    openNotePage({
      title: "",
      size: "A4",
      orient: "port",
      pro: ownerMode(),
      headLines: (() => {
        const v = (id) => {
          const el = $(id);
          return el ? String(el.value || "").trim() : "";
        };
        const nm = nmJoin({
          title: $("cf-main").querySelector(".cfm-t").value,
          first: $("cf-main").querySelector(".cfm-f").value,
          last: $("cf-main").querySelector(".cfm-l").value,
        });
        const ad = [
          v("cf-addr")
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean)
            .join(", "),
          v("cf-pc"),
        ]
          .filter(Boolean)
          .join(", ");
        const wk =
          $("cf-work") && $("cf-work").selectedOptions && $("cf-work").value
            ? $("cf-work").selectedOptions[0].textContent
            : "";
        const srcT =
          $("cf-src") && $("cf-src").value && $("cf-src").selectedOptions
            ? $("cf-src").selectedOptions[0].textContent
            : "";
        return [
          ["Client", nm],
          ["Address", ad],
          ["Phone", v("cf-phone")],
          ["Email", v("cf-email")],
          ["Work", [wk, v("cf-desc")].filter(Boolean).join(" · ")],
          ["Budget", v("cf-budget")],
          ["Found us", srcT],
          ["Notes", v("cf-note")],
          [
            "Visit",
            new Date().toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          ],
        ];
      })(),
      pageType: "Site visit notes",
      client: nmJoin({
        title: $("cf-main").querySelector(".cfm-t").value,
        first: $("cf-main").querySelector(".cfm-f").value,
        last: $("cf-main").querySelector(".cfm-l").value,
      }),
      clientAddr: [
        ($("cf-addr").value || "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
          .join(", "),
        ($("cf-pc").value || "").trim(),
      ]
        .filter(Boolean)
        .join(", "),
      site: [
        ($("cf-addr").value || "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
          .join(", "),
        ($("cf-pc").value || "").trim(),
      ]
        .filter(Boolean)
        .join(" "),
      onSave: (r) => {
        pend.push({
          kind: "page",
          done: { id: r.preview, src: r.src, kind: "page", note: r.title },
          url: blobUrl(r.preview),
        });
        drawPend();
        toast("Page added. It saves with the client and goes into their client PDF.");
      },
    });
  const addCon = (x) => {
    x = x || {};
    const r = document.createElement("div");
    r.className = "cfcon";
    r.innerHTML = `${nmInputs("cc", nmParts(x), "Contact")}<input class="cc-r" maxlength="60" placeholder="Who they are, e.g. Wife, Tenant" value="${esc(x.role || "")}" aria-label="Who they are"><div class="grid2"><input class="cc-p" type="tel" maxlength="30" placeholder="Phone" value="${esc(x.phone || "")}" aria-label="Phone"><input class="cc-e" type="email" maxlength="120" placeholder="Email" value="${esc(x.email || "")}" aria-label="Email"></div><button type="button" class="linkdanger cc-x">Remove this contact</button>`;
    r.querySelector(".cc-x").onclick = () => r.remove();
    $("cf-contacts").appendChild(r);
    return r;
  };
  (c.contacts || []).forEach(addCon);
  $("cf-addc").onclick = () => addCon().querySelector(".cc-n").focus();
  $("cf-invdiff").onchange = (e) => {
    $("cf-invbox").hidden = !e.target.checked;
  };
  const cfMM = () => {
    const ll = parseLatLon($("cf-pin").value);
    $("cf-mm").innerHTML = ll ? miniMap(ll.lat, ll.lon, { label: "Property", still: true }) : "";
  };
  $("cf-pin").addEventListener("input", cfMM);
  $("cf-here").onclick = async () => {
    $("cf-pinmsg").textContent = "Finding you…";
    try {
      const h = await hereNow();
      $("cf-pin").value = h.lat.toFixed(6) + ", " + h.lon.toFixed(6);
      cfMM();
      $("cf-pinmsg").textContent = `Got it (accurate to about ${Math.round(h.acc)} m).`;
    } catch (e) {
      $("cf-pinmsg").textContent =
        e && e.code === 1
          ? "Location is blocked for this app. Paste the pin from Maps instead."
          : "Couldn't get your location here. Paste the pin from Maps instead.";
    }
  };
  if (ed)
    armDelete(async () => {
      await S.db.doc("todos/" + c.id).delete();
      S.clients = S.clients.filter((x) => x.id !== c.id);
      applyGone();
      setTimeout(render, 0);
    });
}
