/* ================= COURSE BOOKING: book people out on a training course, with the course's details, in the planner ================= */
import { $, esc, gbp, iso, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { crewIds, nameOf } from "../owner/owner.js";
export { crsOpen, crsRows };
/* James (Nov 2026): "For everyone I need to book them out that they are on a course with the details of the course
   in the planner". 🎓 Book someone on a course (planner ⋯ menu, and the Holidays & leave tab) – the course, who's
   going (anyone, the owner too), the days and times, who runs it, where, booking reference, cost and what to bring.
   It's a planner entry of type "course" (plan/<id>, seen by everyone) with the details kept in p.course
   { provider, where, ref, cost, bring }; it shows on every planner view, takes them out of the free list, and
   tapping it shows the details (owner: change or delete it; deletes go to Deleted items). Not counted against
   holidays. */
function crsOpen(p) {
  const today = iso(new Date());
  const v = p || { from: today, to: today, people: [], course: {} };
  const c = v.course || {};
  const ids = crewIds();
  openSheet(
    `<h3 id="sheettitle">🎓 ${p ? "Change the course" : "Book someone on a course"}</h3>
    <label for="crs-name">Course<input id="crs-name" required maxlength="120" value="${esc(v.title || "")}" placeholder="e.g. SMSTS, CSCS Level 1, PASMA, First aid at work"></label>
    <div class="flabel">Who's going</div>
    <div class="crs-ppl">${ids.map((id) => `<label class="inl crs-p"><input type="checkbox" class="crs-who" value="${esc(id)}"${(v.people || []).includes(id) ? " checked" : ""}> ${esc(id === S.me ? "You" : nameOf(id))}</label>`).join("")}</div>
    <div class="grid2"><label for="crs-from">First day<input id="crs-from" type="date" required value="${esc(v.from)}"></label>
    <label for="crs-to">Last day<input id="crs-to" type="date" required value="${esc(v.to || v.from)}"></label></div>
    <div class="grid2"><label for="crs-t0">Starts (optional)<input id="crs-t0" type="time" value="${esc(v.time || "")}"></label>
    <label for="crs-t1">Finishes (optional)<input id="crs-t1" type="time" value="${esc(v.endTime || "")}"></label></div>
    <div class="grid2"><label for="crs-prov">Run by<input id="crs-prov" maxlength="120" value="${esc(c.provider || "")}" placeholder="Training company or trainer"></label>
    <label for="crs-ref">Booking reference<input id="crs-ref" maxlength="60" value="${esc(c.ref || "")}"></label></div>
    <label for="crs-where">Where<input id="crs-where" maxlength="200" value="${esc(c.where || "")}" placeholder="Address, or Online"></label>
    <div class="grid2"><label for="crs-cost">Cost £ (only you see it)<input id="crs-cost" type="number" inputmode="decimal" min="0" step="0.01" value="${c.cost != null && c.cost !== "" ? esc(c.cost) : ""}"></label>
    <label for="crs-bring">What to bring<input id="crs-bring" maxlength="200" value="${esc(c.bring || "")}" placeholder="e.g. photo ID, CSCS card, packed lunch"></label></div>
    <label for="crs-notes">Notes (optional)<textarea id="crs-notes" maxlength="1000">${esc(v.notes || "")}</textarea></label>
    ${formFoot(!!p, p ? "Save changes" : "Book and add to planner")}`,
    async () => {
      const title = $("crs-name").value.trim(),
        from = $("crs-from").value,
        to = $("crs-to").value;
      const people = [...document.querySelectorAll(".crs-who:checked")].map((x) => x.value);
      if (!title) return showErr("Put the name of the course.");
      if (!people.length) return showErr("Tick who's going.");
      if (!from || !to || to < from)
        return showErr("The last day must be on or after the first day.");
      const now = Date.now();
      const cost = $("crs-cost").value;
      const data = {
        type: "course",
        title,
        from,
        to,
        time: $("crs-t0").value,
        endTime: $("crs-t1").value,
        people,
        vis: "all",
        notes: $("crs-notes").value.trim(),
        course: {
          provider: $("crs-prov").value.trim(),
          where: $("crs-where").value.trim(),
          ref: $("crs-ref").value.trim(),
          cost: cost === "" ? "" : +cost,
          bring: $("crs-bring").value.trim(),
        },
        updated: now,
      };
      $("f-save").disabled = true;
      try {
        if (p) await S.db.doc("plan/" + p.id).update(data);
        else await S.db.doc("plan/crs-" + newId()).set(Object.assign(data, { created: now }));
        closeForm();
        toast(p ? "Course changed" : "Booked on the course and added to the planner");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "crs-name",
  );
  if (p) armDelete(() => S.db.doc("plan/" + p.id).delete());
}
/* the course's details for the planner's detail view: [label, value] rows (the cost only for the owner) */
function crsRows(p, owner) {
  const c = p.course || {};
  return [
    ["Run by", c.provider],
    ["Where", c.where],
    ["Booking ref", c.ref],
    ["What to bring", c.bring],
    owner && c.cost !== "" && c.cost != null ? ["Cost", gbp(+c.cost)] : null,
  ].filter((r) => r && r[1]);
}
