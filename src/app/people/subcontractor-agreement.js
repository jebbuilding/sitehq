/* ================= SUBCONTRACTOR AGREEMENT: fill in, both sign on the device (or print to sign), saved in their personal documents ================= */
import { $, esc, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { pdfShow } from "../drawing/paving.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { pdfSavedBar, printBlob } from "../files/print.js";
import { coData } from "../owner/company-details.js";
import { auditLog } from "../owner/deletion-record.js";
import { nameOf } from "../owner/owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "../safety/site-inductions.js";
import { myName } from "../survey/door-window-survey.js";
export { SUBAG };
const SUBAG = (() => {
  const CIS_OPTS = [
    ["20", "CIS registered – 20% deduction"],
    ["30", "Not CIS verified – 30% deduction"],
    ["0", "Gross payment status – no deduction"],
    ["na", "Not CIS (not construction work / limited company paid gross)"],
  ];
  const RATE_OPTS = [
    ["day", "Day rate"],
    ["hour", "Hourly rate"],
    ["price", "Agreed price per job (quoted each job)"],
    ["mixed", "Price per job, day rate for extras"],
  ];
  const PAY_OPTS = [
    ["week", "Weekly – timesheet / invoice in by Monday, paid Friday"],
    ["fortnight", "Every two weeks"],
    ["14", "14 days from invoice"],
    ["30", "30 days from invoice"],
  ];
  const last = () => {
    let best = null;
    Object.values(S.data.signoffs || {}).forEach((L) =>
      (L || []).forEach((x) => {
        if (
          x.type === "persdoc" &&
          x.kind === "subagree" &&
          x.agree &&
          (!best || (x.created || 0) > (best.created || 0))
        )
          best = x;
      }),
    );
    return best && best.agree;
  };
  function defaults(id) {
    const d = (S.team[id] && S.team[id].details) || {};
    const L = last() || {};
    const et = d.empType || "";
    return {
      name: d.fullName || nameOf(id),
      company: d.company || "",
      address: [d.address, d.postcode].filter(Boolean).join(", "),
      email: d.email || "",
      mobile: d.mobile || "",
      utr: d.utr || "",
      trade: d.trade || "",
      cis: et === "cis" ? "20" : et === "selfemp" ? "na" : L.cis || "20",
      vat: "no",
      vatNo: "",
      start: iso(new Date()),
      end: "",
      work: d.trade
        ? `${d.trade} work on JEB Building Services sites, as asked for and agreed job by job.`
        : "Building work on JEB Building Services sites, as asked for and agreed job by job.",
      rateType: L.rateType || "day",
      rate: "",
      payTerms: L.payTerms || "week",
      plCover: L.plCover || "2,000,000",
      insurer: "",
      policy: "",
      insExp: "",
      tools:
        L.tools ||
        "Own hand and power tools (PAT tested, 110V on site). JEB supplies materials and plant unless agreed otherwise.",
      ppe:
        L.ppe ||
        "Own boots, hi-vis, gloves, eye and ear protection. JEB supplies task-specific PPE (e.g. RPE, harnesses) when needed.",
      defects: L.defects || "12",
      notice: L.notice || "7",
      retention: L.retention || "0",
      extra: L.extra || "",
    };
  }
  const lbl = (o, k) => (o.find((x) => x[0] === k) || [])[1] || "";
  /* the clauses – plain English, written for a small building firm (not legal advice) */
  function clauses(a) {
    const co = coData();
    const C = co.name || "JEB Building Services";
    const rateTxt = {
      day: `a day rate of £${a.rate || "____"} for an 8-hour day (part days pro rata)`,
      hour: `an hourly rate of £${a.rate || "____"}`,
      price: "the price agreed in writing (text, email or in the app) before each job starts",
      mixed: `the price agreed for each job, with any extra work at a day rate of £${a.rate || "____"}`,
    }[a.rateType];
    const payTxt = {
      week: "weekly: send your timesheet or invoice by Monday for the week before, and it's due that day; the final date for payment is the Friday of that week",
      fortnight:
        "every two weeks: send your invoice at the end of each fortnight and it's due when received; the final date for payment is 7 days later",
      ["14"]:
        "the payment is due when your invoice is received and the final date for payment is 14 days after that",
      ["30"]:
        "the payment is due when your invoice is received and the final date for payment is 30 days after that",
    }[a.payTerms];
    return [
      [
        "1. Who this is between",
        `This agreement is between ${C}${co.address ? " of " + co.address : ""} ("the Contractor") and ${a.name}${a.company ? " trading as " + a.company : ""}${a.address ? " of " + a.address : ""} ("the Subcontractor"). It starts on ${a.start ? shortDayLong(a.start) : "the date signed"} and ${a.end ? "ends on " + shortDayLong(a.end) : "carries on until either side ends it under clause 15"}.`,
      ],
      [
        "2. The work",
        `${a.work} Each job will be agreed before it starts (where, what and the price or rate). The Subcontractor does the work to a good standard, in line with the drawings, specifications, Building Regulations and manufacturers' instructions, and as agreed with the Contractor.`,
      ],
      [
        "3. Self-employed",
        `The Subcontractor is self-employed, not an employee or worker of the Contractor. The Subcontractor decides how the work is done (within the job's requirements and site rules), may turn down work, can send a suitably skilled and approved substitute at their own cost, provides their own tools, and is responsible for their own tax and National Insurance. There is no holiday pay, sick pay or pension from the Contractor.`,
      ],
      [
        "4. Construction Industry Scheme (CIS)",
        a.cis === "na"
          ? `The parties agree CIS deductions don't apply to these payments. If HMRC says otherwise, the Contractor will make the deductions the law requires.`
          : `The Contractor will verify the Subcontractor with HMRC and deduct CIS tax at the rate HMRC gives (${lbl(CIS_OPTS, a.cis).replace(/^[^–]+– /, "")}${a.utr ? "; UTR " + a.utr : ""}). Deductions are taken from labour only, not materials, and a monthly CIS statement is given.`,
      ],
      [
        "5. Price and payment",
        `The Contractor pays ${rateTxt}. Payments are made ${payTxt}. ${a.vat === "yes" ? "The Subcontractor is VAT registered" + (a.vatNo ? " (" + a.vatNo + ")" : "") + "; the domestic reverse charge for construction services applies where it should." : "The Subcontractor is not VAT registered and will say straight away if that changes."}${+a.retention ? ` A retention of ${a.retention}% is held and paid at the end of the defects period.` : " No retention is held."}`,
      ],
      [
        "6. Payment notices",
        `For each payment the Contractor will send a payment notice within 5 days of the due date saying what will be paid and how it was worked out. If the Contractor intends to pay less, a pay-less notice will be sent no later than 1 day before the final date for payment. Where this agreement doesn't cover something the Housing Grants, Construction and Regeneration Act 1996 requires, the Scheme for Construction Contracts applies.`,
      ],
      [
        "7. Extra work and changes",
        `Extra or changed work is only paid if the Contractor agrees it before it is done (a text, email or note in the app is fine). Price it first unless it's day-rate work.`,
      ],
      [
        "8. Timesheets and site sign-in",
        `The Subcontractor signs in and out of site (in the app or the site sign-in book) and keeps their timesheet or job records up to date. These are used for payment, roll calls and health and safety.`,
      ],
      [
        "9. Health and safety",
        `The Subcontractor follows CDM 2015, the site rules, the construction phase plan, risk assessments and method statements, attends the site induction and toolbox talks, works safely, reports accidents, near misses and hazards straight away, and must not be on site under the influence of alcohol or drugs. Any card or ticket needed for the work (e.g. CSCS) must be kept in date.`,
      ],
      ["10. Tools, plant and PPE", `${a.tools} ${a.ppe}`],
      [
        "11. Quality and defects",
        `Work found to be faulty because of the Subcontractor's workmanship is put right at the Subcontractor's own cost, within a reasonable time, for ${a.defects || "12"} months after the job is finished. If it isn't, the Contractor can have it put right and take the reasonable cost from money owed, after giving written notice.`,
      ],
      [
        "12. Insurance",
        `The Subcontractor keeps public liability insurance of at least £${a.plCover || "2,000,000"} for any one claim${a.insurer ? ` (${a.insurer}${a.policy ? ", policy " + a.policy : ""}${a.insExp ? ", renews " + shortDayLong(a.insExp) : ""})` : ""} and gives a copy of the certificate before starting and when it renews. If the Subcontractor employs anyone, they also keep employer's liability insurance.`,
      ],
      [
        "13. Clients, conduct and confidentiality",
        `On site the Subcontractor works for the Contractor and is polite and tidy, respecting the client's home and neighbours. They won't price or take on work directly from the Contractor's clients they met through the Contractor for 12 months after the last job for that client, unless the Contractor agrees. Client details, prices and plans are kept private.`,
      ],
      [
        "14. Personal information",
        `The Contractor keeps the Subcontractor's details (contact, ID, insurance, CIS, cards and training) for running the work, paying them and meeting legal duties, and handles them under UK GDPR. They're kept securely and only for as long as needed.`,
      ],
      [
        "15. Ending this agreement",
        `Either side can end this agreement by giving ${a.notice || "7"} days' notice in writing (a text or email is fine). Either side can end it straight away if the other seriously breaks it (for example a serious safety breach, dishonesty, or repeatedly poor work after being asked to put it right). Work done up to the end is paid for under clause 5.`,
      ],
      [
        "16. Disagreements",
        `Both sides will try to sort out any disagreement by talking first. Either side can refer a dispute to adjudication at any time under the Scheme for Construction Contracts. This agreement is under the law of England and Wales.`,
      ],
      ...(a.extra ? [["17. Anything else agreed", a.extra]] : []),
      [
        (a.extra ? "18" : "17") + ". Whole agreement",
        `This, together with each job agreed under it, is the whole agreement. Any change must be agreed in writing by both sides.`,
      ],
    ];
  }
  const shortDayLong = (d) => {
    try {
      return new Date(d + "T12:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return d;
    }
  };
  async function buildPdf(a, sig) {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const W = 210,
      H = 297,
      M = 16,
      CW = W - 2 * M,
      co = coData(),
      BR = BRGB();
    let y = 0;
    const clean = (t) =>
      String(t || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\x20-\x7E£]/g, "");
    const T = (t, x, yy, sz, st, col, al) => {
      doc.setFont("helvetica", st || "normal");
      doc.setFontSize(sz);
      doc.setTextColor(...(col || [25, 22, 21]));
      doc.text(clean(t), x, yy, al ? { align: al } : undefined);
    };
    const need = (h) => {
      if (y + h > H - 16) {
        doc.addPage();
        y = 18;
        return true;
      }
      return false;
    };
    doc.setFillColor(...BR);
    doc.rect(0, 0, W, 4, "F");
    await pdfLogo(doc, W - M, 8, 36, 16);
    T((co.name || "").toUpperCase(), M, 13, 8, "bold", BR);
    T("Subcontractor agreement", M, 21, 16, "bold");
    T(
      `${a.name}${a.company ? " (" + a.company + ")" : ""}${a.trade ? " · " + a.trade : ""}`,
      M,
      27,
      10,
      "normal",
      [90, 80, 80],
    );
    y = 34;
    /* key details box */
    const kv = [
      ["Subcontractor", a.name + (a.company ? ", " + a.company : "")],
      ["Address", a.address || "-"],
      ["Contact", [a.mobile, a.email].filter(Boolean).join(" · ") || "-"],
      ["UTR", a.utr || "-"],
      ["CIS", lbl(CIS_OPTS, a.cis)],
      ["Pay", lbl(RATE_OPTS, a.rateType) + (a.rate && a.rateType !== "price" ? " £" + a.rate : "")],
      ["Payment terms", lbl(PAY_OPTS, a.payTerms)],
      ["Public liability", "£" + (a.plCover || "2,000,000") + (a.insurer ? " · " + a.insurer : "")],
      ["Starts", a.start ? shortDayLong(a.start) : "-"],
      ["Notice", (a.notice || "7") + " days"],
    ];
    const boxH = Math.ceil(kv.length / 2) * 6 + 4;
    doc.setFillColor(248, 245, 243);
    doc.rect(M, y, CW, boxH, "F");
    kv.forEach(([l, v], i) => {
      const x = M + 3 + (i % 2) * (CW / 2),
        yy = y + 5 + Math.floor(i / 2) * 6;
      T(l, x, yy, 7.5, "bold", [110, 100, 100]);
      T(doc.splitTextToSize(clean(v), CW / 2 - 32)[0] || "", x + 27, yy, 8.5);
    });
    y += boxH + 6;
    for (const [h, body] of clauses(a)) {
      const ls = doc.splitTextToSize(clean(body), CW);
      need(6 + ls.length * 4.1);
      T(h, M, y, 9.5, "bold", BR);
      y += 4.6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 28, 27);
      ls.forEach((l) => {
        if (need(4.1)) 0;
        doc.text(l, M, y);
        y += 4.1;
      });
      y += 2.4;
    }
    /* signatures */
    need(62);
    y += 2;
    T("Signed", M, y, 11, "bold");
    y += 4;
    const box = async (x, who, role, s) => {
      doc.setDrawColor(200, 192, 190);
      doc.setLineWidth(0.3);
      doc.rect(x, y, CW / 2 - 4, 48);
      T(role, x + 3, y + 5, 8, "bold", [110, 100, 100]);
      T("Name: " + ((s && s.name) || who || ""), x + 3, y + 11, 9);
      if (s && s.sig) {
        try {
          const im = await new Promise((r) => {
            const i = new Image();
            i.onload = () => r([i.naturalWidth, i.naturalHeight]);
            i.onerror = () => r([420, 150]);
            i.src = s.sig;
          });
          let ih = 20,
            iw = (ih * im[0]) / im[1];
          if (iw > CW / 2 - 12) {
            iw = CW / 2 - 12;
            ih = (iw * im[1]) / im[0];
          }
          doc.addImage(s.sig, "PNG", x + 3, y + 14, iw, ih);
        } catch (e) {}
      } else {
        doc.setDrawColor(150, 140, 140);
        doc.line(x + 3, y + 34, x + CW / 2 - 8, y + 34);
        T("Signature", x + 3, y + 38, 7, "normal", [130, 120, 120]);
      }
      T(
        "Date: " + (s && s.at ? new Date(s.at).toLocaleDateString("en-GB") : "______________"),
        x + 3,
        y + 44,
        9,
      );
    };
    await box(M, co.owner || "", `For ${co.name || "the Contractor"}`, sig && sig.c);
    await box(M + CW / 2 + 4, a.name, "Subcontractor", sig && sig.s);
    y += 54;
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      T(
        `${co.name} · Subcontractor agreement · ${a.name} · page ${i} of ${n}`,
        M,
        H - 8,
        7,
        "normal",
        [130, 120, 120],
      );
    }
    return doc.output("blob");
  }
  /* ---- the form ---- */
  function open(id) {
    if (!ownerMode()) return;
    const a = defaults(id);
    const o = (L, v) =>
      L.map(
        ([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${esc(l)}</option>`,
      ).join("");
    openSheet(
      `<h3 id="sheettitle">📝 Subcontractor agreement – ${esc(nameOf(id))}</h3><div class="who">Filled in from their details${last() ? " and the terms you used last time" : ""}. Check it, then you both sign it on this device – or print it to sign on paper. It's saved in their documents, where they can read it too.</div>
    <div class="flabel">Them</div><div class="grid2"><label for="sa-name">Full name<input id="sa-name" maxlength="80" value="${esc(a.name)}" required></label><label for="sa-co">Trading name (optional)<input id="sa-co" maxlength="80" value="${esc(a.company)}"></label></div>
    <label for="sa-addr">Address<input id="sa-addr" maxlength="160" value="${esc(a.address)}"></label>
    <div class="grid2"><label for="sa-mob">Mobile<input id="sa-mob" type="tel" maxlength="30" value="${esc(a.mobile)}"></label><label for="sa-email">Email<input id="sa-email" type="email" maxlength="120" value="${esc(a.email)}"></label></div>
    <div class="grid2"><label for="sa-trade">Trade<input id="sa-trade" maxlength="60" value="${esc(a.trade)}"></label><label for="sa-utr">UTR<input id="sa-utr" maxlength="20" inputmode="numeric" value="${esc(a.utr)}"></label></div>
    <label for="sa-cis">CIS<select id="sa-cis">${o(CIS_OPTS, a.cis)}</select></label>
    <div class="grid2"><label for="sa-vat">VAT registered?<select id="sa-vat"><option value="no">No</option><option value="yes">Yes</option></select></label><label for="sa-vatno" id="sa-vatnol">VAT number<input id="sa-vatno" maxlength="20"></label></div>
    <div class="flabel">The work and pay</div><label for="sa-work">Work they'll do<textarea id="sa-work" maxlength="600" style="min-height:60px">${esc(a.work)}</textarea></label>
    <div class="grid2"><label for="sa-rt">How they're paid<select id="sa-rt">${o(RATE_OPTS, a.rateType)}</select></label><label for="sa-rate" id="sa-ratel">Rate £<input id="sa-rate" inputmode="decimal" maxlength="10" value="${esc(a.rate)}" placeholder="e.g. 200"></label></div>
    <label for="sa-pay">When they're paid<select id="sa-pay">${o(PAY_OPTS, a.payTerms)}</select></label>
    <div class="grid2"><label for="sa-start">Starts<input id="sa-start" type="date" value="${esc(a.start)}"></label><label for="sa-end">Ends (blank = ongoing)<input id="sa-end" type="date"></label></div>
    <div class="flabel">Insurance</div><div class="grid2"><label for="sa-pl">Public liability at least £<input id="sa-pl" maxlength="14" value="${esc(a.plCover)}"></label><label for="sa-ins">Their insurer (optional)<input id="sa-ins" maxlength="60"></label></div>
    <div class="grid2"><label for="sa-pol">Policy number (optional)<input id="sa-pol" maxlength="40"></label><label for="sa-insx">Renews (optional)<input id="sa-insx" type="date"></label></div>
    <details class="pmdet"><summary>More terms (tools, PPE, defects, notice, retention)</summary>
      <label for="sa-tools">Tools and materials<textarea id="sa-tools" maxlength="400">${esc(a.tools)}</textarea></label>
      <label for="sa-ppe">PPE<textarea id="sa-ppe" maxlength="400">${esc(a.ppe)}</textarea></label>
      <div class="grid2"><label for="sa-def">Defects period (months)<input id="sa-def" inputmode="numeric" maxlength="3" value="${esc(a.defects)}"></label><label for="sa-not">Notice to end (days)<input id="sa-not" inputmode="numeric" maxlength="3" value="${esc(a.notice)}"></label></div>
      <label for="sa-ret">Retention %<input id="sa-ret" inputmode="decimal" maxlength="4" value="${esc(a.retention)}"></label>
      <label for="sa-extra">Anything else agreed (optional)<textarea id="sa-extra" maxlength="1200">${esc(a.extra)}</textarea></label></details>
    <div class="who">A plain-English agreement for a small building firm, including the payment notice rules the Construction Act needs. It isn't legal advice – for anything unusual, have it checked.</div>
    <div class="actions"><button type="button" class="btn" id="sa-prev">👀 Preview PDF</button></div>
    ${formFoot(false, "Next: sign")}`,
      async () => {
        const a2 = read();
        if (!a2.name) {
          showErr("Add their name");
          return;
        }
        closeForm();
        signDlg(id, a2);
      },
      "sa-name",
    );
    const sync = () => {
      $("sa-vatnol").hidden = $("sa-vat").value !== "yes";
      $("sa-ratel").hidden = $("sa-rt").value === "price";
    };
    $("sa-vat").onchange = sync;
    $("sa-rt").onchange = sync;
    sync();
    $("sa-prev").onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        const bl = await buildPdf(read(), null);
        pdfShow(bl, "Subcontractor agreement - " + read().name + ".pdf");
      } catch (x) {
        toast("Couldn't make the PDF");
      }
      b.disabled = false;
    };
  }
  function read() {
    const v = (k) => ($("sa-" + k) ? $("sa-" + k).value.trim() : "");
    return {
      name: v("name"),
      company: v("co"),
      address: v("addr"),
      mobile: v("mob"),
      email: v("email"),
      trade: v("trade"),
      utr: v("utr"),
      cis: v("cis"),
      vat: v("vat"),
      vatNo: v("vatno"),
      work: v("work"),
      rateType: v("rt"),
      rate: v("rate").replace(/[£,\s]/g, ""),
      payTerms: v("pay"),
      start: v("start"),
      end: v("end"),
      plCover: v("pl").replace(/[£\s]/g, ""),
      insurer: v("ins"),
      policy: v("pol"),
      insExp: v("insx"),
      tools: v("tools"),
      ppe: v("ppe"),
      defects: v("def"),
      notice: v("not"),
      retention: v("ret"),
      extra: v("extra"),
    };
  }
  /* ---- both sign ---- */
  function signDlg(id, a) {
    const co = coData();
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "130";
    d.innerHTML = `<div class="dimbox" style="width:min(560px,100%);max-height:92vh;overflow:auto"><b>✍️ Sign the agreement</b><div class="who">Both of you sign below. Or print it and sign on paper, then add the signed copy to their documents.</div>
    <label class="inl" style="margin-top:8px"><input type="checkbox" class="sg-ok"> I've read the agreement and agree to it</label>
    <div class="flabel">${esc(co.owner || myName())} for ${esc(co.name || "the Contractor")}</div><div class="checkhead"><span class="who">Sign with your finger</span><button type="button" class="pillbtn sg-c1">Clear</button></div><canvas class="sigpad sg-p1" aria-label="Your signature"></canvas>
    <div class="flabel">${esc(a.name)} (subcontractor)</div><div class="checkhead"><span class="who">Hand the device to them</span><button type="button" class="pillbtn sg-c2">Clear</button></div><canvas class="sigpad sg-p2" aria-label="Subcontractor signature"></canvas>
    <div class="dimbtns" style="flex-wrap:wrap"><button type="button" class="btn sg-x">Cancel</button><button type="button" class="btn sg-print">🖨 Print to sign</button><button type="button" class="btn primary sg-go">✍ Sign and save</button></div></div>`;
    document.body.appendChild(d);
    const p1 = sigPad(d.querySelector(".sg-p1")),
      p2 = sigPad(d.querySelector(".sg-p2"));
    d.querySelector(".sg-c1").onclick = () => p1.clear();
    d.querySelector(".sg-c2").onclick = () => p2.clear();
    d.querySelector(".sg-x").onclick = () => d.remove();
    d.querySelector(".sg-print").onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        const bl = await buildPdf(a, null);
        await save(id, a, bl, false);
        d.remove();
        printBlob(bl, "Subcontractor agreement - " + a.name + ".pdf");
      } catch (x) {
        toast("Couldn't make it. Check your connection.");
      }
      b.disabled = false;
    };
    d.querySelector(".sg-go").onclick = async () => {
      if (!d.querySelector(".sg-ok").checked) {
        toast("Tick the box to agree");
        return;
      }
      if (!p1.drawn || !p2.drawn) {
        toast("You both need to sign");
        return;
      }
      const b = d.querySelector(".sg-go");
      b.disabled = true;
      b.textContent = "Saving…";
      const now = Date.now();
      try {
        const sig = {
          c: { name: co.owner || myName(), sig: p1.data(), at: now },
          s: { name: a.name, sig: p2.data(), at: now },
        };
        const bl = await buildPdf(a, sig);
        await save(id, a, bl, true);
        d.remove();
        toast("Agreement signed and saved");
        pdfSavedBar(bl, "Subcontractor agreement - " + a.name + " (signed).pdf");
        render();
      } catch (x) {
        console.error(x);
        b.disabled = false;
        b.textContent = "✍ Sign and save";
        toast("Couldn't save. Check your connection.");
      }
    };
  }
  async function save(id, a, blob, signed) {
    const fn =
      `Subcontractor agreement - ${a.name}${signed ? " (signed)" : " (to sign)"}.pdf`.replace(
        /[^\w\s&(),.-]/g,
        "",
      );
    const up = await uploadFile(blob, fn);
    await S.db.doc("sheets/" + id + "/signoffs/pd-" + newId()).set({
      type: "persdoc",
      kind: "subagree",
      label: "",
      number: a.utr || "",
      expires: a.end || "",
      note: signed
        ? "Signed by both on " + new Date().toLocaleDateString("en-GB")
        : "Printed to sign – add the signed copy",
      types: ["application/pdf"],
      names: [fn],
      photos: [up.id],
      byOwner: true,
      created: Date.now(),
      agree: a,
      signed: !!signed,
    });
    try {
      await auditLog(
        "Subcontractor agreement",
        a.name,
        signed ? "Signed on the device by both" : "Printed to sign on paper",
        { who: id },
      );
    } catch (e) {}
  }
  return { open, buildPdf };
})();
