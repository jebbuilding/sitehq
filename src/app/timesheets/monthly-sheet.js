/* ================= PAPER-STYLE MONTHLY TIMESHEET (trades) ================= */
import { openDM } from "../chat/chat.js";
import { bossFirst } from "../core/company-names.js";
import { $, esc, hrs, iso, parse, toast } from "../core/helpers.js";
import { closeForm, openSheet } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { personPhotoClear, personPhotoDlg, personPhotoSet } from "../files/cut-outs.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { allIds, nameOf } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { avatarHtml, personPhoto } from "../people/profile-photos.js";
import { loadImage } from "../photos/photos.js";
import { LEAVE_TYPES, leaveOf } from "../planner/time-off.js";
import { empTypeOf } from "../sites/job-details.js";
import { signOnly } from "../sites/sign-in-book.js";
import { myName } from "../survey/door-window-survey.js";
import { entrySub, openEntry, sumH, typeTag } from "./time.js";
export { openPersonMonth, personEntries, tsPaper, wireTsPaper };
function tsLeave(di, who) {
  const out = [];
  const me = who || S.me;
  leaveOf(who && who !== S.me ? S.data.signoffs[who] || [] : S.mine.signoffs)
    .filter(
      (l) =>
        l.status !== "declined" &&
        l.status !== "cancelled" &&
        l.from <= di &&
        (l.to || l.from) >= di,
    )
    .forEach((l) =>
      out.push({
        pending: l.status === "pending",
        kind: LEAVE_TYPES[l.leaveType] || "Time off",
        half: l.half,
        why: l.note || "",
      }),
    );
  if (!out.length)
    (S.plan || [])
      .filter(
        (p) =>
          p.type === "holiday" &&
          Array.isArray(p.people) &&
          p.people.includes(me) &&
          p.from <= di &&
          (p.to || p.from) >= di,
      )
      .forEach((p) => out.push({ pending: false, why: p.notes || "" }));
  return out[0] || null;
}
function tsPaper(ym, ents, who) {
  const [Y, M] = ym.split("-").map(Number);
  const first = new Date(Y, M - 1, 1),
    days = new Date(Y, M, 0).getDate();
  const today = iso(new Date());
  const name = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  let totH = 0,
    totJ = 0,
    offDays = 0;
  const lead = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  let grid = "";
  for (let w = 0; w < cells.length / 7; w++) {
    let wk = 0;
    let row = "";
    for (let c = 0; c < 7; c++) {
      const d = cells[w * 7 + c];
      if (!d) {
        row += `<div class="tsc blank"></div>`;
        continue;
      }
      const dt = new Date(Y, M - 1, d),
        di = iso(dt),
        we = c >= 5;
      const list = ents.filter((e) => e.date === di);
      const off = tsLeave(di, who);
      const h = sumH(list, (e) => e.type === "hours"),
        j = sumH(list, (e) => e.type === "job");
      totH += h;
      totJ += j;
      wk += h;
      if (off && !list.length && !we && !off.pending) offDays += off.half ? 0.5 : 1;
      const site = (list.find((e) => e.type === "hours") || list[0] || {}).job || "";
      const appr = list.length && list.every((e) => e.approved);
      const extra = list.some((e) => e.type === "job" && e.kind === "extra");
      row += `<button type="button" class="tsc ${we ? "we" : ""} ${di === today ? "tday" : ""} ${off ? (off.pending ? "offp" : "off") : ""} ${list.length ? "has" : ""}" data-d="${di}" aria-label="${esc(dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}">
        <span class="tscd">${d}${appr ? ' <span class="tsok">✓</span>' : ""}</span>
        ${
          off && !list.length
            ? `<span class="tsco">🌴<small>${esc(off.pending ? "Asked" : off.half ? "½ " + (off.kind || "Off") : off.kind || "Off")}</small></span>`
            : list.length
              ? `<span class="tsch">${hrs(h || j)}<small>h</small></span><span class="tscs">${esc(site)}</span>${extra ? '<span class="tscx">+extra</span>' : ""}`
              : ""
        }</button>`;
    }
    grid += row + `<div class="tsc tswkc"><small>Week</small><b>${hrs(wk)}</b></div>`;
  }
  return `<div class="tspaper"><div class="tshead"><button type="button" class="iconbtn ts-prev" aria-label="Previous month">‹</button><div><b>Timesheet</b><span>${esc(name)} · ${esc(who ? nameOf(who) : myName())}</span></div><button type="button" class="iconbtn ts-next" aria-label="Next month">›</button></div>
    ${ym !== today.slice(0, 7) ? `<div style="text-align:center;margin:-4px 0 6px"><button type="button" class="pillbtn ts-now">Back to this month</button></div>` : ""}
    <div class="tsgrid">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Wk"].map((x) => `<div class="tsdow">${x}</div>`).join("")}${grid}</div>
    <div class="tstots"><div><span>Timesheet hours</span><b>${hrs(totH)}</b></div><div><span>Job log hours</span><b>${hrs(totJ)}</b></div><div><span>Days off booked</span><b>${offDays}</b></div></div>
    <div class="who" style="margin-top:6px">Tap a day to ${who ? "see, change or approve" : "add or see"} it. ✓ = approved${who ? "" : ` by ${bossFirst()}`}. 🌴 = time off from the Planner.</div></div>`;
}
function wireTsPaper(root, who, again) {
  root = root || $("main");
  again = again || render;
  const key = who ? "tsmo" : "tsm";
  const mv = (n) => {
    const [y, m] = S.f[key].split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    S.f[key] = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    again();
  };
  const q = (c) => root.querySelector(c);
  if (q(".ts-prev")) q(".ts-prev").onclick = () => mv(-1);
  if (q(".ts-next")) q(".ts-next").onclick = () => mv(1);
  if (q(".ts-now"))
    q(".ts-now").onclick = () => {
      S.f[key] = iso(new Date()).slice(0, 7);
      again();
    };
  root
    .querySelectorAll(".tsc[data-d]")
    .forEach(
      (b) => (b.onclick = () => (who ? tsDayOwner(b.dataset.d, who, again) : tsDay(b.dataset.d))),
    );
}
/* all of one person's entries (incl. ones a foreman filled in for them) */
function personEntries(id) {
  const own = ((id === S.me ? S.mine.entries : S.data.entries[id]) || []).filter((e) => !e.forName);
  const px = [];
  allIds().forEach((src) => {
    if (src === id) return;
    (S.data.entries[src] || []).forEach((e) => {
      if (e.forName && e.forId === id) px.push(Object.assign({}, e, { _src: src }));
    });
  });
  return own.concat(px);
}
/* owner: a person's full details + month of squares */
function openPersonMonth(id) {
  if (!S.f.tsmo) S.f.tsmo = iso(new Date()).slice(0, 7);
  const d = (S.team[id] && S.team[id].details) || {};
  const tel = String(d.mobile || "").replace(/\s+/g, "");
  const again = () => {
    if (!$("viewer").hidden && $("viewer-body").querySelector(".pmhead")) openPersonMonth(id);
  };
  const ym = S.f.tsmo;
  const ents = personEntries(id).filter((e) => (e.date || "").slice(0, 7) === ym);
  const row = (l, v) =>
    v ? `<div class="drow"><span>${esc(l)}</span><span>${v}</span></div>` : "";
  openViewer(`<div class="pmhead">${ownerMode() && !String(id).startsWith("off:") ? `<button type="button" class="pmav pm-avbtn" title="Change photo" aria-label="Change or remove photo">${avatarHtml(id, 64)}<span class="pmavcam" aria-hidden="true">📷</span></button>` : avatarHtml(id, 64)}<div><h3 style="margin:0">${esc(nameOf(id))}</h3>${ownerMode() && (S.team[id] || {}).photo ? `<button type="button" class="pillbtn pm-avrm" style="margin:4px 0">Remove photo</button>` : ""}<div class="who">${esc([EMP_TYPES[empTypeOf(id)] || "", d.trade || ""].filter(Boolean).join(" · "))}</div>
      <div class="actions" style="margin-top:6px">${tel ? `<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a>` : ""}<button type="button" class="btn" id="pm-msg">💬 Message</button>${ownerMode() && !String(id).startsWith("off:") ? `<label class="btn fhpickbtn" style="cursor:pointer;position:relative;overflow:hidden">📷 ${personPhoto(id) ? "Change photo" : "Add photo"}<input type="file" id="pm-photo" accept="image/*"></label>${personPhoto(id) ? `<button type="button" class="linkdanger" id="pm-photox">Remove photo</button>` : ""}` : ""}</div></div></div>
    <details class="pmdet"><summary>All their details</summary><div class="details">${row("Mobile", esc(d.mobile || ""))}${row("Email", esc(d.email || ""))}${row("Address", esc([d.address, d.postcode].filter(Boolean).join(", ")))}${row("Trade", esc(d.trade || ""))}${row("Type", esc(EMP_TYPES[d.empType] || ""))}${row("Company", esc(d.company || ""))}${row("Driving licence", esc(d.driving || ""))}${row("CSCS", esc(d.cscs || ""))}${row("Next of kin", esc([d.nokName, d.nokRel ? "(" + d.nokRel + ")" : "", d.nokPhone].filter(Boolean).join(" ")))}${row("Medical", esc(d.medical || ""))}</div></details>
    ${ownerMode() && !String(id).startsWith("off:") && id !== S.me ? `<div class="notice" style="margin:8px 0;display:flex;flex-direction:column;gap:4px"><label class="inl" style="font-size:15px;color:var(--ink);font-weight:600"><input type="checkbox" id="pm-signonly" ${signOnly(id) ? "checked" : ""} style="width:22px;height:22px"> Sign in only – no timesheets or day work</label><span class="who">For people from another company or an agency. They just sign in and out of site on their Sign in tab; the Timesheets and Day work tabs are hidden for them.${/company|agency/.test(empTypeOf(id)) && !signOnly(id) ? " <b>They're down as " + esc(EMP_TYPES[empTypeOf(id)]) + ".</b>" : ""}</span></div>` : ""}
    ${tsPaper(ym, ents, id)}`);
  const vb = $("viewer-body");
  wireTsPaper(vb, id, again);
  const so = $("pm-signonly");
  if (so)
    so.onchange = async () => {
      so.disabled = true;
      try {
        const cur = Object.assign({}, S.team[id] || {});
        delete cur.id;
        await S.db
          .doc("sheets/" + id)
          .set(Object.assign(cur, { signInOnly: so.checked, updated: Date.now() }));
        S.team[id] = Object.assign({}, S.team[id] || {}, { signInOnly: so.checked });
        toast(
          so.checked
            ? nameOf(id) + " now just signs in – no timesheets or day work"
            : nameOf(id) + " is back on timesheets and day work",
        );
        render();
      } catch (e) {
        toast("Couldn't save");
        so.checked = !so.checked;
      }
      so.disabled = false;
    };
  const m = $("pm-msg");
  if (m) m.onclick = () => openDM(id);
  const avb = document.querySelector(".pm-avbtn");
  if (avb)
    avb.onclick = () =>
      personPhotoDlg(id, () => {
        openPersonMonth(id);
        render();
      });
  const avr = document.querySelector(".pm-avrm");
  if (avr)
    avr.onclick = async () => {
      if (avr.dataset.armed !== "1") {
        avr.dataset.armed = "1";
        avr.textContent = "Remove it?";
        return;
      }
      avr.disabled = true;
      if (await personPhotoClear(id)) {
        openPersonMonth(id);
        render();
      } else avr.disabled = false;
    };
  const avp = document.querySelector(".pm-avpick");
  if (avp)
    avp.onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (await personPhotoSet(id, f)) {
        openPersonMonth(id);
        render();
      }
    };
  const pin = $("pm-photo");
  if (pin)
    pin.onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!f) return;
      if (!S.assets) {
        toast(uploadErr({ code: "not_granted" }));
        return;
      }
      let b = null;
      try {
        const im = await loadImage(f);
        const sz = Math.min(im.naturalWidth, im.naturalHeight);
        const cv = document.createElement("canvas");
        cv.width = cv.height = Math.min(600, sz);
        cv.getContext("2d").drawImage(
          im,
          (im.naturalWidth - sz) / 2,
          (im.naturalHeight - sz) / 2,
          sz,
          sz,
          0,
          0,
          cv.width,
          cv.height,
        );
        b = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.88));
      } catch (x) {}
      if (!b) {
        toast("That photo couldn't be opened. On iPhone set Camera › Formats to Most Compatible.");
        return;
      }
      toast("Saving the photo…");
      try {
        const a = await uploadFile(b, "person.jpg");
        {
          const cur = Object.assign({}, S.team[id] || {});
          delete cur.id;
          await S.db
            .doc("sheets/" + id)
            .set(Object.assign(cur, { photo: a.id, updated: Date.now() }));
        }
        S.team[id] = Object.assign({}, S.team[id] || {}, { photo: a.id });
        if (id === S.me) S.myProfile = Object.assign({}, S.myProfile || {}, { photo: a.id });
        toast("Photo saved");
        openPersonMonth(id);
        render();
      } catch (x) {
        toast(uploadErr(x));
      }
    };
  const px = $("pm-photox");
  if (px)
    px.onclick = async () => {
      if (px.dataset.armed !== "1") {
        px.dataset.armed = "1";
        px.textContent = "Tap again to remove";
        return;
      }
      try {
        {
          const cur = Object.assign({}, S.team[id] || {});
          delete cur.id;
          await S.db
            .doc("sheets/" + id)
            .set(Object.assign(cur, { photo: "", updated: Date.now() }));
        }
        S.team[id] = Object.assign({}, S.team[id] || {}, { photo: "" });
        toast("Photo removed");
        openPersonMonth(id);
        render();
      } catch (e) {
        toast("Couldn't save. Check your connection.");
      }
    };
}
function tsDayOwner(di, who, again) {
  const list = personEntries(who)
    .filter((e) => e.date === di)
    .sort(
      (a, b) =>
        (a.type === b.type ? 0 : a.type === "hours" ? -1 : 1) ||
        (a.start || "").localeCompare(b.start || ""),
    );
  const off = tsLeave(di, who);
  openSheet(
    `<h3 id="sheettitle">${esc(nameOf(who))} · ${esc(parse(di).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}</h3>
    ${off ? `<div class="notice" style="margin:0;background:#e9f6ec">🌴 <b>${esc(off.kind || "Time off")}${off.half ? " (half day)" : ""}</b>${off.pending ? " · requested, waiting for you to approve in the Planner" : ""}${off.why ? " · " + esc(off.why) : ""}</div>` : ""}
    ${
      list
        .map(
          (
            e,
          ) => `<div class="entry"><div class="main"><div class="job">${typeTag(e)}${e.approved ? '<span class="tag ok">Approved</span>' : ""}${esc(e.job || "No site given")}</div><div class="sub">${entrySub(e)}${e.notes ? " · " + esc(e.notes) : ""}</div>
      <div class="actions" style="margin-top:6px"><label class="inl" style="font-size:15px;color:var(--ink);font-weight:600"><input type="checkbox" class="tdo-appr" data-e="${esc(e.id)}" data-src="${esc(e._src || "")}" ${e.approved ? "checked" : ""} style="width:22px;height:22px"> Approved</label><button type="button" class="pillbtn tdo-edit" data-e="${esc(e.id)}">Edit</button></div></div><div class="amt">${hrs(e.hours)} h</div></div>`,
        )
        .join("") || '<div class="nothing">Nothing logged this day.</div>'
    }
    <div class="formactions"><span><button type="button" class="pillbtn" id="tdo-add">+ Timesheet day</button> <button type="button" class="pillbtn" id="tdo-addj">🧱 + Day work</button></span><button type="button" class="btn" id="f-cancel">Close</button></div>`,
    () => {},
    null,
  );
  document.querySelectorAll(".tdo-appr").forEach(
    (cb) =>
      (cb.onchange = async () => {
        cb.disabled = true;
        try {
          await S.db
            .doc("sheets/" + (cb.dataset.src || who) + "/entries/" + cb.dataset.e)
            .update({ approved: cb.checked });
          toast(cb.checked ? "Approved" : "Approval removed");
          setTimeout(again, 300);
        } catch (e) {
          toast("Couldn't save");
          cb.checked = !cb.checked;
        }
        cb.disabled = false;
      }),
  );
  document.querySelectorAll(".tdo-edit").forEach(
    (b) =>
      (b.onclick = () => {
        const e = list.find((x) => x.id === b.dataset.e);
        if (!e) return;
        closeForm();
        openEntry(e.type, e, who === S.me ? null : who);
      }),
  );
  $("tdo-add").onclick = () => {
    closeForm();
    S.entryDatePreset = di;
    openEntry("hours", null, who === S.me ? null : who);
  };
  $("tdo-addj").onclick = () => {
    closeForm();
    S.entryDatePreset = di;
    openEntry("job", null, who === S.me ? null : who);
  };
}
function tsDay(di) {
  const list = S.mine.entries
    .filter((e) => e.date === di && !e.forName)
    .sort(
      (a, b) =>
        (a.type === b.type ? 0 : a.type === "hours" ? -1 : 1) ||
        (a.start || "").localeCompare(b.start || ""),
    );
  const off = tsLeave(di);
  if (!list.length && !off) {
    S.entryDatePreset = di;
    openEntry("hours");
    return;
  }
  openSheet(
    `<h3 id="sheettitle">${esc(parse(di).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}</h3>
    ${off ? `<div class="notice" style="margin:0;background:#e9f6ec">🌴 <b>${esc(off.kind || "Time off")}${off.half ? " (half day)" : ""}</b>${off.pending ? ` · requested, waiting for ${bossFirst()}` : ""}${off.why ? " · " + esc(off.why) : ""}</div>` : ""}
    ${list.map((e) => `<button type="button" class="entry tsdayrow" data-id="${esc(e.id)}"><div class="main"><div class="job">${typeTag(e)}${e.approved ? '<span class="tag ok">Approved</span>' : ""}${esc(e.job || "No site given")}</div><div class="sub">${entrySub(e)}</div></div><div class="amt">${hrs(e.hours)} h</div></button>`).join("") || '<div class="nothing">Nothing logged this day.</div>'}
    <div class="actions"><button type="button" class="btn primary" id="tsd-h">+ Timesheet</button><button type="button" class="btn" id="tsd-j">🧱 + Day work / job time</button></div>
    <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Close</button></div>`,
    () => {},
    null,
  );
  $("tsd-h").onclick = () => {
    closeForm();
    S.entryDatePreset = di;
    openEntry("hours");
  };
  $("tsd-j").onclick = () => {
    closeForm();
    S.entryDatePreset = di;
    openEntry("job");
  };
  document.querySelectorAll(".tsdayrow").forEach(
    (b) =>
      (b.onclick = () => {
        const e = S.mine.entries.find((x) => x.id === b.dataset.id);
        if (!e) return;
        if (e.approved) {
          toast(`This entry has been approved. Ask ${bossFirst()} if it needs changing.`);
          return;
        }
        closeForm();
        openEntry(e.type, e);
      }),
  );
}
