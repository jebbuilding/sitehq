/* ================= CALLBACKS: a client reports a problem after the job – logged, booked in, fixed, and they sign it off ================= */
import { PT } from "./portal.js";
import { viewClient } from "./quick-enquiry.js";
import { clAddr } from "./stages-planner.js";
import { mapDocs } from "../core/data.js";
import { $, addDays, esc, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { blobUrl, uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { crewIds, nameOf } from "../owner/owner.js";
import { shrinkImage } from "../safety/training.js";
export { CBK, initCallbacks };
/* James (Nov 2026, "callbacks after the job"): in their portal's 🏠 Home, 🔧 Something not right? lets a client report
   a problem – what it is, where, how urgent, and photos. It's kept in their portal (portal/{uid}/callbacks/{id}). James
   sees new ones on Today and on the client's page, where 📅 Book it in gives it to a trade on a day (on the planner, for
   that trade) and ✓ Fixed asks the client to check. The client then taps ✓ It's sorted (signed off with their name) or
   Still not right (with what's wrong), which opens it again. Every callback and what happened stays on the client's
   page. Status: "new" → "booked" → "fixed" → "done" (or "reopened"). */
const CBK = (() => {
  const URG = [
    ["urgent", "🚨 Urgent (a leak, something unsafe)"],
    ["soon", "Soon"],
    ["whenever", "When it suits"],
  ];
  const ST = {
    new: ["Reported", "bad"],
    booked: ["Booked in", "day"],
    fixed: ["Fixed – please check", "warn"],
    done: ["Sorted ✓", "ok"],
    reopened: ["Not right yet", "bad"],
  };
  const tag = (x) =>
    `<span class="tag ${(ST[x.status] || ST.new)[1]}">${esc((ST[x.status] || ST.new)[0])}</span>`;
  const urgTxt = (k) => (URG.find((u) => u[0] === k) || URG[2])[1];
  /* ---- the owner's copy of every client's callbacks, kept up to date ---- */
  const subs = {};
  function watch() {
    if (!S.owner || !S.db) return;
    (S.clients || []).forEach((c) => {
      const uid = c.portalUid;
      if (!uid || subs[uid]) return;
      try {
        subs[uid] = S.db.collection("portal/" + uid + "/callbacks").onSnapshot(
          (snap) => {
            const L = mapDocs(snap).map((x) => Object.assign(x, { uid, clientId: c.id }));
            S.callbacks = (S.callbacks || []).filter((x) => x.uid !== uid).concat(L);
            if (
              !document.querySelector(
                "#sheet:not([hidden]) input:focus, #sheet:not([hidden]) textarea:focus",
              )
            )
              render();
          },
          () => {},
        );
      } catch (e) {}
    });
  }
  function initCallbacks() {
    setTimeout(watch, 3000);
    setInterval(watch, 60000);
  }
  const forClient = (c) =>
    (S.callbacks || [])
      .filter((x) => x.clientId === c.id)
      .sort((a, b) => (b.created || 0) - (a.created || 0));
  const open = () => (S.callbacks || []).filter((x) => x.status !== "done");
  /* ---- the owner: Today and the client's page ---- */
  function todayCard() {
    if (!S.owner) return "";
    const L = open().filter((x) => x.status === "new" || x.status === "reopened");
    if (!L.length) return "";
    return `<div class="card cbk-today"><div class="cardbody"><b>🔧 Callbacks to sort</b>${L.map(
      (x) => {
        const c = (S.clients || []).find((y) => y.id === x.clientId) || {};
        return `<button type="button" class="incrow cbk-go" data-c="${esc(x.clientId)}"><span><b>${esc(c.name || "A client")}</b> ${x.urg === "urgent" ? "🚨" : ""}<br><span class="who">${esc(String(x.text || "").slice(0, 80))}</span></span>${tag(x)}</button>`;
      },
    ).join("")}</div></div>`;
  }
  function wireToday() {
    document.querySelectorAll(".cbk-go").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((y) => y.id === b.dataset.c);
          if (c) viewClient(c);
        }),
    );
  }
  function clientHtml(c) {
    if (!S.owner || !c.portalUid) return "";
    const L = forClient(c);
    if (!L.length) return "";
    return `<div class="flabel" style="margin-top:12px">🔧 Callbacks (${L.length})</div><div class="cbk-list">${L.map(
      (
        x,
      ) => `<div class="card cbk-it" data-id="${esc(x.id)}"><div class="cbk-h"><b>${x.urg === "urgent" ? "🚨 " : ""}${esc(x.text || "")}</b>${tag(x)}</div>
        <div class="who">${esc([x.room, urgTxt(x.urg), "reported " + stamp(x.created)].filter(Boolean).join(" · "))}</div>
        ${(x.photos || []).length ? `<div class="cbk-ph">${x.photos.map((a) => `<img src="${blobUrl(a)}" alt="">`).join("")}</div>` : ""}
        ${(x.log || []).map((l) => `<div class="who">• ${esc(stamp(l.at))}: ${esc(l.t)}</div>`).join("")}
        ${x.status === "done" ? "" : `<div class="actions"><button type="button" class="btn cbk-book" data-id="${esc(x.id)}">📅 Book it in</button><button type="button" class="btn primary cbk-fix" data-id="${esc(x.id)}">✓ Fixed – ask them to check</button></div>`}</div>`,
    ).join("")}</div>`;
  }
  async function upd(x, d, logT) {
    const log = (x.log || []).concat(logT ? [{ at: Date.now(), t: logT }] : []);
    await S.db
      .doc("portal/" + x.uid + "/callbacks/" + x.id)
      .update(Object.assign({}, d, { log, updated: Date.now() }));
    S.callbacks = (S.callbacks || []).map((y) =>
      y.id === x.id && y.uid === x.uid ? Object.assign({}, y, d, { log }) : y,
    );
  }
  function wireClient(c) {
    document.querySelectorAll(".cbk-book").forEach(
      (b) =>
        (b.onclick = () => {
          const x = forClient(c).find((y) => y.id === b.dataset.id);
          if (!x) return;
          closeViewer();
          openSheet(
            `<h3 id="sheettitle">📅 Book in the callback</h3><div class="who">${esc(c.name)}: ${esc(x.text || "")}</div>
            <label for="cbk-who">Who's going<select id="cbk-who">${crewIds()
              .map((id) => `<option value="${esc(id)}">${esc(nameOf(id))}</option>`)
              .join("")}</select></label>
            <div class="grid2"><label for="cbk-d">Day<input id="cbk-d" type="date" value="${esc(iso(addDays(new Date(), 1)))}" required></label><label for="cbk-t">Time<input id="cbk-t" type="time" value="09:00"></label></div>
            ${formFoot(false, "Book it in")}`,
            async () => {
              const who = $("cbk-who").value,
                d = $("cbk-d").value,
                t = $("cbk-t").value;
              if (!d) return showErr("Pick the day.");
              try {
                await S.db.doc("plan/cbk-" + x.id).set({
                  title: "Callback: " + c.name + " – " + String(x.text || "").slice(0, 60),
                  type: "work",
                  from: d,
                  to: d,
                  time: t,
                  site: c.site || "",
                  people: [who],
                  vis: "all",
                  notes: [clAddr(c), c.phone, x.room, x.text].filter(Boolean).join("\n"),
                  clientId: c.id,
                  created: Date.now(),
                  updated: Date.now(),
                });
                await upd(
                  x,
                  { status: "booked", bookedFor: d, bookedWho: who },
                  "Booked in for " + shortDay(d) + " " + t + " – " + nameOf(who),
                );
                closeForm();
                toast("Booked in – it's on " + nameOf(who) + "'s planner");
                viewClient(c);
              } catch (e) {
                showErr("Couldn't save. Check your connection.");
              }
            },
          );
        }),
    );
    document.querySelectorAll(".cbk-fix").forEach(
      (b) =>
        (b.onclick = async () => {
          const x = forClient(c).find((y) => y.id === b.dataset.id);
          if (!x) return;
          try {
            await upd(
              x,
              { status: "fixed", fixedAt: Date.now() },
              "Fixed – asked " + c.name + " to check",
            );
            toast("They'll be asked to check it and sign it off");
            viewClient(c);
          } catch (e) {
            toast("Couldn't save");
          }
        }),
    );
  }
  /* ---- the client, in their portal ---- */
  function portalHtml(C) {
    const L = (PT.callbacks || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0));
    return `<div class="card cbk-pt"><b>🔧 Something not right?</b><div class="who">Tell us about any problem with the work – we'll sort it.</div>
      ${L.map((x) => `<div class="cbk-ptit"><div class="cbk-h"><span>${esc(x.text || "")}</span>${tag(x)}</div>${x.status === "booked" && x.bookedFor ? `<div class="who">We're coming ${esc(shortDay(x.bookedFor))}.</div>` : ""}${x.status === "fixed" ? `<div class="who">We've fixed it – is it sorted?</div><div class="actions"><button type="button" class="btn primary cbk-ok" data-id="${esc(x.id)}">✓ It's sorted</button><button type="button" class="btn cbk-no" data-id="${esc(x.id)}">Still not right</button></div>` : ""}</div>`).join("")}
      <div class="actions"><button type="button" class="btn" id="cbk-new">🔧 Report a problem</button></div></div>`;
  }
  function wirePortal(C) {
    /* their callbacks, live */
    if (!PT.cbkSub && S.db && S.me) {
      try {
        PT.cbkSub = S.db.collection("portal/" + S.me + "/callbacks").onSnapshot(
          (snap) => {
            const L = mapDocs(snap);
            PT.callbacks = L;
            if (!document.querySelector("#sheet:not([hidden])")) render();
          },
          () => {},
        );
      } catch (e) {}
    }
    if ($("cbk-new"))
      $("cbk-new").onclick = () => {
        const pick = [];
        openSheet(
          `<h3 id="sheettitle">🔧 Report a problem</h3>
          <label for="cbk-tx">What's wrong<textarea id="cbk-tx" maxlength="1500" required placeholder="e.g. The back door sticks when it rains"></textarea></label>
          <label for="cbk-rm">Where<input id="cbk-rm" maxlength="80" placeholder="e.g. Kitchen"></label>
          <label for="cbk-u">How urgent<select id="cbk-u">${URG.map(([k, l]) => `<option value="${k}"${k === "soon" ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
          <label class="btn cbk-up">📷 Add photos<input type="file" id="cbk-ph" accept="image/*" multiple></label><div class="who" id="cbk-pn"></div>
          ${formFoot(false, "Send it")}`,
          async () => {
            const text = $("cbk-tx").value.trim();
            if (!text) return showErr("Say what's wrong.");
            $("f-save").disabled = true;
            const photos = [];
            for (const f of pick.slice(0, 4))
              try {
                const a = await uploadFile(await shrinkImage(f, 1600), f.name || "photo.jpg");
                photos.push(a.id);
              } catch (e) {}
            try {
              const id = newId();
              await S.db.doc("portal/" + S.me + "/callbacks/" + id).set({
                text,
                room: $("cbk-rm").value.trim(),
                urg: $("cbk-u").value,
                photos,
                status: "new",
                created: Date.now(),
                log: [{ at: Date.now(), t: "Reported" }],
              });
              try {
                await S.db.doc("portal/" + S.me).update({ clientAct: Date.now() });
              } catch (e) {}
              closeForm();
              toast("Sent – we'll be in touch");
            } catch (e) {
              showErr("Couldn't send. Check your signal.");
              $("f-save").disabled = false;
            }
          },
          "cbk-tx",
        );
        $("cbk-ph").onchange = (e) => {
          [...(e.target.files || [])].forEach((f) => pick.push(f));
          $("cbk-pn").textContent = pick.length
            ? pick.length + " photo" + (pick.length === 1 ? "" : "s") + " added"
            : "";
        };
      };
    const answer = (ok) => async (e) => {
      const id = e.currentTarget.dataset.id;
      const x = (PT.callbacks || []).find((y) => y.id === id);
      if (!x) return;
      let note = "";
      if (!ok) {
        note = window.prompt("What's still not right?") || "";
        if (!note) return;
      }
      try {
        const log = (x.log || []).concat([
          {
            at: Date.now(),
            t: ok
              ? "Signed off as sorted by " + (C.name || "the client")
              : "Still not right: " + note,
          },
        ]);
        await S.db
          .doc("portal/" + S.me + "/callbacks/" + id)
          .update(
            ok
              ? { status: "done", doneAt: Date.now(), doneBy: C.name || "", log }
              : { status: "reopened", log },
          );
        toast(ok ? "Thank you!" : "Sent – we'll come back to it");
      } catch (er) {
        toast("Couldn't send. Check your signal.");
      }
    };
    document.querySelectorAll(".cbk-ok").forEach((b) => (b.onclick = answer(true)));
    document.querySelectorAll(".cbk-no").forEach((b) => (b.onclick = answer(false)));
  }
  return {
    initCallbacks,
    todayCard,
    wireToday,
    clientHtml,
    wireClient,
    portalHtml,
    wirePortal,
    open,
  };
})();
function initCallbacks() {
  CBK.initCallbacks();
}
