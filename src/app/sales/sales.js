/* ================= ESTIMATES & INVOICES (owner): money in – an overview like an accounts package, estimates and invoices to clients ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import {
  SD_VAT,
  sdCalc,
  sdDueDate,
  sdNextNumber,
  sdNo,
  sdR2,
  sdSales,
  sdSet,
  sdStatus,
  sdTag,
  sdTaxYear,
} from "./sales-calc.js";
import { sdReadDocx } from "./sales-docx.js";
import { sdEmail } from "./sales-email.js";
import { sdSavePdf } from "./sales-pdf.js";
export { salesView };
/* The page: tabs Invoices | Estimates. Invoices: boxes for drafts, waiting to be paid, overdue and paid in the last
   30 days, money invoiced and paid over 6 months, this tax year's totals (VAT, CIS taken off), then the list.
   Estimates: drafts, sent, accepted and the win rate. Each opens full screen to edit, make the PDF on the
   letterhead, mark sent, record a payment, or turn an estimate into an invoice (all, a deposit or a stage). */
function salesView() {
  const all = sdSales();
  const est = (S.f.sv || "inv") === "est";
  const today = iso(new Date());
  const list0 = all.filter((d) => d.type === (est ? "estimate" : "invoice"));
  const f = (est ? S.f.sef : S.f.sif) || "all";
  const q = String(S.f.sq || "").toLowerCase();
  const list = list0
    .filter((d) => f === "all" || sdStatus(d) === f || (f === "awaiting" && sdStatus(d) === "part"))
    .filter((d) => !q || [d.number, d.client, d.title, d.site].join(" ").toLowerCase().includes(q))
    .sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (+b.number || 0) - (+a.number || 0),
    );
  const box = (k, n, money, label, cls) =>
    `<button type="button" class="sd-box ${cls || ""}" data-f="${k}"><small>${label}</small><b>${money}</b><span>${n} ${n === 1 ? "item" : "items"}</span></button>`;
  let tiles = "",
    extra = "";
  if (!est) {
    const by = (st) => list0.filter((d) => sdStatus(d) === st);
    const sum = (arr, k) => arr.reduce((a, d) => a + sdCalc(d)[k], 0);
    const aw = list0.filter((d) => ["awaiting", "part"].includes(sdStatus(d)));
    const od = by("overdue");
    const from30 = iso(addDays(new Date(), -30));
    const paid30 = list0.reduce(
      (a, d) =>
        a +
        (d.payments || []).filter((p) => p.date >= from30).reduce((x, p) => x + (+p.amt || 0), 0),
      0,
    );
    tiles =
      box("draft", by("draft").length, gbp(sum(by("draft"), "due")), "Draft") +
      box("awaiting", aw.length, gbp(sum(aw, "balance")), "Awaiting payment") +
      box("overdue", od.length, gbp(sum(od, "balance")), "Overdue", od.length ? "bad" : "") +
      box("paid", by("paid").length, gbp(paid30), "Paid in last 30 days", "ok");
    /* 6 months: invoiced (by invoice date) and paid (by payment date) */
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 5 + i);
      return iso(d).slice(0, 7);
    });
    const inv = months.map((m) =>
      list0
        .filter((d) => sdStatus(d) !== "draft" && (d.date || "").slice(0, 7) === m)
        .reduce((a, d) => a + sdCalc(d).gross, 0),
    );
    const pd = months.map((m) =>
      list0.reduce(
        (a, d) =>
          a +
          (d.payments || [])
            .filter((p) => (p.date || "").slice(0, 7) === m)
            .reduce((x, p) => x + (+p.amt || 0), 0),
        0,
      ),
    );
    const top = Math.max(1, ...inv, ...pd);
    extra = `<div class="card sd-chart"><div class="cardbody"><b>Money invoiced and paid</b><div class="sd-key"><i class="sd-ki"></i> Invoiced <i class="sd-kp"></i> Paid</div>
      <div class="sd-bars">${months
        .map(
          (m, i) =>
            `<div class="sd-mon" title="${esc(m)}: invoiced ${gbp(inv[i])}, paid ${gbp(pd[i])}"><div class="sd-pair"><i class="sd-bi" style="height:${Math.round((inv[i] / top) * 100)}%"></i><i class="sd-bp" style="height:${Math.round((pd[i] / top) * 100)}%"></i></div><small>${esc(parse(m + "-01").toLocaleDateString("en-GB", { month: "short" }))}</small></div>`,
        )
        .join("")}</div></div></div>`;
    const ty = sdTaxYear(today);
    const inTy = list0.filter((d) => sdStatus(d) !== "draft" && d.date && sdTaxYear(d.date) === ty);
    const tyc = inTy.map(sdCalc);
    extra += `<div class="who sd-ty">This tax year (from 6 April ${ty}): invoiced <b>${gbp(tyc.reduce((a, c) => a + c.net, 0))}</b> before VAT · VAT charged <b>${gbp(tyc.reduce((a, c) => a + c.vat, 0))}</b>${tyc.some((c) => c.cis) ? ` · CIS taken off you <b>${gbp(tyc.reduce((a, c) => a + c.cis, 0))}</b>` : ""}</div>`;
  } else {
    const by = (st) => list0.filter((d) => sdStatus(d) === st);
    const sum = (arr) => arr.reduce((a, d) => a + sdCalc(d).net, 0);
    const won = list0.filter((d) => ["accepted", "invoiced"].includes(sdStatus(d)));
    const decided = won.length + by("declined").length;
    tiles =
      box("draft", by("draft").length, gbp(sum(by("draft"))), "Draft") +
      box("sent", by("sent").length, gbp(sum(by("sent"))), "Sent, waiting to hear") +
      box("accepted", won.length, gbp(sum(won)), "Accepted", "ok") +
      box("declined", by("declined").length, gbp(sum(by("declined"))), "Declined");
    extra = decided
      ? `<div class="who sd-ty">Won ${won.length} of ${decided} decided (${Math.round((won.length / decided) * 100)}%). Prices before VAT.</div>`
      : `<div class="who sd-ty">Prices before VAT.</div>`;
  }
  const filters = est
    ? [
        ["all", "All"],
        ["draft", "Draft"],
        ["sent", "Sent"],
        ["accepted", "Accepted"],
        ["declined", "Declined"],
        ["invoiced", "Invoiced"],
      ]
    : [
        ["all", "All"],
        ["draft", "Draft"],
        ["awaiting", "Awaiting payment"],
        ["overdue", "Overdue"],
        ["paid", "Paid"],
      ];
  $("main").innerHTML = `<div class="sd-page">
    <div class="seg sd-tabs" id="sd-tabs"><button type="button" data-v="inv" aria-pressed="${!est}">Invoices</button><button type="button" data-v="est" aria-pressed="${est}">Estimates</button></div>
    <div class="sd-acts"><button type="button" class="btn primary" id="sd-new">+ New ${est ? "estimate" : "invoice"}</button>${est ? `<span class="btn sd-filebtn">📄 Bring in a Word estimate<input type="file" class="sd-file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Bring in a Word estimate"></span>` : ""}<button type="button" class="btn" id="sd-set">⚙️ Letterhead, terms & bank</button></div>
    <div class="sd-boxes">${tiles}</div>
    ${extra}
    <div class="sd-filt"><div class="seg" id="sd-f">${filters.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div><input id="sd-q" type="search" placeholder="Search number, client or job" value="${esc(S.f.sq || "")}" aria-label="Search"></div>
    ${
      list.length
        ? `<div class="sd-list">${list
            .map((d) => {
              const c = sdCalc(d),
                st = sdStatus(d);
              return `<button type="button" class="sd-row" data-id="${esc(d.id)}"><span class="sd-no">${esc(sdNo(d))}</span><span class="sd-who"><b>${esc(d.client || "No client yet")}</b><small>${esc([d.title, d.site].filter(Boolean).join(" · "))}</small></span><span class="sd-dt"><small>${d.date ? esc(shortDay(d.date)) : ""}</small>${!est && st !== "draft" && st !== "paid" ? `<small class="${st === "overdue" ? "sd-late" : ""}">due ${esc(shortDay(sdDueDate(d)))}</small>` : ""}</span><span class="sd-amt"><b>${gbp(est ? c.net : st === "paid" || st === "draft" ? c.due : c.balance)}</b>${sdTag(d)}</span></button>`;
            })
            .join("")}</div>`
        : `<div class="empty"><strong>${list0.length ? "Nothing here" : est ? "No estimates yet" : "No invoices yet"}</strong>${list0.length ? "Try another filter." : est ? "Tap + New estimate, or bring in one you wrote in Word." : "Tap + New invoice, or turn an accepted estimate into one."}</div>`
    }
  </div>`;
  $("sd-tabs")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.sv = b.dataset.v;
          render();
        }),
    );
  const setF = (v) => {
    if (est) S.f.sef = v;
    else S.f.sif = v;
    render();
  };
  $("sd-f")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => setF(b.dataset.v)));
  $("main")
    .querySelectorAll(".sd-box")
    .forEach((b) => (b.onclick = () => setF(b.dataset.f === f ? "all" : b.dataset.f)));
  $("sd-q").oninput = (e) => {
    S.f.sq = e.target.value;
    clearTimeout(window.__sdQ);
    window.__sdQ = setTimeout(() => {
      render();
      const el = $("sd-q");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 300);
  };
  $("sd-new").onclick = () => sdEdit({ type: est ? "estimate" : "invoice" });
  $("sd-set").onclick = sdSettings;
  $("main")
    .querySelectorAll(".sd-row")
    .forEach((b) => (b.onclick = () => sdEdit(all.find((d) => d.id === b.dataset.id))));
  const fi = $("main").querySelector(".sd-file");
  if (fi)
    fi.onchange = async () => {
      const file = fi.files[0];
      fi.value = "";
      if (file) sdImportWord(file);
    };
}

