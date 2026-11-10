/* ================= VAT RETURN, P&L PDF AND ACCOUNTANT PACK: the 9 boxes for each VAT quarter, profit and loss on the letterhead, one Excel for the accountant ================= */
import { $, esc, gbp, iso, parse, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { AC_CATS, acCatKind, acCatName, acCfg, acSaveCfg, acSums } from "./acct-data.js";
import { AX_KINDS, axRows } from "./acct-export.js";
import { lhLogoId, lhPics, lhPutBot, lhPutTop } from "./letterhead-setup.js";
import { sdCalc, sdCounts, sdR2, sdSales, sdTaxYear } from "./sales-calc.js";
import { sdImgData } from "./sales-pdf.js";
import { loadXlsx } from "../timesheets/day-work-xlsx.js";
export { vtPeriodAsk, vtView };
/* 🧾 VAT return (Accounts): James sets which months his VAT quarters end and whether he's on the standard or cash
   scheme. Each quarter shows the nine boxes worked out from his invoices (or the payments on them, on the cash
   scheme), bank payments and receipts – tap a box to see what's in it. He copies the figures into his filing (HMRC
   only takes returns from recognised software; that's on Jasper's list) and marks the quarter filed with the date and
   reference, which keeps that quarter's figures as they were sent. The due date is a month and seven days after the
   quarter ends. Profit and loss: the figures on screen as a PDF on the letterhead. Accountant pack: one Excel file
   for any period with a summary, the profit and loss, the VAT quarters and every list the CSV export makes.
   Stored: settings in the accounts record (vatEnds, vatScheme); filed quarters in todos/vat-{to} (kind "vatreturn"). */
const VT_ENDS = [
  ["3", "March, June, September and December"],
  ["1", "January, April, July and October"],
  ["2", "February, May, August and November"],
];
const vtCfg = () => {
  const c = acCfg();
  return { ends: c.vatEnds || "3", scheme: c.vatScheme || "standard" };
};
/* the quarters (newest first) up to the one we're in */
function vtQuarters(n) {
  const e = +vtCfg().ends;
  const out = [];
  const now = new Date();
  /* the quarter end on or after today */
  let y = now.getFullYear(),
    m = now.getMonth() + 1;
  while ((m - e + 12) % 3 !== 0) {
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  for (let i = 0; i < n; i++) {
    const end = new Date(y, m, 0);
    const start = new Date(y, m - 3, 1);
    const due = new Date(y, m + 1, 0);
    due.setDate(due.getDate() + 7);
    out.push({ from: iso(start), to: iso(end), due: iso(due) });
    m -= 3;
    if (m < 1) {
      m += 12;
      y--;
    }
  }
  return out;
}
const vtName = (q) =>
  parse(q.from).toLocaleDateString("en-GB", { month: "short" }) +
  " – " +
  parse(q.to).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const vtFiled = (q) => (S.vatReturns || []).find((r) => r.to === q.to && r.from === q.from) || null;
/* the nine boxes for a quarter, with what is in each */
function vtBoxes(from, to) {
  const cash = vtCfg().scheme === "cash";
  const inR = (d) => !!d && d >= from && d <= to;
  const sales = [];
  let b1 = 0,
    b6 = 0;
  sdSales()
    .filter((d) => sdCounts(d))
    .forEach((d) => {
      const c = sdCalc(d);
      if (!cash) {
        if (!inR(d.date)) return;
        b1 += c.vat;
        b6 += c.net;
        sales.push({
          d: d.date,
          what: `Invoice ${d.number || ""} ${d.client || ""}`.trim(),
          net: c.net,
          vat: c.vat,
        });
      } else {
        const gross = c.net + c.vat;
        (d.payments || [])
          .filter((p) => inR(p.date))
          .forEach((p) => {
            const k = gross ? (+p.amt || 0) / gross : 0;
            b1 += c.vat * k;
            b6 += c.net * k;
            sales.push({
              d: p.date,
              what: `Paid on invoice ${d.number || ""} ${d.client || ""}`.trim(),
              net: sdR2(c.net * k),
              vat: sdR2(c.vat * k),
            });
          });
      }
    });
  const s = acSums(from, to);
  /* box 7: costs before VAT, not counting wages and PAYE (which never go on a VAT return) */
  let b7 = 0;
  const costs = [];
  Object.entries(s.byCat).forEach(([k, v]) => {
    if (acCatKind(k) !== "out" || k === "wages") return;
    b7 += -v;
    costs.push({ d: "", what: acCatName(k), net: sdR2(-v), vat: 0 });
  });
  const r2 = sdR2;
  const B = {
    1: r2(b1),
    2: 0,
    3: r2(b1),
    4: r2(s.vatIn),
    5: r2(b1 - s.vatIn),
    6: Math.round(b6),
    7: Math.round(b7),
    8: 0,
    9: 0,
  };
  return { B, sales, costs, unsorted: s.unsorted };
}
const VT_BOX = {
  1: "VAT due on sales and other outputs",
  2: "VAT due on acquisitions from the EU (Northern Ireland only)",
  3: "Total VAT due (box 1 + box 2)",
  4: "VAT reclaimed on purchases and other inputs",
  5: "Net VAT to pay HMRC or reclaim (box 3 – box 4)",
  6: "Total value of sales, before VAT (whole pounds)",
  7: "Total value of purchases, before VAT (whole pounds)",
  8: "Supplies of goods to the EU (Northern Ireland only)",
  9: "Acquisitions of goods from the EU (Northern Ireland only)",
};
function vtView(tabs) {
  const cfg = vtCfg();
  const qs = vtQuarters(6);
  const qi = Math.min(
    qs.length - 1,
    Math.max(0, +S.f.vtq || (qs[0].to > iso(new Date()) && qs[0].from > iso(new Date()) ? 1 : 0)),
  );
  const q = qs[qi];
  const filed = vtFiled(q);
  const X = filed ? { B: filed.boxes, sales: [], costs: [], unsorted: 0 } : vtBoxes(q.from, q.to);
  const B = X.B;
  const open = S.f.vtbox || "";
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="seg vt-qs" id="vt-qs">${qs.map((x, i) => `<button type="button" data-i="${i}" aria-pressed="${i === qi}">${esc(vtName(x))}${vtFiled(x) ? " ✓" : ""}</button>`).join("")}</div>
    <div class="who">${esc(ukDate(q.from))} to ${esc(ukDate(q.to))} · ${cfg.scheme === "cash" ? "cash scheme (money received and paid)" : "standard scheme (invoice dates)"} · due by <b>${esc(ukDate(q.due))}</b>${q.to >= iso(new Date()) ? " · this quarter isn't over yet" : ""}</div>
    ${filed ? `<div class="notice">✓ Filed on ${esc(ukDate(filed.filedOn))}${filed.ref ? " · reference " + esc(filed.ref) : ""}. These are the figures as they were sent.</div>` : X.unsorted ? `<div class="notice warn">${X.unsorted} bank payment${X.unsorted === 1 ? "" : "s"} not sorted yet – sort them on the Bank tab so the costs and VAT are right.</div>` : ""}
    <section class="card"><div class="cardbody vt-boxes">${[1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map(
        (n) =>
          `<button type="button" class="vt-box${n === 5 ? " vt-net" : ""}" data-n="${n}" aria-expanded="${open === String(n)}"><span class="vt-n">Box ${n}</span><span class="vt-l">${esc(VT_BOX[n])}</span><b>${n >= 6 ? "£" + (+B[n]).toLocaleString("en-GB") : gbp(B[n])}</b></button>${
            open === String(n) && !filed
              ? `<div class="vt-det">${
                  (n === 1 || n === 6 ? X.sales : n === 7 ? X.costs : [])
                    .map(
                      (r) =>
                        `<div class="drow"><span>${r.d ? esc(ukDate(r.d)) + " · " : ""}${esc(r.what)}</span><span>${gbp(n === 1 ? r.vat : r.net)}</span></div>`,
                    )
                    .join("") ||
                  (n === 4
                    ? `<div class="who">The VAT on bank payments you've added it to, and on receipts. Check every receipt has its VAT on the Receipts tab.</div>`
                    : `<div class="who">Nothing in this box.</div>`)
                }</div>`
              : ""
          }`,
      )
      .join("")}</div></section>
    <div class="sd-acts">${filed ? `<button type="button" class="btn" id="vt-unfile">Undo filed</button>` : `<button type="button" class="btn primary" id="vt-copy">📋 Copy the figures</button><button type="button" class="btn" id="vt-file">✓ Mark as filed</button>`}<button type="button" class="btn" id="vt-set">⚙ VAT quarters and scheme</button></div>
    <div class="who">A guide worked out from what's in SiteHQ. Sending the return straight to HMRC needs recognised software, which comes with our own hosting – until then copy these into your filing, or give them to your accountant. Northern Ireland boxes 2, 8 and 9 are left at 0.</div></div>`;
  $("vt-qs")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.vtq = +b.dataset.i;
          S.f.vtbox = "";
          render();
        }),
    );
  document.querySelectorAll(".vt-box").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.vtbox = S.f.vtbox === b.dataset.n ? "" : b.dataset.n;
        render();
      }),
  );
  if ($("vt-copy"))
    $("vt-copy").onclick = async () => {
      const t = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((n) => `Box ${n}: ${n >= 6 ? B[n] : (+B[n]).toFixed(2)}`)
        .join("\n");
      try {
        await navigator.clipboard.writeText(`VAT return ${vtName(q)}\n${t}`);
        toast("Copied – paste them where you file");
      } catch (e) {
        toast("Couldn't copy – write them down from the screen");
      }
    };
  if ($("vt-file"))
    $("vt-file").onclick = () =>
      openSheet(
        `<h3 id="sheettitle">✓ VAT return ${esc(vtName(q))} filed</h3>
        <div class="grid2"><label for="vt-on">Filed on<input id="vt-on" type="date" value="${iso(new Date())}"></label><label for="vt-ref">HMRC reference (optional)<input id="vt-ref" maxlength="40"></label></div>
        <div class="who">The figures are kept as they are now: box 5 ${gbp(B[5])}.</div>${formFoot(false, "Save")}`,
        async () => {
          try {
            await S.db.doc("todos/vat-" + q.to).set({
              kind: "vatreturn",
              from: q.from,
              to: q.to,
              boxes: B,
              scheme: cfg.scheme,
              filedOn: $("vt-on").value || iso(new Date()),
              ref: $("vt-ref").value.trim(),
              created: Date.now(),
            });
            closeForm();
            toast("Marked as filed");
          } catch (e) {
            showErr("Couldn't save");
          }
        },
        "vt-ref",
      );
  if ($("vt-unfile"))
    $("vt-unfile").onclick = async (e) => {
      const b = e.currentTarget;
      if (b.dataset.armed !== "1") {
        b.dataset.armed = "1";
        b.textContent = "Tap again to undo";
        return;
      }
      try {
        await S.db.doc("todos/vat-" + q.to).delete();
        toast("No longer marked as filed");
      } catch (er) {
        toast("Couldn't change it");
      }
    };
  $("vt-set").onclick = () =>
    openSheet(
      `<h3 id="sheettitle">⚙ VAT quarters and scheme</h3>
      <label for="vt-ends">My VAT quarters end in<select id="vt-ends">${VT_ENDS.map(([k, l]) => `<option value="${k}"${k === cfg.ends ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <label for="vt-sch">VAT scheme<select id="vt-sch"><option value="standard"${cfg.scheme === "standard" ? " selected" : ""}>Standard – by the date on each invoice</option><option value="cash"${cfg.scheme === "cash" ? " selected" : ""}>Cash accounting – when you're paid</option></select></label>
      <div class="who">Your VAT certificate or HMRC account shows which months your quarters end.</div>${formFoot(false, "Save")}`,
      async () => {
        try {
          await acSaveCfg({ vatEnds: $("vt-ends").value, vatScheme: $("vt-sch").value });
          closeForm();
          S.f.vtq = 0;
          render();
        } catch (e) {
          showErr("Couldn't save");
        }
      },
      "vt-ends",
    );
}
/* ---------- profit and loss as a PDF on the letterhead ---------- */
async function vtPlPdf(from, to, label) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData();
  const M = 20,
    R = 190;
  const pics = await lhPics();
  const logo = pics ? null : await sdImgData(lhLogoId());
  let y = 48;
  if (pics) y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
  else if (logo) {
    const k = Math.min(60 / logo.w, 26 / logo.h);
    doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "vtlogo", "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...brand);
    doc.text(co.name, M, 20);
  }
  if (pics) lhPutBot(doc, pics);
  const s = acSums(from, to);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("Profit and loss", M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `${label} · ${ukDate(from)} to ${ukDate(to)} · costs before VAT where the VAT is added · made ${ukDate(iso(new Date()))}`,
    M,
    y,
  );
  y += 9;
  const row = (l, v, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 30, 30);
    doc.text(l, M + (bold ? 0 : 3), y);
    doc.text(gbp(v), R, y, { align: "right" });
    y += 6;
  };
  const head = (t) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...brand);
    doc.text(t, M, y);
    y += 6;
  };
  const cats = (kind, sign) =>
    AC_CATS.filter(([k, , kd]) => kd === kind && s.byCat[k])
      .map(([k, l]) => [l, sign * s.byCat[k]])
      .sort((a, b) => b[1] - a[1]);
  head("Money in");
  cats("in", 1).forEach(([l, v]) => row(l, v));
  if (s.byCat[""] > 0) row("Not sorted yet", s.byCat[""]);
  row("Total money in", s.inc, true);
  y += 3;
  head("Costs");
  cats("out", -1).forEach(([l, v]) => row(l, v));
  row("Total costs", s.exp, true);
  y += 3;
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.5);
  doc.line(M, y - 3, R, y - 3);
  row(s.profit >= 0 ? "Profit before tax" : "Loss before tax", s.profit, true);
  if (s.unsorted) {
    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(160, 60, 60);
    doc.text(
      `${s.unsorted} bank payment${s.unsorted === 1 ? " is" : "s are"} not sorted into a category yet.`,
      M,
      y,
    );
  }
  return doc.output("blob");
}
/* ---------- the accountant pack: one Excel file ---------- */
async function vtPack(from, to, label) {
  await loadXlsx();
  const X = window.XLSX;
  const wb = X.utils.book_new();
  const s = acSums(from, to);
  const co = coData();
  const sum = [
    [co.name + " – accounts pack"],
    [`${label}: ${ukDate(from)} to ${ukDate(to)}`],
    [`Made ${ukDate(iso(new Date()))} from SiteHQ`],
    [],
    ["Money in", s.inc],
    ["Costs", s.exp],
    ["Profit before tax", s.profit],
    ["VAT charged on your invoices", s.vatOut],
    ["VAT on your costs", s.vatIn],
    ["Bank payments not sorted", s.unsorted],
  ];
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(sum), "Summary");
  const pl = [["Category", "Type", "Amount (before VAT)"]].concat(
    AC_CATS.filter(([k]) => s.byCat[k]).map(([k, l, kd]) => [
      l,
      { in: "Money in", out: "Cost", move: "Not in profit" }[kd],
      s.byCat[k],
    ]),
  );
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(pl), "Profit and loss");
  const vq = [
    ["Quarter", "From", "To", "Box 1", "Box 4", "Box 5", "Box 6", "Box 7", "Filed on", "Reference"],
  ];
  vtQuarters(8)
    .filter((q) => q.to >= from && q.from <= to)
    .reverse()
    .forEach((q) => {
      const f = vtFiled(q);
      const B = f ? f.boxes : vtBoxes(q.from, q.to).B;
      vq.push([
        vtName(q),
        q.from,
        q.to,
        B[1],
        B[4],
        B[5],
        B[6],
        B[7],
        f ? f.filedOn : "",
        f ? f.ref || "" : "",
      ]);
    });
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(vq), "VAT quarters");
  AX_KINDS.forEach(([k, l]) => {
    try {
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(axRows(k, from, to)), l.slice(0, 31));
    } catch (e) {}
  });
  const a = X.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([a], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
/* the period picker for both */
function vtPeriodAsk(kind) {
  const today = iso(new Date());
  const ty = sdTaxYear(today);
  openSheet(
    `<h3 id="sheettitle">${kind === "pack" ? "📦 Pack for my accountant (Excel)" : "📄 Profit and loss PDF"}</h3>
    <label for="vt-per">Period<select id="vt-per"><option value="ty">This tax year (from 6 April ${ty})</option><option value="lty">Last tax year (${ty - 1}–${String(ty).slice(2)})</option><option value="y">This calendar year</option><option value="d">Choose the dates</option></select></label>
    <div class="grid2" id="vt-dd" hidden><label for="vt-f">From<input id="vt-f" type="date" value="${today.slice(0, 8)}01"></label><label for="vt-t">To<input id="vt-t" type="date" value="${today}"></label></div>
    ${formFoot(false, kind === "pack" ? "Make the Excel file" : "Make the PDF")}`,
    async () => {
      const p = $("vt-per").value;
      let from = `${ty}-04-06`,
        to = `${ty + 1}-04-05`,
        label = `Tax year ${ty}–${String(ty + 1).slice(2)}`;
      if (p === "lty") {
        from = `${ty - 1}-04-06`;
        to = `${ty}-04-05`;
        label = `Tax year ${ty - 1}–${String(ty).slice(2)}`;
      } else if (p === "y") {
        from = today.slice(0, 4) + "-01-01";
        to = today.slice(0, 4) + "-12-31";
        label = today.slice(0, 4);
      } else if (p === "d") {
        from = $("vt-f").value;
        to = $("vt-t").value;
        if (!from || !to || to < from) return showErr("Put the from and to dates.");
        label = `${ukDate(from)} to ${ukDate(to)}`;
      }
      try {
        const blob =
          kind === "pack" ? await vtPack(from, to, label) : await vtPlPdf(from, to, label);
        closeForm();
        await S.dl.save({
          filename: `${kind === "pack" ? "Accounts pack" : "Profit and loss"} – ${label.replace(/\//g, "-")}.${kind === "pack" ? "xlsx" : "pdf"}`,
          data: blob,
        });
      } catch (e) {
        showErr("Couldn't make it – check your connection and try again");
      }
    },
    "vt-per",
  );
  $("vt-per").onchange = () => ($("vt-dd").hidden = $("vt-per").value !== "d");
}
