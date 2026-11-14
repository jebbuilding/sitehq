/* ================= PROGRAMME: a job's stages in order, linked ("can't start until…"), with delay days; dates move when one slips ================= */
import { $, addDays, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { sdiSlug } from "../sites/site-diary.js";
import { siteClient } from "../sites/summary.js";
export { pgClientHtml, pgHtml, pgRec, pgWire };
/* On a site's 📊 Programme tab James lists the stages (or starts from a typical extension, loft or kitchen), each with
   how many working days it takes, what it can't start until (an earlier stage finishing, or the same day as one), and
   any delay days. The dates work themselves out from the start date, Monday to Friday. When a stage runs over (its
   actual finish is later, or delay days are added) everything after it moves. Saving puts each stage on the planner
   (and moves them there), and – if he ticks it – shows the client the programme in their portal's Dates tab. Each
   stage keeps its first planned dates, so a stage that has moved shows how many working days late it is.
   Stored in todos/prog-{site slug} (kind "programme"); planner entries plan/prg-{id}-{stage}; the client's copy is
   portal/{uid}.programme. A stage can be kept from the client (its "Client sees" tick off, stage.hide): it still goes
   on the planner for the trades, but is left out of the client's copy (James, Nov 2026). */
const PG_PRESETS = {
  extension: [
    ["Set up site, welfare and skip", 1],
    ["Dig and pour foundations", 4],
    ["Drainage", 2],
    ["Brickwork to damp course and floor slab", 4],
    ["Brickwork / blockwork up to the roof", 8],
    ["Roof structure and covering", 6],
    ["Windows and doors", 2],
    ["First fix (electrics, plumbing, carpentry)", 4],
    ["Plaster", 4],
    ["Second fix", 4],
    ["Decorate", 4],
    ["Snag and clean", 2],
  ],
  loft: [
    ["Scaffold up", 1],
    ["Steels and floor joists", 4],
    ["Dormer and roof", 8],
    ["Stairs", 2],
    ["Windows", 2],
    ["First fix", 3],
    ["Insulation and plasterboard", 3],
    ["Plaster", 3],
    ["Second fix", 3],
    ["Decorate", 3],
    ["Scaffold down, snag and clean", 2],
  ],
  kitchen: [
    ["Strip out", 2],
    ["First fix (electrics and plumbing)", 2],
    ["Plaster and make good", 3],
    ["Fit units", 3],
    ["Worktops templated and fitted", 1],
    ["Tiling", 2],
    ["Second fix and appliances", 2],
    ["Decorate", 2],
    ["Snag and clean", 1],
  ],
};
/* the timer for redrawing the programme table after a change (below, where the table is wired up) */
let pgRedrawT = 0;
const pgId = (site) => "prog-" + sdiSlug(site);
const pgRec = (site) => (S.programmes || []).find((p) => p.id === pgId(site)) || null;
const pgIsWork = (d) => d.getDay() !== 0 && d.getDay() !== 6;
/* the first working day on or after a date */
function pgOnWork(ds) {
  const d = parse(ds);
  while (!pgIsWork(d)) d.setDate(d.getDate() + 1);
  return iso(d);
}
/* n working days on from a working day (n = 0 is the same day) */
function pgAddWork(ds, n) {
  const d = parse(pgOnWork(ds));
  let k = n;
  while (k > 0) {
    d.setDate(d.getDate() + 1);
    if (pgIsWork(d)) k--;
  }
  return iso(d);
}
/* working days from a to b (0 if b is not after a) */
function pgWorkBetween(a, b) {
  if (!a || !b || b <= a) return 0;
  let n = 0;
  const d = parse(a);
  while (iso(d) < b) {
    d.setDate(d.getDate() + 1);
    if (pgIsWork(d)) n++;
  }
  return n;
}
/* each stage's dates: after a stage finishes (the next working day), the same day as it starts, or from the start */
function pgCalc(pr) {
  const out = {};
  const start = pgOnWork(pr.start || iso(new Date()));
  (pr.stages || []).forEach((s) => {
    const a = s.after && out[s.after];
    let from = !a ? start : s.link === "with" ? a.from : pgAddWork(a.to, 1);
    from = pgAddWork(from, Math.max(0, +s.lag || 0));
    if (s.fix && s.fix > from) from = pgOnWork(s.fix);
    if (s.actFrom) from = s.actFrom;
    const to = s.actTo || pgAddWork(from, Math.max(1, +s.days || 1) - 1);
    out[s.id] = { from, to };
  });
  return out;
}
function pgHtml(site) {
  const pr = pgRec(site);
  if (!pr)
    return `<div class="card pg-empty"><b>📊 No programme for this job yet</b><div class="who">List the stages in order, how long each takes and what it can't start until. The dates work themselves out and move when something slips; they go on the planner, and the client can see them.</div>
      <label for="pg-start">Start date<input id="pg-start" type="date" value="${esc(pgOnWork(iso(new Date())))}"></label>
      <div class="actions"><button type="button" class="btn primary pg-new" data-t="extension">Start from a typical extension</button><button type="button" class="btn pg-new" data-t="loft">… a loft conversion</button><button type="button" class="btn pg-new" data-t="kitchen">… a kitchen</button><button type="button" class="btn pg-new" data-t="">Start blank</button></div></div>`;
  const dt = pgCalc(pr);
  const st = pr.stages || [];
  const today = iso(new Date());
  const all = st.map((s) => dt[s.id]);
  const lo = all.length ? all.map((x) => x.from).sort()[0] : pr.start;
  const hi = all.length
    ? all
        .map((x) => x.to)
        .sort()
        .slice(-1)[0]
    : pr.start;
  const span = Math.max(1, Math.round((parse(hi) - parse(lo)) / 864e5) + 1);
  const pos = (d) => (Math.round((parse(d) - parse(lo)) / 864e5) / span) * 100;
  const late = (s) => (s.base ? pgWorkBetween(s.base.to, dt[s.id].to) : 0);
  const c = siteClient(site);
  return `<div class="pg"><div class="pg-top"><label for="pg-start">Job starts<input id="pg-start" type="date" value="${esc(pr.start || "")}"></label><span class="who">Finishes <b>${esc(shortDay(hi))}</b> · ${pgWorkBetween(lo, hi) + 1} working days${st.some(late) ? ` · <span class="pg-late">${Math.max(...st.map(late))} days later than first planned</span>` : ""}</span></div>
    <div class="tablewrap"><table class="pg-tbl"><thead><tr><th>#</th><th>Stage</th><th>Days</th><th>Can't start until</th><th>Delay</th><th>Dates</th><th>Done</th><th>Client sees</th><th></th></tr></thead><tbody>${st
      .map((s, i) => {
        const d = dt[s.id];
        const lt = late(s);
        return `<tr data-i="${i}"${s.done ? ' class="pg-done"' : ""}><td>${i + 1}</td>
        <td><input class="pg-name" maxlength="80" value="${esc(s.name || "")}" aria-label="Stage ${i + 1}"></td>
        <td><input class="pg-days" type="number" inputmode="numeric" min="1" max="200" value="${esc(s.days || 1)}" aria-label="Working days for stage ${i + 1}"></td>
        <td><select class="pg-after" aria-label="Stage ${i + 1} can't start until"><option value="">The job starts</option>${st
          .slice(0, i)
          .map(
            (o, j) =>
              `<option value="${esc(o.id)}|end"${s.after === o.id && s.link !== "with" ? " selected" : ""}>${j + 1}. ${esc((o.name || "").slice(0, 30))} finishes</option><option value="${esc(o.id)}|with"${s.after === o.id && s.link === "with" ? " selected" : ""}>${j + 1}. ${esc((o.name || "").slice(0, 30))} starts (same day)</option>`,
          )
          .join("")}</select></td>
        <td><input class="pg-lag" type="number" inputmode="numeric" min="0" max="200" value="${esc(s.lag || 0)}" aria-label="Delay days before stage ${i + 1}"></td>
        <td class="pg-dates">${esc(shortDay(d.from))}${d.to !== d.from ? " – " + esc(shortDay(d.to)) : ""}${lt ? ` <span class="tag bad">${lt} day${lt === 1 ? "" : "s"} late</span>` : ""}${!s.done && d.from <= today && d.to >= today ? ' <span class="tag day">Now</span>' : ""}</td>
        <td><button type="button" class="pillbtn pg-tick" aria-pressed="${!!s.done}" aria-label="Stage ${i + 1} done">${s.done ? "✓ " + esc(shortDay(s.actTo || d.to)) : "Done?"}</button></td>
        <td><label class="pg-clw"><input type="checkbox" class="pg-cl"${s.hide ? "" : " checked"} aria-label="The client sees stage ${i + 1}"><span>${s.hide ? "🔒 No" : "Yes"}</span></label></td>
        <td><button type="button" class="linkdanger pg-x" aria-label="Remove stage ${i + 1}">✕</button></td></tr>`;
      })
      .join("")}</tbody></table></div>
    <div class="actions"><button type="button" class="btn" id="pg-add">+ Add a stage</button></div>
    <div class="pg-gantt" aria-label="Programme chart">${st
      .map((s, i) => {
        const d = dt[s.id];
        const l = pos(d.from),
          w = Math.max(1.2, pos(iso(addDays(parse(d.to), 1))) - l);
        return `<div class="pg-grow"><span class="pg-gl">${i + 1}. ${esc(s.name || "")}</span><span class="pg-gt"><span class="pg-bar${s.done ? " done" : late(s) ? " late" : ""}" style="left:${l}%;width:${w}%"></span>${today >= lo && today <= hi ? `<span class="pg-today" style="left:${pos(today)}%"></span>` : ""}</span></div>`;
      })
      .join("")}</div>
    <label class="inl"><input type="checkbox" id="pg-client"${pr.toClient ? " checked" : ""}${c && c.portalUid ? "" : " disabled"}> ${c ? `${esc(c.name)} can see the programme in their portal` : "No client linked to this site"}${c && !c.portalUid ? " (once they join the portal)" : ""} – only the stages ticked "Client sees"; untick one to keep it to you and the trades</label>
    <div class="actions"><button type="button" class="btn primary" id="pg-save">Save and put on the planner</button><button type="button" class="linkdanger" id="pg-del">Delete the programme</button></div>
    <div class="who">Change a stage's days, what it waits for, or add delay days – the dates after it move. Tap Done when a stage finishes; if it finished late, put the real date and everything after it moves.</div></div>`;
}
/* read the table back into the record (keeping ids, done and first-planned dates) */
function pgRead(pr) {
  const rows = [...document.querySelectorAll(".pg-tbl tbody tr")];
  const stages = rows.map((r) => {
    const s = Object.assign({}, pr.stages[+r.dataset.i]);
    s.name = r.querySelector(".pg-name").value.trim();
    s.days = Math.max(1, Math.min(200, Math.round(+r.querySelector(".pg-days").value || 1)));
    const [a, link] = (r.querySelector(".pg-after").value || "").split("|");
    s.after = a || "";
    s.link = a ? link || "end" : "";
    s.lag = Math.max(0, Math.min(200, Math.round(+r.querySelector(".pg-lag").value || 0)));
    s.hide = !r.querySelector(".pg-cl").checked;
    return s;
  });
  return Object.assign({}, pr, {
    start: $("pg-start").value || pr.start,
    stages,
    toClient: !!($("pg-client") && $("pg-client").checked),
  });
}
async function pgSave(site, pr, quiet) {
  const dt = pgCalc(pr);
  pr.stages.forEach((s) => {
    if (!s.base) s.base = dt[s.id];
  });
  const rec = Object.assign({}, pr, { kind: "programme", site, updated: Date.now() });
  delete rec.id;
  await S.db.doc("todos/" + pgId(site)).set(rec);
  const r2 = Object.assign({ id: pgId(site) }, rec);
  S.programmes = (S.programmes || []).filter((x) => x.id !== r2.id).concat([r2]);
  /* the planner: one entry a stage, moved when the dates move; gone stages taken off */
  const keep = new Set();
  for (const s of pr.stages) {
    const pid = "prg-" + sdiSlug(site) + "-" + s.id;
    keep.add(pid);
    const d = dt[s.id];
    const ex = (S.plan || []).find((p) => p.id === pid);
    if (
      ex &&
      ex.from === d.from &&
      ex.to === d.to &&
      ex.title === s.name + " – " + site &&
      !!ex.done === !!s.done
    )
      continue;
    await S.db.doc("plan/" + pid).set(
      Object.assign({}, ex || {}, {
        from: d.from,
        to: d.to,
        type: "work",
        title: s.name + " – " + site,
        site,
        people: (ex && ex.people) || [],
        vis: (ex && ex.vis) || "all",
        notes: (ex && ex.notes) || "",
        progId: pgId(site),
        stageId: s.id,
        done: !!s.done,
        created: (ex && ex.created) || Date.now(),
        updated: Date.now(),
      }),
    );
  }
  for (const p of (S.plan || []).filter((p) => p.progId === pgId(site) && !keep.has(p.id)))
    try {
      await S.db.doc("plan/" + p.id).delete();
    } catch (e) {}
  /* the client's copy */
  const c = siteClient(site);
  if (c && c.portalUid)
    try {
      await S.db.doc("portal/" + c.portalUid).update({
        programme: pr.toClient
          ? {
              site,
              stages: pr.stages
                .filter((s) => !s.hide)
                .map((s) => ({
                  name: s.name,
                  from: dt[s.id].from,
                  to: dt[s.id].to,
                  done: !!s.done,
                })),
              updated: Date.now(),
            }
          : null,
      });
    } catch (e) {}
  if (!quiet) toast("Saved. The planner has the new dates");
}
function pgWire(site) {
  document.querySelectorAll(".pg-new").forEach(
    (b) =>
      (b.onclick = async () => {
        const rows = PG_PRESETS[b.dataset.t] || [["First stage", 1]];
        const stages = [];
        rows.forEach(([name, days], i) => {
          const id = newId();
          stages.push({
            id,
            name,
            days,
            after: i ? stages[i - 1].id : "",
            link: i ? "end" : "",
            lag: 0,
          });
        });
        const c = siteClient(site);
        try {
          await pgSave(site, {
            start: pgOnWork($("pg-start").value || iso(new Date())),
            stages,
            toClient: !!(c && c.portalUid),
          });
          render();
        } catch (e) {
          toast("Couldn't save – check your connection");
        }
      }),
  );
  const pr = pgRec(site);
  if (!pr) return;
  const redo = (fn) => {
    const p2 = pgRead(pgRec(site));
    fn(p2);
    S.programmes = (S.programmes || []).filter((x) => x.id !== p2.id).concat([p2]);
    render();
  };
  if ($("pg-add"))
    $("pg-add").onclick = () =>
      redo((p) => {
        const last = p.stages[p.stages.length - 1];
        p.stages.push({
          id: newId(),
          name: "",
          days: 1,
          after: last ? last.id : "",
          link: last ? "end" : "",
          lag: 0,
        });
      });
  document.querySelectorAll(".pg-x").forEach(
    (b) =>
      (b.onclick = () =>
        redo((p) => {
          const i = +b.closest("tr").dataset.i;
          const gone = p.stages[i];
          p.stages.splice(i, 1);
          /* whatever waited for it now waits for what it waited for */
          p.stages.forEach((s) => {
            if (s.after === gone.id) {
              s.after = gone.after || "";
              s.link = gone.after ? gone.link || "end" : "";
            }
          });
        })),
  );
  /* any change to the table redraws the dates straight away (not saved until Save). The redraw waits a moment and
     is skipped when a button is being pressed: typing a number then tapping Save straight away fires the change as
     the box loses focus, and redrawing then would swallow the tap on Save (the button's own action reads the table) */
  document.querySelectorAll(".pg-tbl input, .pg-tbl select, #pg-start").forEach(
    (el) =>
      (el.onchange = () => {
        clearTimeout(pgRedrawT);
        pgRedrawT = setTimeout(() => redo(() => {}), 250);
      }),
  );
  $("main")
    .querySelectorAll("button")
    .forEach((b) => b.addEventListener("pointerdown", () => clearTimeout(pgRedrawT)));
  document.querySelectorAll(".pg-tick").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.closest("tr").dataset.i;
        const p = pgRead(pgRec(site));
        const s = p.stages[i];
        if (s.done) {
          redo((q) => {
            q.stages[i].done = false;
            delete q.stages[i].actTo;
          });
          return;
        }
        const d = pgCalc(p)[s.id];
        openSheet(
          `<h3 id="sheettitle">✓ ${esc(s.name || "Stage " + (i + 1))} done</h3>
          <label for="pg-act">Finished on<input id="pg-act" type="date" value="${esc(d.to <= iso(new Date()) ? d.to : iso(new Date()))}"></label>
          <div class="who">Planned to finish ${esc(shortDay(d.to))}. If it finished later, the stages after it move on.</div>
          ${formFoot(false, "Save")}`,
          async () => {
            const act = $("pg-act").value || d.to;
            p.stages[i] = Object.assign({}, s, {
              done: true,
              actFrom: d.from,
              actTo: act < d.from ? d.from : act,
            });
            closeForm();
            try {
              await pgSave(site, p, true);
              toast(
                act > d.to
                  ? `Done ${pgWorkBetween(d.to, act)} days late – the stages after it have moved`
                  : "Done",
              );
              render();
            } catch (e) {
              toast("Couldn't save");
            }
          },
          "pg-act",
        );
      }),
  );
  if ($("pg-save"))
    $("pg-save").onclick = async () => {
      try {
        await pgSave(site, pgRead(pgRec(site)));
        render();
      } catch (e) {
        toast("Couldn't save – check your connection");
      }
    };
  if ($("pg-del"))
    $("pg-del").onclick = async (e) => {
      const b = e.currentTarget;
      if (b.dataset.armed !== "1") {
        b.dataset.armed = "1";
        b.textContent = "Tap again to delete the programme";
        return;
      }
      try {
        for (const p of (S.plan || []).filter((p) => p.progId === pgId(site)))
          await S.db.doc("plan/" + p.id).delete();
        await S.db.doc("todos/" + pgId(site)).delete();
        S.programmes = (S.programmes || []).filter((x) => x.id !== pgId(site));
        const c = siteClient(site);
        if (c && c.portalUid) await S.db.doc("portal/" + c.portalUid).update({ programme: null });
        toast("Programme deleted");
        render();
      } catch (er) {
        toast("Couldn't delete");
      }
    };
}
/* the client's portal: their job programme, at the top of the Dates tab */
function pgClientHtml(C) {
  const pg = C && C.programme;
  if (!pg || !(pg.stages || []).length) return "";
  const today = iso(new Date());
  return `<div class="card pg-client"><b>📊 Your job programme</b><div class="who">The stages of your job and when we plan to do them. If something moves, this updates.</div>${pg.stages
    .map(
      (s) =>
        `<div class="pg-crow${s.done ? " pg-done" : ""}"><span>${s.done ? "✓ " : !s.done && s.from <= today && s.to >= today ? "▶ " : ""}${esc(s.name)}</span><span class="who">${esc(shortDay(s.from))}${s.to !== s.from ? " – " + esc(shortDay(s.to)) : ""}</span></div>`,
    )
    .join("")}</div>`;
}
