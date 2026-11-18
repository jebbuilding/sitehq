/* ================= TO-DO LISTS ================= */
import { bossFirst } from "../core/company-names.js";
import { $, esc, iso, shortDay, stamp, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId, saveOrKeep, submitJob } from "../files/outbox.js";
import { coData } from "./company-details.js";
import { allTeam, nameOf, roleShort, teamIds } from "./owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { jobsView } from "../survey/door-window-survey.js";
export { sentTodosHTML, todoView, todosOf, tradeTodosHTML, wireSentTodos, wireTradeTodos };
const todosOf = (list) => (list || []).filter((s) => s.type === "todo");
function dueTag(t) {
  if (!t.due || t.done) return "";
  const today = iso(new Date());
  return t.due < today
    ? '<span class="tag bad">Overdue</span>'
    : t.due === today
      ? '<span class="tag day">Today</span>'
      : "";
}
function todoRow(t, { mine, owner, who }) {
  return `<div class="todo ${t.done ? "done" : ""}" data-t="${esc(t.id)}" data-w="${esc(who || "")}">
    <label class="jcheck"><input type="checkbox" class="td-chk" ${t.done ? "checked" : ""} ${owner && !mine ? "disabled" : ""} aria-label="Done: ${esc(t.text)}"></label>
    <div class="jbody"><div class="jtext">${t.urgent && !t.done ? '<span class="tag bad">Urgent</span>' : ""}${dueTag(t)}${esc(t.text)}</div>
      <div class="who">${[t.due ? "Due " + shortDay(t.due) : "", t.site, owner && !mine ? nameOf(who) : "", t.done ? "Done " + stamp(t.doneAt) : ""].filter(Boolean).map(esc).join(" · ")}</div>
      ${t.note ? `<div class="sub">${esc(t.note)}</div>` : ""}</div>
    ${owner ? `<button type="button" class="linkdanger td-del" aria-label="Delete">✕</button>` : ""}</div>`;
}
function sortTodos(a, b) {
  return (
    (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
    (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) ||
    (a.due || "9999").localeCompare(b.due || "9999") ||
    (a.created || 0) - (b.created || 0)
  );
}
function wireTodoToggles(root) {
  root.querySelectorAll("details.card[data-id^='__td']").forEach((dt) =>
    dt.addEventListener("toggle", () => {
      dt.open ? S.open.add(dt.dataset.id) : S.open.delete(dt.dataset.id);
    }),
  );
}
/* trade's own to-dos: shown at the top of Jobs */
function tradeTodosHTML() {
  const list = todosOf(S.mine.signoffs).sort(sortTodos);
  const open = list.filter((t) => !t.done);
  const done = list.filter((t) => t.done);
  if (!list.length) return "";
  return `<div class="day" id="td-trade"><div class="dayh"><span>My to-do list</span><span class="sum">${open.length} to do</span></div>
    <div class="who">Jobs ${esc(bossFirst())} has asked you to do. Tick each one when it's done and ${esc(bossFirst())} will see it.</div>
    ${open.map((t) => todoRow(t, {})).join("") || '<div class="nothing">All done.</div>'}
    ${
      done.length
        ? `<details class="card" data-id="__tddone" ${S.open.has("__tddone") ? "open" : ""}><summary><div class="nm">Done<small>${done.length}</small></div></summary><div class="cardbody">${done
            .slice(0, 40)
            .map((t) => todoRow(t, {}))
            .join("")}</div></details>`
        : ""
    }</div>`;
}
function wireTradeTodos() {
  const box = $("td-trade");
  if (!box) return;
  wireTodoToggles(box);
  const list = todosOf(S.mine.signoffs);
  box.querySelectorAll(".todo").forEach((r) => {
    const t = list.find((x) => x.id === r.dataset.t);
    if (!t) return;
    r.querySelector(".td-chk").onchange = async (e) => {
      const done = e.target.checked;
      try {
        const dd = Object.assign({}, t, { done, doneAt: done ? Date.now() : null });
        delete dd.id;
        delete dd.who;
        const r2 = await submitJob({ coll: "signoffs", docId: t.id, data: dd });
        if (done)
          toast(r2 === "queued" ? "Ticked off. It will send when you have signal." : "Done");
      } catch (err) {
        e.target.checked = !done;
        toast("Couldn't save");
      }
    };
  });
}
/* owner: to-dos sent to trades, shown at the top of Jobs */
function sentTodosHTML() {
  const sent = allTeam("signoffs").filter((s) => s.type === "todo");
  const who = S.f.tdwho || "";
  const shown = sent.filter((t) => !who || t.who === who).sort(sortTodos);
  const open = shown.filter((t) => !t.done),
    done = shown.filter((t) => t.done);
  return `<div class="day" id="td-sent"><div class="dayh"><span>Trades' to-do lists</span><span class="sum">${sent.filter((t) => !t.done).length} still to do</span></div>
    <div class="actions"><button class="btn primary" id="td-send" type="button">+ Send a to-do to trades</button>
      <select id="td-who" aria-label="Show person" style="width:auto"><option value="">Everyone</option>${teamIds()
        .map(
          (id) =>
            `<option value="${esc(id)}" ${id === who ? "selected" : ""}>${esc(nameOf(id))}</option>`,
        )
        .join("")}</select></div>
    ${open.map((t) => todoRow(t, { owner: true, who: t.who })).join("") || '<div class="nothing">Nothing outstanding.</div>'}
    ${
      done.length
        ? `<details class="card" data-id="__tdsentdone" ${S.open.has("__tdsentdone") ? "open" : ""}><summary><div class="nm">Done by trades<small>${done.length}</small></div></summary><div class="cardbody">${done
            .slice(0, 60)
            .map((t) => todoRow(t, { owner: true, who: t.who }))
            .join("")}</div></details>`
        : ""
    }</div>`;
}
function wireSentTodos() {
  const box = $("td-sent");
  if (!box) return;
  wireTodoToggles(box);
  const sent = allTeam("signoffs").filter((s) => s.type === "todo");
  $("td-send").onclick = () => openTodoSender([]);
  $("td-who").onchange = (e) => {
    S.f.tdwho = e.target.value;
    e.target.blur();
    render();
  };
  wireTodoRows(
    box,
    (r) => sent.find((x) => x.id === r.dataset.t && x.who === r.dataset.w),
    (t) => "sheets/" + t.who + "/signoffs/" + t.id,
  );
}
function wireTodoRows(root, find, pathOf) {
  root.querySelectorAll(".todo").forEach((r) => {
    const t = find(r);
    if (!t) return;
    const path = pathOf(t);
    const c = r.querySelector(".td-chk");
    if (!c.disabled)
      c.onchange = async (e) => {
        try {
          await saveOrKeep(
            path,
            "update",
            { done: e.target.checked, doneAt: e.target.checked ? Date.now() : null },
            "To-do ticked",
          );
        } catch (err) {
          e.target.checked = !e.target.checked;
          toast("Couldn't save");
        }
      };
    const d = r.querySelector(".td-del");
    if (d)
      d.onclick = async () => {
        if (d.dataset.armed !== "1") {
          d.dataset.armed = "1";
          d.textContent = "Delete?";
          return;
        }
        try {
          await S.db.doc(path).delete();
          toast("Deleted");
        } catch (err) {
          toast("Couldn't delete");
        }
      };
  });
}
/* owner's private list (To do tab) */
function todoView() {
  if (!ownerMode()) {
    jobsView();
    return;
  }
  const mineList = S.todos.slice().sort(sortTodos);
  const showDone = S.open.has("__tdmine");
  const sentOpen = allTeam("signoffs").filter((s) => s.type === "todo" && !s.done).length;
  $("main").innerHTML =
    `<div class="day"><div class="dayh"><span>My to-do list</span><span class="sum">${mineList.filter((t) => !t.done).length} to do <button type="button" class="pillbtn" id="td-pdf" style="padding:4px 10px;font-size:12.5px">📄 PDF</button></span></div>
      <form id="td-add" class="tdadd"><input id="td-text" maxlength="200" placeholder="Add a to-do, e.g. Order skip for Kennford" aria-label="New to-do">
        <input id="td-due" type="date" aria-label="Due date (optional)" title="Due date (optional)"><button class="btn primary" type="submit">Add</button></form>
      <div class="tdopts"><label class="inl"><input type="checkbox" id="td-urg"> Urgent</label><select id="td-site" aria-label="Site (optional)"><option value="">No site</option>${siteNames()
        .map((n) => `<option>${esc(n)}</option>`)
        .join("")}</select></div>
      ${
        mineList
          .filter((t) => !t.done)
          .map((t) => todoRow(t, { mine: true, owner: true }))
          .join("") || '<div class="nothing">Nothing on your list.</div>'
      }
      ${
        mineList.some((t) => t.done)
          ? `<button type="button" class="pillbtn" id="td-showdone" style="align-self:flex-start">${showDone ? "Hide" : "Show"} ${mineList.filter((t) => t.done).length} done</button>${
              showDone
                ? mineList
                    .filter((t) => t.done)
                    .map((t) => todoRow(t, { mine: true, owner: true }))
                    .join("")
                : ""
            }`
          : ""
      }</div>
    <div class="notice">Trades' to-do lists are now in <b>Jobs</b>${sentOpen ? ` (${sentOpen} still to do)` : ""}. <button type="button" class="pillbtn" id="td-gojobs">Go to Jobs</button></div>`;
  $("td-gojobs").onclick = () => {
    S.otab = "jobs";
    store.set("jeb.otab", S.otab);
    render();
  };
  $("td-pdf").onclick = () => todoPdfDlg(mineList);
  $("td-add").onsubmit = async (e) => {
    e.preventDefault();
    const text = $("td-text").value.trim();
    if (!text) return;
    const due = $("td-due").value,
      site = $("td-site").value,
      urgent = $("td-urg").checked;
    $("td-text").value = "";
    $("td-text").blur();
    try {
      const how = await saveOrKeep(
        "todos/" + newId(),
        "set",
        { text, due, site, urgent, done: false, created: Date.now() },
        "To-do: " + text.slice(0, 40),
      );
      toast(
        how === "queued"
          ? "No signal – saved on this phone, it sends when you're back online"
          : "Added",
      );
    } catch (err) {
      toast("Couldn't add");
      $("td-text").value = text;
    }
  };
  if ($("td-showdone"))
    $("td-showdone").onclick = () => {
      showDone ? S.open.delete("__tdmine") : S.open.add("__tdmine");
      render();
    };
  wireTodoRows(
    $("main"),
    (r) => S.todos.find((x) => x.id === r.dataset.t),
    (t) => "todos/" + t.id,
  );
}
/* to-do list as a PDF: choose a heading, which items, and add any details */
function todoPdfDlg(list) {
  const open = list.filter((t) => !t.done);
  const sites = [...new Set(open.map((t) => t.site || ""))];
  openSheet(
    `<h3 id="sheettitle">📄 To-do list PDF</h3>
    <label for="tp-title">Heading<input id="tp-title" maxlength="100" value="To-do list"></label>
    <div class="grid2"><label for="tp-for">For (optional)<input id="tp-for" maxlength="100" placeholder="e.g. Harry, or the site team"></label><label for="tp-addr">Address / site (optional)<input id="tp-addr" maxlength="160" placeholder="only if it's for one job"></label></div>
    <label for="tp-site">Which items<select id="tp-site"><option value="*">All open items (${open.length})</option>${sites.map((x) => `<option value="${esc(x)}">${x ? esc(x) : "Not tied to a site"} (${open.filter((t) => (t.site || "") === x).length})</option>`).join("")}</select></label>
    <label for="tp-notes">Details / notes to print at the top (optional)<textarea id="tp-notes" maxlength="2000"></textarea></label>
    <label class="tick"><input type="checkbox" id="tp-done"> <span>Include the ones already done (ticked)</span></label>
    ${formFoot(false, "Make PDF")}`,
    async () => {
      const sv = $("tp-site").value;
      const items = list.filter(
        (t) => ($("tp-done").checked || !t.done) && (sv === "*" || (t.site || "") === sv),
      );
      if (!items.length) {
        showErr("Nothing to print.");
        return;
      }
      await todoPdf(items, {
        title: $("tp-title").value.trim() || "To-do list",
        who: $("tp-for").value.trim(),
        addr: $("tp-addr").value.trim(),
        notes: $("tp-notes").value.trim(),
      });
      closeForm();
    },
    null,
  );
}
async function todoPdf(items, o) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  try {
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't load the PDF maker");
    return;
  }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const W = 210,
    M = 16;
  let y = 18;
  const clean = (t) =>
    String(t || "")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
  const need = (h) => {
    if (y + h > 282) {
      doc.addPage();
      y = 18;
    }
  };
  const text = (t, size = 10, style = "normal", indent = 0, gap = 1.6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.splitTextToSize(clean(t), W - 2 * M - indent).forEach((l) => {
      need(size * 0.45);
      doc.text(l, M + indent, y);
      y += size * 0.42;
    });
    y += gap;
  };
  doc.setFillColor(...BRGB());
  doc.rect(0, 0, W, 6, "F");
  await pdfLogo(doc, W - M, 11, 52, 24);
  text(coData().name.toUpperCase(), 9, "bold", 0, 6);
  text(o.title, 18, "bold", 0, 2);
  text(
    [
      o.who ? "For: " + o.who : "",
      o.addr,
      "Printed " +
        new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    ]
      .filter(Boolean)
      .join("  ·  "),
    10,
    "normal",
    0,
    3,
  );
  if (o.notes) text(o.notes, 9.5, "normal", 0, 3);
  items
    .slice()
    .sort(sortTodos)
    .forEach((t, i) => {
      need(10);
      doc.setDrawColor(60);
      doc.rect(M, y - 3.4, 4, 4);
      if (t.done) {
        doc.setLineWidth(0.6);
        doc.line(M + 0.8, y - 1.5, M + 1.8, y - 0.3);
        doc.line(M + 1.8, y - 0.3, M + 3.4, y - 2.8);
        doc.setLineWidth(0.2);
      }
      text(`${t.urgent ? "URGENT: " : ""}${t.text}`, 10.5, "bold", 7, 0.5);
      const sub = [t.site, t.due ? "due " + shortDay(t.due) : "", t.note]
        .filter(Boolean)
        .join(" · ");
      if (sub) text(sub, 8.8, "normal", 7, 0.5);
      y += 2.5;
    });
  try {
    await S.dl.save({
      filename:
        clean(o.title)
          .replace(/[^\w\s-]/g, "")
          .trim() + ".pdf",
      data: doc.output("blob"),
    });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
function openTodoSender(ids) {
  const team = teamIds();
  openSheet(
    `<h3 id="sheettitle">Send a to-do to trades</h3>
    <div><div class="flabel">Who to (each person gets their own copy to tick off)</div><div class="seg" id="ts-who">${team.map((id) => `<button type="button" data-v="${esc(id)}" aria-pressed="${ids.includes(id)}">${esc(nameOf(id) + roleShort(id))}</button>`).join("") || '<span class="nothing">No employees yet.</span>'}</div></div>
    <label for="ts-text">To-dos (one per line)<textarea id="ts-text" style="min-height:140px" maxlength="3000" placeholder="e.g.\nClear the rear garden ready for the skip\nBring the 110v transformer back to the yard"></textarea></label>
    <div class="grid2"><label for="ts-due">Due (optional)<input id="ts-due" type="date"></label>
      <label for="ts-site">Site (optional)<select id="ts-site"><option value="">No site</option>${siteNames()
        .map((n) => `<option>${esc(n)}</option>`)
        .join("")}</select></label></div>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="ts-urg"> Urgent</label>
    <label for="ts-note">Note (optional)<input id="ts-note" maxlength="200"></label>
    ${formFoot(false, "Send")}`,
    async () => {
      const who = [...$("ts-who").querySelectorAll('[aria-pressed="true"]')].map(
        (b) => b.dataset.v,
      );
      const lines = $("ts-text")
        .value.split("\n")
        .map((x) => x.replace(/^\s*[-•*\d.)]+\s*/, "").trim())
        .filter(Boolean);
      if (!who.length) {
        showErr("Choose at least one person.");
        return;
      }
      if (!lines.length) {
        showErr("Type at least one to-do.");
        return;
      }
      $("f-save").disabled = true;
      const base = {
        type: "todo",
        due: $("ts-due").value,
        site: $("ts-site").value,
        urgent: $("ts-urg").checked,
        note: $("ts-note").value.trim(),
        done: false,
      };
      try {
        for (const w of who)
          for (const text of lines) {
            const id = "td-" + newId();
            await S.db
              .doc("sheets/" + w + "/signoffs/" + id)
              .set(Object.assign({}, base, { text, created: Date.now() }));
          }
        closeForm();
        toast(
          `Sent ${lines.length} to-do${lines.length === 1 ? "" : "s"} to ${who.map(nameOf).join(", ")}`,
        );
        render();
      } catch (e) {
        showErr("Couldn't send. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "ts-text",
  );
  $("ts-who")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
    );
}
