/* ================= KEYS LOG: client keys held – which set, who has it now, and when it went back ================= */
import { $, esc, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { crewIds, nameOf } from "../owner/owner.js";
import { dlgEsc } from "../survey/glass-colours.js";
export { KEY };
/* James (Nov 2026, "keys log: whose keys you hold, who has them now, and when they went back"): on a client's page,
   🔑 Keys we hold. + Add a set (what it opens, a tag number on the key ring – K-01, K-02… – and when it was handed
   over). Each set says where it is now: 🏢 In the office, with one of the team, or ↩ Given back (with the date).
   Give to… / Back in the office / Given back move it, and every move is kept. 🔑 All keys lists every set still held,
   who has it and since when. Today warns about keys still held on finished or lost jobs, and keys with someone for
   more than 3 days. Owner-only, on the client record (todos/{client}: keys [{ id, what, tag, got, where (office / a
   team id / back), since, log [{ at, t }] }]). */
const KEY = (() => {
  const held = (k) => k.where !== "back";
  const whereTxt = (k) =>
    k.where === "back"
      ? "↩ Given back " + shortDay(iso(new Date(k.since)))
      : k.where === "office" || !k.where
        ? "🏢 In the office"
        : "👷 With " + nameOf(k.where);
  const allKeys = () => {
    const out = [];
    (S.clients || []).forEach((c) => (c.keys || []).forEach((k) => out.push({ c, k })));
    return out;
  };
  const nextTag = () => {
    const n = allKeys()
      .map(({ k }) => +(String(k.tag || "").match(/^K-(\d+)$/) || [])[1] || 0)
      .reduce((a, b) => Math.max(a, b), 0);
    return "K-" + String(n + 1).padStart(2, "0");
  };
  const days = (t) => Math.floor((Date.now() - (t || Date.now())) / 86400000);
  async function save(c, keys) {
    await S.db.doc("todos/" + c.id).update({ keys, updated: Date.now() });
    const i = (S.clients || []).findIndex((x) => x.id === c.id);
    if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], { keys });
    c.keys = keys;
  }
  function clientHtml(c) {
    if (!S.owner) return "";
    const L = c.keys || [];
    const n = L.filter(held).length;
    return `<div class="card key-card"><div class="key-h"><b>🔑 Keys we hold${n ? " (" + n + ")" : ""}</b><button type="button" class="pillbtn key-add" data-c="${esc(c.id)}">+ Add a set</button></div>
      ${L.map(
        (
          k,
        ) => `<div class="key-row${held(k) ? "" : " key-back"}" data-c="${esc(c.id)}" data-k="${esc(k.id)}"><span><b>${esc(k.what || "Keys")}</b> ${k.tag ? `<span class="tag">${esc(k.tag)}</span>` : ""}<br><span class="who">${esc(whereTxt(k))}${held(k) && k.where && k.where !== "office" ? " since " + esc(shortDay(iso(new Date(k.since)))) : ""}</span></span>
        ${held(k) ? `<span class="key-acts"><button type="button" class="pillbtn key-give">Give to…</button>${k.where && k.where !== "office" ? '<button type="button" class="pillbtn key-off">Back in the office</button>' : ""}<button type="button" class="pillbtn key-ret">↩ Given back</button></span>` : ""}
        <button type="button" class="linkbtn key-hist">History</button></div>`,
      ).join("")}
      ${L.length ? "" : '<div class="who">None. If they give you a key, add it here so you always know who has it.</div>'}
      <button type="button" class="linkbtn key-all">🔑 All keys we hold</button></div>`;
  }
  function move(c, k, where, t) {
    const keys = (c.keys || []).map((x) =>
      x.id === k.id
        ? Object.assign({}, x, {
            where,
            since: Date.now(),
            log: (x.log || []).concat([{ at: Date.now(), t }]).slice(-60),
          })
        : x,
    );
    return save(c, keys);
  }
  function addSet(c) {
    openSheet(
      `<h3 id="sheettitle">🔑 Keys from ${esc(c.name || "")}</h3>
      <label for="key-what">What they open<input id="key-what" maxlength="80" placeholder="e.g. Front and back door, garage" required></label>
      <div class="grid2"><label for="key-tag">Tag on the key ring<input id="key-tag" maxlength="12" value="${esc(nextTag())}"></label><label for="key-got">Handed to us on<input id="key-got" type="date" value="${esc(iso(new Date()))}"></label></div>
      <label for="key-who">Who has them now<select id="key-who"><option value="office">🏢 In the office</option>${crewIds()
        .map((id) => `<option value="${esc(id)}">👷 ${esc(nameOf(id))}</option>`)
        .join("")}</select></label>
      ${formFoot(false, "Add the keys")}`,
      async () => {
        const what = $("key-what").value.trim();
        if (!what) return showErr("Say what the keys open.");
        const where = $("key-who").value;
        const got = $("key-got").value || iso(new Date());
        const k = {
          id: newId(),
          what,
          tag: $("key-tag").value.trim(),
          got,
          where,
          since: Date.now(),
          log: [
            {
              at: Date.now(),
              t:
                "Handed to us " +
                shortDay(got) +
                (where !== "office" ? " – " + nameOf(where) + " has them" : " – in the office"),
            },
          ],
        };
        try {
          await save(c, (c.keys || []).concat([k]));
          closeForm();
          toast("Keys added");
        } catch (e) {
          showErr("Couldn't save. Try again.");
        }
      },
      "key-what",
    );
  }
  function giveTo(c, k, after) {
    openSheet(
      `<h3 id="sheettitle">🔑 Give ${esc(k.what || "the keys")} to…</h3>
      <label for="key-to">Who<select id="key-to">${crewIds()
        .map(
          (id) =>
            `<option value="${esc(id)}"${id === k.where ? " selected" : ""}>${esc(nameOf(id))}</option>`,
        )
        .join("")}</select></label>${formFoot(false, "Give them the keys")}`,
      async () => {
        const id = $("key-to").value;
        try {
          await move(c, k, id, "Given to " + nameOf(id));
          closeForm();
          toast(nameOf(id) + " has the keys");
          if (after) after();
        } catch (e) {
          showErr("Couldn't save.");
        }
      },
    );
  }
  function wire(after) {
    const find = (el) => {
      const r = el.closest("[data-c]");
      const c = (S.clients || []).find((x) => x.id === r.dataset.c);
      const k = c && (c.keys || []).find((x) => x.id === r.dataset.k);
      return { c, k };
    };
    const redo = () => (after ? after() : null);
    document.querySelectorAll(".key-add").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.c);
          if (c) {
            closeViewer();
            addSet(c);
          }
        }),
    );
    document.querySelectorAll(".key-give").forEach(
      (b) =>
        (b.onclick = () => {
          const { c, k } = find(b);
          if (c && k) {
            closeViewer();
            giveTo(c, k);
          }
        }),
    );
    document.querySelectorAll(".key-off").forEach(
      (b) =>
        (b.onclick = async () => {
          const { c, k } = find(b);
          if (!c || !k) return;
          await move(c, k, "office", "Back in the office");
          toast("Back in the office");
          redo();
        }),
    );
    document.querySelectorAll(".key-ret").forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Given back to them? Tap again";
            return;
          }
          const { c, k } = find(b);
          if (!c || !k) return;
          await move(c, k, "back", "Given back to " + (c.name || "the client"));
          toast("Marked as given back");
          redo();
        }),
    );
    document.querySelectorAll(".key-hist").forEach(
      (b) =>
        (b.onclick = () => {
          const { k } = find(b);
          if (!k) return;
          const d = document.createElement("div");
          d.className = "dimask";
          d.innerHTML = `<div class="dimbox key-dlg" role="dialog" aria-label="Key history"><b>🔑 ${esc(k.what || "Keys")} ${k.tag ? esc(k.tag) : ""}</b>${(
            k.log || []
          )
            .slice()
            .reverse()
            .map((l) => `<div class="who">${esc(stamp(l.at))} – ${esc(l.t)}</div>`)
            .join(
              "",
            )}<div class="dimbtns"><button type="button" class="btn primary key-dok">OK</button></div></div>`;
          document.body.appendChild(d);
          dlgEsc(d);
          d.querySelector(".key-dok").onclick = () => d.remove();
        }),
    );
    document.querySelectorAll(".key-all").forEach((b) => (b.onclick = open));
  }
  /* every set still held */
  function open() {
    const L = allKeys()
      .filter(({ k }) => held(k))
      .sort((a, b) => (a.k.tag || "").localeCompare(b.k.tag || ""));
    openViewer(`<div class="key-list"><div class="vhead"><b>🔑 All keys we hold (${L.length})</b></div>
      ${
        L.map(
          ({
            c,
            k,
          }) => `<div class="key-row" data-c="${esc(c.id)}" data-k="${esc(k.id)}"><span><b>${esc(k.tag || "")} ${esc(c.name || "")}</b><br><span class="who">${esc(k.what || "")} · ${esc(whereTxt(k))}${k.where && k.where !== "office" ? " for " + days(k.since) + " day" + (days(k.since) === 1 ? "" : "s") : ""}</span></span>
          <span class="key-acts"><button type="button" class="pillbtn key-give">Give to…</button>${k.where && k.where !== "office" ? '<button type="button" class="pillbtn key-off">Back in the office</button>' : ""}<button type="button" class="pillbtn key-ret">↩ Given back</button></span></div>`,
        ).join("") || "<div class=\"nothing\">You're not holding anyone's keys.</div>"
      }</div>`);
    wire(open);
  }
  /* Today: keys to give back (job finished or lost), and keys with someone for more than 3 days */
  function due() {
    return allKeys()
      .filter(({ k }) => held(k))
      .map(({ c, k }) => ({
        c,
        k,
        why: ["done", "lost"].includes(c.stage)
          ? "the job's " +
            (c.stage === "done" ? "finished" : "not going ahead") +
            " – give them back"
          : k.where && k.where !== "office" && days(k.since) > 3
            ? "with " + nameOf(k.where) + " for " + days(k.since) + " days"
            : "",
      }))
      .filter((x) => x.why);
  }
  function todayCard() {
    if (!S.owner) return "";
    const L = due();
    if (!L.length) return "";
    return `<div class="card key-today"><div class="cardbody"><b>🔑 Keys to sort</b>${L.map((x) => `<button type="button" class="incrow key-go"><span><b>${esc(x.k.tag || "")} ${esc(x.c.name || "")}</b><br><span class="who">${esc(x.k.what || "")}: ${esc(x.why)}</span></span><span>›</span></button>`).join("")}</div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".key-go").forEach((b) => (b.onclick = open));
  }
  return { clientHtml, wire, open, todayCard, wireToday, due };
})();
