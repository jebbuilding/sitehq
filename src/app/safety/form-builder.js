/* ================= FORM BUILDER: make your own forms in Setup – questions, sections, order, who fills them in ================= */
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
export { cfbView };
/* James (Nov 2026): "all the forms and filling I want to be able to adjust the layout add new tabs to make it more
   customizable for another company … could this go in setup. make there own sheets if they wanted without need you
   to create it". Setup › 📝 Your forms: + New form (or start from an example), give it a name and an icon, choose who
   fills it in (trades, the office/you) and whether it asks which job, then add questions – a heading, short or long
   text, number, date, yes/no tick, choose from a list, photo, signature – each with "must be answered", moved up or
   down or taken out. Saved in settings/cforms (everyone can read it, only the owner can change it); filled in from
   the Forms tab (safety/custom-forms.js). */
const CFB_TYPES = [
  ["head", "🔖 Section heading"],
  ["text", "✏️ Short answer"],
  ["long", "📝 Long answer"],
  ["num", "🔢 Number"],
  ["date", "📅 Date"],
  ["tick", "☑️ Yes / no tick"],
  ["choice", "🔘 Choose from a list"],
  ["photo", "📷 Photo"],
  ["sig", "✍️ Signature"],
];
const CFB_SAMPLES = {
  handover: {
    name: "Job handover",
    icon: "🔑",
    fields: [
      ["head", "The job"],
      ["text", "Work completed", 1],
      ["tick", "Site left clean and tidy", 1],
      ["tick", "Client shown how everything works", 0],
      ["choice", "Client happy?", 1, "Yes|Mostly – see notes|No – see notes"],
      ["long", "Notes", 0],
      ["photo", "Photo of the finished work", 0],
      ["sig", "Client signature", 1],
    ],
  },
  plant: {
    name: "Plant hire return",
    icon: "🚜",
    fields: [
      ["text", "Machine", 1],
      ["text", "Hire company", 0],
      ["date", "Date returned", 1],
      ["num", "Hours on the clock", 0],
      ["tick", "Cleaned before return", 1],
      ["long", "Damage or faults", 0],
      ["photo", "Photo of the machine", 0],
    ],
  },
};
/* every form, including deleted ones (kept with del: when, so a deleted form can be got back) */
const cfbAll = () => ((S.cforms || {}).forms || []).slice();
const cfbForms = () => cfbAll().filter((x) => !x.del);
const cfbOpts = (t) =>
  CFB_TYPES.map(([k, l]) => `<option value="${k}"${k === t ? " selected" : ""}>${l}</option>`).join(
    "",
  );
