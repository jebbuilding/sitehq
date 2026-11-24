/* ================= WEEKLY UPDATE: a Friday note to the client – what got done, the photos, what's next ================= */
import { ptOf, ptOnFor, ptSrc } from "./portal.js";
import { bossName } from "../core/company-names.js";
import { $, addDays, esc, iso, monday, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, liveSite } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadAnyFile, uploadErr } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { pgCalc, pgRec } from "../planner/programme.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { siteLabel } from "../sites/job-details.js";
import { sdiDay } from "../sites/site-diary.js";
export { WKU };
/* James (Nov 2026, "weekly update to the client"): 📰 Weekly update on a client's page drafts this week's update from
   what the app already has for their site – the programme stages finished this week and the ones starting next week,
   James's diary notes, days lost to the weather – with this week's site photos to tick. James changes the words as
   he likes; 📤 Send makes it a PDF on the letterhead (the words and the ticked photos) and puts it in their portal's
   📷 Photos, and ✉ also opens an email with the words. On Fridays Today lists the live jobs whose client hasn't had
   this week's update yet. Each send is kept on the client record (updates: [{ wk, at }]). */
const WKU = (() => {
  const wkOf = (d) => iso(monday(d ? parse(d) : new Date()));
  const first = (c) =>
    String(c.name || "")
      .replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "")
      .split(" ")[0] || "";
  const sentThisWeek = (c) => (c.updates || []).some((u) => u.wk === wkOf());
  /* the words, drafted from the week on site */
  function draft(c) {
    const site = c.site || "";
    const mon = wkOf();
    const days = [0, 1, 2, 3, 4]
      .map((i) => iso(addDays(parse(mon), i)))
      .filter((d) => d <= iso(new Date()));
    const pr = site ? pgRec(site) : null;
    const done = [],
      next = [];
    if (pr && !pr.simple) {
      const dt = pgCalc(pr);
      const nMon = iso(addDays(parse(mon), 7)),
        nFri = iso(addDays(parse(mon), 11));
      (pr.stages || []).forEach((s) => {
        if (s.done && s.actTo && s.actTo >= mon && s.actTo < nMon) done.push(s.name);
        const d = dt[s.id];
        if (!s.done && d && d.from <= nFri && d.to >= nMon) next.push(s.name);
      });
    }
    const notes = [],
      wx = [];
    let photos = [];
    days.forEach((d) => {
      try {
        const D = sdiDay(site, d);
        if (D.note) notes.push(D.note);
        if (/rain|storm|snow|gust|wind/i.test(D.weather || ""))
          wx.push(shortDay(d) + ": " + D.weather);
        photos = photos.concat(D.photos || []);
      } catch (e) {}
    });
    const L = [
      `Hello ${first(c)},`,
      "",
      `Here's how the job${site ? " at " + siteLabel(site) : ""} went this week.`,
    ];
    if (done.length) L.push("", "Done this week:", ...done.map((x) => "• " + x));
    if (notes.length) L.push("", ...notes);
    if (wx.length) L.push("", "Weather: " + wx.join("; "));
    if (next.length) L.push("", "Coming up next week:", ...next.map((x) => "• " + x));
    if (!done.length && !notes.length && !next.length) L.push("", "• ");
    L.push("", "Any questions, just ask.", "", bossName());
    return {
      text: L.join("\n"),
      photos: photos.filter((p) => p.assetId && !/^video/.test(p.contentType || "")),
    };
  }
  function open(c0) {
    const c = (S.clients || []).find((x) => x.id === c0.id) || c0;
    const D = draft(c);
    const pick = new Set(D.photos.slice(-6).map((p) => p.id));
    openSheet(
      `<h3 id="sheettitle">📰 Weekly update – ${esc(c.name || "")}</h3>
      <div class="who">Week of ${esc(shortDay(wkOf()))}. Drafted from the site this week – change anything.${sentThisWeek(c) ? " <b>Already sent one this week.</b>" : ""}</div>
      <label for="wku-t">The update<textarea id="wku-t" maxlength="4000" style="min-height:220px">${esc(D.text)}</textarea></label>
      <div class="flabel">📷 Photos to put in it ${D.photos.length ? `<span class="who">tap to add or take out</span>` : ""}</div>
      ${D.photos.length ? `<div class="wku-ph">${D.photos.map((p) => `<button type="button" class="wku-p" data-id="${esc(p.id)}" aria-pressed="${pick.has(p.id)}"><img src="${blobUrl(p.assetId)}" alt=""></button>`).join("")}</div>` : '<div class="who">No photos taken on site this week.</div>'}
      <label class="inl"><input type="checkbox" id="wku-mail"${c.email ? " checked" : ""}> Email it to them too${c.email ? " (" + esc(c.email) + ")" : ""}</label>
      ${formFoot(false, "📤 Send the update")}`,
      async () => {
        const text = $("wku-t").value.trim();
        if (!text) return showErr("Write the update first.");
        const ph = D.photos.filter((p) => pick.has(p.id));
        $("f-save").disabled = true;
        try {
          await send(c, text, ph, $("wku-mail").checked);
          closeForm();
          render();
        } catch (e) {
          showErr(uploadErr(e));
          $("f-save").disabled = false;
        }
      },
      "wku-t",
    );
    document.querySelectorAll(".wku-p").forEach(
      (b) =>
        (b.onclick = () => {
          const on = !pick.has(b.dataset.id);
          if (on) pick.add(b.dataset.id);
          else pick.delete(b.dataset.id);
          b.setAttribute("aria-pressed", String(on));
        }),
    );
  }
  /* the update as a PDF: the words, then the photos two to a row */
  async function pdf(c, text, photos) {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 18,
      CW = W - 2 * M;
    const RED = BRGB();
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/•/g, "-")
        .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
    let y = LH.top || 22;
    const bot = LH.pics ? LH.bot : 280;
    if (!LH.pics) {
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
    }
    const need = (h) => {
      if (y + h > bot) {
        doc.addPage();
        y = LH.top || 22;
      }
    };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...RED);
    doc.text("Weekly update", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      clean(
        `Week of ${shortDay(wkOf())}${c.site ? " · " + siteLabel(c.site) : ""} · ${coData().name || ""}`,
      ),
      M,
      y,
    );
    y += 8;
    doc.setFontSize(10.5);
    doc.setTextColor(17, 17, 17);
    clean(text)
      .split("\n")
      .forEach((ln) => {
        const ls = ln ? doc.splitTextToSize(ln, CW) : [""];
        ls.forEach((l) => {
          need(6);
          doc.text(l, M, y);
          y += 5;
        });
      });
    y += 4;
    const pw = (CW - 6) / 2;
    for (let i = 0; i < photos.length; i++) {
      try {
        const b = await getFileBlob(photos[i].assetId);
        const u = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(b);
        });
        const pr = doc.getImageProperties(u);
        const ph = Math.min(80, (pw * pr.height) / pr.width);
        if (i % 2 === 0) need(ph + 4);
        doc.addImage(u, "JPEG", M + (i % 2) * (pw + 6), y, pw, ph);
        if (i % 2 === 1 || i === photos.length - 1) y += ph + 5;
      } catch (e) {}
    }
    lhFinish(doc, LH);
    return {
      blob: doc.output("blob"),
      fn: `Weekly update ${wkOf()} ${clean(c.name || "")}`.replace(/[^\w\s-]/g, "").trim() + ".pdf",
    };
  }
  async function send(c, text, photos, mail) {
    toast("Making the update…");
    const out = await pdf(c, text, photos);
    let inPortal = false;
    if (ptOnFor(c) || ptOf(c)) {
      const a = await uploadAnyFile(
        new File([out.blob], out.fn, { type: "application/pdf" }),
        out.fn,
      );
      await ptSrc(c).addDoc("wku-" + c.id + "-" + wkOf(), {
        title: "Weekly update – week of " + shortDay(wkOf()),
        fileName: out.fn,
        assetId: a.id,
        contentType: "application/pdf",
        folder: "photos",
        sharedAt: Date.now(),
      });
      try {
        await ptSrc(c).bump();
      } catch (e) {}
      inPortal = true;
    } else
      try {
        await S.dl.save({ filename: out.fn, data: out.blob });
      } catch (e) {}
    if (mail && c.email) {
      const a = document.createElement("a");
      a.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent("Your job – this week's update")}&body=${encodeURIComponent(text + (inPortal ? "\n\n(It's also in your portal, with the photos.)" : ""))}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    const updates = (c.updates || [])
      .filter((u) => u.wk !== wkOf())
      .concat([{ wk: wkOf(), at: Date.now() }])
      .slice(-60);
    await S.db.doc("todos/" + c.id).update({ updates, updated: Date.now() });
    const i = (S.clients || []).findIndex((x) => x.id === c.id);
    if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], { updates });
    toast(
      inPortal
        ? "Update sent – it's in " + c.name + "'s portal"
        : "Update made – their portal isn't on, so it's saved for you to send",
    );
  }
  /* Today, on Fridays (and the weekend): live jobs whose client hasn't had this week's update */
  function due() {
    const wd = new Date().getDay();
    if (!S.owner || !(wd === 5 || wd === 6 || wd === 0)) return [];
    return (S.clients || []).filter(
      (c) => c.site && ["won", "onsite"].includes(c.stage) && liveSite(c.site) && !sentThisWeek(c),
    );
  }
  function todayCard() {
    const L = due();
    if (!L.length) return "";
    return `<div class="card wku-today"><div class="cardbody"><b>📰 Weekly updates to send</b><div class="who">It's the end of the week – let them know how it went.</div>${L.map((c) => `<button type="button" class="incrow wku-go" data-id="${esc(c.id)}"><span><b>${esc(c.name)}</b><br><span class="who">${esc(siteLabel(c.site))}</span></span><span>📰 ›</span></button>`).join("")}</div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".wku-go").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.id);
          if (c) open(c);
        }),
    );
  }
  return { open, draft, todayCard, wireToday, due };
})();
