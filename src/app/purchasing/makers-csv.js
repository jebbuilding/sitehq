/* ================= SUPPLIERS & BROCHURES CSV: download the suppliers (makers) list with their brochures, and upload one ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { csvSave } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { MK_CATS, makersAll } from "./makers.js";
import { scheduleMkSync } from "./merchants.js";
import { acCsvRows } from "../sales/acct-data.js";
export { MKCSV };
/* James (Nov 2026): "is there a way to do CSV uploads and downloads for brochures". On Merchants › Suppliers (the makers
   whose brochures are kept – also 📖 Brochures & suppliers on Forms): ⬇ Download CSV saves every supplier – name, type,
   phone, email, website, address, rep and rep's phone, account number, who you buy through, notes, their brochure links
   online, and the names of the brochures saved in the app – one row each. ⬆ Upload CSV reads a sheet in the same
   layout (or with any of those column names, in any order): a supplier with the same name is updated with the boxes that
   are filled in (empty boxes leave what's there), a new name is added, and brochure links are added to theirs. The
   brochure files themselves can't travel in a CSV – add those with + Add brochure on the supplier. It shows what it will
   do before anything changes. */
const MKCSV = (() => {
  /* [key, column heading, other headings it understands] */
  const COLS = [
    ["name", "Name", ["supplier", "maker", "manufacturer", "company"]],
    ["cat", "Type", ["category"]],
    ["phone", "Phone", ["telephone", "tel"]],
    ["email", "Email", ["e-mail"]],
    ["website", "Website", ["web", "url"]],
    ["address", "Address", []],
    ["contact", "Rep / contact", ["rep", "contact", "contact name"]],
    ["contactPhone", "Rep's phone", ["rep phone", "contact phone"]],
    ["accountNo", "Account number", ["account no", "account"]],
    ["via", "Bought through", ["merchant", "bought via"]],
    ["notes", "Notes", []],
    ["links", "Brochure links", ["brochures online", "links"]],
    ["saved", "Brochures saved in the app", ["brochures saved", "brochures"]],
  ];
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  /* links as one cell: "Title | https://…; Title | https://…" (a bare web address is fine too) */
  const lkText = (L) => (L || []).map(([t, u]) => (t && t !== u ? t + " | " + u : u)).join("; ");
  const lkRead = (t) =>
    String(t || "")
      .split(/;\s*|\n+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const m = x.split(/\s*\|\s*/);
        const u = (m.length > 1 ? m[1] : m[0]).trim();
        return [m.length > 1 ? m[0].trim() : "Brochure", /^https?:/i.test(u) ? u : "https://" + u];
      });
  function download() {
    const A = makersAll();
    const L = Object.values(A)
      .filter((M) => M.key !== "other")
      .sort((a, b) => a.m.localeCompare(b.m));
    const rows = [COLS.map((c) => c[1])].concat(
      L.map((M) => {
        const r = M.rec || {};
        return COLS.map(([k]) =>
          k === "name"
            ? M.m
            : k === "cat"
              ? M.cat
              : k === "links"
                ? lkText(M.l)
                : k === "saved"
                  ? (S.brochures || [])
                      .filter((b) => b.maker === M.key)
                      .map((b) => b.title)
                      .join("; ")
                  : r[k] || "",
        );
      }),
    );
    csvSave("Suppliers and brochures.csv", rows);
  }
  /* the sheet's rows → suppliers, by its headings */
  function read(text) {
    const rows = acCsvRows(String(text || "").replace(/^﻿/, ""));
    if (rows.length < 2)
      return {
        err: "That file has no suppliers in it (it needs a heading row and at least one supplier).",
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
        if (v !== "" && k !== "saved") o[k] = v;
      });
      if (o.name) out.push(o);
    });
    return { rows: out };
  }
  /* what the upload will do: new suppliers and changes to ones already there */
  function plan(rows) {
    const A = makersAll();
    const byName = new Map(
      Object.values(A)
        .filter((M) => M.key !== "other")
        .map((M) => [norm(M.m), M]),
    );
    const add = [],
      upd = [];
    rows.forEach((o) => {
      const M = byName.get(norm(o.name));
      const d = {};
      Object.entries(o).forEach(([k, v]) => {
        if (k === "cat") d.cat = MK_CATS.find((c) => norm(c) === norm(v)) || "Other";
        else if (k === "links") d.links = lkRead(v);
        else d[k] = v;
      });
      if (M) {
        const r = M.rec || {};
        /* links are added to the ones already there, never taken away */
        if (d.links) {
          const have = new Set(M.l.map(([, u]) => u));
          d.links = (r.links || []).concat(d.links.filter(([, u]) => !have.has(u)));
          if (d.links.length === (r.links || []).length) delete d.links;
        }
        const ch = Object.keys(d).filter((k) =>
          k === "name"
            ? d.name !== M.m
            : k === "cat"
              ? d.cat !== M.cat
              : JSON.stringify(r[k] == null ? "" : r[k]) !== JSON.stringify(d[k]),
        );
        if (ch.length) upd.push({ M, d, ch });
      } else add.push(d);
    });
    return { add, upd };
  }
  async function apply(P) {
    const now = Date.now();
    let n = 0;
    const save = async (key, id, rec) => {
      await S.db.doc("todos/" + id).set(rec);
      S.makers = (S.makers || []).filter((x) => x.key !== key).concat([Object.assign({ id }, rec)]);
      n++;
    };
    for (const d of P.add) {
      const key = "mk-" + newId();
      await save(
        key,
        "mk-" + key.replace(/^mk-/, ""),
        Object.assign({ vis: "me", people: [], cat: "Other" }, d, {
          kind: "maker",
          key,
          updated: now,
        }),
      );
    }
    for (const u of P.upd) {
      const r = u.M.rec || {};
      const id = r.id || "mk-" + u.M.key.replace(/^mk-/, "");
      const rec = Object.assign({ vis: "me", people: [], name: u.M.m, cat: u.M.cat }, r, u.d, {
        kind: "maker",
        key: u.M.key,
        updated: now,
      });
      delete rec.id;
      await save(u.M.key, id, rec);
    }
    try {
      scheduleMkSync();
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
      return toast("Nothing to change – the suppliers already match the file");
    const lbl = (k) => (COLS.find((c) => c[0] === k) || [k, k])[1];
    openSheet(
      `<h3 id="sheettitle">⬆ Upload suppliers &amp; brochure links</h3>
      <div class="who">From <b>${esc(file.name || "the file")}</b>. Boxes left empty in the file leave what's already there. Brochure files can't come in a CSV – add those on the supplier.</div>
      ${P.add.length ? `<div class="flabel">＋ ${P.add.length} new</div><div class="mkcsv-l">${P.add.map((d) => `<div>${esc(d.name)}${d.cat ? " · " + esc(d.cat) : ""}</div>`).join("")}</div>` : ""}
      ${P.upd.length ? `<div class="flabel">✎ ${P.upd.length} updated</div><div class="mkcsv-l">${P.upd.map((u) => `<div><b>${esc(u.M.m)}</b> <span class="who">${esc(u.ch.map(lbl).join(", "))}</span></div>`).join("")}</div>` : ""}
      ${formFoot(false, "Add and update " + (P.add.length + P.upd.length))}`,
      async () => {
        $("f-save").disabled = true;
        try {
          const n = await apply(P);
          closeForm();
          toast(n + " supplier" + (n === 1 ? "" : "s") + " added or updated");
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
    `<div class="actions mkcsv-bar"><button type="button" class="btn" id="mkcsv-dl">⬇ Download CSV</button><label class="btn mkcsv-up">⬆ Upload CSV<input type="file" id="mkcsv-in" accept=".csv,text/csv,text/plain"></label></div>`;
  function wire() {
    if ($("mkcsv-dl")) $("mkcsv-dl").onclick = download;
    const inp = $("mkcsv-in");
    if (inp)
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        inp.value = "";
        if (f) upload(f);
      };
  }
  return { barHtml, wire, download, read, plan, upload };
})();
