/* ================= ADDRESS BOOK IMPORT: bring people in from a CSV file (Outlook, Google, iPhone export or a spreadsheet) ================= */
import { saveClient } from "./clients.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
import { acCsvRows } from "../sales/acct-data.js";
export { aiWire };
/* James (Nov 2026): "upload a CSV address book". On Clients, 📥 Upload an address book (CSV) reads the file, finds the
   name, phone, email, address and postcode columns by their headings (Outlook, Google Contacts, iCloud exports and
   simple spreadsheets – "First Name"/"Last Name" are joined), shows who it found, leaves out anyone already in the
   address book (same email or phone) and adds the rest as address-book contacts (stage "contact", source "Imported"),
   each a normal client record in todos (owner-only). */
const AI_COLS = {
  name: ["name", "full name", "display name", "client", "client name", "contact", "contact name"],
  first: ["first name", "given name", "forename", "firstname"],
  last: ["last name", "family name", "surname", "lastname"],
  phone: [
    "phone",
    "mobile",
    "mobile phone",
    "mobile number",
    "telephone",
    "tel",
    "phone number",
    "phone 1 - value",
    "primary phone",
    "home phone",
    "business phone",
  ],
  email: [
    "email",
    "e-mail",
    "email address",
    "e-mail address",
    "email 1 - value",
    "e-mail 1 - value",
  ],
  address: [
    "address",
    "property address",
    "street",
    "home street",
    "street address",
    "address 1 - street",
    "address line 1",
    "home address",
  ],
  town: ["town", "city", "home city", "address 1 - city", "address line 2"],
  postcode: [
    "postcode",
    "post code",
    "postal code",
    "zip",
    "home postal code",
    "address 1 - postal code",
  ],
};
const aiNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .trim();
const aiPhone = (s) => String(s || "").replace(/[^\d+]/g, "");
/* read the file into people */
function aiPeople(text) {
  const rows = acCsvRows(String(text || "").replace(/^﻿/, ""));
  if (rows.length < 2) return [];
  const head = rows[0].map(aiNorm);
  const col = {};
  Object.entries(AI_COLS).forEach(([k, names]) => {
    const i = head.findIndex((h) => names.includes(h));
    if (i >= 0) col[k] = i;
  });
  const get = (r, k) => (col[k] != null ? String(r[col[k]] || "").trim() : "");
  return rows
    .slice(1)
    .map((r) => {
      const name = get(r, "name") || [get(r, "first"), get(r, "last")].filter(Boolean).join(" ");
      const address = [get(r, "address"), get(r, "town")].filter(Boolean).join(", ");
      return {
        name,
        phone: get(r, "phone"),
        email: get(r, "email").toLowerCase(),
        address,
        postcode: get(r, "postcode").toUpperCase(),
      };
    })
    .filter((p) => p.name || p.email || p.phone);
}
/* already in the address book? same email, or same phone */
function aiHave(p) {
  return (S.clients || []).some(
    (c) =>
      (p.email && String(c.email || "").toLowerCase() === p.email) ||
      (p.phone && aiPhone(c.phone) && aiPhone(c.phone) === aiPhone(p.phone)),
  );
}
async function aiFile(file) {
  if (!file) return;
  let text = "";
  try {
    text = await file.text();
  } catch (e) {
    toast("Couldn't read that file");
    return;
  }
  const all = aiPeople(text);
  if (!all.length) {
    toast("No names, phones or emails found in that file. Is it a CSV with headings?");
    return;
  }
  const fresh = all.filter((p) => !aiHave(p));
  const skip = all.length - fresh.length;
  openSheet(
    `<h3 id="sheettitle">📥 ${all.length} ${all.length === 1 ? "person" : "people"} in ${esc(file.name)}</h3>
    <div class="who">${fresh.length ? `${fresh.length} will be added to your address book.` : "Everyone in it is already in your address book."}${skip ? ` ${skip} already there (same email or phone) – left out.` : ""}</div>
    <div class="ai-list">${fresh
      .slice(0, 50)
      .map(
        (p) =>
          `<div class="citem"><span><b>${esc(p.name || p.email || p.phone)}</b><br><span class="who">${esc([p.phone, p.email, [p.address, p.postcode].filter(Boolean).join(", ")].filter(Boolean).join(" · "))}</span></span></div>`,
      )
      .join(
        "",
      )}${fresh.length > 50 ? `<div class="who">…and ${fresh.length - 50} more</div>` : ""}</div>
    ${formFoot(false, fresh.length ? `Add ${fresh.length} to the address book` : "Close")}`,
    async () => {
      if (!fresh.length) {
        closeForm();
        return;
      }
      $("f-save").disabled = true;
      let n = 0;
      try {
        for (const p of fresh) {
          await saveClient({
            id: "cl-" + newId(),
            name: p.name || p.email || p.phone,
            phone: p.phone,
            email: p.email,
            address: p.address,
            postcode: p.postcode,
            stage: "contact",
            source: "Imported",
            notes: [{ text: "Imported from " + file.name, at: Date.now(), auto: true }],
            created: Date.now(),
          });
          n++;
        }
        closeForm();
        toast(n + " added to your address book");
        render();
      } catch (e) {
        $("f-save").disabled = false;
        showErr(
          n +
            " added, then it stopped. Check your connection and try again – they won't be added twice.",
        );
      }
    },
    null,
  );
}
function aiWire() {
  const f = $("cl-imp");
  if (f)
    f.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      aiFile(file);
    };
}
