/* ================= EMPLOYEE: TIME ================= */
import { lastOf, pickField, pickVal } from "../core/fields.js";
import {
  $,
  calcHours,
  dayLabel,
  dayLine,
  esc,
  hrs,
  iso,
  lunchBreak,
  monday,
  nowHM,
  parse,
  shortDay,
  toMin,
  toast,
} from "../core/helpers.js";
import {
  armDelete,
  closeForm,
  editing,
  formFoot,
  formType,
  kindVal,
  myDoc,
  openSheet,
  setEditing,
  setFormType,
  setKindVal,
  showErr,
} from "../core/sheet.js";
import { S, inWeek, siteNames, weekDays } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { newId, sentToast, submitJob } from "../files/outbox.js";
import { nameOf, ownerDisplayName } from "../owner/owner.js";
import { proxyFor, setProxyFor } from "../people/foreman.js";
import { myTrade, siteRec } from "../photos/photos.js";
import { dueSoonCard } from "../safety/expiry-dates.js";
import { empIndTodo, openInduction } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { myName } from "../survey/door-window-survey.js";
import { dwTradeSheet } from "./day-work.js";
import { tsPaper, wireTsPaper } from "./monthly-sheet.js";
import { otmLine, otmOffer } from "./overtime.js";
import { dayFor, openMyDay } from "./working-day.js";
export { checkIn, checkOut, empTime, entrySub, openEntry, sumH, typeTag };
function typeTag(e) {
  return e.open
    ? '<span class="tag ok">On site now</span>'
    : e.type === "hours"
      ? '<span class="tag">Timesheet</span>'
      : e.kind === "extra"
        ? '<span class="tag day">Extra work</span>'
        : '<span class="tag">Job time</span>';
}
function entrySub(e) {
  const p = [];
  if (e.type === "hours")
    p.push(
      e.open
        ? `Checked in at ${esc(e.start)}`
        : `${esc(e.start)}–${esc(e.finish)}${+e.breakMin ? ` · ${e.breakMin} min unpaid lunch` : ""}${e.checkIn ? " · checked in" : ""}${(e.actualIn && e.actualIn !== e.start) || (e.actualOut && e.actualOut !== e.finish) ? ` (on site ${esc(e.actualIn || e.start)}–${esc(e.actualOut || e.finish)})` : ""}`,
    );
  else if (e.task) p.push(esc(e.task));
  if (e.notes) p.push(esc(e.notes));
  return p.join(" · ") + otmLine(e);
}
function sumH(list, f) {
  return list.filter(f).reduce((a, e) => a + (+e.hours || 0), 0);
}
function clockCard() {
  const today = iso(new Date());
  const open = S.mine.entries.filter((e) => e.open).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (open && open.date < today)
    return `<div class="checkin late"><b>You're still checked in from ${esc(shortDay(open.date))}</b><div class="sub">${esc(open.job)} · in at ${esc(open.start)}</div><button class="btn primary ci-fix" type="button" data-id="${esc(open.id)}">Set my finish time</button></div>`;
  const D = dayFor(S.me);
  if (open) {
    const s = siteRec(open.job) || {};
    return `<div class="checkin on"><div class="cistate"><span class="cidot"></span>On site</div><b class="cisite">${esc(open.job)}</b>${s.project ? `<div class="sub">${esc(s.project)}</div>` : ""}
    <div class="citime">${open.actualIn && open.actualIn !== open.start ? `Arrived <b>${esc(open.actualIn)}</b> · paid from <b>${esc(open.start)}</b>` : `Checked in at <b>${esc(open.start)}</b>${toMin(open.start) > toMin(D.s) ? ` <span class="who">(start time ${esc(D.s)})</span>` : ""}`}</div>
    <button class="btn primary big ci-out" type="button" data-id="${esc(open.id)}">Check out</button>
    <button class="pillbtn ci-edit" type="button" data-id="${esc(open.id)}" style="align-self:flex-start">Change my start time</button>
    <div class="who">Your paid day: ${esc(dayLine(D))}. Arrive early or leave late and you're paid from ${esc(D.s)} to ${esc(D.e)} – or ask for overtime when you check out. The lunch is taken off automatically. <button type="button" class="linkbtn ci-day">Change my usual day</button></div></div>`;
  }
  const done = S.mine.entries.filter((e) => e.date === today && e.type === "hours" && !e.open);
  return `<div class="checkin"><b>Check in to site</b>${pickField(
    "ci-site",
    "Site",
    siteNames(),
    lastOf(S.mine.entries, () => true, "job"),
    "e.g. 12 Marine Way, Exmouth",
  )}
    <button class="btn primary big ci-in" type="button">Check in now</button>
    <div class="who">⏰ Your usual day: ${esc(dayLine(D))}${D.own ? "" : " (standard)"} · <button type="button" class="linkbtn ci-day">Change</button></div>
    ${done.length ? `<div class="who">Today so far: ${done.map((e) => `${esc(e.job)} ${esc(e.start)}–${esc(e.finish)}`).join(", ")}</div>` : `<div class="who">Forgot to check in? Use <b>+ Timesheet</b> to add the day by hand.</div>`}</div>`;
}
async function checkIn() {
  const site = pickVal("ci-site");
  if (!site) {
    toast("Choose the site first");
    return;
  }
  const now = Date.now(),
    id = newId();
  const D = dayFor(S.me);
  const actual = nowHM(),
    st = toMin(actual) < toMin(D.s) ? D.s : actual;
  const data = {
    type: "hours",
    date: iso(new Date()),
    job: site,
    start: st,
    actualIn: actual,
    finish: "",
    breakMin: 0,
    hours: 0,
    open: true,
    inAt: now,
    checkIn: true,
    notes: "",
    approved: false,
    created: now,
    updated: now,
  };
  S.mine.entries = S.mine.entries.concat([Object.assign({ id }, data)]);
  render();
  try {
    const r = await submitJob({ coll: "entries", docId: id, data });
    toast(
      (r === "queued"
        ? "Checked in (kept on this phone until you have signal)"
        : "Checked in at " + actual) + (st !== actual ? " · paid from " + st : ""),
    );
  } catch (e) {
    toast("Couldn't check in. Ask James to check you're an Editor.");
  }
}
async function checkOut(e) {
  const D = dayFor(S.me);
  const actual = nowHM();
  const finish = toMin(actual) > toMin(D.e) ? D.e : actual;
  const br = lunchBreak(e.start, finish, D);
  const data = Object.assign({}, e, {
    finish,
    actualOut: actual,
    breakMin: br,
    hours: Math.round(calcHours(e.start, finish, br) * 100) / 100,
    open: false,
    outAt: Date.now(),
    updated: Date.now(),
  });
  delete data.id;
  S.mine.entries = S.mine.entries.map((x) =>
    x.id === e.id ? Object.assign({ id: e.id }, data) : x,
  );
  render();
  try {
    const r = await submitJob({ coll: "entries", docId: e.id, data });
    toast(
      `Checked out at ${actual}${finish !== actual ? " · paid to " + finish : ""} · ${hrs(data.hours)} hours` +
        (r === "queued" ? " (sends when you have signal)" : ""),
    );
    otmOffer(Object.assign({ id: e.id }, data));
  } catch (err) {
    toast("Couldn't check out. Try again.");
  }
}
function empTime() {
  const today = iso(new Date());
  if (!S.f.tsm) S.f.tsm = today.slice(0, 7);
  const ym = S.f.tsm;
  const wk = S.mine.entries.filter((e) => (e.date || "").slice(0, 7) === ym && !e.forName);
  let html =
    clockCard() +
    dueSoonCard("mine") +
    `<div class="actions"><button class="btn primary" id="addH" type="button">+ Timesheet</button><button class="btn hv" id="addJ" type="button">+ Day work / job time</button></div>
    <div class="seg tsmode" style="margin-top:10px"><button type="button" data-v="ts" aria-pressed="${(S.f.tsmode || "ts") === "ts"}">📅 Timesheet</button><button type="button" data-v="dw" aria-pressed="${S.f.tsmode === "dw"}">🧱 Day work sheet</button></div>` +
    (S.f.tsmode === "dw"
      ? dwTradeSheet(ym, wk)
      : tsPaper(
          ym,
          wk.filter((e) => e.type === "hours"),
        ));
  if (false)
    weekDays().forEach((day) => {
      const di = iso(day);
      const list = wk
        .filter((e) => e.date === di)
        .sort(
          (a, b) =>
            (a.type === b.type ? 0 : a.type === "hours" ? -1 : 1) ||
            (a.start || "").localeCompare(b.start || ""),
        );
      const dh = sumH(list, (e) => e.type === "hours"),
        dj = sumH(list, (e) => e.type === "job");
      const sum = [dh ? hrs(dh) + " h worked" : "", dj ? hrs(dj) + " h on jobs" : ""]
        .filter(Boolean)
        .join(" · ");
      html += `<div class="day"><div class="dayh ${di === today ? "today" : ""}"><span>${dayLabel(day)}${di === today ? " · Today" : ""}</span><span class="sum">${sum}</span></div>`;
      if (!list.length) html += `<div class="nothing">Nothing logged</div>`;
      list.forEach((e) => {
        html += `<button type="button" class="entry" data-id="${esc(e.id)}"><div class="main"><div class="job">${typeTag(e)}${e.approved ? '<span class="tag ok">Approved</span>' : ""}${esc(e.job || "No site given")}</div><div class="sub">${entrySub(e)}</div></div><div class="amt">${hrs(e.hours)} h</div></button>`;
      });
      html += `</div>`;
    });
  const it = empIndTodo();
  if (it.length)
    html =
      `<div class="notice warn"><b>Site induction needed:</b> ${it.map((i) => `${esc(i.site)} <button type="button" class="pillbtn ind-go" data-id="${esc(i.id)}" style="margin:4px 0 0 4px">Do it now</button>`).join(" ")}</div>` +
      html;
  $("main").innerHTML = html;
  $("main")
    .querySelectorAll(".ind-go")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const i = S.inductions.find((x) => x.id === b.dataset.id);
          if (i) openInduction(i);
        }),
    );
  $("addH").onclick = () => openEntry("hours");
  $("addJ").onclick = () => openEntry("job");
  wireTsPaper($("main"), null, render);
  $("main")
    .querySelectorAll(".tsmode button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.tsmode = b.dataset.v;
          render();
        }),
    );
  $("main")
    .querySelectorAll(".dwt-row")
    .forEach(
      (r) =>
        (r.onclick = () => {
          const e = S.mine.entries.find((x) => x.id === r.dataset.id);
          if (!e) return;
          if (e.approved || e.billed) {
            toast("This has been approved or billed. Ask James if it needs changing.");
            return;
          }
          openEntry("job", e);
        }),
    );
  if ($("main").querySelector(".ci-in")) $("main").querySelector(".ci-in").onclick = checkIn;
  const co = $("main").querySelector(".ci-out");
  if (co)
    co.onclick = () => {
      const e = S.mine.entries.find((x) => x.id === co.dataset.id);
      if (!e) return;
      if (co.dataset.armed !== "1" && toMin(nowHM()) < toMin(dayFor(S.me).e) - 30) {
        co.dataset.armed = "1";
        co.textContent = "Tap again to check out now (" + nowHM() + ")";
        return;
      }
      checkOut(e);
    };
  const ce = $("main").querySelector(".ci-edit");
  if (ce)
    ce.onclick = () => {
      const e = S.mine.entries.find((x) => x.id === ce.dataset.id);
      if (!e) return;
      openSheet(
        `<h3 id="sheettitle">Change my start time</h3><div class="who">${esc(e.job)} · ${esc(shortDay(e.date))}</div>
      <label for="cs-t">Start time<input id="cs-t" type="time" required value="${esc(e.start)}"></label>
      <div class="who">You'll still check out as normal. To change the whole day, tap it in the list below once you've checked out.</div>${formFoot(false, "Save")}`,
        async () => {
          const t = $("cs-t").value;
          if (!t) return;
          const data = Object.assign({}, e, { start: t, editedStart: true, updated: Date.now() });
          delete data.id;
          S.mine.entries = S.mine.entries.map((x) =>
            x.id === e.id ? Object.assign({ id: e.id }, data) : x,
          );
          closeForm();
          render();
          try {
            await submitJob({ coll: "entries", docId: e.id, data });
            toast("Start time changed to " + t);
          } catch (err) {
            toast("Couldn't save");
          }
        },
        "cs-t",
      );
    };
  const cf = $("main").querySelector(".ci-fix");
  if (cf)
    cf.onclick = () => {
      const e = S.mine.entries.find((x) => x.id === cf.dataset.id);
      if (e) openEntry("hours", Object.assign({}, e, { finish: e.finish || dayFor(S.me).e }));
    };
  $("main")
    .querySelectorAll(".ci-day")
    .forEach((b) => (b.onclick = () => openMyDay(S.me)));
  $("main")
    .querySelectorAll(".entry")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const e = S.mine.entries.find((x) => x.id === b.dataset.id);
          if (!e) return;
          if (e.approved) {
            toast("This entry has been approved. Ask James if it needs changing.");
            return;
          }
          openEntry(e.type, e);
        }),
    );
}
let entryWho = null;
function openEntry(type, e, forWho) {
  setEditing(e || null);
  setFormType(type);
  setKindVal(e && e.kind ? e.kind : "extra");
  entryWho = (e && e._src) || forWho || null;
  const srcEntries = forWho ? S.data.entries[forWho] || [] : S.mine.entries;
  const ED = dayFor(forWho || S.me);
  const defDate = e
    ? e.date
    : S.entryDatePreset
      ? (() => {
          const d = S.entryDatePreset;
          S.entryDatePreset = null;
          return d;
        })()
      : inWeek({ date: iso(new Date()) })
        ? iso(new Date())
        : iso(S.week);
  const px = !e && !forWho ? proxyFor : null;
  setProxyFor(null);
  S.entryProxy = px;
  openSheet(
    `<h3 id="sheettitle">${e ? "Edit" : "Add"} ${type === "hours" ? "timesheet day" : "day work / job time"}</h3>${px ? `<div class="notice" style="margin:0">For <b>${esc(px.name)}</b>, filled in by you.</div>` : ""}${forWho ? `<div class="who">For <b>${esc(nameOf(forWho))}</b>. They'll see the change straight away.</div>` : ""}
    <label for="f-date">Date<input id="f-date" type="date" required value="${esc(defDate)}"></label>
    ${pickField("f-job", "Site", siteNames(), e ? e.job : lastOf(srcEntries, () => true, "job"), "e.g. 12 Marine Way, Exmouth")}
    ${
      type === "hours"
        ? `<div class="grid3">
      <label for="f-start">Start<input id="f-start" type="time" required value="${esc(e ? e.start : ED.s)}"></label>
      <label for="f-finish">Finish<input id="f-finish" type="time" required value="${esc(e ? e.finish : ED.e)}"></label>
      <label for="f-break">Unpaid break<select id="f-break">${[0, 15, 20, 30, 45, 60, 90].map((m) => `<option value="${m}" ${(e && e.finish && !e.open ? +e.breakMin : lunchBreak(e ? e.start : ED.s, e && e.finish ? e.finish : ED.e, ED)) === m ? "selected" : ""}>${m} min</option>`).join("")}</select></label></div>
      <div class="who">${forWho ? esc(nameOf(forWho)) + "'s" : "Your"} usual day: ${esc(dayLine(ED))}. Change the times above for a different day.</div>
      ${e && e.open ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="f-open" ${e.finish ? "" : "checked"}> Still on site (keep the clock running)</label>` : ""}
      <div class="who">The 10am break is paid. The 1pm half hour is unpaid and is filled in for you.</div>
      <div class="calc" id="f-calc"></div>`
        : `<label for="f-task">What you did<input id="f-task" maxlength="140" required placeholder="e.g. Fitted kitchen units" value="${esc(e ? e.task : "")}"></label>
      <label for="f-hrs">Hours spent<input id="f-hrs" type="number" inputmode="decimal" min="0.25" max="24" step="0.25" required placeholder="e.g. 3.5" value="${e ? esc(e.hours) : ""}"></label>
      <div><div class="flabel">Is it chargeable?</div><div class="seg" id="f-seg">
      ${[
        ["extra", "🧱 Yes: day work / extra to be billed"],
        ["track", "No: just logging how long it took"],
      ]
        .map(
          ([v, t]) =>
            `<button type="button" data-v="${v}" aria-pressed="${kindVal === v}">${t}</button>`,
        )
        .join("")}</div></div>
      <label for="f-mats">Materials used (optional)<input id="f-mats" maxlength="200" placeholder="e.g. 2 lengths 22mm copper, 4 elbows" value="${esc((e && e.mats) || "")}"></label>
      <div><div class="flabel">Photos (optional)</div>${((e && e.photos) || []).length ? `<div class="phgrid ejph">${e.photos.map((id) => `<span class="ph"><img src="${blobUrl(id)}" alt="" loading="lazy"></span>`).join("")}</div>` : ""}
        <label class="btn fhpickbtn" style="margin-top:6px">📷 Add photos<input type="file" id="f-ph" accept="image/*" multiple data-cam="1"></label><span class="who" id="f-phn"></span>
        <div class="who">They're also saved to the site's photos.</div></div>`
    }
    <label for="f-notes">Notes (optional)<textarea id="f-notes" maxlength="300" placeholder="${type === "hours" ? "Anything James should know" : "Anything that slowed it down or changed"}">${esc(e ? e.notes : "")}</textarea></label>
    ${formFoot(!!e)}`,
    saveEntry,
    "f-job",
  );
  const upd = () => {
    const c = $("f-calc");
    if (c)
      c.textContent =
        "Total: " +
        hrs(calcHours($("f-start").value, $("f-finish").value, $("f-break").value)) +
        " hours";
  };
  if (type === "hours") {
    let touched = false;
    $("f-break").addEventListener("input", () => {
      touched = true;
    });
    ["f-start", "f-finish"].forEach((id) =>
      $(id).addEventListener("input", () => {
        if (!touched)
          $("f-break").value = String(lunchBreak($("f-start").value, $("f-finish").value, ED));
        upd();
      }),
    );
    $("f-break").addEventListener("input", upd);
    const fo = $("f-open");
    if (fo) {
      const so = () => {
        $("f-finish").disabled = fo.checked;
        $("f-finish").required = !fo.checked;
        $("f-calc").hidden = fo.checked;
      };
      fo.onchange = so;
      so();
    }
    upd();
  } else {
    const fp = $("f-ph");
    if (fp)
      fp.onchange = () => {
        const n = fp.files.length;
        $("f-phn").textContent = n ? ` ${n} photo${n === 1 ? "" : "s"} ready to save` : "";
      };
  }
  if (type !== "hours")
    $("f-seg")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            setKindVal(b.dataset.v);
            $("f-seg")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          }),
      );
  armDelete(() =>
    entryWho
      ? S.db.doc("sheets/" + entryWho + "/entries/" + editing.id).delete()
      : myDoc("entries", editing.id).delete(),
  );
}
async function saveEntry() {
  const data = {
    type: formType,
    date: $("f-date").value,
    job: pickVal("f-job"),
    notes: $("f-notes").value.trim(),
    updated: Date.now(),
    approved: false,
  };
  if (!data.date || !data.job) {
    showErr("Choose the date and the site.");
    return;
  }
  if (formType === "hours") {
    data.start = $("f-start").value;
    if ($("f-open") && $("f-open").checked) {
      Object.assign(data, { finish: "", breakMin: 0, hours: 0, open: true });
      if (!data.start) {
        showErr("Add the start time.");
        return;
      }
    } else {
      data.finish = $("f-finish").value;
      data.breakMin = +$("f-break").value;
      data.open = false;
      data.hours = Math.round(calcHours(data.start, data.finish, data.breakMin) * 100) / 100;
      if (!data.hours) {
        showErr("Finish time needs to be after start time.");
        return;
      }
    }
  } else {
    data.task = $("f-task").value.trim();
    data.hours = Math.round((+$("f-hrs").value || 0) * 100) / 100;
    data.kind = kindVal;
    if ($("f-mats")) data.mats = $("f-mats").value.trim();
    if (!data.task) {
      showErr("Say what you did.");
      return;
    }
    if (!data.hours) {
      showErr("Add how many hours you spent.");
      return;
    }
  }
  $("f-save").disabled = true;
  const phs = formType !== "hours" && $("f-ph") ? [...($("f-ph").files || [])] : [];
  if (phs.length) {
    if (!S.assets) {
      showErr(uploadErr({ code: "not_granted" }));
      $("f-save").disabled = false;
      return;
    }
    const ids = ((editing && editing.photos) || []).slice();
    const owner = entryWho || S.me;
    try {
      for (let i = 0; i < phs.length; i++) {
        $("f-save").textContent = `Photo ${i + 1} of ${phs.length}…`;
        const b = await shrinkImage(phs[i]);
        const a = await uploadFile(b, "daywork.jpg");
        ids.push(a.id);
        const now = Date.now() + i;
        await S.db
          .doc("sheets/" + owner + "/photos/" + newId())
          .set({
            assetId: a.id,
            site: data.job,
            category: data.kind === "extra" ? "Day work" : "Job time",
            caption: data.task,
            takenAt: now,
            date: data.date,
            trade: myTrade() || "",
            created: now,
            fromEntry: true,
          })
          .catch(() => {});
      }
      data.photos = ids;
    } catch (err) {
      showErr(uploadErr(err));
      $("f-save").disabled = false;
      $("f-save").textContent = "Save";
      return;
    }
  } else if (editing && editing.photos) data.photos = editing.photos;
  if (entryWho) {
    const base = Object.assign({}, editing || {});
    delete base.id;
    delete base.who;
    delete base._src;
    const out = Object.assign(base, { created: (editing && editing.created) || Date.now() }, data, {
      approved: true,
      editedBy: ownerDisplayName(),
      editedAt: Date.now(),
    });
    if (!out.open) {
      delete out.open;
    }
    try {
      await S.db
        .doc("sheets/" + entryWho + "/entries/" + (editing ? editing.id : newId()))
        .set(out);
      S.week = monday(parse(data.date));
      closeForm();
      toast("Saved for " + nameOf(entryWho));
      render();
    } catch (err) {
      showErr("Couldn't save. Check your connection.");
      $("f-save").disabled = false;
    }
    return;
  }
  try {
    const pxd = S.entryProxy
      ? { forId: S.entryProxy.id, forName: S.entryProxy.name, byForeman: myName() }
      : editing && editing.forName
        ? { forId: editing.forId || "", forName: editing.forName, byForeman: editing.byForeman }
        : {};
    const r = await submitJob({
      coll: "entries",
      docId: editing ? editing.id : newId(),
      data: Object.assign({ created: (editing && editing.created) || Date.now() }, data, pxd),
    });
    S.entryProxy = null;
    S.week = monday(parse(data.date));
    closeForm();
    sentToast(r, "Saved:");
    render();
  } catch (err) {
    showErr("Couldn't save. Ask James to check you're an Editor on this page.");
    $("f-save").disabled = false;
  }
}
