/* ================= HELPERS: page lookups, dates, money and hours formatting, toast, working-day times, local storage ================= */
export {
  $,
  addDays,
  calcHours,
  dayLabel,
  dayLine,
  esc,
  fsize,
  gbp,
  hrs,
  iso,
  lunchBreak,
  monday,
  nowHM,
  pad,
  parse,
  shortDay,
  stamp,
  store,
  toMin,
  toast,
};
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parse = (s) => {
  const [y, m, d] = String(s || "1970-01-01")
    .split("-")
    .map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const monday = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7));
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const hrs = (n) =>
  (Math.round((+n || 0) * 100) / 100)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
const gbp = (n) =>
  "£" + (+n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayLabel = (d) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
const shortDay = (s) =>
  parse(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const stamp = (t) =>
  new Date(t).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fsize = (b) =>
  b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
function toast(t) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = t;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
const toMin = (t) => {
  const [h, m] = String(t || "0:0")
    .split(":")
    .map(Number);
  return h * 60 + (m || 0);
};
const nowHM = () => {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
};
const fmt12 = (t) => {
  const m = toMin(t);
  let h = Math.floor(m / 60);
  const mm = pad(m % 60);
  return (h > 12 ? h - 12 : h) + ":" + mm + (h >= 12 ? "pm" : "am");
};
function lunchBreak(start, finish, D) {
  if (!start || !finish) return 0;
  const a = toMin(start),
    b = toMin(finish);
  const la = toMin((D && D.la) || "13:00"),
    lm = D && D.lm != null ? +D.lm : 30;
  return Math.max(0, Math.min(b, la + lm) - Math.max(a, la));
}
const dayLine = (D) =>
  `${fmt12(D.s)}–${fmt12(D.e)}${D.lm ? ` · ${D.lm} min unpaid lunch at ${fmt12(D.la)}` : " · no unpaid lunch"}`;
function calcHours(start, finish, brk) {
  if (!start || !finish) return 0;
  const [a, b] = start.split(":").map(Number),
    [c, d] = finish.split(":").map(Number);
  let m = c * 60 + d - (a * 60 + b);
  if (m < 0) m += 1440;
  return Math.max(0, (m - (+brk || 0)) / 60);
}
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};
