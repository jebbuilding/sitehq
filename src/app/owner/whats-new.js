/* ===== "What's new" panel: when a tab shows a number, opening the tab says what it is ===== */
import { chatTitle, openChat, unread, visibleChats } from "../chat/chat.js";
import { ptManager } from "../clients/portal.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { curTab, render } from "../core/tabs-week.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { openFile } from "../files/in-app-files.js";
import { nfSeenAt, ownerFeed } from "./alerts.js";
import { allTeam, checkDetail, nameOf, teamIds } from "./owner.js";
import { detailsDone } from "../people/personal-details.js";
import { photoViewer } from "../photos/photos.js";
import { answerLeave } from "../planner/board.js";
import { invDetail } from "../purchasing/invoices.js";
import { isInv, openMat } from "../purchasing/materials-receipts.js";
import { viewIncident } from "../safety/accidents.js";
import { hasProblem } from "../safety/checklists.js";
import { viewRa } from "../safety/rams.js";
import { expiryState } from "../safety/training.js";
import { jobProgress } from "../sites/job-sheets.js";
import { openJob } from "../survey/door-window-survey.js";
import { openPersonMonth } from "../timesheets/monthly-sheet.js";
export { whatsNewHTML, wireWhatsNew, wnCapture, wnJump };
const WN = { tab: null, items: [], shut: {} };
function wnCapture(t) {
  if (!ownerMode() || S.preview) {
    return;
  }
  let fresh = [];
  try {
    fresh = ownerFeed().filter((f) => f.tab === t && f.ts > nfSeenAt(t));
  } catch (e) {}
  if (WN.tab !== t) {
    WN.tab = t;
    WN.items = fresh.sort((a, b) => b.ts - a.ts);
    WN.shut[t] = false;
    return;
  }
  const have = new Set(WN.items.map((x) => x.key));
  const add = fresh.filter((f) => !have.has(f.key));
  if (add.length) {
    WN.items = add.concat(WN.items).sort((a, b) => b.ts - a.ts);
    WN.shut[t] = false;
  }
}
/* what to open for a record, so tapping a line in the yellow box takes you straight to it */
function wnOpener(f) {
  const x = f.rec;
  if (!x) return null;
  if (f.coll === "p") return () => photoViewer(x, true, x.who);
  if (f.coll === "c") return () => checkDetail(x);
  if (f.coll === "e") return () => openPersonMonth(x.who);
  if (f.coll === "i") {
    if (x.kind === "receipt")
      return x.fileId ? () => openFile(x.fileId, x.fileName || "receipt", x.contentType) : null;
    if (x.kind === "materials") return () => openMat(x);
    return () => invDetail(x, true, x.who);
  }
  if (f.coll === "s") {
    if (x.type === "leave") return x.status === "pending" ? () => answerLeave(x, true) : null;
    if (x.type === "incident") return () => viewIncident(x, true);
    if (x.type === "ra") return () => viewRa(x, true);
    if (x.type === "persdoc" || x.type === "cert") return () => openPersonMonth(x.who);
    return null;
  }
  if (f.coll === "pt") {
    const c = (S.clients || []).find((c) => c.portalUid === x.id || c.id === x.clientId);
    return c ? () => ptManager(c) : null;
  }
  if (f.coll === "j") return x.jobId ? () => openJob(x.jobId) : null;
  return null;
}
/* James (Nov 2026): each "needs sorting" reminder can be put off for 30 days or cancelled. Kept owner-only in
   todos/wnsnooze { kind "wnsnooze", keys { key: until (ms), or -1 = cancelled } }. The key is the tab, the reminder's
   words without its numbers, and who/what it lists – so if something new comes up (another person, another
   request) the reminder shows again. */
const wnKey = (t, r) =>
  [t, String(r.text || "").replace(/\d+/g, "#")]
    .concat((r.items || []).map((i) => i.label).sort())
    .join("|")
    .slice(0, 400);
