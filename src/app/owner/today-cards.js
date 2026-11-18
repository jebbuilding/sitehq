/* ================= TODAY CARDS: chat and sites on the Today page ================= */
import { chatTime, chatTitle, openChat, unread, visibleChats } from "../chat/chat.js";
import { $, addDays, esc, hrs, iso } from "../core/helpers.js";
import { S, isArchivedSite } from "../core/state.js";
import { allTeam, nameOf } from "./owner.js";
import { nlGo, nlOpenTab } from "./today.js";
import { jobNameOf, siteLabel } from "../sites/job-details.js";
import { projectSites, same } from "../sites/project-pages.js";
import { smOpen } from "../sites/sites-map.js";
import { siteClient } from "../sites/summary.js";
import { sumH } from "../timesheets/time.js";
export { tdChatCard, tdSitesCard, tdWire };
/* Chat: the latest conversations, unread first, each opening the chat. Sites: the live sites, busiest first, with
   who's on each today and the hours this week; tap one to open its page; the map of all sites from here too. */
function tdChatCard() {
  const list = visibleChats()
    .filter((c) => !c.archived)
    .sort((a, b) => (unread(b) ? 1 : 0) - (unread(a) ? 1 : 0) || (b.lastAt || 0) - (a.lastAt || 0));
  const n = list.filter(unread).length;
  return `<section class="nl-card td-chat"><div class="nl-cardh"><h2>💬 Chat</h2>${n ? `<span class="nl-big">${n}</span>` : ""}</div>
    ${
      list.length
        ? list
            .slice(0, 4)
            .map(
              (c) =>
                `<button type="button" class="td-row td-c${unread(c) ? " td-new" : ""}" data-c="${esc(c.id)}"><span class="td-top"><b>${esc(chatTitle(c))}</b><span class="who">${esc(chatTime(c.lastAt))}</span></span><span class="who td-last">${c.lastText ? `${c.lastName ? esc(c.lastBy === S.me ? "You" : c.lastName) + ": " : ""}${esc(c.lastText)}` : "No messages yet"}</span>${unread(c) ? '<span class="td-dot" aria-label="Unread"></span>' : ""}</button>`,
            )
            .join("")
        : '<div class="who">No chats yet.</div>'
    }
    <button type="button" class="btn nl-wide" id="td-chats">All chats</button></section>`;
}
function tdSitesCard() {
  const today = iso(new Date());
  const wk0 = iso(addDays(new Date(), -6));
  const ents = allTeam("entries");
  const sites = projectSites()
    .filter((n) => !isArchivedSite(n))
    .map((n) => {
      const e = ents.filter((x) => same(x.job, n));
      const on = [...new Set(e.filter((x) => x.open && x.date === today).map((x) => x.who))];
      const wk = sumH(
        e.filter((x) => x.type === "hours" && x.date >= wk0),
        () => true,
      );
      const last = e.reduce((a, x) => (x.date > a ? x.date : a), "");
      return { n, on, wk, last, c: siteClient(n) };
    })
    .sort((a, b) => b.on.length - a.on.length || b.wk - a.wk || b.last.localeCompare(a.last));
  return `<section class="nl-card td-sites"><div class="nl-cardh"><h2>🏗️ Sites</h2><span class="nl-big">${sites.length}</span></div>
    ${
      sites.length
        ? `<div class="td-list">` +
          sites
            .map(
              (s) =>
                `<button type="button" class="td-row td-s" data-s="${esc(s.n)}"><span class="td-top"><b>${esc(siteLabel(s.n))}</b>${s.on.length ? `<span class="tag ok">${s.on.length} on site</span>` : ""}</span><span class="who">${esc([jobNameOf(s.n) ? s.n : "", s.c ? s.c.name : "", s.on.length ? s.on.map(nameOf).join(", ") : "", s.wk ? hrs(s.wk) + " h this week" : "No hours this week"].filter(Boolean).join(" · "))}</span></button>`,
            )
            .join("") +
          `</div>`
        : '<div class="who">No live sites.</div>'
    }
    <div class="td-btns"><button type="button" class="btn" id="td-sites">All sites</button><button type="button" class="btn" id="td-map">🗺️ Map</button></div></section>`;
}
function tdWire() {
  document
    .querySelectorAll("#main .td-c")
    .forEach((b) => (b.onclick = () => openChat(b.dataset.c)));
  document.querySelectorAll("#main .td-s").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.proj = b.dataset.s;
        S.f.projList = false;
        S.f.pjtab = "overview";
        nlGo("projects");
      }),
  );
  if ($("td-chats")) $("td-chats").onclick = () => nlOpenTab("chat");
  if ($("td-sites"))
    $("td-sites").onclick = () => {
      S.f.projList = true;
      nlOpenTab("projects");
    };
  if ($("td-map")) $("td-map").onclick = () => smOpen();
}
