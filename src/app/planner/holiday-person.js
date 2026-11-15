/* ================= HOLIDAY PERSON: the owner's control over one person's holidays – fix, add, delete and adjust ================= */
import { bossFirst } from "../core/company-names.js";
import { $, addDays, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { nameOf, sheetOf } from "../owner/owner.js";
import { holAdj, holCfg, holDays, holN, holPlanOnly, holSum } from "./holidays.js";
import { LEAVE_TYPES, leaveOf } from "./time-off.js";
import { ukDate } from "../safety/rams-maker.js";
import { empTypeOf } from "../sites/job-details.js";
export { hpOpen };
/* James (Nov 2026): "sometimes they have taken them and it hasn't been input so more control is needed". Tap a person
   in 🌴 Holidays (or a holiday in the planner's Holidays tab) for their page: their figures for the holiday year,
   every holiday and time off in it (taken, booked, waiting, declined) each with ✎ Change (dates, half day, type,
   note – the planner entry follows) and Delete (to Deleted items), "+ Add a holiday (already taken or to come)",
   their days a year, and an adjustment for days taken that aren't in the app (a minus gives days back). Leave
   records stay at sheets/<uid>/signoffs/<id> {type:"leave"}; the planner entry is plan/leave-<id>; the adjustment
   is kept in settings/app.holidays.adj[<uid>][<holiday year start>] = { days, note }. */
/* keep the local copy in step straight away, so the page shows the change before the live update comes back */
function hpLocal(uid, id, rec) {
  if (!S.data.signoffs) return;
  const list = (S.data.signoffs[uid] || []).filter((x) => x.id !== id);
  if (rec) list.push(Object.assign({ id, who: uid }, rec));
  S.data.signoffs[uid] = list;
}
function hpOpen(uid, at) {
  const day = at || iso(new Date());
  const s = holSum(uid, sheetOf("signoffs", uid), day);
  const c = holCfg();
  const adj = holAdj(uid, s.Y.from);
  const today = iso(new Date());
  const list = leaveOf(sheetOf("signoffs", uid))
    .concat(holPlanOnly(uid))
    .filter((l) => (l.to || l.from) >= s.Y.from && l.from <= s.Y.to)
    .sort((a, b) => a.from.localeCompare(b.from));
  const stat = (l) =>
    l.status === "approved"
      ? (l.to || l.from) < today
        ? ["Taken", "ok"]
        : l.from <= today
          ? ["Off now", "ok"]
          : ["Booked", "ok"]
      : l.status === "pending"
        ? ["Waiting", "day"]
        : l.status === "declined"
          ? ["Declined", "bad"]
          : ["Cancelled", ""];
  const prevY = iso(addDays(parse(s.Y.from), -1)),
    nextY = iso(addDays(parse(s.Y.to), 1));
  openSheet(
    `<h3 id="sheettitle">🌴 ${esc(nameOf(uid))} – holidays</h3>
    <div class="hp-yr"><button type="button" class="iconbtn" id="hp-prev" aria-label="Holiday year before">‹</button><b>${esc(ukDate(s.Y.from))} to ${esc(ukDate(s.Y.to))}</b><button type="button" class="iconbtn" id="hp-next" aria-label="Holiday year after">›</button></div>
    <div class="hol-boxes"><div><b>${holN(s.allow)}</b><span>a year</span></div><div><b>${holN(s.taken)}</b><span>taken</span></div><div><b>${holN(s.booked)}</b><span>booked</span></div>${s.waiting ? `<div><b>${holN(s.waiting)}</b><span>waiting</span></div>` : ""}<div class="hol-left"><b class="${s.left < 0 ? "hol-neg" : ""}">${holN(s.left)}</b><span>left</span></div></div>
    ${s.bankUse ? `<div class="who">${s.bankUse} bank holidays come out of the ${holN(s.allow)}.${adj.days ? ` Taken includes the adjustment of ${holN(adj.days)}.` : ""}</div>` : adj.days ? `<div class="who">Taken includes the adjustment of ${holN(adj.days)}.</div>` : ""}
    <div class="flabel">Holidays and time off this holiday year</div>
    ${
      list
        .map((l) => {
          const st = stat(l);
          const n = holDays(l, s.Y.from, s.Y.to);
          return `<div class="hp-row" data-l="${esc(l.id)}"><div class="hp-main"><span class="tag ${st[1]}">${st[0]}</span>${l._plan ? ' <span class="tag">Put on the planner</span>' : ""} <b>${esc(shortDay(l.from))}${l.to && l.to !== l.from ? " – " + esc(shortDay(l.to)) : ""}</b>${l.half ? " (half day)" : ""}<div class="who">${esc(LEAVE_TYPES[l.leaveType] || "Time off")} · ${holN(n)} working day${n === 1 ? "" : "s"}${l.note ? " · " + esc(l.note) : ""}</div></div><button type="button" class="btn hp-ed">✎ Change</button><button type="button" class="linkdanger hp-del">Delete</button></div>`;
        })
        .join("") || '<div class="nothing">Nothing in this holiday year yet.</div>'
    }
    <div class="actions"><button type="button" class="btn primary" id="hp-add">+ Add a holiday (already taken or to come)</button></div>
    <div class="flabel">Days a year</div>
    <label class="hp-inl" for="hp-allow">Holiday allowance<input id="hp-allow" type="number" inputmode="decimal" min="0" max="60" step="0.5" placeholder="${holN(empTypeOf(uid) === "employed" ? c.days : 0)}" value="${esc((c.people || {})[uid] != null ? c.people[uid] : "")}"></label>
    <div class="who">Leave it empty for the usual ${holN(c.days)} days (employees). Change it for part time or longer service.</div>
    <div class="flabel">Adjustment</div>
    <label class="hp-inl" for="hp-adj">Days taken that aren't in the app<input id="hp-adj" type="number" inputmode="decimal" min="-60" max="60" step="0.5" value="${adj.days ? esc(adj.days) : ""}" placeholder="0"></label>
    <label for="hp-note">What it's for (optional)<input id="hp-note" maxlength="200" value="${esc(adj.note || "")}" placeholder="e.g. 5 days in March before we used the app"></label>
    <div class="who">Counts as taken in this holiday year. Put a minus (e.g. -2) to give days back.</div>
    ${formFoot(false, "Save")}`,
    async () => {
      const a = $("hp-allow").value,
        j = $("hp-adj").value;
      const h = Object.assign({}, (S.settings || {}).holidays || {});
      h.people = Object.assign({}, h.people || {});
      if (a === "") delete h.people[uid];
      else h.people[uid] = +a;
      h.adj = Object.assign({}, h.adj || {});
      h.adj[uid] = Object.assign({}, h.adj[uid] || {});
      if (j === "" || +j === 0) delete h.adj[uid][s.Y.from];
      else h.adj[uid][s.Y.from] = { days: +j, note: $("hp-note").value.trim() };
      try {
        await S.db.doc("settings/app").update({ holidays: h });
        S.settings = Object.assign({}, S.settings, { holidays: h });
        closeForm();
        toast("Saved");
        render();
      } catch (e) {
        showErr("Couldn't save");
      }
    },
  );
  $("hp-prev").onclick = () => hpOpen(uid, prevY);
  $("hp-next").onclick = () => hpOpen(uid, nextY);
  $("hp-add").onclick = () => hpEdit(uid, null, day);
  $("form")
    .querySelectorAll(".hp-row")
    .forEach((r) => {
      const l = list.find((x) => x.id === r.dataset.l);
      r.querySelector(".hp-ed").onclick = () => hpEdit(uid, l, day);
      const del = r.querySelector(".hp-del");
      let armed = false;
      del.onclick = async () => {
        if (!armed) {
          armed = true;
          del.textContent = "Tap again to delete";
          return;
        }
        try {
          if (l._plan) await hpUnplan(uid, l._plan);
          else {
            await S.db.doc("sheets/" + uid + "/signoffs/" + l.id).delete();
            hpLocal(uid, l.id, null);
          }
          await S.db
            .doc("plan/leave-" + l.id)
            .delete()
            .catch(() => {});
          toast("Deleted – it's in Deleted items for 30 days");
          hpOpen(uid, day);
        } catch (e) {
          toast("Couldn't delete");
        }
      };
    });
}
/* take someone off a holiday that was put straight on the planner (the whole entry if it was only them) */
async function hpUnplan(uid, pid) {
  const priv = (S.planPrivate || []).find((x) => x.id === pid);
  const p = priv || (S.plan || []).find((x) => x.id === pid);
  if (!p) return;
  const ref = S.db.doc((priv ? "planprivate/" : "plan/") + pid);
  const rest = (p.people || []).filter((x) => x !== uid);
  if (rest.length) await ref.update({ people: rest, updated: Date.now() });
  else await ref.delete();
}
/* add a holiday (any dates, past ones too) or change one */
function hpEdit(uid, l, back) {
  const today = iso(new Date());
  const v = l || {
    from: today,
    to: today,
    half: "",
    leaveType: "holiday",
    note: "",
    status: "approved",
  };
  openSheet(
    `<h3 id="sheettitle">${l ? "Change" : "Add"} – ${esc(nameOf(uid))}</h3>
    <div><div class="flabel">Type</div><div class="seg" id="hp-type">${Object.entries(LEAVE_TYPES)
      .map(
        ([k, t]) =>
          `<button type="button" data-v="${k}" aria-pressed="${(v.leaveType || "holiday") === k}">${t}</button>`,
      )
      .join("")}</div></div>
    <div class="grid2"><label for="hp-from">First day off<input id="hp-from" type="date" required value="${esc(v.from)}"></label>
    <label for="hp-to">Last day off<input id="hp-to" type="date" required value="${esc(v.to || v.from)}"></label></div>
    <label for="hp-half">Half day? (one day only)<select id="hp-half"><option value="">No, full day(s)</option><option value="morning"${v.half === "morning" ? " selected" : ""}>Morning off</option><option value="afternoon"${v.half === "afternoon" ? " selected" : ""}>Afternoon off</option></select></label>
    ${l && l.status !== "approved" ? `<label class="inl"><input type="checkbox" id="hp-appr"> Mark it as approved</label>` : ""}
    <label for="hp-lnote">Note (optional)<textarea id="hp-lnote" maxlength="300">${esc(v.note || "")}</textarea></label>
    <div class="who">Past dates are fine – use this for holidays they've already had that weren't put in.</div>
    ${formFoot(false, l ? "Save changes" : "Add it")}`,
    async () => {
      const from = $("hp-from").value,
        to = $("hp-to").value;
      if (!from || !to || to < from)
        return showErr("The last day must be on or after the first day.");
      const half = from === to ? $("hp-half").value : "";
      const leaveType = $("hp-type").querySelector('[aria-pressed="true"]').dataset.v;
      const now = Date.now();
      const status =
        !l || l.status === "approved" || ($("hp-appr") && $("hp-appr").checked)
          ? "approved"
          : l.status;
      /* one put straight on the planner becomes a proper holiday record when it's changed */
      const fromPlan = l && l._plan;
      const id = l && !fromPlan ? l.id : "leave-" + newId();
      const rec = {
        from,
        to,
        half,
        leaveType,
        note: $("hp-lnote").value.trim(),
        status,
        updated: now,
      };
      $("f-save").disabled = true;
      try {
        if (l && !fromPlan) {
          await S.db.doc("sheets/" + uid + "/signoffs/" + id).update(rec);
          hpLocal(uid, id, Object.assign({}, l, rec));
        } else {
          await S.db.doc("sheets/" + uid + "/signoffs/" + id).set(
            Object.assign(rec, {
              type: "leave",
              requestedAt: now,
              created: now,
              answeredAt: now,
              reply: `Put in by ${bossFirst()}`,
            }),
          );
          hpLocal(uid, id, rec);
        }
        if (status === "approved") {
          const old = (S.plan || []).find((p) => p.id === "leave-" + id);
          const word =
            leaveType === "holiday" ? "off" : (LEAVE_TYPES[leaveType] || "off").toLowerCase();
          await S.db.doc("plan/leave-" + id).set(
            Object.assign({}, old || {}, {
              from,
              to,
              type: "holiday",
              title: nameOf(uid) + " – " + word,
              people: [uid],
              vis: (old && old.vis) || "all",
              leaveId: id,
              created: (old && old.created) || now,
              updated: now,
            }),
          );
        }
        if (fromPlan) await hpUnplan(uid, fromPlan);
        toast(l ? "Changed" : "Added");
        hpOpen(uid, back || from);
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "hp-from",
  );
  $("hp-type")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          $("hp-type")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
}
