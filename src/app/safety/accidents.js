/* ================= ACCIDENT & NEAR-MISS REPORTS ================= */
import { startEmployee } from "../core/data.js";
import { lastOf, pickField, pickVal } from "../core/fields.js";
import { $, esc, iso, nowHM, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, csvSave } from "../files/files.js";
import { newId, submitJob } from "../files/outbox.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { meBtn, meInfo } from "../people/personal-details.js";
import {
  BRGB,
  exifDate,
  loadImage,
  pdfLogo,
  readExif,
  siteRec,
  stampPhoto,
} from "../photos/photos.js";
import { loadJsPdf, sigPad } from "./site-inductions.js";
export { INC_KINDS, incidentsBlock, viewIncident, wireIncidents };
const INC_KINDS = {
  injury: "Accident (someone hurt)",
  nearmiss: "Near miss (nobody hurt)",
  dangerous: "Dangerous occurrence",
  damage: "Damage to property or plant",
};
const incOf = (list) => (list || []).filter((s) => s.type === "incident");
const riddorFlag = (d) =>
  d.kind === "dangerous" || !!d.specified || d.hospital === "yes" || d.off7 === "yes";
function openIncident() {
  if (ownerMode() && !S.employeeStarted) {
    S.employeeStarted = true;
    startEmployee();
  }
  setFormType("incident");
  setEditing(null);
  const yn = (id, l, opts) =>
    `<div><div class="flabel">${l}</div><div class="seg" id="${id}">${(
      opts || [
        ["yes", "Yes"],
        ["no", "No"],
      ]
    )
      .map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`)
      .join("")}</div></div>`;
  openSheet(
    `<h3 id="sheettitle">Report an accident or near miss</h3>
    <div class="notice warn" style="margin:0"><b>If someone is badly hurt, call 999 first.</b> Fill this in once everyone is safe.</div>
    <div><div class="flabel">What happened?</div><div class="seg" id="in-kind">${Object.entries(
      INC_KINDS,
    )
      .map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="false">${l}</button>`)
      .join("")}</div></div>
    <div class="grid2"><label for="in-date">Date<input id="in-date" type="date" value="${iso(new Date())}" required></label><label for="in-time">Time<input id="in-time" type="time" value="${nowHM()}" required></label></div>
    ${pickField(
      "in-site",
      "Site",
      siteNames(),
      lastOf(S.mine.entries, () => true, "job"),
      "e.g. 12 Marine Way, Exmouth",
    )}
    <label for="in-what">Describe what happened<textarea id="in-what" required maxlength="1500" placeholder="What were they doing, what went wrong, where exactly"></textarea></label>
    <div id="in-inj" hidden style="display:flex;flex-direction:column;gap:14px">
      <div class="grid2"><label for="in-who">Who was hurt? ${meBtn("in-whome", "Me")}<input id="in-who" maxlength="80" placeholder="Name"></label>
      <label for="in-role">They are<select id="in-role"><option value="">Choose…</option><option>JEB employee</option><option>Subcontractor</option><option>Visitor</option><option>Member of the public</option></select></label></div>
      <label for="in-injury">Injury, and which part of the body<input id="in-injury" maxlength="200" placeholder="e.g. Cut to left hand"></label>
      ${yn("in-fa", "First aid given?")}
      <label for="in-faby">First aid given by (optional)<input id="in-faby" maxlength="80"></label>
      ${yn("in-hosp", "Did they go to hospital?")}
      ${yn(
        "in-off7",
        "Likely to be off work, or unable to do their normal job, for more than 7 days?",
        [
          ["yes", "Yes"],
          ["no", "No"],
          ["unknown", "Don't know yet"],
        ],
      )}
      <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="in-spec"> Serious injury: broken bone (not finger, thumb or toe), amputation, loss of sight, serious burn, crush or head injury, or knocked unconscious</label></div>
    <label for="in-action">What was done straight away?<textarea id="in-action" maxlength="800" placeholder="e.g. Area fenced off, machine isolated, James phoned"></textarea></label>
    <label for="in-wit">Witnesses (optional)<input id="in-wit" maxlength="200" placeholder="Names and phone numbers"></label>
    <label for="in-photos">Photos (optional)<input id="in-photos" type="file" accept="image/*" multiple></label>
    <div class="notice warn" id="in-riddor" hidden style="margin:0"><b>This may need reporting to the HSE (RIDDOR).</b> James will be told straight away.</div>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Your signature</span><button type="button" class="pillbtn" id="in-clear">Clear</button></div><canvas id="in-sig" class="sigpad" aria-label="Signature box"></canvas></div>
    ${formFoot(false, "Send report")}`,
    saveIncident,
    null,
  );
  const sig = sigPad($("in-sig"));
  $("in-clear").onclick = () => sig.clear();
  S.incSig = sig;
  const segv = (id) => {
    const b = $(id) && $(id).querySelector('[aria-pressed="true"]');
    return b ? b.dataset.v : "";
  };
  const sync = () => {
    const k = segv("in-kind");
    $("in-inj").hidden = k !== "injury";
    $("in-riddor").hidden = !riddorFlag({
      kind: k,
      specified: k === "injury" && $("in-spec").checked,
      hospital: k === "injury" ? segv("in-hosp") : "",
      off7: k === "injury" ? segv("in-off7") : "",
    });
  };
  ["in-kind", "in-fa", "in-hosp", "in-off7"].forEach((id) =>
    $(id)
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            $(id)
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            sync();
          }),
      ),
  );
  $("in-spec").onchange = sync;
  sync();
  if ($("in-whome"))
    $("in-whome").onclick = (e) => {
      e.preventDefault();
      $("in-who").value = meInfo().name;
    };
}
async function saveIncident() {
  const segv = (id) => {
    const b = $(id) && $(id).querySelector('[aria-pressed="true"]');
    return b ? b.dataset.v : "";
  };
  const kind = segv("in-kind"),
    inj = kind === "injury";
  const d = {
    type: "incident",
    kind,
    date: $("in-date").value,
    time: $("in-time").value,
    site: pickVal("in-site"),
    what: $("in-what").value.trim(),
    person: inj ? $("in-who").value.trim() : "",
    personRole: inj ? $("in-role").value : "",
    injury: inj ? $("in-injury").value.trim() : "",
    firstAid: inj ? segv("in-fa") : "",
    firstAidBy: inj ? $("in-faby").value.trim() : "",
    hospital: inj ? segv("in-hosp") : "",
    off7: inj ? segv("in-off7") : "",
    specified: inj && $("in-spec").checked,
    action: $("in-action").value.trim(),
    witnesses: $("in-wit").value.trim(),
    name: (S.myProfile && S.myProfile.name) || S.ownerName || "",
    status: "open",
    created: Date.now(),
  };
  if (!kind) {
    showErr("Choose what happened.");
    return;
  }
  if (!d.site) {
    showErr("Choose the site.");
    return;
  }
  if (!d.what) {
    showErr("Describe what happened.");
    return;
  }
  if (inj && !d.person) {
    showErr("Say who was hurt.");
    return;
  }
  if (!S.incSig.drawn) {
    showErr("Sign the report with your finger.");
    return;
  }
  d.riddor = riddorFlag(d);
  d.signature = S.incSig.data();
  const pics = [...($("in-photos").files || [])];
  if (pics.length && !S.assets) {
    showErr(
      "You don't have permission to upload photos. Remove them, or ask James to make you an Editor.",
    );
    return;
  }
  $("f-save").disabled = true;
  $("f-save").textContent = pics.length ? "Preparing photos…" : "Sending…";
  try {
    const files = [];
    for (const f of pics) {
      const ex = readExif(await f.slice(0, 262144).arrayBuffer());
      const sr = siteRec(d.site) || {};
      files.push({
        blob: await stampPhoto(f, {
          site: d.site + " – " + (INC_KINDS[kind] || "incident").toLowerCase(),
          takenAt: exifDate(ex.date) || f.lastModified || Date.now(),
          lat: ex.lat ?? sr.lat ?? null,
          lon: ex.lon ?? sr.lon ?? null,
          siteLoc: ex.lat == null && sr.lat != null,
          name: d.name,
        }),
        name: "incident.jpg",
        field: "photos",
      });
    }
    const r = await submitJob({ coll: "signoffs", docId: "inc-" + newId(), data: d, files });
    closeForm();
    toast(
      r === "queued"
        ? "Report kept on this phone. It sends as soon as you have signal."
        : "Report sent to James",
    );
    render();
  } catch (e) {
    showErr(
      e && e.message === "decode"
        ? 'A photo couldn\'t be opened. Set the camera to JPG ("Most Compatible" on iPhone).'
        : "Couldn't send. Check your connection.",
    );
    $("f-save").disabled = false;
    $("f-save").textContent = "Send report";
  }
}
function incRow(x, owner) {
  return `<button type="button" class="incrow" data-i="${esc(x.id)}" data-w="${esc(x.who || "")}"><span><b>${esc(INC_KINDS[x.kind] || "Incident")}</b>${x.riddor ? ' <span class="tag bad">RIDDOR?</span>' : ""}${owner && x.status !== "reviewed" ? ' <span class="tag day">New</span>' : ""}
    <br><span class="who">${esc(x.site || "")} · ${esc(shortDay(x.date))} ${esc(x.time || "")}${owner ? " · reported by " + esc(x.name || nameOf(x.who)) : ""}</span><br><span class="sub">${esc((x.what || "").slice(0, 120))}</span></span><span aria-hidden="true">›</span></button>`;
}
function incidentsBlock(owner) {
  const list = (
    owner ? allTeam("signoffs") : S.mine.signoffs.map((x) => Object.assign({ who: S.me }, x))
  )
    .filter((s) => s.type === "incident")
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const fresh = list.filter((x) => x.status !== "reviewed");
  return `<div class="day incblock"><div class="dayh"><span>Accidents &amp; near misses</span><span class="sum">${owner ? fresh.length + " to review" : list.length}</span></div>
    <div class="actions"><button class="btn danger" id="inc-new" type="button">Report an accident or near miss</button>${owner && list.length ? `<button class="pillbtn" id="inc-csv" type="button">Download accident book (CSV)</button>` : ""}</div>
    ${
      list
        .slice(0, owner ? 30 : 10)
        .map((x) => incRow(x, owner))
        .join("") ||
      `<div class="nothing">${owner ? "Nothing reported." : "You haven't reported anything."}</div>`
    }</div>`;
}
function wireIncidents(owner) {
  if (!$("inc-new")) return;
  const list = (
    owner ? allTeam("signoffs") : S.mine.signoffs.map((x) => Object.assign({ who: S.me }, x))
  ).filter((s) => s.type === "incident");
  $("inc-new").onclick = openIncident;
  $("main")
    .querySelectorAll(".incrow")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const x = list.find((y) => y.id === b.dataset.i && y.who === b.dataset.w);
          if (x) viewIncident(x, owner);
        }),
    );
  if ($("inc-csv"))
    $("inc-csv").onclick = () => {
      const r = [
        [
          "Date",
          "Time",
          "Type",
          "Site",
          "Reported by",
          "Person hurt",
          "They are",
          "Injury",
          "First aid",
          "Hospital",
          "Off over 7 days",
          "Serious injury",
          "Possible RIDDOR",
          "What happened",
          "Action taken",
          "Witnesses",
          "Reviewed",
          "James's notes",
        ],
      ];
      list
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .forEach((x) =>
          r.push([
            x.date,
            x.time,
            INC_KINDS[x.kind] || x.kind,
            x.site,
            x.name || nameOf(x.who),
            x.person,
            x.personRole,
            x.injury,
            x.firstAid,
            x.hospital,
            x.off7,
            x.specified ? "Yes" : "",
            x.riddor ? "Yes" : "",
            x.what,
            x.action,
            x.witnesses,
            x.status === "reviewed" ? "Yes" : "No",
            x.ownerNotes,
          ]),
        );
      csvSave("Accident book.csv", r);
    };
}
function viewIncident(x, owner) {
  const yn = (v) =>
    v === "yes" ? "Yes" : v === "no" ? "No" : v === "unknown" ? "Don't know yet" : "";
  const rows = [
    ["Type", INC_KINDS[x.kind]],
    ["When", shortDay(x.date) + " " + (x.time || "")],
    ["Site", x.site],
    ["Reported by", x.name || nameOf(x.who)],
    ["Person hurt", [x.person, x.personRole].filter(Boolean).join(" · ")],
    ["Injury", x.injury],
    ["First aid", [yn(x.firstAid), x.firstAidBy].filter(Boolean).join(", by ")],
    ["Went to hospital", yn(x.hospital)],
    ["Off over 7 days", yn(x.off7)],
    ["Serious injury", x.specified ? "Yes" : ""],
    ["What happened", x.what],
    ["Done straight away", x.action],
    ["Witnesses", x.witnesses],
    ["Sent", stamp(x.created)],
  ].filter((r) => r[1]);
  openViewer(`<h3 style="font-family:var(--f-display);margin:0 0 4px">${esc(INC_KINDS[x.kind] || "Incident")}</h3>
    ${x.riddor ? `<div class="notice warn"><b>This may need reporting to the HSE under RIDDOR.</b> Over-7-day injuries must be reported within 15 days; deaths, serious injuries and dangerous occurrences straight away. Check at <a href="https://www.hse.gov.uk/riddor/" target="_blank" rel="noopener">hse.gov.uk/riddor ↗</a></div>` : ""}
    <div class="details">${rows.map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${(x.photos || []).map((id) => `<img src="${blobUrl(id)}" alt="Incident photo" style="width:100%;border-radius:8px;margin-top:8px">`).join("")}
    ${x.signature ? `<div class="flabel" style="margin-top:10px">Signed</div><img src="${esc(x.signature)}" alt="Signature" style="background:#fff;border:1px solid var(--line);border-radius:8px;max-width:300px;width:100%">` : ""}
    ${
      owner
        ? `<label for="iv-notes" style="margin-top:12px">Your notes and action taken<textarea id="iv-notes" maxlength="1000">${esc(x.ownerNotes || "")}</textarea></label>
      <div class="actions" style="margin-top:8px"><button class="btn primary" id="iv-rev" type="button">${x.status === "reviewed" ? "Save notes" : "Mark as reviewed"}</button><button class="btn" id="iv-pdf" type="button">Download PDF</button></div>`
        : `<div class="who" style="margin-top:10px">${x.status === "reviewed" ? "James has reviewed this." : "Sent to James."}${x.ownerNotes ? " James's notes: " + esc(x.ownerNotes) : ""}</div>`
    }`);
  if ($("iv-rev"))
    $("iv-rev").onclick = async () => {
      try {
        await S.db.doc("sheets/" + x.who + "/signoffs/" + x.id).update({
          status: "reviewed",
          reviewedAt: Date.now(),
          ownerNotes: $("iv-notes").value.trim(),
        });
        closeViewer();
        toast("Saved");
      } catch (e) {
        toast("Couldn't save");
      }
    };
  if ($("iv-pdf")) $("iv-pdf").onclick = () => incidentPdf(x, rows);
}
async function incidentPdf(x, rows) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  toast("Making the PDF…");
  try {
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't load the PDF maker. Check your connection.");
    return;
  }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const W = 210,
    M = 16;
  let y = 18;
  const clean = (t) =>
    String(t || "")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g, "");
  const need = (h) => {
    if (y + h > 282) {
      doc.addPage();
      y = 18;
    }
  };
  const text = (t, size = 10, style = "normal", gap = 1.6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.splitTextToSize(clean(t), W - 2 * M).forEach((l) => {
      need(size * 0.45);
      doc.text(l, M, y);
      y += size * 0.42;
    });
    y += gap;
  };
  doc.setFillColor(...BRGB());
  doc.rect(0, 0, W, 6, "F");
  await pdfLogo(doc, W - M, 11, 52, 24);
  text("JEB BUILDING SERVICES", 9, "bold", 6);
  text("Accident / incident report", 18, "bold", 2);
  text(x.site, 12, "bold", 4);
  if (x.riddor) text("Possible RIDDOR report needed - check hse.gov.uk/riddor", 10, "bold", 3);
  rows.forEach(([l, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    need(6);
    doc.text(clean(l), M, y);
    doc.setFont("helvetica", "normal");
    doc.splitTextToSize(clean(v), W - 2 * M - 50).forEach((ln, i) => {
      if (i) need(5);
      doc.text(ln, M + 50, y);
      y += 4.3;
    });
    y += 1.4;
  });
  if (x.ownerNotes) {
    y += 2;
    text("Notes and action taken (James Bray)", 11, "bold", 1.5);
    text(x.ownerNotes, 9.5);
  }
  if (x.signature) {
    need(40);
    y += 2;
    text("Signature of person reporting", 11, "bold", 1.5);
    try {
      doc.addImage(x.signature, "PNG", M, y, 75, 25);
    } catch (e) {}
    y += 30;
  }
  for (const id of x.photos || []) {
    try {
      const b = await (await fetch(blobUrl(id))).blob();
      const u = await new Promise((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.readAsDataURL(b);
      });
      const im = await loadImage(b);
      const w = W - 2 * M,
        h = Math.min(150, (w * im.naturalHeight) / im.naturalWidth);
      need(h + 4);
      doc.addImage(u, "JPEG", M, y, (h * im.naturalWidth) / im.naturalHeight, h);
      y += h + 4;
    } catch (e) {}
  }
  try {
    await S.dl.save({
      filename: `Incident ${x.date} ${clean(x.site)
        .replace(/[^\w\s-]/g, "")
        .trim()}.pdf`,
      data: doc.output("blob"),
    });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
