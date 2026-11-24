/* ================= NEIGHBOURS: letters to the neighbours and party wall notice dates for a job ================= */
import { $, addDays, esc, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { pgRec } from "../planner/programme.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { siteLabel } from "../sites/job-details.js";
import { dlgEsc } from "../survey/glass-colours.js";
export { NBR };
/* James (Nov 2026, "neighbour and party wall notices"): on a job, 🏘 Neighbours lists the houses either side (or behind).
   For each: ✉️ a letter telling them about the work (dates, hours, who to ring) as a PDF, marked sent; and, if the
   Party Wall Act applies, which notice (line of junction s.1 – 1 month, party structure s.3 – 2 months, digging near
   their foundations s.6 – 1 month), the date it was served, and their answer. It works out the earliest the work can
   start and when they must reply by (14 days – no answer counts as a dispute, so a surveyor is needed), warns if the
   job starts too soon, and Today lists anything waiting. The notice PDF is a plain generic notice with a reply slip;
   the client (the building owner) signs it. Kept on the client record (todos/{client}: neighbours[], nbWorks, nbStart). */
const NBR = (() => {
  const PW = {
    s1: ["New wall on the boundary (line of junction) – s.1", 1, "1"],
    s3: ["Work to a shared wall (party structure) – s.3", 2, "3"],
    s6: ["Digging near their foundations (adjacent excavation) – s.6", 1, "6"],
  };
  const REPLY = [
    ["", "No answer yet"],
    ["consent", "Agreed (consent)"],
    ["dissent", "Not agreed – surveyors needed"],
  ];
  const addM = (d, m) => {
    const x = parse(d);
    x.setMonth(x.getMonth() + m);
    return iso(x);
  };
  /* earliest the work can start, the reply-by date, and where it stands */
  function pwState(n) {
    if (!n.pw || !PW[n.pw]) return null;
    if (!n.served) return { tag: "Notice not served yet", warn: true };
    const earliest = addM(n.served, PW[n.pw][1]);
    const replyBy = iso(addDays(parse(n.served), 14));
    const today = iso(new Date());
    if (n.reply === "consent") return { earliest, replyBy, tag: "Agreed", ok: true };
    if (n.reply === "dissent")
      return {
        earliest,
        replyBy,
        tag: "Not agreed – appoint surveyors (party wall award)",
        warn: true,
      };
    if (today > replyBy)
      return {
        earliest,
        replyBy,
        tag: "No answer in 14 days – counts as a dispute: a surveyor is needed",
        warn: true,
      };
    return { earliest, replyBy, tag: "Waiting for their answer – by " + shortDay(replyBy) };
  }
  function startOf(c) {
    if (c.nbStart) return c.nbStart;
    try {
      const pr = c.site && pgRec(c.site);
      if (pr && pr.start) return pr.start;
    } catch (e) {}
    return "";
  }
  function issues(c) {
    const out = [];
    const st = startOf(c);
    const today = iso(new Date());
    (c.neighbours || []).forEach((n) => {
      const who = n.name || n.addr || "a neighbour";
      const s = pwState(n);
      if (s && s.warn) out.push({ n, t: who + ": " + s.tag });
      if (s && s.earliest && st && st < s.earliest && n.reply !== "consent")
        out.push({
          n,
          t: `${who}: the job starts ${shortDay(st)} but the notice runs to ${shortDay(s.earliest)}`,
          bad: true,
        });
      if (!n.letter && st && st >= today && st <= iso(addDays(new Date(), 14)))
        out.push({ n, t: who + ": letter not sent yet – the job starts " + shortDay(st) });
    });
    return out;
  }
  function statusTxt(c) {
    const L = c.neighbours || [];
    if (!L.length) return "";
    const n = issues(c).length;
    return L.length + (n ? " · " + n + " to sort" : "");
  }
  function letterText(c, n) {
    const co = coData();
    const st = startOf(c);
    return `Dear ${n.name || "Neighbour"},

We're writing to let you know that we'll be doing building work at ${c.address || siteLabel(c.site || "")}${c.name ? " for " + c.name : ""}${st ? ", starting on " + shortDay(st) : " soon"}.

The work: ${c.nbWorks || c.project || "building work"}.

We work 8am to 5:30pm, Monday to Friday. We'll keep noise, dust and parking to a minimum and keep the area tidy. If deliveries or skips need space outside, we'll let you know first.

If you have any worries at all, or anything we do affects you, please ring ${co.owner || "us"}${co.mobile ? " on " + co.mobile : ""} and we'll sort it straight away.

Thank you for your patience.

${co.owner || ""}
${co.name || ""}`;
  }
  const clean = (t) =>
    String(t == null ? "" : t)
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/•/g, "-")
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
  async function startDoc() {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 20;
    if (!LH.pics) {
      doc.setFillColor(...BRGB());
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
    }
    let y = LH.top || 34;
    const bot = LH.pics ? LH.bot : 280;
    const P = {
      doc,
      LH,
      M,
      CW: W - 2 * M,
      get y() {
        return y;
      },
      set y(v) {
        y = v;
      },
      need(h) {
        if (y + h > bot) {
          doc.addPage();
          y = LH.top || 22;
        }
      },
      para(t, size = 10.5, bold = false, gap = 5) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(17, 17, 17);
        clean(t)
          .split("\n")
          .forEach((ln) => {
            (ln ? doc.splitTextToSize(ln, W - 2 * M) : [""]).forEach((l) => {
              P.need(gap + 1);
              doc.text(l, M, y);
              y += gap;
            });
          });
      },
      title(t) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...BRGB());
        P.need(10);
        doc.text(clean(t), M, y);
        y += 8;
      },
      line(label) {
        P.need(12);
        doc.setDrawColor(120, 120, 120);
        doc.line(M + 42, y, M + 140, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(clean(label), M, y);
        y += 10;
      },
    };
    return P;
  }
  const fnOf = (t) => t.replace(/[^\w\s-]/g, "").trim() + ".pdf";
  async function letterPdf(c, n, text) {
    const P = await startDoc();
    P.para(shortDay(iso(new Date())), 10);
    P.y += 3;
    P.para([n.name, n.addr].filter(Boolean).join("\n"), 10.5);
    P.y += 6;
    P.para(text);
    lhFinish(P.doc, P.LH);
    return {
      blob: P.doc.output("blob"),
      fn: fnOf("Letter to neighbour " + (n.addr || n.name || "")),
    };
  }
  async function noticePdf(c, n) {
    const P = await startDoc();
    const k = PW[n.pw];
    const st = startOf(c);
    /* served today if it isn't yet – the notice is being made to hand over now */
    const served = n.served || iso(new Date());
    const earliest = addM(served, k[1]);
    const from = st && st > earliest ? st : earliest;
    const long = (d) =>
      parse(d).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    P.title("Party Wall etc. Act 1996 – Notice under section " + k[2]);
    P.para(k[0].replace(/ – s\.\d$/, ""), 10, true);
    P.y += 3;
    P.para(`To (adjoining owner): ${n.name || "The owner"}\n${n.addr || ""}`);
    P.y += 2;
    P.para(`From (building owner): ${c.name || ""}\n${c.address || siteLabel(c.site || "")}`);
    P.y += 2;
    P.para(
      `Notice is given that the building owner intends to carry out the following work, under section ${k[2]} of the Party Wall etc. Act 1996:`,
    );
    P.y += 1;
    P.para(c.nbWorks || c.project || "", 10.5, true);
    P.y += 2;
    P.para(
      `The work is planned to start on or after ${long(from)}, which is at least ${k[1]} month${k[1] === 1 ? "" : "s"} after this notice is served. Drawings are attached where needed.`,
    );
    P.para(
      `Please reply within 14 days of getting this notice, using the slip below. If you don't reply within 14 days, a dispute is taken to have arisen and surveyors will need to be appointed.`,
    );
    P.y += 2;
    P.para(
      `Contractor: ${coData().name || ""}${coData().mobile ? ", " + coData().mobile : ""}`,
      9.5,
    );
    P.y += 6;
    P.line("Signed (building owner)");
    P.line("Date served");
    P.doc.text(long(served), P.M + 44, P.y - 11);
    P.y += 6;
    P.need(80);
    P.doc.setLineDashPattern([2, 2], 0);
    P.doc.line(P.M, P.y, P.M + P.CW, P.y);
    P.doc.setLineDashPattern([], 0);
    P.y += 8;
    P.title("Reply to the notice");
    P.para(
      `To ${c.name || "the building owner"}, about the notice dated ${long(served)} for ${c.address || siteLabel(c.site || "")}.`,
    );
    P.y += 2;
    P.para(
      `Tick one:\n[  ]  I/We agree (consent) to the work.\n[  ]  I/We do not agree (dissent) and agree to appoint an Agreed Surveyor: ____________________\n[  ]  I/We do not agree (dissent) and appoint my/our own surveyor: ____________________`,
    );
    P.y += 6;
    P.line("Signed (adjoining owner)");
    P.line("Name");
    P.line("Date");
    lhFinish(P.doc, P.LH);
    return {
      blob: P.doc.output("blob"),
      fn: fnOf(`Party wall notice s${k[2]} ${n.addr || n.name || ""}`),
    };
  }
  async function save(c, patch) {
    await S.db.doc("todos/" + c.id).update(Object.assign({}, patch, { updated: Date.now() }));
    const i = (S.clients || []).findIndex((x) => x.id === c.id);
    if (i >= 0) S.clients[i] = Object.assign({}, S.clients[i], patch);
  }
  function open(c0) {
    const c = JSON.parse(JSON.stringify((S.clients || []).find((x) => x.id === c0.id) || c0));
    c.neighbours = c.neighbours || [];
    const read = () => {
      c.nbWorks = $("nbr-works").value.trim();
      c.nbStart = $("nbr-start").value;
      document.querySelectorAll(".nbr-it").forEach((el) => {
        const n = c.neighbours.find((x) => x.id === el.dataset.id);
        if (!n) return;
        const v = (cl) => (el.querySelector(cl) ? el.querySelector(cl).value : "");
        Object.assign(n, {
          name: v(".nbr-name").trim(),
          addr: v(".nbr-addr").trim(),
          letter: v(".nbr-let"),
          pw: v(".nbr-pw"),
          served: v(".nbr-srv"),
          reply: v(".nbr-rep"),
        });
      });
    };
    const draw = () => {
      const st = startOf(c);
      const iss = issues(c);
      openSheet(
        `<h3 id="sheettitle">🏘 Neighbours – ${esc(c.name || "")}</h3>
        <div class="who">Let the neighbours know before you start, and serve party wall notices in time. The usual notice is 1 month (2 months for work to a shared wall); they have 14 days to answer. If in doubt, ask a party wall surveyor.</div>
        <label for="nbr-works">The work (goes in the letter and the notice)<textarea id="nbr-works" maxlength="800" placeholder="e.g. Single-storey rear extension, with a steel beam into the shared wall">${esc(c.nbWorks || c.project || "")}</textarea></label>
        <label for="nbr-start">Work starts<input id="nbr-start" type="date" value="${esc(st)}"></label>
        ${iss.length ? `<div class="notice nbr-warn">${iss.map((x) => `<div>${x.bad ? "⛔" : "⚠️"} ${esc(x.t)}</div>`).join("")}</div>` : ""}
        <div class="nbr-list">${c.neighbours
          .map((n) => {
            const s = pwState(n);
            return `<div class="card nbr-it" data-id="${esc(n.id)}">
            <div class="grid2"><label>Name<input class="nbr-name" maxlength="80" value="${esc(n.name || "")}" placeholder="e.g. Mr and Mrs Lee"></label><label>Address<input class="nbr-addr" maxlength="120" value="${esc(n.addr || "")}" placeholder="e.g. 6 Rolle Road"></label></div>
            <div class="nbr-row"><button type="button" class="btn nbr-lpdf">✉️ Letter (PDF)</button><label class="nbr-d">Letter sent<input class="nbr-let" type="date" value="${esc(n.letter || "")}"></label></div>
            <label>Party wall<select class="nbr-pw"><option value="">Doesn't apply</option>${Object.entries(
              PW,
            )
              .map(
                ([k, v]) =>
                  `<option value="${k}"${n.pw === k ? " selected" : ""}>${esc(v[0])}</option>`,
              )
              .join("")}</select></label>
            ${
              n.pw
                ? `<div class="grid2"><label>Notice served<input class="nbr-srv" type="date" value="${esc(n.served || "")}"></label><label>Their answer<select class="nbr-rep">${REPLY.map(([k, l]) => `<option value="${k}"${(n.reply || "") === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div>
              ${s ? `<div class="nbr-st ${s.warn ? "nbr-bad" : s.ok ? "nbr-ok" : ""}">${esc(s.tag)}${s.earliest ? ` · work can start from <b>${esc(shortDay(s.earliest))}</b>` : ""}</div>` : ""}
              <button type="button" class="btn nbr-npdf">📜 Notice (PDF)</button>`
                : ""
            }
            <button type="button" class="linkdanger nbr-x">✕ Take off</button></div>`;
          })
          .join("")}</div>
        <button type="button" class="btn" id="nbr-add">+ Add a neighbour</button>
        ${formFoot(false, "Save")}`,
        async () => {
          read();
          try {
            await save(c, { neighbours: c.neighbours, nbWorks: c.nbWorks, nbStart: c.nbStart });
            closeForm();
            toast("Neighbours saved");
          } catch (e) {
            showErr("Couldn't save. Try again.");
          }
        },
      );
      const redraw = () => {
        read();
        draw();
      };
      $("nbr-add").onclick = () => {
        read();
        c.neighbours.push({
          id: newId(),
          name: "",
          addr: "",
          letter: "",
          pw: "",
          served: "",
          reply: "",
        });
        draw();
      };
      document.querySelectorAll(".nbr-it").forEach((el) => {
        const n = () => c.neighbours.find((x) => x.id === el.dataset.id);
        el.querySelector(".nbr-pw").onchange = redraw;
        if (el.querySelector(".nbr-srv")) el.querySelector(".nbr-srv").onchange = redraw;
        if (el.querySelector(".nbr-rep")) el.querySelector(".nbr-rep").onchange = redraw;
        el.querySelector(".nbr-x").onclick = (e) => {
          const b = e.currentTarget;
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure? Tap again";
            return;
          }
          read();
          c.neighbours = c.neighbours.filter((x) => x.id !== el.dataset.id);
          draw();
        };
        el.querySelector(".nbr-lpdf").onclick = () => {
          read();
          const x = n();
          openLetter(c, x, () => {
            if (!x.letter) x.letter = iso(new Date());
            draw();
          });
        };
        if (el.querySelector(".nbr-npdf"))
          el.querySelector(".nbr-npdf").onclick = async () => {
            read();
            const x = n();
            if (!c.nbWorks) return showErr("Say what the work is first – it goes in the notice.");
            toast("Making the notice…");
            const out = await noticePdf(c, x);
            try {
              await S.dl.save({ filename: out.fn, data: out.blob });
            } catch (e) {}
            if (!x.served) {
              x.served = iso(new Date());
              draw();
            }
          };
      });
    };
    /* the letter: its words to check first, then the PDF */
    function openLetter(c, n, after) {
      const box = document.createElement("div");
      box.className = "dimask";
      box.innerHTML = `<div class="dimbox nbr-dlg" role="dialog" aria-label="Letter to the neighbour"><b>✉️ Letter to ${esc(n.name || n.addr || "the neighbour")}</b><textarea id="nbr-ltx" maxlength="4000">${esc(letterText(c, n))}</textarea>
        <div class="actions"><button type="button" class="btn" id="nbr-lc">Cancel</button><button type="button" class="btn primary" id="nbr-lgo">📄 Make the letter</button></div></div>`;
      document.body.appendChild(box);
      dlgEsc(box);
      $("nbr-lc").onclick = () => box.remove();
      $("nbr-lgo").onclick = async () => {
        const t = $("nbr-ltx").value;
        box.remove();
        toast("Making the letter…");
        const out = await letterPdf(c, n, t);
        try {
          await S.dl.save({ filename: out.fn, data: out.blob });
        } catch (e) {}
        after();
      };
    }
    draw();
  }
  /* Today: anything to sort on live jobs */
  function todayCard() {
    if (!S.owner) return "";
    const L = (S.clients || [])
      .filter((c) => (c.neighbours || []).length && !["done", "lost"].includes(c.stage))
      .map((c) => ({ c, iss: issues(c) }))
      .filter((x) => x.iss.length);
    if (!L.length) return "";
    return `<div class="card nbr-today"><div class="cardbody"><b>🏘 Neighbours to sort</b><div class="who">Letters and party wall notices.</div>${L.map((x) => `<button type="button" class="incrow nbr-go" data-id="${esc(x.c.id)}"><span><b>${esc(x.c.name)}</b><br><span class="who">${x.iss.map((i) => esc(i.t)).join("<br>")}</span></span><span>›</span></button>`).join("")}</div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".nbr-go").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.id);
          if (c) open(c);
        }),
    );
  }
  return { open, statusTxt, issues, pwState, todayCard, wireToday, letterText };
})();
