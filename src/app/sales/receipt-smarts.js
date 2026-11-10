/* ================= RECEIPT SMARTS: supplier rules, a duplicate warning, and checking a merchant's monthly statement ================= */
import { $, addDays, esc, gbp, iso, parse } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { ukDate } from "../safety/rams-maker.js";
import { acPdfPicture, acReceipts } from "./acct-receipts.js";
import { sdR2 } from "./sales-calc.js";
export { rcsLearn, rcsNoticeHtml, rcsWire };
/* Supplier rules: when Claude reads a receipt from a supplier James has saved before, the category, how it was paid
   and the site come from his last one (he set them once; they're filled in from then on). Duplicates: a receipt with
   the same supplier and total within 3 days of another (or the same reference) gets a warning before it's counted
   twice. Merchant statements: pick the merchant and the month, paste the lines off their statement (or let Claude
   read the statement in the live app), and see what's on the statement but not in SiteHQ, and the other way round. */
const rcsNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|uk|the)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
/* the last saved receipt from this supplier, for its settings */
function rcsLast(supplier, notId) {
  const k = rcsNorm(supplier);
  if (!k) return null;
  return (
    acReceipts().find((x) => x.id !== notId && x.status === "done" && rcsNorm(x.supplier) === k) ||
    null
  );
}
/* fill a freshly read receipt from the supplier's last one */
function rcsLearn(got) {
  const last = got && rcsLast(got.supplier);
  if (!last) return got;
  const o = Object.assign({}, got, { learned: last.supplier });
  if (last.cat && !last.multi) o.cat = last.cat;
  if (last.paid) o.paid = last.paid;
  if (last.site) o.site = last.site;
  return o;
}
/* another receipt that looks like the same one */
function rcsDup(r) {
  if (!r || !r.supplier || !(+r.total > 0)) return null;
  const k = rcsNorm(r.supplier);
  const t = parse(r.date || iso(new Date()));
  return (
    acReceipts().find(
      (x) =>
        x.id !== r.id &&
        x.status !== "reading" &&
        rcsNorm(x.supplier) === k &&
        ((r.ref && x.ref && String(x.ref).trim() === String(r.ref).trim()) ||
          (Math.abs((+x.total || 0) - (+r.total || 0)) < 0.005 &&
            x.date &&
            Math.abs(parse(x.date) - t) <= 3 * 864e5)),
    ) || null
  );
}
function rcsNoticeHtml(r) {
  const d = rcsDup(r);
  const parts = [];
  if (d)
    parts.push(
      `<div class="notice warn rcs-dup">⚠ This looks like a receipt you already have: ${esc(d.supplier)}, ${gbp(+d.total || 0)} on ${esc(ukDate(d.date))}${d.ref ? " (ref " + esc(d.ref) + ")" : ""}. If it's the same one, delete this copy so it isn't counted twice. <button type="button" class="linkbtn rcs-open" data-id="${esc(d.id)}">See the other one</button></div>`,
    );
  if (r.learned && r.status !== "done")
    parts.push(
      `<div class="who">Category and payment filled in from your last receipt from ${esc(r.learned)}.</div>`,
    );
  return parts.join("");
}
function rcsWire() {
  document.querySelectorAll(".rcs-open").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.acsel = b.dataset.id;
        S.f.acrf = "all";
        render();
      }),
  );
  if ($("rcs-stmt")) $("rcs-stmt").onclick = rcsStatement;
}
/* "12/10/2026, INV-123, 45.60" or "INV-123 45.60" → { date, ref, amt } */
function rcsParseLines(text) {
  return String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const am = l.match(/-?£?\s*\d[\d,]*\.\d{2}(?!.*\d\.\d{2})/);
      const amt = am ? sdR2(+am[0].replace(/[£,\s]/g, "")) : 0;
      const dm = l.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
      const date = dm
        ? `${dm[3].length === 2 ? "20" + dm[3] : dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`
        : "";
      let rest = l;
      if (am) rest = rest.replace(am[0], " ");
      if (dm) rest = rest.replace(dm[0], " ");
      const ref = (rest.match(/[A-Za-z]*[-/]?\d[\w/-]*/) || [""])[0];
      return { date, ref, amt, line: l };
    })
    .filter((x) => x.amt);
}
async function rcsReadStatement(blob) {
  let sample = null;
  try {
    sample = await window.claude.use("sample");
  } catch (e) {}
  if (!sample) return null;
  try {
    const j = await sample.json(
      `This is a UK builders' merchant's monthly statement. Reply with JSON only: {"lines":[{"date":"YYYY-MM-DD","ref":"invoice or credit note number","amt": amount as a number (credits negative)}]} for every invoice and credit note on it, not payments or the balance.`,
      { images: [blob], modelTier: "default" },
    );
    return ((j && j.lines) || []).map((x) => ({
      date: x.date || "",
      ref: String(x.ref || ""),
      amt: sdR2(+x.amt || 0),
      line: `${x.date || ""} ${x.ref || ""} ${x.amt}`,
    }));
  } catch (e) {
    return null;
  }
}
function rcsStatement() {
  const sups = [
    ...new Set(
      acReceipts()
        .map((x) => x.supplier)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const m0 = iso(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7);
  openSheet(
    `<h3 id="sheettitle">🧾 Check a merchant's statement</h3>
    <div class="who">See if every invoice on their statement is in SiteHQ, and nothing's in SiteHQ that isn't on it.</div>
    <label for="rcs-sup">Merchant<input id="rcs-sup" list="rcs-sups" maxlength="80" placeholder="e.g. Test Builders Merchant"><datalist id="rcs-sups">${sups.map((s) => `<option value="${esc(s)}">`).join("")}</datalist></label>
    <label for="rcs-m">Statement month<input id="rcs-m" type="month" value="${esc(m0)}"></label>
    <label for="rcs-lines">The lines on the statement – one a line: date, invoice number, amount</label><textarea id="rcs-lines" rows="6" placeholder="03/10/2026  INV-123  45.60&#10;10/10/2026  INV-130  210.00"></textarea>
    <span class="btn sd-filebtn">📷 Or a photo / PDF of the statement<input type="file" id="rcs-file" accept="image/*,application/pdf,.pdf" aria-label="Statement photo or PDF"></span><div class="who" id="rcs-read"></div>
    ${formFoot(false, "Check it")}`,
    () => {
      const sup = $("rcs-sup").value.trim();
      const m = $("rcs-m").value;
      if (!sup) return showErr("Which merchant?");
      if (!/^\d{4}-\d{2}$/.test(m)) return showErr("Pick the month");
      const lines = rcsParseLines($("rcs-lines").value);
      if (!lines.length) return showErr("Put in the lines from the statement");
      closeForm();
      rcsResult(sup, m, lines);
    },
    "rcs-sup",
  );
  $("rcs-file").onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    $("rcs-read").textContent = "Reading the statement…";
    const pdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name || "");
    const got = await rcsReadStatement(pdf ? await acPdfPicture(f) : f);
    if (!got) {
      $("rcs-read").textContent =
        "Claude can read statements in the live app – type the lines in instead.";
      return;
    }
    $("rcs-lines").value = got
      .map((x) => `${x.date ? ukDate(x.date) : ""}  ${x.ref}  ${x.amt.toFixed(2)}`)
      .join("\n");
    $("rcs-read").textContent =
      `Read ${got.length} line${got.length === 1 ? "" : "s"} – check them, then Check it.`;
  };
}
function rcsResult(sup, m, lines) {
  const k = rcsNorm(sup);
  const [Y, M] = m.split("-").map(Number);
  const from = m + "-01",
    to = iso(new Date(Y, M, 0));
  /* a little either side: bills dated at the month's edges */
  const mine = acReceipts().filter(
    (x) =>
      x.status === "done" &&
      rcsNorm(x.supplier) === k &&
      x.date >= iso(addDays(parse(from), -7)) &&
      x.date <= iso(addDays(parse(to), 7)),
  );
  const used = new Set();
  const rows = lines.map((l) => {
    let hit = mine.find(
      (x) =>
        !used.has(x.id) &&
        l.ref &&
        x.ref &&
        String(x.ref).trim().toLowerCase() === l.ref.toLowerCase(),
    );
    if (!hit)
      hit = mine.find(
        (x) => !used.has(x.id) && Math.abs((+x.total || 0) - Math.abs(l.amt)) < 0.005,
      );
    if (hit) used.add(hit.id);
    return { l, hit, diff: hit ? sdR2(Math.abs(l.amt) - (+hit.total || 0)) : 0 };
  });
  const missing = rows.filter((r) => !r.hit);
  const extra = mine.filter((x) => !used.has(x.id) && x.date >= from && x.date <= to);
  const stTot = sdR2(lines.reduce((a, l) => a + l.amt, 0));
  openViewer(`<div class="rcs-res"><div class="vhead"><b>🧾 ${esc(sup)} – ${esc(parse(from).toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</b></div>
    <div class="who">Statement total ${gbp(stTot)} · ${rows.length - missing.length} of ${rows.length} found in SiteHQ</div>
    ${missing.length ? `<div class="notice warn"><b>On the statement but not in SiteHQ (${missing.length})</b>${missing.map((r) => `<div class="drow"><span>${esc(r.l.date ? ukDate(r.l.date) : "")} ${esc(r.l.ref)}</span><b>${gbp(r.l.amt)}</b></div>`).join("")}<div class="who">Ask them for a copy of these and add them on the Receipts tab.</div></div>` : `<div class="notice">✓ Every line on the statement is in SiteHQ.</div>`}
    ${extra.length ? `<div class="notice warn"><b>In SiteHQ but not on the statement (${extra.length})</b>${extra.map((x) => `<div class="drow"><span>${esc(ukDate(x.date))} ${esc(x.ref || x.desc || "")}</span><b>${gbp(+x.total || 0)}</b></div>`).join("")}<div class="who">Check these with the merchant – a duplicate, the wrong merchant, or not on their system yet.</div></div>` : ""}
    <div class="flabel">Matched</div>${
      rows
        .filter((r) => r.hit)
        .map(
          (r) =>
            `<div class="drow"><span>${esc(r.l.ref || "")} · ${esc(ukDate(r.hit.date))}</span><span>${gbp(r.l.amt)}${r.diff ? ` <span class="tag bad">${gbp(r.diff)} different</span>` : " ✓"}</span></div>`,
        )
        .join("") || `<div class="who">None.</div>`
    }</div>`);
}
