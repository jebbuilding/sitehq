/* ================= NEW-ITEM ALERTS for James: a "new" count on each tab + a pop-up when something arrives ================= */
import { $, esc, gbp, store } from "../core/helpers.js";
import { tabName } from "../core/report-issue.js";
import { S, ownerMode } from "../core/state.js";
import { curTab, render } from "../core/tabs-week.js";
import { allTeam, nameOf } from "./owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { KINDS, hasProblem } from "../safety/checklists.js";
export { nfCounts, nfMarkSeenSoon, nfSeenAt, ownerFeed };
const NF = { known: null, startAt: Date.now(), t: null, queue: [], seen: null, saveT: null };
const nfTs = (x) =>
  x.created || x.sentAt || x.signedAt || x.requestedAt || x.submittedAt || x.at || x.takenAt || 0;
function ownerFeed() {
  const out = [];
  const add = (tab, x, what, coll) => {
    const ts = nfTs(x);
    if (!ts || x.who === S.me) return;
    const det = [
      x.site || x.job || x.asset || x.reg || x.title || x.leaveTitle || "",
      x.number ? "No. " + x.number : "",
      x.amount ? gbp(+x.amount) : "",
      x.task || x.caption || x.note || "",
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 120);
    out.push({
      tab,
      ts,
      who: x.who,
      what,
      det,
      key: coll + "/" + x.who + "/" + x.id,
      rec: x,
      coll,
    });
  };
  allTeam("entries").forEach((x) =>
    add(
      "time",
      x,
      x.open ? "checked in" : x.type === "hours" ? "sent a timesheet" : "added job time",
      "e",
    ),
  );
  allTeam("checks").forEach((x) =>
    add(
      "checks",
      x,
      "sent a " +
        ((KINDS[x.kind] && KINDS[x.kind].name) || "check").toLowerCase() +
        (hasProblem(x) ? " with a problem" : ""),
      "c",
    ),
  );
  allTeam("photos").forEach((x) => {
    if (x.fromOwner) return;
    add("photos", x, x.kind === "sketch" ? "sent a drawing to check" : "sent a photo", "p");
  });
  allTeam("invoices").forEach((x) => {
    if (x.fromOwner) return;
    if (x.kind === "receipt") add("receipts", x, "sent a receipt", "i");
    else if (x.kind === "materials") add("materials", x, "asked for materials or tools", "i");
    else if (isInv(x)) add("invoices", x, "sent an invoice", "i");
  });
  allTeam("signoffs").forEach((x) => {
    const T = x.type;
    if (T === "incident") add("checks", x, "reported an accident or near miss", "s");
    else if (T === "ra") add("checks", x, "filled in a risk assessment", "s");
    else if (T === "leave") add("planner", x, "asked for time off", "s");
    else if (T === "cert") add("training", x, "added a card or certificate", "s");
    else if (T === "talk") add("training", x, "signed a toolbox talk", "s");
    else if (T === "polread") add("policies", x, "read and signed a policy", "s");
    else if (T === "persdoc") add("people", x, "uploaded a personal document", "s");
    else if (T === "induction") add("projects", x, "did a site induction", "s");
    else if (T === "visitind") add("projects", x, "inducted a visitor", "s");
    else if (T === "todo" && x.done) add("jobs", x, "ticked off a to-do", "s");
    else if (!T && x.docId) add("projects", x, "signed RAMS", "s");
  });
  (S.portal || []).forEach((p) => {
    if (p.lastAct && p.lastWhat)
      out.push({
        tab: "portal",
        ts: p.lastAct,
        who: p.id,
        name: p.name,
        what: p.lastWhat,
        key: "pt/" + p.id + "/" + p.lastAct,
        rec: p,
        coll: "pt",
      });
  });
  Object.values(S.jobdone || {}).forEach((x) => {
    if (x.by && x.by !== S.me && x.at)
      out.push({
        tab: "jobs",
        ts: x.at,
        who: x.by,
        what: x.done ? "ticked a job task" : "updated a job task",
        key: "j/" + x.jobId + "/" + x.taskId + "/" + x.at,
        rec: x,
        coll: "j",
      });
  });
  return out;
}
function nfSeen() {
  if (!NF.seen) {
    NF.seen = store.get("jeb.seenTabs", null);
    if (!NF.seen) {
      NF.seen = { _init: Date.now() };
      store.set("jeb.seenTabs", NF.seen);
    }
  }
  const d = S.seenDoc && S.seenDoc.tabs;
  if (d)
    Object.keys(d).forEach((k) => {
      if (!(NF.seen[k] >= d[k])) NF.seen[k] = d[k];
    });
  return NF.seen;
}
function nfSeenAt(tab) {
  const s = nfSeen();
  return s[tab] || s._init || 0;
}
function nfMarkSeenSoon(tab) {
  if (!tab) return;
  const s = nfSeen();
  if (Date.now() - (s[tab] || 0) > 3000) nfMarkSeen(tab);
}
function nfMarkSeen(tab) {
  const s = nfSeen();
  s[tab] = Date.now();
  store.set("jeb.seenTabs", s);
  clearTimeout(NF.saveT);
  NF.saveT = setTimeout(() => {
    try {
      S.rawDb.doc("todos/_seen").set({ kind: "seen", tabs: s, updated: Date.now() });
    } catch (e) {}
  }, 4000);
}
function nfCounts() {
  const c = {};
  if (!ownerMode() || S.preview) return c;
  const feed = ownerFeed();
  feed.forEach((f) => {
    if (f.ts > nfSeenAt(f.tab)) c[f.tab] = (c[f.tab] || 0) + 1;
  });
  // pop-up for things arriving while the app is open
  const keys = new Set(feed.map((f) => f.key));
  if (NF.known === null) {
    if (S.loadedTrades || Date.now() - NF.startAt > 20000) NF.known = keys;
  } else {
    feed.forEach((f) => {
      if (!NF.known.has(f.key) && f.ts > NF.startAt - 60000 && f.tab !== curTab()) NF.queue.push(f);
    });
    NF.known = keys;
    if (NF.queue.length) {
      clearTimeout(NF.t);
      NF.t = setTimeout(nfPop, 600);
    }
  }
  return c;
}
function nfPop() {
  const q = NF.queue.splice(0);
  if (!q.length) return;
  const f = q[q.length - 1];
  const nm = (x) => String(x.name || nameOf(x.who)).split(" ")[0];
  const txt =
    q.length === 1
      ? `${nm(f)} ${f.what}`
      : `${q.length} new: ${[...new Set(q.map(nm))].join(", ")}`;
  let el = $("nfpop");
  if (!el) {
    el = document.createElement("button");
    el.type = "button";
    el.id = "nfpop";
    el.className = "nfpop";
    document.body.appendChild(el);
  }
  el.innerHTML = `<span aria-hidden="true">🔔</span><span><b>${esc(txt)}</b><br><span class="who">Tap to open ${esc(tabName(f.tab))}</span></span>`;
  el.hidden = false;
  el.onclick = () => {
    el.hidden = true;
    S.otab = f.tab;
    store.set("jeb.otab", f.tab);
    render();
  };
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.hidden = true;
  }, 9000);
}
