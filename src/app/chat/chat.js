/* ================= CHAT ================= */
import { openCallSheet } from "./calls.js";
import { contactsHtml, wireChatSearch, wireContactButtons, wireContacts } from "./contacts.js";
import { ptChatMembers } from "../clients/portal-calendar.js";
import { ptChatId, ptOf } from "../clients/portal.js";
import { clAddr } from "../clients/stages-planner.js";
import { mapDocs } from "../core/data.js";
import { pickField, pickVal } from "../core/fields.js";
import { $, esc, iso, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, liveSite, ownerMode, siteNames } from "../core/state.js";
import { render, renderTabs } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, saveAsset, uploadErr } from "../files/files.js";
import { newId, submitJob } from "../files/outbox.js";
import { nameOf, teamIds } from "../owner/owner.js";
import {
  VID_MAX,
  audExt,
  audTag,
  exifDate,
  isAud,
  readExif,
  stampPhoto,
  vidExt,
  wireVoice,
} from "../photos/photos.js";
import { myJobs } from "../sites/job-sheets.js";
import { myName } from "../survey/door-window-survey.js";
export {
  CH,
  canPost,
  chatPeople,
  chatTitle,
  chatView,
  closeChat,
  ensureSiteChat,
  initChat,
  initials,
  openChat,
  openClientChat,
  openDM,
  renderChatHead,
  siteChatId,
  siteMessages,
  syncSettings,
  unread,
  visibleChats,
};
const CH = {
  unsub: null,
  open: null,
  msgs: [],
  pending: {},
  tag: null,
  photo: null,
  readTimer: null,
  sel: null,
};
function chatPeople() {
  if (ownerMode())
    return teamIds()
      .map((id) => ({ id, name: nameOf(id) }))
      .concat([{ id: S.me, name: S.ownerName || "James" }]);
  return (S.settings.people || []).concat(
    S.settings.ownerId ? [{ id: S.settings.ownerId, name: S.settings.ownerName || "James" }] : [],
  );
}
function personName(id) {
  if (id === S.me) return "You";
  const p = chatPeople().find((x) => x.id === id);
  if (p) return p.name;
  const c = S.chats.find((x) => x.names && x.names[id]);
  if (c) return c.names[id] + " (client)";
  if (S.client && S.settings && id === S.settings.ownerId) return S.settings.ownerName || "James";
  return "Someone";
}
function visibleChats() {
  const all = S.chats.filter((c) => c.kind);
  if (ownerMode()) return all;
  if (S.client)
    return all.filter(
      (c) =>
        c.kind === "client" && Array.isArray(c.members) && c.members.includes(S.me) && !c.archived,
    );
  return all.filter(
    (c) =>
      c.kind === "team" ||
      c.kind === "site" ||
      (Array.isArray(c.members) && c.members.includes(S.me)),
  );
}
const siteChatId = (site) =>
  "site-" +
  String(site)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
async function ensureSiteChat(site) {
  const id = siteChatId(site);
  if (!S.chats.find((c) => c.id === id)) {
    const d = { kind: "site", site, name: site, members: "all", created: Date.now(), lastAt: 0 };
    await S.db.doc("chats/" + id).set(d);
    S.chats.push(Object.assign({ id }, d));
  }
  return id;
}
function chatTitle(c) {
  if (c.kind === "team") return c.name || "Whole team";
  if (c.kind === "site") return c.site || c.name || "Site chat";
  if (c.kind === "client")
    return S.client ? "Your project team" : "🏡 " + (c.name || "Client chat");
  if (c.kind === "dm") {
    const m = c.members || [];
    if (!m.includes(S.me)) return m.map(personName).join(" and ");
    return (
      m
        .filter((x) => x !== S.me)
        .map(personName)
        .join(", ") || "Direct message"
    );
  }
  return c.name || "Group chat";
}
const myReads = () => (S.myProfile && S.myProfile.reads) || {};
const unread = (c) => c.lastAt && c.lastBy !== S.me && c.lastAt > (myReads()[c.id] || 0);
const initials = (t) =>
  String(t || "?")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
