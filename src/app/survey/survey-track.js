/* ================= SURVEY TRACK: a door & window survey's progress – sent, followed up, client's answer, ordered, fitted, done ================= */
import { ptAskSign, ptCl, ptOf } from "../clients/portal.js";
import { addDays, esc, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { getFileBlob } from "../files/in-app-files.js";
import { dlgEsc } from "./glass-colours.js";
export { WST };
/* James (Nov 2026): "when it's sent to the client I need a record of when it was sent, follow up, accepted or rejected,
   ordered, fitted, completed; also a way for the client to send back details of any adjustments or changes". Each
   survey keeps a dated list of what happened (r.track: { k, at, note }) and a follow-up date (r.followOn). On the
   survey: 📋 Progress with a button for each step, and ✍ Send to client to approve, which puts the survey PDF in a
   sign-off sheet in their portal (clients/portal.js ptAskSign) – they sign it, or ask for changes and say what. Their
   answer is picked up and written on the survey's progress: ✅ Accepted, or ✏️ Changes asked with what they wrote. */
const WST = (() => {
  const STAGES = [
    ["sent", "📤 Sent to client"],
    ["follow", "📞 Followed up"],
    ["changes", "✏️ Changes asked"],
    ["accepted", "✅ Accepted"],
    ["rejected", "❌ Rejected"],
    ["ordered", "📦 Ordered"],
    ["fitted", "🔧 Fitted"],
    ["done", "🏁 Completed"],
  ];
  const label = (k) => (STAGES.find((s) => s[0] === k) || [k, k])[1];
  const track = (r) => (Array.isArray(r && r.track) ? r.track : []);
  const last = (r) => track(r).slice(-1)[0] || null;
  /* the tag on a survey in the lists */
  function tagHtml(r) {
    const l = last(r);
    const fo =
      r && r.followOn && !["accepted", "rejected", "ordered", "fitted", "done"].includes(l && l.k)
        ? ` <span class="tag day">Follow up ${esc(shortDay(r.followOn))}</span>`
        : "";
    return l
      ? ` <span class="tag ${l.k === "rejected" ? "bad" : l.k === "changes" ? "day" : "ok"}">${esc(label(l.k))} ${esc(shortDay(iso(new Date(l.at))))}</span>${fo}`
      : fo;
  }
  function add(r, k, note, at) {
    r.track = track(r).concat([{ k, at: at || Date.now(), note: note || "" }]);
    if (["accepted", "rejected", "done"].includes(k)) r.followOn = "";
  }
  /* the 📋 Progress panel inside the survey */
  function panelHtml(r) {
    const L = track(r);
    const c = r.clientId ? (S.clients || []).find((x) => x.id === r.clientId) : null;
    return `<h2>📋 Progress <span class="wslbl">sent, answer, order, fitting</span></h2>
      ${
        L.length
          ? `<div class="wst-list">${L.map(
              (x) =>
                `<div class="wst-row"><b>${esc(label(x.k))}</b><span class="who">${esc(stamp(x.at))}</span>${x.note ? `<div class="wst-note">${esc(x.note)}</div>` : ""}</div>`,
            ).join("")}</div>`
          : '<div class="who">Nothing yet. Send it to the client to approve, or tap a step when it happens.</div>'
      }
      ${r.signReq && !r.signReq.done ? `<div class="notice" style="margin-top:6px">✍ With ${esc(c ? c.name : "the client")} to approve since ${esc(stamp(r.signReq.at))} – their answer shows here.</div>` : ""}
      <div class="actions wst-acts"><button type="button" class="btn primary" id="wst-ask"${c ? "" : " disabled"}>✍ Send to client to approve or change</button></div>
      ${c ? "" : '<div class="who">Choose the client above to send it to them.</div>'}
      <div class="wst-steps">${STAGES.map(([k, l]) => `<button type="button" class="pillbtn wst-st" data-k="${k}">${esc(l)}</button>`).join("")}</div>
      <label class="wf wst-fol">Follow up on<input type="date" id="wst-fol" value="${esc(r.followOn || "")}"></label>`;
  }
  /* wire the panel: save(r) keeps the survey, ask() sends it for approval */
  function wire(r, save, ask) {
    const box = document.getElementById("wsx-track");
    if (!box) return;
    const redraw = () => {
      box.innerHTML = panelHtml(r);
      wire(r, save, ask);
    };
    box.querySelectorAll(".wst-st").forEach(
      (b) =>
        (b.onclick = () => {
          const k = b.dataset.k;
          const d = document.createElement("div");
          d.className = "dimask";
          d.style.zIndex = "130";
          d.innerHTML = `<form class="dimbox"><b>${esc(label(k))}</b><label for="wst-on">When<input type="date" id="wst-on" value="${esc(iso(new Date()))}"></label><label for="wst-nt">Note (optional)<input id="wst-nt" maxlength="300" placeholder="${k === "changes" ? "what they want changed" : k === "ordered" ? "e.g. order no., delivery date" : ""}"></label><div class="dimbtns"><button type="button" class="btn wst-x">Cancel</button><button type="submit" class="btn primary">Add</button></div></form>`;
          document.body.appendChild(d);
          dlgEsc(d);
          d.querySelector(".wst-x").onclick = () => d.remove();
          d.querySelector("form").onsubmit = async (e) => {
            e.preventDefault();
            const on = d.querySelector("#wst-on").value;
            const at =
              on && on !== iso(new Date()) ? new Date(on + "T12:00:00").getTime() : Date.now();
            add(r, k, d.querySelector("#wst-nt").value.trim(), at);
            d.remove();
            await save();
            redraw();
            toast(label(k) + " – noted");
          };
        }),
    );
    const fo = document.getElementById("wst-fol");
    if (fo)
      fo.onchange = async () => {
        r.followOn = fo.value;
        await save();
        toast(fo.value ? "Follow up " + shortDay(fo.value) : "No follow up date");
      };
    const ak = document.getElementById("wst-ask");
    if (ak) ak.onclick = () => ask();
  }
  /* send the survey PDF to the client to sign or ask for changes (a sign-off sheet in their portal) */
  async function askClient(r, save, close, keep) {
    const c = r.clientId ? (S.clients || []).find((x) => x.id === r.clientId) : null;
    if (!c) return toast("Choose the client first");
    if (!r.lastPdf) return toast("Make the PDF first (📄 Make the PDF), then send it");
    let blob = null;
    try {
      blob = await getFileBlob(r.lastPdf.assetId);
    } catch (e) {}
    if (!blob) return toast("Couldn't open the PDF – check your connection");
    await save();
    if (close) close();
    S.preAttach = [new File([blob], r.lastPdf.name, { type: "application/pdf" })];
    ptAskSign(
      c,
      null,
      "design",
      async (signId) => {
        if (!signId) return;
        const cur = (S.winSurveys || []).find((x) => x.id === r.id) || r;
        cur.signReq = { id: signId, at: Date.now() };
        add(cur, "sent", "Sent to " + c.name + " to approve or ask for changes");
        if (!cur.followOn) cur.followOn = iso(addDays(new Date(), 3));
        await keep(cur);
      },
      c.site,
    );
    setTimeout(() => {
      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = v;
      };
      set(
        "pa-title",
        (r.title || "Door & window survey") + (r.job && r.job.ref ? " – " + r.job.ref : ""),
      );
      set(
        "pa-det",
        (r.items || [])
          .map(
            (o, i) =>
              `${o.ref || i + 1}: ${[o.loc, o.name || o.kind, o.sw && o.sh ? o.sw + " x " + o.sh + " mm" : ""].filter(Boolean).join(", ")}`,
          )
          .join("\n"),
      );
      set(
        "pa-stmt",
        "The doors and windows on this survey – sizes, styles, colours, glass and which way they open – are right and can be ordered. If anything needs changing, tap “Ask for changes” and say what.",
      );
    }, 80);
  }
  /* pick up the client's answer from their portal and write it on the survey */
  async function check(r) {
    const q = r && r.signReq;
    if (!q || q.done) return false;
    const c = r.clientId ? (S.clients || []).find((x) => x.id === r.clientId) : null;
    if (!c) return false;
    let x = null;
    try {
      const p = ptOf(c);
      if (p) {
        const d = await S.db.doc("portal/" + p.id + "/signs/" + q.id).get();
        x = d.exists ? d.data() : null;
      } else x = (ptCl(c).ptSigns || []).find((y) => y.id === q.id) || null;
    } catch (e) {}
    if (!x || (x.status !== "signed" && x.status !== "changes")) return false;
    if (q.seen === x.status + ":" + (x.signedAt || "")) return false;
    if (x.status === "signed") {
      add(
        r,
        "accepted",
        "Signed by " +
          (x.signedName || c.name) +
          " in their portal" +
          (x.comment ? ": " + x.comment : ""),
        x.signedAt,
      );
      q.done = true;
    } else
      add(
        r,
        "changes",
        (x.signedName ? x.signedName + ": " : "") + (x.comment || "Asked for changes"),
        x.signedAt,
      );
    q.seen = x.status + ":" + (x.signedAt || "");
    return true;
  }
  return { STAGES, tagHtml, panelHtml, wire, askClient, check, add };
})();
