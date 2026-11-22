/* ================= VIDEO MEETING: 🎥 start a Teams video call from any chat or planner booking – everyone taps Join ================= */
import { bossFirst, bossName } from "../core/company-names.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { newId, submitJob } from "../files/outbox.js";
export { vmCallHtml, vmMsgHtml, vmPlanHtml, vmPlanVal, vmWireCall };
/* James (Nov 2026): "can i do like teams calls through the app" – he uses Teams. He saves his own Teams meeting link
   once (settings/app.meetLink; a recurring meeting's link works every time). 🎥 Video meeting in a chat's call sheet
   opens it in Teams and puts a "🎥 Join the video call" message in that chat (msgs/{chat}/m/{id}.meet), so everyone –
   trades or a client in their portal – joins with one tap. A planner booking can carry the link too (plan.meet): its
   page has the Join button and the phone-calendar file has the link. Screen sharing is Teams's own (⋯ More › Share).
   Calls built into SiteHQ itself are on Jasper's list. */
const vmLink = () => String((S.settings || {}).meetLink || "");
const vmOk = (u) => /^https:\/\/[^\s]+$/i.test(String(u || "").trim());
/* James: his meeting link */
function vmSetup(after) {
  openSheet(
    `<h3 id="sheettitle">🎥 Your Teams meeting link</h3>
    <div class="who">Save it once and 🎥 Video meeting in any chat opens it, with a Join button in the chat for everyone.</div>
    <ol class="vm-how"><li>In Teams, open <b>Calendar</b> and make a meeting called e.g. "SiteHQ calls", set to repeat with <b>no end date</b> (or tap <b>Meet now</b>).</li><li>Open it and tap <b>Copy link</b> (or Share › Copy link).</li><li>Paste it here.</li></ol>
    <label for="vm-link">Meeting link<input id="vm-link" maxlength="600" value="${esc(vmLink())}" placeholder="https://teams.microsoft.com/l/meetup-join/…"></label>
    ${formFoot(false, "Save")}`,
    async () => {
      const meetLink = $("vm-link").value.trim();
      if (meetLink && !vmOk(meetLink)) {
        showErr("Paste the whole link – it starts with https://");
        return;
      }
      try {
        await S.db.doc("settings/app").update({ meetLink });
        S.settings = Object.assign({}, S.settings, { meetLink });
        closeForm();
        toast(meetLink ? "Saved" : "Link taken off");
        if (after && meetLink) after();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    "vm-link",
  );
}
/* open the meeting in Teams (a new tab, so the app stays where it was) */
function vmOpen(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
/* 🎥 from a chat: Join in the chat, then open it */
async function vmStart(c) {
  const url = vmLink();
  if (!vmOk(url)) {
    if (ownerMode()) vmSetup(() => vmStart(c));
    else toast(`${bossFirst()} hasn't set up the video meeting link yet`);
    return;
  }
  closeForm();
  const id = newId(),
    at = Date.now(),
    who = ownerMode() ? bossName() : (S.myProfile && S.myProfile.name) || "Someone";
  try {
    await submitJob({
      path: "msgs/" + c.id + "/m",
      coll: "msgs",
      docId: id,
      data: {
        by: S.me,
        byName: who,
        text: "🎥 Video call – tap Join",
        meet: url,
        at,
        site: "",
        jobId: "",
        jobTitle: "",
      },
      files: [],
      also: {
        path: "chats/" + c.id,
        data: { lastAt: at, lastBy: S.me, lastName: who, lastText: "🎥 Video call – tap Join" },
      },
    });
  } catch (e) {
    toast("Couldn't put the Join button in the chat");
  }
  vmOpen(url);
}
/* the call sheet's part */
function vmCallHtml() {
  if (S.client) return "";
  const has = vmOk(vmLink());
  return `<div class="vm-box"><button type="button" class="btn primary" id="vm-go">🎥 Video meeting (Teams)</button><span class="who">${has ? "Opens your Teams meeting and puts a Join button in this chat for everyone. Share your screen in Teams with ⋯ More › Share." : ownerMode() ? "Save your Teams meeting link once to use this." : `${esc(bossFirst())} needs to set this up first.`}</span>${ownerMode() && has ? '<button type="button" class="linkbtn" id="vm-set">Change the link</button>' : ""}</div>`;
}
function vmWireCall(c) {
  if ($("vm-go")) $("vm-go").onclick = () => vmStart(c);
  if ($("vm-set"))
    $("vm-set").onclick = () => {
      closeForm();
      setTimeout(() => vmSetup(), 50);
    };
}
/* a message's Join button */
function vmMsgHtml(m) {
  return m && vmOk(m.meet)
    ? `<a class="btn primary vm-join" href="${esc(m.meet)}" target="_blank" rel="noopener">🎥 Join the video call</a>`
    : "";
}
/* the planner: a tick to add the link to a booking */
function vmPlanHtml(src) {
  if (!ownerMode() || !vmOk(vmLink())) return "";
  return `<label class="inl" style="white-space:normal"><input type="checkbox" id="pe-meet" ${src && src.meet ? "checked" : ""}> 🎥 It's a Teams video call (the link goes on it, with a Join button)</label>`;
}
const vmPlanVal = () => ($("pe-meet") && $("pe-meet").checked ? vmLink() : "");
