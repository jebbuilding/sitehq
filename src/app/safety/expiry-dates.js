/* ================= EXPIRY DATES ================= */
import { viewClient } from "../clients/quick-enquiry.js";
import { $, esc, iso, parse, shortDay, stamp, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { isImg, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf } from "../owner/owner.js";
import { wnJump } from "../owner/whats-new.js";
import { PDOC_TYPES } from "../people/personal-documents.js";
import { KINDS } from "./checklists.js";
import { ukDate } from "./rams-maker.js";
import { shrinkImage } from "./training.js";
import { openPersonMonth } from "../timesheets/monthly-sheet.js";
export {
  EQ_DATES,
  daysTo,
  dueSoonCard,
  dueSoonItems,
  dueTagN,
  eqWarn,
  initExpiryDates,
  myVehIns,
  openEqDates,
};
const EQ_DATES = {
  vehicle: [
    ["mot", "MOT"],
    ["service", "Service"],
    ["insurance", "Insurance renewal"],
    ["tax", "Road tax"],
    ["breakdown", "Breakdown cover renewal"],
    ["tacho", "Tachograph calibration (if fitted)"],
    ["lease", "Lease / finance ends"],
  ],
  digger: [
    ["loler", "LOLER thorough examination"],
    ["service", "Service"],
    ["insurance", "Insurance"],
  ],
  trailer: [["service", "Service"]],
  machine: [
    ["pat", "PAT test / inspection"],
    ["service", "Service"],
  ],
  ladder: [["inspect", "Detailed inspection"]],
  scaffold: [["tag", "Scaffold tag / handover inspection"]],
  excavation: [],
};
function daysTo(d) {
  return Math.round((parse(d) - parse(iso(new Date()))) / 864e5);
}
function dueSoonItems(scope) {
  const out = [],
    win = 30;
  S.equipment.forEach((eq) =>
    (EQ_DATES[eq.kind] || []).forEach(([k, l]) => {
      const d = eq.dates && eq.dates[k];
      if (!d) return;
      const n = daysTo(d);
      if (n <= win && (scope !== "mine" || eq.assignee === S.me))
        out.push({
          what: `${l}: ${eq.name}`,
          date: d,
          n,
          who: eq.assignee || "",
          go: ownerMode() ? () => openEqDates(eq) : null,
        });
    }),
  );
  if (scope !== "mine")
    (S.policies || [])
      .filter((p) => p.expires)
      .forEach((p) => {
        const n = daysTo(p.expires);
        if (n <= win)
          out.push({
            what: `${p.cat === "insurance" ? "Insurance" : "Document"} renewal: ${p.title}`,
            date: p.expires,
            n,
            go: () => {
              S.otab = "policies";
              store.set("jeb.otab", "policies");
              render();
              setTimeout(() => wnJump(`[data-id="${CSS.escape(p.id)}"]`), 150);
            },
          });
      });
  const certs =
    scope === "mine"
      ? S.mine.signoffs.map((x) => Object.assign({ who: S.me }, x))
      : allTeam("signoffs");
  certs
    .filter((c) => (c.type === "cert" || c.type === "persdoc") && c.expires)
    .map((c) =>
      c.type === "persdoc" ? Object.assign({}, c, { name: c.label || PDOC_TYPES[c.kind] }) : c,
    )
    .forEach((c) => {
      const n = daysTo(c.expires);
      if (n <= win)
        out.push({
          what: `${c.name}${scope === "mine" ? "" : " · " + nameOf(c.who)}`,
          date: c.expires,
          n,
          cert: true,
          go:
            scope === "mine"
              ? () => {
                  S.tab = "training";
                  store.set("jeb.tab", "training");
                  render();
                }
              : () => openPersonMonth(c.who),
        });
    });
  if (false)
    (S.clients || [])
      .filter((c) => c.follow && !["done", "lost"].includes(c.stage))
      .forEach((c) => {
        const n = daysTo(c.follow);
        if (n <= 2)
          out.push({
            what: "Follow up client: " + c.name,
            date: c.follow,
            n,
            go: () => viewClient(c),
          });
      });
  if (scope !== "mine") {
    const lb = S.settings && S.settings.lastBackup;
    if (!lb || Date.now() - lb > 30 * 864e5)
      out.push({
        what: "Back up the app (Setup › Backup)",
        date: iso(new Date()),
        n: lb ? -Math.floor((Date.now() - lb) / 864e5 - 30) : 0,
        go: () => {
          S.otab = "setup";
          store.set("jeb.otab", "setup");
          render();
          setTimeout(() => {
            const b = $("bk-go");
            if (b) {
              b.scrollIntoView({ behavior: "smooth", block: "center" });
              b.classList.add("wnflash");
              setTimeout(() => b.classList.remove("wnflash"), 2200);
            }
          }, 150);
        },
      });
  }
  return out.sort((a, b) => a.n - b.n);
}
const DS = { go: [] };
function dueTagN(n) {
  return n < 0
    ? `<span class="tag bad">${-n} day${n === -1 ? "" : "s"} overdue</span>`
    : n === 0
      ? '<span class="tag bad">Today</span>'
      : `<span class="tag ${n <= 7 ? "bad" : "day"}">In ${n} day${n === 1 ? "" : "s"}</span>`;
}
function dueSoonCard(scope) {
  const items = dueSoonItems(scope);
  if (!items.length) return "";
  return `<div class="card duesoon"><div class="cardbody" style="border:0"><div class="dayh" style="padding:0"><span style="font-family:var(--f-display);font-size:17px">${scope === "mine" ? "Coming up for you" : "Coming up in the next 30 days"}</span><span class="sum">${items.length}</span></div>
    ${((DS.go = []), "")}${items
      .slice(0, 12)
      .map((x) => {
        const g = x.go ? (DS.go.push(x.go), DS.go.length - 1) : -1;
        return g >= 0
          ? `<button type="button" class="citem dsgo" data-g="${g}"><span>${esc(x.what)}<br><span class="who">${esc(shortDay(x.date))}${x.cert && scope === "mine" ? " · renew it and add the new card in Training" : ""}</span></span><span class="dsr">${dueTagN(x.n)}<span class="wnarr" aria-hidden="true">›</span></span></button>`
          : `<div class="citem"><span>${esc(x.what)}<br><span class="who">${esc(shortDay(x.date))}</span></span>${dueTagN(x.n)}</div>`;
      })
      .join("")}
    ${scope !== "mine" ? `<div class="who">Set vehicle and plant dates in Setup (the Dates button). Cards and tickets come from each person's Training records.</div>` : ""}</div></div>`;
}
const EQ_INFO = {
  vehicle: [
    [
      "Vehicle",
      [
        ["reg", "Registration"],
        ["make", "Make and model", "e.g. Ford Transit Custom 2.0 TDCi"],
        ["year", "Year"],
        ["colour", "Colour"],
        ["vin", "VIN / chassis number"],
        ["fuel", "Fuel", "e.g. Diesel (AdBlue)"],
        ["gvw", "Gross weight / payload", "e.g. 3.5 t / 1,100 kg"],
        ["tyres", "Tyre size and pressures", "e.g. 215/65 R16, 55 psi"],
        ["keys", "Where the spare key is kept"],
      ],
    ],
    [
      "Service",
      [
        ["mileage", "Current mileage"],
        ["lastService", "Last service (date and mileage)", "e.g. 12/05/2026 at 48,200"],
        ["serviceEvery", "Service every", "e.g. 20,000 miles or 12 months"],
        ["nextMiles", "Next service due at (mileage)"],
        ["garage", "Garage", "name and phone"],
      ],
    ],
    [
      "Insurance",
      [
        ["insurer", "Insurer"],
        ["policy", "Policy number"],
        ["insPhone", "Claims phone number"],
        ["insCover", "Cover", "e.g. Fully comp, business use, any driver over 25"],
      ],
    ],
    [
      "Breakdown",
      [
        ["bdProvider", "Breakdown provider", "e.g. AA, RAC, Green Flag"],
        ["bdNumber", "Membership / policy number"],
        ["bdPhone", "Breakdown phone number"],
        ["bdCover", "Cover", "e.g. Roadside, recovery, at home, Europe"],
      ],
    ],
    [
      "Other",
      [
        ["lessor", "Lease / finance company"],
        ["fuelCard", "Fuel card (provider and card number, never the PIN)"],
        ["tracker", "Tracker / dash cam"],
        ["notes", "Notes"],
      ],
    ],
  ],
  digger: [
    [
      "Machine",
      [
        ["make", "Make and model"],
        ["serial", "Serial number"],
        ["year", "Year"],
        ["hours", "Hour meter reading"],
        ["hired", "Owned or hired (hire company and phone)"],
        ["garage", "Service engineer"],
        ["notes", "Notes"],
      ],
    ],
  ],
  trailer: [
    [
      "Trailer",
      [
        ["make", "Make and model"],
        ["serial", "Serial / chassis number"],
        ["gvw", "Gross weight"],
        ["tyres", "Tyre size and pressures"],
        ["notes", "Notes"],
      ],
    ],
  ],
  machine: [
    [
      "Machine",
      [
        ["make", "Make and model"],
        ["serial", "Serial number"],
        ["hired", "Owned or hired"],
        ["notes", "Notes"],
      ],
    ],
  ],
};
const EQ_FILES = {
  vehicle: [
    ["insurance", "Insurance certificate"],
    ["v5", "V5C logbook"],
    ["mot", "MOT certificate"],
    ["service", "Service history / invoices"],
    ["breakdown", "Breakdown cover"],
    ["lease", "Lease / finance agreement"],
    ["other", "Other"],
  ],
  digger: [
    ["loler", "LOLER certificate"],
    ["service", "Service record"],
    ["insurance", "Insurance"],
    ["manual", "Operator's manual"],
    ["other", "Other"],
  ],
  trailer: [
    ["service", "Service record"],
    ["other", "Other"],
  ],
  machine: [
    ["pat", "PAT / inspection certificate"],
    ["manual", "Manual"],
    ["other", "Other"],
  ],
  ladder: [["other", "Inspection record"]],
  scaffold: [["other", "Scaffold handover certificate"]],
};
/* the trade's own vehicles / machines: insurance, breakdown and documents to hand */
function myVehIns() {
  const tel = (v) => {
    const n = String(v || "").replace(/[^\d+]/g, "");
    return n.length >= 6 ? `<a href="tel:${esc(n)}">${esc(v)}</a>` : esc(v);
  };
  const view = (x) => {
    const i = x.info || {},
      d = x.dates || {},
      rows = [];
    (EQ_INFO[x.kind] || []).forEach(([g, fs]) => {
      if (!eqShows(x, "g:" + g)) return;
      fs.forEach(([k, l]) => {
        if (i[k]) rows.push([l, /phone|Phone/.test(k) ? tel(i[k]) : esc(i[k])]);
      });
    });
    if (eqShows(x, "dates"))
      (EQ_DATES[x.kind] || []).forEach(([k, l]) => {
        if (d[k]) rows.push([l + " due", esc(ukDate(d[k]))]);
      });
    const files = (x.files || []).map((f, k) => [f, k]).filter(([f]) => eqShows(x, "f:" + f.kind));
    return { rows, files };
  };
  const mine = (S.equipment || [])
    .filter((x) => x.assignee === S.me)
    .map((x) => [x, view(x)])
    .filter(([, v]) => v.rows.length || v.files.length);
  if (!mine.length || !$("main")) return;
  $("main").insertAdjacentHTML(
    "afterbegin",
    mine
      .map(([x, v]) => {
        const FT = EQ_FILES[x.kind] || [];
        return `<details class="card myveh" open><summary><div class="nm">🚐 ${esc(x.name)}<small>${esc((KINDS[x.kind] || {}).name || "")}${eqShows(x, "dates") ? eqWarn(x) : ""}</small></div></summary><div class="cardbody"><div class="details">${v.rows.map(([l, val]) => `<div class="drow"><span>${esc(l)}</span><span>${val}</span></div>`).join("")}</div>
      ${v.files.length ? `<div class="actions">${v.files.map(([f, k]) => `<button type="button" class="btn mv-f" data-e="${esc(x.id)}" data-i="${k}">📄 ${esc((FT.find((t) => t[0] === f.kind) || [, "Document"])[1])}</button>`).join("")}</div>` : ""}</div></details>`;
      })
      .join(""),
  );
  $("main")
    .querySelectorAll(".mv-f")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const x = S.equipment.find((y) => y.id === b.dataset.e);
          const f = x && (x.files || [])[+b.dataset.i];
          if (f) openFile(f.assetId, f.name, f.type);
        }),
    );
}
/* what the person using a vehicle / machine sees: groups of details, due dates, each kind of document */
const EQ_SHOW_DEF = (k) => !/^g:(Other|Service)$/.test(k);
const eqShows = (x, k) => {
  const sh = x.show || {};
  return sh[k] != null ? !!sh[k] : EQ_SHOW_DEF(k);
};
function eqWarn(x) {
  const d = x.dates || {};
  const n = Object.values(d)
    .map(daysTo)
    .filter((v) => v <= 30);
  if (!n.length) return "";
  return Math.min(...n) < 0
    ? ' <span class="tag bad">Overdue</span>'
    : ' <span class="tag day">Due soon</span>';
}
function openEqDates(eq) {
  const ds = EQ_DATES[eq.kind] || [];
  const cur = eq.dates || {};
  const info = Object.assign({}, eq.info || {});
  const groups = EQ_INFO[eq.kind] || [];
  const FT = EQ_FILES[eq.kind] || [["other", "Document"]];
  let files = (eq.files || []).slice(),
    log = (eq.log || []).slice();
  const veh = eq.kind === "vehicle";
  const fileRows = () =>
    files.length
      ? files
          .map(
            (f, i) =>
              `<div class="attrow"><button type="button" class="linkbtn ef-open" data-i="${i}">📄 ${esc((FT.find((t) => t[0] === f.kind) || [, "Document"])[1])}${f.note ? " · " + esc(f.note) : ""}<span class="who"> · ${esc(stamp(f.at))}</span></button><button type="button" class="linkdanger ef-del" data-i="${i}">Remove</button></div>`,
          )
          .join("")
      : '<div class="who">No documents yet.</div>';
  const logRows = () =>
    log.length
      ? log
          .slice()
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .map(
            (l) =>
              `<div class="attrow"><span><b>${esc(ukDate(l.date))}</b> · ${esc(l.what)}${l.miles ? " · " + esc(l.miles) + (veh ? " miles" : "") : ""}${l.cost ? " · £" + esc(l.cost) : ""}${l.by ? " · " + esc(l.by) : ""}</span><button type="button" class="linkdanger el-del" data-id="${esc(l.id)}">Remove</button></div>`,
          )
          .join("")
      : '<div class="who">Nothing logged yet.</div>';
  openSheet(
    `<h3 id="sheettitle">${esc(eq.name)}</h3><div class="who">${esc((KINDS[eq.kind] || {}).name || "")}${eq.assignee ? " · used by " + esc(nameOf(eq.assignee)) : ""}</div>
    ${ds.length ? `<div class="flabel">📅 Due dates</div><div class="who">You get a warning 30 days before each one${eq.assignee ? ", and so will " + esc(nameOf(eq.assignee)) : ""}.</div><div class="grid2">${ds.map(([k, l]) => `<label for="ed-${k}">${esc(l)}<input id="ed-${k}" type="date" value="${esc(cur[k] || "")}"></label>`).join("")}</div>` : ""}
    ${groups.map(([g, fs]) => `<div class="flabel">${esc(g)}</div><div class="grid2">${fs.map(([k, l, ph]) => `<label for="ei-${k}">${esc(l)}${k === "notes" ? `<textarea id="ei-${k}" maxlength="600">${esc(info[k] || "")}</textarea>` : `<input id="ei-${k}" maxlength="120" value="${esc(info[k] || "")}" placeholder="${esc(ph || "")}" ${/phone|Phone/.test(k) ? 'type="tel"' : ""}>`}</label>`).join("")}</div>`).join("")}
    <div class="flabel">📎 Documents</div><div id="ef-list">${fileRows()}</div>
    <div class="grid2" style="align-items:end"><label for="ef-kind">Type<select id="ef-kind">${FT.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label><label for="ef-file">File (PDF or photo)<input id="ef-file" type="file" accept="application/pdf,image/*"></label></div><div class="who" id="ef-prog"></div>
    <div class="flabel">🔧 Service, repairs &amp; MOT history</div><div id="el-list">${logRows()}</div>
    <div class="grid2"><label for="el-date">Date<input id="el-date" type="date" value="${iso(new Date())}"></label><label for="el-what">What was done<input id="el-what" maxlength="120" placeholder="e.g. Full service, 2 front tyres, MOT pass"></label></div>
    <div class="grid2"><label for="el-miles">${veh ? "Mileage" : "Hours / reading"}<input id="el-miles" inputmode="numeric" maxlength="12"></label><label for="el-cost">Cost £ (optional)<input id="el-cost" inputmode="decimal" maxlength="12"></label></div>
    <div class="grid2"><label for="el-by">Garage / who did it<input id="el-by" maxlength="80"></label><div style="display:flex;align-items:end"><button type="button" class="btn" id="el-add">+ Add to history</button></div></div>
    <div class="flabel">👷 What ${eq.assignee ? esc(nameOf(eq.assignee)) : "the driver / user"} can see</div><div class="who">Shown on their Reports tab when this ${veh ? "vehicle" : "machine"} is set to them. Untick anything you'd rather keep to yourself.</div>
    <div class="eqshow">${(ds.length ? [["dates", "📅 Due dates"]] : [])
      .concat(
        groups.map(([g]) => ["g:" + g, g]),
        FT.map(([k, l]) => ["f:" + k, "📎 " + l]),
      )
      .map(
        ([k, l]) =>
          `<label class="tick"><input type="checkbox" class="eqsh" data-k="${esc(k)}" ${eqShows(eq, k) ? "checked" : ""}> <span>${esc(l)}</span></label>`,
      )
      .join("")}</div>
    ${formFoot(false, "Save")}`,
    async () => {
      const dates = {};
      ds.forEach(([k]) => {
        const v = $("ed-" + k).value;
        if (v) dates[k] = v;
      });
      const inf = {};
      groups.forEach(([, fs]) =>
        fs.forEach(([k]) => {
          const v = $("ei-" + k).value.trim();
          if (v) inf[k] = v;
        }),
      );
      const show = {};
      document.querySelectorAll(".eqsh").forEach((c) => {
        show[c.dataset.k] = c.checked;
      });
      const up = { dates, info: inf, files, log, show };
      if (inf.mileage && veh) up.mileageAt = Date.now();
      try {
        await S.db.doc("equipment/" + eq.id).update(up);
        Object.assign(eq, up);
        closeForm();
        toast("Saved");
        render();
      } catch (e) {
        showErr("Couldn't save.");
      }
    },
    null,
  );
  const wire = () => {
    $("ef-list")
      .querySelectorAll(".ef-open")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const f = files[+b.dataset.i];
            openFile(f.assetId, f.name, f.type);
          }),
      );
    $("ef-list")
      .querySelectorAll(".ef-del")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Tap again";
              return;
            }
            const f = files.splice(+b.dataset.i, 1)[0];
            if (f && S.assets) S.assets.delete(f.assetId).catch(() => {});
            $("ef-list").innerHTML = fileRows();
            wire();
          }),
      );
    $("el-list")
      .querySelectorAll(".el-del")
      .forEach(
        (b) =>
          (b.onclick = () => {
            log = log.filter((l) => l.id !== b.dataset.id);
            $("el-list").innerHTML = logRows();
            wire();
          }),
      );
  };
  wire();
  $("ef-file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!S.assets) {
      toast("You don't have permission to upload");
      return;
    }
    $("ef-prog").textContent = "Uploading…";
    try {
      const img = isImg(f.type) && !/svg/.test(f.type);
      const a = await uploadFile(img ? await shrinkImage(f, 2400) : f, f.name);
      files.push({
        kind: $("ef-kind").value,
        assetId: a.id,
        name: f.name,
        type: img ? "image/jpeg" : f.type || "application/pdf",
        at: Date.now(),
      });
      $("ef-list").innerHTML = fileRows();
      wire();
      $("ef-prog").textContent = "Added. Tap Save to keep it.";
      e.target.value = "";
    } catch (x) {
      $("ef-prog").textContent = "Couldn't upload. Check your connection.";
    }
  };
  $("el-add").onclick = () => {
    const what = $("el-what").value.trim();
    if (!what) {
      toast("Say what was done");
      return;
    }
    log.push({
      id: newId(),
      date: $("el-date").value,
      what,
      miles: $("el-miles").value.trim(),
      cost: $("el-cost")
        .value.trim()
        .replace(/[£,\s]/g, ""),
      by: $("el-by").value.trim(),
    });
    if (veh && $("el-miles").value.trim() && $("ei-mileage") && !$("ei-mileage").value)
      $("ei-mileage").value = $("el-miles").value.trim();
    if (/service/i.test(what) && $("ei-lastService"))
      $("ei-lastService").value =
        ukDate($("el-date").value) +
        ($("el-miles").value.trim() ? " at " + $("el-miles").value.trim() : "");
    if (/\bmot\b/i.test(what) && /pass/i.test(what) && $("ed-mot")) {
      const d = new Date($("el-date").value);
      d.setFullYear(d.getFullYear() + 1);
      d.setDate(d.getDate() - 1);
      $("ed-mot").value = iso(d);
    }
    ["el-what", "el-miles", "el-cost", "el-by"].forEach((id) => ($(id).value = ""));
    $("el-list").innerHTML = logRows();
    wire();
    toast("Added. Tap Save to keep it.");
  };
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initExpiryDates() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".dsgo");
    if (!b) return;
    const f = DS.go[+b.dataset.g];
    if (f)
      try {
        f();
      } catch (x) {
        toast("Couldn't open that");
      }
  });
}
