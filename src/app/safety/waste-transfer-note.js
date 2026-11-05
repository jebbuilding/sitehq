/* ================= WASTE TRANSFER NOTE (WMC2A layout): sections A–D, signed on the tab, one-page PDF, sent on ================= */
import { clAddr } from "../clients/stages-planner.js";
import { askOwnerPin } from "../core/dictation.js";
import { $, esc, iso, pad, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { pdfShow } from "../drawing/paving.js";
import { uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { SENDTO } from "../files/send-to.js";
import { coData } from "../owner/company-details.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { auditFirst } from "../owner/deletion-record.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "./site-inductions.js";
export { WTN };
const WTN = (() => {
  const q = (id) => document.getElementById("wt-" + id);
  const EWC = [
    ["17 09 04", "Mixed construction & demolition waste"],
    ["17 01 01", "Concrete"],
    ["17 01 02", "Bricks"],
    ["17 01 03", "Tiles & ceramics"],
    ["17 01 07", "Mixed concrete, bricks, tiles"],
    ["17 05 04", "Soil & stones"],
    ["17 02 01", "Wood"],
    ["17 02 02", "Glass"],
    ["17 02 03", "Plastic"],
    ["17 04 05", "Iron & steel"],
    ["17 04 07", "Mixed metals"],
    ["17 04 11", "Cables"],
    ["17 03 02", "Tarmac / bituminous (no coal tar)"],
    ["17 06 04", "Insulation (non-hazardous)"],
    ["17 08 02", "Plasterboard / gypsum"],
    ["20 03 01", "Mixed general waste"],
    ["20 02 01", "Green waste"],
    ["20 03 07", "Bulky waste"],
    ["15 01 01", "Paper & card packaging"],
    ["15 01 02", "Plastic packaging"],
    ["15 01 06", "Mixed packaging"],
    ["17 06 05*", "Asbestos – HAZARDOUS, consignment note needed"],
    ["17 09 03*", "Contaminated C&D waste – HAZARDOUS"],
    ["17 03 01*", "Coal-tar tarmac – HAZARDOUS"],
  ];
  const CONT = ["Loose", "Sacks", "Skip", "Drum", "Other"];
  const DEFAULT_CARRIER = "CBDU510140";
  const recs = () => (S.wtns || []).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const sups = () =>
    (S.suppliers || [])
      .slice()
      .sort(
        (a, b) =>
          (/waste|skip|aggregat|tip/i.test(b.cat + b.name) ? 1 : 0) -
            (/waste|skip|aggregat|tip/i.test(a.cat + a.name) ? 1 : 0) ||
          a.name.localeCompare(b.name),
      );
  let R = null,
    saveT = null;
  function css() {
    if (document.getElementById("wt-css")) return;
    const st = document.createElement("style");
    st.id = "wt-css";
    st.textContent = `
.wt{display:flex;flex-direction:column;gap:10px}.wt h4{margin:12px 0 2px;font-size:15px;font-family:var(--f-display);color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:3px}.wt h5{margin:6px 0 0;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.wt .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.wt label.wf{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);min-width:0}
.wt input,.wt select,.wt textarea{width:100%;min-height:42px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font-size:15px}
.wt .ck{display:flex;align-items:center;gap:8px;font-size:14px;padding:6px 0}.wt .ck input{width:22px;height:22px;min-height:0;margin:0;accent-color:var(--accent)}
.wt .line{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 36px;gap:6px;align-items:end;padding:8px;border:1px solid var(--line);border-radius:8px}
.wt .sigbox{border:1px dashed var(--line);border-radius:10px;padding:10px;background:var(--bg)}.wt .sigbox canvas{width:100%;height:150px;background:#fff;border-radius:8px;touch-action:none;display:block}
.wt .sigbox img{max-width:100%;max-height:150px;background:#fff;border-radius:8px;display:block}.wt .done{color:var(--ok,#2e7d4f);font-weight:600;font-size:13px}
.wt .warn{background:#fbe9e7;color:#8a2e20;border-radius:8px;padding:8px 10px;font-size:13px}.wt .ok{background:var(--soft);border-radius:8px;padding:8px 10px;font-size:13px}
.wt .seg button{padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg);font-weight:600;font-size:14px}.wt .seg button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.wtl{display:flex;flex-direction:column;gap:6px}.wtl .wtr{display:flex;gap:8px;align-items:center}.wtl .wtr>button:first-child{flex:1;min-width:0;text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}`;
    document.head.appendChild(st);
  }
  const today = () => iso(new Date()),
    nowHM = () => {
      const d = new Date();
      return pad(d.getHours()) + ":" + pad(d.getMinutes());
    };
  const ourCarrier = () =>
    coData().wasteCarrier ||
    recs()
      .map(
        (r) =>
          (r.C && r.C.role === "us" && r.C.carrierNo) ||
          (r.B && r.B.role === "us" && r.B.carrierNo),
      )
      .find(Boolean) ||
    DEFAULT_CARRIER;
  function party(role) {
    const co = coData();
    const p = {
      role,
      clientId: "",
      supId: "",
      siteId: "",
      name: "",
      company: "",
      addr: "",
      postcode: "",
      sic: "",
      council: "",
      isLA: false,
      is: {
        producer: false,
        importer: false,
        la: false,
        permit: false,
        exempt: false,
        carrier: false,
      },
      permitNo: "",
      permitBy: "",
      exemptDetails: "",
      carrierNo: "",
      carrierKind: "",
    };
    if (role === "us") {
      const ad = String(co.address || "").replace(/\n/g, ", ");
      const m = ad.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
      p.name = co.owner || "";
      p.company = co.name || "";
      p.addr = m ? ad.slice(0, m.index).replace(/[,\s]+$/, "") : ad;
      p.postcode = m ? m[1].toUpperCase() : "";
      p.sic = "41202";
      p.is.carrier = true;
      p.carrierNo = ourCarrier();
      p.carrierKind = "Carrier";
    }
    return p;
  }
  function blank() {
    return {
      id: "wtn-" + newId(),
      kind: "wtn",
      v: 2,
      created: Date.now(),
      ref:
        "WTN-" +
        today().replace(/-/g, "").slice(2) +
        "-" +
        String((S.wtns || []).length + 1).padStart(2, "0"),
      A: {
        lines: [{ desc: "Mixed construction & demolition waste", code: "17 09 04" }],
        cont: { Loose: false, Sacks: false, Skip: true, Drum: false, Other: false },
        contOther: "",
        qty: "",
      },
      B: Object.assign(party("client"), {
        council: "EDDC",
        hier: true,
        is: {
          producer: true,
          importer: false,
          la: false,
          permit: false,
          exempt: false,
          carrier: false,
        },
      }),
      C: party("us"),
      D: {
        addr: "",
        postcode: "",
        date: today(),
        time: nowHM(),
        broker: { name: "", addr: "", postcode: "", reg: "" },
      },
      sigs: {},
      pdf: null,
      sent: [],
      notes: "",
    };
  }
  function upgrade(r) {
    if (r.v === 2) return r;
    const n = blank();
    n.id = r.id;
    n.ref = r.ref || n.ref;
    n.created = r.created || n.created;
    if (r.lines)
      n.A.lines = r.lines.map((l) => ({ desc: l.desc || "", code: l.ewc || "17 09 04" }));
    n.D.date = r.date || n.D.date;
    n.D.time = r.time || n.D.time;
    n.D.addr = r.transferAddr || r.site || "";
    n.sigs = {};
    n.pdf = null;
    n.sent = r.sent || [];
    return n;
  }
  async function persist() {
    if (!R) return;
    R.updated = Date.now();
    const d = JSON.parse(JSON.stringify(R));
    delete d.id;
    await S.db.doc("todos/" + R.id).set(d);
    S.wtns = (S.wtns || [])
      .filter((x) => x.id !== R.id)
      .concat([Object.assign({}, d, { id: R.id })]);
  }
  function dirty() {
    const el = q("sv");
    if (el) el.textContent = "Saving…";
    clearTimeout(saveT);
    saveT = setTimeout(
      () =>
        persist()
          .then(() => {
            const e2 = q("sv");
            if (e2) e2.textContent = "Saved";
          })
          .catch(() => {
            const e2 = q("sv");
            if (e2) e2.textContent = "Not saved – check your connection";
            toast("Not saved – check your connection");
          }),
      800,
    );
  }
  const locked = () => !!(R.sigs.B || R.sigs.C);
  const hazard = () => R.A.lines.some((l) => /\*/.test(l.code));
  function read() {
    if (!R || locked()) return;
    R.A.lines = [...document.querySelectorAll(".wt .line")].map((l) => ({
      desc: l.querySelector("[data-k=desc]").value.trim(),
      code: l.querySelector("[data-k=code]").value,
    }));
    CONT.forEach((c) => (R.A.cont[c] = q("cont-" + c).checked));
    R.A.contOther = q("contOther").value.trim();
    R.A.qty = q("qty").value.trim();
    for (const k of ["B", "C"]) {
      const p = R[k];
      [
        "name",
        "company",
        "addr",
        "postcode",
        "sic",
        "council",
        "permitNo",
        "permitBy",
        "exemptDetails",
        "carrierNo",
        "carrierKind",
      ].forEach((f) => {
        const el = q(k + "-" + f);
        if (el) p[f] = el.value.trim();
      });
      ["producer", "importer", "la", "permit", "exempt", "carrier"].forEach((f) => {
        const el = q(k + "-is-" + f);
        if (el) p.is[f] = el.checked;
      });
      const la = q(k + "-isLA");
      if (la) p.isLA = la.checked;
      if (k === "B") {
        const h = q("B-hier");
        if (h) p.hier = h.checked;
      }
      const cl = q(k + "-cl");
      if (cl) p.clientId = cl.value;
      const su = q(k + "-sup");
      if (su) p.supId = su.value;
    }
    R.D.addr = q("D-addr").value.trim();
    R.D.postcode = q("D-postcode").value.trim();
    R.D.siteId = q("D-site").value;
    R.D.date = q("D-date").value;
    R.D.time = q("D-time").value;
    ["name", "addr", "postcode", "reg"].forEach(
      (f) => (R.D.broker[f] = q("D-b-" + f).value.trim()),
    );
    R.notes = q("notes").value.trim();
  }
  function open(rec) {
    if (!ownerMode()) {
      toast("Only the owner can do waste transfer notes");
      return;
    }
    css();
    R = rec ? upgrade(JSON.parse(JSON.stringify(rec))) : blank();
    draw();
  }
  function partyHtml(k, p, L) {
    const d = L ? "disabled" : "";
    const isB = k === "B";
    const roles = isB
      ? [
          ["client", "Client"],
          ["us", coData().name || "Us"],
          ["other", "Someone else"],
        ]
      : [
          ["us", coData().name || "Us"],
          ["supplier", "Skip / waste company"],
          ["other", "Someone else"],
        ];
    const clOpts = ['<option value="">– pick a client –</option>']
      .concat(
        (S.clients || [])
          .filter((c) => !c.archived)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map(
            (c) =>
              `<option value="${esc(c.id)}" ${c.id === p.clientId ? "selected" : ""}>${esc(c.name || "")}${c.postcode ? " · " + esc(c.postcode) : ""}</option>`,
          ),
      )
      .join("");
    const supOpts = ['<option value="">– pick a supplier –</option>']
      .concat(
        sups().map(
          (s) =>
            `<option value="${esc(s.id)}" ${s.id === p.supId ? "selected" : ""}>${esc(s.name)}${s.cat ? " · " + esc(s.cat) : ""}</option>`,
        ),
      )
      .join("");
    const ck = (f, lab) =>
      `<label class="ck"><input type="checkbox" id="wt-${k}-is-${f}" ${p.is[f] ? "checked" : ""} ${d}>${lab}</label>`;
    return `<div class="seg" role="group" aria-label="Who">${roles.map(([v, l]) => `<button type="button" data-role="${v}" data-party="${k}" aria-pressed="${p.role === v}" ${d}>${esc(l)}</button>`).join("")}</div>
   ${p.role === "client" ? `<label class="wf">Client<select id="wt-${k}-cl" ${d}>${clOpts}</select></label>` : p.role === "supplier" ? `<label class="wf">Supplier<select id="wt-${k}-sup" ${d}>${supOpts}</select></label>` : ""}
   ${isB ? `<label class="ck"><input type="checkbox" id="wt-B-hier" ${p.hier ? "checked" : ""} ${d}>By signing in Section D the transferor confirms the waste hierarchy has been applied (Regulation 12, Waste (England and Wales) Regulations 2011)</label>` : ""}
   <div class="row"><label class="wf">${isB ? "B1" : "C1"} Full name<input id="wt-${k}-name" value="${esc(p.name)}" ${d}></label><label class="wf">Company name<input id="wt-${k}-company" value="${esc(p.company)}" ${d} placeholder="leave blank for a householder"></label><label class="wf" style="grid-column:1/-1">Address<input id="wt-${k}-addr" value="${esc(p.addr)}" ${d}></label><label class="wf">Postcode<input id="wt-${k}-postcode" value="${esc(p.postcode)}" ${d}></label>
   ${isB ? `<label class="wf">SIC code (2007)<input id="wt-B-sic" value="${esc(p.sic)}" ${d} placeholder="blank for a householder"></label><label class="wf">B2 Unitary authority / council<input id="wt-B-council" list="wt-councils" value="${esc(p.council)}" ${d} placeholder="e.g. EDDC"><datalist id="wt-councils">${["EDDC – East Devon District Council", "Exeter City Council", "Teignbridge District Council", "Mid Devon District Council", "South Hams District Council", "Torbay Council", "Plymouth City Council", "Devon County Council", "Somerset Council", "Dorset Council"].map((x) => `<option value="${x}">`).join("")}</datalist></label>` : `<label class="ck" style="align-self:end"><input type="checkbox" id="wt-C-isLA" ${p.isLA ? "checked" : ""} ${d}>C2 The local authority?</label>`}</div>
   <h5>${isB ? "B3" : "C3"} Are you…</h5><div class="row" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
   ${isB ? ck("producer", "The producer of the waste?") + ck("importer", "The importer of the waste?") + ck("la", "The local authority?") : ""}
   ${ck("permit", "The holder of an environmental permit?")}<label class="wf">Permit number<input id="wt-${k}-permitNo" value="${esc(p.permitNo)}" ${d}></label><label class="wf">Issued by<input id="wt-${k}-permitBy" value="${esc(p.permitBy)}" ${d}></label>
   ${ck("exempt", "Registered waste exemption?")}<label class="wf" style="grid-column:span 2">Details, including registration number<input id="wt-${k}-exemptDetails" value="${esc(p.exemptDetails)}" ${d}></label>
   ${ck("carrier", "A registered waste carrier, broker or dealer?")}<label class="wf">Registration number<input id="wt-${k}-carrierNo" value="${esc(p.carrierNo)}" ${d} placeholder="CBDU…"></label><label class="wf">Carrier, broker or dealer?<select id="wt-${k}-carrierKind" ${d}><option value="">– leave blank –</option>${["Carrier", "Broker", "Dealer", "Carrier & broker", "Carrier, broker & dealer"].map((x) => `<option ${x === p.carrierKind ? "selected" : ""}>${x}</option>`).join("")}</select></label></div>`;
  }
  function sigHtml(k, title, p) {
    const s = R.sigs[k];
    return `<div class="sigbox"><b>${title}</b><div class="who" style="margin-bottom:6px">${esc(p.company || p.name || "")}</div>${s ? `<img src="${s.img}" alt="Signature"><div class="done">✓ ${esc(s.name)}${s.rep ? " for " + esc(s.rep) : ""} · ${esc(stamp(s.at))}</div>` : `<div class="row" style="margin-bottom:6px"><input id="wt-sn-${k}" placeholder="Name" value="${esc(p.name || "")}"><input id="wt-sr-${k}" placeholder="Representing" value="${esc(p.company || "")}"></div><canvas id="wt-sc-${k}" class="sigpad" aria-label="Sign here" style="touch-action:none"></canvas><div class="actions" style="margin-top:6px"><button type="button" class="btn" id="wt-sclr-${k}">Clear</button><button type="button" class="btn primary" id="wt-sok-${k}">✍️ Sign</button></div>`}</div>`;
  }
  function draw() {
    const L = locked(),
      d = L ? "disabled" : "";
    const line = (l, i) =>
      `<div class="line"><label class="wf">Description of the waste<input data-k="desc" value="${esc(l.desc)}" ${d}></label><label class="wf">List of Waste code<select data-k="code" ${d}>${EWC.map(([c, n]) => `<option value="${c}" ${c === l.code ? "selected" : ""}>${c} ${n}</option>`).join("")}</select></label>${L ? "<span></span>" : `<button type="button" class="iconbtn wt-rm" data-i="${i}" aria-label="Remove">✕</button>`}</div>`;
    openViewer(`<span class="tag">♻️ Duty of care</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 4px;color:var(--accent)">Waste transfer note ${esc(R.ref)}</h3>
  <div class="who">Same sections as the government WMC2A form. ${L ? "<b>Signed – locked.</b>" : "Fill it in, sign on the tab, make the one-page PDF, send it on. Keep it for 2 years."}</div>
  <div class="actions" style="margin:8px 0"><button type="button" class="btn" id="wt-save2">💾 Save</button><button type="button" class="btn delbtn" id="wt-del2">🗑 Delete this note</button></div>
  <div class="wt">
   ${hazard() ? `<div class="warn">⚠ A hazardous code is listed (asbestos, contaminated or coal-tar). That needs a hazardous waste consignment note, not this form.</div>` : ""}
   <h4>Section A – Description of waste</h4><h5>A1 Description and List of Waste Regulations code(s)</h5><div id="wt-lines">${R.A.lines.map(line).join("")}</div>${L ? "" : `<div class="actions"><button type="button" class="btn" id="wt-add">+ Another waste type</button></div>`}
   <h5>A2 How is the waste contained?</h5><div class="row" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${CONT.map((c) => `<label class="ck"><input type="checkbox" id="wt-cont-${c}" ${R.A.cont[c] ? "checked" : ""} ${d}>${c}</label>`).join("")}<label class="wf">Other – what?<input id="wt-contOther" value="${esc(R.A.contOther)}" ${d}></label></div>
   <label class="wf">A3 How much waste? (e.g. 1 × 8 yd skip, 12 sacks, approx 2 tonnes)<input id="wt-qty" value="${esc(R.A.qty)}" ${d}></label>
   <h4>Section B – Current holder of the waste – Transferor</h4>${partyHtml("B", R.B, L)}
   <h4>Section C – Person collecting the waste – Transferee</h4>${partyHtml("C", R.C, L)}
   <h4>Section D – The transfer</h4><div class="row"><label class="wf" style="grid-column:1/-1">Transfer site – where the waste is going <span class="who">(set them up in Setup › Company › Waste transfer sites)</span><select id="wt-D-site" ${d}><option value="">– pick a transfer site, or type the address below –</option>${wsites()
     .map(
       (w) =>
         `<option value="${esc(w.id)}" ${w.id === R.D.siteId ? "selected" : ""}>${esc(w.name)} · ${esc(w.company)}${w.permitNo ? " · permit " + esc(w.permitNo) : ""}</option>`,
     )
     .join(
       "",
     )}</select></label><label class="wf" style="grid-column:1/-1">D1 Address of transfer or collection point<input id="wt-D-addr" value="${esc(R.D.addr)}" ${d}></label><label class="wf">Postcode<input id="wt-D-postcode" value="${esc(R.D.postcode)}" ${d}></label><label class="wf">Date of transfer<input type="date" id="wt-D-date" value="${R.D.date}" ${d}></label><label class="wf">Time(s)<input id="wt-D-time" value="${esc(R.D.time)}" ${d}></label></div>
   <h5>D2 Broker or dealer who arranged this transfer (if applicable)</h5><div class="row"><label class="wf">Name<input id="wt-D-b-name" value="${esc(R.D.broker.name)}" ${d}></label><label class="wf">Address<input id="wt-D-b-addr" value="${esc(R.D.broker.addr)}" ${d}></label><label class="wf">Postcode<input id="wt-D-b-postcode" value="${esc(R.D.broker.postcode)}" ${d}></label><label class="wf">Registration number<input id="wt-D-b-reg" value="${esc(R.D.broker.reg)}" ${d}></label></div>
   <label class="wf">Notes (not on the form)<textarea id="wt-notes" rows="2" ${d}>${esc(R.notes)}</textarea></label>
   <h5>Signatures</h5><div class="row" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${sigHtml("B", "Transferor's signature", R.B)}${sigHtml("C", "Transferee's signature", R.C)}</div>
   ${R.pdf ? `<div class="ok">📄 PDF made ${esc(stamp(R.pdf.at))}${R.sent.length ? ` · sent ${R.sent.map((s) => esc(s.to) + " (" + esc(stamp(s.at)) + ")").join(", ")}` : ""}</div>` : ""}
   <div class="actions"><button type="button" class="btn" id="wt-save">💾 Save</button><span class="who" id="wt-sv" style="align-self:center"></span><button type="button" class="btn primary" id="wt-pdf">📄 Make the PDF</button><button type="button" class="btn" id="wt-send" ${R.pdf ? "" : "disabled"}>📤 Send</button>${L ? `<button type="button" class="btn" id="wt-unlock">🔓 Unlock to change</button>` : ""}<button type="button" class="btn delbtn" id="wt-del" style="margin-left:auto">🗑 Delete</button></div>
  </div>`);
    wire();
  }
  function fillFromClient(p, c) {
    p.name = c.name || "";
    p.company = "";
    const ad = clAddr(c) || "";
    p.addr = (c.address || "").split("\n").join(", ");
    p.postcode = c.postcode || "";
    p.clientId = c.id;
    p.sic = "";
    if (!R.D.addr) {
      R.D.addr = p.addr;
      R.D.postcode = p.postcode;
    }
  }
  function fillFromSup(p, s) {
    p.name = s.contact || "";
    p.company = s.name || "";
    const ad = s.branch || "";
    const m = ad.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
    p.addr = m ? ad.slice(0, m.index).replace(/[,\s]+$/, "") : ad;
    p.postcode = m ? m[1].toUpperCase() : "";
    p.supId = s.id;
    if (s.wasteCarrier) {
      p.is.carrier = true;
      p.carrierNo = s.wasteCarrier;
    }
    if (s.wastePermit) {
      p.is.permit = true;
      p.permitNo = s.wastePermit;
    }
  }
  function wire() {
    const V = $("viewer-body");
    V.querySelectorAll(".wt input,.wt select,.wt textarea").forEach((el) => {
      el.addEventListener("change", () => {
        read();
        dirty();
      });
      if (el.tagName !== "SELECT" && el.type !== "checkbox")
        el.addEventListener("input", () => {
          read();
          dirty();
        });
    });
    V.querySelectorAll("[data-role]").forEach(
      (b) =>
        (b.onclick = () => {
          read();
          const k = b.dataset.party;
          const role = b.dataset.role;
          if (R[k].role === role) return;
          const keep = k === "B" ? { council: R.B.council, hier: R.B.hier } : {};
          R[k] = Object.assign(party(role), keep);
          if (k === "B" && role !== "us") R.B.is.producer = true;
          dirty();
          draw();
        }),
    );
    const bcl = q("B-cl");
    if (bcl)
      bcl.onchange = () => {
        const c = (S.clients || []).find((x) => x.id === bcl.value);
        if (c) {
          read();
          fillFromClient(R.B, c);
          dirty();
          draw();
        }
      };
    const ccl = q("C-cl");
    if (ccl)
      ccl.onchange = () => {
        const c = (S.clients || []).find((x) => x.id === ccl.value);
        if (c) {
          read();
          fillFromClient(R.C, c);
          dirty();
          draw();
        }
      };
    ["B", "C"].forEach((k) => {
      const su = q(k + "-sup");
      if (su)
        su.onchange = () => {
          const s = (S.suppliers || []).find((x) => x.id === su.value);
          if (s) {
            read();
            fillFromSup(R[k], s);
            dirty();
            draw();
          }
        };
    });
    q("D-site").onchange = () => {
      read();
      const w = wsites().find((x) => x.id === q("D-site").value);
      R.D.siteId = w ? w.id : "";
      if (w) {
        R.D.addr = w.addr || "";
        R.D.postcode = w.postcode || "";
        R.D.siteName = w.name;
      }
      dirty();
      draw();
    };
    if (q("add"))
      q("add").onclick = () => {
        read();
        R.A.lines.push({ desc: "", code: "17 09 04" });
        dirty();
        draw();
      };
    V.querySelectorAll(".wt-rm").forEach(
      (b) =>
        (b.onclick = () => {
          read();
          R.A.lines.splice(+b.dataset.i, 1);
          if (!R.A.lines.length) R.A.lines.push({ desc: "", code: "17 09 04" });
          dirty();
          draw();
        }),
    );
    V.querySelectorAll(".wt .line [data-k=code]").forEach((s) =>
      s.addEventListener("change", () => {
        read();
        if (hazard() !== !!V.querySelector(".wt .warn")) draw();
      }),
    );
    ["B", "C"].forEach((k) => {
      const cv = q("sc-" + k);
      if (!cv) return;
      const pad_ = sigPad(cv);
      q("sclr-" + k).onclick = () => pad_.clear();
      q("sok-" + k).onclick = async () => {
        read();
        const nm = q("sn-" + k).value.trim(),
          rep = q("sr-" + k).value.trim();
        if (!nm) {
          toast("Type the name of the person signing");
          return;
        }
        if (!pad_.drawn) {
          toast("Sign in the box first");
          return;
        }
        if (!R.B.name && !R.B.company) {
          toast("Fill in Section B first");
          return;
        }
        if (!R.C.name && !R.C.company) {
          toast("Fill in Section C first");
          return;
        }
        R.sigs[k] = { img: pad_.data(), name: nm, rep, at: Date.now() };
        try {
          await persist();
          toast("Signed");
        } catch (e) {
          toast("Couldn't save the signature");
          delete R.sigs[k];
          return;
        }
        /* remember registration numbers for next time */
        try {
          for (const pk of ["B", "C"]) {
            const p = R[pk];
            if (p.role === "us" && p.carrierNo && p.carrierNo !== coData().wasteCarrier) {
              const co = Object.assign({}, (S.settings || {}).company || {}, {
                wasteCarrier: p.carrierNo,
              });
              await S.db.doc("settings/app").set(Object.assign({}, S.settings, { company: co }));
              S.settings = Object.assign({}, S.settings, { company: co });
            }
            if (p.role === "supplier" && p.supId) {
              const s = (S.suppliers || []).find((x) => x.id === p.supId);
              if (s && (p.carrierNo || p.permitNo)) {
                const d = Object.assign({}, s, {
                  wasteCarrier: p.carrierNo,
                  wastePermit: p.permitNo,
                  updated: Date.now(),
                });
                delete d.id;
                await S.db.doc("todos/" + s.id).set(d);
              }
            }
          }
        } catch (e) {}
        draw();
      };
    });
    q("pdf").onclick = async () => {
      read();
      if (!R.A.lines.some((l) => l.desc)) {
        toast("Describe the waste (A1)");
        return;
      }
      if (!R.B.name && !R.B.company) {
        toast("Fill in Section B – who has the waste");
        return;
      }
      await pdf(q("pdf"));
    };
    q("send").onclick = () => send();
    q("save").onclick = async () => {
      read();
      clearTimeout(saveT);
      q("sv").textContent = "Saving…";
      try {
        await persist();
        q("sv").textContent = "Saved";
        toast("Saved");
      } catch (e) {
        q("sv").textContent = "Not saved";
        toast("Couldn't save – check your connection");
      }
    };
    if (q("unlock"))
      q("unlock").onclick = () =>
        askOwnerPin(
          "Enter your PIN to unlock this note. The signatures will be cleared and recorded.",
          async () => {
            if (
              !(await auditFirst(
                "Waste transfer note unlocked",
                R.ref,
                "Signatures cleared: " +
                  Object.keys(R.sigs)
                    .map((k) => k + " " + (R.sigs[k].name || ""))
                    .join(", "),
                { ref: R.ref, sigs: Object.keys(R.sigs) },
              ))
            )
              return;
            R.sigs = {};
            R.pdf = null;
            await persist();
            draw();
          },
        );
    q("del").onclick = () =>
      delRec(R, () => {
        closeViewer();
        render();
      });
    q("del2").onclick = q("del").onclick;
    q("save2").onclick = () => q("save").onclick();
  }
  async function pdf(btn) {
    const lab = btn && btn.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Making the PDF…";
    }
    try {
      await loadJsPdf();
    } catch (e) {
      toast("Couldn't load the PDF maker. Check your connection.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = lab;
      }
      return;
    }
    try {
      const co = coData(),
        BR = BRGB(),
        GR = [75, 68, 65],
        INK = [20, 18, 17];
      const sigDims = {};
      for (const k of Object.keys(R.sigs)) {
        sigDims[k] = await new Promise((res) => {
          const im = new Image();
          im.onload = () => res([im.width, im.height]);
          im.onerror = () => res([420, 150]);
          im.src = R.sigs[k].img;
        });
      }
      const build = async (f) => {
        const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
        const W = 210,
          M = 12,
          CW = W - 2 * M,
          HALF = CW / 2 - 3,
          RX = M + CW / 2 + 3;
        let y = 0;
        const LH = 3.5 * f,
          FS = 8.3 * f,
          FL = 6.8 * f,
          BX = 2.6 * f;
        const clean = (t) =>
          String(t || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[–—]/g, "-")
            .replace(/[‘’]/g, "'")
            .replace(/[“”]/g, '"')
            .replace(/×/g, "x")
            .replace(/³/g, "3")
            .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
        const T = (t, x, yy, sz, st, col, al) => {
          doc.setFont("helvetica", st || "normal");
          doc.setFontSize(sz);
          doc.setTextColor(...(col || INK));
          doc.text(clean(t), x, yy, al ? { align: al } : undefined);
        };
        const box = (x, yy, on) => {
          doc.setDrawColor(90, 80, 80);
          doc.setLineWidth(0.3);
          doc.rect(x, yy - BX + 0.6, BX, BX);
          if (on) {
            doc.setLineWidth(0.6);
            doc.line(x + 0.5, yy - BX / 2 + 0.6, x + BX / 2 - 0.2, yy + 0.1);
            doc.line(x + BX / 2 - 0.2, yy + 0.1, x + BX - 0.3, yy - BX + 1);
          }
        };
        const field = (x, yy, w, label, val, lines) => {
          T(label, x, yy, FL, "normal", GR);
          doc.setFontSize(FS);
          const ls = doc.splitTextToSize(clean(val || ""), w - 2).slice(0, lines || 1);
          ls.forEach((t, i) => T(t, x + 1, yy + 3.4 * f + i * LH, FS, "bold", INK));
          const h = (lines || 1) * LH;
          doc.setDrawColor(170, 160, 160);
          doc.setLineWidth(0.25);
          doc.line(x, yy + 1.4 * f + h, x + w, yy + 1.4 * f + h);
          return 1.4 * f + h + 3.6 * f;
        };
        const ckRow = (x, yy, w, label, on) => {
          T(label, x, yy, FS - 0.3, "normal", INK);
          box(x + w - BX, yy, on);
          return LH + 1.4 * f;
        };
        const sec = (title, sub) => {
          doc.setDrawColor(...BR);
          doc.setLineWidth(0.8);
          doc.line(M, y, W - M, y);
          y += 4.2 * f;
          T(title, M, y, 10 * f, "bold", BR);
          if (sub) {
            T(sub, M, y + 3.6 * f, FL, "normal", GR);
            y += 3.6 * f;
          }
          y += 3.2 * f;
        };
        doc.setFillColor(...BR);
        doc.rect(0, 0, W, 3, "F");
        await pdfLogo(doc, W - M, 5, 30 * f + 4, 13);
        T("Duty of care: waste transfer note", M, 11, 14 * f, "bold", INK);
        T(`${co.name} · ${R.ref} · keep this note for 2 years`, M, 15.5, FL, "normal", GR);
        y = 19;
        /* A */
        sec("Section A – Description of waste");
        let yl = y,
          yr = y;
        const codes = R.A.lines.filter((l) => l.desc || l.code);
        const descTxt = codes
          .map((l) => l.desc)
          .filter(Boolean)
          .join("; ");
        const codeTxt = [...new Set(codes.map((l) => l.code))].join(", ");
        yl += field(M, yl, HALF, "A1 Description of the waste being transferred", descTxt, 2);
        yl += field(M, yl, HALF, "List of Waste Regulations code(s)", codeTxt, 1);
        T("A2 How is the waste contained?", RX, yr, FL, "normal", GR);
        yr += 3.6 * f;
        {
          let x = RX;
          CONT.forEach((c) => {
            T(c, x, yr, FS - 0.3, "normal", INK);
            box(x + doc.getTextWidth(clean(c)) + 1.5, yr, R.A.cont[c]);
            x += HALF / 5;
          });
          yr += LH + 0.8 * f;
        }
        if (R.A.cont.Other || R.A.contOther) {
          T("Other: " + R.A.contOther, RX, yr, FS, "bold", INK);
          yr += LH;
        }
        yr += 1.5 * f;
        yr += field(RX, yr, HALF, "A3 How much waste? (number of sacks, weight)", R.A.qty, 2);
        y = Math.max(yl, yr) + 1.5 * f;
        /* B */
        const B = R.B,
          C = R.C;
        sec("Section B – Current holder of the waste – Transferor");
        {
          T(
            "By signing in Section D below I confirm that I have fulfilled my duty to apply the waste hierarchy as required by Regulation 12 of the Waste (England and Wales) Regulations 2011",
            M,
            y,
            FL,
            "normal",
            INK,
          );
          y += LH;
          T("Yes", M, y, FS - 0.3, "normal", INK);
          box(M + 9.5, y, !!B.hier);
          y += LH + 1.5 * f;
        }
        yl = y;
        yr = y;
        yl += field(M, yl, HALF, "B1 Full name", B.name, 1);
        yl += field(
          M,
          yl,
          HALF,
          "Company name and address",
          [B.company, B.addr].filter(Boolean).join(", "),
          2,
        );
        yl += field(M, yl, HALF / 2 - 2, "Postcode", B.postcode, 1);
        T("SIC code (2007)", M + HALF / 2 + 2, yl - (1.4 * f + LH + 3.6 * f), FL, "normal", GR);
        T(B.sic || "", M + HALF / 2 + 3, yl - (1.4 * f + LH + 3.6 * f) + 3.4 * f, FS, "bold", INK);
        doc.line(M + HALF / 2 + 2, yl - 3.6 * f, M + HALF, yl - 3.6 * f);
        yl += field(M, yl, HALF, "B2 Name of your unitary authority or council", B.council, 1);
        T("B3 Are you:", RX, yr, FL, "normal", GR);
        yr += 3.6 * f;
        yr += ckRow(RX, yr, HALF, "The producer of the waste?", B.is.producer);
        yr += ckRow(RX, yr, HALF, "The importer of the waste?", B.is.importer);
        yr += ckRow(RX, yr, HALF, "The local authority?", B.is.la);
        yr += ckRow(RX, yr, HALF, "The holder of an environmental permit?", B.is.permit);
        yr += field(RX, yr, HALF / 2 - 2, "Permit number", B.permitNo, 1);
        T("Issued by", RX + HALF / 2 + 2, yr - (1.4 * f + LH + 3.6 * f), FL, "normal", GR);
        T(
          B.permitBy || "",
          RX + HALF / 2 + 3,
          yr - (1.4 * f + LH + 3.6 * f) + 3.4 * f,
          FS,
          "bold",
          INK,
        );
        doc.line(RX + HALF / 2 + 2, yr - 3.6 * f, RX + HALF, yr - 3.6 * f);
        yr += ckRow(RX, yr, HALF, "Registered waste exemption?", B.is.exempt);
        yr += field(RX, yr, HALF, "Details, including registration number", B.exemptDetails, 1);
        yr += ckRow(RX, yr, HALF, "A registered waste carrier, broker or dealer?", B.is.carrier);
        yr += field(RX, yr, HALF / 2 - 2, "Registration number", B.carrierNo, 1);
        T(
          "Details (carrier, broker or dealer?)",
          RX + HALF / 2 + 2,
          yr - (1.4 * f + LH + 3.6 * f),
          FL,
          "normal",
          GR,
        );
        T(
          B.is.carrier ? B.carrierKind : "",
          RX + HALF / 2 + 3,
          yr - (1.4 * f + LH + 3.6 * f) + 3.4 * f,
          FS,
          "bold",
          INK,
        );
        doc.line(RX + HALF / 2 + 2, yr - 3.6 * f, RX + HALF, yr - 3.6 * f);
        y = Math.max(yl, yr) + 1.5 * f;
        /* C */
        sec("Section C – Person collecting the waste – Transferee");
        yl = y;
        yr = y;
        yl += field(M, yl, HALF, "C1 Full name", C.name, 1);
        yl += field(
          M,
          yl,
          HALF,
          "Company name and address",
          [C.company, C.addr].filter(Boolean).join(", "),
          2,
        );
        yl += field(M, yl, HALF / 2 - 2, "Postcode", C.postcode, 1);
        yl += 1.5 * f;
        T("C2 Are you:", M, yl, FL, "normal", GR);
        yl += 3.6 * f;
        yl += ckRow(M, yl, HALF, "The local authority?", C.isLA);
        T("C3 Are you:", RX, yr, FL, "normal", GR);
        yr += 3.6 * f;
        yr += ckRow(RX, yr, HALF, "The holder of an environmental permit?", C.is.permit);
        yr += field(RX, yr, HALF / 2 - 2, "Permit number", C.permitNo, 1);
        T("Issued by", RX + HALF / 2 + 2, yr - (1.4 * f + LH + 3.6 * f), FL, "normal", GR);
        T(
          C.permitBy || "",
          RX + HALF / 2 + 3,
          yr - (1.4 * f + LH + 3.6 * f) + 3.4 * f,
          FS,
          "bold",
          INK,
        );
        doc.line(RX + HALF / 2 + 2, yr - 3.6 * f, RX + HALF, yr - 3.6 * f);
        yr += ckRow(RX, yr, HALF, "Registered waste exemption?", C.is.exempt);
        yr += field(RX, yr, HALF, "Details, including registration number", C.exemptDetails, 1);
        yr += ckRow(RX, yr, HALF, "A registered waste carrier, broker or dealer?", C.is.carrier);
        yr += field(RX, yr, HALF / 2 - 2, "Registration number", C.carrierNo, 1);
        T(
          "Details (carrier, broker or dealer?)",
          RX + HALF / 2 + 2,
          yr - (1.4 * f + LH + 3.6 * f),
          FL,
          "normal",
          GR,
        );
        T(
          C.is.carrier ? C.carrierKind : "",
          RX + HALF / 2 + 3,
          yr - (1.4 * f + LH + 3.6 * f) + 3.4 * f,
          FS,
          "bold",
          INK,
        );
        doc.line(RX + HALF / 2 + 2, yr - 3.6 * f, RX + HALF, yr - 3.6 * f);
        y = Math.max(yl, yr) + 1.5 * f;
        /* D */
        sec("Section D – The transfer");
        yl = y;
        yr = y;
        const D = R.D;
        const dateTxt = D.date ? D.date.split("-").reverse().join("/") : "";
        {
          const w = D.siteId ? wsites().find((x) => x.id === D.siteId) : null;
          yl += field(
            M,
            yl,
            HALF,
            "D1 Address of transfer or collection point",
            (w ? w.company + ", " : "") +
              D.addr +
              (w && w.permitNo ? "  (permit " + w.permitNo + ")" : ""),
            2,
          );
        }
        yl += field(M, yl, HALF / 2 - 2, "Postcode", D.postcode, 1);
        yl += field(M, yl, HALF, "Date of transfer (DD/MM/YYYY)", dateTxt, 1);
        yr += field(
          RX,
          yr,
          HALF,
          "D2 Broker or dealer who arranged this transfer (if applicable)",
          [D.broker.name, D.broker.addr].filter(Boolean).join(", "),
          2,
        );
        yr += field(RX, yr, HALF / 2 - 2, "Postcode", D.broker.postcode, 1);
        yr += field(RX, yr, HALF, "Registration number", D.broker.reg, 1);
        yr += field(RX, yr, HALF / 2 - 2, "Time(s)", D.time, 1);
        y = Math.max(yl, yr) + 2 * f;
        const SH = 16 * f;
        for (const [i, [k, t]] of [
          ["B", "Transferor's signature"],
          ["C", "Transferee's signature"],
        ].entries()) {
          const x = i ? RX : M;
          const sg = R.sigs[k];
          T(t, x, y, FS, "bold", INK);
          doc.setDrawColor(170, 160, 160);
          doc.setLineWidth(0.3);
          doc.rect(x + HALF * 0.45, y - 3.5 * f, HALF * 0.55, SH);
          if (sg) {
            try {
              const dim = sigDims[k] || [420, 150];
              let iw = HALF * 0.55 - 2,
                ih = (iw * dim[1]) / dim[0];
              if (ih > SH - 1) {
                ih = SH - 1;
                iw = (ih * dim[0]) / dim[1];
              }
              doc.addImage(sg.img, "PNG", x + HALF * 0.45 + 1, y - 3.5 * f + 0.5, iw, ih);
            } catch (e) {}
          }
          let yy = y + SH - 2 * f;
          yy += field(x, yy, HALF, "Name", sg ? sg.name : "", 1);
          yy += field(x, yy, HALF, "Representing", sg ? sg.rep : "", 1);
          if (sg) T("Signed on the tab " + stamp(sg.at), x, yy, FL, "normal", GR);
          if (i) y = yy + 3 * f;
        }
        if (R.notes) {
          T("Notes: " + R.notes, M, y + 1, FL, "normal", GR);
          y += LH;
        }
        T(
          `Layout follows WMC2A · ${co.name} · ${R.ref} · ${dateTxt} · both parties keep a copy for 2 years`,
          M,
          292,
          6.5,
          "normal",
          [130, 120, 120],
        );
        return { doc, y };
      };
      let out = null;
      for (const f of [1, 0.92, 0.84, 0.76, 0.7, 0.64]) {
        out = await build(f);
        if (out.doc.getNumberOfPages() === 1 && out.y <= 288) break;
      }
      const doc = out.doc;
      while (doc.getNumberOfPages() > 1) doc.deletePage(doc.getNumberOfPages());
      const fn = `Waste transfer note ${R.ref} - ${String(R.B.company || R.B.name || "transfer")
        .replace(/[^\w\s&,-]/g, "")
        .trim()
        .slice(0, 40)}.pdf`;
      const blob = doc.output("blob");
      let assetId = "";
      try {
        if (S.assets) {
          const a = await uploadFile(blob, fn);
          assetId = a.id;
        }
      } catch (e) {}
      R.pdf = { at: Date.now(), name: fn, assetId };
      await persist();
      if (S.dl) {
        try {
          await S.dl.save({ filename: fn, data: blob });
          toast("PDF saved");
        } catch (e) {
          if (!(e && e.code === "declined")) pdfShow(blob, fn);
        }
      } else pdfShow(blob, fn);
      draw();
    } catch (e) {
      console.error(e);
      toast("Couldn't make the PDF");
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = lab;
    }
  }
  function partyEmail(p) {
    if (p.role === "client") {
      const c = (S.clients || []).find((x) => x.id === p.clientId);
      return (c && c.email) || "";
    }
    if (p.role === "supplier") {
      const s = (S.suppliers || []).find((x) => x.id === p.supId);
      return (s && s.email) || "";
    }
    if (p.role === "us") return coData().email || "";
    return "";
  }
  async function send() {
    if (!R.pdf) {
      toast("Make the PDF first");
      return;
    }
    let blob = null;
    try {
      if (R.pdf.assetId) blob = await getFileBlob(R.pdf.assetId);
    } catch (e) {}
    const who = [
      ["B", R.B],
      ["C", R.C],
    ]
      .filter(([, p]) => p.role !== "us")
      .map(([k, p]) => ({ k, name: p.company || p.name, email: partyEmail(p) }));
    {
      const w = R.D.siteId && wsites().find((x) => x.id === R.D.siteId);
      if (w) who.push({ k: "D", name: w.name, email: w.email || "" });
    }
    const subject = `Waste transfer note ${R.ref} – ${coData().name}`;
    const body = `Hi,\n\nPlease find attached waste transfer note ${R.ref} (${R.A.lines
      .map((l) => l.desc)
      .filter(Boolean)
      .join(
        ", ",
      )}) – transfer on ${R.D.date} at ${R.D.addr || ""}.\n\nPlease keep a copy for your records; the law says both parties keep it for 2 years.\n\nThanks,\n${coData().owner || ""}\n${coData().name}\n${coData().mobile || coData().phone || ""}`;
    const mark = (to, how) => {
      R.sent = (R.sent || []).concat([{ to, at: Date.now(), how }]);
      persist().catch(() => {});
      draw();
    };
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "120";
    const file = blob ? new File([blob], R.pdf.name, { type: "application/pdf" }) : null;
    const canShare = file && navigator.canShare && navigator.canShare({ files: [file] });
    d.innerHTML = `<div class="dimbox"><b>📤 Send ${esc(R.ref)}</b><div class="who">${who.length ? "Send a copy to " + who.map((w) => "<b>" + esc(w.name) + "</b>" + (w.email ? " (" + esc(w.email) + ")" : " – no email on record")).join(" and ") : "Both parties are you."}</div><div class="actions" style="flex-direction:column;align-items:stretch;margin-top:8px">
    ${canShare ? `<button type="button" class="btn primary" data-how="share">📎 Share the PDF (WhatsApp, Mail, Teams…)</button>` : ""}
    ${who.map((w) => `<button type="button" class="btn ${canShare ? "" : "primary"}" data-how="mail" data-to="${esc(w.email)}" data-name="${esc(w.name)}" ${w.email ? "" : "disabled"}>✉️ Email ${esc(w.name)}</button>`).join("")}
    <button type="button" class="btn" data-how="app">👷 Send in SiteHQ (trade or client, saved on the job)</button>
    <button type="button" class="btn" data-how="anymail">✉️ Email someone else…</button>
    <button type="button" class="btn" data-how="dl">⬇ Download the PDF again</button><button type="button" class="btn" data-how="copy">📋 Copy the covering message</button></div>
    <div class="who" style="margin-top:6px">${canShare ? "Share attaches the PDF. Email opens your mail app with the message – attach the downloaded PDF if it isn't there." : "Email opens your mail app with the covering message; attach the downloaded PDF."}</div>
    <div class="dimbtns"><button type="button" class="btn wt-x">Close</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".wt-x").onclick = () => d.remove();
    d.querySelectorAll("[data-how]").forEach(
      (b) =>
        (b.onclick = async () => {
          const how = b.dataset.how;
          if (how === "share") {
            try {
              await navigator.share({ title: subject, text: body, files: [file] });
              mark(who.map((w) => w.name).join(", ") || "shared", "shared");
              d.remove();
            } catch (e) {
              if (e && e.name !== "AbortError")
                toast("Sharing didn't work here – try Email or Download");
            }
            return;
          }
          if (how === "mail") {
            d.remove();
            mark(b.dataset.name, "email");
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  title: subject,
                  text: `To: ${b.dataset.to}\n\n${body}`,
                  files: [file],
                });
                return;
              } catch (e) {
                if (e && e.name === "AbortError") return;
              }
            }
            if (blob) {
              try {
                if (S.dl) await S.dl.save({ filename: R.pdf.name, data: blob });
              } catch (e) {}
            }
            window.location.href = `mailto:${encodeURIComponent(b.dataset.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            return;
          }
          if (how === "anymail") {
            d.remove();
            SENDTO.open({
              assetId: R.pdf.assetId,
              name: R.pdf.name,
              type: "application/pdf",
              title: "Waste transfer note " + R.ref,
              clientId: R.B.role === "client" ? R.B.clientId : "",
              folder: "hs",
              cat: "other",
            });
            return;
          }
          if (how === "app") {
            if (!R.pdf.assetId) {
              toast("The PDF isn't stored – make it again");
              return;
            }
            d.remove();
            SENDTO.open({
              assetId: R.pdf.assetId,
              name: R.pdf.name,
              type: "application/pdf",
              title: "Waste transfer note " + R.ref,
              clientId: R.B.role === "client" ? R.B.clientId : "",
              folder: "hs",
              cat: "other",
            });
            mark("in app", "app");
            return;
          }
          if (how === "dl") {
            if (blob) {
              if (S.dl) {
                try {
                  await S.dl.save({ filename: R.pdf.name, data: blob });
                } catch (e) {
                  pdfShow(blob, R.pdf.name);
                }
              } else pdfShow(blob, R.pdf.name);
            } else toast("The PDF isn't stored – make it again");
            return;
          }
          if (how === "copy") {
            try {
              await navigator.clipboard.writeText(subject + "\n\n" + body);
              toast("Copied");
            } catch (e) {
              toast("Couldn't copy");
            }
          }
        }),
    );
  }
  /* ---- waste transfer sites: tips / transfer stations James uses, kept in Setup, picked on the note ---- */
  const wsites = () =>
    ((S.settings || {}).wasteSites || [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  async function saveSites(list) {
    await S.db.doc("settings/app").set(Object.assign({}, S.settings, { wasteSites: list }));
    S.settings = Object.assign({}, S.settings, { wasteSites: list });
  }
  function siteForm(w, after) {
    w = w || {};
    const f = (id, lab, val, ph, extra) =>
      `<label for="ws-${id}">${lab}<input id="ws-${id}" value="${esc(val || "")}" ${ph ? `placeholder="${esc(ph)}"` : ""} ${extra || ""}></label>`;
    openSheet(
      `<h3 id="sheettitle">♻️ ${w.id ? "Edit" : "Add"} waste transfer site</h3><div class="who">A tip, transfer station or skip yard you take waste to. Picking it on a waste transfer note fills in Section C (or B) and the transfer address.</div>
    ${f("name", "Site name (as you call it)", w.name, "e.g. EMS Hill Barton", 'required maxlength="60"')}${f("company", "Company name", w.company, "e.g. EMS Waste Services Ltd", "required")}${f("contact", "Contact name (optional)", w.contact, "")}
    ${f("addr", "Address", w.addr, "Hill Barton Business Park, Sidmouth Road, Clyst St Mary, Exeter")}${f("postcode", "Postcode", w.postcode, "EX5 1DR")}${f("phone", "Phone", w.phone, "")}${f("email", "Email (where to send the note)", w.email, "", 'type="email"')}
    <div class="who" style="margin-top:4px"><b>Their registrations</b> – ask the site; they must tell you.</div>
    ${f("permitNo", "Environmental permit number", w.permitNo, "EPR/…")}${f("permitBy", "Issued by", w.permitBy, "Environment Agency")}${f("exempt", "Waste exemption details (if instead of a permit)", w.exempt, "")}
    ${f("carrierNo", "Waste carrier registration", w.carrierNo, "CBDU…")}<label for="ws-carrierKind">Carrier, broker or dealer?<select id="ws-carrierKind"><option value="">– leave blank –</option>${["Carrier", "Broker", "Dealer", "Carrier & broker", "Carrier, broker & dealer"].map((x) => `<option ${x === w.carrierKind ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    <label class="inl"><input type="checkbox" id="ws-isLA" ${w.isLA ? "checked" : ""}> It's the local authority (council tip)</label>
    ${formFoot(!!w.id)}`,
      async () => {
        const g2 = (id) => ($("ws-" + id).value || "").trim();
        const rec = {
          id: w.id || newId(),
          name: g2("name"),
          company: g2("company"),
          contact: g2("contact"),
          addr: g2("addr"),
          postcode: g2("postcode").toUpperCase(),
          phone: g2("phone"),
          email: g2("email"),
          permitNo: g2("permitNo"),
          permitBy: g2("permitBy"),
          exempt: g2("exempt"),
          carrierNo: g2("carrierNo"),
          carrierKind: $("ws-carrierKind").value,
          isLA: $("ws-isLA").checked,
        };
        if (!rec.name || !rec.company) {
          showErr("Site name and company are needed");
          return;
        }
        $("f-save").disabled = true;
        try {
          await saveSites(
            wsites()
              .filter((x) => x.id !== rec.id)
              .concat([rec]),
          );
          closeForm();
          toast("Saved");
          if (after) after();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      "ws-name",
    );
    armDelete(async () => {
      await saveSites(wsites().filter((x) => x.id !== w.id));
      if (after) after();
    });
  }
  function sitesView() {
    if (!ownerMode()) return;
    const L = wsites();
    openViewer(`<span class="tag">♻️ Setup</span><h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 8px;color:var(--accent)">Waste transfer sites</h3>
    <div class="who">The tips, transfer stations and skip yards you use, with their permit and carrier numbers. On a waste transfer note, pick one and Section C (or B) and the transfer address fill themselves.</div>
    <div class="actions" style="margin:10px 0"><button type="button" class="btn primary" id="wsv-add">+ Add a site</button></div>
    <div class="wtl">${L.length ? L.map((w) => `<div class="wtr"><button type="button" class="wsv-edit" data-id="${esc(w.id)}"><b>♻️ ${esc(w.name)}</b> · ${esc(w.company)}<br><span class="who">${esc([w.addr, w.postcode].filter(Boolean).join(", "))}${w.permitNo ? " · permit " + esc(w.permitNo) : " · <i>no permit number yet</i>"}${w.carrierNo ? " · carrier " + esc(w.carrierNo) : ""}</span></button></div>`).join("") : '<div class="nothing">None yet. Add the tip or transfer station you use most.</div>'}</div>`);
    css();
    $("wsv-add").onclick = () => siteForm(null, sitesView);
    document.querySelectorAll(".wsv-edit").forEach(
      (b) =>
        (b.onclick = () =>
          siteForm(
            wsites().find((x) => x.id === b.dataset.id),
            sitesView,
          )),
    );
  }
  function fillFromSite(p, w) {
    p.role = "site";
    p.siteId = w.id;
    p.name = w.contact || "";
    p.company = w.company || w.name;
    p.addr = w.addr || "";
    p.postcode = w.postcode || "";
    p.isLA = !!w.isLA;
    p.is.la = !!w.isLA;
    p.is.permit = !!w.permitNo;
    p.permitNo = w.permitNo || "";
    p.permitBy = w.permitBy || "";
    p.is.exempt = !!w.exempt;
    p.exemptDetails = w.exempt || "";
    p.is.carrier = !!w.carrierNo;
    p.carrierNo = w.carrierNo || "";
    p.carrierKind = w.carrierKind || "";
    if (!R.D.addr || R.D._auto) {
      R.D.addr = [w.addr].filter(Boolean).join(", ");
      R.D.postcode = w.postcode || "";
      R.D._auto = true;
    }
  }
  function rowHtml(r) {
    const B = r.B || {},
      C = r.C || {};
    const sg = r.sigs && (r.sigs.B || r.sigs.C);
    const n = r.A && r.A.lines ? r.A.lines.length : (r.lines || []).length;
    return `<div class="wtr"><button type="button" class="wt-open" data-id="${esc(r.id)}"><b>♻️ ${esc(r.ref)}</b> · ${esc(B.company || B.name || (r.to && r.to.name) || "")} → ${esc(C.company || C.name || "")}<br><span class="who">${esc((r.D && r.D.date) || r.date || "")}${r.D && r.D.addr ? " · " + esc(r.D.addr) : ""} · ${n} waste type${n === 1 ? "" : "s"}${sg ? " · ✍️ signed" : ""}${r.pdf ? " · 📄" : ""}${r.sent && r.sent.length ? " · 📤 sent" : ""}</span></button><button type="button" class="iconbtn wt-rowdel" data-id="${esc(r.id)}" aria-label="Delete note" title="Delete" style="color:var(--danger)">🗑</button></div>`;
  }
  function jobsHtml() {
    if (!ownerMode()) return "";
    css();
    const L = recs();
    return `<div class="day"><div class="dayh"><span>♻️ Waste transfer notes</span><span class="sum">${L.length}</span></div><div class="wtl" style="padding:8px 0">${L.length ? L.slice(0, 30).map(rowHtml).join("") : '<div class="nothing">None yet. Tap ♻️ Waste transfer note above when waste changes hands.</div>'}</div></div>`;
  }
  function delRec(r, after) {
    const signed = !!(r.sigs && (r.sigs.B || r.sigs.C));
    const go = async () => {
      try {
        await S.db.doc("todos/" + r.id).delete();
        S.wtns = (S.wtns || []).filter((x) => x.id !== r.id);
        toast("Note deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
        if (after) after();
      } catch (e) {
        toast("Couldn't delete");
      }
    };
    if (signed)
      askOwnerPin(
        "Enter your PIN to delete this signed waste transfer note " + r.ref + ".",
        async () => {
          if (
            !(await auditFirst(
              "Waste transfer note deleted",
              r.ref,
              `${(r.D && r.D.date) || ""} · from ${(r.B && (r.B.company || r.B.name)) || ""} to ${(r.C && (r.C.company || r.C.name)) || ""} · ${((r.A && r.A.lines) || []).map((l) => l.desc).join("; ")}`,
              { ref: r.ref, B: r.B, C: r.C, A: r.A },
            ))
          )
            return;
          go();
        },
      );
    else {
      const d = document.createElement("div");
      d.className = "dimask";
      d.style.zIndex = "125";
      d.innerHTML = `<div class="dimbox" role="alertdialog"><b>🗑 Delete ${esc(r.ref)}?</b><div class="who" style="margin-top:4px">It goes to Setup › Deleted items for ${BIN_DAYS} days, where you can put it back.</div><div class="dimbtns"><button type="button" class="btn wd-no">Keep it</button><button type="button" class="btn delbtn wd-yes">Delete</button></div></div>`;
      document.body.appendChild(d);
      d.querySelector(".wd-no").onclick = () => d.remove();
      d.onclick = (e) => {
        if (e.target === d) d.remove();
      };
      d.querySelector(".wd-yes").onclick = () => {
        d.remove();
        go();
      };
    }
  }
  function wireJobs() {
    document.querySelectorAll(".wt-open").forEach(
      (b) =>
        (b.onclick = () => {
          const r = recs().find((x) => x.id === b.dataset.id);
          if (r) open(r);
        }),
    );
    document.querySelectorAll(".wt-rowdel").forEach(
      (b) =>
        (b.onclick = () => {
          const r = recs().find((x) => x.id === b.dataset.id);
          if (r) delRec(r, () => render());
        }),
    );
    const b = document.getElementById("wt-new");
    if (b) b.onclick = () => open(null);
  }
  return { open, jobsHtml, wireJobs, recs, sitesView };
})();
