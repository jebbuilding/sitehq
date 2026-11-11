/* ================= DIARY / SCHEDULER BOARD (people down the side, hours across) ================= */
import { pdClientDatesOn } from "../clients/portal-calendar.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { $, addDays, dayLabel, esc, iso, monday, parse, toMin, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { nameOf, ownerDisplayName, roleTag, teamIds } from "../owner/owner.js";
import { openPlanEditor } from "./board.js";
import { onDay } from "./time-off.js";
import { openPlanDetail } from "./views.js";
import { dueSoonItems } from "../safety/expiry-dates.js";
import { onSiteNow } from "../sites/roll-call.js";
import { WE } from "../timesheets/working-day.js";
export { diaryHtml, diaryRows, toHM, wireDiary };
const DY = { h0: 6, h1: 19, px: 84 };
const toHM = (m) =>
  String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(Math.round(m % 60)).padStart(2, "0");
function diaryRows(owner) {
  const ids = owner ? [S.me].concat(teamIds()) : [S.me];
  return ids.map((id) => ({
    id,
    name: id === S.me ? (owner ? ownerDisplayName() + " (you)" : "You") : nameOf(id),
  }));
}
function diaryHtml(shown, owner) {
  const dmode = S.f.pdmode || "day";
  const day = S.f.pdday || iso(new Date());
  const today = iso(new Date());
  const rows = diaryRows(owner);
  const nav = `<div class="dy-nav"><button type="button" class="iconbtn" id="dy-prev" aria-label="Previous">‹</button><b>${dmode === "day" ? esc(dayLabel(parse(day))) : "Week of " + esc(parse(iso(monday(parse(day)))).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}</b><button type="button" class="iconbtn" id="dy-next" aria-label="Next">›</button>
    ${day !== today ? `<button type="button" class="pillbtn" id="dy-today">Today</button>` : ""}<input type="date" id="dy-date" value="${day}" aria-label="Go to date">
    <div class="seg" id="dy-mode" ${owner ? "hidden" : ""}><button type="button" data-v="day" aria-pressed="${dmode === "day"}">Day</button><button type="button" data-v="week" aria-pressed="${dmode === "week"}">Week</button></div></div>`;
  const rem = diaryReminders(day, shown, owner);
  const remHtml = `<div class="dy-rem"><div class="dy-remh">Reminders &amp; to-dos <span class="who">${rem.length}</span>${owner ? `<button type="button" class="pillbtn" id="dy-addtodo">+ To-do</button>` : ""}</div>
    <div class="dy-chips">${rem.map((r, i) => `<button type="button" class="dy-rchip k-${r.k}" data-i="${i}"><span class="dy-rk">${esc(r.label)}</span>${esc(r.title)}${r.sub ? ` <span class="who">${esc(r.sub)}</span>` : ""}</button>`).join("") || '<span class="who">Nothing for this day.</span>'}</div></div>`;
  if (dmode === "week") {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday(parse(day)), i));
    return (
      nav +
      remHtml +
      `<div class="dy-wrap"><div class="dy-wgrid" style="grid-template-columns:150px repeat(7,minmax(110px,1fr))">
      <div class="dy-corner">People</div>${days.map((d) => `<div class="dy-wh ${iso(d) === today ? "today" : ""}">${esc(d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }))}</div>`).join("")}
      ${rows
        .map(
          (r) =>
            `<div class="dy-name">${esc(r.name)}${r.id !== S.me && owner ? roleTag(r.id) : ""}</div>${days
              .map((d) => {
                const di = iso(d);
                const list = shown
                  .filter(
                    (p) =>
                      onDay(p, di) &&
                      ((p.people || []).includes(r.id) ||
                        (r.id === S.me && owner && p.vis === "me" && !(p.people || []).length)),
                  )
                  .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
                const off = list.some((p) => p.type === "holiday");
                return `<div class="dy-wcell ${off ? "off" : ""} ${di === today ? "today" : ""}" data-d="${di}" data-w="${esc(r.id)}">${list.map((p) => `<button type="button" class="dy-wchip t-${esc(p.type)}" data-p="${esc(p.id)}">${p.time ? `<b>${esc(p.time)}</b> ` : ""}${esc(p.title)}</button>`).join("")}</div>`;
              })
              .join("")}`,
        )
        .join("")}
      ${(() => {
        const un = days.map((d) =>
          shown.filter(
            (p) =>
              onDay(p, iso(d)) &&
              !(p.people || []).length &&
              p.type !== "holiday" &&
              !(owner && p.vis === "me"),
          ),
        );
        return un.some((x) => x.length)
          ? `<div class="dy-name"><b>Not assigned</b></div>${un.map((l, i) => `<div class="dy-wcell" data-d="${iso(days[i])}" data-w="">${l.map((p) => `<button type="button" class="dy-wchip t-${esc(p.type)}" data-p="${esc(p.id)}">${p.time ? `<b>${esc(p.time)}</b> ` : ""}${esc(p.title)}</button>`).join("")}</div>`).join("")}`
          : "";
      })()}
    </div></div>`
    );
  }
  const W = (DY.h1 - DY.h0) * DY.px;
  const hours = Array.from({ length: DY.h1 - DY.h0 }, (_, i) => DY.h0 + i);
  const dayItems = shown.filter((p) => onDay(p, day));
  const mine = (p) =>
    (p.people || []).includes(S.me) || (owner && p.vis === "me" && !(p.people || []).length);
  const unassigned = dayItems.filter(
    (p) => !(p.people || []).length && p.type !== "holiday" && !(owner && p.vis === "me"),
  );
  const allRows = rows.concat(unassigned.length ? [{ id: "", name: "Not assigned" }] : []);
  const nowM = day === today ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  const block = (p, rowId) => {
    const s = p.time ? toMin(p.time) : null;
    if (s == null) return "";
    const e = p.endTime ? toMin(p.endTime) : s + 60;
    const l = ((s - DY.h0 * 60) / 60) * DY.px,
      w = Math.max(28, ((Math.max(e, s + 15) - s) / 60) * DY.px);
    const canDrag = owner && !p.auto && !p.pending;
    return `<div class="dy-blk t-${esc(p.type)} ${canDrag ? "drag" : ""}" data-p="${esc(p.id)}" data-w="${esc(rowId)}" style="left:${l}px;width:${w}px" title="${esc(p.title)}"><b>${esc(p.title)}</b><span>${esc(p.time)}${p.endTime ? "–" + esc(p.endTime) : ""}${p.site ? " · " + esc(p.site) : ""}</span>${canDrag ? '<i class="dy-rs" aria-hidden="true"></i>' : ""}</div>`;
  };
  const onsite = owner ? onSiteNow() : [];
  return (
    nav +
    remHtml +
    `<div class="dy-wrap"><div class="dy-board" style="--w:${W}px;--px:${DY.px}px">
    <div class="dy-head"><div class="dy-corner">People</div><div class="dy-hours">${hours.map((h) => `<span style="left:${(h - DY.h0) * DY.px}px">${String(h).padStart(2, "0")}:00</span>`).join("")}</div></div>
    ${allRows
      .map((r) => {
        const items =
          r.id === ""
            ? unassigned
            : r.id === S.me
              ? dayItems.filter(mine)
              : dayItems.filter((p) => (p.people || []).includes(r.id));
        const allday = items.filter((p) => !p.time);
        const off = items.find((p) => p.type === "holiday");
        const os = onsite.find((e) => e.who === r.id);
        return `<div class="dy-row"><div class="dy-name">${esc(r.name)}${os ? `<span class="tag ok">On site</span>` : ""}${r.id && r.id !== S.me && owner ? `<span class="who">${esc((S.team[r.id] && S.team[r.id].details && S.team[r.id].details.trade) || "")}</span>` : ""}</div>
        <div class="dy-lane ${off ? "off" : ""}" data-w="${esc(r.id)}">${hours.map((h) => `<i class="dy-hl" style="left:${(h - DY.h0) * DY.px}px"></i>`).join("")}
          ${os ? `<div class="dy-onsite" style="left:${Math.max(0, ((toMin(os.actualIn || os.start) - DY.h0 * 60) / 60) * DY.px)}px;width:${Math.max(4, (((nowM || toMin(WE())) - toMin(os.actualIn || os.start)) / 60) * DY.px)}px" title="Checked in ${esc(os.actualIn || os.start)} at ${esc(os.job)}"></div>` : ""}
          ${allday.length ? `<div class="dy-allday">${allday.map((p) => `<button type="button" class="dy-adchip t-${esc(p.type)}" data-p="${esc(p.id)}">${esc(p.title)}</button>`).join("")}</div>` : ""}
          ${items.map((p) => block(p, r.id)).join("")}</div></div>`;
      })
      .join("")}
    ${nowM != null && nowM >= DY.h0 * 60 && nowM <= DY.h1 * 60 ? `<div class="dy-now" style="left:calc(150px + ${((nowM - DY.h0 * 60) / 60) * DY.px}px)"></div>` : ""}
  </div></div>
  <div class="who">${owner ? "Tap an empty space to book someone in. Drag a booking to move it to another time or person, or drag its right edge to change how long it is." : "Your day. Tap a booking to see the details."}${owner ? " Green bar: checked in on site." : ""}</div>`
  );
}
function diaryReminders(day, shown, owner) {
  const out = [];
  const today = iso(new Date());
  if (owner) {
    (S.todos || [])
      .filter((t) => !t.done && (t.due ? t.due <= day : day === today))
      .forEach((t) =>
        out.push({
          k: "todo",
          label: t.due && t.due < day ? "Overdue" : "To-do",
          title: t.text,
          sub: t.site || "",
          todo: t,
        }),
      );
    []
      .filter((c) => c.follow && c.follow <= day && !["done", "lost"].includes(c.stage))
      .forEach((c) =>
        out.push({ k: "client", label: "Follow up", title: c.name, sub: c.phone || "", client: c }),
      );
    dueSoonItems("all")
      .filter((x) => x.date === day && !/^Follow up client/.test(x.what))
      .forEach((x) => out.push({ k: "due", label: "Due", title: x.what }));
  }
  if (owner) pdClientDatesOn(day).forEach((x) => out.push(x));
  shown
    .filter((p) => onDay(p, day) && p.type === "keydate")
    .forEach((p) =>
      out.push({ k: "key", label: "Key date", title: p.title, sub: p.site || "", plan: p }),
    );
  shown
    .filter((p) => onDay(p, day) && p.auto === "job")
    .forEach((p) =>
      out.push({
        k: "job",
        label: "Job due",
        title: p.title.replace(/^Due: /, ""),
        sub: p.site || "",
        plan: p,
      }),
    );
  return out;
}
function wireDiary(shown, owner) {
  const day = S.f.pdday || iso(new Date()),
    dmode = S.f.pdmode || "day";
  const go = (d) => {
    S.f.pdday = d;
    render();
  };
  $("dy-prev").onclick = () => go(iso(addDays(parse(day), dmode === "day" ? -1 : -7)));
  $("dy-next").onclick = () => go(iso(addDays(parse(day), dmode === "day" ? 1 : 7)));
  if ($("dy-today")) $("dy-today").onclick = () => go(iso(new Date()));
  $("dy-date").onchange = (e) => {
    if (e.target.value) go(e.target.value);
  };
  $("dy-mode")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.pdmode = b.dataset.v;
          render();
        }),
    );
  const rem = diaryReminders(day, shown, owner);
  $("main")
    .querySelectorAll(".dy-rchip")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const r = rem[+b.dataset.i];
          if (!r) return;
          if (r.client) viewClient(r.client);
          else if (r.plan) openPlanDetail(r.plan);
          else if (r.todo) {
            S.otab = "todo";
            render();
          } else {
            S.otab = "time";
            render();
          }
        }),
    );
  if ($("dy-addtodo"))
    $("dy-addtodo").onclick = () => {
      S.otab = "todo";
      render();
      setTimeout(() => {
        const d = $("td-due");
        if (d) d.value = day;
        const t = $("td-text");
        if (t) t.focus();
      }, 50);
    };
  const open = (id) => {
    const p = shown.find((x) => x.id === id);
    if (p) openPlanDetail(p);
  };
  $("main")
    .querySelectorAll(".dy-wchip,.dy-adchip")
    .forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          open(b.dataset.p);
        }),
    );
  if (owner)
    $("main")
      .querySelectorAll(".dy-wcell")
      .forEach(
        (c) =>
          (c.onclick = (e) => {
            if (e.target.closest(".dy-wchip")) return;
            openPlanEditor(null, c.dataset.d, {
              title: "",
              type: c.dataset.w === S.me ? "meeting" : "work",
              people: c.dataset.w && c.dataset.w !== S.me ? [c.dataset.w] : [],
              vis: c.dataset.w === S.me ? "me" : "all",
            });
          }),
      );
  // day board
  const lanes = [...$("main").querySelectorAll(".dy-lane")];
  if (owner)
    lanes.forEach((l) =>
      l.addEventListener("click", (e) => {
        if (e.target.closest(".dy-blk,.dy-adchip")) return;
        const r = l.getBoundingClientRect();
        let m = DY.h0 * 60 + Math.floor((((e.clientX - r.left) / DY.px) * 60) / 30) * 30;
        m = Math.max(DY.h0 * 60, Math.min(DY.h1 * 60 - 30, m));
        const me = l.dataset.w === S.me;
        openPlanEditor(null, day, {
          title: "",
          type: me ? "meeting" : "work",
          people: l.dataset.w && !me ? [l.dataset.w] : [],
          time: toHM(m),
          endTime: toHM(m + 60),
          vis: me ? "me" : "all",
        });
      }),
    );
  $("main")
    .querySelectorAll(".dy-blk")
    .forEach((bk) => {
      let st = null;
      bk.addEventListener("pointerdown", (e) => {
        if (!bk.classList.contains("drag")) {
          return;
        }
        st = {
          x: e.clientX,
          y: e.clientY,
          l: bk.offsetLeft,
          w: bk.offsetWidth,
          rs: !!e.target.closest(".dy-rs"),
          moved: false,
          id: e.pointerId,
        };
        bk.setPointerCapture(e.pointerId);
      });
      bk.addEventListener("pointermove", (e) => {
        if (!st) return;
        const dx = e.clientX - st.x,
          dy = e.clientY - st.y;
        if (!st.moved && Math.hypot(dx, dy) < 6) return;
        st.moved = true;
        e.preventDefault();
        bk.classList.add("dragging");
        if (st.rs) {
          bk.style.width = Math.max(DY.px / 4, st.w + dx) + "px";
        } else {
          bk.style.left = Math.max(0, st.l + dx) + "px";
          bk.style.transform = `translateY(${dy}px)`;
        }
      });
      bk.addEventListener("pointerup", async (e) => {
        if (!st) return;
        const s0 = st;
        st = null;
        bk.classList.remove("dragging");
        if (!s0.moved) {
          open(bk.dataset.p);
          return;
        }
        const p = shown.find((x) => x.id === bk.dataset.p);
        if (!p) return;
        const q15 = (v) => Math.round(v / (DY.px / 4)) * (DY.px / 4);
        let data = {};
        if (s0.rs) {
          const end = toMin(p.time) + (q15(bk.offsetWidth) / DY.px) * 60;
          data.endTime = toHM(Math.min(23 * 60 + 45, Math.max(toMin(p.time) + 15, end)));
        } else {
          const ns = DY.h0 * 60 + (q15(bk.offsetLeft) / DY.px) * 60;
          const dur = (p.endTime ? toMin(p.endTime) : toMin(p.time) + 60) - toMin(p.time);
          data.time = toHM(ns);
          if (p.endTime) data.endTime = toHM(ns + dur);
          const lane = lanes.find((l) => {
            const r = l.getBoundingClientRect();
            return e.clientY >= r.top && e.clientY <= r.bottom;
          });
          const from = bk.dataset.w;
          if (lane && lane.dataset.w !== from && lane.dataset.w !== S.me) {
            const ppl = (p.people || []).filter((x) => x !== from);
            if (lane.dataset.w && !ppl.includes(lane.dataset.w)) ppl.push(lane.dataset.w);
            data.people = ppl;
          }
        }
        data.updated = Date.now();
        try {
          await S.db.doc((p.vis === "me" ? "planprivate" : "plan") + "/" + p.id).update(data);
          toast(
            data.people
              ? "Moved to " +
                  (data.people.length ? data.people.map(nameOf).join(", ") : "not assigned") +
                  (data.time ? " at " + data.time : "")
              : data.time
                ? "Moved to " + data.time
                : "Now ends " + data.endTime,
          );
          render();
        } catch (err) {
          toast("Couldn't move it");
          render();
        }
      });
      bk.addEventListener("pointercancel", () => {
        st = null;
        render();
      });
    });
  const wrap = $("main").querySelector(".dy-wrap");
  if (wrap && dmode === "day") {
    if (S.dyDay === day && S.dyX != null) wrap.scrollLeft = S.dyX;
    else {
      const nowH = new Date().getHours();
      wrap.scrollLeft = Math.max(0, (Math.min(Math.max(nowH, 8), DY.h1) - DY.h0 - 1) * DY.px);
      S.dyDay = day;
    }
    wrap.addEventListener(
      "scroll",
      () => {
        S.dyX = wrap.scrollLeft;
      },
      { passive: true },
    );
  }
}
