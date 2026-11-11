/* ================= PLANNING LEADS (owner only): moved in from the Devon Planning Leads page ================= */
import { $, esc, iso, store, toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { curTab, render } from "../core/tabs-week.js";
import { loadZip } from "./backup.js";
import { coData } from "./company-details.js";
import { ownerDisplayName } from "./owner.js";
export { LEADS };
const LEADS = (() => {
  const CATS = [
    [
      "two",
      "Two-storey & big remodels",
      "Homeowner. Biggest jobs; usually choosing a builder now.",
    ],
    ["single", "Single-storey extensions", "Homeowner. Kitchen, rear and side extensions."],
    ["loft", "Lofts & dormers", "Homeowner. Loft conversions, dormers, roof raises."],
    [
      "outbuilding",
      "Garages, garden rooms & annexes",
      "Homeowner. Outbuildings and annexe conversions.",
    ],
    ["small", "Porches & small alterations", "Homeowner. Quick jobs and porches."],
    [
      "conversion",
      "Conversions & change of use",
      "Owner or small developer. Barns, flats back to houses, HMOs.",
    ],
    [
      "newbuild",
      "New homes (small sites)",
      "Self-builders and small developers. Write to the applicant.",
    ],
    ["roof", "Roofing & solar", "Owner. Re-roofs, chimneys, solar panels."],
    ["windows", "Windows, doors & external works", "Owner. Windows, render, cladding, driveways."],
    [
      "commercial",
      "Commercial & larger schemes",
      "Business or developer. Write to the applicant or agent.",
    ],
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c[0], c]));
  const SMALL = new Set(["small", "windows", "roof"]);
  const COUNCILS = ["East Devon", "Exeter", "Teignbridge"];
  const HOMEOWNER = new Set(["two", "single", "loft", "outbuilding", "small", "roof", "windows"]);
  const OUTCOMES = [
    ["", "Outcome…"],
    ["replied", "Replied"],
    ["quoted", "Quoted"],
    ["won", "Won"],
    ["lost", "No luck"],
  ];
  const OUT_NAME = Object.fromEntries(OUTCOMES);
  const PROJECT = {
    two: "a two-storey extension",
    single: "a single-storey extension",
    loft: "a loft conversion",
    outbuilding: "a garage, garden building or annexe",
    small: "a porch or alterations",
    roof: "roofing work",
    windows: "new windows and external works",
    conversion: "a conversion",
    newbuild: "a new home",
    commercial: "building works",
  };
  const HOME = [50.62, -3.405];
  const OUTCODE = {
    EX1: [50.727, -3.505],
    EX2: [50.708, -3.52],
    EX3: [50.684, -3.466],
    EX4: [50.737, -3.545],
    EX5: [50.755, -3.42],
    EX6: [50.66, -3.555],
    EX7: [50.582, -3.468],
    EX8: [50.622, -3.405],
    EX9: [50.632, -3.32],
    EX10: [50.682, -3.24],
    EX11: [50.752, -3.282],
    EX12: [50.706, -3.072],
    EX13: [50.782, -3.0],
    EX14: [50.8, -3.19],
    EX15: [50.858, -3.39],
    EX16: [50.903, -3.488],
    EX17: [50.79, -3.655],
    EX24: [50.742, -3.07],
    DT7: [50.727, -2.945],
    TA3: [50.95, -3.05],
    TQ1: [50.47, -3.52],
    TQ9: [50.43, -3.69],
    TQ11: [50.482, -3.775],
    TQ12: [50.528, -3.61],
    TQ13: [50.59, -3.7],
    TQ14: [50.548, -3.498],
  };
  const TOWN = {
    "Lympstone": "EX8",
    "Seaton": "EX12",
    "Bishopsteignton": "TQ14",
    "Teignmouth": "TQ14",
    "Exeter": "EX2",
    "Kenton": "EX6",
    "Cockwood": "EX6",
    "Dawlish": "EX7",
    "Exmouth": "EX8",
    "Sidmouth": "EX10",
    "Honiton": "EX14",
    "Axminster": "EX13",
    "Newton Abbot": "TQ12",
    "Kingsteignton": "TQ12",
    "Huxham": "EX5",
    "Whimple": "EX5",
    "Woodbury": "EX5",
  };
  const LETTER_NAME = { homeowner: "Homeowner letter", original: "Original letter" };
  function miles(r) {
    let oc = (r.postcode || "").split(" ")[0];
    if (!OUTCODE[oc]) oc = TOWN[r.town] || "";
    const c = OUTCODE[oc];
    if (!c) return null;
    const R = 3958.8,
      rad = (x) => (x * Math.PI) / 180,
      dLat = rad(c[0] - HOME[0]),
      dLon = rad(c[1] - HOME[1]);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(HOME[0])) * Math.cos(rad(c[0])) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
  }
  const L = {
    rows: [],
    loaded: false,
    sub: null,
    month: "",
    council: new Set(COUNCILS),
    cat: null,
    picked: new Set(),
    pending: [],
    status: "",
    savedOnly: false,
    view: "leads",
    sentMonth: "all",
    sentCouncil: "",
    lastStyle: "",
    meta: null,
    hideSent: store.get("jeb.ld.hideSent", false),
    within: store.get("jeb.ld.within", 0),
    skipSmall: store.get("jeb.ld.skipSmall", false),
    style: store.get("jeb.ld.style", "homeowner"),
  };
  const col = () => "data/users/" + S.me + "/leads/apps";
  const monthName = (m) => {
    if (m === "all") return "All months";
    const [y, mo] = m.split("-");
    return new Date(+y, +mo - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };
  const fmtD = (d) =>
    d
      ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : "";
  const fmtLong = (d) =>
    d
      ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
  function hot(r) {
    return r.status === "Approved" || /\/(LPD|CLDP|CPL|PD|GPD)$/.test(r.ref);
  }
  function statusOf(r) {
    const s = (r.status || "Pending").toLowerCase();
    if (s.startsWith("approv") || s.includes("granted") || s.includes("permitted"))
      return { k: "ok", t: "Approved" };
    if (s.startsWith("refus")) return { k: "no", t: "Refused" };
    if (s.startsWith("withdr")) return { k: "no", t: "Withdrawn" };
    if (s.startsWith("pend") || s.startsWith("await")) return { k: "wait", t: "Awaiting decision" };
    return { k: "other", t: r.status };
  }
  function monthOf(r) {
    return L.status === "ok" && r.statusDate ? r.statusDate.slice(0, 7) : r.month;
  }
  function filtered(o = {}) {
    return L.rows.filter(
      (r) =>
        (L.savedOnly ? r.saved : L.month === "all" || monthOf(r) === L.month) &&
        L.council.has(r.council) &&
        (!L.status || statusOf(r).k === L.status) &&
        (o.keepSent || !L.hideSent || !r.sent) &&
        (!L.within || (r._mi != null && r._mi <= L.within)) &&
        (!L.skipSmall || !SMALL.has(r.category)) &&
        (o.ignoreCat || !L.cat || r.category === L.cat),
    );
  }
  function start() {
    if (L.sub || !S.db || !S.me) return;
    L.sub = true;
    S.db.collection(col()).onSnapshot(
      (snap) => {
        L.rows = snap.docs.map((d) => {
          const r = Object.assign({}, d.data(), { _id: d.id });
          r._mi = miles(r);
          return r;
        });
        L.loaded = true;
        if (curTab() === "leads" && ownerMode()) render();
      },
      () => {
        L.loaded = true;
        L.err = true;
        if (curTab() === "leads") render();
      },
    );
    S.db.doc("data/users/" + S.me + "/leads/meta/status").onSnapshot(
      (s) => {
        L.meta = s.exists ? s.data() : null;
        if (curTab() === "leads" && ownerMode()) {
          const el = $("ld-meta");
          if (el) el.textContent = metaText();
        }
      },
      () => {},
    );
  }
  function metaText() {
    const m = L.meta;
    return m && m.lastRun
      ? `Last checked ${new Date(m.lastRun).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${m.lastAdded != null ? ` · ${m.lastAdded} new` : ""}`
      : L.rows.length
        ? `${L.rows.length} applications`
        : "Waiting for data…";
  }
  function months() {
    return [
      ...new Set(
        L.rows
          .map((r) => r.month)
          .concat(L.rows.filter((r) => r.statusDate).map((r) => r.statusDate.slice(0, 7))),
      ),
    ]
      .sort()
      .reverse();
  }
  function view() {
    start();
    if (!L.loaded) {
      $("main").innerHTML =
        `<div class="nothing" style="padding:30px;text-align:center">Loading leads…</div>`;
      return;
    }
    const ms = months();
    if (!L.month || (L.month !== "all" && !ms.includes(L.month))) L.month = ms[0] || "all";
    const all = L.rows.filter((r) => r.sent);
    const ns = L.rows.filter((r) => r.saved).length;
    let h = `<div class="who" style="margin-bottom:8px">New planning applications in East Devon, Exeter and Teignbridge, sorted by the kind of building work, so you can see who to write to each month. <span id="ld-meta">${esc(metaText())}</span></div>
  <div class="seg ld-tabs" role="tablist"><button type="button" class="pillbtn" data-v="leads" aria-pressed="${L.view === "leads"}">Leads</button><button type="button" class="pillbtn" data-v="sent" aria-pressed="${L.view === "sent"}">Letters sent${all.length ? " (" + all.length + ")" : ""}</button></div>`;
    if (L.view === "sent") {
      h += sentHtml(all);
      $("main").innerHTML = h;
      wireSent();
      return;
    }
    const base = filtered({ ignoreCat: true });
    const rows = filtered();
    h += `<div class="ld-bar">
    <select id="ld-month" aria-label="Month" ${L.savedOnly ? "disabled" : ""}>${ms
      .concat("all")
      .map(
        (m) => `<option value="${m}" ${m === L.month ? "selected" : ""}>${monthName(m)}</option>`,
      )
      .join("")}</select>
    <div class="seg">${COUNCILS.map((c) => `<button type="button" class="pillbtn ld-c" data-c="${c}" aria-pressed="${L.council.has(c)}">${c}</button>`).join("")}</div>
    <select id="ld-within" aria-label="Distance from Exmouth">${[0, 5, 10, 15, 20, 30].map((n) => `<option value="${n}" ${L.within === n ? "selected" : ""}>${n ? "Within " + n + " miles" : "Any distance"}</option>`).join("")}</select>
    <select id="ld-status" aria-label="Status"><option value="">Any status</option><option value="wait" ${L.status === "wait" ? "selected" : ""}>Awaiting decision</option><option value="ok" ${L.status === "ok" ? "selected" : ""}>Approved (by month approved)</option><option value="no" ${L.status === "no" ? "selected" : ""}>Refused or withdrawn</option></select>
    <label class="ld-tog"><input type="checkbox" id="ld-saved" ${L.savedOnly ? "checked" : ""}> Saved only${ns ? " (" + ns + ")" : ""}</label>
    <label class="ld-tog"><input type="checkbox" id="ld-small" ${L.skipSmall ? "checked" : ""}> Skip small jobs</label>
    <label class="ld-tog"><input type="checkbox" id="ld-hide" ${L.hideSent ? "checked" : ""}> Hide letters sent</label></div>
  <div class="actions" style="margin-top:8px"><select id="ld-style" aria-label="Which letter"><option value="homeowner" ${L.style === "homeowner" ? "selected" : ""}>Homeowner letter</option><option value="original" ${L.style === "original" ? "selected" : ""}>Original letter (architects)</option></select>
    <button type="button" class="btn primary" id="ld-letters">${L.picked.size ? `Download ${L.picked.size} letter${L.picked.size === 1 ? "" : "s"} (Word)` : "Download letters (Word)"}</button><button type="button" class="btn" id="ld-csv">Mailing list (CSV)</button><button type="button" class="btn" id="ld-copy">Copy addresses</button></div>
  <div class="actions" style="margin-top:6px"><span class="who">${L.picked.size ? `<b>${L.picked.size}</b> ticked` : "Tick the leads you want letters for."}</span><button type="button" class="btn" id="ld-all">Tick everything shown</button><button type="button" class="btn" id="ld-none" ${L.picked.size ? "" : "disabled"}>Clear ticks</button></div>
  <div class="notice" id="ld-confirm" ${L.pending.length ? "" : "hidden"} style="margin-top:8px;display:${L.pending.length ? "flex" : "none"};gap:8px;flex-wrap:wrap;align-items:center"><span>Mark these ${L.pending.length} letters as sent?</span><button type="button" class="btn primary" id="ld-yes">Mark as sent</button><button type="button" class="btn" id="ld-no">Not yet</button></div>
  <textarea id="ld-text" readonly hidden aria-label="Text to copy" style="width:100%;min-height:110px;margin-top:8px;font-family:ui-monospace,monospace;font-size:12px"></textarea>
  ${resultsHtml()}
  <div class="ld-tiles">${CATS.map(([k, l, w]) => {
    const n = base.filter((r) => r.category === k).length;
    return `<button type="button" class="ld-tile ${n ? "" : "zero"}" data-k="${k}" aria-pressed="${L.cat === k}"><span class="n">${n}</span><span class="l">${l}</span><span class="w">${esc(w.split(".")[0])}</span></button>`;
  }).join("")}</div>
  <p class="who" style="margin:0 0 12px">Tap a type to show only those. <b>Hot</b> means approved or a lawful-development certificate, so the owner is likely to start soon. <b>☆ Save</b> keeps a lead for later; <b>Saved only</b> shows them from every month. Status is updated each week by the Monday check. Distances are straight-line from Exmouth, by postcode area.</p>`;
    if (L.err)
      h += `<div class="empty">Couldn't load the leads. Reload the page to try again.</div>`;
    else if (!L.rows.length)
      h += `<div class="empty">No applications loaded yet. The weekly check adds new ones from all three councils automatically.</div>`;
    else if (!rows.length)
      h += `<div class="empty">${L.savedOnly ? "No saved leads yet. Tap ☆ Save on any lead to keep it here." : "Nothing matches these filters for " + esc(monthName(L.month)) + "."}</div>`;
    else
      for (const [k, l, w] of CATS) {
        const g = rows
          .filter((r) => r.category === k)
          .sort((a, b) => hot(b) - hot(a) || b.date.localeCompare(a.date));
        if (!g.length) continue;
        const allIn = g.every((r) => L.picked.has(r._id));
        h +=
          `<section class="ld-cat"><h2>${l}<span class="c">${g.length}</span><button type="button" class="btn ld-cp" data-k="${k}" aria-pressed="${allIn}">${allIn ? `Untick these ${g.length}` : `Tick all ${g.length}`}</button></h2><p class="who" style="margin:2px 0 8px">${esc(w)}</p><div class="ld-list">` +
          g.map(card).join("") +
          `</div></section>`;
      }
    $("main").innerHTML = h;
    wire();
  }
  function card(r) {
    const st = statusOf(r);
    const id = esc(r._id);
    return `<article class="ld-card ${r.sent ? "sent" : ""} ${r.outcome ? "has-outcome" : ""} ${L.picked.has(r._id) ? "picked" : ""} ${r.saved ? "saved" : ""}">
    <div class="top-row"><input type="checkbox" class="ld-pick" id="ldp-${id}" data-id="${id}" ${L.picked.has(r._id) ? "checked" : ""} aria-label="Make a letter for ${esc(r.address)}"><label class="addr" for="ldp-${id}">${esc(r.address)}</label><button type="button" class="ld-save" data-id="${id}" aria-pressed="${!!r.saved}">${r.saved ? "★ Saved" : "☆ Save"}</button></div>
    <div class="desc">${esc(r.desc)}</div>
    <div class="meta"><span class="ld-st ${st.k}">${esc(st.t)}${r.statusDate && st.k !== "wait" ? " " + fmtD(r.statusDate) : ""}</span>${r.outcome === "won" ? '<span class="ld-pill won">Won</span>' : ""}${hot(r) ? '<span class="ld-pill hot">Hot</span>' : ""}<span class="ld-pill">${esc(r.council)}</span>${r.link ? `<a class="ref" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.ref)}</a>` : `<span class="ref">${esc(r.ref)}</span>`}<span>${fmtD(r.date)}</span>${r.town ? `<span>${esc(r.town)}</span>` : ""}${r._mi != null ? `<span>${r._mi} mi</span>` : ""}</div>
    <div class="row">${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">View on council site ↗</a>` : "<span></span>"}<span class="track">${r.sent ? `<select class="ld-out" data-id="${id}" aria-label="Outcome">${OUTCOMES.map(([v, t]) => `<option value="${v}" ${(r.outcome || "") === v ? "selected" : ""}>${t}</option>`).join("")}</select>` : ""}<button type="button" class="btn ld-sent" data-id="${id}" aria-pressed="${!!r.sent}">${r.sent ? "Sent ✓" : "Mark letter sent"}</button></span></div></article>`;
  }
  function resultsHtml() {
    const rows = filtered({ keepSent: true, ignoreCat: true });
    const cnt = (l, f) => l.filter(f).length;
    const line = (label, list) => {
      const sent = cnt(list, (r) => r.sent),
        rep = cnt(list, (r) => ["replied", "quoted", "won"].includes(r.outcome)),
        q = cnt(list, (r) => ["quoted", "won"].includes(r.outcome)),
        w = cnt(list, (r) => r.outcome === "won");
      return {
        label,
        sent,
        rep,
        q,
        w,
        html: `<td>${label}</td><td>${sent}</td><td>${rep}</td><td>${q}</td><td>${w}</td><td>${sent ? Math.round((rep / sent) * 100) + "%" : "–"}</td>`,
      };
    };
    const per = CATS.map(([k, l]) =>
      line(
        l,
        rows.filter((r) => r.category === k),
      ),
    ).filter((x) => x.sent);
    const tot = line("All types", rows);
    return `<details class="ld-results"><summary>Results <span class="who">${tot.sent ? `${tot.sent} letters sent · ${tot.rep} replied · ${tot.q} quoted · ${tot.w} won · ${esc(monthName(L.month))}` : `No letters marked as sent for ${esc(monthName(L.month))} yet`}</span></summary><div class="tablewrap" style="padding:0 12px 12px">${tot.sent ? `<table class="ld-tbl"><thead><tr><th>Type of job</th><th>Sent</th><th>Replied</th><th>Quoted</th><th>Won</th><th>Reply rate</th></tr></thead><tbody>${per.map((x) => `<tr>${x.html}</tr>`).join("")}</tbody><tfoot><tr>${tot.html}</tr></tfoot></table>` : `<p class="who" style="margin:0">Mark letters as sent, then record replies, quotes and wins on each card. This table shows which types of job turn into work.</p>`}</div></details>`;
  }
  function sentRows(all) {
    return all
      .filter(
        (r) =>
          (L.sentMonth === "all" || (r.sentDate || "").slice(0, 7) === L.sentMonth) &&
          (!L.sentCouncil || r.council === L.sentCouncil),
      )
      .sort(
        (a, b) =>
          (b.sentDate || "").localeCompare(a.sentDate || "") || a.address.localeCompare(b.address),
      );
  }
  function sentHtml(all) {
    const ms = [...new Set(all.map((r) => (r.sentDate || "").slice(0, 7)).filter(Boolean))]
      .sort()
      .reverse();
    if (L.sentMonth !== "all" && !ms.includes(L.sentMonth)) L.sentMonth = "all";
    const rows = sentRows(all);
    let h = `<div class="ld-bar"><select id="ld-sm" aria-label="Month sent">${["all"]
      .concat(ms)
      .map(
        (m) =>
          `<option value="${m}" ${m === L.sentMonth ? "selected" : ""}>${m === "all" ? "All months sent" : "Sent in " + monthName(m)}</option>`,
      )
      .join(
        "",
      )}</select><select id="ld-sc" aria-label="Council"><option value="">All councils</option>${COUNCILS.map((c) => `<option ${L.sentCouncil === c ? "selected" : ""}>${c}</option>`).join("")}</select><span style="flex:1"></span><button type="button" class="btn primary" id="ld-xlsx" ${rows.length ? "" : "disabled"}>Download spreadsheet (Excel)</button></div><p class="who" style="margin:6px 0 10px">Every letter you mark as sent is recorded here with the date, so you can look back at who you wrote to.</p>`;
    if (!all.length)
      return (
        h +
        `<div class="empty">No letters recorded yet. Mark letters as sent on the Leads view, or tap “Mark as sent” after downloading letters, and they'll be listed here.</div>`
      );
    if (!rows.length) return h + `<div class="empty">No letters match these filters.</div>`;
    return (
      h +
      `<div class="card" style="overflow-x:auto"><table class="ld-tbl log"><thead><tr><th>Date sent</th><th>Address</th><th>Type of job</th><th>Planning ref</th><th>Council</th><th>Letter</th><th>Planning status</th><th>Outcome</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${fmtLong(r.sentDate)}</td><td class="wrap">${esc(r.address)}<br><span class="who">${esc(r.desc)}</span></td><td>${esc(CAT[r.category]?.[1] || r.category)}</td><td>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.ref)}</a>` : esc(r.ref)}</td><td>${esc(r.council)}</td><td>${esc(LETTER_NAME[r.letter] || "–")}</td><td>${esc(statusOf(r).t)}${r.statusDate && statusOf(r).k !== "wait" ? " " + fmtD(r.statusDate) : ""}</td><td><select class="ld-out" data-id="${esc(r._id)}" aria-label="Outcome">${OUTCOMES.map(([v, t]) => `<option value="${v}" ${(r.outcome || "") === v ? "selected" : ""}>${t}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`
    );
  }
  async function upd(id, data) {
    await S.db.doc(col() + "/" + id).update(data);
  }
  async function saveFile(name, data) {
    if (S.dl) {
      try {
        await S.dl.save({ filename: name, data });
      } catch (e) {
        if (!(e && (e.code === "declined" || e.code === "cancelled"))) throw e;
      }
      return;
    }
    const blob = data instanceof Blob ? data : new Blob([data]);
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  function showText(t) {
    const el = $("ld-text");
    if (!el) return;
    el.hidden = false;
    el.value = t;
    el.focus();
    el.select();
  }
  function pickedRows() {
    return L.rows.filter((r) => L.picked.has(r._id));
  }
  function mailRows() {
    return (L.picked.size ? pickedRows() : filtered()).map((r) => ({
      to: HOMEOWNER.has(r.category) ? "The Homeowner" : "The Applicant",
      address: r.address,
      postcode: r.postcode,
      type: CAT[r.category]?.[1] || r.category,
      ref: r.ref,
      council: r.council,
      date: r.date,
      miles: r._mi ?? "",
      desc: r.desc,
      link: r.link,
    }));
  }
  function csv() {
    const rows = mailRows();
    const cols = [
      "to",
      "address",
      "postcode",
      "type",
      "ref",
      "council",
      "date",
      "miles",
      "desc",
      "link",
    ];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [cols.join(",")]
      .concat(rows.map((r) => cols.map((c) => q(r[c])).join(",")))
      .join("\r\n");
  }
  function addrLines(addr) {
    let parts = addr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const m = last.match(/\s*([A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2})$/);
    if (m) {
      const town = last.slice(0, m.index).trim();
      parts = parts.slice(0, -1).concat(town ? [town] : [], [m[1]]);
    }
    return { lines: parts, street: (m ? parts.slice(0, -1) : parts).join(", ") };
  }
  /* Word letters */
  let TPL = null;
  async function loadTemplate() {
    if (TPL) return TPL;
    await loadZip();
    const res = await fetch("template.json");
    if (!res.ok) throw new Error("template");
    const j = await res.json();
    const zip = await JSZip.loadAsync(j.docx, { base64: true });
    TPL = { zip, xml: await zip.file("word/document.xml").async("string") };
    return TPL;
  }
  const xesc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function setText(p, text) {
    return p.replace(/(<w:t[^>]*>)[^<]*(<\/w:t>)/, (m, a, b) => a + xesc(text) + b);
  }
  function ordinal(d) {
    const n = d.getDate(),
      s = n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
    return `${n}${s} ${d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
  }
  function body() {
    const co = coData();
    const web = (co.website || "www.jebbuilding.co.uk").replace(/^https?:\/\//, "");
    const tel = co.mobile || co.phone || "07917 646970";
    const mail = co.email || "info@jebbuilding.co.uk";
    const nm = (co.owner || ownerDisplayName()).split(" ")[0];
    const cn = co.name || "JEB Building Services";
    return {
      12: `My name is ${nm} and I am the owner of ${cn}, a building company based in Exmouth working across East Devon, Exeter and Teignbridge. We specialise in extensions, loft conversions, luxury new builds and high-quality refurbishments.`,
      13: "I noticed your planning application ({ref}) for {project} at {street}, and wanted to introduce myself before you choose a builder for the work.",
      14: "We would be very happy to visit, talk through your plans and provide a no-obligation quote, whether your application has just gone in or has already been approved.",
      15: `You can see examples of our completed projects at ${web}. We would also be very happy to arrange for you to visit previous projects in the area and, where appropriate, speak with previous clients about their experience of working with us.`,
      16: "We have very good working relationships with the local building authority and private building control companies. If a specialised warranty is required for your project, this is also something we can assist with, as we work closely with a warranty provider.",
      17: `I appreciate you may already be speaking to other builders, but I would be grateful if you would consider ${cn} for your project. I would be happy to provide any further information about our company or discuss your plans informally if that would be helpful.`,
      18: `If you would like to discuss anything, please do not hesitate to contact me on ${tel} or at ${mail}.`,
    };
  }
  async function buildLetters(leads, style) {
    const t = await loadTemplate();
    const xml = t.xml;
    const b0 = xml.indexOf("<w:body>") + 8,
      b1 = xml.lastIndexOf("<w:sectPr");
    const head = xml.slice(0, b0),
      bd = xml.slice(b0, b1),
      tail = xml.slice(b1);
    const paras = bd.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    if (paras.length !== 24) throw new Error("layout");
    const dateTxt = ordinal(new Date());
    const skip = new Set([1, 3, 4, 5, 8, 23]);
    const HB = body();
    const out = leads.map((Ld, i) => {
      const homeowner = HOMEOWNER.has(Ld.category);
      const who = homeowner ? "The Homeowner" : "The Applicant";
      const { lines, street } = addrLines(Ld.address);
      const desc =
        Ld.desc.length > 110 ? Ld.desc.slice(0, 107).replace(/\s+\S*$/, "") + "…" : Ld.desc;
      const ps = [];
      paras.forEach((p, j) => {
        if (j === 2) {
          [who, ...lines].forEach((line) => ps.push(setText(p, line)));
          return;
        }
        if (skip.has(j)) return;
        if (j === 7) p = setText(p, dateTxt);
        if (j === 9) p = setText(p, `Ref: ${desc} – planning application ${Ld.ref}`);
        if (j === 10) p = setText(p, homeowner ? "Dear Homeowner" : "Dear Sir or Madam");
        if (style === "homeowner" && HB[j])
          p = setText(
            p,
            HB[j]
              .replace("{ref}", Ld.ref)
              .replace("{project}", PROJECT[Ld.category] || "building works")
              .replace("{street}", street),
          );
        ps.push(p.replace(/ w14:(paraId|textId)="[^"]*"/g, ""));
      });
      if (i > 0) ps[0] = ps[0].replace("<w:pPr>", "<w:pPr><w:pageBreakBefore/>");
      return ps
        .join("")
        .replace(/(<wp:docPr id=")(\d+)"/g, (m, a, n) => `${a}${1000 + i * 10 + +n}"`);
    });
    const zip = await JSZip.loadAsync(await t.zip.generateAsync({ type: "uint8array" }));
    zip.file("word/document.xml", head + out.join("") + tail);
    return zip.generateAsync({
      type: "uint8array",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }
  let xlsxP = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (xlsxP) return xlsxP;
    xlsxP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res;
      s.onerror = () => {
        xlsxP = null;
        rej(new Error("load"));
      };
      document.head.appendChild(s);
    });
    return xlsxP;
  }
  async function sentSheet() {
    const rows = sentRows(L.rows.filter((r) => r.sent));
    if (!rows.length) return;
    const head = [
      "Date sent",
      "Name on letter",
      "Address",
      "Postcode",
      "Town",
      "Type of job",
      "Description",
      "Planning ref",
      "Council",
      "Letter used",
      "Planning status",
      "Decision date",
      "Outcome",
      "Saved",
      "Council link",
    ];
    const data = rows.map((r) => [
      r.sentDate ? new Date(r.sentDate + "T12:00:00") : "",
      HOMEOWNER.has(r.category) ? "The Homeowner" : "The Applicant",
      r.address,
      r.postcode || "",
      r.town || "",
      CAT[r.category]?.[1] || r.category,
      r.desc,
      r.ref,
      r.council,
      LETTER_NAME[r.letter] || "",
      statusOf(r).t,
      r.statusDate ? new Date(r.statusDate + "T12:00:00") : "",
      r.outcome ? OUT_NAME[r.outcome] : "",
      r.saved ? "Yes" : "",
      r.link || "",
    ]);
    const label =
      (L.sentMonth === "all" ? "all" : monthName(L.sentMonth)) +
      (L.sentCouncil ? " - " + L.sentCouncil : "");
    const name = `Letters sent record - ${label}.xlsx`;
    try {
      await loadXlsx();
      const ws = XLSX.utils.aoa_to_sheet([head, ...data], {
        cellDates: true,
        dateNF: "dd/mm/yyyy",
      });
      ws["!cols"] = [12, 15, 40, 10, 16, 26, 50, 15, 13, 17, 18, 13, 12, 7, 40].map((w) => ({
        wch: w,
      }));
      ws["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: data.length, c: head.length - 1 },
        }),
      };
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };
      rows.forEach((r, i) => {
        if (r.link) {
          const c = ws[XLSX.utils.encode_cell({ r: i + 1, c: 7 })];
          if (c) c.l = { Target: r.link };
        }
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Letters sent");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      await saveFile(
        name,
        new Blob([new Uint8Array(out)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
    } catch (e) {
      const q = (v) =>
        `"${String(v instanceof Date ? v.toLocaleDateString("en-GB") : (v ?? "")).replace(/"/g, '""')}"`;
      const text = [head, ...data].map((r) => r.map(q).join(",")).join("\r\n");
      try {
        await saveFile(name.replace(/xlsx$/, "csv"), new Blob([text], { type: "text/csv" }));
        toast("Excel didn't load, so you've got it as a CSV");
      } catch (e2) {
        toast("Couldn't make the spreadsheet");
      }
    }
  }
  function wireSent() {
    const m = $("main");
    m.querySelectorAll(".ld-tabs .pillbtn").forEach(
      (b) =>
        (b.onclick = () => {
          L.view = b.dataset.v;
          render();
        }),
    );
    $("ld-sm").onchange = (e) => {
      L.sentMonth = e.target.value;
      render();
    };
    $("ld-sc").onchange = (e) => {
      L.sentCouncil = e.target.value;
      render();
    };
    $("ld-xlsx").onclick = async () => {
      const b = $("ld-xlsx");
      b.disabled = true;
      await sentSheet();
      b.disabled = false;
    };
    m.querySelectorAll(".ld-out").forEach(
      (o) =>
        (o.onchange = async () => {
          o.disabled = true;
          try {
            await upd(o.dataset.id, { outcome: o.value });
            toast(o.value ? "Saved: " + o.options[o.selectedIndex].text : "Outcome cleared");
          } catch (e) {
            toast("Couldn't save the outcome");
          }
          o.disabled = false;
        }),
    );
  }
  function wire() {
    const m = $("main");
    m.querySelectorAll(".ld-tabs .pillbtn").forEach(
      (b) =>
        (b.onclick = () => {
          L.view = b.dataset.v;
          render();
        }),
    );
    $("ld-month").onchange = (e) => {
      L.month = e.target.value;
      render();
    };
    m.querySelectorAll(".ld-c").forEach(
      (b) =>
        (b.onclick = () => {
          const v = b.dataset.c;
          if (L.council.has(v) && L.council.size > 1) L.council.delete(v);
          else L.council.add(v);
          render();
        }),
    );
    $("ld-within").onchange = (e) => {
      L.within = +e.target.value;
      store.set("jeb.ld.within", L.within);
      render();
    };
    $("ld-status").onchange = (e) => {
      L.status = e.target.value;
      render();
    };
    $("ld-saved").onchange = (e) => {
      L.savedOnly = e.target.checked;
      render();
    };
    $("ld-small").onchange = (e) => {
      L.skipSmall = e.target.checked;
      store.set("jeb.ld.skipSmall", L.skipSmall);
      render();
    };
    $("ld-hide").onchange = (e) => {
      L.hideSent = e.target.checked;
      store.set("jeb.ld.hideSent", L.hideSent);
      render();
    };
    $("ld-style").onchange = (e) => {
      L.style = e.target.value;
      store.set("jeb.ld.style", L.style);
    };
    m.querySelectorAll(".ld-tile").forEach(
      (t) =>
        (t.onclick = () => {
          L.cat = L.cat === t.dataset.k ? null : t.dataset.k;
          render();
        }),
    );
    m.querySelectorAll(".ld-cp").forEach(
      (cp) =>
        (cp.onclick = () => {
          const g = filtered().filter((r) => r.category === cp.dataset.k);
          const allIn = g.every((r) => L.picked.has(r._id));
          g.forEach((r) => (allIn ? L.picked.delete(r._id) : L.picked.add(r._id)));
          render();
          toast(
            (allIn ? "Unticked " : "Ticked ") + g.length + " " + CAT[cp.dataset.k][1].toLowerCase(),
          );
        }),
    );
    m.querySelectorAll(".ld-pick").forEach(
      (pk) =>
        (pk.onchange = () => {
          if (pk.checked) L.picked.add(pk.dataset.id);
          else L.picked.delete(pk.dataset.id);
          render();
        }),
    );
    m.querySelectorAll(".ld-save").forEach(
      (sv) =>
        (sv.onclick = async () => {
          const row = L.rows.find((r) => r._id === sv.dataset.id);
          if (!row) return;
          const val = !row.saved;
          sv.disabled = true;
          try {
            await upd(row._id, { saved: val });
            toast(val ? "Saved for later" : "Removed from saved");
          } catch (e) {
            toast("Couldn't save");
          }
          sv.disabled = false;
        }),
    );
    m.querySelectorAll(".ld-sent").forEach(
      (s) =>
        (s.onclick = async () => {
          const row = L.rows.find((r) => r._id === s.dataset.id);
          if (!row) return;
          const val = !row.sent;
          s.disabled = true;
          try {
            await upd(
              row._id,
              val ? { sent: true, sentDate: iso(new Date()) } : { sent: false, outcome: "" },
            );
          } catch (e) {
            toast("Couldn't save");
          }
          s.disabled = false;
        }),
    );
    m.querySelectorAll(".ld-out").forEach(
      (o) =>
        (o.onchange = async () => {
          o.disabled = true;
          try {
            await upd(o.dataset.id, { outcome: o.value });
            toast(o.value ? "Saved: " + o.options[o.selectedIndex].text : "Outcome cleared");
          } catch (e) {
            toast("Couldn't save the outcome");
          }
          o.disabled = false;
        }),
    );
    $("ld-copy").onclick = async () => {
      const rows = mailRows();
      if (!rows.length) {
        toast("Nothing to copy");
        return;
      }
      const text = rows
        .map((r) => `${r.to}\n${addrLines(r.address).lines.join("\n")}`)
        .join("\n\n");
      try {
        await navigator.clipboard.writeText(text);
        toast(`Copied ${rows.length} addresses`);
      } catch (_) {
        showText(text);
        toast("Select all and copy from the box");
      }
    };
    $("ld-csv").onclick = async () => {
      if (!mailRows().length) {
        toast("Nothing to download");
        return;
      }
      try {
        await saveFile(
          `planning-leads-${L.month}${L.cat ? "-" + L.cat : ""}.csv`,
          new Blob([csv()], { type: "text/csv" }),
        );
      } catch (e) {
        showText(csv());
        toast("Copy the CSV from the box");
      }
    };
    $("ld-all").onclick = () => {
      const rows = filtered();
      rows.forEach((r) => L.picked.add(r._id));
      render();
      toast(`Ticked ${rows.length} shown`);
    };
    $("ld-none").onclick = () => {
      L.picked.clear();
      render();
    };
    $("ld-letters").onclick = async () => {
      const rows = pickedRows();
      if (!rows.length) {
        toast("Tick the leads you want letters for first");
        return;
      }
      const sorted = [...rows].sort(
        (a, b) => a.council.localeCompare(b.council) || a.date.localeCompare(b.date),
      );
      const btn = $("ld-letters");
      btn.disabled = true;
      btn.textContent = "Making letters…";
      try {
        const data = await buildLetters(sorted, L.style);
        L.lastStyle = L.style;
        const d = new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        await saveFile(
          `Letters - ${d} - ${sorted.length} ${L.style === "homeowner" ? "homeowner" : "original"}.docx`,
          new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
        );
        const unsent = sorted.filter((r) => !r.sent);
        L.pending = unsent.map((r) => r._id);
      } catch (e) {
        toast("Couldn't make the letters. Reload and try again.");
      }
      render();
    };
    if ($("ld-no"))
      $("ld-no").onclick = () => {
        L.pending = [];
        render();
      };
    if ($("ld-yes"))
      $("ld-yes").onclick = async () => {
        const ids = L.pending;
        $("ld-yes").disabled = true;
        let ok = 0;
        const today = iso(new Date());
        for (const id of ids) {
          try {
            await upd(
              id,
              L.lastStyle
                ? { sent: true, sentDate: today, letter: L.lastStyle }
                : { sent: true, sentDate: today },
            );
            ok++;
          } catch (_) {}
        }
        L.pending = [];
        L.picked.clear();
        render();
        toast(
          ok === ids.length
            ? `Marked ${ok} as sent`
            : `Marked ${ok} of ${ids.length}; some couldn't be saved`,
        );
      };
  }
  return { view, start, L };
})();