function wnSnoozed(k) {
  const u = ((S.wnSnooze || {}).keys || {})[k];
  return u === -1 || (u && u > Date.now());
}
async function wnSnooze(k, days) {
  const cur = Object.assign({ kind: "wnsnooze", keys: {} }, S.wnSnooze || {});
  const keys = {};
  /* tidy: drop ones that have run out */
  Object.entries(cur.keys || {}).forEach(([a, u]) => {
    if (u === -1 || u > Date.now()) keys[a] = u;
  });
  keys[k] = days ? Date.now() + days * 864e5 : -1;
  const rec = { kind: "wnsnooze", keys, updated: Date.now() };
  S.wnSnooze = rec;
  try {
    await S.db.doc("todos/wnsnooze").set(rec);
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
function wnReasons(t) {
  const b = S.badgeNow || {};
  const n = b[t];
  if (!n) return [];
  const pl = (k, one, many) => (k === 1 ? one : many);
  const out = [];
  const R = (text, items) => out.push({ text, items: (items || []).slice(0, 8) });
  if (ownerMode()) {
    if (t === "chat") {
      const un = visibleChats().filter(unread);
      R(
        `${n} unread ${pl(n, "message", "messages")}.`,
        un.map((c) => ({ label: chatTitle(c), go: () => openChat(c.id) })),
      );
    } else if (t === "jobs") {
      const r = S.jobs.filter(
        (j) =>
          j.status !== "closed" &&
          (() => {
            const p = jobProgress(j);
            return p.n && p.d === p.n;
          })(),
      );
      R(
        `${r.length} ${pl(r.length, "job has", "jobs have")} every task ticked off, ready for you to check and sign off.`,
        r.map((j) => ({
          label: j.title + (j.site ? " · " + j.site : ""),
          go: () => openJob(j.id),
        })),
      );
    } else if (t === "training") {
      const ce = allTeam("signoffs").filter((c) => c.type === "cert" && expiryState(c.expires));
      R(
        `${ce.length} ${pl(ce.length, "card or certificate is", "cards or certificates are")} out of date or running out.`,
        ce.map((c) => ({
          label:
            nameOf(c.who) +
            ": " +
            (c.title || c.kind || "card") +
            (c.expires ? " (" + shortDay(c.expires) + ")" : ""),
          go: () => openPersonMonth(c.who),
        })),
      );
    } else if (t === "planner") {
      const lp = allTeam("signoffs").filter((x) => x.type === "leave" && x.status === "pending");
      R(
        `${lp.length} time-off ${pl(lp.length, "request is", "requests are")} waiting for you to approve.`,
        lp.map((l) => ({
          label:
            nameOf(l.who) +
            " · " +
            shortDay(l.from) +
            (l.to && l.to !== l.from ? " – " + shortDay(l.to) : ""),
          go: () => answerLeave(l, true),
        })),
      );
    } else if (t === "people") {
      const pm = teamIds().filter((id) => !detailsDone(S.team[id] && S.team[id].details));
      R(
        `${pm.length} ${pl(pm.length, "person hasn't", "people haven't")} finished their details yet. Tap a name to see what's missing, fill it in or send a reminder.`,
        pm.map((id) => ({
          label: nameOf(id),
          go: () => wnJump(`[data-id="__p${CSS.escape(id)}"]`, () => openPersonMonth(id)),
        })),
      );
    } else if (t === "todo") {
      const mt = S.todos.filter((x) => !x.done && x.due && x.due <= iso(new Date()));
      R(
        `${mt.length} to-${pl(mt.length, "do is", "dos are")} due today or overdue (shown below).`,
        mt.map((x) => ({
          label: x.text || x.title || "To-do",
          go: () => {
            const el = document.querySelector(`[data-id="${CSS.escape(x.id)}"]`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("wnflash");
              setTimeout(() => el.classList.remove("wnflash"), 1600);
            }
          },
        })),
      );
    } else if (t === "photos") {
      const sk = allTeam("photos").filter((p) => isSketch(p) && p.check === "open");
      R(
        `${sk.length} ${pl(sk.length, "drawing has", "drawings have")} been sent to you to check.`,
        sk.map((p) => ({
          label: nameOf(p.who) + ": " + (p.title || "Drawing"),
          go: () => photoViewer(p, true, p.who),
        })),
      );
    } else if (t === "checks") {
      const d = allTeam("checks").filter((c) => hasProblem(c) && !c.fixed),
        inc = allTeam("signoffs").filter((x) => x.type === "incident" && x.status !== "reviewed"),
        ra = allTeam("signoffs").filter((x) => x.type === "ra" && !x.reviewedAt && x.who !== S.me);
      if (d.length)
        R(
          `${d.length} ${pl(d.length, "check has a defect", "checks have defects")} not marked fixed.`,
          d.map((c) => ({
            label: (c.asset || c.reg || "Vehicle") + " · " + nameOf(c.who),
            go: () => checkDetail(c),
          })),
        );
      if (inc.length)
        R(
          `${inc.length} accident / near-miss ${pl(inc.length, "report", "reports")} to review.`,
          inc.map((x) => ({
            label:
              nameOf(x.who) + " · " + shortDay(x.date || iso(new Date(x.created || Date.now()))),
            go: () => viewIncident(x, true),
          })),
        );
      if (ra.length)
        R(
          `${ra.length} risk ${pl(ra.length, "assessment", "assessments")} to review.`,
          ra.map((x) => ({
            label: nameOf(x.who) + (x.site ? " · " + x.site : ""),
            go: () => viewRa(x, true),
          })),
        );
    } else if (t === "invoices") {
      const iv = allTeam("invoices").filter((i) => isInv(i) && (i.status || "sent") === "sent");
      R(
        `${iv.length} ${pl(iv.length, "invoice hasn't", "invoices haven't")} been marked as received yet.`,
        iv.map((i) => ({
          label:
            nameOf(i.who) +
            (i.number ? " · No. " + i.number : "") +
            (i.amount ? " · " + gbp(+i.amount) : ""),
          go: () => invDetail(i, true, i.who),
        })),
      );
    } else if (t === "materials") {
      const m = allTeam("invoices").filter(
        (i) => i.kind === "materials" && !i.fromOwner && (i.status || "sent") === "sent",
      );
      R(
        `${m.length} materials / tools ${pl(m.length, "request", "requests")} to deal with.`,
        m.map((i) => ({
          label: nameOf(i.who) + (i.site ? " · " + i.site : ""),
          go: () => openMat(i),
        })),
      );
    } else if (t === "receipts") {
      const r = allTeam("invoices").filter((i) => i.kind === "receipt" && !i.checked);
      R(
        `${r.length} ${pl(r.length, "receipt hasn't", "receipts haven't")} been ticked as checked yet (tick them in the list below).`,
        r.map((i) => ({
          label: nameOf(i.who) + (i.amount ? " · " + gbp(+i.amount) : ""),
          go: i.fileId ? () => openFile(i.fileId, i.fileName || "receipt", i.contentType) : null,
        })),
      );
    } else if (t === "clients") {
      const cf = (S.clients || []).filter((c) => c.stage === "enquiry");
      R(
        `${cf.length} ${pl(cf.length, "client needs", "clients need")} following up (new enquiries).`,
        cf.map((c) => ({
          label:
            c.name +
            (c.stage === "enquiry"
              ? " · new enquiry"
              : c.follow
                ? " · follow up " + shortDay(c.follow)
                : ""),
          go: () => viewClient(c),
        })),
      );
    }
  } else {
    const lab = {
      plans: ["thing to read and sign for a site", "things to read and sign for a site"],
      jobs: ["job or to-do still open", "jobs or to-dos still open"],
      checks: ["check or report due", "checks or reports due"],
      training: ["toolbox talk or training to do", "toolbox talks or training to do"],
      policies: ["policy to read and sign", "policies to read and sign"],
      chat: ["unread message", "unread messages"],
      time: ["thing James has asked you to fill in", "things James has asked you to fill in"],
    };
    R(
      lab[t]
        ? `${n} ${lab[t][n === 1 ? 0 : 1]}. ${n === 1 ? "It's" : "They're"} in the list below.`
        : `${n} ${pl(n, "thing", "things")} James has asked you to do here.`,
    );
  }
  return out;
}
function whatsNewHTML(t) {
  if (WN.shut[t]) return "";
  const items = WN.tab === t ? WN.items : [];
  const rs = wnReasons(t).filter((r) => !wnSnoozed(wnKey(t, r)));
  if (!items.length && !rs.length) return "";
  WN.go = [];
  const reg = (fn) => {
    if (!fn) return -1;
    WN.go.push(fn);
    return WN.go.length - 1;
  };
  const nm = (x) => String(x.name || nameOf(x.who));
  const when = (ts) => {
    const d = new Date(ts),
      td = new Date();
    return d.toDateString() === td.toDateString()
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) +
          " " +
          d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };
  return `<div class="wnbox" id="wnbox"><div class="wnhead"><b>🔔 ${items.length ? `What's new (${items.length})` : "Needs sorting"}</b><button type="button" class="iconbtn wnx" aria-label="Hide">✕</button></div>
    ${
      items.length
        ? `<ul class="wnlist">${items
            .slice(0, 12)
            .map((x) => {
              const g = reg(wnOpener(x));
              return `<li>${g >= 0 ? `<button type="button" class="wngo" data-g="${g}">` : '<span class="wnrow">'}<span class="wnwhen">${esc(when(x.ts))}</span><span class="wntx"><b>${esc(nm(x))}</b> ${esc(x.what)}${x.det ? `<span class="who"> · ${esc(x.det)}</span>` : ""}</span>${g >= 0 ? '<span class="wnarr" aria-hidden="true">›</span></button>' : "</span>"}</li>`;
            })
            .join(
              "",
            )}${items.length > 12 ? `<li class="who">…and ${items.length - 12} more below</li>` : ""}</ul>`
        : ""
    }
    ${
      rs.length
        ? `${items.length ? '<div class="flabel" style="margin:8px 0 2px">Still needs sorting</div>' : ""}${rs
            .map(
              (r) =>
                `${r.items.length === 1 && r.items[0].go ? `<button type="button" class="wnreason wngo wnone" data-g="${reg(r.items[0].go)}">${esc(r.text)} <b>Tap to sort it ›</b></button>` : `<div class="wnreason">${esc(r.text)}</div>`}${
                  r.items.length
                    ? `<div class="wnchips">${r.items
                        .map((i) => {
                          const g = reg(i.go);
                          return g >= 0
                            ? `<button type="button" class="wnchip wngo" data-g="${g}">${esc(i.label)} ›</button>`
                            : `<span class="wnchip">${esc(i.label)}</span>`;
                        })
                        .join("")}</div>`
                    : ""
                }${ownerMode() ? `<div class="wnacts"><button type="button" class="pillbtn wnsn" data-k="${esc(wnKey(t, r))}" data-d="30">⏰ Remind me in 30 days</button><button type="button" class="pillbtn wnsn" data-k="${esc(wnKey(t, r))}" data-d="0">✕ Cancel this reminder</button></div>` : ""}`,
            )
            .join("")}`
        : ""
    }
    ${items.length || rs.some((r) => r.items.length) ? `<div class="who" style="margin-top:6px">Tap one to go straight to it.</div>` : ""}</div>`;
}
function wnJump(sel, fallback) {
  const el = document.querySelector("#main " + sel);
  if (!el) {
    if (fallback) fallback();
    return;
  }
  let d = el;
  while (d) {
    if (d.tagName === "DETAILS") {
      d.open = true;
      try {
        S.open.add(d.dataset.id);
      } catch (e) {}
    }
    d = d.parentElement;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("wnflash");
  setTimeout(() => el.classList.remove("wnflash"), 2200);
}
function wireWhatsNew() {
  const b = document.querySelector("#wnbox .wnx");
  if (b)
    b.onclick = () => {
      WN.shut[curTab()] = true;
      const el = $("wnbox");
      if (el) el.remove();
    };
  document.querySelectorAll("#wnbox .wnsn").forEach(
    (x) =>
      (x.onclick = async () => {
        const days = +x.dataset.d;
        await wnSnooze(x.dataset.k, days);
        toast(days ? "I'll remind you in " + days + " days" : "Reminder cancelled");
        render();
      }),
  );
  document.querySelectorAll("#wnbox .wngo").forEach(
    (x) =>
      (x.onclick = () => {
        const f = (WN.go || [])[+x.dataset.g];
        if (f)
          try {
            f();
          } catch (e) {
            toast("Couldn't open that");
          }
      }),
  );
}