async function cfbSave(forms) {
  S.cforms = Object.assign({}, S.cforms || {}, { forms });
  await S.db.doc("settings/cforms").set({ forms, updated: Date.now() });
}
function cfbView(stSeg) {
  const L = cfbForms();
  $("main").innerHTML = `${stSeg}
    <div class="notice">📝 <b>Your forms.</b> Make your own sheets – a handover, a plant return, a daily check – with the questions you want. They show on the <b>📋 Forms</b> tab for whoever you choose, are saved with the job, and make a PDF on your letterhead.</div>
    <div class="actions"><button type="button" class="btn primary" id="cfb-new">+ New form</button>${Object.entries(
      CFB_SAMPLES,
    )
      .map(
        ([k, s]) =>
          `<button type="button" class="btn cfb-sample" data-k="${k}">${s.icon} Start from “${esc(s.name)}”</button>`,
      )
      .join("")}</div>
    ${
      L.length
        ? L.map(
            (f) =>
              `<div class="cfb-row"><button type="button" class="cfb-edit" data-id="${esc(f.id)}"><span class="cfb-ic">${esc(f.icon || "📝")}</span><span><b>${esc(f.name)}</b><span class="who">${(f.fields || []).filter((x) => x.type !== "head").length} questions · ${[f.who && f.who.trade ? "trades" : "", f.who && f.who.office ? "office" : ""].filter(Boolean).join(" and ") || "nobody yet"} fill${f.hidden ? " · 🙈 hidden" : ""} it in</span></span></button></div>`,
          ).join("")
        : '<div class="nothing">No forms of your own yet.</div>'
    }`;
  $("cfb-new").onclick = () => cfbEdit(null);
  document.querySelectorAll("#main .cfb-sample").forEach(
    (b) =>
      (b.onclick = () => {
        const s = CFB_SAMPLES[b.dataset.k];
        cfbEdit({
          name: s.name,
          icon: s.icon,
          who: { trade: true, office: true },
          site: true,
          fields: s.fields.map(([type, label, req, opts]) => ({
            id: newId(),
            type,
            label,
            req: !!req,
            opts: opts ? opts.split("|") : [],
          })),
        });
      }),
  );
  document.querySelectorAll("#main .cfb-edit").forEach(
    (b) =>
      (b.onclick = () => {
        const f = cfbForms().find((x) => x.id === b.dataset.id);
        if (f) cfbEdit(JSON.parse(JSON.stringify(f)));
      }),
  );
}
/* the editor: a working copy, redrawn as it changes; saved with Save */
function cfbEdit(f0) {
  const f = f0 || {
    name: "",
    icon: "📝",
    who: { trade: true, office: true },
    site: true,
    fields: [],
  };
  const isNew = !f.id;
  const draw = () => {
    openViewer(`<h2 class="cfb-h">${isNew ? "+ New form" : "✎ " + esc(f.name || "Form")}</h2>
      <div class="cfb-top"><label class="cfb-icl">Icon<input id="cfb-icon" maxlength="4" value="${esc(f.icon || "📝")}"></label><label class="cfb-nml">Name of the form<input id="cfb-name" maxlength="60" value="${esc(f.name || "")}" placeholder="e.g. Job handover"></label></div>
      <div class="cfb-who"><span class="flabel">Who fills it in</span><label class="inl"><input type="checkbox" id="cfb-wt"${f.who && f.who.trade ? " checked" : ""}> Trades</label><label class="inl"><input type="checkbox" id="cfb-wo"${f.who && f.who.office ? " checked" : ""}> The office (you)</label><label class="inl"><input type="checkbox" id="cfb-site"${f.site ? " checked" : ""}> Ask which job it's for</label><label class="inl"><input type="checkbox" id="cfb-hid"${f.hidden ? " checked" : ""}> Hide it for now</label></div>
      <div class="flabel">Questions, in order</div>
      <div class="cfb-fields">${
        f.fields.length
          ? f.fields
              .map(
                (q, i) => `<div class="cfb-q${q.type === "head" ? " cfb-qh" : ""}" data-i="${i}">
          <select class="cfb-t" aria-label="Kind of question ${i + 1}">${cfbOpts(q.type)}</select>
          <input class="cfb-l" maxlength="120" value="${esc(q.label || "")}" placeholder="${q.type === "head" ? "Section heading" : "The question"}" aria-label="Question ${i + 1}">
          ${q.type === "choice" ? `<input class="cfb-o" maxlength="300" value="${esc((q.opts || []).join(", "))}" placeholder="The choices, with commas: Yes, No, Not needed" aria-label="Choices for question ${i + 1}">` : ""}
          <span class="cfb-qb">${q.type === "head" ? "" : `<label class="inl"><input type="checkbox" class="cfb-r"${q.req ? " checked" : ""}> Must answer</label>`}<button type="button" class="iconbtn cfb-up" aria-label="Move up"${i ? "" : " disabled"}>↑</button><button type="button" class="iconbtn cfb-dn" aria-label="Move down"${i < f.fields.length - 1 ? "" : " disabled"}>↓</button><button type="button" class="iconbtn cfb-x" aria-label="Take out">✕</button></span></div>`,
              )
              .join("")
          : '<div class="who">No questions yet. Add them below.</div>'
      }</div>
      <div class="flabel">Add a question</div><div class="cfb-add">${CFB_TYPES.map(([k, l]) => `<button type="button" class="pillbtn cfb-a" data-t="${k}">${l}</button>`).join("")}</div>
      <div class="actions cfb-end"><button type="button" class="btn primary" id="cfb-save">Save the form</button>${isNew ? "" : `<button type="button" class="btn" id="cfb-dup">⧉ Copy it</button><button type="button" class="btn danger" id="cfb-del">Delete</button>`}</div>`);
    wire();
  };
  /* read what's typed back into f before any change */
  const read = () => {
    f.name = $("cfb-name").value.trim();
    f.icon = $("cfb-icon").value.trim() || "📝";
    f.who = { trade: $("cfb-wt").checked, office: $("cfb-wo").checked };
    f.site = $("cfb-site").checked;
    f.hidden = $("cfb-hid").checked;
    document.querySelectorAll("#viewer-body .cfb-q").forEach((row) => {
      const q = f.fields[+row.dataset.i];
      q.type = row.querySelector(".cfb-t").value;
      q.label = row.querySelector(".cfb-l").value.trim();
      const o = row.querySelector(".cfb-o");
      if (o)
        q.opts = o.value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      const r = row.querySelector(".cfb-r");
      q.req = !!(r && r.checked);
    });
  };
  const wire = () => {
    const root = $("viewer-body");
    const at = (b) => +b.closest(".cfb-q").dataset.i;
    root.querySelectorAll(".cfb-a").forEach(
      (b) =>
        (b.onclick = () => {
          read();
          f.fields.push({
            id: newId(),
            type: b.dataset.t,
            label: "",
            req: false,
            opts: b.dataset.t === "choice" ? ["Yes", "No"] : [],
          });
          draw();
          const ls = document.querySelectorAll("#viewer-body .cfb-l");
          if (ls.length) ls[ls.length - 1].focus();
        }),
    );
    root.querySelectorAll(".cfb-t").forEach((s) => (s.onchange = () => (read(), draw())));
    root.querySelectorAll(".cfb-up, .cfb-dn").forEach(
      (b) =>
        (b.onclick = () => {
          read();
          const i = at(b),
            j = b.classList.contains("cfb-up") ? i - 1 : i + 1;
          [f.fields[i], f.fields[j]] = [f.fields[j], f.fields[i]];
          draw();
        }),
    );
    root.querySelectorAll(".cfb-x").forEach(
      (b) =>
        (b.onclick = () => {
          read();
          f.fields.splice(at(b), 1);
          draw();
        }),
    );
    $("cfb-save").onclick = async () => {
      read();
      if (!f.name) return toast("Give the form a name");
      if (!f.fields.some((q) => q.type !== "head")) return toast("Add at least one question");
      const bad = f.fields.find((q) => q.type !== "head" && !q.label);
      if (bad) return toast("Every question needs its words");
      const L = cfbAll();
      if (!f.id) f.id = "cf" + newId();
      f.updated = Date.now();
      const i = L.findIndex((x) => x.id === f.id);
      if (i >= 0) L[i] = f;
      else L.push(f);
      try {
        await cfbSave(L);
        toast("Saved – it's on the 📋 Forms tab");
        closeViewer();
        render();
      } catch (e) {
        toast("Couldn't save. Check your connection.");
      }
    };
    if ($("cfb-dup"))
      $("cfb-dup").onclick = () => {
        read();
        const c = JSON.parse(JSON.stringify(f));
        delete c.id;
        c.name = f.name + " (copy)";
        c.fields.forEach((q) => (q.id = newId()));
        cfbEdit(c);
      };
    if ($("cfb-del"))
      $("cfb-del").onclick = async (e) => {
        const b = e.currentTarget;
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Tap again to delete the form (filled-in copies are kept)";
          return;
        }
        try {
          await cfbSave(
            cfbAll().map((x) => (x.id === f.id ? Object.assign({}, x, { del: Date.now() }) : x)),
          );
          toast("Form deleted");
          closeViewer();
          render();
        } catch (er) {
          toast("Couldn't delete");
        }
      };
  };
  draw();
}
