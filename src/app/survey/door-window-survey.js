/* ================= DOOR & WINDOW SURVEY: designs, sizes, add-ons → schedule / order request PDF ================= */
import { clientSites } from "../clients/address-book.js";
import { clStage, saveClient } from "../clients/clients.js";
import { ptCl } from "../clients/portal.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { clAddr } from "../clients/stages-planner.js";
import { pickField, pickVal } from "../core/fields.js";
import { $, esc, fsize, gbp, hrs, iso, shortDay, stamp, store, toast } from "../core/helpers.js";
import {
  closeForm,
  editing,
  formFoot,
  openSheet,
  setEditing,
  setFormType,
  showErr,
} from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { myDrawings } from "../drawing/drawings-tab.js";
import { openNotePage, pdfShow } from "../drawing/paving.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { CUT } from "../files/cut-outs.js";
import { blobUrl, isImg, isWord, saveAsset, uploadErr, uploadFile } from "../files/files.js";
import { FC, getFileBlob, keepFolder, openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { printBlob } from "../files/print.js";
import { SENDTO } from "../files/send-to.js";
import { coData } from "../owner/company-details.js";
import { binFromViewer } from "../owner/deleted-items.js";
import { allTeam, nameOf, ownerDisplayName, roleShort, teamIds } from "../owner/owner.js";
import { BRGB, exifDate, isVid, pdfLogo, readExif, siteRec, stampPhoto } from "../photos/photos.js";
import { keyDatesFor, keyTimeline, openPlanEditor, openPlanView } from "../planner/board.js";
import { planEntries } from "../planner/time-off.js";
import { makersAll } from "../purchasing/makers.js";
import { MAT_ST, matCount } from "../purchasing/materials-receipts.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { shrinkImage } from "../safety/training.js";
import { WTN } from "../safety/waste-transfer-note.js";
import {
  JOB_DET,
  JOB_KINDS,
  doneKey,
  jobCard,
  jobDetRead,
  jobProgress,
  myJobs,
  taskDone,
} from "../sites/job-sheets.js";
import { docPath } from "../sites/plans-specs.js";
import { same } from "../sites/project-pages.js";
import { sqMap } from "../sites/snag-quick.js";
import { siteClient } from "../sites/summary.js";
import { typeFor } from "../sites/trade-sites.js";
export { DWS, jobDraft, jobsView, myName, openJob, openJobEditor, renderJobDetail, siteFilePicker };
const DWS = (() => {
  const g = (id) => document.getElementById("wsx-" + id);
  const CV = {
    frame: "var(--wsframe)",
    glass: "var(--wsglass)",
    dim: "var(--wsdim)",
    ink: "var(--ink)",
    panel: "var(--wssoft)",
    add: "var(--wsaddon)",
    bg: "var(--surface)",
  };
  const PC = {
    frame: "#3b3532",
    glass: "#d9e7f0",
    dim: "#b42318",
    ink: "#1d1a19",
    panel: "#efe9e4",
    add: "#f1dcbf",
    bg: "#ffffff",
  };
  const PRE = {
    window: [
      ["Fixed", "F"],
      ["Side hung, hinge left", "HL"],
      ["Side hung, hinge right", "HR"],
      ["Top hung", "TH"],
      ["Bottom hung (tilt in)", "BH"],
      ["Top hung over fixed", "TH/F"],
      ["Fixed + side hung", "F|HR"],
      ["Side hung + fixed", "HL|F"],
      ["Side hung pair", "HL|HR"],
      ["Top light + side hung", "TH/F|HR"],
      ["Side hung + top light", "HL|TH/F"],
      ["Two top lights", "TH/F|TH/F"],
      ["3 pane, ends open", "HL|F|HR"],
      ["3 pane, centre top light", "HL|TH/F|HR"],
      ["3 pane, end top lights", "TH/F|F|TH/F"],
      ["3 pane, all top lights", "TH/F|TH/F|TH/F"],
      ["3 pane, centre side hung", "F|HL|F"],
      ["4 pane, ends open", "HL|F|F|HR"],
      ["4 pane, top lights", "HL|TH/F|TH/F|HR"],
      ["Fixed top light over side hung", "F/HL"],
      ["Tilt & turn, hinge left", "TTL"],
      ["Tilt & turn, hinge right", "TTR"],
      ["Tilt & turn + fixed", "TTL|F"],
      ["Tilt & turn pair", "TTL|TTR"],
      ["Tilt & turn, 3 pane", "TTL|F|TTR"],
      ["Vertical sliding sash", "SV"],
      ["Sash pair", "SV|SV"],
      ["Sash with side lights", "F|SV|F"],
      ["Horizontal slider", "F|SL"],
      ["Sash, 2 over 2 (Victorian)", "SV:2", [900, 1500]],
      ["Sash, 4 over 4", "SV:4", [900, 1500]],
      ["Sash, 6 over 6 (Georgian)", "SV:6", [900, 1500]],
      ["Sash, 9 over 9", "SV:9", [1000, 1700]],
      ["Sash, 6 over 1 (Edwardian)", "SV:61", [900, 1500]],
      ["Sash, 3 over 1", "SV:31", [900, 1500]],
      ["Sash pair, 6 over 6", "SV:6|SV:6", [1800, 1500]],
      ["Sash pair, 2 over 2", "SV:2|SV:2", [1800, 1500]],
      ["Triple sash", "SV|SV|SV", [2400, 1500]],
      ["Triple sash, 2 over 2", "F:2|SV:2|F:2", [2200, 1500]],
      ["Sash with fixed top light", "F/SV", [900, 1900]],
      ["Sash with top light, 2 over 2", "F/SV:2", [900, 1900]],
      ["Yorkshire sash (horizontal sliding)", "F:2|SL:2", [1500, 1000]],
      ["Yorkshire sash, 3 pane", "F|SL|F", [2100, 1000]],
      ["Cottage, Georgian bars", "HL:G|F:G"],
      ["Cottage top light, bars", "TH/F:G|HR:G"],
      ["Fixed, Georgian bars", "F:G"],
      ["Two top openers over fixed panel", "TH|TH", [1200, 1300], { bot: 800 }],
      ["Three top openers over fixed panel", "TH|TH|TH", [1800, 1300], { bot: 800 }],
      ["Top opener over fixed panel", "TH", [900, 1300], { bot: 800 }],
      ["Side hung pair over fixed panel", "HL|HR", [1200, 1500], { bot: 600 }],
      ["Fixed top light over side hung pair", "HL|HR", [1200, 1500], { top: 400 }],
      ["Top openers between fixed top & bottom", "TH|TH", [1200, 1600], { top: 350, bot: 700 }],
    ],
    door: [
      ["Door, hinge left", "DL:H", [960, 2110]],
      ["Door, hinge right", "DR:H", [960, 2110]],
      ["Solid door, hinge left", "DL:S", [960, 2110]],
      ["Fully glazed door", "DR", [960, 2110]],
      ["Door + side panel (left)", "F|DR:H", [1460, 2110]],
      ["Door + side panel (right)", "DL:H|F", [1460, 2110]],
      ["Door + two side panels", "F|DL:H|F", [1960, 2110]],
      ["Door with top light", "F/DL:H", [960, 2500]],
      ["Door, side panel & top light", "F/F|F/DR:H", [1460, 2500]],
      ["Stable door", "DL:H~", [960, 2110]],
      ["Composite – 4 panel", "DL:D2", [960, 2110]],
      ["Composite – 2 panel", "DL:D1", [960, 2110]],
      ["Composite – cottage glazed top", "DL:D4", [960, 2110]],
      ["Composite – arched glass top", "DL:D5", [960, 2110]],
      ["Composite – half glazed", "DL:D6", [960, 2110]],
      ["Composite – 4 glass squares", "DL:D7", [960, 2110]],
      ["Composite – vertical glass slot", "DL:D8", [960, 2110]],
      ["Composite – offset glass slot", "DL:D9", [960, 2110]],
      ["Composite – glass strips", "DL:D10", [960, 2110]],
      ["Composite – diamond glass", "DL:D11", [960, 2110]],
      ["Composite – 2 glass over 2 panels", "DL:D12", [960, 2110]],
      ["Composite – plain", "DL:D0", [960, 2110]],
      ["Composite – 4 panel + side panel", "F|DL:D2", [1460, 2110]],
      ["Composite – glazed top + side panels", "F|DL:D4|F", [1960, 2110]],
      ["Wooden – ledged & braced", "DL:D14", [960, 2110]],
      ["Wooden – framed, ledged & braced", "DL:D15", [960, 2110]],
      ["Wooden – boarded, glazed top", "DL:D16", [960, 2110]],
      ["Wooden – 4 panel", "DL:D2", [960, 2110]],
      ["Wooden – 6 panel", "DL:D3", [960, 2110]],
      ["Wooden – half glazed", "DL:D18", [960, 2110]],
      ["Wooden – Edwardian 2 panel", "DL:D19", [960, 2110]],
      ["Wooden – stable, boarded", "DL:D14~", [960, 2110]],
      ["Wooden – stable, glazed top", "DL:D13~", [960, 2110]],
      ["Wooden – French doors, 15-lite", "DL:D17|DR:D17", [1500, 2110]],
      ["Wooden – glazed garden door", "DL:D17", [960, 2110]],
      ["French doors", "DL|DR", [1500, 2110]],
      ["French doors + side panels", "F|DL|DR|F", [2500, 2110]],
      ["French doors + top lights", "F/DL|F/DR", [1500, 2500]],
      ["French doors, sides & top lights", "F/F|F/DL|F/DR|F/F", [2500, 2500]],
      ["Bi-fold 2 (2+0)", "FL|FL", [1600, 2110]],
      ["Bi-fold 3 (3+0)", "FL|FL|FL", [2400, 2110]],
      ["Bi-fold 3 (2+1)", "FL|FL|FR", [2400, 2110]],
      ["Bi-fold 4 (4+0)", "FL|FL|FL|FL", [3200, 2110]],
      ["Bi-fold 4 (3+1)", "FL|FL|FL|FR", [3200, 2110]],
      ["Bi-fold 5 (5+0)", "FL|FL|FL|FL|FL", [4000, 2110]],
      ["Bi-fold 5 (3+2)", "FL|FL|FL|FR|FR", [4000, 2110]],
      ["Bi-fold 6 (3+3)", "FL|FL|FL|FR|FR|FR", [4800, 2110]],
      ["Sliding patio, 2 pane", "F|SL", [1800, 2100]],
      ["Sliding patio, 3 pane", "SR|F|SL", [2700, 2100]],
      ["Sliding patio, 4 pane", "F|SR|SL|F", [3600, 2100]],
      ["Lift & slide", "SR|F", [3000, 2300]],
    ],
    bay: [
      ["45° bay, 3 frames", ["HL", "TH/F|F|TH/F", "HR"], [135, 135], [600, 1600, 600]],
      ["45° bay, top lights", ["TH/F", "TH/F|TH/F|TH/F", "TH/F"], [135, 135], [600, 1800, 600]],
      ["45° bay, 4 pane front", ["HL", "HL|F|F|HR", "HR"], [135, 135], [600, 2000, 600]],
      ["30° splay bay", ["TH/F", "TH/F|F|TH/F", "TH/F"], [150, 150], [700, 1600, 700]],
      ["60° bay", ["HL", "HL|F|HR", "HR"], [120, 120], [600, 1500, 600]],
      ["90° box bay", ["HL", "HL|F|HR", "HR"], [90, 90], [500, 1600, 500]],
      ["Bow, 4 frames", ["TH/F", "TH/F", "TH/F", "TH/F"], [165, 165, 165], [650, 650, 650, 650]],
      [
        "Bow, 5 frames",
        ["TH/F", "F", "TH/F", "F", "TH/F"],
        [168, 168, 168, 168],
        [600, 600, 600, 600, 600],
      ],
      ["Corner window 90°", ["F|HL", "HR|F"], [90], [1200, 1200]],
      ["Splayed corner 135°", ["HL|F", "F|HR"], [135], [1200, 1200]],
      ["Sash bay 45°", ["SV", "SV|SV", "SV"], [135, 135], [700, 1600, 700]],
      ["Sash bay, 2 over 2", ["SV:2", "SV:2|SV:2", "SV:2"], [135, 135], [700, 1600, 700], 1500],
      ["Sash bay, 6 over 6", ["SV:6", "SV:6|SV:6", "SV:6"], [135, 135], [700, 1600, 700], 1500],
      ["Box bay sash 90°", ["SV:2", "SV:2|SV:2", "SV:2"], [90, 90], [600, 1600, 600], 1500],
      ["Tilt & turn bay 45°", ["TTL", "F|TTR", "TTR"], [135, 135], [700, 1600, 700]],
      [
        "Walk-in bay with French doors",
        ["F", "F|DL|DR|F", "F"],
        [135, 135],
        [800, 2400, 800],
        2110,
      ],
    ],
    garage: [
      ["Up & over, canopy (7' x 6'6\")", "GU:S", [2134, 1981]],
      ["Up & over, canopy (7' x 7')", "GU:S", [2134, 2134]],
      ["Up & over, retractable (7'6\" x 7')", "GU:S", [2286, 2134]],
      ["Up & over, retractable (8' x 7')", "GU:S", [2438, 2134]],
      ["Up & over, Georgian panelled", "GU:S", [2134, 2134]],
      ["Sectional, insulated 42mm", "GS:S", [2438, 2134]],
      ["Sectional, 67mm Thermo", "GS:S", [2438, 2134]],
      ["Sectional with windows", "GS:S", [2438, 2134]],
      ["Sectional with wicket door", "GS:S", [2438, 2134]],
      ["Roller, insulated 77mm lath", "GR:S", [2438, 2134]],
      ["Roller, compact 55mm lath", "GR:S", [2134, 1981]],
      ["Roller, single-skin steel", "GR:S", [2134, 1981]],
      ["Side-hinged pair", "DL:S|DR:S", [2134, 1981]],
      ["Side-hinged 1/3 – 2/3", "DL:S|DR:S", [2134, 1981]],
      ["Round-the-corner", "SL", [2438, 2134]],
      ["Double up & over (14' x 7')", "GU:S", [4267, 2134]],
      ["Double sectional (14' x 7')", "GS:S", [4267, 2134]],
      ["Double sectional (16' x 7')", "GS:S", [4877, 2134]],
      ["Double roller (16' x 7')", "GR:S", [4877, 2134]],
      ["Two singles with pier", "GU:S|GU:S", [4800, 2134]],
    ],
    roof: [
      ["Centre-pivot roof window", "CP", [780, 1180]],
      ["Top-hung roof window", "TH", [780, 1180]],
      ["Fixed rooflight", "F", [1000, 1000]],
      ["Roof lantern", "LN", [2000, 1500]],
      ["Two roof windows", "CP|CP", [1600, 1180]],
      ["Roof window with fixed under", "CP/F", [780, 1800]],
    ],
  };
  const OPS = {
    F: "Fixed",
    HL: "Side hung – hinge left",
    HR: "Side hung – hinge right",
    TH: "Top hung",
    BH: "Bottom hung (tilt in)",
    TTL: "Tilt & turn – hinge left",
    TTR: "Tilt & turn – hinge right",
    SV: "Vertical sash",
    SL: "Slides left",
    SR: "Slides right",
    DL: "Door – hinge left",
    DR: "Door – hinge right",
    FL: "Bi-fold leaf – folds left",
    FR: "Bi-fold leaf – folds right",
    CP: "Centre pivot",
    GU: "Up & over",
    GR: "Roller",
    GS: "Sectional",
    LN: "Lantern",
  };
  const SOP = {
    F: "Fixed",
    HL: "Side hung (hinge L)",
    HR: "Side hung (hinge R)",
    TH: "Top hung",
    BH: "Bottom hung",
    TTL: "Tilt & turn (L)",
    TTR: "Tilt & turn (R)",
    SV: "Sash",
    SL: "Slides left",
    SR: "Slides right",
    DL: "Door (hinge L)",
    DR: "Door (hinge R)",
    FL: "Bi-fold, folds left",
    FR: "Bi-fold, folds right",
    CP: "Centre pivot",
    GU: "Up & over",
    GR: "Roller",
    GS: "Sectional",
    LN: "Lantern",
  };
  const OPK = {
    window: "F HL HR TH BH TTL TTR SV SL SR",
    bay: "F HL HR TH BH TTL TTR SV SL SR DL DR",
    door: "F DL DR HL HR FL FR SL SR TH",
    garage: "GU GR GS DL DR F",
    roof: "F CP TH LN",
  };
  /* door leaf designs (generic styles, composite and wooden) – drawn on the diagram */
  const BROCH = {
    "other": { "m": "Other makers / my own", "l": [] },
    "ews": {
      "m": "Exeter Window Store",
      "l": [
        ["Brochures page", "https://exeterwindowstore.co.uk/brochures/"],
        [
          "All downloads (windows, doors, frames, glass)",
          "https://exeterwindowstore.co.uk/brochures/additional-downloads/",
        ],
        [
          "2024 PVCu product guide (PDF)",
          "https://exeterwindowstore.co.uk/wp-content/uploads/2024/04/2024-PVCU-Product-Guide-for-web-1.pdf",
        ],
      ],
    },
    "profile22": {
      "m": "Profile 22",
      "l": [
        [
          "Chamfered windows & doors brochure (PDF)",
          "https://www.profile22.co.uk/wp-content/uploads/2022/06/Profile22_Chamfered.pdf",
        ],
        ["Download / request a brochure", "https://profile22.co.uk/download-brochure/"],
        ["Sculptured system", "https://profile22.co.uk/optima/sculptured-system/"],
      ],
    },
    "deceuninck": {
      "m": "Deceuninck",
      "l": [
        ["Specification guides", "https://www.deceuninck.co.uk/en-gb/specification-guide"],
        [
          "Flush sash windows",
          "https://www.deceuninck.co.uk/en-gb/products/pvc-windows/flush-window",
        ],
      ],
    },
    "rehau": {
      "m": "REHAU",
      "l": [
        [
          "Homeowner brochure (PDF)",
          "https://window.rehau.com/downloads/1136418/homeowner-brochure.pdf",
        ],
        [
          "Rio flush brochure (PDF)",
          "https://window.rehau.com/downloads/1136420/rio-consumer-brochure.pdf",
        ],
        ["uPVC windows & doors range", "https://window.rehau.com/uk-en/rehau-upvc-windows-doors"],
      ],
    },
    "cortizo": {
      "m": "Cortizo",
      "l": [
        ["Catalogues / downloads", "https://www.cortizo.com/en/paginas/arquitectos_descargas"],
        [
          "Aluminium & PVC systems catalogue (PDF)",
          "https://www.cortizo.com/en/descargas/descargar/348/2024_CATALOGO_ARQUITECTURA_EN_WEB.pdf",
        ],
      ],
    },
    "origin": {
      "m": "Origin",
      "l": [
        [
          "Door collection brochure (PDF)",
          "https://origin-global.com/documents/the-origin-doors-brochure.pdf",
        ],
        ["Request / download a brochure", "https://origin-global.com/request-a-brochure"],
        ["Bi-fold doors", "https://origin-global.com/doors/bi-fold-doors"],
      ],
    },
    "aluk": {
      "m": "AluK",
      "l": [
        ["Brochures", "https://uk.aluk.com/en-gb/products/doors/aluk-brochure"],
        [
          "Trade & residential brochure (flipbook)",
          "https://heyzine.com/flip-book/AluKTradeandResi.html",
        ],
        ["Windows range", "https://uk.aluk.com/en-gb/products/windows"],
      ],
    },
    "distinction": {
      "m": "Distinction Doors",
      "l": [
        [
          "Premium brochure 2025 (PDF)",
          "https://www.distinctiondoors.co.uk/wp-content/uploads/2025/06/Premium-DD-Brochure-2025-V7-LR.pdf",
        ],
        ["Door styles", "https://www.distinctiondoors.co.uk/our-products/"],
      ],
    },
    "visage": {
      "m": "Visage composite doors",
      "l": [
        [
          "Composite doors brochure (PDF)",
          "https://www.visageonline.co.uk/wp-content/uploads/brochure-compositedoors.pdf",
        ],
        ["Composite doors", "https://www.visageonline.co.uk/composite-doors/"],
      ],
    },
    "royale": {
      "m": "Royale (MB Frames)",
      "l": [
        [
          "Royale brochure 2026 (PDF)",
          "https://exeterwindowstore.co.uk/wp-content/uploads/2026/02/MB-Frames-Brochure-V26-web_2.pdf",
        ],
        [
          "Royale range 2022 (PDF)",
          "https://exeterwindowstore.co.uk/wp-content/uploads/2023/08/Royale-2022-1.pdf",
        ],
      ],
    },
    "hormann": {
      "m": "Hörmann",
      "l": [
        ["Media centre (brochures)", "https://www.hormann.co.uk/media-centre/"],
        [
          "Residential products brochure (PDF)",
          "https://www.hormann.co.uk/fileadmin/_country/kataloge/pdf/86310_PfdWN_L3_EN.pdf",
        ],
        ["Garage doors", "https://www.hormann.co.uk/home-owners-and-renovators/garage-doors/"],
      ],
    },
    "garador": {
      "m": "Garador",
      "l": [
        ["Brochures", "https://www.garador.co.uk/brochures/"],
        ["Sectional brochure (PDF)", "https://www.garador.co.uk/media/sknay104/sectional.pdf"],
        ["Up & over brochure (PDF)", "https://www.garador.co.uk/media/sknay104/up-and-over.pdf"],
      ],
    },
    "sws": {
      "m": "SWS (SeceuroGlide)",
      "l": [
        ["Downloads", "https://www.sws.co.uk/downloads/"],
        ["SeceuroGlide brochure", "https://www.sws.co.uk/news/download/seceuroglide-brochure/"],
      ],
    },
    "gliderol": {
      "m": "Gliderol",
      "l": [
        ["Brochures", "https://www.gliderol.co.uk/gliderol-door-brochures-i27"],
        [
          "Sectional brochure (PDF)",
          "https://www.gliderol.co.uk/downloads/67233d3855d1f676Gliderol_Sectional_Door_Brochure.pdf",
        ],
      ],
    },
    "cardale": {
      "m": "Cardale",
      "l": [
        ["Request a brochure", "https://cardale.com/request-a-brochure/"],
        ["Door range", "https://cardale.com/our-doors/"],
      ],
    },
    "carteck": {
      "m": "Teckentrup CarTeck",
      "l": [
        [
          "CarTeck brochure (PDF)",
          "https://www.teckentrup.co.uk/assets/content/images/Teckentrup-CarTeck-Garage-Doors-Brochure.pdf",
        ],
        ["Downloads", "https://www.teckentrup.co.uk/downloads"],
      ],
    },
    "novoferm": {
      "m": "Novoferm",
      "l": [
        ["Brochures", "https://www.novoferm.co.uk/library/brochures"],
        [
          "Main brochure 2026 (PDF)",
          "https://www.novoferm.co.uk/fileadmin/files/novoferm_uk/Bilder/Brochures/UK/Novoferm_UK_Main_Brochure_2026.pdf",
        ],
      ],
    },
    "ryterna": {
      "m": "Ryterna",
      "l": [
        ["Media centre", "https://www.ryterna.com/mediacenteren/"],
        ["Garage doors brochure", "https://www.ryterna.com/garage-doors-by-ryterna-en/"],
      ],
    },
    "jeldwen": {
      "m": "JELD-WEN (timber)",
      "l": [["Literature downloads", "https://www.jeld-wen.co.uk/literature"]],
    },
    "mumfordwood": {
      "m": "Mumford & Wood (timber)",
      "l": [
        ["Download brochure", "https://mumfordwood.com/download-brochure"],
        ["Heritage windows & doors", "https://mumfordwood.com/heritage"],
      ],
    },
    "other": { "m": "Other makers", "l": [] },
    "accoya": {
      "m": "Accoya (timber)",
      "l": [
        ["Casement windows", "https://www.accoya.com/products/windows/casement/"],
        ["Front doors", "https://www.accoya.com/products/doors/entrance/"],
      ],
    },
  };
  const brochKeys = (o) => {
    const t = [o.sys, o.gmake, o.slab, o.mat].join(" ");
    const ks = [];
    const M = [
      ["profile22", /Profile 22/i],
      ["deceuninck", /Deceuninck|Distinction \(Deceuninck/i],
      ["rehau", /Rehau/i],
      ["visage", /Visage/i],
      ["distinction", /Distinction/i],
      ["royale", /Royale/i],
      ["cortizo", /Cortizo/i],
      ["origin", /Origin/i],
      ["aluk", /AluK/i],
      ["hormann", /H[öo]rmann/i],
      ["garador", /Garador/i],
      ["sws", /SWS|Seceuro/i],
      ["gliderol", /Gliderol/i],
      ["cardale", /Cardale/i],
      ["carteck", /Carteck/i],
      ["novoferm", /Novoferm/i],
      ["ryterna", /Ryterna/i],
    ];
    M.forEach(([k, r]) => {
      if (r.test(t)) ks.push(k);
    });
    if (/Timber/.test(o.mat || "") && o.kind !== "garage")
      ks.push("jeldwen", "mumfordwood", "accoya");
    (S.makers || []).forEach((r) => {
      if (r.name && r.name.length > 2 && t.toLowerCase().includes(r.name.toLowerCase()))
        ks.push(r.key);
    });
    if (o.kind !== "garage" && o.kind !== "roof") ks.push("ews");
    return [...new Set(ks)];
  };
  const DOORD = [
    "Door: plain / flush",
    "Door: 2 panel",
    "Door: 4 panel",
    "Door: 6 panel (Georgian)",
    "Door: cottage – glazed top, 3 panels below",
    "Door: arched glass top, panels below",
    "Door: half glazed, 2 panels below",
    "Door: 4 small glass squares",
    "Door: centre vertical glass slot",
    "Door: offset vertical glass slot",
    "Door: 3 horizontal glass strips",
    "Door: diamond glass",
    "Door: 2 glass over 2 panels",
    "Door: 4 glass squares over panel",
    "Door: ledged & braced (boarded)",
    "Door: framed, ledged & braced",
    "Door: boarded, small glazed top",
    "Door: 15-lite glazed (French)",
    "Door: 6-lite glazed top, panel below",
    "Door: 2 panel, glazed top (Edwardian)",
  ];
  function doorDes(name, X, Y, W, H, C, gl) {
    const k = DOORD.indexOf(name);
    const st = `stroke="${C.det || C.frame}"`;
    let s = `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="${C.panel}" ${st} stroke-width=".8"/>`;
    const P = (fx, fy, fw, fh) => {
      const x = X + W * fx,
        y = Y + H * fy,
        w = W * fw,
        h = H * fh,
        i = Math.min(w, h) * 0.14;
      return (
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${st} stroke-width=".6"/>` +
        (w > 8 && h > 8
          ? `<rect x="${x + i}" y="${y + i}" width="${w - 2 * i}" height="${h - 2 * i}" fill="none" ${st} stroke-width=".35"/>`
          : "")
      );
    };
    const G = (fx, fy, fw, fh) => gl(X + W * fx, Y + H * fy, W * fw, H * fh);
    const grid = (fx, fy, fw, fh, c, r) => {
      let q = G(fx, fy, fw, fh);
      for (let i = 1; i < c; i++)
        q += `<line x1="${X + W * (fx + (fw * i) / c)}" y1="${Y + H * fy}" x2="${X + W * (fx + (fw * i) / c)}" y2="${Y + H * (fy + fh)}" ${st} stroke-width=".7"/>`;
      for (let j = 1; j < r; j++)
        q += `<line x1="${X + W * fx}" y1="${Y + H * (fy + (fh * j) / r)}" x2="${X + W * (fx + fw)}" y2="${Y + H * (fy + (fh * j) / r)}" ${st} stroke-width=".7"/>`;
      return q;
    };
    const boards = () => {
      let q = "";
      const n = Math.max(4, Math.round(W / 9));
      for (let i = 1; i < n; i++)
        q += `<line x1="${X + (W * i) / n}" y1="${Y}" x2="${X + (W * i) / n}" y2="${Y + H}" ${st} stroke-width=".35"/>`;
      return q;
    };
    const ledges = (framed) => {
      const lh = H * 0.05;
      let q = "";
      [0.1, 0.47, 0.85].forEach(
        (f) =>
          (q += `<rect x="${X + W * (framed ? 0.1 : 0.04)}" y="${Y + H * f}" width="${W * (framed ? 0.8 : 0.92)}" height="${lh}" fill="${C.panel}" ${st} stroke-width=".5"/>`),
      );
      q += `<path d="M${X + W * (framed ? 0.12 : 0.08)} ${Y + H * 0.47}L${X + W * (framed ? 0.86 : 0.9)} ${Y + H * 0.15}M${X + W * (framed ? 0.12 : 0.08)} ${Y + H * 0.85}L${X + W * (framed ? 0.86 : 0.9)} ${Y + H * 0.52}" ${st} stroke-width="${Math.max(1.2, W * 0.035)}" opacity=".55" fill="none"/>`;
      return q;
    };
    switch (k) {
      case 0:
        break;
      case 1:
        s += P(0.15, 0.08, 0.7, 0.38) + P(0.15, 0.54, 0.7, 0.38);
        break;
      case 2:
        s +=
          P(0.12, 0.07, 0.33, 0.38) +
          P(0.55, 0.07, 0.33, 0.38) +
          P(0.12, 0.53, 0.33, 0.4) +
          P(0.55, 0.53, 0.33, 0.4);
        break;
      case 3:
        [0.06, 0.36, 0.66].forEach((fy, i) => {
          const h = i === 0 ? 0.25 : 0.27;
          s += P(0.12, fy, 0.33, h) + P(0.55, fy, 0.33, h);
        });
        break;
      case 4:
        s +=
          G(0.12, 0.06, 0.76, 0.3) +
          P(0.12, 0.42, 0.22, 0.5) +
          P(0.39, 0.42, 0.22, 0.5) +
          P(0.66, 0.42, 0.22, 0.5);
        break;
      case 5: {
        const x = X + W * 0.15,
          w = W * 0.7,
          y = Y + H * 0.08,
          h = H * 0.32,
          r = w / 2;
        s +=
          `<path d="M${x} ${y + h}V${y + r * 0.6}A${r} ${r * 0.6} 0 0 1 ${x + w} ${y + r * 0.6}V${y + h}Z" fill="${C.glass}" ${st} stroke-width=".8"/>` +
          P(0.15, 0.48, 0.32, 0.44) +
          P(0.53, 0.48, 0.32, 0.44);
        break;
      }
      case 6:
        s += G(0.12, 0.06, 0.76, 0.42) + P(0.12, 0.55, 0.33, 0.38) + P(0.55, 0.55, 0.33, 0.38);
        break;
      case 7:
        s +=
          G(0.2, 0.12, 0.22, 0.14) +
          G(0.58, 0.12, 0.22, 0.14) +
          G(0.2, 0.32, 0.22, 0.14) +
          G(0.58, 0.32, 0.22, 0.14) +
          P(0.15, 0.55, 0.7, 0.37);
        break;
      case 8:
        s += G(0.43, 0.08, 0.14, 0.84);
        break;
      case 9:
        s += G(0.68, 0.08, 0.12, 0.84);
        break;
      case 10:
        [0.22, 0.42, 0.62].forEach((f) => (s += G(0.15, f, 0.7, 0.06)));
        break;
      case 11: {
        const cx = X + W / 2,
          cy = Y + H * 0.3,
          rx = W * 0.22,
          ry = H * 0.14;
        s +=
          `<path d="M${cx} ${cy - ry}L${cx + rx} ${cy}L${cx} ${cy + ry}L${cx - rx} ${cy}Z" fill="${C.glass}" ${st} stroke-width=".8"/>` +
          P(0.15, 0.55, 0.7, 0.37);
        break;
      }
      case 12:
        s +=
          G(0.12, 0.07, 0.33, 0.38) +
          G(0.55, 0.07, 0.33, 0.38) +
          P(0.12, 0.53, 0.33, 0.4) +
          P(0.55, 0.53, 0.33, 0.4);
        break;
      case 13:
        s += grid(0.15, 0.07, 0.7, 0.3, 2, 2) + P(0.15, 0.45, 0.7, 0.47);
        break;
      case 14:
        s += boards() + ledges(false);
        break;
      case 15:
        s +=
          `<rect x="${X + W * 0.08}" y="${Y + H * 0.04}" width="${W * 0.84}" height="${H * 0.92}" fill="none" ${st} stroke-width=".6"/>` +
          boards() +
          ledges(true);
        break;
      case 16:
        s +=
          boards() +
          G(0.2, 0.08, 0.6, 0.2) +
          `<line x1="${X + W * 0.5}" y1="${Y + H * 0.08}" x2="${X + W * 0.5}" y2="${Y + H * 0.28}" ${st} stroke-width=".7"/>`;
        break;
      case 17:
        s += grid(0.1, 0.05, 0.8, 0.82, 3, 5);
        break;
      case 18:
        s += grid(0.1, 0.06, 0.8, 0.42, 2, 3) + P(0.1, 0.55, 0.8, 0.38);
        break;
      case 19:
        s +=
          grid(0.12, 0.06, 0.76, 0.36, 1, 1) +
          P(0.12, 0.48, 0.34, 0.45) +
          P(0.54, 0.48, 0.34, 0.45);
        break;
    }
    return s;
  }
  const FILLS = [
    "Glass",
    "Georgian bars",
    "Bars: 2 over 2",
    "Bars: 4 over 4",
    "Bars: 6 over 6",
    "Bars: 9 over 9",
    "Bars: 6 over 1",
    "Bars: 3 over 1",
    "Half glazed – flat panel",
    "Half glazed – raised panel",
    "Half glazed – ribbed panel",
    "Solid panel – flat",
    "Solid panel – raised",
    "Solid panel – ribbed",
    ...DOORD,
  ];
  const ANG = [90, 100, 110, 120, 130, 135, 140, 145, 150, 155, 160, 165, 168, 170, 175];
  const ANGN = {
    90: "box / corner",
    120: "60° bay",
    135: "45° bay",
    150: "30° bay",
    165: "bow",
    168: "bow",
  };
  const ADD = [
    ["Add-on profile 20mm", 20, "Head"],
    ["Add-on profile 30mm", 30, "Head"],
    ["Add-on profile 45mm", 45, "Head"],
    ["Frame extender 65mm", 65, "Left + right"],
    ["Frame extender 95mm", 95, "Left + right"],
    ["Cill extension / add-on", 30, "Bottom"],
    ["Head drip", 0, "Head"],
    ["Bay pole – round", 0, "Between frames"],
    ["Bay pole – square", 0, "Between frames"],
    ["Box bay corner post 90°", 0, "Between frames"],
    ["Variable angle bay coupler", 0, "Between frames"],
    ["Coupling mullion", 0, "Between frames"],
    ["Add-on – top", 0, "Head"],
    ["Add-on – left side", 0, "Left"],
    ["Add-on – right side", 0, "Right"],
    ["Add-on – bottom", 0, "Bottom"],
    ["Coupling transom", 0, "Head"],
    ["Cill stubs / horns", 0, "Bottom"],
    ["Cill end caps", 0, "Bottom"],
    ["Internal trim / architrave", 0, "Head + left + right"],
    ["Quadrant / scotia bead", 0, "All round"],
    ["Cloaking / cover trim", 0, "All round"],
    ["Threshold ramp", 0, "Bottom"],
    ["Weather bar", 0, "Bottom"],
    ["Other (see note)", 0, "—"],
  ];
  const POS = [
    "Head",
    "Left",
    "Right",
    "Bottom",
    "Left + right",
    "Head + left + right",
    "All round",
    "Between frames",
    "—",
  ];
  const MATS = {
    window: [
      "uPVC",
      "Aluminium",
      "Timber (softwood)",
      "Timber (hardwood)",
      "Alu-clad timber",
      "Composite",
    ],
    door: [
      "Composite",
      "uPVC",
      "Aluminium",
      "Timber (softwood)",
      "Timber (hardwood)",
      "Alu-clad timber",
      "Steel",
    ],
    garage: ["Steel", "Insulated steel", "GRP", "Timber", "Aluminium"],
    roof: ["Timber (white painted)", "Pine (lacquered)", "uPVC / polyurethane", "Aluminium"],
  };
  MATS.bay = MATS.window;
  const CILLS = [
    "No cill",
    "Stub cill",
    "150mm cill",
    "180mm cill",
    "190mm cill",
    "225mm cill",
    "95mm external cill",
    "Aluminium pressing (3mm)",
    "Cill to suit stone cill",
    "Custom cill",
  ];
  const cillInc = (o) => o.cillInc !== false,
    cillHt = (o) => (o.cillH == null ? 30 : +o.cillH || 0);
  const cillName = (o) =>
    o.cill === "Custom cill"
      ? `Custom cill${+o.cillD ? " " + o.cillD + "mm projection" : ""}`
      : o.cill;
  const COLS = [
    "White",
    "Cream",
    "Anthracite grey (RAL 7016)",
    "Anthracite grey smooth",
    "Black (RAL 9005)",
    "Black ulti-matt",
    "Black / brown",
    "Black ash",
    "Agate grey",
    "Slate grey",
    "Slate grey finesse",
    "Pebble grey",
    "Basalt grey",
    "Buckingham grey",
    "Hazy grey finesse",
    "Claystone",
    "Chartwell green",
    "Sage smooth",
    "Dark green",
    "Dark red",
    "Steel blue",
    "Windsor",
    "Light oak",
    "Golden oak",
    "Irish oak",
    "Honey oak super-matt",
    "Swamp oak",
    "Anteak",
    "Rosewood",
    "Pyrite",
    "Flemish gold smooth",
    "Silver D smooth",
    "Signal white (RAL 9016)",
    "Jet black textured (RAL 9005)",
    "Anthracite textured (RAL 7016)",
    "Grey aluminium (RAL 9007)",
    "Silver (RAL 9006)",
    "Bronze / dark brown",
    "Door: Duck egg",
    "Door: Porcelain blue",
    "Door: Wine red",
    "Door: Honey beige",
    "Door: Distinction light grey",
    "Door: Distinction slate grey",
    "Door: Distinction brown",
    "Door: Gold oak satin",
    "Other RAL…",
  ];
  /* systems Exeter Window Store supply – pick by material */
  const SYS = [
    "Not specified",
    "uPVC – Profile 22 2500 chamfered",
    "uPVC – Profile 22 2800 sculptured",
    "uPVC – Profile 22 flush casement",
    "uPVC – Deceuninck 2500 chamfered",
    "uPVC – Deceuninck 2800 sculptured",
    "uPVC – Deceuninck flush casement",
    "uPVC – Rehau Total 70 chamfered",
    "uPVC – Rehau Total 70 sculptured",
    "uPVC – Rehau Rio flush",
    "uPVC – Vertical sliding sash",
    "uPVC – Inline patio slider",
    "uPVC – Triple-track patio slider",
    "uPVC – Residential door",
    "Aluminium – Cortizo casement",
    "Aluminium – Cortizo flush casement",
    "Aluminium – Origin OW70",
    "Aluminium – Origin OW80",
    "Aluminium – AluK heritage",
    "Aluminium – Cortizo bi-fold",
    "Aluminium – Origin OB36+ bi-fold",
    "Aluminium – Origin OB49 bi-fold",
    "Aluminium – Origin OB72 bi-fold",
    "Aluminium – Cortizo 4700 slider",
    "Aluminium – Origin OS29+ slider",
    "Aluminium – Entrance door",
    "Composite – Rehau Visage",
    "Composite – Distinction (Deceuninck frame)",
    "Composite – Royale",
    "Timber – joinery made",
    "Other (see note)",
  ];
  const sysFor = (o) =>
    SYS.filter(
      (x) =>
        x === "Not specified" ||
        x.startsWith("Other") ||
        (/Alumin/.test(o.mat)
          ? x.startsWith("Aluminium")
          : /Composite/.test(o.mat)
            ? x.startsWith("Composite")
            : /Timber/.test(o.mat)
              ? x.startsWith("Timber")
              : /uPVC/.test(o.mat)
                ? x.startsWith("uPVC")
                : true),
    );
  /* garage doors: what the common UK makes offer (Hörmann, Garador, SWS, Gliderol, Cardale, Carteck, Ryterna) */
  const GAR = {
    make: [
      "Not specified",
      "Hörmann LPU 42 sectional",
      "Hörmann LPU 67 Thermo sectional",
      "Hörmann RollMatic roller",
      "Hörmann Berry up & over",
      "Garador steel up & over",
      "Garador Guardian (Secured by Design)",
      "Garador sectional",
      "Garador GaraRoll roller",
      "SWS SeceuroGlide roller",
      "Gliderol roller (single skin)",
      "Cardale up & over",
      "Carteck sectional",
      "Novoferm sectional",
      "Ryterna side-hinged",
      "Timber – joinery made",
      "Other (see note)",
    ],
    style: [
      "Horizontal ribbed (M-rib)",
      "Narrow ribbed (S-rib)",
      "Large ribbed (L-rib)",
      "Georgian panelled",
      "Vertical ribbed",
      "Flat / smooth",
      "Timber-effect panels",
      "Chevron / herringbone",
      "Roller laths (77mm insulated)",
      "Roller laths (55mm compact)",
      "Roller laths (single skin)",
      "Side-hinged panelled",
      "Side-hinged ledged & braced",
    ],
    fin: [
      "Woodgrain",
      "Silkgrain (smooth)",
      "Sandgrain",
      "Decograin (timber foil)",
      "Duragrain (decor)",
      "Powder coated smooth",
      "GRP moulded",
      "Timber – stained",
      "Timber – primed for painting",
      "PVC white",
    ],
    gear: [
      "Manual – canopy",
      "Manual – retractable",
      "Manual – roller",
      "Electric – retractable up & over",
      "Electric – sectional operator",
      "Electric – roller tube motor",
      "Electric – side-hinged swing operator",
    ],
    motor: [
      "None (manual)",
      "Hörmann ProMatic",
      "Hörmann SupraMatic",
      "Garador GaraMatic 9",
      "Garador GaraMatic 10",
      "Garador GaraMatic 20",
      "Roller built-in tube motor with manual override",
      "Somfy tube motor",
      "Other (see note)",
    ],
    elec: [
      "Not checked yet",
      "Not needed – manual door",
      "Already there – socket within 1m of the motor",
      "Already there – needs extending to the motor position",
      "New supply needed – fused spur from the consumer unit",
      "New supply needed – socket on an existing circuit",
      "New supply needed – separate circuit / RCD",
      "Supplied by client's own electrician",
    ],
    by: ["JEB to arrange", "Door supplier's fitter", "Client's electrician", "Not decided"],
    fix: [
      "Behind the opening (on the inside face)",
      "Between the reveals",
      "On a timber sub-frame",
      "Steel fixing frame supplied with door",
      "Roller box outside (external)",
      "Roller box inside (internal)",
    ],
    cols: [
      "Traffic white (RAL 9016)",
      "White aluminium (RAL 9006)",
      "Window grey (RAL 7040)",
      "Stone grey (RAL 7030)",
      "Light grey (RAL 7035)",
      "Light ivory (RAL 1015)",
      "Basalt grey (RAL 7012)",
      "Slate grey (RAL 7015)",
      "Quartz grey (RAL 7039)",
      "Grey aluminium (RAL 9007)",
      "Anthracite grey (RAL 7016)",
      "Anthracite metallic (CH703)",
      "Jet black (RAL 9005)",
      "Terra brown (RAL 8028)",
      "Fir green (RAL 6009)",
      "Moss green (RAL 6005)",
      "Ruby red (RAL 3003)",
      "Steel blue (RAL 5011)",
      "Decograin golden oak",
      "Decograin rosewood",
      "Decograin dark oak",
      "Decograin winchester oak",
      "Decograin night oak",
      "Decograin titan metallic",
      "Other RAL…",
    ],
  };
  const GIDS = ["gmake", "gstyle", "gfin", "ggear", "gmotor", "gelec", "gby", "gfix"];
  const GKEY = {
    gmake: "make",
    gstyle: "style",
    gfin: "fin",
    ggear: "gear",
    gmotor: "motor",
    gelec: "elec",
    gby: "by",
    gfix: "fix",
  };
  const THR = [
    "Standard threshold",
    "Low threshold (Part M)",
    "Rebated weathered threshold",
    "Flush / level track",
    "Non-rebated (internal)",
    "N/A",
  ];
  /* supplier size limits (Exeter Window Store ranges) – shown as a warning, never blocks */
  function limitsTxt(o) {
    const s = sizes(o),
      w = [];
    const sashy = o.frames.some((f) => f.cols.some((c) => c.op === "SV"));
    const leaves = o.frames.flatMap((f, fi) =>
      colWs(frameWs(o)[fi] || frameWs(o)[0], f.cols).map((cw, i) => ({ cw, op: f.cols[i].op })),
    );
    if (sashy) {
      if (leaves.some((l) => l.op === "SV" && l.cw < 375) || s.H < 800)
        w.push("Below the sash minimum 375 × 800");
      if (leaves.some((l) => l.op === "SV" && l.cw > 1500) || s.H > 3000)
        w.push("Over the sash maximum 1500 × 3000 per sash");
    }
    if (leaves.some((l) => /^F[LR]$/.test(l.op) && (l.cw > 1200 || s.H > 3000)))
      w.push("Bi-fold leaf over 1200 wide or 3000 high – check with the supplier");
    if (leaves.some((l) => /^S[LR]$/.test(l.op)) && o.kind === "door" && (s.W > 6000 || s.H > 2500))
      w.push("Sliding door over 6000 × 2500");
    if (/Alumin/.test(o.mat) && /Other RAL|Door:/.test(o.out + o.in))
      w.push("RAL / special colour – allow about 8 weeks");
    return w;
  }
  const LOCKS = {
    window: [
      "Espag handle, key locking",
      "Espag handle, push button",
      "Monkey tail (heritage)",
      "Sash locks + fitch catches",
      "Fixed (no handle)",
    ],
    door: [
      "Multipoint, lever/lever",
      "Multipoint, lever/pad (front door)",
      "Multipoint, thumb turn inside",
      "Ultion / 3-star cylinder",
      "Electronic / keypad",
    ],
    garage: [
      "Manual – latch & cylinder lock",
      "Manual – 2-point lock",
      "Electric operator (locks on motor)",
      "Electric with battery back-up",
      "Anti-snap cylinder (Guardian)",
      "Multipoint side-hinged lock",
    ],
    roof: ["Top bar handle", "Remote control (electric)", "Solar remote", "Manual rod"],
  };
  LOCKS.bay = LOCKS.window;
  const EXTRAS = {
    window: [
      "Run-through sash horns",
      "Stuck-on sash horns",
      "Spiral balances",
      "Slide & tilt sashes",
      "Concealed head vent",
      "Deep bottom rail",
      "Sash stops / restrictors",
      "Restrictors",
      "Child safety locks",
      "Part Q (PAS 24)",
      "Secured by Design",
      "Blinds in glass",
      "Fire escape (egress)",
      "Dual colour",
      "Marine grade finish",
      "Coastal stainless hardware",
      "Triple glazed A+",
    ],
    door: [
      "Part Q (PAS 24)",
      "Secured by Design (reinforced)",
      "Cat / dog flap",
      "Internally beaded",
      "Hinge-side security",
      "Doorbell cut-out",
      "Dual colour",
      "Marine grade finish",
      "Coastal stainless hardware",
      "Knurled hardware (Origin)",
      "Integral blinds",
      "Triple glazed 44mm",
    ],
    garage: [
      "Wicket door 830mm",
      "Wicket door 1140mm",
      "Windows – Georgian",
      "Windows – Linear",
      "Matching side door",
      "Hand transmitters ×2",
      "Extra hand transmitter",
      "Keypad / code switch",
      "Wall console / push button",
      "Smartphone control",
      "Photocell",
      "Safety edge",
      "External manual release (key)",
      "Internal emergency release",
      "Secured by Design / RC2",
      "Thermal frame (ThermoFrame)",
      "Draught seals all round",
      "Low headroom track",
      "Roller box cover",
      "Frame trims colour-matched",
      "Double skin insulated",
      "Single skin",
    ],
    roof: ["Flashing kit", "Blackout blind", "Insulation collar", "Rain sensor", "Fly screen"],
  };
  EXTRAS.bay = EXTRAS.window;
  const GLASS = [
    "Clear",
    "Pilkington Arctic",
    "Pilkington Autumn",
    "Pilkington Chantilly",
    "Pilkington Charcoal Sticks",
    "Pilkington Contora",
    "Pilkington Cotswold",
    "Pilkington Digital",
    "Pilkington Everglade",
    "Pilkington Flemish",
    "Pilkington Florielle",
    "Pilkington Mayflower",
    "Pilkington Minster",
    "Pilkington Oak",
    "Pilkington Pelerine",
    "Pilkington Reeded",
    "Pilkington Stippolyte",
    "Pilkington Sycamore",
    "Pilkington Taffeta",
    "Pilkington Warwick",
    "Satin / etched look",
    "Solar control",
    "Self-cleaning (Pilkington Activ)",
    "Acoustic",
  ];
  const GWHERE = [
    "All panes",
    "Lower panes only",
    "Top lights only",
    "Door leaf only",
    "Side panels only",
    "As noted",
  ];
  const DFL = {
    lp: [
      "None",
      "Letter plate (standard)",
      "Letter plate, low position",
      "Letter plate in side panel",
      "Letter plate + draught brush",
      "Letter plate + internal cowl",
    ],
    nums: [
      "None",
      "Numerals on door",
      "Numerals on glass",
      "Numerals on top light",
      "Numerals on side panel",
      "Name plate",
      "Numerals on door + name plate",
    ],
    nstyle: [
      "Standard numerals",
      "Modern (sans serif)",
      "Traditional (serif)",
      "Script",
      "Stainless steel",
      "Brass",
      "Black",
      "White",
      "To match hardware colour",
    ],
    knock: [
      "None",
      "Ring knocker",
      "Lion head knocker",
      "Victorian knocker",
      "Slimline knocker",
      "Knocker with spy hole",
    ],
    spy: ["None", "Standard spy hole", "Wide-angle spy hole", "Digital door viewer"],
    chain: ["None", "Door chain", "Door restrictor bar"],
    pull: [
      "None",
      "Centre knob",
      "Long pull bar",
      "Lever / pad (with lock)",
      "Lever / lever (with lock)",
    ],
  };
  const DIDS = ["lp", "nums", "nstyle", "knock", "spy", "chain", "pull"];
  /* wooden windows & doors: what a joinery maker needs to know */
  const TIM = {
    tspec: [
      "Engineered redwood (Scandinavian pine)",
      "Accoya (modified wood, long guarantee)",
      "Sapele (hardwood)",
      "Meranti (hardwood)",
      "European oak",
      "Iroko",
      "Idigbo",
      "Douglas fir",
      "Siberian larch",
      "Tulipwood (paint grade)",
      "Other (see note)",
    ],
    wstyle: [
      "Flush casement",
      "Storm-proof casement",
      "Lipped casement (traditional)",
      "Georgian casement",
      "Box sash – cords & weights",
      "Box sash – spiral balances",
      "Sash – tilt-in",
      "Fixed / picture",
      "Pivot / reversible",
      "Like for like – copy existing",
    ],
    dstyle: [
      "Ledged & braced",
      "Framed, ledged & braced",
      "Stable door (split)",
      "4 panel",
      "6 panel",
      "2 panel, glazed top",
      "Half glazed, panels below",
      "Fully glazed (French / garden door)",
      "Cottage – small glazed top",
      "Contemporary flush / grooved",
      "Bespoke (see note)",
      "Like for like – copy existing",
    ],
    tfin: [
      "Factory spray painted (microporous)",
      "Factory stained – translucent",
      "Factory stained – opaque",
      "Clear lacquer / oil",
      "Primed only – paint on site",
      "Base coat only – finish on site",
      "Untreated – finish on site",
      "Dual colour (different in / out)",
    ],
    tglz: [
      "Double glazed 24mm (standard)",
      "Slimline heritage double glazing (12–16mm)",
      "Vacuum glazing (6–9mm)",
      "Triple glazed",
      "Single glazed (listed / internal)",
    ],
    tgm: [
      "Internally beaded",
      "Externally beaded",
      "Putty-fronted look (heritage)",
      "Silicone / glazing tape only",
    ],
    tbars: [
      "No glazing bars",
      "Through (true) bars",
      "Astragal bars both sides + spacer",
      "Astragal bars outside only",
      "Leaded lights in the unit",
    ],
    tmould: [
      "Ovolo",
      "Lamb's tongue",
      "Chamfered",
      "Square / plain",
      "Bolection (doors)",
      "Bead & butt (doors)",
    ],
    tcill: [
      "Matching timber cill",
      "Hardwood cill",
      "Oak cill",
      "Frame to suit existing stone cill",
      "No cill",
    ],
    wiron: [
      "Peg stay & cockspur",
      "Monkey tail stay & fastener",
      "Espagnolette (multi-point)",
      "Friction stays + espag",
      "Sash fitch fasteners + sash lifts",
      "Sash ring pulls + fasteners",
      "Lockable stays",
      "Like for like",
    ],
    diron: [
      "Multipoint lock (timber door)",
      "5-lever mortice sashlock (BS3621)",
      "Mortice deadlock + nightlatch",
      "Suffolk (thumb) latch",
      "Rim lock",
      "Butt hinges ×3",
      "Strap / T-hinges",
      "Bolts top & bottom",
      "Like for like",
    ],
    tifin: [
      "Black antique / beeswax",
      "Polished brass",
      "Satin brass",
      "Satin chrome",
      "Polished chrome",
      "Pewter",
      "Bronze",
      "Stainless steel",
    ],
    tweath: ["Draught seals in the frame", "Weatherbar + drip", "Seals + weatherbar", "None"],
    tcons: [
      "Not listed / not a conservation area",
      "Conservation area – like for like",
      "Listed building – consent needed",
      "Article 4 – check with the council",
      "Not checked yet",
    ],
  };
  const TIDS = [
    "tspec",
    "tstyle",
    "tfin",
    "tglz",
    "tgm",
    "tbars",
    "tmould",
    "tcill",
    "tiron",
    "tifin",
    "tweath",
    "tcons",
  ];
  const timList = (o, k) =>
    k === "tstyle"
      ? o.kind === "door"
        ? TIM.dstyle
        : TIM.wstyle
      : k === "tiron"
        ? o.kind === "door"
          ? TIM.diron
          : TIM.wiron
        : TIM[k];
  const isTim = (o) => /Timber/.test(o.mat || "") && o.kind !== "garage" && o.kind !== "roof";
  const MFGL = {
    prof: [
      "Standard chamfered",
      "Ovolo / sculptured",
      "Flush sash",
      "Heritage (mechanical joint)",
      "Timber look",
      "Aluminium – standard casement",
      "Aluminium – flush casement",
      "Aluminium – slimline",
      "Aluminium – heritage / steel look",
      "Aluminium – bi-fold system",
      "Aluminium – sliding door system",
      "Slimline aluminium",
    ],
    outer: [
      "Standard outer",
      "Wide outer to L+R+T",
      "Wide outer to L+R",
      "Wide outer all round",
      "No add-ons",
    ],
    reinf: ["Reinforcing where required", "Fully reinforced", "Steel reinforced (Part Q)"],
    hinge: [
      "Easy-clean hinges",
      "Standard friction hinges",
      "Egress (fire escape) hinges",
      "Restrictor hinges",
      "Flag hinges",
      "Butt hinges",
      "Concealed hinges",
      "N/A",
    ],
    vents: [
      "None",
      "1 in opening sash",
      "1 in fixed pane",
      "1 per opening sash",
      "1 in each pane",
      "In frame head",
    ],
    spec: [
      "Annealed",
      "Toughened",
      "Toughened lower",
      "Toughened both panes",
      "Laminated",
      "Laminated outer",
      "Toughened outer / laminated inner",
    ],
    spacer: [
      "Warm edge spacer (black)",
      "Warm edge spacer (grey)",
      "Silver aluminium",
      "Georgian bar spacer",
    ],
    gas: ["Argon", "Air", "Krypton"],
    drain: ["Base drained", "Face drained", "Concealed drain"],
    swing: ["Opens in", "Opens out", "N/A"],
  };
  MFGL.sys = SYS;
  MFGL.thr = THR;
  MFGL.bead = ["Chamfered bead", "Ovolo bead", "N/A"];
  const FIDS = [
    "prof",
    "outer",
    "reinf",
    "hinge",
    "vents",
    "spec",
    "spacer",
    "gas",
    "drain",
    "swing",
    "sys",
    "thr",
    "bead",
  ];
  const PFX = { window: "W", door: "D", bay: "B", garage: "G", roof: "R" };
  const BARC = {
    "2": "Bars: 2 over 2",
    "4": "Bars: 4 over 4",
    "6": "Bars: 6 over 6",
    "9": "Bars: 9 over 9",
    "61": "Bars: 6 over 1",
    "31": "Bars: 3 over 1",
  };
  const parseCol = (s) => {
    const m = s.match(/^(?:([A-Z]+)\/)?([A-Z]+)(?::([SHG]|D\d+|\d+))?(~)?$/);
    if (m && BARC[m[3]])
      return {
        w: 0,
        tl: m[1] ? 400 : 0,
        tlop: m[1] || "F",
        op: m[2],
        fill: BARC[m[3]],
        st: !!m[4],
      };
    return {
      w: 0,
      tl: m[1] ? 400 : 0,
      tlop: m[1] || "F",
      op: m[2],
      fill: /^D\d+$/.test(m[3] || "")
        ? DOORD[+m[3].slice(1)]
        : { S: "Solid panel – raised", H: "Half glazed – raised panel", G: "Georgian bars" }[
            m[3]
          ] || "Glass",
      st: !!m[4],
    };
  };
  const parseFrame = (s) => s.split("|").map(parseCol);
  function blank(kind) {
    const win = kind === "window" || kind === "bay";
    return {
      ref: "",
      kind,
      loc: "",
      name: "",
      pk: "",
      mat: MATS[kind][0],
      qty: 1,
      sw: 1210,
      sh: 1060,
      gap: 10,
      rev: 300,
      cill: win ? "150mm cill" : "No cill",
      gu: kind === "garage" ? "Solid panel" : "Double glazed 28mm",
      gt: "Clear",
      gwhere: "All panes",
      out: "White",
      in: "White",
      hw: "Chrome",
      lock: LOCKS[kind][0],
      ex: [],
      notes: "",
      cillH: 30,
      cillD: 0,
      cillInc: true,
      lp: "None",
      nums: "None",
      nstyle: "Standard numerals",
      num: "",
      knock: "None",
      spy: "None",
      chain: "None",
      pull: "None",
      prof: "Standard chamfered",
      outer: "Standard outer",
      reinf: "Reinforcing where required",
      hinge: win ? "Easy-clean hinges" : kind === "door" ? "Flag hinges" : "N/A",
      vents: win ? "1 in opening sash" : "None",
      spec: kind === "door" ? "Toughened both panes" : "Annealed",
      spacer: "Warm edge spacer (black)",
      gas: "Argon",
      drain: "Base drained",
      swing: kind === "door" ? "Opens in" : "N/A",
      sys: "Not specified",
      thr: kind === "door" ? "Standard threshold" : "N/A",
      bead: win || kind === "door" ? "Chamfered bead" : "N/A",
      slab: "",
      gdes: "",
      gmake: "Not specified",
      gstyle: "Horizontal ribbed (M-rib)",
      gfin: "Woodgrain",
      ggear: "Manual – canopy",
      gmotor: "None (manual)",
      gelec: "Not checked yet",
      gby: "Not decided",
      gfix: "Behind the opening (on the inside face)",
      ghead: 0,
      gsl: 0,
      gsr: 0,
      gnote: "",
      photos: [],
      frames: [],
      addons: [],
      sized: false,
    };
  }
  const hasCill = (o) => !!o.cill && !o.cill.startsWith("No");
  function applyPreset(o, kind, i) {
    const p = PRE[kind][i];
    o.pk = kind + ":" + i;
    o.name = p[0];
    if (kind === "bay") {
      let ws = p[3].slice();
      if (o.sized) {
        const tot = ws.reduce((a, b) => a + b, 0),
          want = o.sw - 2 * o.gap;
        if (want > 300) ws = ws.map((w) => Math.round((w * want) / tot));
      }
      o.frames = p[1].map((s, k) => ({ w: ws[k], ang: p[2][k] ?? 180, cols: parseFrame(s) }));
      if (!o.sized) {
        o.sw = ws.reduce((a, b) => a + b, 0) + 2 * o.gap;
        o.sh = (p[4] || 1300) + o.gap;
      }
    } else {
      o.frames = [
        Object.assign(
          { w: 0, ang: 180, cols: parseFrame(p[1]) },
          p[3]
            ? {
                top: p[3].top || 0,
                topop: "F",
                bot: p[3].bot || 0,
                botop: "F",
                botfill: "Glass",
                botFrom: "top",
              }
            : {},
        ),
      ];
      if (!o.sized) {
        const d = p[2] || [o.frames[0].cols.length * 600, 1050];
        o.sw = d[0] + 2 * o.gap;
        o.sh = d[1] + (hasCill(o) ? o.gap : 2 * o.gap);
      }
    }
  }
  const frameH = (o) =>
    Math.max(0, o.sh - o.gap - (hasCill(o) ? (cillInc(o) ? 0 : cillHt(o)) : o.gap));
  const frameWs = (o) =>
    o.frames.length > 1 ? o.frames.map((f) => +f.w || 0) : [Math.max(0, o.sw - 2 * o.gap)];
  function addMm(o) {
    const A = { h: 0, b: 0, l: 0, r: 0 };
    (o.addons || []).forEach((a) => {
      const m = +a.mm || 0,
        p = a.pos;
      if (!m) return;
      if (/Head|All/.test(p)) A.h += m;
      if (/All|Bottom/.test(p)) A.b += m;
      if (/Left|left|All/.test(p)) A.l += m;
      if (/Right|right|All/.test(p)) A.r += m;
    });
    A.any = A.h + A.b + A.l + A.r > 0;
    return A;
  }
  const colWs = (fw, cols) => {
    const fixed = cols.reduce((s, c) => s + (+c.w || 0), 0),
      free = cols.filter((c) => !+c.w).length,
      each = free ? Math.max(0, (fw - fixed) / free) : 0;
    return cols.map((c) => +c.w || each);
  };
  function sizes(o) {
    const fws = frameWs(o),
      A = addMm(o),
      W = fws.reduce((a, b) => a + b, 0),
      H = frameH(o);
    return { fws, A, W, H, OW: W + A.l + A.r, OH: H + A.h + A.b };
  }
  const obsOn = (o) => o.gt !== "Clear" && /Pilkington (?!Activ)|Satin/.test(o.gt);
  const MIR = {
    HL: "HR",
    HR: "HL",
    DL: "DR",
    DR: "DL",
    FL: "FR",
    FR: "FL",
    TTL: "TTR",
    TTR: "TTL",
    SL: "SR",
    SR: "SL",
  };
  function flip(o) {
    const angs = o.frames
      .slice(0, -1)
      .map((f) => f.ang)
      .reverse();
    o.frames.reverse();
    o.frames.forEach((f, i) => {
      f.ang = i < angs.length ? angs[i] : 180;
      f.cols.reverse();
      f.cols.forEach((c) => {
        c.op = MIR[c.op] || c.op;
        c.tlop = MIR[c.tlop] || c.tlop;
      });
    });
    if (o.master) o.master = o.master === "Left" ? "Right" : "Left";
  }
  const leaves = (o) =>
    o.frames.flatMap((f) => f.cols).filter((c) => c.op === "DL" || c.op === "DR");
  function handTxt(o) {
    const L = leaves(o);
    if (!L.length) return "";
    if (L.length === 1)
      return `Door hinges on the ${L[0].op === "DL" ? "left" : "right"} (viewed from outside)`;
    return `Pair of doors, master (first opening) leaf: ${(o.master || "Right").toLowerCase()}`;
  }
  function isObs(o, c, part) {
    if (!obsOn(o)) return false;
    const w = o.gwhere;
    if (w === "All panes" || w === "As noted") return true;
    if (w === "Top lights only") return part === "tl";
    if (w === "Lower panes only") return part === "main";
    const door = /^D[LR]$/.test(c.op);
    if (w === "Door leaf only") return part === "main" && door;
    if (w === "Side panels only") return !door;
    return false;
  }

  /* ---- drawing (SVG, viewed from outside) ---- */
  /* the frame / door colour as it looks (generic shades for the colour names on the list) */
  const WS_SHADES = [
    [/signal white|9016|white/i, "#f7f7f5"],
    [/cream|ivory/i, "#efe6cf"],
    [/anthracite|7016/i, "#3d4247"],
    [/black ash/i, "#2e2723"],
    [/black.*brown|brown.*black/i, "#2f2520"],
    [/black|9005|jet/i, "#232323"],
    [/agate/i, "#b2b3ad"],
    [/slate/i, "#5b6167"],
    [/pebble/i, "#bab4a6"],
    [/basalt/i, "#565c60"],
    [/buckingham/i, "#6d757a"],
    [/hazy/i, "#a9aba7"],
    [/claystone|beige|sand/i, "#cbbfa9"],
    [/chartwell|duck egg|sage/i, "#b3c4b3"],
    [/dark green|green/i, "#2f4a3a"],
    [/wine|dark red|red/i, "#6b1f24"],
    [/porcelain|steel blue|blue/i, "#4c6680"],
    [/windsor/i, "#3a443e"],
    [/light oak/i, "#c99c63"],
    [/golden oak|honey/i, "#a86a2f"],
    [/irish oak/i, "#7a4a27"],
    [/swamp/i, "#6e5a45"],
    [/anteak|walnut/i, "#5a3f2b"],
    [/rosewood|mahogany/i, "#5e2a22"],
    [/pyrite|gold/i, "#a88b4c"],
    [/silver|9006/i, "#a7aaa8"],
    [/9007|grey alu/i, "#8e8e8b"],
    [/bronze|brown/i, "#4a3a2c"],
    [/oak|wood/i, "#a86a2f"],
    [/grey|gray/i, "#8d9195"],
  ];
  const wsShade = (name) => (WS_SHADES.find(([re]) => re.test(name || "")) || [0, "#f7f7f5"])[1];
  const WS_HW = {
    White: "#f4f4f2",
    Chrome: "#c9ccd0",
    "Satin chrome": "#b4b7ba",
    Black: "#222",
    Gold: "#c9a548",
    Graphite: "#4a4d50",
  };
  const wsLight = (hex) => {
    const n = parseInt(String(hex).slice(1), 16);
    return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 140;
  };
  /* the palette for one opening: its frame colour (also doors and solid panels), lines that show on it, handles */
  function wsLook(o, C, sc) {
    const ff = wsShade(o.out);
    return {
      ...C,
      sc,
      ff,
      panel: ff,
      det: wsLight(ff) ? C.frame : "rgba(255,255,255,.4)",
      hw: WS_HW[o.hw] || (wsLight(ff) ? "#c9ccd0" : "#e8e8e6"),
    };
  }
  /* a glazing bar: the frame colour with a thin dark edge so it shows on the glass */
  const wsBar = (x1, y1, x2, y2, w, C) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.frame}" stroke-width="${w + 0.8}" opacity=".55"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ff || C.frame}" stroke-width="${w}"/>`;
  /* handles (and hinges on doors), on the sash band or the door slab */
  function wsHandle(op, X, Y, W, H, sw, C) {
    const sc = C.sc || 0.08,
      hw = C.hw || C.frame,
      e = `stroke="${C.frame}" stroke-width=".4"`;
    if (!C.sc || W < 10 || H < 10) return "";
    const pw = Math.max(1.4, Math.min(sw * 0.6, 32 * sc)),
      ph = Math.max(4, Math.min(H * 0.18, 150 * sc)),
      lw = Math.max(3, Math.min(W * 0.28, 115 * sc)),
      lt = Math.max(1, 20 * sc);
    /* a window handle: a plate on the sash with its lever hanging down (or along, for top / bottom) */
    const win = (cx, cy, along) =>
      along
        ? `<rect x="${cx - ph / 2}" y="${cy - pw / 2}" width="${ph}" height="${pw}" rx="${pw / 2}" fill="${hw}" ${e}/><rect x="${cx - ph * 0.3}" y="${cy - lt / 2}" width="${lw}" height="${lt}" rx="${lt / 2}" fill="${hw}" ${e}/>`
        : `<rect x="${cx - pw / 2}" y="${cy - ph / 2}" width="${pw}" height="${ph}" rx="${pw / 2}" fill="${hw}" ${e}/><rect x="${cx - lt / 2}" y="${cy - ph * 0.3}" width="${lt}" height="${lw}" rx="${lt / 2}" fill="${hw}" ${e}/>`;
    const MY = Y + H / 2,
      MX = X + W / 2;
    switch (op) {
      case "HL":
      case "TTL":
        return win(X + W - sw / 2, MY);
      case "HR":
      case "TTR":
        return win(X + sw / 2, MY);
      case "TH":
      case "CP":
        return win(MX, Y + H - sw / 2, true);
      case "BH":
        return win(MX, Y + sw / 2, true);
      case "SL":
      case "SR": {
        const hx = op === "SL" ? X + sw / 2 : X + W - sw / 2;
        return `<rect x="${hx - pw / 2}" y="${MY - ph}" width="${pw}" height="${ph * 2}" rx="${pw / 2}" fill="${hw}" ${e}/>`;
      }
      case "DL":
      case "DR": {
        /* lever and plate about 1000 above the bottom, hinges on the other side */
        const L = op === "DL",
          hx = L ? X + W - Math.max(sw / 2, 60 * sc) : X + Math.max(sw / 2, 60 * sc),
          hy = Math.max(Y + H * 0.3, Math.min(Y + H * 0.62, Y + H - 1000 * sc)),
          dph = Math.max(6, Math.min(H * 0.16, 230 * sc)),
          dpw = Math.max(1.8, Math.min(sw * 0.7, 40 * sc)),
          dlw = Math.max(4, Math.min(W * 0.22, 130 * sc)),
          dir = L ? -1 : 1,
          hgw = Math.max(1, 14 * sc),
          hgh = Math.max(3, Math.min(H * 0.06, 100 * sc)),
          hgx = L ? X - hgw / 2 : X + W - hgw / 2;
        let q = `<rect x="${hx - dpw / 2}" y="${hy - dph * 0.35}" width="${dpw}" height="${dph}" rx="${dpw / 2}" fill="${hw}" ${e}/><rect x="${dir < 0 ? hx - dlw : hx}" y="${hy - lt}" width="${dlw}" height="${lt * 1.6}" rx="${lt * 0.8}" fill="${hw}" ${e}/><circle cx="${hx}" cy="${hy + dph * 0.38}" r="${dpw * 0.28}" fill="${C.frame}"/>`;
        [0.08, 0.5, 0.9].forEach(
          (fy) =>
            (q += `<rect x="${hgx}" y="${Y + H * fy - hgh / 2}" width="${hgw}" height="${hgh}" fill="${hw}" ${e}/>`),
        );
        return q;
      }
    }
    return "";
  }
  function opSym(x, y, w, h, op, C) {
    const L = x + 3,
      R = x + w - 3,
      T = y + 3,
      B = y + h - 3,
      MX = x + w / 2,
      MY = y + h / 2;
    if (w < 8 || h < 8) return "";
    const d = (p, da) =>
      `<path d="${p}" fill="none" stroke="${C.dim}" stroke-width=".9" opacity=".8" stroke-dasharray="${da || "5 3"}"/>`;
    const ar = (x1, y1, x2, y2) => {
      const a = Math.atan2(y2 - y1, x2 - x1),
        s = Math.min(6, Math.hypot(x2 - x1, y2 - y1) * 0.35);
      return `<path d="M${x1} ${y1}L${x2} ${y2}M${x2 - s * Math.cos(a - 0.5)} ${y2 - s * Math.sin(a - 0.5)}L${x2} ${y2}L${x2 - s * Math.cos(a + 0.5)} ${y2 - s * Math.sin(a + 0.5)}" fill="none" stroke="${C.dim}" stroke-width="1.2"/>`;
    };
    const fl = (x1, y1, x2, y2) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.frame}" stroke-width=".8"/>`;
    switch (op) {
      case "HL":
      case "DL":
      case "FL":
        return d(`M${R} ${T}L${L} ${MY}L${R} ${B}`, op === "FL" ? "2 2" : 0);
      case "HR":
      case "DR":
      case "FR":
        return d(`M${L} ${T}L${R} ${MY}L${L} ${B}`, op === "FR" ? "2 2" : 0);
      case "TH":
        return d(`M${L} ${B}L${MX} ${T}L${R} ${B}`);
      case "BH":
        return d(`M${L} ${T}L${MX} ${B}L${R} ${T}`);
      case "TTL":
        return d(`M${R} ${T}L${L} ${MY}L${R} ${B}`) + d(`M${L} ${T}L${MX} ${B}L${R} ${T}`, "2 3");
      case "TTR":
        return d(`M${L} ${T}L${R} ${MY}L${L} ${B}`) + d(`M${L} ${T}L${MX} ${B}L${R} ${T}`, "2 3");
      case "SV":
        return (
          `<line x1="${x}" y1="${MY}" x2="${x + w}" y2="${MY}" stroke="${C.frame}" stroke-width="1.6"/>` +
          ar(MX, B - 2, MX, MY + 4) +
          ar(MX, T + 2, MX, MY - 4)
        );
      case "SL":
        return ar(R - 4, MY, L + 4, MY);
      case "SR":
        return ar(L + 4, MY, R - 4, MY);
      case "CP":
        return d(`M${L} ${T}L${R} ${MY}L${L} ${B}M${R} ${T}L${L} ${MY}L${R} ${B}`, "3 3");
      case "GU": {
        let s = "";
        for (let k = 1; k < 8; k++) s += fl(x + (w * k) / 8, y, x + (w * k) / 8, y + h);
        return s + ar(MX, B - 4, MX, T + 6);
      }
      case "GR": {
        let s = "";
        for (let k = 1; k < 14; k++) s += fl(x, y + (h * k) / 14, x + w, y + (h * k) / 14);
        return s;
      }
      case "GS": {
        let s = "";
        for (let k = 1; k < 4; k++)
          s += `<line x1="${x}" y1="${y + (h * k) / 4}" x2="${x + w}" y2="${y + (h * k) / 4}" stroke="${C.frame}" stroke-width="1.3"/>`;
        return s;
      }
      case "LN":
        return `<path d="M${L} ${T}L${x + w * 0.3} ${MY}L${L} ${B}M${R} ${T}L${x + w * 0.7} ${MY}L${R} ${B}M${x + w * 0.3} ${MY}H${x + w * 0.7}" fill="none" stroke="${C.frame}" stroke-width="1"/>`;
    }
    return "";
  }
  function cell(x, y, w, h, op, fill, st, C, obs) {
    /* half a mullion / transom on each side: the frame colour behind shows between the panes */
    const i = C.sc
        ? Math.max(1.2, Math.min(32 * C.sc, Math.min(w, h) * 0.12))
        : Math.max(1.2, Math.min(w, h) * 0.03),
      X = x + i,
      Y = y + i,
      W = w - 2 * i,
      H = h - 2 * i;
    if (W <= 0 || H <= 0) return "";
    let s = "";
    const gl = (a, b, c, d) => {
      const k = Math.min(c, d);
      let q = `<rect x="${a}" y="${b}" width="${c}" height="${d}" fill="${C.glass}" stroke="${C.frame}" stroke-width=".5"/>`;
      if (obs && c > 6 && d > 6)
        q += `<rect x="${a}" y="${b}" width="${c}" height="${d}" fill="url(#wsobs)"/>`;
      if (C.sc && k > 7) {
        /* the shadow of the frame along the top and left, and a shine across the glass */
        q += `<path d="M${a + c} ${b + 0.6}H${a + 0.6}V${b + d}" fill="none" stroke="#000" stroke-width="${Math.max(0.7, k * 0.03)}" opacity=".16"/>`;
        const sw = Math.max(0.8, k * 0.05);
        q += `<path d="M${a + c * 0.1} ${b + d * 0.1 + k * 0.34}L${a + c * 0.1 + k * 0.34} ${b + d * 0.1}M${a + c * 0.1} ${b + d * 0.1 + k * 0.52}L${a + c * 0.1 + k * 0.52} ${b + d * 0.1}" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" opacity=".5"/>`;
      }
      return q;
    };
    const slab = /^Door:/.test(fill),
      opens = /^(HL|HR|TH|BH|TTL|TTR|SV|SL|SR|DL|DR|FL|FR|CP)$/.test(op);
    /* anything that opens has its own sash (a door its leaf frame); fixed glass sits in the frame behind a bead */
    let sw = 0;
    if (C.sc && opens && !slab) {
      sw = Math.max(1.4, Math.min((/^D[LR]$/.test(op) ? 95 : 55) * C.sc, Math.min(W, H) * 0.16));
      s += `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="${C.ff}" stroke="${C.frame}" stroke-width=".7"/>`;
    } else if (C.sc && !slab) sw = Math.max(0.6, Math.min(10 * C.sc, Math.min(W, H) * 0.05));
    const GX = X + sw,
      GY = Y + sw,
      GW = W - 2 * sw,
      GH = H - 2 * sw;
    const sty = /ribbed/i.test(fill) ? "rib" : /flat/i.test(fill) ? "flat" : "raised";
    const pn = (a, b, c, d) => {
      let r = `<rect x="${a}" y="${b}" width="${c}" height="${d}" fill="${C.panel}" stroke="${C.frame}" stroke-width=".8"/>`;
      if (c > 12 && d > 12) {
        if (sty === "raised")
          r += `<rect x="${a + c * 0.18}" y="${b + d * 0.12}" width="${c * 0.64}" height="${d * 0.76}" fill="none" stroke="${C.det || C.frame}" stroke-width=".5"/><rect x="${a + c * 0.24}" y="${b + d * 0.17}" width="${c * 0.52}" height="${d * 0.66}" fill="none" stroke="${C.det || C.frame}" stroke-width=".35"/>`;
        else if (sty === "rib") {
          const n = Math.max(3, Math.round(c / 6));
          for (let k = 1; k < n; k++)
            r += `<line x1="${a + (c * k) / n}" y1="${b + 2}" x2="${a + (c * k) / n}" y2="${b + d - 2}" stroke="${C.det || C.frame}" stroke-width=".4"/>`;
        }
      }
      return r;
    };
    if (slab) s += doorDes(fill, X, Y, W, H, C, gl);
    else if (/^Solid panel/.test(fill)) s += pn(GX, GY, GW, GH);
    else if (/^Half glazed/.test(fill))
      s +=
        gl(GX, GY, GW, GH * 0.5 - sw / 2) + pn(GX, GY + GH * 0.5 + sw / 2, GW, GH * 0.5 - sw / 2);
    else if (/^Bars:/.test(fill)) {
      s += gl(GX, GY, GW, GH);
      const bm = fill.match(/(\d+) over (\d+)/) || [0, 1, 1];
      const GR = {
        1: [1, 1],
        2: [2, 1],
        3: [3, 1],
        4: [2, 2],
        6: [3, 2],
        8: [4, 2],
        9: [3, 3],
        12: [4, 3],
      };
      const grid = (x0, y0, w0, h0, n) => {
        const [cc, rr] = GR[n] || [1, 1];
        let q = "";
        const bw = C.sc ? Math.max(0.8, 22 * C.sc) : 0.8;
        for (let i = 1; i < cc; i++)
          q += wsBar(x0 + (w0 * i) / cc, y0, x0 + (w0 * i) / cc, y0 + h0, bw, C);
        for (let j = 1; j < rr; j++)
          q += wsBar(x0, y0 + (h0 * j) / rr, x0 + w0, y0 + (h0 * j) / rr, bw, C);
        return q;
      };
      if (op === "SV")
        s += grid(GX, GY, GW, GH / 2, +bm[1]) + grid(GX, GY + GH / 2, GW, GH / 2, +bm[2]);
      else s += grid(GX, GY, GW, GH, +bm[1]);
    } else {
      s += gl(GX, GY, GW, GH);
      if (fill === "Georgian bars") {
        const bw = C.sc ? Math.max(0.8, 22 * C.sc) : 0.8;
        [1 / 3, 2 / 3].forEach((f) => (s += wsBar(GX + GW * f, GY, GX + GW * f, GY + GH, bw, C)));
        s += wsBar(GX, GY + GH / 2, GX + GW, GY + GH / 2, bw, C);
      }
    }
    if (st)
      s += `<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${C.frame}" stroke-width="1.4"/>`;
    return (
      s +
      (slab ? wsHandle(op, X, Y, W, H, 0, C) : wsHandle(op, X, Y, W, H, sw, C)) +
      opSym(GX, GY, GW, GH, op, C)
    );
  }
  function frameSvg(o, fr, fwmm, x, y, w, h, sc, C) {
    let s = C.sc
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.ff}" stroke="${C.frame}" stroke-width="1"/>`
      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.bg}" stroke="${C.frame}" stroke-width="1.8"/>`;
    const t = C.sc
        ? Math.max(1.4, Math.min(40 * sc, Math.min(w, h) * 0.06))
        : Math.max(2.5, Math.min(w, h) * 0.035),
      cws = colWs(fwmm, fr.cols),
      tot = cws.reduce((a, b) => a + b, 0) || 1,
      inner = w - 2 * t;
    let cx = x + t;
    let RT = y + t,
      RB = y + h - t;
    const rail = (yy) =>
      C.sc
        ? ""
        : `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="${C.frame}" stroke-width="1.8"/>`;
    if (+fr.top > 0) {
      const ty = Math.min(RB - 14, RT + fr.top * sc);
      if (ty > RT + 5) {
        s +=
          cell(
            x + t,
            RT,
            inner,
            ty - RT,
            fr.topop || "F",
            "Glass",
            false,
            C,
            isObs(o, { op: fr.topop || "F" }, "tl"),
          ) + rail(ty);
        RT = ty;
      }
    }
    if (+fr.bot > 0) {
      const by = Math.max(RT + 14, RB - fr.bot * sc);
      if (by < RB - 5) {
        s +=
          cell(
            x + t,
            by,
            inner,
            RB - by,
            fr.botop || "F",
            fr.botfill || "Glass",
            false,
            C,
            isObs(o, { op: fr.botop || "F" }, "main"),
          ) + rail(by);
        RB = by;
      }
    }
    fr.cols.forEach((c, k) => {
      const cw = (cws[k] / tot) * inner,
        top = RT,
        bot = RB;
      if (k > 0 && !C.sc)
        s += `<line x1="${cx}" y1="${top}" x2="${cx}" y2="${bot}" stroke="${C.frame}" stroke-width="1.6"/>`;
      let my = top;
      if (+c.tl > 0) {
        const ty = Math.min(bot - 10, top + c.tl * sc);
        if (ty > top + 5) {
          s +=
            cell(cx, top, cw, ty - top, c.tlop || "F", "Glass", false, C, isObs(o, c, "tl")) +
            (C.sc
              ? ""
              : `<line x1="${cx}" y1="${ty}" x2="${cx + cw}" y2="${ty}" stroke="${C.frame}" stroke-width="1.6"/>`);
          my = ty;
        }
      }
      s += cell(cx, my, cw, bot - my, c.op, c.fill, c.st, C, isObs(o, c, "main"));
      cx += cw;
    });
    return s;
  }
  function draw(o, W, H, pad, C, opt) {
    opt = opt || {};
    const dims = opt.dims !== false,
      fs = opt.fs || 12;
    if (!o.frames || !o.frames.length) return "";
    const fws = frameWs(o),
      fh = frameH(o),
      A = addMm(o),
      nf = fws.length,
      bay = nf > 1,
      cillH = hasCill(o) ? 4 : 0;
    const planH = bay ? Math.round(H * 0.2) : 0,
      jg = bay ? Math.max(3, W * 0.014) : 0,
      dimH = dims ? (bay ? fs * 3.1 : fs * 2.1) + (addMm(o).any ? fs * 1.3 : 0) : 0,
      topH = bay && dims ? fs * 1.1 : 0,
      lw = dims ? fs + 6 : 0;
    const totW = fws.reduce((a, b) => a + b, 0) + A.l + A.r,
      totH = fh + A.h + A.b;
    const sc = Math.max(
      1e-4,
      Math.min(
        (W - 2 * pad - jg * (nf - 1) - lw) / Math.max(totW, 1),
        (H - 2 * pad - planH - dimH - topH - cillH) / Math.max(totH, 1),
      ),
    );
    C = wsLook(o, C, sc);
    const ww = totW * sc + jg * (nf - 1),
      hh = totH * sc,
      x0 = (W - ww + lw) / 2,
      y0 = pad + topH;
    let s = `<defs><pattern id="wsobs" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#3b3532" opacity=".45"/><circle cx="4" cy="3.8" r=".8" fill="#3b3532" opacity=".35"/></pattern></defs>`;
    if (A.any)
      s += `<rect x="${x0}" y="${y0}" width="${ww}" height="${hh}" fill="${C.add}" stroke="${C.frame}" stroke-width=".8" stroke-dasharray="3 2"/>`;
    const fy = y0 + A.h * sc,
      fpx = fh * sc,
      F0 = x0 + A.l * sc;
    let fx = F0;
    o.frames.forEach((fr, i) => {
      const w = fws[i] * sc;
      s += frameSvg(o, fr, fws[i], fx, fy, w, fpx, sc, C);
      if (cillH)
        s += `<rect x="${fx - 2}" y="${fy + fpx + cillH}" width="${w + 4}" height="1.4" fill="#000" opacity=".14"/><rect x="${fx - 2}" y="${fy + fpx}" width="${w + 4}" height="${cillH}" fill="${C.ff}" stroke="${C.frame}" stroke-width=".7"/>`;
      if (i < nf - 1) {
        s += `<rect x="${fx + w}" y="${fy}" width="${jg}" height="${fpx}" fill="${C.ff}" stroke="${C.frame}" stroke-width=".7"/>`;
        if (dims)
          s += `<text x="${fx + w + jg / 2}" y="${y0 - 3}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="600" font-size="${fs * 0.85}" fill="${C.ink}">${fr.ang}°</text>`;
      }
      fx += w + jg;
    });
    if (dims) {
      let by = y0 + hh + cillH + fs * 0.4;
      const FW = fws.reduce((a, b) => a + b, 0),
        fx1 = F0 + FW * sc + jg * (nf - 1);
      if (bay) {
        let x = F0;
        fws.forEach((fw) => {
          const w = fw * sc;
          s += `<text x="${x + w / 2}" y="${by + fs * 0.85}" text-anchor="middle" font-family="Menlo,Consolas,monospace" font-size="${fs * 0.8}" fill="${C.dim}">${fw}</text>`;
          x += w + jg;
        });
        by += fs;
      }
      const ly = by + 3;
      s += `<path d="M${F0} ${ly}H${fx1}M${F0} ${ly - 4}v8M${fx1} ${ly - 4}v8" stroke="${C.dim}" fill="none"/><text x="${(F0 + fx1) / 2}" y="${ly + fs + 1}" text-anchor="middle" font-family="Menlo,Consolas,monospace" font-size="${fs}" fill="${C.dim}">${FW}</text>`;
      if (A.any) {
        const sd = [
          [A.h, "top"],
          [A.l, "left"],
          [A.r, "right"],
          [A.b, "bottom"],
        ]
          .filter((x) => x[0])
          .map((x) => x[1] + " " + x[0])
          .join(" · ");
        s += `<text x="${W / 2}" y="${ly + fs * 2.3}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="600" font-size="${fs * 0.8}" fill="${C.ink}">Add-ons: ${sd} → ${FW + A.l + A.r} × ${fh + A.h + A.b}</text>`;
      }
      const vx = x0 - 5;
      s += `<path d="M${vx} ${fy}V${fy + fpx}M${vx - 4} ${fy}h8M${vx - 4} ${fy + fpx}h8" stroke="${C.dim}" fill="none"/><text transform="translate(${vx - 4} ${fy + fpx / 2}) rotate(-90)" text-anchor="middle" font-family="Menlo,Consolas,monospace" font-size="${fs}" fill="${C.dim}">${fh}</text>`;
    }
    if (bay) {
      const ang = o.frames.slice(0, -1).map((f) => +f.ang || 180),
        Tt = (ang.reduce((a, b) => a + (180 - b), 0) * Math.PI) / 180;
      let dr = Tt / 2;
      const p = [[0, 0]];
      fws.forEach((fw, i) => {
        const l = p[p.length - 1];
        p.push([l[0] + fw * Math.cos(dr), l[1] + fw * Math.sin(dr)]);
        if (i < nf - 1) dr -= ((180 - ang[i]) * Math.PI) / 180;
      });
      const xs = p.map((q) => q[0]),
        ys = p.map((q) => q[1]),
        mnx = Math.min(...xs),
        mxx = Math.max(...xs),
        mny = Math.min(...ys),
        mxy = Math.max(...ys);
      const bw = W - 2 * pad - 40,
        bh = planH - (dims ? fs * 0.6 : 4) - 4,
        s2 = Math.min(bw / Math.max(mxx - mnx, 1), bh / Math.max(mxy - mny, 1)),
        ox = (W - (mxx - mnx) * s2) / 2,
        oy = H - pad - planH + (dims ? fs * 0.6 : 2);
      const P = p.map((q) => [ox + (q[0] - mnx) * s2, oy + (q[1] - mny) * s2]);
      const st = Math.min(16, W * 0.06);
      s += `<path d="M${P[0][0] - st} ${P[0][1]}H${P[0][0]}M${P[P.length - 1][0]} ${P[P.length - 1][1]}h${st}" stroke="${C.ink}" stroke-width="3" opacity=".35"/>`;
      s += `<polyline points="${P.map((q) => q.join(",")).join(" ")}" fill="none" stroke="${C.frame}" stroke-width="${Math.max(2, W * 0.008)}" stroke-linejoin="round"/>`;
      if (dims)
        s += `<text x="${pad}" y="${oy}" font-family="Arial,sans-serif" font-weight="600" font-size="${fs * 0.75}" fill="${C.ink}" opacity=".6">PLAN</text>`;
    }
    return s;
  }
  const colTxt = (c) =>
    `${+c.tl ? `${SOP[c.tlop]} top light (drop ${c.tl}) over ` : ""}${SOP[c.op]}${c.fill !== "Glass" ? ", " + c.fill.toLowerCase() : ""}${c.st ? ", stable split" : ""}${+c.w ? `, ${c.w} wide` : ""}`;
  const describeTxt = (o) => {
    const multi = o.frames.length > 1,
      fh = frameH(o);
    return o.frames.map(
      (f, fi) =>
        (multi ? `F${fi + 1}: ` : "") +
        (+f.top
          ? `full-width ${SOP[f.topop || "F"].toLowerCase()} top light (drop ${f.top}); `
          : "") +
        f.cols.map((c, ci) => `P${ci + 1} ${colTxt(c)}`).join("; ") +
        (+f.bot
          ? `; full-width ${SOP[f.botop || "F"].toLowerCase()} bottom ${(f.botfill || "Glass") === "Glass" ? "glass" : (f.botfill || "").toLowerCase()} panel ${f.bot} high`
          : ""),
    );
  };
  const mulPos = (o, fi) => {
    const f = o.frames[fi],
      fw = frameWs(o)[fi],
      cw = colWs(fw, f.cols);
    let a = 0;
    return cw.slice(0, -1).map((w) => Math.round((a += w)));
  };
  function lines(o) {
    const s = sizes(o),
      bay = s.fws.length > 1,
      door = o.kind === "door";
    const anyW = o.frames.some((f) => f.cols.some((c) => +c.w)),
      panes = o.frames.reduce((n, f) => n + f.cols.length, 0),
      tls = o.frames
        .flatMap((f) => f.cols)
        .filter((c) => +c.tl)
        .map((c) => c.tl);
    const fur = door
      ? [
          o.slab && "Slab: " + o.slab,
          o.gdes && "Glass design: " + o.gdes,
          o.thr && o.thr !== "N/A" && o.thr !== "Standard threshold" && o.thr,
          o.lp !== "None" && o.lp,
          o.nums !== "None" &&
            o.nums +
              (o.num ? ` "${o.num}"` : " (number not given)") +
              (o.nstyle && o.nstyle !== "Standard numerals" ? ", " + o.nstyle.toLowerCase() : ""),
          o.knock !== "None" && o.knock,
          o.spy !== "None" && o.spy,
          o.chain !== "None" && o.chain,
          o.pull !== "None" && "Outside: " + o.pull,
        ].filter(Boolean)
      : [];
    return {
      gl: {
        big: o.gt,
        l: [
          obsOn(o) && ["Obscure: " + o.gwhere.toLowerCase(), 1],
          [o.spec, o.spec !== "Annealed"],
          [o.gu + " · " + o.gas],
          [o.spacer],
        ].filter(Boolean),
      },
      cill: {
        big: cillName(o),
        l: hasCill(o)
          ? [
              [o.drain],
              ["Cill height " + cillHt(o) + "mm"],
              /pressing|Custom/i.test(o.cill) &&
                +o.cillD && ["Projection / depth " + o.cillD + "mm", 1],
              /pressing/i.test(o.cill) && ["3mm aluminium pressing", 1],
              cillInc(o) ? ["Size includes cill"] : ["Size EXCLUDES cill – cill supplied extra", 1],
            ].filter(Boolean)
          : [],
      },
      frame: {
        l: [
          o.bead && o.bead !== "N/A" && [o.bead, /Ovolo|Sculpt/.test(o.bead)],
          [o.outer, o.outer !== "Standard outer"],
          [o.reinf, o.reinf !== "Reinforcing where required"],
          bay && [`${s.fws.length} frames coupled: ${s.fws.join(" / ")}`, 1],
          bay && [
            "Angles " +
              o.frames
                .slice(0, -1)
                .map((f) => f.ang + "°")
                .join(" / "),
            1,
          ],
          tls.length && ["Transom drop from top " + [...new Set(tls)].join(" / "), 1],
          ...o.frames.flatMap((f, fi) =>
            [
              +f.top && [
                (bay ? `F${fi + 1} ` : "") + "Full-width transom " + f.top + " from top",
                1,
              ],
              +f.bot && [
                (bay ? `F${fi + 1} ` : "") +
                  "Bottom rail " +
                  (frameH(o) - f.bot) +
                  " from top (" +
                  f.bot +
                  " from bottom)",
                1,
              ],
              f.cols.some((c) => +c.w) &&
                f.cols.length > 1 && [
                  (bay ? `F${fi + 1} ` : "") + "Mullions from left: " + mulPos(o, fi).join(", "),
                  1,
                ],
            ].filter(Boolean),
          ),
          panes > 1 && [anyW ? "Pane widths as listed" : "Mullion width equal", anyW],
        ].filter(Boolean),
      },
      hw: {
        t: "Hardware" + (door ? " & furniture" : ""),
        l: [
          handTxt(o) && [handTxt(o), 1],
          [o.hw + " " + o.lock],
          o.hinge !== "N/A" && [o.hinge, /Egress|Restrictor/.test(o.hinge)],
          o.swing !== "N/A" && [o.swing, o.swing === "Opens out"],
          o.vents !== "None" && ["Trickle vent: " + o.vents, 1],
          ...fur.map((x) => [x, 1]),
          ...o.ex.map((x) => [x]),
        ].filter(Boolean),
      },
      gar:
        o.kind === "garage"
          ? [
              o.gmake !== "Not specified" && [o.gmake, 1],
              [o.gstyle + " · " + o.gfin],
              [o.ggear, /Electric/.test(o.ggear)],
              /Electric/.test(o.ggear) && o.gmotor !== "None (manual)" && [o.gmotor, 1],
              [o.gfix],
              (o.ghead || o.gsl || o.gsr) && [
                `Headroom ${o.ghead || "?"} · side room L ${o.gsl || "?"} / R ${o.gsr || "?"}`,
                1,
              ],
              [
                "Electrics: " +
                  o.gelec +
                  (o.gby && o.gby !== "Not decided" ? " (" + o.gby + ")" : ""),
                !/Not needed/.test(o.gelec),
              ],
              o.gnote && [o.gnote],
            ].filter(Boolean)
          : [],
      tim: isTim(o)
        ? [
            [o.tspec || TIM.tspec[0], 1],
            [o.tstyle || ""],
            o.tmould && [o.tmould + " mouldings"],
            [o.tfin || TIM.tfin[0], 1],
            [o.tglz || TIM.tglz[0]],
            o.tgm && [o.tgm],
            o.tbars && o.tbars !== "No glazing bars" && [o.tbars, 1],
            o.tcill && o.kind !== "door" && [o.tcill],
            o.tiron && [o.tiron + (o.tifin ? " – " + o.tifin.toLowerCase() : ""), 1],
            o.tweath && o.tweath !== "None" && [o.tweath],
            o.tcons && !/^Not listed|^Not checked/.test(o.tcons) && [o.tcons, 1],
          ].filter((x) => x && x[0])
        : [],
      add: (o.addons || []).map(
        (a) =>
          a.t +
          (a.pos !== "—" ? ` (${a.pos.toLowerCase()}${+a.mm ? ", " + a.mm + "mm" : ""})` : ""),
      ),
    };
  }

  /* ---- records ---- */
  const recs = () =>
    (S.winSurveys || []).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  function sample() {
    const items = [];
    const mk = (kind, name) => {
      const o = blank(kind);
      applyPreset(
        o,
        kind,
        PRE[kind].findIndex((p) => p[0] === name),
      );
      o.ref = PFX[kind] + (items.filter((i) => i.kind === kind).length + 1);
      items.push(o);
    };
    mk("window", "Top light + side hung");
    return items;
  }
  async function persist(r) {
    r.updated = Date.now();
    const d = JSON.parse(JSON.stringify(r));
    delete d.id;
    await S.db.doc("todos/" + r.id).set(d);
    const L = (S.winSurveys || []).filter((x) => x.id !== r.id);
    L.push(Object.assign({}, d, { id: r.id }));
    S.winSurveys = L;
  }

  /* ---- editor ---- */
  let R = null,
    cur = 0,
    items = [],
    opts = {},
    saveT = null,
    thumbCache = {};
  const fillSel = (id, arr, val) => {
    const s = g(id);
    const a = arr.includes(val) || val == null ? arr : [...arr, val];
    s.innerHTML = a
      .map((v) => `<option${v === val ? " selected" : ""}>${esc(v)}</option>`)
      .join("");
  };
  const nextRef = (kind, self) => {
    const p = PFX[kind];
    let n = 1;
    while (items.some((i) => i !== self && i.ref === p + n)) n++;
    return p + n;
  };
  const opOpts = (kind, sel) => {
    const ks = OPK[kind].split(" ");
    if (!ks.includes(sel)) ks.push(sel);
    return ks
      .map((k) => `<option value="${k}"${k === sel ? " selected" : ""}>${OPS[k]}</option>`)
      .join("");
  };
  function dirty() {
    g("sv").textContent = "Saving…";
    clearTimeout(saveT);
    saveT = setTimeout(save, 900);
  }
  async function save() {
    clearTimeout(saveT);
    saveT = null;
    if (!R) return;
    readJob();
    R.items = items;
    try {
      await persist(R);
      if (g("sv")) g("sv").textContent = "Saved";
    } catch (e) {
      if (g("sv")) g("sv").textContent = "Not saved – check your connection";
    }
  }
  function readJob() {
    R.job = {
      client: g("j-client").value.trim(),
      addr: g("j-addr").value.trim(),
      by: g("j-by").value.trim(),
      date: g("j-date").value,
      supplier: g("j-sup").value.trim(),
      ref: g("j-ref").value.trim(),
    };
    R.title = R.job.client || R.job.addr || "Door & window survey";
    g("title").textContent = "🪟 " + R.title;
  }
  function gallery(o) {
    const vh = o.kind === "bay" ? 110 : 92;
    if (!thumbCache[o.kind])
      thumbCache[o.kind] = PRE[o.kind].map((p, i) => {
        const t = blank(o.kind);
        t.gap = 0;
        t.cill = "No cill";
        applyPreset(t, o.kind, i);
        return `<svg viewBox="0 0 120 ${vh}" aria-hidden="true">${draw(t, 120, vh, 6, CV, { dims: false })}</svg>`;
      });
    const mine = myDesigns(o.kind);
    g("gallery").innerHTML =
      `<button type="button" class="wsgb wsdraw" data-draw="1"><span style="font-size:26px">✏️</span>Draw it myself</button>` +
      mine
        .map((d) => {
          const t = blank(o.kind);
          t.gap = 0;
          t.cill = "No cill";
          applyCustom(t, d);
          return `<button type="button" class="wsgb" data-c="${d.id}" aria-pressed="${o.pk === "custom:" + d.id}"><svg viewBox="0 0 120 ${vh}" aria-hidden="true">${draw(t, 120, vh, 6, CV, { dims: false })}</svg>${esc(d.name)}<small style="color:var(--muted)">yours</small></button>`;
        })
        .join("") +
      PRE[o.kind]
        .map(
          (p, i) =>
            `<button type="button" class="wsgb" data-i="${i}" aria-pressed="${o.pk === o.kind + ":" + i}">${thumbCache[o.kind][i]}${esc(p[0])}</button>`,
        )
        .join("");
    g("d-name").textContent = usingSketch(o)
      ? "Your drawing"
      : o.name + (o.pk ? "" : " (adjusted)");
    g("gal").querySelector(".wschev").textContent = PRE[o.kind].length + " designs ▾";
  }
  function dzRender() {
    const o = items[cur],
      multi = o.kind === "bay" || o.frames.length > 1;
    let h = "";
    o.frames.forEach((f, fi) => {
      if (multi)
        h += `<div class="wsfhd"><span class="wspn">F${fi + 1}</span><label class="wf">Frame width (mm)<input class="mm" data-f="${fi}" data-k="w" value="${f.w}" inputmode="numeric"></label>${fi < o.frames.length - 1 ? `<label class="wf">Angle to next frame<select data-f="${fi}" data-k="ang">${(ANG.includes(+f.ang) ? ANG : [...ANG, +f.ang]).map((a) => `<option value="${a}"${a == f.ang ? " selected" : ""}>${a}°${ANGN[a] ? " – " + ANGN[a] : ""}</option>`).join("")}</select></label>` : ""}${o.frames.length > 1 ? `<button type="button" class="btn wssm" data-act="delf" data-f="${fi}">✕ Frame</button>` : ""}</div>`;
      {
        const fa = `data-f="${fi}"`,
          fh = frameH(o),
          bf = f.botFrom || "top",
          mf = f.mulFrom || "left",
          mp = mulPos(o, fi);
        h += `<div class="wsfhd"><span class="wslbl" style="flex:1 1 100%">Centre rails${multi ? " · frame " + (fi + 1) : ""} (measure from the top, bottom or sides)</span>
      ${f.cols.some((c) => +c.tl > 0) ? `<label class="wf">Top light drop from top (mm)<input class="mm" ${fa} data-k="tlall" value="${f.cols.find((c) => +c.tl > 0).tl}" inputmode="numeric"></label>` : ""}
      <label class="wf">Full-width top light: drop from top (0 = none)<input class="mm" ${fa} data-k="top" value="${+f.top || 0}" inputmode="numeric"></label>
      ${+f.top > 0 ? `<label class="wf">Top light<select ${fa} data-k="topop">${opOpts(o.kind, f.topop || "F")}</select></label>` : ""}
      <label class="wf">Bottom panel rail (0 = none)<input class="mm" ${fa} data-k="botv" value="${+f.bot ? (bf === "top" ? fh - f.bot : f.bot) : 0}" inputmode="numeric"></label>
      <label class="wf">Rail measured from<select ${fa} data-k="botFrom"><option value="top"${bf === "top" ? " selected" : ""}>the top</option><option value="bottom"${bf === "bottom" ? " selected" : ""}>the bottom</option></select></label>
      ${+f.bot > 0 ? `<label class="wf">Bottom panel<select ${fa} data-k="botop">${opOpts(o.kind, f.botop || "F")}</select></label><label class="wf">Panel fill<select ${fa} data-k="botfill">${FILLS.map((x) => `<option${x === (f.botfill || "Glass") ? " selected" : ""}>${x}</option>`).join("")}</select></label>` : ""}
      ${f.cols.length > 1 ? `<label class="wf" style="flex-basis:200px">Mullion positions (mm, comma between)<input class="mm" ${fa} data-k="mulv" placeholder="${(mf === "right" ? mp.map((p) => frameWs(o)[fi] - p).reverse() : mp).join(", ")}" inputmode="decimal"></label><label class="wf">Measured from<select ${fa} data-k="mulFrom"><option value="left"${mf === "left" ? " selected" : ""}>the left</option><option value="right"${mf === "right" ? " selected" : ""}>the right</option></select></label>` : ""}</div>`;
      }
    });
    if (o.kind === "bay")
      h += `<div class="wsfoot"><button type="button" class="btn wssm" data-act="addf">+ Frame</button><span class="who">Frame widths are the made sizes. Angles are the inside angle between frames.</span></div>`;
    g("dz").innerHTML = h;
  }
  /* the four boxes by the measurements: each shows that side's add-ons in total. Typing in one sets the plain
     add-on for that side (marked q) so the total is what was typed; other add-ons on that side stay as they are. */
  const AO_SIDE = {
    h: ["Add-on – top", "Head"],
    l: ["Add-on – left side", "Left"],
    r: ["Add-on – right side", "Right"],
    b: ["Add-on – bottom", "Bottom"],
  };
  function aoFill() {
    const o = items[cur];
    if (!o || !g("ao-h")) return;
    const A = addMm(o);
    ["h", "l", "r", "b"].forEach((k) => {
      const el = g("ao-" + k);
      if (el !== document.activeElement) el.value = A[k] ? A[k] : "";
    });
  }
  function aoSet(k, total) {
    const o = items[cur];
    o.addons = o.addons || [];
    let q = o.addons.find((a) => a.q === k);
    const mine = q ? +q.mm || 0 : 0,
      other = Math.max(0, addMm(o)[k] - mine),
      want = Math.max(0, total - other);
    if (!want) {
      if (q) o.addons.splice(o.addons.indexOf(q), 1);
      return;
    }
    if (!q) {
      q = { t: AO_SIDE[k][0], mm: 0, pos: AO_SIDE[k][1], q: k };
      o.addons.push(q);
    }
    q.mm = want;
  }
  function azRender() {
    const o = items[cur];
    aoFill();
    g("az").innerHTML =
      o.addons
        .map(
          (a, i) =>
            `<div class="wsprow"><label class="wf" style="flex-basis:180px">Add-on<select data-i="${i}" data-k="t">${ADD.map((x) => `<option${x[0] === a.t ? " selected" : ""}>${x[0]}</option>`).join("")}</select></label><label class="wf">Where<select data-i="${i}" data-k="pos">${POS.map((x) => `<option${x === a.pos ? " selected" : ""}>${x}</option>`).join("")}</select></label><label class="wf">Size (mm)<input class="mm" data-i="${i}" data-k="mm" value="${+a.mm || ""}" inputmode="numeric"></label><button type="button" class="btn wssm" data-act="dela" data-i="${i}" aria-label="Remove add-on">✕</button></div>`,
        )
        .join("") +
      `<div class="wsfoot"><button type="button" class="btn wssm" data-act="adda">+ Add-on / extra piece</button><span class="who">Sizes on the head, sides or cill are added to the overall size.</span></div>`;
  }
  function handRender() {
    const o = items[cur];
    const opens = o.frames.some((f) => f.cols.some((c) => MIR[c.op] || MIR[c.tlop]));
    const L = leaves(o);
    const door = o.kind === "door" || L.length > 0;
    if (!opens && !door) {
      g("hand").innerHTML = "";
      return;
    }
    const sg = (k, vals, cur2) =>
      `<span class="wsseg">${vals.map((v) => `<button type="button" data-h="${k}" data-v="${v}" aria-pressed="${v === cur2}">${v}</button>`).join("")}</span>`;
    g("hand").innerHTML =
      `<div class="wsht"><b>Handing</b> · viewed from outside${handTxt(o) ? " · " + esc(handTxt(o).replace(" (viewed from outside)", "")) : ""}${door && o.swing !== "N/A" ? " · " + esc(o.swing.toLowerCase()) : ""}</div>
   ${L.length === 1 ? sg("hinge", ["Hinges left", "Hinges right"], L[0].op === "DL" ? "Hinges left" : "Hinges right") : ""}
   ${L.length === 2 ? sg("master", ["Left", "Right"], o.master || "Right").replace('<span class="wsseg">', '<span class="wsseg"><span class="who" style="align-self:center">Master leaf</span>') : ""}
   ${door ? sg("swing", ["Opens in", "Opens out"], o.swing) : ""}
   ${opens ? `<button type="button" class="btn wssm" data-h="flip">⇄ Mirror the whole design</button>` : ""}`;
  }
  const panFills = (o) =>
    o.frames
      .flatMap((f) => f.cols.map((c) => c.fill).concat(+f.bot ? [f.botfill || "Glass"] : []))
      .filter((x) => /panel/i.test(x || ""));
  function vis() {
    const o = items[cur];
    {
      const gf = o.frames
        .flatMap((f) => f.cols.map((c) => c.fill))
        .find((x) => x === "Georgian bars" || /^Bars:/.test(x || ""));
      g("g-bars").value = gf || "Glass";
    }
    {
      const pf = panFills(o);
      g("g-panel-l").hidden = !pf.length;
      if (pf.length)
        g("g-panel").value = /ribbed/i.test(pf[0])
          ? "Ribbed"
          : /flat/i.test(pf[0])
            ? "Flat"
            : "Raised";
    }
    const hc = hasCill(o);
    g("m-cillh-l").hidden = g("m-cillinc-l").hidden = !hc;
    g("m-cilld-l").hidden = !(hc && /pressing|Custom|stone/i.test(o.cill));
    g("g-where-l").hidden = !obsOn(o);
    g("dfur").hidden = g("dfur-l").hidden = o.kind !== "door";
    const gar = o.kind === "garage";
    g("gar").hidden = g("gar-l").hidden = g("gar2").hidden = !gar;
    g("fb").hidden = g("fb-l").hidden = gar;
    g("tim").hidden = g("tim-l").hidden = !isTim(o);
    {
      const el = g("g-ggear").value || "";
      const m = g("g-gmotor");
      if (m) m.closest("label").hidden = !gar || !/Electric/.test(el);
    }
  }
  function load(i) {
    const o = items[i];
    cur = i;
    g("ed-title").textContent = o.ref;
    g("o-ref").value = o.ref;
    g("kind")
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === o.kind)));
    g("o-loc").value = o.loc;
    fillSel("o-mat", MATS[o.kind], o.mat);
    g("f-qty").value = o.qty;
    g("sw-l").textContent =
      o.kind === "bay" ? "Overall width (for reference)" : "Structural opening width";
    g("m-sw").value = o.sw;
    g("m-sh").value = o.sh;
    g("m-gap").value = o.gap;
    g("m-rev").value = o.rev;
    fillSel("m-cill", CILLS, o.cill);
    g("m-cillh").value = cillHt(o);
    g("m-cilld").value = +o.cillD || "";
    g("m-cillinc").value = cillInc(o) ? "yes" : "no";
    g("g-unit").value = o.gu;
    fillSel("g-type", GLASS, o.gt);
    fillSel("g-where", GWHERE, o.gwhere);
    fillSel("c-out", COLS, o.out);
    fillSel("c-in", COLS, o.in);
    g("c-hw").value = o.hw;
    fillSel("c-lock", LOCKS[o.kind], o.lock);
    FIDS.forEach((k) =>
      fillSel(
        "f-" + k,
        k === "sys" ? sysFor(o) : MFGL[k],
        o[k] ||
          (k === "sys"
            ? "Not specified"
            : k === "thr"
              ? "N/A"
              : k === "bead"
                ? !/uPVC/.test(o.mat)
                  ? "N/A"
                  : /Ovolo|sculpt/i.test(o.prof)
                    ? "Ovolo bead"
                    : "Chamfered bead"
                : MFGL[k][0]),
      ),
    );
    {
      const bl = g("f-bead").closest("label");
      if (bl) bl.hidden = !/uPVC/.test(o.mat);
    }
    DIDS.forEach((k) => fillSel("d-" + k, DFL[k], o[k]));
    TIDS.forEach((k) => {
      const L = timList(o, k);
      fillSel("t-" + k, L, L.includes(o[k]) ? o[k] : L[0]);
    });
    g("d-num").value = o.num || "";
    g("d-slab").value = o.slab || "";
    g("d-gdes").value = o.gdes || "";
    {
      const lf = o.frames.flatMap((f) => f.cols).find((c) => /^D[LR]$/.test(c.op));
      const cur0 = lf && /^Door:/.test(lf.fill) ? lf.fill : "";
      g("d-des").innerHTML = [
        ["", "As the design picked above"],
        ...DOORD.map((x) => [x, x.replace(/^Door: /, "")]),
      ]
        .map(
          ([v, l]) =>
            `<option value="${esc(v)}"${v === cur0 ? " selected" : ""}>${esc(l)}</option>`,
        )
        .join("");
    }
    GIDS.forEach((k) => fillSel("g-" + k, GAR[GKEY[k]], o[k] || GAR[GKEY[k]][0]));
    g("g-ghead").value = o.ghead || "";
    g("g-gsl").value = o.gsl || "";
    g("g-gsr").value = o.gsr || "";
    g("g-gnote").value = o.gnote || "";
    if (o.kind === "garage") {
      fillSel(
        "c-out",
        GAR.cols,
        GAR.cols.includes(o.out) ? o.out : o.out === "White" ? "Traffic white (RAL 9016)" : o.out,
      );
      fillSel(
        "c-in",
        ["Grey white inside (RAL 9002)", "Same as outside", "White"],
        ["Grey white inside (RAL 9002)", "Same as outside", "White"].includes(o.in)
          ? o.in
          : "Grey white inside (RAL 9002)",
      );
    }
    g("extras").innerHTML = EXTRAS[o.kind]
      .map(
        (x) =>
          `<label class="wschip"><input type="checkbox" value="${esc(x)}"${o.ex.includes(x) ? " checked" : ""}>${esc(x)}</label>`,
      )
      .join("");
    g("o-notes").value = o.notes;
    gallery(o);
    dzRender();
    azRender();
    vis();
    handRender();
    sketch();
    phRender();
    list();
  }
  function brochDlg() {
    const o = items[cur];
    read();
    const mine = brochKeys(o);
    const saved = (k) => (S.brochures || []).filter((b) => b.maker === k);
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "120";
    const ALL = makersAll();
    const sec = (k, open) => {
      const B = ALL[k] || { m: k, l: [] };
      const sv = saved(k);
      return `<details class="pmdet" ${open ? "open" : ""}><summary><b>${esc(B.m)}</b>${sv.length ? ` <span class="tag ok">${sv.length} saved</span>` : ""}</summary>
    ${sv.map((b) => `<div class="dwsrow"><span>📄 ${esc(b.title)}</span><span style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="pillbtn br-open" data-id="${esc(b.id)}">Open</button><button type="button" class="pillbtn br-cut" data-id="${esc(b.id)}">✂️ Cut a design → ${esc(o.ref)}</button><button type="button" class="pillbtn br-del" data-id="${esc(b.id)}" aria-label="Delete">✕</button></span></div>`).join("")}
    ${B.l.map(([t, u]) => `<div class="dwsrow"><a href="${esc(u)}" target="_blank" rel="noopener">🌐 ${esc(t)}</a></div>`).join("")}
    <label class="pillbtn" style="position:relative;overflow:hidden;display:inline-block;margin:6px 0">+ Save a brochure PDF for ${esc(B.m)}<input type="file" class="br-up" data-k="${k}" accept="application/pdf,image/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></details>`;
    };
    const draw = () => {
      d.innerHTML = `<div class="dimbox" style="width:min(640px,100%);max-height:90vh;overflow:auto"><b>📖 Brochures${mine.length ? " for " + esc(o.ref) : ""}</b>
    <div class="who">The makers' own brochures and design pages open in a new tab. Download a brochure there, then <b>save it here</b> – it's kept in the app for next time, and you can open it or ✂️ cut a design out of it straight onto this opening's photos.</div>
    ${mine.length ? mine.map((k) => sec(k, true)).join("") : `<div class="who">Choose the system / range${o.kind === "garage" ? " or the garage door make" : ""} first, or pick a maker below.</div>`}
    <details class="pmdet"><summary>All makers</summary>${Object.keys(ALL)
      .filter((k) => !mine.includes(k))
      .sort((a, b) => ALL[a].m.localeCompare(ALL[b].m))
      .map((k) => sec(k, false))
      .join("")}</details>
    <div class="dimbtns"><button type="button" class="btn br-x">Close</button></div></div>`;
      d.querySelector(".br-x").onclick = () => d.remove();
      d.querySelectorAll(".br-up").forEach(
        (inp) =>
          (inp.onchange = async () => {
            const k = inp.dataset.k;
            const fs = [...inp.files];
            inp.value = "";
            if (!fs.length) return;
            if (!S.assets) {
              toast(uploadErr({ code: "not_granted" }));
              return;
            }
            toast("Saving…");
            for (const f of fs) {
              try {
                const a = await uploadFile(f, f.name);
                const id = "br-" + newId();
                const rec = {
                  kind: "brochure",
                  maker: k,
                  title: f.name.replace(/\.[^.]+$/, "").slice(0, 80),
                  assetId: a.id,
                  contentType: f.type || "application/pdf",
                  fileName: f.name,
                  at: Date.now(),
                };
                await S.db.doc("todos/" + id).set(rec);
                S.brochures = (S.brochures || []).concat([Object.assign({ id }, rec)]);
              } catch (e) {
                toast(uploadErr(e));
              }
            }
            toast("Brochure saved");
            draw();
          }),
      );
      const find = (id) => (S.brochures || []).find((x) => x.id === id);
      d.querySelectorAll(".br-open").forEach(
        (b) =>
          (b.onclick = () => {
            const x = find(b.dataset.id);
            if (!x) return;
            $("fileview").style.zIndex = "125";
            openFile(x.assetId, x.fileName || x.title, x.contentType);
          }),
      );
      d.querySelectorAll(".br-cut").forEach(
        (b) =>
          (b.onclick = async () => {
            const x = find(b.dataset.id);
            if (!x) return;
            b.disabled = true;
            toast("Opening…");
            try {
              const bl = await getFileBlob(x.assetId);
              CUT.startBlob(bl, x.title, x.contentType, (c) => {
                const oo = items[cur];
                (oo.photos = oo.photos || []).push(c.assetId);
                phRender();
                list();
                dirty();
                toast("Added to " + oo.ref + "'s photos");
              });
            } catch (e) {
              toast("Couldn't open it. Check your connection.");
            }
            b.disabled = false;
          }),
      );
      d.querySelectorAll(".br-del").forEach(
        (b) =>
          (b.onclick = async () => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Delete?";
              return;
            }
            try {
              await S.db.doc("todos/" + b.dataset.id).delete();
              S.brochures = (S.brochures || []).filter((x) => x.id !== b.dataset.id);
              draw();
            } catch (e) {
              toast("Couldn't delete");
            }
          }),
      );
    };
    document.body.appendChild(d);
    draw();
  }
  function phRender() {
    const o = items[cur];
    g("ph").innerHTML = (o.photos || [])
      .map(
        (id, i) =>
          `<button type="button" data-ph="${i}" aria-label="Photo ${i + 1}"><img src="${blobUrl(id)}" alt=""></button>`,
      )
      .join("");
    g("ph")
      .querySelectorAll("[data-ph]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const i = +b.dataset.ph;
            const id = o.photos[i];
            const d = document.createElement("div");
            d.className = "dimask";
            d.style.zIndex = "125";
            d.innerHTML = `<div class="dimbox" style="max-width:min(96vw,900px)"><b>${esc(o.ref)} · photo ${i + 1} of ${o.photos.length}</b><img src="${blobUrl(id)}" alt="" style="max-height:70vh;width:auto;max-width:100%;display:block;margin:8px auto;border-radius:8px;background:#000"><div class="dimbtns"><button type="button" class="btn delbtn ph-del">🗑 Delete</button><button type="button" class="btn primary ph-x">Close</button></div></div>`;
            document.body.appendChild(d);
            d.querySelector(".ph-x").onclick = () => d.remove();
            d.onclick = (e) => {
              if (e.target === d) d.remove();
            };
            d.querySelector(".ph-del").onclick = () => {
              d.remove();
              binFromViewer(
                {
                  assets: [id],
                  title: o.ref + " photo " + (i + 1),
                  sub: "Door & window survey · " + (R.title || ""),
                  type: "image/jpeg",
                  thumb: id,
                },
                () => {
                  o.photos = o.photos.filter((x) => x !== id);
                  phRender();
                  list();
                  dirty();
                },
              );
            };
          }),
      );
  }
  async function phAdd(files) {
    const o = items[cur];
    if (!files || !files.length) return;
    if (!S.assets) {
      toast("Photos need the app opened in claude.ai");
      return;
    }
    let n = 0;
    toast("Adding photo" + (files.length > 1 ? "s" : "") + "…");
    for (const f of files) {
      try {
        const b = await shrinkImage(f, 1600);
        const a = await uploadFile(b, "opening.jpg");
        (o.photos = o.photos || []).push(a.id);
        n++;
      } catch (e) {}
    }
    if (n) {
      phRender();
      list();
      dirty();
      toast(n + " photo" + (n === 1 ? "" : "s") + " added to " + o.ref);
    } else toast("Couldn't add the photo");
  }
  function read() {
    const o = items[cur];
    if (!o) return;
    o.loc = g("o-loc").value;
    o.mat = g("o-mat").value;
    o.qty = Math.max(1, +g("f-qty").value || 1);
    o.sw = +g("m-sw").value || 0;
    o.sh = +g("m-sh").value || 0;
    o.gap = +g("m-gap").value;
    o.rev = +g("m-rev").value || 0;
    o.cill = g("m-cill").value;
    o.cillH = g("m-cillh").value === "" ? 30 : Math.max(0, +g("m-cillh").value || 0);
    o.cillD = +g("m-cilld").value || 0;
    o.cillInc = g("m-cillinc").value !== "no";
    o.gu = g("g-unit").value;
    o.gt = g("g-type").value;
    o.gwhere = g("g-where").value;
    o.out = g("c-out").value;
    o.in = g("c-in").value;
    o.hw = g("c-hw").value;
    o.lock = g("c-lock").value;
    FIDS.forEach((k) => (o[k] = g("f-" + k).value));
    DIDS.forEach((k) => (o[k] = g("d-" + k).value));
    if (isTim(o)) TIDS.forEach((k) => (o[k] = g("t-" + k).value));
    o.num = g("d-num").value;
    o.slab = g("d-slab").value.trim();
    o.gdes = g("d-gdes").value.trim();
    GIDS.forEach((k) => (o[k] = g("g-" + k).value));
    o.ghead = +g("g-ghead").value || 0;
    o.gsl = +g("g-gsl").value || 0;
    o.gsr = +g("g-gsr").value || 0;
    o.gnote = g("g-gnote").value.trim();
    o.ex = [...g("extras").querySelectorAll("input:checked")].map((c) => c.value);
    o.notes = g("o-notes").value;
  }
  function sketch() {
    const o = items[cur],
      s = sizes(o),
      bay = s.fws.length > 1,
      VH = bay ? 400 : 330;
    g("sk").setAttribute("viewBox", `0 0 400 ${VH}`);
    g("sk").innerHTML = usingSketch(o) ? skImg(o, 400, VH) : draw(o, 400, VH, 16, CV);
    g("calc").innerHTML =
      `Order size <b>${s.W} × ${s.H} mm</b>${hasCill(o) ? `<br>${cillInc(o) ? "Includes" : "Excludes"} ${cillHt(o)}mm cill` : ""}${bay ? `<br>Frames ${s.fws.join(" + ")}` : ""}${s.A.any ? `<br>With add-ons <b>${s.OW} × ${s.OH}</b>` : ""}${handTxt(o) ? `<br>${esc(handTxt(o).replace(" (viewed from outside)", ""))}${o.swing !== "N/A" ? ", " + esc(o.swing.toLowerCase()) : ""}` : ""}<br>${bay ? "" : `Opening ${o.sw} × ${o.sh} · gap ${o.gap} · `}viewed from outside${limitsTxt(
        o,
      )
        .map((w) => `<br><span style="color:var(--wsdim)">⚠ ${esc(w)}</span>`)
        .join("")}`;
  }
  function list() {
    g("count").textContent = items.length + " opening" + (items.length === 1 ? "" : "s");
    g("list").innerHTML = items
      .map((o, i) => {
        const s = sizes(o),
          vh = s.fws.length > 1 ? 110 : 92;
        return `<button type="button" class="wsitem" data-i="${i}" aria-current="${i === cur}"><span class="r">${o.ref}</span><svg viewBox="0 0 120 ${vh}" aria-hidden="true">${usingSketch(o) ? skImg(o, 120, vh) : draw(o, 120, vh, 6, CV, { dims: false })}</svg><span><b>${esc(o.name)}</b><small>${esc(o.loc || "–")} · ${esc(o.mat)} · ${esc(o.out)}${(o.photos || []).length ? " · 📷 " + o.photos.length : ""}</small></span><span class="z">${o.qty > 1 ? o.qty + " × " : ""}${s.W} × ${s.H}</span></button>`;
      })
      .join("");
  }
  const refresh = () => {
    handRender();
    sketch();
    list();
    dirty();
  };
  const onKey = (e) => {
    if (
      e.key === "Escape" &&
      document.getElementById("wsx-root") &&
      !document.querySelector(".dimask")
    ) {
      e.preventDefault();
      close();
    }
  };
  function close() {
    document.removeEventListener("keydown", onKey, true);
    if (saveT) save();
    const el = document.getElementById("wsx-root");
    if (el) el.remove();
    document.body.style.overflow = "";
    const o = opts;
    R = null;
    if (o.back) o.back();
    else if (o.client) {
      const c = (S.clients || []).find((x) => x.id === o.client.id) || o.client;
      viewClient(c);
    } else if (o.back) o.back();
    else render();
  }
  const sel = (id, lab, full) =>
    `<label class="wf"${full ? ' style="grid-column:1/-1"' : ""}>${lab}<select id="wsx-${id}"></select></label>`;
  function open(rec, o) {
    if (!ownerMode()) {
      toast("Only the owner can do surveys");
      return;
    }
    opts = o || {};
    const c = opts.client;
    const today = iso(new Date());
    R = rec
      ? JSON.parse(JSON.stringify(rec))
      : {
          id: newId(),
          kind: "winsurvey",
          created: Date.now(),
          clientId: c ? c.id : "",
          job: {
            client: c ? c.name || "" : "",
            addr: c ? clAddr(c) : "",
            by: coData().owner,
            date: today,
            supplier: "",
            ref: "DW-" + today.replace(/-/g, "").slice(2),
          },
          items: sample(),
        };
    if (rec && rec.clientId && !c) {
      const cc = (S.clients || []).find((x) => x.id === rec.clientId);
      if (cc) opts.client = cc;
    }
    if (!rec && opts.items && opts.items.length) {
      const out = [];
      items = out;
      opts.items.forEach((x) => {
        const kind = x.kind === "window" ? "window" : "door";
        const o = blank(kind);
        const name =
          kind === "window"
            ? x.width < 800
              ? "Side hung, hinge left"
              : x.width < 1500
                ? "Top light + side hung"
                : "3 pane, ends open"
            : { door2: "French doors", bifold: "Bi-fold 3 (3+0)", sdoor: "Sliding patio, 2 pane" }[
                x.k
              ] || "Door, hinge left";
        o.sized = true;
        o.sw = x.width + 2 * o.gap;
        o.sh = kind === "window" ? 1060 : 2120;
        applyPreset(
          o,
          kind,
          Math.max(
            0,
            PRE[kind].findIndex((p) => p[0] === name),
          ),
        );
        o.loc = x.loc || "";
        if (x.rev) o.rev = x.rev;
        o.ref = x.ref || "";
        out.push(o);
      });
      out.forEach((o) => {
        if (!o.ref) o.ref = nextRef(o.kind, o);
      });
      R.items = out;
    }
    items = R.items && R.items.length ? R.items : sample();
    cur = 0;
    const d = document.createElement("div");
    d.className = "wsov";
    d.id = "wsx-root";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-label", "Door and window survey");
    d.innerHTML = `<div class="wsbar"><button type="button" class="btn" id="wsx-close">← Done</button><b id="wsx-title"></b><span class="wssv" id="wsx-sv">Saved</span><button type="button" class="btn" id="wsx-print">🖨 Print</button><button type="button" class="btn" id="wsx-broch">📖 Brochures</button><button type="button" class="btn" id="wsx-send" ${R.lastPdf ? "" : "disabled"}>📤 Send to…</button><button type="button" class="btn primary" id="wsx-pdf">📄 Make the PDF</button></div>
  <div class="wsbody">
   <section class="wspanel"><h2>Job <span class="wslbl">goes on the PDF</span></h2>
    <div class="wsrow"><label class="wf">Choose a client<select id="wsx-j-pick"></select></label><label class="wf">Site<select id="wsx-j-site"></select></label></div>
    <div class="wsrow"><label class="wf">Client<input id="wsx-j-client"></label><label class="wf">Address / deliver to<input id="wsx-j-addr"></label><label class="wf">Surveyed by<input id="wsx-j-by"></label><label class="wf">Date<input id="wsx-j-date" type="date"></label><label class="wf">Supplier<input id="wsx-j-sup" list="wsx-sups" placeholder="Window company"><datalist id="wsx-sups"><option value="Exeter Window Store, 10-11 Apple Lane, Sidmouth Road, Exeter EX2 5GL"></option></datalist></label><label class="wf">Our ref<input id="wsx-j-ref"></label></div>
    <div class="who" id="wsx-j-link"></div></section>
   <div class="wsgrid">
    <section class="wspanel" aria-label="Opening">
     <h2><span id="wsx-ed-title">W1</span><span class="wsseg" id="wsx-kind"><button type="button" data-v="window">Window</button><button type="button" data-v="door">Door</button><button type="button" data-v="bay">Bay &amp; bow</button><button type="button" data-v="garage">Garage</button><button type="button" data-v="roof">Roof</button></span></h2>
     <div class="wsrow"><label class="wf">Number (e.g. W1, D2)<input id="wsx-o-ref" autocapitalize="characters" maxlength="12"></label><label class="wf">Location<input id="wsx-o-loc" placeholder="e.g. Kitchen, rear elevation"></label>${sel("o-mat", "Material")}<label class="wf">Quantity<input class="mm" id="wsx-f-qty" inputmode="numeric"></label></div>
     <details class="wsgal" id="wsx-gal"><summary><span class="wslbl">Design</span><b id="wsx-d-name"></b><span class="wschev"></span></summary><div class="wsgallery" id="wsx-gallery"></div></details>
     <div class="wshand" id="wsx-hand"></div>
     <div class="wsmeasure"><div class="wsrow" style="grid-template-columns:repeat(2,minmax(0,1fr))">
       <label class="wf"><span id="wsx-sw-l">Structural opening width</span><input class="mm" id="wsx-m-sw" inputmode="numeric"></label>
       <label class="wf">Structural opening height<input class="mm" id="wsx-m-sh" inputmode="numeric"></label>
       <label class="wf">Fitting gap each side (mm)<select id="wsx-m-gap"><option>0</option><option>5</option><option>10</option><option>15</option><option>20</option></select></label>
       <label class="wf">Wall / reveal depth<input class="mm" id="wsx-m-rev" inputmode="numeric"></label>${sel("m-cill", "Cill", 1)}<label class="wf" id="wsx-m-cillh-l">Cill height (mm)<input class="mm" id="wsx-m-cillh" inputmode="numeric" placeholder="30"></label><label class="wf" id="wsx-m-cilld-l">Projection / depth (mm)<input class="mm" id="wsx-m-cilld" inputmode="numeric"></label><label class="wf" id="wsx-m-cillinc-l" style="grid-column:1/-1">Order size<select id="wsx-m-cillinc"><option value="yes">Includes the cill</option><option value="no">Excludes the cill (cill extra)</option></select></label><fieldset class="wsao" style="grid-column:1/-1"><legend>Add-ons round the frame (mm, 0 = none)</legend><label class="wf">Top<input class="mm" id="wsx-ao-h" data-side="h" inputmode="numeric" placeholder="0"></label><label class="wf">Left<input class="mm" id="wsx-ao-l" data-side="l" inputmode="numeric" placeholder="0"></label><label class="wf">Right<input class="mm" id="wsx-ao-r" data-side="r" inputmode="numeric" placeholder="0"></label><label class="wf">Bottom<input class="mm" id="wsx-ao-b" data-side="b" inputmode="numeric" placeholder="0"></label><span class="who" style="grid-column:1/-1">Added to the order size and shown on the drawing. To say which profile, change it in Add-ons &amp; extra pieces below.</span></fieldset></div>
      <div class="wssketch"><svg id="wsx-sk" viewBox="0 0 400 330" role="img" aria-label="Elevation sketch, viewed from outside"></svg><div class="wscalc" id="wsx-calc"></div><button type="button" class="btn wssm" id="wsx-draw">✏️ Draw it myself</button><div class="wsph" id="wsx-ph"></div><div class="actions" style="justify-content:center"><label class="btn wssm wsphb">📷 Take a photo<input type="file" accept="image/*" capture="environment" id="wsx-phcam"></label><label class="btn wssm wsphb">🖼 From photos<input type="file" accept="image/*" multiple id="wsx-phpick"></label></div></div></div>
     <div class="wslbl">Rails, mullions &amp; frame sizes</div><div class="wsdz" id="wsx-dz"></div>
     <div class="wslbl">Add-ons &amp; extra pieces</div><div class="wsdz" id="wsx-az"></div>
     <div class="wslbl">Glass</div>
     <div class="wsrow"><label class="wf">Glazing unit<select id="wsx-g-unit"><option>Double glazed 28mm</option><option>Double glazed 24mm</option><option>Heritage slim double glazed 10mm</option><option>Heritage slim double glazed 12mm</option><option>Heritage slim double glazed 14mm</option><option>Heritage slim double glazed 16mm</option><option>Triple glazed 44mm</option><option>Single glazed</option><option>Solid panel</option></select></label>${sel("g-type", "Glass pattern (Pilkington range)")}<label class="wf" id="wsx-g-where-l">Obscure glass in<select id="wsx-g-where"></select></label>${sel("f-spec", "Safety glass")}<label class="wf">Glazing bars<select id="wsx-g-bars"><option value="Glass">None</option><option>Georgian bars</option><option>Bars: 2 over 2</option><option>Bars: 4 over 4</option><option>Bars: 6 over 6</option><option>Bars: 9 over 9</option><option>Bars: 6 over 1</option><option>Bars: 3 over 1</option></select></label><label class="wf" id="wsx-g-panel-l">Panel style<select id="wsx-g-panel"><option>Flat</option><option>Raised</option><option>Ribbed</option></select></label></div>
     <div class="wslbl" id="wsx-dfur-l">Door furniture</div>
     <div class="wsrow" id="wsx-dfur"><label class="wf" style="grid-column:1/-1">Door leaf design (on the drawing)<select id="wsx-d-des"></select></label><label class="wf">Door slab / style<input id="wsx-d-slab" placeholder="e.g. Distinction Ludlow 2, Visage Kingston"></label><label class="wf">Glass design<input id="wsx-d-gdes" placeholder="e.g. Elegance, Abstract, clear"></label>${sel("f-thr", "Threshold")}${sel("d-lp", "Letter plate")}${sel("d-nums", "House number / name")}<label class="wf">The number or name itself<input id="wsx-d-num" placeholder="e.g. 12, 12A or Little Acre"></label>${sel("d-nstyle", "Numeral style / finish")}${sel("d-knock", "Knocker")}${sel("d-spy", "Spy hole")}${sel("d-chain", "Chain / restrictor")}${sel("d-pull", "Outside handle")}</div>
     <div class="wslbl">Colour &amp; hardware</div>
     <div class="wsrow">${sel("c-out", "Outside colour")}${sel("c-in", "Inside colour")}<label class="wf">Hardware colour<select id="wsx-c-hw"><option>White</option><option>Chrome</option><option>Satin chrome</option><option>Black</option><option>Gold</option><option>Graphite</option></select></label>${sel("c-lock", "Handle / lock")}${sel("f-hinge", "Hinges")}${sel("f-swing", "Door opens")}</div>
     <div class="wslbl" id="wsx-gar-l">Garage door <button type="button" class="btn wssm wsx-br" style="margin-left:8px">📖 Brochures</button></div>
     <div class="wsrow" id="wsx-gar">${sel("g-gmake", "Make / range")}${sel("g-gstyle", "Panel / lath style")}${sel("g-gfin", "Finish")}${sel("g-ggear", "Operation")}${sel("g-gmotor", "Operator / motor")}${sel("g-gfix", "How it's fitted")}<label class="wf">Headroom (mm)<input class="mm" id="wsx-g-ghead" inputmode="numeric" placeholder="inside, above opening"></label><label class="wf">Side room left (mm)<input class="mm" id="wsx-g-gsl" inputmode="numeric"></label><label class="wf">Side room right (mm)<input class="mm" id="wsx-g-gsr" inputmode="numeric"></label></div>
     <div class="wsrow" id="wsx-gar2" style="border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg)"><span class="wslbl" style="grid-column:1/-1">⚡ Electric supply for the door</span>${sel("g-gelec", "Power at the motor position")}${sel("g-gby", "Who sorts the electrics")}<label class="wf" style="grid-column:1/-1">Where it runs from / notes<input id="wsx-g-gnote" placeholder="e.g. spur off garage lighting circuit, 13A socket on ceiling by motor"></label></div>
     <div class="wslbl" id="wsx-tim-l">🪵 Wooden window / door</div>
     <div class="wsrow" id="wsx-tim">${sel("t-tspec", "Timber")}${sel("t-tstyle", "Style")}${sel("t-tmould", "Moulding")}${sel("t-tfin", "Finish")}${sel("t-tglz", "Glazing")}${sel("t-tgm", "Glazing method")}${sel("t-tbars", "Glazing bars")}${sel("t-tcill", "Cill")}${sel("t-tiron", "Ironmongery")}${sel("t-tifin", "Ironmongery finish")}${sel("t-tweath", "Weather seals")}${sel("t-tcons", "Listed / conservation")}</div>
     <div class="wslbl" id="wsx-fb-l">Frame &amp; build <button type="button" class="btn wssm wsx-br" style="margin-left:8px">📖 Brochures</button></div>
     <div class="wsrow" id="wsx-fb">${sel("f-sys", "System / range (supplier)")}${sel("f-prof", "Frame profile")}${sel("f-bead", "Glazing bead")}${sel("f-outer", "Frame outer")}${sel("f-reinf", "Reinforcing")}${sel("f-vents", "Trickle vents")}${sel("f-spacer", "Spacer bar")}${sel("f-gas", "Gas fill")}${sel("f-drain", "Drainage")}</div>
     <div class="wslbl">Extras</div><div class="wschips" id="wsx-extras"></div>
     <label class="wf">Notes for the manufacturer / fitter<textarea id="wsx-o-notes" rows="2" placeholder="e.g. Brick slips both sides, lintel looks low"></textarea></label>
     <div class="wsfoot"><button class="btn" type="button" data-new="window">+ Window</button><button class="btn" type="button" data-new="door">+ Door</button><button class="btn" type="button" data-new="bay">+ Bay</button><button class="btn" type="button" id="wsx-dup">⧉ Copy this one</button><button class="btn delbtn" type="button" id="wsx-del">🗑 Remove</button></div>
    </section>
    <section class="wspanel" aria-label="Schedule"><h2>Schedule <span class="wslbl" id="wsx-count"></span></h2><div class="wslist" id="wsx-list"></div>
     <button type="button" class="btn primary" id="wsx-pdf2">📄 Make the PDF</button><div class="who">Make an order request for your window supplier, or a full survey PDF with everything in it.</div></section>
   </div></div>`;
    document.body.appendChild(d);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    const J = R.job || {};
    g("j-client").value = J.client || "";
    g("j-addr").value = J.addr || "";
    g("j-by").value = J.by || "";
    g("j-date").value = J.date || today;
    g("j-sup").value = J.supplier || "";
    g("j-ref").value = J.ref || "";
    readJob();
    /* client and site drop-downs: fill the job details from the address book / the active sites */
    {
      const cls = (S.clients || [])
        .filter((c) => c.stage !== "lost" || c.id === R.clientId)
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      const sites = (S.sites || [])
        .filter((x) => !x.archived || same(x.name, R.site || ""))
        .map((x) => x.name)
        .sort((a, b) => a.localeCompare(b));
      const link = () => {
        const c = (S.clients || []).find((x) => x.id === R.clientId);
        g("j-link").innerHTML = c
          ? `🔗 Linked to <b>${esc(c.name)}</b> – each PDF you make is also saved on their record.`
          : "Not linked to a client – pick one above, or type the details by hand.";
      };
      g("j-pick").innerHTML =
        `<option value="">${cls.length ? "– choose from your clients –" : "No clients yet"}</option>` +
        cls
          .map(
            (c) =>
              `<option value="${esc(c.id)}" ${c.id === R.clientId ? "selected" : ""}>${esc(c.name)}${c.stage === "contact" ? "" : " · " + esc(clStage(c.stage))}</option>`,
          )
          .join("");
      const fillSites = (pref) => {
        g("j-site").innerHTML =
          `<option value="">${sites.length ? "– no site –" : "No active sites"}</option>` +
          sites
            .map((n) => `<option ${same(n, pref || "") ? "selected" : ""}>${esc(n)}</option>`)
            .join("");
      };
      fillSites(R.site || "");
      g("j-pick").onchange = () => {
        const c = cls.find((x) => x.id === g("j-pick").value);
        R.clientId = c ? c.id : "";
        opts.client = c || null;
        if (c) {
          g("j-client").value = c.name || "";
          const cs = clientSites(c).filter((n) => sites.some((x) => same(x, n)));
          const a = clAddr(c);
          if (cs.length && !R.site) {
            R.site = sites.find((x) => same(x, cs[0]));
            fillSites(R.site);
          }
          g("j-addr").value =
            R.site && cs.some((x) => same(x, R.site)) ? a || R.site : a || g("j-addr").value;
        }
        readJob();
        link();
        dirty();
      };
      g("j-site").onchange = () => {
        R.site = g("j-site").value;
        if (R.site) {
          const sc = siteClient(R.site);
          if (sc && !R.clientId) {
            R.clientId = sc.id;
            opts.client = sc;
            g("j-pick").value = sc.id;
            g("j-client").value = sc.name || "";
          }
          if (!g("j-addr").value || !(sc && sc.id === R.clientId))
            g("j-addr").value = sc && clAddr(sc) ? clAddr(sc) : R.site;
        }
        readJob();
        link();
        dirty();
      };
      link();
    }
    wire();
    load(0);
    if (!rec) g("gal").open = true;
    if (!rec) dirty();
  }
  function wire() {
    g("close").onclick = close;
    g("g-bars").addEventListener("change", () => {
      const v = g("g-bars").value,
        o = items[cur];
      o.frames.forEach((f) =>
        f.cols.forEach((c) => {
          if (c.fill === "Glass" || c.fill === "Georgian bars" || /^Bars:/.test(c.fill)) c.fill = v;
        }),
      );
      o.pk = "";
      g("d-name").textContent = o.name + " (adjusted)";
      refresh();
    });
    document
      .getElementById("wsx-root")
      .querySelectorAll(".wsx-br")
      .forEach((b) => (b.onclick = () => brochDlg()));
    g("broch").onclick = () => brochDlg();
    g("d-des").addEventListener("change", () => {
      const v = g("d-des").value,
        o = items[cur];
      if (!v) return;
      o.frames.forEach((f) =>
        f.cols.forEach((c) => {
          if (/^D[LR]$/.test(c.op)) c.fill = v;
        }),
      );
      o.pk = "";
      g("d-name").textContent = o.name + " (adjusted)";
      refresh();
    });
    g("g-panel").addEventListener("change", () => {
      const v = g("g-panel").value.toLowerCase(),
        o = items[cur];
      const fx = (x) =>
        !/panel/i.test(x || "")
          ? x
          : /^Solid/.test(x)
            ? "Solid panel – " + v
            : "Half glazed – " + v + " panel";
      o.frames.forEach((f) => {
        f.cols.forEach((c) => (c.fill = fx(c.fill)));
        if (f.botfill) f.botfill = fx(f.botfill);
      });
      dzRender();
      refresh();
    });
    g("hand").addEventListener("click", (e) => {
      const b = e.target.closest("[data-h]");
      if (!b) return;
      read();
      const o = items[cur],
        h = b.dataset.h,
        v = b.dataset.v;
      if (h === "flip") {
        flip(o);
        o.pk = "";
        g("d-name").textContent = o.name + " (adjusted)";
        dzRender();
      } else if (h === "hinge") {
        const L = leaves(o);
        if (L.length === 1 && (L[0].op === "DL") !== (v === "Hinges left")) {
          L[0].op = MIR[L[0].op];
          dzRender();
        }
      } else if (h === "master") o.master = v;
      else if (h === "swing") {
        o.swing = v;
        fillSel("f-swing", MFGL.swing, v);
      }
      refresh();
    });
    const mk = (e) => {
      read();
      readJob();
      R.items = items;
      pdfAsk(R, e.currentTarget);
    };
    g("pdf").onclick = mk;
    g("pdf2").onclick = mk;
    g("print").onclick = (e) => {
      read();
      readJob();
      R.items = items;
      pdfAsk(R, e.currentTarget, true);
    };
    g("send").onclick = () => {
      if (!R.lastPdf) {
        toast("Make the PDF first");
        return;
      }
      SENDTO.open({
        assetId: R.lastPdf.assetId,
        name: R.lastPdf.name,
        type: "application/pdf",
        title: R.lastPdf.name.replace(/\.pdf$/i, ""),
        clientId: R.clientId,
        folder: "designs",
        cat: "specs",
      });
    };
    ["j-client", "j-addr", "j-by", "j-date", "j-sup", "j-ref"].forEach((id) =>
      g(id).addEventListener("input", () => {
        readJob();
        dirty();
      }),
    );
    g("kind")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (items[cur].kind === b.dataset.v) return;
            read();
            const o = items[cur],
              keep = { loc: o.loc, qty: o.qty, notes: o.notes, out: o.out, in: o.in };
            const n = blank(b.dataset.v);
            Object.assign(n, keep);
            applyPreset(n, b.dataset.v, 0);
            n.ref = nextRef(b.dataset.v, o);
            items[cur] = n;
            load(cur);
            g("gal").open = true;
            dirty();
          }),
      );
    g("gallery").addEventListener("click", (e) => {
      const b = e.target.closest(".wsgb");
      if (!b) return;
      if (b.dataset.draw) {
        drawMine();
        return;
      }
      read();
      const o = items[cur];
      if (b.dataset.c) {
        const d = (S.wsDesigns || []).find((x) => x.id === b.dataset.c);
        if (!d) return;
        applyCustom(o, d);
      } else applyPreset(o, o.kind, +b.dataset.i);
      load(cur);
      g("gal").open = false;
      dirty();
    });
    g("draw").onclick = () => drawMine();
    g("phcam").onchange = (e) => {
      phAdd([...e.target.files]);
      e.target.value = "";
    };
    g("phpick").onchange = (e) => {
      phAdd([...e.target.files]);
      e.target.value = "";
    };
    g("g-ggear").addEventListener("change", () => {
      const o = items[cur];
      read();
      o.ggear = g("g-ggear").value;
      if (!/Electric/.test(o.ggear)) {
        o.gmotor = "None (manual)";
        fillSel("g-gmotor", GAR.motor, o.gmotor);
        if (o.gelec === "Not checked yet") {
          o.gelec = "Not needed – manual door";
          fillSel("g-gelec", GAR.elec, o.gelec);
        }
      } else if (o.gmotor === "None (manual)") {
        o.gmotor = /roller/i.test(o.ggear)
          ? "Roller built-in tube motor with manual override"
          : /Hörmann/.test(o.gmake)
            ? "Hörmann ProMatic"
            : /Garador/.test(o.gmake)
              ? "Garador GaraMatic 9"
              : "Other (see note)";
        fillSel("g-gmotor", GAR.motor, o.gmotor);
        if (o.gelec === "Not needed – manual door") {
          o.gelec = "Not checked yet";
          fillSel("g-gelec", GAR.elec, o.gelec);
        }
      }
      vis();
    });
    g("g-gelec").addEventListener("change", () => {
      items[cur].gelec = g("g-gelec").value;
    });
    g("f-prof").addEventListener("change", () => {
      const o = items[cur];
      const pf = g("f-prof").value;
      if (/Ovolo|sculpt/i.test(pf) && g("f-bead").value === "Chamfered bead")
        g("f-bead").value = "Ovolo bead";
      else if (/chamfered/i.test(pf) && g("f-bead").value === "Ovolo bead")
        g("f-bead").value = "Chamfered bead";
      o.bead = g("f-bead").value;
    });
    g("o-mat").addEventListener("change", () => {
      const o = items[cur];
      o.mat = g("o-mat").value;
      {
        const up = /uPVC/.test(o.mat);
        const bl = g("f-bead").closest("label");
        if (bl) bl.hidden = !up;
        g("f-bead").value = up
          ? /Ovolo|sculpt/i.test(g("f-prof").value)
            ? "Ovolo bead"
            : "Chamfered bead"
          : "N/A";
        o.bead = g("f-bead").value;
      }
      const cs = g("f-sys").value;
      fillSel("f-sys", sysFor(o), sysFor(o).includes(cs) ? cs : "Not specified");
      if (/Alumin/.test(g("o-mat").value) && !/Alumin/.test(o.prof)) {
        o.prof =
          o.kind === "door" ? "Aluminium – standard casement" : "Aluminium – standard casement";
        fillSel("f-prof", MFGL.prof, o.prof);
      }
    });
    g("m-cill").addEventListener("change", () => {
      const v = g("m-cill").value;
      if (/pressing/i.test(v)) {
        g("m-cillinc").value = "no";
        if (!+g("m-cilld").value) g("m-cilld").value = 150;
      }
      if (v === "Stub cill" && !g("m-cillh").value) g("m-cillh").value = 30;
    });
    [
      "o-mat",
      "m-gap",
      "m-cill",
      "m-cillinc",
      "g-unit",
      "g-type",
      "g-where",
      "c-out",
      "c-in",
      "c-hw",
      "c-lock",
      ...FIDS.map((k) => "f-" + k),
      ...DIDS.map((k) => "d-" + k),
      ...TIDS.map((k) => "t-" + k),
    ].forEach((id) =>
      g(id).addEventListener("change", () => {
        read();
        vis();
        refresh();
      }),
    );
    ["o-loc", "f-qty", "m-rev", "o-notes", "d-num", "m-cillh", "m-cilld"].forEach((id) =>
      g(id).addEventListener("input", () => {
        read();
        refresh();
      }),
    );
    ["m-sw", "m-sh"].forEach((id) =>
      g(id).addEventListener("input", () => {
        read();
        items[cur].sized = true;
        refresh();
      }),
    );
    ["h", "l", "r", "b"].forEach((k) => {
      g("ao-" + k).addEventListener("input", (e) => {
        aoSet(k, Math.max(0, +e.target.value || 0));
        azRender();
        refresh();
      });
      g("ao-" + k).addEventListener("blur", aoFill);
    });
    g("extras").addEventListener("change", () => {
      read();
      refresh();
    });
    g("dz").addEventListener("input", (e) => {
      const t = e.target,
        k = t.dataset.k;
      if (!k) return;
      const o = items[cur],
        f = o.frames[+t.dataset.f];
      if (t.dataset.c == null && k === "tlall") {
        const n = +t.value || 0;
        if (n > 0)
          f.cols.forEach((c) => {
            if (+c.tl > 0) c.tl = n;
          });
        o.pk = "";
        g("d-name").textContent = o.name + " (adjusted)";
        refresh();
        return;
      }
      if (
        t.dataset.c == null &&
        ["top", "topop", "botv", "botFrom", "botop", "botfill", "mulv", "mulFrom"].includes(k)
      ) {
        const v = t.value,
          fh = frameH(o),
          was = { t: +f.top > 0, b: +f.bot > 0 };
        if (k === "top") f.top = Math.max(0, +v || 0);
        else if (k === "botv") {
          const n = +v || 0;
          f.bot = n <= 0 ? 0 : Math.max(0, (f.botFrom || "top") === "top" ? fh - n : n);
        } else if (k === "mulv") {
          const fw = frameWs(o)[+t.dataset.f];
          let ps = v
            .split(/[,\s]+/)
            .map(Number)
            .filter((n) => n > 0 && n < fw);
          if ((f.mulFrom || "left") === "right") ps = ps.map((p) => fw - p);
          ps.sort((a, b) => a - b);
          if (ps.length === f.cols.length - 1) {
            let a = 0;
            f.cols.forEach((c, i) => {
              c.w = i < ps.length ? Math.round(ps[i] - a) : 0;
              if (i < ps.length) a = ps[i];
            });
          }
        } else f[k] = v;
        o.pk = "";
        g("d-name").textContent = o.name + " (adjusted)";
        if (
          k === "botFrom" ||
          k === "mulFrom" ||
          (k === "top" && was.t !== +f.top > 0) ||
          (k === "botv" && was.b !== +f.bot > 0)
        ) {
          dzRender();
          const n = g("dz").querySelector(`[data-f="${t.dataset.f}"][data-k="${k}"]`);
          if (n && n.tagName === "INPUT") {
            n.focus();
            try {
              n.setSelectionRange(99, 99);
            } catch (x) {}
          }
        } else if (k === "mulv") {
          g("dz")
            .querySelectorAll('[data-k="w"][data-c]')
            .forEach((inp) => {
              const ff = o.frames[+inp.dataset.f],
                cc = ff && ff.cols[+inp.dataset.c];
              if (cc) inp.value = +cc.w || "";
            });
        }
        refresh();
        return;
      }
      const tg = t.dataset.c != null ? f.cols[+t.dataset.c] : f;
      tg[k] = k === "st" ? t.checked : ["w", "tl", "ang"].includes(k) ? +t.value || 0 : t.value;
      o.pk = "";
      g("d-name").textContent = o.name + " (adjusted)";
      if (k === "tl" && +t.value > 0 !== !!t.closest(".wsprow").querySelector('[data-k="tlop"]')) {
        dzRender();
        const n = g("dz").querySelector(
          `[data-f="${t.dataset.f}"][data-c="${t.dataset.c}"][data-k="tl"]`,
        );
        if (n) {
          n.focus();
          try {
            n.setSelectionRange(99, 99);
          } catch (x) {}
        }
      }
      refresh();
    });
    g("dz").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const o = items[cur],
        fi = +b.dataset.f,
        a = b.dataset.act;
      if (a === "addc")
        o.frames[fi].cols.push({ w: 0, tl: 0, tlop: "F", op: "F", fill: "Glass", st: false });
      if (a === "delc") o.frames[fi].cols.splice(+b.dataset.c, 1);
      if (a === "addf") {
        const l = o.frames[o.frames.length - 1];
        if (l.ang === 180) l.ang = 135;
        o.frames.push({
          w: 600,
          ang: 180,
          cols: [{ w: 0, tl: 0, tlop: "F", op: "F", fill: "Glass", st: false }],
        });
      }
      if (a === "delf") o.frames.splice(fi, 1);
      o.pk = "";
      g("d-name").textContent = o.name + " (adjusted)";
      dzRender();
      refresh();
    });
    g("az").addEventListener("input", (e) => {
      const t = e.target,
        k = t.dataset.k;
      if (!k) return;
      const a = items[cur].addons[+t.dataset.i];
      if (k === "t" || k === "pos") delete a.q;
      if (k === "t") {
        const d = ADD.find((x) => x[0] === t.value);
        a.t = t.value;
        a.mm = d[1];
        a.pos = d[2];
        azRender();
      } else a[k] = k === "mm" ? +t.value || 0 : t.value;
      refresh();
    });
    g("az").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const o = items[cur];
      if (b.dataset.act === "adda") o.addons.push({ t: ADD[0][0], mm: ADD[0][1], pos: ADD[0][2] });
      else o.addons.splice(+b.dataset.i, 1);
      azRender();
      refresh();
    });
    g("list").addEventListener("click", (e) => {
      const b = e.target.closest(".wsitem");
      if (!b) return;
      read();
      load(+b.dataset.i);
      g("ed-title").scrollIntoView({ block: "nearest" });
    });
    document
      .getElementById("wsx-root")
      .querySelectorAll("[data-new]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            read();
            const k = b.dataset.new;
            const o = blank(k);
            applyPreset(o, k, 0);
            o.ref = nextRef(k, o);
            items.push(o);
            load(items.length - 1);
            g("gal").open = true;
            g("ed-title").scrollIntoView({ block: "start" });
            g("o-loc").focus();
            dirty();
          }),
      );
    g("o-ref").addEventListener("input", () => {
      const v = g("o-ref").value.trim().toUpperCase();
      if (!v) return;
      items[cur].ref = v;
      g("ed-title").textContent = v;
      list();
      dirty();
    });
    g("o-ref").addEventListener("change", () => {
      const o = items[cur];
      if (!g("o-ref").value.trim()) {
        g("o-ref").value = o.ref;
        return;
      }
      if (items.some((x) => x !== o && x.ref === o.ref))
        toast(o.ref + " is already used – give it a different number");
    });
    g("dup").onclick = () => {
      read();
      const src = items[cur];
      const d = document.createElement("div");
      d.className = "dimask";
      d.style.zIndex = "125";
      const pf = (src.ref.match(/^[A-Z]*/) || [""])[0] || PFX[src.kind];
      const sug =
        pf +
        (Math.max(
          0,
          ...items.map((x) => (x.ref.startsWith(pf) ? +x.ref.slice(pf.length) || 0 : 0)),
        ) +
          1);
      d.innerHTML = `<form class="dimbox" role="dialog" aria-label="Copy opening"><b>⧉ Copy ${esc(src.ref)}</b><div class="who">Everything is copied: design, sizes, glass, colours and extras. Type the number for the copy. To make several, put a comma between them (e.g. W5, W6, W7).</div><label class="wf" style="margin-top:8px">New number(s)<input id="wsx-dupv" value="${esc(sug)}" autocapitalize="characters"></label><label class="wf" style="margin-top:6px">Location for the copy<input id="wsx-duploc" value="${esc(src.loc)}"></label><div class="dimbtns"><button type="button" class="btn ws-x">Cancel</button><button type="submit" class="btn primary">Copy</button></div></form>`;
      document.body.appendChild(d);
      const inp = d.querySelector("#wsx-dupv");
      inp.focus();
      inp.select();
      d.querySelector(".ws-x").onclick = () => d.remove();
      d.querySelector("form").onsubmit = (e) => {
        e.preventDefault();
        const refs = inp.value
          .split(/[,\s]+/)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean);
        if (!refs.length) {
          toast("Type a number for the copy");
          return;
        }
        const taken = refs.filter(
          (r2, i) => items.some((x) => x.ref === r2) || refs.indexOf(r2) !== i,
        );
        if (taken.length) {
          toast(taken.join(", ") + " already used");
          return;
        }
        const loc = d.querySelector("#wsx-duploc").value;
        const copies = refs.map((r2) =>
          Object.assign(JSON.parse(JSON.stringify(src)), { ref: r2, loc, photos: [] }),
        );
        items.splice(cur + 1, 0, ...copies);
        d.remove();
        load(cur + 1);
        toast(refs.length === 1 ? "Copied as " + refs[0] : `Made ${refs.length} copies`);
        dirty();
      };
    };
    g("del").onclick = (e) => {
      const b = e.currentTarget;
      if (items.length < 2) {
        toast("A survey needs at least one opening");
        return;
      }
      if (b.dataset.armed !== "1") {
        b.dataset.armed = "1";
        b.textContent = "Tap again to remove " + items[cur].ref;
        setTimeout(() => {
          b.dataset.armed = "";
          b.textContent = "🗑 Remove";
        }, 3000);
        return;
      }
      b.dataset.armed = "";
      b.textContent = "🗑 Remove";
      const r = items[cur].ref;
      items.splice(cur, 1);
      load(Math.max(0, cur - 1));
      toast(r + " removed");
      dirty();
    };
  }

  /* ---- PDF ---- */
  /* ---- draw it myself: James sketches the design, the app reads it into a design and keeps it in the list ---- */
  const myDesigns = (kind) =>
    (S.wsDesigns || [])
      .filter((d) => d.wkind === kind)
      .sort((a, b) => (b.created || 0) - (a.created || 0));
  function applyCustom(o, d) {
    o.pk = "custom:" + d.id;
    o.name = d.name || "My design";
    o.frames = JSON.parse(JSON.stringify(d.frames || []));
    o.skOnly = false;
    if (!o.sized && d.sw && d.sh) {
      o.sw = d.sw;
      o.sh = d.sh;
    }
  }
  function skImg(o, w, h) {
    return `<image href="${blobUrl(o.sk)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const usingSketch = (o) => !!(o.sk && o.skOnly);
  function assetDataUrl(id) {
    return new Promise((res) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        try {
          const c = document.createElement("canvas");
          const k = Math.min(1, 1200 / im.width);
          c.width = Math.round(im.width * k);
          c.height = Math.round(im.height * k);
          const x = c.getContext("2d");
          x.fillStyle = "#fff";
          x.fillRect(0, 0, c.width, c.height);
          x.drawImage(im, 0, 0, c.width, c.height);
          res({ url: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height });
        } catch (e) {
          res(null);
        }
      };
      im.onerror = () => res(null);
      im.src = blobUrl(id);
    });
  }
  /* read the drawing: biggest box = frame, boxes inside = panes; letters or an opening "V" in a pane say what it does */
  const OPWORDS = [
    [/\b(fixed|fix|f)\b/i, "F"],
    [/\b(top ?hung|th|top opener|top)\b/i, "TH"],
    [/\b(bottom ?hung|bh|tilt in)\b/i, "BH"],
    [/\b(hl|hinge(d|s)? ?left|left hung|opens? left)\b/i, "HL"],
    [/\b(hr|hinge(d|s)? ?right|right hung|opens? right)\b/i, "HR"],
    [/\b(ttl|tilt ?(and|&) ?turn left)\b/i, "TTL"],
    [/\b(ttr|tilt ?(and|&) ?turn right)\b/i, "TTR"],
    [/\b(tilt ?(and|&) ?turn|t&t|tt)\b/i, "TTL"],
    [/\b(sash|sv|sliding sash)\b/i, "SV"],
    [/\b(door|dl)\b/i, "DL"],
    [/\b(dr)\b/i, "DR"],
    [/\b(slide|slider|sl)\b/i, "SL"],
    [/\b(sr)\b/i, "SR"],
    [/\b(opener|open|opening|casement|o)\b/i, "?"],
  ];
  const FILLWORDS = [
    [/\b(solid|panel|ply|infill)\b/i, "Solid panel"],
    [/\b(half ?glazed|half)\b/i, "Half glazed panel"],
    [/\b(georgian|bars|astragal)\b/i, "Georgian bars"],
  ];
  function readDrawing(objs, kindHint) {
    const rects = objs
      .filter((o) => o.t === "rect" && o.a && o.b && !o.vp)
      .map((o) => {
        const x0 = Math.min(o.a[0], o.b[0]),
          x1 = Math.max(o.a[0], o.b[0]),
          y0 = Math.min(o.a[1], o.b[1]),
          y1 = Math.max(o.a[1], o.b[1]);
        return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, ar: (x1 - x0) * (y1 - y0) };
      })
      .filter((r) => r.w > 8 && r.h > 8);
    if (!rects.length) return { err: "nobox" };
    rects.sort((a, b) => b.ar - a.ar);
    const F = rects[0];
    const tol = Math.max(6, Math.min(F.w, F.h) * 0.04);
    const inside = (r) =>
      r.x0 >= F.x0 - tol &&
      r.x1 <= F.x1 + tol &&
      r.y0 >= F.y0 - tol &&
      r.y1 <= F.y1 + tol &&
      r.ar < F.ar * 0.97;
    let panes = rects.slice(1).filter(inside);
    /* drop boxes that contain other boxes (sub-frames) when they have children */
    panes = panes.filter(
      (p) =>
        !panes.some(
          (q) =>
            q !== p &&
            q.x0 >= p.x0 - tol &&
            q.x1 <= p.x1 + tol &&
            q.y0 >= p.y0 - tol &&
            q.y1 <= p.y1 + tol &&
            q.ar < p.ar * 0.9,
        ),
    );
    const lines = objs.filter((o) => (o.t === "line" || o.t === "arrow") && o.a && o.b && !o.bend);
    const unsure = [];
    if (!panes.length) {
      /* no pane boxes: split the frame with full-height vertical lines and full-width horizontal lines */
      const vs = lines
        .filter(
          (l) =>
            Math.abs(l.a[0] - l.b[0]) < tol &&
            Math.min(l.a[1], l.b[1]) < F.y0 + F.h * 0.25 &&
            Math.max(l.a[1], l.b[1]) > F.y1 - F.h * 0.25 &&
            l.a[0] > F.x0 + tol &&
            l.a[0] < F.x1 - tol,
        )
        .map((l) => l.a[0])
        .sort((a, b) => a - b);
      const hs = lines
        .filter(
          (l) =>
            Math.abs(l.a[1] - l.b[1]) < tol &&
            Math.min(l.a[0], l.b[0]) < F.x0 + F.w * 0.25 &&
            Math.max(l.a[0], l.b[0]) > F.x1 - F.w * 0.25 &&
            l.a[1] > F.y0 + tol &&
            l.a[1] < F.y1 - tol,
        )
        .map((l) => l.a[1])
        .sort((a, b) => a - b);
      const xs = [F.x0, ...vs, F.x1];
      const ys = hs.length ? [F.y0, hs[0], F.y1] : [F.y0, F.y1];
      for (let i = 0; i < xs.length - 1; i++)
        for (let j = 0; j < ys.length - 1; j++)
          panes.push({
            x0: xs[i],
            x1: xs[i + 1],
            y0: ys[j],
            y1: ys[j + 1],
            w: xs[i + 1] - xs[i],
            h: ys[j + 1] - ys[j],
            ar: (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]),
          });
      if (!vs.length && !hs.length)
        unsure.push("I only found one box, so I've made it a single pane.");
    }
    /* what each pane does */
    const texts = objs.filter((o) => o.t === "text" && o.s);
    const inPane = (p, x, y) =>
      x >= p.x0 - tol && x <= p.x1 + tol && y >= p.y0 - tol && y <= p.y1 + tol;
    const near = (a, b, d) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= d;
    panes.forEach((p) => {
      p.op = "";
      p.fill = "Glass";
      p.src = "";
      const tx = texts
        .filter((t) => {
          const x = t.x != null ? t.x : t.p ? t.p[0][0] : null,
            y = t.y != null ? t.y : t.p ? t.p[0][1] : null;
          return x != null && inPane(p, x, y);
        })
        .map((t) => t.s)
        .join(" ");
      if (tx) {
        for (const [re, op] of OPWORDS) {
          if (re.test(tx)) {
            p.op = op;
            p.src = "label";
            break;
          }
        }
        for (const [re, f] of FILLWORDS) {
          if (re.test(tx)) {
            p.fill = f;
            break;
          }
        }
      }
      if (!p.op || p.op === "?") {
        /* a V drawn in the pane: its point sits on the hinge side */
        const d = Math.max(tol * 1.5, Math.min(p.w, p.h) * 0.22);
        const mid = {
          L: [p.x0, (p.y0 + p.y1) / 2],
          R: [p.x1, (p.y0 + p.y1) / 2],
          T: [(p.x0 + p.x1) / 2, p.y0],
          B: [(p.x0 + p.x1) / 2, p.y1],
        };
        const ls = lines.filter(
          (l) =>
            inPane(p, l.a[0], l.a[1]) &&
            inPane(p, l.b[0], l.b[1]) &&
            Math.hypot(l.a[0] - l.b[0], l.a[1] - l.b[1]) > Math.min(p.w, p.h) * 0.3,
        );
        const cnt = { L: 0, R: 0, T: 0, B: 0 };
        ls.forEach((l) => {
          for (const k in mid) {
            if (near(l.a, mid[k], d) || near(l.b, mid[k], d)) cnt[k]++;
          }
        });
        const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
        if (cnt[best] >= 2) {
          p.op = { L: "HL", R: "HR", T: "TH", B: "BH" }[best];
          p.src = "symbol";
        } else if (cnt[best] === 1 && p.op === "?") {
          p.op = { L: "HL", R: "HR", T: "TH", B: "BH" }[best];
          p.src = "symbol?";
        } else if (p.op === "?") {
          p.op = "";
          p.src = "opener?";
        }
      }
      if (!p.op) {
        p.op = "F";
        if (p.src !== "opener?") p.src = "guess";
      }
    });
    /* group panes into columns by x overlap */
    panes.sort((a, b) => a.x0 - b.x0);
    const cols = [];
    panes.forEach((p) => {
      const c = cols.find(
        (c) => Math.min(c.x1, p.x1) - Math.max(c.x0, p.x0) > Math.min(c.x1 - c.x0, p.w) * 0.5,
      );
      if (c) {
        c.p.push(p);
        c.x0 = Math.min(c.x0, p.x0);
        c.x1 = Math.max(c.x1, p.x1);
      } else cols.push({ x0: p.x0, x1: p.x1, p: [p] });
    });
    cols.sort((a, b) => a.x0 - b.x0);
    const fw = F.w,
      fh = F.h;
    const eq = fw / cols.length;
    const uneven = cols.some((c) => Math.abs(c.x1 - c.x0 - eq) > eq * 0.15);
    const out = cols.map((c, ci) => {
      c.p.sort((a, b) => a.y0 - b.y0);
      const main = c.p.length > 1 ? c.p.reduce((m, p) => (p.h > m.h ? p : m), c.p[0]) : c.p[0];
      const top = c.p.find((p) => p !== main && p.y1 <= main.y0 + tol);
      const bot = c.p.find((p) => p !== main && p.y0 >= main.y1 - tol);
      const col = {
        w: 0,
        tl: 0,
        tlop: "F",
        op: main.op,
        fill: main.fill,
        st: false,
        _n: ci + 1,
        _src: main.src,
        _top: top ? { op: top.op, src: top.src, h: top.h } : null,
        _bot: bot ? { op: bot.op, fill: bot.fill, src: bot.src, h: bot.h } : null,
      };
      if (top) {
        col.tl = 1;
        col.tlop = top.op;
        col._tlr = top.h / fh;
      }
      if (uneven) col._wr = (c.x1 - c.x0) / fw;
      return col;
    });
    if (cols.some((c) => c.p.length > 3))
      unsure.push(
        "Some columns have more than three panes stacked; I've kept the biggest as the main pane with a top light and a bottom panel.",
      );
    const tall = fh / fw > 1.4;
    const anyDoor = out.some((c) => /^D/.test(c.op));
    let kind = kindHint;
    if (anyDoor) kind = "door";
    else if (tall && kindHint === "window" && out.length <= 2)
      unsure.push("It's taller than it is wide – is it a door?");
    return { cols: out, kind, unsure, fw, fh, anyDoor };
  }
  function buildFrames(o, rd) {
    const fh = frameH(o) || 1050,
      fw = Math.max(300, o.sw - 2 * o.gap);
    const cols = rd.cols.map((c) => {
      const col = {
        w: c._wr ? Math.round(c._wr * fw) : 0,
        tl: c.tl ? Math.max(150, Math.round(c._tlr * fh)) : 0,
        tlop: c.tlop || "F",
        op: c.op || "F",
        fill: c.fill || "Glass",
        st: false,
      };
      return col;
    });
    const bots = rd.cols.filter((c) => c._bot);
    const f = { w: 0, ang: 180, cols };
    if (bots.length === rd.cols.length) {
      const r = bots[0]._bot.h / rd.fh;
      f.bot = Math.max(150, Math.round(r * fh));
      f.botop = bots[0]._bot.op || "F";
      f.botfill = bots[0]._bot.fill || "Glass";
      f.botFrom = "bottom";
    } else if (bots.length)
      rd.unsure.push(
        "Only some columns had a bottom panel, so I've left the bottom panel off – add it with the centre rails below if you need it.",
      );
    return [f];
  }
  async function saveDesign(o, sk) {
    const d = {
      kind: "wsdesign",
      wkind: o.kind,
      name: o.name,
      frames: JSON.parse(JSON.stringify(o.frames)),
      sw: o.sw,
      sh: o.sh,
      sk: sk || "",
      created: Date.now(),
    };
    const id = newId();
    await S.db.doc("todos/" + id).set(d);
    S.wsDesigns = (S.wsDesigns || []).concat([Object.assign({ id }, d)]);
    return id;
  }
  function askDrawing(o, rd) {
    const unknown = [];
    rd.cols.forEach((c) => {
      if (/\?|guess/.test(c._src || "")) unknown.push({ c, part: "main" });
      if (c._top && /\?|guess/.test(c._top.src || "")) unknown.push({ c, part: "top" });
    });
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "135";
    const prev = (() => {
      const t = JSON.parse(JSON.stringify(o));
      t.gap = 0;
      t.cill = "No cill";
      t.frames = buildFrames(t, rd);
      const vh = 92;
      return `<svg viewBox="0 0 120 ${vh}" style="width:140px;height:auto" aria-hidden="true">${draw(t, 120, vh, 6, CV, { dims: false })}</svg>`;
    })();
    const where =
      rd.cols.length > 1 ? ["left", "second", "third", "fourth", "fifth", "sixth"] : [""];
    const q = unknown
      .map((u, i) => {
        const lab =
          u.part === "top"
            ? `Top light over the ${where[u.c._n - 1] || u.c._n + "th"} pane`
            : rd.cols.length > 1
              ? `The ${where[u.c._n - 1] || u.c._n + "th"} pane`
              : "The pane";
        const cur2 = u.part === "top" ? u.c.tlop : u.c.op;
        return `<label class="wf" style="display:flex;flex-direction:column;gap:4px;font-size:13px">${esc(lab)} – what does it do?<select data-q="${i}">${opOpts(o.kind, cur2 || "F")}</select></label>`;
      })
      .join("");
    d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Your drawing"><b>✏️ I've read your drawing</b><div class="who" style="margin-top:4px">${rd.cols.length} ${rd.cols.length === 1 ? "column" : "columns across"}${rd.cols.some((c) => c.tl) ? ", with top lights" : ""}${rd.cols.some((c) => c._bot) ? ", with a bottom panel" : ""}. Check it and I'll add it to your designs.</div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin:10px 0;flex-wrap:wrap">${prev}<div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:8px">
      <label class="wf" style="display:flex;flex-direction:column;gap:4px;font-size:13px">Name for this design<input id="wsx-dn" maxlength="40" value="${esc(o.name && o.name !== "My drawing" ? o.name : "")}" placeholder="e.g. ${o.kind === "door" ? "Stable door, glazed top" : "Three panes, top lights"}"></label>
      ${rd.kind !== o.kind ? `<label class="wschip"><input type="checkbox" id="wsx-dk" checked>It's a ${rd.kind}, not a ${o.kind}</label>` : ""}
      ${q}</div></div>
    ${rd.unsure.length ? `<div class="notice" style="font-size:13px">${rd.unsure.map(esc).join("<br>")}</div>` : ""}
    <div class="dimbtns"><button type="button" class="btn ws-x">Keep my drawing for now</button><button type="button" class="btn primary ws-ok">Use this design</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".ws-x").onclick = () => d.remove();
    d.querySelector(".ws-ok").onclick = async () => {
      unknown.forEach((u, i) => {
        const v = d.querySelector(`[data-q="${i}"]`).value;
        if (u.part === "top") u.c.tlop = v;
        else u.c.op = v;
      });
      const dk = d.querySelector("#wsx-dk");
      if (dk && dk.checked) {
        const n = blank(rd.kind);
        const keep = {
          ref: o.ref,
          loc: o.loc,
          qty: o.qty,
          notes: o.notes,
          sw: o.sw,
          sh: o.sh,
          gap: o.gap,
          sized: o.sized,
          sk: o.sk,
        };
        Object.assign(n, keep);
        items[cur] = n;
      }
      const t = items[cur];
      t.name =
        d.querySelector("#wsx-dn").value.trim() ||
        "My " + t.kind + " " + (myDesigns(t.kind).length + 1);
      t.frames = buildFrames(t, rd);
      t.skOnly = false;
      d.remove();
      try {
        const id = await saveDesign(t, t.sk);
        t.pk = "custom:" + id;
        toast("Added to your " + t.kind + " designs");
      } catch (e) {
        t.pk = "";
        toast("Design used here, but couldn't save it to your list");
      }
      load(cur);
      g("gal").open = false;
      dirty();
    };
  }
  /* crop the saved page to what was drawn, so the drawing fills the design box */
  async function cropDrawing(r) {
    const objs = (r.objs || []).filter((o) => o.ly !== "notes");
    if (!objs.length || !r.w) return r.blob;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    const pt = (x, y) => {
      if (x == null || y == null) return;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    };
    objs.forEach((o) => {
      if (o.a) pt(o.a[0], o.a[1]);
      if (o.b) pt(o.b[0], o.b[1]);
      if (Array.isArray(o.p)) o.p.forEach((q) => pt(q[0], q[1]));
      if (o.x != null) {
        pt(o.x, o.y);
        pt(o.x + (o.size || 14) * (String(o.s || "").length * 0.6), o.y + (o.size || 14));
      }
    });
    if (!isFinite(x0) || x1 - x0 < 20 || y1 - y0 < 20) return r.blob;
    try {
      const im = await createImageBitmap(r.blob);
      const k = im.width / r.w;
      const pad = 24;
      const cx = Math.max(0, (x0 - pad) * k),
        cy = Math.max(0, (y0 - pad) * k),
        cw = Math.min(im.width - cx, (x1 - x0 + 2 * pad) * k),
        ch = Math.min(im.height - cy, (y1 - y0 + 2 * pad) * k);
      if (cw < 40 || ch < 40) return r.blob;
      const c = document.createElement("canvas");
      c.width = Math.round(cw);
      c.height = Math.round(ch);
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob((b) => res(b || r.blob), "image/jpeg", 0.88));
    } catch (e) {
      return r.blob;
    }
  }
  function drawMine() {
    read();
    const o = items[cur];
    const title = (o.ref || "") + " design";
    openNotePage({
      title,
      size: "A4",
      orient: "port",
      local: true,
      pro: false,
      noTitleBox: true,
      z: 130,
      headLines: [
        ["Draw", o.kind + " as seen from outside"],
        [
          "Tip",
          "Box for the frame, a box for each pane, letters for what each pane does (F, TH, HL, HR, TT, sash), or draw the opening V",
        ],
      ],
      onSave: async (r) => {
        const t = items[cur];
        let sk = "";
        const blob = await cropDrawing(r);
        try {
          const a = await uploadFile(blob, "design.jpg");
          sk = a.id;
        } catch (e) {
          toast("Couldn't save the drawing – check your connection");
          return;
        }
        t.sk = sk;
        t.skOnly = true;
        t.pk = "";
        t.name = "My drawing";
        load(cur);
        dirty();
        const rd = readDrawing(r.objs || [], t.kind);
        if (rd.err) {
          toast(
            "Drawing kept in place of the design. For me to read it, draw the frame as a box and a box for each pane.",
          );
          return;
        }
        askDrawing(t, rd);
      },
    });
  }

  function svgPng(o, VH) {
    return new Promise((res) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${VH * 2}" viewBox="0 0 360 ${VH}"><rect width="360" height="${VH}" fill="#fff"/>${draw(o, 360, VH, 14, PC, { fs: 12 })}</svg>`;
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = 720;
          c.height = VH * 2;
          const x = c.getContext("2d");
          x.fillStyle = "#fff";
          x.fillRect(0, 0, c.width, c.height);
          x.drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL("image/png"));
        } catch (e) {
          res(null);
        }
      };
      im.onerror = () => res(null);
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function pdfAsk(r, btn, prn0) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "125";
    d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Which PDF"><b>📄 Which PDF?</b><div class="who">Both use the same survey.</div><div class="actions" style="flex-direction:column;align-items:stretch;margin-top:10px"><button type="button" class="btn primary" data-m="order">📦 Order request<br><span style="font-weight:400;font-size:12px">For the manufacturer: sizes, design, glass, cill, frame, hardware</span></button><button type="button" class="btn" data-m="full">📋 Full survey<br><span style="font-weight:400;font-size:12px">Everything: openings, gaps, reveals, client details, notes, plus the order details</span></button></div>
    <label class="inl" style="margin-top:10px;font-weight:600"><input type="checkbox" class="ws-prn" ${prn0 ? "checked" : ""}> 🖨 Print it straight away</label><div class="dimbtns"><button type="button" class="btn ws-x">Cancel</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".ws-x").onclick = () => d.remove();
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
    d.querySelectorAll("[data-m]").forEach(
      (b) =>
        (b.onclick = () => {
          const prn = d.querySelector(".ws-prn").checked;
          d.remove();
          pdf(r, btn, b.dataset.m, prn);
        }),
    );
  }
  async function pdf(r, btn, mode, prn) {
    mode = mode || "order";
    const full = mode === "full";
    const its = r.items || [];
    if (!its.length) {
      toast("Add an opening first");
      return;
    }
    const lab = btn && btn.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Making the PDF…";
    }
    const done = () => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = lab;
      }
    };
    try {
      await loadJsPdf();
    } catch (e) {
      toast("Couldn't load the PDF maker. Check your connection.");
      done();
      return;
    }
    try {
      const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const W = 210,
        M = 12,
        CW = W - 2 * M,
        co = coData(),
        J = r.job || {},
        BR = BRGB(),
        RED = [180, 35, 24],
        GR = [75, 68, 65];
      let y = 0;
      const clean = (t) =>
        String(t || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[–—]/g, "-")
          .replace(/[‘’]/g, "'")
          .replace(/[“”]/g, '"')
          .replace(/×/g, "x")
          .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
      const T = (t, x, yy, sz, st, col, al) => {
        doc.setFont("helvetica", st || "normal");
        doc.setFontSize(sz);
        doc.setTextColor(...(col || [20, 20, 20]));
        doc.text(clean(t), x, yy, al ? { align: al } : undefined);
      };
      const dateTxt = J.date
        ? new Date(J.date + "T12:00").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
      doc.setFillColor(...BR);
      doc.rect(0, 0, W, 5, "F");
      await pdfLogo(doc, W - M, 9, 40, 18);
      T(co.name.toUpperCase(), M, 13, 8.5, "bold", BR);
      T(
        full ? "Door & window survey" : "Door & window schedule · Order request",
        M,
        20,
        15,
        "bold",
      );
      {
        const web = co.website
          ? String(co.website)
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "")
          : "";
        const cl = [
          [co.owner, co.mobile && "Mob " + co.mobile, co.phone && "Tel " + co.phone]
            .filter(Boolean)
            .join("  ·  "),
          [co.email, web].filter(Boolean).join("  ·  "),
          String(co.address || "").replace(/\n/g, ", "),
        ].filter(Boolean);
        let cy = 25.5;
        cl.forEach((l) => {
          T(doc.splitTextToSize(clean(l), W - 2 * M - 48)[0], M, cy, 8.5, "normal", GR);
          cy += 4;
        });
        y = Math.max(33, cy + 3);
      }
      const meta = [
        ["Job / client", J.client],
        ["Deliver to", J.addr],
        ["Surveyed by", J.by],
        ["Date", dateTxt],
        ["Supplier", J.supplier || "______________________"],
        ["Our ref", J.ref],
      ];
      const clR = r.clientId && (S.clients || []).find((x) => x.id === r.clientId);
      if (full) {
        meta.splice(4, 1);
        if (clR) {
          if (clR.phone) meta.push(["Client phone", clR.phone]);
          if (clR.email) meta.push(["Client email", clR.email]);
        }
      }
      meta.forEach(([l, v], i) => {
        const x = M + (i % 2) * (CW / 2),
          yy = y + Math.floor(i / 2) * 5;
        T(l, x, yy, 8, "bold", [110, 100, 100]);
        T(doc.splitTextToSize(clean(v || "-"), CW / 2 - 28)[0], x + 24, yy, 9);
      });
      y += Math.ceil(meta.length / 2) * 5 + 2;
      const tq = its.reduce((s, o) => s + (+o.qty || 1), 0);
      T(
        `${its.length} item${its.length === 1 ? "" : "s"} · ${tq} frame${tq === 1 ? "" : "s"} · overall frame sizes in mm, drawings show the outside face`,
        M,
        y,
        8,
        "normal",
        GR,
      );
      y += 4;
      const need = (h) => {
        if (y + h > 282) {
          doc.addPage();
          doc.setFillColor(...BR);
          doc.rect(0, 0, W, 3, "F");
          y = 12;
          return true;
        }
        return false;
      };
      const groups = {};
      its.forEach((o) => {
        const k =
          (o.kind === "garage"
            ? (o.gmake !== "Not specified" ? o.gmake : "Garage door") + " · " + o.gfin
            : (o.sys && o.sys !== "Not specified" ? o.sys.replace(/^[^–]+– /, "") + " · " : "") +
              o.prof +
              (o.bead && o.bead !== "N/A" ? " · " + o.bead.toLowerCase() : "")) +
          "|" +
          o.out +
          "|" +
          o.in;
        (groups[k] = groups[k] || []).push(o);
      });
      /* our own layout: spec sentences on the left, drawing on the right, one plain heading per specification group */
      const IW = 52,
        TX = M + 2,
        TW = CW - IW - 8,
        LH = 3.4;
      const specTxt = (k) => {
        const [pf, c1, c2] = k.split("|");
        return `${pf}  ·  ${c1} outside${c1 === c2 ? " and inside" : " / " + c2 + " inside"}`;
      };
      const grpHead = (k) => {
        need(12);
        T("Specification", M, y + 3.2, 7, "bold", [110, 100, 100]);
        T(specTxt(k), M + 22, y + 3.4, 9, "bold", BR);
        y += 5;
        doc.setDrawColor(...BR);
        doc.setLineWidth(0.5);
        doc.line(M, y, W - M, y);
        y += 3.5;
      };
      const sent = (arr) =>
        arr
          .filter(Boolean)
          .map((x) => (Array.isArray(x) ? x[0] : x))
          .join(", ");
      let gi = 0;
      for (const [k, os] of Object.entries(groups)) {
        grpHead(k);
        gi++;
        for (const o of os) {
          const s = sizes(o),
            bay = s.fws.length > 1,
            VH = bay ? 350 : 300,
            L = lines(o);
          const imgH = (IW * VH) / 360;
          const rows = [
            ...(o.kind === "garage"
              ? [
                  [
                    "Door",
                    sent(L.gar.filter((x) => !/^Electrics/.test(x[0]) && x[0] !== o.gnote)) ||
                      "As standard",
                  ],
                  [
                    "Electrics",
                    (L.gar.find((x) => /^Electrics/.test(x[0])) || ["-"])[0].replace(
                      /^Electrics: /,
                      "",
                    ) + (o.gnote ? " – " + o.gnote : ""),
                  ],
                ]
              : [
                  ["Glazing", sent([L.gl.big, ...L.gl.l])],
                  ["Cill", hasCill(o) ? sent([L.cill.big, ...L.cill.l]) : "No cill"],
                  ["Frame", sent(L.frame.l) || "As standard"],
                ]),
            L.tim.length && ["Timber", sent(L.tim)],
            ["Hardware", sent(L.hw.l) || "As standard"],
            L.add.length && ["Add-ons", L.add.join(", ")],
            [
              "Design",
              usingSketch(o)
                ? "As drawn on site (see sketch) - please check the design and sizes with " +
                  (coData().owner || "the surveyor") +
                  " before manufacture"
                : describeTxt(o).join("; "),
            ],
            o.notes && ["Note", o.notes],
          ].filter(Boolean);
          doc.setFontSize(7.5);
          const laid = rows.map(([l, v]) => [l, doc.splitTextToSize(clean(v), TW - 22)]);
          const textH = 10 + laid.reduce((a, [, ls]) => a + ls.length * LH + 1.2, 0);
          const H = Math.max(textH, imgH + 8) + 3;
          if (need(H + 2)) {
            grpHead(k);
          }
          const y0 = y;
          doc.setFillColor(248, 245, 243);
          doc.rect(M, y0, CW, H, "F");
          doc.setDrawColor(...BR);
          doc.setLineWidth(1.2);
          doc.line(M, y0, M, y0 + H);
          let ly = y0 + 5;
          T(o.ref, TX, ly, 12, "bold", BR);
          const rx = TX + doc.getTextWidth(clean(o.ref)) + 3;
          T(
            [o.loc, o.name, o.mat].filter(Boolean).join("  ·  "),
            rx,
            ly,
            8.5,
            "bold",
            [40, 36, 35],
          );
          ly += 4.6;
          T(
            `${o.qty || 1} off  ·  ${s.W} wide x ${s.H} high` +
              (s.A.any ? `  ·  ${s.OW} x ${s.OH} with add-ons` : ""),
            TX,
            ly,
            8.5,
            "normal",
            GR,
          );
          ly += 3;
          laid.forEach(([l, ls]) => {
            ly += 1.2;
            T(l, TX, ly + 2.6, 7, "bold", [110, 100, 100]);
            ls.forEach((t, i) =>
              T(
                t,
                TX + 22,
                ly + 2.6 + i * LH,
                7.5,
                "normal",
                /Note|Add-ons/.test(l) ? RED : [30, 28, 27],
              ),
            );
            ly += ls.length * LH;
          });
          {
            let png = null,
              fmt = "PNG",
              dw = IW,
              dh = imgH,
              dx = W - M - IW - 2;
            const iy = y0 + 4;
            if (usingSketch(o)) {
              const im = await assetDataUrl(o.sk);
              if (im) {
                png = im.url;
                fmt = "JPEG";
                const r = im.w / im.h;
                if (dw / dh > r) {
                  const w2 = dh * r;
                  dx += (dw - w2) / 2;
                  dw = w2;
                } else dh = dw / r;
              }
            }
            if (!png) png = await svgPng(o, VH);
            if (png) doc.addImage(png, fmt, dx, iy, dw, dh);
          }
          y = y0 + H + (full ? 1.5 : 3);
          if (full) {
            const s2 = sizes(o),
              fu =
                o.kind === "door"
                  ? [
                      o.lp,
                      o.nums !== "None"
                        ? o.nums +
                          (o.num ? ` "${o.num}"` : "") +
                          (o.nstyle && o.nstyle !== "Standard numerals"
                            ? " (" + o.nstyle + ")"
                            : "")
                        : "None",
                      o.knock,
                      o.spy,
                      o.chain,
                      o.pull !== "None" ? "Outside " + o.pull : "None",
                    ]
                      .filter((x) => x && x !== "None")
                      .join(", ")
                  : "";
            const kv = [
              ["Location", o.loc || "-"],
              ["Type", o.name + " (" + o.kind + ")"],
              [
                "Structural opening",
                o.kind === "bay" ? "Overall " + o.sw + " (reference)" : `${o.sw} x ${o.sh}`,
              ],
              ["Fitting gap", o.gap + "mm each side"],
              [
                "Order size",
                `${s2.W} x ${s2.H}` + (s2.A.any ? ` (with add-ons ${s2.OW} x ${s2.OH})` : ""),
              ],
              ["Reveal depth", o.rev ? o.rev + "mm" : "-"],
              [
                "Cill",
                hasCill(o)
                  ? `${cillName(o)}, ${cillHt(o)}mm high, size ${cillInc(o) ? "includes" : "excludes"} cill`
                  : "No cill",
              ],
              ["Material", o.mat],
              ["System / range", o.sys || "Not specified"],
              [
                "Frame profile",
                o.prof + (o.bead && o.bead !== "N/A" ? ", " + o.bead.toLowerCase() : ""),
              ],
              ["Colour", `${o.out} outside / ${o.in} inside`],
              ["Glass", o.gt + (obsOn(o) ? " (" + o.gwhere.toLowerCase() + ")" : "")],
              ["Safety glass", o.spec],
              ["Glazing unit", `${o.gu}, ${o.gas}, ${o.spacer}`],
              ["Handle / lock", `${o.hw} ${o.lock}`],
              ["Hinges", o.hinge],
              [
                "Handing",
                [handTxt(o).replace(" (viewed from outside)", ""), o.swing !== "N/A" ? o.swing : ""]
                  .filter(Boolean)
                  .join(", ") || "-",
              ],
              ["Trickle vents", o.vents],
              ...(o.kind === "door"
                ? [
                    ["Threshold", o.thr || "N/A"],
                    ["Door slab", o.slab || "-"],
                    ["Glass design", o.gdes || "-"],
                  ]
                : []),
              ...(isTim(o)
                ? [
                    ["Timber", o.tspec || "-"],
                    [
                      "Style",
                      (o.tstyle || "-") +
                        (o.tmould ? ", " + o.tmould.toLowerCase() + " mouldings" : ""),
                    ],
                    ["Finish", o.tfin || "-"],
                    ["Timber glazing", [o.tglz, o.tgm].filter(Boolean).join(", ") || "-"],
                    ["Glazing bars", o.tbars || "-"],
                    ...(o.kind !== "door" ? [["Timber cill", o.tcill || "-"]] : []),
                    ["Ironmongery", [o.tiron, o.tifin].filter(Boolean).join(", ") || "-"],
                    ["Weather seals", o.tweath || "-"],
                    ["Listed / conservation", o.tcons || "-"],
                  ]
                : []),
              ...(o.kind === "garage"
                ? [
                    ["Make / range", o.gmake],
                    ["Panel style", o.gstyle + ", " + o.gfin],
                    ["Operation", o.ggear + (/Electric/.test(o.ggear) ? " – " + o.gmotor : "")],
                    ["Fitting", o.gfix],
                    [
                      "Headroom / side room",
                      `${o.ghead || "?"} / L ${o.gsl || "?"} R ${o.gsr || "?"}`,
                    ],
                    [
                      "Electric supply",
                      o.gelec +
                        (o.gby !== "Not decided" ? " – " + o.gby : "") +
                        (o.gnote ? " – " + o.gnote : ""),
                    ],
                  ]
                : []),
              ...(fu ? [["Door furniture", fu]] : []),
              ...(o.ex.length ? [["Extras", o.ex.join(", ")]] : []),
              ...((o.addons || []).length ? [["Add-ons", lines(o).add.join(", ")]] : []),
              ["Panes", describeTxt(o).join(" / ")],
              ...(o.notes ? [["Notes", o.notes]] : []),
            ];
            const colW = CW / 2,
              lw2 = 27;
            doc.setFontSize(7.5);
            for (let i = 0; i < kv.length; i += 2) {
              const pr = kv
                .slice(i, i + 2)
                .map(([l, v]) => [
                  l,
                  doc.splitTextToSize(
                    clean(v),
                    (/Panes|Notes|Add-ons|Door furniture|Extras/.test(l) ? CW : colW) - lw2 - 3,
                  ),
                ]);
              const wide = pr.some(([l]) => /Panes|Notes|Add-ons|Door furniture|Extras/.test(l));
              const rows = wide ? pr.map((p) => [p]) : [pr];
              for (const rw of rows) {
                const hh = Math.max(...rw.map((p) => p[1].length)) * 3.1 + 1.4;
                if (need(hh)) (T(o.ref + " (continued)", M, y + 3, 8, "bold", BR), (y += 5));
                rw.forEach(([l, ls], j) => {
                  const x = M + j * colW;
                  T(l, x + 1, y + 3, 7, "bold", [110, 100, 100]);
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(7.5);
                  doc.setTextColor(30, 28, 27);
                  ls.forEach((t, k) => doc.text(t, x + lw2, y + 3 + k * 3.1));
                });
                y += hh;
                doc.setDrawColor(235, 229, 226);
                doc.setLineWidth(0.2);
                doc.line(M, y, W - M, y);
              }
            }
            if ((o.photos || []).length) {
              const PW = (CW - 9) / 4,
                PH = PW * 0.75;
              let k = 0;
              for (const id of o.photos.slice(0, 8)) {
                if (k % 4 === 0) {
                  need(PH + 6);
                  if (k === 0) {
                    T("Photos", M + 1, y + 3, 7, "bold", [110, 100, 100]);
                    y += 4.5;
                  }
                }
                const im = await assetDataUrl(id);
                if (im) {
                  let dw = PW,
                    dh = PH;
                  const r = im.w / im.h;
                  if (dw / dh > r) dw = dh * r;
                  else dh = dw / r;
                  doc.addImage(
                    im.url,
                    "JPEG",
                    M + (k % 4) * (PW + 3) + (PW - dw) / 2,
                    y + (PH - dh) / 2,
                    dw,
                    dh,
                  );
                }
                k++;
                if (k % 4 === 0 || k === Math.min(8, o.photos.length)) y += PH + 3;
              }
              y += 2;
            }
            y += 5;
          }
        }
      }
      need(16);
      doc.setDrawColor(...BR);
      doc.setLineWidth(0.6);
      doc.line(M, y, W - M, y);
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GR);
      doc
        .splitTextToSize(
          full
            ? "Drawings show the outside face and are diagrammatic, not to scale. Structural openings are as measured on site; order sizes allow for the fitting gaps shown."
            : "Drawings show the outside face and are diagrammatic, not to scale. Sizes are overall frame sizes in mm. Please check everything and send a quotation or order acknowledgement before manufacture.",
          CW,
        )
        .forEach((l) => {
          doc.text(l, M, y);
          y += 3.4;
        });
      y += 4;
      T(
        full
          ? "Surveyed by ____________________________     Date ______________"
          : "Approved ____________________________     Date ______________",
        M,
        y,
        9,
        "normal",
        [40, 36, 35],
      );
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        T(
          `${co.name} · ${full ? "Door & window survey" : "Order request"}${J.client ? " · " + J.client : ""} · Page ${i} of ${n}`,
          M,
          292,
          7.5,
          "normal",
          [130, 120, 120],
        );
      }
      const fn = `${full ? "Door & window survey" : "Order request"} - ${
        clean(J.client || J.addr || "survey")
          .replace(/[^\w\s&,-]/g, "")
          .trim()
          .slice(0, 60) || "survey"
      } - ${J.date || iso(new Date())}.pdf`;
      const blob = doc.output("blob");
      if (prn) {
        printBlob(blob, fn);
      } else if (S.dl) {
        try {
          await S.dl.save({ filename: fn, data: blob });
          toast("PDF saved");
        } catch (e) {
          if (!(e && e.code === "declined")) pdfShow(blob, fn);
        }
      } else pdfShow(blob, fn);
      const cl = r.clientId && (S.clients || []).find((x) => x.id === r.clientId);
      if (S.assets) {
        try {
          const a = await uploadFile(blob, fn);
          r.lastPdf = { assetId: a.id, name: fn, at: Date.now(), mode };
          if (R && R.id === r.id) R.lastPdf = r.lastPdf;
          try {
            await persist(r);
          } catch (e) {}
          if (cl) {
            const cur2 = ptCl(cl);
            const lst = [{ assetId: a.id, name: fn, at: Date.now(), pages: n }]
              .concat((cur2.recordPdfs || []).filter((x) => x.name !== fn))
              .slice(0, 10);
            await saveClient(Object.assign({}, cur2, { recordPdfs: lst }));
            toast("Also saved on " + cl.name + "'s record");
          }
          if (g("send")) g("send").disabled = false;
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
      toast("Couldn't make the PDF");
    }
    done();
  }

  /* ---- lists: on a client, and on their own ---- */
  function rowHtml(r, showClient) {
    const n = (r.items || []).length;
    return `<div class="wsrec"><button type="button" class="ws-open" data-id="${esc(r.id)}"><b>🪟 ${esc(r.title || "Door & window survey")}</b><br><span class="who">${n} opening${n === 1 ? "" : "s"}${showClient ? (r.clientId ? " · linked to a client" : " · no client") : ""} · ${esc(stamp(r.updated || r.created))}</span></button><button type="button" class="iconbtn ws-pdf" data-id="${esc(r.id)}" aria-label="Make PDF" title="Make PDF">📄</button>${r.lastPdf ? `<button type="button" class="iconbtn ws-send" data-id="${esc(r.id)}" aria-label="Send the PDF" title="Send the PDF">📤</button>` : ""}<button type="button" class="iconbtn ws-del" data-id="${esc(r.id)}" aria-label="Delete survey" title="Delete" style="color:var(--danger)">🗑</button></div>`;
  }
  function wireRows(root, o) {
    root.querySelectorAll(".ws-open").forEach(
      (b) =>
        (b.onclick = () => {
          const r = recs().find((x) => x.id === b.dataset.id);
          if (!r) return;
          if (o.client) closeViewer();
          open(r, o);
        }),
    );
    root.querySelectorAll(".ws-pdf").forEach(
      (b) =>
        (b.onclick = () => {
          const r = recs().find((x) => x.id === b.dataset.id);
          if (r) pdfAsk(r, b);
        }),
    );
    root.querySelectorAll(".ws-send").forEach(
      (b) =>
        (b.onclick = () => {
          const r = recs().find((x) => x.id === b.dataset.id);
          if (r && r.lastPdf)
            SENDTO.open({
              assetId: r.lastPdf.assetId,
              name: r.lastPdf.name,
              type: "application/pdf",
              title: r.lastPdf.name.replace(/\.pdf$/i, ""),
              clientId: r.clientId,
              folder: "designs",
              cat: "specs",
            });
        }),
    );
    root.querySelectorAll(".ws-del").forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.textContent = "Sure?";
            b.style.width = "auto";
            b.style.padding = "0 8px";
            toast("Tap again to delete this survey");
            return;
          }
          try {
            await S.db.doc("todos/" + b.dataset.id).delete();
            S.winSurveys = (S.winSurveys || []).filter((x) => x.id !== b.dataset.id);
            toast("Survey deleted");
            if (o.client) viewClient(ptCl(o.client));
            else render();
          } catch (e) {
            toast("Couldn't delete");
          }
        }),
    );
  }
  function clientHtml(c) {
    if (!ownerMode()) return "";
    const L = recs().filter((r) => r.clientId === c.id);
    return `<div class="flabel" style="margin-top:12px">🪟 Doors &amp; windows (${L.length})</div><div class="wscl" id="ws-cl">${L.map((r) => rowHtml(r, false)).join("")}<div class="actions"><button type="button" class="btn hv" id="ws-cnew">+ Door &amp; window survey</button></div></div>`;
  }
  function wireClient(c) {
    const el = document.getElementById("ws-cl");
    if (!el) return;
    wireRows(el, { client: c });
    const b = document.getElementById("ws-cnew");
    if (b)
      b.onclick = () => {
        closeViewer();
        open(null, { client: c });
      };
  }
  function jobsHtml() {
    if (!ownerMode()) return "";
    const L = recs();
    return `<div class="day"><div class="dayh"><span>🪟 Door &amp; window surveys</span><span class="sum">${L.length}</span></div><div class="wscl" id="ws-jl" style="padding:8px 0">${
      L.length
        ? L.slice(0, 30)
            .map((r) => rowHtml(r, true))
            .join("")
        : '<div class="nothing">None yet. Start one with the button above, or from a client.</div>'
    }</div></div>`;
  }
  function wireJobs() {
    const el = document.getElementById("ws-jl");
    if (el) wireRows(el, {});
    const b = document.getElementById("ws-new");
    if (b) b.onclick = () => open(null, {});
    const bb = document.getElementById("ws-broch");
    if (bb)
      bb.onclick = () => {
        S.otab = "suppliers";
        S.f.merTab = "makers";
        store.set("jeb.otab", "suppliers");
        render();
        window.scrollTo(0, 0);
      };
  }
  return {
    broch: () => BROCH,
    itemsFor: (cid) =>
      recs()
        .filter((r) => r.clientId === cid)
        .flatMap((r) => r.items || []),
    sizeOf: (o) => sizes(o),
    open,
    pdf,
    clientHtml,
    wireClient,
    jobsHtml,
    wireJobs,
    _draw: draw,
    _blank: blank,
    _applyPreset: applyPreset,
  };
})();

