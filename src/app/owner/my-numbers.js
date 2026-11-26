/* ================= MY NUMBERS: the numbers James always gets asked for – company, VAT, UTR, insurance, memberships, vans – each a tap to copy ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { coData } from "./company-details.js";
export { NUM };
/* James (Nov 2026, "do them all" – idea 4): Setup › 🔢 My numbers. One page with every number forms ask for, grouped:
   🏢 Company (name, company number, VAT number, address, waste carrier – from Company details), 💷 Tax & HMRC (UTRs,
   PAYE and accounts office references, CIS), 🛡 Insurance (public and employer's liability from Company details, and
   each van's insurer, policy and claims line from its details), ⭐ Memberships (FMB, TrustMark, CHAS, Constructionline,
   Checkatrade…), 🏦 Bank details for invoices, 🚐 Vans (reg and VIN). Each has 📋 Copy, and 📋 Copy all puts the lot in
   one message. ✎ Change fills in the ones kept here (and any extra ones, with their own name); the ones from Company
   details or a van are changed there. Owner-only: todos/mynumbers (kind "mynumbers": vals { key: text }, extra
   [{ id, group, label, value }]). Never passwords – there's no place for them. */
const NUM = (() => {
  const GROUPS = [
    ["co", "🏢 Company"],
    ["tax", "💷 Tax & HMRC"],
    ["ins", "🛡 Insurance"],
    ["mem", "⭐ Memberships & accreditations"],
    ["bank", "🏦 Bank details for invoices"],
    ["van", "🚐 Vans"],
    ["other", "📌 Other"],
  ];
  /* the ones kept here: [group, key, label, example] */
  const OWN = [
    ["tax", "utrCo", "Company UTR", "10 digits"],
    ["tax", "utrMe", "Your own UTR (self assessment)", "10 digits"],
    ["tax", "niMe", "Your National Insurance number", "e.g. QQ 12 34 56 C"],
    ["tax", "paye", "Employer PAYE reference", "e.g. 123/AB45678"],
    ["tax", "aor", "Accounts office reference", "e.g. 123PA00045678"],
    ["tax", "cisRef", "CIS contractor reference", "usually your PAYE reference"],
    ["tax", "vatQ", "VAT quarters", "e.g. Mar, Jun, Sep, Dec"],
    ["tax", "accountant", "Accountant", "name and phone"],
    ["ins", "insBroker", "Insurance broker", "name and phone"],
    ["ins", "toolsPolicy", "Tools / contract works policy no.", ""],
    ["mem", "fmb", "FMB membership no.", ""],
    ["mem", "trustmark", "TrustMark licence no.", ""],
    ["mem", "chas", "CHAS no.", ""],
    ["mem", "cline", "Constructionline no.", ""],
    ["mem", "checkatrade", "Checkatrade / other listing", ""],
    ["mem", "cscs", "Your CSCS card no.", ""],
    ["bank", "bankName", "Account name", ""],
    ["bank", "bank", "Bank", ""],
    ["bank", "sort", "Sort code", "e.g. 12-34-56"],
    ["bank", "acc", "Account number", "8 digits"],
  ];
  const rec = () => (S.myNumbers && S.myNumbers[0]) || { vals: {}, extra: [] };
  /* every number: [group, label, value, from] */
  function rows() {
    const c = coData();
    const v = rec().vals || {};
    const L = [];
    const add = (g, l, val, from) => val && L.push([g, l, String(val), from || ""]);
    add("co", "Company name", c.name, "co");
    add("co", "Company number", c.companyNo, "co");
    add("co", "VAT number", c.vatNo, "co");
    add("co", "Business address", c.address, "co");
    add("co", "Waste carrier", c.wastePermit || c.wasteCarrier, "co");
    (c.extra || []).forEach((x) => add("other", x.label || "Other", x.value, "co"));
    add(
      "ins",
      "Public liability",
      [c.plInsurer, c.plPolicy, c.plCover].filter(Boolean).join(" · "),
      "co",
    );
    add("ins", "Employer's liability", [c.elInsurer, c.elPolicy].filter(Boolean).join(" · "), "co");
    (S.equipment || [])
      .filter((e) => e.kind === "vehicle")
      .forEach((e) => {
        const i = e.info || {};
        const nm = e.name || i.reg || "Van";
        add(
          "ins",
          nm + " insurance",
          [i.insurer, i.policy, i.insPhone ? "claims " + i.insPhone : ""]
            .filter(Boolean)
            .join(" · "),
          "van",
        );
        add("van", nm, [i.reg, i.vin ? "VIN " + i.vin : ""].filter(Boolean).join(" · "), "van");
      });
    OWN.forEach(([g, k, l]) => add(g, l, v[k], ""));
    (rec().extra || []).forEach((x) => add(x.group || "other", x.label || "Number", x.value, ""));
    return L;
  }
  async function copy(t, what) {
    try {
      await navigator.clipboard.writeText(t);
      toast("📋 " + (what || "Copied"));
    } catch (e) {
      toast("Couldn't copy – press and hold the number to copy it");
    }
  }
  function open() {
    const L = rows();
    openViewer(`<div class="num"><div class="vhead"><b>🔢 My numbers</b></div>
      <div class="who">The numbers forms always ask for, each a tap to copy. Only you see this page.</div>
      <div class="actions"><button type="button" class="btn primary" id="num-edit">✎ Change</button><button type="button" class="btn" id="num-all">📋 Copy all</button></div>
      ${GROUPS.map(([g, t]) => {
        const R = L.filter((r) => r[0] === g);
        return R.length
          ? `<div class="flabel">${esc(t)}</div>${R.map(
              (r, i) =>
                `<div class="num-row"><span><span class="who">${esc(r[1])}</span><br><b class="num-v">${esc(r[2])}</b>${r[3] ? `<span class="who"> · from ${r[3] === "co" ? "Company details" : "the van's details"}</span>` : ""}</span><button type="button" class="btn num-cp" data-i="${L.indexOf(r)}" aria-label="Copy ${esc(r[1])}">📋 Copy</button></div>`,
            ).join("")}`
          : "";
      }).join("")}
      ${L.length ? "" : `<div class="empty"><strong>Nothing yet</strong>Tap ✎ Change to add your UTR, memberships and bank details. Your company and VAT numbers come from Company details.</div>`}</div>`);
    document.querySelectorAll(".num-cp").forEach(
      (b) =>
        (b.onclick = () => {
          const r = L[+b.dataset.i];
          copy(r[2], r[1] + " copied");
        }),
    );
    $("num-all").onclick = () =>
      copy(
        GROUPS.map(([g, t]) => {
          const R = L.filter((r) => r[0] === g);
          return R.length
            ? t.replace(/^\S+\s/, "") + "\n" + R.map((r) => r[1] + ": " + r[2]).join("\n")
            : "";
        })
          .filter(Boolean)
          .join("\n\n"),
        "All copied",
      );
    $("num-edit").onclick = edit;
  }
  function edit() {
    const r = rec();
    const v = r.vals || {};
    let extra = (r.extra || []).map((x) => Object.assign({}, x));
    const exHtml = () =>
      extra
        .map(
          (x, i) =>
            `<div class="num-ex"><input class="num-exl" data-i="${i}" maxlength="60" value="${esc(x.label || "")}" placeholder="What it is" aria-label="Name of number ${i + 1}"><input class="num-exv" data-i="${i}" maxlength="200" value="${esc(x.value || "")}" placeholder="The number" aria-label="Number ${i + 1}"><button type="button" class="linkdanger num-exx" data-i="${i}" aria-label="Take out ${esc(x.label || "this one")}">✕</button></div>`,
        )
        .join("");
    openSheet(
      `<h3 id="sheettitle">✎ My numbers</h3>
      <div class="who">Fill in the ones you need; leave the rest empty. Company, VAT and insurance numbers are in Company details, and each van's in its details. No passwords here.</div>
      ${GROUPS.filter(([g]) => OWN.some((o) => o[0] === g))
        .map(
          ([g, t]) =>
            `<div class="flabel">${esc(t)}</div>${OWN.filter((o) => o[0] === g)
              .map(
                ([, k, l, ph]) =>
                  `<label for="num-${k}">${esc(l)}<input id="num-${k}" maxlength="200" value="${esc(v[k] || "")}"${ph ? ` placeholder="${esc(ph)}"` : ""} autocomplete="off"></label>`,
              )
              .join("")}`,
        )
        .join("")}
      <div class="flabel">📌 Other numbers</div><div id="num-exs">${exHtml()}</div>
      <button type="button" class="btn" id="num-exadd">＋ Another number</button>
      ${formFoot(false, "Save")}`,
      async () => {
        const vals = {};
        OWN.forEach(([, k]) => {
          const x = $("num-" + k).value.trim();
          if (x) vals[k] = x;
        });
        readEx();
        const data = {
          kind: "mynumbers",
          vals,
          extra: extra
            .filter((x) => x.label || x.value)
            .map((x) => ({ id: x.id || newId(), group: "other", label: x.label, value: x.value })),
          updated: Date.now(),
        };
        try {
          await S.db.doc("todos/mynumbers").set(data);
          S.myNumbers = [Object.assign({ id: "mynumbers" }, data)];
          closeForm();
          toast("Saved");
          open();
        } catch (e) {
          showErr("Couldn't save – check your connection");
        }
      },
    );
    function readEx() {
      document
        .querySelectorAll(".num-exl")
        .forEach((el) => (extra[+el.dataset.i].label = el.value.trim()));
      document
        .querySelectorAll(".num-exv")
        .forEach((el) => (extra[+el.dataset.i].value = el.value.trim()));
    }
    function wireEx() {
      document.querySelectorAll(".num-exx").forEach(
        (b) =>
          (b.onclick = () => {
            readEx();
            extra.splice(+b.dataset.i, 1);
            $("num-exs").innerHTML = exHtml();
            wireEx();
          }),
      );
    }
    wireEx();
    $("num-exadd").onclick = () => {
      readEx();
      extra.push({ label: "", value: "" });
      $("num-exs").innerHTML = exHtml();
      wireEx();
      const L = document.querySelectorAll(".num-exl");
      if (L.length) L[L.length - 1].focus();
    };
  }
  return { open, rows };
})();
