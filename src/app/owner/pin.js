/* ===== Owner PIN (stored only as a hash) ===== */
import { bossFirst } from "../core/company-names.js";
import { toast } from "../core/helpers.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId } from "../files/outbox.js";
export { changePinFlow, hashHex, pinFails, pinLockUntil, pinOk, setPinFails, setPinLockUntil };
const OWNER_PIN_HASH = "4bab2c18b37ef6b0032a2c7e2db7cd95f2dd0465237f1ee230423b5ef1fdc613";
function sha256hex(str) {
  const b = new TextEncoder().encode(str);
  const K = [],
    H = [];
  let n = 2,
    c = 0;
  const isP = (x) => {
    for (let i = 2; i * i <= x; i++) if (x % i === 0) return false;
    return true;
  };
  while (c < 64) {
    if (isP(n)) {
      if (c < 8) H[c] = (Math.pow(n, 1 / 2) * 4294967296) | 0;
      K[c] = (Math.pow(n, 1 / 3) * 4294967296) | 0;
      c++;
    }
    n++;
  }
  const l = b.length,
    words = [];
  for (let i = 0; i < l; i++) words[i >> 2] |= b[i] << (24 - (i % 4) * 8);
  words[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
  const tot = (((l + 8) >> 6) + 1) * 16;
  for (let i = words.length; i < tot; i++) words[i] = words[i] | 0;
  words[tot - 1] = l * 8;
  const h = H.slice();
  for (let j = 0; j < tot; j += 16) {
    const w = words.slice(j, j + 16);
    let [a, bb, cc, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      if (i > 15) {
        const w15 = w[i - 15],
          w2 = w[i - 2];
        w[i] =
          ((((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)) +
            w[i - 16] +
            (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10)) +
            w[i - 7]) |
          0;
      }
      const t1 =
          (hh +
            (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) +
            ((e & f) ^ (~e & g)) +
            K[i] +
            w[i]) |
          0,
        t2 =
          ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) +
            ((a & bb) ^ (a & cc) ^ (bb & cc))) |
          0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = cc;
      cc = bb;
      bb = a;
      a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + bb) | 0;
    h[2] = (h[2] + cc) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}
async function hashHex(m) {
  try {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(m));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {}
  return sha256hex(m);
}
/* the owner's own PIN lives in his private area (nobody else can read it); until he sets one the original PIN works */
const pinPath = () => "data/users/" + S.me + "/pin";
async function pinRec() {
  if (S.pinRec !== undefined) return S.pinRec;
  try {
    const d = await S.db.doc(pinPath()).get();
    S.pinRec = d.exists && d.data() && d.data().hash ? d.data() : null;
  } catch (e) {
    return null;
  }
  return S.pinRec;
}
async function pinOk(v) {
  v = String(v).trim();
  const r = await pinRec();
  if (r && r.hash) return (await hashHex("sitehq-pin:" + r.salt + ":" + v)) === r.hash;
  return (await hashHex("sitehq-pin:" + v)) === OWNER_PIN_HASH;
}
function changePinFlow() {
  if (!ownerMode()) {
    toast(`Only ${bossFirst()} can change the PIN`);
    return;
  }
  const d = document.createElement("div");
  d.className = "dimask";
  d.style.zIndex = "80";
  const pinInp = (cls, lab) =>
    `<label style="margin-top:6px">${lab}<input type="password" inputmode="numeric" autocomplete="off" maxlength="8" class="${cls}" style="font-size:20px;letter-spacing:6px;text-align:center"></label>`;
  d.innerHTML = `<form class="dimbox"><b>🔒 Set or change your PIN</b><div class="who" style="margin:4px 0 4px">Your PIN locks signed GDPR forms and deleting clients or sites. Use 4 to 8 numbers.</div>
    ${pinInp("pc-old", "Current PIN")}${pinInp("pc-new", "New PIN")}${pinInp("pc-new2", "New PIN again")}<div class="err pinerr" hidden></div>
    <div class="dimbtns"><button type="button" class="btn pinx">Cancel</button><button type="submit" class="btn primary">Save PIN</button></div></form>`;
  document.body.appendChild(d);
  const q = (c) => d.querySelector(c);
  setTimeout(() => q(".pc-old").focus(), 30);
  q(".pinx").onclick = () => d.remove();
  d.addEventListener("click", (e) => {
    if (e.target === d) d.remove();
  });
  d.addEventListener("keydown", (e) => {
    if (e.key === "Escape") d.remove();
  });
  q("form").onsubmit = async (e) => {
    e.preventDefault();
    const er = q(".pinerr");
    const bad = (t) => {
      er.hidden = false;
      er.textContent = t;
    };
    if (Date.now() < pinLockUntil) return bad("Too many tries. Wait a minute.");
    const o = q(".pc-old").value.trim(),
      n = q(".pc-new").value.trim(),
      n2 = q(".pc-new2").value.trim();
    if (!(await pinOk(o))) {
      pinFails++;
      if (pinFails >= 5) {
        pinLockUntil = Date.now() + 60000;
        pinFails = 0;
      }
      q(".pc-old").value = "";
      q(".pc-old").focus();
      return bad("Your current PIN is wrong");
    }
    pinFails = 0;
    if (!/^\d{4,8}$/.test(n)) return bad("The new PIN must be 4 to 8 numbers");
    if (/^(\d)\1+$/.test(n) || "0123456789".includes(n) || "9876543210".includes(n))
      return bad("Pick a PIN that's harder to guess");
    if (n !== n2) {
      q(".pc-new2").value = "";
      q(".pc-new2").focus();
      return bad("The two new PINs don't match");
    }
    const salt = newId();
    const rec = { salt, hash: await hashHex("sitehq-pin:" + salt + ":" + n), at: Date.now() };
    try {
      await S.db.doc(pinPath()).set(rec);
      S.pinRec = rec;
      d.remove();
      toast("PIN changed. Use your new PIN from now on.");
      render();
    } catch (x) {
      bad("Couldn't save the PIN. Check your connection.");
    }
  };
}
let pinFails = 0,
  pinLockUntil = 0;
function setPinFails(v) {
  pinFails = v;
}
function setPinLockUntil(v) {
  pinLockUntil = v;
}