function jobsView() {
  const owner = ownerMode();
  const f = S.f.jobs || "open";
  let list = (owner ? S.jobs : myJobs()).filter(
    (j) => f === "all" || (f === "open" ? j.status !== "closed" : j.status === "closed"),
  );
  list = list.sort(
    (a, b) =>
      (a.due || "9999").localeCompare(b.due || "9999") || (b.created || 0) - (a.created || 0),
  );
  let html = `${owner ? `<div class="actions"><button class="btn primary" id="newJob" type="button">+ New job sheet</button><button class="btn hv" id="newSnag" type="button">+ New snag list</button><button class="btn" id="ws-new" type="button">🪟 Door &amp; window survey</button><button class="btn" id="ws-broch" type="button">📖 Brochures &amp; suppliers</button><button class="btn" id="wt-new" type="button">♻️ Waste transfer note</button></div>` : ""}
    <div class="seg" id="jf">${[
      ["open", "Open"],
      ["closed", "Signed off"],
      ["all", "All"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
      )
      .join("")}</div>`;
  html += list.length
    ? `<div class="day">${list.map((j) => jobCard(j, owner)).join("")}</div>`
    : `<div class="empty"><strong>${f === "open" ? "No open jobs" : "Nothing here"}</strong>${owner ? "Create a job sheet or snag list, choose who it's for, and add the tasks." : "Job sheets and snag lists James gives you will appear here."}</div>`;
  if (owner) html += DWS.jobsHtml() + WTN.jobsHtml();
  $("main").innerHTML = html;
  if (owner) {
    DWS.wireJobs();
    WTN.wireJobs();
  }
  if ($("newJob")) $("newJob").onclick = () => openJobEditor("job", null);
  if ($("newSnag")) $("newSnag").onclick = () => openJobEditor("snag", null);
  $("jf")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.jobs = b.dataset.v;
          render();
        }),
    );
  $("main")
    .querySelectorAll(".jobc")
    .forEach((b) => (b.onclick = () => openJob(b.dataset.j)));
}
function openJob(id) {
  S.openJob = id;
  renderJobDetail();
  $("viewer").hidden = false;
}
function jobClientOf(j) {
  return j.site ? (S.clients || []).find((c) => clientSites(c).some((x) => same(x, j.site))) : null;
}
function jobSummaryHtml(j, owner, n, d) {
  const site = j.site || "";
  const sr = siteRec(site) || {};
  const late = j.status !== "closed" && j.due && j.due < iso(new Date()) && d < n;
  const hrsOn = site
    ? allTeam("entries")
        .filter((e) => same(e.job, site))
        .reduce((a, e) => a + (+e.hours || 0), 0)
    : 0;
  const np = site
    ? (S.plan || [])
        .concat(owner ? S.planPrivate || [] : [])
        .filter((p) => same(p.site, site) && (p.to || p.from) >= iso(new Date()))
        .sort((a, b) => (a.from + (a.time || "")).localeCompare(b.from + (b.time || "")))[0]
    : null;
  const row = (l, v) =>
    v ? `<div class="drow"><span>${esc(l)}</span><span>${v}</span></div>` : "";
  const jobRows = [
    row(
      "Site",
      site
        ? `<button type="button" class="maplink" data-addr="${esc(site)}">📍 ${esc(site)}</button>`
        : "No site",
    ),
    row(
      "Due",
      j.due ? esc(shortDay(j.due)) + (late ? ' <span class="tag bad">Overdue</span>' : "") : "",
    ),
    row("Who's on it", esc((j.assigneeNames || []).join(", ") || "Nobody assigned")),
    row(
      "Progress",
      n
        ? `<b>${d} of ${n}</b> tasks done <span class="jsprog"><span style="width:${Math.round((d / n) * 100)}%"></span></span>`
        : "No tasks",
    ),
    row("Hours on this site", hrsOn ? hrs(hrsOn) + " h logged" : ""),
    row(
      "Next in the planner",
      np
        ? esc(np.title) + " · " + esc(shortDay(np.from)) + (np.time ? " " + esc(np.time) : "")
        : "",
    ),
  ].join("");
  const c = owner ? jobClientOf(j) : null;
  const tel = c ? String(c.phone || "").replace(/\s+/g, "") : "";
  const cl = c
    ? `<div class="jsclient"><div class="jsch"><b>👤 ${esc(c.name)}</b> <span class="tag">${esc(clStage(c.stage))}</span></div>
      <div class="details">${[row("Phone", c.phone ? `<a href="tel:${esc(tel)}">📞 ${esc(c.phone)}</a>` : ""), row("Email", c.email ? `<a href="mailto:${esc(c.email)}">✉ ${esc(c.email)}</a>` : ""), row("Property", clAddr(c) ? `<button type="button" class="maplink" data-addr="${esc(clAddr(c))}" data-client="${esc(c.id)}">📍 ${esc(clAddr(c))}</button>` : ""), row("Work", esc(c.work || "")), row("Estimate", c.quote ? gbp(+c.quote) : "")].join("")}</div>
      <div class="actions" style="margin-top:6px">${tel ? `<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a><a class="btn" href="sms:${esc(tel)}">💬 Text</a>` : ""}<button type="button" class="btn" id="js-client">Open client</button></div></div>`
    : "";
  return `<div class="jssum"><div class="details">${jobRows}</div>${cl}</div>`;
}
function renderJobDetail() {
  const j = S.jobs.find((x) => x.id === S.openJob);
  if (!j) {
    $("viewer-body").innerHTML =
      '<div class="empty"><strong>This job has been removed</strong></div>';
    return;
  }
  setTimeout(() => {
    const b = $("js-client");
    if (b)
      b.onclick = () => {
        const c = jobClientOf(j);
        if (c) {
          S.openJob = null;
          viewClient(c);
        }
      };
  }, 0);
  const owner = ownerMode();
  const { n, d } = jobProgress(j);
  $("viewer-body").innerHTML = `<div class="day">
    <div><span class="tag ${j.kind === "snag" ? "day" : ""}">${JOB_KINDS[j.kind] || "Job sheet"}</span>${j.status === "closed" ? '<span class="tag ok">Signed off</span>' : ""}</div>
    <h3 style="font-family:var(--f-display);font-size:24px;margin:0;color:var(--accent);text-transform:uppercase;letter-spacing:.02em">${esc(j.title)}</h3>
    ${jobSummaryHtml(j, owner, n, d)}
    ${j.notes ? `<div class="notice" style="white-space:pre-line">${esc(j.notes)}</div>` : ""}
    ${
      (j.files || []).length
        ? `<div class="day"><div class="dayh"><span>Documents</span><span class="sum">${j.files.length}</span></div>
      ${j.files
        .map(
          (
            f,
            i,
          ) => `<div class="entry"><div class="main"><div class="job">${esc(f.name || f.fileName)}</div><div class="sub">${esc(f.fileName || "")}${f.size ? " · " + fsize(f.size) : ""}</div>
        <div class="filerow"><button type="button" class="pillbtn jf-open" data-i="${i}">Open</button>${FC.ids.has(f.assetId) ? '<span class="who">Kept in the app</span>' : ""}</div></div></div>`,
        )
        .join("")}
      ${j.files.some((f) => !FC.ids.has(f.assetId)) ? `<button type="button" class="pillbtn" id="jf-keep" style="align-self:flex-start">Keep all of these in the app</button>` : ""}</div>`
        : ""
    }
    ${(() => {
      const kd = keyDatesFor(j.site, j.id);
      return kd.length ? keyTimeline(kd, owner) : "";
    })()}
    <div class="prog big"><span style="width:${n ? Math.round((d / n) * 100) : 0}%"></span></div><div class="who">${d} of ${n} done</div>
    ${owner ? `<div class="actions"><button class="pillbtn" id="j-edit" type="button">Edit</button><button class="pillbtn" id="j-close" type="button">${j.status === "closed" ? "Reopen" : "Sign off as complete"}</button><button class="pillbtn" id="j-pdf" type="button">Download PDF</button><button class="linkdanger" id="j-del" type="button">Delete</button></div>` : ""}
    ${(() => {
      const rq = (
        owner ? allTeam("invoices") : S.mine.invoices.map((x) => Object.assign({ who: S.me }, x))
      ).filter((v) => v.kind === "materials" && v.jobId === j.id);
      return rq.length
        ? `<div class="notice">Materials & tools requested for this job: ${rq.map((r) => `${esc(matCount(r))} (${esc((MAT_ST[r.status || "sent"] || MAT_ST.sent)[0].toLowerCase())})`).join("; ")}. See the Materials & tools tab.</div>`
        : "";
    })()}
    <div class="jtasks">${(j.tasks || [])
      .map((t, i) => {
        const x = taskDone(j, t) || {};
        const ph = x.photos || [];
        return `<div class="jtask ${x.done ? "done" : ""}" data-t="${esc(t.id)}">
        <label class="jcheck"><input type="checkbox" class="j-tick" ${x.done ? "checked" : ""} ${j.status === "closed" ? "disabled" : ""} aria-label="Done: ${esc(t.text)}"></label>
        <div class="jbody"><div class="jtext"><span class="jnum">${i + 1}</span>${esc(t.text)}</div>${t.det ? `<div class="sub">${esc(t.det)}</div>` : ""}${t.pin && owner && j.site ? `<button type="button" class="pillbtn sq-pinbtn" style="align-self:flex-start">📍 Show on the drawing</button>` : ""}
          ${t.refPhoto ? `<div class="thumbs"><img src="${blobUrl(t.refPhoto)}" alt="Reference photo" class="j-img" data-id="${esc(t.refPhoto)}"><span class="who" style="align-self:center">Reference photo</span></div>` : ""}
          ${x.done ? `<div class="who">Done by ${esc(x.byName || "someone")} · ${stamp(x.at)}</div>` : x.byName ? `<div class="who">Last updated by ${esc(x.byName)} · ${stamp(x.at)}</div>` : ""}
          ${x.note ? `<div class="sub" style="white-space:pre-line">${esc(x.note)}</div>` : ""}
          ${ph.length ? `<div class="thumbs">${ph.map((id) => `<img src="${blobUrl(id)}" alt="Task photo" class="j-img" data-id="${esc(id)}">`).join("")}</div>` : ""}
          ${j.status !== "closed" ? `<button type="button" class="pillbtn j-add" style="align-self:flex-start">Add photo or note</button>` : ""}</div></div>`;
      })
      .join("")}</div></div>`;
  const vb = $("viewer-body");
  vb.querySelectorAll(".jtask").forEach((row) => {
    const t = j.tasks.find((x) => x.id === row.dataset.t);
    if (!t) return;
    const cb = row.querySelector(".j-tick");
    cb.onchange = () => setTask(j, t, { done: cb.checked });
    const add = row.querySelector(".j-add");
    if (add) add.onclick = () => openTaskExtra(j, t);
  });
  vb.querySelectorAll(".j-img").forEach((im) => (im.onclick = () => openPhotoFull(im.dataset.id)));
  vb.querySelectorAll(".sq-pinbtn").forEach((b) => (b.onclick = () => sqMap(j.site)));
  vb.querySelectorAll(".kd-row").forEach(
    (b) =>
      (b.onclick = () => {
        const p = planEntries().find((x) => x.id === b.dataset.p);
        if (!p) return;
        closeViewer();
        owner ? openPlanEditor(p) : openPlanView(p);
      }),
  );
  vb.querySelectorAll(".jf-open").forEach(
    (b) =>
      (b.onclick = () => {
        const f = j.files[+b.dataset.i];
        if (f) openFile(f.assetId, f.fileName || f.name, f.contentType);
      }),
  );
  if ($("jf-keep"))
    $("jf-keep").onclick = async () => {
      await keepFolder(j.files.map((f) => ({ assetId: f.assetId })));
      renderJobDetail();
    };
  if (owner) {
    $("j-edit").onclick = () => openJobEditor(j.kind, j);
    $("j-close").onclick = async () => {
      try {
        await S.db
          .doc("jobs/" + j.id)
          .update({ status: j.status === "closed" ? "open" : "closed", closedAt: Date.now() });
        toast(j.status === "closed" ? "Reopened" : "Signed off");
      } catch (e) {
        toast("Couldn't save");
      }
    };
    $("j-pdf").onclick = () => jobPdf(j);
    const del = $("j-del");
    let armed = false;
    del.onclick = async () => {
      if (!armed) {
        armed = true;
        del.textContent = "Tap again to delete";
        return;
      }
      try {
        await S.db.doc("jobs/" + j.id).delete();
        for (const t of j.tasks || []) {
          S.db
            .doc("jobdone/" + doneKey(j.id, t.id))
            .delete()
            .catch(() => {});
        }
        closeViewer();
        toast("Deleted");
      } catch (e) {
        toast("Couldn't delete");
      }
    };
  }
}
function openPhotoFull(id) {
  const back = S.openJob;
  S.openJob = null;
  openViewer(
    `<img src="${blobUrl(id)}" alt="Photo" style="width:100%;border-radius:8px"><div class="actions" style="margin-top:10px"><button class="btn primary" id="pf-save" type="button">Save photo</button><button class="btn" id="pf-back" type="button">Back to the list</button>${ownerMode() ? `<button class="btn delbtn" id="pf-del" type="button">🗑 Delete</button>` : ""}</div>`,
  );
  if ($("pf-del"))
    $("pf-del").onclick = () =>
      binFromViewer({ assets: [id], title: "Task photo", type: "image/jpeg", thumb: id }, () => {
        if (back) openJob(back);
        else closeViewer();
      });
  $("pf-save").onclick = () => saveAsset(id, "photo.jpg");
  $("pf-back").onclick = () => {
    if (back) openJob(back);
    else closeViewer();
  };
}
const myName = () =>
  ownerMode() ? ownerDisplayName() : (S.myProfile && S.myProfile.name) || "Someone";
