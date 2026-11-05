/* ================= SITE INDUCTIONS ================= */
import { phoneOf } from "../chat/calls.js";
import { $, addDays, esc, iso, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, setEditing, setFormType, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { allVisitInds } from "../people/foreman.js";
import { meInfo, myDetails } from "../people/personal-details.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { shrinkImage } from "./training.js";
import { RAMS_SIGN } from "../sites/plans-specs.js";
import { same } from "../sites/project-pages.js";
import { QRSITE } from "../sites/qr-sign-in.js";
import { myName } from "../survey/door-window-survey.js";
export {
  IND_DETAILS,
  empIndTodo,
  indFor,
  indSectionWithId,
  loadJsPdf,
  myInd,
  openIndEditor,
  openInduction,
  sigPad,
  wireInduction,
};
const IND_DETAILS = [
  ["pc", "Principal contractor", "JEB Building Services"],
  ["manager", "Site manager / supervisor and phone", "James Bray · 07917 646970"],
  ["firstaider", "First aider", ""],
  ["firstaid", "First aid kit is kept", ""],
  ["hospital", "Nearest A&E", "Royal Devon & Exeter Hospital, Barrack Road, Exeter EX2 5DW"],
  ["assembly", "Fire assembly point", ""],
  ["welfare", "Toilets, drinking water and break area", ""],
  ["hours", "Working hours", "8:00am – 5:00pm Monday to Friday. No noisy work before 8:00am."],
  [
    "ppe",
    "PPE required on site",
    "Safety boots, hi-vis and gloves at all times. Hard hat where there is overhead work. Eye, ear and dust protection when the task needs it.",
  ],
  ["hazards", "Hazards on this site and how they are controlled", ""],
  [
    "rules",
    "Site rules",
    "Sign in with James on arrival. Keep access routes clear. No smoking or vaping except in the agreed area. Secure the site, tools and materials at the end of each day. Be polite to neighbours and the client.",
  ],
];
const IND_ITEMS = [
  "I know who the site manager is and how to contact them.",
  "I know where the first aid kit is, who the first aider is, and where the nearest A&E is.",
  "I know where the fire assembly point is and what to do in an emergency.",
  "I know where the toilets, drinking water and break area are.",
  "I understand the site rules and working hours.",
  "I will wear the PPE listed above whenever I am on site.",
  "I have been told about the hazards on this site and how they are controlled.",
  "I hold the right training and cards (e.g. CSCS) for my work, and will only use tools and plant I am trained and allowed to use.",
  "I will report any accident, near miss, damage or unsafe condition to the site manager straight away.",
  "I will not work under the influence of alcohol or drugs, and will tell the site manager if a medicine could affect my work.",
  "I will keep my work area tidy and leave the site safe and secure.",
  "I know I can stop work and ask if I am unsure about anything.",
];
function indFor(site) {
  return S.inductions.find((i) => same(i.site, site));
}
const sigsOf = (list) => (list || []).filter((s) => s.type === "induction");
function myInd(ind) {
  return sigsOf(S.mine.signoffs)
    .filter((s) => s.inductionId === ind.id && (s.version || 1) >= (ind.version || 1))
    .sort((a, b) => b.signedAt - a.signedAt)[0];
}
function teamInd(ind, id) {
  return sigsOf(S.data.signoffs[id])
    .filter((s) => s.inductionId === ind.id)
    .sort((a, b) => b.signedAt - a.signedAt)[0];
}
function empIndTodo() {
  const since = iso(addDays(new Date(), -21));
  const recent = new Set(
    S.mine.entries.filter((e) => e.date >= since).map((e) => (e.job || "").trim().toLowerCase()),
  );
  return S.inductions.filter((i) => recent.has((i.site || "").trim().toLowerCase()) && !myInd(i));
}
function inductionSection(site, owner) {
  const ind = indFor(site);
  if (owner) return inductionSection0(site, owner) + QRSITE.cardHtml(site);
  return inductionSection0(site, owner);
}
function inductionSection0(site, owner) {
  const ind = indFor(site);
  if (owner) {
    if (!ind)
      return `<div class="card indcard"><div class="cardbody" style="border:0"><div><b>Site induction</b><div class="who">No induction set up for this site yet.</div></div><div><button type="button" class="btn primary ind-edit" data-site="${esc(site)}">Set up induction</button></div></div></div>`;
    const ids = teamIds();
    const worked = new Set(
      allTeam("entries")
        .filter((e) => same(e.job, site))
        .map((e) => e.who),
    );
    const done = ids.map((id) => [id, teamInd(ind, id)]).filter((x) => x[1]);
    const outdated = done.filter(([, s]) => (s.version || 1) < (ind.version || 1)).map((x) => x[0]);
    const notDone = ids.filter(
      (id) => worked.has(id) && (!done.some((x) => x[0] === id) || outdated.includes(id)),
    );
    return `<div class="card indcard"><div class="cardbody" style="border:0">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start"><div><b>Site induction</b><div class="who">${ind.items.length} points · last changed ${stamp(ind.updated)}</div></div>
      <button type="button" class="pillbtn ind-edit" data-site="${esc(site)}">Edit induction</button></div>
      <div class="actions"><button type="button" class="btn primary ind-device" data-site="${esc(site)}">Induct someone on this device</button><button type="button" class="pillbtn ind-reg" data-site="${esc(site)}">Download register (PDF)</button></div>
      ${notDone.length ? `<div class="sub" style="color:var(--danger)">Worked here but not inducted${outdated.length ? " (or induction changed since)" : ""}: ${notDone.map((id) => esc(nameOf(id))).join(", ")}</div>` : ""}
      ${
        done.length
          ? done
              .map(
                ([
                  id,
                  s,
                ]) => `<div class="citem"><span><b>${esc(s.name || nameOf(id))}</b> <span class="who">signed ${stamp(s.signedAt)}${(s.version || 1) < (ind.version || 1) ? " · older version" : ""}</span></span>
        <span style="display:flex;gap:6px"><button type="button" class="pillbtn ind-view" data-w="${esc(id)}">View</button><button type="button" class="pillbtn ind-pdf" data-w="${esc(id)}">PDF</button></span></div>`,
              )
              .join("")
          : '<div class="nothing">No employees have signed it in the app yet.</div>'
      }
      ${(() => {
        const vs = allVisitInds()
          .filter((v) => v.inductionId === ind.id)
          .sort((a, b) => b.signedAt - a.signedAt);
        return vs.length
          ? `<div class="flabel" style="margin:6px 0 0">Inducted on your device (${vs.length})</div>` +
              vs
                .map(
                  (
                    v,
                  ) => `<div class="citem"><span><b>${esc(v.name)}</b> <span class="who">${esc([v.role, (v.worker || {}).company].filter(Boolean).join(" · "))} · ${stamp(v.signedAt)}${(v.version || 1) < (ind.version || 1) ? " · older version" : ""}</span></span>
        <span style="display:flex;gap:6px"><button type="button" class="pillbtn vis-view" data-v="${esc(v.id)}">View</button><button type="button" class="pillbtn vis-pdf" data-v="${esc(v.id)}">PDF</button></span></div>`,
                )
                .join("")
          : "";
      })()}
    </div></div>`;
  }
  if (!ind) return "";
  const mine = myInd(ind);
  return `<div class="card indcard ${mine ? "" : "todo"}"><div class="cardbody" style="border:0">
    <div><b>Site induction</b> ${mine ? '<span class="tag ok">Done</span>' : '<span class="tag bad">To do</span>'}<div class="who">${mine ? "You signed it on " + stamp(mine.signedAt) : "Read it, tick each point and sign before you start work on this site."}</div></div>
    <div class="actions">${mine ? `<button type="button" class="pillbtn ind-mine-view">View my signed copy</button><button type="button" class="pillbtn ind-mine-pdf">Download PDF</button>` : `<button type="button" class="btn primary ind-start" data-site="${esc(site)}">Start induction</button>`}</div>
  </div></div>`;
}
function wireInduction() {
  const m = $("main");
  m.querySelectorAll(".ind-edit").forEach((b) => (b.onclick = () => openIndEditor(b.dataset.site)));
  m.querySelectorAll(".ind-start").forEach(
    (b) =>
      (b.onclick = () => {
        const i = indFor(b.dataset.site);
        if (i) openInduction(i);
      }),
  );
  m.querySelectorAll(".ind-view,.ind-pdf").forEach(
    (b) =>
      (b.onclick = () => {
        const ind = S.inductions.find((i) => i.id === b.closest(".indcard").dataset.ind);
        const rec = ind && teamInd(ind, b.dataset.w);
        if (!rec) return;
        b.classList.contains("ind-pdf") ? pdfRecord(rec) : viewRecord(rec, true);
      }),
  );
  m.querySelectorAll(".ind-device").forEach(
    (b) =>
      (b.onclick = () => {
        const i = indFor(b.dataset.site);
        if (i) openInduction(i, true);
      }),
  );
  m.querySelectorAll(".ind-reg").forEach(
    (b) =>
      (b.onclick = () => {
        const i = indFor(b.dataset.site);
        if (i) registerPdf(i);
      }),
  );
  m.querySelectorAll(".vis-view,.vis-pdf").forEach(
    (b) =>
      (b.onclick = () => {
        const v = allVisitInds().find((x) => x.id === b.dataset.v);
        if (!v) return;
        b.classList.contains("vis-pdf") ? pdfRecord(v) : viewRecord(v, true);
      }),
  );
  m.querySelectorAll(".ind-mine-view,.ind-mine-pdf").forEach(
    (b) =>
      (b.onclick = () => {
        const ind = S.inductions.find((i) => i.id === b.closest(".indcard").dataset.ind);
        const rec = ind && myInd(ind);
        if (!rec) return;
        b.classList.contains("ind-mine-pdf") ? pdfRecord(rec) : viewRecord(rec, false);
      }),
  );
}
function indSectionWithId(site, owner) {
  const ind = indFor(site);
  return inductionSection(site, owner).replace(
    'class="card indcard',
    `data-ind="${ind ? esc(ind.id) : ""}" class="card indcard`,
  );
}

/* pick one or more people (with a quick search); the chosen names are kept as text, e.g. "James Bray · 07917 646970, Kahn Test" */
function pplOptions() {
  const own = (S.settings || {}).ownerId || S.me;
  const ids = [own].concat(
    Object.keys(S.team || {}).filter((id) => id !== own && !(S.team[id] || {}).left),
  );
  return [...new Set(ids)]
    .map((id) => {
      const n =
        id === own ? S.ownerName || (S.settings || {}).ownerName || "James Bray" : nameOf(id);
      const t = phoneOf(id);
      return { id, name: n, label: n + (t ? " · " + t : "") };
    })
    .filter((x) => x.name)
    .sort((a, b) => (a.id === own ? -1 : b.id === own ? 1 : a.name.localeCompare(b.name)));
}
function pplPickHtml(id, label, val) {
  return `<div class="flabel">${esc(label)}</div><div class="ppk" data-for="${esc(id)}"><input type="hidden" id="${esc(id)}" value="${esc(val || "")}"><div class="ppk-chips"></div>
  <div class="ppk-row"><input type="search" class="ppk-q" placeholder="🔍 Search people, or type a name" aria-label="${esc(label)}: search people" autocomplete="off"></div><div class="ppk-list" hidden></div></div>`;
}
function wirePplPick(root) {
  root.querySelectorAll(".ppk").forEach((w) => {
    const hid = w.querySelector("input[type=hidden]"),
      q = w.querySelector(".ppk-q"),
      list = w.querySelector(".ppk-list"),
      chips = w.querySelector(".ppk-chips");
    const opts = pplOptions();
    let sel = (hid.value || "")
      .split(/\s*[,\n]\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
    const keyOf = (t) => t.split(" · ")[0].trim().toLowerCase();
    const save = () => {
      hid.value = sel.join(", ");
      chips.innerHTML = sel.length
        ? sel
            .map(
              (t, i) =>
                `<span class="ppk-chip">👤 ${esc(t)}<button type="button" data-i="${i}" aria-label="Remove ${esc(t)}">✕</button></span>`,
            )
            .join("")
        : '<span class="who">Nobody chosen yet</span>';
      chips.querySelectorAll("button").forEach(
        (b) =>
          (b.onclick = () => {
            sel.splice(+b.dataset.i, 1);
            save();
            drawList();
          }),
      );
    };
    const toggle = (lab) => {
      const k = keyOf(lab);
      const i = sel.findIndex((x) => keyOf(x) === k);
      if (i >= 0) sel.splice(i, 1);
      else sel.push(lab);
      save();
      drawList();
    };
    const drawList = () => {
      if (list.hidden) return;
      const t = q.value.trim().toLowerCase();
      const f = opts.filter((o) => !t || o.label.toLowerCase().includes(t));
      const on = (lab) => sel.some((x) => keyOf(x) === keyOf(lab));
      list.innerHTML =
        f
          .map(
            (o, i) =>
              `<button type="button" class="ppk-opt" data-i="${opts.indexOf(o)}" aria-pressed="${on(o.label)}"><span class="ppk-tick">${on(o.label) ? "☑" : "☐"}</span>${esc(o.name)}${o.label !== o.name ? `<span class="who"> ${esc(o.label.slice(o.name.length + 3))}</span>` : ""}</button>`,
          )
          .join("") +
        (t && !f.length
          ? `<button type="button" class="ppk-opt ppk-add">+ Add “${esc(q.value.trim())}”</button>`
          : "") +
        (!f.length && !t
          ? '<div class="who" style="padding:8px">No people on the app yet. Type a name to add one.</div>'
          : "") +
        `<button type="button" class="ppk-done">Done</button>`;
      list
        .querySelectorAll(".ppk-opt[data-i]")
        .forEach((b) => (b.onclick = () => toggle(opts[+b.dataset.i].label)));
      const ad = list.querySelector(".ppk-add");
      if (ad)
        ad.onclick = () => {
          const v = q.value.trim();
          if (v && !sel.some((x) => keyOf(x) === v.toLowerCase())) sel.push(v);
          q.value = "";
          save();
          drawList();
        };
      list.querySelector(".ppk-done").onclick = () => {
        list.hidden = true;
        q.value = "";
      };
    };
    q.addEventListener("focus", () => {
      list.hidden = false;
      drawList();
    });
    q.addEventListener("input", () => {
      list.hidden = false;
      drawList();
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const t = q.value.trim().toLowerCase();
        if (!t) return;
        const m = opts.filter((o) => o.label.toLowerCase().includes(t));
        if (m.length === 1) toggle(m[0].label);
        else if (!m.length) {
          sel.push(q.value.trim());
          save();
        }
        q.value = "";
        drawList();
      }
    });
    save();
  });
}
function openIndEditor(site) {
  const ind = indFor(site);
  const det = ind ? ind.details || {} : {};
  setFormType("indedit");
  setEditing(ind || null);
  openSheet(
    `<h3 id="sheettitle">${ind ? "Edit" : "Set up"} site induction</h3>
    <div class="who">${esc(site)}</div>
    ${IND_DETAILS.map(([k, l, def]) => {
      const v = ind
        ? det[k] || ""
        : k === "hospital" ||
            k === "hours" ||
            k === "ppe" ||
            k === "rules" ||
            k === "pc" ||
            k === "manager"
          ? def
          : "";
      if (k === "firstaider" || k === "manager")
        return pplPickHtml(
          "id-" + k,
          (k === "firstaider" ? "First aider(s)" : "Site manager / supervisor") +
            " · pick one or more",
          v,
        );
      return k === "hazards" || k === "rules" || k === "ppe"
        ? `<label for="id-${k}">${esc(l)}<textarea id="id-${k}" maxlength="1500" placeholder="${k === "hazards" ? "e.g. Open excavation at rear – fenced. Asbestos survey done, none found. Client's dog in garden – keep gate shut." : ""}">${esc(v)}</textarea></label>`
        : `<label for="id-${k}">${esc(l)}<input id="id-${k}" maxlength="200" value="${esc(v)}"></label>`;
    }).join("")}
    <div class="card" style="padding:10px 12px;margin:4px 0"><div class="flabel" style="margin:0">📄 Site rules</div><div class="who">Upload your site rules (PDF or photos). Everyone doing the induction has to open them and tick that they will follow them.</div>
      <div id="id-rules"></div><label for="id-rfile">Add site rules<input id="id-rfile" type="file" accept="application/pdf,image/*,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple></label></div>
    <label for="id-items">Points they tick (one per line)<textarea id="id-items" style="min-height:260px" maxlength="6000">${esc((ind ? ind.items : IND_ITEMS).join("\n"))}</textarea></label>
    ${ind ? `<label class="inl" style="font-size:14px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="id-redo"> Ask everyone to do it again (use this if something important has changed)</label>` : ""}
    <div class="who">Check the site manager's details and A&E before you save. The defaults are only a starting point.</div>
    ${formFoot(false, ind ? "Save changes" : "Save induction")}`,
    async () => {
      const details = {};
      IND_DETAILS.forEach(([k]) => (details[k] = $("id-" + k).value.trim()));
      const items = $("id-items")
        .value.split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      if (items.length < 3) {
        showErr("Add at least 3 points for them to tick.");
        return;
      }
      if (!details.manager) {
        showErr("Add the site manager and phone number.");
        return;
      }
      const redo = ind && $("id-redo").checked;
      const data = {
        site,
        details,
        items,
        version: ind ? (ind.version || 1) + (redo ? 1 : 0) : 1,
        updated: Date.now(),
      };
      $("f-save").disabled = true;
      try {
        const add = [...($("id-rfile").files || [])];
        const rd = rules.slice();
        if (add.length && !S.assets) {
          showErr(uploadErr({ code: "not_granted" }));
          $("f-save").disabled = false;
          return;
        }
        for (let i = 0; i < add.length; i++) {
          const f = add[i];
          $("f-save").textContent = `Uploading rules ${i + 1} of ${add.length}…`;
          const img = /^image\//.test(f.type || "");
          let b = f;
          if (img) {
            try {
              b = await shrinkImage(f, 2200);
            } catch (e) {}
          }
          const a = await uploadFile(b, f.name || "site-rules");
          rd.push({
            assetId: a.id,
            name: f.name || (img ? "Site rules photo.jpg" : "Site rules.pdf"),
            type: img ? "image/jpeg" : f.type || "application/pdf",
            at: Date.now() + i,
          });
        }
        data.rulesDocs = rd;
      } catch (e) {
        showErr(uploadErr(e));
        $("f-save").disabled = false;
        $("f-save").textContent = ind ? "Save changes" : "Save induction";
        return;
      }
      try {
        if (ind)
          await S.db
            .doc("inductions/" + ind.id)
            .set(Object.assign({ created: ind.created || Date.now() }, data));
        else await S.db.collection("inductions").add(Object.assign({ created: Date.now() }, data));
        closeForm();
        toast(redo ? "Saved. Everyone will be asked to do it again." : "Induction saved");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection and try again.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  wirePplPick($("form"));
  const rules = ((ind && ind.rulesDocs) || []).slice();
  const drawRules = () => {
    $("id-rules").innerHTML = rules.length
      ? rules
          .map(
            (r, i) =>
              `<div class="attrow"><button type="button" class="linkbtn idr-open" data-i="${i}">📄 ${esc(r.name)}</button><button type="button" class="linkdanger idr-del" data-i="${i}">Remove</button></div>`,
          )
          .join("")
      : '<div class="who" style="margin:4px 0">No site rules uploaded yet.</div>';
    $("id-rules")
      .querySelectorAll(".idr-open")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const r = rules[+b.dataset.i];
            openFile(r.assetId, r.name, r.type);
          }),
      );
    $("id-rules")
      .querySelectorAll(".idr-del")
      .forEach(
        (b) =>
          (b.onclick = () => {
            rules.splice(+b.dataset.i, 1);
            drawRules();
          }),
      );
  };
  drawRules();
}

function detailsHtml(det) {
  return IND_DETAILS.filter(([k]) => det && det[k])
    .map(([k, l]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(det[k])}</span></div>`)
    .join("");
}
const VIS_ROLES = [
  "Visitor",
  "Subcontractor",
  "Client",
  "Delivery driver",
  "Building control / inspector",
  "Other",
];
function openInduction(ind, onDevice, count) {
  setFormType("induction");
  setEditing(null);
  count = count || 0;
  if (!RAMS_SIGN && (ind.items || []).some((t) => /read and understood the RAMS/i.test(t)))
    ind = Object.assign({}, ind, {
      items: ind.items.filter((t) => !/read and understood the RAMS/i.test(t)),
    });
  const ticks = new Array(ind.items.length).fill(false);
  const last = onDevice
    ? {}
    : sigsOf(S.mine.signoffs).sort((a, b) => b.signedAt - a.signedAt)[0] || {};
  const md = onDevice ? {} : myDetails() || {};
  const w = Object.assign({}, last.worker || {});
  {
    const me = onDevice ? {} : meInfo();
    [
      ["company", "company"],
      ["trade", "trade"],
      ["cscs", "cscs"],
      ["ecName", "nokName"],
      ["ecPhone", "nokPhone"],
      ["medical", "medical"],
    ].forEach(([a, b]) => {
      if (me[b]) w[a] = me[b];
    });
    w.fullName = me.name || "";
  }
  const autoFilled = !onDevice && !!(md.fullName || md.trade || md.nokName);
  openSheet(
    `<h3 id="sheettitle">Site induction${onDevice ? " – on this device" : ""}</h3>
    ${
      onDevice
        ? `<div class="notice">Hand this device to the person being inducted. When they've signed, it clears for the next person.${count ? ` <b>${count} done so far.</b>` : ""}</div>
      <div><div class="flabel">They are a</div><div class="seg" id="in-role">${VIS_ROLES.map((r, i) => `<button type="button" data-v="${esc(r)}" aria-pressed="${i === 0}">${esc(r)}</button>`).join("")}</div></div>`
        : ""
    }
    <div><b>${esc(ind.site)}</b><div class="who">JEB Building Services</div></div>
    <div class="details">${detailsHtml(ind.details)}</div>
    ${
      (ind.rulesDocs || []).length
        ? `<div class="card inrules" style="padding:10px 12px"><div class="flabel" style="margin:0">📄 Site rules</div><div class="who">Open and read ${ind.rulesDocs.length === 1 ? "the site rules" : "each of the site rules"} first, then tick below.</div>
      ${ind.rulesDocs.map((r, i) => `<button type="button" class="btn inr-open" data-i="${i}" style="justify-content:flex-start;margin-top:6px">📄 ${esc(r.name)} <span class="inr-st" style="margin-left:auto">Tap to read</span></button>`).join("")}
      <label class="tick" for="in-rules" style="margin-top:8px"><input type="checkbox" id="in-rules" disabled><span><b>I have read the site rules and I will follow them.</b></span></label></div>`
        : ""
    }
    <div><div class="flabel">Tick each point to confirm</div>
    <div id="in-items">${ind.items.map((t, i) => `<label class="tick" for="in-t${i}"><input type="checkbox" id="in-t${i}" data-i="${i}"><span>${esc(t)}</span></label>`).join("")}</div></div>
    <div class="flabel" style="margin:0">Your details</div>${autoFilled ? `<div class="who">✓ Filled in from <b>My details</b>. Change anything that's different today.</div>` : onDevice ? "" : `<div class="who">Tip: fill in <b>My details</b> once and this fills itself in next time.</div>`}
    <div class="grid2"><label for="in-name">Full name<input id="in-name" required maxlength="80" value="${onDevice ? "" : esc(w.fullName || S.myProfile.name)}"></label>
    <label for="in-company">Company<input id="in-company" maxlength="80" value="${onDevice ? "" : esc(w.company || "JEB Building Services")}"></label></div>
    <div class="grid2"><label for="in-trade">${onDevice ? "Trade or reason for visit" : "Trade"}<input id="in-trade" maxlength="60" placeholder="e.g. Carpenter" value="${esc(w.trade || "")}"></label>
    <label for="in-cscs">CSCS or other card number (optional)<input id="in-cscs" maxlength="60" value="${esc(w.cscs || "")}"></label></div>
    <div class="grid2"><label for="in-ecn">Emergency contact name<input id="in-ecn" required maxlength="80" value="${esc(w.ecName || "")}"></label>
    <label for="in-ecp">Emergency contact phone<input id="in-ecp" type="tel" required maxlength="30" value="${esc(w.ecPhone || "")}"></label></div>
    <label for="in-med">Anything we should know, e.g. a medical condition (optional, only James sees this)<textarea id="in-med" maxlength="400">${esc(w.medical || "")}</textarea></label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn" id="sig-clear">Clear</button></div>
    <canvas id="sig" class="sigpad" aria-label="Signature box"></canvas></div>
    <div class="who">By signing you confirm you have received this induction and understood it. Your name, signature, the date and time are stored with this job.</div>
    ${formFoot(false, onDevice ? "Sign and next person" : "Sign induction")}`,
    async () => {
      const rd = ind.rulesDocs || [];
      if (rd.length && !($("in-rules") || {}).checked) {
        showErr(
          rulesSeen.size < rd.length
            ? "Open and read the site rules first, then tick that you will follow them."
            : "Tick that you have read the site rules and will follow them.",
        );
        return;
      }
      const n = ind.items.length - ticks.filter(Boolean).length;
      if (n) {
        showErr(
          `Tick every point (${n} left). If you don't understand one, ask ${onDevice ? "before signing" : "James before signing"}.`,
        );
        return;
      }
      const worker = {
        company: $("in-company").value.trim(),
        trade: $("in-trade").value.trim(),
        cscs: $("in-cscs").value.trim(),
        ecName: $("in-ecn").value.trim(),
        ecPhone: $("in-ecp").value.trim(),
        medical: $("in-med").value.trim(),
      };
      const name = $("in-name").value.trim();
      if (!name) {
        showErr("Add your full name.");
        return;
      }
      if (!worker.ecName || !worker.ecPhone) {
        showErr("Add an emergency contact name and phone number.");
        return;
      }
      if (!sig.drawn) {
        showErr("Sign in the box with your finger.");
        return;
      }
      $("f-save").disabled = true;
      const now = Date.now();
      if (onDevice) {
        const role = $("in-role").querySelector('[aria-pressed="true"]').dataset.v;
        const fm = !S.owner;
        try {
          const r = await submitJob(
            Object.assign(fm ? { coll: "signoffs" } : { path: "visitinds", coll: "visitinds" }, {
              docId: "vi-" + newId(),
              data: {
                type: fm ? "visitind" : "induction",
                onDevice: true,
                role,
                inductionId: ind.id,
                version: ind.version || 1,
                site: ind.site,
                details: ind.details,
                items: ind.items,
                ticked: ticks.map(() => true),
                ...rulesRec(),
                name,
                worker,
                signature: sig.data(),
                signedAt: now,
                created: now,
                recordedBy: fm ? myName() + " (foreman)" : S.ownerName || "James",
              },
            }),
          );
          toast(
            r === "queued"
              ? name + " saved on this device. It will send when you have signal."
              : name + " inducted",
          );
          openInduction(ind, true, count + 1);
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection and try again.");
          $("f-save").disabled = false;
        }
        return;
      }
      try {
        const r = await submitJob({
          coll: "signoffs",
          docId: "ind-" + ind.id + "-v" + (ind.version || 1),
          data: {
            type: "induction",
            inductionId: ind.id,
            version: ind.version || 1,
            site: ind.site,
            details: ind.details,
            items: ind.items,
            ticked: ticks.map(() => true),
            ...rulesRec(),
            name,
            worker,
            signature: sig.data(),
            signedAt: now,
            created: now,
          },
        });
        closeForm();
        toast(
          r === "queued"
            ? "Induction kept on this phone. It will send when you have signal."
            : "Induction signed",
        );
        render();
      } catch (e) {
        showErr("Couldn't save. Ask James to check you're an Editor on this page.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  $("in-items")
    .querySelectorAll("input")
    .forEach(
      (cb) =>
        (cb.onchange = () => {
          ticks[+cb.dataset.i] = cb.checked;
        }),
    );
  const rulesSeen = new Set();
  function rulesRec() {
    const rd = ind.rulesDocs || [];
    return rd.length
      ? {
          rulesAgreed: {
            at: Date.now(),
            docs: rd.map((r) => r.name),
            text: "I have read the site rules and I will follow them.",
          },
        }
      : {};
  }
  document.querySelectorAll("#form .inr-open").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.i,
          r = ind.rulesDocs[i];
        rulesSeen.add(i);
        b.querySelector(".inr-st").textContent = "✓ Opened";
        if (rulesSeen.size >= ind.rulesDocs.length && $("in-rules")) $("in-rules").disabled = false;
        openFile(r.assetId, r.name, r.type);
      }),
  );
  const sig = sigPad($("sig"));
  $("sig-clear").onclick = () => sig.clear();
  if ($("in-role"))
    $("in-role")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            $("in-role")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
      );
  if (onDevice) {
    const c = $("f-cancel");
    if (c) c.textContent = count ? "Done" : "Cancel";
  }
}
function sigPad(cv) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const fit = () => {
    const w = cv.clientWidth || 320,
      h = cv.clientHeight || 160;
    cv.width = w * ratio;
    cv.height = h * ratio;
    const g = cv.getContext("2d");
    g.scale(ratio, ratio);
    g.lineWidth = 2.4;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#111";
  };
  setTimeout(fit, 30);
  const st = { drawn: false, last: null };
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  cv.style.touchAction = "none";
  cv.style.webkitUserSelect = "none";
  cv.style.userSelect = "none";
  const down = (e) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    try {
      if (e.pointerId != null) cv.setPointerCapture(e.pointerId);
    } catch (_) {}
    st.last = pos(e);
    const g = cv.getContext("2d");
    g.beginPath();
    g.arc(st.last[0], st.last[1], 1.1, 0, 7);
    g.fillStyle = "#111";
    g.fill();
    st.drawn = true;
  };
  const move = (e) => {
    if (!st.last) return;
    e.preventDefault();
    const p = pos(e),
      g = cv.getContext("2d");
    g.beginPath();
    g.moveTo(st.last[0], st.last[1]);
    g.lineTo(p[0], p[1]);
    g.stroke();
    st.last = p;
    st.drawn = true;
  };
  const end = () => {
    st.last = null;
  };
  if (window.PointerEvent) {
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("lostpointercapture", end);
  } else {
    const tp = (e) =>
      e.touches && e.touches[0]
        ? {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            preventDefault: () => e.preventDefault(),
          }
        : e;
    cv.addEventListener("touchstart", (e) => down(tp(e)), { passive: false });
    cv.addEventListener("touchmove", (e) => move(tp(e)), { passive: false });
    cv.addEventListener("touchend", end);
    cv.addEventListener("mousedown", down);
    cv.addEventListener("mousemove", move);
    cv.addEventListener("mouseup", end);
  }
  return {
    get drawn() {
      return st.drawn;
    },
    clear() {
      cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
      st.drawn = false;
    },
    data() {
      const o = document.createElement("canvas");
      o.width = 420;
      o.height = Math.round((420 * cv.height) / cv.width);
      const g = o.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, o.width, o.height);
      g.drawImage(cv, 0, 0, o.width, o.height);
      return o.toDataURL("image/png");
    },
  };
}
function viewRecord(rec, owner) {
  const w = rec.worker || {};
  openViewer(`<h3 style="font-family:var(--f-display);margin:0">Site induction record</h3>
    <div class="who">${esc(rec.site)} · JEB Building Services</div>
    <div class="details" style="margin-top:10px">${detailsHtml(rec.details)}</div>
    ${rec.rulesAgreed ? `<div class="flabel" style="margin-top:12px">Site rules</div><div class="tick done"><span class="tickmark">✓</span><span>Read the site rules (${esc((rec.rulesAgreed.docs || []).join(", "))}) and agreed to follow them.</span></div>` : ""}
    <div class="flabel" style="margin-top:12px">Points confirmed</div>
    ${(rec.items || []).map((t) => `<div class="tick done"><span class="tickmark">✓</span><span>${esc(t)}</span></div>`).join("")}
    <div class="flabel" style="margin-top:12px">Worker</div>
    <div class="details">${[
      ["Name", rec.name],
      ["Role", rec.role],
      ["Company", w.company],
      [rec.onDevice ? "Trade or reason" : "Trade", w.trade],
      ["Card number", w.cscs],
      ["Emergency contact", [w.ecName, w.ecPhone].filter(Boolean).join(" · ")],
      ["Medical / other", owner || !S.owner ? w.medical : ""],
    ]
      .filter((x) => x[1])
      .map(([l, v]) => `<div class="drow"><span>${esc(l)}</span><span>${esc(v)}</span></div>`)
      .join("")}</div>
    <div class="flabel" style="margin-top:12px">Signature</div>
    <img src="${esc(rec.signature)}" alt="Signature of ${esc(rec.name)}" style="background:#fff;border:1px solid var(--line);border-radius:8px;max-width:360px;width:100%">
    <div class="who">Signed electronically ${stamp(rec.signedAt)}${rec.onDevice ? " in person on " + (rec.type === "visitind" ? esc(rec.recordedBy || "the foreman") + "'s phone" : "James's device") : ""}${rec.deliveredAt && rec.deliveredAt - rec.signedAt > 600000 ? ` (received ${stamp(rec.deliveredAt)})` : ""}</div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" id="rec-pdf" type="button">Download PDF</button></div>`);
  $("rec-pdf").onclick = () => pdfRecord(rec);
}
let jsPdfP = null;
function loadJsPdf() {
  if (window.jspdf) return Promise.resolve();
  if (jsPdfP) return jsPdfP;
  jsPdfP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = res;
    s.onerror = () => {
      jsPdfP = null;
      rej(new Error("load"));
    };
    document.head.appendChild(s);
  });
  return jsPdfP;
}
async function pdfRecord(rec) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  toast("Making the PDF…");
  try {
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't load the PDF maker. Check your connection.");
    return;
  }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const W = 210,
    M = 16;
  let y = 18;
  const clean = (t) =>
    String(t || "")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·•°]/g, "");
  const need = (h) => {
    if (y + h > 282) {
      doc.addPage();
      y = 18;
    }
  };
  const text = (t, size = 10, style = "normal", indent = 0, gap = 1.6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(clean(t), W - 2 * M - indent);
    lines.forEach((l) => {
      need(size * 0.45);
      doc.text(l, M + indent, y);
      y += size * 0.42;
    });
    y += gap;
  };
  doc.setFillColor(...BRGB());
  doc.rect(0, 0, W, 6, "F");
  await pdfLogo(doc, W - M, 11, 52, 24);
  text("JEB BUILDING SERVICES", 9, "bold", 0, 6);
  text("Site induction record", 18, "bold", 0, 2);
  text(rec.site, 12, "bold", 0, 4);
  const w = rec.worker || {};
  const rows = (list) =>
    list
      .filter((x) => x[1])
      .forEach(([l, v]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        need(6);
        doc.text(clean(l), M, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(clean(v), W - 2 * M - 62);
        lines.forEach((ln, i) => {
          if (i) need(5);
          doc.text(ln, M + 62, y);
          y += 4.3;
        });
        y += 1.4;
      });
  text("Site information", 11, "bold", 0, 1.5);
  rows(IND_DETAILS.map(([k, l]) => [l, rec.details && rec.details[k]]));
  y += 2;
  if (rec.rulesAgreed) {
    text("Site rules", 11, "bold", 0, 1.5);
    need(6);
    doc.setDrawColor(40);
    doc.rect(M, y - 3.2, 3.6, 3.6);
    doc.setLineWidth(0.5);
    doc.line(M + 0.7, y - 1.4, M + 1.6, y - 0.3);
    doc.line(M + 1.6, y - 0.3, M + 3.1, y - 2.6);
    doc.setLineWidth(0.2);
    text(
      `Read the site rules (${(rec.rulesAgreed.docs || []).join(", ")}) and agreed: "I have read the site rules and I will follow them."`,
      9.5,
      "normal",
      6,
      3,
    );
  }
  text("Points confirmed by the worker", 11, "bold", 0, 1.5);
  (rec.items || []).forEach((t) => {
    need(6);
    doc.setDrawColor(40);
    doc.rect(M, y - 3.2, 3.6, 3.6);
    doc.setLineWidth(0.5);
    doc.line(M + 0.7, y - 1.4, M + 1.6, y - 0.3);
    doc.line(M + 1.6, y - 0.3, M + 3.1, y - 2.6);
    doc.setLineWidth(0.2);
    text(t, 9.5, "normal", 6, 1.2);
  });
  y += 2;
  text("Worker", 11, "bold", 0, 1.5);
  rows([
    ["Name", rec.name],
    ["Role", rec.role],
    ["Company", w.company],
    [rec.onDevice ? "Trade or reason" : "Trade", w.trade],
    ["Card number", w.cscs],
    ["Emergency contact", [w.ecName, w.ecPhone].filter(Boolean).join(", ")],
    ["Medical / other", w.medical],
  ]);
  need(52);
  y += 2;
  text("Signature", 11, "bold", 0, 1.5);
  try {
    doc.addImage(rec.signature, "PNG", M, y, 75, 25);
    doc.setDrawColor(180);
    doc.rect(M, y, 75, 25);
  } catch (e) {}
  y += 30;
  text(
    rec.onDevice
      ? `Signed electronically by ${rec.name} on ${stamp(rec.signedAt)}, in person on a JEB Building Services device.`
      : `Signed electronically by ${rec.name} on ${stamp(rec.signedAt)} using the JEB Building Services staff app, signed in to their own account.`,
    9,
    "normal",
    0,
    1,
  );
  if (rec.deliveredAt && rec.deliveredAt - rec.signedAt > 600000)
    text(`Signed without signal; received ${stamp(rec.deliveredAt)}.`, 9);
  const fn = `Induction - ${clean(rec.site)
    .replace(/[^\w\s-]/g, "")
    .trim()} - ${clean(rec.name)
    .replace(/[^\w\s-]/g, "")
    .trim()} - ${iso(new Date(rec.signedAt))}.pdf`;
  try {
    await S.dl.save({ filename: fn, data: doc.output("blob") });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}

async function registerPdf(ind) {
  if (!S.dl) {
    toast("Downloads only work when the page is opened in claude.ai");
    return;
  }
  toast("Making the register…");
  try {
    await loadJsPdf();
  } catch (e) {
    toast("Couldn't load the PDF maker. Check your connection.");
    return;
  }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const W = 210,
    M = 16;
  let y = 18;
  const clean = (t) =>
    String(t || "")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
  const need = (h) => {
    if (y + h > 282) {
      doc.addPage();
      y = 18;
    }
  };
  const text = (t, size = 10, style = "normal", indent = 0, gap = 1.6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.splitTextToSize(clean(t), W - 2 * M - indent).forEach((l) => {
      need(size * 0.45);
      doc.text(l, M + indent, y);
      y += size * 0.42;
    });
    y += gap;
  };
  doc.setFillColor(...BRGB());
  doc.rect(0, 0, W, 6, "F");
  await pdfLogo(doc, W - M, 11, 52, 24);
  text("JEB BUILDING SERVICES", 9, "bold", 0, 6);
  text("Site induction register", 18, "bold", 0, 2);
  text(ind.site, 12, "bold", 0, 1);
  const d = ind.details || {};
  text(
    `Site manager: ${d.manager || "-"}   ·   Fire assembly point: ${d.assembly || "-"}`,
    9,
    "normal",
    0,
    1,
  );
  text(
    `Printed ${stamp(Date.now())}. Full induction content is in each person's individual record.`,
    8.5,
    "normal",
    0,
    5,
  );
  const rows = [];
  teamIds().forEach((id) => {
    sigsOf(S.data.signoffs[id])
      .filter((s) => s.inductionId === ind.id)
      .forEach((s) =>
        rows.push({
          name: s.name || nameOf(id),
          who: "Employee" + ((s.worker || {}).company ? " · " + s.worker.company : ""),
          at: s.signedAt,
          sig: s.signature,
          v: s.version || 1,
        }),
      );
  });
  allVisitInds()
    .filter((v) => v.inductionId === ind.id)
    .forEach((v) =>
      rows.push({
        name: v.name,
        who: [v.role, (v.worker || {}).company].filter(Boolean).join(" · "),
        at: v.signedAt,
        sig: v.signature,
        v: v.version || 1,
      }),
    );
  rows.sort((a, b) => a.at - b.at);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Name", M, y);
  doc.text("Role / company", M + 55, y);
  doc.text("Date and time", M + 108, y);
  doc.text("Signature", W - M - 44, y);
  y += 2;
  doc.setDrawColor(150);
  doc.line(M, y, W - M, y);
  y += 2;
  rows.forEach((r) => {
    need(18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(doc.splitTextToSize(clean(r.name), 52), M, y + 5);
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(clean(r.who), 50), M + 55, y + 5);
    doc.text(
      clean(stamp(r.at)) + (r.v < (ind.version || 1) ? " (older version)" : ""),
      M + 108,
      y + 5,
    );
    try {
      doc.addImage(r.sig, "PNG", W - M - 44, y, 44, 14.5);
    } catch (e) {}
    doc.setDrawColor(215);
    doc.line(M, y + 16, W - M, y + 16);
    y += 18;
  });
  if (!rows.length) text("Nobody has signed yet.", 10);
  try {
    await S.dl.save({
      filename: `Induction register - ${clean(ind.site)
        .replace(/[^\w\s-]/g, "")
        .trim()}.pdf`,
      data: doc.output("blob"),
    });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
