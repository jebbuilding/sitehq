/* ================= ACCOUNTS EXPORT: CSV files for a month, a tax year, a year or any dates ================= */
import { $, esc, iso, parse, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { csvSave } from "../files/files.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { acAllTx, acCatName, acCfg } from "./acct-data.js";
import { acRcptParts, acReceipts } from "./acct-receipts.js";
import { cisLab, cisPayments, cisRange } from "./cis-returns.js";
import { sdCalc, sdNo, sdSales, sdStatus, sdTaxYear } from "./sales-calc.js";
export { acExportSheet };
/* Pick the period (any month and year, a tax year 6 April – 5 April, a calendar year, or from/to dates) and what to
   include – bank payments, receipts and bills, your invoices, trades' invoices, CIS payments – and each comes out
   as its own CSV file (opens in Excel or Numbers, or goes to the accountant). */
const AX_KINDS = [
  ["bank", "Bank payments"],
  ["rcpt", "Receipts and bills"],
  ["sales", "Your invoices"],
  ["trade", "Trades' invoices"],
  ["cis", "CIS payments to subbies"],
];
const axMonthName = (ym) =>
  new Date(ym + "-01T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
function acExportSheet() {
  const today = iso(new Date());
  const ty = sdTaxYear(today),
    y = +today.slice(0, 4);
  const yrs = Array.from({ length: 6 }, (_, i) => y - i);
  const pk = S.f.axp || "month";
  openSheet(
    `<h3 id="sheettitle">⬇ Export CSV files</h3>
    <label for="ax-p">Period<select id="ax-p">${[
      ["month", "A month"],
      ["taxyear", "A tax year (6 April – 5 April)"],
      ["year", "A calendar year (January – December)"],
      ["dates", "Choose the dates"],
    ]
      .map(([k, l]) => `<option value="${k}"${k === pk ? " selected" : ""}>${l}</option>`)
      .join("")}</select></label>
    <div class="ax-o" data-p="month"><label for="ax-m">Month and year<input id="ax-m" type="month" value="${esc(S.f.axm || today.slice(0, 7))}"></label></div>
    <div class="ax-o" data-p="taxyear"><label for="ax-ty">Tax year<select id="ax-ty">${yrs
      .map((t) => t - (y > ty ? 1 : 0))
      .concat([ty])
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b - a)
      .map(
        (t) =>
          `<option value="${t}"${t === ty ? " selected" : ""}>${t}–${String(t + 1).slice(2)}</option>`,
      )
      .join("")}</select></label></div>
    <div class="ax-o" data-p="year"><label for="ax-y">Year<select id="ax-y">${yrs.map((t) => `<option value="${t}">${t}</option>`).join("")}</select></label></div>
    <div class="ax-o grid2" data-p="dates"><label for="ax-f">From<input id="ax-f" type="date" value="${today.slice(0, 8)}01"></label><label for="ax-t">To<input id="ax-t" type="date" value="${today}"></label></div>
    <fieldset class="od-who"><legend>What to export (one file each)</legend>${AX_KINDS.map(
      ([k, l]) =>
        `<label class="tick"><input type="checkbox" class="ax-k" value="${k}"${k === "cis" || k === "trade" ? "" : " checked"}> <span>${l}</span></label>`,
    ).join("")}</fieldset>
    ${formFoot(false, "Make the files")}`,
    async () => {
      const p = $("ax-p").value;
      let from, to, label;
      if (p === "month") {
        const m = $("ax-m").value;
        if (!/^\d{4}-\d{2}$/.test(m)) return showErr("Pick the month.");
        const [Y, M] = m.split("-").map(Number);
        from = m + "-01";
        to = m + "-" + String(new Date(Y, M, 0).getDate()).padStart(2, "0");
        label = axMonthName(m);
        S.f.axm = m;
      } else if (p === "taxyear") {
        const t = +$("ax-ty").value;
        from = `${t}-04-06`;
        to = `${t + 1}-04-05`;
        label = `tax year ${t}-${String(t + 1).slice(2)}`;
      } else if (p === "year") {
        const t = +$("ax-y").value;
        from = `${t}-01-01`;
        to = `${t}-12-31`;
        label = String(t);
      } else {
        from = $("ax-f").value;
        to = $("ax-t").value;
        if (!from || !to || to < from) return showErr("Put the from and to dates.");
        label = `${from} to ${to}`;
      }
      S.f.axp = p;
      const kinds = [...document.querySelectorAll(".ax-k:checked")].map((x) => x.value);
      if (!kinds.length) return showErr("Tick what to export.");
      const made = [];
      for (const k of kinds) {
        const rows = axRows(k, from, to);
        const name = `${(AX_KINDS.find((x) => x[0] === k) || [k, k])[1]} ${label}.csv`;
        csvSave(name, rows);
        made.push(`${(AX_KINDS.find((x) => x[0] === k) || [k, k])[1]} (${rows.length - 1})`);
        await new Promise((r) => setTimeout(r, 300));
      }
      closeForm();
      toast("Made: " + made.join(", "));
    },
    "ax-p",
  );
  const show = () =>
    document.querySelectorAll(".ax-o").forEach((d) => (d.hidden = d.dataset.p !== $("ax-p").value));
  $("ax-p").onchange = show;
  show();
}
/* the rows for one kind of file, dates from–to (inclusive) */
function axRows(k, from, to) {
  const inR = (d) => !!d && d >= from && d <= to;
  const m2 = (n) => (n == null || n === "" ? "" : (+n).toFixed(2));
  if (k === "bank") {
    const accs = acCfg().accounts;
    const accName = (id) => (accs.find((a) => a.id === id) || {}).name || "";
    return [
      [
        "Date",
        "Account",
        "Description",
        "Money in",
        "Money out",
        "Category",
        "VAT",
        "Note",
        "Receipt",
        "Matched to",
      ],
    ].concat(
      acAllTx()
        .filter((t) => inR(t.date))
        .reverse()
        .map((t) => [
          t.date,
          accName(t.acc),
          t.desc,
          t.amt > 0 ? m2(t.amt) : "",
          t.amt < 0 ? m2(-t.amt) : "",
          t.cat ? acCatName(t.cat) : "Not sorted",
          t.vat ? m2(t.vat) : "",
          t.note || "",
          t.rcpt ? "Yes" : "",
          t.link ? t.link.label || "" : "",
        ]),
    );
  }
  if (k === "rcpt") {
    const rows = [
      [
        "Date",
        "Supplier",
        "Type",
        "Ref",
        "What for",
        "Site",
        "Category",
        "Net",
        "VAT",
        "Total",
        "Paid with",
        "On the bank statement",
      ],
    ];
    acReceipts()
      .filter((r) => r.status === "done" && inR(r.date))
      .slice()
      .reverse()
      .forEach((r) =>
        acRcptParts(r).forEach((pt) =>
          rows.push([
            r.date,
            r.supplier || "",
            r.type || "receipt",
            r.ref || "",
            pt.desc,
            pt.site,
            acCatName(pt.cat),
            m2(pt.net),
            m2(pt.vat),
            m2(pt.gross),
            { card: "Card / bank", acct: "On account", cash: "Cash", own: "Own money" }[r.paid] ||
              "",
            r.tx ? "Yes" : "No",
          ]),
        ),
      );
    return rows;
  }
  if (k === "sales") {
    return [
      [
        "Number",
        "Date",
        "Client",
        "Site",
        "Title",
        "Status",
        "Net",
        "VAT",
        "Total",
        "Paid",
        "Still owed",
      ],
    ].concat(
      sdSales()
        .filter((d) => d.type === "invoice" && d.status !== "draft" && inR(d.date))
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        .map((d) => {
          const c = sdCalc(d);
          return [
            sdNo(d),
            d.date,
            d.client || "",
            d.site || "",
            d.title || "",
            sdStatus(d),
            m2(c.net),
            m2(c.vat),
            m2(c.gross),
            m2(c.paid),
            m2(c.balance),
          ];
        }),
    );
  }
  if (k === "trade") {
    return [["Date", "Who", "Invoice", "Site", "Amount", "Status", "Paid on"]].concat(
      allTeam("invoices")
        .filter((v) => v.kind !== "receipt" && v.kind !== "materials" && inR(v.invDate || ""))
        .sort((a, b) => (a.invDate || "").localeCompare(b.invDate || ""))
        .map((v) => [
          v.invDate,
          nameOf(v.who),
          v.number || "",
          v.site || "",
          m2(v.amount),
          v.status || "",
          v.paidOn || "",
        ]),
    );
  }
  /* CIS: every payment in the tax months that fall in the dates */
  const rows = [
    ["Tax month", "Subcontractor", "Paid", "Gross paid", "Materials", "CIS deducted", "Net paid"],
  ];
  const d0 = parse(from),
    d1 = parse(to);
  for (
    let d = new Date(d0.getFullYear(), d0.getMonth(), 1);
    d <= new Date(d1.getFullYear(), d1.getMonth() + 1, 1);
    d.setMonth(d.getMonth() + 1)
  ) {
    const key = iso(d).slice(0, 7);
    const [s0, e0] = cisRange(key);
    if (e0 < from || s0 > to) continue;
    cisPayments(key)
      .filter((x) => !x.unpaid && !x.skip)
      .forEach((x) =>
        rows.push([
          cisLab(key),
          nameOf(x.who),
          x.date || "",
          m2(x.gross),
          m2(x.mat),
          m2(x.ded),
          m2(x.paid),
        ]),
      );
  }
  return rows;
}