async function setTask(j, t, patch, files) {
  const cur = taskDone(j, t) || {};
  const data = Object.assign(
    { jobId: j.id, taskId: t.id, done: !!cur.done, photos: cur.photos || [], note: cur.note || "" },
    patch,
    { by: S.me, byName: myName(), at: Date.now() },
  );
  S.jobdone[doneKey(j.id, t.id)] = Object.assign({}, data, { photos: data.photos.slice() });
  if (S.openJob === j.id) renderJobDetail();
  try {
    const r = await submitJob({
      path: "jobdone",
      coll: "jobdone",
      docId: doneKey(j.id, t.id),
      data,
      files: files || [],
    });
    if (r === "queued") toast("Kept on this phone. It will send when you have signal.");
  } catch (e) {
    toast(uploadErr(e));
  }
}
function openTaskExtra(j, t) {
  const cur = taskDone(j, t) || {};
  setFormType("taskextra");
  setEditing(null);
  openSheet(
    `<h3 id="sheettitle">Add photo or note</h3>
    <div class="who">${esc(t.text)}</div>
    <label for="te-photos">Photos (optional)<input id="te-photos" type="file" accept="image/*" multiple></label>
    <label for="te-note">Note (optional)<textarea id="te-note" maxlength="500" placeholder="e.g. Needs a second coat once dry">${esc(cur.note || "")}</textarea></label>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="te-done" ${cur.done || !cur.byName ? "checked" : ""}> Mark this task as done</label>
    ${formFoot(false, "Save")}`,
    async () => {
      const pics = [...($("te-photos").files || [])];
      if (pics.length && !S.assets) {
        showErr(
          "You don't have permission to upload photos. Ask James to make you an Editor on this page.",
        );
        return;
      }
      $("f-save").disabled = true;
      $("f-save").textContent = pics.length ? "Preparing photos…" : "Saving…";
      const files = [];
      for (const f of pics) {
        try {
          const ex = readExif(await f.slice(0, 262144).arrayBuffer());
          const takenAt = exifDate(ex.date) || f.lastModified || Date.now();
          files.push({
            blob: await stampPhoto(f, {
              site: (j.site || j.title) + " – " + t.text.slice(0, 60),
              takenAt,
              lat: ex.lat ?? null,
              lon: ex.lon ?? null,
              name: myName(),
            }),
            name: "task.jpg",
            field: "photos",
          });
        } catch (e) {
          showErr(
            'One photo couldn\'t be opened. Set your camera to save photos as JPG ("Most Compatible" on iPhone).',
          );
          $("f-save").disabled = false;
          $("f-save").textContent = "Save";
          return;
        }
      }
      closeForm();
      await setTask(j, t, { done: $("te-done").checked, note: $("te-note").value.trim() }, files);
      if (!files.length || navigator.onLine !== false)
        toast(
          files.length
            ? "Saved with " + files.length + " photo" + (files.length === 1 ? "" : "s")
            : "Saved",
        );
    },
    "te-note",
  );
}
let jobDraft = null;
function openJobEditor(kind, j) {
  const ids = teamIds();
  jobDraft = {
    tasks: (j ? j.tasks : [{ id: newId(), text: "" }]).map((t) => Object.assign({}, t)),
    files: ((j && j.files) || []).map((f) => Object.assign({}, f)),
    newFiles: [],
  };
  setFormType("jobedit");
  setEditing(j || null);
  const defSite = j ? j.site : S.f.proj || "";
  openSheet(
    `<h3 id="sheettitle">${j ? "Edit" : "New"} ${JOB_KINDS[kind].toLowerCase()}</h3>
    <label for="je-title">Title<input id="je-title" required maxlength="100" placeholder="${kind === "snag" ? "e.g. Final snags before handover" : "e.g. First fix – kitchen and utility"}" value="${esc(j ? j.title : "")}"></label>
    ${pickField("je-site", "Site (optional)", siteNames(), defSite, "e.g. 12 Marine Way, Exmouth", false)}
    <details class="jedet" ${j && j.det && Object.values(j.det).some(Boolean) ? "open" : ""}><summary><b>📝 Job details for the PDF</b> <span class="who">(fill in anything you want on the sheet)</span></summary>
      <div class="grid2">${JOB_DET.map(([k, l, ph, t]) => `<label for="jd-${k}">${esc(l)}<input id="jd-${k}" ${t ? `type="${t}"` : ""} maxlength="160" placeholder="${esc(ph || "")}" value="${esc((j && j.det && j.det[k]) || "")}"></label>`).join("")}</div>
      <label for="jd-scope">Description of the works<textarea id="jd-scope" maxlength="3000" placeholder="e.g. Remove existing kitchen, re-wire to new layout, plaster walls and ceiling, fit new kitchen units and worktops">${esc((j && j.det && j.det.scope) || "")}</textarea></label>
      <label for="jd-mats">Materials &amp; who supplies them<textarea id="jd-mats" maxlength="2000" placeholder="e.g. Units and worktops supplied by client. Plasterboard, skim and fixings by JEB">${esc((j && j.det && j.det.mats) || "")}</textarea></label>
      <label for="jd-hs">Health &amp; safety / special notes<textarea id="jd-hs" maxlength="1500" placeholder="e.g. Asbestos survey clear. Isolate power before starting. Dust sheets in the hallway">${esc((j && j.det && j.det.hs) || "")}</textarea></label></details>
    <div><div class="flabel">Who is it for? (optional: leave blank to keep it in the office)</div>
      ${ids.length ? `<div class="seg" id="je-who">${ids.map((id) => `<button type="button" data-v="${esc(id)}" aria-pressed="${j ? (j.assignees || []).includes(id) : false}">${esc(nameOf(id) + roleShort(id))}</button>`).join("")}</div>` : '<div class="nothing">No employees yet. Share the app with them first.</div>'}</div>
    <label for="je-due">Due date (optional)<input id="je-due" type="date" value="${esc(j ? j.due || "" : "")}"></label>
    <label for="je-notes">Notes for the team (optional)<textarea id="je-notes" maxlength="1000">${esc(j ? j.notes || "" : "")}</textarea></label>
    <div><div class="flabel">Documents (drawings, specs, RAMS, photos)</div><div id="je-files"></div>
      <label for="je-up" class="pillbtn" style="display:inline-flex;margin-top:6px;cursor:pointer">+ Upload files<input id="je-up" type="file" accept="application/pdf,image/*,.txt,.csv,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden></label>
      <button type="button" class="btn" id="je-sitepick" style="align-self:flex-start;margin-top:8px">📁 Add photos or files from the site…</button><select id="je-fromsite" hidden><option value="">Choose a file…</option></select>
      <div class="who">Workers open these inside the app. Nothing is downloaded to their phone.</div></div>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Tasks</span><span class="who">Press Enter for a new line</span></div><div id="je-tasks"></div>
      <div class="actions" style="margin-top:8px"><button type="button" class="pillbtn" id="je-add">+ Add task</button><button type="button" class="pillbtn" id="je-paste">Paste a list</button></div></div>
    <button type="button" class="btn" id="je-pdf" style="align-self:flex-start">📄 Make the PDF now</button>
    ${formFoot(false, j ? "Save changes" : "Save")}`,
    () => saveJob(kind),
    "je-title",
  );
  $("je-pdf").onclick = () => {
    const site = pickVal("je-site");
    const assignees = $("je-who")
      ? [...$("je-who").querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.v)
      : [];
    jobPdf({
      kind,
      title: $("je-title").value.trim() || JOB_KINDS[kind],
      site,
      assignees,
      assigneeNames: assignees.map(nameOf),
      due: $("je-due").value,
      notes: $("je-notes").value.trim(),
      det: jobDetRead(),
      tasks: jobDraft.tasks
        .filter((t) => (t.text || "").trim())
        .map((t) => ({
          id: t.id,
          text: t.text.trim(),
          det: (t.det || "").trim(),
          refPhoto: t.refPhoto || null,
        })),
      done: {},
      status: "open",
    });
  };
  const box = $("je-tasks");
  const draw = (focusIdx) => {
    box.innerHTML = jobDraft.tasks
      .map(
        (t, i) => `<div class="jrow" data-i="${i}"><span class="jnum">${i + 1}</span>
      <span class="jetx"><input class="je-t" id="je-t${i}" maxlength="300" value="${esc(t.text)}" placeholder="${kind === "snag" ? "e.g. Touch up paint on landing ceiling" : "e.g. Fit 4 double sockets in kitchen"}" aria-label="Task ${i + 1}"><input class="je-d" maxlength="400" value="${esc(t.det || "")}" placeholder="Details (optional): where, sizes, materials, quantity" aria-label="Task ${i + 1} details"></span>
      <label class="pillbtn je-ph" title="Reference photo">${t.refPhoto || t.refBlob ? "Photo ✓" : "Photo"}<input type="file" accept="image/*" hidden></label>
      <button type="button" class="linkdanger je-x" aria-label="Remove task ${i + 1}">✕</button></div>`,
      )
      .join("");
    box.querySelectorAll(".jrow").forEach((r) => {
      const i = +r.dataset.i,
        inp = r.querySelector(".je-t");
      inp.oninput = () => {
        jobDraft.tasks[i].text = inp.value;
      };
      const dl = r.querySelector(".je-d");
      dl.oninput = () => {
        jobDraft.tasks[i].det = dl.value;
      };
      inp.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          jobDraft.tasks.splice(i + 1, 0, { id: newId(), text: "" });
          draw(i + 1);
        }
      };
      r.querySelector(".je-ph input").onchange = (e) => {
        const f = e.target.files[0];
        if (f) {
          jobDraft.tasks[i].refBlob = f;
          draw();
        }
      };
      r.querySelector(".je-x").onclick = () => {
        jobDraft.tasks.splice(i, 1);
        if (!jobDraft.tasks.length) jobDraft.tasks.push({ id: newId(), text: "" });
        draw();
      };
    });
    if (focusIdx != null) {
      const el = $("je-t" + focusIdx);
      if (el) el.focus();
    }
  };
  draw();
  $("je-add").onclick = () => {
    jobDraft.tasks.push({ id: newId(), text: "" });
    draw(jobDraft.tasks.length - 1);
  };
  $("je-paste").onclick = () => {
    const ta = document.createElement("textarea");
    ta.placeholder = "Paste or type one task per line, then tap Add these";
    ta.style.minHeight = "120px";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pillbtn";
    b.textContent = "Add these";
    $("je-paste").replaceWith(ta);
    ta.after(b);
    ta.focus();
    b.onclick = () => {
      const lines = ta.value
        .split("\n")
        .map((x) => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
        .filter(Boolean);
      jobDraft.tasks = jobDraft.tasks
        .filter((t) => t.text.trim())
        .concat(lines.map((text) => ({ id: newId(), text })));
      if (!jobDraft.tasks.length) jobDraft.tasks.push({ id: newId(), text: "" });
      ta.value = "";
      draw();
    };
  };
  const drawFiles = () => {
    const box = $("je-files");
    const all = jobDraft.files
      .map((f, i) => ({ f, i, saved: true }))
      .concat(jobDraft.newFiles.map((f, i) => ({ f: { name: f.name }, i, saved: false })));
    box.innerHTML = all.length
      ? all
          .map(
            (x) =>
              `<div class="citem"><span>${esc(x.f.name)}${x.saved ? "" : ' <span class="who">(uploads when you save)</span>'}</span><button type="button" class="linkdanger je-rmf" data-s="${x.saved ? 1 : 0}" data-i="${x.i}" aria-label="Remove ${esc(x.f.name)}">✕</button></div>`,
          )
          .join("")
      : '<div class="nothing">No documents attached.</div>';
    box.querySelectorAll(".je-rmf").forEach(
      (b) =>
        (b.onclick = () => {
          (b.dataset.s === "1" ? jobDraft.files : jobDraft.newFiles).splice(+b.dataset.i, 1);
          drawFiles();
        }),
    );
  };
  const fillSite = () => {
    const site = pickVal("je-site");
    const docs = S.docs.filter(
      (d) => same(d.site || "General", site) || (d.site || "General") === "General",
    );
    $("je-fromsite").innerHTML =
      '<option value="">Choose a file…</option>' +
      docs
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .map(
          (d) =>
            `<option value="${esc(d.id)}">${esc((d.site || "General") + " › " + (docPath(d) ? docPath(d) + " › " : "") + (d.title || d.fileName))}</option>`,
        )
        .join("");
  };
  $("je-up").onchange = (e) => {
    const skipped = [];
    [...e.target.files].forEach((f) => {
      if (!typeFor(f)) skipped.push(f.name);
      else if (f.size > 20 * 1048576) skipped.push(f.name + " (over 20 MB)");
      else jobDraft.newFiles.push(f);
    });
    e.target.value = "";
    if (skipped.length)
      toast(
        "Can't attach: " + skipped.join(", ") + ". Save Word, Excel and CAD files as PDF first.",
      );
    drawFiles();
  };
  $("je-fromsite").onchange = (e) => {
    const d = S.docs.find((x) => x.id === e.target.value);
    if (d && !jobDraft.files.some((f) => f.assetId === d.assetId))
      jobDraft.files.push({
        assetId: d.assetId,
        name: d.title || d.fileName,
        fileName: d.fileName,
        contentType: d.contentType,
        size: d.size,
      });
    e.target.value = "";
    drawFiles();
  };
  $("je-sitepick").onclick = () =>
    siteFilePicker(
      pickVal("je-site") || "",
      jobDraft.files.map((f) => f.assetId),
      (items) => {
        items.forEach((it) => {
          if (!jobDraft.files.some((f) => f.assetId === it.assetId)) jobDraft.files.push(it);
        });
        drawFiles();
        toast(items.length === 1 ? "1 file added" : items.length + " files added");
      },
    );
  const siteSel = $("je-site");
  if (siteSel) siteSel.addEventListener("change", fillSite);
  const siteOther = $("je-site-other");
  if (siteOther) siteOther.addEventListener("input", fillSite);
  fillSite();
  drawFiles();
  jobDraft.redraw = drawFiles;
  const who = $("je-who");
  if (who)
    who
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
      );
}
/* pick photos, plans, RAMS, documents and drawings from a site: tabs, search and tick several */
function siteFilePicker(site, have, done) {
  have = new Set(have || []);
  const own = ownerMode();
  const docs = S.docs.filter(
    (d) =>
      d.assetId &&
      (!site || same(d.site || "General", site) || (d.site || "General") === "General"),
  );
  const photos = (own ? allTeam("photos") : S.mine.photos || [])
    .filter(
      (p) =>
        p.assetId &&
        !isSketch(p) &&
        !isVid(p) &&
        p.kind !== "audio" &&
        (!site || same(p.site, site)),
    )
    .sort((a, b) => (b.takenAt || b.created || 0) - (a.takenAt || a.created || 0));
  const draws = myDrawings().filter((p) => !site || !p.site || same(p.site, site));
  const item = (id, name, type, thumb, sub, from) => ({
    id,
    assetId: id,
    name,
    type,
    thumb,
    sub,
    from,
  });
  const all = {
    photos: photos.map((p) =>
      item(
        p.assetId,
        (p.caption || p.category || "Photo") +
          " " +
          (p.date || iso(new Date(p.takenAt || Date.now()))),
        "image/jpeg",
        true,
        [p.category, p.date ? shortDay(p.date) : "", own && p.who ? nameOf(p.who) : ""]
          .filter(Boolean)
          .join(" · "),
        "photo",
      ),
    ),
    plans: docs
      .filter((d) => d.cat === "plans")
      .map((d) =>
        item(
          d.assetId,
          d.title || d.fileName,
          d.contentType,
          isImg(d.contentType),
          docPath(d) || d.site || "General",
          "doc",
        ),
      ),
    rams: docs
      .filter((d) => d.cat === "rams")
      .map((d) =>
        item(
          d.assetId,
          d.title || d.fileName,
          d.contentType,
          isImg(d.contentType),
          docPath(d) || d.site || "General",
          "doc",
        ),
      ),
    specs: docs
      .filter((d) => d.cat !== "plans" && d.cat !== "rams")
      .map((d) =>
        item(
          d.assetId,
          d.title || d.fileName,
          d.contentType,
          isImg(d.contentType),
          docPath(d) || d.site || "General",
          "doc",
        ),
      ),
    draws: draws.map((p) =>
      item(
        p.assetId,
        p.title || "Drawing",
        "image/jpeg",
        true,
        stamp(p.editedAt || p.created),
        "drawing",
      ),
    ),
  };
  const tabs = [
    ["photos", "📷 Photos"],
    ["plans", "📐 Plans"],
    ["draws", "✏️ Drawings"],
    ["rams", "📝 RAMS"],
    ["specs", "📄 Specs & other"],
  ];
  let tab = tabs.find((t) => all[t[0]].length) ? tabs.find((t) => all[t[0]].length)[0] : "photos",
    q = "";
  const picked = new Map();
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "95";
  document.body.appendChild(d);
  const draw = () => {
    const list = (q ? Object.values(all).flat() : all[tab]).filter(
      (x) => !q || (x.name + " " + x.sub).toLowerCase().includes(q),
    );
    d.innerHTML = `<div class="dimbox sfp"><div class="sfphead"><b>📁 ${esc(site || "All sites")}</b><button type="button" class="sfpx" aria-label="Close">✕</button></div>
      <input type="search" class="sfpq" placeholder="🔍 Search photos and files" value="${esc(q)}">
      ${q ? "" : `<div class="sfptabs">${tabs.map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${k === tab}">${l} <span class="who">${all[k].length}</span></button>`).join("")}</div>`}
      <div class="sfpgrid">${list.map((x) => `<button type="button" class="sfpit${picked.has(x.id) ? " on" : ""}${have.has(x.id) ? " had" : ""}" data-id="${esc(x.id)}">${x.thumb ? `<img src="${blobUrl(x.id)}" alt="" loading="lazy">` : `<span class="sfpic">${/pdf/.test(x.type || "") ? "📄" : isWord({ type: x.type, name: x.name }) ? "📝" : "📎"}</span>`}<span class="sfpn">${esc(x.name)}</span><span class="who">${esc(x.sub || "")}</span>${have.has(x.id) ? '<span class="sfptick">✓ added</span>' : picked.has(x.id) ? '<span class="sfptick">✓</span>' : ""}</button>`).join("") || '<div class="nothing">Nothing here for this site.</div>'}</div>
      <div class="dimbtns"><button type="button" class="btn sfpc">Cancel</button><button type="button" class="btn primary sfpok" ${picked.size ? "" : "disabled"}>Add ${picked.size || ""}</button></div></div>`;
    d.querySelector(".sfpx").onclick = d.querySelector(".sfpc").onclick = () => d.remove();
    d.querySelectorAll(".sfptabs button").forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.t;
          draw();
        }),
    );
    d.querySelectorAll(".sfpit").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.id;
          if (have.has(id)) return;
          if (picked.has(id)) picked.delete(id);
          else
            picked.set(
              id,
              Object.values(all)
                .flat()
                .find((x) => x.id === id),
            );
          draw();
        }),
    );
    const qi = d.querySelector(".sfpq");
    qi.oninput = () => {
      q = qi.value.trim().toLowerCase();
      const pos = qi.selectionStart;
      draw();
      const n = d.querySelector(".sfpq");
      n.focus();
      try {
        n.setSelectionRange(pos, pos);
      } catch (e) {}
    };
    d.querySelector(".sfpok").onclick = () => {
      const items = [...picked.values()].map((x) => ({
        assetId: x.id,
        name: x.name,
        fileName: x.name + (x.thumb ? ".jpg" : /pdf/.test(x.type || "") ? ".pdf" : ""),
        contentType: x.type || "image/jpeg",
      }));
      d.remove();
      done(items);
    };
  };
  draw();
}
async function saveJob(kind) {
  const title = $("je-title").value.trim(),
    site = pickVal("je-site");
  const assignees = $("je-who")
    ? [...$("je-who").querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.v)
    : [];
  const tasks = jobDraft.tasks.filter((t) => t.text.trim());
  if (!title) {
    showErr("Add a title.");
    return;
  }

  if (!tasks.length) {
    showErr("Add at least one task.");
    return;
  }
  $("f-save").disabled = true;
  $("f-save").textContent = "Saving…";
  try {
    for (const t of tasks) {
      if (t.refBlob) {
        const ex = readExif(await t.refBlob.slice(0, 262144).arrayBuffer());
        const blob = await stampPhoto(t.refBlob, {
          site: (site || "Job") + " – " + t.text.slice(0, 60),
          takenAt: exifDate(ex.date) || t.refBlob.lastModified || Date.now(),
          lat: ex.lat ?? null,
          lon: ex.lon ?? null,
          name: myName(),
        });
        const up = await uploadFile(blob, "ref.jpg");
        t.refPhoto = up.id;
        delete t.refBlob;
      }
    }
    while (jobDraft.newFiles.length) {
      const f = jobDraft.newFiles[0];
      $("f-save").textContent = "Uploading " + f.name + "…";
      const type = typeFor(f);
      const up = await S.assets.upload(f, { type });
      jobDraft.files.push({
        assetId: up.id,
        name: f.name.replace(/\.[^.]+$/, ""),
        fileName: f.name,
        contentType: up.contentType || type,
        size: up.sizeBytes || f.size,
      });
      jobDraft.newFiles.shift();
    }
    const data = {
      kind,
      title,
      site: site || "",
      assignees,
      assigneeNames: assignees.map(nameOf),
      due: $("je-due").value,
      notes: $("je-notes").value.trim(),
      det: jobDetRead(),
      files: jobDraft.files.slice(),
      tasks: tasks.map((t) => ({
        id: t.id,
        text: t.text.trim(),
        det: (t.det || "").trim(),
        refPhoto: t.refPhoto || null,
      })),
      status: editing ? editing.status || "open" : "open",
      updated: Date.now(),
    };
    const id = editing ? editing.id : newId();
    await S.db
      .doc("jobs/" + id)
      .set(Object.assign({ created: (editing && editing.created) || Date.now() }, data));
    closeForm();
    toast(
      editing
        ? "Saved"
        : data.assigneeNames.length
          ? `Sent to ${data.assigneeNames.join(", ")}`
          : "Saved. Not sent to anyone yet",
    );
    S.f.jobs = "open";
    render();
  } catch (e) {
    showErr(uploadErr(e));
    $("f-save").disabled = false;
    $("f-save").textContent = editing ? "Save changes" : "Create and send";
  }
}
async function jobPdf(j) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  toast("Making the PDF…");
  try {
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't load the PDF maker. Check your connection.");
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
  const dataUrl = async (id) => {
    const r = await fetch(blobUrl(id));
    const b = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(b);
    });
  };
  doc.setFillColor(...BRGB());
  doc.rect(0, 0, W, 6, "F");
  await pdfLogo(doc, W - M, 11, 52, 24);
  text(coData().name.toUpperCase(), 9, "bold", 0, 6);
  text(JOB_KINDS[j.kind] || "Job sheet", 18, "bold", 0, 2);
  text(j.title, 12, "bold", 0, 2);
  const D = j.det || {};
  const kv = (l, v) => {
    if (!v) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const ls = doc.splitTextToSize(clean(v), W - 2 * M - 46);
    need(ls.length * 4.3 + 1);
    doc.text(clean(l), M, y);
    doc.setFont("helvetica", "normal");
    ls.forEach((ln, i) => doc.text(ln, M + 46, y + i * 4.3));
    y += ls.length * 4.3 + 1.2;
  };
  kv("Reference", D.ref);
  kv("Client", D.client);
  kv("Client phone", D.phone);
  kv("Address", D.address || (j.site && j.site !== "General" ? j.site : ""));
  kv("Site", D.address && j.site ? j.site : "");
  kv("Contact on site", D.contact);
  kv("Start", D.start ? shortDay(D.start) : "");
  kv("Due", j.due ? shortDay(j.due) : "");
  kv("Working hours", D.hours);
  kv("Access & parking", D.access);
  kv("For", (j.assigneeNames || []).join(", "));
  kv("Price", D.price);
  y += 2;
  if (D.scope) {
    text("Description of the works", 11, "bold", 0, 1);
    text(D.scope, 9.5, "normal", 0, 3);
  }
  const { n, d } = jobProgress(j);
  text(
    `${d} of ${n} tasks done${j.status === "closed" && j.closedAt ? " · signed off " + stamp(j.closedAt) : ""}`,
    10,
    "bold",
    0,
    3,
  );
  if (j.notes) {
    text("Notes for the team", 11, "bold", 0, 1);
    text(j.notes, 9.5, "normal", 0, 3);
  }
  if ((j.tasks || []).length) text(j.kind === "snag" ? "Snags" : "Tasks", 11, "bold", 0, 2);
  for (let i = 0; i < (j.tasks || []).length; i++) {
    const t = j.tasks[i],
      x = taskDone(j, t) || {};
    need(10);
    doc.setDrawColor(60);
    doc.rect(M, y - 3.4, 4, 4);
    if (x.done) {
      doc.setLineWidth(0.6);
      doc.line(M + 0.8, y - 1.5, M + 1.8, y - 0.3);
      doc.line(M + 1.8, y - 0.3, M + 3.4, y - 2.8);
      doc.setLineWidth(0.2);
    }
    text(`${i + 1}. ${t.text}`, 10, "bold", 7, 0.6);
    if (t.det) text(t.det, 9, "normal", 7, 0.6);
    if (x.done) text(`Done by ${x.byName || ""} · ${stamp(x.at)}`, 8.5, "normal", 7, 0.6);
    if (x.note) text(x.note, 9, "normal", 7, 0.6);
    for (const id of (x.photos || []).slice(0, 4)) {
      try {
        const u = await dataUrl(id);
        const p = doc.getImageProperties(u);
        const w = 70,
          h = (w * p.height) / p.width;
        need(h + 3);
        doc.addImage(u, "JPEG", M + 7, y, w, h);
        y += h + 3;
      } catch (e) {}
    }
    y += 2;
  }
  if (D.mats) {
    need(14);
    y += 2;
    text("Materials", 11, "bold", 0, 1);
    text(D.mats, 9.5, "normal", 0, 3);
  }
  if (D.hs) {
    need(14);
    text("Health & safety / special notes", 11, "bold", 0, 1);
    text(D.hs, 9.5, "normal", 0, 3);
  }
  need(30);
  y += 4;
  [
    ["Completed by", ""],
    ["Checked by", ""],
  ].forEach(([l]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(l, M, y);
    doc.setDrawColor(150);
    doc.line(M + 32, y, M + 110, y);
    doc.line(M + 120, y, W - M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Signature", M + 32, y + 3.5);
    doc.text("Date", M + 120, y + 3.5);
    y += 13;
  });
  const fn = `${JOB_KINDS[j.kind] || "Job sheet"} - ${clean(j.title)
    .replace(/[^\w\s-]/g, "")
    .trim()}.pdf`;
  try {
    await S.dl.save({ filename: fn, data: doc.output("blob") });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
