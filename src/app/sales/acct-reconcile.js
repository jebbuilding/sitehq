/* ================= ACCOUNTS RECONCILE: tick off bank lines, check the statement balance, lock months, split, find and match, sort lots at once, learn, transfers ================= */
import { $, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { isInv } from "../purchasing/materials-receipts.js";
import {
  AC_CATS,
  acAllTx,
  acCatKind,
  acCatName,
  acCfg,
  acMonths,
  acSaveCfg,
  acUpdateTx,
} from "./acct-data.js";
import { acReceipts } from "./acct-receipts.js";
import { sdCalc, sdR2, sdSales, sdStatus } from "./sales-calc.js";
export {
  acBulkSheet,
  acCheckSheet,
  acFindSheet,
  acJobGuess,
  acLearner,
  acLockedRec,
  acPicked,
  acSetXfer,
  acSplitSheet,
  acTxCatLabel,
  acUnlockAsk,
  acXferFor,
  acrAccName,
  acrSorted,
};
/* Everything here works on the payments the Bank tab shows (todos/atx-*). New fields on a payment: ok (ticked off
   against the bank statement), split ([{ cat, amt (signed like the payment), vat, note }] – a payment in several
   categories; its own cat is then empty), learned (sorted by what was done before). On a month record: locked
   ({ at, bal }) – a locked month's payments can't be changed or added to until it is unlocked. On a bank account:
   checks ([{ date, bal, at }]) – statement balances that agreed. */

const ACR_STOP = new Set([
  "card",
  "payment",
  "payments",
  "from",
  "ref",
  "the",
  "direct",
  "debit",
  "bank",
  "giro",
  "credit",
  "fpi",
  "fpo",
  "pos",
  "bgc",
  "online",
  "faster",
  "contactless",
  "visa",
  "purchase",
  "debit",
  "mastercard",
  "transaction",
  "and",
  "for",
]);
/* the words that name who a payment is with: "CARD PAYMENT TO SCREWFIX 1234 EXETER" → "screwfix exeter" */
const acrKey = (desc) =>
  String(desc || "")
    .toLowerCase()
    .split(/ · /)[0]
    .replace(/[^a-z ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !ACR_STOP.has(w))
    .slice(0, 2)
    .join(" ");
const acrSorted = (t) => !!(t && (t.cat || (t.split && t.split.length)));
/* what was done with payments like this before: a function giving { cat, n, sure } or null for a payment */
function acLearner() {
  const by = new Map();
  acAllTx().forEach((x) => {
    if (!x.cat || x.cat === "xfer" || x.link) return;
    const k = acrKey(x.desc);
    if (!k) return;
    const key = (x.amt > 0 ? "+" : "-") + k;
    const m = by.get(key) || {};
    m[x.cat] = (m[x.cat] || 0) + 1;
    by.set(key, m);
  });
  return (t) => {
    if (!t || acrSorted(t)) return null;
    const m = by.get((t.amt > 0 ? "+" : "-") + acrKey(t.desc));
    if (!m) return null;
    const e = Object.entries(m).sort((a, b) => b[1] - a[1]);
    const tot = e.reduce((a, x) => a + x[1], 0);
    return { cat: e[0][0], n: e[0][1], sure: e[0][1] >= 2 && e[0][1] === tot };
  };
}
/* the job a payment out was probably for: the job the last payment to the same place (within 30 days) was booked to */
function acJobGuess(t, all) {
  if (!t || t.amt >= 0 || t.site || t.rcpt || t.cat === "wages" || acCatKind(t.cat) === "move")
    return "";
  const k = acrKey(t.desc);
  if (!k) return "";
  const live = new Set((S.sites || []).filter((s) => !s.archived).map((s) => s.name));
  const hit = (all || acAllTx())
    .filter((x) => x.site && x.id !== t.id && acrKey(x.desc) === k && acrDays(x.date, t.date) <= 30)
    .sort((a, b) => acrDays(a.date, t.date) - acrDays(b.date, t.date))[0];
  return hit && live.has(hit.site) ? hit.site : "";
}
/* ---------- transfers between your own accounts ---------- */
const acrDays = (a, b) => Math.abs((parse(a) - parse(b)) / 864e5);
const acrAccName = (id) =>
  (acCfg().accounts.find((a) => a.id === id) || {}).name || "another account";
/* the payment in another of your accounts this one could be the other half of: opposite amount, within 3 days */
function acXferFor(t, all) {
  if (!t || t.link || (t.cat && t.cat !== "xfer") || acCfg().accounts.length < 2) return null;
  return (
    (all || acAllTx()).find(
      (x) =>
        x.acc !== t.acc &&
        !x.link &&
        (!x.cat || x.cat === "xfer") &&
        Math.abs(x.amt + t.amt) < 0.005 &&
        acrDays(x.date, t.date) <= 3,
    ) || null
  );
}
async function acSetXfer(t, x) {
  const lab = (a, b) => (a.amt < 0 ? "To " : "From ") + acrAccName(b.acc);
  await acUpdateTx({
    [t.rec + "|" + t.id]: {
      cat: "xfer",
      split: null,
      link: { t: "xfer", rec: x.rec, id: x.id, label: lab(t, x) },
    },
    [x.rec + "|" + x.id]: {
      cat: "xfer",
      split: null,
      link: { t: "xfer", rec: t.rec, id: t.id, label: lab(x, t) },
    },
  });
}
/* ---------- locked months ---------- */
const acLockedRec = (rec) => !!((acMonths().find((m) => m.id === rec) || {}).locked || null);
const acrMonthName = (m) =>
  parse(m + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
async function acSetLock(recs, on) {
  for (const rec of recs) {
    const m = acMonths().find((x) => x.id === rec);
    if (!m) continue;
    const d = Object.assign({}, m, { locked: on ? { at: Date.now() } : null, updated: Date.now() });
    delete d.id;
    await S.db.doc("todos/" + rec).set(d);
    m.locked = d.locked;
  }
}
/* ---------- balances ---------- */
/* the balance at the end of a day from the statement's own running balances (rows of one day, any order) */
function acrDayEnd(rows) {
  const sum = rows.reduce((a, t) => a + t.amt, 0);
  for (const r of rows) {
    const end = sdR2(r.bal - r.amt + sum);
    if (rows.some((x) => Math.abs(x.bal - end) < 0.005)) return end;
  }
  return rows[0].bal;
}
/* what SiteHQ makes the balance at the end of a day */
function acBalanceAt(a, date) {
  const tx = acAllTx(a.id);
  const withBal = tx.filter((t) => t.bal != null && t.date <= date);
  if (withBal.length) {
    const day = withBal[0].date;
    const end = acrDayEnd(withBal.filter((t) => t.date === day));
    return sdR2(
      end + tx.filter((t) => t.date > day && t.date <= date).reduce((x, t) => x + t.amt, 0),
    );
  }
  return sdR2(
    (+a.opening || 0) +
      tx
        .filter((t) => (!a.openingDate || t.date >= a.openingDate) && t.date <= date)
        .reduce((x, t) => x + t.amt, 0),
  );
}
const acrMonthEnd = (m) => {
  const d = parse(m + "-01");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return iso(d);
};
/* check the balance on a paper or PDF statement; if it agrees, tick off and lock up to that day */
function acCheckSheet(acc, done) {
  const tx = acAllTx(acc.id);
  const last = tx.length ? tx[0].date : iso(new Date());
  const lastCheck = (acc.checks || []).slice(-1)[0];
  openSheet(
    `<h3 id="sheettitle">⚖️ Check against your statement</h3>
    <div class="who">Pick a day your bank statement shows a balance for (usually its last day) and type that balance in. SiteHQ works out its own balance for that day from the payments brought in.${lastCheck ? ` Last agreed: ${esc(shortDay(lastCheck.date))}, ${gbp(lastCheck.bal)}.` : ""}</div>
    <div class="grid2"><label for="acr-d">Statement date<input id="acr-d" type="date" value="${esc(last)}"></label><label for="acr-b">Balance on the statement £<input id="acr-b" type="number" inputmode="decimal" step="0.01" placeholder="e.g. 4210.55"></label></div>
    <div class="acr-res" id="acr-res" aria-live="polite"></div>
    <label class="inl"><input type="checkbox" id="acr-lock" checked> If it agrees, tick off every payment up to that day and lock the months that are finished</label>
    ${formFoot(false, "Check")}`,
    async () => {
      const date = $("acr-d").value;
      const bal = sdR2($("acr-b").value);
      if (!date || $("acr-b").value === "")
        return showErr("Type the date and the balance on the statement.");
      const ours = acBalanceAt(acc, date);
      const diff = sdR2(bal - ours);
      if (Math.abs(diff) >= 0.005)
        return showErr(
          `Out by ${gbp(Math.abs(diff))}: the statement has ${diff > 0 ? "more" : "less"} than SiteHQ. Look for a payment missing or brought in twice, or a statement not brought in yet.`,
        );
      try {
        const checks = (acc.checks || [])
          .filter((c) => c.date !== date)
          .concat([{ date, bal, at: Date.now() }]);
        await acSaveCfg({
          accounts: acCfg().accounts.map((a) =>
            a.id === acc.id ? Object.assign({}, a, { checks }) : a,
          ),
        });
        let ticked = 0,
          locked = [];
        if ($("acr-lock").checked) {
          const ch = {};
          tx.filter((t) => t.date <= date && !t.ok && !acLockedRec(t.rec)).forEach((t) => {
            ch[t.rec + "|" + t.id] = { ok: true };
            ticked++;
          });
          if (ticked) await acUpdateTx(ch);
          locked = acMonths()
            .filter((m) => m.acc === acc.id && !m.locked && acrMonthEnd(m.month) <= date)
            .map((m) => m.id);
          await acSetLock(locked, true);
        }
        closeForm();
        toast(
          `✓ Agrees with the statement: ${gbp(bal)} on ${shortDay(date)}` +
            (ticked ? ` · ${ticked} ticked off` : "") +
            (locked.length
              ? ` · ${locked.length} month${locked.length === 1 ? "" : "s"} locked`
              : ""),
        );
        if (done) done();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "acr-b",
  );
  const show = () => {
    if ($("f-err")) $("f-err").hidden = true;
    const date = $("acr-d").value;
    const v = $("acr-b").value;
    if (!date) return ($("acr-res").innerHTML = "");
    const ours = acBalanceAt(acc, date);
    const diff = v === "" ? null : sdR2(+v - ours);
    $("acr-res").innerHTML =
      `<div class="drow"><span>SiteHQ's balance on ${esc(shortDay(date))}</span><b>${gbp(ours)}</b></div>` +
      (diff == null
        ? ""
        : Math.abs(diff) < 0.005
          ? `<div class="acr-ok">✓ Agrees with your statement</div>`
          : `<div class="acr-bad">Out by ${gbp(Math.abs(diff))}</div>`);
  };
  $("acr-d").oninput = show;
  $("acr-b").oninput = show;
  show();
}
/* unlock a month (after a yes) */
function acUnlockAsk(rec, done) {
  const m = acMonths().find((x) => x.id === rec);
  if (!m) return;
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = `<div class="dimbox"><b>🔓 Unlock ${esc(acrMonthName(m.month))}?</b><div class="who">It was locked because it agreed with your bank statement. Unlock it only to put a mistake right, then check it against the statement again.</div><div class="dimbtns"><button type="button" class="btn sax">Cancel</button><button type="button" class="btn danger sago">Unlock</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector(".sax").onclick = () => d.remove();
  d.querySelector(".sago").onclick = async () => {
    d.remove();
    try {
      await acSetLock([rec], false);
      toast(`${acrMonthName(m.month)} unlocked`);
      if (done) done();
    } catch (e) {
      toast("Couldn't save. Check your connection.");
    }
  };
}
/* ---------- split a payment into several categories ---------- */
function acSplitSheet(t, done) {
  const sign = t.amt < 0 ? -1 : 1;
  const total = Math.abs(t.amt);
  let parts = (
    t.split && t.split.length
      ? t.split
      : [
          { cat: t.cat || "", amt: t.amt, vat: t.vat || 0 },
          { cat: "", amt: 0 },
        ]
  ).map((p) => ({
    cat: p.cat || "",
    amt: Math.abs(+p.amt || 0),
    vat: +p.vat || 0,
    note: p.note || "",
  }));
  const cats = (sel) =>
    `<option value="">Category…</option>` +
    AC_CATS.filter((c) => c[0] !== "xfer")
      .map((c) => `<option value="${c[0]}"${c[0] === sel ? " selected" : ""}>${esc(c[1])}</option>`)
      .join("");
  const rowsHtml = () =>
    parts
      .map(
        (p, i) =>
          `<div class="acr-sp" data-i="${i}"><select class="acr-spc" aria-label="Category of part ${i + 1}">${cats(p.cat)}</select><input class="acr-spa" type="number" inputmode="decimal" step="0.01" value="${p.amt ? p.amt.toFixed(2) : ""}" placeholder="£" aria-label="Amount of part ${i + 1}">${sign < 0 ? `<input class="acr-spv" type="number" inputmode="decimal" step="0.01" value="${p.vat ? (+p.vat).toFixed(2) : ""}" placeholder="VAT £" aria-label="VAT in part ${i + 1}">` : ""}<button type="button" class="iconbtn acr-spx" aria-label="Remove part ${i + 1}">✕</button></div>`,
      )
      .join("");
  openSheet(
    `<h3 id="sheettitle">✂️ Split ${t.amt > 0 ? "money in" : "a payment"}: ${gbp(total)}</h3>
    <div class="who">${esc(shortDay(t.date))} · ${esc(t.desc)}. Put each part in its own category, e.g. a merchant bill that was part materials, part tool hire.</div>
    <div id="acr-sps"></div>
    <div class="sd-acts"><button type="button" class="btn" id="acr-spadd">+ Another part</button></div>
    <div class="acr-res" id="acr-left" aria-live="polite"></div>
    ${t.split && t.split.length ? `<button type="button" class="linkdanger" id="acr-spoff">Don't split it (back to one category)</button>` : ""}
    ${formFoot(false, "Save split")}`,
    async () => {
      read();
      const use = parts.filter((p) => p.amt);
      if (use.length < 2) return showErr("A split needs at least two parts with an amount.");
      if (use.some((p) => !p.cat)) return showErr("Pick a category for each part.");
      const sum = sdR2(use.reduce((a, p) => a + p.amt, 0));
      if (Math.abs(sum - total) >= 0.005)
        return showErr(`The parts come to ${gbp(sum)}; they need to add up to ${gbp(total)}.`);
      const split = use.map((p) => {
        const o = { cat: p.cat, amt: sdR2(sign * p.amt) };
        if (sign < 0 && p.vat) o.vat = sdR2(p.vat);
        return o;
      });
      try {
        await acUpdateTx({
          [t.rec + "|" + t.id]: {
            cat: "",
            split,
            vat: sdR2(split.reduce((a, p) => a + (+p.vat || 0), 0)) || 0,
          },
        });
        closeForm();
        toast(`Split into ${split.length} parts`);
        if (done) done();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
  );
  const read = () =>
    document.querySelectorAll("#acr-sps .acr-sp").forEach((r) => {
      const p = parts[+r.dataset.i];
      p.cat = r.querySelector(".acr-spc").value;
      p.amt = Math.abs(+r.querySelector(".acr-spa").value || 0);
      const v = r.querySelector(".acr-spv");
      if (v) p.vat = Math.abs(+v.value || 0);
    });
  const left = () => {
    const sum = parts.reduce((a, p) => a + (p.amt || 0), 0);
    const l = sdR2(total - sum);
    $("acr-left").innerHTML =
      Math.abs(l) < 0.005
        ? `<div class="acr-ok">✓ The parts add up to ${gbp(total)}</div>`
        : `<div class="acr-bad">${l > 0 ? `${gbp(l)} still to put in a part` : `${gbp(-l)} too much`}</div>`;
  };
  const draw = () => {
    $("acr-sps").innerHTML = rowsHtml();
    document.querySelectorAll("#acr-sps .acr-sp").forEach((r) => {
      r.querySelectorAll("input,select").forEach(
        (el) => (el.oninput = el.onchange = () => (read(), left())),
      );
      r.querySelector(".acr-spx").onclick = () => {
        read();
        parts.splice(+r.dataset.i, 1);
        if (!parts.length) parts.push({ cat: "", amt: 0 });
        draw();
      };
    });
    left();
  };
  $("acr-spadd").onclick = () => {
    read();
    const sum = parts.reduce((a, p) => a + (p.amt || 0), 0);
    parts.push({ cat: "", amt: Math.max(0, sdR2(total - sum)) });
    draw();
  };
  if ($("acr-spoff"))
    $("acr-spoff").onclick = async () => {
      const big = t.split.slice().sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt))[0];
      try {
        await acUpdateTx({ [t.rec + "|" + t.id]: { cat: big.cat, split: null } });
        closeForm();
        toast("Back to one category");
        if (done) done();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    };
  draw();
}
/* how a payment's category reads: its category, or the split parts */
const acTxCatLabel = (t) =>
  t.split && t.split.length
    ? "Split: " + t.split.map((p) => `${acCatName(p.cat)} ${gbp(Math.abs(p.amt))}`).join(", ")
    : t.cat
      ? acCatName(t.cat)
      : "Not sorted";
/* ---------- find and match: any open invoice, trade invoice or receipt, not only the same amount ---------- */
function acFindSheet(t, onMatch) {
  const inn = t.amt > 0;
  const items = () => {
    const out = [];
    if (inn)
      sdSales()
        .filter(
          (d) => d.type === "invoice" && ["awaiting", "part", "overdue"].includes(sdStatus(d)),
        )
        .forEach((d) =>
          out.push({
            k: "sale",
            id: d.id,
            title: `INV-${d.number} · ${d.client || ""}`,
            sub: `${shortDay(d.date)} · still owed ${gbp(sdCalc(d).balance)}`,
            amt: sdCalc(d).balance,
            words: `inv-${d.number} ${d.number} ${d.client || ""} ${d.site || ""}`,
          }),
        );
    else {
      allTeam("invoices")
        .filter(isInv)
        .filter((v) => (v.status || "sent") !== "paid")
        .forEach((v) =>
          out.push({
            k: "trade",
            id: v.id,
            who: v.who,
            title: `${nameOf(v.who)} · invoice ${v.number || ""}`,
            sub: `${v.date ? shortDay(v.date) + " · " : ""}${gbp(+v.amount || 0)}`,
            amt: +v.amount || 0,
            words: `${nameOf(v.who)} ${v.number || ""} ${v.site || ""}`,
          }),
        );
      acReceipts()
        .filter((r) => !r.tx && r.status === "done" && r.paid !== "cash" && r.paid !== "own")
        .forEach((r) =>
          out.push({
            k: "rcpt",
            id: r.id,
            title: `🧾 ${r.supplier || "Receipt"}${r.ref ? " · " + r.ref : ""}`,
            sub: `${r.date ? shortDay(r.date) + " · " : ""}${gbp(+r.total || 0)}`,
            amt: +r.total || 0,
            words: `${r.supplier || ""} ${r.ref || ""} ${r.desc || ""}`,
          }),
        );
    }
    return out;
  };
  const all = items();
  const want = Math.abs(t.amt);
  openSheet(
    `<h3 id="sheettitle">🔎 Find and match</h3>
    <div class="who">${inn ? "Money in" : "Money out"} ${gbp(want)} · ${esc(shortDay(t.date))} · ${esc(t.desc)}</div>
    <input id="acr-fq" type="search" placeholder="Search by name, number or amount" aria-label="Search">
    <div class="acr-found" id="acr-fl"></div>
    ${formFoot(false, "Close")}`,
    async () => closeForm(),
    "acr-fq",
  );
  const show = () => {
    const q = $("acr-fq").value.trim().toLowerCase();
    const n = q.replace(/[£,]/g, "");
    const list = all
      .filter(
        (x) =>
          !q ||
          x.words.toLowerCase().includes(q) ||
          x.title.toLowerCase().includes(q) ||
          (!isNaN(+n) && n !== "" && Math.abs(x.amt - +n) < 0.5),
      )
      .sort((a, b) => Math.abs(a.amt - want) - Math.abs(b.amt - want))
      .slice(0, 30);
    $("acr-fl").innerHTML = list.length
      ? list
          .map(
            (x, i) =>
              `<button type="button" class="acr-fi" data-i="${all.indexOf(x)}"><span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span>${Math.abs(x.amt - want) < 0.015 ? `<span class="tag ok">Same amount</span>` : `<span class="who">${x.amt > want ? "part payment" : "more than owed"}</span>`}</button>`,
          )
          .join("")
      : `<div class="nothing">${all.length ? "Nothing matches that." : inn ? "No invoices waiting to be paid." : "No unpaid trade invoices or receipts waiting for a payment."}</div>`;
    document.querySelectorAll("#acr-fl .acr-fi").forEach(
      (b) =>
        (b.onclick = () => {
          const x = all[+b.dataset.i];
          closeForm();
          onMatch(x);
        }),
    );
  };
  $("acr-fq").oninput = show;
  show();
}
/* ---------- sort lots at once ---------- */
const acPicked = new Set();
function acBulkSheet(all, done) {
  const keys = [...acPicked].filter((k) => all.some((t) => t.rec + "|" + t.id === k));
  const opts = AC_CATS.map((c) => `<option value="${c[0]}">${esc(c[1])}</option>`).join("");
  const anyLocked = keys.some((k) => acLockedRec(k.split("|")[0]));
  openSheet(
    `<h3 id="sheettitle">☑ ${keys.length} payment${keys.length === 1 ? "" : "s"} chosen</h3>
    <label for="acr-bc">Put them all in<select id="acr-bc"><option value="">(leave the category)</option>${opts}</select></label>
    <label class="inl"><input type="checkbox" id="acr-bok"> Tick them off (they match the statement)</label>
    ${anyLocked ? `<div class="who">🔒 Some are in a locked month; those are left as they are.</div>` : ""}
    ${formFoot(false, "Do it")}`,
    async () => {
      const cat = $("acr-bc").value;
      const ok = $("acr-bok").checked;
      if (!cat && !ok) return showErr("Pick a category or tick them off.");
      const ch = {};
      keys
        .filter((k) => !acLockedRec(k.split("|")[0]))
        .forEach((k) => {
          const p = {};
          if (cat) Object.assign(p, { cat, split: null });
          if (ok) p.ok = true;
          ch[k] = p;
        });
      try {
        await acUpdateTx(ch);
        acPicked.clear();
        closeForm();
        toast(`${Object.keys(ch).length} payment${Object.keys(ch).length === 1 ? "" : "s"} done`);
        if (done) done();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "acr-bc",
  );
}
