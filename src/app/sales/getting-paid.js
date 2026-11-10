/* ================= GETTING PAID: a chase plan for overdue invoices, one statement per client, and retention to collect ================= */
import { $, esc, gbp, iso, parse, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { ukDate } from "../safety/rams-maker.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { adOver, adOwedIn } from "./acct-due.js";
import { lhLogoId, lhPics, lhPutBot, lhPutTop } from "./letterhead-setup.js";
import { sdCalc, sdCounts, sdDueDate, sdNo, sdSales, sdSaveRec, sdSet } from "./sales-calc.js";
import { sdShareMail } from "./sales-email.js";
import { sdImgData } from "./sales-pdf.js";
export { gpToChase, gpView };
/* Accounts › 📨 Getting paid. Chase plan: each overdue invoice gets a friendly reminder, then a firmer one, then a
   final one (by default 1, 14 and 30 days overdue) – the ones due today are listed with the email ready, and each
   one sent is noted on the invoice so the next step comes round on its own. Statements: every client with
   invoices, what they owe and how much is overdue; one tap makes a statement PDF on the letterhead (every invoice
   and payment, the balance) to save or email. Retention: invoices where the client is holding money back, when it is
   due to be released (12 months after the invoice unless changed), with an email to ask for it and a tick when it's
   received. Stored on the invoice record: chases [{ at, step }], retDue, retPaid { date, amt }. */
const GP_STEPS = [
  [
    1,
    "Friendly reminder",
    "Just a friendly reminder that invoice {ref} for {amt} was due on {due}. If you've already paid, thank you and please ignore this.",
  ],
  [
    14,
    "Second reminder",
    "Invoice {ref} for {amt} is now {over} days overdue (it was due on {due}). Could you let me know when it will be paid?",
  ],
  [
    30,
    "Final reminder",
    "Invoice {ref} for {amt} is now {over} days overdue. Please pay it within 7 days, or call me to talk about it, so I don't have to take it further.",
  ],
];
const gpFill = (t, x) =>
  t
    .replace(/\{ref\}/g, x.ref)
    .replace(/\{amt\}/g, gbp(x.amt))
    .replace(/\{due\}/g, shortDay(x.due))
    .replace(/\{over\}/g, String(x.over));
const gpEmail = (d) =>
  d.email || ((S.clients || []).find((c) => c.id === d.clientId) || {}).email || "";
/* the overdue invoices whose next chase is due */
function gpToChase() {
  return adOwedIn()
    .filter((x) => x.over > 0)
    .map((x) => {
      const n = (x.d.chases || []).length;
      const st = GP_STEPS[Math.min(n, GP_STEPS.length - 1)];
      const last = (x.d.chases || [])[n - 1];
      /* after the last step, every 14 days */
      /* a step is due once the invoice is that many days overdue and at least a week after the last one */
      const gap = !last || Date.now() - last.at >= 7 * 864e5;
      const due =
        n < GP_STEPS.length ? x.over >= st[0] && gap : last && Date.now() - last.at > 14 * 864e5;
      return Object.assign({}, x, { n, st, due });
    });
}
function gpRetention() {
  return sdSales()
    .filter((d) => sdCounts(d) && sdCalc(d).ret > 0)
    .map((d) => {
      const due =
        d.retDue || iso(new Date(parse(d.date).setFullYear(parse(d.date).getFullYear() + 1)));
      return { d, amt: sdCalc(d).ret, due, paid: d.retPaid || null };
    })
    .sort((a, b) => (a.paid ? 1 : 0) - (b.paid ? 1 : 0) || a.due.localeCompare(b.due));
}
/* clients with invoices: what they owe */
function gpClients() {
  const by = {};
  sdSales()
    .filter((d) => sdCounts(d))
    .forEach((d) => {
      const k = d.clientId || "n:" + (d.client || "").trim().toLowerCase();
      const c = sdCalc(d);
      const o = (by[k] = by[k] || { k, name: d.client || "Client", list: [], owed: 0, over: 0 });
      o.list.push(d);
      o.owed += c.balance;
      if (c.balance > 0.005 && adOver(sdDueDate(d)) > 0) o.over += c.balance;
    });
  return Object.values(by).sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
}
function gpView(tabs) {
  const ch = gpToChase();
  const today = ch.filter((x) => x.due);
  const rest = ch.filter((x) => !x.due);
  const ret = gpRetention();
  const cls = gpClients();
  const row = (x) => {
    const em = gpEmail(x.d);
    const body = `Dear ${x.who},\n\n${gpFill(x.st[2], x)}\n\nMany thanks,\n${coData().owner || ""}\n${coData().name || ""}`;
    return `<div class="ad-row"><span class="ad-main"><b>${esc(x.who || "Client")}</b> <span class="who">${esc(x.ref)} · ${x.over} days overdue</span><br><span class="who">${x.n ? `Sent: ${(x.d.chases || []).map((c, i) => esc((GP_STEPS[i] || GP_STEPS[GP_STEPS.length - 1])[1].toLowerCase()) + " " + esc(shortDay(iso(new Date(c.at))))).join(", ")}` : "Not chased yet"}${x.due ? "" : ` · next: ${esc(x.st[1].toLowerCase())} at ${x.st[0]} days`}</span></span><b class="ad-amt">${gbp(x.amt)}</b><span class="ad-acts">${x.due ? (em ? `<button type="button" class="btn primary gp-send" data-r="${esc(x.d.id)}" data-href="mailto:${esc(em)}?subject=${encodeURIComponent(`Invoice ${x.ref} – ${x.st[1].toLowerCase()}`)}&body=${encodeURIComponent(body)}">✉ Send ${esc(x.st[1].toLowerCase())}</button>` : `<button type="button" class="btn gp-mark" data-r="${esc(x.d.id)}">Chased by phone</button><span class="who">No email for them</span>`) : ""}</span></div>`;
  };
  $("main").innerHTML = `<div class="ac-page">${tabs}
    <section class="card"><div class="cardbody"><b>📨 Chase today (${today.length})</b>
      <div class="who">Overdue invoices whose next reminder is due: a friendly one at 1 day overdue, a second at 14 and a final one at 30. Each one sent is noted, so the next comes round by itself.</div>
      ${today.map(row).join("") || `<div class="nothing">Nothing to chase today.</div>`}
      ${rest.length ? `<details><summary>Overdue, chased and waiting (${rest.length})</summary>${rest.map(row).join("")}</details>` : ""}
    </div></section>
    <section class="card"><div class="cardbody"><b>📄 Statements</b>
      <div class="who">Every client you've invoiced, what they owe and how much is overdue. A statement lists every invoice and payment and the balance.</div>
      ${
        cls
          .map(
            (c, i) =>
              `<div class="ad-row"><span class="ad-main"><b>${esc(c.name)}</b> <span class="who">${c.list.length} invoice${c.list.length === 1 ? "" : "s"}</span>${c.over > 0.005 ? `<br><span class="tag bad">${gbp(c.over)} overdue</span>` : ""}</span><b class="ad-amt">${gbp(c.owed)}</b><span class="ad-acts"><button type="button" class="btn gp-st" data-i="${i}">📄 Statement</button></span></div>`,
          )
          .join("") || `<div class="nothing">No invoices yet.</div>`
      }
    </div></section>
    <section class="card"><div class="cardbody"><b>🔒 Retention held back</b>
      <div class="who">Money clients are holding until the defects period ends. Ask for it when it's due, and tick it off when it comes in.</div>
      ${
        ret
          .map((r) => {
            const over = !r.paid && r.due <= iso(new Date());
            const em = gpEmail(r.d);
            const body = `Dear ${r.d.client || ""},\n\nThe retention of ${gbp(r.amt)} held on invoice ${sdNo(r.d)} was due to be released on ${shortDay(r.due)}. Could you arrange payment, or let me know if there's anything still to put right?\n\nMany thanks,\n${coData().owner || ""}\n${coData().name || ""}`;
            return `<div class="ad-row"><span class="ad-main"><b>${esc(r.d.client || "Client")}</b> <span class="who">${esc(sdNo(r.d))}${r.d.site ? " · " + esc(r.d.site) : ""}</span><br>${r.paid ? `<span class="tag ok">Received ${esc(shortDay(r.paid.date))}</span>` : over ? `<span class="tag bad">Due ${esc(shortDay(r.due))} – ask for it</span>` : `<span class="who">Due to be released ${esc(shortDay(r.due))}</span>`}</span><b class="ad-amt">${gbp(r.amt)}</b><span class="ad-acts">${!r.paid && over && em ? `<a class="btn primary" href="mailto:${esc(em)}?subject=${encodeURIComponent("Retention on invoice " + sdNo(r.d))}&body=${encodeURIComponent(body)}">✉ Ask for it</a>` : ""}${!r.paid ? `<button type="button" class="btn gp-retok" data-r="${esc(r.d.id)}">✓ Received</button><button type="button" class="btn gp-retdate" data-r="${esc(r.d.id)}">Change date</button>` : ""}</span></div>`;
          })
          .join("") ||
        `<div class="nothing">No retention held. Add a retention % on an invoice when the client holds some back.</div>`
      }
    </div></section></div>`;
  const inv = (id) => sdSales().find((d) => d.id === id);
  const noteChase = async (id) => {
    const d = inv(id);
    if (!d) return;
    const chases = (d.chases || []).concat([{ at: Date.now(), step: (d.chases || []).length }]);
    try {
      await sdSaveRec(Object.assign({}, d, { chases, chasedAt: Date.now() }));
    } catch (e) {}
    setTimeout(render, 300);
  };
  document.querySelectorAll(".gp-send").forEach(
    (b) =>
      (b.onclick = async () => {
        /* note it first, then open the email (opening it can take the page away) */
        await noteChase(b.dataset.r);
        const a = document.createElement("a");
        a.href = b.dataset.href;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }),
  );
  document.querySelectorAll(".gp-mark").forEach((b) => (b.onclick = () => noteChase(b.dataset.r)));
  document
    .querySelectorAll(".gp-st")
    .forEach((b) => (b.onclick = () => gpStatement(cls[+b.dataset.i])));
  document.querySelectorAll(".gp-retok").forEach(
    (b) =>
      (b.onclick = async () => {
        const d = inv(b.dataset.r);
        if (!d) return;
        try {
          await sdSaveRec(
            Object.assign({}, d, { retPaid: { date: iso(new Date()), amt: sdCalc(d).ret } }),
          );
          toast("Retention received");
          render();
        } catch (e) {
          toast("Couldn't save");
        }
      }),
  );
  document.querySelectorAll(".gp-retdate").forEach(
    (b) =>
      (b.onclick = () => {
        const d = inv(b.dataset.r);
        if (!d) return;
        const r = gpRetention().find((x) => x.d.id === d.id);
        openSheet(
          `<h3 id="sheettitle">When is the retention due?</h3><label for="gp-rd">Due to be released<input id="gp-rd" type="date" value="${esc(r ? r.due : "")}"></label><div class="who">Usually the end of the defects period, often 6 or 12 months after the job is finished.</div>${formFoot(false, "Save")}`,
          async () => {
            try {
              await sdSaveRec(Object.assign({}, d, { retDue: $("gp-rd").value }));
              closeForm();
              render();
            } catch (e) {
              showErr("Couldn't save");
            }
          },
          "gp-rd",
        );
      }),
  );
}
/* a statement for one client: every invoice and payment, and the balance */
async function gpStatementPdf(c) {
  await loadJsPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const brand = BRGB(),
    co = coData();
  const M = 20,
    R = 190;
  const pics = await lhPics();
  const logo = pics ? null : await sdImgData(lhLogoId());
  const bottom = pics && pics.bot ? pics.bot.y - 8 : 282;
  let y = 0;
  const head = () => {
    y = 48;
    if (pics) {
      y = Math.max(lhPutTop(doc, pics, 44), 30) + 10;
      lhPutBot(doc, pics);
    } else if (logo) {
      const k = Math.min(60 / logo.w, 26 / logo.h);
      doc.addImage(logo.u, logo.f, 16, 8, logo.w * k, logo.h * k, "gplogo", "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...brand);
      doc.text(co.name, M, 20);
    }
  };
  head();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("Statement", M, y);
  doc.setFontSize(10.5);
  doc.text(c.name, R, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(110, 110, 110);
  doc.text("As at " + ukDate(iso(new Date())), M, y);
  y += 9;
  const cols = [M, M + 24, M + 52, R - 66, R - 33, R];
  const line = (cells, bold, col) => {
    if (y > bottom) {
      doc.addPage();
      head();
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...(col || [30, 30, 30]));
    cells.forEach((t, i) => doc.text(String(t), cols[i], y, { align: i >= 3 ? "right" : "left" }));
    y += 5.5;
  };
  line(["Date", "Ref", "What", "Amount", "Paid", "Balance"], true);
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y - 3.5, R, y - 3.5);
  let tot = 0,
    over = 0;
  c.list
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((d) => {
      const k = sdCalc(d);
      const late = k.balance > 0.005 && adOver(sdDueDate(d)) > 0;
      tot += k.balance;
      if (late) over += k.balance;
      line(
        [
          ukDate(d.date),
          sdNo(d),
          String(d.title || ((d.lines || [])[0] || {}).d || d.site || "Invoice").slice(0, 34),
          gbp(k.due),
          gbp(k.paid),
          gbp(k.balance),
        ],
        false,
        late ? [170, 40, 40] : null,
      );
      (d.payments || []).forEach((p) =>
        line(
          [
            "",
            "",
            `   paid ${ukDate(p.date)}${p.note ? " – " + p.note : ""}`.slice(0, 40),
            "",
            gbp(+p.amt || 0),
            "",
          ],
          false,
          [110, 110, 110],
        ),
      );
    });
  y += 2;
  doc.line(M, y - 3.5, R, y - 3.5);
  line(["", "", "Balance owed", "", "", gbp(tot)], true);
  if (over > 0.005) line(["", "", "of which overdue", "", "", gbp(over)], true, [170, 40, 40]);
  y += 4;
  const sd = sdSet();
  if (sd.bank) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Payment details", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    String(sd.bank)
      .split("\n")
      .forEach((t) => {
        doc.text(t, M, y);
        y += 4.6;
      });
  }
  return doc.output("blob");
}
async function gpStatement(c) {
  if (!c) return;
  try {
    const blob = await gpStatementPdf(c);
    const filename = `Statement – ${c.name.replace(/[\\/:*?"<>|]+/g, " ")} – ${iso(new Date())}.pdf`;
    const d0 = c.list[0] || {};
    const em = gpEmail(d0);
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<div class="dimbox" role="dialog" aria-label="Statement"><b>📄 Statement for ${esc(c.name)}</b><div class="who">Balance ${gbp(c.owed)}${c.over > 0.005 ? `, ${gbp(c.over)} overdue` : ""}.</div><div class="dimbtns"><button type="button" class="btn gp-save">Save / print</button><button type="button" class="btn primary gp-mail">✉ Email it</button></div></div>`;
    document.body.appendChild(d);
    d.onclick = (e) => {
      if (e.target === d) d.remove();
    };
    d.querySelector(".gp-save").onclick = async () => {
      d.remove();
      await S.dl.save({ filename, data: blob });
    };
    d.querySelector(".gp-mail").onclick = async () => {
      d.remove();
      await sdShareMail({
        blob,
        filename,
        to: em,
        subject: `Statement of account – ${coData().name}`,
        body: `Dear ${c.name},\n\nPlease find attached your statement. The balance is ${gbp(c.owed)}${c.over > 0.005 ? `, of which ${gbp(c.over)} is overdue` : ""}.\n\nMany thanks,\n${coData().owner || ""}\n${coData().name}`,
      });
    };
  } catch (e) {
    toast("Couldn't make the statement – check your connection");
  }
}
