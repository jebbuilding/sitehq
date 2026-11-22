/* ================= HOW THEY FOUND YOU: the enquiry's drop-down, with the firm's own choices added to it ================= */
import { CL_SOURCE } from "./clients.js";
import { $, esc, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
export { srcpOptions, srcpWire };
/* James (Nov 2026): "in enquiry could we add in how did they find out about the company with a drop down and with
   option for adding one if its not on the list". The standard list (CL_SOURCE) plus the firm's own
   (settings/app.clientSources), with "＋ Add another…" at the bottom: choosing it shows a box to type the new one;
   Add saves it to the list for next time and picks it. Used by New enquiry (cf-src) and Another job (mj-src). */
function srcpList(cur) {
  const own = ((S.settings || {}).clientSources || []).filter(Boolean);
  const L = CL_SOURCE.filter((x) => x !== "Other").concat(
    own.filter((x) => !CL_SOURCE.includes(x)),
  );
  if (cur && !L.includes(cur) && cur !== "Other") L.push(cur);
  return L.concat(["Other"]);
}
function srcpOptions(cur) {
  return (
    '<option value="">Choose…</option>' +
    srcpList(cur)
      .map((w) => `<option value="${esc(w)}" ${w === cur ? "selected" : ""}>${esc(w)}</option>`)
      .join("") +
    '<option value="__add">＋ Add another…</option>'
  );
}
function srcpWire(id) {
  const sel = $(id);
  if (!sel) return;
  let last = sel.value;
  sel.onchange = () => {
    if (sel.value !== "__add") {
      last = sel.value;
      return;
    }
    sel.value = last;
    if ($(id + "-addrow")) {
      $(id + "-new").focus();
      return;
    }
    const lab = sel.closest("label") || sel;
    lab.insertAdjacentHTML(
      "afterend",
      `<div class="srcp-add" id="${id}-addrow"><input id="${id}-new" maxlength="40" placeholder="e.g. Van signwriting, Local magazine" aria-label="How they found you – new choice"><button type="button" class="btn primary" id="${id}-ok">Add</button><button type="button" class="btn" id="${id}-x">Cancel</button></div>`,
    );
    const row = $(id + "-addrow"),
      inp = $(id + "-new");
    inp.focus();
    $(id + "-x").onclick = () => row.remove();
    const add = async () => {
      const v = inp.value.trim().replace(/\s+/g, " ");
      if (!v) {
        inp.focus();
        return;
      }
      const have = srcpList("").find((x) => x.toLowerCase() === v.toLowerCase());
      if (!have) {
        const clientSources = ((S.settings || {}).clientSources || []).concat([v]);
        try {
          await S.db.doc("settings/app").update({ clientSources });
          S.settings = Object.assign({}, S.settings, { clientSources });
        } catch (e) {
          toast("Couldn't save it to the list – it's used for this enquiry only");
        }
      }
      const pick = have || v;
      sel.innerHTML = srcpOptions(pick);
      sel.value = pick;
      last = pick;
      row.remove();
      toast(have ? "Already on the list – picked it" : "Added to the list");
    };
    $(id + "-ok").onclick = add;
    inp.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        add();
      }
    };
  };
}
