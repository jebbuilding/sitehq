/* ================= JOB PACK: send a job's details to someone not on the app (one PDF or spreadsheet to email or WhatsApp) ================= */
import { $, esc, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { getFileBlob } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { allTeam } from "../owner/owner.js";
import { BRGB, isVid, siteRec } from "../photos/photos.js";
import { keyDatesFor } from "../planner/board.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhLogoId, lhPics, lhPutBot, lhPutTop } from "../sales/letterhead-setup.js";
import { sdShareMail } from "../sales/sales-email.js";
import { sdImgData } from "../sales/sales-pdf.js";
import { sjEffective, sjMaster } from "./job-details.js";
import { taskDone } from "./job-sheets.js";
import { catName } from "./plans-specs.js";
import { same } from "./project-pages.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
export { jkOpen };
/* For a supplier, scaffolder, architect or a trade who isn't on the app yet. James ticks what goes in (the job,
   contacts, access, welfare, hazards, notes, key dates, open job sheets and snags, the drawings list – with the files
   too if he likes – the latest photos and a map link), picks a PDF on his letterhead or a spreadsheet, and it opens
   the share sheet (Mail, WhatsApp…) with the file attached. Where sharing files isn't possible the file saves and a
   ready-written email or WhatsApp message opens for him to attach it. Owner only: it's his choice what goes out. */
const JK_PARTS = [
  ["job", "The job: type of work, start and finish, working hours, what's being done", 1],
  ["contacts", "Site contact and other contacts", 1],
  ["access", "Access, parking & keys", 1, "Check it first: key safe codes go too"],
  ["welfare", "Toilet, welfare, power & water, skips & waste", 1],
  ["safety", "Hazards & things to watch", 1],
  ["notes", "Other notes", 1],
  ["dates", "Key dates", 1],
  ["jobs", "Open job sheets & snag lists, with their tasks", 0],
  ["docs", "Plans, drawings & documents (the list)", 0],
  ["photos", "Latest photos (up to 6)", 0],
  ["map", "Map link to the site", 1],
];
function jkData(site) {
  const m = sjMaster(site);
  const j = sjEffective(m || { site, job: {} });
  const sr = siteRec(site) || {};
  const today = iso(new Date());
  const jobs = (S.jobs || []).filter((x) => same(x.site, site) && x.status !== "closed");
  const docs = (S.docs || []).filter((d) => same(d.site, site) && d.assetId && !d._priv);
  const photos = allTeam("photos")
    .filter((p) => same(p.site, site) && p.assetId && !isVid(p))
    .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0))
    .slice(0, 6);
  const q = sr.lat != null ? sr.lat + "," + sr.lon : site;
  return {
    site,
    j,
    work: j.work || sr.project || "",
    dates: keyDatesFor(site, "").filter((p) => (p.to || p.from) >= today),
    jobs,
    docs,
    photos,
    map: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q),
  };
}
/* the words, section by section: [heading, [[label, value]…]] – shared by the PDF and the spreadsheet */
function jkSections(D, pick) {
  const j = D.j,
    out = [];
  const add = (h, rows) => {
    rows = rows.filter((r) => r && String(r[1] || "").trim());
    if (rows.length) out.push([h, rows]);
  };
  if (pick.job)
    add("The job", [
      ["Site", D.site],
      ["Type of work", D.work],
      ["Start", ukDate(j.start)],
      ["Finish (planned)", ukDate(j.finish)],
      ["Working hours", j.hours],
      ["What's being done", j.scope],
    ]);
  if (pick.contacts)
    add("Contacts", [
      ["Site contact", [j.contactName, j.contactPhone].filter(Boolean).join(" · ")],
      ...String(j.otherContacts || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => ["Also", l]),
    ]);
  if (pick.access) add("Access, parking & keys", [["", j.access]]);
  if (pick.welfare)
    add("Welfare & waste", [
      ["Toilet, welfare, power & water", j.welfare],
      ["Skips & waste", j.waste],
    ]);
  if (pick.safety) add("Hazards & things to watch", [["", j.safety]]);
  if (pick.notes) add("Other notes", [["", j.notes]]);
  if (pick.dates)
    add(
      "Key dates",
      D.dates.map((p) => [
        ukDate(p.from) + (p.to && p.to !== p.from ? " – " + ukDate(p.to) : ""),
        p.title + (p.jobTitle ? " (" + p.jobTitle + ")" : ""),
      ]),
    );
  if (pick.jobs)
    D.jobs.forEach((x) =>
      add((x.kind === "snag" ? "Snag list: " : "Job sheet: ") + (x.title || "Untitled"), [
        ["Due", ukDate(x.due)],
        ...(x.tasks || [])
          .filter((t) => t && String(t.text || "").trim())
          .map((t) => [(taskDone(x, t) || {}).done ? "Done" : "To do", t.text]),
      ]),
    );
  if (pick.docs)
    add(
      "Plans, drawings & documents",
      D.docs
        .slice()
        .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { numeric: true }))
        .map((d) => [
          catName(d.cat),
          (d.title || d.fileName) + (d.fileName && d.title ? " (" + d.fileName + ")" : ""),
        ]),
    );
  if (pick.map) add("Where it is", [["Map", D.map]]);
  return out;
}
/* a photo shrunk for the PDF (keeps the file small enough to email) */
async function jkImg(id) {
  try {
    const b = await getFileBlob(id);
    const u = URL.createObjectURL(b);
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = u;
    });
    const k = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.naturalWidth * k));
    c.height = Math.max(1, Math.round(im.naturalHeight * k));
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u);
    return { u: c.toDataURL("image/jpeg", 0.8), w: c.width, h: c.height };
  } catch (e) {
    return null;
  }
}
async function jkPdf(D, pick, note) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData();
  const M = 20,
    W = 170;
  const pics = await lhPics();
  const logo = pics ? null : await sdImgData(lhLogoId());
  const bottom = pics && pics.bot ? pics.bot.y - 8 : 282;
  let y = 0;
  const head = (first) => {
    if (pics) {
      y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
      lhPutBot(doc, pics);
      return;
    }
    if (logo) {
      const k = Math.min(60 / logo.w, 26 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "jklogo", "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...brand);
      doc.text(co.name, M, 20);
    }
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(3, 38, 207, 38);
    y = first ? 48 : 46;
  };
  const room = (h) => {
    if (y + h > bottom) {
      doc.addPage();
      head(false);
    }
  };
  head(true);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.splitTextToSize("Job details – " + D.site, W).forEach((t) => {
    doc.text(t, M, y);
    y += 7;
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("From " + co.name + " · " + ukDate(iso(new Date())), M, y);
  y += 8;
  if (note) {
    doc.setFontSize(10.5);
    doc.setTextColor(30, 30, 30);
    doc.splitTextToSize(note, W).forEach((t) => {
      room(5);
      doc.text(t, M, y);
      y += 5;
    });
    y += 3;
  }
  jkSections(D, pick).forEach(([h, rows]) => {
    room(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...brand);
    doc.text(h, M, y);
    y += 2;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(M, y, M + W, y);
    y += 5;
    doc.setFontSize(10);
    rows.forEach(([l, v]) => {
      const isLink = /^https?:\/\//.test(v);
      /* a web link shows as a short tappable line, not the long address */
      const lines = isLink
        ? ["Open in Google Maps"]
        : doc.splitTextToSize(String(v), l ? W - 50 : W);
      lines.forEach((t, i) => {
        room(5);
        if (i === 0 && l) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          doc.text(l, M, y);
        }
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...(isLink ? brand : [30, 30, 30]));
        if (isLink)
          doc.textWithLink(t, l ? M + 50 : M, y, {
            url: v,
          });
        else doc.text(t, l ? M + 50 : M, y);
        y += 5;
      });
      y += 1;
    });
    y += 4;
  });
  if (pick.photos && D.photos.length) {
    room(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...brand);
    doc.text("Latest photos", M, y);
    y += 6;
    const bw = (W - 6) / 2,
      bh = 62;
    let col = 0;
    for (const p of D.photos) {
      const im = await jkImg(p.assetId);
      if (!im) continue;
      if (col === 0) room(bh + 9);
      const k = Math.min(bw / im.w, bh / im.h);
      const x = M + col * (bw + 6);
      doc.addImage(im.u, "JPEG", x, y, im.w * k, im.h * k, undefined, "FAST");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(
        doc.splitTextToSize(
          [p.caption, p.takenAt ? new Date(p.takenAt).toLocaleDateString("en-GB") : ""]
            .filter(Boolean)
            .join(" · "),
          bw,
        )[0] || "",
        x,
        y + im.h * k + 4,
      );
      col = 1 - col;
      if (col === 0) y += bh + 9;
    }
    if (col === 1) y += bh + 9;
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`${co.name} · ${D.site} · page ${i} of ${n}`, M, Math.min(bottom + 6, 290));
  }
  return doc.output("blob");
}
/* the spreadsheet: one row per line, headings in their own rows; .xlsx, or .csv if the spreadsheet maker can't load */
async function jkSheet(D, pick, note) {
  const co = coData();
  const rows = [["Job details – " + D.site], ["From " + co.name + " · " + ukDate(iso(new Date()))]];
  if (note) rows.push([note]);
  jkSections(D, pick).forEach(([h, rs]) => {
    rows.push([], [h]);
    rs.forEach(([l, v]) => rows.push([l, v]));
  });
  if (pick.photos && D.photos.length) rows.push([], ["Photos are in the PDF version"]);
  try {
    await loadXlsx();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 90 }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Job details");
    const a = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return {
      blob: new Blob([a], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      ext: "xlsx",
    };
  } catch (e) {
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    return {
      blob: new Blob(["﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n")], {
        type: "text/csv",
      }),
      ext: "csv",
    };
  }
}
function jkOpen(site) {
  if (!ownerMode() || !site) return;
  const D = jkData(site);
  const count = {
    dates: D.dates.length,
    jobs: D.jobs.length,
    docs: D.docs.length,
    photos: D.photos.length,
  };
  openSheet(
    `<h3 id="sheettitle">📦 Send job details</h3>
    <div class="who">For someone who isn't on the app – a supplier, scaffolder, architect or a new trade. Tick what goes in; it makes one file to send.</div>
    <fieldset class="od-who"><legend>What to send</legend>${JK_PARTS.map(([k, l, on, hint]) => {
      const n = count[k];
      const none = n === 0;
      return `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" class="jk-p" value="${k}"${on && !none ? " checked" : ""}${none ? " disabled" : ""}> ${esc(l)}${n != null ? ` <span class="who">(${n || "none"})</span>` : ""}${hint ? ` <span class="who">– ${esc(hint)}</span>` : ""}</label>`;
    }).join("")}
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="jk-files"${count.docs ? "" : " disabled"}> Attach the drawings and documents themselves too</label></fieldset>
    <fieldset class="od-who"><legend>As</legend><label class="inl"><input type="radio" name="jk-fmt" value="pdf" checked> PDF on your letterhead</label><label class="inl"><input type="radio" name="jk-fmt" value="sheet"> Spreadsheet</label></fieldset>
    <fieldset class="od-who"><legend>Send by</legend><label class="inl"><input type="radio" name="jk-how" value="email" checked> Email</label><label class="inl"><input type="radio" name="jk-how" value="wa"> WhatsApp</label><label class="inl"><input type="radio" name="jk-how" value="save"> Just save it</label></fieldset>
    <label for="jk-to">Their email or mobile (optional)</label><input id="jk-to" autocomplete="off" placeholder="e.g. bob@scaffolding.co.uk or 07700 900123">
    <label for="jk-note">A note to go with it (optional)</label><textarea id="jk-note" rows="3" placeholder="e.g. Scaffold needed to the rear from Monday 16th"></textarea>
    ${formFoot(false, "📤 Make and send")}`,
    async () => {
      const pick = {};
      document.querySelectorAll(".jk-p").forEach((b) => (pick[b.value] = b.checked && !b.disabled));
      const files = $("jk-files").checked;
      if (!Object.values(pick).some(Boolean) && !files)
        return showErr("Tick at least one thing to send");
      const fmt = (document.querySelector("[name=jk-fmt]:checked") || {}).value || "pdf";
      const how = (document.querySelector("[name=jk-how]:checked") || {}).value || "email";
      const to = $("jk-to").value.trim(),
        note = $("jk-note").value.trim();
      const base = ("Job details - " + D.site).replace(/[\\/:*?"<>|]+/g, " ").slice(0, 80);
      let main;
      try {
        if (fmt === "pdf") main = { blob: await jkPdf(D, pick, note), filename: base + ".pdf" };
        else {
          const s = await jkSheet(D, pick, note);
          main = { blob: s.blob, filename: base + "." + s.ext };
        }
      } catch (e) {
        return showErr("Couldn't make the file – check your connection and try again");
      }
      const more = [];
      if (files)
        for (const d of D.docs)
          try {
            const b = await getFileBlob(d.assetId);
            if (b) more.push({ blob: b, filename: d.fileName || d.title || "document" });
          } catch (e) {}
      closeForm();
      await jkSend(D, main, more, how, to, note);
    },
    "jk-note",
  );
}
async function jkSend(D, main, more, how, to, note) {
  const co = coData();
  const subject = `Job details – ${D.site} – ${co.name}`;
  const body = `Hi,\n\nHere are the details for the job at ${D.site}${D.work ? " (" + D.work + ")" : ""}.${note ? "\n\n" + note : ""}\n\nAny questions, give me a ring.\n\nThanks,\n${co.owner || ""}\n${co.name}\n${co.mobile || co.phone || ""}`;
  const all = [main].concat(more);
  if (how === "save") {
    for (const f of all)
      try {
        await S.dl.save({ filename: f.filename, data: f.blob });
      } catch (e) {}
    toast(all.length > 1 ? `${all.length} files saved` : "Saved");
    return;
  }
  const isMail = /@/.test(to);
  if (how === "email") {
    await sdShareMail({
      blob: main.blob,
      filename: main.filename,
      more,
      to: isMail ? to : "",
      subject,
      body,
    });
    return;
  }
  /* WhatsApp: the share sheet has it on a phone or iPad; otherwise save the file and open WhatsApp with the message */
  const files = all.map(
    (f) => new File([f.blob], f.filename, { type: f.blob.type || "application/octet-stream" }),
  );
  try {
    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ files, title: subject, text: body });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  for (const f of all)
    try {
      await S.dl.save({ filename: f.filename, data: f.blob });
    } catch (e) {}
  const num = isMail ? "" : String(to).replace(/\D/g, "").replace(/^0/, "44");
  const a = document.createElement("a");
  a.href = `https://wa.me/${num}?text=${encodeURIComponent(body)}`;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(
    all.length > 1
      ? `The ${all.length} files have saved – attach them in WhatsApp`
      : "The file has saved – attach it in WhatsApp",
  );
}
