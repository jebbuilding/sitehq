/* ================= CLIENT CHOICES: the client picks finishes in their portal within an allowance; over it becomes an extra to sign ================= */
import { PT, ptRefresh } from "./portal.js";
import { mapDocs } from "../core/data.js";
import { $, esc, gbp, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { shrinkImage } from "../safety/training.js";
import { sdSet } from "../sales/sales-calc.js";
import { vrNew, vrPrefill } from "../sales/variations.js";
export {
  csClientHtml,
  csClientStart,
  csClientWire,
  csOpenCount,
  csOwnerHtml,
  csOwnerWatch,
  csOwnerWire,
};
/* From a client's portal page James asks them to choose (e.g. "Kitchen worktop", allowance £1,000, by Friday) and
   gives the options – from his sample library (photo and name come with it) or his own – each with its price. The
   client sees a 🎨 Choices tab: the photos, the prices, and for each option whether it is within their allowance or
   how much over. They tap Choose (and can change their mind until James locks it). James sees what they chose; if it
   is over the allowance, one tap starts a variation for the difference for them to sign, and the choice is locked.
   Stored in portal/{uid}/picks/{id} (the client can read and write their own; the owner reads them all). */
const CS = { mine: [], mgr: {} };
const csOver = (pk, opt) =>
  Math.round(((+(opt && opt.price) || 0) - (+pk.allowance || 0)) * 100) / 100;
const csOpt = (pk) => (pk.choice && (pk.options || []).find((o) => o.id === pk.choice.opt)) || null;
/* ---------- client side ---------- */
function csClientStart() {
  PT.unsub.push(
    S.db.collection("portal/" + S.me + "/picks").onSnapshot(
      (snap) => {
        CS.mine = mapDocs(snap)
          .filter((x) => x.title)
          .sort((a, b) => (a.created || 0) - (b.created || 0));
        render();
      },
      () => {},
    ),
  );
}
function csList(C) {
  return C && C._preview ? CS.mgr[(PT.mgr && PT.mgr.uid) || ""] || [] : CS.mine;
}
const csOpenCount = (C) => csList(C).filter((x) => !x.choice && x.status !== "locked").length;
function csClientHtml(C) {
  const L = csList(C);
  if (!L.length)
    return `<div class="empty"><strong>Nothing to choose yet</strong>When there are finishes for you to pick, they'll be here with photos and prices.</div>`;
  return L.map((pk) => {
    const ch = csOpt(pk);
    const locked = pk.status === "locked";
    return `<div class="card cs-card"><div class="cs-head"><b>${esc(pk.title)}</b>${pk.room ? ` <span class="who">· ${esc(pk.room)}</span>` : ""}${ch ? ` <span class="tag ok">Chosen</span>` : pk.due ? ` <span class="tag day">Choose by ${esc(shortDay(pk.due))}</span>` : ""}${locked ? ` <span class="tag">Locked</span>` : ""}</div>
      ${+pk.allowance ? `<div class="who">Your allowance: <b>${gbp(+pk.allowance)}</b> (included in your price)</div>` : ""}
      ${pk.note ? `<div class="sub">${esc(pk.note)}</div>` : ""}
      <div class="cs-opts">${(pk.options || [])
        .map((o) => {
          const ov = csOver(pk, o);
          const on = ch && ch.id === o.id;
          return `<div class="cs-opt${on ? " on" : ""}">${o.photo ? `<img src="${blobUrl(o.photo)}" alt="${esc(o.name)}" loading="lazy">` : `<span class="cs-nophoto" aria-hidden="true">🎨</span>`}
          <b>${esc(o.name)}</b>${o.note ? `<span class="who">${esc(o.note)}</span>` : ""}
          <span>${gbp(+o.price || 0)}</span>
          <span class="who">${+pk.allowance ? (ov > 0 ? `${gbp(ov)} over your allowance – an extra for you to sign` : ov < 0 ? `${gbp(-ov)} under your allowance` : "Exactly your allowance") : ""}</span>
          ${on ? `<span class="tag ok">Your choice</span>` : !locked ? `<button type="button" class="btn${ch ? "" : " primary"} cs-pick" data-p="${esc(pk.id)}" data-o="${esc(o.id)}">${ch ? "Change to this" : "Choose this"}</button>` : ""}</div>`;
        })
        .join("")}</div>
      ${ch ? `<div class="who">You chose ${esc(ch.name)} on ${esc(stamp(pk.choice.at))}${locked ? "." : ". You can change it until we lock it in."}</div>` : ""}</div>`;
  }).join("");
}
function csClientWire(C) {
  document.querySelectorAll(".cs-pick").forEach(
    (b) =>
      (b.onclick = () => {
        const pk = csList(C).find((x) => x.id === b.dataset.p);
        const o = pk && (pk.options || []).find((x) => x.id === b.dataset.o);
        if (!pk || !o) return;
        if (C && C._preview) {
          toast("This is what your client sees – they choose here");
          return;
        }
        const ov = csOver(pk, o);
        const d = document.createElement("div");
        d.className = "dimask";
        d.innerHTML = `<div class="dimbox" role="alertdialog" aria-label="Your choice"><b>Choose ${esc(o.name)}?</b><div class="who">${esc(pk.title)} · ${gbp(+o.price || 0)}${+pk.allowance && ov > 0 ? `<br>That's ${gbp(ov)} over your allowance. ${esc(coData().name)} will send you the extra to sign before it's ordered.` : ""}</div><div class="dimbtns"><button type="button" class="btn cs-no">Not yet</button><button type="button" class="btn primary cs-yes">Yes, choose it</button></div></div>`;
        document.body.appendChild(d);
        d.querySelector(".cs-no").onclick = () => d.remove();
        d.querySelector(".cs-yes").onclick = async () => {
          d.remove();
          try {
            await S.db.doc("portal/" + S.me + "/picks/" + pk.id).update({
              choice: { opt: o.id, name: o.name, price: +o.price || 0, at: Date.now() },
              status: "chosen",
            });
            toast("Thanks – your choice is saved");
          } catch (e) {
            toast("Couldn't save – check your connection");
          }
        };
      }),
  );
}
/* ---------- owner side (on the client's portal page) ---------- */
function csOwnerWatch(uid) {
  PT.mgrUnsub.push(
    S.db.collection("portal/" + uid + "/picks").onSnapshot(
      (snap) => {
        CS.mgr[uid] = mapDocs(snap)
          .filter((x) => x.title)
          .sort((a, b) => (a.created || 0) - (b.created || 0));
        ptRefresh();
      },
      () => {},
    ),
  );
}
function csOwnerHtml(c, p) {
  const L = CS.mgr[p.id] || [];
  return `<div class="ptsec"><div class="ptsech"><b>🎨 Choices for them to make (${L.length})</b><button type="button" class="btn primary" id="cs-add">+ Ask them to choose</button></div>
    ${
      L.map((pk) => {
        const ch = csOpt(pk);
        const ov = ch ? csOver(pk, ch) : 0;
        return `<div class="cs-row"><span><b>${esc(pk.title)}</b>${pk.room ? ` · ${esc(pk.room)}` : ""} <span class="tag ${ch ? (ov > 0 ? "bad" : "ok") : "day"}">${ch ? "Chosen" : "Waiting"}</span><br><span class="who">${ch ? `${esc(ch.name)} · ${gbp(+ch.price || 0)}${+pk.allowance ? (ov > 0 ? ` · ${gbp(ov)} over the ${gbp(+pk.allowance)} allowance` : " · within the allowance") : ""}` : `${(pk.options || []).length} options${+pk.allowance ? " · allowance " + gbp(+pk.allowance) : ""}${pk.due ? " · by " + esc(shortDay(pk.due)) : ""}`}${pk.status === "locked" ? " · locked" : ""}${pk.varAt ? " · extra made" : ""}</span></span>
          <span class="cs-acts">${ch && ov > 0 && !pk.varAt ? `<button type="button" class="btn primary cs-var" data-p="${esc(pk.id)}">📝 Make the ${gbp(ov)} an extra to sign</button>` : ""}${ch && pk.status !== "locked" ? `<button type="button" class="pillbtn cs-lock" data-p="${esc(pk.id)}">🔒 Lock it in</button>` : ""}${!ch ? `<button type="button" class="pillbtn cs-edit" data-p="${esc(pk.id)}">✎ Change</button>` : ""}<button type="button" class="linkdanger cs-del" data-p="${esc(pk.id)}">Remove</button></span></div>`;
      }).join("") ||
      `<div class="nothing">Nothing yet. Ask them to choose things like tiles, worktops or flooring, with an allowance, and they pick in their portal.</div>`
    }</div>`;
}
function csOwnerWire(c, p) {
  const L = () => CS.mgr[p.id] || [];
  const doc = (id) => S.db.doc("portal/" + p.id + "/picks/" + id);
  if ($("cs-add")) $("cs-add").onclick = () => csEdit(c, p, null);
  document.querySelectorAll(".cs-edit").forEach(
    (b) =>
      (b.onclick = () =>
        csEdit(
          c,
          p,
          L().find((x) => x.id === b.dataset.p),
        )),
  );
  document.querySelectorAll(".cs-lock").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await doc(b.dataset.p).update({ status: "locked", lockedAt: Date.now() });
          toast("Locked in – they can't change it now");
        } catch (e) {
          toast("Couldn't save");
        }
      }),
  );
  document.querySelectorAll(".cs-del").forEach(
    (b) =>
      (b.onclick = async () => {
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Tap again to remove";
          return;
        }
        try {
          await doc(b.dataset.p).delete();
        } catch (e) {
          toast("Couldn't remove");
        }
      }),
  );
  document.querySelectorAll(".cs-var").forEach(
    (b) =>
      (b.onclick = async () => {
        const pk = L().find((x) => x.id === b.dataset.p);
        const ch = pk && csOpt(pk);
        if (!ch) return;
        const ov = csOver(pk, ch);
        try {
          await doc(pk.id).update({ varAt: Date.now(), status: "locked", lockedAt: Date.now() });
        } catch (e) {}
        /* the price in a variation is before VAT; the allowance and option prices are what the client pays */
        const set = sdSet();
        const vat = set.vatReg === false ? 0 : 0.2;
        vrNew(c.site || "");
        vrPrefill({
          client: c.name || "",
          title: `${pk.title}: ${ch.name} (over the allowance)`,
          details: `${pk.title}${pk.room ? " in the " + pk.room : ""}: ${c.name || "the client"} chose ${ch.name} at ${gbp(+ch.price || 0)}, against an allowance of ${gbp(+pk.allowance || 0)}. This is the difference of ${gbp(ov)}${vat ? " including VAT" : ""}.`,
          amt: Math.round((ov / (1 + vat)) * 100) / 100,
        });
      }),
  );
}
function csEdit(c, p, pk) {
  const samples = (S.samples || [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  let opts = pk ? (pk.options || []).map((o) => Object.assign({}, o)) : [];
  openSheet(
    `<h3 id="sheettitle">🎨 ${pk ? "Change the choice" : "Ask " + esc(c.name) + " to choose"}</h3>
    <label for="cs-title">What are they choosing?</label><input id="cs-title" maxlength="80" placeholder="e.g. Kitchen worktop" value="${esc((pk && pk.title) || "")}">
    <div class="grid2"><label for="cs-room">Room (optional)<input id="cs-room" maxlength="60" placeholder="e.g. Kitchen" value="${esc((pk && pk.room) || "")}"></label><label for="cs-allow">Allowance £ (in their price)<input id="cs-allow" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(pk && pk.allowance ? pk.allowance : "")}"></label></div>
    <div class="grid2"><label for="cs-due">Choose by (optional)<input id="cs-due" type="date" value="${esc((pk && pk.due) || "")}"></label><span></span></div>
    <label for="cs-note">A note for them (optional)</label><textarea id="cs-note" rows="2" placeholder="e.g. Prices are for the whole worktop, fitted">${esc((pk && pk.note) || "")}</textarea>
    <div class="flabel">The options and what each costs them (fitted, with VAT)</div>
    <div id="cs-opts"></div>
    <div class="actions">${samples.length ? `<select id="cs-samp" aria-label="Add from your samples"><option value="">+ Add from your samples…</option>${samples.map((x) => `<option value="${esc(x.id)}">${esc(x.name || "Sample")}${x.cat ? " (" + esc(x.cat) + ")" : ""}</option>`).join("")}</select>` : ""}<button type="button" class="btn" id="cs-addopt">+ Add an option</button></div>
    ${formFoot(false, pk ? "Save" : "Send to their portal")}`,
    async () => {
      const title = $("cs-title").value.trim();
      if (!title) return showErr("Say what they're choosing");
      const list = opts.filter((o) => (o.name || "").trim());
      if (list.length < 1) return showErr("Add at least one option");
      $("f-save").disabled = true;
      try {
        for (const o of list)
          if (o.file) {
            const small = await shrinkImage(o.file, 1200);
            o.photo = (await uploadFile(small, "choice.jpg")).id;
            delete o.file;
          }
        const d = {
          title,
          room: $("cs-room").value.trim(),
          allowance: Math.round((+$("cs-allow").value || 0) * 100) / 100,
          due: $("cs-due").value,
          note: $("cs-note").value.trim(),
          options: list.map((o) => ({
            id: o.id,
            name: o.name.trim(),
            price: Math.round((+o.price || 0) * 100) / 100,
            photo: o.photo || "",
            note: (o.note || "").trim(),
            sampleId: o.sampleId || "",
          })),
          updated: Date.now(),
        };
        if (pk) await S.db.doc("portal/" + p.id + "/picks/" + pk.id).update(d);
        else
          await S.db
            .doc("portal/" + p.id + "/picks/" + newId())
            .set(Object.assign(d, { created: Date.now(), status: "open" }));
        try {
          await S.db.doc("portal/" + p.id).update({ ownerAct: Date.now() });
        } catch (e) {}
        closeForm();
        toast(pk ? "Saved" : "Sent to " + c.name + "'s portal");
      } catch (e) {
        $("f-save").disabled = false;
        showErr(uploadErr(e));
      }
    },
    "cs-title",
  );
  const draw = () => {
    $("cs-opts").innerHTML =
      opts
        .map(
          (
            o,
            i,
          ) => `<div class="cs-orow" data-i="${i}">${o.photo ? `<img src="${blobUrl(o.photo)}" alt="">` : `<span class="cs-nophoto" aria-hidden="true">${o.file ? "📷" : "🎨"}</span>`}
        <input class="cs-on" maxlength="80" placeholder="e.g. Oak block" value="${esc(o.name || "")}" aria-label="Option ${i + 1} name">
        <input class="cs-op" type="number" inputmode="decimal" min="0" step="0.01" placeholder="£" value="${esc(o.price != null && o.price !== "" ? o.price : "")}" aria-label="Option ${i + 1} price">
        <span class="btn cs-phbtn">📷<input type="file" accept="image/*" class="cs-fileinp" aria-label="Option ${i + 1} photo"></span>
        <button type="button" class="linkdanger cs-ox" aria-label="Remove option ${i + 1}">✕</button></div>`,
        )
        .join("") || `<div class="who">No options yet.</div>`;
    $("cs-opts")
      .querySelectorAll(".cs-orow")
      .forEach((r) => {
        const o = opts[+r.dataset.i];
        r.querySelector(".cs-on").oninput = (e) => (o.name = e.target.value);
        r.querySelector(".cs-op").oninput = (e) => (o.price = e.target.value);
        r.querySelector(".cs-fileinp").onchange = (e) => {
          const f = e.target.files && e.target.files[0];
          if (f) {
            o.file = f;
            o.photo = "";
            draw();
          }
        };
        r.querySelector(".cs-ox").onclick = () => {
          opts.splice(+r.dataset.i, 1);
          draw();
        };
      });
  };
  draw();
  $("cs-addopt").onclick = () => {
    opts.push({ id: newId(), name: "", price: "" });
    draw();
    const ins = $("cs-opts").querySelectorAll(".cs-on");
    if (ins.length) ins[ins.length - 1].focus();
  };
  if ($("cs-samp"))
    $("cs-samp").onchange = (e) => {
      const x = samples.find((y) => y.id === e.target.value);
      e.target.value = "";
      if (!x) return;
      opts.push({
        id: newId(),
        name: x.name || "Sample",
        price: x.price != null ? x.price : "",
        photo: (x.photos || [])[0] || "",
        sampleId: x.id,
      });
      draw();
    };
}
