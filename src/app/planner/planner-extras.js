/* ================= PLANNER EXTRAS (owner): who's where today, clashes, copy last week, send the week to the team ================= */
import { initials } from "../chat/chat.js";
import { $, addDays, esc, iso, parse, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { avatarHtml } from "../people/profile-photos.js";
import { openPlanEditor, pbPlanWeek, pbSiteOf, pbSiteShort, siteHue } from "./board.js";
import { onDay, planEntries } from "./time-off.js";
import { openPlanDetail } from "./views.js";
import { same } from "../sites/project-pages.js";
import { myName } from "../survey/door-window-survey.js";
export { plClashHtml, plClashes, plCopyLastWeek, plSendWeek, plWhereHtml, plWireWhere };
/* "Who's where" is a phone-friendly day view: each site that day with its colour and the people on it, who is off
   and who is free. Clashes: someone booked on two sites the same day, or booked while on holiday. Copy last week
   repeats last week's bookings a week on; Send this week tells each person their week (the same message the planner
   sends when one booking is saved). */

/* the people on a planner entry who are in the team (or me) */
const plPeople = (p) => (p.people || []).filter(Boolean);
const plBookable = (p) => p.type !== "holiday" && !p.auto && !p.pending;

/* clashes in these days: [{ who, day, msg }] */
function plClashes(entries, days) {
  const out = [];
  const ids = teamIds().concat([S.me]);
  days.forEach((d) => {
    const di = iso(d);
    ids.forEach((w) => {
      const mine = entries.filter((p) => onDay(p, di) && plPeople(p).includes(w));
      const off = mine.find((p) => p.type === "holiday");
      const work = mine.filter(plBookable);
      const sites = [...new Set(work.map((p) => pbSiteOf(p) || p.title))];
      const nm = w === S.me ? "You" : nameOf(w);
      const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
      if (off && work.length)
        out.push({ who: w, day: di, msg: `${nm} is booked on ${day} but is off that day` });
      else if (sites.length > 1)
        out.push({
          who: w,
          day: di,
          msg: `${nm} is on ${sites.length} jobs on ${day}: ${sites.map(pbSiteShort).join(" and ")}`,
        });
    });
  });
  return out;
}
function plClashHtml(list) {
  if (!list.length) return "";
  return `<div class="notice warn pl-clash"><b>⚠ ${list.length} clash${list.length === 1 ? "" : "es"} this week</b>${list
    .slice(0, 8)
    .map((c) => `<div>${esc(c.msg)}</div>`)
    .join("")}${list.length > 8 ? `<div>…and ${list.length - 8} more</div>` : ""}</div>`;
}

/* ---------- Who's where (a day) ---------- */
function plWhereDay() {
  return S.f.pwday || iso(new Date());
}
function plWhereHtml(shown) {
  const di = plWhereDay(),
    d = parse(di),
    today = iso(new Date());
  const on = shown.filter((p) => onDay(p, di));
  const off = on.filter((p) => p.type === "holiday");
  const work = on.filter((p) => p.type !== "holiday");
  const bySite = {};
  work.forEach((p) => {
    const s = pbSiteOf(p) || "Not at a site";
    (bySite[s] = bySite[s] || []).push(p);
  });
  const busy = new Set(work.flatMap(plPeople).concat(off.flatMap(plPeople)));
  const free = teamIds().filter((w) => !busy.has(w));
  const wkend = d.getDay() === 0 || d.getDay() === 6;
  const person = (w, p) =>
    `<button type="button" class="pl-person" data-p="${esc(p ? p.id : "")}" data-w="${esc(w)}">${w === S.me ? `<span class="pav pavi" style="width:34px;height:34px;font-size:12px">${esc(initials(myName()))}</span>` : avatarHtml(w, 34)}<span><b>${esc(w === S.me ? "You" : nameOf(w))}</b>${p && p.time ? `<small>${esc(p.time)}</small>` : ""}</span></button>`;
  const clash = plClashes(shown, [d]);
  return `<div class="pl-where">
    <div class="pl-wnav"><button type="button" class="iconbtn" id="pl-wprev" aria-label="Day before">‹</button><b>${esc(d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}${di === today ? " · Today" : ""}</b><button type="button" class="iconbtn" id="pl-wnext" aria-label="Day after">›</button>${di !== today ? `<button type="button" class="pillbtn" id="pl-wtoday">Today</button>` : ""}</div>
    ${plClashHtml(clash)}
    ${
      Object.keys(bySite).length
        ? Object.keys(bySite)
            .sort()
            .map((s) => {
              const list = bySite[s];
              const ppl = list.flatMap((p) =>
                plPeople(p).length ? plPeople(p).map((w) => [w, p]) : [],
              );
              const unassigned = list.filter((p) => !plPeople(p).length);
              return `<section class="card pl-site" style="--pc:hsl(${siteHue(s)} 55% 42%)"><div class="cardbody">
                <div class="pl-sh"><i></i><b>${esc(s)}</b><span class="who">${ppl.length} ${ppl.length === 1 ? "person" : "people"}</span></div>
                <div class="pl-ppl">${ppl.map(([w, p]) => person(w, p)).join("")}</div>
                ${unassigned.map((p) => `<button type="button" class="pl-job" data-p="${esc(p.id)}">${p.time ? esc(p.time) + " · " : ""}${esc(p.title)}</button>`).join("")}
                <button type="button" class="linkbtn pl-book" data-site="${esc(s === "Not at a site" ? "" : s)}">+ Book someone here</button>
              </div></section>`;
            })
            .join("")
        : `<div class="empty"><strong>${wkend ? "Weekend" : "Nothing booked"}</strong>${wkend ? "" : "Tap + Book someone to put people on a job."}</div>`
    }
    ${off.length ? `<div class="flabel">Off</div><div class="pl-ppl">${off.flatMap((p) => plPeople(p).map((w) => person(w, p))).join("")}</div>` : ""}
    ${!wkend && free.length ? `<div class="flabel">Free ${di === today ? "today" : "that day"}</div><div class="pl-ppl">${free.map((w) => person(w, null)).join("")}</div>` : ""}
    <button type="button" class="btn primary pl-book" data-site="">+ Book someone</button>
  </div>`;
}
function plWireWhere(entries) {
  const go = (n) => {
    S.f.pwday = iso(addDays(parse(plWhereDay()), n));
    render();
  };
  $("pl-wprev").onclick = () => go(-1);
  $("pl-wnext").onclick = () => go(1);
  if ($("pl-wtoday"))
    $("pl-wtoday").onclick = () => {
      S.f.pwday = "";
      render();
    };
  document.querySelectorAll("#main .pl-person[data-p], #main .pl-job").forEach(
    (b) =>
      (b.onclick = () => {
        const p = entries.find((x) => x.id === b.dataset.p);
        if (p) openPlanDetail(p);
      }),
  );
  /* someone free: book them that day */
  document
    .querySelectorAll('#main .pl-person[data-p=""]')
    .forEach((b) => (b.onclick = () => openPlanEditor(null, plWhereDay())));
  document
    .querySelectorAll("#main .pl-book")
    .forEach((b) => (b.onclick = () => openPlanEditor(null, plWhereDay())));
}

/* ---------- Copy last week ---------- */
function plCopyLastWeek() {
  const wk = parse(pbPlanWeek()),
    from = iso(addDays(wk, -7)),
    to = iso(addDays(wk, -1));
  const src = planEntries().filter(
    (p) =>
      plBookable(p) &&
      !p.leaveId &&
      !String(p.id).startsWith("leave-") &&
      p.from >= from &&
      p.from <= to,
  );
  if (!src.length) return toast("Nothing was booked last week to copy");
  openSheet(
    `<h3 id="sheettitle">📋 Copy last week</h3>
    <div class="who">Puts last week's ${src.length} booking${src.length === 1 ? "" : "s"} into this week (each a week later). Anything already copied isn't added twice. Holidays aren't copied.</div>
    ${formFoot(false, "Copy " + src.length)}`,
    async () => {
      $("f-save").disabled = true;
      const now = planEntries();
      let n = 0;
      try {
        for (const p of src) {
          const nf = iso(addDays(parse(p.from), 7)),
            nt = iso(addDays(parse(p.to || p.from), 7));
          if (
            now.some(
              (x) => x.from === nf && x.title === p.title && same(x.site || "", p.site || ""),
            )
          )
            continue;
          const data = JSON.parse(JSON.stringify(p));
          ["id", "series", "jobTitle"].forEach((k) => delete data[k]);
          Object.assign(data, { from: nf, to: nt, created: Date.now() });
          const coll = p.vis === "me" ? "planprivate" : "plan";
          if (coll === "planprivate") delete data.vis;
          await S.db.doc(coll + "/" + newId()).set(data);
          n++;
        }
        closeForm();
        toast(
          n
            ? `Copied ${n} booking${n === 1 ? "" : "s"} into this week`
            : "They're already in this week",
        );
        render();
      } catch (e) {
        showErr("Couldn't copy. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
}

/* ---------- Send this week to the team ---------- */
function plSendWeek() {
  const wk = parse(pbPlanWeek()),
    days = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  const entries = planEntries().filter((p) => p.vis !== "me");
  const per = {};
  teamIds().forEach((w) => {
    const lines = days
      .map((d) => {
        const di = iso(d);
        const list = entries.filter((p) => onDay(p, di) && plPeople(p).includes(w));
        if (!list.length) return "";
        const what = list
          .map((p) =>
            p.type === "holiday"
              ? "Off"
              : (p.time ? p.time + " " : "") + (pbSiteShort(pbSiteOf(p)) || p.title),
          )
          .join(", ");
        return d.toLocaleDateString("en-GB", { weekday: "short" }) + " " + what;
      })
      .filter(Boolean);
    if (lines.length) per[w] = lines;
  });
  const ids = Object.keys(per);
  if (!ids.length) return toast("Nobody is booked this week yet");
  const lab = `Week of ${wk.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  openSheet(
    `<h3 id="sheettitle">📣 Send this week to the team</h3>
    <div class="who">Each person gets a message in their app with where they are each day this week.</div>
    ${ids.map((w) => `<label class="inl pl-sendto"><input type="checkbox" value="${esc(w)}" checked> <span><b>${esc(nameOf(w))}</b><small>${esc(per[w].join(" · "))}</small></span></label>`).join("")}
    ${formFoot(false, "Send")}`,
    async () => {
      const to = [...document.querySelectorAll(".pl-sendto input:checked")].map((x) => x.value);
      if (!to.length) return showErr("Choose who to send it to.");
      $("f-save").disabled = true;
      let n = 0;
      for (const w of to) {
        try {
          await S.db.doc("sheets/" + w + "/signoffs/pr-pl" + newId()).set({
            type: "prompt",
            form: "plan",
            ref: "",
            refLabel: lab,
            note: per[w].join(" · ").slice(0, 300),
            status: "open",
            created: Date.now(),
          });
          n++;
        } catch (e) {}
      }
      closeForm();
      toast(`Sent to ${n} ${n === 1 ? "person" : "people"}`);
    },
  );
}
