/* ================= CLIENTS ADDRESS BOOK + JOB HISTORY ================= */
import { CJOBS } from "./address-book-jobs.js";
import { aiWire } from "./address-import.js";
import {
  clInitials,
  clList,
  clStage,
  newEnquiryFor,
  nmParts,
  nmSortKey,
  openClientForm,
  saveClient,
} from "./clients.js";
import { mjHas } from "./more-jobs.js";
import { quickEnquiry, viewClient } from "./quick-enquiry.js";
import { clNextPlan } from "./stages-planner.js";
import { webBtnHtml, webView } from "./web-enquiries.js";
import { $, esc, gbp, hrs, iso, parse, shortDay, store, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { blobUrl, csvSave } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { allTeam } from "../owner/owner.js";
import { JOB_KINDS, jobProgress } from "../sites/job-sheets.js";
import { same } from "../sites/project-pages.js";
import { openJob } from "../survey/door-window-survey.js";
export {
  clConCard,
  clContactsHtml,
  clInvHtml,
  clMainHtml,
  clShowToSee,
  clientSites,
  clientsView,
  histHtml,
  wireHist,
};
function clConCard(x) {
  const t = String(x.phone || "").replace(/\s+/g, "");
  return `<div class="clcon"><b>${esc(x.name || "Contact")}</b>${x.role ? ` <span class="who">${esc(x.role)}</span>` : ""}<div class="clconl">${x.phone ? `<a href="tel:${esc(t)}">📞 ${esc(x.phone)}</a><a href="sms:${esc(t)}">💬 Text</a>` : ""}${x.email ? `<a href="mailto:${esc(x.email)}">✉ ${esc(x.email)}</a>` : ""}</div></div>`;
}
function clMainHtml(c) {
  return `<div class="flabel" style="margin-top:10px">Main contact</div><div class="clcons">${clConCard({ name: c.name, role: "Main contact", phone: c.phone, email: c.email })}</div>`;
}
function clContactsHtml(c) {
  const cs = (c.contacts || []).filter((x) => x.name || x.phone || x.email);
  if (!cs.length) return "";
  return `<div class="flabel" style="margin-top:10px">Other contacts</div><div class="clcons">${cs.map(clConCard).join("")}</div>`;
}
function clInvHtml(c) {
  if (!c.invAddress && !c.invName) return "";
  return `<div class="flabel" style="margin-top:10px">Invoice address</div><div class="clcon">${c.invName ? `<b>${esc(c.invName)}</b><br>` : ""}${esc([c.invAddress, c.invPostcode].filter(Boolean).join("\n")).replace(/\n/g, "<br>")}${c.invEmail ? `<div class="clconl"><a href="mailto:${esc(c.invEmail)}">✉ ${esc(c.invEmail)}</a></div>` : ""}</div>`;
}
function clientSites(c) {
  const set = [];
  const add = (n) => {
    if (n && !set.some((x) => same(x, n))) set.push(n);
  };
  add(c.site);
  (c.sites || []).forEach(add);
  (S.sites || []).forEach((s) => {
    if (s.client && same(s.client, c.name)) add(s.name);
  });
  return set;
}
function clientHistory(c) {
  const out = [];
  const ents = allTeam("entries");
  const phs = allTeam("photos");
  clientSites(c).forEach((site) => {
    const es = ents.filter((e) => same(e.job, site)),
      ps = phs.filter((p) => same(p.site, site));
    const dates = es
      .map((e) => e.date)
      .concat(ps.map((p) => p.date))
      .filter(Boolean)
      .sort();
    const hrsT = es.reduce((a, e) => a + (+e.hours || 0), 0);
    const js = (S.jobs || []).filter((j) => same(j.site, site));
    out.push({
      type: "site",
      site,
      title: site,
      first: dates[0] || "",
      last: dates[dates.length - 1] || "",
      hours: hrsT,
      people: [...new Set(es.map((e) => e.who))].length,
      photos: ps.length,
      jobs: js.length,
      open: js.filter((j) => j.status !== "closed").length,
      sort: Math.max(
        dates.length ? parse(dates[dates.length - 1]).getTime() : 0,
        ...js.map((j) => j.updated || j.created || 0),
      ),
    });
    js.forEach((j) => {
      const pr = jobProgress(j);
      out.push({
        type: "job",
        id: j.id,
        site,
        title: j.title,
        kind: j.kind,
        status: j.status,
        due: j.due,
        done: pr.d,
        of: pr.n,
        sort: j.updated || j.closedAt || j.created || 0,
      });
    });
  });
  (c.history || []).forEach((h) =>
    out.push(
      Object.assign(
        { type: "past", sort: parse(h.to || h.from || iso(new Date(h.at || 0))).getTime() },
        h,
      ),
    ),
  );
  return out.sort((a, b) => b.sort - a.sort);
}
function clLastJob(c) {
  const h = clientHistory(c);
  const x = h[0];
  if (!x) return c.work ? { label: c.work + " · " + clStage(c.stage), date: c.updated } : null;
  if (x.type === "job")
    return {
      label:
        x.title +
        (x.status === "closed" ? " · signed off" : x.of ? ` · ${x.done}/${x.of} done` : ""),
      date: x.sort,
    };
  if (x.type === "past")
    return { label: x.title + (x.value ? " · " + gbp(+x.value) : ""), date: x.sort };
  const jb = h.find((i) => i.type === "job" && same(i.site, x.site));
  return {
    label: (jb ? jb.title + " at " : "") + x.site + (x.hours ? " · " + hrs(x.hours) + " h" : ""),
    date: x.sort,
  };
}
const dY = (d) =>
  d
    ? parse(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
function histHtml(c) {
  const h = clientHistory(c);
  return `<div class="flabel" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center">Jobs &amp; work history <button type="button" class="pillbtn" id="ch-add">+ Add a past job</button></div>
  ${
    h.length
      ? `<div class="chist">${h
          .map((x, i) =>
            x.type === "site"
              ? `<button type="button" class="chrow site" data-i="${i}"><span class="chic">🏗️</span><span><b>${esc(x.site)}</b><br><span class="who">${x.first ? esc(dY(x.first)) + (x.last && x.last !== x.first ? " – " + esc(dY(x.last)) : "") : "No time logged yet"}${x.hours ? " · " + hrs(x.hours) + " h logged" : ""}${x.people ? " · " + x.people + " " + (x.people === 1 ? "person" : "people") : ""}${x.photos ? " · " + x.photos + " photo" + (x.photos === 1 ? "" : "s") : ""}${x.jobs ? " · " + x.jobs + " job sheet" + (x.jobs === 1 ? "" : "s") : ""}</span></span><span aria-hidden="true">›</span></button>`
              : x.type === "job"
                ? `<button type="button" class="chrow job" data-i="${i}"><span class="chic">${x.kind === "snag" ? "🔧" : "✅"}</span><span><b>${esc(x.title)}</b> ${x.status === "closed" ? '<span class="tag ok">Signed off</span>' : x.of && x.done === x.of ? '<span class="tag ok">All ticked</span>' : '<span class="tag day">Open</span>'}<br><span class="who">${esc(JOB_KINDS[x.kind] || "Job sheet")} · ${esc(x.site)}${x.of ? ` · ${x.done}/${x.of} tasks` : ""}${x.due ? " · due " + esc(shortDay(x.due)) : ""}</span></span><span aria-hidden="true">›</span></button>`
                : `<button type="button" class="chrow past" data-i="${i}"><span class="chic">📁</span><span><b>${esc(x.title)}</b> <span class="tag">Past job</span><br><span class="who">${esc([x.from && dY(x.from), x.to && x.to !== x.from && dY(x.to)].filter(Boolean).join(" – "))}${x.value ? " · " + gbp(+x.value) : ""}${x.site ? " · " + esc(x.site) : ""}</span></span><span aria-hidden="true">›</span></button>`,
          )
          .join("")}</div>`
      : `<div class="nothing">No jobs yet. When you <b>Make it a site</b>, its job sheets, hours and photos show here. Add earlier work with <b>+ Add a past job</b>.</div>`
  }`;
}
function wireHist(c) {
  const h = clientHistory(c);
  $("viewer-body")
    .querySelectorAll(".chrow")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const x = h[+b.dataset.i];
          if (!x) return;
          if (x.type === "job") {
            openJob(x.id);
            $("viewer-body").insertAdjacentHTML(
              "afterbegin",
              `<button type="button" class="btn backbtn" id="jb-cl" style="margin-bottom:8px">‹ Back to ${esc(c.name)}</button>`,
            );
            $("jb-cl").onclick = () => {
              S.openJob = null;
              viewClient((S.clients || []).find((y) => y.id === c.id) || c);
            };
          } else if (x.type === "site") {
            closeViewer();
            S.f.proj = x.site;
            S.f.projList = false;
            S.f.pjtab = "overview";
            S.otab = "projects";
            store.set("jeb.otab", "projects");
            render();
          } else pastJobEditor(c, x);
        }),
    );
  $("ch-add").onclick = () => pastJobEditor(c, null);
}
function pastJobEditor(c, x) {
  const ed = !!x;
  x = x || {};
  openSheet(
    `<h3 id="sheettitle">${ed ? "Past job" : "Add a past job"} for ${esc(c.name)}</h3>
    <label for="pj-t">What was done<input id="pj-t" required maxlength="120" value="${esc(x.title || "")}" placeholder="e.g. Replacement patio and drainage"></label>
    <div class="grid2"><label for="pj-f">Started<input id="pj-f" type="date" value="${esc(x.from || "")}"></label><label for="pj-to">Finished<input id="pj-to" type="date" value="${esc(x.to || "")}"></label></div>
    <div class="grid2"><label for="pj-v">Value £ (optional)<input id="pj-v" inputmode="decimal" maxlength="12" value="${esc(x.value || "")}"></label><label for="pj-s">Address (if different)<input id="pj-s" maxlength="120" value="${esc(x.site || "")}"></label></div>
    <label for="pj-n">Notes<textarea id="pj-n" maxlength="2000" placeholder="e.g. 10 m² Indian sandstone, new gully. Guarantee until 2028.">${esc(x.notes || "")}</textarea></label>
    ${formFoot(ed, ed ? "Save" : "Add")}`,
    async () => {
      const t = $("pj-t").value.trim();
      if (!t) {
        showErr("Say what was done");
        return;
      }
      const item = {
        id: x.id || newId(),
        title: t,
        from: $("pj-f").value,
        to: $("pj-to").value,
        value: $("pj-v")
          .value.trim()
          .replace(/[£,\s]/g, ""),
        site: $("pj-s").value.trim(),
        notes: $("pj-n").value.trim(),
        at: x.at || Date.now(),
      };
      const list = (c.history || []).filter((h) => h.id !== item.id).concat([item]);
      try {
        const rec = await saveClient(Object.assign({}, c, { history: list }));
        closeForm();
        toast(ed ? "Saved" : "Past job added");
        viewClient(rec);
        render();
      } catch (e) {
        showErr("Couldn't save");
      }
    },
    "pj-t",
  );
  if (ed)
    armDelete(async () => {
      const rec = await saveClient(
        Object.assign({}, c, { history: (c.history || []).filter((h) => h.id !== x.id) }),
      );
      setTimeout(() => {
        viewClient(rec);
        render();
      }, 0);
    });
}
function clientsView() {
  const all0 = clList();
  const cy = S.f.cly || "",
    cm = S.f.clm || "";
  const cdt = (c) => {
    const t = c.created || c.updated;
    return t ? new Date(t) : null;
  };
  const years = [
    ...new Set(
      all0
        .map((c) => {
          const d = cdt(c);
          return d ? d.getFullYear() : null;
        })
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);
  const all = all0.filter((c) => {
    if (!cy && !cm) return true;
    const d = cdt(c);
    if (!d) return false;
    return (!cy || d.getFullYear() === +cy) && (!cm || d.getMonth() + 1 === +cm);
  });
  const q = (S.f.clq || "").toLowerCase().trim();
  const f = S.f.clf || "onsite";
  const sort = S.f.cls || "az";
  const today = iso(new Date());
  const isOpen = (c) => ["enquiry", "visit", "quote"].includes(c.stage),
    isCur = (c) => ["won", "onsite"].includes(c.stage);
  const F = {
    /* a client shows under the stage of any of their jobs (clients/more-jobs.js) */
    see: ["Job to see", (c) => mjHas(c, "enquiry")],
    cost: ["Job to cost", (c) => mjHas(c, "visit")],
    sent: ["Estimate sent", (c) => mjHas(c, "quote")],
    acc: ["Accepted", (c) => mjHas(c, "won")],
    onsite: ["On site", (c) => mjHas(c, "onsite")],
    done: ["Completed", (c) => c.stage === "done"],
    rej: ["Rejected", (c) => c.stage === "lost"],
    follow: [
      "Follow up due",
      (c) => c.follow && c.follow <= today && !["done", "lost"].includes(c.stage),
    ],
    all: ["Everyone", () => true],
    book: ["📒 Address book", () => true],
  };
  const hay = (c) =>
    [
      c.name,
      c.phone,
      c.email,
      c.address,
      c.postcode,
      c.work,
      c.desc,
      c.site,
      c.invName,
      c.invAddress,
      ...(c.contacts || []).flatMap((x) => [x.name, x.phone, x.email]),
      ...(c.history || []).map((h) => h.title),
    ]
      .join(" ")
      .toLowerCase();
  const fk = F[f] && f !== "follow" ? f : "all";
  let shown = all.filter((c) => F[fk][1](c) && (!q || hay(c).includes(q)));
  const last = new Map(shown.map((c) => [c.id, clLastJob(c)]));
  const book = fk === "book";
  const byName = (a, b) => nmSortKey(a).localeCompare(nmSortKey(b), "en", { sensitivity: "base" });
  if (book) {
    shown.sort(byName);
  } else
    shown.sort(
      sort === "az"
        ? byName
        : (a, b) =>
            Math.max(b.updated || 0, (last.get(b.id) || {}).date || 0) -
            Math.max(a.updated || 0, (last.get(a.id) || {}).date || 0),
    );
  const pipe = all.filter((c) => c.stage === "quote").reduce((a, c) => a + (+c.quote || 0), 0);
  const due = [];
  let letter = "";
  const nmL = (c) => {
    const p = nmParts(c);
    return (String(p.last || p.first || c.name || "?").trim()[0] || "#").toUpperCase();
  };
  const bookRow = (c) => {
    const L = nmL(c);
    const head =
      L !== letter ? ((letter = L), `<div class="abletter" id="ab-${esc(L)}">${esc(L)}</div>`) : "";
    const tel = String(c.phone || "").replace(/\s+/g, "");
    const addr = [c.address && c.address.split("\n").join(", "), c.postcode]
      .filter(Boolean)
      .join(", ");
    return (
      head +
      `<div class="bkrow"><button type="button" class="bkmain cl-open" data-c="${esc(c.id)}"><b>${esc(c.name)}</b>${c.phone ? `<span>📞 ${esc(c.phone)}</span>` : ""}${c.email ? `<span>✉ ${esc(c.email)}</span>` : ""}${addr ? `<span class="who">📍 ${esc(addr)}</span>` : ""}</button><span class="abacts">${tel ? `<a class="iconbtn" href="tel:${esc(tel)}" aria-label="Call ${esc(c.name)}">📞</a><a class="iconbtn" href="sms:${esc(tel)}" aria-label="Text ${esc(c.name)}">💬</a>` : ""}${c.email ? `<a class="iconbtn" href="mailto:${esc(c.email)}" aria-label="Email ${esc(c.name)}">✉</a>` : ""}</span>${CJOBS.rowJobs(c)}</div>`
    );
  };
  const card = (c) => {
    const L = nmL(c);
    const head =
      sort === "az" && L !== letter
        ? ((letter = L), `<div class="abletter" id="ab-${esc(L)}">${esc(L)}</div>`)
        : "";
    const tel = String(c.phone || "").replace(/\s+/g, "");
    const addr = [c.address && c.address.split("\n").join(", "), c.postcode]
      .filter(Boolean)
      .join(", ");
    const lj = last.get(c.id);
    return (
      head +
      `<div class="abcard s-${esc(c.stage)}"><button type="button" class="abmain cl-open" data-c="${esc(c.id)}">${c.frontPhoto ? `<img class="abav abph" src="${blobUrl(c.frontPhoto)}" alt="" loading="lazy">` : `<span class="abav">${esc(clInitials(c))}</span>`}<span class="abtxt"><span class="abname"><b>${esc(c.name)}</b> <span class="tag">${esc(clStage(c.stage))}</span>${(c.moreJobs || []).length ? ` <span class="tag day">+${c.moreJobs.length} more job${c.moreJobs.length === 1 ? "" : "s"}</span>` : ""}${F.follow[1](c) ? ' <span class="tag bad">Follow up</span>' : ""}</span>
      ${addr ? `<span class="abline">📍 ${esc(addr)}</span>` : ""}<span class="abline">${[c.phone ? "📞 " + esc(c.phone) : "", c.email ? "✉ " + esc(c.email) : ""].filter(Boolean).join(" · ") || '<span class="who">No contact details</span>'}</span>${(c.contacts || []).length ? `<span class="abline who">👥 Also: ${(c.contacts || []).map((x) => esc(x.name || x.phone || x.email) + (x.role ? " (" + esc(x.role) + ")" : "")).join(", ")}</span>` : ""}
      ${(() => {
        const np = clNextPlan(c);
        return np
          ? `<span class="abline abnext">📅 ${esc(np.title)} · ${esc(shortDay(np.from))}${np.time ? " " + esc(np.time) : ""}</span>`
          : "";
      })()}
      ${lj ? `<span class="abline ablast">Last job: <b>${esc(lj.label)}</b>${lj.date ? ` <span class="who">· ${esc(new Date(lj.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}</span>` : ""}</span>` : ""}</span></button>
      <span class="abacts">${tel ? `<a class="iconbtn" href="tel:${esc(tel)}" aria-label="Call ${esc(c.name)}">📞</a><a class="iconbtn" href="sms:${esc(tel)}" aria-label="Text ${esc(c.name)}">💬</a>` : ""}${c.email ? `<a class="iconbtn" href="mailto:${esc(c.email)}" aria-label="Email ${esc(c.name)}">✉</a>` : ""}</span></div>`
    );
  };
  const letters =
    sort === "az" || book
      ? [...new Set(shown.map((c) => (String(c.name || "?").trim()[0] || "#").toUpperCase()))]
      : [];
  $("main").innerHTML =
    `<div class="abtop"><button class="btn primary" id="cl-enq" type="button">📝 New enquiry</button><button class="btn" id="cl-new" type="button">📒 + New client (details only)</button><button class="btn hv" id="cl-quick" type="button">⚡ Quick enquiry</button>${webBtnHtml()}<input id="cl-q" type="search" placeholder="Search name, phone, address, job…" value="${esc(S.f.clq || "")}" aria-label="Search clients">
      <select id="cl-s" aria-label="Sort"><option value="az" ${sort === "az" ? "selected" : ""}>A–Z</option><option value="recent" ${sort === "recent" ? "selected" : ""}>Most recent</option></select></div>
    <div class="clper"><span class="who">Added in</span><select id="cl-y" aria-label="Year"><option value="">All years</option>${years.map((y) => `<option value="${y}" ${String(y) === String(cy) ? "selected" : ""}>${y}</option>`).join("")}</select>
      <select id="cl-m" aria-label="Month"><option value="">All months</option>${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => `<option value="${i + 1}" ${String(i + 1) === String(cm) ? "selected" : ""}>${m}</option>`).join("")}</select>
      ${cy || cm ? `<button type="button" class="pillbtn" id="cl-pclr">✕ Clear</button><span class="who">${all.length} of ${all0.length}</span>` : ""}</div>
    <div class="seg cltabs" style="margin:8px 0"><button type="button" class="cl-tab" data-v="jobs" aria-pressed="${!book}">🔨 Enquiries &amp; jobs</button><button type="button" class="cl-tab" data-v="book" aria-pressed="${book}">📒 Address book (${all.length})</button></div>
    ${
      book
        ? ""
        : `<div class="clfold">${Object.entries(F)
            .filter(([k]) => k !== "follow" && k !== "book")
            .map(
              ([k, [l, fn]]) =>
                `<button type="button" class="clf f-${k}" data-f="${k}" aria-pressed="${k === fk}"><span class="clfn">${all.filter(fn).length}</span><span>${esc(l)}</span></button>`,
            )
            .join("")}</div>`
    }
    <div class="who absum" ${book ? "hidden" : ""}>${pipe ? gbp(pipe) + " in estimates sent · " : ""}${all.filter(isCur).length} accepted or on site${due.length ? ` · <button type="button" class="linkbtn" id="cl-due">${due.length} to follow up today</button>` : ""}</div>
    ${letters.length > (book ? 1 : 6) ? `<div class="abidx">${letters.map((L) => `<button type="button" class="abjump" data-l="${esc(L)}">${esc(L)}</button>`).join("")}</div>` : ""}
    <div class="ablist${book ? " bklist" : ""}">${shown.map(book ? bookRow : card).join("") || `<div class="empty"><strong>${all.length ? "Nobody matches" : "No clients yet"}</strong>${all.length ? "Try a different search or filter." : "Tap “New client” when someone gets in touch."}</div>`}</div>
    <div class="actions" style="margin-top:12px"><button class="btn" id="cl-csv" type="button">Download address book (CSV)</button><label class="btn fhpickbtn">📥 Upload an address book (CSV)<input type="file" id="cl-imp" accept=".csv,text/csv,text/plain" aria-label="Upload an address book CSV"></label></div>
    <div class="who">Only you can see clients.</div>`;
  $("cl-new").onclick = () => openClientForm(null, "contact");
  $("cl-enq").onclick = () => newEnquiryFor();
  if ($("cl-quick")) $("cl-quick").onclick = () => quickEnquiry();
  if ($("cl-web")) $("cl-web").onclick = () => webView();
  $("cl-y").onchange = (e) => {
    S.f.cly = e.target.value;
    e.target.blur();
    render();
  };
  $("cl-m").onchange = (e) => {
    S.f.clm = e.target.value;
    e.target.blur();
    render();
  };
  if ($("cl-pclr"))
    $("cl-pclr").onclick = () => {
      S.f.cly = "";
      S.f.clm = "";
      render();
    };
  $("cl-q").oninput = (e) => {
    S.f.clq = e.target.value;
    const pos = e.target.selectionStart;
    clientsView();
    const n = $("cl-q");
    n.focus();
    try {
      n.setSelectionRange(pos, pos);
    } catch (x) {}
  };
  $("main")
    .querySelectorAll(".clf")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.clf = b.dataset.f;
          S.f.clfJobs = b.dataset.f;
          render();
        }),
    );
  $("cl-s").onchange = (e) => {
    S.f.cls = e.target.value;
    e.target.blur();
    render();
  };
  if ($("cl-due"))
    $("cl-due").onclick = () => {
      S.f.clf = "follow";
      render();
    };
  $("main")
    .querySelectorAll(".abjump")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const t = $("ab-" + b.dataset.l);
          if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
        }),
    );
  $("main")
    .querySelectorAll(".cl-open")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const c = all.find((x) => x.id === b.dataset.c);
          if (c) viewClient(c);
        }),
    );
  $("main")
    .querySelectorAll(".abjob")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const c = all.find((x) => x.id === b.dataset.c);
          if (c) CJOBS.view(c, b.dataset.j);
        }),
    );
  $("main")
    .querySelectorAll(".cl-tab")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.clf = b.dataset.v === "book" ? "book" : S.f.clfJobs || "all";
          store.set("jeb.clf", S.f.clf);
          render();
        }),
    );
  aiWire();
  $("cl-csv").onclick = () => {
    const r = [
      [
        "Name",
        "Phone",
        "Email",
        "Property address",
        "Postcode",
        "Stage",
        "Work",
        "Last job",
        "Estimate £",
        "Follow up",
        "Site",
        "Added",
        "Notes",
        "Other contacts",
        "Invoice address",
      ],
    ];
    all.forEach((c) => {
      const lj = clLastJob(c);
      r.push([
        c.name,
        c.phone,
        c.email,
        c.address,
        c.postcode,
        clStage(c.stage),
        c.work,
        lj ? lj.label : "",
        c.quote,
        c.follow,
        c.site,
        c.created ? iso(new Date(c.created)) : "",
        (c.notes || []).map((n) => iso(new Date(n.at)) + ": " + n.text).join(" | "),
        (c.contacts || [])
          .map((x) => [x.name, x.role, x.phone, x.email].filter(Boolean).join(" / "))
          .join(" | "),
        [c.invName, c.invAddress, c.invPostcode, c.invEmail].filter(Boolean).join(", "),
      ]);
    });
    csvSave("Clients address book.csv", r);
  };
}
/* open Clients on the enquiries still to see (from Jobs & clients › Enquiries) */
function clShowToSee() {
  S.f.clf = "see";
}
