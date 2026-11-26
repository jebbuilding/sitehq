/* ================= SKILLS & CATCH-UPS: who can do what in the team, and a regular catch-up with each of them ================= */
import { $, esc, iso, parse, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { planEntries } from "../planner/time-off.js";
export { SKL };
/* James (Nov 2026, "do them all" – idea 6): Setup › 🧑‍🔧 Skills & catch-ups. 🧰 Skills: a grid of the team against the
   skills of the trade (first fix, plastering, roofing… – add or take away skills); tap a square to go — → 🟡 Learning →
   🟢 Can do → ⭐ Can teach. "Who can do…?" picks a skill and lists who can, best first, and whether they're booked on
   the planner today. 🗣 Catch-ups: when James last sat down with each person and when the next one's due (every 3, 6 or
   12 months); ＋ Catch-up keeps how they're getting on, what was said, what was agreed and the next date. Overdue
   catch-ups are on Today. All owner-only: todos/skills (kind "skills": list [skill], grid { person: { skill: 1–3 } },
   every months) and todos/cu-{id} (kind "catchup": who, date, how, notes, agreed, next). */
const SKL = (() => {
  const DEF = [
    "First fix carpentry",
    "Second fix carpentry",
    "Bricklaying",
    "Blockwork",
    "Plastering",
    "Rendering",
    "Tiling",
    "Roofing",
    "Groundworks",
    "Drainage",
    "Plumbing",
    "Electrics (qualified)",
    "Decorating",
    "Kitchen fitting",
    "Windows & doors",
    "Digger / dumper",
  ];
  const LV = [
    ["", "—", "Not yet"],
    ["1", "🟡", "Learning"],
    ["2", "🟢", "Can do"],
    ["3", "⭐", "Can teach"],
  ];
  const rec = () => (S.skillSets && S.skillSets[0]) || { list: DEF.slice(), grid: {}, every: 6 };
  const cups = () =>
    (S.catchUps || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const lastCu = (id) => cups().find((x) => x.who === id) || null;
  const nextDue = (id) => {
    const l = lastCu(id);
    if (!l) return null;
    if (l.next) return l.next;
    const d = parse(l.date);
    d.setMonth(d.getMonth() + (+rec().every || 6));
    return iso(d);
  };
  const ukD = (d) =>
    d
      ? parse(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "";
  async function save(r) {
    const data = {
      kind: "skills",
      list: r.list,
      grid: r.grid,
      every: +r.every || 6,
      updated: Date.now(),
    };
    await S.db.doc("todos/skills").set(data);
    S.skillSets = [Object.assign({ id: "skills" }, data)];
  }
  /* booked on the planner today? */
  function bookedToday(id) {
    try {
      const t = iso(new Date());
      const p = planEntries().find(
        (x) =>
          (x.who === id || (Array.isArray(x.people) && x.people.includes(id))) &&
          x.from <= t &&
          (x.to || x.from) >= t &&
          !x.pending,
      );
      return p ? p.site || p.title || "booked" : "";
    } catch (e) {
      return "";
    }
  }
  let tab = "skills",
    who = "";
  function open(t) {
    if (t) tab = t;
    const r = rec();
    const T = teamIds();
    const cell = (id, s) => {
      const v = String(((r.grid || {})[id] || {})[s] || "");
      const L = LV.find((x) => x[0] === v) || LV[0];
      return `<td><button type="button" class="skl-c" data-p="${esc(id)}" data-s="${esc(s)}" aria-label="${esc(nameOf(id))}, ${esc(s)}: ${L[2]}" title="${L[2]}">${L[1]}</button></td>`;
    };
    const who2 = who && r.list.includes(who) ? who : "";
    const can = who2
      ? T.map((id) => [id, +(((r.grid || {})[id] || {})[who2] || 0)])
          .filter((x) => x[1] >= 1)
          .sort((a, b) => b[1] - a[1])
      : [];
    const today = iso(new Date());
    openViewer(`<div class="skl"><div class="vhead"><b>🧑‍🔧 Skills &amp; catch-ups</b></div>
      <div class="seg skl-tabs" role="group" aria-label="Show"><button type="button" class="skl-t" data-t="skills" aria-pressed="${tab === "skills"}">🧰 Skills</button><button type="button" class="skl-t" data-t="cu" aria-pressed="${tab === "cu"}">🗣 Catch-ups</button></div>
      ${
        tab === "skills"
          ? `<div class="who">Tap a square: — → 🟡 Learning → 🟢 Can do → ⭐ Can teach. Only you see this.</div>
        <label for="skl-who">Who can do…?<select id="skl-who"><option value="">Pick a skill</option>${r.list.map((s) => `<option${s === who2 ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        ${who2 ? `<div class="skl-can">${can.map(([id, l]) => `<div class="skl-row"><span>${LV[l][1]} <b>${esc(nameOf(id))}</b> <span class="who">${LV[l][2]}</span></span><span class="who">${esc(bookedToday(id) ? "Today: " + bookedToday(id) : "Free today")}</span></div>`).join("") || '<div class="who">Nobody yet.</div>'}</div>` : ""}
        ${T.length ? `<div class="skl-wrap"><table class="skl-g"><thead><tr><th>Skill</th>${T.map((id) => `<th>${esc(nameOf(id).split(" ")[0])}</th>`).join("")}<th></th></tr></thead><tbody>${r.list.map((s, i) => `<tr><th>${esc(s)}</th>${T.map((id) => cell(id, s)).join("")}<td><button type="button" class="linkdanger skl-del" data-i="${i}" aria-label="Take out ${esc(s)}">✕</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><strong>No team yet</strong>Add people in Setup › People &amp; access.</div>'}
        <div class="skl-add"><input id="skl-new" maxlength="40" placeholder="Another skill, e.g. Lime plaster" aria-label="Another skill"><button type="button" class="btn" id="skl-addb">＋ Add</button></div>`
          : `<div class="who">A regular sit-down with each person: how they're getting on, anything worrying them, what you agreed.</div>
        <label for="skl-every">Catch up with each person every<select id="skl-every">${[3, 6, 12].map((m) => `<option value="${m}"${+r.every === m ? " selected" : ""}>${m} months</option>`).join("")}</select></label>
        ${
          T.map((id) => {
            const l = lastCu(id),
              n = nextDue(id);
            const late = !l || (n && n < today);
            return `<div class="skl-cu${late ? " late" : ""}"><span><b>${esc(nameOf(id))}</b><br><span class="who">${l ? "Last: " + esc(ukD(l.date)) + (l.how ? " · " + esc(l.how) : "") : "No catch-up yet"}${n ? " · next " + esc(ukD(n)) : ""}</span>${late ? ' <span class="tag bad">Due</span>' : ""}</span><span class="actions"><button type="button" class="btn primary skl-cn" data-p="${esc(id)}">＋ Catch-up</button>${l ? `<button type="button" class="btn skl-ch" data-p="${esc(id)}">History</button>` : ""}</span></div>`;
          }).join("") || '<div class="who">No team yet.</div>'
        }`
      }</div>`);
    document.querySelectorAll(".skl-t").forEach((b) => (b.onclick = () => open(b.dataset.t)));
    if (tab === "skills") {
      document.querySelectorAll(".skl-c").forEach(
        (b) =>
          (b.onclick = async () => {
            const R = JSON.parse(JSON.stringify(rec()));
            R.grid = R.grid || {};
            const g = (R.grid[b.dataset.p] = R.grid[b.dataset.p] || {});
            const v = ((+g[b.dataset.s] || 0) + 1) % 4;
            if (v) g[b.dataset.s] = v;
            else delete g[b.dataset.s];
            try {
              await save(R);
              open();
            } catch (e) {
              toast("Couldn't save");
            }
          }),
      );
      if ($("skl-who"))
        $("skl-who").onchange = (e) => {
          who = e.target.value;
          open();
        };
      document.querySelectorAll(".skl-del").forEach(
        (b) =>
          (b.onclick = async (e) => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Sure?";
              return;
            }
            const R = JSON.parse(JSON.stringify(rec()));
            R.list.splice(+b.dataset.i, 1);
            await save(R).catch(() => toast("Couldn't save"));
            open();
          }),
      );
      const add = async () => {
        const s = $("skl-new").value.trim();
        if (!s) return;
        const R = JSON.parse(JSON.stringify(rec()));
        if (!R.list.includes(s)) R.list.push(s);
        await save(R).catch(() => toast("Couldn't save"));
        open();
      };
      $("skl-addb").onclick = add;
      $("skl-new").onkeydown = (e) => {
        if (e.key === "Enter") add();
      };
    } else {
      $("skl-every").onchange = async (e) => {
        const R = JSON.parse(JSON.stringify(rec()));
        R.every = +e.target.value;
        await save(R).catch(() => toast("Couldn't save"));
        open();
      };
      document.querySelectorAll(".skl-cn").forEach((b) => (b.onclick = () => catchUp(b.dataset.p)));
      document.querySelectorAll(".skl-ch").forEach((b) => (b.onclick = () => history(b.dataset.p)));
    }
  }
  function catchUp(id) {
    const d = new Date();
    d.setMonth(d.getMonth() + (+rec().every || 6));
    openSheet(
      `<h3 id="sheettitle">🗣 Catch-up with ${esc(nameOf(id))}</h3>
      <label for="cu-date">When<input id="cu-date" type="date" value="${iso(new Date())}"></label>
      <div class="flabel">How are they getting on?</div>
      <div class="seg" role="group" aria-label="How are they getting on?" id="cu-how">${["Going well", "OK", "Some worries"].map((x, i) => `<button type="button" data-v="${esc(x)}" aria-pressed="${i === 0}">${i === 0 ? "😀" : i === 1 ? "🙂" : "😟"} ${esc(x)}</button>`).join("")}</div>
      <label for="cu-notes">What was said<textarea id="cu-notes" maxlength="3000" placeholder="e.g. Enjoying the roofing. Wants to do his NVQ level 3. Back's been playing up."></textarea></label>
      <label for="cu-agreed">What you agreed<textarea id="cu-agreed" maxlength="2000" placeholder="e.g. Book the NVQ assessor. Try him on the Rolle Road roof."></textarea></label>
      <label for="cu-next">Next catch-up<input id="cu-next" type="date" value="${iso(d)}"></label>
      ${formFoot(false, "Save")}`,
      async () => {
        const data = {
          kind: "catchup",
          who: id,
          date: $("cu-date").value || iso(new Date()),
          how: ($("cu-how").querySelector("[aria-pressed=true]") || {}).dataset.v || "",
          notes: $("cu-notes").value.trim(),
          agreed: $("cu-agreed").value.trim(),
          next: $("cu-next").value || "",
          created: Date.now(),
        };
        const cid = "cu-" + newId();
        try {
          await S.db.doc("todos/" + cid).set(data);
          S.catchUps = (S.catchUps || []).concat([Object.assign({ id: cid }, data)]);
          closeForm();
          toast("Catch-up saved");
          open("cu");
        } catch (e) {
          showErr("Couldn't save – check your connection");
        }
      },
    );
    $("cu-how")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            $("cu-how")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
      );
  }
  function history(id) {
    const L = cups().filter((x) => x.who === id);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    d.innerHTML = `<div class="dimbox skl-hist" role="dialog" aria-label="Catch-ups with ${esc(nameOf(id))}"><b>🗣 ${esc(nameOf(id))}</b>${L.map((x) => `<div class="skl-h"><b>${esc(ukD(x.date))}</b>${x.how ? " · " + esc(x.how) : ""}${x.notes ? `<div class="skl-txt">${esc(x.notes)}</div>` : ""}${x.agreed ? `<div class="skl-txt"><b>Agreed:</b> ${esc(x.agreed)}</div>` : ""}</div>`).join("")}<div class="dimbtns"><button type="button" class="btn skl-hx">Close</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".skl-hx").onclick = () => d.remove();
  }
  /* Today: catch-ups due (only once James has started using them) */
  function todayCard() {
    if (!S.owner || !(S.catchUps || []).length) return "";
    const today = iso(new Date());
    const L = teamIds().filter((id) => {
      const n = nextDue(id);
      return !lastCu(id) || (n && n <= today);
    });
    if (!L.length) return "";
    return `<div class="card skl-today"><div class="cardbody"><button type="button" class="incrow skl-go"><span><b>🗣 Catch-ups due</b><br><span class="who">${esc(L.map(nameOf).join(", "))}</span></span><span>›</span></button></div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".skl-go").forEach((b) => (b.onclick = () => open("cu")));
  }
  return { open, todayCard, wireToday };
})();
