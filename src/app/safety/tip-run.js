/* ================= TIP RUNS: each load taken to a tip or transfer station – what the site needs for digital waste tracking, shown at the gate ================= */
import { clientSites } from "../clients/address-book.js";
import { bossFirst, bossName } from "../core/company-names.js";
import { $, addDays, esc, iso, nowHM, parse, shortDay, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, equipOf, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, uploadErr } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { allTeam } from "../owner/owner.js";
import { nlGo } from "../owner/today.js";
import { BRGB, loadImage, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "./site-inductions.js";
import { shrinkImage } from "./training.js";
import { WTN } from "./waste-transfer-note.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
import { siteLabel } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
export { TIPRUN };
/* James (Nov 2026): "there are new rules coming in for waste carriers when they take it to a transfer station".
   From October 2026 permitted receiving sites must record every load on Defra's Digital Waste Tracking service (two
   working days); carriers, brokers and dealers come in from October 2027. In England waste carrier registration is
   being replaced by an environmental permit (SI 2026/873): most move over at their renewal date, all by 22 July 2027.
   A tip run is one load: the job it came from, vehicle and driver, each waste with its List of Waste (EWC) code and
   whether it's hazardous, the estimated weight, and where it's going. 🚛 Show at the gate puts everything the site
   asks for on one screen. Afterwards ✅ Tipped adds the weighbridge weight, a photo of the ticket and the waste
   tracking ID the site gives. Trades and James both make them: sheets/{uid}/signoffs/{id} { type:"tiprun", date,
   time, site, vehicle, driver, lines [{ code, desc, haz, est, unit }], cont, toId, toName, toPermit, carrierNo,
   carrierKind, wtnId, status "onway"|"tipped", weight, wunit, actual, ticket (asset), wtid, tippedAt, notes }.
   The firm's own registration and permit are in Company details (wasteCarrier, wasteTier, wasteExpiry, wastePermit)
   and Today warns before the permit is needed. ⬇ Spreadsheet lists the year's loads. */
const TIPRUN = (() => {
  const PERMIT_BY = "2027-07-22";
  const UNITS = ["kg", "t"];
  const CONT = ["Skip", "Loose", "Bags / sacks", "Bulk bag", "Other"];
  const codes = () => WTN.EWC;
  const isHaz = (code) => /\*/.test(code || "");
  const codeName = (code) => (codes().find((c) => c[0] === code) || [code, ""])[1];
  const known = (code) => codes().some((c) => c[0] === code);
  /* where the waste was produced: the job's postcode and the firm's SIC code (on the transfer notes too) */
  function producer(site) {
    const c = (S.clients || []).find((x) => clientSites(x).some((n) => same(n, site)));
    const m = String(site || "").match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
    return {
      postcode: (c && c.postcode) || (m ? m[0].toUpperCase() : ""),
      sic: coData().sic || "41202",
    };
  }
  /* the waste transfer notes this load could come under: the same tip or the same client, from the last 12 months */
  function wtnCands(site, toId, date) {
    if (!ownerMode()) return [];
    const c = (S.clients || []).find((x) => clientSites(x).some((n) => same(n, site)));
    const from = iso(addDays(parse(date || iso(new Date())), -365));
    return WTN.recs()
      .map((n) => {
        const d = (n.D && n.D.date) || n.date || "";
        const tip = !!toId && !!n.D && n.D.siteId === toId;
        const cl = !!c && !!n.B && n.B.clientId === c.id;
        return { n, d, score: (tip ? 2 : 0) + (cl ? 1 : 0) };
      })
      .filter((x) => x.score && x.d >= from && x.d <= (date || "9999"))
      .sort((a, b) => b.score - a.score || b.d.localeCompare(a.d))
      .map((x) => x.n);
  }
  const sites = () =>
    ((S.settings || {}).wasteSites || [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  /* the firm as carrier: the permit once it has one, otherwise the registration */
  function carrier() {
    const co = coData();
    return co.wastePermit
      ? { no: co.wastePermit, kind: "Environmental permit", tier: "" }
      : { no: co.wasteCarrier || "", kind: "Waste carrier registration", tier: co.wasteTier || "" };
  }
  const all = () =>
    (ownerMode()
      ? allTeam("signoffs")
      : (S.mine.signoffs || []).map((x) => Object.assign({ who: S.me }, x))
    )
      .filter((x) => x.type === "tiprun")
      .sort(
        (a, b) =>
          String(b.date + (b.time || "")).localeCompare(String(a.date + (a.time || ""))) ||
          (b.created || 0) - (a.created || 0),
      );
  const myName = () => (ownerMode() ? bossName() : (S.myProfile && S.myProfile.name) || "");
  const tot = (r) =>
    r.status === "tipped" && r.weight
      ? `${r.weight} ${r.wunit || "t"}${r.actual === false ? " (est.)" : ""}`
      : (r.lines || []).some((l) => l.est)
        ? "about " +
          (r.lines || [])
            .filter((l) => l.est)
            .map((l) => l.est + " " + (l.unit || "t"))
            .join(" + ")
        : "";
  /* Today: the permit (owner) */
  function todayCard() {
    if (!ownerMode()) return "";
    const co = coData();
    if (co.wastePermit) return "";
    const t = iso(new Date());
    const exp = co.wasteExpiry || "";
    const by = exp && exp < PERMIT_BY ? exp : PERMIT_BY;
    const days = Math.round((parse(by) - parse(t)) / 864e5);
    const any = all().length || co.wasteCarrier;
    if (!any || days > 120) return "";
    return `<button type="button" class="card tpr-card" id="tpr-permit"><b>🚛 Waste carrier permit ${days < 0 ? "is overdue" : "needed by " + esc(shortDay(by))}</b><span class="who">Waste carrier registration is being replaced by an environmental permit. ${exp && exp < PERMIT_BY ? "Yours moves over when your registration is due for renewal" : "Every carrier needs one by 22 July 2027"}. Apply to the Environment Agency, then add the permit number in Company details.</span></button>`;
  }
  function wireToday() {
    if ($("tpr-permit")) $("tpr-permit").onclick = () => nlGo("setup");
  }
  /* new or edit */
  function edit(r0, pre) {
    const isNew = !r0;
    const r = Object.assign(
      {
        date: iso(new Date()),
        time: nowHM(),
        site: "",
        vehicle: "",
        driver: myName(),
        lines: [
          {
            code: "17 09 04",
            desc: "Mixed construction & demolition waste",
            haz: false,
            est: "",
            unit: "t",
          },
        ],
        cont: "Skip",
        toId: "",
        notes: "",
      },
      pre || {},
      r0 || {},
    );
    let lines = JSON.parse(JSON.stringify(r.lines || []));
    const vans = equipOf("vehicle");
    const lineHtml = () =>
      lines
        .map(
          (
            l,
            i,
          ) => `<div class="tpr-line"><label>Waste<select class="tpr-code" data-i="${i}">${codes()
            .map(
              ([c, n]) =>
                `<option value="${esc(c)}" ${c === l.code ? "selected" : ""}>${esc(c)} ${esc(n)}</option>`,
            )
            .join(
              "",
            )}<option value="__other" ${known(l.code) ? "" : "selected"}>Other code – type it in…</option></select></label>
          ${known(l.code) ? "" : `<label>Code<input class="tpr-oc" data-i="${i}" maxlength="12" value="${esc(l.code === "__other" ? "" : l.code)}" placeholder="e.g. 17 06 03*"></label><label>What it is<input class="tpr-od" data-i="${i}" maxlength="80" value="${esc(l.desc || "")}" placeholder="e.g. Other insulation"></label>`}
          <label>About how much<span class="tpr-w"><input class="tpr-est" data-i="${i}" inputmode="decimal" value="${esc(l.est || "")}" placeholder="e.g. 2.5"><select class="tpr-unit" data-i="${i}">${UNITS.map((u) => `<option ${u === (l.unit || "t") ? "selected" : ""}>${u}</option>`).join("")}</select></span></label>
          ${isHaz(l.code) ? '<span class="tag bad">HAZARDOUS – needs a consignment note</span>' : '<span class="who">Not hazardous</span>'}${lines.length > 1 ? `<button type="button" class="iconbtn tpr-rm" data-i="${i}" aria-label="Take this waste off">✕</button>` : ""}</div>`,
        )
        .join("");
    openSheet(
      `<h3 id="sheettitle">🚛 ${isNew ? "New tip run" : "Tip run"}</h3>
      <div class="who">One load to a tip or transfer station. Fill it in before you go, show it at the gate, then add the ticket.</div>
      <label for="tpr-site">From which job<select id="tpr-site"><option value="">Choose…</option>${siteNames()
        .map(
          (n) =>
            `<option value="${esc(n)}" ${same(n, r.site) ? "selected" : ""}>${esc(siteLabel(n))}</option>`,
        )
        .join("")}</select></label>
      <div class="grid2"><label for="tpr-date">Date<input id="tpr-date" type="date" value="${esc(r.date)}"></label><label for="tpr-time">Time<input id="tpr-time" type="time" value="${esc(r.time || "")}"></label></div>
      <div class="grid2"><label for="tpr-veh">Vehicle registration<input id="tpr-veh" list="tpr-vans" maxlength="40" value="${esc(r.vehicle)}" placeholder="e.g. AB21 CDE"></label><datalist id="tpr-vans">${vans.map((v) => `<option value="${esc(v)}">`).join("")}</datalist>
      <label for="tpr-drv">Driver<input id="tpr-drv" maxlength="60" value="${esc(r.driver)}"></label></div>
      <div class="flabel">The waste</div><div id="tpr-lines">${lineHtml()}</div>
      <div class="actions"><button type="button" class="pillbtn" id="tpr-addl">＋ Another kind of waste</button></div>
      <label for="tpr-cont">How it's carried<select id="tpr-cont">${CONT.map((c) => `<option ${c === r.cont ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label for="tpr-to">Going to<select id="tpr-to"><option value="">Choose…</option>${sites()
        .map(
          (w) =>
            `<option value="${esc(w.id)}" ${w.id === r.toId ? "selected" : ""}>${esc(w.name)}${w.permitNo ? " · permit " + esc(w.permitNo) : ""}</option>`,
        )
        .join("")}</select></label>
      ${sites().length ? "" : `<div class="who">Add your tips in Setup › Company › ♻️ Waste transfer sites${ownerMode() ? "" : ` (ask ${esc(bossFirst())})`}.</div>`}
      ${ownerMode() ? '<label for="tpr-wtn">Under waste transfer note<select id="tpr-wtn"></select></label>' : ""}
      <label for="tpr-notes">Notes (optional)<input id="tpr-notes" maxlength="300" value="${esc(r.notes || "")}"></label>
      ${carrier().no ? `<div class="who">Carrier: ${esc(coData().name)} · ${esc(carrier().kind)} ${esc(carrier().no)}</div>` : `<div class="notice warn" style="margin:0">Your waste carrier number isn't in Company details yet${ownerMode() ? "" : ` – ask ${esc(bossFirst())}`}.</div>`}
      ${formFoot(!isNew, isNew ? "Save and show at the gate" : "Save")}`,
      async () => {
        readLines();
        const w = sites().find((x) => x.id === $("tpr-to").value);
        const data = {
          type: "tiprun",
          date: $("tpr-date").value || iso(new Date()),
          time: $("tpr-time").value,
          site: $("tpr-site").value,
          vehicle: $("tpr-veh").value.trim().toUpperCase(),
          driver: $("tpr-drv").value.trim(),
          lines: lines.map((l) =>
            Object.assign({}, l, {
              desc: known(l.code) ? codeName(l.code) : l.desc || "",
              haz: isHaz(l.code),
            }),
          ),
          cont: $("tpr-cont").value,
          toId: w ? w.id : "",
          toName: w
            ? w.name + (w.company && w.company !== w.name ? " (" + w.company + ")" : "")
            : "",
          toAddr: w ? [w.addr, w.postcode].filter(Boolean).join(", ") : "",
          toPermit: w ? w.permitNo || w.exempt || "" : "",
          carrierNo: carrier().no,
          carrierKind: carrier().kind,
          carrierTier: carrier().tier,
          notes: $("tpr-notes").value.trim(),
          status: r.status || "onway",
          wtnId: $("tpr-wtn") ? $("tpr-wtn").value : r.wtnId || "",
          wtnRef: r.wtnRef || "",
          prodPostcode: "",
          sic: "",
          updated: Date.now(),
        };
        if (data.lines.some((l) => !l.code || l.code === "__other"))
          return showErr("Type in the waste code, or choose one from the list.");
        if ($("tpr-wtn")) {
          const wn = data.wtnId ? WTN.recs().find((n) => n.id === data.wtnId) : null;
          data.wtnRef = wn ? wn.ref : "";
        }
        data.prodPostcode = producer(data.site).postcode;
        data.sic = producer(data.site).sic;
        if (!data.site) return showErr("Choose the job the waste came from.");
        if (!data.vehicle)
          return showErr("Add the vehicle registration – the site will ask for it.");
        if (!data.toId) return showErr("Choose where it's going.");
        $("f-save").disabled = true;
        try {
          const rec = await save(r0, data);
          closeForm();
          if (isNew) gate(rec);
          else toast("Saved");
        } catch (e) {
          showErr(uploadErr(e));
          $("f-save").disabled = false;
        }
      },
      "tpr-site",
    );
    function readLines() {
      document.querySelectorAll(".tpr-line").forEach((d, i) => {
        if (!lines[i]) return;
        const sel = d.querySelector(".tpr-code").value;
        const oc = d.querySelector(".tpr-oc");
        lines[i].code = sel === "__other" ? (oc ? oc.value.trim() : "") || "__other" : sel;
        if (sel === "__other")
          lines[i].desc = d.querySelector(".tpr-od") ? d.querySelector(".tpr-od").value.trim() : "";
        lines[i].est = d.querySelector(".tpr-est").value.trim();
        lines[i].unit = d.querySelector(".tpr-unit").value;
      });
    }
    const wire = () => {
      document.querySelectorAll(".tpr-code").forEach(
        (s) =>
          (s.onchange = () => {
            readLines();
            redraw();
          }),
      );
      document.querySelectorAll(".tpr-rm").forEach(
        (b) =>
          (b.onclick = () => {
            readLines();
            lines.splice(+b.dataset.i, 1);
            redraw();
          }),
      );
    };
    const redraw = () => {
      $("tpr-lines").innerHTML = lineHtml();
      wire();
    };
    wire();
    const fillWtn = (first) => {
      const sel = $("tpr-wtn");
      if (!sel) return;
      const L = wtnCands($("tpr-site").value, $("tpr-to").value, $("tpr-date").value);
      const cur = first
        ? r.wtnId || (isNew && L[0] ? L[0].id : "")
        : sel.value || (L[0] ? L[0].id : "");
      const both = L.concat(
        r.wtnId && !L.some((n) => n.id === r.wtnId)
          ? WTN.recs().filter((n) => n.id === r.wtnId)
          : [],
      );
      sel.innerHTML =
        '<option value="">Not under a note</option>' +
        both
          .map(
            (n) =>
              `<option value="${esc(n.id)}" ${n.id === cur ? "selected" : ""}>${esc(n.ref)} · ${esc((n.B && (n.B.company || n.B.name)) || "")} · ${esc((n.D && n.D.date) || "")}</option>`,
          )
          .join("");
    };
    fillWtn(true);
    ["tpr-site", "tpr-to", "tpr-date"].forEach((id) =>
      $(id).addEventListener("change", () => fillWtn(false)),
    );
    $("tpr-addl").onclick = () => {
      readLines();
      lines.push({ code: "17 01 07", desc: "", haz: false, est: "", unit: "t" });
      redraw();
    };
    if (!isNew)
      armDelete(async () => {
        try {
          await S.db.doc("sheets/" + (r0.who || S.me) + "/signoffs/" + r0.id).delete();
          closeForm();
          toast("Deleted");
          render();
        } catch (e) {
          showErr("Couldn't delete");
        }
      });
  }
  /* saved in the person's own sheet (James can change a trade's) */
  async function save(r0, data, files) {
    const who = (r0 && r0.who) || S.me;
    const id = (r0 && r0.id) || "tip-" + newId();
    const rec = Object.assign(
      { created: (r0 && r0.created) || Date.now(), by: (r0 && r0.by) || S.me },
      r0 ? strip(r0) : {},
      data,
    );
    await submitJob({
      path: "sheets/" + who + "/signoffs",
      coll: "signoffs",
      docId: id,
      data: rec,
      files: files || [],
    });
    return Object.assign({ id, who }, rec);
  }
  const strip = (r) => {
    const o = Object.assign({}, r);
    delete o.id;
    delete o.who;
    return o;
  };
  /* everything the site asks for, on one screen */
  function gateRows(r) {
    const co = coData();
    return [
      ["Carrier", co.name || ""],
      [r.carrierKind || "Carrier number", [r.carrierNo, r.carrierTier].filter(Boolean).join(" · ")],
      ["Vehicle", r.vehicle],
      ["Driver", r.driver],
      [
        "From (producer)",
        [co.name, r.site ? "building work at " + r.site : ""].filter(Boolean).join(", "),
      ],
      ["Producer postcode", r.prodPostcode || producer(r.site).postcode],
      ["SIC code", r.sic],
      ["Waste transfer note", r.wtnRef],
      ["Date and time", shortDay(r.date) + (r.time ? " " + r.time : "")],
      ["Carried as", r.cont],
      [
        "Going to",
        [r.toName, r.toPermit ? "permit " + r.toPermit : ""].filter(Boolean).join(" · "),
      ],
    ].filter((x) => x[1]);
  }
  function gateText(r) {
    return (
      gateRows(r)
        .map(([l, v]) => l + ": " + v)
        .join("\n") +
      "\nWaste:\n" +
      (r.lines || [])
        .map(
          (l) =>
            `${l.code} ${l.desc || codeName(l.code)} – ${l.haz ? "HAZARDOUS" : "not hazardous"}${l.est ? " – about " + l.est + " " + (l.unit || "t") : ""}`,
        )
        .join("\n")
    );
  }
  function gate(r) {
    openViewer(`<div class="tpr-gate"><div class="vhead"><b>🚛 For the transfer station</b></div>
      <div class="who">Show this at the gate or read it out. The site records it for digital waste tracking.</div>
      <div class="tpr-big">${gateRows(r)
        .map(([l, v]) => `<div class="tpr-gr"><span>${esc(l)}</span><b>${esc(v)}</b></div>`)
        .join("")}
      ${(r.lines || []).map((l) => `<div class="tpr-gr tpr-gw"><span>Waste</span><b>${esc(l.code)} ${esc(l.desc || codeName(l.code))}</b><span class="${l.haz ? "tag bad" : "who"}">${l.haz ? "HAZARDOUS" : "Not hazardous"}${l.est ? " · about " + esc(l.est) + " " + esc(l.unit || "t") : ""}</span></div>`).join("")}</div>
      ${r.status === "tipped" ? `<div class="notice">✅ Tipped${r.weight ? " · " + esc(r.weight) + " " + esc(r.wunit || "t") + (r.actual === false ? " (estimated)" : " (weighbridge)") : ""}${r.wtid ? " · waste tracking ID <b>" + esc(r.wtid) + "</b>" : ""}</div>${r.ticket ? `<img class="tpr-tk" src="${blobUrl(r.ticket)}" alt="Weighbridge ticket">` : ""}` : ""}
      <div class="actions"><button type="button" class="btn primary" id="tpr-done">${r.status === "tipped" ? "✎ Change the ticket details" : "✅ Tipped – add the ticket"}</button><button type="button" class="btn" id="tpr-pdf">📄 PDF</button><button type="button" class="btn" id="tpr-copy">📋 Copy</button><button type="button" class="btn" id="tpr-edit">✎ Edit</button></div></div>`);
    $("tpr-done").onclick = () => {
      closeViewer();
      tipped(r);
    };
    $("tpr-pdf").onclick = () => pdf(r);
    $("tpr-copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText(gateText(r));
        toast("Copied");
      } catch (e) {
        toast("Couldn't copy");
      }
    };
    $("tpr-edit").onclick = () => {
      closeViewer();
      edit(r);
    };
  }
  /* after the tip: weighbridge weight, the ticket, the tracking ID */
  function tipped(r) {
    openSheet(
      `<h3 id="sheettitle">✅ Tipped</h3>
      <div class="grid2"><label for="tpr-wt">Weight<span class="tpr-w"><input id="tpr-wt" inputmode="decimal" value="${esc(r.weight || "")}" placeholder="from the ticket"><select id="tpr-wu">${UNITS.map((u) => `<option ${u === (r.wunit || "t") ? "selected" : ""}>${u}</option>`).join("")}</select></span></label>
      <label for="tpr-act">That weight is<select id="tpr-act"><option value="1" ${r.actual !== false ? "selected" : ""}>From the weighbridge</option><option value="0" ${r.actual === false ? "selected" : ""}>Estimated (no weighbridge)</option></select></label></div>
      <label for="tpr-wtid">Waste tracking ID (if the site gives you one)<input id="tpr-wtid" maxlength="60" value="${esc(r.wtid || "")}" placeholder="from the ticket or the site"></label>
      ${r.ticket ? `<img class="tpr-tk" src="${blobUrl(r.ticket)}" alt="Weighbridge ticket">` : ""}
      <label for="tpr-tkin">📷 Photo of the weighbridge ticket${r.ticket ? " (to replace it)" : ""}<input id="tpr-tkin" type="file" accept="image/*"></label>
      <div class="grid2"><label for="tpr-td">Tipped on<input id="tpr-td" type="date" value="${esc(r.tippedDate || r.date)}"></label><label for="tpr-tt">At<input id="tpr-tt" type="time" value="${esc(r.tippedTime || nowHM())}"></label></div>
      ${formFoot(false, "Save")}`,
      async () => {
        const f = ($("tpr-tkin").files || [])[0];
        const data = {
          status: "tipped",
          weight: $("tpr-wt").value.trim(),
          wunit: $("tpr-wu").value,
          actual: $("tpr-act").value === "1",
          wtid: $("tpr-wtid").value.trim(),
          tippedDate: $("tpr-td").value,
          tippedTime: $("tpr-tt").value,
          tippedAt: Date.now(),
          updated: Date.now(),
        };
        if (!data.weight && !f && !r.ticket)
          return showErr("Add the weight or a photo of the ticket.");
        $("f-save").disabled = true;
        try {
          const files = f
            ? [
                {
                  blob: await shrinkImage(f, 2000),
                  name: "weighbridge ticket.jpg",
                  field: "ticket",
                },
              ]
            : [];
          const res = await save(r, data, files);
          closeForm();
          toast("Saved");
          render();
          if (!files.length) gate(res);
        } catch (e) {
          showErr(uploadErr(e));
          $("f-save").disabled = false;
        }
      },
      "tpr-wt",
    );
  }
  /* the list: by job and year, with the spreadsheet */
  let fYear = String(new Date().getFullYear()),
    fSite = "";
  function view() {
    const L0 = all();
    const years = [
      ...new Set(
        L0.map((r) => String(r.date || "").slice(0, 4))
          .filter(Boolean)
          .concat([String(new Date().getFullYear())]),
      ),
    ]
      .sort()
      .reverse();
    const L = L0.filter(
      (r) => String(r.date || "").startsWith(fYear) && (!fSite || same(r.site, fSite)),
    );
    const jobs = [...new Set(L0.map((r) => r.site).filter(Boolean))];
    const co = coData();
    openViewer(`<div class="tpr-page"><div class="vhead"><b>🚛 Tip runs</b></div>
      <div class="who">Each load taken to a tip or transfer station, with what the site needs for digital waste tracking.${co.wastePermit ? "" : ` Waste carrier registrations are being replaced by environmental permits – needed by your renewal date, and by 22 July 2027 at the latest.`}</div>
      <div class="actions"><button type="button" class="btn primary" id="tpr-new">🚛 New tip run</button>${ownerMode() ? '<button type="button" class="btn" id="tpr-csv">⬇ Spreadsheet</button>' : ""}</div>
      <div class="tpr-f"><label for="tpr-y">Year<select id="tpr-y">${years.map((y) => `<option ${y === fYear ? "selected" : ""}>${y}</option>`).join("")}</select></label><label for="tpr-j">Job<select id="tpr-j"><option value="">All jobs</option>${jobs.map((j) => `<option value="${esc(j)}" ${j === fSite ? "selected" : ""}>${esc(siteLabel(j))}</option>`).join("")}</select></label></div>
      ${
        L.map(
          (r) =>
            `<button type="button" class="tpr-row" data-id="${esc(r.id)}" data-w="${esc(r.who || "")}"><span class="tpr-st">${r.status === "tipped" ? "✅" : "🚛"}</span><span class="tpr-rw"><b>${esc(siteLabel(r.site) || "No job")}</b><span class="who">${esc(shortDay(r.date))}${r.time ? " " + esc(r.time) : ""} · ${esc(r.vehicle || "")}${r.driver ? " · " + esc(r.driver) : ""} → ${esc(r.toName || "")}</span><span class="who">${esc((r.lines || []).map((l) => l.code + " " + (l.desc || "")).join(", "))}${tot(r) ? " · " + esc(tot(r)) : ""}${r.status === "tipped" ? (r.wtid ? " · ID " + esc(r.wtid) : "") : " · ticket not added yet"}${(r.lines || []).some((l) => l.haz) ? ' · <span class="tag bad">hazardous</span>' : ""}</span></span></button>`,
        ).join("") ||
        '<div class="empty"><strong>No tip runs</strong>Tap 🚛 New tip run before the next load goes to the tip.</div>'
      }</div>`);
    $("tpr-new").onclick = () => {
      closeViewer();
      edit(null);
    };
    $("tpr-y").onchange = (e) => {
      fYear = e.target.value;
      view();
    };
    $("tpr-j").onchange = (e) => {
      fSite = e.target.value;
      view();
    };
    if ($("tpr-csv")) $("tpr-csv").onclick = () => csv(L);
    document.querySelectorAll(".tpr-row").forEach(
      (b) =>
        (b.onclick = () => {
          const r = L.find((x) => x.id === b.dataset.id && (x.who || "") === b.dataset.w);
          if (r) gate(r);
        }),
    );
  }
  async function csv(L) {
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const head = [
      "Date",
      "Time",
      "Job (producer site)",
      "Vehicle",
      "Driver",
      "EWC code",
      "Waste",
      "Hazardous",
      "Estimated",
      "Weight",
      "Unit",
      "Weighbridge or estimated",
      "Carried as",
      "Taken to",
      "Site permit",
      "Carrier number",
      "Waste tracking ID",
      "Tipped on",
    ];
    const rows = [];
    L.slice()
      .reverse()
      .forEach((r) =>
        (r.lines || []).forEach((l, i) =>
          rows.push([
            r.date,
            r.time,
            r.site,
            r.vehicle,
            r.driver,
            l.code,
            l.desc,
            l.haz ? "Yes" : "No",
            l.est ? l.est + " " + (l.unit || "t") : "",
            i === 0 ? r.weight || "" : "",
            i === 0 ? r.wunit || "" : "",
            r.status === "tipped" ? (r.actual === false ? "Estimated" : "Weighbridge") : "",
            r.cont,
            r.toName,
            r.toPermit,
            r.carrierNo,
            r.wtid || "",
            r.tippedDate || "",
          ]),
        ),
      );
    const text = [head]
      .concat(rows)
      .map((x) => x.map(q).join(","))
      .join("\r\n");
    const fn = `Tip runs ${fYear}${
      fSite
        ? " - " +
          String(siteLabel(fSite))
            .replace(/[^\w\s-]/g, "")
            .trim()
        : ""
    }.csv`;
    const blob = new Blob(["﻿" + text], { type: "text/csv" });
    try {
      if (S.dl) await S.dl.save({ filename: fn, data: blob });
      else {
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = u;
        a.download = fn;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
      }
      toast("Spreadsheet saved");
    } catch (e) {
      if (!(e && e.code === "declined")) toast("Couldn't save it");
    }
  }
  /* 📄 the load as a one-page PDF: "Waste movement record", on the letterhead */
  const refOf = (r) =>
    r.ref ||
    "TR-" +
      String(r.date || "")
        .replace(/-/g, "")
        .slice(2) +
      "-" +
      String(r.id || "")
        .slice(-4)
        .toUpperCase();
  async function pdf(r) {
    try {
      await loadJsPdf();
    } catch (e) {
      toast("Couldn't load the PDF maker. Check your connection.");
      return;
    }
    toast("Making the PDF…");
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const LH = await lhFrame();
    const W = 210,
      M = 15,
      CW = W - 2 * M;
    const RED = BRGB();
    const co = coData();
    let y = LH.top || 16;
    const clean = (t) =>
      String(t == null ? "" : t)
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g, "");
    if (!LH.pics) {
      doc.setFillColor(...RED);
      doc.rect(0, 0, W, 5, "F");
      try {
        await pdfLogo(doc, W - M, 10, 46, 20);
      } catch (e) {}
      y = 18;
    }
    doc.setTextColor(17, 17, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("Waste movement record", M, y + 4);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      clean(
        [
          co.name,
          "Tip run " + refOf(r),
          r.wtnRef ? "under waste transfer note " + r.wtnRef : "",
          "keep for 2 years",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      M,
      y,
    );
    y += 5;
    const head = (t) => {
      y += 2;
      doc.setDrawColor(...RED);
      doc.setLineWidth(0.7);
      doc.line(M, y, W - M, y);
      y += 5;
      doc.setTextColor(...RED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text(clean(t), M, y);
      y += 3;
    };
    /* label above, value below, a thin line under; two to a row */
    const field = (x, w, l, v, big) => {
      doc.setTextColor(90, 90, 90);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(clean(l), x, y + 3.5);
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(big ? 18 : 10);
      const ls = doc.splitTextToSize(clean(v || "-"), w).slice(0, 2);
      ls.forEach((t, i) => doc.text(t, x, y + (big ? 11 : 8) + i * 4.4));
      const h = (big ? 13.5 : 10) + (ls.length - 1) * 4.4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(x, y + h, x + w, y + h);
      return h;
    };
    const pair = (a, b) => {
      const hw = (CW - 8) / 2;
      const h1 = field(M, hw, a[0], a[1]);
      const h2 = b ? field(M + hw + 8, hw, b[0], b[1]) : 0;
      y += Math.max(h1, h2) + 1.5;
    };
    head("Carrier");
    pair(
      ["Carrier", co.name],
      [
        r.carrierKind || "Waste carrier registration",
        [r.carrierNo, r.carrierTier].filter(Boolean).join(" · "),
      ],
    );
    pair(["Vehicle registration", r.vehicle], ["Driver", r.driver]);
    head("Where the waste came from (producer)");
    const prod = producer(r.site);
    pair(
      ["Producer", (co.name || "") + ", building work"],
      ["Job address", [r.site, r.prodPostcode || prod.postcode].filter(Boolean).join(", ")],
    );
    pair(
      ["SIC code (2007)", r.sic || prod.sic],
      [
        "Left site",
        shortDay(r.date) + " " + (r.date || "").slice(0, 4) + (r.time ? ", " + r.time : ""),
      ],
    );
    head("The waste");
    const cols = [
      ["EWC code", 0, 26],
      ["Description", 26, 74],
      ["Hazardous", 100, 22],
      ["Carried as", 122, 28],
      ["Estimated", 150, 30],
    ];
    y += 1;
    doc.setFillColor(243, 237, 237);
    doc.rect(M, y, CW, 6, "F");
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    cols.forEach(([t, x]) => doc.text(t, M + x + 1.5, y + 4.2));
    y += 6;
    (r.lines || []).forEach((l) => {
      const d = doc.splitTextToSize(clean(l.desc || codeName(l.code)), 72);
      const h = Math.max(7, d.length * 4.2 + 3);
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(clean(l.code), M + 1.5, y + 4.8);
      doc.setFont("helvetica", "normal");
      d.forEach((t, i) => doc.text(t, M + 27.5, y + 4.8 + i * 4.2));
      if (l.haz) {
        doc.setTextColor(...RED);
        doc.setFont("helvetica", "bold");
      }
      doc.text(l.haz ? "YES" : "No", M + 101.5, y + 4.8);
      doc.setTextColor(17, 17, 17);
      doc.setFont("helvetica", "normal");
      doc.text(clean(r.cont || ""), M + 123.5, y + 4.8);
      doc.text(clean(l.est ? l.est + " " + (l.unit || "t") : "-"), M + 151.5, y + 4.8);
      y += h;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(M, y, W - M, y);
    });
    y += 2;
    head("Where it went (receiving site)");
    pair(["Site", r.toName], ["Environmental permit", r.toPermit]);
    pair(
      ["Address", r.toAddr],
      [
        "Tipped",
        r.status === "tipped"
          ? shortDay(r.tippedDate || r.date) + (r.tippedTime ? ", " + r.tippedTime : "")
          : "Not yet",
      ],
    );
    head("Weighbridge and tracking");
    const top = y;
    const tw = r.ticket ? CW - 60 : CW;
    const fy = (l, v, big) => {
      y += field(M, tw, l, v, big) + 1.5;
    };
    fy(
      "Weight",
      r.weight
        ? r.weight +
            " " +
            (r.wunit || "t") +
            (r.actual === false ? "  (estimated)" : "  from the weighbridge")
        : "Not added yet",
      true,
    );
    fy("Waste tracking ID (from the site)", r.wtid || "Not given", !!r.wtid);
    if (r.notes) fy("Notes", r.notes);
    if (r.ticket) {
      try {
        const b = await getFileBlob(r.ticket);
        const u = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.readAsDataURL(b);
        });
        const im = await loadImage(b);
        const maxH = Math.max(40, (LH.bot || 282) - 14 - top);
        let w = 54,
          h = (w * im.naturalHeight) / im.naturalWidth;
        if (h > maxH) {
          h = maxH;
          w = (h * im.naturalWidth) / im.naturalHeight;
        }
        doc.addImage(u, "JPEG", W - M - w, top + 1, w, h);
        doc.setFontSize(7.5);
        doc.setTextColor(90, 90, 90);
        doc.setFont("helvetica", "normal");
        doc.text("Weighbridge ticket photo", W - M, top + h + 5, { align: "right" });
        y = Math.max(y, top + h + 7);
      } catch (e) {}
    }
    /* foot line */
    const fyy = (LH.bot || 287) - 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, fyy - 4, W - M, fyy - 4);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text(
      doc.splitTextToSize(
        clean(
          `${co.name} · Tip run ${refOf(r)} · recorded in SiteHQ${r.driver ? " by " + r.driver : ""} · the receiving site records this load on the Digital Waste Tracking service`,
        ),
        CW,
      ),
      M,
      fyy,
    );
    lhFinish(doc, LH);
    const fn =
      `Waste movement ${refOf(r)} ${clean(siteLabel(r.site) || "")}`
        .replace(/[^\w\s-]/g, "")
        .trim() + ".pdf";
    try {
      await S.dl.save({ filename: fn, data: doc.output("blob") });
    } catch (e) {
      if (!(e && e.code === "declined")) toast("Download didn't go through");
    }
  }
  /* on a waste transfer note: its tip runs, and start one under it */
  function wtnHtml(n) {
    const L = all().filter((x) => x.wtnId === n.id);
    return `<div class="tpr-wtn"><b>🚛 Tip runs under this note${L.length ? " (" + L.length + ")" : ""}</b>${
      L.map(
        (x) =>
          `<button type="button" class="tpr-wrow" data-id="${esc(x.id)}" data-w="${esc(x.who || "")}">${x.status === "tipped" ? "✅" : "🚛"} ${esc(shortDay(x.date))} · ${esc(x.vehicle || "")} · ${esc((x.lines || []).map((l) => l.code).join(", "))}${tot(x) ? " · " + esc(tot(x)) : ""}${x.wtid ? " · ID " + esc(x.wtid) : ""}</button>`,
      ).join("") ||
      '<div class="who">None yet. One note can cover repeat loads of the same waste for up to 12 months.</div>'
    }<div class="actions"><button type="button" class="btn" id="tpr-fromwtn">🚛 Start a tip run under this note</button></div></div>`;
  }
  function wtnWire(n, before) {
    document.querySelectorAll(".tpr-wrow").forEach(
      (b) =>
        (b.onclick = () => {
          const x = all().find((y) => y.id === b.dataset.id && (y.who || "") === b.dataset.w);
          if (x) gate(x);
        }),
    );
    if ($("tpr-fromwtn"))
      $("tpr-fromwtn").onclick = async () => {
        try {
          if (before) await before();
        } catch (e) {}
        const c = n.B && n.B.clientId ? (S.clients || []).find((x) => x.id === n.B.clientId) : null;
        closeViewer();
        edit(null, {
          wtnId: n.id,
          wtnRef: n.ref,
          site: c ? clientSites(c)[0] || "" : "",
          toId: (n.D && n.D.siteId) || "",
          lines: ((n.A && n.A.lines) || []).map((l) => ({
            code: l.code || "17 09 04",
            desc: l.desc || "",
            haz: isHaz(l.code),
            est: "",
            unit: "t",
          })),
        });
      };
  }
  return { all, view, edit, gate, pdf, todayCard, wireToday, carrier, wtnHtml, wtnWire };
})();
