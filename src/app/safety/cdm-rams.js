/* ================= CDM RAMS: the RAMS a job's ticked hazards need, made and filed from the CDM page ================= */
import { bossName, coName } from "../core/company-names.js";
import { $, esc, iso, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { newId, submitJob } from "../files/outbox.js";
import { allTeam } from "../owner/owner.js";
import { RA_PERMITS, RA_PPE, RA_WHO, openRaForm, raPdf } from "./rams.js";
import { same } from "../sites/project-pages.js";
export { CDMRA };
/* James, Nov 2026: "we should have a box to auto make the rams … without going into the rams page but places them in
   there". Each hazard on the CDM page belongs to a kind of work with its own RAMS (several hazards can share one).
   The box under the hazards lists which this job needs, which the site already has (its own risk assessments, or
   uploaded RAMS whose name matches) and which are still to make; 📝 Make the RAMS writes each missing one – hazards
   with likelihood and severity, control measures, PPE, permit and a step-by-step method – saves it as a risk
   assessment (editable in Health & safety) and files its PDF in the site's RAMS for the trades to read and sign.
   Opening the CDM page also ticks the hazards the site's RAMS already cover. General starting points: check them. */
const CDMRA = (() => {
  const R = (h, c, l, s, res, who) => ({ h, c, l, s, res: res || "Low", who: who || "Operatives" });
  /* the RAMS, and the CDM hazards each one covers */
  const LIB = {
    wah: {
      activity: "Work at height (scaffold, ladders and roofs)",
      covers: ["wah"],
      words: /height|scaffold|ladder|roof(?!ing felt)|tower/i,
      rows: [
        R(
          "Falls from height",
          "Scaffold erected, altered and inspected by a competent scaffolder (inspected every 7 days and after bad weather); full edge protection, toe boards and loading bays; ladders only for short access",
          2,
          3,
          "Low",
        ),
        R(
          "Falling materials and tools",
          "Brick guards and toe boards; nothing thrown down – use a chute or hoist; exclusion zone below",
          2,
          2,
          "Low",
          "Everyone on site",
        ),
        R(
          "Weather (wind, ice, rain)",
          "Stop work at height in high winds or ice; clear the platforms before use",
          2,
          2,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves", "Harness"],
      plant: "Scaffold, ladders, podium steps or tower",
      training: "CSCS; PASMA for mobile towers; scaffolders CISRS",
      method: {
        prep: "Check the scaffold tag is in date before going up. Set out the exclusion zone below. Check the weather.",
        seq: "Load materials using the loading bay, not over the guard rails. Keep platforms clear and tidy. Work from the platform, never stand on the guard rails or use ladders on the platform.",
        checks:
          "Daily check of guard rails, boards and ties before use; weekly scaffold inspection recorded; stop and report any change or damage.",
        finish: "Clear the platforms each day. Scaffold altered or struck only by the scaffolder.",
      },
    },
    fragile: {
      activity: "Work on or near fragile roofs and roof lights",
      covers: ["fragile"],
      words: /fragile|roof ?light|asbestos cement|cement sheet/i,
      rows: [
        R(
          "Falling through a fragile roof or roof light",
          "Never walk on the roof sheets; work from below or from staging/crawling boards with guard rails; cover or guard every roof light; warning signs",
          2,
          3,
          "Low",
        ),
        R(
          "Falling from the roof edge",
          "Edge protection or a scaffold at the eaves; harness only where nothing else works",
          2,
          3,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves", "Harness"],
      plant: "Crawling boards, staging, safety netting or scaffold",
      training: "CSCS; work at height training",
      permit: "Other",
      method: {
        prep: "Treat every roof as fragile until a competent person says otherwise. Fit edge protection, netting or staging before anyone goes on the roof.",
        seq: "Work only from the staging or crawling boards. Cover each roof light before working near it. Keep the area below cleared.",
        checks: "Check the staging, covers and edge protection at the start of each shift.",
        finish:
          "Remove staging and covers only once the work is finished and the area below is clear.",
      },
    },
    exc: {
      activity: "Excavations, foundations and drainage",
      covers: ["exc", "svc", "water"],
      words: /excavat|foundation|footing|trench|drain|dig/i,
      rows: [
        R(
          "Hitting buried services (electric, gas, water)",
          "Check the service drawings; scan with a CAT and genny before digging; hand dig near services; permit to dig",
          2,
          3,
          "Low",
        ),
        R(
          "Trench collapse",
          "Sides battered back or supported over 1.2 m; spoil kept 1 m back from the edge; nobody in an unsupported trench",
          2,
          3,
          "Low",
        ),
        R(
          "Falling into the excavation",
          "Barriers round the edge; crossing points with handrails; covered at night",
          2,
          2,
          "Low",
          "Everyone on site",
        ),
        R(
          "Water, soakaways and open chambers",
          "Pump out standing water; cover open chambers; nobody working alone near water",
          1,
          3,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves"],
      plant: "Mini digger, dumper, CAT and genny, trench support",
      training: "CSCS; CPCS/NPORS for plant operators; CAT and genny trained",
      permit: "Permit to dig",
      method: {
        prep: "Get the service drawings. Scan the area with the CAT and genny and mark the services. Fill in the permit to dig.",
        seq: "Hand dig trial holes over marked services. Dig with the machine away from them, a banksman watching. Support or batter the sides before anyone goes in. Keep spoil back from the edge.",
        checks:
          "Inspect the excavation at the start of each shift and after rain; record it. Barriers checked daily.",
        finish: "Backfill and compact in layers; cover or barrier anything left open overnight.",
      },
    },
    struct: {
      activity: "Structural alterations, steels and temporary propping",
      covers: ["struct"],
      words: /struct|steel|beam|prop|lintel|knock|wall removal|underpin/i,
      rows: [
        R(
          "Collapse of the structure while altering it",
          "Engineer's design and calculations; props and needles fitted before any wall is removed; temporary works coordinator named; nobody under unsupported structure",
          2,
          3,
          "Low",
        ),
        R(
          "Steel beam falling during lifting or fixing",
          "Lifting plan; correct lifting gear; enough people or mechanical lifting; exclusion zone",
          2,
          3,
          "Low",
        ),
        R(
          "Dust and debris from cutting out",
          "Water suppression or on-tool extraction; FFP3 masks; sheeting",
          2,
          2,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves", "Eye protection", "FFP3 dust mask"],
      plant: "Acrow props, strongboys, needles, padstones, lifting gear",
      training: "CSCS; temporary works coordinator briefed",
      method: {
        prep: "Read the engineer's drawings. Check props, needles and padstones are on site. Set out an exclusion zone.",
        seq: "Fit the props and needles as the temporary works design. Cut out in stages. Lift and position the steel, pack and dry-pack the bearings. Leave the props until the packing has gone off.",
        checks:
          "Temporary works coordinator checks the props before removal starts and before they are taken out.",
        finish: "Remove props only when told; make good; Building Control inspection where needed.",
      },
    },
    lift: {
      activity: "Lifting operations (steels and materials)",
      covers: ["lift"],
      words: /lift|crane|telehandler|hoist/i,
      rows: [
        R(
          "Load falling or swinging",
          "Lift plan by a competent person; equipment LOLER-inspected (thorough examination in date); slings and shackles checked; exclusion zone below the lift",
          2,
          3,
          "Low",
          "Everyone on site",
        ),
        R(
          "Machine overturning",
          "Firm level ground; outriggers on mats; within the rated capacity",
          1,
          3,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves"],
      plant: "Telehandler or crane, slings, shackles",
      training: "CPCS/NPORS operator; slinger/signaller",
      method: {
        prep: "Agree the lift plan. Check the thorough examination certificates. Check the ground and set out the exclusion zone.",
        seq: "Slinger rigs the load; signaller guides; lift slowly and steadily, tag lines on long loads; nobody under the load.",
        checks: "Pre-use check of the machine and lifting gear each day.",
        finish: "Lower the load fully before unhooking; park the machine safely, keys removed.",
      },
    },
    demo: {
      activity: "Demolition and soft strip",
      covers: ["demo"],
      words: /demoli|strip out|soft strip/i,
      rows: [
        R(
          "Unplanned collapse",
          "Survey first; demolish top down in a planned order; props where needed; nobody below",
          2,
          3,
          "Low",
        ),
        R(
          "Live services",
          "Services isolated and proved dead by the utility or an electrician before starting",
          1,
          3,
          "Low",
        ),
        R(
          "Dust, noise and debris",
          "Damp down; sheeting; FFP3 masks; ear protection; chutes for debris",
          2,
          2,
          "Low",
          "Everyone on site",
        ),
      ],
      ppe: [
        "Hard hat",
        "Hi-vis",
        "Safety boots",
        "Gloves",
        "Eye protection",
        "Ear protection",
        "FFP3 dust mask",
      ],
      plant: "Breakers, rubble chute, skip",
      training: "CSCS; demolition operatives trained",
      method: {
        prep: "Check the asbestos survey. Isolate and prove dead all services. Put up hoarding and the exclusion zone.",
        seq: "Soft strip first, then take down top down in the planned order. Load debris into the chute or skip as you go.",
        checks: "Check the structure left standing at the end of each day.",
        finish: "Clear the site; waste to licensed carriers with transfer notes.",
      },
    },
    asb: {
      activity: "Asbestos – survey and safe working",
      covers: ["asb"],
      words: /asbestos/i,
      rows: [
        R(
          "Disturbing asbestos",
          "Refurbishment and demolition survey before work on any building built before 2000; never disturb suspected material; stop work and seal the area if found; licensed contractor for licensable work",
          1,
          3,
          "Low",
          "Everyone on site",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves", "FFP3 dust mask"],
      training: "Asbestos awareness for everyone on site",
      method: {
        prep: "Get the asbestos survey and brief everyone on where any asbestos is. Mark it on site.",
        seq: "Work away from asbestos. If anything suspected is found: stop, leave the area, keep others out and tell the site manager.",
        checks: "Asbestos register checked before each new area of work.",
        finish:
          "Asbestos removed only by a licensed contractor where needed, with clearance certificates kept.",
      },
    },
    hot: {
      activity: "Hot works (cutting, grinding and torch-on roofing)",
      covers: ["hot"],
      words: /hot work|torch|weld/i,
      rows: [
        R(
          "Fire from sparks or flame",
          "Hot works permit; combustibles cleared 10 m or covered; fire extinguisher at the point of work; 1-hour fire watch afterwards",
          2,
          3,
          "Low",
          "Everyone on site",
        ),
        R(
          "Burns and eye injuries",
          "Trained operatives; guards on tools; eye protection and gloves",
          2,
          2,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves", "Eye protection"],
      plant: "Disc cutter, grinder or gas torch; fire extinguisher",
      training: "CSCS; abrasive wheels; torch-on roofers trained",
      permit: "Hot work",
      method: {
        prep: "Fill in the hot works permit. Clear or cover anything that could burn. Extinguisher to hand.",
        seq: "Carry out the hot work as the permit, no hot work in the last hour of the day.",
        checks: "Fire watch for an hour after finishing, then a final check before leaving site.",
        finish: "Close the permit off; gas bottles stored outside, upright and secured.",
      },
    },
    confined: {
      activity: "Work in confined spaces (drains, manholes and tanks)",
      covers: ["confined"],
      words: /confined|manhole|tank|sewer/i,
      rows: [
        R(
          "Bad air (lack of oxygen, gases)",
          "Avoid entry wherever possible; if not, a confined space permit, gas monitor, ventilation, a top man and a rescue plan",
          1,
          3,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves", "Harness"],
      plant: "Gas monitor, tripod and winch, ventilation fan",
      training: "Confined space trained operatives only",
      permit: "Other",
      method: {
        prep: "Can the job be done from outside? If not, issue a permit, test the air and set up the rescue equipment.",
        seq: "Enter with the gas monitor running, top man at the entrance at all times.",
        checks: "Continuous air monitoring; leave straight away if the alarm goes.",
        finish: "Everyone out and counted; close the permit.",
      },
    },
    dust: {
      activity: "Cutting, chasing, dust and noise",
      covers: ["dust", "noise"],
      words: /dust|silica|chasing|noise|vibration|breaker/i,
      rows: [
        R(
          "Silica dust (cutting blocks, slabs, chasing)",
          "Water suppression or on-tool extraction; FFP3 face-fit tested masks; cut outside where possible",
          2,
          3,
          "Low",
        ),
        R(
          "Noise and vibration (breakers, hand tools)",
          "Low-vibration tools; time limits; hearing protection; tools maintained",
          2,
          2,
          "Low",
        ),
      ],
      ppe: [
        "Hard hat",
        "Hi-vis",
        "Safety boots",
        "Gloves",
        "Eye protection",
        "Ear protection",
        "FFP3 dust mask",
      ],
      plant: "Disc cutter with water, chasers with extraction, breakers",
      training: "CSCS; face-fit tested for masks",
      method: {
        prep: "Set up water or extraction before cutting. Check masks fit.",
        seq: "Cut with water or extraction on; rotate jobs to keep vibration exposure down.",
        checks: "Check the extraction and water supply working before each use.",
        finish: "Clean up with a vacuum (not dry sweeping).",
      },
    },
    occ: {
      activity: "Working in an occupied home and near the public",
      covers: ["occ", "public"],
      words: /occupied|resident|public|neighbour/i,
      rows: [
        R(
          "Residents, children or visitors entering the work area",
          "Work area fenced or sealed off; agreed route through the house; tools and materials never left out; site secured each night",
          2,
          2,
          "Low",
          "Client and family",
        ),
        R(
          "Dust and noise in the home",
          "Dust sheets and zip doors; vacuum extraction; noisy work at agreed times",
          2,
          2,
          "Low",
          "Client and family",
        ),
      ],
      ppe: ["Safety boots", "Gloves"],
      training: "Everyone briefed on the house rules",
      method: {
        prep: "Agree the work area, routes, welfare and working hours with the client. Brief everyone.",
        seq: "Keep the work area closed off; keep routes clear; tidy as you go.",
        checks:
          "Daily check that barriers and doors are in place and nothing dangerous is left out.",
        finish: "Secure the area and tidy each night; tell the client of anything that changes.",
      },
    },
    site: {
      activity: "General site: deliveries, plant, manual handling and substances",
      covers: ["traffic", "manual", "coshh", "ground"],
      words: /deliver|plant|vehicle|manual handling|coshh|substance|general|site set/i,
      rows: [
        R(
          "Vehicles and plant reversing",
          "Banksman for reversing; segregated walkways; deliveries booked",
          2,
          3,
          "Low",
          "Everyone on site",
        ),
        R(
          "Manual handling (blocks, bags, steels, plasterboard)",
          "Mechanical aids; team lifts; lighter blocks where possible; materials delivered close to use",
          2,
          2,
          "Low",
        ),
        R(
          "Hazardous substances (cement, solvents, resins, fuel)",
          "COSHH assessments; gloves and washing; stored safely",
          2,
          2,
          "Low",
        ),
        R(
          "Contaminated ground, knotweed, radon",
          "Ground investigation where suspected; specialist treatment; gloves and washing",
          1,
          2,
          "Low",
        ),
      ],
      ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves"],
      plant: "Mixer, dumper, barrows, sack trucks",
      training: "CSCS; manual handling; plant operators trained",
      method: {
        prep: "Plan deliveries and storage; set out walkways; check COSHH sheets for products in use.",
        seq: "Keep plant and people apart; lift using aids or in pairs; use substances as their data sheet.",
        checks: "Daily check of plant; keep walkways clear.",
        finish: "Store materials safely; lock plant; clear up spills.",
      },
    },
  };
  const KEY_OF = {};
  Object.entries(LIB).forEach(([k, v]) => v.covers.forEach((h) => (KEY_OF[h] = k)));
  /* the RAMS a site already has: its risk assessments (made here, or written in Health & safety) and uploaded RAMS */
  /* made a moment ago (the saved lists catch up a little later) */
  const justMade = new Set();
  /* those the app made count for their own hazards only; other RAMS by their name */
  function have(site) {
    const ra = allTeam("signoffs").filter((x) => x.type === "ra" && same(x.site, site));
    const docs = (S.docs || []).filter(
      (d) => d.cat === "rams" && same(d.site, site) && d.path !== "CDM",
    );
    const found = new Set();
    justMade.forEach((x) => {
      const [s, k] = x.split("|");
      if (same(s, site)) found.add(k);
    });
    ra.concat(docs).forEach((x) => {
      if (x.cdmKey && LIB[x.cdmKey]) found.add(x.cdmKey);
    });
    Object.entries(LIB).forEach(([k, v]) => {
      if (
        ra.some((x) => !x.cdmKey && v.words.test(x.activity || "")) ||
        docs.some((d) => !d.cdmKey && v.words.test(d.title || d.fileName || ""))
      )
        found.add(k);
    });
    return found;
  }
  /* the hazards the site's RAMS already cover, to tick on the CDM page */
  function hazardsFromRams(site) {
    const h = [];
    have(site).forEach((k) => LIB[k].covers.slice(0, 1).forEach((x) => h.push(x)));
    return h;
  }
  const needed = (risks) => [
    ...new Set(
      Object.keys(risks || {})
        .map((h) => KEY_OF[h])
        .filter(Boolean),
    ),
  ];
  /* a RAMS that isn't on the list (James, Nov 2026: "option 1 fill in everything manually, 2nd option fill in what
     it's for and Claude do the rest") */
  const ownHtml = () =>
    `<div class="cdm-raown"><b>+ A RAMS that isn't on the list</b><div class="actions" style="margin:4px 0 0"><button type="button" class="btn" id="cdm-raown1">✍ Fill it in myself</button><button type="button" class="btn" id="cdm-raown2">✨ Claude writes it</button></div><div class="who">Either way it opens in the RAMS form to check and save, and is filed in this site's RAMS like the others.</div></div>`;
  function boxHtml(site, risks) {
    return boxHtml0(site, risks).replace(/<\/div>$/, ownHtml() + "</div>");
  }
  function boxHtml0(site, risks) {
    const need = needed(risks);
    const got = have(site);
    const todo = need.filter((k) => !got.has(k));
    const done = need.filter((k) => got.has(k));
    if (!need.length)
      return `<div class="cdm-rabox"><b>📝 RAMS for these hazards</b><div class="who">Tick the hazards above and the RAMS this job needs show here, ready to make in one tap.</div></div>`;
    return `<div class="cdm-rabox"><b>📝 RAMS for these hazards</b>
      ${done.length ? `<div class="who">✓ Already on ${esc(site)}: ${done.map((k) => esc(LIB[k].activity)).join(" · ")}</div>` : ""}
      ${todo.length ? `<div class="who">To make: ${todo.map((k) => `<b>${esc(LIB[k].activity)}</b>`).join(" · ")}</div><button type="button" class="btn primary" id="cdm-mkra">📝 Make ${todo.length === 1 ? "the RAMS" : "these " + todo.length + " RAMS"} and file ${todo.length === 1 ? "it" : "them"} in ${esc(site)} › RAMS</button><div class="who">Written from the hazards, with controls, PPE, permits and a step-by-step method – check them and add anything specific to this job.</div>` : `<div class="who">✓ Every hazard ticked has its RAMS on this site.</div>`}</div>`;
  }
  /* file a risk assessment in the site's RAMS as a PDF (for one made by hand or by Claude) */
  async function file(site, d) {
    const pdf = await raPdf(d, true);
    if (!pdf || !pdf.blob) return;
    const up = await uploadFile(new File([pdf.blob], pdf.fn, { type: "application/pdf" }), pdf.fn);
    await S.db.collection("docs").add({
      site,
      cat: "rams",
      raId: d.id || "",
      title: "RAMS - " + d.activity,
      fileName: pdf.fn,
      assetId: up.id,
      contentType: "application/pdf",
      size: pdf.blob.size,
      uploaded: Date.now(),
    });
  }
  /* a blank RAMS form for the site */
  const blank = (site, cd) => ({
    site,
    rows: [],
    atRisk: ["Operatives"],
    ppe: ["Hard hat", "Hi-vis", "Safety boots", "Gloves"],
    permit: "None",
    method: { prep: "", seq: "", checks: "", finish: "" },
    emergency: [
      cd && cd.hospital ? "Nearest A&E: " + cd.hospital : "",
      cd && cd.firstAid ? "First aider: " + cd.firstAid : "",
      "In an emergency call 999 first.",
    ]
      .filter(Boolean)
      .join(". "),
  });
  /* Claude writes a RAMS from a line saying what the work is; it comes back as the form's fields */
  async function claudeDraft(site, what, cd) {
    let sample = null;
    try {
      sample = await window.claude.use("sample");
    } catch (e) {}
    if (!sample) throw Object.assign(new Error("no claude"), { code: "no_claude" });
    const hz = Object.keys((cd && cd.risks) || {}).join(", ");
    const j = await sample.json(
      `You are helping a UK building company (${coName()}) write a risk assessment and method statement (RAMS) under CDM 2015 for one activity on a construction site. Write it in plain, practical site English for the trades who will read and sign it.
Activity: ${what}
Site: ${site}${cd && cd.desc ? "\nThe job: " + cd.desc : ""}${hz ? "\nHazards already noted for the job: " + hz : ""}
Reply with JSON only, in this shape:
{"activity":"short title","atRisk":["Operatives","Client and family","Neighbours","Public" – only those that apply],"plant":"plant, tools and equipment","coshh":"materials / COSHH substances, or empty","ppe":[from "Hard hat","Hi-vis","Safety boots","Gloves","Eye protection","Ear protection","FFP3 dust mask","Harness"],"training":"training / cards needed","permit":"None" or "Hot work" or "Permit to dig" or "Other","rows":[{"h":"hazard","who":"Operatives" or "Everyone on site" or "Client and family" or "Neighbours" or "Public","l":likelihood 1-3 before controls,"s":severity 1-3,"c":"control measures","res":"Low" or "Medium" or "High" residual risk}] (3 to 8 rows),"method":{"prep":"preparation and site set-up","seq":"sequence of work, step by step","checks":"inspection / checks during work","finish":"completion, clear-up and handover"}}`,
      { modelTier: "default" },
    );
    const b = blank(site, cd);
    if (!j || typeof j !== "object") return b;
    const pick = (v, ok) => (Array.isArray(v) ? v.filter((x) => ok.includes(x)) : []);
    const n13 = (v) => Math.max(1, Math.min(3, Math.round(+v || 2)));
    return Object.assign(b, {
      activity: String(j.activity || what).slice(0, 120),
      atRisk: pick(j.atRisk, RA_WHO).length ? pick(j.atRisk, RA_WHO) : b.atRisk,
      plant: String(j.plant || "").slice(0, 300),
      coshh: String(j.coshh || "").slice(0, 300),
      ppe: pick(j.ppe, RA_PPE).length ? pick(j.ppe, RA_PPE) : b.ppe,
      training: String(j.training || "").slice(0, 200),
      permit: RA_PERMITS.includes(j.permit) ? j.permit : "None",
      rows: (Array.isArray(j.rows) ? j.rows : [])
        .filter((r) => r && r.h)
        .slice(0, 10)
        .map((r) => ({
          h: String(r.h).slice(0, 200),
          who: String(r.who || "Operatives"),
          l: n13(r.l),
          s: n13(r.s),
          c: String(r.c || "").slice(0, 500),
          res: ["Low", "Medium", "High"].includes(r.res) ? r.res : "Low",
        })),
      method: {
        prep: String((j.method || {}).prep || "").slice(0, 2000),
        seq: String((j.method || {}).seq || "").slice(0, 3000),
        checks: String((j.method || {}).checks || "").slice(0, 2000),
        finish: String((j.method || {}).finish || "").slice(0, 2000),
      },
    });
  }
  /* the box's two buttons; reopen(): back to the CDM page afterwards */
  function wireOwn(site, cd, beforeLeave, reopen) {
    const done = async (d) => {
      try {
        await file(site, d);
        toast("RAMS filed in " + site + " › RAMS");
      } catch (e) {
        toast("Saved, but couldn't file the PDF: " + uploadErr(e));
      }
      reopen();
    };
    const b1 = $("cdm-raown1");
    if (b1)
      b1.onclick = async () => {
        await beforeLeave();
        openRaForm(blank(site, cd), done);
      };
    const b2 = $("cdm-raown2");
    if (b2)
      b2.onclick = () => {
        const box = document.createElement("div");
        box.className = "dimask";
        box.innerHTML = `<div class="dimbox cdm-raai" role="dialog" aria-modal="true" aria-labelledby="cdm-rait"><h3 id="cdm-rait">✨ Claude writes the RAMS</h3>
          <label for="cdm-raw">What's the work?<textarea id="cdm-raw" maxlength="500" rows="3" placeholder="e.g. Fitting a new staircase in an occupied house"></textarea></label>
          <div class="who">Claude writes the hazards, controls, PPE, permits and the step-by-step method. It opens in the RAMS form for you to check and change before it's saved.</div>
          <div class="who" id="cdm-raerr" style="color:var(--danger)"></div>
          <div class="actions"><button type="button" class="btn" id="cdm-rax">Cancel</button><button type="button" class="btn primary" id="cdm-rago">✨ Write it</button></div></div>`;
        document.body.appendChild(box);
        const close = () => box.remove();
        box.querySelector("#cdm-rax").onclick = close;
        box.querySelector("#cdm-raw").focus();
        box.querySelector("#cdm-rago").onclick = async () => {
          const what = box.querySelector("#cdm-raw").value.trim();
          const err = box.querySelector("#cdm-raerr");
          if (!what) {
            err.textContent = "Say what the work is first.";
            return;
          }
          const go = box.querySelector("#cdm-rago");
          go.disabled = true;
          go.textContent = "Claude is writing it…";
          err.textContent = "";
          try {
            const d = await claudeDraft(site, what, cd);
            close();
            await beforeLeave();
            openRaForm(d, done);
            toast("Written by Claude – check it, then Save");
          } catch (e) {
            go.disabled = false;
            go.textContent = "✨ Write it";
            err.textContent =
              e && e.code === "no_claude"
                ? "Claude isn't available on this device. Use Fill it in myself instead."
                : e && e.code === "not_granted"
                  ? "This app hasn't been allowed to use Claude. Allow it in the page's permissions, or fill it in yourself."
                  : "Claude couldn't write it just now. Try again, or fill it in yourself.";
          }
        };
      };
  }
  async function make(site, risks, cd) {
    const got = have(site);
    const todo = needed(risks).filter((k) => !got.has(k));
    let n = 0;
    for (const k of todo) {
      const L = LIB[k];
      const d = {
        type: "ra",
        cdmKey: k,
        auto: true,
        activity: L.activity,
        site,
        preparedBy: bossName(),
        date: iso(new Date()),
        atRisk: [
          ...new Set(
            ["Operatives"].concat(L.rows.map((r) => r.who).filter((w) => RA_WHO.includes(w))),
          ),
        ],
        plant: L.plant || "",
        coshh: k === "site" ? "Cement, mortar, solvents, fuel" : "",
        ppe: L.ppe,
        training: L.training || "",
        permit: L.permit || "None",
        rows: L.rows.map((r) => Object.assign({}, r)),
        method: Object.assign({}, L.method),
        emergency: [
          cd && cd.hospital ? "Nearest A&E: " + cd.hospital : "",
          cd && cd.firstAid ? "First aider: " + cd.firstAid : "",
          "In an emergency call 999 first.",
        ]
          .filter(Boolean)
          .join(". "),
        briefed: [],
        created: Date.now(),
      };
      const id = "ra-" + newId();
      await submitJob({ coll: "signoffs", docId: id, data: d });
      const pdf = await raPdf(d, true);
      if (pdf && pdf.blob) {
        const up = await uploadFile(
          new File([pdf.blob], pdf.fn, { type: "application/pdf" }),
          pdf.fn,
        );
        await S.db.collection("docs").add({
          site,
          cat: "rams",
          cdmKey: k,
          raId: id,
          title: "RAMS - " + L.activity,
          fileName: pdf.fn,
          assetId: up.id,
          contentType: "application/pdf",
          size: pdf.blob.size,
          uploaded: Date.now(),
        });
      }
      justMade.add(site + "|" + k);
      n++;
    }
    return n;
  }
  return { boxHtml, make, file, wireOwn, claudeDraft, hazardsFromRams, needed, have, LIB };
})();
