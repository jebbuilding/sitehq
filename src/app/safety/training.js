/* ================= TRAINING & TOOLBOX TALKS ================= */
import { bossFirst, coName } from "../core/company-names.js";
import { pickField, pickVal } from "../core/fields.js";
import { $, esc, parse, shortDay, stamp, toast } from "../core/helpers.js";
import {
  closeForm,
  editing,
  formFoot,
  myDoc,
  openSheet,
  setEditing,
  setFormType,
  showErr,
} from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, isImg, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { meBtn, meInfo } from "../people/personal-details.js";
import { BRGB, loadImage, pdfLogo, readExif } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "./site-inductions.js";
import { lhFinish, lhFrame } from "../sales/letterhead-setup.js";
export { expiryState, myTalkTodo, openCert, openTalk, shrinkImage, trainingView };
const TALK_TEMPLATES = [
  [
    "Working at height",
    "Falls from height are one of the biggest causes of death and serious injury in building work.\n\n• Avoid working at height if the job can be done from the ground.\n• Ladders are for short jobs (under 30 minutes) and light work only. Check the stiles, rungs and feet before every use, set at about 1 in 4, and keep three points of contact.\n• Only use a scaffold that has been inspected and tagged. Never remove guard rails, toe boards or ties. Report any damage straight away.\n• Mobile towers must be put up by someone PASMA trained. Lock the wheels and use the guard rails.\n• Cover or guard holes and open edges, and mark the covers.\n• Don't overreach. Move the ladder or platform.\n• Keep tools and materials secure so nothing can fall on people below.\n• If you're unsure whether the access equipment is safe, stop and ask.",
  ],
  [
    "Manual handling",
    "Back injuries and strains are common and often last for life.\n\n• Think before you lift. Can you use a trolley, sack truck or hoist, or split the load?\n• Check the route is clear and you know where the load is going.\n• Feet apart, bend your knees, keep a straight back and hold the load close to your waist.\n• Don't twist while lifting. Turn your feet instead.\n• Get help with heavy or awkward loads. Plasterboard, glass and kerbs are two-person lifts.\n• Watch for sharp edges and wear gloves.\n• Tell the site manager about any pain or injury straight away.",
  ],
  [
    "Silica dust",
    "Cutting, drilling, grinding or sweeping concrete, brick, block, stone, tiles and mortar makes silica dust. Breathing it in can cause lung disease and cancer, and the damage is permanent.\n\n• Use water suppression on cut-off saws, or on-tool extraction with an M-class (or H-class) vacuum.\n• Wear a face-fit-tested FFP3 mask when the task needs it, and be clean shaven where the mask seals.\n• Don't dry sweep. Use a vacuum or damp down first.\n• Cut outside or in a well-ventilated area, away from other people.\n• Keep extraction filters and hoses in good condition.\n• Wash your hands and face before eating, drinking or smoking.",
  ],
  [
    "Hand-arm vibration (HAVS)",
    "Regular use of vibrating tools such as breakers, grinders, SDS drills, cut-off saws and compactors can cause permanent damage to the nerves, blood vessels and joints in the hands and arms.\n\n• Use the right tool for the job, and use low-vibration tools where available.\n• Keep tools well maintained and blades and bits sharp.\n• Let the tool do the work. Don't grip harder than you need to.\n• Limit your trigger time and record it if asked. Take regular breaks.\n• Keep your hands warm and dry, which helps your circulation.\n• Report tingling, numbness, white fingers or loss of grip straight away.",
  ],
  [
    "Excavations and buried services",
    "Trenches can collapse without warning, and hitting a buried cable or gas pipe can kill.\n\n• Check the service drawings and use a CAT and Genny before digging, then scan again as you go.\n• Hand dig trial holes to find services before using a digger near them.\n• Treat every cable and pipe as live until it is proven dead.\n• Never enter an unsupported trench deeper than knee height without asking the site manager. Support or batter back the sides.\n• Keep spoil, materials and plant at least 1 m back from the edge.\n• Fence or barrier every open excavation and put stop blocks in place for vehicles.\n• Check the excavation at the start of every shift and after rain.",
  ],
  [
    "Asbestos awareness",
    "Any building built before 2000 may contain asbestos. Breathing in the fibres can cause fatal diseases decades later.\n\n• Check the asbestos survey before starting work. Ask if there isn't one.\n• Common places include artex ceilings, floor tiles, soffits, pipe lagging, cement sheets, flues and old boards.\n• If you find something you think could be asbestos, STOP. Don't touch it, keep others away and tell the site manager.\n• Don't drill, cut, sand or break anything suspicious until it has been tested.\n• Only licensed contractors can remove most types of asbestos.",
  ],
  [
    "Slips, trips and falls",
    "Most site injuries come from slips and trips.\n\n• Keep access routes, stairs and walkways clear of materials, cables and rubbish.\n• Clean up spills and mud straight away.\n• Run cables and hoses along walls, or overhead where possible.\n• Make sure work areas are well lit, especially in winter.\n• Wear safety boots with good grip and tie your laces.\n• Tidy as you go and use the skip.",
  ],
  [
    "Fire safety and hot works",
    "• Know where the fire assembly point and extinguishers are on this site.\n• Hot works (grinding, soldering, torching) need a check of the area first. Remove flammable materials or cover them.\n• Keep an extinguisher close by during hot works and check the area for at least 60 minutes afterwards.\n• Store gas bottles upright, outside, secured and away from exits.\n• Keep fire exits and escape routes clear.\n• Don't overload extension leads.",
  ],
];
const CERT_TYPES = [
  "CSCS card",
  "First Aid at Work",
  "Emergency First Aid at Work",
  "PASMA (towers)",
  "IPAF (MEWPs)",
  "CPCS / NPORS (plant)",
  "Asbestos awareness",
  "SSSTS",
  "SMSTS",
  "Abrasive wheels",
  "Manual handling",
  "Working at height",
  "Gas Safe",
  "Electrical (e.g. 18th Edition)",
  "Driving licence",
];
function certsOf(list) {
  return (list || []).filter((s) => s.type === "cert");
}
function talkSigs(list, talkId) {
  return (list || []).filter((s) => s.type === "talk" && s.talkId === talkId);
}
function myTalks() {
  return S.talks.filter(
    (t) => t.assignees === "all" || (Array.isArray(t.assignees) && t.assignees.includes(S.me)),
  );
}
function myTalkTodo() {
  return myTalks().filter((t) => !talkSigs(S.mine.signoffs, t.id).length);
}
function expiryState(d) {
  if (!d) return "";
  const days = (parse(d) - new Date()) / 864e5;
  return days < 0 ? "expired" : days < 60 ? "soon" : "";
}
function certRow(c, owner, who) {
  const st = expiryState(c.expires);
  return `<div class="entry cert" data-c="${esc(c.id)}" data-w="${esc(who || "")}"><div class="main">
    <div class="job">${st === "expired" ? '<span class="tag bad">Expired</span>' : st === "soon" ? '<span class="tag day">Expires soon</span>' : '<span class="tag ok">In date</span>'}${esc(c.name)}${owner ? ` <span class="who">· ${esc(nameOf(who))}</span>` : ""}</div>
    <div class="sub">${c.number ? "No. " + esc(c.number) + " · " : ""}${c.expires ? "Expires " + shortDay(c.expires) : "No expiry date"}</div>
    ${c.fileId ? `<div class="filerow"><button type="button" class="pillbtn c-file">Open</button></div>` : ""}</div>
    ${!owner ? `<button type="button" class="linkdanger c-del">Remove</button>` : ""}</div>`;
}
function wireCerts(list, owner) {
  $("main")
    .querySelectorAll(".cert")
    .forEach((row) => {
      const c = list.find((x) => x.id === row.dataset.c && (!owner || x.who === row.dataset.w));
      if (!c) return;
      const f = row.querySelector(".c-file");
      if (f) f.onclick = () => openFile(c.fileId, c.fileName || c.name, c.contentType);
      const d = row.querySelector(".c-del");
      if (d) {
        let a = false;
        d.onclick = async () => {
          if (!a) {
            a = true;
            d.textContent = "Tap again";
            return;
          }
          try {
            await myDoc("signoffs", c.id).delete();
            toast("Removed");
          } catch (e) {
            toast("Couldn't remove");
          }
        };
      }
    });
}
function talkCard(t, owner) {
  if (owner) {
    const ids = talkAssignees(t);
    const signed =
      ids.filter((id) => talkSigs(S.data.signoffs[id], t.id).length).length +
      (t.onsite || []).length;
    return `<button type="button" class="entry talkc" data-t="${esc(t.id)}"><div class="main"><div class="job"><span class="tag ${t.kind === "training" ? "" : "day"}">${t.kind === "training" ? "Training" : "Toolbox talk"}</span>${esc(t.title)}</div>
      <div class="sub">${t.site ? esc(t.site) + " · " : ""}${t.due ? "by " + shortDay(t.due) + " · " : ""}${signed} signed${ids.length ? ` · ${ids.filter((id) => !talkSigs(S.data.signoffs[id], t.id).length).length} still to sign` : ""}</div></div></button>`;
  }
  const s = talkSigs(S.mine.signoffs, t.id)[0];
  return `<button type="button" class="entry talkc" data-t="${esc(t.id)}"><div class="main"><div class="job"><span class="tag ${t.kind === "training" ? "" : "day"}">${t.kind === "training" ? "Training" : "Toolbox talk"}</span>${s ? '<span class="tag ok">Signed</span>' : '<span class="tag bad">To do</span>'}${esc(t.title)}</div>
    <div class="sub">${s ? "Signed " + stamp(s.signedAt) : t.due ? "Please read and sign by " + shortDay(t.due) : "Please read and sign"}</div></div></button>`;
}
function talkAssignees(t) {
  return t.assignees === "all"
    ? teamIds()
    : (t.assignees || []).filter((id) => teamIds().includes(id));
}
function trainingView() {
  const owner = ownerMode();
  if (owner) {
    const talks = S.talks.slice().sort((a, b) => (b.created || 0) - (a.created || 0));
    const certs = allTeam("signoffs").filter((s) => s.type === "cert");
    const alert = certs
      .filter((c) => expiryState(c.expires))
      .sort((a, b) => (a.expires || "").localeCompare(b.expires || ""));
    $("main").innerHTML =
      `<div class="actions"><button class="btn primary" id="newTalk" type="button">+ New toolbox talk</button><button class="btn" id="newTraining" type="button">+ New training</button></div>
      <div class="day"><div class="dayh"><span>Toolbox talks and training</span><span class="sum">${talks.length}</span></div>${talks.length ? talks.map((t) => talkCard(t, true)).join("") : '<div class="nothing">None yet. Start from one of the ready-made toolbox talks or write your own.</div>'}</div>
      <div class="day"><div class="dayh"><span>Cards and certificates</span><span class="sum">${certs.length}</span></div>
      ${alert.length ? alert.map((c) => certRow(c, true, c.who)).join("") : ""}
      ${
        teamIds()
          .map((id) => {
            const mine = certs.filter((c) => c.who === id && !expiryState(c.expires));
            return `<details class="card" data-id="__c${esc(id)}" ${S.open.has("__c" + id) ? "open" : ""}><summary><div class="nm">${esc(nameOf(id))}<small>${certs.filter((c) => c.who === id).length} card${certs.filter((c) => c.who === id).length === 1 ? "" : "s"} or certificate${certs.filter((c) => c.who === id).length === 1 ? "" : "s"}</small></div></summary><div class="cardbody">${
              certs
                .filter((c) => c.who === id)
                .map((c) => certRow(c, true, id))
                .join("") || '<div class="nothing">Nothing added yet.</div>'
            }</div></details>`;
          })
          .join("") || '<div class="nothing">No employees yet.</div>'
      }</div>`;
    $("newTalk").onclick = () => openTalkEditor("toolbox", null);
    $("newTraining").onclick = () => openTalkEditor("training", null);
    $("main")
      .querySelectorAll("details.card")
      .forEach((dt) =>
        dt.addEventListener("toggle", () => {
          dt.open ? S.open.add(dt.dataset.id) : S.open.delete(dt.dataset.id);
        }),
      );
    wireCerts(certs, true);
  } else {
    const todo = myTalkTodo(),
      done = myTalks().filter((t) => !todo.includes(t));
    const certs = certsOf(S.mine.signoffs).sort((a, b) =>
      (a.expires || "9999").localeCompare(b.expires || "9999"),
    );
    $("main").innerHTML =
      `${todo.length ? `<div class="day"><div class="dayh"><span>To read and sign</span><span class="sum">${todo.length}</span></div>${todo.map((t) => talkCard(t, false)).join("")}</div>` : '<div class="notice">You\'re up to date with toolbox talks and training.</div>'}
      ${done.length ? `<div class="day"><div class="dayh"><span>Done</span><span class="sum">${done.length}</span></div>${done.map((t) => talkCard(t, false)).join("")}</div>` : ""}
      <div class="day"><div class="dayh"><span>My cards and certificates</span><span class="sum">${certs.length}</span></div>
      <div class="actions"><button class="btn primary" id="addCert" type="button">+ Add card or certificate</button></div>
      ${certs.length ? certs.map((c) => certRow(c, false)).join("") : `<div class="nothing">Add your CSCS card, first aid, PASMA, plant tickets and so on, with a photo. ${esc(bossFirst())} will be reminded before they expire.</div>`}</div>`;
    $("addCert").onclick = openCert;
    wireCerts(certs, false);
  }
  $("main")
    .querySelectorAll(".talkc")
    .forEach((b) => (b.onclick = () => openTalk(b.dataset.t)));
}
function openCert() {
  setFormType("cert");
  setEditing(null);
  openSheet(
    `<h3 id="sheettitle">Add card or certificate</h3>
    <label for="ce-name">What is it?<input id="ce-name" list="ce-types" required maxlength="80" placeholder="e.g. CSCS card"><datalist id="ce-types">${CERT_TYPES.map((t) => `<option value="${esc(t)}">`).join("")}</datalist></label>
    <div class="grid2"><label for="ce-num">Card or certificate number<input id="ce-num" maxlength="60"></label>
    <label for="ce-exp">Expiry date<input id="ce-exp" type="date"></label></div>
    <label for="ce-file">Photo of the card or the certificate (optional)<input id="ce-file" type="file" accept="image/*,application/pdf,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
    ${formFoot(false, "Save")}`,
    async () => {
      const name = $("ce-name").value.trim();
      if (!name) {
        showErr("Say what the card or certificate is.");
        return;
      }
      const f = $("ce-file").files[0];
      if (f && !S.assets) {
        showErr(
          `You don't have permission to upload. Ask ${bossFirst()} to make you an Editor on this page.`,
        );
        return;
      }
      $("f-save").disabled = true;
      const files = [];
      try {
        if (f) {
          if (isImg(f.type) && !/svg/.test(f.type)) {
            const ex = readExif(await f.slice(0, 262144).arrayBuffer());
            files.push({ blob: await shrinkImage(f), name: f.name, field: "fileId", meta: true });
          } else files.push({ blob: f, name: f.name, field: "fileId", meta: true });
        }
        const r = await submitJob({
          coll: "signoffs",
          docId: "cert-" + newId(),
          data: {
            type: "cert",
            name,
            number: $("ce-num").value.trim(),
            expires: $("ce-exp").value,
            fileName: f ? f.name : "",
            contentType: f ? (isImg(f.type) ? "image/jpeg" : f.type) : "",
            created: Date.now(),
          },
          files,
        });
        closeForm();
        toast(r === "queued" ? "Kept on this phone. It will send when you have signal." : "Saved");
        render();
      } catch (e) {
        showErr(uploadErr(e));
        $("f-save").disabled = false;
      }
    },
    "ce-name",
  );
}
async function shrinkImage(f, max) {
  const img = await loadImage(f);
  const sc = Math.min(1, (max || 1800) / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.naturalWidth * sc);
  cv.height = Math.round(img.naturalHeight * sc);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return await new Promise((res, rej) =>
    cv.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85),
  );
}
function openTalkEditor(kind, t) {
  const ids = teamIds();
  setFormType("talkedit");
  setEditing(t || null);
  const assignAll = !t || t.assignees === "all";
  openSheet(
    `<h3 id="sheettitle">${t ? "Edit" : "New"} ${kind === "training" ? "training" : "toolbox talk"}</h3>
    ${!t && kind === "toolbox" ? `<label for="tk-tpl">Start from a ready-made talk<select id="tk-tpl"><option value="">Write my own</option>${TALK_TEMPLATES.map((x, i) => `<option value="${i}">${esc(x[0])}</option>`).join("")}</select></label>` : ""}
    <label for="tk-title">Title<input id="tk-title" required maxlength="100" value="${esc(t ? t.title : "")}" placeholder="${kind === "training" ? "e.g. How to use the new laser level" : "e.g. Working at height"}"></label>
    ${pickField("tk-site", "Site (optional)", siteNames(), t ? t.site || "" : "", "e.g. 12 High Street", false)}
    <label for="tk-body">What workers need to read<textarea id="tk-body" style="min-height:220px" maxlength="8000">${esc(t ? t.body : "")}</textarea></label>
    <label for="tk-file">Attach a document, e.g. a PDF or image (optional)<input id="tk-file" type="file" accept="application/pdf,image/*,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
    ${t && t.fileId ? `<div class="who">Attached: ${esc(t.fileName)}. Choose a new file to replace it.</div>` : ""}
    <div><div class="flabel">Who needs to sign it?</div><div class="seg" id="tk-all"><button type="button" data-v="all" aria-pressed="${assignAll}">Everyone</button><button type="button" data-v="some" aria-pressed="${!assignAll}">Choose people</button></div>
      <div class="seg" id="tk-who" style="margin-top:8px" ${assignAll ? "hidden" : ""}>${ids.map((id) => `<button type="button" data-v="${esc(id)}" aria-pressed="${t && Array.isArray(t.assignees) && t.assignees.includes(id)}">${esc(nameOf(id))}</button>`).join("")}</div></div>
    <label for="tk-due">Sign by (optional)<input id="tk-due" type="date" value="${esc(t ? t.due || "" : "")}"></label>
    <div class="who">Ready-made talks are a starting point. Check they suit your site and add anything specific.</div>
    ${formFoot(false, t ? "Save" : "Send to workers")}`,
    () => saveTalk(kind),
    "tk-title",
  );
  if ($("tk-tpl"))
    $("tk-tpl").onchange = (e) => {
      const x = TALK_TEMPLATES[+e.target.value];
      if (x && e.target.value !== "") {
        $("tk-title").value = x[0];
        $("tk-body").value = x[1];
      }
    };
  $("tk-all")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          $("tk-all")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          $("tk-who").hidden = b.dataset.v === "all";
        }),
    );
  $("tk-who")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
    );
}
async function saveTalk(kind) {
  const title = $("tk-title").value.trim(),
    body = $("tk-body").value.trim();
  if (!title) {
    showErr("Add a title.");
    return;
  }
  if (!body && !$("tk-file").files[0] && !(editing && editing.fileId)) {
    showErr("Add the content or attach a document.");
    return;
  }
  const all = $("tk-all").querySelector('[aria-pressed="true"]').dataset.v === "all";
  const who = [...$("tk-who").querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.v);
  if (!all && !who.length) {
    showErr("Choose at least one person, or choose Everyone.");
    return;
  }
  $("f-save").disabled = true;
  try {
    const data = {
      kind,
      title,
      body,
      site: pickVal("tk-site"),
      assignees: all ? "all" : who,
      due: $("tk-due").value,
      updated: Date.now(),
      fileId: editing ? editing.fileId || null : null,
      fileName: editing ? editing.fileName || "" : "",
      contentType: editing ? editing.contentType || "" : "",
      onsite: editing ? editing.onsite || [] : [],
    };
    const f = $("tk-file").files[0];
    if (f) {
      const up = await uploadFile(f, f.name);
      data.fileId = up.id;
      data.fileName = f.name;
      data.contentType = up.contentType || f.type;
    }
    const id = editing ? editing.id : newId();
    await S.db
      .doc("talks/" + id)
      .set(Object.assign({ created: (editing && editing.created) || Date.now() }, data));
    closeForm();
    toast(editing ? "Saved" : "Sent");
    render();
  } catch (e) {
    showErr(uploadErr(e));
    $("f-save").disabled = false;
  }
}
function openTalk(id) {
  const t = S.talks.find((x) => x.id === id);
  if (!t) return;
  const owner = ownerMode();
  const attach = t.fileId
    ? `<div class="filerow">${isImg(t.contentType) ? `<img src="${blobUrl(t.fileId)}" alt="" style="width:100%;border-radius:8px">` : ""}<button type="button" class="pillbtn" id="tv-file">Open ${esc(t.fileName || "attachment")}</button></div>`
    : "";
  let html = `<span class="tag ${t.kind === "training" ? "" : "day"}">${t.kind === "training" ? "Training" : "Toolbox talk"}</span>
    <h3 style="font-family:var(--f-display);font-size:24px;margin:6px 0 0;color:var(--accent);text-transform:uppercase;letter-spacing:.02em">${esc(t.title)}</h3>
    <div class="who">${t.site ? esc(t.site) + " · " : ""}${esc(coName())}${t.due ? " · sign by " + shortDay(t.due) : ""}</div>
    <div class="talkbody">${esc(t.body)}</div>${attach}`;
  if (owner) {
    const ids = talkAssignees(t);
    const rows = [];
    ids.forEach((id) => {
      const s = talkSigs(S.data.signoffs[id], t.id)[0];
      if (s)
        rows.push({
          name: s.name || nameOf(id),
          company: s.company || "",
          at: s.signedAt,
          sig: s.signature,
          how: "In the app",
        });
    });
    (t.onsite || []).forEach((a) =>
      rows.push({
        name: a.name,
        company: a.company || "",
        at: a.at,
        sig: a.signature,
        how: "On site",
      }),
    );
    const notYet = ids.filter((id) => !talkSigs(S.data.signoffs[id], t.id).length).map(nameOf);
    html += `<div class="day" style="margin-top:14px"><div class="dayh"><span>Signed</span><span class="sum">${rows.length}</span></div>
      ${
        rows.length
          ? rows
              .sort((a, b) => a.at - b.at)
              .map(
                (r) =>
                  `<div class="citem"><span><b>${esc(r.name)}</b>${r.company ? ` · ${esc(r.company)}` : ""}<br><span class="who">${stamp(r.at)} · ${r.how}</span></span><img src="${esc(r.sig)}" alt="Signature" class="sigthumb"></div>`,
              )
              .join("")
          : '<div class="nothing">Nobody has signed yet.</div>'
      }
      ${notYet.length ? `<div class="sub" style="color:var(--danger)">Not signed yet: ${esc(notYet.join(", "))}</div>` : ""}</div>
      <div class="actions"><button class="btn primary" id="tv-onsite" type="button">Sign people in on this phone</button><button class="btn" id="tv-pdf" type="button">Download register (PDF)</button><button class="pillbtn" id="tv-edit" type="button">Edit</button><button class="linkdanger" id="tv-del" type="button">Delete</button></div>`;
  } else {
    const s = talkSigs(S.mine.signoffs, t.id)[0];
    html += s
      ? `<div class="notice" style="margin-top:12px">You signed this on ${stamp(s.signedAt)}.</div>`
      : `<div class="actions" style="margin-top:12px"><button class="btn primary" id="tv-sign" type="button">I've read it – sign</button></div>`;
  }
  openViewer(html);
  if ($("tv-file"))
    $("tv-file").onclick = () => openFile(t.fileId, t.fileName || "attachment", t.contentType);
  if ($("tv-sign")) $("tv-sign").onclick = () => openTalkSign(t, false);
  if ($("tv-onsite")) $("tv-onsite").onclick = () => openTalkSign(t, true);
  if ($("tv-pdf")) $("tv-pdf").onclick = () => talkPdf(t);
  if ($("tv-edit"))
    $("tv-edit").onclick = () => {
      closeViewer();
      openTalkEditor(t.kind, t);
    };
  const del = $("tv-del");
  if (del) {
    let a = false;
    del.onclick = async () => {
      if (!a) {
        a = true;
        del.textContent = "Tap again to delete";
        return;
      }
      try {
        await S.db.doc("talks/" + t.id).delete();
        closeViewer();
        toast("Deleted");
      } catch (e) {
        toast("Couldn't delete");
      }
    };
  }
}
function openTalkSign(t, onsite) {
  setFormType("talksign");
  setEditing(null);
  openSheet(
    `<h3 id="sheettitle">${onsite ? "Sign in" : "Sign"}: ${esc(t.title)}</h3>
    ${onsite ? `<div class="notice">Pass the phone to each person in turn. After each signature the form clears for the next person.</div>` : ""}
    <div class="grid2"><label for="ts-name">Full name<input id="ts-name" required maxlength="80" value="${onsite ? "" : esc(meInfo().name)}"></label>
    <label for="ts-co">Company<input id="ts-co" maxlength="80" value="${esc(onsite ? coData().name : meInfo().company || coData().name)}"></label></div>${onsite ? meBtn("ts-me") : ""}
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="ts-ok"> I ${onsite ? "attended this talk and " : "have read "}understood it and will follow it.</label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn" id="ts-clear">Clear</button></div><canvas id="ts-sig" class="sigpad" aria-label="Signature box"></canvas></div>
    <div class="who" id="ts-count"></div>
    ${formFoot(false, onsite ? "Save and next person" : "Sign")}`,
    async () => {
      const name = $("ts-name").value.trim();
      if (!name) {
        showErr("Add the full name.");
        return;
      }
      if (!$("ts-ok").checked) {
        showErr("Tick the box to confirm.");
        return;
      }
      if (!sig.drawn) {
        showErr("Sign in the box.");
        return;
      }
      const now = Date.now(),
        rec = { name, company: $("ts-co").value.trim(), signature: sig.data(), at: now };
      $("f-save").disabled = true;
      try {
        if (onsite) {
          const cur = S.talks.find((x) => x.id === t.id) || t;
          const list = (cur.onsite || []).concat([rec]);
          await S.db.doc("talks/" + t.id).update({ onsite: list });
          cur.onsite = list;
          count++;
          $("ts-count").textContent = `${count} signed on this phone so far.`;
          $("ts-name").value = "";
          $("ts-ok").checked = false;
          sig.clear();
          $("f-save").disabled = false;
          $("ts-name").focus();
          toast(name + " signed");
          return;
        }
        const r = await submitJob({
          coll: "signoffs",
          docId: "talk-" + t.id,
          data: {
            type: "talk",
            talkId: t.id,
            title: t.title,
            name,
            company: rec.company,
            signature: rec.signature,
            signedAt: now,
            created: now,
          },
        });
        closeForm();
        closeViewer();
        toast(r === "queued" ? "Kept on this phone. It will send when you have signal." : "Signed");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection and try again.");
        $("f-save").disabled = false;
      }
    },
    "ts-name",
  );
  let count = 0;
  const sig = sigPad($("ts-sig"));
  $("ts-clear").onclick = () => sig.clear();
  if ($("ts-me"))
    $("ts-me").onclick = () => {
      const m = meInfo();
      $("ts-name").value = m.name;
      $("ts-co").value = m.company || coData().name;
    };
  const c = $("f-cancel");
  if (c && onsite) {
    c.textContent = "Done";
    c.onclick = () => {
      closeForm();
      openTalk(t.id);
    };
  }
}
async function talkPdf(t) {
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
  const LH = await lhFrame();
  const W = 210,
    M = 16;
  let y = LH.top || 18;
  const clean = (x) =>
    String(x || "")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/•/g, "-")
      .replace(/[^\x09\x0A\x0D\x20-\x7E£·°]/g, "");
  const need = (h) => {
    if (y + h > (LH.bot || 282)) {
      doc.addPage();
      y = LH.top || 18;
    }
  };
  const text = (s, size = 10, style = "normal", indent = 0, gap = 1.6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.splitTextToSize(clean(s), W - 2 * M - indent).forEach((l) => {
      need(size * 0.45);
      doc.text(l, M + indent, y);
      y += size * 0.42;
    });
    y += gap;
  };
  if (!LH.pics) {
    doc.setFillColor(...BRGB());
    doc.rect(0, 0, W, 6, "F");
    await pdfLogo(doc, W - M, 11, 52, 24);
    text(coName().toUpperCase(), 9, "bold", 0, 6);
  }
  text((t.kind === "training" ? "Training" : "Toolbox talk") + " register", 18, "bold", 0, 2);
  text(t.title, 12, "bold", 0, 1);
  if (t.site) text(t.site, 10, "normal", 0, 1);
  y += 4;
  text("What was covered", 11, "bold", 0, 1.5);
  clean(t.body)
    .split("\n")
    .forEach((p) => {
      if (p.trim()) text(p, 9.5, "normal", 0, 1.2);
      else y += 1.5;
    });
  y += 4;
  text("Signatures", 11, "bold", 0, 2);
  const ids = talkAssignees(t);
  const rows = [];
  ids.forEach((id) => {
    const s = talkSigs(S.data.signoffs[id], t.id)[0];
    if (s)
      rows.push({
        name: s.name || nameOf(id),
        company: s.company,
        at: s.signedAt,
        sig: s.signature,
      });
  });
  (t.onsite || []).forEach((a) =>
    rows.push({ name: a.name, company: a.company, at: a.at, sig: a.signature }),
  );
  rows
    .sort((a, b) => a.at - b.at)
    .forEach((r) => {
      need(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(clean(r.name), M, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(clean((r.company ? r.company + " · " : "") + stamp(r.at)), M, y + 10);
      try {
        doc.addImage(r.sig, "PNG", W - M - 48, y, 48, 16);
      } catch (e) {}
      doc.setDrawColor(210);
      doc.line(M, y + 18, W - M, y + 18);
      y += 21;
    });
  if (!rows.length) text("Nobody has signed yet.", 10);
  const fn = `${t.kind === "training" ? "Training" : "Toolbox talk"} register - ${clean(t.title)
    .replace(/[^\w\s-]/g, "")
    .trim()}.pdf`;
  try {
    lhFinish(doc, LH);
    await S.dl.save({ filename: fn, data: doc.output("blob") });
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Download didn't go through");
  }
}
