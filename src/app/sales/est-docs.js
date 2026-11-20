/* ================= EST DOCS: the job's information and documents, in the estimate or invoice window ================= */
import { esc, gbp } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openFile } from "../files/in-app-files.js";
import { siteRec } from "../photos/photos.js";
import { jfFolderName, jfFor } from "./job-file.js";
export { edcHtml, edcWire };
/* James (Nov 2026): "When I start the estimate information page I want the pdf information to come up about the job
   in that window". At the top of the estimate (or invoice): 📁 About this job – the client's enquiry (the work, what
   they want, the job name and short description) and every PDF, drawing, photo and price in the job file and on the
   client card, each opened with one tap without leaving the estimate; prices from suppliers and trades are listed
   with their total. Open by default on a new estimate. */
function edcData(d) {
  const c = (S.clients || []).find((x) => x.id === d.clientId) || null;
  const j = jfFor(Object.assign({}, d, { clientId: d.clientId || "" })) || null;
  const files = [];
  ((j && j.items) || []).forEach((i) =>
    files.push({
      assetId: i.assetId,
      name: i.name,
      type: i.type || "",
      folder: jfFolderName(i.folder),
      price: +i.price || 0,
      from: i.from || "",
    }),
  );
  if (c) {
    (c.docs || []).forEach((x) =>
      files.push({
        assetId: x.assetId,
        name: x.name || "Document",
        type: x.type || "",
        folder: "👤 Client card",
      }),
    );
    (c.recordPdfs || []).forEach((x) =>
      files.push({
        assetId: x.assetId,
        name: x.name,
        type: "application/pdf",
        folder: "👤 Client card",
      }),
    );
  }
  const sr = d.site ? siteRec(d.site) : null;
  return { c, j, sr, files: files.filter((f) => f.assetId) };
}
function edcHtml(d) {
  const { c, j, sr, files } = edcData(d);
  if (!c && !files.length && !sr) return "";
  const row = (k, v) =>
    v ? `<div class="drow"><span>${esc(k)}</span><span>${esc(v)}</span></div>` : "";
  /* every price for the job, with a quote file or not (💷 Price this job) */
  const priced = ((j && j.items) || []).filter((i) => +i.price > 0);
  return `<details class="card edc-card"${d.id ? "" : " open"}><summary><b>📁 About this job</b><span class="who">${files.length} document${files.length === 1 ? "" : "s"}${priced.length ? " · " + priced.length + " price" + (priced.length === 1 ? "" : "s") : ""}</span></summary><div class="cardbody">
    ${row("Job", (sr && sr.jobName) || (c && c.jobName) || "")}${row("Description", (sr && sr.jobDesc) || "")}${row("The work", c && c.work)}${row("What they want", c && c.desc)}${row("Client", c && [c.name, c.phone].filter(Boolean).join(" · "))}
    ${files.length ? `<div class="edc-files">${files.map((f, i) => `<button type="button" class="edc-f" data-i="${i}"><span class="edc-ic">${/pdf/.test(f.type) ? "📕" : /^image\//.test(f.type) ? "🖼" : "📄"}</span><span><b>${esc(f.name)}</b><span class="who">${esc(f.folder)}${f.from ? " · " + esc(f.from) : ""}</span></span>${f.price ? `<b>${gbp(f.price)}</b>` : ""}</button>`).join("")}</div>` : '<div class="who">No documents in the job file yet.</div>'}
    ${priced.length ? `<div class="drow"><span><b>Prices from suppliers and trades</b></span><b>${gbp(priced.reduce((a, f) => a + (+f.price || 0), 0))}</b></div>` : ""}
  </div></details>`;
}
function edcWire(d) {
  const { files } = edcData(d);
  document.querySelectorAll("#viewer-body .edc-f").forEach(
    (b) =>
      (b.onclick = () => {
        const f = files[+b.dataset.i];
        if (f) openFile(f.assetId, f.name, f.type);
      }),
  );
}
