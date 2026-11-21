/* ================= CHECK ITEMS: each firm's own questions on the built-in checks (vehicles, diggers, scaffolds, ladders…) ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { KINDS } from "./checklists.js";
export { ckiApply, ckiCardHtml, ckiWire };
/* James (Nov 2026): "is every part of the app customizable for another company" – the built-in forms' questions were
   fixed. Setup › 📝 Your forms › ✅ Built-in checks: for each check (vehicle, digger, trailer, machine, scaffold,
   excavation, ladder) change its name, reword, reorder or take out any question and add your own; ↺ back to the
   standard ones. Saved in settings/app.checkItems { kind: { name, items: [[key, label, gone?]] } } so everyone's
   check uses them. A question taken out is kept as "gone": old checks still show their answer to it (KINDS[k].all). */
let ckiStd = null;
let ckiSig = null;
function ckiKeep() {
  if (ckiStd) return;
  ckiStd = {};
  Object.entries(KINDS).forEach(([k, K]) => {
    ckiStd[k] = { name: K.name, items: K.items.map((x) => x.slice(0, 2)) };
  });
}
/* the firm's questions into the checks, on every redraw when they change */
function ckiApply() {
  const m = (S.settings || {}).checkItems || {};
  const sig = JSON.stringify(m);
  if (sig === ckiSig) return;
  ckiSig = sig;
  ckiKeep();
  Object.entries(KINDS).forEach(([k, K]) => {
    const std = ckiStd[k];
    const c = m[k];
    K.name = (c && (c.name || "").trim()) || std.name;
    const list = c && Array.isArray(c.items) && c.items.length ? c.items : std.items;
    K.items = list.filter((x) => !x[2] && (x[1] || "").trim()).map((x) => [x[0], x[1]]);
    /* every question it has ever had, for showing old checks */
    const all = new Map(std.items.map((x) => [x[0], x[1]]));
    list.forEach((x) => all.set(x[0], x[1]));
    K.all = [...all.entries()];
  });
}
function ckiCardHtml() {
  ckiApply();
  const m = (S.settings || {}).checkItems || {};
  return `<section class="card cki-card"><div class="cardbody"><b>✅ Built-in checks</b><div class="who">The checks trades do on vans, plant, scaffolds and ladders. Change the questions to suit your firm – old checks keep their answers.</div>
    ${Object.entries(KINDS)
      .map(
        ([k, K]) =>
          `<button type="button" class="cki-row" data-k="${esc(k)}"><span><b>${esc(K.name)} ${K.inspect ? "inspection" : "check"}</b><small>${K.items.length} questions${m[k] ? " · your own" : ""}</small></span><span aria-hidden="true">›</span></button>`,
      )
      .join("")}
  </div></section>`;
}
function ckiWire() {
  document
    .querySelectorAll("#main .cki-row")
    .forEach((b) => (b.onclick = () => ckiEdit(b.dataset.k)));
}
function ckiEdit(k) {
  ckiApply();
  const K = KINDS[k];
  const cur = ((S.settings || {}).checkItems || {})[k];
  let rows = (cur && cur.items ? cur.items : ckiStd[k].items).map((x) => x.slice());
  const draw = () =>
    rows
      .map((x, i) =>
        x[2]
          ? ""
          : `<div class="cki-item" data-i="${i}"><button type="button" class="iconbtn cki-up" aria-label="Move up">↑</button><button type="button" class="iconbtn cki-dn" aria-label="Move down">↓</button><input class="cki-l" maxlength="160" value="${esc(x[1])}" aria-label="Question"><button type="button" class="iconbtn cki-x" aria-label="Take this question out">✕</button></div>`,
      )
      .join("");
  openSheet(
    `<h3 id="sheettitle">✅ ${esc(ckiStd[k].name)} ${K.inspect ? "inspection" : "check"} – your questions</h3>
    <label for="cki-nm">Name<input id="cki-nm" maxlength="40" value="${esc(K.name)}" placeholder="${esc(ckiStd[k].name)}"></label>
    <div class="flabel">Questions (each is answered OK, Defect or N/A)</div>
    <div id="cki-list">${draw()}</div>
    <div class="actions"><button type="button" class="btn" id="cki-add">+ Add a question</button><button type="button" class="btn" id="cki-std">↺ Back to the standard questions</button></div>
    ${formFoot(false, "Save the questions")}`,
    async () => {
      read();
      if (!rows.some((x) => !x[2] && x[1].trim())) return showErr("Keep at least one question");
      const all = Object.assign({}, (S.settings || {}).checkItems || {});
      all[k] = { name: $("cki-nm").value.trim(), items: rows.filter((x) => x[1].trim() || x[2]) };
      try {
        await S.db.doc("settings/app").update({ checkItems: all });
        S.settings = Object.assign({}, S.settings, { checkItems: all });
        closeForm();
        toast("Questions saved – everyone's checks use them");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "cki-nm",
  );
  const read = () =>
    document.querySelectorAll("#cki-list .cki-item").forEach((r) => {
      rows[+r.dataset.i][1] = r.querySelector(".cki-l").value;
    });
  const wire = () => {
    document.querySelectorAll("#cki-list .cki-item").forEach((r) => {
      const i = +r.dataset.i;
      const move = (d) => {
        read();
        let j = i + d;
        while (rows[j] && rows[j][2]) j += d;
        if (!rows[j]) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
        redraw();
      };
      r.querySelector(".cki-up").onclick = () => move(-1);
      r.querySelector(".cki-dn").onclick = () => move(1);
      r.querySelector(".cki-x").onclick = () => {
        read();
        /* a standard or saved question is kept as gone, so old checks still show it */
        rows[i] = [rows[i][0], rows[i][1], 1];
        redraw();
      };
    });
  };
  const redraw = () => {
    $("cki-list").innerHTML = draw();
    wire();
  };
  wire();
  $("cki-add").onclick = () => {
    read();
    rows.push(["q" + Date.now().toString(36), ""]);
    redraw();
    const ins = document.querySelectorAll("#cki-list .cki-l");
    if (ins.length) ins[ins.length - 1].focus();
  };
  $("cki-std").onclick = () => {
    const keep = rows
      .filter((x) => !ckiStd[k].items.some((s) => s[0] === x[0]))
      .map((x) => [x[0], x[1], 1]);
    rows = ckiStd[k].items.map((x) => x.slice()).concat(keep);
    $("cki-nm").value = ckiStd[k].name;
    redraw();
  };
}
