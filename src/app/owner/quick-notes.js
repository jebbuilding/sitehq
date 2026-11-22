/* ================= QUICK NOTES: 🗒️ Quick note in + Add – speak or type a note in a hurry, Claude tidies it and files it ================= */
import { clAddNote } from "../clients/clients.js";
import { bossName, coName } from "../core/company-names.js";
import { $, esc, shortDay, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { newId } from "../files/outbox.js";
import { BIN_DAYS } from "./deleted-items.js";
import { siteLabel } from "../sites/job-details.js";
export { QNOTE };
/* James (Nov 2026): "Ai take notes quickly or write them down". 🗒️ Quick note in + Add (owner only) opens a
   big box: 🎤 Speak or type, as rough as you like. ✨ Tidy it up has Claude turn it into a short heading, neat notes
   and a list of things to do (with dates if said), and spot which client or site it's about. Then file it: on that
   client's notes, the things to do onto My to-do, or kept in 📝 My notes (todos { kind:"qnote", title, text,
   clientId, site, created }). Without Claude the note is kept just as it was said. */
const QNOTE = (() => {
  async function claude() {
    try {
      return await window.claude.use("sample");
    } catch (e) {
      return null;
    }
  }
  const notes = () => (S.qnotes || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
  async function tidy(raw) {
    const sample = await claude();
    if (!sample) throw Object.assign(new Error("no claude"), { code: "no_claude" });
    const clients = (S.clients || [])
      .slice(-150)
      .map((c) => c.name)
      .filter(Boolean);
    const sites = siteNames().slice(0, 60);
    const j = await sample.json(
      `Tidy up a quick note a UK builder (${bossName()} of ${coName()}) spoke or typed in a hurry on site. Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.
Keep every fact, number and measurement exactly; fix speech-to-text mistakes only where it's obvious; don't add anything. UK English, plain words.
Clients in the app: ${clients.join("; ") || "none"}.
Sites in the app: ${sites.join("; ") || "none"}.
The note:
"""${raw}"""
Reply with JSON only: {"title":"a short heading","note":"the tidied note, short lines or bullet points starting with • ","todo":[{"text":"a thing to do","due":"YYYY-MM-DD or empty"}],"client":"exact client name from the list if the note is clearly about one, else empty","site":"exact site from the list if clearly about one, else empty"}`,
      { modelTier: "default" },
    );
    return j && typeof j === "object" ? j : {};
  }
  function open(pre) {
    pre = pre || {};
    let todo = [];
    const clients = (S.clients || [])
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    const L = notes();
    openSheet(
      `<h3 id="sheettitle">📝 Quick note</h3>
      <div class="who">Tap 🎤 Speak and talk, or type – as rough as you like.</div>
      <label for="qn-title">Heading (optional)<input id="qn-title" maxlength="100" value="${esc(pre.title || "")}"></label>
      <label for="qn-text">Note<textarea id="qn-text" rows="8" maxlength="6000" placeholder="e.g. Mrs Jones wants the kitchen window moved 300 to the left, ring Travis about lintel Tuesday">${esc(pre.text || "")}</textarea></label>
      <div class="actions"><button type="button" class="btn" id="qn-ai">✨ Tidy it up</button></div>
      <div id="qn-todo"></div>
      <div class="grid2"><label for="qn-c">About a client (optional)<select id="qn-c"><option value="">No client</option>${clients.map((c) => `<option value="${esc(c.id)}" ${pre.clientId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label for="qn-s">About a site (optional)<select id="qn-s"><option value="">No site</option>${siteNames()
        .map(
          (n) =>
            `<option value="${esc(n)}" ${pre.site === n ? "selected" : ""}>${esc(siteLabel(n))}</option>`,
        )
        .join("")}</select></label></div>
      <div class="who">Saved in 📝 My notes. With a client chosen it goes on their notes too.</div>
      ${formFoot(!!pre.id, "Save note")}
      ${
        L.length && !pre.id
          ? `<details class="pmdet qn-list"><summary>📝 My notes (${L.length})</summary>${L.slice(
              0,
              40,
            )
              .map(
                (n) =>
                  `<button type="button" class="qn-row" data-id="${esc(n.id)}"><b>${esc(n.title || String(n.text || "").slice(0, 50))}</b><span class="who">${esc(stamp(n.created))}${n.clientName ? " · 👤 " + esc(n.clientName) : ""}${n.site ? " · 📍 " + esc(siteLabel(n.site)) : ""}</span></button>`,
              )
              .join("")}</details>`
          : ""
      }`,
      async () => {
        const text = $("qn-text").value.trim();
        if (!text) {
          showErr("Say or type the note first.");
          return;
        }
        const c = clients.find((x) => x.id === $("qn-c").value);
        const title = $("qn-title").value.trim();
        const id = pre.id || "qn-" + newId();
        const rec = {
          kind: "qnote",
          title,
          text,
          clientId: c ? c.id : "",
          clientName: c ? c.name : "",
          site: $("qn-s").value,
          created: pre.created || Date.now(),
          updated: Date.now(),
        };
        const picked = [...document.querySelectorAll(".qn-td:checked")]
          .map((x) => todo[+x.dataset.i])
          .filter(Boolean);
        $("f-save").disabled = true;
        try {
          await S.db.doc("todos/" + id).set(rec);
          S.qnotes = (S.qnotes || [])
            .filter((x) => x.id !== id)
            .concat([Object.assign({ id }, rec)]);
          if (c && !pre.id) await clAddNote(c, (title ? title + ": " : "") + text);
          for (const t of picked)
            await S.db.doc("todos/" + newId()).set({
              text: String(t.text).slice(0, 300),
              due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || "") ? t.due : "",
              site: rec.site,
              urgent: false,
              done: false,
              created: Date.now(),
            });
          closeForm();
          toast(
            "Note saved" +
              (c && !pre.id ? " · on " + c.name + "'s notes" : "") +
              (picked.length ? " · " + picked.length + " on My to-do" : ""),
          );
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      "qn-text",
    );
    $("qn-ai").onclick = async () => {
      const raw = $("qn-text").value.trim();
      if (!raw) {
        toast("Say or type the note first");
        return;
      }
      const b = $("qn-ai");
      b.disabled = true;
      b.textContent = "✨ Tidying…";
      try {
        const j = await tidy(raw);
        if (j.note) $("qn-text").value = String(j.note).slice(0, 6000);
        if (j.title && !$("qn-title").value.trim())
          $("qn-title").value = String(j.title).slice(0, 100);
        const c = clients.find((x) => x.name && x.name === j.client);
        if (c && !$("qn-c").value) $("qn-c").value = c.id;
        if (j.site && siteNames().includes(j.site) && !$("qn-s").value) $("qn-s").value = j.site;
        todo = (Array.isArray(j.todo) ? j.todo : []).filter((t) => t && t.text).slice(0, 12);
        $("qn-todo").innerHTML = todo.length
          ? `<div class="flabel">Things to do – ticked ones go on My to-do</div>${todo.map((t, i) => `<label class="inl qn-tdl"><input type="checkbox" class="qn-td" data-i="${i}" checked> ${esc(t.text)}${t.due ? ` <span class="tag">${esc(shortDay(t.due))}</span>` : ""}</label>`).join("")}`
          : "";
        b.textContent = "✨ Tidy it again";
      } catch (e) {
        toast(
          e && e.code === "no_claude"
            ? "Claude isn't available on this device – the note is kept as you said it"
            : "Couldn't tidy it just now",
        );
        b.textContent = "✨ Tidy it up";
      }
      b.disabled = false;
    };
    document.querySelectorAll(".qn-row").forEach(
      (b) =>
        (b.onclick = () => {
          const n = (S.qnotes || []).find((x) => x.id === b.dataset.id);
          if (n) {
            closeForm();
            setTimeout(() => open(n), 50);
          }
        }),
    );
    if (pre.id)
      armDelete(async () => {
        try {
          await S.db.doc("todos/" + pre.id).delete();
          S.qnotes = (S.qnotes || []).filter((x) => x.id !== pre.id);
          closeForm();
          toast("Deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
        } catch (e) {
          showErr("Couldn't delete");
        }
      });
  }
  return { open };
})();
