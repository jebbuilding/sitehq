/* ===== quick enquiry: a few details + the visit time, into the planner, with a reminder an hour before ===== */
import { openClientChat } from "../chat/chat.js";
import { CJOBS } from "./address-book-jobs.js";
import {
  clContactsHtml,
  clInvHtml,
  clMainHtml,
  clientSites,
  histHtml,
  wireHist,
} from "./address-book.js";
import { CL_STAGES, clStage, openClientForm, saveClient } from "./clients.js";
import { clDocsHtml, wireClDocs } from "./documents.js";
import { clGdprHtml, wireClGdpr } from "./gdpr-consent.js";
import { mjEdit } from "./more-jobs.js";
import { ptCl, ptClientBlock, wirePtClientBlock } from "./portal.js";
import { clientPdf } from "./record-pdf.js";
import { clMediaHtml, wireClMedia } from "./sketches.js";
import {
  clAddPlan,
  clAddr,
  clAddrLines,
  clPlanListHtml,
  clStepsHtml,
  wireClSteps,
} from "./stages-planner.js";
import { webEnqFiled } from "./web-enquiries.js";
import { $, addDays, esc, gbp, iso, shortDay, stamp, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { RAW, S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, saveAsset, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { deleteClientFlow } from "../owner/delete-client-site.js";
import { BIN_DAYS, binDelete } from "../owner/deleted-items.js";
import { openPlanEditor } from "../planner/board.js";
import { toHM } from "../planner/diary.js";
import { SAMPLES } from "../purchasing/samples.js";
import { shrinkImage } from "../safety/training.js";
import { jfOpenClient } from "../sales/job-file.js";
import { editSiteJob, syncSiteJobs } from "../sites/job-details.js";
import { dropPin, miniMap } from "../sites/maps-pins.js";
import { same } from "../sites/project-pages.js";
import { DWS } from "../survey/door-window-survey.js";
export { VISIT_REMIND_MIN, initQuickEnquiry, quickEnquiry, viewClient };
const VISIT_REMIND_MIN = 60;
function icsFor(o) {
  const p = (n) => String(n).padStart(2, "0");
  const dt = (d, t) => {
    const [y, mo, da] = d.split("-");
    const [h, mi] = (t || "10:00").split(":");
    return `${y}${mo}${da}T${p(h)}${p(mi)}00`;
  };
  const escI = (t) =>
    String(t || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/([,;])/g, "\\$1");
  const now = new Date(),
    stampU =
      now.getUTCFullYear() +
      p(now.getUTCMonth() + 1) +
      p(now.getUTCDate()) +
      "T" +
      p(now.getUTCHours()) +
      p(now.getUTCMinutes()) +
      "00Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SiteHQ//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + (o.uid || newId()) + "@sitehq",
    "DTSTAMP:" + stampU,
    "DTSTART:" + dt(o.date, o.time),
    "DTEND:" + dt(o.date, o.end || o.time),
    "SUMMARY:" + escI(o.title),
    o.location ? "LOCATION:" + escI(o.location) : "",
    "DESCRIPTION:" + escI(o.notes || ""),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:" + escI(o.title),
    "TRIGGER:-PT" + (o.remind || VISIT_REMIND_MIN) + "M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
async function visitToPhone(o) {
  const fn = ("Visit - " + (o.who || "client")).replace(/[^\w\s&-]/g, "").trim() + ".ics";
  const blob = new Blob([icsFor(o)], { type: "text/calendar" });
  if (S.dl) {
    try {
      await S.dl.save({ filename: fn, data: blob });
      toast("Open the downloaded file to add it to your phone's calendar");
    } catch (e) {
      if (!(e && e.code === "declined")) toast("Couldn't save the calendar file");
    }
  } else {
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
}
/* pre: filled in already (an enquiry from the website: pre.web is it, filed in the job file once saved) */
function quickEnquiry(pre = {}) {
  const tm = iso(addDays(new Date(), 1));
  openSheet(
    `<h3 id="sheettitle">⚡ Quick enquiry</h3><div class="who">Just the basics and when you're going to see them. It goes in your planner with a reminder ${VISIT_REMIND_MIN / 60} hour before. Fill in the full client form when you're there.</div>
    ${pre.web ? `<div class="notice">🌐 From your website – check it, then book the visit.</div>` : ""}
    <label for="qe-name">Name<input id="qe-name" required maxlength="80" autocomplete="off" placeholder="e.g. Mrs Sarah Jones" value="${esc(pre.name || "")}"></label>
    <div class="grid2"><label for="qe-phone">Phone<input id="qe-phone" type="tel" maxlength="40" placeholder="07…" value="${esc(pre.phone || "")}"></label><label for="qe-pc">Postcode<input id="qe-pc" maxlength="10" autocapitalize="characters" value="${esc(((pre.address || "").match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i) || [""])[0].toUpperCase())}"></label></div>
    ${pre.email ? `<label for="qe-email">Email<input id="qe-email" type="email" maxlength="120" value="${esc(pre.email)}"></label>` : ""}
    <label for="qe-addr">Address<input id="qe-addr" maxlength="200" placeholder="e.g. 14 Church Lane, Topsham" value="${esc(pre.address || "")}"></label>
    <label for="qe-what">What it's about<textarea id="qe-what" maxlength="600" style="min-height:64px" placeholder="e.g. Wants a quote for a garden room, saw the van">${esc(pre.what || "")}</textarea></label>
    <div class="grid2"><label for="qe-d">Visit date<input id="qe-d" type="date" value="${tm}" required></label><label for="qe-t">Time<input id="qe-t" type="time" value="10:00" required></label></div>
    <label for="qe-len">How long<select id="qe-len"><option value="30">30 minutes</option><option value="60" selected>1 hour</option><option value="90">1½ hours</option><option value="120">2 hours</option></select></label>
    <label class="tick"><input type="checkbox" id="qe-ics" checked> <span>Also add it to my phone's calendar (reminds me ${VISIT_REMIND_MIN / 60} hour before, even when SiteHQ is closed)</span></label>
    ${formFoot(false, "Save and book the visit")}`,
    async () => {
      const v = (id) => ($(id).value || "").trim();
      const name = v("qe-name");
      if (!name) {
        showErr("Add their name.");
        return;
      }
      const d = v("qe-d"),
        t = v("qe-t");
      if (!d || !t) {
        showErr("Pick the visit date and time.");
        return;
      }
      $("f-save").disabled = true;
      try {
        const [h, m] = t.split(":").map(Number);
        const len = +v("qe-len") || 60;
        const end = toHM(Math.min(23 * 60 + 59, h * 60 + m + len));
        const c0 = {
          id: "cl-" + newId(),
          name,
          phone: v("qe-phone"),
          address: v("qe-addr"),
          postcode: v("qe-pc").toUpperCase(),
          desc: v("qe-what"),
          stage: "enquiry",
          source: pre.source || "",
          email: $("qe-email") ? v("qe-email") : "",
          quick: true,
          follow: d,
          visit: { date: d, time: t, end },
          notes: [
            {
              text: `${pre.web ? "🌐 Enquiry from the website. " : "⚡ Quick enquiry. "}Visit booked ${shortDay(d)} ${t}.`,
              at: Date.now(),
              auto: true,
            },
          ],
          created: Date.now(),
        };
        const rec = await saveClient(c0);
        if (pre.web) await webEnqFiled(pre.web, rec);
        const work = v("qe-what").split("\n")[0].slice(0, 60);
        await clAddPlan(rec, {
          title: "Visit: " + name + (work ? " (" + work + ")" : ""),
          type: "meeting",
          from: d,
          time: t,
          endTime: end,
          remind: VISIT_REMIND_MIN,
          notes: [clAddr(rec), rec.phone, v("qe-what")].filter(Boolean).join("\n"),
        });
        const ics = $("qe-ics").checked;
        closeForm();
        toast("Saved. Visit booked " + shortDay(d) + " " + t);
        if ("Notification" in window && Notification.permission === "default") {
          try {
            Notification.requestPermission();
          } catch (e) {}
        }
        if (ics)
          visitToPhone({
            uid: rec.id,
            date: d,
            time: t,
            end,
            title: "Visit: " + name,
            location: clAddr(rec),
            notes: [rec.phone && "Tel " + rec.phone, v("qe-what")].filter(Boolean).join("\n"),
            who: name,
          });
        viewClient(rec);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "qe-name",
  );
}
/* while the app is open, pop up a reminder an hour before any planner entry that asks for one */
function visitWatch() {
  if (!ownerMode()) return;
  const now = Date.now();
  const all = (RAW.planPrivate || [])
    .concat(RAW.plan || [])
    .filter((p) => p.remind && p.from && p.time);
  for (const p of all) {
    const st = new Date(p.from + "T" + p.time).getTime();
    if (isNaN(st)) continue;
    const at = st - p.remind * 60000;
    if (now < at || now > st + 15 * 60000) continue;
    const key = "jeb.visitrem." + p.id + "." + p.from + p.time;
    let seen = false;
    try {
      seen = !!localStorage.getItem(key);
    } catch (e) {}
    if (seen || (window.__visShown || {})[key]) continue;
    (window.__visShown = window.__visShown || {})[key] = 1;
    try {
      localStorage.setItem(key, "1");
    } catch (e) {}
    const c = (S.clients || []).find((x) => x.id === p.clientId);
    const mins = Math.max(0, Math.round((st - now) / 60000));
    try {
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("SiteHQ: " + p.title, {
          body: `${mins ? "In " + (mins >= 60 ? Math.round(mins / 6) / 10 + " hours" : mins + " minutes") : "Now"} at ${p.time}${c ? " · " + clAddr(c) : ""}`,
        });
    } catch (e) {}
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "130";
    d.innerHTML = `<div class="dimbox" role="alertdialog" aria-label="Visit reminder"><b>⏰ ${esc(p.title)}</b><div style="margin:6px 0">${mins ? `In about ${mins >= 60 ? "an hour" : mins + " minutes"}, at <b>${esc(p.time)}</b>` : `Now, at <b>${esc(p.time)}</b>`}</div>${c ? `<div class="who">${esc(clAddr(c))}${c.phone ? " · " + esc(c.phone) : ""}</div>` : ""}
      <div class="dimbtns" style="flex-wrap:wrap">${c && clAddr(c) ? `<button type="button" class="btn maplink" data-addr="${esc(clAddr(c))}" data-label="${esc(c.name)}" data-client="${esc(c.id)}">📍 Directions</button>` : ""}${c && c.phone ? `<a class="btn" href="tel:${esc(String(c.phone).replace(/\s+/g, ""))}" style="text-decoration:none;color:var(--ink)">📞 Call</a>` : ""}${c ? `<button type="button" class="btn vr-open">Open client</button>` : ""}<button type="button" class="btn primary vr-x">OK</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".vr-x").onclick = () => d.remove();
    const o = d.querySelector(".vr-open");
    if (o)
      o.onclick = () => {
        d.remove();
        viewClient(c);
      };
    break;
  }
}
/* the client's own details at the top of their page, apart from the job: name, phone, email (written out, tap to
   email) and the address on separate lines (James, Nov 2026) */
function clDetailsBox(c) {
  const tel = String(c.phone || "").replace(/\s+/g, "");
  const lines = clAddrLines(c);
  return `<div class="card cldet"><div class="flabel" style="margin:0 0 6px">👤 Client details</div>
    <div class="cldet-row"><span class="who">Name</span><b>${esc(c.name || "")}</b></div>
    <div class="cldet-row"><span class="who">Phone</span>${tel ? `<a href="tel:${esc(tel)}">📞 ${esc(c.phone)}</a>` : '<span class="who">Not added</span>'}</div>
    <div class="cldet-row"><span class="who">Email</span>${c.email ? `<a href="mailto:${esc(c.email)}" class="cldet-mail">✉ ${esc(c.email)}</a>` : '<span class="who">Not added</span>'}</div>
    <div class="cldet-row"><span class="who">Address</span>${lines.length ? `<span class="cldet-addr">${lines.map(esc).join("<br>")}</span>` : '<span class="who">Not added</span>'}</div></div>`;
}
function viewClient(c) {
  const tel = (c.phone || "").replace(/\s+/g, "");
  const addr = [c.address, c.postcode].filter(Boolean).join(", ");
  const rows = [
    ["Work", c.work],
    ["Budget", c.budget],
    ["Timescale", c.timescale],
    ["Found you through", c.source],
    ["Planning / drawings", c.planning],
    ["Quote", c.quote ? gbp(+c.quote) : ""],
    ["Follow up", c.follow ? shortDay(c.follow) : ""],
    ["Site in the app", c.site],
    ["Added", c.created ? stamp(c.created) : ""],
  ].filter((r) => r[1]);
  setTimeout(() => {
    document.querySelectorAll(".cv-sj").forEach(
      (x) =>
        (x.onclick = () => {
          closeViewer();
          editSiteJob(x.dataset.s);
        }),
    );
  }, 0);
  setTimeout(() => {
    document.querySelectorAll(".cv-fhin").forEach(
      (inp) =>
        (inp.onchange = async (e) => {
          const f = e.target.files && e.target.files[0];
          e.target.value = "";
          if (!f) return;
          if (!S.assets) {
            toast(uploadErr({ code: "not_granted" }));
            return;
          }
          let b = null;
          try {
            b = await shrinkImage(f, 1600);
          } catch (x) {
            if (/^image\/(jpe?g|png|webp)$/.test(f.type || "")) b = f;
          }
          if (!b) {
            toast(
              "That photo couldn't be opened. On iPhone set Camera › Formats to Most Compatible.",
            );
            return;
          }
          toast("Saving the photo…");
          try {
            const a = await uploadFile(b, "front.jpg");
            const rec = await saveClient(Object.assign({}, c, { frontPhoto: a.id }));
            toast("Front photo saved");
            syncSiteJobs();
            viewClient(rec);
          } catch (x) {
            toast(uploadErr(x));
          }
        }),
    );
  }, 0);
  setTimeout(() => {
    document.querySelectorAll(".cv-show").forEach(
      (b) =>
        (b.onclick = () => {
          const el = b.previousElementSibling;
          const on = b.textContent === "Show";
          el.textContent = on ? el.dataset.c : "••••";
          b.textContent = on ? "Hide" : "Show";
        }),
    );
  }, 0);
  setTimeout(() => wireClGdpr(c), 0);
  setTimeout(() => wireClDocs(c), 0);
  setTimeout(() => {
    document.querySelectorAll(".cv-rpo").forEach(
      (b) =>
        (b.onclick = () => {
          const r = (c.recordPdfs || [])[+b.dataset.i];
          if (r) openFile(r.assetId, r.name, "application/pdf");
        }),
    );
    document.querySelectorAll(".cv-rpd").forEach(
      (b) =>
        (b.onclick = () => {
          const r = (c.recordPdfs || [])[+b.dataset.i];
          if (r) saveAsset(r.assetId, r.name);
        }),
    );
    document.querySelectorAll(".cv-rpx").forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure?";
            b.style.width = "auto";
            b.style.padding = "0 8px";
            toast("Tap again to delete this PDF");
            return;
          }
          const r = (c.recordPdfs || [])[+b.dataset.i];
          if (!r) return;
          try {
            if (
              await binDelete({
                assets: [r.assetId],
                title: r.name,
                sub: "Client PDFs · " + c.name,
                type: "application/pdf",
              })
            )
              toast("PDF deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
            viewClient(ptCl(c));
          } catch (e) {
            toast("Couldn't delete");
          }
        }),
    );
  }, 0);
  setTimeout(() => {
    const b = $("cv-fh");
    if (b)
      b.onclick = () =>
        openFile(c.frontPhoto, "Front of " + (c.name || "property") + ".jpg", "image/jpeg");
  }, 0);
  openViewer(`<span class="tag">${esc(clStage(c.stage))}</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 8px;color:var(--accent);text-transform:uppercase">${esc(c.name)}</h3>
    ${!c.frontPhoto ? `<div class="fhaddrow"><span class="who">🏠 Photo of the front of the house</span><label class="btn primary fhpickbtn">📷 Take photo<input type="file" class="cv-fhin" accept="image/*" capture="environment"></label><label class="btn fhpickbtn">🖼 Choose<input type="file" class="cv-fhin" id="cv-fhadd" accept="image/*"></label></div>` : ""}
    ${c.frontPhoto ? `<button type="button" class="fhhero" id="cv-fh"><img src="${blobUrl(c.frontPhoto)}" alt="Front of the property">${addr ? `<span>📍 ${esc(addr)}</span>` : ""}</button>` : ""}
    <div class="actions">${tel ? `<a class="btn primary" href="tel:${esc(tel)}" style="text-decoration:none">📞 Call</a><a class="btn" href="sms:${esc(tel)}" style="text-decoration:none;color:var(--ink)">💬 Text</a>` : ""}${c.email ? `<a class="btn" href="mailto:${esc(c.email)}" style="text-decoration:none;color:var(--ink)">✉ Email</a>` : ""}${addr || c.lat != null ? `<button class="btn maplink" type="button" data-addr="${esc(addr)}" data-label="${esc(c.name)}" data-client="${esc(c.id)}">📍 Map</button>` : ""}<button class="btn" id="cv-msg" type="button">💬 Message in app</button></div>
    <div class="actions">${c.site ? `<button class="btn primary" id="cv-gosite" type="button">🏗️ Open the site</button>` : `<button class="btn primary" id="cv-site" type="button">🏗️ Make it a site</button><span class="who">Moves them to Active site</span>`}</div>
    ${clDetailsBox(c)}
    ${c.visit && c.visit.date >= iso(new Date()) ? `<div class="notice" style="margin-top:10px">📅 Visit booked <b>${esc(shortDay(c.visit.date))} ${esc(c.visit.time || "")}</b> · reminder ${VISIT_REMIND_MIN / 60} hour before <button type="button" class="linkbtn" id="cv-ics">📲 Add to phone calendar</button></div>` : ""}
    ${c.quick ? `<div class="notice warn" style="margin-top:10px">⚡ Quick enquiry: only the basics so far. <button type="button" class="btn primary" id="cv-full" style="margin-left:6px">Fill in the full form</button></div>` : ""}
    ${clStepsHtml(c)}
    <div class="flabel" style="margin-top:12px">🔨 This job</div>
    <label for="cv-stage" style="max-width:320px">Stage<select id="cv-stage">${CL_STAGES.map(([k, l]) => `<option value="${k}" ${k === c.stage ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="details" style="margin-top:10px">${rows.map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${clMainHtml(c)}${clContactsHtml(c)}${
      c.keyLoc || c.keyCode || c.alarmLoc || c.alarmCode
        ? `<div class="card" style="margin-top:10px;padding:10px 12px"><b>🔑 Keys &amp; alarm</b> <span class="who">only you see this</span><div class="details" style="margin-top:6px">${[
            ["House key", c.keyLoc, c.keyCode, "Key safe code"],
            ["Alarm", c.alarmLoc, c.alarmCode, "Alarm code"],
          ]
            .filter((r) => r[1] || r[2])
            .map(
              ([l, loc, code, cl]) =>
                `<div class="drow"><span>${l}</span><span>${esc(loc || "")}${code ? `${loc ? "<br>" : ""}${cl}: <b class="cv-code" data-c="${esc(code)}" style="font-family:var(--f-mono)">••••</b> <button type="button" class="linkbtn cv-show">Show</button>` : ""}</span></div>`,
            )
            .join("")}</div></div>`
        : ""
    }${clInvHtml(c)}
    ${clGdprHtml(c)}
    ${
      clientSites(c).length
        ? `<div class="actions" style="margin-top:8px">${clientSites(c)
            .map(
              (n) =>
                `<button type="button" class="btn sjbig cv-sj" data-s="${esc(n)}">👁 ${esc(n)}: job details &amp; who sees what ›</button>`,
            )
            .join("")}</div>`
        : `<div class="who" style="margin-top:8px">When this job is accepted it becomes a site, and you choose who sees each part of the details.</div>`
    }
    ${c.lat != null ? `<div class="mmwrap">${miniMap(c.lat, c.lon, { addr, label: c.name, cid: c.id })}</div>` : ""}
    <div class="clpin">${c.lat != null ? `📍 <b>Pin saved</b> <span class="who">${(+c.lat).toFixed(5)}, ${(+c.lon).toFixed(5)}${(c.pins || []).length > 1 ? " · " + c.pins.length + " pins" : ""}</span> <button type="button" class="linkbtn maplink" data-addr="${esc(addr)}" data-label="${esc(c.name)}" data-client="${esc(c.id)}">Open / send</button>` : `<span class="who">No pin on the property yet.</span>`} <button type="button" class="pillbtn" id="cv-pin">📍 ${c.lat != null ? "Add another pin" : "Drop a pin"}</button></div>
    <div class="flabel" style="margin-top:12px">🔨 Jobs${CJOBS.jobsOf(c).length ? " (" + CJOBS.jobsOf(c).length + ")" : ""}</div>${CJOBS.rowJobs(c).replace('<div class="abjobs">', '<div class="abjobs cvjobs">')}<div class="actions"><button type="button" class="btn" id="cv-more">＋ Another job</button><button type="button" class="btn" id="cv-morefull">📝 Another job – full details</button></div>
    ${c.stage === "contact" ? `<div class="notice" style="margin-top:12px">📒 In your address book – no job on at the moment. Tap <b>📝 New enquiry</b> when they ask for something.</div>` : ""}
    ${c.desc ? `<div class="flabel" style="margin-top:12px">What they want</div><div class="talkbody pnotes">${esc(c.desc)}</div>` : ""}
    ${
      (c.pastJobs || []).length
        ? `<details class="pmdet" style="margin-top:10px"><summary>Earlier enquiries / jobs (${c.pastJobs.length})</summary>${c.pastJobs
            .slice()
            .reverse()
            .map(
              (j) =>
                `<div class="dwsrow"><span><b>${esc(j.work || "Job")}</b>${j.quote ? " · " + gbp(+j.quote) : ""}<br><span class="who">${esc(clStage(j.stage))} · ${esc(shortDay(iso(new Date(j.at))))}${j.desc ? " · " + esc(j.desc.slice(0, 120)) : ""}</span></span></div>`,
            )
            .join("")}</details>`
        : ""
    }
        ${clPlanListHtml(c)}
        ${histHtml(c)}
    ${ptClientBlock(c)}
${clMediaHtml(c)}
    ${DWS.clientHtml(c)}${SAMPLES.clientHtml(c)}
    <div class="flabel" style="margin-top:12px">Notes and calls</div>
    <div style="display:flex;gap:8px"><textarea id="cv-note" maxlength="1000" placeholder="e.g. Visited, measured up. Sending quote Friday." style="flex:1;min-height:48px"></textarea><button type="button" class="btn primary" id="cv-addnote">Add</button></div>
    <div class="clnotes">${
      (c.notes || [])
        .slice()
        .reverse()
        .map(
          (n) =>
            `<div class="clnote ${n.auto ? "auto" : ""}"><span class="who">${esc(stamp(n.at))}</span><div>${esc(n.text)}</div></div>`,
        )
        .join("") || '<div class="nothing">No notes yet.</div>'
    }</div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" id="cv-jf" type="button">📁 Job file${(() => {
      const j = (S.jobFiles || []).find((x) => x.clientId === c.id);
      return j && (j.items || []).length ? " (" + j.items.length + ")" : "";
    })()}</button><button class="btn" id="cv-pdf" type="button">📄 Make PDF</button><button class="btn" id="cv-edit" type="button">✎ Edit client details</button><button class="btn ${["contact", "done", "lost"].includes(c.stage) ? "primary" : ""}" id="cv-enq" type="button">${["contact", "done", "lost"].includes(c.stage) ? "📝 New enquiry" : "✎ Edit enquiry"}</button><button class="btn" id="cv-visit" type="button">Book a visit in the planner</button></div>
    ${clDocsHtml(c)}
    ${(c.recordPdfs || []).length ? `<div class="card" style="margin-top:12px;padding:10px 12px"><b>📄 Client PDFs saved to this job</b>${c.recordPdfs.map((r, i) => `<div class="attrow"><button type="button" class="incrow cv-rpo" data-i="${i}"><span class="attic" aria-hidden="true">📄</span><span><b>${esc(r.name)}</b><br><span class="who">${esc(stamp(r.at))}${r.pages ? " · " + r.pages + " page" + (r.pages === 1 ? "" : "s") : ""}</span></span></button><button type="button" class="iconbtn cv-rpd" data-i="${i}" aria-label="Download" title="Download">⬇</button><button type="button" class="iconbtn cv-rpx" data-i="${i}" aria-label="Delete" title="Delete" style="color:var(--danger)">🗑</button></div>`).join("")}</div>` : ""}
    <div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn delbtn" id="cv-delete" type="button">🗑 Delete client</button></div>`);
  setTimeout(() => {
    const d = $("cv-delete");
    if (d) d.onclick = () => deleteClientFlow(c);
  }, 0);
  $("cv-stage").onchange = async (e) => {
    const s = e.target.value;
    try {
      const rec = await saveClient(
        Object.assign({}, c, {
          stage: s,
          notes: (c.notes || []).concat([
            { text: "Stage: " + clStage(s), at: Date.now(), auto: true },
          ]),
        }),
      );
      toast("Moved to " + clStage(s));
      viewClient(rec);
      render();
    } catch (err) {
      toast("Couldn't save");
    }
  };
  $("cv-addnote").onclick = async () => {
    const t = $("cv-note").value.trim();
    if (!t) return;
    try {
      const rec = await saveClient(
        Object.assign({}, c, { notes: (c.notes || []).concat([{ text: t, at: Date.now() }]) }),
      );
      viewClient(rec);
      render();
    } catch (e) {
      toast("Couldn't save");
    }
  };
  $("cv-edit").onclick = () => {
    closeViewer();
    openClientForm(c, "contact");
  };
  $("cv-enq").onclick = () => {
    closeViewer();
    openClientForm(c, "enquiry");
  };
  if ($("cv-full"))
    $("cv-full").onclick = () => {
      closeViewer();
      openClientForm(c);
    };
  if ($("cv-ics"))
    $("cv-ics").onclick = () =>
      visitToPhone({
        uid: c.id,
        date: c.visit.date,
        time: c.visit.time,
        end: c.visit.end,
        title: "Visit: " + c.name,
        location: clAddr(c),
        notes: [c.phone && "Tel " + c.phone, c.desc].filter(Boolean).join("\n"),
        who: c.name,
      });
  $("cv-pin").onclick = () => dropPin({ client: c, addr });
  wirePtClientBlock(c);
  wireHist(c);
  wireClSteps(c);
  $("cv-jf").onclick = () => jfOpenClient(c);
  $("cv-pdf").onclick = (e) => clientPdf(c, e.currentTarget);
  if ($("cv-msg")) $("cv-msg").onclick = () => openClientChat(c);
  wireClMedia(c);
  document
    .querySelectorAll(".cvjobs .abjob")
    .forEach((b) => (b.onclick = () => CJOBS.view(c, b.dataset.j)));
  if ($("cv-more")) $("cv-more").onclick = () => mjEdit(c, null, false);
  if ($("cv-morefull")) $("cv-morefull").onclick = () => mjEdit(c, null, true);
  DWS.wireClient(c);
  SAMPLES.wireClient(c, () => viewClient((S.clients || []).find((x) => x.id === c.id) || c));
  $("cv-visit").onclick = () => {
    closeViewer();
    openPlanEditor(null, iso(addDays(new Date(), 1)), {
      title: "Site visit: " + c.name,
      type: "meeting",
      site: c.site || "",
      contact: c.name,
      phone: c.phone || "",
      notes: [addr, c.work, c.desc].filter(Boolean).join("\n").slice(0, 1500),
      vis: "me",
    });
  };
  if ($("cv-site"))
    $("cv-site").onclick = async () => {
      const name = (
        (c.address
          ? c.address
              .split(/\n|,/)
              .map((x) => x.trim())
              .filter(Boolean)
              .join(", ")
          : c.name) + (c.postcode ? " " + c.postcode : "")
      ).trim();
      if (siteNames().some((n) => same(n, name))) {
        toast("That site already exists");
        return;
      }
      try {
        await S.db
          .collection("sites")
          .add(
            Object.assign(
              { name, project: c.work || "", client: c.name, created: Date.now() },
              c.lat != null ? { lat: c.lat, lon: c.lon, pins: c.pins || [] } : {},
            ),
          );
        const rec = await saveClient(
          Object.assign({}, c, {
            site: name,
            /* a site means work is on: they move to On site (James, Nov 2026) */
            stage: ["enquiry", "visit", "quote", "won", "contact"].includes(c.stage)
              ? "onsite"
              : c.stage,
            notes: (c.notes || []).concat([
              { text: "Added as a site: " + name, at: Date.now(), auto: true },
            ]),
          }),
        );
        toast("Site added: " + name);
        viewClient(rec);
        render();
      } catch (e) {
        toast("Couldn't add the site");
      }
    };
  if ($("cv-gosite"))
    $("cv-gosite").onclick = () => {
      closeViewer();
      S.f.proj = c.site;
      S.f.projList = false;
      S.otab = "projects";
      store.set("jeb.otab", "projects");
      render();
    };
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initQuickEnquiry() {
  if (!window.__visitTimer)
    window.__visitTimer = setInterval(() => {
      try {
        visitWatch();
      } catch (e) {}
    }, 30000);
}
