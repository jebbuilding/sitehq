/* ================= LONG-LEAD ITEMS: things that take weeks to come – when to order them so they're on site in time ================= */
import { addDays, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { pgCalc, pgRec } from "./programme.js";
import { siteLabel } from "../sites/job-details.js";
import { sdiSlug } from "../sites/site-diary.js";
export { LLD };
/* James (Nov 2026, "long-lead items"): on a job's 📊 Programme, 📦 Long-lead items lists what takes weeks to arrive –
   windows and doors, steels, the kitchen, roof lights, bi-folds, a staircase, anything – each with its lead time and the
   stage it's needed for. The order-by date works back from that stage's start on the programme (less the lead time and
   3 working days to spare) and moves when the programme moves. ✓ Ordered (with the date) clears it. Today lists any to
   order within a week, or already late. Owner-only: todos/ll-{site slug} (kind "longlead": { site, items: [{ id, what,
   weeks, stage, ordered }] }). */
const LLD = (() => {
  const PRE = [
    ["Windows and doors", 6],
    ["Steel beams", 2],
    ["Kitchen", 6],
    ["Roof lights", 3],
    ["Bi-fold / sliding doors", 8],
    ["Staircase (made to measure)", 8],
    ["Bathroom suite", 3],
    ["Worktops (templated)", 2],
  ];
  const recId = (site) => "ll-" + sdiSlug(site);
  const recOf = (site) =>
    (S.longLeads || []).find((x) => x.id === recId(site)) || { site, items: [] };
  async function save(site, items) {
    const rec = { kind: "longlead", site, items, updated: Date.now() };
    await S.db.doc("todos/" + recId(site)).set(rec);
    S.longLeads = (S.longLeads || [])
      .filter((x) => x.id !== recId(site))
      .concat([Object.assign({ id: recId(site) }, rec)]);
  }
  /* the order-by date for an item: the stage's start, less the weeks and 3 working days */
  function orderBy(site, it) {
    const pr = pgRec(site);
    if (!pr || pr.simple) return "";
    const st = (pr.stages || []).find((s) => s.id === it.stage);
    const d = st && pgCalc(pr)[st.id];
    if (!d) return "";
    const x = parse(d.from);
    x.setDate(x.getDate() - 7 * (+it.weeks || 0));
    let n = 3;
    while (n > 0) {
      x.setDate(x.getDate() - 1);
      if (x.getDay() !== 0 && x.getDay() !== 6) n--;
    }
    return iso(x);
  }
  function html(site) {
    const pr = pgRec(site);
    if (!pr || pr.simple) return "";
    const L = recOf(site).items;
    const today = iso(new Date());
    const stOpts = (sel) =>
      (pr.stages || [])
        .map(
          (s, i) =>
            `<option value="${esc(s.id)}"${s.id === sel ? " selected" : ""}>${i + 1}. ${esc((s.name || "").slice(0, 40))}</option>`,
        )
        .join("");
    return `<div class="card lld"><div class="cardbody"><b>📦 Long-lead items</b><div class="who">Things that take weeks to come. Say which stage needs them and the order-by date works itself out from the programme.</div>
      ${L.map((it) => {
        const ob = orderBy(site, it);
        const late = !it.ordered && ob && ob < today,
          soon = !it.ordered && ob && !late && ob <= iso(addDays(new Date(), 7));
        return `<div class="lld-row" data-id="${esc(it.id)}"><input class="lld-w" maxlength="60" value="${esc(it.what || "")}" aria-label="What"><label class="lld-n">Weeks<input class="lld-k" type="number" inputmode="numeric" min="0" max="52" value="${esc(it.weeks || 0)}"></label><label class="lld-s">Needed for<select class="lld-st">${stOpts(it.stage)}</select></label>
          <span class="lld-ob ${late ? "lld-late" : soon ? "lld-soon" : ""}">${it.ordered ? `✓ Ordered ${esc(shortDay(it.ordered))}` : ob ? (late ? "⚠️ Should have been ordered by " : "Order by ") + esc(shortDay(ob)) : ""}</span>
          <span class="lld-acts"><button type="button" class="pillbtn lld-ok" aria-pressed="${!!it.ordered}">${it.ordered ? "Not ordered" : "✓ Ordered"}</button><button type="button" class="linkdanger lld-x" aria-label="Take off ${esc(it.what || "")}">✕</button></span></div>`;
      }).join("")}
      <div class="lld-add">${PRE.filter(([w]) => !L.some((x) => x.what === w))
        .map(
          ([w, k]) =>
            `<button type="button" class="pillbtn lld-pre" data-w="${esc(w)}" data-k="${k}">+ ${esc(w)}</button>`,
        )
        .join(
          "",
        )}<button type="button" class="pillbtn lld-pre" data-w="" data-k="4">+ Something else</button></div></div></div>`;
  }
  function wire(site) {
    const box = document.querySelector(".lld");
    if (!box) return;
    const items = () => recOf(site).items.slice();
    const upd = async (fn) => {
      const L = items();
      fn(L);
      try {
        await save(site, L);
      } catch (e) {
        toast("Couldn't save");
      }
      /* the page only redraws when no box is being typed in */
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      render();
    };
    box.querySelectorAll(".lld-pre").forEach(
      (b) =>
        (b.onclick = () => {
          const pr = pgRec(site);
          /* needed for: the first stage that sounds like it, else the first not done */
          const w = b.dataset.w.toLowerCase();
          const key = /window|door|bi-fold/.test(w)
            ? /window|door/
            : /steel/.test(w)
              ? /steel|beam|structur/
              : /kitchen|worktop/.test(w)
                ? /kitchen|units|worktop/
                : /roof/.test(w)
                  ? /roof/
                  : /stair/.test(w)
                    ? /stair/
                    : /bath/.test(w)
                      ? /bath|second fix|2nd fix/
                      : null;
          const st =
            (pr.stages || []).find((s) => key && key.test((s.name || "").toLowerCase())) ||
            (pr.stages || []).find((s) => !s.done) ||
            (pr.stages || [])[0];
          upd((L) =>
            L.push({
              id: newId(),
              what: b.dataset.w || "",
              weeks: +b.dataset.k,
              stage: st ? st.id : "",
              ordered: "",
            }),
          );
        }),
    );
    box.querySelectorAll(".lld-row").forEach((r) => {
      const id = r.dataset.id;
      const set = (k, v) => upd((L) => L.forEach((x) => x.id === id && (x[k] = v)));
      r.querySelector(".lld-w").onchange = (e) => set("what", e.target.value.trim());
      r.querySelector(".lld-k").onchange = (e) => set("weeks", Math.max(0, +e.target.value || 0));
      r.querySelector(".lld-st").onchange = (e) => set("stage", e.target.value);
      r.querySelector(".lld-ok").onclick = () => {
        const x = items().find((y) => y.id === id);
        set("ordered", x && x.ordered ? "" : iso(new Date()));
      };
      r.querySelector(".lld-x").onclick = (e) => {
        const b = e.currentTarget;
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Sure?";
          return;
        }
        upd((L) =>
          L.splice(
            L.findIndex((x) => x.id === id),
            1,
          ),
        );
      };
    });
  }
  /* everything to order within a week, or late, on every site */
  function dueList() {
    const today = iso(new Date()),
      wk = iso(addDays(new Date(), 7));
    const out = [];
    (S.longLeads || []).forEach((r) =>
      (r.items || []).forEach((it) => {
        if (it.ordered || !it.what) return;
        const ob = orderBy(r.site, it);
        if (ob && ob <= wk) out.push({ site: r.site, it, ob, late: ob < today });
      }),
    );
    return out.sort((a, b) => a.ob.localeCompare(b.ob));
  }
  function todayCard() {
    if (!S.owner) return "";
    const L = dueList();
    if (!L.length) return "";
    return `<div class="card lld-today"><div class="cardbody"><b>📦 To order</b><div class="who">Long-lead items, so they're on site in time.</div>${L.map((x) => `<button type="button" class="incrow lld-go" data-s="${esc(x.site)}"><span><b>${esc(x.it.what)}</b><br><span class="who">${esc(siteLabel(x.site))}</span></span><span class="${x.late ? "lld-late" : "lld-soon"}">${x.late ? "⚠️ late – by " : "by "}${esc(shortDay(x.ob))}</span></button>`).join("")}</div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".lld-go").forEach(
      (b) =>
        (b.onclick = () => {
          S.otab = "projects";
          S.f.projList = false;
          S.f.proj = b.dataset.s;
          S.f.pjtab = "programme";
          render();
          window.scrollTo(0, 0);
        }),
    );
  }
  return { html, wire, dueList, todayCard, wireToday, orderBy };
})();
