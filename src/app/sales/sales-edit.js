/* ================= SALES EDIT: one estimate or invoice, full screen – client, lines with amounts and VAT, totals ================= */
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { jfFor, jfOpen } from "./job-file.js";
import {
  SD_IK,
  SD_KINDS,
  SD_VATC,
  sdAmt,
  sdCalc,
  sdDueDate,
  sdFinalLines,
  sdIk,
  sdIsPf,
  sdJob,
  sdKind,
  sdLines,
  sdNextNumber,
  sdNo,
  sdR2,
  sdSales,
  sdSaveRec,
  sdSet,
  sdSigned,
  sdStatus,
  sdTag,
  sdVc,
} from "./sales-calc.js";
import { sdEmail } from "./sales-email.js";
import { sdSavePdf } from "./sales-pdf.js";
export { sdEdit, sdToInvoice };
/* Each line: what it's for, then its amount in £ (or, with "Price by quantity", qty × unit × rate worked out into
   the amount), its VAT (standard, reduced, zero, reverse charge, exempt, no VAT) and whether it's labour, materials
   or other (CIS is only taken off labour). The page shows each line's total and the totals as they're typed: before
   VAT, VAT at each rate, reverse charge, with VAT, less CIS, less retention, paid, due. Buttons: save, email, PDF,
   mark sent, accepted/declined, make an invoice (estimates), record a payment (invoices), delete. */
const SD_UNITS = [
  "item",
  "days",
  "hours",
  "m",
  "m²",
  "m³",
  "no.",
  "lengths",
  "bags",
  "tonnes",
  "loads",
  "sum",
];
const SD_MOVE = (what, i) =>
  `<span class="sd-lmv"><button type="button" class="iconbtn sd-lup" aria-label="Move ${what} ${i + 1} up">↑</button><button type="button" class="iconbtn sd-ldn" aria-label="Move ${what} ${i + 1} down">↓</button><button type="button" class="iconbtn sd-ldel" aria-label="Remove ${what} ${i + 1}">✕</button></span>`;
