/* ================= MATERIALS & RECEIPTS (stored in the invoices collection with a kind) ================= */
import { lastOf, pickField, pickVal } from "../core/fields.js";
import { $, addDays, esc, gbp, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, myDoc, openSheet, showErr } from "../core/sheet.js";
import { S, equipOf, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { csvSave, isImg, uploadErr } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { shrinkImage } from "../safety/training.js";
import { myJobs } from "../sites/job-sheets.js";
import { myName } from "../survey/door-window-survey.js";
export {
  MAT_ST,
  UNITS,
  isInv,
  matCard,
  matCount,
  materialsView,
  openMat,
  openMatEditor,
  openReceipt,
  rcRow,
  receiptsView,
  wireReceipts,
};
const isInv = (v) => !v.kind || v.kind === "invoice";
const RC_TYPES = {
  fuel: "Fuel",
  materials: "Materials",
  tools: "Tools & hire",
  parking: "Parking & tolls",
  other: "Other",
};
const PAID_BY = {
  card: "Company card",
  account: "Company account",
  own: "My own money (pay me back)",
};
const UNITS = [
  "each",
  "days hire",
  "weeks hire",
  "m",
  "m²",
  "m³",
  "lengths",
  "sheets",
  "bags",
  "boxes",
  "packs",
  "rolls",
  "litres",
  "kg",
  "tonnes",
  "pallets",
];
const MAT_ST = {
  sent: ["New", "day"],
  ordered: ["Ordered", ""],
  delivered: ["Delivered", "ok"],
  cancelled: ["Cancelled", ""],
};
const receiptsOf = (list) => (list || []).filter((v) => v.kind === "receipt");
const matsOf = (list) => (list || []).filter((v) => v.kind === "materials");
const ITEM_KINDS = { material: "Material", tool: "Tool" };
function matCount(m) {
  const it = m.items || [];
  const t = it.filter((i) => i.type === "tool").length,
    ma = it.length - t;
  return (
    [ma ? `${ma} material${ma === 1 ? "" : "s"}` : "", t ? `${t} tool${t === 1 ? "" : "s"}` : ""]
      .filter(Boolean)
      .join(", ") || "No items"
  );
}
function rcRow(r, owner, who) {
  return `<div class="entry rc" data-r="${esc(r.id)}" data-w="${esc(who || "")}"><div class="main">
    <div class="job"><span class="tag ${r.type === "fuel" ? "day" : ""}">${esc(RC_TYPES[r.type] || "Receipt")}</span>${r.checked ? '<span class="tag ok">Checked</span>' : ""}${r.paidBy === "own" ? (r.repaid ? '<span class="tag ok">Paid back</span>' : '<span class="tag bad">Pay back</span>') : ""}${esc(r.supplier || "Receipt")}${owner ? ` <span class="who">· ${esc(nameOf(who))}</span>` : ""}</div>
    <div class="sub">${shortDay(r.date)}${r.site ? " · " + esc(r.site) : ""}${r.vehicle ? " · " + esc(r.vehicle) : ""}${r.litres ? " · " + esc(r.litres) + " L" : ""}${r.mileage ? " · " + esc(r.mileage) + " miles" : ""} · ${esc(PAID_BY[r.paidBy] || "")}</div>
    ${r.notes ? `<div class="sub">${esc(r.notes)}</div>` : ""}
    <div class="filerow">${r.fileId ? `<button type="button" class="pillbtn rc-open">Open receipt</button>` : '<span class="who">No photo</span>'}
      ${owner ? `<label class="inl"><input type="checkbox" class="rc-chk" ${r.checked ? "checked" : ""}>Checked</label>${r.paidBy === "own" ? `<label class="inl"><input type="checkbox" class="rc-rep" ${r.repaid ? "checked" : ""}>Paid back</label>` : ""}` : !r.checked ? `<button type="button" class="linkdanger rc-del">Delete</button>` : ""}</div></div>
    <div class="amt">${r.amount != null && r.amount !== "" ? gbp(r.amount) : ""}</div></div>`;
}
const SENT_ST = {
  sent: ["To get", "day"],
  delivered: ["All done", "ok"],
  cancelled: ["Cancelled", ""],
};
function matCard(m, owner, who) {
  if (m.fromOwner) {
    const st = SENT_ST[m.status || "sent"] || SENT_ST.sent;
    const n = (m.items || []).length,
      g = (m.items || []).filter((i) => i.ordered).length;
    return `<button type="button" class="entry matc" data-m="${esc(m.id)}" data-w="${esc(who || "")}"><div class="main">
    <div class="job"><span class="tag ${st[1]}">${st[0]}</span><span class="tag">${owner ? "Sent to " + esc(nameOf(who)) : "From James"}</span>${m.urgent ? '<span class="tag bad">Urgent</span>' : ""}${esc(m.site || "No site")}</div>
    ${m.jobTitle ? `<div class="sub"><b style="color:var(--ink)">${esc(m.jobTitle)}</b></div>` : ""}
    <div class="sub">${matCount(m)}${m.needBy ? " · by " + shortDay(m.needBy) : ""} · ${g} of ${n} ticked off</div></div></button>`;
  }
  const st = MAT_ST[m.status || "sent"] || MAT_ST.sent;
  const n = (m.items || []).length,
    o = (m.items || []).filter((i) => i.ordered).length;
  return `<button type="button" class="entry matc" data-m="${esc(m.id)}" data-w="${esc(who || "")}"><div class="main">
    <div class="job"><span class="tag ${st[1]}">${st[0]}</span>${m.urgent ? '<span class="tag bad">Urgent</span>' : ""}${esc(m.site || "No site")}${owner ? ` <span class="who">· ${esc(nameOf(who))}</span>` : ""}</div>
    ${m.jobTitle ? `<div class="sub"><b style="color:var(--ink)">${esc(m.jobTitle)}</b></div>` : ""}
    <div class="sub">${matCount(m)}${m.needBy ? " · needed by " + shortDay(m.needBy) : ""} · sent ${stamp(m.sentAt)}${o && m.status !== "delivered" ? ` · ${o} of ${n} ordered` : ""}</div>
    ${m.reply ? `<div class="sub"><b>James:</b> ${esc(m.reply)}</div>` : ""}</div></button>`;
}
function materialsView() {
  const owner = ownerMode();
  let html = "";
  if (!owner) {
    const list = matsOf(S.mine.invoices).sort((a, b) => b.sentAt - a.sentAt);
    html += `<div class="actions"><button class="btn primary" id="newMat" type="button">+ Request materials or tools</button></div>
      ${list.length ? `<div class="day">${list.map((m) => matCard(m, false)).join("")}</div>` : '<div class="empty"><strong>Nothing yet</strong>Ask James for the materials or tools you need for a job. Lists James sends you appear here too.</div>'}`;
  } else {
    const f = S.f.mst || "open";
    const all = allTeam("invoices").filter((v) => v.kind === "materials");
    const list = all
      .filter(
        (m) =>
          f === "all" ||
          (f === "open"
            ? ["sent", "ordered"].includes(m.status || "sent")
            : (m.status || "sent") === f),
      )
      .sort(
        (a, b) =>
          (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) ||
          (a.needBy || "9999").localeCompare(b.needBy || "9999"),
      );
    html += `<div class="actions"><button class="btn primary" id="sendMat" type="button">+ Send a list to trades</button></div>
      <div class="seg" id="mst">${[
        ["open", "Still to do"],
        ["sent", "New"],
        ["delivered", "Delivered"],
        ["all", "All"],
      ]
        .map(
          ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l}</button>`,
        )
        .join("")}</div>
      ${list.length ? `<div class="day">${list.map((m) => matCard(m, true, m.who)).join("")}</div>` : '<div class="empty"><strong>Nothing here</strong>Materials and tools your workers need for jobs appear here.</div>'}`;
  }
  $("main").innerHTML = html;
  if ($("mst"))
    $("mst")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.mst = b.dataset.v;
            render();
          }),
      );
  if ($("newMat")) $("newMat").onclick = () => openMatEditor(null);
  if ($("sendMat")) $("sendMat").onclick = () => openMatEditor(null);
  const pool = owner
    ? allTeam("invoices")
    : S.mine.invoices.map((x) => Object.assign({ who: S.me }, x));
  $("main")
    .querySelectorAll(".matc")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const m = pool.find((x) => x.id === b.dataset.m && (!owner || x.who === b.dataset.w));
          if (m) openMat(m);
        }),
    );
}
function receiptsView() {
  const owner = ownerMode();
  let html = "";
  if (!owner) {
    const list = receiptsOf(S.mine.invoices).sort(
      (a, b) => b.date.localeCompare(a.date) || b.created - a.created,
    );
    const owed = list
      .filter((r) => r.paidBy === "own" && !r.repaid)
      .reduce((a, r) => a + (+r.amount || 0), 0);
    html += `<div class="actions"><button class="btn primary" id="newRc" type="button">+ Add a receipt</button></div>
      ${owed ? `<div class="notice">Waiting to be paid back: <b>${gbp(owed)}</b></div>` : ""}
      ${list.length ? `<div class="day">${list.map((r) => rcRow(r, false)).join("")}</div>` : '<div class="empty"><strong>No receipts yet</strong>Take a photo of every fuel, materials or tools receipt and add it here.</div>'}`;
  } else {
    const all = allTeam("invoices").filter((v) => v.kind === "receipt");
    const months = [...new Set(all.map((r) => (r.date || "").slice(0, 7)))]
      .filter(Boolean)
      .sort()
      .reverse();
    const m =
      S.f.rmonth && months.includes(S.f.rmonth)
        ? S.f.rmonth
        : months[0] || iso(new Date()).slice(0, 7);
    const t = S.f.rtype || "";
    const list = all
      .filter((r) => (r.date || "").startsWith(m) && (!t || r.type === t))
      .sort((a, b) => b.date.localeCompare(a.date));
    const tot = list.reduce((a, r) => a + (+r.amount || 0), 0),
      owed = all
        .filter((r) => r.paidBy === "own" && !r.repaid)
        .reduce((a, r) => a + (+r.amount || 0), 0);
    html += `<div class="filters"><label for="rm">Month<select id="rm">${(months.length ? months : [m]).map((x) => `<option value="${x}" ${x === m ? "selected" : ""}>${monthLabel(x)}</option>`).join("")}</select></label>
      <label for="rt">Type<select id="rt"><option value="">All types</option>${Object.entries(
        RC_TYPES,
      )
        .map(([k, l]) => `<option value="${k}" ${t === k ? "selected" : ""}>${l}</option>`)
        .join("")}</select></label></div>
      <div class="totals"><div class="tot"><div class="n">${gbp(tot)}</div><div class="l">${monthLabel(m)}</div></div>
      ${Object.keys(RC_TYPES)
        .map((k) => {
          const v = list.filter((r) => r.type === k).reduce((a, r) => a + (+r.amount || 0), 0);
          return v
            ? `<div class="tot"><div class="n">${gbp(v)}</div><div class="l">${RC_TYPES[k]}</div></div>`
            : "";
        })
        .join("")}
      ${owed ? `<div class="tot bad"><div class="n">${gbp(owed)}</div><div class="l">To pay back (all months)</div></div>` : ""}</div>
      <div class="actions"><button class="btn primary" id="rcCsv" type="button">Download ${monthLabel(m)} (CSV)</button></div>
      ${list.length ? `<div class="day">${list.map((r) => rcRow(r, true, r.who)).join("")}</div>` : '<div class="empty"><strong>No receipts for this month</strong>Receipts your workers add appear here.</div>'}`;
    S.f.rmonth = m;
  }
  $("main").innerHTML = html;
  if ($("newRc")) $("newRc").onclick = openReceipt;
  if ($("rm"))
    $("rm").onchange = (e) => {
      S.f.rmonth = e.target.value;
      e.target.blur();
      render();
    };
  if ($("rt"))
    $("rt").onchange = (e) => {
      S.f.rtype = e.target.value;
      e.target.blur();
      render();
    };
  if ($("rcCsv")) $("rcCsv").onclick = () => receiptsCsv(S.f.rmonth);
  wireReceipts(
    owner ? allTeam("invoices") : S.mine.invoices.map((x) => Object.assign({ who: S.me }, x)),
    owner,
  );
}
const monthLabel = (m) =>
  new Date(m + "-01T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
function wireReceipts(pool, owner) {
  $("main")
    .querySelectorAll(".rc")
    .forEach((row) => {
      const r = pool.find((x) => x.id === row.dataset.r && (!owner || x.who === row.dataset.w));
      if (!r) return;
      const o = row.querySelector(".rc-open");
      if (o) o.onclick = () => openFile(r.fileId, r.fileName || "receipt", r.contentType);
      const path = "sheets/" + (owner ? r.who : S.me) + "/invoices/" + r.id;
      const c = row.querySelector(".rc-chk");
      if (c)
        c.onchange = async () => {
          try {
            await S.db.doc(path).update({ checked: c.checked });
          } catch (e) {
            c.checked = !c.checked;
            toast("Couldn't save");
          }
        };
      const p = row.querySelector(".rc-rep");
      if (p)
        p.onchange = async () => {
          try {
            await S.db.doc(path).update({ repaid: p.checked, repaidAt: Date.now() });
          } catch (e) {
            p.checked = !p.checked;
            toast("Couldn't save");
          }
        };
      const d = row.querySelector(".rc-del");
      if (d) {
        let a = false;
        d.onclick = async () => {
          if (!a) {
            a = true;
            d.textContent = "Tap again";
            return;
          }
          try {
            await S.db.doc(path).delete();
            toast("Deleted");
          } catch (e) {
            toast("Couldn't delete");
          }
        };
      }
    });
}
function openReceipt() {
  const last =
    receiptsOf(S.mine.invoices).sort((a, b) => (b.created || 0) - (a.created || 0))[0] || {};
  let type = "fuel";
  openSheet(
    `<h3 id="sheettitle">Add a receipt</h3>
    <label for="rc-file">Photo of the receipt<input id="rc-file" type="file" accept="image/*,application/pdf,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
    <div><div class="flabel">What for?</div><div class="seg" id="rc-type">${Object.entries(RC_TYPES)
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${k === type}">${l}</button>`,
      )
      .join("")}</div></div>
    <div class="grid2"><label for="rc-date">Date<input id="rc-date" type="date" required value="${iso(new Date())}"></label>
    <label for="rc-amt">Total £<input id="rc-amt" type="number" inputmode="decimal" min="0" step="0.01" required placeholder="e.g. 62.40"></label></div>
    <label for="rc-sup">Where from<input id="rc-sup" maxlength="80" list="rc-sups" placeholder="e.g. Shell Exmouth, Travis Perkins" value=""><datalist id="rc-sups">${["Travis Perkins", "Jewson", "Screwfix", "Toolstation", "Selco", "Wickes", "B&Q", "Shell", "BP", "Esso", "Tesco fuel"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
    <div id="rc-fuel" class="grid2">${pickField("rc-veh", "Vehicle", equipOf("vehicle"), last.vehicle || "", "e.g. WK21 JEB", false)}
      <label for="rc-l">Litres (optional)<input id="rc-l" type="number" inputmode="decimal" min="0" step="0.01"></label></div>
    <label for="rc-miles" id="rc-milesl">Mileage (optional)<input id="rc-miles" type="number" inputmode="numeric" min="0"></label>
    ${pickField(
      "rc-site",
      "Site (optional)",
      siteNames(),
      lastOf(S.mine.entries, () => true, "job"),
      "e.g. 12 Marine Way, Exmouth",
      false,
    )}
    <div><div class="flabel">How was it paid?</div><div class="seg" id="rc-paid">${Object.entries(
      PAID_BY,
    )
      .map(
        ([k, l], i) =>
          `<button type="button" data-v="${k}" aria-pressed="${(last.paidBy || "card") === k}">${l}</button>`,
      )
      .join("")}</div></div>
    <label for="rc-notes">Notes (optional)<textarea id="rc-notes" maxlength="300"></textarea></label>
    ${formFoot(false, "Save receipt")}`,
    async () => {
      const one = (id) => $(id).querySelector('[aria-pressed="true"]').dataset.v;
      const f = $("rc-file").files[0];
      type = one("rc-type");
      const data = {
        kind: "receipt",
        type,
        date: $("rc-date").value,
        amount: $("rc-amt").value === "" ? null : Math.round(+$("rc-amt").value * 100) / 100,
        supplier: $("rc-sup").value.trim(),
        vehicle: type === "fuel" ? pickVal("rc-veh") : "",
        litres: type === "fuel" ? $("rc-l").value : "",
        mileage: $("rc-miles").value,
        site: pickVal("rc-site"),
        paidBy: one("rc-paid"),
        notes: $("rc-notes").value.trim(),
        fileName: f ? f.name : "",
        contentType: f ? (isImg(f.type) ? "image/jpeg" : f.type) : "",
        checked: false,
        repaid: false,
        sentAt: Date.now(),
        created: Date.now(),
      };
      if (!data.date || data.amount == null) {
        showErr("Add the date and the total.");
        return;
      }
      if (!f && !confirmNoPhoto) {
        confirmNoPhoto = true;
        showErr(
          "No photo added. Tap Save again to save without one, but James may need the receipt.",
        );
        return;
      }
      if (f && !S.assets) {
        showErr(
          "You don't have permission to upload. Ask James to make you an Editor on this page.",
        );
        return;
      }
      $("f-save").disabled = true;
      try {
        const files = [];
        if (f)
          files.push({
            blob: isImg(f.type) ? await shrinkImage(f) : f,
            name: f.name,
            field: "fileId",
            meta: true,
          });
        const r = await submitJob({ coll: "invoices", docId: "rc-" + newId(), data, files });
        closeForm();
        toast(
          r === "queued"
            ? "Receipt kept on this phone. It will send when you have signal."
            : "Receipt saved",
        );
        render();
      } catch (e) {
        showErr(uploadErr(e));
        $("f-save").disabled = false;
      }
    },
    "rc-file",
  );
  let confirmNoPhoto = false;
  const sync = () => {
    const fuel = $("rc-type").querySelector('[aria-pressed="true"]').dataset.v === "fuel";
    $("rc-fuel").hidden = !fuel;
    $("rc-milesl").hidden = !fuel;
  };
  ["rc-type", "rc-paid"].forEach((g) =>
    $(g)
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            $(g)
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            sync();
          }),
      ),
  );
  sync();
}
let matDraft = null;
function openMatEditor(m) {
  const send = ownerMode() && (!m || m.fromOwner);
  const pre = !m && S.matPrefill;
  S.matPrefill = null;
  matDraft = {
    items: (m ? m.items : pre ? pre.items : [{ id: newId(), name: "", qty: "", unit: "each" }]).map(
      (i) => Object.assign({}, i),
    ),
  };
  openSheet(
    `<h3 id="sheettitle">${send ? (m ? "Edit list for " + esc(nameOf(m.who)) : "Send a list to trades") : m ? "Edit request" : "Request materials or tools"}</h3>
    ${
      send && !m
        ? `<div><div class="flabel">Who's it for? (choose one or more)</div><div class="seg" id="mt-to">${
            teamIds()
              .map(
                (id) =>
                  `<button type="button" data-v="${esc(id)}" aria-pressed="false">${esc(nameOf(id))}</button>`,
              )
              .join("") ||
            '<span class="nothing">Nobody is using the app yet. You can still copy the list below and send it by message.</span>'
          }</div></div>`
        : ""
    }
    ${pickField("mt-site", "Site", siteNames(), m ? m.site : lastOf(S.mine.entries, () => true, "job"), "e.g. 12 Marine Way, Exmouth")}
    <label for="mt-job">Job (optional)<select id="mt-job"><option value="">Not for a particular job sheet</option>${(ownerMode()
      ? S.jobs
      : myJobs()
    )
      .filter((j) => j.status !== "closed")
      .map(
        (j) =>
          `<option value="${esc(j.id)}" ${m && m.jobId === j.id ? "selected" : ""}>${esc(j.title)} · ${esc(j.site)}</option>`,
      )
      .join("")}</select></label>
    <div class="grid2"><label for="mt-need">Needed by<input id="mt-need" type="date" value="${esc(m ? m.needBy || "" : iso(addDays(new Date(), 2)))}"></label>
    <label class="inl" style="align-self:end;font-size:15px;color:var(--ink);font-weight:500;padding-bottom:10px"><input type="checkbox" id="mt-urg" ${m && m.urgent ? "checked" : ""}> Urgent</label></div>
    <div><div class="checkhead"><span class="flabel" style="margin:0">${send ? "Materials and tools" : "What you need"}</span><span class="who">Material or tool, item, quantity</span></div><div id="mt-items"></div>
      <div class="actions" style="margin-top:8px"><button type="button" class="pillbtn" id="mt-add">+ Add item</button><button type="button" class="pillbtn" id="mt-paste">Paste a list</button></div></div>
    <label for="mt-notes">${send ? "Notes for them (optional)" : "Notes for James (optional)"}<textarea id="mt-notes" maxlength="500" placeholder="${send ? "e.g. Pick up from Travis Perkins Exmouth, account in JEB's name. Bring the breaker back by Friday." : "e.g. Deliver to the rear drive, gate code 1234"}">${esc(m ? m.notes || "" : "")}</textarea></label>
    ${send ? `<button type="button" class="pillbtn" id="mt-copydraft" style="align-self:flex-start">Copy list to send by WhatsApp or text</button><textarea id="mt-draftcopy" readonly hidden style="min-height:120px"></textarea>` : ""}
    ${formFoot(!!m, send ? (m ? "Save changes" : "Send") : m ? "Save changes" : "Send to James")}`,
    async () => {
      const items = matDraft.items
        .filter((i) => i.name.trim())
        .map((i) => ({
          id: i.id,
          type: i.type || "material",
          name: i.name.trim(),
          qty: i.qty,
          unit: i.unit,
          ordered: !!i.ordered,
        }));
      const jid = $("mt-job").value,
        job = jid ? S.jobs.find((j) => j.id === jid) : null;
      const site = pickVal("mt-site");
      if (!site) {
        showErr("Choose the site.");
        return;
      }
      if (!items.length) {
        showErr("Add at least one item.");
        return;
      }
      const now = Date.now();
      const data = {
        kind: "materials",
        site,
        jobId: job ? job.id : "",
        jobTitle: job ? job.title : "",
        needBy: $("mt-need").value,
        urgent: $("mt-urg").checked,
        items,
        notes: $("mt-notes").value.trim(),
        status: m ? m.status || "sent" : "sent",
        reply: m ? m.reply || "" : "",
        sentAt: m ? m.sentAt : now,
        created: m ? m.created || now : now,
        updated: now,
      };
      $("f-save").disabled = true;
      if (send) {
        try {
          if (m) {
            await S.db
              .doc("sheets/" + m.who + "/invoices/" + m.id)
              .set(Object.assign({}, data, { fromOwner: true, toName: nameOf(m.who) }));
            closeForm();
            closeViewer();
            toast("Saved");
            render();
            return;
          }
          const to = $("mt-to")
            ? [...$("mt-to").querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.v)
            : [];
          if (!to.length) {
            showErr("Choose at least one person, or use Copy to send it by message.");
            $("f-save").disabled = false;
            return;
          }
          const id = "ml-" + newId();
          for (const w of to)
            await S.db
              .doc("sheets/" + w + "/invoices/" + id)
              .set(Object.assign({}, data, { fromOwner: true, toName: nameOf(w) }));
          closeForm();
          toast("Sent to " + to.map(nameOf).join(", "));
          render();
        } catch (e) {
          showErr("Couldn't send. Check your connection.");
          $("f-save").disabled = false;
        }
        return;
      }
      try {
        const r = await submitJob({ coll: "invoices", docId: m ? m.id : "mt-" + newId(), data });
        closeForm();
        closeViewer();
        toast(
          r === "queued"
            ? "List kept on this phone. It will send when you have signal."
            : m
              ? "Saved"
              : "Sent to James",
        );
        render();
      } catch (e) {
        showErr("Couldn't save. Ask James to check you're an Editor on this page.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  const box = $("mt-items");
  const draw = (focus) => {
    box.innerHTML = matDraft.items
      .map(
        (it, i) => `<div class="jrow mrow" data-i="${i}">
      <select class="mt-k" aria-label="Material or tool, item ${i + 1}">${Object.entries(ITEM_KINDS)
        .map(
          ([k, l]) =>
            `<option value="${k}" ${(it.type || "material") === k ? "selected" : ""}>${l}</option>`,
        )
        .join("")}</select>
      <input class="mt-n" id="mt-n${i}" maxlength="120" value="${esc(it.name)}" placeholder="${it.type === "tool" ? "e.g. 110v breaker" : "e.g. 100mm dense blocks"}" aria-label="Item ${i + 1}">
      <input class="mt-q" type="text" inputmode="decimal" maxlength="10" value="${esc(it.qty)}" placeholder="Qty" aria-label="Quantity for item ${i + 1}">
      <select class="mt-u" aria-label="Unit for item ${i + 1}">${UNITS.map((u) => `<option ${u === it.unit ? "selected" : ""}>${u}</option>`).join("")}</select>
      <button type="button" class="linkdanger mt-x" aria-label="Remove item ${i + 1}">✕</button></div>`,
      )
      .join("");
    box.querySelectorAll(".mrow").forEach((r) => {
      const i = +r.dataset.i;
      r.querySelector(".mt-n").oninput = (e) => {
        matDraft.items[i].name = e.target.value;
      };
      r.querySelector(".mt-n").onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          r.querySelector(".mt-q").focus();
        }
      };
      r.querySelector(".mt-q").oninput = (e) => {
        matDraft.items[i].qty = e.target.value;
      };
      r.querySelector(".mt-q").onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          matDraft.items.splice(i + 1, 0, {
            id: newId(),
            type: matDraft.items[i].type || "material",
            name: "",
            qty: "",
            unit: "each",
          });
          draw(i + 1);
        }
      };
      r.querySelector(".mt-u").onchange = (e) => {
        matDraft.items[i].unit = e.target.value;
      };
      r.querySelector(".mt-k").onchange = (e) => {
        matDraft.items[i].type = e.target.value;
        if (e.target.value === "tool" && matDraft.items[i].unit === "each") {
        }
        draw();
      };
      r.querySelector(".mt-x").onclick = () => {
        matDraft.items.splice(i, 1);
        if (!matDraft.items.length)
          matDraft.items.push({ id: newId(), name: "", qty: "", unit: "each" });
        draw();
      };
    });
    if (focus != null) {
      const el = $("mt-n" + focus);
      if (el) el.focus();
    }
  };
  draw();
  $("mt-add").onclick = () => {
    matDraft.items.push({ id: newId(), name: "", qty: "", unit: "each" });
    draw(matDraft.items.length - 1);
  };
  $("mt-paste").onclick = () => {
    const ta = document.createElement("textarea");
    ta.placeholder = "One item per line, e.g. 40 x 100mm dense blocks";
    ta.style.minHeight = "120px";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pillbtn";
    b.textContent = "Add these";
    $("mt-paste").replaceWith(ta);
    ta.after(b);
    ta.focus();
    b.onclick = () => {
      const lines = ta.value
        .split("\n")
        .map((x) => x.replace(/^\s*[-•*]\s*/, "").trim())
        .filter(Boolean);
      const parsed = lines.map((l) => {
        const mm = l.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)?\s*(.+)$/i);
        return mm
          ? { id: newId(), name: mm[2], qty: mm[1], unit: "each" }
          : { id: newId(), name: l, qty: "", unit: "each" };
      });
      matDraft.items = matDraft.items.filter((i) => i.name.trim()).concat(parsed);
      if (!matDraft.items.length)
        matDraft.items.push({ id: newId(), name: "", qty: "", unit: "each" });
      ta.value = "";
      draw();
    };
  };
  if (m)
    armDelete(() =>
      send
        ? S.db.doc("sheets/" + m.who + "/invoices/" + m.id).delete()
        : myDoc("invoices", m.id).delete(),
    );
  if ($("mt-to"))
    $("mt-to")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
      );
  if ($("mt-copydraft"))
    $("mt-copydraft").onclick = async () => {
      const items = matDraft.items.filter((i) => i.name.trim());
      if (!items.length) {
        toast("Add some items first");
        return;
      }
      const jid = $("mt-job").value,
        job = jid ? S.jobs.find((j) => j.id === jid) : null;
      const t = matText({
        site: pickVal("mt-site") || "site",
        jobTitle: job ? job.title : "",
        needBy: $("mt-need").value,
        items,
        notes: $("mt-notes").value.trim(),
      });
      try {
        await navigator.clipboard.writeText(t);
        toast("Copied. Paste it into WhatsApp, a text or an email.");
      } catch (e) {
        const ta = $("mt-draftcopy");
        ta.value = t;
        ta.hidden = false;
        ta.focus();
        ta.select();
        toast("Select all and copy from the box");
      }
    };
}
const matLine = (i) =>
  /hire/.test(i.unit || "")
    ? `${i.name}${i.qty ? " – " + i.qty + " " + i.unit : " – hire"}`
    : `${i.qty ? i.qty + " " + (i.unit && i.unit !== "each" ? i.unit + " " : "x ") : ""}${i.name}`;
const matText = (m) => {
  const it = m.items || [];
  const ma = it.filter((i) => i.type !== "tool"),
    to = it.filter((i) => i.type === "tool");
  return (
    `For ${m.site}${m.jobTitle ? " (" + m.jobTitle + ")" : ""}${m.needBy ? " – needed by " + shortDay(m.needBy) : ""}\n` +
    (ma.length ? `\nMaterials:\n${ma.map(matLine).join("\n")}\n` : "") +
    (to.length ? `\nTools:\n${to.map(matLine).join("\n")}\n` : "") +
    (m.notes ? `\nNotes: ${m.notes}` : "")
  );
};
function openSentList(m) {
  const owner = ownerMode();
  const st = SENT_ST[m.status || "sent"] || SENT_ST.sent;
  const path = "sheets/" + (owner ? m.who : S.me) + "/invoices/" + m.id;
  openViewer(`<div><span class="tag ${st[1]}">${st[0]}</span><span class="tag">${owner ? "Sent to " + esc(nameOf(m.who)) : "From James"}</span>${m.urgent ? '<span class="tag bad">Urgent</span>' : ""}</div>
    <h3 style="font-family:var(--f-display);font-size:22px;margin:6px 0 0;color:var(--accent);text-transform:uppercase">Materials & tools · ${esc(m.site)}</h3>
    ${m.jobTitle ? `<div><b>${esc(m.jobTitle)}</b></div>` : ""}
    <div class="who">Sent ${stamp(m.sentAt)}${m.needBy ? " · needed by " + shortDay(m.needBy) : ""}</div>
    ${m.notes ? `<div class="notice" style="white-space:pre-line">${esc(m.notes)}</div>` : ""}
    ${!owner ? '<div class="who">Tick each item when you\'ve got it.</div>' : ""}
    <div class="jtasks">${(m.items || [])
      .map(
        (
          i,
          ix,
        ) => `<div class="jtask ${i.ordered ? "done" : ""}">${!owner && m.status !== "cancelled" ? `<label class="jcheck"><input type="checkbox" class="mi-got" data-i="${ix}" ${i.ordered ? "checked" : ""} aria-label="Got: ${esc(i.name)}"></label>` : `<span class="tickmark" style="${i.ordered ? "" : "background:var(--line)"}">${i.ordered ? "✓" : ""}</span>`}
      <div class="jbody"><div class="jtext"><span class="tag ${i.type === "tool" ? "day" : ""}">${i.type === "tool" ? "Tool" : "Material"}</span>${esc(i.name)}</div><div class="who">${i.qty ? esc(i.qty) + " " + esc(i.unit || "") : ""}${i.ordered ? (i.qty ? " · " : "") + "got it" : ""}</div></div></div>`,
      )
      .join("")}</div>
    <div class="actions" style="margin-top:12px">${!owner && (m.status || "sent") === "sent" ? `<button class="btn primary" type="button" id="ml-done">Mark all done</button>` : ""}
      ${owner ? `<button class="btn" type="button" id="ml-edit">Edit</button>` : ""}<button class="pillbtn" type="button" id="mt-copy">Copy list</button>${owner ? `<button class="linkdanger" type="button" id="ml-del">Delete</button>` : ""}</div>
    <textarea id="mt-copytext" readonly hidden style="margin-top:8px;min-height:140px">${esc(matText(m))}</textarea>`);
  const vb = $("viewer-body");
  vb.querySelectorAll(".mi-got").forEach(
    (cb) =>
      (cb.onchange = async () => {
        const items = (m.items || []).map((i, ix) =>
          ix === +cb.dataset.i ? Object.assign({}, i, { ordered: cb.checked }) : i,
        );
        m.items = items;
        const all = items.every((i) => i.ordered);
        try {
          await S.db
            .doc(path)
            .update(
              all ? { items, status: "delivered", doneAt: Date.now() } : { items, status: "sent" },
            );
          if (all) {
            toast("All done");
            closeViewer();
          }
        } catch (e) {
          toast("Couldn't save");
          cb.checked = !cb.checked;
        }
      }),
  );
  if ($("ml-done"))
    $("ml-done").onclick = async () => {
      try {
        await S.db.doc(path).update({
          items: (m.items || []).map((i) => Object.assign({}, i, { ordered: true })),
          status: "delivered",
          doneAt: Date.now(),
        });
        closeViewer();
        toast("Marked as done");
      } catch (e) {
        toast("Couldn't save");
      }
    };
  if ($("ml-edit"))
    $("ml-edit").onclick = () => {
      closeViewer();
      openMatEditor(m);
    };
  const del = $("ml-del");
  if (del) {
    let a = false;
    del.onclick = async () => {
      if (!a) {
        a = true;
        del.textContent = "Tap again to delete";
        return;
      }
      try {
        await S.db.doc(path).delete();
        closeViewer();
        toast("Deleted");
      } catch (e) {
        toast("Couldn't delete");
      }
    };
  }
  $("mt-copy").onclick = async () => {
    const t = matText(m);
    try {
      await navigator.clipboard.writeText(t);
      toast("Copied");
    } catch (e) {
      const ta = $("mt-copytext");
      ta.hidden = false;
      ta.focus();
      ta.select();
      toast("Select all and copy from the box");
    }
  };
}
function openMat(m) {
  if (m.fromOwner) return openSentList(m);
  const owner = ownerMode();
  const st = MAT_ST[m.status || "sent"] || MAT_ST.sent;
  const path = "sheets/" + (owner ? m.who : S.me) + "/invoices/" + m.id;
  openViewer(`<div><span class="tag ${st[1]}">${st[0]}</span>${m.urgent ? '<span class="tag bad">Urgent</span>' : ""}</div>
    <h3 style="font-family:var(--f-display);font-size:22px;margin:6px 0 0;color:var(--accent);text-transform:uppercase">Materials & tools · ${esc(m.site)}</h3>
    ${m.jobTitle ? `<div><b>${esc(m.jobTitle)}</b></div>` : ""}
    <div class="who">${owner ? esc(nameOf(m.who)) + " · " : ""}sent ${stamp(m.sentAt)}${m.needBy ? " · needed by " + shortDay(m.needBy) : ""}</div>
    ${m.notes ? `<div class="notice" style="white-space:pre-line">${esc(m.notes)}</div>` : ""}
    <div class="jtasks">${(m.items || [])
      .map(
        (
          i,
          ix,
        ) => `<div class="jtask ${i.ordered ? "done" : ""}">${owner ? `<label class="jcheck"><input type="checkbox" class="mi-ord" data-i="${ix}" ${i.ordered ? "checked" : ""} aria-label="Ordered: ${esc(i.name)}"></label>` : ""}
      <div class="jbody"><div class="jtext" style="${i.ordered ? "text-decoration:none" : ""}"><span class="tag ${i.type === "tool" ? "day" : ""}">${i.type === "tool" ? "Tool" : "Material"}</span>${esc(i.name)}</div><div class="who">${i.qty ? esc(i.qty) + " " + esc(i.unit || "") : "Quantity not given"}${i.ordered ? " · ordered" : ""}</div></div></div>`,
      )
      .join("")}</div>
    ${
      owner
        ? `<label for="mt-reply" style="margin-top:12px">Message to ${esc(nameOf(m.who))} (optional)<textarea id="mt-reply" maxlength="300" placeholder="e.g. Blocks ordered from Travis Perkins, delivery Thursday AM. Breaker is in the yard.">${esc(m.reply || "")}</textarea></label>
      <div class="actions" style="margin-top:10px"><button class="btn primary" type="button" data-s="ordered">Ordered / sorted</button><button class="btn" type="button" data-s="delivered">Delivered</button><button class="btn" type="button" data-s="cancelled">Cancel</button></div>
      <div class="actions"><button class="pillbtn" type="button" id="mt-copy">Copy list to send to supplier</button><button class="pillbtn" type="button" id="mt-pass">📤 Pass it on</button></div>`
        : `${m.reply ? `<div class="notice" style="margin-top:12px"><b>James:</b> ${esc(m.reply)}</div>` : ""}
      <div class="actions" style="margin-top:12px">${(m.status || "sent") === "sent" ? `<button class="btn" type="button" id="mt-edit">Edit list</button>` : ""}${m.status === "ordered" ? `<button class="btn primary" type="button" id="mt-got">Mark as delivered to site</button>` : ""}</div>`
    }
    <textarea id="mt-copytext" readonly hidden style="margin-top:8px;min-height:140px">${esc(matText(m))}</textarea>`);
  if ($("mt-pass")) $("mt-pass").onclick = () => matPassOn(m);
  const vb = $("viewer-body");
  vb.querySelectorAll(".mi-ord").forEach(
    (cb) =>
      (cb.onchange = async () => {
        const items = (m.items || []).map((i, ix) =>
          ix === +cb.dataset.i ? Object.assign({}, i, { ordered: cb.checked }) : i,
        );
        m.items = items;
        try {
          await S.db.doc(path).update({ items });
        } catch (e) {
          toast("Couldn't save");
          cb.checked = !cb.checked;
        }
      }),
  );
  vb.querySelectorAll("[data-s]").forEach(
    (b) =>
      (b.onclick = async () => {
        const s = b.dataset.s;
        const patch = { status: s, reply: $("mt-reply").value.trim(), answeredAt: Date.now() };
        if (s === "ordered" || s === "delivered")
          patch.items = (m.items || []).map((i) => Object.assign({}, i, { ordered: true }));
        try {
          await S.db.doc(path).update(patch);
          closeViewer();
          toast("Saved: " + MAT_ST[s][0]);
          render();
        } catch (e) {
          toast("Couldn't save");
        }
      }),
  );
  if ($("mt-copy"))
    $("mt-copy").onclick = async () => {
      const t = matText(m);
      try {
        await navigator.clipboard.writeText(t);
        toast("Copied. Paste it into an email or message to your supplier.");
      } catch (e) {
        const ta = $("mt-copytext");
        ta.hidden = false;
        ta.focus();
        ta.select();
        toast("Select all and copy from the box");
      }
    };
  if ($("mt-edit")) $("mt-edit").onclick = () => openMatEditor(m);
  if ($("mt-got"))
    $("mt-got").onclick = async () => {
      try {
        await S.db
          .doc(path)
          .update({ status: "delivered", receivedAt: Date.now(), receivedBy: myName() });
        closeViewer();
        toast("Marked as delivered");
      } catch (e) {
        toast("Couldn't save");
      }
    };
}
function receiptsCsv(m) {
  const list = allTeam("invoices")
    .filter((v) => v.kind === "receipt" && (v.date || "").startsWith(m))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) {
    toast("No receipts for that month");
    return;
  }
  const rows = [
    [
      "Date",
      "Employee",
      "Type",
      "Supplier",
      "Amount (£)",
      "Paid by",
      "Site",
      "Vehicle",
      "Litres",
      "Mileage",
      "Notes",
      "Checked",
      "Paid back",
      "Receipt photo",
    ],
  ];
  list.forEach((r) =>
    rows.push([
      r.date,
      nameOf(r.who),
      RC_TYPES[r.type] || r.type,
      r.supplier,
      r.amount ?? "",
      PAID_BY[r.paidBy] || "",
      r.site,
      r.vehicle,
      r.litres,
      r.mileage,
      r.notes,
      r.checked ? "Yes" : "No",
      r.paidBy === "own" ? (r.repaid ? "Yes" : "No") : "",
      r.fileId ? "Yes" : "No",
    ]),
  );
  rows.push([], ["Total", "", "", "", list.reduce((a, r) => a + (+r.amount || 0), 0).toFixed(2)]);
  csvSave(`Receipts - ${monthLabel(m)}.csv`, rows);
}

/* James (Nov 2026): a trade's materials or tools request comes to him, and he can pass it on – to another trade on the
   team (it lands in their Materials & tools, like a list he sends) or to someone else by text or email (a supplier,
   a driver) – but never to a client. Noted on the request. */
function matPassOn(m) {
  const team = teamIds().filter((w) => w !== m.who);
  openSheet(
    `<h3 id="sheettitle">📤 Pass on ${esc(nameOf(m.who))}'s list</h3><div class="who">${esc(m.site || "")}${m.needBy ? " · needed by " + esc(shortDay(m.needBy)) : ""} · ${(m.items || []).length} item${(m.items || []).length === 1 ? "" : "s"}. Not to clients.</div>
    <label for="mp-to">Pass it to<select id="mp-to"><option value="">Choose…</option>${team.length ? `<optgroup label="A trade on the team">${team.map((w) => `<option value="${esc(w)}">${esc(nameOf(w))}</option>`).join("")}</optgroup>` : ""}<option value="__other">Someone else – by text or email</option></select></label>
    <div id="mp-other" hidden><label for="mp-tel">Their mobile (for a text)<input id="mp-tel" type="tel" maxlength="20"></label><label for="mp-mail">or their email<input id="mp-mail" type="email" maxlength="120"></label></div>
    <label for="mp-note">Note (optional)<input id="mp-note" maxlength="200" placeholder="e.g. Can you pick these up on your way in?"></label>
    ${formFoot(false, "📤 Pass it on")}`,
    async () => {
      const to = $("mp-to").value;
      const note = $("mp-note").value.trim();
      if (!to) return showErr("Choose who to pass it to.");
      const text = (note ? note + "\n\n" : "") + matText(m);
      const path = "sheets/" + m.who + "/invoices/" + m.id;
      const passed = (m.passedTo || []).slice();
      try {
        if (to === "__other") {
          const tel = $("mp-tel").value.replace(/\s+/g, "");
          const mail = $("mp-mail").value.trim();
          if (!tel && !mail) return showErr("Put their mobile or their email.");
          window.open(
            tel
              ? "sms:" + tel + "?&body=" + encodeURIComponent(text)
              : "mailto:" +
                  mail +
                  "?subject=" +
                  encodeURIComponent("Materials for " + (m.site || "a job")) +
                  "&body=" +
                  encodeURIComponent(text),
            "_blank",
          );
          passed.push({ to: tel || mail, at: Date.now() });
        } else {
          const now = Date.now();
          await S.db.doc("sheets/" + to + "/invoices/ml-" + newId()).set({
            kind: "materials",
            site: m.site || "",
            jobId: m.jobId || "",
            jobTitle: m.jobTitle || "",
            needBy: m.needBy || "",
            urgent: !!m.urgent,
            items: (m.items || []).map((i) => Object.assign({}, i, { ordered: false })),
            notes: [note, "Passed on from " + nameOf(m.who) + "'s request"]
              .filter(Boolean)
              .join("\n"),
            status: "sent",
            reply: "",
            sentAt: now,
            created: now,
            updated: now,
            fromOwner: true,
            toName: nameOf(to),
          });
          passed.push({ to: nameOf(to), at: now });
        }
        await S.db.doc(path).update({ passedTo: passed });
        m.passedTo = passed;
        closeForm();
        toast("Passed on to " + passed[passed.length - 1].to);
      } catch (e) {
        showErr("Couldn't send it. Check your connection.");
      }
    },
    "mp-to",
  );
  $("mp-to").onchange = () => ($("mp-other").hidden = $("mp-to").value !== "__other");
}
