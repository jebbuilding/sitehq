/* ================= CIS RETURNS (owner): the monthly CIS return – what each subcontractor was paid and the tax taken off ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { sdCalc, sdR2, sdSales } from "./sales-calc.js";
import { sdShareMail } from "./sales-email.js";
import { sdLongDate } from "./sales-pdf.js";
export { cisView };
/* A tax month runs from the 6th to the 5th; the return is due by the 19th and the tax paid to HMRC by the 22nd.
   Payments are the CIS workers' invoices marked paid in that month (plus any added by hand). For each, James puts
   the VAT and materials in it; tax is taken off the rest at the worker's rate (20% registered, 30% not, 0% gross).
   The page adds it up the way HMRC's online return asks for it, makes the payment and deduction statements, and
   links to HMRC's CIS online service to file it (filing straight from the app would need HMRC to approve the app
   as CIS software). Owner-private: todos/cissubs (rates, verification numbers, employer reference) and
   todos/cis-YYYY-MM (kind "cismonth": the month's VAT/materials per payment, extra payments, when it was filed). */
const CIS_HMRC = "https://www.gov.uk/use-construction-industry-scheme-online";
const CIS_GUIDE =
  "https://www.gov.uk/what-you-must-do-as-a-cis-contractor/file-your-monthly-returns";
