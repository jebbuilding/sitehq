/* ================= UNDO LIST: see every step in the drawing tool and go back (or forward) to any of them ================= */
import { esc } from "../core/helpers.js";
import { npSymLabel } from "./construction-details.js";
export { npStepsDlg };
/* The drawing tool keeps whole snapshots of the page (its undo and redo lists), not names. Each step's name is worked
   out here by comparing one snapshot with the next: what was added, removed, moved or changed. */

const NP_STEP_GEO = new Set([
  "a",
  "b",
  "p",
  "x",
  "y",
  "r",
  "cx",
  "cy",
  "rx",
  "ry",
  "w2",
  "h2",
  "fl",
]);

const npStepWord = (o) => {
  if (!o || typeof o !== "object") return "item";
  switch (o.t) {
    case "shape":
      return o.k ? String(npSymLabel(o.k)).toLowerCase() : "shape";
    case "line":
      return "line";
    case "rect":
      return "box";
    case "circle":
      return "circle";
    case "text": {
      const s = String(o.s || "").trim();
      return s ? `text “${s.length > 24 ? s.slice(0, 23) + "…" : s}”` : "text";
    }
    case "dim":
      return o.tape ? "tape measure" : "measurement";
    case "ang":
      return "angle";
    case "stroke":
      return "pen line";
    case "arrow":
      return "arrow";
    case "img":
      return "picture";
    case "room":
      return "room";
    case "rsk":
      return "room sketch";
    default:
      return "item";
  }
};

/* "a solid wall", "2 × measurement, a box", "a door, a window and 3 more" */
const npStepWhat = (list) => {
  const n = new Map();
  list.forEach((o) => {
    const w = npStepWord(o);
    n.set(w, (n.get(w) || 0) + 1);
  });
  const parts = [...n].map(([w, k]) =>
    k > 1 ? `${k} × ${w}` : (/^[aeiou]/i.test(w) ? "an " : "a ") + w,
  );
  if (parts.length > 3) return parts.slice(0, 3).join(", ") + ` and ${parts.length - 3} more`;
  if (parts.length > 1) return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  return parts[0] || "nothing";
};

/* Is the only difference between two items where they are (moved, turned, stretched)? */
const npStepOnlyMoved = (a, b) => {
  if (!a || !b || a.t !== b.t || a.k !== b.k) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (NP_STEP_GEO.has(k)) continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
};

/* The name of the step that turned the page `before` into `after` (both arrays of drawn items). */
const npStepName = (before, after) => {
  before = Array.isArray(before) ? before : [];
  after = Array.isArray(after) ? after : [];
  if (before.length && !after.length) return "Cleared the page";
  const left = new Map();
  before.forEach((o, i) => {
    const k = JSON.stringify(o);
    if (!left.has(k)) left.set(k, []);
    left.get(k).push(i);
  });
  const added = [];
  after.forEach((o) => {
    const k = JSON.stringify(o);
    const l = left.get(k);
    if (l && l.length) l.shift();
    else added.push(o);
  });
  const removed = [];
  left.forEach((l) => l.forEach((i) => removed.push(before[i])));
  if (!added.length && !removed.length) {
    return before.length === after.length && JSON.stringify(before) !== JSON.stringify(after)
      ? "Changed the order (front and back)"
      : "No change";
  }
  if (!removed.length) return "Added " + npStepWhat(added);
  if (!added.length) return "Removed " + npStepWhat(removed);
  if (added.length === removed.length) {
    const ra = removed.slice().sort((x, y) => before.indexOf(x) - before.indexOf(y));
    const moved = ra.every((o, i) => npStepOnlyMoved(o, added[i]));
    return (moved ? "Moved " : "Changed ") + npStepWhat(added);
  }
  return "Added " + npStepWhat(added) + "; removed " + npStepWhat(removed);
};

/* The list itself. `states` are the page's snapshots (JSON) from the oldest kept to the newest, `cur` is the one on
   screen now; picking one calls onPick(index). */
const npStepsDlg = (host, states, cur, onPick) => {
  const parsed = states.map((s) => {
    try {
      return JSON.parse(s);
    } catch (e) {
      return [];
    }
  });
  const rows = [];
  for (let i = states.length - 1; i >= 0; i--) {
    const name = i === 0 ? "As far back as it goes" : npStepName(parsed[i - 1], parsed[i]);
    const here = i === cur;
    rows.push(
      `<button type="button" class="np-step${i > cur ? " np-step-undone" : ""}" data-k="${i}"${here ? ' aria-current="step"' : ""}><span class="np-step-n">${i}</span><span class="np-step-t">${esc(name)}</span>${here ? '<span class="np-step-here">You are here</span>' : i > cur ? '<span class="np-step-here">Undone</span>' : ""}</button>`,
    );
  }
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = `<div class="dimbox np-stepsbox"><b>🕘 Steps on this page</b><div class="who">${
    states.length > 1
      ? "Newest at the top. Tap any step to go back to it – you can come forward again the same way, until you draw something new."
      : "Nothing to go back to yet: each thing you draw, move or change shows here."
  }</div><div class="np-steplist">${rows.join("")}</div><div class="dimbtns"><button type="button" class="btn sax">Close</button></div></div>`;
  host.appendChild(d);
  d.querySelector(".sax").onclick = () => d.remove();
  d.onclick = (e) => {
    if (e.target === d) d.remove();
  };
  d.querySelectorAll(".np-step").forEach(
    (b) =>
      (b.onclick = () => {
        const k = +b.dataset.k;
        d.remove();
        if (k !== cur) onPick(k);
      }),
  );
  const h = d.querySelector('.np-step[aria-current="step"]');
  if (h && h.scrollIntoView) h.scrollIntoView({ block: "nearest" });
  return d;
};
