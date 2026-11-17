/* ================= STRAY HOURS: time booked to a name that isn't one of the jobs ================= */
import { bossName } from "../core/company-names.js";
import { esc, hrs, toast } from "../core/helpers.js";
import { S, archivedSites, siteGone, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { same } from "../sites/project-pages.js";
import { nstIs } from "./non-site-time.js";
export { shCardHtml, shWire };
/* James (Nov 2026): "look into timesheets and they link to the hours each person works and to a job". The Site box
   on a timesheet can be typed in, so "12 High St" booked when the job is "12 High Street" counted on the person's
   timesheet and pay but on no job – its labour cost, health card and job page never saw it. On Timesheets, a card
   lists every name like that (all time, not just this week), with the job it most looks like picked already: one tap
   moves those hours onto the job; "Leave it" hides that name (settings/app.shKeep) for things like a one-off. Not
   for time that isn't on a site (office, quoting…), deleted sites (their own card) or the job's old addresses. */
const shLc = (x) =>
  String(x || "")
    .trim()
    .toLowerCase();
/* every timesheet day and job log booked to a name that is no job, grouped by that name */
function shList() {
  const keep = new Set(((S.settings || {}).shKeep || []).map(shLc));
  const groups = new Map();
  teamIds()
    .concat(S.owner ? [S.me] : [])
    .forEach((id) =>
      ((id === S.me ? S.mine.entries : S.data.entries[id]) || []).forEach((e) => {
        if (!(e.type === "hours" || e.type === "job") || e.open || !e.job) return;
        if (nstIs(e.job) || siteGone(e.job) || keep.has(shLc(e.job))) return;
        if ((S.sites || []).some((x) => same(x.name, e.job))) return;
        const k = shLc(e.job);
        if (!groups.has(k)) groups.set(k, { name: e.job.trim(), ents: [], h: 0, who: new Set() });
        const g = groups.get(k);
        g.ents.push(Object.assign({ who: id }, e));
        g.h += e.type === "hours" ? +e.hours || 0 : 0;
        g.who.add(id);
      }),
    );
  return [...groups.values()].sort((a, b) => b.ents.length - a.ents.length);
}
/* an address cut down to the words that matter: "12 High St." → ["12","high","street"] */
const SH_ABBR = {
  st: "street",
  rd: "road",
  ave: "avenue",
  av: "avenue",
  ln: "lane",
  cl: "close",
  dr: "drive",
  cres: "crescent",
  ct: "court",
  pl: "place",
  sq: "square",
  gdns: "gardens",
  tce: "terrace",
  pk: "park",
};
const shWords = (x) =>
  shLc(x)
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SH_ABBR[w] || w);
/* the job a stray name most looks like, if any looks like it enough */
function shGuess(name) {
  const a = shWords(name);
  const numA = a.filter((w) => /^\d/.test(w));
  let best = null,
    bs = 0;
  (S.sites || []).forEach((x) => {
    const b = shWords(x.name);
    const numB = b.filter((w) => /^\d/.test(w));
    if (numA.length && numB.length && !numA.some((n) => numB.includes(n))) return;
    const A = new Set(a),
      B = new Set(b);
    const both = [...A].filter((w) => B.has(w)).length;
    /* the share of the shorter one's words found in the other */
    const sc = both / Math.max(1, Math.min(A.size, B.size));
    if (sc > bs) {
      bs = sc;
      best = x.name;
    }
  });
  return bs >= 0.6 ? best : null;
}
function shCardHtml() {
  if (!S.owner) return "";
  const L = shList();
  if (!L.length) return "";
  const jobs = siteNames()
    .concat(archivedSites().map((x) => x.name))
    .filter(Boolean);
  return `<div class="notice warn shcard"><b>⚠ Hours booked to ${L.length === 1 ? "a name that isn't one of your jobs" : L.length + " names that aren't your jobs"}</b><div class="who">They count on the person's timesheet and pay, but on no job's costs. Move them onto the right job.</div>
    ${L.map((g, i) => {
      const guess = shGuess(g.name);
      return `<div class="shrow"><div class="shwhat"><b>“${esc(g.name)}”</b> · ${g.ents.length} entr${g.ents.length === 1 ? "y" : "ies"}${g.h ? " · " + hrs(g.h) + " h" : ""} · ${esc([...g.who].map(nameOf).join(", "))}${guess ? `<br><span class="shguess">Looks like <b>${esc(guess)}</b></span>` : ""}</div>
      <div class="shacts"><select class="sh-to" data-k="${i}" aria-label="Move to which job"><option value="">Choose the job…</option>${jobs.map((n) => `<option${n === guess ? " selected" : ""}>${esc(n)}</option>`).join("")}</select><button type="button" class="btn primary sh-move" data-k="${i}">Move to this job</button><button type="button" class="btn sh-keep" data-k="${i}">Leave it</button></div></div>`;
    }).join("")}</div>`;
}
function shWire() {
  const card = document.querySelector(".shcard");
  if (!card) return;
  const L = shList();
  card.querySelectorAll(".sh-move").forEach(
    (b) =>
      (b.onclick = async () => {
        const g = L[+b.dataset.k];
        const to = card.querySelector(`.sh-to[data-k="${b.dataset.k}"]`).value;
        if (!g) return;
        if (!to) {
          toast("Choose the job to move them to");
          return;
        }
        b.disabled = true;
        const now = Date.now();
        try {
          for (const e of g.ents) {
            await S.db.doc("sheets/" + (e._src || e.who) + "/entries/" + e.id).update({
              job: to,
              updated: now,
              editedBy: bossName(),
              editedAt: now,
            });
            const list = (e.who === S.me ? S.mine.entries : S.data.entries[e.who]) || [];
            const x = list.find((y) => y.id === e.id);
            if (x) x.job = to;
          }
          toast(g.ents.length + " moved to " + to);
          render();
        } catch (err) {
          b.disabled = false;
          toast("Couldn't move them. Check your connection.");
        }
      }),
  );
  card.querySelectorAll(".sh-keep").forEach(
    (b) =>
      (b.onclick = async () => {
        const g = L[+b.dataset.k];
        if (!g) return;
        const keep = [...new Set(((S.settings || {}).shKeep || []).concat([g.name]))].slice(-300);
        try {
          await S.db.doc("settings/app").set(Object.assign({}, S.settings, { shKeep: keep }));
          S.settings = Object.assign({}, S.settings, { shKeep: keep });
          toast("OK, “" + g.name + "” left as it is");
          render();
        } catch (err) {
          toast("Couldn't save");
        }
      }),
  );
}
