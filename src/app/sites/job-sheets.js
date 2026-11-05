/* ================= JOB SHEETS & SNAG LISTS ================= */
import { $, esc, iso, shortDay } from "../core/helpers.js";
import { S } from "../core/state.js";
export { JOB_DET, JOB_KINDS, doneKey, jobCard, jobDetRead, jobProgress, myJobs, taskDone };
const JOB_KINDS = { job: "Job sheet", snag: "Snag list" };
const JOB_DET = [
  ["ref", "Job / reference no.", "e.g. JEB-0142"],
  ["client", "Client", "e.g. Mrs Jane Smith"],
  ["phone", "Client phone", ""],
  ["address", "Address of the works", "only needed if there's no site"],
  ["contact", "Contact on site", "name and phone"],
  ["start", "Start date", "", "date"],
  ["hours", "Working hours", "e.g. 8am–4.30pm"],
  ["access", "Access, parking & keys", "e.g. key safe 1234, park on drive"],
  ["price", "Price / agreed cost (optional)", "e.g. £2,450 + VAT"],
];
const jobDetRead = () => {
  const d = {};
  JOB_DET.forEach(([k]) => {
    const el = $("jd-" + k);
    if (el && el.value.trim()) d[k] = el.value.trim();
  });
  ["scope", "mats", "hs"].forEach((k) => {
    const el = $("jd-" + k);
    if (el && el.value.trim()) d[k] = el.value.trim();
  });
  return d;
};
const doneKey = (jobId, taskId) => jobId + "__" + taskId;
function taskDone(job, t) {
  return S.jobdone[doneKey(job.id, t.id)];
}
function jobProgress(job) {
  const n = (job.tasks || []).length;
  const d = (job.tasks || []).filter((t) => {
    const x = taskDone(job, t);
    return x && x.done;
  }).length;
  return { n, d };
}
function myJobs() {
  return S.jobs.filter((j) => (j.assignees || []).includes(S.me));
}
function jobCard(j, owner) {
  const { n, d } = jobProgress(j);
  const pct = n ? Math.round((d / n) * 100) : 0;
  const late = j.status !== "closed" && j.due && j.due < iso(new Date()) && d < n;
  return `<button type="button" class="entry jobc" data-j="${esc(j.id)}"><div class="main">
    <div class="job"><span class="tag ${j.kind === "snag" ? "day" : ""}">${JOB_KINDS[j.kind] || "Job sheet"}</span>${j.status === "closed" ? '<span class="tag ok">Signed off</span>' : d === n && n ? '<span class="tag ok">All ticked</span>' : ""}${late ? '<span class="tag bad">Overdue</span>' : ""}${esc(j.title)}</div>
    <div class="sub">${esc(j.site || "No site")}${j.due ? ` · due ${shortDay(j.due)}` : ""} · ${esc((j.assigneeNames || []).join(", ") || "Nobody assigned")}${(j.files || []).length ? ` · ${j.files.length} document${j.files.length === 1 ? "" : "s"}` : ""}</div>
    <div class="prog" aria-label="${d} of ${n} done"><span style="width:${pct}%"></span></div></div>
    <div class="amt">${d}/${n}</div></button>`;
}
