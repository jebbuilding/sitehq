/* ===== 🏛️ CDM 2015 documents: duty holder appointments, pre-construction information, construction phase plan, CDM checklist, F10 check, H&S file index ===== */
import { ptSrc } from "../clients/portal.js";
import { soAll } from "../clients/sign-offs.js";
import { clAddr } from "../clients/stages-planner.js";
import { $, esc, iso, stamp, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, liveSite, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB, pdfLogo, siteRec } from "../photos/photos.js";
import { ukDate } from "./rams-maker.js";
import { indFor, loadJsPdf } from "./site-inductions.js";
import { sjMaster } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
import { siteClient } from "../sites/summary.js";
export { cdmMaker, cdmSignState };
const CDM_RISKS = [
  [
    "asb",
    "Asbestos (building built before 2000: survey needed before any refurbishment or demolition)",
  ],
  ["svc", "Existing services: buried / overhead cables, gas, water, drains"],
  ["wah", "Work at height: scaffolding, roofs, ladders, edges"],
  ["fragile", "Fragile roofs or roof lights"],
  ["exc", "Excavations, trenches and foundations (collapse, services, falls)"],
  ["struct", "Structural alterations, temporary works and propping"],
  ["demo", "Demolition or soft strip"],
  ["occ", "Working in or next to an occupied home"],
  ["public", "Public, neighbours, children or pets near the works"],
  ["traffic", "Deliveries, vehicles, plant and reversing"],
  ["lift", "Lifting operations (steels, materials, telehandler / crane)"],
  ["hot", "Hot works (cutting, grinding, torch-on roofing)"],
  ["dust", "Dust and silica (cutting blocks, slabs, chasing)"],
  ["noise", "Noise and vibration (breakers, hand tools)"],
  ["coshh", "Hazardous substances (cement, solvents, resins, fuel)"],
  ["manual", "Manual handling (blocks, bags, steels, plasterboard)"],
  ["confined", "Confined spaces (drains, manholes, tanks)"],
  ["ground", "Contaminated ground, Japanese knotweed, radon"],
  ["water", "Working near water, soakaways, open chambers"],
  ["fire", "Fire during the works (timber frame, stored materials, hot works)"],
  ["elec", "Electrical work and temporary supplies"],
  ["eco", "Trees, bats, birds and ecology restrictions"],
];
const CDM_DOCS = [
  ["appoint", "CDM duty holder appointments (client letter & acknowledgement)"],
  [
    "brappoint",
    "Building Regulations dutyholder appointments (Part 2A): principal designer and principal contractor, in writing",
  ],
  [
    "bccommence",
    "Building Control commencement record (start notice and when the work counts as started)",
  ],
  ["pci", "Pre-construction information (PCI)"],
  ["cpp", "Construction phase plan (CPP)"],
  ["check", "CDM 2015 compliance checklist"],
  ["f10", "F10 notification check"],
  ["hsf", "Health & safety file (contents and handover list)"],
  [
    "bccs",
    "Building Control completion statement (compliance statements from the client, principal contractor and principal designer)",
  ],
  ["dominfo", "Letter to a domestic client: CDM explained and what we need from them"],
  ["subcon", "Contractor appointment & competence checks (reg. 15)"],
  ["welfare", "Welfare facilities check (Schedule 2)"],
  ["emerg", "Emergency, fire & first aid plan"],
  ["drr", "Design risk register"],
  ["tw", "Temporary works register"],
  ["log", "Site inspection & CPP review log"],
  [
    "welfarepack",
    "Welfare unit notices: site details & contacts, fire notice, emergency procedures, emergency numbers and site rules (stand-alone, to put up in the welfare unit)",
  ],
  ["notice", "Site notice board poster (who's who, emergency numbers, site rules)"],
  ["hotpermit", "Hot works permit"],
  ["dig", "Permit to dig (services check before excavating)"],
];
const CDM_GROUPS = [
  ["Before you start", ["appoint", "brappoint", "bccommence", "dominfo", "pci", "f10", "drr"]],
  [
    "Running the job",
    ["welfarepack", "cpp", "emerg", "welfare", "notice", "subcon", "tw", "log", "check"],
  ],
  ["Permits", ["hotpermit", "dig"]],
  ["At handover", ["hsf", "bccs"]],
];
function cdmNotifiable(cd) {
  const wd = +cd.workDays || 0,
    mx = +cd.maxWorkers || 0,
    pd = +cd.personDays || wd * Math.max(1, +cd.avgWorkers || mx || 1);
  return { notifiable: (wd > 30 && mx > 20) || pd > 500, wd, mx, pd };
}
function cdmSections(cd, pick) {
  const co = coData();
  const N = cdmNotifiable(cd);
  const dom = cd.clientType === "domestic";
  const many = cd.contractors !== "one";
  const PD = many
    ? cd.pdName ||
      (dom
        ? co.name +
          " (by default under CDM 2015 reg. 7, as no principal designer has been appointed)"
        : "Not yet appointed - the client must appoint one in writing")
    : "Not needed (one contractor only)";
  const PC = many
    ? cd.pcName || co.name
    : "Not needed as a separate role (one contractor only) - " + co.name + " is the contractor";
  const risks = CDM_RISKS.filter(([k]) => cd.risks && cd.risks[k]);
  const head = [
    ["Project", cd.project],
    ["Site address", cd.address],
    ["Client", cd.client],
    [
      "Client type",
      dom ? "Domestic client (work on their own home, not for a business)" : "Commercial client",
    ],
    ["Principal contractor", PC],
    ["Principal designer", PD],
    ["Planning / Building Control ref", cd.planning],
    ["Start date", ukDate(cd.start)],
    ["Expected length", cd.weeks ? cd.weeks + " weeks" : ""],
  ];
  const out = [];
  const S2 = (title, blocks) => out.push({ title, blocks });
  if (pick.appoint)
    S2("CDM 2015 - Duty holder appointments", [
      ["h", "Construction (Design and Management) Regulations 2015"],
      ["rows", head],
      [
        "p",
        dom
          ? `${cd.client} is a domestic client: the building work is on their own home and not in connection with a business. Under regulation 7 of CDM 2015 the client's duties pass to the contractor (where there is only one contractor) or to the principal contractor (where there is more than one), unless the client has a written agreement with the principal designer for them to carry out the client duties.`
          : `${cd.client} is a commercial client and has the client duties under regulation 4 of CDM 2015: making suitable arrangements for managing the project, providing pre-construction information, making sure a construction phase plan is drawn up before work starts, making sure a health and safety file is prepared (where there is more than one contractor), and making sure welfare facilities are in place.`,
      ],
      ["h2", "Appointments"],
      [
        "table",
        ["Role", "Appointed", "Duties under CDM 2015"],
        [
          [
            "Client",
            cd.client,
            dom
              ? "Duties pass to the " +
                (many ? "principal contractor" : "contractor") +
                " (reg. 7). The client should still provide information they hold about the property (e.g. asbestos, services, drawings)."
              : "Reg. 4: arrangements, information, CPP before work starts, welfare, H&S file. Reg. 5: appoint PD and PC in writing where there is more than one contractor. Reg. 6: notify HSE (F10) if notifiable.",
          ],
          [
            "Principal designer",
            PD,
            many
              ? "Reg. 11-12: plan, manage and monitor the pre-construction phase; help the client with pre-construction information; prepare the health and safety file."
              : "-",
          ],
          [
            "Principal contractor",
            PC,
            many
              ? "Reg. 12-14: draw up the construction phase plan before work starts; plan, manage and monitor the construction phase; site induction; welfare; consult workers; secure the site."
              : "-",
          ],
          [
            "Contractor(s)",
            co.name + (cd.otherContractors ? "; " + cd.otherContractors : ""),
            "Reg. 15: plan, manage and monitor their own work; make sure workers have the skills, knowledge, training and experience; provide induction and supervision; comply with Part 4 and Schedule 2 (welfare).",
          ],
          [
            "Designer(s)",
            [cd.designer, cd.engineer].filter(Boolean).join("; ") || "-",
            "Reg. 9: eliminate, reduce or control foreseeable risks through the design and give information about remaining risks.",
          ],
        ],
      ],
      ["h2", "Acknowledgement"],
      [
        "p",
        `By signing below, the client confirms they have received this information, understand who holds the CDM 2015 duties on this project, and will give ${co.name} any information they hold that could affect health and safety (for example an asbestos survey, drawings, details of services, or previous works).`,
      ],
      [
        "sign",
        [
          ["Client", cd.client],
          ["For " + co.name, co.owner],
        ],
      ],
    ]);
  if (pick.pci)
    S2("Pre-construction information", [
      ["h", "Pre-construction information (CDM 2015 reg. 4(4), Appendix 2 of L153)"],
      ["rows", head],
      ["h2", "1. Description of the project"],
      [
        "p",
        cd.desc ||
          "(Describe the work: e.g. single-storey rear extension, loft conversion, internal alterations.)",
      ],
      [
        "rows",
        [
          [
            "Key dates",
            [
              cd.start ? "Start " + ukDate(cd.start) : "",
              cd.finish ? "Finish " + ukDate(cd.finish) : cd.weeks ? cd.weeks + " weeks" : "",
            ]
              .filter(Boolean)
              .join(" · "),
          ],
          ["Designers", [cd.designer, cd.engineer].filter(Boolean).join("; ")],
          ["Building control", cd.bc],
          ["Notifiable to HSE (F10)", N.notifiable ? "Yes - see F10 check" : "No - see F10 check"],
        ],
      ],
      ["h2", "2. Client's considerations and management requirements"],
      [
        "bul",
        [
          "Working hours: " + (cd.hours || "to be agreed with the client"),
          "Areas of the property that stay in use and must be kept separate from the works: " +
            (cd.inUse || "to be agreed before starting"),
          "Site access, parking and deliveries: " + (cd.access || "to be agreed"),
          "Security, smoking and welfare arrangements as in the construction phase plan.",
        ],
      ],
      ["h2", "3. Environmental restrictions and existing on-site risks"],
      [
        "p",
        "The following hazards have been identified for this site. Each is dealt with in the construction phase plan and the RAMS:",
      ],
      [
        "bul",
        risks.length
          ? risks.map(([, l]) => l)
          : ["(No specific hazards ticked - review before work starts.)"],
      ],
      [
        "rows",
        [
          [
            "Asbestos",
            cd.asbestos ||
              "Unknown - a refurbishment / demolition survey is needed before work that disturbs the fabric of a pre-2000 building",
          ],
          [
            "Existing services",
            cd.services ||
              "To be located (CAT and genny scan, utility drawings) before any digging",
          ],
          ["Ground conditions", cd.groundInfo || "-"],
          ["Other information", cd.otherInfo || "-"],
        ],
      ],
      ["h2", "4. Significant design and construction hazards"],
      [
        "p",
        cd.designRisks ||
          "Designers to confirm any significant residual risks (e.g. temporary propping for openings, sequence of structural works, working next to boundaries).",
      ],
      ["h2", "5. Health and safety file"],
      [
        "p",
        "A health and safety file " +
          (many
            ? "will be prepared by the principal designer and handed to the client at the end of the project."
            : "is not required by law with one contractor, but key information (drawings, certificates, warranties, as-built details) will be handed to the client at completion."),
      ],
    ]);
  if (pick.cpp)
    S2("Construction phase plan", [
      ["h", "Construction phase plan (CDM 2015 reg. 12)"],
      ["rows", head],
      ["h2", "1. Contacts and emergency information"],
      [
        "rows",
        [
          ["Site manager", cd.manager],
          ["First aider(s)", cd.firstAid],
          ["First aid kit", cd.firstAidKit],
          ["Nearest A&E", cd.hospital],
          ["Fire assembly point", cd.assembly],
          [
            "Emergency services",
            "999 / 112 - give the site as: " +
              (cd.address || "") +
              (cd.w3w ? " (what3words ///" + cd.w3w.replace(/^\/+/, "") + ")" : ""),
          ],
          ["Gas emergency", "0800 111 999"],
          ["Power cut / damage", "105"],
        ],
      ],
      ["h2", "2. Description of the work and key dates"],
      ["p", cd.desc || "-"],
      [
        "rows",
        [
          ["Start", ukDate(cd.start)],
          ["Finish / length", cd.finish ? ukDate(cd.finish) : cd.weeks ? cd.weeks + " weeks" : ""],
          ["Working hours", cd.hours || "8:00am - 5:00pm Monday to Friday"],
          ["Max. people on site at once", cd.maxWorkers],
        ],
      ],
      ["h2", "3. Management of the work"],
      [
        "bul",
        [
          "Site induction for everyone before they start work (including visitors and delivery drivers who come onto site).",
          "RAMS for each activity, briefed to the people doing the work and signed. Toolbox talks during the job.",
          "Daily checks of the site, access, welfare, fencing and housekeeping by the site manager. Weekly scaffold and excavation inspections recorded.",
          "Workers' competence (CSCS / trade cards, training) checked before they start. Supervision proportionate to experience.",
          "Accidents and near misses reported to the site manager and recorded; RIDDOR reporting where required.",
          "Workers are consulted on health and safety and can raise concerns with the site manager at any time.",
        ],
      ],
      ["h2", "4. Site rules"],
      [
        "bul",
        (
          cd.rules ||
          "Sign in and out every day.\nWear the PPE required for the task: safety boots, hi-vis, gloves; hard hat where there is overhead work.\nNo smoking or vaping except in the agreed area.\nKeep access routes and fire escapes clear.\nSecure the site, plant and materials at the end of each day.\nNo alcohol or drugs.\nBe considerate to the client and neighbours."
        )
          .split("\n")
          .filter(Boolean),
      ],
      ["h2", "5. Welfare (CDM 2015 Schedule 2)"],
      [
        "p",
        cd.welfare ||
          "Toilet and hand washing (hot and cold water, soap, drying), drinking water, a place to rest and eat with means of boiling water and heating food, and somewhere to change and dry clothing. In place before work starts.",
      ],
      ["h2", "6. Arrangements for controlling significant site risks"],
      [
        "table",
        ["Risk", "How it is controlled"],
        risks
          .map(([k, l]) => [l.split(" (")[0], CDM_CTRL[k] || "See RAMS."])
          .concat(risks.length ? [] : [["-", "Tick the site's hazards to list controls here."]]),
      ],
      ["h2", "7. Related documents"],
      [
        "bul",
        [
          "RAMS for each activity (in the app under the site's RAMS folder)",
          "Site induction and site rules",
          "Risk assessments, permits (hot works, excavation), inspection records",
          "Pre-construction information and drawings",
        ],
      ],
    ]);
  if (pick.check)
    S2("CDM 2015 compliance checklist", [
      ["h", "CDM 2015 compliance checklist"],
      ["rows", head],
      [
        "checks",
        [
          ["Client type confirmed (domestic / commercial) and duty holders identified", 1],
          [
            "More than one contractor? If yes, principal designer and principal contractor appointed in writing",
            many ? 0 : 1,
          ],
          ["Pre-construction information gathered and shared with designers and contractors", 0],
          [
            "Asbestos: refurbishment / demolition survey for pre-2000 buildings before work that disturbs the fabric",
            cd.risks && cd.risks.asb ? 0 : 1,
          ],
          [
            "Designers have considered and reduced risks and given information on remaining risks",
            0,
          ],
          ["Construction phase plan drawn up BEFORE the construction phase starts", 0],
          [
            "F10 notification sent to HSE if notifiable (more than 30 working days with more than 20 workers at the same time, or more than 500 person days)",
            N.notifiable ? 0 : 1,
          ],
          ["F10 displayed on site (if notifiable)", N.notifiable ? 0 : 1],
          ["Welfare facilities in place before work starts (Schedule 2)", 0],
          ["Site secured: fencing, signage, public protected", 0],
          ["Site induction given to everyone", 0],
          ["RAMS written, briefed and signed for each activity", 0],
          ["Competence of workers and contractors checked (cards, training, experience)", 0],
          [
            "Inspections: scaffolds (weekly / after alteration), excavations (each shift), lifting equipment",
            0,
          ],
          ["First aid arrangements, fire precautions and emergency plan in place", 0],
          [
            "Health and safety file prepared and handed to the client at the end (more than one contractor)",
            many ? 0 : 1,
          ],
        ].map(([t, na]) => [t, na ? "N/A" : ""]),
      ],
    ]);
  if (pick.f10)
    S2("F10 notification check", [
      ["h", "Is this project notifiable to HSE? (CDM 2015 reg. 6)"],
      [
        "rows",
        [
          ["Project", cd.project],
          ["Working days on site", N.wd || "-"],
          ["Most workers on site at the same time", N.mx || "-"],
          ["Total person days", N.pd || "-"],
        ],
      ],
      [
        "p",
        "A project must be notified to HSE (form F10, online) before the construction phase starts if the work will last longer than 30 working days AND have more than 20 workers working at the same time at any point, OR will exceed 500 person days.",
      ],
      [
        "rows",
        [
          [
            "Result",
            N.notifiable
              ? "NOTIFIABLE - submit an F10 to HSE before work starts and display it on site"
              : "Not notifiable - no F10 needed (keep this record)",
          ],
        ],
      ],
      [
        "p",
        dom
          ? "For a domestic client, the contractor (or principal contractor) submits the F10 as the client duties pass to them."
          : "The client is responsible for submitting the F10 (others may submit it on their behalf).",
      ],
      ["sign", [["Checked by", co.owner]]],
    ]);
  if (pick.hsf)
    S2("Health & safety file - contents", [
      ["h", "Health and safety file (CDM 2015 reg. 12(5)-(10))"],
      ["rows", head],
      [
        "p",
        many
          ? "Required: more than one contractor. Prepared by the principal designer (or the principal contractor at the end if the PD's appointment has ended) and handed to the client."
          : "Not legally required with only one contractor, but this handover pack is good practice.",
      ],
      [
        "checks",
        [
          ["Brief description of the work carried out", ""],
          [
            "Residual hazards and how they have been dealt with (e.g. asbestos left in place, services routes)",
            "",
          ],
          ["Key structural principles (bracing, beams, loadings) and safe working loads", ""],
          ["Hazardous materials used (e.g. lead paint, special coatings)", ""],
          ["Information on removing or dismantling installed plant and equipment", ""],
          ["Health and safety information about equipment for cleaning and maintenance", ""],
          ["Nature, location and markings of significant services (drains, cables, gas)", ""],
          ["As-built drawings, building control completion certificate", ""],
          ["Electrical (EIC), gas safe, FENSA / warranties and guarantees", ""],
          ["Product manuals and maintenance information", ""],
        ],
      ],
      [
        "sign",
        [
          ["Handed to client", cd.client],
          ["Handed over by", co.owner],
        ],
      ],
    ]);
  /* Building Control completion statement: since the October 2023 changes to the Building Regulations, the
     completion notice to building control goes with statements that, to the best of each one's knowledge, the work
     complies and the building regulations dutyholders (principal contractor and principal designer) have met their
     duties */
  if (pick.bccs)
    S2("Building Control completion statement", [
      [
        "rows",
        [
          ["Project", cd.project],
          ["Site address", cd.address],
          ["Client", cd.client],
          ["Building control body", cd.bc],
          ["Building control reference", cd.bcRef || cd.planning],
          ["Description of the work", cd.desc],
          ["Date the work was completed", "___/___/______"],
          ["The building work is complete", "Yes – this is the completion notice"],
          ...(dom
            ? [["Domestic client", "This notice is given on behalf of a domestic client"]]
            : []),
        ],
      ],
      ["h2", "Principal contractor and principal designer"],
      [
        "rows",
        [
          ["Principal contractor", (many ? cd.pcName : "") || co.name],
          [
            "Address",
            (many && cd.pcName ? "" : String(co.address || "").replace(/\s*\n\s*/g, ", ")) ||
              "______________________________",
          ],
          [
            "Phone / email",
            (many && cd.pcName
              ? ""
              : [co.phone || co.mobile, co.email].filter(Boolean).join(" · ")) ||
              "______________________________",
          ],
          ["Principal designer", cd.pdName || cd.designer || "______________________________"],
          ["Address", "______________________________"],
          ["Phone / email", "______________________________"],
        ],
      ],
      [
        "p",
        "Under the Building Regulations 2010 (as amended in October 2023), when building work is finished the building control body must be told and given statements that, to the best of each person's knowledge, the work complies with all applicable requirements of the Building Regulations, and that the principal designer and principal contractor have fulfilled their duties. Fill in and sign the parts below and send it to building control within 5 days of finishing (check your building control's deadline), before the final inspection. Building control won't issue the completion certificate without these statements.",
      ],
      ["h2", "1. Client's statement"],
      [
        "p",
        "I / we confirm that, to the best of my / our knowledge, the building work described above complies with all applicable requirements of the Building Regulations.",
      ],
      ["sign", [["Client", cd.client]]],
      ["h2", "2. Principal contractor's statement"],
      [
        "p",
        "As principal contractor for this building work (appointed on ___/___/______), I confirm that, to the best of my knowledge, I have fulfilled my duties as principal contractor under Part 2A of the Building Regulations 2010, and that the building work complies with all applicable requirements of the Building Regulations.",
      ],
      [
        "sign",
        [
          ["Principal contractor", (many ? cd.pcName : "") || co.name],
          ["Signed for them by", co.owner],
        ],
      ],
      ["h2", "3. Principal designer's statement"],
      [
        "p",
        "As principal designer for this building work (appointed on ___/___/______), I confirm that, to the best of my knowledge, I have fulfilled my duties as principal designer under Part 2A of the Building Regulations 2010, and that the design work complies with all applicable requirements of the Building Regulations.",
      ],
      ["sign", [["Principal designer", cd.pdName || cd.designer || ""]]],
      [
        "p",
        "Where one person or firm holds more than one role (for example a builder who is both principal contractor and principal designer on a small job), they sign each part that applies.",
      ],
      ["h2", "Sent with this statement (tick what applies)"],
      [
        "checks",
        [
          [
            "Electrical installation certificate (Part P) – or the registered electrician's notification",
            "",
          ],
          ["Gas Safe certificate for any new gas work or boiler", ""],
          ["Window and door replacement certificate (FENSA, CERTASS or similar)", ""],
          ["Heating and hot water commissioning certificates; benchmark checklist", ""],
          ["Drainage test / CCTV survey results", ""],
          ["Structural engineer's final calculations and sign-off", ""],
          ["Air tightness, sound or energy (SAP / EPC) results, where needed", ""],
          ["Fire safety information for the building, where needed", ""],
          ["As-built drawings showing any changes from the approved plans", ""],
        ],
      ],
    ]);
  /* Building Regulations dutyholder appointments (Part 2A, from October 2023): separate from the CDM ones */
  if (pick.brappoint)
    S2("Building Regulations dutyholder appointments", [
      ["h", "Principal designer and principal contractor (Part 2A)"],
      ["rows", head.filter(([k]) => !/^Principal/.test(k))],
      [
        "p",
        "Since October 2023 the Building Regulations have their own dutyholders, separate from the CDM ones (they are often the same people). Where more than one contractor or designer works on the job, the client must appoint a principal designer to plan, manage and monitor the design work, and a principal contractor to plan, manage and monitor the building work, so that it complies with the Building Regulations. The appointments should be made in writing before the work starts." +
          (dom
            ? " For a domestic client: if these appointments are not made, the designer in control of the design work is the principal designer and the contractor in control of the building work is the principal contractor – this letter puts it in writing so everyone knows."
            : " For work done for a business, the appointments must be made in writing."),
      ],
      ["h2", "1. The client appoints"],
      [
        "rows",
        [
          ["Principal designer", cd.pdName || cd.designer || "______________________________"],
          ["Principal contractor", (many ? cd.pcName : "") || co.name],
          ["Appointed from", "___/___/______"],
        ],
      ],
      [
        "p",
        "I / we appoint the principal designer and principal contractor named above for this building work, and will give them the information they need. Before appointing them, I / we took reasonable steps to check that each has the competence (skills, knowledge, experience and behaviours) for the role.",
      ],
      ["sign", [["Client", cd.client]]],
      ["h2", "2. The principal contractor accepts"],
      [
        "p",
        "I accept the appointment as principal contractor under Part 2A of the Building Regulations 2010. I confirm I am competent for the role, and I will plan, manage and monitor the building work, and co-operate with the client and the principal designer, so that the work complies with the Building Regulations.",
      ],
      [
        "sign",
        [
          ["Principal contractor", (many ? cd.pcName : "") || co.name],
          ["Signed for them by", co.owner],
        ],
      ],
      ["h2", "3. The principal designer accepts"],
      [
        "p",
        "I accept the appointment as principal designer under Part 2A of the Building Regulations 2010. I confirm I am competent for the role, and I will plan, manage and monitor the design work, and co-operate with the client and the principal contractor, so that the design complies with the Building Regulations.",
      ],
      ["sign", [["Principal designer", cd.pdName || cd.designer || ""]]],
      [
        "p",
        "Keep a copy with the job. The dates of these appointments go on the Building Control completion statement at the end of the job.",
      ],
    ]);
  /* Building Control commencement: the start notice, and the date the work counts as started */
  if (pick.bccommence)
    S2("Building Control commencement record", [
      [
        "rows",
        [
          ["Project", cd.project],
          ["Site address", cd.address],
          ["Client", cd.client],
          ["Building control body", cd.bc],
          ["Building control reference", cd.bcRef || cd.planning],
          ...(dom ? [["Domestic client", "Notices are given on behalf of a domestic client"]] : []),
        ],
      ],
      [
        "p",
        "Building control must be told before the work starts (traditionally at least 2 days before) and, under the October 2023 changes, when the work is regarded as commenced. Check your building control body's own deadlines and how they want to be told, and keep this record with the job.",
      ],
      ["h2", "Start notice"],
      [
        "rows",
        [
          ["Date work will start", ukDate(cd.start) || "___/___/______"],
          ["Building control told on", "___/___/______"],
          ["Told by (name)", cd.manager || co.owner],
          ["How (online form, email, phone)", "______________________________"],
          ["Their acknowledgement / reference", "______________________________"],
        ],
      ],
      ["h2", "When the work is regarded as commenced"],
      [
        "rows",
        [
          [
            "What counts as the start on this job",
            "______________________________ (e.g. foundations for the extension dug and concreted)",
          ],
          ["Date that was done", "___/___/______"],
          ["Building control told on", "___/___/______"],
          ["Their acknowledgement / reference", "______________________________"],
        ],
      ],
      ["h2", "Before you start"],
      [
        "checks",
        [
          ["Plans approved (full plans) or building notice accepted", ""],
          [
            "Principal designer and principal contractor appointed in writing (Building Regulations Part 2A)",
            "",
          ],
          [
            "Inspection stages agreed with building control (e.g. foundations, damp course, drains, pre-plaster, completion)",
            "",
          ],
          ["Party wall notices served and agreed, where needed", ""],
          ["Structural engineer's calculations sent to building control", ""],
        ],
      ],
      ["sign", [["Recorded by", cd.manager || co.owner]]],
    ]);
  {
    const cons = String(cd.otherContractors || "")
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const risks2 = CDM_RISKS.filter(([k]) => cd.risks && cd.risks[k]);
    const fw = (W0) => W0;
    if (pick.dominfo)
      S2("CDM 2015 - Information for our client", [
        ["h", "Building work on your home and the CDM 2015 Regulations"],
        [
          "rows",
          [
            ["To", cd.client],
            ["Property", cd.address],
            ["Work", cd.desc],
          ],
        ],
        ["p", `Dear ${cd.client || "client"},`],
        [
          "p",
          `The Construction (Design and Management) Regulations 2015 (CDM 2015) apply to all building work, including work on people's homes. Because ${dom ? 'you are having work done on your own home, you are a "domestic client" and the law passes your client duties to us' : "this work is for a business, you hold client duties under regulation 4"}. This letter explains what that means in plain English.`,
        ],
        ["h2", "What we will do"],
        [
          "bul",
          [
            `${co.name} will ${many ? "act as principal contractor and plan, manage and co-ordinate everyone working on site" : "plan, manage and monitor the work safely"}.`,
            many && dom && !cd.pdName
              ? `As no principal designer has been appointed in writing, ${co.name} will also take on the principal designer duties (unless you appoint your designer to do this - let us know if you would like to).`
              : "",
            "Prepare a construction phase plan before work starts, and give everyone a site induction.",
            "Provide toilet, washing, rest and drinking water facilities (or agree with you which of your facilities can be used).",
            "Keep the site secure and the work area separated from the parts of your home you are still using.",
            N.notifiable
              ? "Notify the Health and Safety Executive (form F10) before the work starts."
              : "",
          ].filter(Boolean),
        ],
        ["h2", "What we need from you"],
        [
          "bul",
          [
            "Any asbestos survey, or anything you know about asbestos in the property (built before 2000?).",
            "Drawings, surveys, structural calculations and building control / planning documents you hold.",
            "Where services run: gas, water, electricity, drains, oil tanks, septic tanks.",
            "Anything else that could affect safety: weak floors, previous fires, damp or structural problems.",
            "Please keep children, visitors and pets out of the work area, and tell us before you enter it.",
            "Tell us straight away if anything worries you about safety on site.",
          ],
        ],
        ["h2", "Agreed arrangements"],
        [
          "rows",
          [
            ["Working hours", cd.hours || "8:00am - 5:00pm Monday to Friday"],
            ["Parts of the home kept in use", cd.inUse || "To be agreed"],
            ["Access, parking and deliveries", cd.access || "To be agreed"],
            ["Welfare", cd.welfare || "To be agreed"],
            ["Main contact", cd.manager || co.owner],
          ],
        ],
        ["p", `If you have any questions, please ask. Yours sincerely, ${co.owner}, ${co.name}.`],
        [
          "sign",
          [
            ["Received by (client)", cd.client],
            ["For " + co.name, co.owner],
          ],
        ],
      ]);
    if (pick.subcon)
      S2("Contractor appointments & competence", [
        [
          "h",
          "Contractors and subcontractors (CDM 2015 reg. 8 and 15; Building Regulations Part 2A)",
        ],
        ["rows", head],
        [
          "p",
          "Everyone who works on this project must have the skills, knowledge, training and experience for their work. Check each contractor before they start and keep the evidence.",
        ],
        [
          "p",
          "Under Part 2A of the Building Regulations 2010 (from October 2023) everyone who carries out building work must also be competent to do it so that it complies with the Building Regulations – the skills, knowledge, experience and behaviours for the work – and must not take on work they are not competent for. The principal contractor must take all reasonable steps to check that the trades it brings in are competent before appointing them, and plan and monitor the work so that it complies.",
        ],
        [
          "tablew",
          [38, 26, 30, 24, 22, 178 - 140],
          [
            [
              "Contractor",
              "Trade",
              "Cards / registration seen (CSCS, Gas Safe, NICEIC...)",
              "Insurance seen",
              "RAMS received",
              "Induction done",
            ],
            (cons.length ? cons : [])
              .map((c) => [c, "", "", "", "", ""])
              .concat(Array(Math.max(3, 8 - cons.length)).fill(["", "", "", "", "", ""])),
          ],
        ],
        ["h2", "Information given to each contractor before they start"],
        [
          "bul",
          [
            "Construction phase plan (relevant parts) and site rules",
            "Pre-construction information: asbestos, services, ground conditions",
            "The RAMS for the work and how it fits with other trades",
            "Welfare, first aid and emergency arrangements",
            "Who to report to on site: " + (cd.manager || co.owner),
          ],
        ],
        ["h2", "Building Regulations: each trade confirms"],
        [
          "checks",
          [
            [
              "I am competent to carry out my part of the work so that it complies with the Building Regulations, and I will tell the principal contractor straight away if I am not",
              "",
            ],
            [
              "I will follow the approved plans and specification, and raise any change before making it",
              "",
            ],
            [
              "I will tell the principal contractor about anything that may not comply, and co-operate with the other dutyholders",
              "",
            ],
            [
              "Where my trade self-certifies (e.g. Part P electrics, Gas Safe, FENSA), I will notify it and give the certificate to the principal contractor",
              "",
            ],
          ],
        ],
        ["sign", [["Checked by", co.owner]]],
      ]);
    if (pick.welfare)
      S2("Welfare facilities check", [
        ["h", "Welfare facilities (CDM 2015 Schedule 2) - in place before work starts"],
        [
          "rows",
          [
            ["Project", cd.project],
            ["Site address", cd.address],
            ["Arrangements", cd.welfare],
          ],
        ],
        [
          "checks",
          [
            [
              "Toilets: enough for the number of people, kept clean, lit and ventilated (portaloo or agreed use of the client's)",
              "",
            ],
            [
              "Washing: hot and cold (or warm) running water, soap and a way to dry hands, next to the toilets",
              "",
            ],
            [
              "Washing for dirty work (e.g. cement, lead, contaminated ground): enough for forearms / face",
              "",
            ],
            ["Drinking water, with cups or a drinking fountain", ""],
            [
              "Rest area: seats with backs, tables, a way to boil water and heat food, and protection from the weather",
              "",
            ],
            ["Somewhere to change and to store and dry clothing and PPE", ""],
            ["Facilities kept clean, stocked and checked daily", ""],
            ["First aid kit stocked, and first aider named: " + (cd.firstAid || "________"), ""],
            ["Fire extinguishers at the fire point; escape routes kept clear", ""],
          ],
        ],
        ["sign", [["Checked by", cd.manager || co.owner]]],
      ]);
    if (pick.emerg)
      S2("Emergency, fire & first aid plan", [
        ["h", "Emergency procedures (CDM 2015 reg. 30-32)"],
        [
          "rows",
          [
            ["Site address", cd.address],
            ["what3words", cd.w3w],
            [
              "Give the site to 999 as",
              cd.address + (cd.w3w ? " (what3words ///" + cd.w3w.replace(/^\/+/, "") + ")" : ""),
            ],
            ["Site manager", cd.manager],
            ["First aider(s)", cd.firstAid],
            ["First aid kit", cd.firstAidKit],
            ["Nearest A&E", cd.hospital],
            ["Fire assembly point", cd.assembly],
          ],
        ],
        ["h2", "If there is a fire"],
        [
          "bul",
          [
            'Raise the alarm - shout "FIRE" and warn everyone, including the household.',
            "Call 999. Only tackle a small fire if it is safe and you are trained.",
            "Leave by the nearest safe route and go to the assembly point: " +
              (cd.assembly || "________") +
              ".",
            "The site manager checks everyone is out using the sign-in list. Do not go back in.",
          ],
        ],
        ["h2", "If someone is hurt"],
        [
          "bul",
          [
            "Make the area safe. Call the first aider: " + (cd.firstAid || "________") + ".",
            "Call 999 for anything serious. Send someone to meet the ambulance.",
            "Record it in the app (Accidents & near misses). Some injuries must be reported to HSE under RIDDOR.",
          ],
        ],
        ["h2", "Other emergencies"],
        [
          "bul",
          [
            "Gas smell or strike: stop work, no flames or switches, open doors, evacuate, call 0800 111 999.",
            "Cable strike: stay clear, keep others away, call the network operator (105) and 999 if anyone is hurt.",
            "Water main strike: isolate if safe, call the water company.",
            "Collapse or structural movement: get everyone out, keep clear, call 999 and the engineer" +
              (cd.engineer ? " (" + cd.engineer + ")" : "") +
              ".",
          ],
        ],
        ["h2", "Fire precautions on site"],
        [
          "bul",
          [
            "Fire point with extinguishers (CO2 for electrical, foam / water for general) kept by " +
              (cd.assembly ? "the site entrance" : "the site entrance"),
            "Hot works permit for cutting, grinding and torch-on; fire watch for an hour after",
            "Waste removed regularly; no burning on site; flammables and gas bottles stored outside and secure",
            "Escape routes and the household's exits kept clear at all times",
          ],
        ],
      ]);
    if (pick.drr)
      S2("Design risk register", [
        ["h", "Design risk register (CDM 2015 reg. 9)"],
        ["rows", head],
        [
          "p",
          "Hazards the design creates or leaves for the people building, maintaining or using the building. Designers eliminate what they can, reduce the rest and record what is left for the contractor.",
        ],
        [
          "tablew",
          [44, 62, 46, 178 - 152],
          [
            ["Hazard", "How the design deals with it", "Risk left for the contractor", "Who"],
            risks2
              .map(([k, l]) => [l.split(" (")[0], "", CDM_CTRL[k] || "See RAMS", ""])
              .concat(cd.designRisks ? [[cd.designRisks, "", "", ""]] : [])
              .concat([
                ["", "", "", ""],
                ["", "", "", ""],
              ]),
          ],
        ],
        [
          "sign",
          [
            ["Designer", cd.designer],
            ["Principal designer", many ? cd.pdName || co.name : "-"],
            ["Principal contractor", co.name],
          ],
        ],
      ]);
    if (pick.tw) {
      const tw = [];
      if (cd.risks && cd.risks.struct)
        tw.push("Propping / needles for structural openings and steel beams");
      if (cd.risks && cd.risks.exc) tw.push("Excavation / trench support");
      if (cd.risks && cd.risks.wah) tw.push("Scaffold (design / TG20 compliance sheet)");
      if (cd.risks && cd.risks.demo) tw.push("Temporary support during demolition");
      if (cd.risks && cd.risks.lift) tw.push("Crane / telehandler standing and outrigger pads");
      S2("Temporary works register", [
        ["h", "Temporary works register"],
        [
          "rows",
          [
            ["Project", cd.project],
            ["Temporary works co-ordinator", cd.manager || co.owner],
            ["Structural engineer", cd.engineer],
          ],
        ],
        [
          "p",
          "List every temporary work (propping, excavation support, scaffold, hoarding, back-propping). Nothing is loaded until it has been checked, and nothing is removed until it is safe to do so.",
        ],
        [
          "tablew",
          [50, 30, 28, 28, 178 - 136],
          [
            [
              "Temporary work",
              "Designed by",
              "Checked by / date",
              "OK to load (date)",
              "OK to remove (date)",
            ],
            tw
              .map((t) => [t, "", "", "", ""])
              .concat(Array(Math.max(3, 8 - tw.length)).fill(["", "", "", "", ""])),
          ],
        ],
      ]);
    }
    if (pick.notice)
      S2("Site information", [
        ["h", cd.project || "Site information"],
        [
          "rows",
          [
            ["Site address", cd.address],
            ["Principal contractor", PC],
            ["Client", cd.client],
            ["Site manager", cd.manager],
            ["First aider(s)", cd.firstAid],
            ["First aid kit", cd.firstAidKit],
            ["Fire assembly point", cd.assembly],
            ["Nearest A&E", cd.hospital],
            [
              "Emergency",
              "999 - give the site as " +
                (cd.address || "") +
                (cd.w3w ? " (what3words ///" + cd.w3w.replace(/^\/+/, "") + ")" : ""),
            ],
            ["Gas emergency", "0800 111 999"],
            ["Power cut / cable strike", "105"],
            ["Working hours", cd.hours || "8:00am - 5:00pm Monday to Friday"],
            ["HSE F10", N.notifiable ? "Notifiable - F10 displayed below" : "Not notifiable"],
          ],
        ],
        ["h2", "Site rules"],
        [
          "bul",
          (
            cd.rules ||
            "Sign in and out every day.\nNo one starts work without a site induction.\nWear safety boots, hi-vis and the PPE your RAMS needs.\nNo smoking or vaping except in the agreed area.\nKeep access routes and fire escapes clear.\nReport accidents, near misses and anything unsafe to the site manager.\nKeep the site secure: gates closed, plant and tools locked away."
          )
            .split("\n")
            .filter(Boolean),
        ],
      ]);
    if (pick.hotpermit)
      S2("Hot works permit", [
        ["h", "Hot works permit - valid for one shift only"],
        [
          "rows",
          [
            ["Site", cd.address],
            ["Issued by", cd.manager || co.owner],
          ],
        ],
        [
          "rows",
          [
            ["Work to be done", "______________________________________________"],
            ["Exact location", "______________________________________________"],
            ["Person doing the work", "______________________________________________"],
            ["Valid from / to", "____:____  to  ____:____   on  ___/___/______"],
          ],
        ],
        ["h2", "Before work starts"],
        [
          "checks",
          [
            [
              "Combustible materials removed or covered within 10 m (timber, insulation, membranes, dust, waste)",
              "",
            ],
            ["Floors swept; gaps and openings where sparks could fall are covered", ""],
            [
              "Fire extinguisher (and fire blanket) at the work, and the person knows how to use it",
              "",
            ],
            [
              "Gas bottles secure and upright, hoses and regulators checked, flashback arrestors fitted",
              "",
            ],
            ["Smoke detectors in the area isolated only if agreed, and reinstated after", ""],
            ["Area above / below / behind walls checked for hidden combustibles and services", ""],
            ["Household / others told and kept away", ""],
          ],
        ],
        ["h2", "After work"],
        [
          "checks",
          [
            [
              "Fire watch for at least 60 minutes after work stops (no hot works in the last hour of the day)",
              "",
            ],
            ["Area checked again before leaving site; permit closed", ""],
          ],
        ],
        [
          "sign",
          [
            ["Issued by", cd.manager || co.owner],
            ["Accepted by (operative)", ""],
            ["Fire watch / closed by", ""],
          ],
        ],
      ]);
    if (pick.dig)
      S2("Permit to dig", [
        ["h", "Permit to dig - services check before excavating"],
        [
          "rows",
          [
            ["Site", cd.address],
            ["Known services", cd.services],
          ],
        ],
        [
          "rows",
          [
            ["Excavation location", "______________________________________________"],
            ["Depth / size", "______________________________________________"],
            ["Dug by", "______________________________________________"],
            ["Date", "___/___/______"],
          ],
        ],
        [
          "checks",
          [
            ["Utility drawings obtained and checked (electric, gas, water, telecoms, drains)", ""],
            [
              "Area scanned with CAT and genny by a trained person; services marked on the ground",
              "",
            ],
            ["Overhead lines identified; goal posts / exclusion zone if needed", ""],
            [
              "Trial holes hand dug to locate marked services; no mechanical digging within 500 mm",
              "",
            ],
            ["Excavation support / battering in place where needed; edge barriers and covers", ""],
            ["Spoil and plant kept back from the edge; safe access ladder", ""],
            [
              "Ground conditions and water checked; excavation inspected at the start of each shift",
              "",
            ],
          ],
        ],
        [
          "sign",
          [
            ["Issued by", cd.manager || co.owner],
            ["Accepted by", ""],
          ],
        ],
      ]);
    if (pick.log)
      S2("Site inspection & CPP review log", [
        ["h", "Weekly site inspection and construction phase plan review"],
        [
          "rows",
          [
            ["Project", cd.project],
            ["Site manager", cd.manager || co.owner],
          ],
        ],
        [
          "p",
          "Walk the site at least weekly (and after any change, bad weather or incident). Record what you found and what you did. Review the construction phase plan when the work changes and note the changes here.",
        ],
        [
          "tablew",
          [24, 58, 58, 178 - 140],
          [
            [
              "Date",
              "Checked (scaffold, edges, excavations, welfare, fire, housekeeping, services...)",
              "Problems found and action taken",
              "Signed",
            ],
            Array(14).fill(["", "", "", ""]),
          ],
        ],
      ]);
  }
  return out;
}
const CDM_CTRL = {
  asb: "Asbestos survey before work starts; if found, licensed contractor or notifiable non-licensed work procedures; stop work and report if suspected material is found.",
  svc: "Drawings checked; CAT and genny scan before digging; hand dig near services; overhead lines protected.",
  wah: "Scaffold by competent contractor, inspected weekly and after changes; edge protection; ladders for short duration only; tag system.",
  fragile: "No access to fragile surfaces; covers / staging and safety netting; signs.",
  exc: "Battered or supported sides; barriers and covers; inspected each shift; spoil and plant kept back from edges.",
  struct: "Temporary works design by engineer; propping sequence in RAMS; checked before loading.",
  demo: "Survey and method statement; services isolated; exclusion zones; dust suppression.",
  occ: "Separate access for the household; dust screens and floor protection; daily clear-up; escape routes kept clear.",
  public: "Site fenced and signed; gates closed; children and pets kept away; footways kept clear.",
  traffic:
    "Deliveries booked; banksman for reversing; pedestrian routes separated; no parking blocking access.",
  lift: "Lift plan by competent person; lifting equipment LOLER-inspected; exclusion zone under loads.",
  hot: "Hot works permit; fire extinguisher at the work; fire watch for an hour after.",
  dust: "On-tool extraction or water suppression; FFP3 masks (face-fit tested); clean with H-class vacuum, not dry sweeping.",
  noise:
    "Low-noise / low-vibration tools; hearing protection zones; HAVS exposure limited by rotating tasks.",
  coshh: "COSHH assessments; gloves and eye protection; washing facilities; stored securely.",
  manual: "Mechanical aids; team lifts; materials delivered close to where used; training.",
  confined: "Avoid entry; if essential, permit, gas monitor, rescue plan and trained people only.",
  ground:
    "Ground investigation reviewed; gloves and hygiene; specialist treatment for knotweed; radon protection to design.",
  water: "Covers and barriers on chambers and soakaways; no lone working near water.",
  fire: "Fire point with extinguishers; waste removed daily; flammables stored safely; no burning on site.",
  elec: "110 V tools; RCD protection; leads inspected; electrical work by competent, registered electricians only.",
  eco: "Ecology report followed; works timed around nesting season; tree root protection areas fenced.",
};
function npOSGB(lat, lon) {
  const rad = Math.PI / 180;
  // WGS84 -> OSGB36 (Helmert)
  let a = 6378137,
    b = 6356752.3142,
    e2 = 1 - (b * b) / (a * a);
  let ph = lat * rad,
    la = lon * rad;
  let nu = a / Math.sqrt(1 - e2 * Math.sin(ph) ** 2);
  let x = nu * Math.cos(ph) * Math.cos(la),
    y = nu * Math.cos(ph) * Math.sin(la),
    z = (1 - e2) * nu * Math.sin(ph);
  const tx = -446.448,
    ty = 125.157,
    tz = -542.06,
    s = 20.4894e-6,
    rx = (-0.1502 / 3600) * rad,
    ry = (-0.247 / 3600) * rad,
    rz = (-0.8421 / 3600) * rad;
  const x2 = tx + (1 + s) * x + -rz * y + ry * z,
    y2 = ty + rz * x + (1 + s) * y + -rx * z,
    z2 = tz + -ry * x + rx * y + (1 + s) * z;
  a = 6377563.396;
  b = 6356256.909;
  e2 = 1 - (b * b) / (a * a);
  const p = Math.hypot(x2, y2);
  let phi = Math.atan2(z2, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    phi = Math.atan2(z2 + e2 * nu * Math.sin(phi), p);
  }
  const lam = Math.atan2(y2, x2);
  const F0 = 0.9996012717,
    lat0 = 49 * rad,
    lon0 = -2 * rad,
    N0 = -100000,
    E0 = 400000,
    n = (a - b) / (a + b);
  nu = (a * F0) / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi) ** 2, 1.5),
    eta2 = nu / rho - 1;
  const Ma = (1 + n + (5 / 4) * n * n + (5 / 4) * n ** 3) * (phi - lat0),
    Mb = (3 * n + 3 * n * n + (21 / 8) * n ** 3) * Math.sin(phi - lat0) * Math.cos(phi + lat0),
    Mc =
      ((15 / 8) * n * n + (15 / 8) * n ** 3) *
      Math.sin(2 * (phi - lat0)) *
      Math.cos(2 * (phi + lat0)),
    Md = (35 / 24) * n ** 3 * Math.sin(3 * (phi - lat0)) * Math.cos(3 * (phi + lat0));
  const M = b * F0 * (Ma - Mb + Mc - Md);
  const c = Math.cos(phi),
    sn = Math.sin(phi),
    t = Math.tan(phi);
  const I = M + N0,
    II = (nu / 2) * sn * c,
    III = (nu / 24) * sn * c ** 3 * (5 - t * t + 9 * eta2),
    IIIA = (nu / 720) * sn * c ** 5 * (61 - 58 * t * t + t ** 4),
    IV = nu * c,
    V = (nu / 6) * c ** 3 * (nu / rho - t * t),
    VI = (nu / 120) * c ** 5 * (5 - 18 * t * t + t ** 4 + 14 * eta2 - 58 * t * t * eta2);
  const dl = lam - lon0;
  const N = I + II * dl ** 2 + III * dl ** 4 + IIIA * dl ** 6,
    E = E0 + IV * dl + V * dl ** 3 + VI * dl ** 5;
  const e100k = Math.floor(E / 100000),
    n100k = Math.floor(N / 100000);
  let l1 = 19 - n100k - ((19 - n100k) % 5) + Math.floor((e100k + 10) / 5),
    l2 = (((19 - n100k) * 5) % 25) + (e100k % 5);
  if (l1 > 7) l1++;
  if (l2 > 7) l2++;
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const g =
    L[l1] +
    L[l2] +
    String(Math.floor((E % 100000) / 100)).padStart(3, "0") +
    String(Math.floor((N % 100000) / 100)).padStart(3, "0");
  return { e: Math.round(E), n: Math.round(N), grid: g };
}

