/* ================= RFIs: questions to the architect, engineer or building control on a job – numbered, sent, answered and closed off ================= */
import { $, addDays, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob, openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { printBlob } from "../files/print.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { siteFull, siteLabel } from "./job-details.js";
import { same } from "./project-pages.js";
export { rfiCode, rfiHtml, rfiNoticeHtml, rfiOver, rfiWire };
/* An RFI (request for information) is a written question about the design, asked before the work it holds up: what it
   refers to (a drawing, the spec, a beam), the question, James's suggested answer (a suggestion gets a quicker yes),
   who it is to and when the answer is needed, and whether it holds up work or may cost or delay. Each job numbers its
   own (RFI-001, 002…). Sent as a PDF on the letterhead with its photos and drawings (📤 on the iPad shares them to
   Mail); the answer is written in with any files that came back, then closed off – a closed one is read-only unless
   reopened. Open ones show on the site, overdue answers in the morning briefing, and raised / answered days in the
   site diary. Owner-only: todos/rfi-{id} (kind "rfi"): site, no, subject, ref, question, suggest, to, role, email,
   raised, due, holds, cost, time, files [{assetId, fileName, contentType}], status open / answered / closed, answer,
   answeredAt (date), answerBy, answerFiles, closedAt, created, updated. */
const RFI_ROLES = [
  "Architect",
  "Structural engineer",
  "Building control",
  "Client",
  "Supplier / manufacturer",
  "Other",
];
const rfiAll = (site) =>
  (S.rfis || [])
    .filter((r) => !site || same(r.site, site))
    .sort((a, b) => (a.no || 0) - (b.no || 0));
const rfiCode = (r) => "RFI-" + String(r.no || 0).padStart(3, "0");
const rfiOver = (r) => r.status === "open" && r.due && r.due < iso(new Date());
const rfiState = (r) =>
  r.status === "closed"
    ? ["Closed", "ok"]
    : r.status === "answered"
      ? ["Answered", "ok"]
      : rfiOver(r)
        ? ["Overdue", "bad"]
        : ["Waiting", "day"];
/* five working days from a date */
function rfiDueFrom(d) {
  let x = parse(d),
    n = 0;
  while (n < 5) {
    x = addDays(x, 1);
    if (x.getDay() && x.getDay() !== 6) n++;
  }
  return iso(x);
}
/* the RFIs on a site: a short warning for the overview */
function rfiNoticeHtml(site) {
  const L = rfiAll(site).filter((r) => r.status === "open");
  if (!L.length) return "";
  const od = L.filter(rfiOver).length;
  return `<button type="button" class="notice ${od ? "warn" : ""} rfi-note" id="rfi-go"><b>❓ ${L.length} RFI${L.length === 1 ? "" : "s"} waiting for an answer</b>${od ? ` · ${od} overdue` : ""}<span class="who"> – tap to see them</span></button>`;
}
/* the site's RFI register */
function rfiHtml(site) {
  const L = rfiAll(site);
  const f = S.f.rfiF || "live";
  const show = L.filter((r) =>
    f === "all" ? true : f === "closed" ? r.status === "closed" : r.status !== "closed",
  );
  return `<div class="rfi-wrap"><div class="who">Questions to the architect, engineer or building control about this job. Each is numbered, sent as a PDF, and kept with its answer.</div>
    <div class="actions"><button type="button" class="btn primary" id="rfi-new">❓ New RFI</button>${L.length ? `<button type="button" class="btn" id="rfi-reg">📄 Register as a PDF</button>` : ""}</div>
    ${
      L.length
        ? `<div class="seg" id="rfi-f">${[
            ["live", "Open & answered"],
            ["closed", "Closed"],
            ["all", "All"],
          ]
            .map(
              ([k, l]) =>
                `<button type="button" data-f="${k}" aria-pressed="${f === k}">${l}</button>`,
            )
            .join("")}</div>`
        : ""
    }
    ${
      show.length
        ? show
            .slice()
            .reverse()
            .map((r) => {
              const [st, cls] = rfiState(r);
              return `<button type="button" class="incrow rfi-row" data-id="${esc(r.id)}"><span><b>${esc(rfiCode(r))} · ${esc(r.subject || "Question")}</b><br><span class="who">To ${esc(r.to || r.role || "–")}${r.role && r.to ? " (" + esc(r.role) + ")" : ""} · raised ${esc(shortDay(r.raised))}${r.status === "open" && r.due ? " · answer by " + esc(shortDay(r.due)) : ""}${r.status !== "open" && r.answeredAt ? " · answered " + esc(shortDay(r.answeredAt)) : ""}${r.holds ? " · ⛔ holding up work" : ""}</span></span><span class="tag ${cls}">${st}</span></button>`;
            })
            .join("")
        : L.length
          ? `<div class="who" style="margin:8px 0">None here.</div>`
          : `<div class="empty"><strong>No RFIs yet</strong>When something on the drawings or spec isn't clear, ask it here – numbered, dated and kept with the answer.</div>`
    }</div>`;
}
function rfiWire(site) {
  if ($("rfi-new")) $("rfi-new").onclick = () => rfiEdit(site, null);
  if ($("rfi-reg")) $("rfi-reg").onclick = () => rfiRegister(site);
  document.querySelectorAll("#rfi-f button").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.rfiF = b.dataset.f;
        render();
      }),
  );
  document.querySelectorAll(".rfi-row").forEach(
    (b) =>
      (b.onclick = () => {
        const r = (S.rfis || []).find((x) => x.id === b.dataset.id);
        if (r) rfiView(r);
      }),
  );
}
const rfiFilesHtml = (L) =>
  (L || []).length
    ? `<div class="rfi-files">${L.map((f, i) => `<button type="button" class="btn rfi-file" data-i="${i}">📎 ${esc(f.fileName || "File")}</button>`).join("")}</div>`
    : "";
/* uploads picked files (photos made smaller) */
async function rfiUpload(files) {
  const out = [];
  for (const f of files) {
    const blob = /^image\//.test(f.type) ? await shrinkImage(f, 2000) : f;
    const up = await uploadFile(blob, f.name);
    out.push({ assetId: up.id, fileName: f.name, contentType: up.contentType || f.type || "" });
  }
  return out;
}
/* a new RFI, or change an open one */
function rfiEdit(site, r0) {
  const r = r0 || {};
  const today = iso(new Date());
  const people = [
    ...new Set(
      (S.rfis || [])
        .filter((x) => x.to)
        .map((x) => x.to + "|" + (x.email || "") + "|" + (x.role || "")),
    ),
  ];
  let picked = [];
  openSheet(
    `<h3 id="sheettitle">❓ ${r0 ? esc(rfiCode(r0)) : "New RFI"}</h3>
    <div class="who">${esc(siteLabel(site))}</div>
    <label for="rfi-subj">Subject<input id="rfi-subj" maxlength="100" value="${esc(r.subject || "")}" placeholder="e.g. Beam B1 bearing on the party wall"></label>
    <label for="rfi-ref">What it refers to (optional)<input id="rfi-ref" maxlength="120" value="${esc(r.ref || "")}" placeholder="e.g. Drawing 101 rev B, section A-A; spec clause 4.2"></label>
    <label for="rfi-q">The question<textarea id="rfi-q" rows="4" maxlength="2000" placeholder="Say exactly what isn't clear, and what you've found on site.">${esc(r.question || "")}</textarea></label>
    <label for="rfi-sug">Your suggested answer (optional – gets a quicker reply)<textarea id="rfi-sug" rows="2" maxlength="1000" placeholder="e.g. Suggest a 440 × 215 × 100 padstone each end, as on the other side.">${esc(r.suggest || "")}</textarea></label>
    <div class="grid2"><label for="rfi-role">To<select id="rfi-role">${RFI_ROLES.map((x) => `<option${(r.role || "Architect") === x ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
    <label for="rfi-to">Name<input id="rfi-to" maxlength="80" list="rfi-people" value="${esc(r.to || "")}" placeholder="e.g. Test Architects"></label></div>
    <datalist id="rfi-people">${people.map((p) => `<option value="${esc(p.split("|")[0])}">`).join("")}</datalist>
    <div class="grid2"><label for="rfi-email">Their email (optional)<input id="rfi-email" type="email" maxlength="120" value="${esc(r.email || "")}"></label>
    <label for="rfi-due">Answer needed by<input id="rfi-due" type="date" value="${esc(r.due || rfiDueFrom(r.raised || today))}"></label></div>
    <label class="inl"><input type="checkbox" id="rfi-holds"${r.holds ? " checked" : ""}> ⛔ It's holding up the work</label>
    <div class="grid2"><label class="inl"><input type="checkbox" id="rfi-cost"${r.cost ? " checked" : ""}> 💷 May cost more</label><label class="inl"><input type="checkbox" id="rfi-time"${r.time ? " checked" : ""}> ⏱ May add time</label></div>
    <div class="flabel">Photos and drawings</div>
    ${r0 ? rfiFilesHtml(r.files) : ""}
    <label class="btn" style="cursor:pointer">📎 Add photos or drawings<input type="file" id="rfi-pick" class="fpick" accept="application/pdf,image/*" multiple aria-label="Add photos or drawings to the RFI"></label>
    <div class="who" id="rfi-picked"></div>
    ${formFoot(!!r0, r0 ? "Save" : "Save the RFI")}`,
    async () => {
      const subject = $("rfi-subj").value.trim(),
        question = $("rfi-q").value.trim();
      if (!subject || !question) return showErr("Give it a subject and write the question");
      $("f-save").disabled = true;
      try {
        const files = (r.files || []).concat(await rfiUpload(picked));
        const no = r0 ? r0.no : Math.max(0, ...rfiAll(site).map((x) => x.no || 0)) + 1;
        const rec = Object.assign({}, r0 || {}, {
          site,
          no,
          subject,
          ref: $("rfi-ref").value.trim(),
          question,
          suggest: $("rfi-sug").value.trim(),
          role: $("rfi-role").value,
          to: $("rfi-to").value.trim(),
          email: $("rfi-email").value.trim(),
          raised: r.raised || today,
          due: $("rfi-due").value || rfiDueFrom(today),
          holds: $("rfi-holds").checked,
          cost: $("rfi-cost").checked,
          time: $("rfi-time").checked,
          files,
          status: r.status || "open",
        });
        const out = await rfiSave(rec);
        closeForm();
        toast(r0 ? "Saved" : rfiCode(out) + " saved – now send it");
        render();
        if (!r0) rfiView(out);
      } catch (e) {
        $("f-save").disabled = false;
        showErr(uploadErr(e));
      }
    },
    "rfi-subj",
  );
  $("rfi-pick").onchange = (e) => {
    picked = picked.concat([...(e.target.files || [])]);
    e.target.value = "";
    $("rfi-picked").textContent = picked.length
      ? "To add: " + picked.map((f) => f.name).join(" · ")
      : "";
  };
  $("rfi-to").oninput = () => {
    const m = people.find((p) => p.split("|")[0] === $("rfi-to").value.trim());
    if (m) {
      const [, em, ro] = m.split("|");
      if (em && !$("rfi-email").value) $("rfi-email").value = em;
      if (ro) $("rfi-role").value = ro;
    }
  };
  document.querySelectorAll(".rfi-file").forEach((b) => {
    const f = (r.files || [])[+b.dataset.i];
    if (f) b.onclick = () => openFile(f.assetId, f.fileName, f.contentType);
  });
  if (r0 && $("f-del"))
    armDelete(async () => {
      await S.db.doc("todos/" + r0.id).delete();
      S.rfis = (S.rfis || []).filter((x) => x.id !== r0.id);
      closeForm();
      render();
    });
}
async function rfiSave(r) {
  const id = r.id || "rfi-" + newId();
  const rec = Object.assign({}, r, { kind: "rfi", updated: Date.now() });
  delete rec.id;
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  const out = Object.assign({ id }, rec);
  S.rfis = (S.rfis || []).filter((x) => x.id !== id).concat([out]);
  return out;
}
/* one RFI: everything about it, send it, write in the answer, close it */
function rfiView(r) {
  const [st, cls] = rfiState(r);
  const flags = [
    r.holds && "⛔ Holding up the work",
    r.cost && "💷 May cost more",
    r.time && "⏱ May add time",
  ].filter(Boolean);
  openViewer(`<div class="rfi-view"><h2>${esc(rfiCode(r))} · ${esc(r.subject || "")} <span class="tag ${cls}">${st}</span></h2>
    <div class="who">${esc(siteLabel(r.site))} · raised ${esc(shortDay(r.raised))} · to ${esc(r.to || "–")}${r.role ? " (" + esc(r.role) + ")" : ""}${r.status === "open" && r.due ? " · answer needed by " + esc(shortDay(r.due)) : ""}</div>
    ${flags.length ? `<div class="who">${flags.map(esc).join(" · ")}</div>` : ""}
    ${r.ref ? `<div class="rfi-sec"><b>Refers to</b><div>${esc(r.ref)}</div></div>` : ""}
    <div class="rfi-sec"><b>Question</b><div class="rfi-txt">${esc(r.question || "")}</div></div>
    ${r.suggest ? `<div class="rfi-sec"><b>Suggested answer</b><div class="rfi-txt">${esc(r.suggest)}</div></div>` : ""}
    ${(r.files || []).length ? `<div class="rfi-sec"><b>Attached</b>${rfiFilesHtml(r.files)}</div>` : ""}
    ${r.status !== "open" ? `<div class="rfi-sec rfi-ans"><b>Answer${r.answerBy ? " from " + esc(r.answerBy) : ""}${r.answeredAt ? " · " + esc(shortDay(r.answeredAt)) : ""}</b><div class="rfi-txt">${esc(r.answer || "")}</div>${(r.answerFiles || []).length ? `<div class="rfi-afiles">${(r.answerFiles || []).map((f, i) => `<button type="button" class="btn rfi-afile" data-i="${i}">📎 ${esc(f.fileName || "File")}</button>`).join("")}</div>` : ""}</div>` : ""}
    ${r.status === "closed" ? `<div class="notice">🔒 Closed off ${esc(shortDay(iso(new Date(r.closedAt || Date.now()))))}. Reopen it to change anything.</div>` : ""}
    <div class="actions">
      <button type="button" class="btn primary" id="rfi-send">📤 Send the RFI</button>
      <button type="button" class="btn" id="rfi-pdf">📄 PDF</button>
      ${r.status === "open" ? `<button type="button" class="btn" id="rfi-answer">✍️ Write in the answer</button><button type="button" class="btn" id="rfi-edit">✏️ Change</button>` : ""}
      ${r.status === "answered" ? `<button type="button" class="btn primary" id="rfi-close">✓ Close it off</button><button type="button" class="btn" id="rfi-answer">✍️ Change the answer</button>` : ""}
      ${r.status === "closed" ? `<button type="button" class="btn" id="rfi-reopen">↩ Reopen</button>` : ""}
    </div></div>`);
  document.querySelectorAll(".rfi-view .rfi-file").forEach((b) => {
    const f = (r.files || [])[+b.dataset.i];
    if (f) b.onclick = () => openFile(f.assetId, f.fileName, f.contentType);
  });
  document.querySelectorAll(".rfi-view .rfi-afile").forEach((b) => {
    const f = (r.answerFiles || [])[+b.dataset.i];
    if (f) b.onclick = () => openFile(f.assetId, f.fileName, f.contentType);
  });
  $("rfi-send").onclick = () => rfiSend(r);
  $("rfi-pdf").onclick = () => rfiPdfSave(r);
  if ($("rfi-edit"))
    $("rfi-edit").onclick = () => {
      closeViewer();
      rfiEdit(r.site, r);
    };
  if ($("rfi-answer"))
    $("rfi-answer").onclick = () => {
      closeViewer();
      rfiAnswer(r);
    };
  const setSt = async (status) => {
    const out = await rfiSave(
      Object.assign({}, r, { status, closedAt: status === "closed" ? Date.now() : null }),
    );
    toast(status === "closed" ? rfiCode(r) + " closed off" : rfiCode(r) + " reopened");
    closeViewer();
    render();
    rfiView(out);
  };
  if ($("rfi-close")) $("rfi-close").onclick = () => setSt("closed");
  if ($("rfi-reopen")) $("rfi-reopen").onclick = () => setSt(r.answer ? "answered" : "open");
}
/* the answer that came back */
function rfiAnswer(r) {
  let picked = [];
  openSheet(
    `<h3 id="sheettitle">✍️ Answer to ${esc(rfiCode(r))}</h3>
    <div class="who">${esc(r.subject || "")}</div>
    <label for="rfa-txt">The answer<textarea id="rfa-txt" rows="5" maxlength="3000" placeholder="Copy in their reply, or what they said on the phone.">${esc(r.answer || "")}</textarea></label>
    <div class="grid2"><label for="rfa-by">From<input id="rfa-by" maxlength="80" value="${esc(r.answerBy || r.to || "")}"></label>
    <label for="rfa-date">Date<input id="rfa-date" type="date" value="${esc(r.answeredAt || iso(new Date()))}"></label></div>
    ${rfiFilesHtml(r.answerFiles)}
    <label class="btn" style="cursor:pointer">📎 Add their drawings or letter<input type="file" id="rfa-pick" class="fpick" accept="application/pdf,image/*" multiple aria-label="Add files that came with the answer"></label>
    <div class="who" id="rfa-picked"></div>
    ${formFoot(false, "Save the answer")}`,
    async () => {
      const answer = $("rfa-txt").value.trim();
      if (!answer) return showErr("Write in the answer");
      $("f-save").disabled = true;
      try {
        const answerFiles = (r.answerFiles || []).concat(await rfiUpload(picked));
        const out = await rfiSave(
          Object.assign({}, r, {
            answer,
            answerBy: $("rfa-by").value.trim(),
            answeredAt: $("rfa-date").value || iso(new Date()),
            answerFiles,
            status: r.status === "closed" ? "closed" : "answered",
          }),
        );
        closeForm();
        toast("Answer saved – close it off when it's sorted");
        render();
        rfiView(out);
      } catch (e) {
        $("f-save").disabled = false;
        showErr(uploadErr(e));
      }
    },
    "rfa-txt",
  );
  $("rfa-pick").onchange = (e) => {
    picked = picked.concat([...(e.target.files || [])]);
    e.target.value = "";
    $("rfa-picked").textContent = picked.length
      ? "To add: " + picked.map((f) => f.name).join(" · ")
      : "";
  };
}
const rfiClean = (t) =>
  String(t || "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°×]/g, "");
/* the RFI as a PDF on the letterhead */
async function rfiPdfBlob(r) {
  await loadJsPdf();
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const LH = await lhFrame();
  const W = 210,
    M = 16,
    CW = W - 2 * M,
    co = coData(),
    bottom = (LH.bot || 282) - 8;
  let y = LH.top || 18;
  if (!LH.pics) {
    doc.setFillColor(...BRGB());
    doc.rect(0, 0, W, 6, "F");
    await pdfLogo(doc, W - M, 10, 50, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(rfiClean(co.name.toUpperCase()), M, y);
    y += 9;
  }
  const need = (h) => {
    if (y + h > bottom) {
      doc.addPage();
      y = LH.top || 18;
    }
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Request for information " + rfiCode(r), M, y);
  y += 9;
  doc.setFontSize(10.5);
  [
    ["Job", r.site],
    ["Subject", r.subject],
    ["To", [r.to, r.role].filter(Boolean).join(" – ")],
    ["From", [co.owner, co.name].filter(Boolean).join(", ")],
    ["Date raised", r.raised ? parse(r.raised).toLocaleDateString("en-GB") : ""],
    ["Answer needed by", r.due ? parse(r.due).toLocaleDateString("en-GB") : ""],
    ["Refers to", r.ref],
    [
      "Impact",
      [r.holds && "Holding up the work", r.cost && "May cost more", r.time && "May add time"]
        .filter(Boolean)
        .join(", ") || "None expected",
    ],
  ]
    .filter((x) => x[1])
    .forEach(([k, v]) => {
      const L = doc.splitTextToSize(rfiClean(v), CW - 42);
      need(L.length * 5 + 1);
      doc.setFont("helvetica", "bold");
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(L, M + 42, y);
      y += L.length * 5 + 1.5;
    });
  const block = (h, t) => {
    if (!t) return;
    y += 3;
    need(14);
    doc.setDrawColor(200);
    doc.line(M, y - 3, W - M, y - 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(h, M, y + 2);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.splitTextToSize(rfiClean(t), CW).forEach((l) => {
      need(5.2);
      doc.text(l, M, y);
      y += 5.2;
    });
  };
  block("Question", r.question);
  block("Suggested answer", r.suggest);
  if ((r.files || []).length)
    block("Attached", (r.files || []).map((f) => "- " + f.fileName).join("\n"));
  if (r.status !== "open" && r.answer)
    block(
      "Answer" +
        (r.answerBy ? " from " + r.answerBy : "") +
        (r.answeredAt ? " (" + parse(r.answeredAt).toLocaleDateString("en-GB") + ")" : ""),
      r.answer,
    );
  else
    block(
      "Answer",
      "Please reply in writing by " +
        (r.due ? parse(r.due).toLocaleDateString("en-GB") : "return") +
        ", quoting " +
        rfiCode(r) +
        ".",
    );
  lhFinish(doc, LH);
  const name =
    rfiCode(r) +
    " " +
    rfiClean(r.subject || "")
      .slice(0, 40)
      .replace(/[^A-Za-z0-9 -]/g, "") +
    ".pdf";
  return { blob: doc.output("blob"), name };
}
async function rfiPdfSave(r) {
  let x;
  try {
    x = await rfiPdfBlob(r);
  } catch (e) {
    toast("Couldn't make the PDF. Check your connection.");
    return;
  }
  if (!S.dl) {
    printBlob(x.blob, x.name);
    return;
  }
  try {
    await S.dl.save({ filename: x.name, data: x.blob });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
/* send it: the PDF and its files shared to Mail on the iPad, else an email to fill in and the PDF saved */
async function rfiSend(r) {
  const subject = `${rfiCode(r)}: ${r.subject || ""} – ${r.site}`;
  const body = `Hello${r.to ? " " + r.to.split(" ")[0] : ""},\n\nPlease see the attached request for information ${rfiCode(r)} for ${r.site}.\n\n${r.question || ""}${r.suggest ? "\n\nSuggested answer: " + r.suggest : ""}\n\nCould you reply by ${r.due ? parse(r.due).toLocaleDateString("en-GB") : "return"}, quoting ${rfiCode(r)}.\n\nThanks,\n${coData().owner || ""}\n${coData().name || ""}`;
  let x = null;
  try {
    x = await rfiPdfBlob(r);
  } catch (e) {}
  const files = [];
  if (x) files.push(new File([x.blob], x.name, { type: "application/pdf" }));
  for (const f of r.files || []) {
    try {
      const b = await getFileBlob(f.assetId);
      files.push(new File([b], f.fileName || "file", { type: f.contentType || b.type || "" }));
    } catch (e) {}
  }
  if (navigator.share && files.length && (!navigator.canShare || navigator.canShare({ files }))) {
    try {
      await navigator.share({ title: subject, text: body, files });
      toast(rfiCode(r) + " shared – it's waiting for an answer");
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  if (x && S.dl) {
    try {
      await S.dl.save({ filename: x.name, data: x.blob });
    } catch (e) {}
  }
  window.open(
    `mailto:${encodeURIComponent(r.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + "\n\n(The RFI PDF is saved – attach it to this email.)")}`,
    "_blank",
  );
}
/* the job's RFI register as one PDF */
async function rfiRegister(site) {
  const L = rfiAll(site);
  try {
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't load the PDF maker. Check your connection.");
    return;
  }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297,
    M = 12;
  let y = 16;
  doc.setFillColor(...BRGB());
  doc.rect(0, 0, W, 5, "F");
  await pdfLogo(doc, W - M, 8, 40, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(rfiClean("RFI register – " + siteFull(site)), M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(rfiClean(coData().name + " · " + new Date().toLocaleDateString("en-GB")), M, y);
  y += 8;
  const cols = [
    ["No.", 18],
    ["Subject", 70],
    ["To", 45],
    ["Raised", 22],
    ["Needed by", 22],
    ["Answered", 22],
    ["Status", 20],
    ["Answer", 54],
  ];
  const head = () => {
    doc.setFont("helvetica", "bold");
    let x = M;
    cols.forEach(([h, w]) => {
      doc.text(h, x, y);
      x += w;
    });
    y += 2;
    doc.line(M, y, W - M, y);
    y += 4;
    doc.setFont("helvetica", "normal");
  };
  head();
  const d = (s) => (s ? parse(s).toLocaleDateString("en-GB") : "");
  L.forEach((r) => {
    const cells = [
      rfiCode(r),
      r.subject,
      r.to || r.role,
      d(r.raised),
      d(r.due),
      d(r.answeredAt),
      rfiState(r)[0],
      r.answer || "",
    ];
    const lines = cells.map((c, i) => doc.splitTextToSize(rfiClean(c), cols[i][1] - 3).slice(0, 4));
    const h = Math.max(...lines.map((l) => l.length)) * 4 + 2;
    if (y + h > 200) {
      doc.addPage();
      y = 16;
      head();
    }
    let x = M;
    lines.forEach((l, i) => {
      doc.text(l, x, y);
      x += cols[i][1];
    });
    y += h;
    doc.setDrawColor(225);
    doc.line(M, y - 3, W - M, y - 3);
  });
  const name =
    "RFI register " +
    rfiClean(site)
      .replace(/[^A-Za-z0-9 -]/g, "")
      .slice(0, 40) +
    ".pdf";
  const blob = doc.output("blob");
  if (!S.dl) {
    printBlob(blob, name);
    return;
  }
  try {
    await S.dl.save({ filename: name, data: blob });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
