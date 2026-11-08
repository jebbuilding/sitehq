/* ================= ACCOUNTS (owner): bank statements in, every payment sorted, profit and loss, VAT and what's owed ================= */
import { $, addDays, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import {
  AC_CATS,
  acAllTx,
  acBalance,
  acCatKind,
  acCatName,
  acCfg,
  acMonths,
  acParseStatement,
  acRuleFor,
  acSaleMatches,
  acSaveCfg,
  acSums,
  acTradeMatches,
  acUpdateTx,
} from "./acct-data.js";
import { adView } from "./acct-due.js";
import { acExportSheet } from "./acct-export.js";
import { acMatchWaiting, acReceipts } from "./acct-receipts.js";
import { acRcptSheet, acRcptView } from "./acct-review.js";
import { acSupView } from "./acct-suppliers.js";
import { jcView } from "./job-costs.js";
import { sdCalc, sdR2, sdSales, sdSaveRec, sdStatus, sdTaxYear } from "./sales-calc.js";
export { acPeriod, accountsView };
/* Two tabs. Overview: money in, money out and profit for the period, bank balances, month-by-month bars, the profit
   and loss by category, a VAT estimate, what customers owe and what's owed to trades, and an export for the
   accountant. Bank: bring in a statement (CSV from any bank), sort each payment into a category (rules do the
   regular ones by themselves), match money in to invoices (records the payment) and money out to trades'
   invoices (marks them paid), add the VAT on a receipt. A live bank feed needs our own server (Open Banking). */
const acPeriod = () => {
  const p = S.f.acp || "ty";
  const today = iso(new Date());
  const ty = sdTaxYear(today);
  if (p === "lty")
    return [`${ty - 1}-04-06`, `${ty}-04-05`, `Last tax year (6 Apr ${ty - 1} – 5 Apr ${ty})`];
  if (p === "m") return [today.slice(0, 8) + "01", today, "This month"];
  if (p === "3m") return [iso(addDays(new Date(), -91)), today, "Last 3 months"];
  if (p === "12m") return [iso(addDays(new Date(), -365)), today, "Last 12 months"];
  return [`${ty}-04-06`, `${ty + 1}-04-05`, `This tax year (from 6 Apr ${ty})`];
};
function accountsView() {
  const tab = S.f.act || "over";
  const tabs = `<div class="seg ac-tabs" id="ac-tabs">${[
    ["over", "Overview"],
    ["bank", "Bank"],
    ["due", "💳 Paid / not paid"],
    ["rcpt", "Receipts"],
    ["sup", "Suppliers & sites"],
    ["jobs", "💷 Job costs"],
  ]
    .map(
      ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${tab === k}">${l}</button>`,
    )
    .join(
      "",
    )}</div><div class="ac-exrow"><button type="button" class="pillbtn" id="ac-csv">⬇ Export CSV (month or year)</button></div>`;
  if (tab === "bank") acBankView(tabs);
  else if (tab === "rcpt") acRcptView(tabs);
  else if (tab === "due") adView(tabs);
  else if (tab === "sup") acSupView(tabs);
  else if (tab === "jobs") jcView(tabs);
  else acOverView(tabs);
  if ($("ac-csv")) $("ac-csv").onclick = acExportSheet;
  $("ac-tabs")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.act = b.dataset.v;
          render();
        }),
    );
}

/* ---------- overview ---------- */
function acOverView(tabs) {
  const [from, to, lab] = acPeriod();
  const s = acSums(from, to);
  const cfg = acCfg();
  const owedToYou = sdSales()
    .filter((d) => d.type === "invoice" && ["awaiting", "part", "overdue"].includes(sdStatus(d)))
    .reduce((a, d) => a + sdCalc(d).balance, 0);
  const owedByYou = allTeam("invoices")
    .filter(isInv)
    .filter((v) => (v.status || "sent") !== "paid")
    .reduce((a, v) => a + (+v.amount || 0), 0);
  /* month bars: in vs out (moves left out) */
  const months = [];
  for (
    let d = parse(from.slice(0, 8) + "01");
    iso(d) <= to && months.length < 13;
    d.setMonth(d.getMonth() + 1)
  )
    months.push(iso(d).slice(0, 7));
  const mIn = months.map((m) =>
    s.tx
      .filter((t) => t.date.startsWith(m) && t.amt > 0 && acCatKind(t.cat) !== "move")
      .reduce((a, t) => a + t.amt, 0),
  );
  const mOut = months.map((m) =>
    s.tx
      .filter((t) => t.date.startsWith(m) && t.amt < 0 && acCatKind(t.cat) !== "move")
      .reduce((a, t) => a - t.amt, 0),
  );
  const top = Math.max(1, ...mIn, ...mOut);
  const catRows = (kind) =>
    AC_CATS.filter((c) => c[2] === kind && s.byCat[c[0]])
      .map((c) => [c[1], s.byCat[c[0]]])
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const unsortedIn = s.tx.filter((t) => !t.cat && t.amt > 0).reduce((a, t) => a + t.amt, 0);
  const unsortedOut = s.tx.filter((t) => !t.cat && t.amt < 0).reduce((a, t) => a - t.amt, 0);
  const pl = (rows, sign) =>
    rows
      .map(
        ([n, v]) => `<div class="drow"><span>${esc(n)}</span><span>${gbp(sign * v)}</span></div>`,
      )
      .join("");
  const periods = [
    ["ty", "This tax year"],
    ["lty", "Last tax year"],
    ["12m", "12 months"],
    ["3m", "3 months"],
    ["m", "This month"],
  ];
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <div class="seg ac-per" id="ac-per">${periods.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${(S.f.acp || "ty") === k}">${l}</button>`).join("")}</div>
    <div class="who">${esc(lab)}. From your bank statements; VAT on costs taken out where you've added it.</div>
    <div class="sd-boxes">
      <div class="sd-box ok"><small>Money in</small><b>${gbp(s.inc)}</b><span>sales and other income</span></div>
      <div class="sd-box bad"><small>Money out</small><b>${gbp(s.exp)}</b><span>running the business</span></div>
      <div class="sd-box ${s.profit >= 0 ? "ok" : "bad"}"><small>Profit (before tax)</small><b>${gbp(s.profit)}</b><span>${s.inc ? Math.round((s.profit / s.inc) * 100) + "% of money in" : "–"}</span></div>
      <button type="button" class="sd-box ${s.unsorted ? "warn" : ""}" id="ac-gosort"><small>To sort</small><b>${s.unsorted}</b><span>payments without a category</span></button>
    </div>
    ${
      cfg.accounts.length
        ? `<div class="ac-banks">${cfg.accounts.map((a) => `<div class="ac-bankc"><small>${esc(a.bank || "Bank")}${a.last4 ? " ··" + esc(a.last4) : ""}</small><b>${esc(a.name)}</b><span>${gbp(acBalance(a))}</span></div>`).join("")}</div>`
        : `<div class="notice">Add your bank account and bring in a statement on the <b>Bank</b> tab to see your figures here.</div>`
    }
    <div class="card sd-chart"><div class="cardbody"><b>Money in and out each month</b><div class="sd-key"><i class="ac-ki"></i> In <i class="ac-ko"></i> Out</div>
      <div class="sd-bars ac-bars" style="grid-template-columns:repeat(${months.length},1fr)">${months
        .map(
          (m, i) =>
            `<div class="sd-mon" title="${esc(m)}: in ${gbp(mIn[i])}, out ${gbp(mOut[i])}"><div class="sd-pair"><i class="ac-bi" style="height:${Math.round((mIn[i] / top) * 100)}%"></i><i class="ac-bo" style="height:${Math.round((mOut[i] / top) * 100)}%"></i></div><small>${esc(parse(m + "-01").toLocaleDateString("en-GB", { month: "short" }))}</small></div>`,
        )
        .join("")}</div></div></div>
    <div class="ac-cols">
      <section class="card"><div class="cardbody"><b>Profit and loss</b>
        <div class="flabel">Money in</div>${pl(catRows("in"), 1)}${unsortedIn ? `<div class="drow ac-uns"><span>Not sorted yet</span><span>${gbp(unsortedIn)}</span></div>` : ""}
        <div class="flabel">Costs</div>${pl(catRows("out"), -1)}${unsortedOut ? `<div class="drow ac-uns"><span>Not sorted yet</span><span>${gbp(unsortedOut)}</span></div>` : ""}
        <div class="drow sd-due"><span><b>Profit before tax</b></span><b>${gbp(s.profit)}</b></div>
        ${catRows("move").length ? `<div class="flabel">Not counted in profit</div>${pl(catRows("move"), -1)}` : ""}
      </div></section>
      <div>
        <section class="card"><div class="cardbody"><b>VAT (estimate)</b>
          <div class="drow"><span>VAT on your invoices</span><span>${gbp(s.vatOut)}</span></div>
          <div class="drow"><span>VAT on your costs (where added)</span><span>-${gbp(s.vatIn)}</span></div>
          <div class="drow sd-due"><span><b>${s.vatOut - s.vatIn >= 0 ? "To pay HMRC" : "To claim back"}</b></span><b>${gbp(Math.abs(s.vatOut - s.vatIn))}</b></div>
          <div class="who">A guide only, for the period above. Your VAT return is for your VAT quarter, and needs every receipt's VAT.</div>
        </div></section>
        <section class="card"><div class="cardbody"><b>Owed</b>
          <div class="drow"><span>Customers owe you</span><b>${gbp(owedToYou)}</b></div>
          <div class="drow"><span>You owe trades (invoices not paid)</span><b>${gbp(owedByYou)}</b></div>
        </div></section>
        <section class="card"><div class="cardbody"><b>🔗 Linking to your bank</b>
          <div class="who">A live link to your bank (payments appear by themselves, like Xero) uses Open Banking, which has to run on our own server. That's on Jasper's list. Until then, download a statement as a CSV file from your online banking and bring it in on the Bank tab: it takes a minute and nothing is typed twice.</div>
        </div></section>
        <div class="sd-acts"><button type="button" class="btn" id="ac-export">⬇️ Export for my accountant</button></div>
      </div>
    </div>
  </div>`;
  $("ac-per")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.acp = b.dataset.v;
          render();
        }),
    );
  $("ac-gosort").onclick = () => {
    S.f.act = "bank";
    S.f.acf = "sort";
    render();
  };
  $("ac-export").onclick = async () => {
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const accName = (id) => (cfg.accounts.find((a) => a.id === id) || {}).name || "";
    const lines = [
      ["Date", "Account", "Description", "Amount", "Category", "VAT", "Note", "Matched to"]
        .map(q)
        .join(","),
    ].concat(
      s.tx
        .slice()
        .reverse()
        .map((t) =>
          [
            t.date,
            accName(t.acc),
            t.desc,
            t.amt.toFixed(2),
            acCatName(t.cat),
            t.vat ? (+t.vat).toFixed(2) : "",
            t.note || "",
            t.link ? t.link.label || "" : "",
          ]
            .map(q)
            .join(","),
        ),
    );
    try {
      await S.dl.save({
        filename: `Accounts ${from} to ${to}.csv`,
        data: new Blob([lines.join("\n")], { type: "text/csv" }),
      });
    } catch (e) {
      toast("Couldn't save the file");
    }
  };
}

/* ---------- bank ---------- */
function acBankView(tabs) {
  const cfg = acCfg();
  const acc = cfg.accounts.find((a) => a.id === S.f.aca) || cfg.accounts[0];
  const f = S.f.acf || "all";
  const q = String(S.f.acq || "").toLowerCase();
  const all = acc ? acAllTx(acc.id) : [];
  const list = all
    .filter((t) => f === "all" || (f === "sort" ? !t.cat : f === "in" ? t.amt > 0 : t.amt < 0))
    .filter((t) => !q || (t.desc + " " + (t.note || "")).toLowerCase().includes(q));
  const shown = list.slice(0, S.f.acn || 100);
  const opts = (sel) =>
    `<option value="">To sort…</option>` +
    ["in", "out", "move"]
      .map(
        (k) =>
          `<optgroup label="${k === "in" ? "Money in" : k === "out" ? "Costs" : "Not counted in profit"}">${AC_CATS.filter(
            (c) => c[2] === k,
          )
            .map(
              (c) =>
                `<option value="${c[0]}"${c[0] === sel ? " selected" : ""}>${esc(c[1])}</option>`,
            )
            .join("")}</optgroup>`,
      )
      .join("");
  $("main").innerHTML = `<div class="ac-page">${tabs}
    ${
      cfg.accounts.length
        ? `<div class="seg ac-accs" id="ac-accs">${cfg.accounts.map((a) => `<button type="button" data-v="${esc(a.id)}" aria-pressed="${acc && a.id === acc.id}">${esc(a.name)}</button>`).join("")}</div>`
        : ""
    }
    <div class="sd-acts"><button type="button" class="btn" id="ac-newacc">+ Add a bank account</button>${acc ? `<span class="btn primary sd-filebtn">📥 Bring in a statement (CSV)<input type="file" class="ac-file" accept=".csv,text/csv,.txt" aria-label="Bring in a bank statement"></span><button type="button" class="btn" id="ac-rules">⚙️ Sorting rules (${cfg.rules.length})</button>` : ""}</div>
    ${
      !acc
        ? `<div class="empty"><strong>Add your bank account first</strong>Then download a statement from your online banking (most banks call it "Export" or "Download transactions", as CSV) and bring it in here.</div>`
        : `<div class="who">${esc(acc.name)}: balance ${gbp(acBalance(acc))} · ${all.length} payments · ${all.filter((t) => !t.cat).length} to sort</div>
    <div class="sd-filt"><div class="seg" id="ac-f">${[
      ["all", "All"],
      ["sort", "To sort"],
      ["in", "Money in"],
      ["out", "Money out"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
      )
      .join(
        "",
      )}</div><input id="ac-q" type="search" placeholder="Search payments" value="${esc(S.f.acq || "")}" aria-label="Search payments"></div>
    ${
      shown.length
        ? `<div class="ac-list">${shown
            .map((t) => {
              const ms = !t.link
                ? acSaleMatches(t)
                    .map((d) => ["sale", d.id, `INV-${d.number} ${d.client}`])
                    .concat(
                      acTradeMatches(t).map((v) => [
                        "trade",
                        v.id,
                        `${nameOf(v.who)} invoice ${v.number || ""}`,
                        v.who,
                      ]),
                    )
                : [];
              return `<div class="ac-tx ${t.amt > 0 ? "in" : "out"}${t.cat ? "" : " uns"}" data-k="${esc(t.rec + "|" + t.id)}">
            <div class="ac-txh"><small>${esc(shortDay(t.date))}</small><span class="ac-desc">${esc(t.desc)}</span><b class="ac-amt">${t.amt > 0 ? "+" : "−"}${gbp(Math.abs(t.amt))}</b></div>
            <div class="ac-txr"><select class="ac-cat" aria-label="Category">${opts(t.cat)}</select>${t.vat ? `<span class="who">VAT ${gbp(t.vat)}</span>` : ""}${t.link ? `<span class="tag ok">✓ ${esc(t.link.label || "matched")}</span>` : ""}${t.rcpt ? `<button type="button" class="pillbtn ac-rlink" data-id="${esc(t.rcpt)}">📎 Receipt</button>` : ""}${ms.map((m) => `<button type="button" class="pillbtn ac-match" data-t="${m[0]}" data-id="${esc(m[1])}" data-w="${esc(m[3] || "")}">💡 Pays ${esc(m[2])}?</button>`).join("")}<button type="button" class="iconbtn ac-more" aria-label="More for this payment">⋯</button></div>
          </div>`;
            })
            .join(
              "",
            )}</div>${list.length > shown.length ? `<button type="button" class="btn" id="ac-moretx">Show more (${list.length - shown.length})</button>` : ""}`
        : `<div class="empty"><strong>${all.length ? "Nothing here" : "No payments yet"}</strong>${all.length ? "Try another filter." : "Bring in a statement to see them."}</div>`
    }`
    }
  </div>`;
  if ($("ac-accs"))
    $("ac-accs")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.aca = b.dataset.v;
            render();
          }),
      );
  $("ac-newacc").onclick = () => acEditAccount(null);
  if (!acc) return;
  $("ac-rules").onclick = acRulesSheet;
  $("ac-f")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.acf = b.dataset.v;
          render();
        }),
    );
  $("ac-q").oninput = (e) => {
    S.f.acq = e.target.value;
    clearTimeout(window.__acQ);
    window.__acQ = setTimeout(() => {
      render();
      const el = $("ac-q");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 300);
  };
  if ($("ac-moretx"))
    $("ac-moretx").onclick = () => {
      S.f.acn = (S.f.acn || 100) + 200;
      render();
    };
  const fi = $("main").querySelector(".ac-file");
  fi.onchange = async () => {
    const file = fi.files[0];
    fi.value = "";
    if (file) acImport(acc, file);
  };
  document.querySelectorAll("#main .ac-tx").forEach((row) => {
    const k = row.dataset.k;
    const t = all.find((x) => x.rec + "|" + x.id === k);
    row.querySelector(".ac-cat").onchange = async (e) => {
      try {
        await acUpdateTx({ [k]: { cat: e.target.value } });
        render();
      } catch (er) {
        toast("Couldn't save. Check your connection.");
      }
    };
    row.querySelector(".ac-more").onclick = () => acTxSheet(t);
    const rl = row.querySelector(".ac-rlink");
    if (rl) rl.onclick = () => acRcptSheet(acReceipts().find((r) => r.id === rl.dataset.id));
    row
      .querySelectorAll(".ac-match")
      .forEach((b) => (b.onclick = () => acMatch(t, b.dataset.t, b.dataset.id, b.dataset.w)));
  });
}
function acEditAccount(a0) {
  const a = Object.assign({}, a0 || {});
  openSheet(
    `<h3 id="sheettitle">🏦 ${a0 ? "Bank account" : "Add a bank account"}</h3>
    <div class="grid2"><label for="aa-n">Name<input id="aa-n" maxlength="40" value="${esc(a.name || "")}" placeholder="e.g. Business current account"></label><label for="aa-b">Bank<input id="aa-b" maxlength="40" value="${esc(a.bank || "")}" placeholder="e.g. Lloyds"></label></div>
    <div class="grid2"><label for="aa-l">Last 4 digits of the account<input id="aa-l" maxlength="4" inputmode="numeric" value="${esc(a.last4 || "")}"></label><label for="aa-o">Balance at the start (if statements don't show one) £<input id="aa-o" type="number" inputmode="decimal" step="0.01" value="${esc(a.opening || "")}"></label></div>
    <div class="who">Only these details are kept: no bank passwords or full account numbers.</div>
    ${formFoot(false, "Save")}`,
    async () => {
      const name = $("aa-n").value.trim();
      if (!name) return showErr("Give it a name.");
      const rec = Object.assign({}, a, {
        id: a.id || "ba" + newId(),
        name,
        bank: $("aa-b").value.trim(),
        last4: $("aa-l").value.replace(/\D/g, "").slice(-4),
        opening: sdR2($("aa-o").value),
      });
      const accounts = acCfg()
        .accounts.filter((x) => x.id !== rec.id)
        .concat([rec]);
      try {
        await acSaveCfg({ accounts });
        S.f.aca = rec.id;
        closeForm();
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "aa-n",
  );
}
/* bring in a statement: new payments only (the same date, amount and words already there are skipped); rules sort them */
async function acImport(acc, file) {
  let rows;
  try {
    rows = acParseStatement(await file.text());
  } catch (e) {
    return toast(
      "Couldn't read that file. Download the statement as CSV from your online banking.",
    );
  }
  if (!rows.length) return toast("No payments found in that file");
  const have = new Set(acAllTx(acc.id).map((t) => t.date + "|" + t.amt + "|" + t.desc));
  const fresh = rows.filter((r) => !have.has(r.date + "|" + r.amt + "|" + r.desc));
  const byMonth = {};
  let sorted = 0;
  fresh.forEach((r, i) => {
    const rule = acRuleFor(r.desc);
    const t = Object.assign({ id: Date.now().toString(36) + "-" + i }, r);
    if (rule) {
      t.cat = rule.cat;
      if (rule.vat && t.amt < 0) t.vat = sdR2((Math.abs(t.amt) * +rule.vat) / (100 + +rule.vat));
      sorted++;
    }
    (byMonth[r.date.slice(0, 7)] = byMonth[r.date.slice(0, 7)] || []).push(t);
  });
  try {
    for (const [m, tx] of Object.entries(byMonth)) {
      const id = `atx-${acc.id}-${m}`;
      const old = acMonths().find((x) => x.id === id);
      await S.db.doc("todos/" + id).set({
        kind: "acctx",
        acc: acc.id,
        month: m,
        tx: ((old && old.tx) || []).concat(tx),
        updated: Date.now(),
      });
    }
    const rm = await acMatchWaiting();
    toast(
      (rm ? `${rm} receipt${rm === 1 ? "" : "s"} matched · ` : "") +
        `Brought in ${fresh.length} payment${fresh.length === 1 ? "" : "s"}${rows.length > fresh.length ? ` (${rows.length - fresh.length} already there)` : ""}${sorted ? `, ${sorted} sorted by your rules` : ""}`,
    );
    S.f.acf = fresh.length - sorted ? "sort" : "all";
    render();
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
/* one payment: category, VAT, note, a rule for next time, match to an invoice */
function acTxSheet(t) {
  const word = String(t.desc)
    .split(/ · |\s{2,}/)[0]
    .replace(/[0-9*#/]+.*$/, "")
    .trim()
    .slice(0, 30);
  const opts = AC_CATS.map(
    (c) => `<option value="${c[0]}"${c[0] === t.cat ? " selected" : ""}>${esc(c[1])}</option>`,
  ).join("");
  openSheet(
    `<h3 id="sheettitle">${t.amt > 0 ? "Money in" : "Money out"}: ${gbp(Math.abs(t.amt))}</h3>
    <div class="who">${esc(shortDay(t.date))} · ${esc(t.desc)}</div>
    <label for="at-c">Category<select id="at-c"><option value="">To sort…</option>${opts}</select></label>
    ${t.amt < 0 ? `<div class="grid2"><label for="at-v">VAT in it £ (from the receipt)<input id="at-v" type="number" inputmode="decimal" step="0.01" value="${esc(t.vat || "")}"></label><button type="button" class="btn" id="at-v20">It had 20% VAT</button></div>` : ""}
    <label for="at-n">Note<input id="at-n" maxlength="140" value="${esc(t.note || "")}" placeholder="e.g. Kitchen job, Marine Way"></label>
    <label class="inl"><input type="checkbox" id="at-r"> Always put payments with <input id="at-rw" maxlength="40" value="${esc(word)}" style="width:12em" aria-label="Words to look for"> in this category</label>
    ${formFoot(false, "Save")}`,
    async () => {
      const cat = $("at-c").value;
      const patch = { cat, note: $("at-n").value.trim() };
      if ($("at-v")) patch.vat = sdR2($("at-v").value) || 0;
      try {
        await acUpdateTx({ [t.rec + "|" + t.id]: patch });
        if ($("at-r").checked && cat && $("at-rw").value.trim()) {
          const m = $("at-rw").value.trim();
          const vatPct =
            patch.vat && Math.abs(t.amt) > patch.vat
              ? Math.round((patch.vat / (Math.abs(t.amt) - patch.vat)) * 100)
              : 0;
          await acSaveCfg({
            rules: acCfg()
              .rules.filter((r) => r.m.toLowerCase() !== m.toLowerCase())
              .concat([{ m, cat, vat: vatPct === 20 || vatPct === 5 ? vatPct : 0 }]),
          });
          /* sort the others already in that match */
          const ch = {};
          acAllTx()
            .filter((x) => !x.cat && x.desc.toLowerCase().includes(m.toLowerCase()))
            .forEach(
              (x) =>
                (ch[x.rec + "|" + x.id] = Object.assign(
                  { cat },
                  (vatPct === 20 || vatPct === 5) && x.amt < 0
                    ? { vat: sdR2((Math.abs(x.amt) * vatPct) / (100 + vatPct)) }
                    : {},
                )),
            );
          if (Object.keys(ch).length) await acUpdateTx(ch);
          toast(
            `Rule saved${Object.keys(ch).length ? `, ${Object.keys(ch).length} more sorted` : ""}`,
          );
        }
        closeForm();
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
  );
  if ($("at-v20"))
    $("at-v20").onclick = () => ($("at-v").value = sdR2(Math.abs(t.amt) / 6).toFixed(2));
}
/* match a payment to an invoice: a customer's (records the payment) or a trade's (marks it paid) */
async function acMatch(t, kind, id, who) {
  try {
    if (kind === "sale") {
      const d = sdSales().find((x) => x.id === id);
      if (!d) return;
      await sdSaveRec(
        Object.assign({}, d, {
          payments: (d.payments || []).concat([
            { amt: t.amt, date: t.date, note: "Bank: " + t.desc.slice(0, 60) },
          ]),
        }),
      );
      await acUpdateTx({
        [t.rec + "|" + t.id]: {
          cat: "sales",
          link: { t: "sale", id, label: `INV-${d.number} ${d.client}` },
        },
      });
      toast(`Payment recorded on invoice ${d.number}`);
    } else {
      await S.db
        .doc(`sheets/${who}/invoices/${id}`)
        .update({ status: "paid", paidAt: Date.now(), paidOn: t.date });
      const v = allTeam("invoices").find((x) => x.id === id && x.who === who) || {};
      await acUpdateTx({
        [t.rec + "|" + t.id]: {
          cat: "subs",
          link: { t: "trade", id, who, label: `${nameOf(who)} invoice ${v.number || ""}` },
        },
      });
      toast(`${nameOf(who)}'s invoice marked paid`);
    }
    render();
  } catch (e) {
    toast("Couldn't save. Check your connection.");
  }
}
function acRulesSheet() {
  const rules = acCfg().rules;
  openSheet(
    `<h3 id="sheettitle">⚙️ Sorting rules</h3>
    <div class="who">When a payment's description has these words, it's put in the category by itself (when a statement comes in). Add a rule from any payment's ⋯ button.</div>
    ${rules.length ? rules.map((r, i) => `<div class="drow"><span><b>${esc(r.m)}</b> → ${esc(acCatName(r.cat))}${r.vat ? ` (${r.vat}% VAT)` : ""}</span><button type="button" class="linkdanger ac-rdel" data-i="${i}">Remove</button></div>`).join("") : `<div class="nothing">No rules yet.</div>`}
    ${formFoot(false, "Done")}`,
    async () => closeForm(),
  );
  document.querySelectorAll(".ac-rdel").forEach(
    (b) =>
      (b.onclick = async () => {
        const r = acCfg().rules.slice();
        r.splice(+b.dataset.i, 1);
        await acSaveCfg({ rules: r });
        closeForm();
        acRulesSheet();
      }),
  );
}
