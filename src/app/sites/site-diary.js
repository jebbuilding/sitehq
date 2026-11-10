/* ================= SITE DIARY: a daily diary for each site that writes itself, plus James's own note ================= */
import {
  $,
  addDays,
  dayLabel,
  esc,
  hrs,
  iso,
  monday,
  parse,
  shortDay,
  toast,
} from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "../owner/company-details.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { BRGB, photoTile, photoViewer } from "../photos/photos.js";
import { keyDatesFor } from "../planner/board.js";
import { wpDays } from "../planner/weather-plan.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhLogoId, lhPics, lhPutBot, lhPutTop } from "../sales/letterhead-setup.js";
import { sdImgData } from "../sales/sales-pdf.js";
import { jkImg } from "./job-pack.js";
import { taskDone } from "./job-sheets.js";
import { same } from "./project-pages.js";
import { SIGNIN } from "./sign-in-book.js";
export { sdiHtml, sdiSlug, sdiWire };
/* Each day on a site is put together from what's already in the app: who signed in and out (timesheets, the
   sign-in book and visitors), the weather (the forecast for that day, saved with the day once James adds a note,
   or the weather noted on the photos), the photos taken, the work and hours logged, job sheet tasks ticked and
   key dates. James adds his own note (typed or spoken with the 🎤 Speak button under it). Any week, month or the
   whole job can be made into one PDF on the letterhead – for disputes, delays, building control or a client asking
   what happened when. Notes are owner-only (todos/sdi-*). */
const sdiSlug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
const sdiId = (site, date) => "sdi-" + sdiSlug(site) + "-" + date;
const sdiRec = (site, date) => (S.siteDiary || []).find((r) => r.id === sdiId(site, date)) || null;
function sdiWx(site, date) {
  const f = wpDays(site);
  const d = f && f.by[date];
  if (!d) return "";
  return [
    d.phrase,
    d.max != null ? Math.round(d.max) + "°C" : "",
    d.rain != null ? "rain " + d.rain + "%" : "",
    d.gust >= 40 ? "gusts " + Math.round(d.gust * 0.621) + " mph" : "",
  ]
    .filter(Boolean)
    .join(", ");
}
/* everything known about one day on one site */
function sdiDay(site, date) {
  const rec = sdiRec(site, date);
  let people = [];
  try {
    people = SIGNIN.rows(date).filter((r) => same(r.site, site));
  } catch (e) {}
  const photos = allTeam("photos")
    .filter(
      (p) =>
        same(p.site, site) && (p.date === date || (p.takenAt && iso(new Date(p.takenAt)) === date)),
    )
    .sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
  const work = allTeam("entries")
    .filter((e) => e.date === date && same(e.job, site) && (e.type === "job" || e.type === "hours"))
    .map((e) => ({
      who: e.who,
      what: e.type === "job" ? e.task || e.desc || "Work" : e.notes || "",
      hours: +e.hours || 0,
      extra: e.kind === "extra",
    }))
    .filter((w) => w.what || w.hours);
  const jobs = (S.jobs || []).filter((j) => same(j.site, site));
  const ticks = [];
  jobs.forEach((j) =>
    (j.tasks || []).forEach((t) => {
      const x = taskDone(j, t);
      if (x && x.done && x.at && iso(new Date(x.at)) === date)
        ticks.push({ job: j.title || "Job sheet", task: t.text || "", by: x.byName || "" });
    }),
  );
  const kd = keyDatesFor(site, "").filter((p) => p.from <= date && (p.to || p.from) >= date);
  const wxPh = [...new Set(photos.map((p) => p.weather).filter(Boolean))][0] || "";
  const weather = (rec && rec.weather) || sdiWx(site, date) || wxPh;
  return {
    date,
    rec,
    note: (rec && rec.note) || "",
    people,
    photos,
    work,
    ticks,
    kd,
    weather,
    any: !!(
      (rec && rec.note) ||
      people.length ||
      photos.length ||
      work.length ||
      ticks.length ||
      kd.length
    ),
  };
}
const sdiWho = (r) =>
  r.guest ? String(r.who).replace(/^px:/, "") + (r.comp ? " (" + r.comp + ")" : "") : nameOf(r.who);
