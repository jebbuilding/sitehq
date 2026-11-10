/* ================= SEARCH (owner): one box that finds any client, site, job, person, merchant, drawing or to-do ================= */
import { viewClient } from "../clients/quick-enquiry.js";
import { $, esc, store } from "../core/helpers.js";
import { S, siteNames } from "../core/state.js";
import { OWN_TABS, render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { drawOpen, myDrawings } from "../drawing/drawings-tab.js";
import { nameOf, teamIds } from "./owner.js";
import { NL_SUBS } from "./today.js";
import { cmpEdit } from "../people/companies.js";
import { openDetails } from "../people/personal-details.js";
import { eqmView } from "../planner/plant-care.js";
import { openSupplier } from "../purchasing/suppliers.js";
import { openJob } from "../survey/door-window-survey.js";
export { searchOpen };
/* Opened from the 🔍 button in the header, or the search box on Today. Looks only at what is already loaded in the
   app (nothing is sent anywhere). Every word typed has to match; a result opens the same page its tab would. */
const SR_KINDS = [
  ["page", "Pages"],
  ["client", "Clients"],
  ["site", "Sites"],
  ["job", "Jobs"],
  ["person", "People"],
  ["merchant", "Merchants"],
  ["firm", "Companies & self-employed"],
  ["kit", "Vehicles, plant & tools"],
  ["drawing", "Drawings"],
  ["todo", "To-dos"],
];

function srGoSite(site) {
  closeViewer();
  S.f.proj = site;
  S.f.projList = false;
  S.f.pjtab = "overview";
  S.otab = "projects";
  store.set("jeb.otab", "projects");
  render();
  window.scrollTo(0, 0);
}
function srGoTab(t) {
  closeViewer();
  S.otab = t;
  store.set("jeb.otab", t);
  render();
  window.scrollTo(0, 0);
}
/* everything that matches every word of q: [{ k, label, sub, go }] */
function srFind(q) {
  const words = String(q || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];
  const hit = (...xs) => {
    const t = xs.filter(Boolean).join(" ").toLowerCase();
    return words.every((w) => t.includes(w));
  };
  const out = [];
  /* the app's own pages, by name ("vat", "cash flow", "vans") */
  OWN_TABS.forEach(([t, l]) => {
    if (hit(l, t)) out.push({ k: "page", label: l, sub: "Page", go: () => srGoTab(t) });
  });
  NL_SUBS.forEach((s) => {
    if (hit(s[1], s[4]))
      out.push({
        k: "page",
        label: s[1],
        sub: "Page",
        go: () => {
          closeViewer();
          s[5]();
        },
      });
  });
  (S.firms || []).forEach((f) => {
    if (hit(f.name, f.trades, f.contact, f.phone))
      out.push({
        k: "firm",
        label: f.name || "Company",
        sub: [f.trades, f.contact, f.phone].filter(Boolean).join(" · "),
        go: () => {
          closeViewer();
          cmpEdit(f);
        },
      });
  });
  (S.equipment || []).forEach((e) => {
    if (hit(e.name, e.reg, e.tag, e.make, e.model))
      out.push({
        k: "kit",
        label: e.name || "Equipment",
        sub: [e.reg, e.tag].filter(Boolean).join(" · ") || "Vehicles & plant",
        go: () => {
          closeViewer();
          eqmView();
        },
      });
  });
  (S.clients || []).forEach((c) => {
    if (hit(c.name, c.address, c.postcode, c.phone, c.email, c.site))
      out.push({
        k: "client",
        label: c.name || "Client",
        sub: [c.address, c.postcode, c.phone].filter(Boolean).join(" · "),
        go: () => {
          closeViewer();
          viewClient(c);
        },
      });
  });
  siteNames().forEach((s) => {
    if (hit(s)) out.push({ k: "site", label: s, sub: "Site", go: () => srGoSite(s) });
  });
  (S.jobs || []).forEach((j) => {
    if (j.status !== "closed" && hit(j.title, j.site, j.kind))
      out.push({
        k: "job",
        label: j.title || "Job",
        sub: [j.site, j.status === "closed" ? "closed" : ""].filter(Boolean).join(" · "),
        go: () => openJob(j.id),
      });
  });
  teamIds().forEach((id) => {
    const nm = nameOf(id);
    if (hit(nm))
      out.push({
        k: "person",
        label: nm,
        sub: "Team",
        go: () => {
          closeViewer();
          openDetails({ id });
        },
      });
  });
  (S.suppliers || []).forEach((sp) => {
    if (hit(sp.name, sp.branch, sp.phone))
      out.push({
        k: "merchant",
        label: sp.name || "Merchant",
        sub: [sp.branch, sp.phone].filter(Boolean).join(" · "),
        go: () => {
          closeViewer();
          openSupplier(sp);
        },
      });
  });
  myDrawings().forEach((p) => {
    if (hit(p.title, p.site))
      out.push({
        k: "drawing",
        label: p.title || "Drawing",
        sub: p.site || "Drawing",
        go: () => {
          closeViewer();
          drawOpen(p);
        },
      });
  });
  (S.todos || []).forEach((t) => {
    if (!t.done && hit(t.text))
      out.push({ k: "todo", label: t.text, sub: "To-do", go: () => srGoTab("todo") });
  });
  return out;
}

function searchOpen(q0) {
  openViewer(`<div class="sr-wrap">
    <h3 style="margin:0 0 8px">Search</h3>
    <label class="sr-box" for="sr-q"><span aria-hidden="true">🔍</span><input id="sr-q" type="search" autocomplete="off" placeholder="Client, site, job, person, merchant, drawing…" value="${esc(q0 || "")}"></label>
    <div id="sr-list" class="sr-list" aria-live="polite"></div>
  </div>`);
  let found = [];
  const show = () => {
    const q = $("sr-q").value.trim();
    found = srFind(q);
    $("sr-list").innerHTML = !q
      ? `<div class="who">Type a name, address, postcode, phone number or part of one.</div>`
      : !found.length
        ? `<div class="empty"><strong>Nothing found</strong>Try fewer words, or part of a name.</div>`
        : SR_KINDS.map(([k, l]) => {
            const rows = found
              .map((r, i) => [r, i])
              .filter(([r]) => r.k === k)
              .slice(0, 12);
            return rows.length
              ? `<div class="flabel">${l}</div>` +
                  rows
                    .map(
                      ([r, i]) =>
                        `<button type="button" class="sr-row" data-i="${i}"><b>${esc(r.label)}</b>${r.sub ? `<span class="who">${esc(r.sub)}</span>` : ""}</button>`,
                    )
                    .join("")
              : "";
          }).join("");
    $("sr-list")
      .querySelectorAll(".sr-row")
      .forEach((b) => (b.onclick = () => found[+b.dataset.i].go()));
  };
  $("sr-q").oninput = show;
  show();
  setTimeout(() => $("sr-q") && $("sr-q").focus(), 60);
}