/* ---------- saving ---------- */
async function sdSaveRec(d) {
  const rec = Object.assign({}, d, { kind: "sale", updated: Date.now() });
  const id = rec.id || "sd-" + newId();
  delete rec.id;
  if (!rec.number) rec.number = String(sdNextNumber(rec.type));
  if (!rec.created) rec.created = Date.now();
  await S.db.doc("todos/" + id).set(rec);
  /* keep the next number ahead of every one used */
  const k = rec.type === "estimate" ? "nextEst" : "nextInv";
  if ((+rec.number || 0) >= (+sdSet()[k] || 1))
    await S.db
      .doc("todos/salesset")
      .set(Object.assign({}, S.salesSet || {}, { kind: "salesset", [k]: (+rec.number || 0) + 1 }));
  return Object.assign({ id }, rec);
}

/* ---------- one estimate or invoice, full screen ---------- */
function sdEdit(d0) {
  const set = sdSet();
  const est = d0.type === "estimate";
  const d = Object.assign(
    {
      date: iso(new Date()),
      lines: [{ d: "", q: 1, r: "", v: 20, lab: true }],
      status: "draft",
      cis: "",
      drc: false,
    },
    JSON.parse(JSON.stringify(d0)),
  );
  if (!d.number) d.number = String(sdNextNumber(d.type));
  if (est && d.intro == null) d.intro = set.intro;
  const clients = (S.clients || [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const lineRow = (l, i) =>
    `<div class="sd-line" data-i="${i}"><textarea class="sd-ld" rows="1" maxlength="600" placeholder="What it's for" aria-label="Description">${esc(l.d || "")}</textarea><input class="sd-lq" type="number" inputmode="decimal" step="any" value="${esc(l.q == null ? 1 : l.q)}" aria-label="Quantity"><input class="sd-lr" type="number" inputmode="decimal" step="0.01" value="${esc(l.r == null ? "" : l.r)}" placeholder="£" aria-label="Price each"><select class="sd-lv" aria-label="VAT">${SD_VAT.map((v) => `<option value="${v}"${+(l.v == null ? 20 : l.v) === v ? " selected" : ""}>${v}%</option>`).join("")}</select><label class="sd-lab" title="Labour (CIS is taken off labour only)"><input type="checkbox" class="sd-ll"${l.lab !== false ? " checked" : ""}> Labour</label><button type="button" class="iconbtn sd-ldel" aria-label="Remove line">✕</button></div>`;
  openViewer(`<div class="sd-ed">
    <div class="sd-edtop"><h3 style="margin:0">${est ? "📝 Estimate" : "🧾 Invoice"} ${esc(d.number)}</h3>${d0.id ? sdTag(d) : ""}</div>
    <div class="grid2">
      <label for="sd-no">${est ? "Estimate" : "Invoice"} number<input id="sd-no" maxlength="20" value="${esc(d.number)}"></label>
      <label for="sd-date">Date<input id="sd-date" type="date" value="${esc(d.date)}"></label>
    </div>
    ${clients.length ? `<label for="sd-cl">Client<select id="sd-cl"><option value="">Type the details below, or pick a client…</option>${clients.map((c) => `<option value="${esc(c.id)}"${d.clientId === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : ""}
    <div class="grid2">
      <label for="sd-client">Name<input id="sd-client" maxlength="120" value="${esc(d.client || "")}" placeholder="e.g. Mrs A Smith"></label>
      <label for="sd-email">Email<input id="sd-email" type="email" maxlength="120" value="${esc(d.email || "")}"></label>
    </div>
    <label for="sd-addr">Address<textarea id="sd-addr" rows="3" maxlength="400">${esc(d.address || "")}</textarea></label>
    <div class="grid2">
      <label for="sd-title">Re: (the job)<input id="sd-title" maxlength="120" value="${esc(d.title || "")}" placeholder="e.g. Rear extension"></label>
      <label for="sd-site">Site<input id="sd-site" maxlength="160" value="${esc(d.site || "")}" list="sd-sites"></label>
    </div>
    <datalist id="sd-sites">${(S.sites || []).map((s) => `<option value="${esc(s.name)}">`).join("")}</datalist>
    ${
      est
        ? `<label for="sd-dear">Dear…<input id="sd-dear" maxlength="80" value="${esc(d.dear || "")}" placeholder="e.g. Mrs Smith"></label>
    <label for="sd-intro">Opening words<textarea id="sd-intro" rows="5" maxlength="4000">${esc(d.intro || "")}</textarea></label>`
        : `<div class="grid2"><label for="sd-due">Payment due<input id="sd-due" type="date" value="${esc(sdDueDate(d))}"></label><label for="sd-ref">Their order or ref (optional)<input id="sd-ref" maxlength="60" value="${esc(d.ref || "")}"></label></div>`
    }
    <div class="flabel">${est ? "Summary of costs" : "What it's for"}</div>
    <div class="sd-lhead"><span>Description</span><span>Qty</span><span>Price £</span><span>VAT</span><span></span><span></span></div>
    <div id="sd-lines">${d.lines.map(lineRow).join("")}</div>
    <button type="button" class="linkbtn" id="sd-addl">+ Add a line</button>
    ${
      est
        ? `<label for="sd-valid">Valid for (days)<input id="sd-valid" type="number" inputmode="numeric" value="${esc(d.validDays || set.validDays)}"></label>
    <label for="sd-incl">Works included (one per line)<textarea id="sd-incl" rows="6" maxlength="6000">${esc(d.incl || "")}</textarea></label>
    <label for="sd-excl">Works excluded (one per line)<textarea id="sd-excl" rows="5" maxlength="6000">${esc(d.excl || "")}</textarea></label>`
        : `<div class="grid2"><label for="sd-cis">CIS (when you work for a contractor)<select id="sd-cis"><option value="">No CIS</option><option value="20"${d.cis === "20" ? " selected" : ""}>They take 20% off labour</option><option value="30"${d.cis === "30" ? " selected" : ""}>They take 30% off labour</option><option value="0"${d.cis === "0" ? " selected" : ""}>Gross status (nothing taken off)</option></select></label>
      <label class="inl sd-drcl"><input type="checkbox" id="sd-drc"${d.drc ? " checked" : ""}> Reverse charge VAT (a VAT-registered builder who'll sell the work on)</label></div>`
    }
    <label for="sd-notes">Notes on the ${est ? "estimate" : "invoice"} (optional)<textarea id="sd-notes" rows="2" maxlength="2000">${esc(d.notes || "")}</textarea></label>
    <div class="sd-tot" id="sd-tot"></div>
    ${!est && (d.payments || []).length ? `<div class="flabel">Payments</div>${d.payments.map((p, i) => `<div class="drow"><span>${esc(shortDay(p.date))}${p.note ? " · " + esc(p.note) : ""}</span><span>${gbp(p.amt)} <button type="button" class="linkdanger sd-pdel" data-i="${i}">Remove</button></span></div>`).join("")}` : ""}
    <div class="sd-edacts">
      <button type="button" class="btn primary" id="sd-save">Save</button>
      <button type="button" class="btn" id="sd-mail">📧 Email</button>
      <button type="button" class="btn" id="sd-pdf">📄 PDF</button>
      ${
        est
          ? `<button type="button" class="btn" id="sd-sent">📨 Mark as sent</button><button type="button" class="btn" id="sd-acc">✅ Accepted</button><button type="button" class="btn" id="sd-dec">✖ Declined</button><button type="button" class="btn" id="sd-toinv">🧾 Make an invoice</button>`
          : `<button type="button" class="btn" id="sd-sent">📨 Mark as sent</button><button type="button" class="btn" id="sd-pay">💷 Record a payment</button>`
      }
      ${d0.id ? `<button type="button" class="linkdanger" id="sd-del">Delete</button>` : ""}
      <button type="button" class="btn" id="sd-close">Close</button>
    </div>
  </div>`);
  const read = () => {
    const lines = [...document.querySelectorAll("#sd-lines .sd-line")].map((r) => ({
      d: r.querySelector(".sd-ld").value.trim(),
      q: r.querySelector(".sd-lq").value === "" ? 1 : +r.querySelector(".sd-lq").value,
      r: r.querySelector(".sd-lr").value === "" ? "" : sdR2(r.querySelector(".sd-lr").value),
      v: +r.querySelector(".sd-lv").value,
      lab: r.querySelector(".sd-ll").checked,
    }));
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
      lines: lines.filter((l) => l.d || l.r !== ""),
    });
    if (est)
      Object.assign(o, {
        dear: $("sd-dear").value.trim(),
        intro: $("sd-intro").value,
        validDays: +$("sd-valid").value || 30,
        incl: $("sd-incl").value,
        excl: $("sd-excl").value,
      });
    else
      Object.assign(o, {
        dueDate: $("sd-due").value,
        ref: $("sd-ref").value.trim(),
        cis: $("sd-cis").value,
        drc: $("sd-drc").checked,
      });
    return o;
  };
  const totals = () => {
    const o = read(),
      c = sdCalc(o);
    $("sd-tot").innerHTML =
      `<div class="drow"><span>Total before VAT</span><b>${gbp(c.net)}</b></div>
      <div class="drow"><span>VAT</span><span>${o.drc ? "Reverse charge" : gbp(c.vat)}</span></div>
      <div class="drow"><span>Total${o.drc ? "" : " with VAT"}</span><b>${gbp(c.gross)}</b></div>
      ${c.cis ? `<div class="drow"><span>Less CIS ${esc(o.cis)}% on labour of ${gbp(c.lab)}</span><span>-${gbp(c.cis)}</span></div>` : ""}
      ${c.paid ? `<div class="drow"><span>Paid so far</span><span>-${gbp(c.paid)}</span></div>` : ""}
      ${est ? "" : `<div class="drow sd-due"><span>Amount due</span><b>${gbp(c.balance)}</b></div>`}`;
    document
      .querySelectorAll("#sd-lines .sd-lab")
      .forEach((x) => (x.style.visibility = !est && +o.cis ? "visible" : "hidden"));
  };
  const wireLines = () => {
    document
      .querySelectorAll("#sd-lines input, #sd-lines select, #sd-lines textarea")
      .forEach((x) => (x.oninput = x.onchange = totals));
    document.querySelectorAll("#sd-lines .sd-ldel").forEach(
      (b) =>
        (b.onclick = () => {
          b.closest(".sd-line").remove();
          totals();
        }),
    );
  };
  $("sd-addl").onclick = () => {
    const n = document.querySelectorAll("#sd-lines .sd-line").length;
    $("sd-lines").insertAdjacentHTML(
      "beforeend",
      lineRow({ d: "", q: 1, r: "", v: d.drc ? 0 : 20, lab: true }, n),
    );
    wireLines();
    totals();
    const all = document.querySelectorAll("#sd-lines .sd-ld");
    all[all.length - 1].focus();
  };
  wireLines();
  ["sd-cis", "sd-drc"].forEach((id) => $(id) && ($(id).onchange = totals));
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
      if (!quiet) toast("Saved");
      return cur;
    } catch (e) {
      toast("Couldn't save. Check your connection.");
      return null;
    }
  };
  $("sd-save").onclick = async () => {
    if (await save()) {
      closeViewer();
      render();
    }
  };
  $("sd-close").onclick = () => {
    closeViewer();
    render();
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
        closeViewer();
        render();
      } catch (er) {}
    });
  };
  $("sd-pdf").onclick = async () => {
    const r = await save(null, true);
    if (r) await sdSavePdf(r);
  };
  $("sd-sent").onclick = async () => {
    const r = await save(
      { status: est ? "sent" : "awaiting", sentAt: d.sentAt || Date.now() },
      true,
    );
    if (r) {
      toast(est ? "Marked as sent" : "Marked as sent: now waiting to be paid");
      closeViewer();
      render();
    }
  };
  if (est) {
    const mark = (st, msg) => async () => {
      if (await save({ status: st }, true)) {
        toast(msg);
        closeViewer();
        render();
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
        closeViewer();
        render();
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

/* ---------- estimate → invoice (all of it, a deposit, or a stage) ---------- */
function sdToInvoice(e) {
  const c = sdCalc(e);
  const done = sdSales().filter((x) => x.type === "invoice" && x.fromId === e.id);
  const already = done.reduce((a, x) => a + sdCalc(x).net, 0);
  openSheet(
    `<h3 id="sheettitle">🧾 Invoice for estimate ${esc(e.number)}</h3>
    <div class="who">Estimate ${gbp(c.net)} before VAT.${done.length ? ` Already invoiced: ${gbp(already)} on ${done.length} invoice${done.length === 1 ? "" : "s"}.` : ""}</div>
    <label class="inl"><input type="radio" name="sti" value="all" checked> The whole estimate${already ? " (less what's been invoiced)" : ""}</label>
    <label class="inl"><input type="radio" name="sti" value="pct"> A deposit or stage as a % <input id="sti-pct" type="number" inputmode="decimal" value="25" style="width:80px" aria-label="Percent"> %</label>
    <label class="inl"><input type="radio" name="sti" value="amt"> A stage of £ <input id="sti-amt" type="number" inputmode="decimal" step="0.01" style="width:120px" aria-label="Amount"> before VAT</label>
    <label for="sti-lab">Called (for a deposit or stage)<input id="sti-lab" maxlength="80" placeholder="e.g. Deposit, or Stage 2: to wall plate"></label>
    ${formFoot(false, "Make the invoice")}`,
    async () => {
      const how = (document.querySelector('input[name="sti"]:checked') || {}).value;
      let lines,
        part = "";
      const lab = $("sti-lab").value.trim();
      if (how === "all") {
        lines = JSON.parse(JSON.stringify(e.lines || []));
        if (already)
          lines.push({ d: "Less already invoiced", q: 1, r: -sdR2(already), v: 20, lab: true });
      } else {
        const amt =
          how === "pct"
            ? sdR2((c.net * (+$("sti-pct").value || 0)) / 100)
            : sdR2($("sti-amt").value);
        if (!(amt > 0)) return showErr("Put the % or amount.");
        part = lab || (how === "pct" ? `Deposit ${+$("sti-pct").value}%` : "Stage payment");
        lines = [
          {
            d: `${part} on estimate ${e.number}${e.title ? " – " + e.title : ""}`,
            q: 1,
            r: amt,
            v: c.vat ? 20 : 0,
            lab: true,
          },
        ];
      }
      $("f-save").disabled = true;
      try {
        const inv = await sdSaveRec({
          type: "invoice",
          date: iso(new Date()),
          clientId: e.clientId || "",
          client: e.client,
          email: e.email || "",
          address: e.address || "",
          title: e.title || "",
          site: e.site || "",
          lines,
          part,
          fromId: e.id,
          status: "draft",
          cis: "",
          drc: false,
        });
        await sdSaveRec(Object.assign({}, e, { status: how === "all" ? "invoiced" : "accepted" }));
        closeForm();
        toast("Invoice " + inv.number + " made – check it and mark it sent");
        S.f.sv = "inv";
        sdEdit(inv);
      } catch (er) {
        showErr("Couldn't make it. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
}

/* ---------- settings: letterhead footer, wording, terms, bank ---------- */
function sdSettings() {
  const s = sdSet();
  openSheet(
    `<h3 id="sheettitle">⚙️ Letterhead, terms & bank</h3>
    <div class="who">Your logo, address, phone, email and VAT number come from Setup › My company details.</div>
    <div class="grid2"><label for="ss-ne">Next estimate number<input id="ss-ne" type="number" inputmode="numeric" value="${esc(sdNextNumber("estimate"))}"></label><label for="ss-ni">Next invoice number<input id="ss-ni" type="number" inputmode="numeric" value="${esc(sdNextNumber("invoice"))}"></label></div>
    <div class="grid2"><label for="ss-pd">Invoices due after (days)<input id="ss-pd" type="number" inputmode="numeric" value="${esc(s.payDays)}"></label><label for="ss-vd">Estimates valid for (days)<input id="ss-vd" type="number" inputmode="numeric" value="${esc(s.validDays)}"></label></div>
    <label for="ss-tag">Line at the foot of each page<input id="ss-tag" maxlength="160" value="${esc(s.tagline)}"></label>
    <label for="ss-bank">Bank details for invoices<textarea id="ss-bank" rows="3" maxlength="400" placeholder="Account name, sort code, account number">${esc(s.bank)}</textarea></label>
    <label for="ss-in">Thank-you line on invoices<input id="ss-in" maxlength="200" value="${esc(s.invNote)}"></label>
    <label for="ss-intro">Standard opening words on estimates<textarea id="ss-intro" rows="4" maxlength="4000">${esc(s.intro)}</textarea></label>
    <label for="ss-close">Standard closing words on estimates<textarea id="ss-close" rows="4" maxlength="4000">${esc(s.closing)}</textarea></label>
    <label for="ss-terms">Terms and conditions (printed after each estimate)<textarea id="ss-terms" rows="8" maxlength="60000">${esc(s.terms)}</textarea></label>
    <div class="who">Tip: bring in one of your Word estimates (Estimates › Bring in a Word estimate) to fill these in from it.</div>
    ${formFoot(false, "Save")}`,
    async () => {
      $("f-save").disabled = true;
      try {
        await S.db.doc("todos/salesset").set(
          Object.assign({}, S.salesSet || {}, {
            kind: "salesset",
            nextEst: +$("ss-ne").value || 1,
            nextInv: +$("ss-ni").value || 1,
            payDays: +$("ss-pd").value || 14,
            validDays: +$("ss-vd").value || 30,
            tagline: $("ss-tag").value.trim(),
            bank: $("ss-bank").value.trim(),
            invNote: $("ss-in").value.trim(),
            intro: $("ss-intro").value,
            closing: $("ss-close").value,
            terms: $("ss-terms").value,
          }),
        );
        closeForm();
        toast("Saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
}

/* ---------- bring in a Word estimate ---------- */
async function sdImportWord(file) {
  toast("Reading " + file.name + "…");
  let r;
  try {
    r = await sdReadDocx(file);
  } catch (e) {
    return toast("Couldn't read that file. Is it a Word (.docx) file?");
  }
  const e = r.est,
    c = sdCalc(e);
  const taken =
    e.number &&
    sdSales().some((x) => x.type === "estimate" && String(x.number) === String(e.number));
  openSheet(
    `<h3 id="sheettitle">📄 ${esc(file.name)}</h3>
    <div class="sd-imp">
      <div class="drow"><span>Client</span><b>${esc(e.client || "–")}</b></div>
      <div class="drow"><span>Estimate number</span><b>${esc(e.number || "–")}</b></div>
      <div class="drow"><span>Re:</span><b>${esc(e.title || "–")}</b></div>
      <div class="drow"><span>Total</span><b>${gbp(c.net)}${c.vat ? " +VAT" : ""}</b></div>
      <div class="drow"><span>Works included / excluded</span><b>${e.incl.split("\n").filter(Boolean).length} / ${e.excl.split("\n").filter(Boolean).length} lines</b></div>
    </div>
    <label class="inl"><input type="checkbox" id="si-est" checked> Add it as an estimate${taken ? " (that number is already used, so it gets the next one)" : ""}</label>
    ${r.terms ? `<label class="inl"><input type="checkbox" id="si-terms" checked> Use its terms and conditions (${r.terms.split("\n").length} paragraphs) as my standard terms</label>` : ""}
    ${r.intro || r.closing ? `<label class="inl"><input type="checkbox" id="si-words"> Use its opening and closing words as my standard wording</label>` : ""}
    ${formFoot(false, "Bring it in")}`,
    async () => {
      $("f-save").disabled = true;
      try {
        if ($("si-terms") && $("si-terms").checked)
          S.salesSet = Object.assign({}, S.salesSet || {}, { terms: r.terms });
        if ($("si-words") && $("si-words").checked)
          S.salesSet = Object.assign(
            {},
            S.salesSet || {},
            r.intro ? { intro: r.intro } : {},
            r.closing ? { closing: r.closing } : {},
          );
        if (($("si-terms") && $("si-terms").checked) || ($("si-words") && $("si-words").checked))
          await S.db.doc("todos/salesset").set(Object.assign({}, S.salesSet, { kind: "salesset" }));
        let made = null;
        if ($("si-est").checked) {
          const o = Object.assign({}, e, {
            intro: r.intro || sdSet().intro,
            status: "sent",
            sentAt: Date.now(),
            from: file.name,
          });
          if (taken || !o.number) delete o.number;
          if (!o.date) o.date = iso(new Date());
          made = await sdSaveRec(o);
        }
        closeForm();
        toast(made ? "Estimate " + made.number + " brought in" : "Saved");
        S.f.sv = "est";
        render();
      } catch (er) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
}
