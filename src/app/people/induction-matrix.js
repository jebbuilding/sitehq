/* ================= SITE INDUCTIONS BY PERSON (owner): who has been inducted to which sites ================= */
import { $, esc, iso, shortDay } from "../core/helpers.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { viewRecord } from "../safety/site-inductions.js";
import { same } from "../sites/project-pages.js";
export { inductionsView };
/* A grid: a row per person (the team, and people inducted in person on James's or the foreman's phone), a column
   per site with an induction. Each square: ✓ and the date (tap to see the signed record), "old" when the
   induction has changed since they signed, "needed" when they've worked there without signing, or blank.
   Filters: one site, or only the gaps. A list per person on phones. Reads what's already there (signoffs of type
   "induction" in each person's sheets, visitinds) – nothing new is stored. */
function imRows() {
  const inds = (S.inductions || [])
    .slice()
    .sort((a, b) => (a.site || "").localeCompare(b.site || ""));
  const worked = {};
  allTeam("entries").forEach((e) => {
    const k =
      e.who +
      "|" +
      String(e.job || "")
        .trim()
        .toLowerCase();
    worked[k] = true;
  });
  const people = teamIds().map((id) => ({ id, name: nameOf(id), app: true }));
  /* people inducted in person (visitors, agency) – one row per name */
  const vis = {};
  (S.visitInds || []).forEach((r) => {
    const nm = String(r.name || "").trim();
    if (!nm) return;
    (vis[nm.toLowerCase()] = vis[nm.toLowerCase()] || {
      id: "v:" + nm.toLowerCase(),
      name: nm,
      app: false,
      recs: [],
    }).recs.push(r);
  });
  const rows = people.concat(Object.values(vis).sort((a, b) => a.name.localeCompare(b.name)));
  const cell = (p, ind) => {
    let rec;
    if (p.app)
      rec = (S.data.signoffs[p.id] || [])
        .filter((s) => s.type === "induction" && s.inductionId === ind.id)
        .sort((a, b) => b.signedAt - a.signedAt)[0];
    else
      rec = p.recs
        .filter((r) => r.inductionId === ind.id || same(r.site, ind.site))
        .sort((a, b) => (b.signedAt || 0) - (a.signedAt || 0))[0];
    if (rec) return { st: (rec.version || 1) < (ind.version || 1) ? "old" : "ok", rec };
    if (
      p.app &&
      worked[
        p.id +
          "|" +
          String(ind.site || "")
            .trim()
            .toLowerCase()
      ]
    )
      return { st: "need" };
    return { st: "" };
  };
  return { inds, rows: rows.map((p) => Object.assign(p, { cells: inds.map((i) => cell(p, i)) })) };
}
function inductionsView() {
  const { inds, rows } = imRows();
  const site = S.f.imsite || "";
  const gaps = !!S.f.imgaps;
  const cols = inds.map((ind, i) => [ind, i]).filter(([ind]) => !site || ind.site === site);
  const shown = rows.filter(
    (p) =>
      cols.some(([, i]) => p.cells[i].st) &&
      (!gaps || cols.some(([, i]) => ["need", "old"].includes(p.cells[i].st))),
  );
  const n = (st) =>
    rows.reduce((a, p) => a + cols.filter(([, i]) => p.cells[i].st === st).length, 0);
  const sq = (c) =>
    c.st === "ok"
      ? `<button type="button" class="im-c ok" data-r="1">✓<small>${esc(shortDay(iso(new Date(c.rec.signedAt))))}</small></button>`
      : c.st === "old"
        ? `<button type="button" class="im-c old" data-r="1">Old<small>${esc(shortDay(iso(new Date(c.rec.signedAt))))}</small></button>`
        : c.st === "need"
          ? `<span class="im-c need">Needed</span>`
          : `<span class="im-c"></span>`;
  $("main").innerHTML = `<div class="im-page">
    <div class="im-boxes">
      <div class="im-box ok"><small>Inducted</small><b>${n("ok")}</b><span>person-sites</span></div>
      <div class="im-box${n("need") ? " bad" : ""}"><small>Worked there, not inducted</small><b>${n("need")}</b><span>to sort</span></div>
      <div class="im-box${n("old") ? " warn" : ""}"><small>Induction changed since</small><b>${n("old")}</b><span>to sign again</span></div>
    </div>
    <div class="im-filt"><label for="im-site" class="im-l">Site<select id="im-site"><option value="">All sites (${inds.length})</option>${inds.map((i) => `<option${i.site === site ? " selected" : ""}>${esc(i.site)}</option>`).join("")}</select></label><label class="inl"><input type="checkbox" id="im-gaps"${gaps ? " checked" : ""}> Only people with gaps</label></div>
    ${
      !inds.length
        ? `<div class="empty"><strong>No site inductions yet</strong>Set one up from a site (Jobs › Sites › the site › Site induction).</div>`
        : shown.length
          ? `<div class="tablewrap im-wrap"><table class="im-t"><thead><tr><th>Person</th>${cols.map(([ind]) => `<th>${esc(ind.site)}</th>`).join("")}</tr></thead><tbody>${shown
              .map(
                (p) =>
                  `<tr data-p="${esc(p.id)}"><th>${esc(p.name)}${p.app ? "" : ` <small class="who">in person</small>`}</th>${cols.map(([, i]) => `<td data-i="${i}">${sq(p.cells[i])}</td>`).join("")}</tr>`,
              )
              .join("")}</tbody></table></div>`
          : `<div class="empty"><strong>${gaps ? "No gaps" : "Nobody inducted yet"}</strong>${gaps ? "Everyone who has worked on a site has signed its induction." : ""}</div>`
    }
    <div class="who">✓ signed (tap to see the record) · Old: the induction has changed since they signed · Needed: they've worked on the site but not signed.</div>
  </div>`;
  $("im-site").onchange = () => {
    S.f.imsite = $("im-site").value;
    render();
  };
  $("im-gaps").onchange = () => {
    S.f.imgaps = $("im-gaps").checked;
    render();
  };
  document.querySelectorAll("#main .im-t td button[data-r]").forEach((b) => {
    const td = b.closest("td"),
      tr = b.closest("tr");
    const p = shown.find((x) => x.id === tr.dataset.p);
    const c = p && p.cells[+td.dataset.i];
    b.onclick = () => c && c.rec && viewRecord(c.rec, true);
  });
}
