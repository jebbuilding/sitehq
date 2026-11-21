/* ================= CLIENT MONEY: every estimate, variation and invoice for a client, on their page, job by job ================= */
import { clientSites } from "./address-book.js";
import { $, esc, gbp, shortDay } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { sdCalc, sdIsPf, sdNo, sdR2, sdSales, sdStatus, sdTag } from "../sales/sales-calc.js";
import { sdEdit } from "../sales/sales-edit.js";
import { vrTot } from "../sales/variations.js";
import { siteLabel } from "../sites/job-details.js";
import { same } from "../sites/project-pages.js";
export { cmyHtml, cmyWire };
/* James (Nov 2026): "in a client tab/page it needs to record all the estimates and invoices in the same way that its
   stored elsewhere in the app so I can see everything about that job in one place". On the client's page: 💰 Estimates
   & invoices – what's agreed (accepted estimates and signed variations), invoiced, paid and still owed, then each job
   with its estimates, variations and invoices (number, date, what it's for, status, amount, and what's left to pay on
   an invoice), the same records as Estimates & invoices – tap one to open it. + New estimate / + New invoice start one
   already filled in with the client. A document belongs to the client by its client, or by one of the client's sites. */
function cmyDocs(c) {
  const sites = clientSites(c);
  const mine = (d) => d.clientId === c.id || (d.site && sites.some((s) => same(s, d.site)));
  const docs = sdSales()
    .filter((d) => mine(d) && !d.af && sdStatus(d) !== "converted")
    .sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (+b.number || 0) - (+a.number || 0),
    );
  const vars = (S.variations || []).filter((v) => v.site && sites.some((s) => same(s, v.site)));
  return { sites, docs, vars };
}
function cmySums(docs, vars) {
  let agreed = 0,
    invoiced = 0,
    paid = 0,
    owed = 0;
  docs.forEach((d) => {
    const k = sdCalc(d),
      st = sdStatus(d);
    if (d.type === "estimate" && (st === "accepted" || st === "invoiced"))
      agreed += k.gross || k.net;
    if (d.type === "invoice" && st !== "draft") {
      invoiced += k.due;
      paid += k.paid;
      owed += Math.max(0, k.balance);
    }
  });
  vars.filter((v) => v.status === "signed").forEach((v) => (agreed += vrTot(v)));
  return { agreed: sdR2(agreed), invoiced: sdR2(invoiced), paid: sdR2(paid), owed: sdR2(owed) };
}
function cmyHtml(c) {
  if (!ownerMode()) return "";
  const { sites, docs, vars } = cmyDocs(c);
  const t = cmySums(docs, vars);
  /* job by job: each of the client's sites, then anything not on a site */
  const groups = sites.map((s) => ({
    s,
    docs: docs.filter((d) => d.site && same(d.site, s)),
    vars: vars.filter((v) => same(v.site, s)),
  }));
  const loose = docs.filter((d) => !d.site || !sites.some((s) => same(s, d.site)));
  if (loose.length) groups.push({ s: "", docs: loose, vars: [] });
  const row = (d) => {
    const k = sdCalc(d),
      st = sdStatus(d),
      est = d.type === "estimate";
    return `<button type="button" class="cmy-row" data-id="${esc(d.id)}"><span class="cmy-ic" aria-hidden="true">${est ? "📐" : "📑"}</span><span class="cmy-w"><b>${sdIsPf(d) ? "Pro forma " : ""}${esc(sdNo(d))}${est && (+d.ver || 1) > 1 ? " v" + esc(d.ver) : ""}</b><small>${esc([d.date ? shortDay(d.date) : "", d.title].filter(Boolean).join(" · "))}</small></span><span class="cmy-a"><b>${gbp(est ? k.net : k.due)}</b>${!est && st !== "paid" && st !== "draft" && k.balance > 0 ? `<small>${gbp(k.balance)} to pay</small>` : ""}${sdTag(d)}</span></button>`;
  };
  const cmyVarRow = (v) =>
    `<button type="button" class="cmy-row cmy-var" data-v="1"><span class="cmy-ic" aria-hidden="true">📝</span><span class="cmy-w"><b>Variation${v.number ? " " + esc(v.number) : ""}</b><small>${esc([v.date ? shortDay(v.date) : "", v.title || v.desc].filter(Boolean).join(" · "))}</small></span><span class="cmy-a"><b>${gbp(vrTot(v))}</b><span class="tag${v.status === "signed" ? " ok" : ""}">${v.status === "signed" ? "Signed" : "Not signed yet"}</span></span></button>`;
  const shown = groups.filter((g) => g.docs.length || g.vars.length);
  return `<section class="card cmy-card"><div class="cardbody"><b>💰 Estimates &amp; invoices</b>
    ${
      docs.length || vars.length
        ? `<div class="cmy-sums"><span><small>Agreed</small><b>${gbp(t.agreed)}</b></span><span><small>Invoiced</small><b>${gbp(t.invoiced)}</b></span><span><small>Paid</small><b>${gbp(t.paid)}</b></span><span class="${t.owed > 0 ? "cmy-owe" : ""}"><small>Still owed</small><b>${gbp(t.owed)}</b></span></div>
      ${shown
        .map(
          (g) =>
            `<div class="cmy-job"><div class="cmy-jh">${g.s ? "🏗️ " + esc(siteLabel(g.s)) : "Not on a job yet"}</div>${g.docs
              .filter((d) => d.type === "estimate")
              .map(row)
              .join("")}${g.vars.map(cmyVarRow).join("")}${g.docs
              .filter((d) => d.type === "invoice")
              .map(row)
              .join("")}</div>`,
        )
        .join("")}`
        : '<div class="who">No estimates or invoices for this client yet.</div>'
    }
    <div class="actions"><button type="button" class="btn" id="cmy-est">+ New estimate</button><button type="button" class="btn" id="cmy-inv">+ New invoice</button></div>
  </div></section>`;
}
function cmyWire(c) {
  if (!$("cmy-est")) return;
  const { docs } = cmyDocs(c);
  document.querySelectorAll(".cmy-card .cmy-row[data-id]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = docs.find((x) => x.id === b.dataset.id);
        if (d) sdEdit(d);
      }),
  );
  document.querySelectorAll(".cmy-card .cmy-var").forEach(
    (b) =>
      (b.onclick = () => {
        closeViewer();
        S.otab = "sales";
        S.f.sv = "var";
        S.f.svLock = "";
        render();
      }),
  );
  const start = (type) =>
    sdEdit({
      type,
      clientId: c.id,
      client: c.name || "",
      address: [c.address, c.postcode].filter(Boolean).join("\n"),
      email: c.email || "",
      site: c.site || clientSites(c)[0] || "",
    });
  $("cmy-est").onclick = () => start("estimate");
  $("cmy-inv").onclick = () => start("invoice");
}
