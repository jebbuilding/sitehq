/* ================= COMPANY DETAILS card (Policies & insurance, seen by everyone) ================= */
import { $, esc, shortDay, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { binView } from "./deleted-items.js";
import { auditView } from "./deletion-record.js";
import { changePinFlow } from "./pin.js";
import {
  BRAND_COLS,
  BRAND_DEF,
  LOGO_ID,
  applyColour,
  brandHex,
  loadImage,
  logoId,
} from "../photos/photos.js";
import { brochSetup } from "../purchasing/brochures.js";
import { SAMPLES } from "../purchasing/samples.js";
import { daysTo } from "../safety/expiry-dates.js";
import { shrinkImage } from "../safety/training.js";
import { WTN } from "../safety/waste-transfer-note.js";
import { QRSITE } from "../sites/qr-sign-in.js";
export { coData, companyCard, wireCompany };
const CO_FIELDS = [
  ["name", "Company name", "JEB Building Services"],
  ["owner", "Owner / contact", "James Bray"],
  ["address", "Business address", "e.g. 1 High St, Exmouth EX8 1AA"],
  ["mobile", "Mobile", ""],
  ["phone", "Office phone", ""],
  ["email", "Email", ""],
  ["website", "Website", ""],
  ["reviewUrl", "Google review link", "e.g. https://g.page/r/…/review"],
  ["companyNo", "Company number", ""],
  ["vatNo", "VAT number", ""],
  ["plInsurer", "Public liability insurer", ""],
  ["plPolicy", "Public liability policy no.", ""],
  ["plCover", "Public liability cover", "e.g. £5,000,000"],
  ["plExpiry", "Public liability renewal date", ""],
  ["elInsurer", "Employer's liability insurer", ""],
  ["elPolicy", "Employer's liability policy no.", ""],
  ["elExpiry", "Employer's liability renewal date", ""],
  ["other", "Other details", "e.g. CHAS / Constructionline numbers, bank details for invoices"],
];
function coData() {
  const c = Object.assign({}, (S.settings || {}).company || {});
  if (!c.name) c.name = "JEB Building Services";
  if (!c.owner) c.owner = (S.settings || {}).ownerName || S.ownerName || "James Bray";
  if (!c.mobile) c.mobile = (S.settings || {}).ownerPhone || "";
  return c;
}
function companyCard(viewer) {
  const c = coData();
  const owner = ownerMode() && !viewer;
  const tel = (x) => String(x || "").replace(/\s+/g, "");
  const exp = (d) => {
    if (!d) return "";
    const n = daysTo(d);
    return n < 0
      ? ` <span class="tag bad">Expired</span>`
      : n <= 30
        ? ` <span class="tag bad">Renews in ${n} day${n === 1 ? "" : "s"}</span>`
        : "";
  };
  const row = (l, v) =>
    v ? `<div class="drow"><span>${esc(l)}</span><span>${v}</span></div>` : "";
  const rows = [
    row("Owner / contact", esc(c.owner)),
    row("Mobile", c.mobile ? `<a href="tel:${esc(tel(c.mobile))}">📞 ${esc(c.mobile)}</a>` : ""),
    row("Office phone", c.phone ? `<a href="tel:${esc(tel(c.phone))}">📞 ${esc(c.phone)}</a>` : ""),
    row("Email", c.email ? `<a href="mailto:${esc(c.email)}">✉ ${esc(c.email)}</a>` : ""),
    row(
      "Address",
      c.address
        ? `<button type="button" class="maplink" data-addr="${esc(c.address)}">📍 ${esc(c.address)}</button>`
        : "",
    ),
    row(
      "Website",
      c.website
        ? `<a href="${esc(/^https?:/.test(c.website) ? c.website : "https://" + c.website)}" target="_blank" rel="noopener">${esc(c.website)} ↗</a>`
        : "",
    ),
    row("Company number", esc(c.companyNo || "")),
    row("VAT number", esc(c.vatNo || "")),
  ].join("");
  const ins = [
    row("Public liability", [c.plInsurer, c.plCover].filter(Boolean).map(esc).join(" · ")),
    row("Policy no.", esc(c.plPolicy || "")),
    row("Renewal", c.plExpiry ? esc(shortDay(c.plExpiry)) + exp(c.plExpiry) : ""),
    row("Employer's liability", esc(c.elInsurer || "")),
    row("Policy no.", esc(c.elPolicy || "")),
    row("Renewal", c.elExpiry ? esc(shortDay(c.elExpiry)) + exp(c.elExpiry) : ""),
  ].join("");
  return `<div class="cocard"><div class="cohead"><img src="${blobUrl(logoId())}" alt="" class="cologo"><div><b class="coname">${esc(c.name)}</b><div class="who">Company details${owner ? " · everyone on the app can see this" : ""}</div></div></div>
    <div class="details">${rows}</div>${ins ? `<div class="flabel" style="margin-top:10px">Insurance</div><div class="details">${ins}</div>` : ""}
    ${
      (c.extra || []).filter((x) => x && (x.label || x.value)).length
        ? `<div class="flabel" style="margin-top:10px">More information</div><div class="details">${(
            c.extra || []
          )
            .filter((x) => x && (x.label || x.value))
            .map((x) =>
              row(
                x.label || "",
                /^\+?[\d\s()-]{9,}$/.test(x.value || "")
                  ? `<a href="tel:${esc(tel(x.value))}">📞 ${esc(x.value)}</a>`
                  : /^\S+@\S+\.\S+$/.test(x.value || "")
                    ? `<a href="mailto:${esc(x.value)}">✉ ${esc(x.value)}</a>`
                    : /^(https?:\/\/|www\.)/i.test(x.value || "")
                      ? `<a href="${esc(/^https?:/i.test(x.value) ? x.value : "https://" + x.value)}" target="_blank" rel="noopener">${esc(x.value)} ↗</a>`
                      : esc(x.value || ""),
              ),
            )
            .join("")}</div>`
        : ""
    }
    ${c.other ? `<div class="flabel" style="margin-top:10px">Other details</div><div class="talkbody pnotes">${esc(c.other)}</div>` : ""}
    ${owner ? `<div class="actions" style="margin-top:8px"><button type="button" class="btn primary" id="co-edit">✎ Edit company details</button><button type="button" class="btn" id="co-pin">🔒 Set or change PIN</button><button type="button" class="btn" id="co-audit">🧾 Deletion record</button><button type="button" class="btn" id="co-bin">🗑 Deleted items${(S.bin || []).length ? " (" + S.bin.length + ")" : ""}</button><button type="button" class="btn" id="co-qr">📱 QR site sign-in</button><button type="button" class="btn" id="co-broch">📖 Brochures${(S.brochures || []).length ? " (" + S.brochures.length + ")" : ""}</button><button type="button" class="btn" id="co-samples">🎨 Samples${(S.samples || []).length ? " (" + S.samples.length + ")" : ""}</button><button type="button" class="btn" id="co-wsites">♻️ Waste transfer sites${((S.settings || {}).wasteSites || []).length ? " (" + S.settings.wasteSites.length + ")" : ""}</button></div>` : ""}</div>`;
}
function wireCompany() {
  if ($("co-pin")) $("co-pin").onclick = changePinFlow;
  if ($("co-wsites")) $("co-wsites").onclick = WTN.sitesView;
  if ($("co-samples")) $("co-samples").onclick = SAMPLES.setupView;
  if ($("co-broch")) $("co-broch").onclick = brochSetup;
  if ($("co-qr")) $("co-qr").onclick = QRSITE.setupView;
  if ($("co-audit")) $("co-audit").onclick = auditView;
  if ($("co-bin")) $("co-bin").onclick = binView;
  if ($("co-edit"))
    $("co-edit").onclick = () => {
      const c = coData();
      let newLogo;
      openSheet(
        `<h3 id="sheettitle">Company details</h3><div class="who">Shown at the top of Policies &amp; insurance for everyone on the app. Leave anything blank to hide it.</div>
    <div class="flabel" style="margin-top:4px">Company logo</div>
    <div class="cologorow"><div class="cologobox"><img id="co-logoprev" src="${blobUrl(logoId())}" alt="Your logo"></div>
      <div class="cologobtns"><label class="btn primary" for="co-logofile" id="co-logolbl">⬆ Upload logo</label><input type="file" id="co-logofile" data-cam="1" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden">
      <button type="button" class="btn" id="co-logodef" ${c.logoId ? "" : "hidden"}>Use the original logo</button></div></div>
    <div class="who" id="co-logomsg">Used in the app header, on every PDF, on photo stamps and in the client portal. A PNG with a see-through background looks best.</div>
    <div class="flabel" style="margin-top:8px">App colour</div><div class="who">Used for the buttons, headings and bars in the app, on PDFs and in the client portal.</div>
    <div class="cosw" id="co-sw">${BRAND_COLS.map(([h, l]) => `<button type="button" class="cosb" data-c="${h}" aria-pressed="${brandHex().toUpperCase() === h}" title="${esc(l)}"><i style="background:${h}"></i><span>${esc(l)}</span></button>`).join("")}<label class="cosb cosc" title="Pick any colour"><input type="color" id="co-col" value="${brandHex()}"><span>Other…</span></label></div>
    ${CO_FIELDS.map(([k, l, ph]) => (k === "other" ? `<label for="co-${k}">${esc(l)}<textarea id="co-${k}" maxlength="1500" placeholder="${esc(ph)}">${esc(c[k] || "")}</textarea></label>` : `<label for="co-${k}">${esc(l)}<input id="co-${k}" ${/Expiry$/.test(k) ? 'type="date"' : k === "email" ? 'type="email"' : /mobile|phone/.test(k) ? 'type="tel"' : ""} maxlength="160" value="${esc(c[k] || "")}" placeholder="${esc(ph)}"></label>`)).join("")}
    <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="co-toclients" ${c.showClients === false ? "" : "checked"}> Show my details to clients in the client portal too</label>
    <div class="flabel" style="margin-top:6px">More information</div><div class="who">Add any other lines you want everyone to see, for example CSCS number, CHAS, Gas Safe, bank details for invoices, out-of-hours number.</div>
    <div id="co-extra"></div><button type="button" class="btn" id="co-addx" style="align-self:flex-start">+ Add another line</button>
    ${formFoot(false, "Save")}`,
        async () => {
          const d = {};
          CO_FIELDS.forEach(([k]) => {
            d[k] = $("co-" + k).value.trim();
          });
          d.showClients = $("co-toclients").checked;
          if (pickedCol && pickedCol.toUpperCase() !== BRAND_DEF) d.brandColor = pickedCol;
          else delete d.brandColor;
          const lg = newLogo === undefined ? c.logoId : newLogo;
          if (lg) d.logoId = lg;
          d.extra = [...document.querySelectorAll("#co-extra .coxrow")]
            .map((r) => ({
              label: r.querySelector(".cx-l").value.trim(),
              value: r.querySelector(".cx-v").value.trim(),
            }))
            .filter((x) => x.label || x.value);
          try {
            const up = { company: d };
            if (d.mobile && d.mobile !== ((S.settings || {}).ownerPhone || ""))
              up.ownerPhone = d.mobile;
            await S.db.doc("settings/app").update(up);
            S.settings = Object.assign({}, S.settings, up);
            closeForm();
            toast("Company details saved");
            render();
          } catch (e) {
            showErr("Couldn't save. Check your connection.");
          }
        },
        "co-name",
      );
      let pickedCol = brandHex();
      const markSw = () =>
        document
          .querySelectorAll("#co-sw .cosb[data-c]")
          .forEach((b) =>
            b.setAttribute(
              "aria-pressed",
              String(b.dataset.c.toUpperCase() === pickedCol.toUpperCase()),
            ),
          );
      document.querySelectorAll("#co-sw .cosb[data-c]").forEach(
        (b) =>
          (b.onclick = () => {
            pickedCol = b.dataset.c;
            markSw();
            applyColour(pickedCol);
          }),
      );
      $("co-col").oninput = (e) => {
        pickedCol = e.target.value;
        markSw();
        applyColour(pickedCol);
      };
      {
        const cc = $("f-cancel");
        if (cc) cc.addEventListener("click", () => applyColour());
      }
      const addRow = (x) => {
        x = x || {};
        const r = document.createElement("div");
        r.className = "coxrow";
        r.innerHTML = `<input class="cx-l" maxlength="60" placeholder="Label, e.g. Gas Safe no." value="${esc(x.label || "")}" aria-label="Label"><input class="cx-v" maxlength="300" placeholder="Details" value="${esc(x.value || "")}" aria-label="Details"><button type="button" class="linkdanger cx-x" aria-label="Remove this line">✕</button>`;
        r.querySelector(".cx-x").onclick = () => r.remove();
        $("co-extra").appendChild(r);
        return r;
      };
      (c.extra || []).forEach(addRow);
      if (!(c.extra || []).length) addRow();
      $("co-addx").onclick = () => {
        addRow().querySelector(".cx-l").focus();
      };
      $("co-logodef").onclick = () => {
        newLogo = null;
        $("co-logoprev").src = blobUrl(LOGO_ID);
        $("co-logodef").hidden = true;
        $("co-logomsg").textContent = "The original logo will be used when you tap Save.";
      };
      $("co-logofile").onchange = async (ev) => {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = "";
        if (!f) return;
        const msg = $("co-logomsg"),
          lbl = $("co-logolbl");
        msg.textContent = "Getting your logo ready…";
        lbl.classList.add("busy");
        try {
          let im;
          try {
            im = await loadImage(f);
          } catch (e) {
            im = await loadImage(await shrinkImage(f, 1600));
          }
          const k = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight));
          const cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(im.naturalWidth * k));
          cv.height = Math.max(1, Math.round(im.naturalHeight * k));
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          const png = await new Promise((r) => cv.toBlob(r, "image/png"));
          if (!png) throw { code: "decode" };
          const up = await uploadFile(png, "logo.png");
          const id = up && (up.id || up);
          newLogo = id;
          $("co-logoprev").src = blobUrl(id);
          $("co-logodef").hidden = false;
          msg.textContent = "Looks good. Tap Save to use this logo everywhere.";
        } catch (e) {
          msg.textContent =
            e && e.code === "decode"
              ? "That picture couldn't be opened. Try a PNG or JPG."
              : uploadErr(e);
        } finally {
          lbl.classList.remove("busy");
        }
      };
    };
}
