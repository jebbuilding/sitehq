/* ================= MERCHANTS CSV: download the merchants list as a spreadsheet, and upload one to add or update merchants ================= */
import { coName } from "../core/company-names.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { csvSave } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { SUP_CATS, supMaster, syncSuppliers } from "./suppliers.js";
import { acCsvRows } from "../sales/acct-data.js";
export { MCSV };
/* James (Nov 2026): "a way to download CSV for merchants and a way to upload it also". On Merchants (owner): ⬇ Download
   CSV saves every merchant – name, type, branch, account, address, phone, email, website, contact, counter PIN, notes,
   other branches and who sees it – one row each. ⬆ Upload CSV reads a sheet in the same layout (or with any of those
   column names, in any order): a merchant with the same name (and branch) is updated with the boxes that are filled in –
   empty boxes leave what's there – and a new name is added. It shows what it will do before anything changes. */
const MCSV = (() => {
  /* [key, column heading, other headings it understands] */
  const COLS = [
    ["name", "Name", ["merchant", "supplier", "company"]],
    ["cat", "Type", ["category"]],
    ["loc", "Branch", ["location", "town", "area"]],
    ["accountName", "Account name", []],
    ["accountNo", "Account number", ["account no", "account"]],
    ["branch", "Address", ["branch address"]],
    ["phone", "Phone", ["telephone", "tel"]],
    ["email", "Email", ["e-mail"]],
    ["website", "Website", ["web", "url"]],
    ["contact", "Contact name", ["contact"]],
    ["pin", "Counter PIN / password", ["pin", "password"]],
    ["notes", "Notes", []],
    ["cash", "Cash only", ["cash"]],
    ["branches", "Other branches", ["branches"]],
    ["vis", "Who sees it", ["visible to", "who sees"]],
  ];
  const VIS = { all: "Everyone", some: "Some trades", me: "Only me" };
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const key = (sp) => norm(sp.name) + "|" + norm(sp.loc);
  /* other branches as one cell: "Name – Address – Phone; Name – Address – Phone" */
  const brText = (L) =>
    (L || [])
      .map((b) => [b.name, b.address, b.phone, b.email].filter(Boolean).join(" – "))
      .join("; ");
  const brRead = (t) =>
    String(t || "")
      .split(/;\s*/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const [name = "", address = "", phone = "", email = ""] = x.split(/\s+[–-]\s+/);
        return { name, address, phone, email, notes: "" };
      });
  function download() {
    const L = supMaster();
    if (!L.length) return toast("No merchants to download yet");
    const rows = [COLS.map((c) => c[1])].concat(
      L.map((sp) =>
        COLS.map(([k]) =>
          k === "cash"
            ? sp.cash
              ? "Yes"
              : "No"
            : k === "branches"
              ? brText(sp.branches)
              : k === "vis"
                ? VIS[sp.vis] || "Everyone"
                : sp[k] || "",
        ),
      ),
    );
    csvSave("Merchants.csv", rows);
  }
  /* the sheet's rows → merchants, by its headings */
  function read(text) {
    const rows = acCsvRows(String(text || "").replace(/^﻿/, ""));
    if (rows.length < 2)
      return {
        err: "That file has no merchants in it (it needs a heading row and at least one merchant).",
      };
    const head = rows[0].map(norm);
    const at = {};
    COLS.forEach(([k, l, alt]) => {
      const i = head.findIndex((h) => h === norm(l) || alt.map(norm).includes(h));
      if (i >= 0) at[k] = i;
    });
    if (at.name == null)
      return { err: "There's no Name column. Download the CSV to see the layout it needs." };
    const out = [];
    rows.slice(1).forEach((r) => {
      const o = {};
      Object.entries(at).forEach(([k, i]) => {
        const v = String(r[i] == null ? "" : r[i]).trim();
        if (v !== "") o[k] = v;
      });
      if (o.name) out.push(o);
    });
    return { rows: out };
  }
  /* what the upload will do: new merchants and changes to ones already there */
  function plan(rows) {
    const have = new Map(supMaster().map((sp) => [key(sp), sp]));
    const byName = new Map(supMaster().map((sp) => [norm(sp.name), sp]));
    const add = [],
      upd = [];
    rows.forEach((o) => {
      const ex = have.get(key(o)) || (!o.loc ? byName.get(norm(o.name)) : null);
      const d = {};
      Object.entries(o).forEach(([k, v]) => {
        if (k === "cash") d.cash = /^(y|yes|true|1|cash)/i.test(v);
        else if (k === "branches") d.branches = brRead(v);
        else if (k === "vis")
          d.vis = /some/i.test(v) ? "some" : /only|me|just/i.test(v) ? "me" : "all";
        else if (k === "cat") d.cat = SUP_CATS.find((c) => norm(c) === norm(v)) || v;
        else d[k] = v;
      });
      if (ex) {
        const ch = Object.keys(d).filter(
          (k) => JSON.stringify(ex[k] == null ? "" : ex[k]) !== JSON.stringify(d[k]),
        );
        if (ch.length) upd.push({ ex, d, ch });
      } else add.push(d);
    });
    return { add, upd };
  }
  async function apply(P) {
    const now = Date.now();
    let n = 0;
    for (const d of P.add) {
      const id = "sup-" + newId();
      const rec = Object.assign(
        {
          kind: "supplier",
          cat: "Builders merchant",
          accountName: coName(),
          vis: "all",
          people: [],
          cash: false,
          oh: {},
          branches: [],
          created: now,
        },
        d,
        { kind: "supplier", updated: now },
      );
      if (rec.vis === "some" && !(rec.people || []).length) rec.vis = "me";
      await S.db.doc("todos/" + id).set(rec);
      S.suppliers = (S.suppliers || []).concat([Object.assign({ id }, rec)]);
      n++;
    }
    for (const u of P.upd) {
      const rec = Object.assign({}, u.ex, u.d, { updated: now });
      if (rec.vis === "some" && !(rec.people || []).length) rec.vis = u.ex.vis || "me";
      delete rec.id;
      await S.db.doc("todos/" + u.ex.id).set(rec);
      S.suppliers = (S.suppliers || []).map((x) =>
        x.id === u.ex.id ? Object.assign({ id: u.ex.id }, rec) : x,
      );
      n++;
    }
    try {
      await syncSuppliers();
    } catch (e) {}
    return n;
  }
  /* ⬆ Upload CSV: read the file, show what it will do, then do it */
  async function upload(file) {
    let text = "";
    try {
      text = await file.text();
    } catch (e) {
      return toast("Couldn't read that file");
    }
    const R = read(text);
    if (R.err) return toast(R.err);
    const P = plan(R.rows);
    if (!P.add.length && !P.upd.length)
      return toast("Nothing to change – the merchants already match the file");
    const lbl = (k) => (COLS.find((c) => c[0] === k) || [k, k])[1];
    openSheet(
      `<h3 id="sheettitle">⬆ Upload merchants</h3>
      <div class="who">From <b>${esc(file.name || "the file")}</b>. Boxes left empty in the file leave what's already there.</div>
      ${P.add.length ? `<div class="flabel">＋ ${P.add.length} new</div><div class="mcsv-l">${P.add.map((d) => `<div>${esc(d.name)}${d.loc ? " · " + esc(d.loc) : ""}</div>`).join("")}</div>` : ""}
      ${P.upd.length ? `<div class="flabel">✎ ${P.upd.length} updated</div><div class="mcsv-l">${P.upd.map((u) => `<div><b>${esc(u.ex.name)}</b>${u.ex.loc ? " · " + esc(u.ex.loc) : ""} <span class="who">${esc(u.ch.map(lbl).join(", "))}</span></div>`).join("")}</div>` : ""}
      ${formFoot(false, "Add and update " + (P.add.length + P.upd.length))}`,
      async () => {
        $("f-save").disabled = true;
        try {
          const n = await apply(P);
          closeForm();
          toast(n + " merchant" + (n === 1 ? "" : "s") + " added or updated");
          render();
        } catch (e) {
          showErr(
            "Couldn't save them all. Check your connection and upload it again – it carries on where it stopped.",
          );
          $("f-save").disabled = false;
        }
      },
    );
  }
  const barHtml = () =>
    `<div class="actions mcsv-bar"><button type="button" class="btn" id="mcsv-dl">⬇ Download CSV</button><label class="btn mcsv-up">⬆ Upload CSV<input type="file" id="mcsv-in" accept=".csv,text/csv,text/plain"></label></div>`;
  function wire() {
    if ($("mcsv-dl")) $("mcsv-dl").onclick = download;
    const inp = $("mcsv-in");
    if (inp)
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        inp.value = "";
        if (f) upload(f);
      };
  }
  return { barHtml, wire, download, read, plan, upload };
})();
