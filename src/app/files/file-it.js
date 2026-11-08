/* ================= FILE IT: save any PDF the app makes into a client's job file and/or a site's documents ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { uploadFile } from "./files.js";
import { newId } from "./outbox.js";
import { JF_FOLDERS, jfFolderName, jfSave } from "../sales/job-file.js";
import { DOC_CATS } from "../sites/plans-specs.js";
export { fileItSheet };
/* Offered on the "PDF saved" bar (owner only): a form, report, drawing or survey can go into a client's job file
   (from the enquiry onwards, before any estimate) in the folder chosen, and/or into a site's documents (kept
   private to James, like the rest of his site paperwork: todos sitedoc). One upload, filed in both if both. */
function fileItSheet(blob, name) {
  if (!ownerMode()) return;
  const clients = (S.clients || [])
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const sites = (S.sites || []).filter((s) => !s.archived).map((s) => s.name);
  openSheet(
    `<h3 id="sheettitle">📁 Save “${esc(name)}” to…</h3>
    <fieldset class="od-who"><legend><label class="inl"><input type="checkbox" id="fi-cl"> A client's job file</label></legend>
      <div class="grid2"><label for="fi-c">Client<select id="fi-c">${clients.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.work ? " – " + esc(c.work) : ""}</option>`).join("") || '<option value="">No clients yet</option>'}</select></label>
      <label for="fi-f">Folder<select id="fi-f">${JF_FOLDERS.map(([k, l]) => `<option value="${k}"${k === "photos" ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
    </fieldset>
    <fieldset class="od-who"><legend><label class="inl"><input type="checkbox" id="fi-st"> A site's documents (only you see it)</label></legend>
      <div class="grid2"><label for="fi-s">Site<select id="fi-s">${sites.map((s) => `<option>${esc(s)}</option>`).join("") || '<option value="">No sites yet</option>'}</select></label>
      <label for="fi-sc">Folder<select id="fi-sc">${DOC_CATS.map(([k, l]) => `<option value="${k}"${k === "other" ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div>
    </fieldset>
    ${formFoot(false, "Save")}`,
    async () => {
      const toCl = $("fi-cl").checked && $("fi-c").value,
        toSt = $("fi-st").checked && $("fi-s").value;
      if (!toCl && !toSt) return showErr("Tick a client's job file and/or a site.");
      $("f-save").disabled = true;
      try {
        const fn = /\.pdf$/i.test(name) ? name : name + ".pdf";
        const a = await uploadFile(new File([blob], fn, { type: "application/pdf" }), fn);
        const said = [];
        if (toCl) {
          const c = clients.find((x) => x.id === $("fi-c").value);
          const j = (S.jobFiles || []).find((x) => x.clientId === c.id) || {
            clientId: c.id,
            estId: "",
            client: c.name,
            title: c.work || "",
            site: c.site || "",
            items: [],
          };
          const folder = $("fi-f").value;
          await jfSave(
            Object.assign({}, j, {
              items: (j.items || []).concat([
                {
                  id: newId(),
                  assetId: a.id,
                  name: fn,
                  type: "application/pdf",
                  folder,
                  added: Date.now(),
                },
              ]),
            }),
          );
          said.push(`${c.name}'s job file (${jfFolderName(folder).replace(/^\S+\s/, "")})`);
        }
        if (toSt) {
          const site = $("fi-s").value,
            cat = $("fi-sc").value;
          await S.db.doc("todos/" + newId()).set({
            kind: "sitedoc",
            site,
            cat,
            title: fn.replace(/\.pdf$/i, ""),
            fileName: fn,
            assetId: a.id,
            contentType: "application/pdf",
            size: blob.size,
            uploaded: Date.now(),
          });
          said.push(`${site} (${DOC_CATS.find((x) => x[0] === cat)[1]})`);
        }
        closeForm();
        toast("Saved to " + said.join(" and "));
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
        $("f-save").disabled = false;
      }
    },
  );
  const sync = () => {
    $("fi-c").disabled = !$("fi-cl").checked;
    $("fi-f").disabled = !$("fi-cl").checked;
    $("fi-s").disabled = !$("fi-st").checked;
    $("fi-sc").disabled = !$("fi-st").checked;
  };
  $("fi-cl").onchange = $("fi-st").onchange = sync;
  sync();
}
