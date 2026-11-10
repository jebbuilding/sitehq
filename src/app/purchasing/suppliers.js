/* ================= SUPPLIERS (owner list, copies sent only to chosen trades) ================= */
import { $, esc, gbp, toast } from "../core/helpers.js";
import { TR } from "../core/live-feed.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { noBin } from "../owner/deleted-items.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { makersView, wireMakers } from "./makers.js";
import { mkCopies, syncMakers, tradeMakersHtml, whoSeesDlg } from "./merchants.js";
import { pordView } from "./orders.js";
import { plView } from "./price-order.js";
import { supSendSheet } from "./sup-send.js";
import { acSupKey, acSupSpent } from "../sales/acct-suppliers.js";
import { syncSiteJobs } from "../sites/job-details.js";
export { openSupplier, scheduleSupSync, supMaster, suppliersView };
const SUP_CATS = [
  "Builders merchant",
  "Timber",
  "Plumbing and heating",
  "Electrical",
  "Plant and tool hire",
  "Skips and waste",
  "Scaffolding",
  "Concrete and aggregates",
  "Roofing",
  "Fuel",
  "Other",
];
const SUP_FIELDS = [
  ["accountName", "Account name"],
  ["accountNo", "Account number"],
  ["branch", "Address"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["contact", "Contact name"],
  ["pin", "PIN / password for the counter"],
  ["hours", "Opening hours"],
  ["notes", "Notes"],
];
const supMaster = () =>
  (S.suppliers || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
const supCopies = (list) =>
  (list || [])
    .filter((x) => x.type === "supplier")
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
function supAllowed(sp, id) {
  return sp.vis === "all" ? true : sp.vis === "some" ? (sp.people || []).includes(id) : false;
}
const OH_DAYS = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
];
const OH_DEF = {
  mon: { o: "07:30", c: "16:30" },
  tue: { o: "07:30", c: "16:30" },
  wed: { o: "07:30", c: "16:30" },
  thu: { o: "07:30", c: "16:30" },
  fri: { o: "07:30", c: "16:30" },
  sat: { o: "08:00", c: "12:00" },
  sun: null,
};
const ohT = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am",
    hh = h % 12 || 12;
  return hh + (m ? ":" + String(m).padStart(2, "0") : "") + ap;
};
function ohNow(oh) {
  if (!oh) return null;
  const d = new Date(),
    k = OH_DAYS[(d.getDay() + 6) % 7][0],
    t = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"),
    x = oh[k];
  if (x && x.o && x.c && t >= x.o && t < x.c)
    return `<span class="tag ok">Open now · closes ${ohT(x.c)}</span>`;
  if (x && x.o && t < x.o) return `<span class="tag">Closed · opens ${ohT(x.o)} today</span>`;
  for (let i = 1; i <= 7; i++) {
    const kk = OH_DAYS[(d.getDay() + 6 + i) % 7],
      y = oh[kk[0]];
    if (y && y.o)
      return `<span class="tag">Closed · opens ${i === 1 ? "tomorrow" : kk[1]} ${ohT(y.o)}</span>`;
  }
  return `<span class="tag">Closed</span>`;
}
function ohRows(oh) {
  const grp = [];
  OH_DAYS.forEach(([k, l]) => {
    const x = oh[k],
      v = x && x.o ? ohT(x.o) + " – " + ohT(x.c) : "Closed",
      last = grp[grp.length - 1];
    if (last && last.v === v) last.to = l;
    else grp.push({ from: l, to: null, v });
  });
  return grp
    .map(
      (g) =>
        `<div class="drow"><span>${g.from}${g.to ? "–" + g.to : ""}</span><span>${g.v}</span></div>`,
    )
    .join("");
}
function supPayload(sp) {
  const o = {
    type: "supplier",
    supId: sp.id,
    name: sp.name,
    cat: sp.cat || "Other",
    updated: sp.updated || Date.now(),
  };
  if (sp.loc) o.loc = sp.loc;
  if (sp.oh) o.oh = sp.oh;
  if (sp.cash) o.cash = true;
  SUP_FIELDS.forEach(([k]) => {
    if (sp[k]) o[k] = sp[k];
  });
  if (Array.isArray(sp.branches) && sp.branches.length) o.branches = sp.branches;
  return o;
}
let supSyncing = false;
async function syncSuppliers(onlyId) {
  if (!S.owner || supSyncing) return;
  supSyncing = true;
  try {
    for (const id of teamIds()) {
      if (TR.stamp[id] === undefined && !S.data.signoffs[id]) continue;
      const have = supCopies(S.data.signoffs[id]);
      for (const sp of supMaster()) {
        if (onlyId && sp.id !== onlyId) continue;
        const c = have.find((x) => x.supId === sp.id);
        if (supAllowed(sp, id)) {
          if (!c || (c.updated || 0) !== (sp.updated || 0))
            await S.db
              .doc("sheets/" + id + "/signoffs/sup-" + sp.id)
              .set(supPayload(sp))
              .catch(() => {});
        } else if (c)
          await noBin(() =>
            S.db
              .doc("sheets/" + id + "/signoffs/" + c.id)
              .delete()
              .catch(() => {}),
          );
      }
      for (const c of have)
        if (!onlyId && !S.suppliers.some((sp) => sp.id === c.supId))
          await noBin(() =>
            S.db
              .doc("sheets/" + id + "/signoffs/" + c.id)
              .delete()
              .catch(() => {}),
          );
    }
  } finally {
    supSyncing = false;
  }
}
let supSyncT = null;
function scheduleSupSync() {
  if (!S.owner || !S.suppliersLoaded) return;
  clearTimeout(supSyncT);
  supSyncT = setTimeout(() => {
    syncSuppliers();
    syncSiteJobs();
    try {
      syncMakers();
    } catch (e) {}
  }, 4000);
}
function supCard(sp, owner) {
  const tel = sp.phone ? sp.phone.replace(/\s+/g, "") : "";
  const vis = owner
    ? sp.vis === "all"
      ? "Everyone can see this"
      : sp.vis === "some"
        ? "Can see it: " +
          ((sp.people || [])
            .filter((id) => S.team[id])
            .map(nameOf)
            .join(", ") || "nobody yet")
        : "Only you can see this"
    : "";
  return `<details class="card supcard" data-s="${esc(sp.id)}" ${S.open.has("sup" + sp.id) ? "open" : ""}><summary><div class="nm">${esc(sp.name)}${sp.loc ? ` <span class="suploc">${esc(sp.loc)}</span>` : ""}${sp.oh ? " " + ohNow(sp.oh).replace(/ · .*?</, "<") : ""}<small>${esc([sp.cat, sp.branch].filter(Boolean).join(" · "))}${(sp.branches || []).length ? ` · +${sp.branches.length} more branch${sp.branches.length > 1 ? "es" : ""}` : ""}</small></div>${sp.accountNo || sp.cash ? `<div class="figs">${sp.accountNo ? `<span>Acc <b>${esc(sp.accountNo)}</b></span>` : ""}<span class="tag ${sp.cash ? "warn" : "ok"}">${sp.cash ? "Cash" : "Credit"}</span></div>` : ""}</summary>
    <div class="cardbody"><div class="actions">${tel ? `<a class="btn primary" href="tel:${esc(tel)}">📞 Call</a>` : ""}${sp.email ? `<a class="btn" href="mailto:${esc(sp.email)}">✉ Email</a>` : ""}${sp.branch ? `<button class="btn maplink" type="button" data-addr="${esc(sp.name + " " + sp.branch)}" data-label="${esc(sp.name + (sp.loc ? " " + sp.loc : ""))}">📍 Map</button>` : ""}${sp.website ? `<a class="btn" href="${esc(/^https?:/.test(sp.website) ? sp.website : "https://" + sp.website)}" target="_blank" rel="noopener">Website ↗</a>` : ""}</div>
      ${(() => {
        const sp2 = owner ? acSupSpent(sp.name) : null;
        return sp2
          ? `<div class="who sup-spent">💷 Spent this tax year: <b>${gbp(sp2.gross)}</b> (${sp2.n} receipt${sp2.n === 1 ? "" : "s"}) – <button type="button" class="pillbtn sup-file" data-n="${esc(sp.name)}">Open their file</button></div>`
          : "";
      })()}
      ${sp.oh ? `<div class="flabel" style="margin-top:4px">Opening hours ${ohNow(sp.oh)}</div><div class="details">${ohRows(sp.oh)}</div>` : ""}
      <div class="details">${SUP_FIELDS.filter(([k]) => sp[k] && !(k === "hours" && sp.oh))
        .map(
          ([k, l]) =>
            `<div class="drow"><span>${esc(l)}</span><span>${esc(sp[k])}${k === "accountNo" || k === "pin" ? ` <button type="button" class="pillbtn sup-copy" data-v="${esc(sp[k])}">Copy</button>` : ""}</span></div>` +
            (k === "accountNo"
              ? `<div class="drow"><span>Account type</span><span>${sp.cash ? "<b>Cash</b>: pay at the counter" : "Credit"}</span></div>`
              : ""),
        )
        .join("")}</div>
      ${
        (sp.branches || []).length
          ? `<div class="flabel" style="margin-top:10px">Other branches</div>${sp.branches
              .map((b) => {
                const bt = (b.phone || "").replace(/\s+/g, "");
                return `<div class="supbr"><div><b>${esc(b.name || "Branch")}</b>${b.address ? `<div class="who">${esc(b.address)}</div>` : ""}${b.phone ? `<div class="who">📞 ${esc(b.phone)}</div>` : ""}${b.notes ? `<div class="who">${esc(b.notes)}</div>` : ""}</div>
        <div class="actions">${bt ? `<a class="btn primary" href="tel:${esc(bt)}">📞 Call</a>` : ""}${b.address ? `<button class="btn maplink" type="button" data-addr="${esc(sp.name + " " + b.address)}" data-label="${esc(sp.name + " " + (b.name || ""))}">📍 Map</button>` : ""}${b.email ? `<a class="btn" href="mailto:${esc(b.email)}">✉ Email</a>` : ""}</div></div>`;
              })
              .join("")}`
          : ""
      }
      ${owner ? `<div class="actions"><button type="button" class="btn sup-vis" data-id="${esc(sp.id)}">👥 ${esc(vis)} – change</button><button type="button" class="btn sup-send">📤 Send</button><button type="button" class="btn sup-edit">Edit</button></div>` : ""}</div></details>`;
}
function suppliersView() {
  const owner = ownerMode();
  if (owner && S.f.merTab === "prices") {
    plView(
      `<div class="seg" style="margin-bottom:8px"><button type="button" class="mer-t" data-v="mer" aria-pressed="false">🏪 Merchants</button><button type="button" class="mer-t" data-v="makers" aria-pressed="false">🏭 Suppliers &amp; brochures</button><button type="button" class="mer-t" data-v="prices" aria-pressed="true">💷 Price lists</button><button type="button" class="mer-t" data-v="orders" aria-pressed="${S.f.merTab === "orders"}">📦 Orders</button></div>`,
    );
    $("main")
      .querySelectorAll(".mer-t")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.merTab = b.dataset.v;
            render();
          }),
      );
    return;
  }
  if (owner && S.f.merTab === "orders") {
    pordView(
      `<div class="seg" style="margin-bottom:8px"><button type="button" class="mer-t" data-v="mer" aria-pressed="false">🏪 Merchants</button><button type="button" class="mer-t" data-v="makers" aria-pressed="false">🏭 Suppliers &amp; brochures</button><button type="button" class="mer-t" data-v="prices" aria-pressed="false">💷 Price lists</button><button type="button" class="mer-t" data-v="orders" aria-pressed="true">📦 Orders</button></div>`,
    );
    $("main")
      .querySelectorAll(".mer-t")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.merTab = b.dataset.v;
            render();
          }),
      );
    return;
  }
  if (owner && S.f.merTab === "makers") {
    $("main").innerHTML =
      `<div class="seg" style="margin-bottom:8px"><button type="button" class="mer-t" data-v="mer" aria-pressed="false">🏪 Merchants</button><button type="button" class="mer-t" data-v="makers" aria-pressed="true">🏭 Suppliers &amp; brochures</button><button type="button" class="mer-t" data-v="prices" aria-pressed="false">💷 Price lists</button><button type="button" class="mer-t" data-v="orders" aria-pressed="${S.f.merTab === "orders"}">📦 Orders</button></div>` +
      makersView();
    wireMakers();
    $("main")
      .querySelectorAll(".mer-t")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.merTab = b.dataset.v;
            render();
          }),
      );
    return;
  }
  if (!owner && mkCopies(S.mine.signoffs).length) {
    const tv = S.f.merTab || "mer";
    const seg = `<div class="seg" style="margin-bottom:8px"><button type="button" class="mer-t" data-v="mer" aria-pressed="${tv !== "makers"}">🏪 Merchants</button><button type="button" class="mer-t" data-v="makers" aria-pressed="${tv === "makers"}">🏭 Suppliers &amp; brochures</button></div>`;
    if (tv === "makers") {
      $("main").innerHTML = seg + tradeMakersHtml();
      $("main")
        .querySelectorAll(".mer-t")
        .forEach(
          (b) =>
            (b.onclick = () => {
              S.f.merTab = b.dataset.v;
              render();
            }),
        );
      $("main")
        .querySelectorAll(".tmk-open")
        .forEach((b) => (b.onclick = () => openFile(b.dataset.a, b.dataset.n, b.dataset.t)));
      return;
    }
    setTimeout(() => {
      const m = $("main");
      if (m && !m.querySelector(".mer-t")) {
        m.insertAdjacentHTML("afterbegin", seg);
        m.querySelectorAll(".mer-t").forEach(
          (b) =>
            (b.onclick = () => {
              S.f.merTab = b.dataset.v;
              render();
            }),
        );
      }
    }, 0);
  }
  const list = owner ? supMaster() : supCopies(S.mine.signoffs);
  const q = (S.f.supq || "").toLowerCase();
  const shown = list.filter(
    (sp) =>
      !q ||
      [sp.name, sp.loc, sp.cat, sp.branch, sp.accountNo, sp.notes]
        .concat((sp.branches || []).map((b) => [b.name, b.address].join(" ")))
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
  const cats = [...new Set(shown.map((sp) => sp.cat || "Other"))].sort(
    (a, b) => SUP_CATS.indexOf(a) - SUP_CATS.indexOf(b),
  );
  $("main").innerHTML = `${
    owner
      ? `<div class="seg" style="margin-bottom:8px"><button type="button" class="mer-t" data-v="mer" aria-pressed="true">🏪 Merchants</button><button type="button" class="mer-t" data-v="makers" aria-pressed="false">🏭 Suppliers &amp; brochures</button><button type="button" class="mer-t" data-v="prices" aria-pressed="false">💷 Price lists</button><button type="button" class="mer-t" data-v="orders" aria-pressed="${S.f.merTab === "orders"}">📦 Orders</button></div><div class="actions"><button class="btn primary" id="sup-add" type="button">+ Add a merchant</button><button class="btn hv" id="mer-who" type="button">👥 Choose who sees what</button></div>
      <div class="notice">For each merchant choose who can see it: everyone, only certain trades, or just you. Trades only ever receive the suppliers you've chosen for them.</div>`
      : ""
  }
    ${list.length ? `<input id="sup-q" type="search" placeholder="Search merchants, e.g. timber" value="${esc(S.f.supq || "")}" aria-label="Search suppliers">` : ""}
    ${cats
      .map(
        (c) =>
          `<div class="day"><div class="dayh"><span>${esc(c)}</span><span class="sum">${shown.filter((sp) => (sp.cat || "Other") === c).length}</span></div>${shown
            .filter((sp) => (sp.cat || "Other") === c)
            .map((sp) => supCard(sp, owner))
            .join("")}</div>`,
      )
      .join("")}
    ${!list.length ? `<div class="empty"><strong>No merchants yet</strong>${owner ? "Add your merchants, hire companies and the like, with your account details." : "James hasn't shared any merchants with you yet."}</div>` : !shown.length ? '<div class="nothing">No merchants match that search.</div>' : ""}`;
  if ($("sup-add")) $("sup-add").onclick = () => openSupplier(null);
  if ($("mer-who")) $("mer-who").onclick = () => whoSeesDlg();
  $("main")
    .querySelectorAll(".mer-t")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.merTab = b.dataset.v;
          render();
        }),
    );
  if ($("sup-q")) {
    $("sup-q").oninput = (e) => {
      S.f.supq = e.target.value;
      const pos = e.target.selectionStart;
      suppliersView();
      const n = $("sup-q");
      n.focus();
      try {
        n.setSelectionRange(pos, pos);
      } catch (x) {}
    };
  }
  $("main")
    .querySelectorAll(".supcard")
    .forEach((dt) => {
      const sp = list.find((x) => x.id === dt.dataset.s);
      if (!sp) return;
      dt.addEventListener("toggle", () => {
        dt.open ? S.open.add("sup" + sp.id) : S.open.delete("sup" + sp.id);
      });
      dt.querySelectorAll(".sup-copy").forEach(
        (b) =>
          (b.onclick = async () => {
            try {
              await navigator.clipboard.writeText(b.dataset.v);
              toast("Copied");
            } catch (e) {
              toast("Couldn't copy on this phone");
            }
          }),
      );
      const ed = dt.querySelector(".sup-edit");
      if (ed) ed.onclick = () => openSupplier(sp);
      const sn = dt.querySelector(".sup-send");
      if (sn) sn.onclick = () => supSendSheet(sp.name, sp, "merchant", []);
      const sfl = dt.querySelector(".sup-file");
      if (sfl)
        sfl.onclick = () => {
          S.otab = "accounts";
          S.f.act = "sup";
          S.f.acsm = "sup";
          S.f.acp = "ty";
          S.f.acsup = acSupKey(sp.name);
          render();
          window.scrollTo(0, 0);
        };
      const vb = dt.querySelector(".sup-vis");
      if (vb) vb.onclick = () => whoSeesDlg("sup", sp.id);
    });
}
function openSupplier(sp) {
  const ed = !!sp;
  sp = sp || { vis: "all", cat: "Builders merchant", accountName: "JEB Building Services" };
  const team = teamIds();
  openSheet(
    `<h3 id="sheettitle">${ed ? "Edit merchant" : "Add a merchant"}</h3>
    <label for="su-name">Supplier name<input id="su-name" required maxlength="80" value="${esc(sp.name || "")}" placeholder="e.g. Travis Perkins"></label>
    <label for="su-loc">Branch (location)<input id="su-loc" maxlength="60" value="${esc(sp.loc || "")}" placeholder="e.g. Exmouth"></label>
    <label for="su-cat">Type<select id="su-cat">${SUP_CATS.map((c) => `<option ${c === sp.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
    ${SUP_FIELDS.map(([k, l]) =>
      k === "hours"
        ? `<div><div class="flabel">Opening hours</div><div class="who">Set to the usual Mon–Fri 7:30am–4:30pm, Sat 8am–12pm, Sun closed. Change any day if this branch is different.</div>
      <div class="ohgrid" id="su-oh">${OH_DAYS.map(([d, dl]) => {
        const x = (sp.oh || OH_DEF)[d];
        return `<div class="ohrow" data-d="${d}"><label class="inl"><input type="checkbox" class="oh-on" ${x && x.o ? "checked" : ""}> <b>${dl}</b></label><input type="time" class="oh-o" value="${esc((x && x.o) || "07:30")}" aria-label="${dl} opens" ${x && x.o ? "" : "disabled"}><span>to</span><input type="time" class="oh-c" value="${esc((x && x.c) || "16:30")}" aria-label="${dl} closes" ${x && x.o ? "" : "disabled"}></div>`;
      }).join("")}</div>
      <div class="actions"><button type="button" class="pillbtn" id="su-ohdef">Reset to usual hours</button></div>
      ${sp.hours && !sp.oh ? `<div class="who">Old note: ${esc(sp.hours)}</div>` : ""}</div>`
        : k === "notes"
          ? `<label for="su-${k}">${esc(l)}<textarea id="su-${k}" maxlength="500" placeholder="e.g. Ask for Dave on the trade counter. Collection only before 9am.">${esc(sp[k] || "")}</textarea></label>`
          : `<label for="su-${k}">${esc(l)}<input id="su-${k}" maxlength="${k === "branch" ? 160 : 100}" value="${esc(sp[k] || "")}" ${k === "phone" ? 'type="tel"' : k === "email" ? 'type="email"' : ""}></label>${k === "accountNo" ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="su-cash" ${sp.cash ? "checked" : ""}> Cash account (pay at the counter, not credit)</label>` : ""}`,
    ).join("")}
    <div><div class="flabel">Other branches</div><div class="who">Add any other branches you use, each with its own address and phone number. The details above are for the main branch.</div><div id="su-brs"></div><button type="button" class="btn" id="su-addbr" style="align-self:flex-start">+ Add a branch</button></div>
    <div><div class="flabel">Who can see it?</div><div class="seg" id="su-vis">${[
      ["all", "Everyone"],
      ["some", "Only certain trades"],
      ["me", "Only me"],
    ]
      .map(
        ([v, l]) =>
          `<button type="button" data-v="${v}" aria-pressed="${sp.vis === v}">${l}</button>`,
      )
      .join("")}</div></div>
    <div id="su-pplw"><div class="flabel">Which trades?</div><div class="seg" id="su-ppl">${team.map((id) => `<button type="button" data-v="${esc(id)}" aria-pressed="${(sp.people || []).includes(id)}">${esc(nameOf(id))}</button>`).join("") || '<span class="nothing">No trades on the app yet.</span>'}</div></div>
    <div class="who" id="su-prog"></div>
    ${formFoot(ed, "Save supplier")}`,
    async () => {
      const name = $("su-name").value.trim();
      if (!name) {
        showErr("Add the supplier's name.");
        return;
      }
      const vis = $("su-vis").querySelector('[aria-pressed="true"]').dataset.v;
      const people = [...$("su-ppl").querySelectorAll('[aria-pressed="true"]')].map(
        (b) => b.dataset.v,
      );
      if (vis === "some" && !people.length) {
        showErr("Choose at least one trade, or pick Everyone or Only me.");
        return;
      }
      const d = {
        kind: "supplier",
        name,
        loc: $("su-loc").value.trim(),
        cash: $("su-cash").checked,
        cat: $("su-cat").value,
        vis,
        people: vis === "some" ? people : [],
        updated: Date.now(),
        created: sp.created || Date.now(),
      };
      SUP_FIELDS.forEach(([k]) => {
        if (k !== "hours") d[k] = $("su-" + k).value.trim();
      });
      d.hours = "";
      d.oh = {};
      [...document.querySelectorAll("#su-oh .ohrow")].forEach((r) => {
        const on = r.querySelector(".oh-on").checked,
          o = r.querySelector(".oh-o").value,
          c = r.querySelector(".oh-c").value;
        d.oh[r.dataset.d] = on && o && c ? { o, c } : null;
      });
      d.branches = [...document.querySelectorAll("#su-brs .supbrrow")]
        .map((r) => {
          const o = {};
          ["name", "address", "phone", "email", "notes"].forEach((k) => {
            o[k] = r.querySelector(".br-" + k).value.trim();
          });
          return o;
        })
        .filter((o) => o.name || o.address || o.phone);
      const id = sp.id || "sup-" + newId();
      $("f-save").disabled = true;
      $("su-prog").textContent = "Saving and sharing…";
      try {
        await S.db.doc("todos/" + id).set(d);
        const i = (S.suppliers || []).findIndex((x) => x.id === id);
        const rec = Object.assign({ id }, d);
        if (i >= 0) S.suppliers[i] = rec;
        else S.suppliers = (S.suppliers || []).concat([rec]);
        await syncSuppliers(id);
        closeForm();
        toast("Supplier saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    "su-name",
  );
  const addBr = (b) => {
    b = b || {};
    const r = document.createElement("div");
    r.className = "supbrrow";
    r.innerHTML = `<div class="supbrh"><b>Branch</b><button type="button" class="linkdanger br-x" aria-label="Remove this branch">Remove</button></div>
      <input class="br-name" maxlength="80" placeholder="Branch name, e.g. Exeter, Marsh Barton" value="${esc(b.name || "")}" aria-label="Branch name">
      <input class="br-address" maxlength="160" placeholder="Address and postcode" value="${esc(b.address || "")}" aria-label="Branch address">
      <div class="grid2"><input class="br-phone" type="tel" maxlength="30" placeholder="Phone" value="${esc(b.phone || "")}" aria-label="Branch phone"><input class="br-email" type="email" maxlength="100" placeholder="Email (optional)" value="${esc(b.email || "")}" aria-label="Branch email"></div>
      <input class="br-notes" maxlength="200" placeholder="Notes (optional), e.g. Ask for Sam, opens 6.30am" value="${esc(b.notes || "")}" aria-label="Branch notes">`;
    r.querySelector(".br-x").onclick = () => r.remove();
    $("su-brs").appendChild(r);
    return r;
  };
  (sp.branches || []).forEach(addBr);
  const ohWire = () =>
    document.querySelectorAll("#su-oh .ohrow").forEach((r) => {
      const cb = r.querySelector(".oh-on");
      cb.onchange = () => {
        r.querySelector(".oh-o").disabled = r.querySelector(".oh-c").disabled = !cb.checked;
      };
    });
  ohWire();
  $("su-ohdef").onclick = () => {
    document.querySelectorAll("#su-oh .ohrow").forEach((r) => {
      const x = OH_DEF[r.dataset.d];
      r.querySelector(".oh-on").checked = !!x;
      r.querySelector(".oh-o").value = x ? x.o : "07:30";
      r.querySelector(".oh-c").value = x ? x.c : "16:30";
      r.querySelector(".oh-o").disabled = r.querySelector(".oh-c").disabled = !x;
    });
    toast("Usual hours put back");
  };
  $("su-addbr").onclick = () => addBr().querySelector(".br-name").focus();
  const sync = () => {
    $("su-pplw").hidden = $("su-vis").querySelector('[aria-pressed="true"]').dataset.v !== "some";
  };
  $("su-vis")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          $("su-vis")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          sync();
        }),
    );
  $("su-ppl")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
    );
  sync();
  if (ed)
    armDelete(async () => {
      await S.db.doc("todos/" + sp.id).delete();
      S.suppliers = S.suppliers.filter((x) => x.id !== sp.id);
      for (const id of teamIds()) {
        const c = supCopies(S.data.signoffs[id]).find((x) => x.supId === sp.id);
        if (c)
          await noBin(() =>
            S.db
              .doc("sheets/" + id + "/signoffs/" + c.id)
              .delete()
              .catch(() => {}),
          );
      }
      setTimeout(render, 0);
    });
}
