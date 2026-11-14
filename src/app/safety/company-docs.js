/* ================= COMPANY DOCUMENTS: what a building firm should have, and the app writes the policies for it ================= */
import { bossName, coName } from "../core/company-names.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob, openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { daysTo } from "./expiry-dates.js";
import { loadJsPdf } from "./site-inductions.js";
import { sdSet } from "../sales/sales-calc.js";
export { CDOCS };
/* James, Nov 2026: "we need to be able to add documents that are tied to the company that is using the app and the
   app makes documents for the company where needed". Policies & insurance (owner) starts with a checklist of the
   documents a building firm is asked for. Each is filed in Policies & insurance like any upload (docs/*, with
   need: the checklist key) – either uploaded, or for a policy, written by the app from Company details: the company's
   name, account holder, emergency contacts and first aiders, signed with the saved signature, with a review date a
   year on. Made policies are general starting points for a small UK building firm – the wording says to check them. */
const CDOCS = (() => {
  const POLICY = "policy",
    INS = "insurance",
    OTHER = "companydoc";
  /* [key, title, where it's filed, can the app write it, why it matters] */
  const NEEDS = [
    [
      "hs",
      "Health and safety policy",
      POLICY,
      true,
      "The law needs it written down once you have 5 or more employees. Main contractors, clients, CHAS and Constructionline ask for it whatever your size.",
    ],
    [
      "env",
      "Environmental and waste policy",
      POLICY,
      true,
      "Asked for on tenders and by CHAS and Constructionline.",
    ],
    [
      "equal",
      "Equality and diversity policy",
      POLICY,
      true,
      "Asked for on tenders; shows how you treat staff and subbies fairly.",
    ],
    [
      "drugs",
      "Drugs and alcohol policy",
      POLICY,
      true,
      "Main contractors ask for it before you go on their sites.",
    ],
    ["quality", "Quality policy", POLICY, true, "Asked for by Constructionline and on tenders."],
    [
      "data",
      "Data protection (GDPR) policy",
      POLICY,
      true,
      "You keep staff and client details, so you need to say how you look after them.",
    ],
    [
      "el",
      "Employer's liability insurance certificate",
      INS,
      false,
      "The law says you must have it if you employ anyone, and staff must be able to see it – having it here counts.",
    ],
    [
      "pl",
      "Public liability insurance certificate",
      INS,
      false,
      "Clients and main contractors ask for a copy before you start.",
    ],
    [
      "waste",
      "Waste carrier registration",
      OTHER,
      false,
      "You need it to carry building waste, even your own (Environment Agency, free for your own waste).",
    ],
    [
      "accred",
      "Accreditations (CHAS, Constructionline, SafeContractor…)",
      OTHER,
      false,
      "Optional, but many main contractors and councils ask for one.",
    ],
  ];
  const have = (k) =>
    (S.policies || [])
      .filter((d) => d.need === k)
      .sort((a, b) => (b.uploaded || 0) - (a.uploaded || 0))[0];
  const yearOn = (t) => new Date(t + 365 * 864e5).toISOString().slice(0, 10);
  const longDay = (d) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  function cardHtml() {
    if (!ownerMode()) return "";
    const rows = NEEDS.map(([k, t, , make, why]) => {
      const d = have(k);
      const due = d && d.reviewBy && daysTo(d.reviewBy) < 0;
      const st = d
        ? `<span class="tag ${due ? "bad" : "ok"}">${due ? "Review due" : "✓ " + (d.made ? "Made by the app" : "Uploaded")}</span>`
        : `<span class="tag ${make || k === "el" ? "bad" : ""}">Missing</span>`;
      return `<div class="cdx-row" data-k="${k}"><div class="cdx-main"><b>${esc(t)}</b> ${st}<div class="who">${esc(why)}${d && d.reviewBy ? " · Review by " + esc(longDay(d.reviewBy)) : ""}</div></div>
        <div class="cdx-btns">${d ? `<button type="button" class="pillbtn cdx-open">Open</button>` : ""}${make ? `<button type="button" class="pillbtn ${d ? "" : "primary"} cdx-make">${d ? "✍ Make it again" : "✍ Make it for me"}</button>` : ""}<button type="button" class="pillbtn ${!d && !make ? "primary" : ""} cdx-up">⬆ ${d ? "Upload a new one" : "Upload yours"}</button></div></div>`;
    }).join("");
    const missing = NEEDS.filter(([k]) => !have(k)).length;
    return `<details class="card cdx-card" data-id="__cdx" ${S.open.has("__cdx") || missing > 4 ? "open" : ""}><summary><div class="nm">📋 Company documents<small>${missing ? missing + " of " + NEEDS.length + " still to add" : "All in place"}</small></div></summary>
      <div class="cardbody"><div class="who">What a building firm is asked for. Upload your own, or let the app write a policy from your company details – it's signed with your saved signature and filed in Company policies for everyone to read. Check the wording suits how you work.</div>${rows}</div></details>`;
  }
  function wire() {
    const card = document.querySelector(".cdx-card");
    if (!card) return;
    card.ontoggle = () => {
      if (card.open) S.open.add("__cdx");
      else S.open.delete("__cdx");
    };
    card.querySelectorAll(".cdx-row").forEach((r) => {
      const k = r.dataset.k;
      const n = NEEDS.find((x) => x[0] === k);
      const o = r.querySelector(".cdx-open");
      if (o)
        o.onclick = () => {
          const d = have(k);
          if (d) openFile(d.assetId, d.fileName || d.title, d.contentType);
        };
      const m = r.querySelector(".cdx-make");
      if (m) m.onclick = () => makeIt(k, m);
      r.querySelector(".cdx-up").onclick = () => uploadIt(n);
    });
  }
  /* upload: a file picker (not hidden, for the iPad), filed in the right folder against this checklist item */
  function uploadIt([k, t, cat]) {
    openSheet(
      `<h3 id="sheettitle">⬆ ${esc(t)}</h3>
      <label class="btn fhpickbtn" style="position:relative">📄 Choose the file<input type="file" id="cdx-file" accept="application/pdf,image/*,.doc,.docx" style="position:absolute;inset:0;opacity:0;width:100%;height:100%"></label><span class="who" id="cdx-fn"></span>
      ${cat === INS ? `<label for="cdx-ins">Insurer (optional)<input id="cdx-ins" maxlength="80"></label><label for="cdx-no">Policy number (optional)<input id="cdx-no" maxlength="60"></label>` : ""}
      <label for="cdx-exp">${cat === POLICY ? "Review by" : "Runs out on"} (optional)<input id="cdx-exp" type="date"></label>
      ${formFoot(false, "Upload")}`,
      async () => {
        const f = ($("cdx-file").files || [])[0];
        if (!f) {
          showErr("Choose the file first.");
          return;
        }
        $("f-save").disabled = true;
        try {
          const up = await uploadFile(f, f.name);
          const exp = $("cdx-exp").value;
          await S.db.doc("docs/" + newId()).set({
            cat,
            folder: "",
            need: k,
            title: t,
            fileName: f.name,
            assetId: up.id,
            contentType: up.contentType || f.type,
            size: up.sizeBytes || f.size,
            uploaded: Date.now(),
            mustRead: cat === POLICY,
            insurer: $("cdx-ins") ? $("cdx-ins").value.trim() : "",
            policyNo: $("cdx-no") ? $("cdx-no").value.trim() : "",
            expires: cat === POLICY ? "" : exp,
            reviewBy: cat === POLICY ? exp || yearOn(Date.now()) : "",
            note: "",
          });
          closeForm();
          toast(t + " uploaded");
          render();
        } catch (e) {
          $("f-save").disabled = false;
          showErr(uploadErr(e));
        }
      },
    );
    $("cdx-file").onchange = () => {
      const f = $("cdx-file").files[0];
      $("cdx-fn").textContent = f ? " " + f.name : "";
    };
  }
  /* ---- the policies the app writes ---- */
  function bodyOf(k) {
    const c = coData();
    const C = coName(),
      O = bossName();
    const em = c.oohPhone
      ? `${c.oohName || O} on ${c.oohPhone}`
      : `${O}${c.mobile ? " on " + c.mobile : ""}`;
    const fa = c.firstAid
      ? `Our first aider(s): ${c.firstAid}.`
      : "Each site has a named first aider or appointed person, shown in the site induction.";
    const B = {
      hs: [
        [
          "Statement of intent",
          [
            `${C} will, as far as is reasonably practicable, protect the health, safety and welfare of everyone who works for us and anyone affected by our work: clients, neighbours, visitors and the public. We will meet the Health and Safety at Work etc. Act 1974, the Construction (Design and Management) Regulations 2015 and the other laws that apply to our work, and we will keep improving.`,
            `We will: plan work so it is safe before it starts; give everyone the information, instruction, training and supervision they need; provide and maintain safe equipment, tools and personal protective equipment; consult our workers and act on what they tell us; record and learn from accidents and near misses; and review this policy at least once a year.`,
          ],
        ],
        [
          "Who is responsible",
          [
            `${O} has overall responsibility for health and safety at ${C}, makes sure there is enough time and money for it, and reviews this policy.`,
            `Site supervisors and foremen run each site safely day to day: inductions, checks, keeping the site tidy and secure, and stopping unsafe work.`,
            `Everyone working for us – employees, subcontractors and agency workers – must work safely, follow the RAMS and site rules, use the PPE provided, and report hazards, accidents and near misses straight away.`,
          ],
        ],
        [
          "How we do it",
          [
            "Risk assessments and method statements (RAMS) are written for each job and briefed to everyone before work starts; everyone signs to say they have read them.",
            "Everyone has a site induction before starting on a site, and regular toolbox talks.",
            "We check workers' cards and training (CSCS and others) and keep a training record.",
            "Plant, vehicles, ladders, scaffolds and power tools are checked before use and inspected and tested as the law requires; faulty equipment is taken out of use.",
            "Hazardous substances (dust, cement, solvents and others) are assessed under COSHH; dust is controlled at source with water or extraction and the right masks.",
            "Asbestos: we check for it before any work on buildings built before 2000 and never disturb anything suspected until it has been tested.",
            "Working at height is avoided where possible and otherwise planned with the right access equipment.",
            "Welfare – toilets, washing, drinking water and somewhere to rest and eat – is in place from the first day on site.",
            "Waste is kept tidy, stored safely and taken away by registered carriers.",
            `First aid: every site has a first aid kit. ${fa}`,
            `Emergencies: call 999 first, then ${em}.`,
            "Accidents and near misses are recorded in the app; anything reportable is reported to the HSE under RIDDOR.",
          ],
        ],
      ],
      env: [
        [
          "Our commitment",
          [
            `${C} aims to do its work with as little harm to the environment and our neighbours as we can, and to meet environmental law.`,
          ],
        ],
        [
          "What we do",
          [
            "Order materials carefully to cut waste, and reuse or recycle what we can.",
            "Separate waste on site where practicable and use only registered waste carriers and permitted sites, keeping a waste transfer note for every load.",
            "Store fuels, oils and chemicals safely, away from drains, with spill kits to hand.",
            "Keep noise, dust and mud to a minimum and work within agreed hours, considering neighbours.",
            "Look after trees, wildlife and nesting birds, and stop work and get advice if protected species are found.",
            "Keep vehicles and plant maintained, switch engines off when not in use and plan journeys to cut fuel.",
          ],
        ],
        [
          "Responsibility",
          [
            `${O} is responsible for this policy. Everyone working for us is expected to follow it.`,
          ],
        ],
      ],
      equal: [
        [
          "Our commitment",
          [
            `${C} treats everyone fairly and with respect – employees, subcontractors, job applicants, clients and the public – whatever their age, disability, gender reassignment, marriage or civil partnership, pregnancy or maternity, race, religion or belief, sex or sexual orientation (Equality Act 2010).`,
          ],
        ],
        [
          "What this means",
          [
            "We recruit, pay, train and promote on ability and fairness.",
            "We will not accept harassment, bullying, discrimination or offensive behaviour, including 'banter', on site, in vans or online.",
            "We make reasonable adjustments for disabled workers and applicants.",
            `Anyone who sees or suffers unfair treatment should tell ${O}; complaints are taken seriously, kept confidential and nobody will be treated badly for raising one.`,
            "Breaking this policy may lead to disciplinary action or being removed from our sites.",
          ],
        ],
      ],
      drugs: [
        [
          "Why",
          [
            `Drugs and alcohol make building work dangerous for the person and those around them. ${C} has a duty to keep everyone safe.`,
          ],
        ],
        [
          "The rules",
          [
            "Nobody may work for us, drive our vehicles or operate plant while under the influence of alcohol or drugs, including the morning after drinking.",
            "No alcohol or illegal drugs may be brought onto our sites or into our vehicles.",
            "If you take prescribed or over-the-counter medicine that could make you drowsy or affect your work, tell your supervisor before starting.",
            "Anyone thought to be unfit for work will be stopped from working and sent home safely; it may lead to disciplinary action or being removed from our sites.",
            "Main contractors may test on their sites; we support their testing.",
          ],
        ],
        [
          "Getting help",
          [
            `If you have a problem with drink or drugs, speak to ${O} in confidence. We will support anyone who asks for help before it becomes a safety issue.`,
          ],
        ],
      ],
      quality: [
        [
          "Our commitment",
          [
            `${C} aims to do every job right first time, to the agreed specification, on time and tidily, and to leave clients happy to recommend us.`,
          ],
        ],
        [
          "How we do it",
          [
            "Agree clearly in writing what is being done, the price and the timescale before starting.",
            "Use competent, trained people and check their cards and work.",
            "Use the right materials, from reputable suppliers, to manufacturers' instructions and the Building Regulations.",
            "Check work at each stage and take photos; agree stages and extras with the client and record them in the app.",
            "Put right any defects promptly, and learn from complaints and snags.",
            "Review how we are doing at least once a year.",
          ],
        ],
        [
          "Responsibility",
          [
            `${O} is responsible for quality. Everyone working for us is responsible for the quality of their own work.`,
          ],
        ],
      ],
      data: [
        [
          "Who we are",
          [
            `${C} (${O}) is responsible for the personal information we keep about our staff, subcontractors, clients and suppliers (UK GDPR and the Data Protection Act 2018).`,
          ],
        ],
        [
          "What we do",
          [
            "We only collect what we need to do our work, pay people, keep everyone safe and meet the law (for example HMRC, CIS and health and safety records).",
            "Information is kept in our app, protected by sign-ins; each person only sees what they need.",
            "We never sell information, and only share it when we have to – for example with HMRC, our accountant, insurers or a main contractor for site safety.",
            "We keep records only as long as the law or our insurers need, then delete them.",
            `Anyone can ask to see, correct or delete what we hold about them by asking ${O}. If you are unhappy you can complain to the Information Commissioner's Office (ico.org.uk).`,
            "Any loss or leak of personal information is reported to the account holder straight away, and to the ICO within 72 hours if serious.",
          ],
        ],
      ],
    };
    return B[k];
  }
  async function makeIt(k, btn) {
    const n = NEEDS.find((x) => x[0] === k);
    const c = coData();
    if (!c.name || !c.owner) {
      toast("Fill in your company details first (Set up your account)");
      return;
    }
    if (btn) btn.disabled = true;
    toast("Writing your " + n[1].toLowerCase() + "…");
    try {
      await loadJsPdf();
      const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const W = 210,
        M = 18;
      let y = 18;
      const clean = (x) =>
        String(x || "")
          .replace(/[–—]/g, "-")
          .replace(/[‘’]/g, "'")
          .replace(/[“”]/g, '"')
          .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
      const need = (h) => {
        if (y + h > 280) {
          doc.addPage();
          y = 18;
        }
      };
      const text = (s, size = 10, style = "normal", indent = 0, gap = 1.6) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.splitTextToSize(clean(s), W - 2 * M - indent).forEach((l) => {
          need(size * 0.45);
          doc.text(l, M + indent, y);
          y += size * 0.42;
        });
        y += gap;
      };
      doc.setFillColor(...BRGB());
      doc.rect(0, 0, W, 6, "F");
      await pdfLogo(doc, W - M, 11, 52, 24);
      text(coName().toUpperCase(), 9, "bold", 0, 6);
      text(n[1], 20, "bold", 0, 2);
      const now = Date.now(),
        today = new Date(now).toISOString().slice(0, 10);
      text(`Issued ${longDay(today)} · Review by ${longDay(yearOn(now))}`, 9.5, "normal", 0, 6);
      bodyOf(k).forEach(([h, paras]) => {
        need(12);
        text(h, 12.5, "bold", 0, 2);
        paras.forEach((p) => {
          if (paras.length > 2) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            need(5);
            doc.text("-", M + 1, y);
            text(p, 10, "normal", 5, 1.4);
          } else text(p, 10, "normal", 0, 2.2);
        });
        y += 3;
      });
      /* the signing block stays together on one page */
      need(58);
      y += 4;
      text("Signed", 11, "bold", 0, 2);
      const sigId = (sdSet() || {}).sigId;
      if (sigId) {
        try {
          const blob = await getFileBlob(sigId);
          const url = await new Promise((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = () => res(null);
            fr.readAsDataURL(blob);
          });
          if (url) doc.addImage(url, url.includes("image/jpeg") ? "JPEG" : "PNG", M, y, 50, 16);
        } catch (e) {}
      }
      y += 18;
      doc.setDrawColor(150);
      doc.line(M, y, M + 70, y);
      y += 5;
      text(`${bossName()}, for ${coName()}`, 10, "bold", 0, 1);
      text(`Date: ${longDay(today)}`, 9.5, "normal", 0, 1);
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(clean(`${coName()} · ${n[1]} · page ${i} of ${pages}`), M, 290);
        doc.setTextColor(0);
      }
      const fn = `${n[1]} - ${clean(coName())
        .replace(/[^\w\s-]/g, "")
        .trim()}.pdf`;
      const blob = doc.output("blob");
      const up = await uploadFile(blob, fn);
      const old = have(k);
      const rec = {
        cat: n[2],
        folder: "",
        need: k,
        made: true,
        title: n[1],
        fileName: fn,
        assetId: up.id,
        contentType: "application/pdf",
        size: up.sizeBytes || blob.size,
        uploaded: now,
        mustRead: true,
        reviewBy: yearOn(now),
        expires: "",
        insurer: "",
        policyNo: "",
        note: "Written by the app from the company details",
      };
      /* making it again files a new copy, so everyone is asked to read it again; the app's old copy goes to Deleted items */
      await S.db.doc("docs/" + newId()).set(rec);
      if (old && old.made) await S.db.doc("docs/" + old.id).delete();
      toast(n[1] + " made and filed in Company policies");
      render();
    } catch (e) {
      if (btn) btn.disabled = false;
      toast("Couldn't make it: " + uploadErr(e));
    }
  }
  return { cardHtml, wire, makeIt, NEEDS };
})();
