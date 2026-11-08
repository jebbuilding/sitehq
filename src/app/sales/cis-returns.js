/* ================= CIS RETURNS (owner): the monthly CIS return – what each subcontractor was paid and the tax taken off ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { BRGB } from "../photos/photos.js";
import { isInv } from "../purchasing/materials-receipts.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { cisBill } from "./cis-bill.js";
import { sdCalc, sdR2, sdSales, sdSet, sdTaxYear } from "./sales-calc.js";
import { sdShareMail } from "./sales-email.js";
import { sdHeadLines, sdImgData, sdLongDate } from "./sales-pdf.js";
export {
  cisDown,
  cisLab,
  cisMonthOf,
  cisPayments,
  cisRange,
  cisRateOf,
  cisRec,
  cisSaveMonth,
  cisSub,
  cisSubList,
  cisView,
};
/* Three tabs. This month: the tax month (6th–5th), what's due when (return by the 19th, tax paid by the 22nd), the
   return as HMRC asks for it, every payment with its labour, materials and VAT, the statements, and the HMRC link.
   Subcontractors: a full record for each (business type, UTR, NI or company number, verification number and date,
   rate, VAT and reverse charge, insurance, contact details), app workers set as CIS and others added by hand.
   Year: each subbie's tax-year totals month by month, with a yearly statement PDF to send them.
   Statements (monthly and yearly) are PDFs on the letterhead; they go into the subbie's own app (My details ›
   documents) when they use it, and/or by email. Filing goes through HMRC's CIS online service (straight from the
   app needs HMRC to approve it as CIS software). Owner-private records: todos/cissubs (the subbies and James's
   references) and todos/cis-YYYY-MM (kind "cismonth": per-payment VAT/materials, payments added by hand, filed,
   tax paid, statements sent). */
const CIS_HMRC = "https://www.gov.uk/use-construction-industry-scheme-online";
const CIS_GUIDE =
  "https://www.gov.uk/what-you-must-do-as-a-cis-contractor/file-your-monthly-returns";