function sdLineRow(l, i, set) {
  if (l.h)
    return `<div class="sd-line sd-hrow" data-h="1" data-i="${i}">
    <div class="sd-lhd"><b>Heading</b>${SD_MOVE("heading", i)}</div>
    <input class="sd-lhx" maxlength="120" value="${esc(l.d || "")}" placeholder="e.g. Groundworks, or Kitchen" aria-label="Heading">
    <span class="sd-ltot"></span>
  </div>`;
  const qm = l.m === "q";
  const vc = sdVc(l, {});
  return `<div class="sd-line" data-i="${i}">
    <div class="sd-lhd"><b>Line ${i + 1}</b>${SD_MOVE("line", i)}</div>
    <textarea class="sd-ld" rows="2" maxlength="800" placeholder="What it's for, e.g. Build extension to wall plate" aria-label="Line ${i + 1}: what it's for">${esc(l.d || "")}</textarea>
    <div class="sd-lrow">
      <label class="sd-lf sd-lqf"${qm ? "" : " hidden"}>Quantity<input class="sd-lq" type="number" inputmode="decimal" step="any" value="${esc(qm ? (l.q == null ? "" : l.q) : "")}"></label>
      <label class="sd-lf sd-lqf"${qm ? "" : " hidden"}>Unit<input class="sd-lu" maxlength="12" list="sd-units" value="${esc(l.u || "")}" placeholder="e.g. m²"></label>
      <label class="sd-lf sd-lqf"${qm ? "" : " hidden"}>Rate £ each<input class="sd-lr" type="number" inputmode="decimal" step="0.01" value="${esc(qm ? (l.r == null ? "" : l.r) : "")}"></label>
      <label class="sd-lf sd-lamt">Amount £<input class="sd-la" type="number" inputmode="decimal" step="0.01" value="${esc(l.a != null && l.a !== "" ? l.a : l.r != null && l.r !== "" ? sdAmt(l) : "")}"${qm ? " readonly" : ""} placeholder="0.00"></label>
      <button type="button" class="linkbtn sd-lmode">${qm ? "Just an amount" : "Price by quantity"}</button>
    </div>
    <div class="sd-lrow">
      <label class="sd-lf sd-lvf"${set.vatReg === false ? " hidden" : ""}>VAT<select class="sd-lv">${Object.entries(
        SD_VATC,
      )
        .map(([k, v]) => `<option value="${k}"${k === vc ? " selected" : ""}>${esc(v.l)}</option>`)
        .join("")}</select></label>
      <label class="sd-lf">Type<select class="sd-lk">${Object.entries(SD_KINDS)
        .map(([k, v]) => `<option value="${k}"${k === sdKind(l) ? " selected" : ""}>${v}</option>`)
        .join("")}</select></label>
      <span class="sd-ltot"></span>
    </div>
  </div>`;
}
function sdEdit(d0) {
  const set = sdSet();
  const est = d0.type === "estimate";
  const d = Object.assign(
    {
      date: iso(new Date()),
      lines: [{ d: "", a: "", vc: set.vatReg === false ? "NV" : set.vc || "S20", k: "lab" }],
      status: "draft",
      cis: "",
      inc: !!set.inc,
    },
    JSON.parse(JSON.stringify(d0)),
  );
  if (!d.number) d.number = String(sdNextNumber(d.type, sdIsPf(d)));
  if (est) {
    /* everything the estimate says, from its own record (a brought-in Word estimate keeps its own), else the usual */
    if (d.intro == null) d.intro = set.intro;
    if (d.costNote == null) d.costNote = set.costNote;
    if (d.closing == null) d.closing = set.closing;
    if (d.signoff == null) d.signoff = set.signoff;
    if (!d.inclHead) d.inclHead = set.inclHead;
    if (!d.bd) d.bd = d.from ? "total" : (d.lines || []).some((l) => l && l.h) ? "head" : "all";
  }
  /* older records: a whole-invoice reverse charge becomes each line's VAT code */
  d.lines = (d.lines || []).map((l) => Object.assign({}, l, { vc: sdVc(l, d), k: sdKind(l) }));
  delete d.drc;
  const clients = (S.clients || [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  openViewer(`<div class="sd-ed">
    <div class="sd-edtop"><h3 style="margin:0">${est ? "📝 Estimate " + esc(d.number) + ((+d.ver || 1) > 1 ? " · version " + d.ver : "") : "🧾 " + esc(SD_IK[sdIk(d)]) + " " + esc(sdNo(d))}</h3>${d0.id ? sdTag(d) : ""}</div>
    ${est && (d.versions || []).length ? `<div class="who sd-vers">Earlier versions: ${d.versions.map((v, i) => `<button type="button" class="pillbtn sd-vpdf" data-i="${i}">v${v.ver} · ${esc(shortDay(v.date || ""))} · ${gbp(v.net || 0)} 📄</button>`).join(" ")}</div>` : ""}
    ${
      !est
        ? `<div class="grid2"><label for="sd-ik">Type of invoice<select id="sd-ik">${Object.entries(
            SD_IK,
          )
            .map(
              ([k, l]) => `<option value="${k}"${k === sdIk(d) ? " selected" : ""}>${l}</option>`,
            )
            .join("")}</select></label>
      <label for="sd-from">Part of a job<select id="sd-from"><option value="">Not for an estimate (stand-alone)</option>${sdSales()
        .filter((x) => x.type === "estimate")
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map(
          (x) =>
            `<option value="${esc(x.id)}"${x.id === d.fromId ? " selected" : ""}>EST-${esc(x.number)} · ${esc(x.client || "")}${x.title ? " – " + esc(x.title) : ""}</option>`,
        )
        .join("")}</select></label></div>
      <label class="inl" id="sd-afl"${sdIk(d) === "extra" ? "" : " hidden"}><input type="checkbox" id="sd-af"${d.af ? " checked" : ""}> Add this extra work to the final invoice (don't send it on its own)</label>
      <div id="sd-finrow"${sdIk(d) === "final" ? "" : " hidden"}><button type="button" class="btn" id="sd-fin">↻ Work out the final invoice from the estimate</button><span class="who"> The estimate, plus extra work saved for the final invoice, less the deposit and instalments already invoiced.</span></div>
      ${sdIsPf(d) ? `<div class="notice">A pro forma asks for payment before the work. It isn't a VAT invoice and isn't counted as money invoiced. When it's paid, tap ✅ Paid – make the invoice.</div>` : ""}`
        : ""
    }
    ${sdJobHtml(d)}
    <div class="grid2">
      <label for="sd-no">${est ? "Estimate" : "Invoice"} number<input id="sd-no" maxlength="20" value="${esc(d.number)}"></label>
      <label for="sd-date">Date<input id="sd-date" type="date" value="${esc(d.date)}"></label>
    </div>
    ${clients.length ? `<label for="sd-cl">Client<select id="sd-cl"><option value="">Type the details below, or pick a client…</option>${clients.map((c) => `<option value="${esc(c.id)}"${d.clientId === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : ""}
    <div class="grid2">
      <label for="sd-client">Name<input id="sd-client" maxlength="120" value="${esc(d.client || "")}" placeholder="e.g. Mrs A Smith"></label>
      <label for="sd-email">Email<input id="sd-email" type="email" maxlength="120" value="${esc(d.email || "")}"></label>
    </div>
    <label for="sd-addr">Address (one line each)<textarea id="sd-addr" rows="4" maxlength="400">${esc(d.address || "")}</textarea></label>
    <div class="grid2">
      <label for="sd-title">Re: (the job)<input id="sd-title" maxlength="120" value="${esc(d.title || "")}" placeholder="e.g. Rear extension"></label>
      <label for="sd-site">Site<input id="sd-site" maxlength="160" value="${esc(d.site || "")}" list="sd-sites"></label>
    </div>
    <datalist id="sd-sites">${(S.sites || []).map((s) => `<option value="${esc(s.name)}">`).join("")}</datalist>
    <datalist id="sd-units">${SD_UNITS.map((u) => `<option value="${u}">`).join("")}</datalist>
    ${
      est
        ? `<label for="sd-dear">Dear…<input id="sd-dear" maxlength="80" value="${esc(d.dear || "")}" placeholder="e.g. Mrs Smith"></label>
    <label for="sd-intro">Opening words<textarea id="sd-intro" rows="6" maxlength="6000">${esc(d.intro || "")}</textarea></label>`
        : `<div class="grid2"><label for="sd-due">Payment due<input id="sd-due" type="date" value="${esc(sdDueDate(d))}"></label><label for="sd-ref">Their order or ref (optional)<input id="sd-ref" maxlength="60" value="${esc(d.ref || "")}"></label></div>`
    }
    <div class="flabel">${est ? "Summary of costs" : "What it's for"}</div>
    ${
      set.vatReg === false
        ? `<div class="who">You're set as not VAT registered, so no VAT is added. Change it in ⚙️ Letterhead, terms & bank.</div>`
        : `<div class="grid2 sd-vatbar"><label for="sd-inc">The amounts I type are<select id="sd-inc"><option value="">Before VAT (VAT added on top)</option><option value="1"${d.inc ? " selected" : ""}>Including VAT</option></select></label>
      <label for="sd-vall">Set every line's VAT to<select id="sd-vall"><option value="">Choose…</option>${Object.entries(
        SD_VATC,
      )
        .map(([k, v]) => `<option value="${k}">${esc(v.l)}</option>`)
        .join("")}</select></label></div>`
    }
    <div id="sd-lines">${d.lines.map((l, i) => sdLineRow(l, i, set)).join("")}</div>
    <div class="sd-acts"><button type="button" class="btn" id="sd-addl">+ Add a line</button><button type="button" class="btn" id="sd-addh">+ Add a heading</button></div>
    ${
      est
        ? `<label for="sd-valid">Valid for (days)<input id="sd-valid" type="number" inputmode="numeric" value="${esc(d.validDays || set.validDays)}"></label>
    <label for="sd-incl">Works included (one per line, numbered on the PDF)<textarea id="sd-incl" rows="7" maxlength="8000">${esc(d.incl || "")}</textarea></label>
    <label for="sd-excl">Works excluded (one per line)<textarea id="sd-excl" rows="6" maxlength="8000">${esc(d.excl || "")}</textarea></label>
    <label for="sd-bd">On the estimate, show<select id="sd-bd"><option value="total"${d.bd === "total" ? " selected" : ""}>The total only</option><option value="head"${d.bd === "head" ? " selected" : ""}>Each heading's total, then the total</option><option value="all"${d.bd === "all" ? " selected" : ""}>Every line and heading, then the total</option></select></label>
    <label for="sd-ih">Heading for works included<input id="sd-ih" maxlength="120" value="${esc(d.inclHead || "")}"></label>
    <label for="sd-cn">Note under the total (in italics)<textarea id="sd-cn" rows="2" maxlength="1500">${esc(d.costNote || "")}</textarea></label>
    <label for="sd-cw">Closing words<textarea id="sd-cw" rows="5" maxlength="6000">${esc(d.closing || "")}</textarea></label>
    <label for="sd-so">Sign-off (one line each)<textarea id="sd-so" rows="2" maxlength="200">${esc(d.signoff || "")}</textarea></label>`
        : `<div class="grid2"><label for="sd-cis">CIS (when you work for a contractor)<select id="sd-cis"><option value="">No CIS</option><option value="20"${d.cis === "20" ? " selected" : ""}>They take 20% off the labour</option><option value="30"${d.cis === "30" ? " selected" : ""}>They take 30% off the labour</option><option value="0"${d.cis === "0" ? " selected" : ""}>Gross status (nothing taken off)</option></select></label>
      <label for="sd-ret">Retention held back %<input id="sd-ret" type="number" inputmode="decimal" step="0.5" value="${esc(d.ret || "")}" placeholder="e.g. 5"></label></div>`
    }
    <label for="sd-notes">Notes on the ${est ? "estimate" : "invoice"} (optional)<textarea id="sd-notes" rows="2" maxlength="2000">${esc(d.notes || "")}</textarea></label>
    <div class="sd-tot" id="sd-tot"></div>
    ${!est && (d.payments || []).length ? `<div class="flabel">Payments</div>${d.payments.map((p, i) => `<div class="drow"><span>${esc(shortDay(p.date))}${p.note ? " · " + esc(p.note) : ""}</span><span>${gbp(p.amt)} <button type="button" class="linkdanger sd-pdel" data-i="${i}">Remove</button></span></div>`).join("")}` : ""}
    <div class="sd-edacts">
      <button type="button" class="btn primary" id="sd-save">Save</button>
      <button type="button" class="btn" id="sd-mail">📧 Email</button>
      <button type="button" class="btn" id="sd-pdf">📄 PDF</button>
      <button type="button" class="btn" id="sd-jf">📁 Job file${(() => {
        const j = jfFor(d);
        return j && (j.items || []).length ? ` (${j.items.length})` : "";
      })()}</button>
      ${
        est
          ? `<button type="button" class="btn" id="sd-sent">📨 Mark as sent</button><button type="button" class="btn" id="sd-acc">✅ Accepted</button><button type="button" class="btn" id="sd-dec">✖ Declined</button><button type="button" class="btn" id="sd-toinv">🧾 Make an invoice</button>`
          : `<button type="button" class="btn" id="sd-sent">📨 Mark as sent</button><button type="button" class="btn" id="sd-pay">💷 Record a payment</button>${sdIsPf(d) && d0.id && d.status !== "converted" ? `<button type="button" class="btn primary" id="sd-pfconv">✅ Paid – make the invoice</button>` : ""}`
      }
      ${d0.id ? `<button type="button" class="linkdanger" id="sd-del">Delete</button>` : ""}
      <button type="button" class="btn" id="sd-close">Close</button>
    </div>
  </div>`);
  const num = (v) => (v === "" || v == null ? "" : sdR2(v));
  const readLine = (r) => {
    if (r.dataset.h) return { h: 1, d: r.querySelector(".sd-lhx").value.trim() };
    const qm = !r.querySelector(".sd-lqf").hidden;
    const o = {
      d: r.querySelector(".sd-ld").value.trim(),
      vc: r.querySelector(".sd-lv").value,
      k: r.querySelector(".sd-lk").value,
    };
    if (qm) {
      const q = r.querySelector(".sd-lq").value,
        rt = r.querySelector(".sd-lr").value;
      Object.assign(o, {
        m: "q",
        q: q === "" ? "" : +q,
        u: r.querySelector(".sd-lu").value.trim(),
        r: num(rt),
      });
      o.a = q !== "" && rt !== "" ? sdR2(+q * +rt) : "";
    } else o.a = num(r.querySelector(".sd-la").value);
    return o;
  };
  const read = () => {
    const lines = [...document.querySelectorAll("#sd-lines .sd-line")].map(readLine);
    const o = Object.assign({}, d, {
      number: $("sd-no").value.trim(),
      date: $("sd-date").value || iso(new Date()),
      clientId: $("sd-cl") ? $("sd-cl").value : d.clientId || "",
      client: $("sd-client").value.trim(),
      email: $("sd-email").value.trim(),
      address: $("sd-addr").value.trim(),
      title: $("sd-title").value.trim(),
      site: $("sd-site").value.trim(),
      notes: $("sd-notes").value.trim(),
      inc: $("sd-inc") ? $("sd-inc").value === "1" : false,
      lines: lines.filter((l) => (l.h ? l.d : l.d || l.a !== "")),
    });
    if (est)
      Object.assign(o, {
        dear: $("sd-dear").value.trim(),
        intro: $("sd-intro").value,
        validDays: +$("sd-valid").value || 30,
        incl: $("sd-incl").value,
        excl: $("sd-excl").value,
        bd: $("sd-bd").value,
        inclHead: $("sd-ih").value.trim(),
        costNote: $("sd-cn").value,
        closing: $("sd-cw").value,
        signoff: $("sd-so").value,
      });
    else
      Object.assign(o, {
        dueDate: $("sd-due").value,
        ref: $("sd-ref").value.trim(),
        cis: $("sd-cis").value,
        ret: num($("sd-ret").value),
        ik: $("sd-ik").value,
        fromId: $("sd-from").value,
        af: $("sd-ik").value === "extra" && $("sd-af").checked,
      });
    return o;
  };
  const totals = () => {
    const o = read(),
      c = sdCalc(o);
    let head = null;
    const subOf = new Map();
    document.querySelectorAll("#sd-lines .sd-line").forEach((r) => {
      const l = readLine(r);
      if (l.h) {
        head = r;
        subOf.set(r, 0);
        return;
      }
      if (l.m === "q") r.querySelector(".sd-la").value = l.a === "" ? "" : l.a.toFixed(2);
      r.querySelector(".sd-ltot").innerHTML = `Line total <b>${sdSigned(sdAmt(l))}</b>`;
      if (head) subOf.set(head, subOf.get(head) + sdAmt(l));
    });
    subOf.forEach(
      (v, r) => (r.querySelector(".sd-ltot").innerHTML = `Heading total <b>${gbp(v)}</b>`),
    );
    const rows = [[o.inc ? "Total before VAT (worked out)" : "Total before VAT", gbp(c.net), 1]];
    if (set.vatReg !== false)
      Object.keys(c.byRate).forEach((k) => {
        const v = SD_VATC[k];
        if (v.rc)
          rows.push([
            `Reverse charge ${v.r}% on ${gbp(c.byRate[k].net)} (they pay HMRC ${gbp(c.byRate[k].vat)})`,
            "£0.00",
          ]);
        else if (v.r)
          rows.push([`VAT at ${v.r}% on ${gbp(c.byRate[k].net)}`, gbp(c.byRate[k].vat)]);
        else rows.push([`${v.l.split(" (")[0]} on ${gbp(c.byRate[k].net)}`, "£0.00"]);
      });
    rows.push(["Total with VAT", gbp(c.gross), 1]);
    if (c.cis) rows.push([`Less CIS ${o.cis}% on labour of ${gbp(c.lab)}`, "-" + gbp(c.cis)]);
    if (c.ret) rows.push([`Less retention ${o.ret}%`, "-" + gbp(c.ret)]);
    if (c.paid) rows.push(["Paid so far", "-" + gbp(c.paid)]);
    if (!est) rows.push(["Amount due", gbp(c.balance), 2]);
    $("sd-tot").innerHTML = rows
      .map(
        ([k, v, b]) =>
          `<div class="drow${b === 2 ? " sd-due" : ""}"><span>${b ? `<b>${esc(k)}</b>` : esc(k)}</span>${b ? `<b>${v}</b>` : `<span>${v}</span>`}</div>`,
      )
      .join("");
  };
  const renumber = () => {
    let n = 0;
    document.querySelectorAll("#sd-lines .sd-line").forEach((r, i) => {
      r.dataset.i = i;
      if (!r.dataset.h) r.querySelector(".sd-lhd b").textContent = "Line " + ++n;
    });
  };
  const wireLines = () => {
    document
      .querySelectorAll("#sd-lines input, #sd-lines select, #sd-lines textarea")
      .forEach((x) => (x.oninput = x.onchange = totals));
    document.querySelectorAll("#sd-lines .sd-ldel").forEach(
      (b) =>
        (b.onclick = () => {
          b.closest(".sd-line").remove();
          renumber();
          totals();
        }),
    );
    document.querySelectorAll("#sd-lines .sd-lup, #sd-lines .sd-ldn").forEach(
      (b) =>
        (b.onclick = () => {
          const r = b.closest(".sd-line");
          if (b.classList.contains("sd-lup") && r.previousElementSibling)
            r.parentNode.insertBefore(r, r.previousElementSibling);
          else if (b.classList.contains("sd-ldn") && r.nextElementSibling)
            r.parentNode.insertBefore(r.nextElementSibling, r);
          renumber();
          totals();
        }),
    );
    document.querySelectorAll("#sd-lines .sd-lmode").forEach(
      (b) =>
        (b.onclick = () => {
          const r = b.closest(".sd-line");
          const toQ = r.querySelector(".sd-lqf").hidden;
          r.querySelectorAll(".sd-lqf").forEach((x) => (x.hidden = !toQ));
          const a = r.querySelector(".sd-la");
          a.readOnly = toQ;
          if (toQ) {
            r.querySelector(".sd-lq").value = "1";
            r.querySelector(".sd-lr").value = a.value;
            r.querySelector(".sd-lq").focus();
          }
          b.textContent = toQ ? "Just an amount" : "Price by quantity";
          totals();
        }),
    );
  };
  $("sd-addl").onclick = () => {
    const n = document.querySelectorAll("#sd-lines .sd-line").length;
    const lines0 = document.querySelectorAll("#sd-lines .sd-line:not(.sd-hrow)");
    const last = lines0[lines0.length - 1];
    $("sd-lines").insertAdjacentHTML(
      "beforeend",
      sdLineRow(
        {
          d: "",
          a: "",
          vc: last ? last.querySelector(".sd-lv").value : set.vc || "S20",
          k: last ? last.querySelector(".sd-lk").value : "lab",
        },
        n,
        set,
      ),
    );
    wireLines();
    totals();
    const all = document.querySelectorAll("#sd-lines .sd-ld");
    all[all.length - 1].focus();
  };
  $("sd-addh").onclick = () => {
    const n = document.querySelectorAll("#sd-lines .sd-line").length;
    $("sd-lines").insertAdjacentHTML("beforeend", sdLineRow({ h: 1, d: "" }, n, set));
    wireLines();
    totals();
    const all = document.querySelectorAll("#sd-lines .sd-lhx");
    all[all.length - 1].focus();
  };
  wireLines();
  ["sd-cis", "sd-ret", "sd-inc"].forEach(
    (id) => $(id) && ($(id).oninput = $(id).onchange = totals),
  );
  if ($("sd-ik")) {
    $("sd-ik").onchange = () => {
      const k = $("sd-ik").value;
      $("sd-afl").hidden = k !== "extra";
      $("sd-finrow").hidden = k !== "final";
      if (!d0.id) $("sd-no").value = String(sdNextNumber("invoice", k === "proforma"));
    };
    $("sd-fin").onclick = () => {
      const e = sdSales().find((x) => x.id === $("sd-from").value);
      if (!e) return toast("Choose the estimate it's for (Part of a job)");
      const fl = sdFinalLines(e, cur ? cur.id : d0.id);
      $("sd-lines").innerHTML = fl.lines.map((l, i) => sdLineRow(l, i, set)).join("");
      if (!$("sd-client").value) {
        $("sd-client").value = e.client || "";
        $("sd-addr").value = e.address || "";
        $("sd-email").value = e.email || "";
        $("sd-title").value = e.title || "";
      }
      wireLines();
      totals();
      toast(
        "Worked out: " +
          (fl.held.length
            ? fl.held.length +
              " extra work invoice" +
              (fl.held.length === 1 ? "" : "s") +
              " added, "
            : "") +
          "earlier invoices taken off",
      );
    };
  }
  if ($("sd-pfconv"))
    $("sd-pfconv").onclick = async () => {
      const r = await save(null, true);
      if (r) sdPfToInvoice(r);
    };
  if ($("sd-vall"))
    $("sd-vall").onchange = () => {
      const v = $("sd-vall").value;
      if (v) document.querySelectorAll("#sd-lines .sd-lv").forEach((s) => (s.value = v));
      $("sd-vall").value = "";
      totals();
    };
  if ($("sd-cl"))
    $("sd-cl").onchange = () => {
      const c = clients.find((x) => x.id === $("sd-cl").value);
      if (!c) return;
      $("sd-client").value = c.name || "";
      $("sd-email").value = c.email || "";
      $("sd-addr").value = [String(c.address || "").replace(/\s*,\s*/g, "\n"), c.postcode]
        .filter(Boolean)
        .join("\n");
      if (!$("sd-site").value) $("sd-site").value = c.site || "";
      if ($("sd-dear") && !$("sd-dear").value) $("sd-dear").value = c.name || "";
    };
  totals();
  let cur = d0.id ? d : null;
  const save = async (patch, quiet) => {
    const o = Object.assign(read(), patch || {});
    if (!o.client) {
      toast("Put who it's for");
      return null;
    }
    try {
      cur = await sdSaveRec(Object.assign(o, { id: cur ? cur.id : d0.id }));
      Object.assign(d, cur);
      if (cur.type === "invoice" && sdIk(cur) === "final" && cur.fromId) {
        const e = sdSales().find((x) => x.id === cur.fromId);
        if (e)
          for (const x of sdFinalLines(e, cur.id).held.filter((x) => !x.inFinal))
            await sdSaveRec(Object.assign({}, x, { inFinal: cur.id }));
      }
      if (!quiet) toast("Saved");
      return cur;
    } catch (e) {
      toast("Couldn't save. Check your connection.");
      return null;
    }
  };
  const done = () => {
    closeViewer();
    render();
  };
  const VER_KEYS = [
    "lines",
    "intro",
    "incl",
    "excl",
    "costNote",
    "closing",
    "bd",
    "validDays",
    "title",
    "notes",
    "inc",
    "dear",
    "address",
  ];
  const changed = (o) =>
    VER_KEYS.some(
      (k) =>
        JSON.stringify(o[k] == null ? null : o[k]) !== JSON.stringify(d0[k] == null ? null : d0[k]),
    );
  $("sd-save").onclick = async () => {
    const o = read();
    if (est && d0.id && ["sent", "accepted", "declined"].includes(d0.status) && changed(o)) {
      const v = +d0.ver || 1;
      openSheet(
        `<h3 id="sheettitle">Save as version ${v + 1}?</h3>
        <div class="who">Estimate ${esc(d0.number)} has already been sent. Save your changes as version ${v + 1} (version ${v} is kept, and you can still open it), or just save over version ${v}.</div>
        <div class="actions"><button type="button" class="btn primary" id="sv-new">Save as version ${v + 1}</button><button type="button" class="btn" id="sv-over">Save over version ${v}</button><button type="button" class="btn" id="sv-no">Cancel</button></div>`,
        () => {},
      );
      const ff = $("f-save");
      if (ff) ff.hidden = true;
      $("sv-no").onclick = closeForm;
      $("sv-over").onclick = async () => {
        closeForm();
        if (await save()) done();
      };
      $("sv-new").onclick = async () => {
        const snap = {};
        VER_KEYS.concat(["date", "number"]).forEach((k) => (snap[k] = d0[k]));
        const versions = (d0.versions || []).concat([
          { ver: v, date: d0.date, net: sdCalc(d0).net, sentAt: d0.sentAt || 0, snap },
        ]);
        closeForm();
        if (
          await save(
            { ver: v + 1, versions, status: "draft", sentAt: 0, date: iso(new Date()) },
            true,
          )
        ) {
          toast("Saved as version " + (v + 1) + " – send it when it's ready");
          done();
        }
      };
      return;
    }
    if (await save()) done();
  };
  document.querySelectorAll(".sd-vpdf").forEach(
    (b) =>
      (b.onclick = () => {
        const v = d.versions[+b.dataset.i];
        sdSavePdf(Object.assign({}, d, v.snap, { ver: v.ver, versions: [] }));
      }),
  );
  document
    .querySelectorAll(".sd-jobrow")
    .forEach((b) => (b.onclick = () => sdEdit(sdSales().find((x) => x.id === b.dataset.id))));
  $("sd-close").onclick = done;
  $("sd-pdf").onclick = async () => {
    const r = await save(null, true);
    if (r) await sdSavePdf(r);
  };
  $("sd-jf").onclick = async () => {
    const r = await save(null, true);
    if (r) jfOpen(r);
  };
  $("sd-mail").onclick = async () => {
    const r = await save(null, true);
    if (!r) return;
    sdEmail(r, async (e) => {
      const st =
        r.status && r.status !== "draft" ? r.status : r.type === "estimate" ? "sent" : "awaiting";
      try {
        await sdSaveRec(
          Object.assign({}, r, {
            status: st,
            sentAt: r.sentAt || e.at,
            email: r.email || e.to,
            emails: (r.emails || []).concat([e]),
          }),
        );
        toast("Noted as emailed");
        done();
      } catch (er) {}
    });
  };
  $("sd-sent").onclick = async () => {
    const r = await save(
      { status: est ? "sent" : "awaiting", sentAt: d.sentAt || Date.now() },
      true,
    );
    if (r) {
      toast(est ? "Marked as sent" : "Marked as sent: now waiting to be paid");
      done();
    }
  };
  if (est) {
    const mark = (st, msg) => async () => {
      if (await save({ status: st }, true)) {
        toast(msg);
        done();
      }
    };
    $("sd-acc").onclick = mark("accepted", "Marked as accepted 🎉");
    $("sd-dec").onclick = mark("declined", "Marked as declined");
    $("sd-toinv").onclick = async () => {
      const r = await save(null, true);
      if (r) sdToInvoice(r);
    };
  } else {
    $("sd-pay").onclick = async () => {
      const r = await save(null, true);
      if (r) sdPayment(r);
    };
    document.querySelectorAll(".sd-pdel").forEach(
      (b) =>
        (b.onclick = async () => {
          const pays = (d.payments || []).slice();
          pays.splice(+b.dataset.i, 1);
          if (await save({ payments: pays }, true)) sdEdit(cur);
        }),
    );
  }
  if ($("sd-del"))
    $("sd-del").onclick = async () => {
      try {
        await S.db.doc("todos/" + d0.id).delete();
        toast("Deleted (it's in Deleted items for 30 days)");
        done();
      } catch (e) {
        toast("Couldn't delete");
      }
    };
}

/* ---------- a payment in ---------- */
function sdPayment(d) {
  const c = sdCalc(d);
  openSheet(
    `<h3 id="sheettitle">💷 Payment for invoice ${esc(d.number)}</h3>
    <div class="who">Still to pay: <b>${gbp(c.balance)}</b></div>
    <div class="grid2"><label for="sp-amt">Amount £<input id="sp-amt" type="number" inputmode="decimal" step="0.01" value="${c.balance > 0 ? c.balance.toFixed(2) : ""}"></label><label for="sp-date">Date paid<input id="sp-date" type="date" value="${iso(new Date())}"></label></div>
    <label for="sp-note">Note (optional)<input id="sp-note" maxlength="100" placeholder="e.g. bank transfer"></label>
    ${formFoot(false, "Save payment")}`,
    async () => {
      const amt = sdR2($("sp-amt").value);
      if (!(amt > 0)) return showErr("Put the amount paid.");
      $("f-save").disabled = true;
      try {
        const pays = (d.payments || []).concat([
          { amt, date: $("sp-date").value || iso(new Date()), note: $("sp-note").value.trim() },
        ]);
        const r = await sdSaveRec(
          Object.assign({}, d, {
            payments: pays,
            status: d.status === "draft" ? "awaiting" : d.status,
          }),
        );
        closeForm();
        closeViewer();
        toast(sdStatus(r) === "paid" ? "Paid in full ✓" : "Payment saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "sp-amt",
  );
}

/* ---------- a job's account: the estimate and every invoice for it ---------- */
function sdJobHtml(d) {
  const e =
    d.type === "estimate"
      ? d.id
        ? d
        : null
      : d.fromId
        ? sdSales().find((x) => x.id === d.fromId)
        : null;
  if (!e) return "";
  const j = sdJob(e);
  if (!j.invs.length && d.type === "estimate") return "";
  return `<section class="card sd-job"><div class="cardbody"><b>Job account – estimate ${esc(e.number)}${(+e.ver || 1) > 1 ? " v" + e.ver : ""}</b>
    ${j.invs
      .map(
        (x) =>
          `<button type="button" class="drow sd-jobrow${x.id === d.id ? " on" : ""}" data-id="${esc(x.id)}"><span>${esc(sdNo(x))} · ${esc(SD_IK[sdIk(x)])}${x.part && sdIk(x) !== "deposit" ? " – " + esc(x.part) : ""} ${sdTag(x)}</span><span>${gbp(sdCalc(x).net)}</span></button>`,
      )
      .join("")}
    <div class="drow"><span>Estimate (before VAT)</span><span>${gbp(j.net)}</span></div>
    ${j.extras ? `<div class="drow"><span>Extra work</span><span>${gbp(j.extras)}</span></div>` : ""}
    <div class="drow"><span>Invoiced so far</span><span>${gbp(j.invoiced)}</span></div>
    <div class="drow"><span>Paid so far (with VAT)</span><span>${gbp(j.paid)}</span></div>
    <div class="drow sd-due"><span><b>Still to invoice</b></span><b>${gbp(j.toInvoice)}</b></div>
  </div></section>`;
}
/* ---------- estimate → invoice, of any type ---------- */
function sdToInvoice(e) {
  const c = sdCalc(e);
  const job = sdJob(e);
  const vc0 = (sdLines(e)[0] && sdVc(sdLines(e)[0], e)) || sdSet().vc || "S20";
  openSheet(
    `<h3 id="sheettitle">🧾 Invoice for estimate ${esc(e.number)}</h3>
    <div class="who">Estimate ${gbp(c.net)} before VAT · invoiced so far ${gbp(job.invoiced)} · still to invoice ${gbp(job.toInvoice)}</div>
    <label for="sti-k">What kind of invoice<select id="sti-k">
      <option value="deposit">Deposit</option><option value="stage">Instalment (stage payment)</option><option value="extra">Extra work</option><option value="final">Final payment (works it all out)</option><option value="oneoff">The whole estimate in one invoice</option><option value="proforma">Pro forma (payment before the work)</option>
    </select></label>
    <div id="sti-amt">
      <label class="inl"><input type="radio" name="sti" value="pct" checked> <input id="sti-pct" type="number" inputmode="decimal" value="25" style="width:80px" aria-label="Percent"> % of the estimate</label>
      <label class="inl"><input type="radio" name="sti" value="amt"> £ <input id="sti-amt2" type="number" inputmode="decimal" step="0.01" style="width:120px" aria-label="Amount"> before VAT</label>
      <label for="sti-lab">Called<input id="sti-lab" maxlength="80" placeholder="e.g. Deposit, or Stage 2: to wall plate"></label>
    </div>
    <div class="who" id="sti-help"></div>
    ${formFoot(false, "Make the invoice")}`,
    async () => {
      const k = $("sti-k").value;
      let lines,
        part = "",
        pfFor = "";
      const lab = $("sti-lab").value.trim();
      if (["deposit", "stage", "proforma"].includes(k)) {
        const how = (document.querySelector('input[name="sti"]:checked') || {}).value;
        const amt =
          how === "pct"
            ? sdR2((c.net * (+$("sti-pct").value || 0)) / 100)
            : sdR2($("sti-amt2").value);
        if (!(amt > 0)) return showErr("Put the % or amount.");
        part =
          lab ||
          (k === "deposit"
            ? `Deposit ${how === "pct" ? +$("sti-pct").value + "%" : ""}`.trim()
            : k === "stage"
              ? "Stage payment"
              : how === "pct"
                ? `${+$("sti-pct").value}% of the estimate`
                : "Payment before the work");
        pfFor =
          k === "proforma" ? (/deposit/i.test(part) || how === "pct" ? "deposit" : "stage") : "";
        lines = [
          {
            d: `${part} on estimate ${e.number}${e.title ? " – " + e.title : ""}`,
            a: amt,
            vc: vc0,
            k: "lab",
          },
        ];
      } else if (k === "extra") {
        part = "Extra work";
        lines = [{ d: "", a: "", vc: vc0, k: "lab" }];
      } else if (k === "final") {
        part = "Final payment";
        lines = sdFinalLines(e, "").lines;
      } else {
        lines = JSON.parse(JSON.stringify(e.lines || [])).map((l) =>
          l.h ? l : Object.assign(l, { vc: sdVc(l, e), k: sdKind(l), a: sdAmt(l) }),
        );
      }
      $("f-save").disabled = true;
      try {
        const inv = await sdSaveRec({
          type: "invoice",
          ik: k,
          pfFor,
          date: iso(new Date()),
          clientId: e.clientId || "",
          client: e.client,
          email: e.email || "",
          address: e.address || "",
          title: e.title || "",
          site: e.site || "",
          lines,
          inc: !!e.inc,
          part,
          fromId: e.id,
          status: "draft",
          cis: "",
        });
        if (k === "final")
          for (const x of sdFinalLines(e, inv.id).held.filter((x) => !x.inFinal))
            await sdSaveRec(Object.assign({}, x, { inFinal: inv.id }));
        if (!["accepted", "invoiced"].includes(e.status) || k === "final" || k === "oneoff")
          await sdSaveRec(
            Object.assign({}, e, {
              status: k === "final" || k === "oneoff" ? "invoiced" : "accepted",
            }),
          );
        closeForm();
        toast(
          `${SD_IK[k]} ${sdNo(inv)} made – ${k === "extra" ? "put in the extra work, then" : "check it and"} send it`,
        );
        S.f.sv = "inv";
        sdEdit(inv);
      } catch (er) {
        showErr("Couldn't make it. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
  const help = {
    deposit: "A deposit to take before the start date.",
    stage: "A stage payment as the work goes on – give it a name, e.g. Stage 2: to wall plate.",
    extra:
      "Work that wasn't in the estimate. Send it on its own, or tick 'Add this extra work to the final invoice'.",
    final:
      "Works it all out: the estimate, plus extra work saved for the final invoice, less the deposit and instalments already invoiced.",
    oneoff: "The whole estimate on one invoice.",
    proforma:
      "Asks for payment before the work. Not a VAT invoice; when it's paid it becomes a proper invoice.",
  };
  const show = () => {
    const k = $("sti-k").value;
    $("sti-amt").hidden = !["deposit", "stage", "proforma"].includes(k);
    $("sti-help").textContent = help[k];
  };
  $("sti-k").onchange = show;
  show();
}
/* ---------- a paid pro forma becomes a proper invoice (with the next invoice number) ---------- */
async function sdPfToInvoice(pf) {
  try {
    const o = JSON.parse(JSON.stringify(pf));
    delete o.id;
    delete o.number;
    delete o.emails;
    const inv = await sdSaveRec(
      Object.assign(o, {
        ik: pf.pfFor || "oneoff",
        fromPf: pf.id,
        date: iso(new Date()),
        status: "awaiting",
        sentAt: Date.now(),
        created: Date.now(),
      }),
    );
    await sdSaveRec(Object.assign({}, pf, { status: "converted", convId: inv.id }));
    toast(
      `Invoice ${inv.number} made from pro forma ${pf.number}${sdCalc(inv).paid ? " (payment carried over)" : ""}`,
    );
    sdEdit(inv);
  } catch (e) {
    toast("Couldn't make it. Check your connection.");
  }
}
