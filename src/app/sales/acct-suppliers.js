/* ================= ACCOUNTS SUPPLIERS: a file for each shop or supplier – what's spent with them and on which sites ================= */
import { $, esc, gbp, iso, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { acPeriod } from "./accounts.js";
import { acAllTx, acCatName } from "./acct-data.js";
import { acRcptParts, acReceipts, acSaveRcpt } from "./acct-receipts.js";
import { acRcptSheet } from "./acct-review.js";
import { sdR2, sdTaxYear } from "./sales-calc.js";
export { acSupKey, acSupSpent, acSupView };
/* Built from the receipts and bills (and, for a shop, bank payments that have no receipt yet). The same shop written
   different ways ("Screwfix Exmouth", "SCREWFIX DIRECT") goes in one file; two files can be merged by hand, which
   renames the supplier on the receipts. Each file: totals for the period, by site, by month, every receipt (tap to
   open it) and an export. The Sites view turns it round: what's been spent on each site, and with whom. */
const ACS_SKIP = new Set(
  "the ltd limited plc llp uk co company direct store stores branch trade trading centre center and group services online".split(
    " ",
  ),
);
/* a short key for a supplier name, so spellings of the same shop meet */
function acSupKey(name) {
  const w = String(name || "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .split(/\s+/)
    .filter((x) => x && !ACS_SKIP.has(x));
  if (!w.length) return "";
  return w[0].length < 3 && w[1] ? w[0] + w[1] : w[0];
}
/* receipts in the period, each with its parts */
function acSupData() {
  const [from, to, label] = acPeriod();
  const rs = acReceipts().filter(
    (r) => r.status === "done" && r.date && r.date >= from && r.date <= to,
  );
  const sups = {};
  rs.forEach((r) => {
    const k = acSupKey(r.supplier) || "?";
    const s = (sups[k] = sups[k] || { key: k, names: {}, rs: [], gross: 0, vat: 0, last: "" });
    s.names[r.supplier || "Not named"] = (s.names[r.supplier || "Not named"] || 0) + 1;
    s.rs.push(r);
    acRcptParts(r).forEach((p) => {
      s.gross = sdR2(s.gross + p.gross);
      s.vat = sdR2(s.vat + p.vat);
    });
    if (r.date > s.last) s.last = r.date;
  });
  Object.values(sups).forEach((s) => {
    s.name = Object.entries(s.names).sort((a, b) => b[1] - a[1])[0][0];
    s.merchant = (S.suppliers || []).find((m) => acSupKey(m.name) === s.key) || null;
    if (s.merchant) s.name = s.merchant.name;
  });
  return { from, to, label, rs, sups };
}
/* what's been spent with a merchant this tax year (for the Merchants card) */
function acSupSpent(name) {
  const k = acSupKey(name);
  if (!k) return null;
  const ty = sdTaxYear(iso(new Date()));
  const from = `${ty}-04-06`;
  let g = 0,
    n = 0;
  acReceipts()
    .filter((r) => r.status === "done" && r.date >= from && acSupKey(r.supplier) === k)
    .forEach((r) => {
      n++;
      acRcptParts(r).forEach((p) => (g += p.gross));
    });
  return n ? { gross: sdR2(g), n } : null;
}
/* bank payments that look like this shop but have no receipt */
function acSupBankOnly(key, from, to) {
  return acAllTx().filter((t) => {
    if (!(t.amt < 0) || t.date < from || t.date > to) return false;
    if (acReceipts().some((r) => r.tx === t.rec + "|" + t.id)) return false;
    const w = String(t.desc || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    return w.includes(key) || w.join("").startsWith(key);
  });
}
const acsGroup = (parts, by) => {
  const g = {};
  parts.forEach((p) => {
    const k = by(p);
    g[k] = g[k] || { gross: 0, vat: 0, n: 0 };
    g[k].gross = sdR2(g[k].gross + p.gross);
    g[k].vat = sdR2(g[k].vat + p.vat);
    g[k].n++;
  });
  return Object.entries(g).sort((a, b) => b[1].gross - a[1].gross);
};
const acsMonth = (d) =>
  new Date(d.slice(0, 7) + "-01T12:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
/* the Suppliers tab */
function acSupView(tabs) {
  const D = acSupData();
  const mode = S.f.acsm || "sup";
  const periods = [
    ["ty", "This tax year"],
    ["lty", "Last tax year"],
    ["12m", "Last 12 months"],
    ["3m", "Last 3 months"],
  ];
  const head = `${tabs}
    <div class="seg ac-per" id="acs-per">${periods.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${(S.f.acp || "ty") === k}">${l}</button>`).join("")}</div>
    <div class="acv-tabs" id="acs-mode"><button type="button" data-v="sup" aria-pressed="${mode === "sup"}">🏪 By supplier</button><button type="button" data-v="site" aria-pressed="${mode === "site"}">🏗️ By site</button></div>`;
  let body = "";
  const file = S.f.acsup && D.sups[S.f.acsup];
  if (mode === "sup" && file) body = acSupFile(file, D);
  else if (mode === "sup") {
    const list = Object.values(D.sups).sort((a, b) => b.gross - a.gross);
    body = `<div class="who">${esc(D.label)} – every shop and supplier you have receipts or bills from. Tap one to open its file.</div>
      <label for="acs-q" class="acs-q">Find<input id="acs-q" type="search" placeholder="Shop name" value="${esc(S.f.acsq || "")}"></label>
      ${
        list.length
          ? `<div class="acs-list">${list
              .filter((s) => !S.f.acsq || s.name.toLowerCase().includes(S.f.acsq.toLowerCase()))
              .map((s) => {
                const unbooked = s.rs.filter((r) => !acRcptParts(r).some((p) => p.site)).length;
                return `<button type="button" class="acs-row" data-k="${esc(s.key)}"><span><b>${esc(s.name)}</b>${s.merchant ? ' <span class="tag ok">Merchant</span>' : ""}<small>${s.rs.length} receipt${s.rs.length === 1 ? "" : "s"} · last ${esc(shortDay(s.last))}${unbooked ? ` · <span class="acv-bad">${unbooked} not booked to a site</span>` : ""}</small></span><b>${gbp(s.gross)}</b></button>`;
              })
              .join("")}</div>`
          : `<div class="empty"><strong>No receipts in this period</strong>Snap receipts in the Receipts tab and they're filed here by supplier.</div>`
      }`;
  } else {
    const parts = D.rs.flatMap((r) =>
      acRcptParts(r).map((p) => Object.assign({ r, sup: D.sups[acSupKey(r.supplier) || "?"] }, p)),
    );
    const bySite = acsGroup(parts, (p) => p.site || "");
    const open = S.f.acss;
    body = `<div class="who">${esc(D.label)} – what's been spent on each site from receipts and bills booked to it.</div>
      ${
        bySite.length
          ? bySite
              .map(([site, t]) => {
                const mine = parts.filter((p) => (p.site || "") === site);
                const bySup = acsGroup(mine, (p) => (p.sup ? p.sup.name : "Not named"));
                return `<details class="card acs-site"${open === site ? " open" : ""} data-s="${esc(site)}"><summary><span><b>${esc(site || "Not booked to a site")}</b><small>${t.n} item${t.n === 1 ? "" : "s"} · VAT ${gbp(t.vat)}</small></span><b>${gbp(t.gross)}</b></summary><div class="cardbody">
                  ${bySup.map(([n, x]) => `<div class="drow"><span>${esc(n)}</span><span>${gbp(x.gross)}</span></div>`).join("")}
                  <div class="flabel">Every item</div>
                  ${mine
                    .sort((a, b) => b.r.date.localeCompare(a.r.date))
                    .map(
                      (p) =>
                        `<button type="button" class="acs-rc" data-id="${esc(p.r.id)}"><span>${esc(shortDay(p.r.date))} · ${esc(p.r.supplier || "")}${p.desc ? " – " + esc(p.desc) : ""}</span><span>${gbp(p.gross)}</span></button>`,
                    )
                    .join("")}
                </div></details>`;
              })
              .join("")
          : `<div class="empty"><strong>Nothing booked yet</strong>Pick a site on each receipt and the spend shows here.</div>`
      }
      <div class="actions"><button type="button" class="btn" id="acs-csv">⬇ Export (spreadsheet)</button></div>`;
  }
  $("main").innerHTML = `<div class="ac-page">${head}${body}</div>`;
  $("acs-per")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.acp = b.dataset.v;
          render();
        }),
    );
  $("acs-mode")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.acsm = b.dataset.v;
          S.f.acsup = "";
          render();
        }),
    );
  document.querySelectorAll("#main .acs-row").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.acsup = b.dataset.k;
        render();
        window.scrollTo(0, 0);
      }),
  );
  document
    .querySelectorAll("#main .acs-rc")
    .forEach(
      (b) => (b.onclick = () => acRcptSheet(acReceipts().find((r) => r.id === b.dataset.id))),
    );
  document
    .querySelectorAll("#main .acs-site")
    .forEach((d) => d.addEventListener("toggle", () => d.open && (S.f.acss = d.dataset.s)));
  if ($("acs-q"))
    $("acs-q").oninput = () => {
      S.f.acsq = $("acs-q").value;
      const q = S.f.acsq.toLowerCase();
      document.querySelectorAll("#main .acs-row").forEach((b) => {
        b.hidden = !!q && !D.sups[b.dataset.k].name.toLowerCase().includes(q);
      });
    };
  if ($("acs-csv")) $("acs-csv").onclick = () => acSupCsv(D, file);
  if (file) acSupFileWire(file, D);
}
/* one supplier's file */
function acSupFile(s, D) {
  const parts = s.rs.flatMap((r) => acRcptParts(r).map((p) => Object.assign({ r }, p)));
  const bySite = acsGroup(parts, (p) => p.site || "");
  const byMonth = acsGroup(parts, (p) => p.r.date.slice(0, 7)).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );
  const bank = acSupBankOnly(s.key, D.from, D.to);
  const others = Object.values(D.sups)
    .filter((x) => x.key !== s.key)
    .sort((a, b) => a.name.localeCompare(b.name));
  const spellings = Object.keys(s.names);
  return `<div class="actions"><button type="button" class="btn" id="acs-back">‹ All suppliers</button></div>
    <section class="card acs-file"><div class="cardbody">
      <h3>🏪 ${esc(s.name)}</h3>
      ${
        spellings.length > 1
          ? `<div class="who">Also written as: ${spellings
              .filter((n) => n !== s.name)
              .map(esc)
              .join(", ")}</div>`
          : ""
      }
      ${s.merchant ? `<div class="who">On your Merchants list${s.merchant.accountNo ? " · you have an account with them" : ""}.</div>` : ""}
      <div class="sd-boxes">
        <div class="sd-box"><small>Spent – ${esc(D.label)}</small><b>${gbp(s.gross)}</b><span>${s.rs.length} receipt${s.rs.length === 1 ? "" : "s"}</span></div>
        <div class="sd-box"><small>VAT in it</small><b>${gbp(s.vat)}</b><span>to claim back</span></div>
        <div class="sd-box"><small>Without VAT</small><b>${gbp(sdR2(s.gross - s.vat))}</b><span>cost to the jobs</span></div>
      </div>
      <div class="flabel">By site</div>
      ${bySite.map(([site, t]) => `<div class="drow"><span>${esc(site || "Not booked to a site")}</span><span>${gbp(t.gross)}</span></div>`).join("")}
      <div class="flabel">By month</div>
      ${byMonth.map(([m, t]) => `<div class="drow"><span>${esc(acsMonth(m))}</span><span>${gbp(t.gross)}</span></div>`).join("")}
      <div class="flabel">Receipts and bills</div>
      ${s.rs
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => {
          const ps = acRcptParts(r);
          const sites = [...new Set(ps.map((p) => p.site).filter(Boolean))];
          return `<button type="button" class="acs-rc" data-id="${esc(r.id)}"><span>${esc(shortDay(r.date))}${r.ref ? " · " + esc(r.ref) : ""}${r.desc ? " · " + esc(r.desc) : ""}<small>${sites.length ? "🏗️ " + sites.map(esc).join(", ") : '<span class="acv-bad">Not booked to a site</span>'}${r.tx ? " · ✓ bank" : ""}</small></span><span>${r.type === "credit" ? "-" : ""}${gbp(r.total)}</span></button>`;
        })
        .join("")}
      ${bank.length ? `<div class="flabel">Bank payments with no receipt</div>${bank.map((t) => `<div class="drow"><span>${esc(shortDay(t.date))} · ${esc(t.desc)}</span><span>${gbp(-t.amt)}</span></div>`).join("")}<div class="who">Snap the receipt for these, or ask ${esc(s.name)} for a copy.</div>` : ""}
      <div class="actions"><button type="button" class="btn" id="acs-csv1">⬇ Export (spreadsheet)</button>${others.length ? `<label for="acs-merge" class="inl">Same supplier as<select id="acs-merge"><option value="">Pick one to merge…</option>${others.map((o) => `<option value="${esc(o.key)}">${esc(o.name)}</option>`).join("")}</select></label>` : ""}</div>
    </div></section>`;
}
function acSupFileWire(s, D) {
  $("acs-back").onclick = () => {
    S.f.acsup = "";
    render();
  };
  $("acs-csv1").onclick = () => acSupCsv(D, s);
  if ($("acs-merge"))
    $("acs-merge").onchange = async () => {
      const o = D.sups[$("acs-merge").value];
      if (!o) return;
      /* everything from the other file takes this file's name */
      try {
        for (const r of acReceipts().filter((x) => acSupKey(x.supplier) === o.key))
          await acSaveRcpt(Object.assign({}, r, { supplier: s.name }));
        toast(`${o.name} merged into ${s.name}`);
        render();
      } catch (e) {
        toast("Couldn't save. Check your connection.");
      }
    };
}
async function acSupCsv(D, only) {
  const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const lines = [
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
    ]
      .map(q)
      .join(","),
  ];
  D.rs
    .filter((r) => !only || acSupKey(r.supplier) === only.key)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((r) =>
      acRcptParts(r).forEach((p) =>
        lines.push(
          [
            r.date,
            r.supplier || "",
            r.type || "receipt",
            r.ref || "",
            p.desc,
            p.site,
            acCatName(p.cat),
            p.net.toFixed(2),
            p.vat.toFixed(2),
            p.gross.toFixed(2),
            r.paid || "",
          ]
            .map(q)
            .join(","),
        ),
      ),
    );
  try {
    await S.dl.save({
      filename: `${only ? only.name + " spend" : "Spend by site"} ${D.from} to ${D.to}.csv`,
      data: new Blob([lines.join("\n")], { type: "text/csv" }),
    });
  } catch (e) {
    toast("Couldn't save the file");
  }
}
