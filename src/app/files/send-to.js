/* ================= SEND TO…: one dialog to send any file to trades and/or clients, tell them, and keep a copy on the job ================= */
import { PT_FOLDERS, ptOf, ptSrc } from "../clients/portal.js";
import { $, esc, store, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { getFileBlob, openFile } from "./in-app-files.js";
import { newId } from "./outbox.js";
import { coData } from "../owner/company-details.js";
import { auditLog } from "../owner/deletion-record.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { photoViewer } from "../photos/photos.js";
import { myName, openJob } from "../survey/door-window-survey.js";
export { SENDTO };
const SENDTO = (() => {
  /* tell a trade something has been sent to them: shows in their banner / pop-up like a reminder, opens the thing when tapped */
  async function notifyTrade(who, ref, refLabel, note) {
    try {
      await S.db.doc("sheets/" + who + "/signoffs/pr-" + newId()).set({
        type: "prompt",
        form: "sent",
        ref,
        refLabel: String(refLabel || "").slice(0, 80),
        note: String(note || "").slice(0, 300),
        status: "open",
        created: Date.now(),
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  function openRef(ref) {
    const i = String(ref || "").indexOf(":");
    const k = ref.slice(0, i),
      id = ref.slice(i + 1);
    if (k === "doc") {
      const d = (S.docs || []).find((x) => x.id === id);
      if (d) openFile(d.assetId, d.fileName || d.title, d.contentType);
      else toast("That file has been removed");
    } else if (k === "sketch") {
      const p = (S.mine.photos || []).find((x) => x.id === id);
      if (p) photoViewer(p, false);
      else {
        S.tab = "photos";
        store.set("jeb.tab", "photos");
        render();
      }
    } else if (k === "job") {
      const j = (S.jobs || []).find((x) => x.id === id);
      if (j && typeof openJob === "function") openJob(j);
      else {
        S.tab = "jobs";
        store.set("jeb.tab", "jobs");
        render();
      }
    } else toast("Open it from the tab it was sent to");
  }
  /* email a file: share sheet with the file attached where the browser allows it, otherwise download + a ready-written email */
  async function emailFile(f, emails, note) {
    const co = coData();
    const name = f.name || f.title || "file";
    const subject = `${f.title || name} – ${co.name}`;
    const body = `Hi,\n\nPlease find attached ${f.title || name}.${note ? "\n\n" + note : ""}\n\nThanks,\n${co.owner || ""}\n${co.name}\n${co.mobile || co.phone || ""}${co.email ? "\n" + co.email : ""}`;
    let blob = null;
    try {
      blob = await getFileBlob(f.assetId);
    } catch (e) {}
    const file = blob
      ? new File([blob], name, { type: f.type || blob.type || "application/octet-stream" })
      : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: subject,
          text: `To: ${emails.join(", ")}\n\n${body}`,
          files: [file],
        });
        toast("Shared – choose Mail and the address is in the message");
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    if (blob) {
      try {
        if (S.dl) await S.dl.save({ filename: name, data: blob });
        else {
          const u = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = u;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 4000);
        }
      } catch (e) {}
    }
    window.location.href = `mailto:${encodeURIComponent(emails.join(","))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Email opened – attach the downloaded file");
  }
  const clientsWithPortal = () =>
    (S.clients || [])
      .filter((c) => c.stage !== "lost" && ptOf(c))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  /* f = {assetId, name, type, title, site, clientId, folder} */
  function open(f) {
    if (!ownerMode() || !f || !f.assetId) {
      toast("Nothing to send");
      return;
    }
    const team = teamIds();
    const cls = clientsWithPortal();
    const sites = (S.sites || []).filter((s) => !s.archived).map((s) => s.name);
    const cl0 = f.clientId && cls.find((c) => c.id === f.clientId);
    const site0 = f.site || (cl0 && cl0.site) || "";
    openSheet(
      `<h3 id="sheettitle">📤 Send “${esc(f.title || f.name || "file")}”</h3>
    <fieldset class="od-who"><legend>Trades</legend>${team.map((id) => `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" class="st-t" value="${esc(id)}"> ${esc(nameOf(id))}</label>`).join("") || '<span class="who">No trades on the app yet.</span>'}</fieldset>
    <fieldset class="od-who"><legend>Clients (with the portal)</legend>${cls.map((c) => `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" class="st-c" value="${esc(c.id)}" ${cl0 && cl0.id === c.id ? "checked" : ""}> ${esc(c.name)}${c.site ? ` <span class="who">· ${esc(c.site)}</span>` : ""}</label>`).join("") || '<span class="who">No clients have joined the portal yet.</span>'}</fieldset>
    <label for="st-folder" id="st-folderl">Where the client sees it<select id="st-folder">${PT_FOLDERS.map(([k, l]) => `<option value="${k}" ${k === (f.folder || "other") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <label class="tick"><input type="checkbox" id="st-job" checked> <span>Also keep it on the job – in <b>Sites › documents</b>, so it's on the record and everyone on that site can open it</span></label>
    <label for="st-site">Which site<select id="st-site"><option value="">General (no site)</option>${sites.map((s) => `<option ${s === site0 ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    <label for="st-note">Message (optional)<textarea id="st-note" rows="2" maxlength="300" placeholder="e.g. Please read before Monday"></textarea></label>
    <fieldset class="od-who"><legend>✉️ Email it too</legend><input id="st-email" list="st-emails" type="text" inputmode="email" autocomplete="off" placeholder="Email address – or pick a trade, client or supplier" style="width:100%"><datalist id="st-emails">${[
      ...team.map((id) => {
        const d = (S.team[id] && S.team[id].details) || {};
        return d.email ? [d.email, nameOf(id)] : null;
      }),
      ...(S.clients || []).map((c) => (c.email ? [c.email, c.name] : null)),
      ...(S.suppliers || []).map((x) => (x.email ? [x.email, x.name] : null)),
    ]
      .filter(Boolean)
      .map(([e, n]) => `<option value="${esc(e)}">${esc(n)}</option>`)
      .join(
        "",
      )}</datalist><div class="who" style="margin-top:4px">Several addresses: put a comma between them. On the tab it opens the share sheet with the file attached (Mail, WhatsApp…); on a computer it downloads the file and opens a ready-written email for you to attach it to.</div></fieldset>
    <div class="who">Trades get a “James sent you…” alert in their app that opens it; clients see it as new in their portal.</div>
    ${formFoot(false, "Send")}`,
      async () => {
        const tr = [...document.querySelectorAll(".st-t:checked")].map((x) => x.value),
          cs = [...document.querySelectorAll(".st-c:checked")].map((x) => x.value);
        const keep = $("st-job").checked;
        const site = $("st-site").value;
        const note = $("st-note").value.trim();
        const folder = $("st-folder").value;
        const emails = $("st-email")
          .value.split(/[,;\s]+/)
          .map((x) => x.trim())
          .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
        if ($("st-email").value.trim() && !emails.length) {
          showErr("That email address doesn't look right.");
          return;
        }
        if (!tr.length && !cs.length && !keep && !emails.length) {
          showErr("Choose who to send it to, tick keep it on the job, or type an email address.");
          return;
        }
        $("f-save").disabled = true;
        const now = Date.now();
        const name = f.name || f.title || "file";
        const title = f.title || String(name).replace(/\.[^.]+$/, "");
        let told = [],
          failed = [];
        try {
          /* trades: the file lives in site documents (for everyone on the site, or only for the trades chosen) and each trade gets an alert */
          let docId = "";
          if (tr.length || keep) {
            docId = newId();
            await S.db.doc("docs/" + docId).set({
              site: site || "General",
              cat: f.cat || "other",
              title,
              fileName: name,
              assetId: f.assetId,
              contentType: f.type || "application/pdf",
              path: "Sent by " + myName(),
              uploaded: now,
              who: keep ? [] : tr,
              sentTo: tr,
              note,
              brochure: !!f.brochure,
            });
          }
          for (const w of tr) {
            if (await notifyTrade(w, "doc:" + docId, title, note)) told.push(nameOf(w));
            else failed.push(nameOf(w));
          }
          /* clients: into their portal documents; the portal shows it as new */
          for (const cid of cs) {
            const c = (S.clients || []).find((x) => x.id === cid);
            const src = c && ptSrc(c);
            if (!src || !src.linked) {
              failed.push(c ? c.name : "client");
              continue;
            }
            try {
              await src.addDoc(newId(), {
                title,
                fileName: name,
                assetId: f.assetId,
                contentType: f.type || "application/pdf",
                folder,
                note,
                sharedAt: now,
                fromSite: site || "",
                sentBy: myName(),
              });
              told.push(c.name);
            } catch (e) {
              failed.push(c.name);
            }
          }
          closeForm();
          toast(
            (told.length
              ? "Sent to " + told.join(", ")
              : emails.length
                ? "Emailing…"
                : "Kept on the job") +
              (failed.length ? " · couldn't send to " + failed.join(", ") : ""),
          );
          try {
            await auditLog(
              "Sent a file",
              title,
              `To ${told.concat(emails).join(", ") || "nobody"}${keep ? " · kept in " + (site || "General") + " documents" : ""}`,
              { asset: f.assetId, to: told, emails, site },
            );
          } catch (e) {}
          if (emails.length) await emailFile(f, emails, note);
        } catch (e) {
          showErr("Couldn't send. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      null,
    );
    const sync = () => {
      const any = document.querySelectorAll(".st-c:checked").length;
      $("st-folderl").hidden = !any;
    };
    document.querySelectorAll(".st-c").forEach((c) => (c.onchange = sync));
    sync();
  }
  return { open, notifyTrade, openRef };
})();