/* the tax month a date is in, named by the month it ends in ("2026-11" = 6 Oct – 5 Nov 2026) */
function cisMonthOf(di) {
  const d = parse(di);
  if (d.getDate() >= 6) d.setMonth(d.getMonth() + 1, 1);
  return iso(d).slice(0, 7);
}
function cisRange(key) {
  const end = parse(key + "-05");
  const start = new Date(end);
  start.setMonth(start.getMonth() - 1, 6);
  return [iso(start), iso(end)];
}
const cisLab = (key) => {
  const [a, b] = cisRange(key).map(parse);
  return `6 ${a.toLocaleDateString("en-GB", { month: "short" })} – 5 ${b.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
};
const cisDown = (n) => Math.floor((+n || 0) * 100 + 1e-6) / 100;
const cisCfg = () => Object.assign({ subs: {}, empRef: "" }, S.cisSubs || {});
const cisRec = (key) => (S.cisMonths || []).find((m) => m.month === key) || { pays: {}, extra: [] };
function cisWorkers() {
  return teamIds().filter((w) => ((S.team[w] && S.team[w].details) || {}).empType === "cis");
}
const cisRateOf = (w) => {
  const r = (cisCfg().subs[w] || {}).rate;
  return r === "0" || r === "30" ? r : "20";
};
/* the month's payments: [{ k, who, date, amt, vat, mat, gross, labour, ded, paid, label, skip }] */
function cisPayments(key) {
  const [from, to] = cisRange(key);
  const rec = cisRec(key);
  const ws = cisWorkers();
  const out = [];
  allTeam("invoices")
    .filter(isInv)
    .forEach((v) => {
      if (!ws.includes(v.who) || (v.status || "") !== "paid" || !(v.paidOn || v.paidAt)) return;
      const di = v.paidOn || iso(new Date(v.paidAt));
      if (di < from || di > to) return;
      const k = v.who + "|" + v.id;
      const o = (rec.pays || {})[k] || {};
      out.push({
        k,
        who: v.who,
        date: di,
        amt: +v.amount || 0,
        vat: +o.vat || 0,
        mat: +o.mat || 0,
        skip: !!o.skip,
        label: "Invoice " + (v.number || ""),
      });
    });
  (rec.extra || []).forEach((x, i) =>
    out.push({
      k: "x" + i,
      extra: i,
      who: x.who,
      date: x.date,
      amt: +x.amt || 0,
      vat: +x.vat || 0,
      mat: +x.mat || 0,
      label: x.note || "Added by hand",
    }),
  );
  out.forEach((p) => {
    p.gross = Math.max(0, p.amt - p.vat);
    p.labour = Math.max(0, p.gross - p.mat);
    p.ded = p.skip ? 0 : cisDown((p.labour * +cisRateOf(p.who)) / 100);
    p.paid = Math.round((p.amt - p.ded) * 100) / 100;
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
/* per subcontractor, as the return asks: gross (no VAT), materials, deducted */
function cisTotals(pays) {
  const by = {};
  pays
    .filter((p) => !p.skip)
    .forEach((p) => {
      const t = (by[p.who] = by[p.who] || { who: p.who, gross: 0, mat: 0, ded: 0, paid: 0, n: 0 });
      t.gross += p.gross;
      t.mat += p.mat;
      t.ded += p.ded;
      t.paid += p.paid;
      t.n++;
    });
  return Object.values(by);
}
async function cisSaveMonth(key, patch) {
  const rec = Object.assign({ pays: {}, extra: [] }, cisRec(key), patch, {
    kind: "cismonth",
    month: key,
    updated: Date.now(),
  });
  delete rec.id;
  await S.db.doc("todos/cis-" + key).set(rec);
}

function cisView() {
  const today = iso(new Date());
  /* default: the month just ended (the one to file now) until its return is filed */
  const curM = cisMonthOf(today);
  const prevM = cisMonthOf(iso(addDays(parse(cisRange(curM)[0]), -1)));
  const key = S.f.cism || (cisRec(prevM).filedAt ? curM : prevM);
  const [from, to] = cisRange(key);
  const rec = cisRec(key);
  const pays = cisPayments(key);
  const tots = cisTotals(pays);
  const cfg = cisCfg();
  const sum = (k) => tots.reduce((a, t) => a + t[k], 0);
  const due = key + "-19",
    payBy = key + "-22";
  const ended = today > to;
  const late = !rec.filedAt && today > due;
  const det = (w) => (S.team[w] && S.team[w].details) || {};
  const ws = cisWorkers();
  /* CIS contractors took off James's own invoices, paid in this tax month */
  const suffered = sdSales()
    .filter((d) => d.type === "invoice" && d.cis && +d.cis > 0)
    .reduce(
      (a, d) =>
        a + ((d.payments || []).some((p) => p.date >= from && p.date <= to) ? sdCalc(d).cis : 0),
      0,
    );
  $("main").innerHTML = `<div class="cis-page">
    <div class="cis-nav"><button type="button" class="iconbtn" id="cis-prev" aria-label="Month before">‹</button><b>Tax month ${esc(cisLab(key))}</b><button type="button" class="iconbtn" id="cis-next" aria-label="Month after">›</button></div>
    <div class="notice ${rec.filedAt ? "ok" : late ? "bad" : ""} cis-due">${
      rec.filedAt
        ? `✓ Return filed ${esc(shortDay(rec.filedAt))}${rec.payRef ? " · ref " + esc(rec.payRef) : ""}.`
        : ended
          ? `${late ? "⚠ Late: " : ""}Return due by <b>${esc(shortDay(due))}</b>. Pay HMRC <b>${gbp(sum("ded"))}</b> by <b>${esc(shortDay(payBy))}</b>.`
          : `This month is still running (ends ${esc(shortDay(to))}). Return due by ${esc(shortDay(due))}.`
    }</div>
    <div class="sd-boxes">
      <div class="sd-box"><small>Paid to subcontractors (no VAT)</small><b>${gbp(sum("gross"))}</b><span>${tots.length} ${tots.length === 1 ? "person" : "people"}</span></div>
      <div class="sd-box"><small>Materials in that</small><b>${gbp(sum("mat"))}</b><span>not taxed</span></div>
      <div class="sd-box bad"><small>Tax taken off (pay to HMRC)</small><b>${gbp(sum("ded"))}</b><span>by ${esc(shortDay(payBy))}</span></div>
      ${suffered ? `<div class="sd-box ok"><small>CIS taken off you</small><b>${gbp(suffered)}</b><span>by contractors</span></div>` : ""}
    </div>
    <section class="card"><div class="cardbody"><b>The return</b>
      ${
        tots.length
          ? `<div class="cis-tbl"><div class="cis-tr cis-th"><span>Subcontractor</span><span>UTR</span><span>Verification no.</span><span>Total paid (no VAT)</span><span>Materials</span><span>Tax taken off</span></div>${tots
              .map(
                (t) =>
                  `<div class="cis-tr"><span><b>${esc(nameOf(t.who))}</b><small>${cisRateOf(t.who)}%</small></span><span>${esc(det(t.who).utr || "⚠ missing")}</span><span>${esc((cfg.subs[t.who] || {}).vno || (cisRateOf(t.who) === "30" ? "⚠ needed at 30%" : "–"))}</span><span>${gbp(t.gross)}</span><span>${gbp(t.mat)}</span><span>${gbp(t.ded)}</span></div>`,
              )
              .join(
                "",
              )}<div class="cis-tr cis-tf"><span>Total</span><span></span><span></span><span>${gbp(sum("gross"))}</span><span>${gbp(sum("mat"))}</span><span>${gbp(sum("ded"))}</span></div></div>`
          : `<div class="who">No payments to CIS subcontractors in this month. You still need to tell HMRC: file a <b>nil return</b>, or tell them you're inactive if you won't pay anyone for 6 months.</div>`
      }
      <div class="cis-acts">
        <a class="btn primary" id="cis-hmrc" href="${CIS_HMRC}" target="_blank" rel="noopener">🔗 Open HMRC CIS online</a>
        ${tots.length ? `<button type="button" class="btn" id="cis-copy">📋 Copy the figures</button><button type="button" class="btn" id="cis-stm">📄 Payment statements</button><button type="button" class="btn" id="cis-send">📨 Send statements to subbies</button>` : ""}
        <button type="button" class="btn" id="cis-filed">${rec.filedAt ? "Change filed date" : "✔ Mark as filed"}</button>
      </div>
      ${tots.length ? `<div class="who cis-sent">Statements: ${tots.map((t) => esc(nameOf(t.who)) + ((rec.stmtSent || {})[t.who] ? " ✓ sent" : " – not sent yet")).join(" · ")}</div>` : ""}
      <div class="who">Sign in with your Government Gateway, choose the return for the month ending ${esc(shortDay(to))}, and type in the figures above. HMRC asks you to confirm the workers are self-employed and verified. <a href="${CIS_GUIDE}" target="_blank" rel="noopener">HMRC's guide</a></div>
    </div></section>
    <div class="flabel">Payments in this month</div>
    ${
      pays.length
        ? `<div class="cis-pays">${pays
            .map(
              (p) =>
                `<div class="cis-pay ${p.skip ? "cis-skip" : ""}" data-k="${esc(p.k)}"><div class="cis-ph"><b>${esc(nameOf(p.who))}</b><span class="who">${esc(shortDay(p.date))} · ${esc(p.label)}</span><b class="cis-amt">${gbp(p.amt)}</b></div>
                <div class="cis-pin"><label>VAT in it £<input class="cis-vat" type="number" inputmode="decimal" step="0.01" value="${p.vat || ""}"></label><label>Materials £<input class="cis-mat" type="number" inputmode="decimal" step="0.01" value="${p.mat || ""}"></label><span class="cis-calc">Tax at ${cisRateOf(p.who)}% on ${gbp(p.labour)}: <b>${gbp(p.ded)}</b><br>You pay them <b>${gbp(p.paid)}</b></span>${p.extra != null ? `<button type="button" class="linkdanger cis-xdel">Remove</button>` : `<label class="inl"><input type="checkbox" class="cis-skipc"${p.skip ? " checked" : ""}> Not CIS work</label>`}</div></div>`,
            )
            .join("")}</div>`
        : `<div class="who">CIS workers' invoices you mark as Paid show here.</div>`
    }
    <button type="button" class="linkbtn" id="cis-add">+ Add a payment by hand</button>
    <div class="flabel">Your CIS subcontractors</div>
    ${
      ws.length
        ? ws
            .map(
              (w) =>
                `<div class="cis-sub" data-w="${esc(w)}"><b>${esc(nameOf(w))}</b><span class="who">UTR ${esc(det(w).utr || "not in their details yet")}</span>
                <select class="cis-rate" aria-label="Rate for ${esc(nameOf(w))}"><option value="20"${cisRateOf(w) === "20" ? " selected" : ""}>20% (registered)</option><option value="30"${cisRateOf(w) === "30" ? " selected" : ""}>30% (not registered)</option><option value="0"${cisRateOf(w) === "0" ? " selected" : ""}>0% (gross status)</option></select>
                <input class="cis-vno" maxlength="20" placeholder="Verification no." value="${esc((cfg.subs[w] || {}).vno || "")}" aria-label="Verification number for ${esc(nameOf(w))}"></div>`,
            )
            .join("")
        : `<div class="who">Nobody is set as Self-employed (CIS). Set it in their details under Employees.</div>`
    }
    <div class="cis-subacts"><label for="cis-eref">Your employer (PAYE) reference<input id="cis-eref" maxlength="20" value="${esc(cfg.empRef || "")}" placeholder="e.g. 123/AB45678"></label><a class="btn" href="${CIS_HMRC}" target="_blank" rel="noopener">Verify a new subcontractor with HMRC</a></div>
    ${suffered ? `<div class="who">CIS taken off your own invoices: if you're a limited company, claim it back through your payroll (EPS); if you're a sole trader it goes on your tax return.</div>` : ""}
  </div>`;
  const go = (n) => {
    const d = parse(key + "-05");
    d.setMonth(d.getMonth() + n);
    S.f.cism = iso(d).slice(0, 7);
    render();
  };
  $("cis-prev").onclick = () => go(-1);
  $("cis-next").onclick = () => go(1);
  /* a payment's VAT/materials/not-CIS saved as they're changed */
  document.querySelectorAll("#main .cis-pay").forEach((row) => {
    const k = row.dataset.k;
    const p = pays.find((x) => x.k === k);
    const saveRow = async () => {
      const vat = sdR2(row.querySelector(".cis-vat").value),
        mat = sdR2(row.querySelector(".cis-mat").value);
      try {
        if (p.extra != null) {
          const extra = (rec.extra || []).slice();
          extra[p.extra] = Object.assign({}, extra[p.extra], { vat, mat });
          await cisSaveMonth(key, { extra });
        } else {
          const sk = row.querySelector(".cis-skipc");
          await cisSaveMonth(key, {
            pays: Object.assign({}, rec.pays || {}, {
              [k]: { vat, mat, skip: !!(sk && sk.checked) },
            }),
          });
        }
        render();
      } catch (e) {
        toast("Couldn't save. Check your connection.");
      }
    };
    row.querySelectorAll("input").forEach((x) => (x.onchange = saveRow));
    const del = row.querySelector(".cis-xdel");
    if (del)
      del.onclick = async () => {
        const extra = (rec.extra || []).slice();
        extra.splice(p.extra, 1);
        await cisSaveMonth(key, { extra });
        render();
      };
  });
  $("cis-add").onclick = () => cisAddPayment(key, from, to);
  if ($("cis-copy"))
    $("cis-copy").onclick = async () => {
      const txt =
        `CIS return, tax month ending ${shortDay(to)}\n` +
        tots
          .map(
            (t) =>
              `${nameOf(t.who)} · UTR ${det(t.who).utr || "?"}${(cfg.subs[t.who] || {}).vno ? " · verification " + cfg.subs[t.who].vno : ""} · total payments ${t.gross.toFixed(2)} · materials ${t.mat.toFixed(2)} · deducted ${t.ded.toFixed(2)}`,
          )
          .join("\n") +
        `\nTotal deducted ${sum("ded").toFixed(2)}`;
      try {
        await navigator.clipboard.writeText(txt);
        toast("Figures copied – paste them wherever you need");
      } catch (e) {
        toast("Couldn't copy on this device");
      }
    };
  if ($("cis-stm")) $("cis-stm").onclick = () => cisStatements(key, tots);
  if ($("cis-send")) $("cis-send").onclick = () => cisSendStatements(key, tots);
  $("cis-filed").onclick = () => {
    openSheet(
      `<h3 id="sheettitle">✔ CIS return filed</h3>
      <label for="cf-d">Date you filed it<input id="cf-d" type="date" value="${esc(rec.filedAt || today)}"></label>
      <label for="cf-r">HMRC's reference (optional)<input id="cf-r" maxlength="40" value="${esc(rec.payRef || "")}"></label>
      ${formFoot(false, "Save")}`,
      async () => {
        try {
          S.f.cism = key;
          await cisSaveMonth(key, {
            filedAt: $("cf-d").value || today,
            payRef: $("cf-r").value.trim(),
          });
          closeForm();
          toast("Marked as filed");
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
        }
      },
    );
  };
  /* rates, verification numbers, employer reference */
  const saveCfg = async () => {
    const subs = Object.assign({}, cfg.subs);
    document.querySelectorAll("#main .cis-sub").forEach((r) => {
      subs[r.dataset.w] = Object.assign({}, subs[r.dataset.w], {
        rate: r.querySelector(".cis-rate").value,
        vno: r.querySelector(".cis-vno").value.trim(),
      });
    });
    try {
      await S.db.doc("todos/cissubs").set(
        Object.assign({}, S.cisSubs || {}, {
          kind: "cissubs",
          subs,
          empRef: $("cis-eref").value.trim(),
        }),
      );
      toast("Saved");
      render();
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  document
    .querySelectorAll("#main .cis-sub select, #main .cis-sub input, #cis-eref")
    .forEach((x) => (x.onchange = saveCfg));
}

function cisAddPayment(key, from, to) {
  const ws = cisWorkers();
  if (!ws.length) return toast("Set someone as Self-employed (CIS) first, under Employees");
  openSheet(
    `<h3 id="sheettitle">+ CIS payment</h3>
    <label for="ca-w">Who<select id="ca-w">${ws.map((w) => `<option value="${esc(w)}">${esc(nameOf(w))}</option>`).join("")}</select></label>
    <div class="grid2"><label for="ca-d">Date paid<input id="ca-d" type="date" value="${esc(iso(new Date()) > to ? to : iso(new Date()))}" min="${from}" max="${to}"></label><label for="ca-a">Their invoice total £<input id="ca-a" type="number" inputmode="decimal" step="0.01"></label></div>
    <div class="grid2"><label for="ca-v">VAT in it £<input id="ca-v" type="number" inputmode="decimal" step="0.01"></label><label for="ca-m">Materials £<input id="ca-m" type="number" inputmode="decimal" step="0.01"></label></div>
    <label for="ca-n">What for (optional)<input id="ca-n" maxlength="80"></label>
    ${formFoot(false, "Add")}`,
    async () => {
      const amt = sdR2($("ca-a").value);
      if (!(amt > 0)) return showErr("Put the invoice total.");
      const d = $("ca-d").value;
      if (!d || d < from || d > to) return showErr("The date must be in this tax month.");
      try {
        await cisSaveMonth(key, {
          extra: (cisRec(key).extra || []).concat([
            {
              who: $("ca-w").value,
              date: d,
              amt,
              vat: sdR2($("ca-v").value),
              mat: sdR2($("ca-m").value),
              note: $("ca-n").value.trim(),
            },
          ]),
        });
        closeForm();
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "ca-a",
  );
}

/* payment and deduction statements: one page per subcontractor (give them within 14 days of the month's end) */
async function cisStmtPdf(key, tots) {
  {
    await loadJsPdf();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const co = coData(),
      cfg = cisCfg(),
      [, to] = cisRange(key),
      brand = BRGB();
    for (let i = 0; i < tots.length; i++) {
      const t = tots[i];
      if (i) doc.addPage();
      await pdfLogo(doc, 192, 12, 50, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...brand);
      doc.text("CIS payment and deduction statement", 18, 24);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      const row = (k, v, y, b) => {
        doc.setFont("helvetica", "normal");
        doc.text(k, 18, y);
        doc.setFont("helvetica", b ? "bold" : "normal");
        doc.text(String(v), 192, y, { align: "right" });
      };
      let y = 46;
      [
        ["Contractor", co.name],
        ["Contractor's address", String(co.address || "").replace(/\s*\n\s*/g, ", ")],
        ["Employer's reference", cfg.empRef || "–"],
        ["Tax month ending", sdLongDate(to)],
        ["Subcontractor", nameOf(t.who)],
        ["Subcontractor's UTR", ((S.team[t.who] && S.team[t.who].details) || {}).utr || "–"],
        ["Verification number", (cfg.subs[t.who] || {}).vno || "–"],
      ].forEach(([k, v]) => {
        row(k, doc.splitTextToSize(v || "–", 110)[0], y);
        y += 7;
      });
      y += 4;
      doc.setDrawColor(...brand);
      doc.line(18, y - 4, 192, y - 4);
      [
        ["Gross amount paid (excluding VAT)", gbp(t.gross)],
        ["Less cost of materials", gbp(t.mat)],
        ["Amount liable to deduction", gbp(t.gross - t.mat)],
        [`Amount deducted (${cisRateOf(t.who)}%)`, gbp(t.ded), 1],
        ["Amount paid to you (after deduction, with any VAT)", gbp(t.paid), 1],
      ].forEach(([k, v, b]) => {
        row(k, v, y, b);
        y += 8;
      });
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text(
        doc.splitTextToSize(
          "Keep this statement: you'll need it to claim the tax taken off on your tax return.",
          174,
        ),
        18,
        y + 6,
      );
    }
    return doc.output("blob");
  }
}
async function cisStatements(key, tots) {
  toast("Making the statements…");
  try {
    await S.dl.save({
      filename: `CIS statements ${cisLab(key)}.pdf`,
      data: await cisStmtPdf(key, tots),
    });
  } catch (e) {
    toast("Couldn't make the statements. Check your connection.");
  }
}
/* each subcontractor gets their own statement in their app (My details › documents), and can be emailed it too */
function cisSendStatements(key, tots) {
  const rec = cisRec(key);
  const sent = rec.stmtSent || {};
  const mail = (w) => ((S.team[w] && S.team[w].details) || {}).email || "";
  openSheet(
    `<h3 id="sheettitle">📨 Send statements</h3>
    <div class="who">Each person gets their payment and deduction statement for the month ending ${esc(shortDay(cisRange(key)[1]))} in their app, under My details › documents. By law they should have it within 14 days of the month's end.</div>
    ${tots.map((t) => `<label class="inl cis-sendto"><input type="checkbox" value="${esc(t.who)}"${sent[t.who] ? "" : " checked"}> <span><b>${esc(nameOf(t.who))}</b><small>Tax taken off ${gbp(t.ded)}${sent[t.who] ? " · already sent " + esc(stamp(sent[t.who])) : ""}${mail(t.who) ? "" : " · no email in their details"}</small></span></label>`).join("")}
    <label class="inl"><input type="checkbox" id="cs-mail"> Email them too (opens your email app for each person)</label>
    ${formFoot(false, "Send")}`,
    async () => {
      const ws = [...document.querySelectorAll(".cis-sendto input:checked")].map((x) => x.value);
      if (!ws.length) return showErr("Tick who to send to.");
      const email = $("cs-mail").checked;
      $("f-save").disabled = true;
      $("f-save").textContent = "Sending…";
      const done = Object.assign({}, sent);
      const files = [];
      try {
        for (const w of ws) {
          const t = tots.find((x) => x.who === w);
          const blob = await cisStmtPdf(key, [t]);
          const fn = `CIS statement ${cisLab(key)} ${nameOf(w)}.pdf`;
          const a = await uploadFile(blob, fn);
          await S.db
            .doc("sheets/" + w + "/signoffs/pd-cis" + key.replace("-", "") + "-" + newId())
            .set({
              type: "persdoc",
              kind: "cis",
              label: "CIS statement, month ending " + shortDay(cisRange(key)[1]),
              number: "",
              expires: "",
              note: `Tax taken off: ${gbp(t.ded)}. Keep this for your tax return.`,
              types: ["application/pdf"],
              names: [fn],
              photos: [a.id],
              byOwner: true,
              created: Date.now(),
            });
          done[w] = Date.now();
          files.push([w, blob, fn]);
        }
        await cisSaveMonth(key, { stmtSent: done });
        closeForm();
        toast(`Sent to ${ws.length} ${ws.length === 1 ? "person's" : "people's"} app`);
        render();
        if (email) cisEmailEach(key, files);
      } catch (e) {
        showErr("Couldn't send. Check your connection.");
        $("f-save").disabled = false;
        $("f-save").textContent = "Send";
      }
    },
  );
}
/* one at a time: a button per person, so each email is opened by a tap (phones only allow that) */
function cisEmailEach(key, files) {
  const co = coData();
  openSheet(
    `<h3 id="sheettitle">📧 Email the statements</h3>
    <div class="who">Tap each person to open your email with their statement attached.</div>
    ${files.map(([w], i) => `<button type="button" class="btn cis-em" data-i="${i}">📧 ${esc(nameOf(w))}</button>`).join("")}
    ${formFoot(false, "Done")}`,
    async () => closeForm(),
  );
  document.querySelectorAll(".cis-em").forEach(
    (b) =>
      (b.onclick = async () => {
        const [w, blob, fn] = files[+b.dataset.i];
        const det = (S.team[w] && S.team[w].details) || {};
        await sdShareMail({
          to: det.email || "",
          subject: `CIS payment and deduction statement – ${cisLab(key)}`,
          body: `Hi ${nameOf(w).split(" ")[0]},

Please find attached your CIS payment and deduction statement for the tax month ${cisLab(key)}. Keep it for your tax return.

Kind regards
${co.owner}
${co.name}`,
          blob,
          filename: fn,
        });
        b.textContent = "✓ " + nameOf(w);
      }),
  );
}