function sdiHtml(site) {
  const today = iso(new Date());
  const date = S.f.sdiDay && S.f.sdiDay <= today ? S.f.sdiDay : today;
  const D = sdiDay(site, date);
  const sec = (h, body) => (body ? `<div class="sdi-sec"><b>${h}</b>${body}</div>` : "");
  const li = (a) =>
    a.length ? `<ul class="sdi-list">${a.map((x) => `<li>${x}</li>`).join("")}</ul>` : "";
  return `<div class="day sdi"><div class="sdi-nav"><button type="button" class="iconbtn" id="sdi-prev" aria-label="Day before">‹</button><b>${esc(dayLabel(parse(date)))}${date === today ? " · today" : ""}</b><button type="button" class="iconbtn" id="sdi-next" aria-label="Day after"${date >= today ? " disabled" : ""}>›</button>${date !== today ? `<button type="button" class="pillbtn" id="sdi-today">Today</button>` : ""}</div>
    ${D.weather ? `<div class="sdi-wx">🌤 ${esc(D.weather)}</div>` : ""}
    ${sec("👷 On site", li(D.people.map((r) => `${esc(sdiWho(r))} <span class="who">${esc(r.in || "")}${r.out ? "–" + esc(r.out) : r.open ? " (still on site)" : ""}</span>`)))}
    ${sec("🔨 Work logged", li(D.work.map((w) => `${esc(nameOf(w.who))}: ${esc(w.what || "Hours")}${w.hours ? ` <span class="who">${hrs(w.hours)} h</span>` : ""}${w.extra ? ' <span class="tag">Extra</span>' : ""}`)))}
    ${sec("✅ Ticked off", li(D.ticks.map((t) => `${esc(t.task)} <span class="who">${esc(t.job)}${t.by ? " · " + esc(t.by) : ""}</span>`)))}
    ${sec("📅 Key dates", li(D.kd.map((p) => esc(p.title))))}
    ${D.photos.length ? `<div class="sdi-sec"><b>📷 Photos (${D.photos.length})</b><div class="phgrid">${D.photos.map((p) => photoTile(p, true, p.who)).join("")}</div></div>` : ""}
    ${!D.any ? `<div class="nothing">Nothing recorded on this day yet.</div>` : ""}
    <label for="sdi-note">Your note for the day</label><textarea id="sdi-note" rows="4" placeholder="e.g. Steel delivered late, 2 hours lost. Building control passed the foundations.">${esc(D.note)}</textarea>
    <div class="actions"><button type="button" class="btn primary" id="sdi-save">Save note</button><button type="button" class="btn" id="sdi-pdf">📄 Diary as a PDF</button></div></div>`;
}
function sdiWire(site) {
  const today = iso(new Date());
  const cur = S.f.sdiDay && S.f.sdiDay <= today ? S.f.sdiDay : today;
  const go = (d) => {
    S.f.sdiDay = d;
    render();
  };
  if ($("sdi-prev")) $("sdi-prev").onclick = () => go(iso(addDays(parse(cur), -1)));
  if ($("sdi-next"))
    $("sdi-next").onclick = () =>
      go(iso(addDays(parse(cur), 1)) > today ? today : iso(addDays(parse(cur), 1)));
  if ($("sdi-today")) $("sdi-today").onclick = () => go(today);
  if ($("sdi-save"))
    $("sdi-save").onclick = async () => {
      const note = $("sdi-note").value.trim();
      const old = sdiRec(site, cur);
      const rec = {
        kind: "sitediary",
        site,
        date: cur,
        note,
        weather: (old && old.weather) || sdiWx(site, cur) || "",
        byName: S.ownerName || "James",
        updated: Date.now(),
      };
      try {
        await S.db.doc("todos/" + sdiId(site, cur)).set(rec);
        const r2 = Object.assign({ id: sdiId(site, cur) }, rec);
        const i = (S.siteDiary || []).findIndex((x) => x.id === r2.id);
        if (i >= 0) S.siteDiary[i] = r2;
        else S.siteDiary = (S.siteDiary || []).concat([r2]);
        toast("Diary note saved");
      } catch (e) {
        toast("Couldn't save – check your connection");
      }
    };
  if ($("sdi-pdf")) $("sdi-pdf").onclick = () => sdiPdfAsk(site, cur);
  const D = sdiDay(site, cur);
  document.querySelectorAll(".sdi .ph").forEach(
    (b) =>
      (b.onclick = () => {
        const p = D.photos.find((x) => x.id === b.dataset.p && x.who === b.dataset.w);
        if (p) photoViewer(p, true, p.who);
      }),
  );
}
/* the first day anything happened on the site */
function sdiFirst(site) {
  const ds = []
    .concat(
      allTeam("entries")
        .filter((e) => same(e.job, site))
        .map((e) => e.date),
    )
    .concat(
      allTeam("photos")
        .filter((p) => same(p.site, site))
        .map((p) => p.date),
    )
    .concat((S.siteDiary || []).filter((r) => same(r.site, site)).map((r) => r.date))
    .filter((d) => /^\d{4}-\d\d-\d\d$/.test(d || ""))
    .sort();
  return ds[0] || iso(new Date());
}
function sdiPdfAsk(site, day) {
  const today = iso(new Date());
  const mon = iso(monday(parse(day)));
  const m1 = day.slice(0, 8) + "01";
  openSheet(
    `<h3 id="sheettitle">📄 Site diary as a PDF</h3>
    <div class="who">Every day with something recorded, one after another, on your letterhead.</div>
    <fieldset class="od-who"><legend>Which days</legend>
    <label class="inl"><input type="radio" name="sdi-r" value="week" checked> The week of ${esc(shortDay(mon))}</label>
    <label class="inl"><input type="radio" name="sdi-r" value="month"> ${esc(parse(m1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</label>
    <label class="inl"><input type="radio" name="sdi-r" value="job"> The whole job so far</label></fieldset>
    <label class="inl"><input type="checkbox" id="sdi-ph" checked> Include the photos</label>
    ${formFoot(false, "Make the PDF")}`,
    async () => {
      const r = (document.querySelector("[name=sdi-r]:checked") || {}).value || "week";
      let from = mon,
        to = iso(addDays(parse(mon), 6));
      if (r === "month") {
        from = m1;
        to = iso(addDays(new Date(parse(m1).getFullYear(), parse(m1).getMonth() + 1, 1), -1));
      }
      if (r === "job") {
        from = sdiFirst(site);
        to = today;
      }
      if (to > today) to = today;
      const days = [];
      for (let d = from; d <= to; d = iso(addDays(parse(d), 1))) {
        const x = sdiDay(site, d);
        if (x.any) days.push(x);
        if (days.length > 400) break;
      }
      if (!days.length) return showErr("Nothing recorded in those days");
      try {
        const blob = await sdiPdf(site, days, $("sdi-ph").checked);
        closeForm();
        await S.dl.save({
          filename:
            ("Site diary - " + site + " - " + from + (to !== from ? " to " + to : "")).replace(
              /[\\/:*?"<>|]+/g,
              " ",
            ) + ".pdf",
          data: blob,
        });
      } catch (e) {
        showErr("Couldn't make the PDF – try again");
      }
    },
    null,
  );
}
async function sdiPdf(site, days, withPhotos) {
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
  const head = () => {
    if (pics) {
      y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
      lhPutBot(doc, pics);
      return;
    }
    if (logo) {
      const k = Math.min(60 / logo.w, 26 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "sdilogo", "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...brand);
      doc.text(co.name, M, 20);
    }
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(3, 38, 207, 38);
    y = 48;
  };
  const room = (h) => {
    if (y + h > bottom) {
      doc.addPage();
      head();
    }
  };
  const para = (t, bold, size, col, indent) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size || 10);
    doc.setTextColor(...(col || [30, 30, 30]));
    doc.splitTextToSize(String(t), W - (indent || 0)).forEach((l) => {
      room(5);
      doc.text(l, M + (indent || 0), y);
      y += (size || 10) * 0.5;
    });
  };
  head();
  para("Site diary – " + site, true, 16);
  y += 1;
  para(
    `${days.length} day${days.length === 1 ? "" : "s"}, ${ukDate(days[0].date)}${days.length > 1 ? " to " + ukDate(days[days.length - 1].date) : ""} · made ${ukDate(iso(new Date()))} by ${co.name}`,
    false,
    9,
    [110, 110, 110],
  );
  y += 4;
  for (const D of days) {
    room(18);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(M, y - 6, M + W, y - 6);
    para(dayLabel(parse(D.date)) + " " + parse(D.date).getFullYear(), true, 12, brand);
    if (D.weather) para("Weather: " + D.weather, false, 9.5, [90, 90, 90]);
    y += 1;
    const block = (h, lines) => {
      if (!lines.length) return;
      para(h, true, 10);
      lines.forEach((l) => para("• " + l, false, 10, null, 3));
      y += 1;
    };
    block(
      "On site",
      D.people.map((r) => `${sdiWho(r)}  ${r.in || ""}${r.out ? "–" + r.out : ""}`),
    );
    block(
      "Work logged",
      D.work.map(
        (w) =>
          `${nameOf(w.who)}: ${w.what || "Hours"}${w.hours ? " (" + hrs(w.hours) + " h)" : ""}${w.extra ? " – extra work" : ""}`,
      ),
    );
    block(
      "Ticked off",
      D.ticks.map((t) => `${t.task} (${t.job}${t.by ? ", " + t.by : ""})`),
    );
    block(
      "Key dates",
      D.kd.map((p) => p.title),
    );
    if (D.note) {
      para("Note", true, 10);
      para(D.note, false, 10, null, 3);
      y += 1;
    }
    if (withPhotos && D.photos.length) {
      const bw = (W - 8) / 3,
        bh = 40;
      let col = 0;
      for (const p of D.photos.slice(0, 9)) {
        const im = await jkImg(p.assetId);
        if (!im) continue;
        if (col === 0) room(bh + 4);
        const k = Math.min(bw / im.w, bh / im.h);
        doc.addImage(im.u, "JPEG", M + col * (bw + 4), y, im.w * k, im.h * k, undefined, "FAST");
        col = (col + 1) % 3;
        if (col === 0) y += bh + 4;
      }
      if (col) y += bh + 4;
      if (D.photos.length > 9)
        para(`+ ${D.photos.length - 9} more photos in the app`, false, 9, [110, 110, 110]);
    }
    y += 5;
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`${co.name} · site diary · ${site} · page ${i} of ${n}`, M, Math.min(bottom + 6, 290));
  }
  return doc.output("blob");
}
