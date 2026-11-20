/* ================= LETTERHEAD BUILDER: make a letterhead and starter terms for a firm that hasn't got its own ================= */
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { render } from "../core/tabs-week.js";
import { uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { coData } from "../owner/company-details.js";
import { BRGB, loadImage } from "../photos/photos.js";
import { lhLogoId } from "./letterhead-setup.js";
import { sdSet } from "./sales-calc.js";
import { sdSaveSet } from "./sales-settings.js";
export { lhbOpen, lhbTermsOpen };
/* James (Nov 2026): "in setup maybe allow a letterhead builder and terms builder for companies that wont have there own
   yet". Setup › My letterhead › ✨ Make a letterhead: the logo, name, a line under it, the contact details and the
   foot (address, company number, VAT number), in the firm's colour, laid out three ways (logo on the left, centred, or
   a coloured band), seen as it's made. Saving draws it as the letterhead's top and foot pictures (lhTop / lhBot), so
   every PDF uses it exactly like a brought-in one. ✨ Make my terms: a few answers (deposit, how stage payments work,
   days to pay, how long a quote stands, guarantee, insurance) fill in plain-English starting terms for estimates and
   invoices, put in Letterhead, terms & bank to change as they like. A starting point only – the page says to have them
   checked. */
const LHB = { style: "left", logo: null };
const LHB_PX = 8; /* pixels per mm */
function lhbVals() {
  const v = (id) => ($(id) ? $(id).value.trim() : "");
  return {
    name: v("lhb-name"),
    tag: v("lhb-tag"),
    addr: v("lhb-addr"),
    phone: v("lhb-phone"),
    email: v("lhb-email"),
    web: v("lhb-web"),
    coNo: v("lhb-cono"),
    vat: v("lhb-vat"),
    col: v("lhb-col") || "#7F191D",
  };
}
/* the top (38 mm) and the foot (16 mm), drawn on canvases the width of A4 */
function lhbDraw(v) {
  const W = 210 * LHB_PX;
  const top = document.createElement("canvas"),
    bot = document.createElement("canvas");
  top.width = bot.width = W;
  top.height = 38 * LHB_PX;
  bot.height = 16 * LHB_PX;
  const g = top.getContext("2d"),
    f = bot.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, W, top.height);
  f.fillStyle = "#fff";
  f.fillRect(0, 0, W, bot.height);
  const M = 18 * LHB_PX;
  const font = (px, bold) => `${bold ? "700 " : ""}${px}px Helvetica, Arial, sans-serif`;
  const contact = [v.phone, v.email, v.web].filter(Boolean);
  const addrLine = v.addr.replace(/\s*\n\s*/g, ", ");
  const logo = LHB.logo;
  const drawLogo = (x, y, maxW, maxH, alignRight) => {
    if (!logo) return 0;
    const k = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * k,
      h = logo.height * k;
    g.drawImage(logo, alignRight ? x - w : x, y + (maxH - h) / 2, w, h);
    return w;
  };
  if (LHB.style === "band") {
    g.fillStyle = v.col;
    g.fillRect(0, 0, W, 26 * LHB_PX);
    let x = M;
    if (logo) {
      g.fillStyle = "#fff";
      g.fillRect(M - 8, 4 * LHB_PX - 8, 34 * LHB_PX + 16, 18 * LHB_PX + 16);
      x += drawLogo(M, 4 * LHB_PX, 34 * LHB_PX, 18 * LHB_PX) + 6 * LHB_PX;
    }
    g.fillStyle = "#fff";
    g.font = font(9 * LHB_PX, true);
    g.textBaseline = "alphabetic";
    g.fillText(v.name, x, 14 * LHB_PX);
    g.font = font(3.6 * LHB_PX);
    if (v.tag) g.fillText(v.tag, x, 20 * LHB_PX);
    g.fillStyle = "#333";
    g.font = font(3.2 * LHB_PX);
    g.textAlign = "center";
    g.fillText([addrLine].concat(contact).filter(Boolean).join("  ·  "), W / 2, 32 * LHB_PX);
    g.textAlign = "left";
  } else if (LHB.style === "centre") {
    let y = 4 * LHB_PX;
    if (logo) {
      drawLogo(W / 2 - 25 * LHB_PX, y, 50 * LHB_PX, 14 * LHB_PX);
      y += 16 * LHB_PX;
    } else y += 6 * LHB_PX;
    g.textAlign = "center";
    g.fillStyle = v.col;
    g.font = font((logo ? 6 : 9) * LHB_PX, true);
    g.fillText(v.name, W / 2, y + (logo ? 4 : 6) * LHB_PX);
    g.fillStyle = "#333";
    g.font = font(3.2 * LHB_PX);
    g.fillText(
      [v.tag].concat(contact).filter(Boolean).join("  ·  "),
      W / 2,
      y + (logo ? 10 : 13) * LHB_PX,
    );
    g.textAlign = "left";
    g.strokeStyle = v.col;
    g.lineWidth = 0.7 * LHB_PX;
    g.beginPath();
    g.moveTo(M, 36 * LHB_PX);
    g.lineTo(W - M, 36 * LHB_PX);
    g.stroke();
  } else {
    let x = M;
    if (logo) x += drawLogo(M, 6 * LHB_PX, 46 * LHB_PX, 22 * LHB_PX) + 6 * LHB_PX;
    g.fillStyle = v.col;
    g.font = font(8 * LHB_PX, true);
    g.fillText(v.name, x, 16 * LHB_PX);
    g.fillStyle = "#555";
    g.font = font(3.6 * LHB_PX);
    if (v.tag) g.fillText(v.tag, x, 22 * LHB_PX);
    g.textAlign = "right";
    g.fillStyle = "#333";
    g.font = font(3.2 * LHB_PX);
    contact.forEach((t, i) => g.fillText(t, W - M, (10 + i * 5) * LHB_PX));
    g.textAlign = "left";
    g.strokeStyle = v.col;
    g.lineWidth = 0.7 * LHB_PX;
    g.beginPath();
    g.moveTo(M, 33 * LHB_PX);
    g.lineTo(W - M, 33 * LHB_PX);
    g.stroke();
  }
  /* the foot: a line, the address, the company and VAT numbers */
  f.strokeStyle = v.col;
  f.lineWidth = 0.6 * LHB_PX;
  f.beginPath();
  f.moveTo(M, 3 * LHB_PX);
  f.lineTo(W - M, 3 * LHB_PX);
  f.stroke();
  f.fillStyle = "#555";
  f.textAlign = "center";
  f.font = font(3 * LHB_PX);
  f.fillText([v.name, addrLine].filter(Boolean).join(" · "), W / 2, 8 * LHB_PX);
  const nos = [v.coNo ? "Company no. " + v.coNo : "", v.vat ? "VAT no. " + v.vat : ""].filter(
    Boolean,
  );
  if (nos.length) f.fillText(nos.join("  ·  "), W / 2, 12.5 * LHB_PX);
  return { top, bot };
}
function lhbOpen() {
  const co = coData(),
    s = sdSet();
  const brand =
    "#" +
    BRGB()
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  LHB.logo = null;
  const lid = lhLogoId();
  openSheet(
    `<h3 id="sheettitle">✨ Make a letterhead</h3><div class="who">For a firm that hasn't got one. It's used on every estimate, invoice and letter, the same as a brought-in letterhead.</div>
    <div class="seg" id="lhb-style" role="group" aria-label="Layout">${[
      ["left", "Logo on the left"],
      ["centre", "Centred"],
      ["band", "Coloured band"],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${LHB.style === k}">${l}</button>`,
      )
      .join("")}</div>
    <div class="lhb-prev"><canvas id="lhb-top" aria-label="The top of the letterhead"></canvas><div class="lhb-gap">…</div><canvas id="lhb-bot" aria-label="The foot of the letterhead"></canvas></div>
    <label class="btn lhb-logob">🖼 ${lid ? "Change the logo" : "Add your logo"}<input type="file" id="lhb-logo" class="fpick" accept="image/png,image/jpeg" data-cam="1"></label>
    <div class="grid2"><label for="lhb-name">Company name<input id="lhb-name" maxlength="80" value="${esc(co.name || "")}"></label><label for="lhb-col">Colour<input id="lhb-col" class="lhb-colin" type="color" value="${esc(brand)}"></label></div>
    <label for="lhb-tag">A line under the name (optional)<input id="lhb-tag" maxlength="100" value="${esc(s.tagline || "")}" placeholder="e.g. Extensions · Lofts · Renovations"></label>
    <label for="lhb-addr">Address<textarea id="lhb-addr" rows="3" maxlength="300">${esc(co.address || "")}</textarea></label>
    <div class="grid2"><label for="lhb-phone">Phone<input id="lhb-phone" maxlength="40" value="${esc(co.phone || co.mobile || "")}"></label><label for="lhb-email">Email<input id="lhb-email" maxlength="80" value="${esc(co.email || "")}"></label></div>
    <div class="grid2"><label for="lhb-web">Website<input id="lhb-web" maxlength="80" value="${esc(co.website || "")}"></label><label for="lhb-cono">Company number<input id="lhb-cono" maxlength="20" value="${esc(co.companyNo || "")}"></label></div>
    <label for="lhb-vat">VAT number<input id="lhb-vat" maxlength="20" value="${esc(s.vatNo || co.vatNo || "")}"></label>
    ${formFoot(false, "Use this letterhead")}`,
    async () => {
      const v = lhbVals();
      if (!v.name) return showErr("Put in the company name.");
      $("f-save").disabled = true;
      try {
        const { top, bot } = lhbDraw(v);
        const blob = (cv) => new Promise((r) => cv.toBlob(r, "image/png"));
        const a = await uploadFile(await blob(top), "letterhead-top.png");
        const b = await uploadFile(await blob(bot), "letterhead-foot.png");
        await sdSaveSet({
          lhTop: { id: a.id, h: 38 },
          lhBot: { id: b.id, y: 297 - 16 + 5, h: 16 },
          lhMade: true,
          tagline: v.tag,
        });
        closeForm();
        toast("Letterhead made – every PDF uses it now");
        render();
      } catch (e) {
        showErr("Couldn't save it. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
  const draw = () => {
    const { top, bot } = lhbDraw(lhbVals());
    [
      ["lhb-top", top],
      ["lhb-bot", bot],
    ].forEach(([id, src]) => {
      const cv = $(id);
      cv.width = src.width;
      cv.height = src.height;
      cv.getContext("2d").drawImage(src, 0, 0);
    });
  };
  $("sheet")
    .querySelectorAll("#lhb-style button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          LHB.style = b.dataset.v;
          $("lhb-style")
            .querySelectorAll("button")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          draw();
        }),
    );
  [
    "lhb-name",
    "lhb-tag",
    "lhb-addr",
    "lhb-phone",
    "lhb-email",
    "lhb-web",
    "lhb-cono",
    "lhb-vat",
    "lhb-col",
  ].forEach((id) => ($(id).oninput = draw));
  $("lhb-logo").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      LHB.logo = await loadImage(f);
      draw();
    } catch (er) {
      toast("That picture couldn't be opened");
    }
  };
  draw();
  if (lid)
    getFileBlob(lid)
      .then((b) => loadImage(b))
      .then((im) => {
        if (!LHB.logo) {
          LHB.logo = im;
          draw();
        }
      })
      .catch(() => {});
}
/* starter terms from a few answers */
function lhbTermsOpen() {
  const co = coData();
  openSheet(
    `<h3 id="sheettitle">✨ Make my terms</h3><div class="who">Answer a few questions and plain-English terms are written for your estimates and invoices. You can change every word afterwards in Letterhead, terms &amp; bank. <b>They're a starting point: have them checked by a solicitor or your trade body before you rely on them.</b></div>
    <div class="grid2"><label for="lht-dep">Deposit when they accept (%)<input id="lht-dep" inputmode="decimal" value="10"></label><label for="lht-days">Days to pay an invoice<input id="lht-days" inputmode="numeric" value="7"></label></div>
    <label for="lht-stage">How you're paid during the job<select id="lht-stage"><option value="stages">In stages as the work is done</option><option value="weekly">Every week for the work done that week</option><option value="end">All at the end</option></select></label>
    <div class="grid2"><label for="lht-valid">An estimate stands for (days)<input id="lht-valid" inputmode="numeric" value="30"></label><label for="lht-guar">Guarantee on your work (months)<input id="lht-guar" inputmode="numeric" value="12"></label></div>
    <label for="lht-ins">Public liability insurance (e.g. £5,000,000)<input id="lht-ins" maxlength="30" value="${esc(co.plCover || "")}"></label>
    <label class="tick"><input type="checkbox" id="lht-cons" checked> <span>You work for homeowners (adds their 14-day right to cancel)</span></label>
    ${formFoot(false, "Write my terms")}`,
    async () => {
      const n = (id, d) => Math.max(0, +$(id).value || d);
      const dep = n("lht-dep", 0),
        days = n("lht-days", 7),
        valid = n("lht-valid", 30),
        guar = n("lht-guar", 12);
      const ins = $("lht-ins").value.trim();
      const stage = $("lht-stage").value;
      const nm = co.name || "We";
      const t = [
        "# The estimate",
        `This estimate stands for ${valid} days from its date. It covers only the work it describes; anything else is extra and is agreed with you before it is done.`,
        "# Accepting",
        `You accept by signing the estimate or telling us in writing.${dep ? ` A deposit of ${dep}% is paid when you accept, before work is booked.` : ""}`,
        "# Paying",
        stage === "stages"
          ? "You are invoiced in stages as the work is done, as set out on the estimate."
          : stage === "weekly"
            ? "You are invoiced each week for the work done that week."
            : "You are invoiced when the work is finished.",
        `Invoices are paid within ${days} days. Late payments may be charged interest at 8% a year over the Bank of England base rate.`,
        "# Changes and extras",
        "If you ask for changes, or something is found that couldn't be seen before the work started, we agree the cost and time with you in writing before carrying on.",
        "# Delays",
        "We aren't responsible for delays caused by weather, materials being late, or anything else outside our control, and will keep you told.",
        "# Your part",
        "Please give us access, power and water, clear the work area of belongings, and tell us about anything hidden we should know of (pipes, cables, drains).",
        "# Materials",
        "Materials stay ours until they are paid for. Surplus materials are taken away unless agreed otherwise.",
        "# Guarantee",
        `We guarantee our workmanship for ${guar} months from completion. This doesn't cover wear and tear, misuse, or other people's work.`,
        ins ? "# Insurance" : "",
        ins ? `We hold public liability insurance of ${ins}.` : "",
        $("lht-cons").checked ? "# Your right to cancel" : "",
        $("lht-cons").checked
          ? "If this contract is made away from our premises, you can cancel within 14 days of accepting without giving a reason. If you ask us to start within those 14 days and then cancel, you pay for work already done."
          : "",
        "# Complaints",
        `If you're unhappy with anything, tell ${nm} as soon as you can and we will put it right.`,
      ]
        .filter(Boolean)
        .join("\n");
      const inv = `Payment is due within ${days} days of the invoice date. Late payments may be charged interest at 8% a year over the Bank of England base rate.`;
      try {
        await sdSaveSet({
          terms: t,
          termsTitle: "Terms and Conditions",
          invTerms: inv,
          termsMade: true,
        });
        closeForm();
        toast("Terms written – change them any time in Letterhead, terms & bank");
        render();
      } catch (e) {
        showErr("Couldn't save. Check your connection.");
      }
    },
    null,
  );
}
