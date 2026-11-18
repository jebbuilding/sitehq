/* ================= QUICK WEEK: the owner fixes a trade's whole week on one screen ================= */
import { bossName } from "../core/company-names.js";
import { $, addDays, calcHours, esc, hrs, iso, parse, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { nameOf, weekEntries } from "../owner/owner.js";
export { qwOpen };
/* James (Nov 2026): "I also need to adjust trades' timesheets" → "Quicker week view". On Timesheets, each person's
   card has ✎ Quick edit this week: every day of the week shown on the Timesheets page, one line per timesheet day –
   the site, start, finish and unpaid break to change straight in the line, the hours working themselves out, an
   Approved tick, 🗑 to take a line out (it goes to Deleted items), a blank line on days with nothing to fill in, + to
   add another line to a day, and "Fill the empty weekdays like the first day". One Save writes the lot; each line
   changed carries editedBy / editedAt like any other change the owner makes. Only timesheet days (start–finish),
   not day work or job logs – those keep their own form. */
const QW_BREAKS = [0, 15, 20, 30, 45, 60, 90];
function qwOpen(id) {
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(S.week, i)));
  const rows = [];
  days.forEach((di) => {
    const list = weekEntries(id)
      .filter((e) => e.type === "hours" && e.date === di && (!e.open || di < iso(new Date())))
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    list.forEach((e) => rows.push({ di, e }));
    if (!list.length) rows.push({ di, e: null });
  });
  const sites = [
    ...new Set(siteNames().concat(rows.filter((r) => r.e).map((r) => r.e.job))),
  ].filter(Boolean);
  const siteSel = (v) =>
    `<select class="qw-site" aria-label="Site"><option value="">–</option>${sites.map((n) => `<option${n === v ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const line = (r, i) => {
    const e = r.e || {};
    const d = parse(r.di);
    const we = d.getDay() === 0 || d.getDay() === 6;
    return `<tr class="qw-row${we ? " qw-we" : ""}${r.e ? "" : " qw-new"}" data-i="${i}" data-d="${r.di}">
      <td class="qw-day">${esc(d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }))}</td>
      <td>${siteSel(e.job || "")}</td>
      <td><input type="time" class="qw-s" value="${esc(e.start || "")}" aria-label="Start"></td>
      <td><input type="time" class="qw-f" value="${esc(e.finish || "")}" aria-label="Finish">${e.open ? '<div class="qw-nco">Never checked out</div>' : ""}</td>
      <td><select class="qw-b" aria-label="Unpaid break">${QW_BREAKS.map((m) => `<option value="${m}"${+(e.breakMin || 0) === m ? " selected" : ""}>${m ? m + "m" : "None"}</option>`).join("")}</select></td>
      <td class="num qw-h">${r.e ? hrs(e.hours) : ""}</td>
      <td><input type="checkbox" class="qw-ok" aria-label="Approved"${e.approved ? " checked" : ""}></td>
      <td class="qw-acts"><button type="button" class="iconbtn qw-add" aria-label="Another line for this day" title="Another line for this day">+</button>${r.e ? `<button type="button" class="iconbtn qw-del" aria-label="Take this line out" title="Take this line out">🗑</button>` : ""}</td></tr>`;
  };
  openSheet(
    `<h3 id="sheettitle">✎ ${esc(nameOf(id))} – week of ${esc(parse(days[0]).toLocaleDateString("en-GB", { day: "numeric", month: "long" }))}</h3>
    <div class="who">Change anything straight in the lines, then Save. Hours work themselves out. Fill in a blank line to add a day.</div>
    <div class="tablewrap qw-wrap"><table class="qw-tbl"><thead><tr><th>Day</th><th>Site</th><th>Start</th><th>Finish</th><th>Break</th><th class="num">Hours</th><th>OK</th><th></th></tr></thead>
    <tbody>${rows.map(line).join("")}</tbody>
    <tfoot><tr><td colspan="5"><b>Week</b></td><td class="num"><b id="qw-tot"></b></td><td colspan="2"></td></tr></tfoot></table></div>
    <div class="actions"><button type="button" class="btn" id="qw-fill">⇩ Fill the empty weekdays like the first day</button><button type="button" class="btn" id="qw-all">✓ Tick them all approved</button></div>
    ${formFoot(false, "Save the week")}`,
    async () => {
      const now = Date.now();
      const by = bossName();
      const jobs = [];
      let bad = "";
      document.querySelectorAll("#form .qw-row").forEach((tr) => {
        const r = rows[+tr.dataset.i] || { di: tr.dataset.d, e: null };
        const v = qwRead(tr);
        if (tr.classList.contains("qw-gone")) {
          if (r.e) jobs.push(() => S.db.doc(qwPath(id, r.e)).delete());
          return;
        }
        if (!r.e && !v.job && !v.start && !v.finish) return;
        if (!v.job || !v.start || !v.finish || !v.hours) {
          bad =
            bad ||
            `${parse(r.di).toLocaleDateString("en-GB", { weekday: "long" })}: put the site, start and finish.`;
          return;
        }
        if (r.e) {
          const e = r.e;
          if (
            e.job === v.job &&
            e.start === v.start &&
            e.finish === v.finish &&
            +(e.breakMin || 0) === v.breakMin &&
            !!e.approved === v.approved &&
            !e.open
          )
            return;
          if (e.open) Object.assign(v, { open: false, outAt: now, stoppedBy: by });
          jobs.push(() =>
            S.db
              .doc(qwPath(id, e))
              .update(Object.assign(v, { updated: now, editedBy: by, editedAt: now })),
          );
        } else
          jobs.push(() =>
            S.db
              .doc("sheets/" + id + "/entries/" + newId())
              .set(
                Object.assign(
                  { type: "hours", date: r.di, task: "", notes: "", open: false, created: now },
                  v,
                  { updated: now, editedBy: by, editedAt: now },
                ),
              ),
          );
      });
      if (bad) return showErr(bad);
      if (!jobs.length) return closeForm();
      $("f-save").disabled = true;
      try {
        for (const j of jobs) await j();
        closeForm();
        toast(`Saved ${jobs.length} change${jobs.length === 1 ? "" : "s"} to ${nameOf(id)}'s week`);
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
  const tb = document.querySelector("#form .qw-tbl tbody");
  const total = () => {
    let t = 0;
    tb.querySelectorAll(".qw-row:not(.qw-gone)").forEach((tr) => {
      const v = qwRead(tr);
      tr.querySelector(".qw-h").textContent = v.hours ? hrs(v.hours) : "";
      t += v.hours;
    });
    $("qw-tot").textContent = hrs(t) + " h";
  };
  const wireRow = (tr) => {
    tr.querySelectorAll("input,select").forEach((x) => (x.oninput = x.onchange = total));
    tr.querySelector(".qw-add").onclick = () => {
      rows.push({ di: tr.dataset.d, e: null });
      const html = line(rows[rows.length - 1], rows.length - 1);
      tr.insertAdjacentHTML("afterend", html);
      const n = tr.nextElementSibling;
      wireRow(n);
      n.querySelector(".qw-site").focus();
    };
    const del = tr.querySelector(".qw-del");
    if (del)
      del.onclick = () => {
        tr.classList.toggle("qw-gone");
        del.textContent = tr.classList.contains("qw-gone") ? "↩" : "🗑";
        del.setAttribute(
          "aria-label",
          tr.classList.contains("qw-gone") ? "Keep this line" : "Take this line out",
        );
        total();
      };
  };
  tb.querySelectorAll(".qw-row").forEach(wireRow);
  $("qw-fill").onclick = () => {
    const first = [...tb.querySelectorAll(".qw-row:not(.qw-gone)")].find((tr) => qwRead(tr).hours);
    if (!first) return toast("Fill in one day first");
    const v = qwRead(first);
    let n = 0;
    tb.querySelectorAll(".qw-row.qw-new:not(.qw-we)").forEach((tr) => {
      const w = qwRead(tr);
      if (w.job || w.start || w.finish) return;
      tr.querySelector(".qw-site").value = v.job;
      tr.querySelector(".qw-s").value = v.start;
      tr.querySelector(".qw-f").value = v.finish;
      tr.querySelector(".qw-b").value = String(v.breakMin);
      n++;
    });
    total();
    toast(
      n
        ? `Filled ${n} day${n === 1 ? "" : "s"} – check them, then Save`
        : "No empty weekdays to fill",
    );
  };
  $("qw-all").onclick = () => {
    tb.querySelectorAll(".qw-row:not(.qw-gone)").forEach((tr) => {
      if (qwRead(tr).hours) tr.querySelector(".qw-ok").checked = true;
    });
  };
  total();
}
/* what a line says now */
function qwRead(tr) {
  const job = tr.querySelector(".qw-site").value,
    start = tr.querySelector(".qw-s").value,
    finish = tr.querySelector(".qw-f").value,
    breakMin = +tr.querySelector(".qw-b").value || 0;
  return {
    job,
    start,
    finish,
    breakMin,
    hours: start && finish ? Math.round(calcHours(start, finish, breakMin) * 100) / 100 : 0,
    approved: tr.querySelector(".qw-ok").checked,
  };
}
/* where a line is kept: the person's own sheet, or the sheet of whoever filled it in for them */
const qwPath = (id, e) => "sheets/" + (e._src || id) + "/entries/" + e.id;