function chatTime(t) {
  if (!t) return "";
  const d = new Date(t);
  return iso(d) === iso(new Date())
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function canPost(c) {
  if (!c) return false;
  if (c.archived) return false;
  if (c.ownerOnly && !ownerMode()) return false;
  return true;
}
function chatView() {
  const owner = ownerMode();
  const tab = S.f.chtab || "chats";
  const allv = visibleChats();
  const list = allv
    .filter((c) => (tab === "sites" ? c.kind === "site" : c.kind !== "site"))
    .sort((a, b) => (b.lastAt || b.created || 0) - (a.lastAt || a.created || 0));
  const uS = allv.filter((c) => c.kind === "site" && unread(c)).length,
    uC = allv.filter((c) => c.kind !== "site" && unread(c)).length;
  const tabs = `<div class="seg chtabs" role="tablist"><button type="button" data-v="chats" aria-pressed="${tab === "chats"}">Chats${uC ? ` <span class="badge">${uC}</span>` : ""}</button><button type="button" data-v="sites" aria-pressed="${tab === "sites"}">Site chats${uS ? ` <span class="badge">${uS}</span>` : ""}</button><button type="button" data-v="contacts" aria-pressed="${tab === "contacts"}">👥 Contacts</button></div>`;
  if (tab === "contacts") {
    $("main").innerHTML = tabs + contactsHtml();
    $("main")
      .querySelectorAll(".chtabs button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.chtab = b.dataset.v;
            render();
          }),
      );
    wireContacts();
    return;
  }
  if (tab === "sites") {
    $("main").innerHTML =
      tabs +
      `<div class="actions"><button class="btn primary" id="ch-site" type="button">+ Add a site chat</button></div>
      <div class="notice">One chat per job. Everything said here is saved to that site, and messages tagged with the site in other chats are copied in too.</div>
      <input type="search" class="ctsearch" id="chq" placeholder="🔍 Search site chats" aria-label="Search chats">
      ${
        list.length
          ? `<div class="chatlist">${list
              .map((c) => {
                const u = unread(c);
                return `<button type="button" class="chatrow" data-c="${esc(c.id)}" data-s="${esc((chatTitle(c) + " " + (c.site || "") + " " + (c.lastText || "")).toLowerCase())}"><span class="avatar site" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 14V7l6-4 6 4v7"/><path d="M6 14v-4h4v4"/></svg></span>
        <span class="cmain"><span class="ctop"><b>${esc(chatTitle(c))}</b><span class="ctime">${chatTime(c.lastAt)}</span></span><span class="clast">${c.archived ? '<span class="tag">Closed</span>' : ""}${c.lastText ? `${c.lastName ? esc(c.lastBy === S.me ? "You" : c.lastName) + ": " : ""}${esc(c.lastText)}` : "No messages yet"}</span></span>${u ? '<span class="udot" aria-label="Unread"></span>' : ""}</button>`;
              })
              .join("")}</div>`
          : '<div class="empty"><strong>No site chats yet</strong>Tap "Add a site chat" and pick the job.</div>'
      }`;
    $("main")
      .querySelectorAll(".chtabs button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.chtab = b.dataset.v;
            render();
          }),
      );
    $("ch-site").onclick = openSiteChatPicker;
    if (
      !$("ch-new2") &&
      (owner ||
        chatPeople().some(
          (p) => p.id !== S.me && (p.id === S.settings.ownerId || S.settings.allowDm),
        ))
    ) {
      $("ch-site").insertAdjacentHTML(
        "afterend",
        `<button class="btn" id="ch-new2" type="button">+ New chat (not tied to a job)</button>`,
      );
      $("ch-new2").onclick = openNewChat;
    }
    $("main")
      .querySelectorAll(".chatrow")
      .forEach((b) => (b.onclick = () => openChat(b.dataset.c)));
    wireChatSearch();
    return;
  }
  const others = owner
    ? []
    : chatPeople().filter(
        (p) => p.id !== S.me && (p.id === S.settings.ownerId || S.settings.allowDm),
      );
  let html =
    tabs +
    `<div class="actions">${
      owner
        ? `<button class="btn primary" id="ch-new" type="button">+ New chat</button><button class="btn" id="ch-set" type="button">Chat settings</button>`
        : others.length
          ? `<button class="btn primary" id="ch-new" type="button">+ New chat</button>`
          : ""
    }</div>`;
  html += `<input type="search" class="ctsearch" id="chq" placeholder="🔍 Search chats and people" aria-label="Search chats and people">`;
  if (owner)
    html += `<div class="notice">You can see every chat, including direct messages between workers.${S.settings.allowDm ? " Workers can message each other directly." : " Workers can only message you directly, plus the group chats they're in."}</div>`;
  html += list.length
    ? `<div class="chatlist">${list
        .map((c) => {
          const t = chatTitle(c);
          const u = unread(c);
          return `<button type="button" class="chatrow" data-c="${esc(c.id)}" data-s="${esc((t + " " + (c.site || "") + " " + (c.lastText || "") + " " + (c.lastName || "")).toLowerCase())}"><span class="avatar ${c.kind}">${c.kind === "team" ? "JEB" : esc(initials(t))}</span>
      <span class="cmain"><span class="ctop"><b>${esc(t)}</b><span class="ctime">${chatTime(c.lastAt)}</span></span>
      <span class="clast">${c.site ? `<span class="mtag">${esc(c.site)}</span> ` : ""}${c.archived ? '<span class="tag">Closed</span>' : ""}${c.ownerOnly ? '<span class="tag">Announcements</span>' : ""}${c.lastText ? `${c.kind !== "dm" && c.lastName ? esc(c.lastBy === S.me ? "You" : c.lastName) + ": " : ""}${esc(c.lastText)}` : "No messages yet"}</span></span>
      ${u ? '<span class="udot" aria-label="Unread"></span>' : ""}</button>`;
        })
        .join("")}</div>`
    : `<div class="empty"><strong>No chats yet</strong>${owner ? "The whole-team chat is set up automatically. Create group chats for each job." : "Chats will appear here."}</div>`;
  html += `<div id="chq-people" hidden><div class="flabel" style="margin-top:12px">People &amp; clients</div>${contactsHtml()
    .replace(/<input[^>]*id="ct-q"[^>]*>/, "")
    .replace(
      /<div class="who" style="margin-top:10px">[\s\S]*$/,
      "",
    )}</div><div class="nothing" id="chq-none" hidden>Nothing matches that.</div>`;
  $("main").innerHTML = html;
  $("main")
    .querySelectorAll(".chtabs button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.chtab = b.dataset.v;
          render();
        }),
    );
  wireChatSearch();
  wireContactButtons();
  if ($("ch-new")) $("ch-new").onclick = openNewChat;
  if ($("ch-set")) $("ch-set").onclick = openChatSettings;
  if ($("ch-dm")) $("ch-dm").onclick = openNewDm;
  $("main")
    .querySelectorAll(".chatrow")
    .forEach((b) => (b.onclick = () => openChat(b.dataset.c)));
}
function openSiteChatPicker() {
  openSheet(
    `<h3 id="sheettitle">Add a site chat</h3>
    ${pickField("sc-site", "Which site?", siteNames(), "", "e.g. 12 Marine Way, Exmouth")}
    <div class="who">If there's already a chat for that site, it opens that one.</div>
    ${formFoot(false, "Open site chat")}`,
    async () => {
      const site = pickVal("sc-site");
      if (!site) {
        showErr("Choose the site.");
        return;
      }
      $("f-save").disabled = true;
      try {
        const id = await ensureSiteChat(site);
        closeForm();
        openChat(id);
      } catch (e) {
        showErr("Couldn't start the chat. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
}
async function openDM(w) {
  const ids = [S.me, w].sort();
  const id = "dm-" + ids.join("-").replace(/[^A-Za-z0-9_\-]/g, "");
  try {
    if (!S.chats.find((c) => c.id === id)) {
      await S.db
        .doc("chats/" + id)
        .set({ kind: "dm", members: ids, created: Date.now(), lastAt: 0 });
      S.chats.push({ id, kind: "dm", members: ids, created: Date.now() });
    }
    closeViewer();
    closeForm();
    openChat(id);
  } catch (e) {
    toast("Couldn't start the chat");
  }
}
async function openClientChat(c) {
  if (!c) return;
  const p = ptOf(c);
  const id = ptChatId(c);
  try {
    if (!S.chats.find((x) => x.id === id)) {
      const d = p
        ? {
            kind: "client",
            name: (c.work ? c.work + ": " : "") + c.name,
            clientId: c.id,
            members: [p.id, S.me],
            names: { [p.id]: p.name },
            site: p.site || "",
            created: Date.now(),
            lastAt: 0,
          }
        : {
            kind: "client",
            name: (c.work ? c.work + ": " : "") + c.name,
            clientId: c.id,
            members: [S.me],
            names: {},
            site: c.site || clAddr(c) || "",
            pending: true,
            created: Date.now(),
            lastAt: 0,
          };
      await S.db.doc("chats/" + id).set(d);
      S.chats.push(Object.assign({ id }, d));
    }
    closeViewer();
    closeForm();
    openChat(id);
    if (!p)
      setTimeout(
        () =>
          toast(
            c.name +
              " hasn't joined the portal yet. They'll see these messages as soon as they join.",
          ),
        400,
      );
  } catch (e) {
    toast("Couldn't start the chat");
  }
}
function openNewChat() {
  const owner = ownerMode();
  const people = chatPeople().filter(
    (p) => p.id !== S.me && (owner || p.id === S.settings.ownerId || S.settings.allowDm),
  );
  const canGroup = owner || S.settings.allowDm;
  openSheet(
    `<h3 id="sheettitle">New chat</h3>
    <div><div class="flabel">Who's it to?</div><div class="seg whopick" id="nc-who"><button type="button" class="nc-all" data-v="__all" aria-pressed="false">👥 Everyone</button>${people.map((p) => `<button type="button" data-v="${esc(p.id)}" aria-pressed="false">${esc(p.name)}</button>`).join("")}${
      owner && (S.clients || []).length
        ? `<span class="pplh">🏡 Clients</span>` +
          (S.clients || [])
            .filter((c) => c.stage !== "lost")
            .sort(
              (a, b) =>
                (ptOf(b) ? 1 : 0) - (ptOf(a) ? 1 : 0) || String(a.name).localeCompare(b.name),
            )
            .map(
              (c) =>
                `<button type="button" data-v="cl:${esc(c.id)}" aria-pressed="false">🏡 ${esc(c.name)}${ptOf(c) ? "" : ' <small class="who">(not joined yet)</small>'}</button>`,
            )
            .join("")
        : ""
    }</div>
      <div class="who" id="nc-hint">Pick one person for a private chat${canGroup ? ", several for a group, or Everyone for the whole team" : ", or Everyone for the whole team"}.</div></div>
    <label for="nc-name" id="nc-namel" hidden>Group name<input id="nc-name" maxlength="60" placeholder="e.g. Kennford team"></label>
    ${owner ? `<div id="nc-sitew" hidden>${pickField("nc-site", "Job / site this chat is about (optional)", siteNames(), "", "e.g. 12 Marine Way, Exmouth", false)}</div>` : ""}
    ${formFoot(false, "Start chat")}`,
    async () => {
      const all = $("nc-who").querySelector(".nc-all").getAttribute("aria-pressed") === "true";
      const sel = [...$("nc-who").querySelectorAll('[aria-pressed="true"]')]
        .map((b) => b.dataset.v)
        .filter((v) => v !== "__all");
      if (all) {
        if (!S.chats.some((c) => c.id === "team")) {
          try {
            await S.db.doc("chats/team").set({
              kind: "team",
              name: "Whole team",
              members: "all",
              created: Date.now(),
              lastAt: 0,
            });
            S.chats.push({ id: "team", kind: "team", name: "Whole team", members: "all" });
          } catch (e) {}
        }
        closeForm();
        S.f.chtab = "chats";
        openChat("team");
        return;
      }
      if (!sel.length) {
        showErr("Choose who it's to.");
        return;
      }
      const cls = sel.filter((v) => v.startsWith("cl:"));
      if (cls.length) {
        if (sel.length > 1) {
          showErr(
            "Clients have their own chat. Pick just the client, then add trades in their portal.",
          );
          return;
        }
        const c = (S.clients || []).find((x) => "cl:" + x.id === cls[0]);
        if (!c) {
          showErr("Couldn't find that client");
          return;
        }
        $("f-save").disabled = true;
        await openClientChat(c);
        return;
      }
      $("f-save").disabled = true;
      try {
        if (sel.length === 1) {
          const ids = [S.me, sel[0]].sort();
          const id = "dm-" + ids.join("-").replace(/[^A-Za-z0-9_\-]/g, "");
          if (!S.chats.find((c) => c.id === id)) {
            await S.db
              .doc("chats/" + id)
              .set({ kind: "dm", members: ids, created: Date.now(), lastAt: 0 });
            S.chats.push({ id, kind: "dm", members: ids, created: Date.now() });
          }
          closeForm();
          openChat(id);
          return;
        }
        if (!canGroup) {
          showErr("Pick one person.");
          $("f-save").disabled = false;
          return;
        }
        const members = [...new Set(sel.concat([S.me]))];
        const name =
          $("nc-name").value.trim() ||
          sel
            .map((id) => (people.find((p) => p.id === id) || {}).name || "")
            .filter(Boolean)
            .map((n) => n.split(" ")[0])
            .join(", ");
        const id = "g-" + newId();
        const doc = {
          kind: "group",
          name,
          members,
          created: Date.now(),
          lastAt: 0,
          createdBy: S.me,
        };
        if ($("nc-site")) doc.site = pickVal("nc-site");
        await S.db.doc("chats/" + id).set(doc);
        S.chats.push(Object.assign({ id }, doc));
        closeForm();
        openChat(id);
      } catch (e) {
        showErr("Couldn't start the chat. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  const sync = () => {
    const all = $("nc-who").querySelector(".nc-all").getAttribute("aria-pressed") === "true";
    const n = [...$("nc-who").querySelectorAll('[aria-pressed="true"]')].filter(
      (b) => b.dataset.v !== "__all",
    ).length;
    $("nc-namel").hidden = all || n < 2 || !canGroup;
    if ($("nc-sitew")) $("nc-sitew").hidden = all || n < 2;
    $("f-save").textContent = all
      ? "Open the Whole team chat"
      : n === 1
        ? "Start private chat"
        : n > 1
          ? "Start group chat (" + (n + 1) + " people)"
          : "Start chat";
  };
  $("nc-who")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const on = b.getAttribute("aria-pressed") !== "true";
          if (b.dataset.v === "__all") {
            $("nc-who")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b ? on : false)));
          } else {
            b.setAttribute("aria-pressed", String(on));
            if (!canGroup && on)
              $("nc-who")
                .querySelectorAll("button")
                .forEach((x) => {
                  if (x !== b) x.setAttribute("aria-pressed", "false");
                });
            $("nc-who").querySelector(".nc-all").setAttribute("aria-pressed", "false");
          }
          sync();
        }),
    );
  sync();
}
function openNewDm() {
  const owner = ownerMode();
  const people = chatPeople().filter(
    (p) => p.id !== S.me && (owner || p.id === S.settings.ownerId || S.settings.allowDm),
  );
  openSheet(
    `<h3 id="sheettitle">Message someone</h3>
    <div class="chatlist">${people.map((p) => `<button type="button" class="chatrow dmpick" data-p="${esc(p.id)}"><span class="avatar">${esc(initials(p.name))}</span><span class="cmain"><b>${esc(p.name)}</b></span></button>`).join("") || '<div class="nothing">Nobody to message yet.</div>'}</div>
    <div class="formactions"><span></span><button type="button" class="btn" id="f-cancel">Cancel</button></div>`,
    () => {},
    null,
  );
  $("form")
    .querySelectorAll(".dmpick")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          const ids = [S.me, b.dataset.p].sort();
          const id = "dm-" + ids.join("-").replace(/[^A-Za-z0-9_\-]/g, "");
          if (!S.chats.find((c) => c.id === id)) {
            try {
              await S.db
                .doc("chats/" + id)
                .set({ kind: "dm", members: ids, created: Date.now(), lastAt: 0 });
              S.chats.push({ id, kind: "dm", members: ids, created: Date.now() });
            } catch (e) {
              toast("Couldn't start the chat");
              return;
            }
          }
          closeForm();
          openChat(id);
        }),
    );
}
function openChatSettings() {
  openSheet(
    `<h3 id="sheettitle">Chat settings</h3>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="cs-dm" ${S.settings.allowDm ? "checked" : ""}> Let workers message each other directly (you can still read these)</label>
    <div class="who">With this off, workers can only message you, plus any group chats you add them to.</div>
    ${formFoot(false, "Save")}`,
    async () => {
      try {
        await S.db
          .doc("settings/app")
          .set(Object.assign({}, S.settings, { allowDm: $("cs-dm").checked }));
        closeForm();
        toast("Saved");
      } catch (e) {
        showErr("Couldn't save.");
      }
    },
    null,
  );
}
function openChatEditor(c) {
  const ids = teamIds();
  const everyone = c ? c.members === "all" : false;
  openSheet(
    `<h3 id="sheettitle">${c ? "Chat settings" : "New group chat"}</h3>
    ${c && c.kind !== "group" ? "" : `<label for="ce-cname">Chat name<input id="ce-cname" required maxlength="60" placeholder="e.g. 12 Marine Way team" value="${esc(c ? c.name || "" : "")}"></label>`}
    ${c && c.kind !== "group" ? "" : `<div><div class="flabel">Who's in it?</div><div class="seg whopick" id="ce-who"><button type="button" class="ce-all" data-v="__all" aria-pressed="${c && Array.isArray(c.members) && ids.length && ids.every((id) => c.members.includes(id))}">👥 Everyone</button>${ids.map((id) => `<button type="button" data-v="${esc(id)}" aria-pressed="${c ? Array.isArray(c.members) && c.members.includes(id) : false}">${esc(nameOf(id))}</button>`).join("") || '<span class="nothing">No employees yet.</span>'}</div></div>`}
    ${c && c.kind === "dm" ? "" : pickField("ce-site", "Job / site this chat is about (optional)", siteNames(), c ? c.site || "" : "", "e.g. 12 Marine Way, Exmouth", false)}
    ${c && c.kind === "dm" ? "" : `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="ce-only" ${c && c.ownerOnly ? "checked" : ""}> Announcements only: only you can post</label>`}
    ${c ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="ce-arch" ${c.archived ? "checked" : ""}> Close this chat (people can read it but not post)</label>` : ""}
    ${formFoot(!!c && c.kind !== "team", c ? "Save" : "Create chat")}`,
    async () => {
      const data = {};
      if ($("ce-cname")) {
        data.name = $("ce-cname").value.trim();
        if (!data.name) {
          showErr("Give the chat a name.");
          return;
        }
      }
      if ($("ce-who")) {
        data.members = [...$("ce-who").querySelectorAll('[aria-pressed="true"]')]
          .map((b) => b.dataset.v)
          .filter((v) => v !== "__all");
        if (!data.members.length) {
          showErr("Choose at least one person.");
          return;
        }
        if (!data.members.includes(S.me)) data.members.push(S.me);
      }
      if ($("ce-site")) data.site = pickVal("ce-site");
      if ($("ce-only")) data.ownerOnly = $("ce-only").checked;
      if ($("ce-arch")) data.archived = $("ce-arch").checked;
      $("f-save").disabled = true;
      try {
        if (c) await S.db.doc("chats/" + c.id).update(data);
        else {
          const id = "g-" + newId();
          const doc = Object.assign({ kind: "group", created: Date.now(), lastAt: 0 }, data);
          await S.db.doc("chats/" + id).set(doc);
          if (!S.chats.some((x) => x.id === id)) S.chats.push(Object.assign({ id }, doc));
          closeForm();
          openChat(id);
          return;
        }
        closeForm();
        toast("Saved");
        renderChatHead();
      } catch (e) {
        showErr("Couldn't save.");
        $("f-save").disabled = false;
      }
    },
    "ce-cname",
  );
  if ($("ce-who"))
    $("ce-who")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const on = b.getAttribute("aria-pressed") !== "true";
            if (b.dataset.v === "__all")
              $("ce-who")
                .querySelectorAll("button")
                .forEach((x) => x.setAttribute("aria-pressed", String(on)));
            else {
              b.setAttribute("aria-pressed", String(on));
              const o = [...$("ce-who").querySelectorAll("button")].filter(
                (x) => x.dataset.v !== "__all",
              );
              $("ce-who")
                .querySelector(".ce-all")
                .setAttribute(
                  "aria-pressed",
                  String(o.length > 0 && o.every((x) => x.getAttribute("aria-pressed") === "true")),
                );
            }
          }),
      );
  armDelete(async () => {
    await S.db.doc("chats/" + c.id).delete();
    closeChat();
  });
}
function openChat(id) {
  if (CH.unsub) {
    CH.unsub();
    CH.unsub = null;
  }
  CH.open = id;
  CH.msgs = [];
  CH.pending = {};
  CH.tag = null;
  CH.photo = null;
  CH.sel = null;
  $("chatwin").hidden = false;
  $("cm-text").value = "";
  renderComposerExtras();
  renderChatHead();
  $("chat-msgs").innerHTML =
    '<div class="nothing" style="text-align:center;padding:30px">Loading…</div>';
  CH.unsub = S.db
    .collection("msgs/" + id + "/m")
    .orderBy("at", "desc")
    .limit(300)
    .onSnapshot(
      (snap) => {
        CH.msgs = mapDocs(snap).reverse();
        CH.msgs.forEach((m) => {
          delete CH.pending[m.id];
        });
        renderMsgs();
        markRead(id);
      },
      () => {
        $("chat-msgs").innerHTML =
          '<div class="nothing" style="text-align:center;padding:30px">Couldn\'t load messages. Close and open the chat again.</div>';
      },
    );
  markRead(id);
}
function closeChat() {
  if (CH.unsub) {
    CH.unsub();
    CH.unsub = null;
  }
  CH.open = null;
  $("chatwin").hidden = true;
  render();
}
function markRead(id) {
  clearTimeout(CH.readTimer);
  CH.readTimer = setTimeout(() => {
    if (!S.db) return;
    const r = Object.assign({}, myReads(), { [id]: Date.now() });
    S.myProfile = Object.assign({}, S.myProfile || {}, { reads: r });
    if (S.client) {
      S.db
        .doc("portal/" + S.me)
        .update({ reads: r })
        .catch(() => {});
      render();
      return;
    }
    S.db
      .doc("sheets/" + S.me)
      .set(Object.assign({}, S.myProfile))
      .catch(() => {});
    renderTabs();
  }, 800);
}
function renderChatHead() {
  const c = S.chats.find((x) => x.id === CH.open);
  if (!c) return;
  const sub =
    c.kind === "team"
      ? "Everyone"
      : c.kind === "dm"
        ? ownerMode() && !(c.members || []).includes(S.me)
          ? "Direct message between workers"
          : "Direct message"
        : Array.isArray(c.members)
          ? c.members.map(personName).join(", ")
          : "";
  $("chat-title").textContent = chatTitle(c);
  $("chat-sub").textContent =
    c.kind === "site" ? "Site chat · saved to this job" : [c.site, sub].filter(Boolean).join(" · ");
  $("chat-gear").hidden = !ownerMode();
  {
    const cl = !!S.client;
    ["cm-tag"].forEach((x) => {
      const e = $(x);
      if (e) e.hidden = cl;
    });
    document
      .querySelectorAll('#composer label[for="cm-cam"],#composer label[for="cm-file"]')
      .forEach((l) => (l.hidden = cl && !S.assets));
  }
  const can = canPost(c);
  $("composer").hidden = !can;
  $("chat-closed").hidden = can;
  $("chat-closed").textContent = c.archived
    ? "This chat has been closed by James. You can still read it."
    : "Only James can post in this chat.";
}
function renderMsgs() {
  const box = $("chat-msgs");
  const c = S.chats.find((x) => x.id === CH.open);
  if (!c) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const owner = ownerMode();
  const all = CH.msgs
    .concat(Object.values(CH.pending).filter((p) => !CH.msgs.some((m) => m.id === p.id)))
    .sort((a, b) => a.at - b.at);
  let last = "";
  box.innerHTML = all.length
    ? all
        .map((m) => {
          const day = new Date(m.at).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          const sep =
            day !== last
              ? `<div class="dsep"><span>${iso(new Date(m.at)) === iso(new Date()) ? "Today" : esc(day)}</span></div>`
              : "";
          last = day;
          const mine = m.by === S.me;
          const canDel = !m.pending && (owner || (mine && !m.deleted));
          const hiddenText = m.deleted && !owner;
          return `${sep}<div class="msg ${mine ? "me" : ""} ${m.deleted ? "del" : ""}" data-m="${esc(m.id)}">
      ${!mine && c.kind !== "dm" ? `<div class="mname">${esc(m.byName || personName(m.by))}</div>` : ""}${m.fromChat ? `<div class="fromchat">Copied from ${esc(m.fromChat)}</div>` : ""}
      ${m.site && !hiddenText ? `<div class="mtag">${esc(m.jobTitle ? m.jobTitle + " · " + m.site : m.site)}</div>` : ""}
      ${(m.photo || m.photoLocal) && !hiddenText ? `<img class="mimg" src="${m.photoLocal || blobUrl(m.photo)}" alt="Photo" data-id="${esc(m.photo || "")}">` : ""}${(m.video || m.videoLocal) && !hiddenText && m.voice ? `<div class="maud">🎤 ${audTag(m.videoLocal || blobUrl(m.video))}</div>` : (m.video || m.videoLocal) && !hiddenText ? `<video class="mimg mvid" src="${m.videoLocal || blobUrl(m.video)}" controls playsinline preload="metadata"></video>` : ""}
      ${hiddenText ? '<div class="mtext"><i>This message was deleted</i></div>' : m.loc ? `<button type="button" class="maplink msgloc" data-addr="${esc(m.loc.addr || "")}" ${m.loc.lat != null ? `data-lat="${m.loc.lat}" data-lon="${m.loc.lon}"` : ""} data-label="${esc(m.loc.label || "")}">📍 <b>${esc(m.loc.label || "Location")}</b><span>${esc(m.loc.addr && m.loc.addr !== m.loc.label ? m.loc.addr : m.loc.lat != null ? (+m.loc.lat).toFixed(5) + ", " + (+m.loc.lon).toFixed(5) : "")}</span><span class="who">Tap to open in maps</span></button>` : m.text ? `<div class="mtext">${esc(m.text)}</div>` : ""}
      ${m.deleted && owner ? '<div class="mdel">Deleted by the sender. Only you can see this.</div>' : ""}
      <div class="mtime">${new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}${m.pending ? " · sending…" : ""}</div>
      ${CH.sel === m.id && canDel ? `<div class="mact"><button type="button" class="pillbtn m-del">${owner && (m.deleted || !mine) ? "Delete for everyone" : "Delete"}</button></div>` : ""}
    </div>`;
        })
        .join("")
    : `<div class="nothing" style="text-align:center;padding:30px">No messages yet. Say hello.</div>`;
  box.querySelectorAll(".msg").forEach(
    (el) =>
      (el.onclick = (e) => {
        if (e.target.classList.contains("mimg")) {
          const id = e.target.dataset.id;
          if (id) openChatPhoto(id);
          return;
        }
        if (e.target.classList.contains("m-del")) {
          delMsg(el.dataset.m);
          return;
        }
        CH.sel = CH.sel === el.dataset.m ? null : el.dataset.m;
        renderMsgs();
      }),
  );
  if (atBottom || !box.dataset.init) {
    box.scrollTop = box.scrollHeight;
    box.dataset.init = "1";
  }
}
function openChatPhoto(id) {
  openViewer(
    `<img src="${blobUrl(id)}" alt="Photo" style="width:100%;border-radius:8px"><div class="actions" style="margin-top:10px"><button class="btn primary" id="cp-save" type="button">Save photo</button></div>`,
  );
  $("viewer").style.zIndex = 28;
  $("cp-save").onclick = () => saveAsset(id, "chat photo.jpg");
}
async function delMsg(mid) {
  const m = CH.msgs.find((x) => x.id === mid);
  if (!m) return;
  CH.sel = null;
  try {
    if (ownerMode() && (m.deleted || m.by !== S.me))
      await S.db.doc("msgs/" + CH.open + "/m/" + mid).delete();
    else
      await S.db
        .doc("msgs/" + CH.open + "/m/" + mid)
        .update({ deleted: true, deletedAt: Date.now() });
  } catch (e) {
    toast("Couldn't delete");
    renderMsgs();
  }
}
function tagOptions() {
  const jobs = (ownerMode() ? S.jobs : myJobs()).filter((j) => j.status !== "closed");
  const sites = [
    ...new Set(
      siteNames()
        .concat(jobs.map((j) => j.site))
        .filter(liveSite),
    ),
  ].sort();
  return { jobs, sites };
}
function renderComposerExtras() {
  const t = CH.tag,
    p = CH.photo;
  $("cm-extras").hidden = !t && !p;
  $("cm-extras").innerHTML =
    `${t ? `<span class="mtag big">${esc(t.jobTitle ? t.jobTitle + " · " + t.site : t.site)} <button type="button" id="cm-untag" aria-label="Remove tag">✕</button></span>` : ""}
    ${p ? `<span class="mtag big">${isAud(p) ? "🎤 Voice note" + (p.secs ? " (" + p.secs + "s)" : "") : /^video\//.test(p.type || "") ? "Video" : "Photo"}: ${esc(isAud(p) ? "ready to send" : p.name)} <button type="button" id="cm-unphoto" aria-label="Remove photo">✕</button></span>` : ""}`;
  if ($("cm-untag"))
    $("cm-untag").onclick = () => {
      CH.tag = null;
      renderComposerExtras();
    };
  if ($("cm-unphoto"))
    $("cm-unphoto").onclick = () => {
      CH.photo = null;
      renderComposerExtras();
    };
  $("cm-tag").classList.toggle("on", !!t);
}
async function sendMsg() {
  const c = S.chats.find((x) => x.id === CH.open);
  if (!c || !canPost(c)) return;
  const text = $("cm-text").value.trim();
  const photo = CH.photo,
    tag = CH.tag;
  if (!text && !photo) return;
  const id = newId(),
    at = Date.now();
  const data = {
    by: S.me,
    byName: myName(),
    text,
    at,
    site: tag ? tag.site : c.kind === "site" ? c.site : "",
    jobId: tag ? tag.jobId : "",
    jobTitle: tag ? tag.jobTitle : "",
  };
  $("cm-text").value = "";
  $("cm-text").style.height = "auto";
  CH.photo = null;
  renderComposerExtras();
  const files = [];
  if (photo && isAud(photo)) {
    files.push({ blob: photo, name: "voice." + audExt(photo.type), field: "video" });
    data.voice = true;
    data.videoType = photo.type || "audio/mp4";
    CH.pending[id] = Object.assign(
      { id, pending: true, videoLocal: URL.createObjectURL(photo) },
      data,
    );
  } else if (photo && /^video\//.test(photo.type || "")) {
    files.push({ blob: photo, name: "chat." + vidExt(photo.type), field: "video" });
    data.videoType = photo.type || "video/mp4";
    CH.pending[id] = Object.assign(
      { id, pending: true, videoLocal: URL.createObjectURL(photo) },
      data,
    );
  } else if (photo) {
    try {
      const ex = readExif(await photo.slice(0, 262144).arrayBuffer());
      const blob = await stampPhoto(photo, {
        site: data.site || chatTitle(c),
        takenAt: exifDate(ex.date) || photo.lastModified || Date.now(),
        lat: ex.lat ?? null,
        lon: ex.lon ?? null,
        name: myName(),
      });
      files.push({ blob, name: "chat.jpg", field: "photo" });
      CH.pending[id] = Object.assign(
        { id, pending: true, photoLocal: URL.createObjectURL(blob) },
        data,
      );
    } catch (e) {
      toast("That photo couldn't be opened. Set your camera to save photos as JPG.");
      if (!text) return;
    }
  }
  if (!CH.pending[id]) CH.pending[id] = Object.assign({ id, pending: true }, data);
  const box = $("chat-msgs");
  renderMsgs();
  box.scrollTop = box.scrollHeight;
  try {
    const r = await submitJob({
      path: "msgs/" + c.id + "/m",
      coll: "msgs",
      docId: id,
      data,
      files,
      also: {
        path: "chats/" + c.id,
        data: {
          lastAt: at,
          lastBy: S.me,
          lastName: myName(),
          lastText: (
            text ||
            (photo && isAud(photo)
              ? "🎤 Voice note"
              : photo && /^video\//.test(photo.type || "")
                ? "Video"
                : "Photo")
          ).slice(0, 120),
        },
      },
    });
    if (r === "queued") toast("No signal. The message will send when you're back online.");
    if (data.site && c.kind !== "site" && r !== "queued") {
      try {
        const sid = await ensureSiteChat(data.site);
        const m = await S.db.doc("msgs/" + c.id + "/m/" + id).get();
        const md = m.exists ? m.data() : data;
        await S.db
          .doc("msgs/" + sid + "/m/" + id)
          .set(Object.assign({}, md, { copyOf: c.id, fromChat: chatTitle(c) }));
        await S.db.doc("chats/" + sid).update({
          lastAt: at,
          lastBy: S.me,
          lastName: myName(),
          lastText: (
            text ||
            (photo && isAud(photo)
              ? "🎤 Voice note"
              : photo && /^video\//.test(photo.type || "")
                ? "Video"
                : "Photo")
          ).slice(0, 120),
        });
      } catch (e) {}
    }
  } catch (e) {
    delete CH.pending[id];
    renderMsgs();
    toast(e && e.code ? uploadErr(e) : "Message didn't send");
  }
}
let settingsSyncT = null;
function syncSettings() {
  if (!ownerMode() && !S.owner) return;
  clearTimeout(settingsSyncT);
  settingsSyncT = setTimeout(async () => {
    const people = teamIds().map((id) => ({ id, name: nameOf(id) }));
    const want = {
      ownerId: S.me,
      ownerName: S.ownerName || "James",
      people,
      allowDm: !!S.settings.allowDm,
    };
    const cur = {
      ownerId: S.settings.ownerId,
      ownerName: S.settings.ownerName,
      people: S.settings.people || [],
      allowDm: !!S.settings.allowDm,
    };
    if (JSON.stringify(want) !== JSON.stringify(cur)) {
      try {
        await S.db.doc("settings/app").set(Object.assign({}, S.settings, want));
      } catch (e) {}
    }
    if (S.chatsLoaded && !S.chats.some((c) => c.id === "team")) {
      try {
        await S.db.doc("chats/team").set({
          kind: "team",
          name: "Whole team",
          members: "all",
          created: Date.now(),
          lastAt: 0,
        });
      } catch (e) {}
    }
  }, 1500);
}
async function siteMessages(site) {
  const out = [];
  for (const c of S.chats) {
    try {
      const snap = await S.db
        .collection("msgs/" + c.id + "/m")
        .where("site", "==", site)
        .get();
      mapDocs(snap).forEach((m) => {
        if (!m.copyOf && (!m.deleted || ownerMode())) out.push(Object.assign({ chat: c }, m));
      });
    } catch (e) {}
  }
  return out.sort((a, b) => b.at - a.at);
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initChat() {
  $("chat-back").onclick = closeChat;
  $("chat-gear").onclick = () => {
    const c = S.chats.find((x) => x.id === CH.open);
    if (!c) return;
    if (c.kind === "client") {
      const cl = (S.clients || []).find((x) => x.id === c.clientId);
      const p = cl && ptOf(cl);
      if (cl && p) {
        ptChatMembers(cl, p, c, () => renderChatHead());
        return;
      }
    }
    openChatEditor(c);
  };
  $("chat-call").onclick = () => openCallSheet();
  $("cm-tag").onclick = () => {
    const { jobs, sites } = tagOptions();
    openSheet(
      `<h3 id="sheettitle">Tag a job</h3>
    ${jobs.length ? `<div class="flabel">Job sheets and snag lists</div><div class="chatlist">${jobs.map((j) => `<button type="button" class="chatrow tagpick" data-j="${esc(j.id)}"><span class="cmain"><b>${esc(j.title)}</b><span class="clast">${esc(j.site)}</span></span></button>`).join("")}</div>` : ""}
    <div class="flabel">Sites</div><div class="chatlist">${sites.map((s) => `<button type="button" class="chatrow tagpick" data-s="${esc(s)}"><span class="cmain"><b>${esc(s)}</b></span></button>`).join("") || '<div class="nothing">No sites set up yet.</div>'}</div>
    <div class="formactions"><span>${CH.tag ? '<button type="button" class="linkdanger" id="tg-clear">Remove tag</button>' : ""}</span><button type="button" class="btn" id="f-cancel">Cancel</button></div>`,
      () => {},
      null,
    );
    $("form")
      .querySelectorAll(".tagpick")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (b.dataset.j) {
              const j = S.jobs.find((x) => x.id === b.dataset.j);
              CH.tag = { site: j.site, jobId: j.id, jobTitle: j.title };
            } else CH.tag = { site: b.dataset.s, jobId: "", jobTitle: "" };
            closeForm();
            renderComposerExtras();
            $("cm-text").focus();
          }),
      );
    if ($("tg-clear"))
      $("tg-clear").onclick = () => {
        CH.tag = null;
        closeForm();
        renderComposerExtras();
      };
  };
  $("cm-cam").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!S.assets) {
      toast(
        "You don't have permission to send photos. Ask James to make you an Editor on this page.",
      );
      return;
    }
    CH.photo = f;
    e.target.value = "";
    renderComposerExtras();
  };
  if ($("cm-voice"))
    wireVoice($("cm-voice"), (f) => {
      if (!S.assets) {
        toast(
          "You don't have permission to send voice notes. Ask James to make you an Editor on this page.",
        );
        return;
      }
      if (f.size > VID_MAX) {
        toast("That recording is too big. Keep voice notes under about 10 minutes.");
        return;
      }
      CH.photo = f;
      renderComposerExtras();
      toast("Voice note ready. Tap send ➤");
    });
  if ($("cm-vid2"))
    $("cm-vid2").onchange = (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      if (!S.assets) {
        toast(
          "You don't have permission to send videos. Ask James to make you an Editor on this page.",
        );
        return;
      }
      if (f.size > VID_MAX) {
        toast(
          `That video is too big (${(f.size / 1048576).toFixed(0)} MB). Keep it to about 20 seconds.`,
        );
        return;
      }
      CH.photo = f;
      renderComposerExtras();
    };
  $("cm-file").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!S.assets) {
      toast(
        "You don't have permission to send photos. Ask James to make you an Editor on this page.",
      );
      return;
    }
    CH.photo = f;
    e.target.value = "";
    renderComposerExtras();
  };
  $("cm-text").addEventListener("input", () => {
    const t = $("cm-text");
    t.style.height = "auto";
    t.style.height = Math.min(140, t.scrollHeight) + "px";
  });
  $("cm-text").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) {
      e.preventDefault();
      sendMsg();
    }
  });
  $("composer").addEventListener("submit", (e) => {
    e.preventDefault();
    sendMsg();
  });
}