/* welfare unit notices: stand-alone, big print, one notice per page */
async function welfarePackPdf(cd) {
  await loadJsPdf();
  const co = coData();
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const W = 210,
    M = 15;
  let y = 0;
  const clean = (t) =>
    String(t == null ? "" : t)
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\u2032/g, "'")
      .replace(/\u2033/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
  const RGB = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const t = (s2, size, style, x, col, w) => {
    doc.setFont("helvetica", style || "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(col || [20, 20, 20]));
    const ls = doc.splitTextToSize(clean(s2), w || W - 2 * M - (x || 0));
    ls.forEach((l) => {
      doc.text(l, M + (x || 0), y);
      y += size * 0.42;
    });
    doc.setTextColor(20, 20, 20);
    return ls.length;
  };
  let first = true;
  const page = async (title, col, sub) => {
    if (!first) doc.addPage();
    first = false;
    y = 0;
    doc.setFillColor(...BRGB());
    doc.rect(0, 0, W, 5, "F");
    await pdfLogo(doc, W - M, 9, 46, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRGB());
    doc.text(clean(co.name.toUpperCase()), M, 14);
    doc.setFillColor(...RGB(col));
    doc.rect(M, 32, W - 2 * M, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(clean(title), W / 2, 43, { align: "center" });
    doc.setTextColor(20, 20, 20);
    y = 58;
    if (sub) {
      t(sub, 12, "bold");
      y += 2;
    }
  };
  const kv = (l, v, big) => {
    if (!v) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(big ? 12 : 11);
    const ls = doc.splitTextToSize(clean(v), W - 2 * M - 62);
    doc.setTextColor(100, 90, 90);
    doc.text(clean(l), M, y);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", big ? "bold" : "normal");
    ls.forEach((ln, i) => doc.text(ln, M + 62, y + i * 5.2));
    y += Math.max(1, ls.length) * 5.2 + 2.6;
    doc.setDrawColor(220);
    doc.line(M, y - 3.2, W - M, y - 3.2);
  };
  const foot = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      clean(`${co.name} · ${cd.project || cd.address || ""} · printed ${ukDate(iso(new Date()))}`),
      M,
      290,
    );
    doc.setTextColor(20, 20, 20);
  };
  const addrLines = String(cd.address || cd.site || "")
    .split(/\s*,\s*|\n/)
    .filter(Boolean);
  const ll = String(cd.latlon || "")
    .split(/[,\s]+/)
    .map(Number)
    .filter((v) => isFinite(v));
  let os = null,
    dms = "";
  if (ll.length >= 2 && Math.abs(ll[0]) <= 90) {
    try {
      os = npOSGB(ll[0], ll[1]);
    } catch (e) {}
    const f = (v, p, ng) => {
      const a = Math.abs(v),
        d = Math.floor(a),
        mi = Math.floor((a - d) * 60),
        se = Math.round(((a - d) * 60 - mi) * 60);
      return `${String(d).padStart(p, "0")}°${String(mi).padStart(2, "0")}'${String(se).padStart(2, "0")}"${v < 0 ? ng[1] : ng[0]}`;
    };
    dms = f(ll[0], 2, "NS") + " , " + f(ll[1], 3, "EW");
  }
  const aiders = String(cd.firstAid || "")
    .split(/\s*[,;\n]\s*|\s+and\s+/)
    .filter(Boolean);
  const agent = [cd.manager || co.owner, cd.agentPhone].filter(Boolean).join(" on ");
  const w3 = String(cd.w3w || "").replace(/^\/+/, "");
  /* 1. site details and contacts */
  await page("SITE DETAILS AND CONTACTS", "#1f2937", cd.desc ? cd.desc : "");
  kv("Client(s)", cd.client, true);
  kv("Client contact details", cd.clientPhone);
  kv("Site address", addrLines.join("\n"), true);
  kv("Grid reference", os ? os.grid : "");
  kv("Lat, long (decimal)", ll.length >= 2 ? ll[0] + " , " + ll[1] : "");
  kv("Lat, long (deg/min/sec)", dms);
  kv("Easting / Northing", os ? `X ${os.e}  /  Y ${String(os.n).padStart(6, "0")}` : "");
  kv("what3words", w3 ? "/// " + w3 : "");
  kv("Planning ref", cd.planning);
  kv("Building Control ref", cd.bcRef);
  kv("Site manager", agent);
  kv("Principal contractor", cd.pcName || co.name);
  kv("Nearest A&E", cd.hospital);
  foot();
  /* 2. fire notice */
  await page("FIRE NOTICE", "#b91c1c", "ACTION IN THE EVENT OF A FIRE");
  if (cd.desc) {
    t("Project: " + cd.desc, 11, "normal");
    y += 3;
  }
  const step = (n, h, lines) => {
    doc.setFillColor(185, 28, 28);
    doc.circle(M + 5, y - 1.5, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(String(n), M + 5, y, { align: "center" });
    doc.setTextColor(20, 20, 20);
    t(h, 14, "bold", 14);
    y += 1;
    lines.forEach((l) => {
      t(l, 11.5, "normal", 14);
      y += 1;
    });
    y += 4;
  };
  step(1, "RAISE THE ALARM", [
    cd.alarm || "Raise the alarm: shout FIRE and sound the alarm at the fire point.",
  ]);
  step(2, "REPORT THE FIRE", [
    `To any ${co.name} personnel or the site manager, who will:`,
    `(a) Dial 999 to call the Fire Brigade and report a fire at: ${addrLines.join(", ")}${w3 ? " (what3words /// " + w3 + ")" : ""}`,
    "(b) Put the evacuation procedure into action",
  ]);
  step(3, "ON HEARING THE ALARM", [
    `Everyone go to the assembly point at: ${cd.assembly || "[assembly point]"}`,
    "As explained at the site induction.",
  ]);
  step(4, "SPECIAL INSTRUCTIONS", [
    "(a) The site manager takes charge and tackles the fire with the equipment provided only if it is safe to do so.",
    "(b) Everyone else leaves the area at once by the nearest escape route.",
    "(c) Do not run.",
    "(d) Do not stop to collect personal belongings.",
    "(e) Turn off powered and heat-producing equipment if safe to do so.",
    "(f) Follow all instructions.",
  ]);
  foot();
  /* 3. emergency procedures */
  await page("EMERGENCY PROCEDURES", "#15803d");
  t("YOUR LOCATION IS:", 13, "bold");
  y += 1;
  addrLines.forEach((l) => {
    t(l, 15, "bold", 6);
  });
  if (w3) {
    y += 1;
    t("WHAT3WORDS:  /// " + w3, 13, "bold", 6);
  }
  y += 4;
  t("THE FIRST AIDERS ON SITE ARE:", 13, "bold");
  y += 1;
  (aiders.length ? aiders : ["[name]"]).forEach((a) => t(a, 14, "bold", 6));
  y += 4;
  t(
    "IN A SERIOUS INCIDENT OR EMERGENCY, USE A MOBILE PHONE OR THE PHONE IN THE SITE OFFICE IF THERE IS ONE, AND:",
    11.5,
    "bold",
  );
  y += 2;
  [
    "DIAL 999",
    "GIVE THE OPERATOR YOUR PHONE NUMBER AND ASK FOR THE SERVICE YOU NEED (FIRE OR AMBULANCE)",
    "TELL THEM YOU ARE AT THE CONSTRUCTION SITE AT THE ADDRESS ABOVE" +
      (w3 ? " (WHAT3WORDS /// " + w3.toUpperCase() + ")" : ""),
    "STAY ON THE PHONE UNTIL THE EMERGENCY SERVICES TELL YOU OTHERWISE",
  ].forEach((l, i) => {
    t(`${i + 1}.  ${l}`, 11.5, "normal", 4);
    y += 1;
  });
  y += 4;
  t("MINOR ACCIDENTS", 13, "bold");
  y += 1;
  t(
    `A first aid box is kept ${cd.firstAidKit ? "at: " + cd.firstAidKit : "in the site welfare unit / office"}.`,
    11.5,
    "normal",
  );
  y += 4;
  if (cd.hospital) {
    t("NEAREST A&E", 13, "bold");
    y += 1;
    t(cd.hospital, 11.5, "normal");
    y += 4;
  }
  t("REPORTING", 13, "bold");
  y += 1;
  t(
    `Report ALL incidents, accidents and near misses to the site manager: ${agent || "[name and phone]"}`,
    11.5,
    "normal",
  );
  foot();
  /* 4. emergency phone numbers */
  await page("EMERGENCY TELEPHONE NUMBERS", "#b91c1c");
  [
    ["Police", "999"],
    ["Fire & Rescue", "999"],
    ["Ambulance", "999"],
    ["NHS non-emergency", "111"],
    ["Environment Agency (pollution)", "0800 80 70 60"],
    ["Power cut / electricity emergency", "105"],
    ["Gas emergency (National Gas)", "0800 111 999"],
    ["Telecoms (Openreach) damage", "0800 023 2023"],
    ["Site manager", agent],
    ["Office", [co.name, co.phone || co.mobile].filter(Boolean).join(" · ")],
    ["Nearest A&E", cd.hospital],
  ]
    .filter((r) => r[1])
    .forEach(([l, v]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(clean(l), M, y);
      doc.setTextColor(185, 28, 28);
      doc.text(clean(v), W - M, y, { align: "right" });
      doc.setTextColor(20, 20, 20);
      doc.setDrawColor(200);
      doc.line(M, y + 3, W - M, y + 3);
      y += 12;
    });
  foot();
  /* 5. site rules */
  await page(
    "SITE RULES",
    "#1f2937",
    "These rules apply to everyone on site. Please read and follow them at all times.",
  );
  t(
    `Document ref: JEB-HS-11  |  Version 1.0  |  Issued: ${ukDate(iso(new Date()))}`,
    8.5,
    "normal",
    0,
    [110, 100, 100],
  );
  y += 3;
  const R2 = [
    [
      "On arrival",
      [
        "Sign in at the site office / entrance before entering the working area, and sign out when you leave.",
        "All visitors and deliveries must report to the site office first.",
        "Complete your site induction before starting any work.",
      ],
    ],
    [
      "PPE: always worn in the working area",
      [
        "Hard hat",
        "Hi-vis clothing",
        "Safety boots",
        "Any task-specific PPE in the risk assessment for the job",
      ],
    ],
    [
      "Conduct",
      [
        "No smoking except in designated areas.",
        "No alcohol or illegal drugs on site at any time.",
        "No radios or headphones that stop you hearing warnings or instructions.",
        "Treat colleagues, visitors and the public with courtesy and respect.",
        "Keep noise down, especially near occupied buildings.",
      ],
    ],
    [
      "Work practices",
      [
        "Only do work you are trained, competent and authorised to do.",
        "Follow the risk assessment and method statement for your task. If in doubt, ask.",
        "Never remove or bypass guards, barriers or safety equipment.",
        "Hot works, digging, confined spaces and working at height need a signed permit before you start.",
        "No lone working on high-risk tasks without permission.",
        "Keep your work area tidy and free of trip hazards.",
      ],
    ],
    [
      "Vehicles and plant",
      [
        "Keep to the site speed limit and the marked routes.",
        "Only trained and authorised operators may use plant or machinery.",
        "Pedestrians have priority on walkways. Always watch for moving vehicles and plant.",
      ],
    ],
    [
      "Emergencies",
      [
        `If you discover a fire, raise the alarm and go to the assembly point: ${cd.assembly || "[location]"}.`,
        "Report all accidents, incidents and near misses to your supervisor straight away.",
        `First aid box: ${cd.firstAidKit || "in the welfare unit / site office"}.`,
        "In a life-threatening emergency, call 999 first.",
      ],
    ],
    [
      "Environment",
      [
        "Use the correct skip or bin. Keep waste separated.",
        "Report spills or environmental worries to your supervisor straight away.",
        "Never block fire exits, walkways or emergency equipment with materials or waste.",
      ],
    ],
    [
      "Breaking the site rules",
      [
        "Not following these rules may lead to removal from site and, for employees or subcontractors, disciplinary action or ending of the contract, especially where safety has been put at risk.",
      ],
    ],
  ];
  R2.forEach(([h, ls]) => {
    if (y > 270) {
      foot();
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(...BRGB());
    doc.rect(M, y - 4.2, W - 2 * M, 6.4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(clean(h.toUpperCase()), M + 2, y);
    doc.setTextColor(20, 20, 20);
    y += 5.4;
    ls.forEach((l) => {
      if (y > 282) {
        foot();
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9.6);
      doc.text("•", M + 2, y);
      t(l, 9.6, "normal", 7);
      y += 0.3;
    });
    y += 2.2;
  });
  foot();
  return doc.output("blob");
}
async function cdmPdf(sections, cd) {
  await loadJsPdf();
  const co = coData();
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const W = 210,
    M = 16;
  let y = 18,
    first = true;
  const clean = (t) =>
    String(t == null ? "" : t)
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
  const need = (h) => {
    if (y + h > 280) {
      foot();
      doc.addPage();
      y = 18;
      band();
    }
  };
  let page = 0;
  const band = () => {
    page++;
    doc.setFillColor(...BRGB());
    doc.rect(0, 0, W, 5, "F");
  };
  const foot = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      clean(
        `${co.name} · ${cd.project || ""} · CDM 2015 documents · prepared ${ukDate(iso(new Date()))}`,
      ),
      M,
      290,
    );
    doc.text("Page " + page, W - M, 290, { align: "right" });
    doc.setTextColor(0);
  };
  const text = (t, size = 10, style = "normal", indent = 0, gap = 1.6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.splitTextToSize(clean(t), W - 2 * M - indent).forEach((l) => {
      need(size * 0.45);
      doc.text(l, M + indent, y);
      y += size * 0.43;
    });
    y += gap;
  };
  const rows = (list) =>
    list
      .filter((r) => r[1] != null && r[1] !== "")
      .forEach(([l, v]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(clean(v), W - 2 * M - 58);
        need(Math.max(5, lines.length * 4.1) + 1);
        doc.text(clean(l), M, y);
        doc.setFont("helvetica", "normal");
        lines.forEach((ln, i) => {
          doc.text(ln, M + 58, y + i * 4.1);
        });
        y += Math.max(4.6, lines.length * 4.1) + 1.2;
      });
  const table = (cols, data) => {
    const n = cols.length;
    const ws =
      n === 2
        ? [60, W - 2 * M - 60]
        : n === 3
          ? [34, 46, W - 2 * M - 80]
          : ((b2w) => (b2w && b2w.length === n ? b2w : Array(n).fill((W - 2 * M) / n)))(table.w);
    table.w = null;
    const xs = [M];
    ws.forEach((w, i) => xs.push(xs[i] + w));
    const pad = 1.6;
    const drawRow = (cells, bold, fill) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(8.6);
      const ls = cells.map((c2, i) => doc.splitTextToSize(clean(c2), ws[i] - pad * 2));
      const h = Math.max(...ls.map((l) => l.length)) * 3.8 + pad * 2;
      need(h);
      if (fill) {
        doc.setFillColor(240, 236, 236);
        doc.rect(M, y - 3.6, W - 2 * M, h, "F");
      }
      doc.setDrawColor(200);
      ls.forEach((l, i) => {
        doc.rect(xs[i], y - 3.6, ws[i], h);
        l.forEach((t, j) => doc.text(t, xs[i] + pad, y + pad - 0.4 + j * 3.8));
      });
      y += h;
    };
    drawRow(cols, true, true);
    data.forEach((r) => drawRow(r, false, false));
    y += 3;
  };
  const box = (t, status) => {
    need(7);
    doc.setDrawColor(60);
    doc.rect(M, y - 3.3, 3.8, 3.8);
    if (status === "N/A") {
      doc.setFontSize(6.5);
      doc.text("N/A", M + 0.1, y - 0.4);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    const ls = doc.splitTextToSize(clean(t), W - 2 * M - 10);
    ls.forEach((l, i) => {
      if (i) need(4.2);
      doc.text(l, M + 7, y + i * 4.2);
    });
    y += ls.length * 4.2 + 1.6;
  };
  const sign = (list) => {
    list.forEach(([role, name]) => {
      need(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(clean(role), 48)[0], M, y);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(clean(name || ""), 44)[0], M + 52, y);
      doc.setDrawColor(120);
      doc.line(M + 100, y, M + 150, y);
      doc.line(M + 155, y, W - M, y);
      doc.setFontSize(7);
      doc.text("Signature", M + 100, y + 3.5);
      doc.text("Date", M + 155, y + 3.5);
      y += 12;
    });
  };
  for (const sec of sections) {
    if (!first) {
      foot();
      doc.addPage();
      y = 18;
    }
    band();
    first = false;
    if (page === 1) await pdfLogo(doc, W - M, 10, 48, 22);
    text(co.name.toUpperCase(), 8.5, "bold", 0, 5);
    text(sec.title, 17, "bold", 0, 3);
    for (const [k, a, b2] of sec.blocks) {
      if (k === "h") text(a, 11, "bold", 0, 2);
      else if (k === "h2") {
        y += 2;
        text(a, 11.5, "bold", 0, 1.5);
      } else if (k === "p") text(a, 9.5, "normal", 0, 2.2);
      else if (k === "rows") {
        rows(a);
        y += 1.5;
      } else if (k === "bul")
        a.forEach((t) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          need(5);
          doc.text("•", M + 1, y);
          text(t, 9.5, "normal", 5, 0.8);
        });
      else if (k === "table") {
        table.w = null;
        table(a, b2);
      } else if (k === "tablew") {
        table.w = a;
        table(b2[0], b2[1]);
      } else if (k === "checks") a.forEach(([t, st]) => box(t, st));
      else if (k === "sign") sign(a);
    }
  }
  foot();
  return doc.output("blob");
}
function cdmMaker(site0) {
  const sites = siteNames().filter(liveSite);
  if (!sites.length) {
    toast("Add a site first");
    return;
  }
  let site = site0 && sites.includes(site0) ? site0 : sites[0];
  const cls = (S.clients || [])
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const fill = () => {
    const c = siteClient(site);
    const ind = indFor(site);
    const det = (ind && ind.details) || {};
    let job = {};
    try {
      const sm = sjMaster(site);
      job = (sm && sm.job) || {};
    } catch (e) {}
    const sr = siteRec(site) || {};
    const co = coData();
    return {
      clientPhone: c ? [c.phone, c.phone2].filter(Boolean).join(", ") : "",
      latlon:
        sr.lat != null ? sr.lat + ", " + sr.lon : c && c.lat != null ? c.lat + ", " + c.lon : "",
      bcRef: "",
      alarm: "Ring the fire alarm bell or sound the klaxon or horn at the fire point",
      agentPhone: co.mobile || "",
      site,
      clientId: c ? c.id : "",
      client: c ? c.name : "",
      clientType: "domestic",
      project: site.split(",")[0],
      address: (c && clAddr(c)) || site,
      desc: job.scope || job.work || (c && (c.desc || c.work)) || sr.project || "",
      start: job.start || "",
      finish: job.finish || "",
      weeks: "",
      workDays: "",
      maxWorkers: "",
      personDays: "",
      contractors: "many",
      pcName: co.name,
      pdName: "",
      designer: "",
      engineer: "",
      bc: "",
      planning: "",
      manager: det.manager || co.owner,
      firstAid: det.firstaider || "",
      firstAidKit: det.firstaid || "",
      hospital: det.hospital || "",
      assembly: det.assembly || "",
      welfare: det.welfare || "",
      hours: det.hours || "",
      rules: "",
      w3w: "",
      asbestos: "",
      services: "",
      groundInfo: "",
      otherInfo: "",
      designRisks: "",
      inUse: "",
      access: "",
      otherContractors: "",
      risks: { wah: 1, manual: 1, dust: 1, noise: 1, traffic: 1, svc: 1, occ: 1 },
    };
  };
  const ckey = (n) =>
    "cdm_" +
    String(n)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 90);
  const carry = () => {
    const o = (S.cdmRecs || [])
      .filter((r) => r.cd && !same(r.site, site))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))[0];
    if (!o) return {};
    const r = {};
    ["hours", "rules", "welfare", "manager", "firstAid", "firstAidKit", "pcName", "bc"].forEach(
      (k) => {
        if (o.cd[k]) r[k] = o.cd[k];
      },
    );
    return r;
  };
  const load = () => {
    const rec = (S.cdmRecs || []).find((r) => same(r.site, site));
    const loc = store.get("jeb.cdm." + site, null);
    const f = fill();
    const c = Object.assign({}, f, rec || loc ? {} : carry(), loc || {}, (rec && rec.cd) || {});
    c._from = rec ? rec.updated || 1 : loc ? 1 : 0;
    c._carried = !rec && !loc && Object.keys(carry()).length > 0;
    return c;
  };
  const persist = async () => {
    const c = Object.assign({}, cd);
    delete c._from;
    delete c._carried;
    store.set("jeb.cdm." + site, c);
    try {
      await S.db.doc("todos/" + ckey(site)).set({ kind: "cdm", site, cd: c, updated: Date.now() });
      const i = (S.cdmRecs || []).findIndex((r) => same(r.site, site));
      const rr = { id: ckey(site), kind: "cdm", site, cd: c, updated: Date.now() };
      S.cdmRecs = (S.cdmRecs || []).slice();
      if (i >= 0) S.cdmRecs[i] = rr;
      else S.cdmRecs.push(rr);
    } catch (e) {}
  };
  let cd = load();
  const madeOf = (k) =>
    (S.docs || [])
      .filter((d) => same(d.site, site) && Array.isArray(d.cdm) && d.cdm.includes(k))
      .sort((a, b) => (b.uploaded || 0) - (a.uploaded || 0))[0];
  let pk = {};
  {
    const first = CDM_DOCS.find(([k]) => !madeOf(k));
    if (first) pk[first[0]] = 1;
  }
  let vis = "me",
    toCl = false,
    askSign = true;
  const F = (k, l, ph, type) =>
    `<label>${esc(l)}${type === "ta" ? `<textarea class="cdf" data-k="${k}" rows="3" placeholder="${esc(ph || "")}">${esc(cd[k] || "")}</textarea>` : `<input class="cdf" data-k="${k}" ${type ? `type="${type}"` : ""} value="${esc(cd[k] || "")}" placeholder="${esc(ph || "")}">`}</label>`;
  const draw = () => {
    const N = cdmNotifiable(cd);
    const docsHtml = CDM_GROUPS.map(
      ([g, ks]) =>
        `<div class="who" style="margin-top:6px"><b>${esc(g)}</b></div>` +
        ks
          .map((k) => {
            const l = (CDM_DOCS.find((x) => x[0] === k) || [k, k])[1];
            const m = madeOf(k);
            return `<label class="tick cdmdoc"><input type="checkbox" class="cdd" data-k="${k}" ${pk[k] ? "checked" : ""}> <span>${esc(l)}${m ? ` <span class="tag ok">✓ Made ${esc(ukDate(iso(new Date(m.uploaded || Date.now()))))}</span>` : ""}</span></label>`;
          })
          .join(""),
    ).join("");
    $("cdm-body").innerHTML =
      `<div class="flabel">1. Which document(s)?</div><div class="actions" style="margin:0"><button type="button" class="btn" id="cdm-none">Clear</button><button type="button" class="btn" id="cdm-todo">Tick the ones not made yet</button><button type="button" class="btn" id="cdm-all">Tick all</button></div><div>${docsHtml}</div>
      ${cd._from ? `<div class="notice" style="margin:6px 0">📌 Remembered from last time${cd._from > 1 ? " (" + esc(stamp(cd._from)) + ")" : ""}: everything you put in before is filled in below. Just check anything that's changed.</div>` : cd._carried ? `<div class="notice" style="margin:6px 0">📌 First CDM document for this site. Your usual details (hours, site rules, welfare, first aid) are copied from your last site: check them.</div>` : ""}
      <div class="flabel">2. Check the details</div><label>Site<select id="cdm-site">${sites.map((n) => `<option ${n === site ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label>Client (fills in their details)<select id="cdm-cl"><option value="">Choose a client…</option>${cls.map((c) => `<option value="${esc(c.id)}" ${c.id === cd.clientId ? "selected" : ""}>${esc(c.name)}${c.site ? " · " + esc(c.site) : ""}</option>`).join("")}</select></label>
      <div class="seg" id="cdm-ct"><button type="button" data-v="domestic" aria-pressed="${cd.clientType === "domestic"}">🏠 Domestic client</button><button type="button" data-v="commercial" aria-pressed="${cd.clientType !== "domestic"}">🏢 Commercial client</button></div>
      <div class="seg" id="cdm-nc"><button type="button" data-v="one" aria-pressed="${cd.contractors === "one"}">One contractor</button><button type="button" data-v="many" aria-pressed="${cd.contractors !== "one"}">More than one contractor (subbies, other trades)</button></div>
      <div class="flabel">Project</div>${F("client", "Client name")}${F("project", "Project name")}${F("address", "Site address")}${F("desc", "Description of the work", "e.g. single-storey rear extension with steel beam", "ta")}
      <div class="grid2">${F("start", "Start date", "", "date")}${F("finish", "Finish date", "", "date")}</div><div class="grid2">${F("weeks", "Length (weeks)", "e.g. 16", "number")}${F("workDays", "Working days on site", "e.g. 80", "number")}</div>
      <div class="grid2">${F("maxWorkers", "Most people on site at once", "e.g. 6", "number")}${F("personDays", "Total person days (optional)", "worked out if blank", "number")}</div>
      <div class="notice ${N.notifiable ? "warn" : ""}" style="margin:0">${N.notifiable ? "⚠️ <b>Notifiable</b>: send an F10 to HSE before work starts." : "F10: <b>not notifiable</b> on these numbers"} <span class="who">(over 30 working days with over 20 people at once, or over 500 person days)</span></div>
      <div class="flabel">Who's who</div>${F("pcName", "Principal contractor")}${F("pdName", "Principal designer", "e.g. the architect, if appointed")}${F("designer", "Architect / designer")}${F("engineer", "Structural engineer")}${F("otherContractors", "Other contractors / subcontractors", "e.g. electrician, roofer")}${F("bc", "Building control")}${F("planning", "Planning / Building Control ref")}
      <div class="flabel">Site & emergency</div>${F("clientPhone", "Client phone number(s)", "e.g. Kate: 07793 674654, Ben: 07813 621226")}${F("latlon", "Site location (latitude, longitude)", "e.g. 50.666541, -3.5365747. Grid reference and eastings work themselves out")}${F("bcRef", "Building Control ref")}${F("alarm", "How to raise the fire alarm", "e.g. Ring the bell or sound the klaxon at the fire point")}${F("agentPhone", "Site manager's phone")}${F("manager", "Site manager")}${F("firstAid", "First aider(s)")}${F("firstAidKit", "First aid kit kept")}${F("hospital", "Nearest A&E")}${F("assembly", "Fire assembly point")}${F("w3w", "what3words", "e.g. grin.sadly.shuttered")}${F("hours", "Working hours")}${F("welfare", "Welfare arrangements", "", "ta")}${F("inUse", "Parts of the home still in use / kept separate")}${F("access", "Access, parking & deliveries")}
      <div class="flabel">Existing information</div>${F("asbestos", "Asbestos", "e.g. survey 12/05/2026 - none found")}${F("services", "Existing services", "e.g. gas meter front left, drains run under extension")}${F("groundInfo", "Ground conditions", "e.g. clay, see soil report")}${F("designRisks", "Significant design / construction risks", "", "ta")}${F("otherInfo", "Anything else", "", "ta")}
      <div class="flabel">Hazards on this site (tick)</div><div class="cdm-risks">${CDM_RISKS.map(([k, l]) => `<label class="tick"><input type="checkbox" class="cdr" data-k="${k}" ${cd.risks && cd.risks[k] ? "checked" : ""}> <span>${esc(l)}</span></label>`).join("")}</div>
      <div class="flabel">3. Make</div><button type="button" class="btn" id="cdm-keep">💾 Save these details for next time (don't make anything yet)</button>
      <div class="seg" id="cdm-out"><button type="button" data-v="pack" aria-pressed="true">📕 One full CDM pack (PDF)</button><button type="button" data-v="sep" aria-pressed="false">Separate PDFs</button></div>
      <div class="flabel">Who can see it?</div><div class="seg" id="cdm-vis"><button type="button" data-v="me" aria-pressed="${vis === "me"}">🔒 Only me</button><button type="button" data-v="trades" aria-pressed="${vis === "trades"}">👷 Me and the trades on this site</button></div>
      <div class="who">Filed in ${esc(site)} › RAMS › CDM either way.</div>
      <label class="tick"><input type="checkbox" id="cdm-cl2" ${toCl ? "checked" : ""} ${cd.clientId ? "" : "disabled"}> <span>🏡 Send to ${cd.clientId ? esc(cd.client || "the client") + "'s" : "the client's"} portal${cd.clientId ? "" : " (choose a client above first)"}</span></label>
      <label class="tick" style="margin-left:28px" ${toCl && cd.clientId ? "" : "hidden"} id="cdm-asklab"><input type="checkbox" id="cdm-ask" ${askSign ? "checked" : ""}> <span>✍ Ask them to sign / approve it. When they sign, the signed copy is filed here automatically.</span></label>
      <label class="tick"><input type="checkbox" id="cdm-dl"> <span>Also download</span></label><div class="who" id="cdm-prog"></div>`;
    $("cdm-vis")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            vis = b.dataset.v;
            $("cdm-vis")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          }),
      );
    $("cdm-cl2").onchange = (e) => {
      toCl = e.target.checked;
      $("cdm-asklab").hidden = !toCl;
    };
    $("cdm-ask").onchange = (e) => {
      askSign = e.target.checked;
    };
    const read = () => {
      document.querySelectorAll(".cdf").forEach((i) => (cd[i.dataset.k] = i.value.trim()));
      cd.risks = {};
      document.querySelectorAll(".cdr:checked").forEach((i) => (cd.risks[i.dataset.k] = 1));
      pk = {};
      document.querySelectorAll(".cdd:checked").forEach((i) => (pk[i.dataset.k] = 1));
    };
    $("cdm-site").onchange = (e) => {
      read();
      site = e.target.value;
      cd = load();
      pk = {};
      const f = CDM_DOCS.find(([k]) => !madeOf(k));
      if (f) pk[f[0]] = 1;
      draw();
    };
    $("cdm-none").onclick = () => {
      read();
      pk = {};
      draw();
    };
    $("cdm-all").onclick = () => {
      read();
      pk = {};
      CDM_DOCS.forEach(([k]) => (pk[k] = 1));
      draw();
    };
    $("cdm-todo").onclick = () => {
      read();
      pk = {};
      CDM_DOCS.forEach(([k]) => {
        if (!madeOf(k)) pk[k] = 1;
      });
      draw();
    };
    $("cdm-keep").onclick = async () => {
      read();
      await persist();
      toast("Details saved for " + site);
    };
    $("cdm-cl").onchange = (e) => {
      read();
      const c = cls.find((x) => x.id === e.target.value);
      if (c) {
        cd.clientId = c.id;
        cd.client = c.name;
        cd.address = clAddr(c) || cd.address;
        if (!cd.clientPhone) cd.clientPhone = [c.phone, c.phone2].filter(Boolean).join(", ");
        if (!cd.latlon && c.lat != null) cd.latlon = c.lat + ", " + c.lon;
        if (!cd.desc) cd.desc = c.desc || c.work || "";
      }
      draw();
    };
    ["cdm-ct", "cdm-nc", "cdm-out"].forEach((id) =>
      $(id)
        .querySelectorAll("button")
        .forEach(
          (b) =>
            (b.onclick = () => {
              read();
              if (id === "cdm-ct") cd.clientType = b.dataset.v;
              if (id === "cdm-nc") cd.contractors = b.dataset.v;
              $(id)
                .querySelectorAll("button")
                .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
              if (id !== "cdm-out") draw();
            }),
        ),
    );
    document
      .querySelectorAll(".cdf[data-k=workDays],.cdf[data-k=maxWorkers],.cdf[data-k=personDays]")
      .forEach(
        (i) =>
          (i.onchange = () => {
            read();
            draw();
          }),
      );
    cdmRead = read;
  };
  let cdmRead = () => {};
  openSheet(
    `<h3 id="sheettitle">🏛️ CDM 2015 documents</h3><div class="who">Choose the document you need now. Whatever you type is remembered for this site, so the next document you make is already filled in.</div><div id="cdm-body"></div>${formFoot(false, "Make CDM documents")}`,
    async () => {
      cdmRead();
      const pick = {};
      document.querySelectorAll(".cdd:checked").forEach((i) => (pick[i.dataset.k] = 1));
      if (!Object.keys(pick).length) {
        showErr("Tick at least one document.");
        return;
      }
      if (!cd.client) {
        showErr("Choose or type the client.");
        return;
      }
      await persist();
      const pack = $("cdm-out").querySelector('[aria-pressed="true"]').dataset.v === "pack";
      const save = true,
        dl = $("cdm-dl").checked;
      const cl = toCl && cd.clientId ? (S.clients || []).find((x) => x.id === cd.clientId) : null;
      const src = cl ? ptSrc(cl) : null;
      $("f-save").disabled = true;
      try {
        $("cdm-prog").textContent = "Making the documents…";
        const secs = cdmSections(cd, pick);
        const pks = CDM_DOCS.map((x) => x[0]).filter((k) => pick[k]);
        const pks2 = pks.filter((k) => k !== "welfarepack");
        const sets =
          pack && secs.length > 1
            ? [[`CDM pack - ${cd.project}`, secs, pks2]]
            : secs.map((sx, i) => [`${sx.title} - ${cd.project}`, [sx], [pks2[i]]]);
        if (pick.welfarepack)
          sets.push([`Welfare unit notices - ${cd.project}`, "WELFARE", ["welfarepack"]]);
        let n = 0;
        for (const [nm, ss, ks] of sets) {
          const blob = ss === "WELFARE" ? await welfarePackPdf(cd) : await cdmPdf(ss, cd);
          const fn = nm.replace(/[^\w\s&().-]/g, "").trim() + ".pdf";
          if (save) {
            const up = await uploadFile(new File([blob], fn, { type: "application/pdf" }), fn);
            const rec = {
              site,
              path: "CDM",
              cat: "rams",
              title: fn.replace(/\.pdf$/, ""),
              fileName: fn,
              assetId: up.id,
              contentType: "application/pdf",
              size: blob.size,
              uploaded: Date.now(),
              cdm: ks,
            };
            if (src) {
              const did = newId();
              await src.addDoc(did, {
                title: rec.title,
                fileName: fn,
                assetId: up.id,
                contentType: "application/pdf",
                folder: "hs",
                note: "",
                sharedAt: Date.now(),
              });
              rec.clientShared = Date.now();
              rec.clientId = cl.id;
              if (askSign) {
                const sid = newId();
                await src.addSign(sid, {
                  kind: "cdm",
                  title: rec.title.slice(0, 120),
                  details:
                    "Please read the attached CDM document and sign to confirm you've received it.",
                  docIds: [did],
                  status: "open",
                  created: Date.now(),
                  site,
                });
                rec.signId = sid;
              }
            }
            if (vis === "me")
              await S.db.doc("todos/" + newId()).set(Object.assign({ kind: "sitedoc" }, rec));
            else await S.db.collection("docs").add(rec);
          }
          if (dl && S.dl) {
            try {
              await S.dl.save({ filename: fn, data: blob });
            } catch (e) {}
          }
          n++;
        }
        if (src)
          try {
            await src.bump();
          } catch (e) {}
        closeForm();
        toast(
          `${n} CDM document${n === 1 ? "" : "s"} made and filed in ${site} › RAMS › CDM${src ? " · sent to " + cl.name + (askSign ? " to sign" : "") : ""}`,
        );
        render();
      } catch (e) {
        showErr("Couldn't make the documents. " + (e && e.message ? "" : "Check your connection."));
        $("f-save").disabled = false;
      }
    },
    null,
  );
  draw();
}

function cdmSignState(d) {
  if (!d.clientShared) return "";
  if (!d.signId) return " · 🏡 Sent to the client";
  let x = null;
  try {
    x = (soAll().find((r) => r.x.id === d.signId) || {}).x;
  } catch (e) {}
  return x && x.status === "signed"
    ? " · ✍ Signed by the client" + (x.filedAt ? " (signed copy filed)" : "")
    : x && x.status === "changes"
      ? " · ⚠️ Client asked for changes"
      : " · ⏳ Waiting for the client to sign";
}