const CIS_TYPES = {
  sole: "Sole trader",
  partnership: "Partnership",
  company: "Limited company",
  trust: "Trust",
};
const CIS_RATES = {
  20: "20% – registered",
  30: "30% – not registered / not matched",
  0: "0% – gross payment status",
};
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
  return `6 ${a.toLocaleDateString("en-GB", a.getFullYear() === b.getFullYear() ? { month: "short" } : { month: "short", year: "numeric" })} – 5 ${b.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
};
/* the 12 tax months of the tax year starting 6 April of year y */
const cisYearMonths = (y) =>
  Array.from({ length: 12 }, (_, i) => iso(new Date(y, 4 + i, 5)).slice(0, 7));
const cisDown = (n) => Math.floor((+n || 0) * 100 + 1e-6) / 100;
const cisCfg = () => Object.assign({ subs: {}, empRef: "", aoRef: "", utr: "" }, S.cisSubs || {});
const cisRec = (key) => (S.cisMonths || []).find((m) => m.month === key) || { pays: {}, extra: [] };
const cisTeamDet = (w) => (S.team && S.team[w] && S.team[w].details) || {};
/* every subcontractor: app workers set as CIS, then those added by hand; each with its saved record over the app details */
function cisSubList() {
  const cfg = cisCfg();
  const app = teamIds()
    .filter((w) => cisTeamDet(w).empType === "cis" || (cfg.subs[w] || {}).cis === true)
    .map((w) => {
      const d = cisTeamDet(w);
      return Object.assign(
        {
          id: w,
          name: nameOf(w),
          utr: d.utr || "",
          email: d.email || "",
          phone: d.phone || d.mobile || "",
          nino: d.ni || d.nino || "",
          type: d.empType === "company" ? "company" : "sole",
        },
        cfg.subs[w] || {},
        { app: true },
      );
    });
  const own = Object.entries(cfg.subs)
    .filter(([id, s]) => /^sub-/.test(id) && !s.archived)
    .map(([id, s]) => Object.assign({ id, type: "sole" }, s));
  return app.concat(own).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}
const cisSub = (id) =>
  cisSubList().find((s) => s.id === id) ||
  Object.assign(
    { id, name: String(id).startsWith("sub-") ? "?" : nameOf(id) },
    cisCfg().subs[id] || {},
  );
const cisRateOf = (id) => {
  const s = cisSub(id);
  const r = String(s.rate == null ? "20" : s.rate);
  return r === "0" || r === "30" ? r : "20";
};
/* the month's payments: [{ k, who, date, label, inv, amt, vat, mat, gross, labour, ded, paid, skip }] */
function cisPayments(key) {
  const [from, to] = cisRange(key);
  const rec = cisRec(key);
  const ws = cisSubList()
    .filter((s) => s.app)
    .map((s) => s.id);
  const out = [];
  allTeam("invoices")
    .filter(isInv)
    .forEach((v) => {
      if (!ws.includes(v.who) || (v.status || "") !== "paid" || !(v.paidOn || v.paidAt)) return;
      const di = v.paidOn || iso(new Date(v.paidAt));
      if (di < from || di > to) return;
      const k = v.who + "|" + v.id;
      const o = (rec.pays || {})[k] || {};
      const amt = +v.amount || 0;
      out.push({
        k,
        who: v.who,
        date: di,
        inv: v.number || "",
        label: "Invoice " + (v.number || "") + (v.site ? " · " + v.site : ""),
        amt,
        vat: +o.vat || 0,
        mat: +o.mat || 0,
        skip: !!o.skip,
      });
    });
  (rec.extra || []).forEach((x, i) => {
    /* added by hand: a bill (lines) or the older labour + materials (+ VAT); a bill not paid yet isn't on the return */
    const lab = +x.lab || 0,
      mat = +x.mat || 0,
      vat = +x.vat || 0;
    const amt = x.lab != null ? lab + mat + vat : +x.amt || 0;
    const unpaid = !!x.status && x.status !== "paid";
    out.push({
      k: "x" + i,
      extra: i,
      who: x.who,
      date: !unpaid && x.paidOn ? x.paidOn : x.date,
      inv: x.inv || "",
      label:
        [
          x.inv ? "Invoice " + x.inv : "",
          x.desc || x.note || "",
          x.site || "",
          unpaid ? (x.status === "approved" ? "approved, not paid yet" : "draft") : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Added by hand",
      amt,
      vat,
      mat,
      other: +x.other || 0,
      unpaid,
    });
  });
  out.forEach((p) => {
    p.gross = sdR2(Math.max(0, p.amt - p.vat));
    p.labour = sdR2(Math.max(0, p.gross - p.mat));
    p.ded = p.skip || p.unpaid ? 0 : cisDown((p.labour * +cisRateOf(p.who)) / 100);
    p.paid = sdR2(p.amt + (p.other || 0) - p.ded);
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
/* per subcontractor, as the return asks: gross (no VAT), materials, deducted */
function cisTotals(pays) {
  const by = {};
  pays
    .filter((p) => !p.skip && !p.unpaid)
    .forEach((p) => {
      const t = (by[p.who] = by[p.who] || {
        who: p.who,
        gross: 0,
        mat: 0,
        ded: 0,
        paid: 0,
        vat: 0,
        n: 0,
        pays: [],
      });
      t.gross += p.gross;
      t.mat += p.mat;
      t.ded += p.ded;
      t.paid += p.paid;
      t.vat += p.vat;
      t.n++;
      t.pays.push(p);
    });
  return Object.values(by).map((t) =>
    Object.assign(t, {
      gross: sdR2(t.gross),
      mat: sdR2(t.mat),
      ded: sdR2(t.ded),
      paid: sdR2(t.paid),
      vat: sdR2(t.vat),
    }),
  );
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
async function cisSaveCfg(patch) {
  const rec = Object.assign({}, S.cisSubs || {}, patch, { kind: "cissubs" });
  delete rec.id;
  await S.db.doc("todos/cissubs").set(rec);
  S.cisSubs = Object.assign({ id: "cissubs" }, rec);
}
/* what's missing on a subcontractor's record */
function cisWarn(s) {
  const w = [];
  if (!/^\d{10}$/.test(String(s.utr || "").replace(/\s/g, ""))) w.push("UTR missing");
  if (!s.verifiedOn) w.push("not verified with HMRC");
  if (String(s.rate) === "30" && !s.vno) w.push("verification number needed at 30%");
  if (s.plExpiry && s.plExpiry < iso(new Date())) w.push("insurance expired");
  return w;
}

function cisView() {
  const tab = S.f.cisv || "month";
  const tabs = `<div class="seg cis-tabs" id="cis-tabs">${[
    ["month", "This month"],
    ["subs", "Subcontractors"],
    ["year", "Year"],
  ]
    .map(
      ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${tab === k}">${l}</button>`,
    )
    .join("")}</div>`;
  if (tab === "subs") cisSubsView(tabs);
  else if (tab === "year") cisYearView(tabs);
  else cisMonthView(tabs);
  $("cis-tabs")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.cisv = b.dataset.v;
          render();
        }),
    );
}

/* ---------- this month ---------- */
function cisMonthView(tabs) {
  const today = iso(new Date());
  /* default: the month just ended (the one to file now) until its return is filed */
  const curM = cisMonthOf(today);
  const prevM = cisMonthOf(iso(addDays(parse(cisRange(curM)[0]), -1)));
  const key = S.f.cism || (cisRec(prevM).filedAt ? curM : prevM);
  const [from, to] = cisRange(key);
  const rec = cisRec(key);
  const pays = cisPayments(key);
  const tots = cisTotals(pays);
  const sum = (k) => sdR2(tots.reduce((a, t) => a + t[k], 0));
  const due = key + "-19",
    payBy = key + "-22";
  const ended = today > to;
  const late = !rec.filedAt && today > due;
  const subs = cisSubList();
  /* CIS contractors took off James's own invoices, paid in this tax month */
  const suffered = sdSales()
    .filter((d) => d.type === "invoice" && +d.cis > 0)
    .reduce(
      (a, d) =>
        a + ((d.payments || []).some((p) => p.date >= from && p.date <= to) ? sdCalc(d).cis : 0),
      0,
    );
  $("main").innerHTML = `<div class="cis-page">${tabs}
    <div class="cis-nav"><button type="button" class="iconbtn" id="cis-prev" aria-label="Month before">‹</button><b>Tax month ${esc(cisLab(key))}</b><button type="button" class="iconbtn" id="cis-next" aria-label="Month after">›</button></div>
    <div class="notice ${rec.filedAt ? "ok" : late ? "bad" : ""} cis-due">${
      rec.filedAt
        ? `✓ Return filed ${esc(shortDay(rec.filedAt))}${rec.payRef ? " · ref " + esc(rec.payRef) : ""}.${rec.hmrcPaid ? ` Tax of ${gbp(rec.hmrcPaid.amt)} paid to HMRC ${esc(shortDay(rec.hmrcPaid.date))}.` : ` Pay HMRC ${gbp(sum("ded"))} by ${esc(shortDay(payBy))}.`}`
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
              .map((t) => {
                const s = cisSub(t.who);
                return `<div class="cis-tr"><span><b>${esc(s.name)}</b><small>${cisRateOf(t.who)}%${s.trading ? " · " + esc(s.trading) : ""}</small></span><span>${esc(s.utr || "⚠ missing")}</span><span>${esc(s.vno || (cisRateOf(t.who) === "30" ? "⚠ needed at 30%" : "–"))}</span><span>${gbp(t.gross)}</span><span>${gbp(t.mat)}</span><span>${gbp(t.ded)}</span></div>`;
              })
              .join(
                "",
              )}<div class="cis-tr cis-tf"><span>Total</span><span></span><span></span><span>${gbp(sum("gross"))}</span><span>${gbp(sum("mat"))}</span><span>${gbp(sum("ded"))}</span></div></div>`
          : `<div class="who">No payments to CIS subcontractors in this month. You still need to tell HMRC: file a <b>nil return</b>, or tell them you're inactive if you won't pay anyone for 6 months.</div>`
      }
      ${tots.length ? `<div class="who cis-sent">Statements: ${tots.map((t) => esc(cisSub(t.who).name) + ((rec.stmtSent || {})[t.who] ? " ✓ sent" : " – not sent yet")).join(" · ")}</div>` : ""}
      <div class="cis-acts">
        <a class="btn primary" id="cis-hmrc" href="${CIS_HMRC}" target="_blank" rel="noopener">🔗 Open HMRC CIS online</a>
        ${tots.length ? `<button type="button" class="btn" id="cis-copy">📋 Copy the figures</button><button type="button" class="btn" id="cis-stm">📄 Statements PDF</button><button type="button" class="btn" id="cis-send">📨 Send statements to subbies</button>` : ""}
        <button type="button" class="btn" id="cis-filed">${rec.filedAt ? "Change filed date" : "✔ Mark as filed"}</button>
        <button type="button" class="btn" id="cis-paidhm">${rec.hmrcPaid ? "✓ Tax paid to HMRC" : "💷 Record tax paid to HMRC"}</button>
      </div>
      <div class="who">Sign in with your Government Gateway, choose the return for the month ending ${esc(shortDay(to))}, and type in the figures above. HMRC asks you to confirm the workers are self-employed and verified. <a href="${CIS_GUIDE}" target="_blank" rel="noopener">HMRC's guide</a></div>
    </div></section>
    <div class="flabel">Payments in this month</div>
    ${
      pays.length
        ? `<div class="cis-pays">${pays
            .map(
              (p) =>
                `<div class="cis-pay ${p.skip ? "cis-skip" : ""}" data-k="${esc(p.k)}"><div class="cis-ph"><b>${esc(cisSub(p.who).name)}</b><span class="who">${esc(shortDay(p.date))} · ${esc(p.label)}</span><b class="cis-amt">${gbp(p.amt)}</b></div>
                ${
                  p.extra != null
                    ? `<div class="cis-pin"><span class="cis-calc">Labour ${gbp(p.labour)} · materials ${gbp(p.mat)}${p.vat ? " · VAT " + gbp(p.vat) : ""}<br>Tax at ${cisRateOf(p.who)}%: <b>${gbp(p.ded)}</b> · you pay them <b>${gbp(p.paid)}</b></span><button type="button" class="btn cis-xedit">Edit</button><button type="button" class="linkdanger cis-xdel">Remove</button></div>`
                    : `<div class="cis-pin"><label>VAT in it £<input class="cis-vat" type="number" inputmode="decimal" step="0.01" value="${p.vat || ""}"></label><label>Materials £<input class="cis-mat" type="number" inputmode="decimal" step="0.01" value="${p.mat || ""}"></label><span class="cis-calc">Tax at ${cisRateOf(p.who)}% on ${gbp(p.labour)}: <b>${gbp(p.ded)}</b><br>You pay them <b>${gbp(p.paid)}</b></span><label class="inl"><input type="checkbox" class="cis-skipc"${p.skip ? " checked" : ""}> Not CIS work</label></div>`
                }</div>`,
            )
            .join("")}</div>`
        : `<div class="who">CIS workers' invoices you mark as Paid show here, and any payment you add.</div>`
    }
    <button type="button" class="btn primary" id="cis-add">+ New bill</button>
    ${!subs.length ? `<div class="notice">No CIS subcontractors yet. Add them under <b>Subcontractors</b>.</div>` : ""}
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
    if (p.extra != null) {
      row.querySelector(".cis-xedit").onclick = () =>
        cisBill(key, (rec.extra || [])[p.extra], p.extra);
      row.querySelector(".cis-xdel").onclick = async () => {
        const extra = (rec.extra || []).slice();
        extra.splice(p.extra, 1);
        S.f.cism = key;
        await cisSaveMonth(key, { extra });
        render();
      };
      return;
    }
    const saveRow = async () => {
      const vat = sdR2(row.querySelector(".cis-vat").value),
        mat = sdR2(row.querySelector(".cis-mat").value);
      try {
        S.f.cism = key;
        await cisSaveMonth(key, {
          pays: Object.assign({}, rec.pays || {}, {
            [k]: { vat, mat, skip: row.querySelector(".cis-skipc").checked },
          }),
        });
        render();
      } catch (e) {
        toast("Couldn't save. Check your connection.");
      }
    };
    row.querySelectorAll("input").forEach((x) => (x.onchange = saveRow));
  });
  $("cis-add").onclick = () => cisBill(key);
  if ($("cis-copy"))
    $("cis-copy").onclick = async () => {
      const txt =
        `CIS return, tax month ending ${shortDay(to)}\n` +
        tots
          .map((t) => {
            const s = cisSub(t.who);
            return `${s.name} · UTR ${s.utr || "?"}${s.vno ? " · verification " + s.vno : ""} · total payments ${t.gross.toFixed(2)} · materials ${t.mat.toFixed(2)} · deducted ${t.ded.toFixed(2)}`;
          })
          .join("\n") +
        `\nTotal deducted ${sum("ded").toFixed(2)}`;
      try {
        await navigator.clipboard.writeText(txt);
        toast("Figures copied – paste them wherever you need");
      } catch (e) {
        toast("Couldn't copy on this device");
      }
    };
  if ($("cis-stm"))
    $("cis-stm").onclick = async () => {
      toast("Making the statements…");
      try {
        await S.dl.save({
          filename: `CIS statements ${cisLab(key)}.pdf`,
          data: await cisStmtPdf(key, tots),
        });
      } catch (e) {
        toast("Couldn't make the statements. Check your connection.");
      }
    };
  if ($("cis-send")) $("cis-send").onclick = () => cisSendStatements("month", key, tots);
  $("cis-filed").onclick = () => {
    openSheet(
      `<h3 id="sheettitle">✔ CIS return filed</h3>
      <label for="cf-d">Date you filed it<input id="cf-d" type="date" value="${esc(rec.filedAt || today)}"></label>
      <label for="cf-r">HMRC's reference (optional)<input id="cf-r" maxlength="40" value="${esc(rec.payRef || "")}"></label>
      <label class="inl"><input type="checkbox" id="cf-nil"${rec.nil || !tots.length ? " checked" : ""}> It was a nil return (nobody paid)</label>
      ${formFoot(false, "Save")}`,
      async () => {
        try {
          S.f.cism = key;
          await cisSaveMonth(key, {
            filedAt: $("cf-d").value || today,
            payRef: $("cf-r").value.trim(),
            nil: $("cf-nil").checked,
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
  $("cis-paidhm").onclick = () => {
    openSheet(
      `<h3 id="sheettitle">💷 CIS tax paid to HMRC</h3>
      <div class="grid2"><label for="ch-d">Date paid<input id="ch-d" type="date" value="${esc((rec.hmrcPaid || {}).date || today)}"></label><label for="ch-a">Amount £<input id="ch-a" type="number" inputmode="decimal" step="0.01" value="${esc((rec.hmrcPaid || {}).amt != null ? rec.hmrcPaid.amt : sum("ded").toFixed(2))}"></label></div>
      <div class="who">Pay with your Accounts Office reference${cisCfg().aoRef ? " (" + esc(cisCfg().aoRef) + ")" : ""}. It's usually paid along with any PAYE.</div>
      ${formFoot(false, "Save")}`,
      async () => {
        try {
          S.f.cism = key;
          await cisSaveMonth(key, {
            hmrcPaid: { date: $("ch-d").value || today, amt: sdR2($("ch-a").value) },
          });
          closeForm();
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
        }
      },
    );
  };
}

/* ---------- a payment: who, invoice, labour, materials, VAT – with the tax worked out as it's typed ---------- */
function cisAddPayment(key, x0, idx) {
  const subs = cisSubList();
  if (!subs.length) return toast("Add your CIS subcontractors first (Subcontractors tab)");
  const [from, to] = cisRange(key);
  const td = iso(new Date());
  const x = Object.assign(
    { who: subs[0].id, date: td > to ? to : td < from ? from : td },
    x0 || {},
  );
  if (x.lab == null && x.amt != null) x.lab = sdR2((+x.amt || 0) - (+x.vat || 0) - (+x.mat || 0));
  const num = (id, label, v, hint) =>
    `<label for="${id}">${label}<input id="${id}" type="number" inputmode="decimal" step="0.01" value="${esc(v == null || v === 0 ? "" : v)}">${hint ? `<span class="who">${hint}</span>` : ""}</label>`;
  openSheet(
    `<h3 id="sheettitle">${x0 ? "Edit" : "+"} CIS payment</h3>
    <label for="ca-w">Subcontractor<select id="ca-w">${subs.map((s) => `<option value="${esc(s.id)}"${s.id === x.who ? " selected" : ""}>${esc(s.name)} (${cisRateOf(s.id)}%)</option>`).join("")}</select></label>
    <div class="grid2"><label for="ca-d">Date paid<input id="ca-d" type="date" value="${esc(x.date)}" min="${from}" max="${to}"></label><label for="ca-i">Their invoice number<input id="ca-i" maxlength="30" value="${esc(x.inv || "")}"></label></div>
    <div class="grid2"><label for="ca-s">Site<input id="ca-s" maxlength="120" value="${esc(x.site || "")}" list="ca-sites"></label><label for="ca-n">What for<input id="ca-n" maxlength="120" value="${esc(x.desc || x.note || "")}"></label></div>
    <datalist id="ca-sites">${(S.sites || []).map((s) => `<option value="${esc(s.name)}">`).join("")}</datalist>
    <div class="grid2">${num("ca-l", "Labour £", x.lab, "Tax is taken off this")}${num("ca-m", "Materials £", x.mat, "Including plant hire and consumables they bought")}</div>
    <div class="grid2">${num("ca-v", "VAT on their invoice £", x.vat, "Not taxed under CIS")}<div class="cis-calcbox" id="ca-calc"></div></div>
    ${formFoot(!!x0, x0 ? "Save" : "Add")}`,
    async () => {
      const lab = sdR2($("ca-l").value),
        mat = sdR2($("ca-m").value),
        vat = sdR2($("ca-v").value);
      if (!(lab + mat > 0)) return showErr("Put the labour and/or materials.");
      const d = $("ca-d").value;
      if (!d || d < from || d > to)
        return showErr("The date must be in this tax month (" + cisLab(key) + ").");
      const extra = (cisRec(key).extra || []).slice();
      const rec = {
        who: $("ca-w").value,
        date: d,
        inv: $("ca-i").value.trim(),
        site: $("ca-s").value.trim(),
        desc: $("ca-n").value.trim(),
        lab,
        mat,
        vat,
      };
      if (idx != null) extra[idx] = rec;
      else extra.push(rec);
      try {
        S.f.cism = key;
        await cisSaveMonth(key, { extra });
        closeForm();
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "ca-l",
  );
  const calc = () => {
    const lab = +$("ca-l").value || 0,
      mat = +$("ca-m").value || 0,
      vat = +$("ca-v").value || 0;
    const r = +cisRateOf($("ca-w").value);
    const ded = cisDown((lab * r) / 100);
    $("ca-calc").innerHTML =
      `<div class="drow"><span>Their invoice</span><b>${gbp(lab + mat + vat)}</b></div><div class="drow"><span>Tax at ${r}% on ${gbp(lab)}</span><b>-${gbp(ded)}</b></div><div class="drow"><span>You pay them</span><b>${gbp(lab + mat + vat - ded)}</b></div>`;
  };
  ["ca-l", "ca-m", "ca-v", "ca-w"].forEach((id) => ($(id).oninput = $(id).onchange = calc));
  calc();
  const del = $("f-del");
  if (del && x0)
    del.onclick = async () => {
      const extra = (cisRec(key).extra || []).slice();
      extra.splice(idx, 1);
      S.f.cism = key;
      await cisSaveMonth(key, { extra });
      closeForm();
      render();
    };
}

/* ---------- subcontractors ---------- */
function cisSubsView(tabs) {
  const cfg = cisCfg();
  const subs = cisSubList();
  $("main").innerHTML = `<div class="cis-page">${tabs}
    <div class="sd-acts"><button type="button" class="btn primary" id="cis-newsub">+ Add a subcontractor</button><a class="btn" href="${CIS_HMRC}" target="_blank" rel="noopener">Verify with HMRC</a></div>
    ${
      subs.length
        ? subs
            .map((s) => {
              const w = cisWarn(s);
              return `<div class="card cis-subcard"><div class="cardbody">
          <div class="cis-ph"><b>${esc(s.name)}</b>${s.trading ? `<span class="who">t/a ${esc(s.trading)}</span>` : ""}<span class="tag ${String(s.rate) === "0" ? "ok" : String(s.rate) === "30" ? "bad" : "day"}">${cisRateOf(s.id)}%</span>${s.app ? `<span class="tag">Uses the app</span>` : ""}</div>
          <div class="cis-subgrid">
            <span><small>Business</small>${esc(CIS_TYPES[s.type] || "Sole trader")}</span>
            <span><small>UTR</small>${esc(s.utr || "–")}</span>
            <span><small>${s.type === "company" ? "Company no." : "NI number"}</small>${esc((s.type === "company" ? s.crn : s.nino) || "–")}</span>
            <span><small>Verified</small>${s.verifiedOn ? esc(shortDay(s.verifiedOn)) + (s.vno ? " · " + esc(s.vno) : "") : "–"}</span>
            <span><small>VAT</small>${s.vatNo ? esc(s.vatNo) + (s.drc ? " · reverse charge" : "") : "Not registered"}</span>
            <span><small>Insurance to</small>${s.plExpiry ? esc(shortDay(s.plExpiry)) : "–"}</span>
          </div>
          ${w.length ? `<div class="cis-warn">⚠ ${esc(w.join(" · "))}</div>` : ""}
          <div class="cis-acts"><button type="button" class="btn cis-edsub" data-id="${esc(s.id)}">Edit details</button><button type="button" class="btn cis-yrsub" data-id="${esc(s.id)}">📄 This tax year</button></div>
        </div></div>`;
            })
            .join("")
        : `<div class="empty"><strong>No CIS subcontractors yet</strong>Add each subbie you pay under CIS. People who use the app and are set as Self-employed (CIS) show here by themselves.</div>`
    }
    ${(() => {
      const others = teamIds().filter(
        (w) => !subs.some((x) => x.id === w) && cisTeamDet(w).empType !== "employed",
      );
      return others.length
        ? `<section class="card"><div class="cardbody"><b>Others on the app</b><div class="who">Not set as Self-employed (CIS). If you pay one of them under CIS – for example they're from a CIS-registered Ltd company – add them here.</div>${others
            .map(
              (w) =>
                `<div class="drow"><span>${esc(nameOf(w))} <small class="who">${esc(EMP_TYPES[cisTeamDet(w).empType] || "Type not set")}</small></span><button type="button" class="btn cis-addapp" data-w="${esc(w)}">Add to CIS</button></div>`,
            )
            .join("")}</div></section>`
        : "";
    })()}
    <section class="card"><div class="cardbody"><b>Your contractor details</b>
      <div class="grid2"><label for="cis-eref">Employer (PAYE) reference<input id="cis-eref" maxlength="20" value="${esc(cfg.empRef || "")}" placeholder="e.g. 123/AB45678"></label><label for="cis-aoref">Accounts Office reference<input id="cis-aoref" maxlength="20" value="${esc(cfg.aoRef || "")}" placeholder="e.g. 123PA00045678"></label></div>
      <label for="cis-cutr">Your UTR<input id="cis-cutr" maxlength="12" value="${esc(cfg.utr || "")}"></label>
      <div class="who">These go on the statements you give your subbies. Saved as you change them.</div>
    </div></section>
  </div>`;
  $("cis-newsub").onclick = () => cisEditSub(null);
  document.querySelectorAll("#main .cis-addapp").forEach(
    (x) =>
      (x.onclick = async () => {
        const w = x.dataset.w;
        try {
          await cisSaveCfg({
            subs: Object.assign({}, cfg.subs, {
              [w]: Object.assign({}, cfg.subs[w] || {}, {
                cis: true,
                type:
                  cisTeamDet(w).empType === "company"
                    ? "company"
                    : (cfg.subs[w] || {}).type || "sole",
              }),
            }),
          });
          toast(nameOf(w) + " added to CIS – check their details and rate");
          render();
        } catch (e) {
          toast("Couldn't save. Check your connection.");
        }
      }),
  );
  document
    .querySelectorAll("#main .cis-edsub")
    .forEach((b) => (b.onclick = () => cisEditSub(cisSub(b.dataset.id))));
  document.querySelectorAll("#main .cis-yrsub").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.cisv = "year";
        S.f.cisw = b.dataset.id;
        render();
      }),
  );
  const saveRefs = async () => {
    try {
      await cisSaveCfg({
        empRef: $("cis-eref").value.trim(),
        aoRef: $("cis-aoref").value.trim(),
        utr: $("cis-cutr").value.trim(),
      });
      toast("Saved");
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
  ["cis-eref", "cis-aoref", "cis-cutr"].forEach((id) => ($(id).onchange = saveRefs));
}
function cisEditSub(s0) {
  const s = Object.assign({ type: "sole", rate: "20" }, s0 || {});
  const inp = (id, label, v, o) =>
    `<label for="${id}">${label}<input id="${id}" ${o || ""} value="${esc(v || "")}"></label>`;
  openSheet(
    `<h3 id="sheettitle">${s0 ? "👷 " + esc(s.name) : "+ CIS subcontractor"}</h3>
    ${s.app ? `<div class="who">Uses the app. Their name, UTR and contact details come from their own details; anything you put here is used on the CIS paperwork.</div>` : ""}
    <div class="grid2">${inp("cs-name", "Name (as registered with HMRC)", s.name, 'maxlength="80"')}${inp("cs-trad", "Trading name", s.trading, 'maxlength="80"')}</div>
    <label for="cs-type">Business type<select id="cs-type">${Object.entries(CIS_TYPES)
      .map(([k, v]) => `<option value="${k}"${k === s.type ? " selected" : ""}>${v}</option>`)
      .join("")}</select></label>
    <div class="grid2">${inp("cs-utr", "UTR (10 digits)", s.utr, 'maxlength="13" inputmode="numeric"')}<div class="cs-sole">${inp("cs-nino", "National Insurance number", s.nino, 'maxlength="13" placeholder="e.g. QQ123456C"')}</div><div class="cs-co">${inp("cs-crn", "Company registration number", s.crn, 'maxlength="10"')}</div><div class="cs-part">${inp("cs-putr", "Partnership UTR", s.partUtr, 'maxlength="13"')}</div></div>
    <div class="cs-part">${inp("cs-pnom", "Nominated partner", s.partner, 'maxlength="80"')}</div>
    <div class="flabel">Verification with HMRC</div>
    <div class="grid2"><label for="cs-rate">Tax rate HMRC gave<select id="cs-rate">${Object.entries(
      CIS_RATES,
    )
      .map(
        ([k, v]) => `<option value="${k}"${String(s.rate) === k ? " selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label>${inp("cs-vdate", "Date verified", s.verifiedOn, 'type="date"')}</div>
    <div class="grid2">${inp("cs-vno", "Verification number", s.vno, 'maxlength="20" placeholder="e.g. V1234567890/A"')}<label for="cs-vhow">How<select id="cs-vhow"><option value="online">Online</option><option value="phone"${s.verifyHow === "phone" ? " selected" : ""}>By phone</option><option value="previous"${s.verifyHow === "previous" ? " selected" : ""}>Paid in the last 2 tax years (no need)</option></select></label></div>
    <div class="flabel">Contact</div>
    <label for="cs-addr">Address<textarea id="cs-addr" rows="3" maxlength="300">${esc(s.addr || "")}</textarea></label>
    <div class="grid2">${inp("cs-phone", "Phone", s.phone, 'type="tel" maxlength="20"')}${inp("cs-email", "Email (for statements)", s.email, 'type="email" maxlength="120"')}</div>
    <div class="flabel">VAT and insurance</div>
    <div class="grid2">${inp("cs-vat", "VAT number (if registered)", s.vatNo, 'maxlength="14"')}<label class="inl cs-drcl"><input type="checkbox" id="cs-drc"${s.drc ? " checked" : ""}> Their invoices are reverse charge VAT</label></div>
    <div class="grid2">${inp("cs-pli", "Public liability insurer", s.plInsurer, 'maxlength="60"')}${inp("cs-ple", "Insurance expires", s.plExpiry, 'type="date"')}</div>
    <div class="grid2">${inp("cs-start", "Started working for you", s.start, 'type="date"')}${inp("cs-trade", "Trade", s.trade, 'maxlength="40" placeholder="e.g. Bricklayer"')}</div>
    <label for="cs-notes">Notes<textarea id="cs-notes" rows="2" maxlength="1000">${esc(s.notes || "")}</textarea></label>
    ${s.app && (cisCfg().subs[s.id] || {}).cis ? `<div class="actions"><button type="button" class="linkdanger" id="cs-uncis">Take off CIS (they were added here)</button></div>` : ""}
    ${formFoot(!!(s0 && !s.app), "Save")}`,
    async () => {
      const name = $("cs-name").value.trim();
      if (!name) return showErr("Put their name.");
      const utr = $("cs-utr").value.replace(/\s/g, "");
      if (utr && !/^\d{10}$/.test(utr)) return showErr("A UTR is 10 numbers.");
      const rec = {
        name,
        trading: $("cs-trad").value.trim(),
        type: $("cs-type").value,
        utr,
        nino: $("cs-nino").value.replace(/\s/g, "").toUpperCase(),
        crn: $("cs-crn").value.trim(),
        partUtr: $("cs-putr").value.replace(/\s/g, ""),
        partner: $("cs-pnom").value.trim(),
        rate: $("cs-rate").value,
        verifiedOn: $("cs-vdate").value,
        vno: $("cs-vno").value.trim().toUpperCase(),
        verifyHow: $("cs-vhow").value,
        addr: $("cs-addr").value.trim(),
        phone: $("cs-phone").value.trim(),
        email: $("cs-email").value.trim(),
        vatNo: $("cs-vat").value.replace(/\s/g, ""),
        drc: $("cs-drc").checked,
        plInsurer: $("cs-pli").value.trim(),
        plExpiry: $("cs-ple").value,
        start: $("cs-start").value,
        trade: $("cs-trade").value.trim(),
        notes: $("cs-notes").value.trim(),
      };
      const id = s0 ? s0.id : "sub-" + newId();
      try {
        await cisSaveCfg({
          subs: Object.assign({}, cisCfg().subs, {
            [id]: Object.assign(rec, (cisCfg().subs[id] || {}).cis ? { cis: true } : {}),
          }),
        });
        closeForm();
        toast("Saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "cs-name",
  );
  const showType = () => {
    const t = $("cs-type").value;
    document.querySelectorAll(".cs-sole").forEach((x) => (x.hidden = t !== "sole"));
    document.querySelectorAll(".cs-co").forEach((x) => (x.hidden = t !== "company"));
    document.querySelectorAll(".cs-part").forEach((x) => (x.hidden = t !== "partnership"));
  };
  $("cs-type").onchange = showType;
  if ($("cs-uncis"))
    $("cs-uncis").onclick = async () => {
      try {
        await cisSaveCfg({
          subs: Object.assign({}, cisCfg().subs, {
            [s0.id]: Object.assign({}, cisCfg().subs[s0.id], { cis: false }),
          }),
        });
        closeForm();
        toast("Taken off CIS");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    };
  showType();
  if ($("f-del") && s0 && !s.app)
    $("f-del").onclick = async () => {
      try {
        await cisSaveCfg({
          subs: Object.assign({}, cisCfg().subs, {
            [s0.id]: Object.assign({}, cisCfg().subs[s0.id], { archived: Date.now() }),
          }),
        });
        closeForm();
        toast("Removed (their payments are kept)");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    };
}

/* ---------- the tax year ---------- */
function cisYearTotals(y, who) {
  return cisYearMonths(y).map((m) => {
    const t = cisTotals(cisPayments(m)).find((x) => x.who === who);
    return {
      m,
      gross: t ? t.gross : 0,
      mat: t ? t.mat : 0,
      ded: t ? t.ded : 0,
      paid: t ? t.paid : 0,
      vat: t ? t.vat : 0,
      pays: t ? t.pays : [],
    };
  });
}
function cisYearView(tabs) {
  const y = S.f.cisy || sdTaxYear(iso(new Date()));
  const subs = cisSubList();
  const rows = subs.map((s) => {
    const ms = cisYearTotals(y, s.id);
    const t = ms.reduce(
      (a, m) => ({ gross: a.gross + m.gross, mat: a.mat + m.mat, ded: a.ded + m.ded }),
      { gross: 0, mat: 0, ded: 0 },
    );
    return { s, ms, t: { gross: sdR2(t.gross), mat: sdR2(t.mat), ded: sdR2(t.ded) } };
  });
  const sel = S.f.cisw && rows.find((r) => r.s.id === S.f.cisw);
  const all = rows.reduce(
    (a, r) => ({ gross: a.gross + r.t.gross, mat: a.mat + r.t.mat, ded: a.ded + r.t.ded }),
    { gross: 0, mat: 0, ded: 0 },
  );
  const sentY = (cisCfg().yearSent || {})[y] || {};
  $("main").innerHTML = `<div class="cis-page">${tabs}
    <div class="cis-nav"><button type="button" class="iconbtn" id="cis-yprev" aria-label="Year before">‹</button><b>Tax year 6 April ${y} – 5 April ${y + 1}</b><button type="button" class="iconbtn" id="cis-ynext" aria-label="Year after">›</button></div>
    <div class="sd-boxes">
      <div class="sd-box"><small>Paid to subcontractors (no VAT)</small><b>${gbp(all.gross)}</b><span>this tax year</span></div>
      <div class="sd-box"><small>Materials</small><b>${gbp(all.mat)}</b><span>not taxed</span></div>
      <div class="sd-box bad"><small>Tax taken off</small><b>${gbp(all.ded)}</b><span>paid to HMRC</span></div>
    </div>
    <div class="cis-tbl"><div class="cis-tr cis-th cis-tr4"><span>Subcontractor</span><span>Paid (no VAT)</span><span>Materials</span><span>Tax taken off</span></div>${rows
      .map(
        (r) =>
          `<button type="button" class="cis-tr cis-tr4 cis-ysub${sel && sel.s.id === r.s.id ? " on" : ""}" data-id="${esc(r.s.id)}"><span><b>${esc(r.s.name)}</b><small>${sentY[r.s.id] ? "✓ yearly statement sent" : "tap for the months"}</small></span><span>${gbp(r.t.gross)}</span><span>${gbp(r.t.mat)}</span><span>${gbp(r.t.ded)}</span></button>`,
      )
      .join("")}</div>
    ${
      sel
        ? `<section class="card"><div class="cardbody"><b>${esc(sel.s.name)} – month by month</b>
      <div class="cis-tbl"><div class="cis-tr cis-th cis-tr4"><span>Tax month</span><span>Paid (no VAT)</span><span>Materials</span><span>Tax taken off</span></div>${sel.ms
        .map(
          (m) =>
            `<div class="cis-tr cis-tr4"><span>${esc(cisLab(m.m))}</span><span>${gbp(m.gross)}</span><span>${gbp(m.mat)}</span><span>${gbp(m.ded)}</span></div>`,
        )
        .join(
          "",
        )}<div class="cis-tr cis-tr4 cis-tf"><span>Total</span><span>${gbp(sel.t.gross)}</span><span>${gbp(sel.t.mat)}</span><span>${gbp(sel.t.ded)}</span></div></div>
      <div class="cis-acts"><button type="button" class="btn" id="cis-ypdf">📄 Yearly statement PDF</button><button type="button" class="btn primary" id="cis-ysend">📨 Send yearly statement</button></div>
    </div></section>`
        : ""
    }
    ${rows.length ? `<div class="cis-acts"><button type="button" class="btn" id="cis-yall">📨 Send everyone their yearly statement</button></div>` : `<div class="empty"><strong>No CIS subcontractors yet</strong>Add them under Subcontractors.</div>`}
  </div>`;
  $("cis-yprev").onclick = () => {
    S.f.cisy = y - 1;
    render();
  };
  $("cis-ynext").onclick = () => {
    S.f.cisy = y + 1;
    render();
  };
  document.querySelectorAll("#main .cis-ysub").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.cisw = S.f.cisw === b.dataset.id ? "" : b.dataset.id;
        render();
      }),
  );
  if (sel) {
    $("cis-ypdf").onclick = async () => {
      toast("Making the yearly statement…");
      try {
        await S.dl.save({
          filename: `CIS yearly statement ${y}-${String(y + 1).slice(2)} ${sel.s.name}.pdf`,
          data: await cisYearPdf(y, [sel.s.id]),
        });
      } catch (e) {
        toast("Couldn't make it. Check your connection.");
      }
    };
    $("cis-ysend").onclick = () =>
      cisSendStatements("year", y, [{ who: sel.s.id, ded: sel.t.ded }]);
  }
  if ($("cis-yall"))
    $("cis-yall").onclick = () =>
      cisSendStatements(
        "year",
        y,
        rows.filter((r) => r.t.gross > 0).map((r) => ({ who: r.s.id, ded: r.t.ded })),
      );
}

/* ---------- statements: PDFs on the letterhead ---------- */
async function cisPdfStart() {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const set = sdSet(),
    co = coData(),
    brand = BRGB();
  const logo = await sdImgData(set.logoId || ((S.settings || {}).company || {}).logoId);
  const sig = await sdImgData(set.sigId);
  const head = (title) => {
    if (logo) {
      const k = Math.min(60 / logo.w, 32 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "cislogo", "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...brand);
      doc.text(co.name, 18, 22);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...brand);
    let hy = 12;
    sdHeadLines().forEach((t) => {
      if (!t.trim()) {
        hy += 2;
        return;
      }
      doc.text(t, 190, hy, { align: "right" });
      hy += 4.2;
    });
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.7);
    doc.line(3, 46, 207, 46);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, 20, 57);
    return 66;
  };
  const row = (k, v, y, b) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(k, 20, y);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", b ? "bold" : "normal");
    doc.text(doc.splitTextToSize(String(v || "–"), 100)[0], 190, y, { align: "right" });
  };
  const foot = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      /* signed for the contractor */
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text("Signed for " + co.name + ": " + co.owner, 20, 262);
      if (sig) {
        const k = Math.min(45 / sig.w, 13 / sig.h);
        doc.addImage(sig.u, sig.f, 20, 264, sig.w * k, sig.h * k, "cissig", "FAST");
      }
      doc.setDrawColor(...brand);
      doc.setLineWidth(0.5);
      doc.line(3, 280, 207, 280);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Keep this statement: you'll need it to claim the tax taken off on your tax return.",
        105,
        285,
        { align: "center" },
      );
      doc.text("Page " + i + " of " + n, 105, 290, { align: "center" });
    }
  };
  const who = (s, y) => {
    const cfg = cisCfg();
    const addr =
      sdHeadLines()
        .slice(1)
        .filter((x) => x.trim() && !/@|www\.|^\+?\d[\d ]{8,}$/.test(x))
        .join(", ") || String(co.address || "").replace(/\s*\n\s*/g, ", ");
    [
      ["Contractor", co.name],
      ["Contractor's address", addr],
      ["Employer's (PAYE) reference", cfg.empRef],
      ["Subcontractor", s.name + (s.trading ? " t/a " + s.trading : "")],
      ["Subcontractor's UTR", s.utr],
      ["Verification number", s.vno || (String(s.rate) === "30" ? "needed" : "–")],
    ].forEach(([k, v]) => {
      row(k, v, y);
      y += 6.6;
    });
    return y + 3;
  };
  return { doc, brand, head, row, foot, who };
}
/* monthly: one page per subcontractor, with the payments listed */
async function cisStmtPdf(key, tots) {
  const P = await cisPdfStart();
  const { doc, brand, row } = P;
  const [, to] = cisRange(key);
  tots.forEach((t, i) => {
    if (i) doc.addPage();
    const s = cisSub(t.who);
    let y = P.head("CIS payment and deduction statement");
    y = P.who(s, y);
    row("Tax month ending", sdLongDate(to), y, 1);
    y += 9;
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.3);
    doc.line(20, y - 5, 190, y - 5);
    [
      ["Gross amount paid (excluding VAT)", gbp(t.gross)],
      ["Less cost of materials", gbp(t.mat)],
      ["Amount liable to deduction", gbp(sdR2(t.gross - t.mat))],
      [`Amount deducted (${cisRateOf(t.who)}%)`, gbp(t.ded), 1],
      ["Amount paid to you (after deduction, with any VAT)", gbp(t.paid), 1],
    ].forEach(([k, v, b]) => {
      row(k, v, y, b);
      y += 7.5;
    });
    /* the payments that make it up */
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...brand);
    doc.text("Payments in the month", 20, y);
    y += 6;
    const cols = [
      [20, "Date", "left"],
      [44, "Invoice / work", "left"],
      [128, "Labour", "right"],
      [150, "Materials", "right"],
      [168, "Tax", "right"],
      [190, "Paid", "right"],
    ];
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    cols.forEach(([x, l, a]) => doc.text(l, x, y, { align: a }));
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    (t.pays || []).forEach((p) => {
      if (y > 268) {
        doc.addPage();
        y = P.head("CIS payment and deduction statement (continued)");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(20, 20, 20);
      }
      doc.text(shortDay(p.date), 20, y);
      doc.text(doc.splitTextToSize(p.label, 80)[0], 44, y);
      doc.text(gbp(p.labour), 128, y, { align: "right" });
      doc.text(gbp(p.mat), 150, y, { align: "right" });
      doc.text(gbp(p.ded), 168, y, { align: "right" });
      doc.text(gbp(p.paid), 190, y, { align: "right" });
      y += 5.2;
    });
  });
  P.foot();
  return doc.output("blob");
}
/* yearly: one page per subcontractor, each tax month and the year's totals */
async function cisYearPdf(y, ids) {
  const P = await cisPdfStart();
  const { doc, brand } = P;
  ids.forEach((id, i) => {
    if (i) doc.addPage();
    const s = cisSub(id);
    const ms = cisYearTotals(y, id);
    let yy = P.head(`CIS yearly statement – 6 April ${y} to 5 April ${y + 1}`);
    yy = P.who(s, yy);
    yy += 3;
    const cols = [
      [21, "Tax month", "left"],
      [100, "Paid (no VAT)", "right"],
      [128, "Materials", "right"],
      [158, "Liable to tax", "right"],
      [189, "Tax taken off", "right"],
    ];
    doc.setFillColor(...brand);
    doc.rect(18, yy - 4.6, 174, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    cols.forEach(([x, l, a]) => doc.text(l, x, yy, { align: a }));
    yy += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const tot = { gross: 0, mat: 0, ded: 0 };
    ms.forEach((m) => {
      doc.text(cisLab(m.m), 21, yy);
      doc.text(gbp(m.gross), 100, yy, { align: "right" });
      doc.text(gbp(m.mat), 128, yy, { align: "right" });
      doc.text(gbp(sdR2(m.gross - m.mat)), 158, yy, { align: "right" });
      doc.text(gbp(m.ded), 189, yy, { align: "right" });
      tot.gross += m.gross;
      tot.mat += m.mat;
      tot.ded += m.ded;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(18, yy + 2, 192, yy + 2);
      yy += 6.4;
    });
    doc.setFont("helvetica", "bold");
    doc.text("Total for the year", 21, yy + 1);
    doc.text(gbp(sdR2(tot.gross)), 100, yy + 1, { align: "right" });
    doc.text(gbp(sdR2(tot.mat)), 128, yy + 1, { align: "right" });
    doc.text(gbp(sdR2(tot.gross - tot.mat)), 158, yy + 1, { align: "right" });
    doc.text(gbp(sdR2(tot.ded)), 189, yy + 1, { align: "right" });
    yy += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      doc.splitTextToSize(
        "A summary of the monthly payment and deduction statements for the tax year. Use the tax taken off figure on your Self Assessment tax return (CIS deductions).",
        170,
      ),
      20,
      yy,
    );
  });
  P.foot();
  return doc.output("blob");
}
/* send statements: into the subbie's own app (if they use it) and/or by email. what = "month" (key) | "year" (y) */
function cisSendStatements(what, key, tots) {
  const yearly = what === "year";
  const lab = yearly
    ? `tax year 6 April ${key} – 5 April ${key + 1}`
    : "the tax month " + cisLab(key);
  const sent = yearly ? (cisCfg().yearSent || {})[key] || {} : cisRec(key).stmtSent || {};
  openSheet(
    `<h3 id="sheettitle">📨 Send ${yearly ? "yearly statements" : "statements"}</h3>
    <div class="who">Each person gets their ${yearly ? "yearly CIS statement" : "payment and deduction statement"} for ${esc(lab)}. People who use the app get it in My details › documents.${yearly ? "" : " By law they should have it within 14 days of the month's end."}</div>
    ${tots
      .map((t) => {
        const s = cisSub(t.who);
        return `<label class="inl cis-sendto"><input type="checkbox" value="${esc(t.who)}"${sent[t.who] ? "" : " checked"}> <span><b>${esc(s.name)}</b><small>Tax taken off ${gbp(t.ded)}${sent[t.who] ? " · already sent " + esc(stamp(sent[t.who])) : ""}${s.app ? " · in their app" : ""}${s.email ? " · " + esc(s.email) : s.app ? "" : " · no email saved"}</small></span></label>`;
      })
      .join("")}
    <label class="inl"><input type="checkbox" id="cs-mail"${tots.some((t) => !cisSub(t.who).app) ? " checked" : ""}> Email them too (opens your email for each person)</label>
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
          const s = cisSub(w);
          const blob = yearly
            ? await cisYearPdf(key, [w])
            : await cisStmtPdf(key, [tots.find((x) => x.who === w)]);
          const fn = yearly
            ? `CIS yearly statement ${key}-${String(key + 1).slice(2)} ${s.name}.pdf`
            : `CIS statement ${cisLab(key)} ${s.name}.pdf`;
          if (s.app) {
            const a = await uploadFile(blob, fn);
            await S.db
              .doc(
                "sheets/" + w + "/signoffs/pd-cis" + String(key).replace("-", "") + "-" + newId(),
              )
              .set({
                type: "persdoc",
                kind: "cis",
                label: yearly
                  ? `CIS yearly statement ${key}/${String(key + 1).slice(2)}`
                  : "CIS statement, month ending " + shortDay(cisRange(key)[1]),
                number: "",
                expires: "",
                note: `Tax taken off: ${gbp((tots.find((x) => x.who === w) || {}).ded || 0)}. Keep this for your tax return.`,
                types: ["application/pdf"],
                names: [fn],
                photos: [a.id],
                byOwner: true,
                created: Date.now(),
              });
          }
          done[w] = Date.now();
          files.push([w, blob, fn]);
        }
        if (yearly)
          await cisSaveCfg({
            yearSent: Object.assign({}, cisCfg().yearSent || {}, { [key]: done }),
          });
        else {
          S.f.cism = key;
          await cisSaveMonth(key, { stmtSent: done });
        }
        closeForm();
        const inApp = ws.filter((w) => cisSub(w).app).length;
        toast(
          inApp
            ? `Sent to ${inApp} ${inApp === 1 ? "person's" : "people's"} app`
            : "Statements ready to email",
        );
        render();
        if (email || ws.some((w) => !cisSub(w).app)) cisEmailEach(lab, files, yearly);
      } catch (e) {
        showErr("Couldn't send. Check your connection.");
        $("f-save").disabled = false;
        $("f-save").textContent = "Send";
      }
    },
  );
}
/* one at a time: a button per person, so each email is opened by a tap (phones only allow that) */
function cisEmailEach(lab, files, yearly) {
  const co = coData();
  openSheet(
    `<h3 id="sheettitle">📧 Email the statements</h3>
    <div class="who">Tap each person to open your email with their statement attached.</div>
    ${files.map(([w], i) => `<button type="button" class="btn cis-em" data-i="${i}">📧 ${esc(cisSub(w).name)}</button>`).join("")}
    ${formFoot(false, "Done")}`,
    async () => closeForm(),
  );
  document.querySelectorAll(".cis-em").forEach(
    (b) =>
      (b.onclick = async () => {
        const [w, blob, fn] = files[+b.dataset.i];
        const s = cisSub(w);
        await sdShareMail({
          to: s.email || "",
          subject: `CIS ${yearly ? "yearly statement" : "payment and deduction statement"} – ${lab}`,
          body: `Hi ${String(s.name).split(" ")[0]},\n\nPlease find attached your CIS ${yearly ? "yearly statement" : "payment and deduction statement"} for ${lab}. Keep it for your tax return.\n\nKind regards\n${co.owner}\n${co.name}`,
          blob,
          filename: fn,
        });
        b.textContent = "✓ " + s.name;
      }),
  );
}
