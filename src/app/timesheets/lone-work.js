/* ================= LONE WORKING: someone on site on their own says when they'll check in; James is told if they don't ================= */
import { bossFirst } from "../core/company-names.js";
import { $, esc, iso, nowHM, toMin, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { submitJob } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { siteLabel } from "../sites/job-details.js";
import { dayFor } from "./working-day.js";
export { LWK, initLoneWork };
/* James (Nov 2026, "lone working check-in"): when a trade is checked in on site, 🧍 I'm working on my own asks when
   they'll next check in (in 1, 2 or 3 hours, or at the end of their day). 👍 I'm OK puts it on again; checking out
   ends it. If the time passes with no 👍, their screen goes red and James gets ⚠️ Not checked in on Today (with a
   Call button) and a warning wherever he is in the app. Kept on the open check-in entry itself (sheets/{uid}/entries:
   alone, aloneBy "HH:MM", okAt, aloneLog), so it still saves with no signal (the outbox) and needs no new collection. */
const LWK = (() => {
  const GAP = [
    [60, "In 1 hour"],
    [120, "In 2 hours"],
    [180, "In 3 hours"],
  ];
  const hm = (m) => {
    m = Math.max(0, Math.min(23 * 60 + 59, m));
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  };
  const overdue = (e) =>
    !!(e && e.open && e.alone && e.aloneBy && toMin(nowHM()) > toMin(e.aloneBy));
  async function saveEntry(e, patch, msg) {
    const data = Object.assign({}, e, patch, { updated: Date.now() });
    delete data.id;
    S.mine.entries = S.mine.entries.map((x) =>
      x.id === e.id ? Object.assign({ id: e.id }, data) : x,
    );
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    render();
    try {
      const r = await submitJob({ coll: "entries", docId: e.id, data });
      toast(msg + (r === "queued" ? " (sends when you have signal)" : ""));
    } catch (err) {
      toast("Couldn't save. Try again.");
    }
  }
  /* the trade's part, inside the green On site card */
  function tradeHtml(e) {
    if (!e || !e.open) return "";
    if (!e.alone)
      return `<button type="button" class="btn lwk-start" data-id="${esc(e.id)}">🧍 I'm working on my own</button>`;
    const late = overdue(e);
    return `<div class="lwk-box${late ? " lwk-late" : ""}"><b>🧍 Working on your own</b><div>${late ? `⚠️ You were due to check in at <b>${esc(e.aloneBy)}</b>. Tap 👍 I'm OK so ${esc(bossFirst())} knows you're all right.` : `Check in by <b>${esc(e.aloneBy)}</b> – ${esc(bossFirst())} is told if you don't.`}</div>
      <div class="lwk-acts"><button type="button" class="btn primary lwk-ok" data-id="${esc(e.id)}">👍 I'm OK</button><button type="button" class="pillbtn lwk-stop" data-id="${esc(e.id)}">Not on my own now</button></div></div>`;
  }
  function askWhen(e, title, after) {
    const D = dayFor(S.me);
    const now = toMin(nowHM());
    openSheet(
      `<h3 id="sheettitle">${esc(title)}</h3><div class="who">When will you next check in? If you don't tap 👍 I'm OK by then, ${esc(bossFirst())} is told so they can ring you.</div>
      <div class="lwk-pick">${GAP.map(([m, l]) => `<button type="button" class="pillbtn lwk-gap" data-t="${hm(now + m)}">${esc(l)} <span class="who">(${hm(now + m)})</span></button>`).join("")}${D && D.e && toMin(D.e) > now ? `<button type="button" class="pillbtn lwk-gap" data-t="${esc(D.e)}">When I finish <span class="who">(${esc(D.e)})</span></button>` : ""}</div>
      <label for="lwk-t">Or a time<input id="lwk-t" type="time" value="${hm(now + 120)}"></label>${formFoot(false, "Start")}`,
      async () => {
        const t = $("lwk-t").value;
        if (!t || toMin(t) <= now) return showErr("Pick a time later than now");
        closeForm();
        after(t);
      },
      "lwk-t",
    );
    document.querySelectorAll(".lwk-gap").forEach(
      (b) =>
        (b.onclick = () => {
          $("lwk-t").value = b.dataset.t;
          document
            .querySelectorAll(".lwk-gap")
            .forEach((x) => x.setAttribute("aria-pressed", x === b));
        }),
    );
  }
  function wireTrade() {
    const find = (b) => S.mine.entries.find((x) => x.id === b.dataset.id);
    const main = $("main");
    if (!main) return;
    main.querySelectorAll(".lwk-start").forEach(
      (b) =>
        (b.onclick = () => {
          const e = find(b);
          if (!e) return;
          askWhen(e, "🧍 Working on your own", (t) =>
            saveEntry(
              e,
              {
                alone: true,
                aloneBy: t,
                okAt: Date.now(),
                aloneLog: (e.aloneLog || []).concat([
                  { at: Date.now(), t: "Started on own – check in by " + t },
                ]),
              },
              "Check in by " + t,
            ),
          );
        }),
    );
    main.querySelectorAll(".lwk-ok").forEach(
      (b) =>
        (b.onclick = () => {
          const e = find(b);
          if (!e) return;
          askWhen(e, "👍 I'm OK – next check-in", (t) =>
            saveEntry(
              e,
              {
                aloneBy: t,
                okAt: Date.now(),
                aloneLog: (e.aloneLog || []).concat([
                  { at: Date.now(), t: "OK – next check-in " + t },
                ]),
              },
              "Thanks – next check-in " + t,
            ),
          );
        }),
    );
    main.querySelectorAll(".lwk-stop").forEach(
      (b) =>
        (b.onclick = () => {
          const e = find(b);
          if (!e) return;
          saveEntry(
            e,
            {
              alone: false,
              aloneBy: "",
              okAt: Date.now(),
              aloneLog: (e.aloneLog || []).concat([{ at: Date.now(), t: "Not on own any more" }]),
            },
            "OK – not on your own",
          );
        }),
    );
  }
  /* James's side: everyone checked in on their own, and who has missed their time */
  function aloneNow() {
    const today = iso(new Date());
    const out = [];
    teamIds().forEach((id) =>
      (S.data.entries[id] || [])
        .filter((e) => e.open && e.date === today && e.alone)
        .forEach((e) => out.push(Object.assign({ who: id, late: overdue(e) }, e))),
    );
    return out.sort((a, b) => b.late - a.late || toMin(a.aloneBy) - toMin(b.aloneBy));
  }
  function todayCard() {
    if (!S.owner) return "";
    const L = aloneNow();
    if (!L.length) return "";
    const late = L.filter((x) => x.late).length;
    return `<div class="card lwk-today${late ? " lwk-late" : ""}"><div class="cardbody"><b>${late ? "⚠️ Not checked in" : "🧍 Working on their own"}</b><div class="who">${late ? "Someone working on their own has missed their check-in time. Ring them." : "They'll tap 👍 I'm OK by the time shown."}</div>
      ${L.map((x) => {
        const d = (S.team[x.who] && S.team[x.who].details) || {};
        return `<div class="lwk-row"><span><b>${esc(nameOf(x.who))}</b><br><span class="who">${esc(siteLabel(x.job))}</span></span><span class="${x.late ? "lwk-due" : "who"}">${x.late ? "was due " : "by "}${esc(x.aloneBy)}</span>${d.mobile ? `<a class="pillbtn" href="tel:${esc(String(d.mobile).replace(/\s+/g, ""))}">📞 Call</a>` : ""}</div>`;
      }).join("")}</div></div>`;
  }
  /* every minute: redraw when someone goes overdue, and warn James once per missed time wherever he is */
  /* a bar that stays at the top until James taps it – a missed check-in mustn't flash past */
  function alertBar(x) {
    const d = (S.team[x.who] && S.team[x.who].details) || {};
    const el = document.createElement("div");
    el.className = "lwk-alert";
    el.setAttribute("role", "alert");
    el.innerHTML = `<span>⚠️ <b>${esc(nameOf(x.who))}</b> is working on their own and hasn't checked in (due ${esc(x.aloneBy)}, ${esc(siteLabel(x.job))}).</span>${d.mobile ? `<a class="pillbtn" href="tel:${esc(String(d.mobile).replace(/\s+/g, ""))}">📞 Call</a>` : ""}<button type="button" class="pillbtn lwk-seen">OK</button>`;
    el.querySelector(".lwk-seen").onclick = () => el.remove();
    document.body.appendChild(el);
  }
  const warned = {};
  let lastSig = "";
  function tick() {
    if (!S.db) return;
    let sig = "";
    if (S.owner) {
      const L = aloneNow().filter((x) => x.late);
      sig = L.map((x) => x.who + x.aloneBy).join("|");
      L.forEach((x) => {
        const k = x.who + "|" + x.id + "|" + x.aloneBy;
        if (warned[k]) return;
        warned[k] = 1;
        alertBar(x);
      });
    } else
      sig = (S.mine.entries || [])
        .filter(overdue)
        .map((e) => e.id + e.aloneBy)
        .join("|");
    if (sig !== lastSig) {
      lastSig = sig;
      render();
    }
  }
  return { tradeHtml, wireTrade, aloneNow, todayCard, overdue, tick };
})();
function initLoneWork() {
  setInterval(() => LWK.tick(), 60000);
}
