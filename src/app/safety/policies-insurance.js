/* ================= POLICIES & INSURANCE ================= */
import { bossFirst } from "../core/company-names.js";
import { $, esc, fsize, shortDay, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, docRef, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { saveAsset, uploadErr, uploadFile } from "../files/files.js";
import { openFile } from "../files/in-app-files.js";
import { newId, submitJob } from "../files/outbox.js";
import { companyCard, wireCompany } from "../owner/company-details.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { daysTo, dueTagN } from "./expiry-dates.js";
export { isPolDoc, myPolTodo, policiesView };
const POL_CATS = {
  policy: "Company policies",
  insurance: "Insurance",
  companydoc: "Other company documents",
  folder: "Folder",
};
const polFolderKey = (d) => (d.cat === "folder" ? "f:" + (d.folder || "") : d.cat);
function polFolders() {
  const out = [
    ["policy", "Company policies"],
    ["insurance", "Insurance"],
  ];
  const extra = [
    ...new Set(
      ((S.settings || {}).polFolders || []).concat(
        (S.policies || []).filter((d) => d.cat === "folder" && d.folder).map((d) => d.folder),
      ),
    ),
  ];
  extra.forEach((f) => out.push(["f:" + f, f]));
  out.push(["companydoc", "Other company documents"]);
  return out;
}
const isPolDoc = (d) => d && d.cat in POL_CATS;
const polRead = (list, id) => (list || []).find((x) => x.type === "polread" && x.docId === id);
const myPolTodo = () =>
  (S.policies || []).filter((d) => d.mustRead && !polRead(S.mine.signoffs, d.id));
function policiesView() {
  const owner = ownerMode(),
    list = (S.policies || []).slice().sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  const ids = teamIds();
  const row = (d) => {
    const r = !owner ? polRead(S.mine.signoffs, d.id) : null;
    const n = d.expires ? daysTo(d.expires) : null;
    let st = "";
    if (owner && d.mustRead) {
      const rd = ids.filter((id) => polRead(S.data.signoffs[id], d.id)),
        nr = ids.filter((id) => !rd.includes(id));
      st = `<div class="sub"><b style="color:var(--ink)">Read by ${rd.length} of ${ids.length}</b>${nr.length ? `<span style="color:var(--danger)"> · Not yet: ${nr.map(nameOf).map(esc).join(", ")}</span>` : ""}</div>`;
    }
    return `<div class="entry pol" data-d="${esc(d.id)}"><div class="main">
      <div class="job">${d.mustRead && !owner && !r ? '<span class="tag bad">Please read</span>' : ""}${r ? '<span class="tag ok">Read</span>' : ""}${esc(d.title || d.fileName)}</div>
      <div class="sub">${[d.insurer, d.policyNo ? "Policy no. " + d.policyNo : "", d.expires ? (n < 0 ? "Expired " : "Runs to ") + shortDay(d.expires) : "", d.fileName, d.size ? fsize(d.size) : ""].filter(Boolean).map(esc).join(" · ")}${d.expires && n <= 30 ? " " + dueTagN(n) : ""}</div>
      ${d.note ? `<div class="sub">${esc(d.note)}</div>` : ""}${st}
      ${r ? `<div class="sub">You confirmed you read this on ${stamp(r.signedAt)}</div>` : ""}
      <div class="filerow"><button type="button" class="pillbtn p-open">Open</button>${!owner && d.mustRead && !r ? `<button type="button" class="btn primary p-read" style="padding:7px 14px">I've read it</button>` : ""}
      ${owner ? `<button type="button" class="pillbtn p-cv ${d.clientVisible ? "on" : ""}" aria-pressed="${!!d.clientVisible}" title="Let clients see this in their portal">${d.clientVisible ? "🏡 Clients can see" : "🏡 Show to clients"}</button><button type="button" class="pillbtn p-save">Download</button><button type="button" class="pillbtn p-edit">Edit</button><button type="button" class="linkdanger p-del">Remove</button>` : ""}</div></div></div>`;
  };
  const todo = !owner ? myPolTodo() : [];
  const folders = polFolders();
  let cur = S.f.polf || "";
  if (cur.startsWith("f:") && !folders.some((f) => f[0] === cur))
    folders.splice(folders.length - 1, 0, [cur, cur.slice(2)]);
  if (cur && !folders.some((f) => f[0] === cur)) cur = S.f.polf = "";
  const unreadIn = (k) => todo.filter((d) => polFolderKey(d) === k).length;
  if (!cur) {
    const shown = folders.filter(([k]) => owner || list.some((d) => polFolderKey(d) === k));
    $("main").innerHTML = `${
      owner
        ? `<div class="actions"><button class="btn primary" id="pol-add" type="button">+ Upload documents</button><button class="btn" id="pol-nf" type="button">+ New folder</button></div>`
        : todo.length
          ? `<div class="notice warn">Please read ${todo.length === 1 ? "1 document" : todo.length + " documents"}. Open the folder marked in red.</div>`
          : ""
    }
      ${
        shown.length
          ? `<div class="folders">${shown
              .map(([k, l]) => {
                const n = list.filter((d) => polFolderKey(d) === k).length,
                  u = unreadIn(k);
                return `<button type="button" class="folder" data-f="${esc(k)}"><span class="ficon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h5l2 2h8A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg></span><span class="fname">${esc(l)}</span><span class="who">${n} document${n === 1 ? "" : "s"}</span>${u ? `<span class="badge">${u}</span>` : ""}</button>`;
              })
              .join("")}</div>`
          : `<div class="empty"><strong>Nothing here yet</strong>${esc(bossFirst())}'s company policies and insurance certificates will appear here.</div>`
      }`;
    $("main").insertAdjacentHTML("afterbegin", companyCard());
    wireCompany();
    $("main")
      .querySelectorAll(".folder")
      .forEach(
        (b) =>
          (b.onclick = () => {
            S.f.polf = b.dataset.f;
            render();
          }),
      );
    if ($("pol-add")) $("pol-add").onclick = () => openPolicyUpload();
    if ($("pol-nf")) $("pol-nf").onclick = openPolFolder;
    return;
  }
  const fl = folders.find((f) => f[0] === cur)[1],
    g = list.filter((d) => polFolderKey(d) === cur);
  $("main").innerHTML =
    `<div class="actions"><button class="btn" id="pol-back" type="button">‹ All folders</button>${owner ? `<button class="btn primary" id="pol-add" type="button">+ Upload to this folder</button>` : ""}</div>
    <div class="day"><div class="dayh"><span>${esc(fl)}</span><span class="sum">${g.length}</span></div>
    ${!owner && unreadIn(cur) ? `<div class="who">Open each document marked <b>Please read</b>, then tap <b>I've read it</b>.</div>` : ""}
    ${g.map(row).join("") || '<div class="nothing">Nothing in this folder yet.</div>'}</div>
    ${owner && cur.startsWith("f:") && !g.length ? `<button type="button" class="linkdanger" id="pol-delf">Delete this empty folder</button>` : ""}`;
  $("pol-back").onclick = () => {
    S.f.polf = "";
    render();
  };
  if ($("pol-add")) $("pol-add").onclick = () => openPolicyUpload(null, cur);
  if ($("pol-delf"))
    $("pol-delf").onclick = async () => {
      const name = cur.slice(2);
      try {
        await S.db.doc("settings/app").set(
          Object.assign({}, S.settings, {
            polFolders: ((S.settings || {}).polFolders || []).filter((x) => x !== name),
          }),
        );
        S.f.polf = "";
        toast("Folder deleted");
        render();
      } catch (e) {
        toast("Couldn't delete");
      }
    };
  $("main")
    .querySelectorAll(".pol")
    .forEach((el) => {
      const d = list.find((x) => x.id === el.dataset.d);
      if (!d) return;
      el.querySelector(".p-open").onclick = () =>
        openFile(d.assetId, d.fileName || d.title, d.contentType);
      const rd = el.querySelector(".p-read");
      if (rd)
        rd.onclick = async () => {
          rd.disabled = true;
          try {
            const r = await submitJob({
              coll: "signoffs",
              docId: "pol-" + d.id,
              data: {
                type: "polread",
                docId: d.id,
                title: d.title,
                name: S.myProfile.name,
                signedAt: Date.now(),
                created: Date.now(),
              },
            });
            toast(
              r === "queued"
                ? "Saved. It will send when you have signal."
                : `Thanks, ${bossFirst()} can see you've read it`,
            );
            render();
          } catch (e) {
            rd.disabled = false;
            toast("Couldn't save");
          }
        };
      const sv = el.querySelector(".p-save");
      if (sv) sv.onclick = () => saveAsset(d.assetId, d.fileName || "document.pdf");
      const cv = el.querySelector(".p-cv");
      if (cv)
        cv.onclick = async () => {
          try {
            await S.db.doc("docs/" + d.id).update({ clientVisible: !d.clientVisible });
            toast(
              d.clientVisible ? "Hidden from clients" : "Clients can now see this in their portal",
            );
          } catch (e) {
            toast("Couldn't save");
          }
        };
      const ed = el.querySelector(".p-edit");
      if (ed) ed.onclick = () => openPolicyUpload(d);
      const x = el.querySelector(".p-del");
      if (x)
        x.onclick = async () => {
          if (x.dataset.armed !== "1") {
            x.dataset.armed = "1";
            x.textContent = "Tap again to remove";
            return;
          }
          try {
            await docRef(d).delete();
            S.assets && S.assets.delete(d.assetId).catch(() => {});
            toast("Removed");
          } catch (e) {
            toast("Couldn't remove");
          }
        };
    });
}
function openPolFolder() {
  openSheet(
    `<h3 id="sheettitle">New folder</h3><label for="nf-pol">Folder name<input id="nf-pol" maxlength="60" required placeholder="e.g. Method statements"></label>${formFoot(false, "Add folder")}`,
    async () => {
      const n = $("nf-pol").value.trim();
      if (!n) return;
      if (polFolders().some((f) => f[1].toLowerCase() === n.toLowerCase())) {
        showErr("That folder already exists.");
        return;
      }
      try {
        await S.db.doc("settings/app").set(
          Object.assign({}, S.settings, {
            polFolders: ((S.settings || {}).polFolders || []).concat([n]),
          }),
        );
        closeForm();
        S.f.polf = "f:" + n;
        toast("Folder added");
        render();
      } catch (e) {
        showErr("Couldn't save.");
      }
    },
    "nf-pol",
  );
}
function openPolicyUpload(d, preset) {
  const ed = !!d;
  d = d || {
    cat: preset && preset.startsWith("f:") ? "folder" : preset || "policy",
    folder: preset && preset.startsWith("f:") ? preset.slice(2) : "",
    mustRead: preset !== "insurance",
  };
  const curKey = polFolderKey(d);
  openSheet(
    `<h3 id="sheettitle">${ed ? "Edit document" : "Upload policies or insurance"}</h3>
    ${ed ? "" : `<label for="po-file">Files (PDF or photo, you can choose several)<input id="po-file" type="file" accept="application/pdf,image/*,.doc,.docx,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple required></label>`}
    <label for="po-cat">Folder<select id="po-cat">${polFolders()
      .map(
        ([k, l]) =>
          `<option value="${esc(k)}" ${curKey === k ? "selected" : ""}>${esc(l)}</option>`,
      )
      .join("")}</select></label>
    <label for="po-title">Title${ed ? "" : " (leave blank to use the file name)"}<input id="po-title" maxlength="120" value="${esc(d.title || "")}" placeholder="e.g. Health and safety policy"></label>
    <div id="po-ins" class="grid2"><label for="po-insurer">Insurer (optional)<input id="po-insurer" maxlength="80" value="${esc(d.insurer || "")}"></label><label for="po-no">Policy number (optional)<input id="po-no" maxlength="60" value="${esc(d.policyNo || "")}"></label></div>
    <label for="po-exp">Expiry or renewal date (optional)<input id="po-exp" type="date" value="${esc(d.expires || "")}"></label>
    <label for="po-note">Note (optional)<input id="po-note" maxlength="200" value="${esc(d.note || "")}" placeholder="e.g. Covers employers' and public liability"></label>
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500;white-space:normal"><input type="checkbox" id="po-must" ${d.mustRead ? "checked" : ""}> Everyone must read this and confirm they have</label>
    <div class="who" id="po-prog"></div>
    ${formFoot(false, ed ? "Save" : "Upload")}`,
    async () => {
      const fk = $("po-cat").value;
      const meta = {
        cat: fk.startsWith("f:") ? "folder" : fk,
        folder: fk.startsWith("f:") ? fk.slice(2) : "",
        insurer: $("po-insurer").value.trim(),
        policyNo: $("po-no").value.trim(),
        expires: $("po-exp").value,
        note: $("po-note").value.trim(),
        mustRead: $("po-must").checked,
      };
      if (ed) {
        try {
          await S.db
            .doc("docs/" + d.id)
            .update(Object.assign(meta, { title: $("po-title").value.trim() || d.title }));
          closeForm();
          toast("Saved");
          render();
        } catch (e) {
          showErr("Couldn't save.");
        }
        return;
      }
      const files = [...($("po-file").files || [])];
      if (!files.length) {
        showErr("Choose at least one file.");
        return;
      }
      if (!S.assets) {
        showErr(uploadErr({ code: "not_granted" }));
        return;
      }
      $("f-save").disabled = true;
      let ok = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        $("po-prog").textContent = `Uploading ${i + 1} of ${files.length}…`;
        try {
          const up = await uploadFile(f, f.name);
          const title =
            (files.length === 1 && $("po-title").value.trim()) ||
            f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
          await S.db.doc("docs/" + newId()).set(
            Object.assign({}, meta, {
              title,
              fileName: f.name,
              assetId: up.id,
              contentType: up.contentType || f.type,
              size: up.sizeBytes || f.size,
              uploaded: Date.now(),
            }),
          );
          ok++;
        } catch (e) {
          showErr(f.name + ": " + uploadErr(e));
        }
      }
      $("f-save").disabled = false;
      if (ok === files.length) {
        closeForm();
        toast(`Uploaded ${ok} document${ok === 1 ? "" : "s"}`);
        render();
      }
    },
    "po-cat",
  );
  const sync = () => {
    $("po-ins").hidden = $("po-cat").value !== "insurance";
  };
  $("po-cat").onchange = (e) => {
    sync();
    if (e.target.value === "insurance" && !ed) $("po-must").checked = false;
  };
  sync();
}
