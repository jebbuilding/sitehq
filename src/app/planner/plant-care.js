/* ================= VEHICLES & PLANT: one register for vans, trailers, diggers and small plant – what's due, book it in on the planner, log it done ================= */
import { $, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { nameOf } from "../owner/owner.js";
import { kitView } from "./kit-out.js";
import { KINDS } from "../safety/checklists.js";
import { EQ_DATES, daysTo, openEqDates } from "../safety/expiry-dates.js";
import { ukDate } from "../safety/rams-maker.js";
export { EQM_KINDS, eqmPlannerCard, eqmToBook, eqmView, eqmWireCard };
/* Every vehicle, trailer, digger and piece of machinery or small plant (the equipment lists in Setup) with its due
   dates (MOT, service, insurance, tax, LOLER, PAT…), shown soonest first and coloured by how close they are. 📅 Book
   in: pick the date and the garage – it goes on the planner (who drives it can see it) and the reminder changes from
   "book it in" to "booked for …". ✓ Done: the date, cost and mileage go in its history, and the next due date moves on
   by how often it comes round (12 months unless changed). Stored on the equipment record (equipment/{id}): dates,
   booked { key: { date, where, planId } }, every { key: months }, log []. */
const EQM_KINDS = ["vehicle", "trailer", "digger", "machine"];
const EQM_EVERY = {
  mot: 12,
  service: 12,
  insurance: 12,
  tax: 12,
  breakdown: 12,
  tacho: 24,
  loler: 12,
  pat: 12,
};
const eqmEvery = (eq, k) => +((eq.every || {})[k] || EQM_EVERY[k] || 12);
const eqmLabel = (eq, k) => ((EQ_DATES[eq.kind] || []).find((x) => x[0] === k) || [k, k])[1];
/* each item that has a due date, soonest first */
function eqmItems() {
  const out = [];
  (S.equipment || [])
    .filter((eq) => EQM_KINDS.includes(eq.kind))
    .forEach((eq) =>
      (EQ_DATES[eq.kind] || []).forEach(([k, l]) => {
        const d = eq.dates && eq.dates[k];
        if (!d || k === "lease") return;
        out.push({ eq, k, l, d, n: daysTo(d), bk: (eq.booked || {})[k] || null });
      }),
    );
  return out.sort((a, b) => a.d.localeCompare(b.d));
}
/* for Today / the planner: how many need booking in within 6 weeks */
const eqmToBook = () => eqmItems().filter((x) => x.n <= 42 && !x.bk);
function eqmPlannerCard() {
  const tb = eqmToBook();
  const bk = eqmItems().filter((x) => x.bk && x.bk.date >= iso(new Date()));
  if (!tb.length && !bk.length) return "";
  return `<button type="button" class="card eqm-card" id="eqm-open"><b>🚐 Vehicles &amp; plant</b><span class="who">${tb.length ? `${tb.length} to book in` : ""}${tb.length && bk.length ? " · " : ""}${bk.length ? `${bk.length} booked` : ""}</span><span aria-hidden="true">›</span></button>`;
}
function eqmWireCard() {
  if ($("eqm-open")) $("eqm-open").onclick = eqmView;
}
function eqmView() {
  const items = eqmItems();
  const all = (S.equipment || []).filter((eq) => EQM_KINDS.includes(eq.kind));
  const tag = (x) =>
    x.bk
      ? `<span class="tag ok">Booked ${esc(shortDay(x.bk.date))}${x.bk.where ? " · " + esc(x.bk.where) : ""}</span>`
      : x.n < 0
        ? `<span class="tag bad">${-x.n} day${x.n === -1 ? "" : "s"} overdue</span>`
        : x.n <= 42
          ? `<span class="tag day">Due in ${x.n} day${x.n === 1 ? "" : "s"} – book it in</span>`
          : `<span class="tag">Due ${esc(shortDay(x.d))}</span>`;
  openViewer(`<div class="eqm"><div class="vhead"><b>🚐 Vehicles &amp; plant</b></div>
    <div class="who">Every van, trailer, digger and piece of plant with its MOT, service, insurance and inspection dates. Book them in and they go on the planner; mark them done and the next date is set.</div>
    <div class="actions"><button type="button" class="btn" id="eqm-kit">🧰 Tools &amp; plant: who has what</button></div>
    ${
      items.length
        ? items
            .map(
              (
                x,
              ) => `<div class="eqm-row${x.bk ? "" : x.n < 0 ? " late" : x.n <= 42 ? " soon" : ""}"><span class="eqm-what"><b>${esc(x.eq.name)}</b> · ${esc(x.l)}<br><span class="who">${esc(ukDate(x.d))}${x.eq.assignee ? " · " + esc(nameOf(x.eq.assignee)) : ""}${(x.eq.info || {}).reg ? " · " + esc(x.eq.info.reg) : ""}</span> ${tag(x)}</span>
          <span class="eqm-acts"><button type="button" class="btn${x.bk ? "" : " primary"} eqm-book" data-e="${esc(x.eq.id)}" data-k="${esc(x.k)}">📅 ${x.bk ? "Change booking" : "Book in"}</button><button type="button" class="btn eqm-done" data-e="${esc(x.eq.id)}" data-k="${esc(x.k)}">✓ Done</button></span></div>`,
            )
            .join("")
        : `<div class="empty"><strong>No due dates yet</strong>Add MOT, service and inspection dates to each one below.</div>`
    }
    <div class="flabel" style="margin-top:14px">All of them (${all.length})</div>
    ${
      all
        .map(
          (eq) =>
            `<button type="button" class="incrow eqm-eq" data-e="${esc(eq.id)}"><span><b>${esc(eq.name)}</b> <span class="who">${esc((KINDS[eq.kind] || {}).name || "")}${(eq.log || []).length ? " · " + eq.log.length + " in its history" : ""}</span></span><span aria-hidden="true">›</span></button>`,
        )
        .join("") || `<div class="who">Add vans, trailers, diggers and plant in Setup.</div>`
    }</div>`);
  if ($("eqm-kit")) $("eqm-kit").onclick = () => kitView();
  const find = (b) => (S.equipment || []).find((x) => x.id === b.dataset.e);
  document
    .querySelectorAll(".eqm-book")
    .forEach((b) => (b.onclick = () => eqmBook(find(b), b.dataset.k)));
  document
    .querySelectorAll(".eqm-done")
    .forEach((b) => (b.onclick = () => eqmDone(find(b), b.dataset.k)));
  document.querySelectorAll(".eqm-eq").forEach(
    (b) =>
      (b.onclick = () => {
        const eq = find(b);
        if (eq) openEqDates(eq);
      }),
  );
}
async function eqmSave(eq, up) {
  await S.db.doc("equipment/" + eq.id).update(up);
  Object.assign(eq, up);
}
function eqmBook(eq, k) {
  if (!eq) return;
  const bk = (eq.booked || {})[k] || {};
  const l = eqmLabel(eq, k);
  openSheet(
    `<h3 id="sheettitle">📅 Book in: ${esc(eq.name)} – ${esc(l)}</h3>
    <div class="who">Due ${esc(ukDate((eq.dates || {})[k]))}. It goes on the planner${eq.assignee ? ` and ${esc(nameOf(eq.assignee))} can see it` : ""}.</div>
    <div class="grid2"><label for="eqm-date">Booked for<input id="eqm-date" type="date" value="${esc(bk.date || "")}"></label><label for="eqm-time">Time (optional)<input id="eqm-time" type="time" value="${esc(bk.time || "")}"></label></div>
    <label for="eqm-where">Where (garage or who's coming)<input id="eqm-where" maxlength="80" value="${esc(bk.where || (eq.info || {}).garage || "")}" placeholder="e.g. Exmouth Motors"></label>
    <label for="eqm-note">Note (optional)<input id="eqm-note" maxlength="120" value="${esc(bk.note || "")}" placeholder="e.g. Drop off 8am, courtesy van"></label>
    ${formFoot(!!bk.date, bk.date ? "Save the booking" : "Book it in")}`,
    async () => {
      const date = $("eqm-date").value;
      if (!date) return showErr("Pick the date it's booked for");
      const where = $("eqm-where").value.trim(),
        time = $("eqm-time").value,
        note = $("eqm-note").value.trim();
      const planId = bk.planId || "eqb-" + eq.id + "-" + k;
      try {
        await S.db.doc("plan/" + planId).set({
          from: date,
          to: date,
          type: "vehicle",
          title: `${eq.name} – ${l}${where ? " (" + where + ")" : ""}`,
          people: eq.assignee ? [eq.assignee] : [],
          vis: "all",
          notes: [time ? "At " + time : "", note].filter(Boolean).join(". "),
          eqId: eq.id,
          eqKey: k,
          created: Date.now(),
          updated: Date.now(),
        });
        await eqmSave(eq, {
          booked: Object.assign({}, eq.booked || {}, { [k]: { date, time, where, note, planId } }),
        });
        closeForm();
        toast("Booked in and on the planner");
        eqmView();
      } catch (e) {
        showErr("Couldn't save – check your connection");
      }
    },
    "eqm-date",
  );
  const del = $("f-del");
  if (del) del.textContent = "Cancel the booking";
  if (del)
    del.onclick = async () => {
      try {
        await S.db.doc("plan/" + bk.planId).delete();
      } catch (e) {}
      const b2 = Object.assign({}, eq.booked || {});
      delete b2[k];
      await eqmSave(eq, { booked: b2 });
      closeForm();
      toast("Booking taken off");
      eqmView();
    };
}
function eqmDone(eq, k) {
  if (!eq) return;
  const l = eqmLabel(eq, k);
  const due = (eq.dates || {})[k] || iso(new Date());
  const every = eqmEvery(eq, k);
  const next = (from, m) => {
    const d = parse(from);
    d.setMonth(d.getMonth() + m);
    return iso(d);
  };
  const veh = eq.kind === "vehicle";
  openSheet(
    `<h3 id="sheettitle">✓ Done: ${esc(eq.name)} – ${esc(l)}</h3>
    <div class="grid2"><label for="eqd-date">Done on<input id="eqd-date" type="date" value="${esc(((eq.booked || {})[k] || {}).date || iso(new Date()))}"></label><label for="eqd-cost">Cost £ (optional)<input id="eqd-cost" inputmode="decimal" maxlength="12"></label></div>
    <div class="grid2"><label for="eqd-miles">${veh ? "Mileage" : "Hours / reading"} (optional)<input id="eqd-miles" inputmode="numeric" maxlength="12"></label><label for="eqd-by">Garage / who did it<input id="eqd-by" maxlength="80" value="${esc(((eq.booked || {})[k] || {}).where || "")}"></label></div>
    <label for="eqd-what">What was done<input id="eqd-what" maxlength="120" value="${esc(l + (k === "mot" ? " – pass" : ""))}"></label>
    <div class="grid2"><label for="eqd-every">Comes round every (months)<input id="eqd-every" type="number" inputmode="numeric" min="1" max="60" value="${every}"></label><label for="eqd-next">Next due<input id="eqd-next" type="date" value="${esc(next(due, every))}"></label></div>
    ${formFoot(false, "Save")}`,
    async () => {
      const date = $("eqd-date").value || iso(new Date());
      const ev = Math.max(1, Math.min(60, +$("eqd-every").value || every));
      const nx = $("eqd-next").value;
      const entry = {
        id: newId(),
        date,
        what: $("eqd-what").value.trim() || l,
        miles: $("eqd-miles").value.trim(),
        cost: $("eqd-cost").value.trim(),
        by: $("eqd-by").value.trim(),
        key: k,
      };
      const b2 = Object.assign({}, eq.booked || {});
      delete b2[k];
      try {
        await eqmSave(eq, {
          log: (eq.log || []).concat([entry]),
          dates: Object.assign({}, eq.dates || {}, nx ? { [k]: nx } : {}),
          every: Object.assign({}, eq.every || {}, { [k]: ev }),
          booked: b2,
        });
        closeForm();
        toast(`Logged. Next ${l.toLowerCase()} due ${ukDate(nx)}`);
        eqmView();
      } catch (e) {
        showErr("Couldn't save – check your connection");
      }
    },
    "eqd-cost",
  );
  $("eqd-every").oninput = () => {
    const m = +$("eqd-every").value;
    if (m > 0) $("eqd-next").value = next(due, m);
  };
}
