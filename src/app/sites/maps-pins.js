/* ================= MAPS & PINS: tap any address to open it in maps, drop a pin and send it ================= */
import { CH, canPost, chatTitle, visibleChats } from "../chat/chat.js";
import { clientSites } from "../clients/address-book.js";
import { saveClient } from "../clients/clients.js";
import { viewClient } from "../clients/quick-enquiry.js";
import { $, esc, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { newId, submitJob } from "../files/outbox.js";
import { siteRec } from "../photos/photos.js";
import { myName } from "../survey/door-window-survey.js";
export { autoPins, dropPin, enhanceAddrs, gmapDir, hereNow, initMapsPins, miniMap, parseLatLon };
const ADDR_LABELS = [
  "Address",
  "Site",
  "Property",
  "Site address",
  "Where",
  "Location of site",
  "Branch",
];
/* Maps can't find house names ("Little Arce, Kennford") so when there's no pin, search by the postcode instead */
const UKPC = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
const pcOf = (t) => {
  const m = String(t || "").match(UKPC);
  return m ? (m[1] + " " + m[2]).toUpperCase() : "";
};
function mapQ(q) {
  q = String(q || "").trim();
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q)) return q;
  const pc = pcOf(q);
  if (!pc) return q;
  const first = q.split(",")[0].trim();
  return /^\d/.test(first) ? q : pc;
}
const gmapQ = (q) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQ(q));
const gmapDir = (q) =>
  "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(mapQ(q));
const amapQ = (q, ll) =>
  "https://maps.apple.com/?" +
  (ll ? "ll=" + ll + "&q=" + encodeURIComponent(q || "Pin") : "q=" + encodeURIComponent(mapQ(q)));
/* find a rough pin from the postcode (postcodes.io) and save it, so maps and directions go to the right area */
const PCGEO = {};
async function pcGeo(pc) {
  pc = pcOf(pc);
  if (!pc) return null;
  if (PCGEO[pc] !== undefined) return PCGEO[pc];
  try {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch("https://api.postcodes.io/postcodes/" + encodeURIComponent(pc), {
      signal: ctl.signal,
    });
    clearTimeout(tm);
    const j = await r.json();
    PCGEO[pc] =
      j && j.result && j.result.latitude != null
        ? { lat: +j.result.latitude, lon: +j.result.longitude }
        : null;
  } catch (e) {
    PCGEO[pc] = null;
  }
  return PCGEO[pc];
}
async function autoPins() {
  if (!ownerMode() || S.autoPinsDone) return;
  S.autoPinsDone = true;
  for (const c of S.clients || []) {
    if (c.lat != null) continue;
    const pc = pcOf(c.postcode || "") || pcOf(c.address || "");
    if (!pc) continue;
    const ll = await pcGeo(pc);
    if (!ll) continue;
    try {
      const others = (c.pins || []).filter((x) => x.label !== "Property");
      await saveClient(
        Object.assign({}, c, {
          lat: ll.lat,
          lon: ll.lon,
          pinApprox: true,
          pins: [
            {
              id: newId(),
              label: "Property",
              lat: ll.lat,
              lon: ll.lon,
              note:
                "Rough pin from the postcode " + pc + ". Move it to the exact spot if you need to.",
              at: Date.now(),
              approx: true,
            },
          ].concat(others),
        }),
      );
    } catch (e) {}
  }
  for (const sr of S.sites || []) {
    if (!sr || !sr.id || sr.lat != null) continue;
    let pc = pcOf(sr.name);
    if (!pc) {
      const c = (S.clients || []).find((x) => clientSites(x).includes(sr.name));
      if (c) pc = pcOf(c.postcode || "");
    }
    if (!pc) continue;
    const ll = await pcGeo(pc);
    if (!ll) continue;
    try {
      await S.db.doc("sites/" + sr.id).update({ lat: ll.lat, lon: ll.lon, pinApprox: true });
      sr.lat = ll.lat;
      sr.lon = ll.lon;
      sr.pinApprox = true;
    } catch (e) {}
  }
}
const isAppleDev = () => /iPhone|iPad|Macintosh/.test(navigator.userAgent || "");
function placeOf(addr, lat, lon) {
  const s = addr ? siteRec(addr) : null;
  if (lat == null && s && s.lat != null) {
    lat = s.lat;
    lon = s.lon;
  }
  return {
    addr: addr || "",
    lat: lat != null ? +lat : null,
    lon: lon != null ? +lon : null,
    site: s || null,
  };
}
function parseLatLon(t) {
  t = String(t || "").trim();
  if (!t) return null;
  let m =
    t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    t.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i) ||
    t.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/) ||
    t.match(/(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (!m) return null;
  const lat = +m[1],
    lon = +m[2];
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
function pinUrl(p) {
  return p.lat != null
    ? `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`
    : gmapQ(p.addr);
}
function pinText(p, label) {
  return `📍 ${label || p.label || p.addr || "Location"}${p.addr && label && label !== p.addr ? " (" + p.addr + ")" : ""}\n${pinUrl(p)}${p.note ? "\n" + p.note : ""}`;
}
function hereNow() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("none"));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        res({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }),
      (e) => rej(e),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
/* small map preview from OpenStreetMap tiles; falls back to a plain card if the tiles can't load */
function miniMap(lat, lon, o) {
  o = o || {};
  if (lat == null || lon == null || !isFinite(+lat) || !isFinite(+lon)) return "";
  lat = +lat;
  lon = +lon;
  const z = o.z || 16,
    n = Math.pow(2, z);
  const xf = ((lon + 180) / 360) * n,
    lr = (lat * Math.PI) / 180,
    yf = ((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2) * n,
    tx = Math.floor(xf),
    ty = Math.floor(yf),
    px = (xf - tx) * 256,
    py = (yf - ty) * 256;
  let t = "";
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const X = (((tx + dx) % n) + n) % n,
        Y = ty + dy;
      if (Y < 0 || Y >= n) continue;
      t += `<img src="https://tile.openstreetmap.org/${z}/${X}/${Y}.png" alt="" loading="lazy" draggable="false" style="left:calc(50% + ${Math.round(dx * 256 - px)}px);top:calc(50% + ${Math.round(dy * 256 - py)}px)" onerror="this.closest('.minimap').classList.add('mmfail')">`;
    }
  if (o.still)
    return `<div class="minimap" role="img" aria-label="Map of ${esc(o.label || "the location")}"><span class="mmtiles">${t}</span><span class="mmpin" aria-hidden="true"><svg viewBox="0 0 24 34" width="26" height="36"><path d="M12 33s11-12.4 11-21A11 11 0 0 0 1 12c0 8.6 11 21 11 21z" fill="#7F191D" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="#fff"/></svg></span><span class="mmfb">📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}<br><small>Map preview can't load here.</small></span><span class="mmattr">© OpenStreetMap</span></div>`;
  return `<button type="button" class="minimap maplink" ${o.addr ? `data-addr="${esc(o.addr)}"` : ""} data-lat="${lat}" data-lon="${lon}" data-label="${esc(o.label || "Location")}" ${o.cid ? `data-client="${esc(o.cid)}"` : ""} aria-label="Map of ${esc(o.label || "the location")}. Tap to open in Maps.">
    <span class="mmtiles">${t}</span><span class="mmpin" aria-hidden="true"><svg viewBox="0 0 24 34" width="26" height="36"><path d="M12 33s11-12.4 11-21A11 11 0 0 0 1 12c0 8.6 11 21 11 21z" fill="#7F191D" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="#fff"/></svg></span>
    <span class="mmfb">📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}<br><small>Map preview can't load here. Tap to open in Maps.</small></span><span class="mmattr">© OpenStreetMap</span></button>`;
}
function openPlace(addr, lat, lon, label, cid) {
  if (lat == null) {
    const cl = cid ? (S.clients || []).find((x) => x.id === cid) : null;
    const p0 = placeOf(addr, cl && cl.lat != null ? cl.lat : null, cl ? cl.lon : null);
    const pc = p0.lat == null ? pcOf(addr) || pcOf(cl && cl.postcode) : "";
    if (pc && PCGEO[pc] === undefined) {
      toast("Finding the postcode on the map…");
      pcGeo(pc).then(() => openPlace(addr, lat, lon, label, cid));
      return;
    }
    if (pc && PCGEO[pc]) {
      return openPlace0(addr, PCGEO[pc].lat, PCGEO[pc].lon, label, cid, pc);
    }
  }
  return openPlace0(addr, lat, lon, label, cid);
}
function openPlace0(addr, lat, lon, label, cid, approxPc) {
  const cl = cid ? (S.clients || []).find((x) => x.id === cid) : null;
  if (cl && lat == null && cl.lat != null) {
    lat = cl.lat;
    lon = cl.lon;
  }
  const p = placeOf(addr, lat, lon);
  const q = p.lat != null ? p.lat + "," + p.lon : p.addr;
  const s = cl ? null : p.site;
  const holder = cl || s;
  const pins = (holder && holder.pins) || [];
  const own = ownerMode();
  openSheet(
    `<h3 id="sheettitle">📍 ${esc(label || p.addr || "Location")}</h3>
    ${p.addr && label ? `<div class="who">${esc(p.addr)}</div>` : ""}${p.lat != null ? `<div class="mmwrap mmstatic">${miniMap(p.lat, p.lon, { label: label || p.addr, still: true })}</div><div class="who">${approxPc || (holder && holder.pinApprox) ? `Rough pin from the postcode${approxPc ? " " + esc(approxPc) : ""}. Maps will take you to the right area${own ? "; add an exact pin below for the front door" : ""}.` : `Pin: ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`}</div>` : `<div class="who">No exact pin saved${holder && own ? ". Add one below so people go to the right spot, not just the postcode." : ", so maps will search for the address."}</div>`}
    <div class="plgrid"><a class="btn primary" href="${esc(isAppleDev() ? amapQ(p.addr, p.lat != null ? q : "") : gmapQ(q))}" target="_blank" rel="noopener">🗺 Open in Maps</a><a class="btn primary" href="${esc(gmapDir(q))}" target="_blank" rel="noopener">🚗 Directions</a>
      <a class="btn" href="${esc(gmapQ(q))}" target="_blank" rel="noopener">Google Maps</a><a class="btn" href="${esc(amapQ(p.addr, p.lat != null ? q : ""))}" target="_blank" rel="noopener">Apple Maps</a></div>
    <div class="flabel">Send this location</div>${shareBtns(p, label)}
    ${holder ? `<div class="flabel">Saved pins for this ${cl ? "client" : "site"}</div><div class="pinlist">${pins.map((x, i) => `<div class="pinrow"><button type="button" class="linkbtn pin-open" data-i="${i}">📍 <b>${esc(x.label)}</b>${x.note ? ` <span class="who">${esc(x.note)}</span>` : ""}</button>${own ? `<button type="button" class="linkdanger pin-del" data-i="${i}" aria-label="Remove ${esc(x.label)}">✕</button>` : ""}</div>`).join("") || '<div class="nothing">None yet. Useful for the site gate, parking, skip or welfare cabin.</div>'}</div>` : ""}
    <div class="actions"><button type="button" class="btn hv" id="pl-drop">📍 Drop a pin${holder && own ? (cl ? " for this client" : " for this site") : ""}</button></div>
    <div class="actions"><button type="button" class="btn" id="f-cancel">Close</button></div>`,
    null,
  );
  wireShare(p, label);
  $("form")
    .querySelectorAll(".pin-open")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const x = pins[+b.dataset.i];
          openPlace(p.addr, x.lat, x.lon, x.label);
        }),
    );
  $("form")
    .querySelectorAll(".pin-del")
    .forEach((b) => {
      let armed = false;
      b.onclick = async () => {
        if (!armed) {
          armed = true;
          b.textContent = "Remove?";
          return;
        }
        const left = pins.filter((_, i) => i !== +b.dataset.i);
        try {
          if (cl) {
            const upd = { pins: left };
            if (left.length === 0) {
              upd.lat = null;
              upd.lon = null;
            } else if (cl.lat === pins[+b.dataset.i].lat) {
              upd.lat = left[0].lat;
              upd.lon = left[0].lon;
            }
            await saveClient(Object.assign({}, cl, upd));
          } else await S.db.doc("sites/" + s.id).update({ pins: left });
          toast("Pin removed");
          setTimeout(() => openPlace(p.addr, null, null, label, cid), 150);
        } catch (e) {
          toast("Couldn't remove");
        }
      };
    });
  $("pl-drop").onclick = () => dropPin({ site: s, client: cl, addr: p.addr });
}
function shareBtns(p, label) {
  const txt = pinText(p, label);
  return `<div class="plgrid"><a class="btn" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">WhatsApp</a><a class="btn" href="sms:?&body=${encodeURIComponent(txt)}">💬 Text</a>
    <a class="btn" href="mailto:?subject=${encodeURIComponent("Location: " + (label || p.addr || "pin"))}&body=${encodeURIComponent(txt)}">✉ Email</a><button type="button" class="btn" id="pl-copy">📋 Copy link</button>
    <button type="button" class="btn" id="pl-chat">Send in app chat</button>${navigator.share ? `<button type="button" class="btn" id="pl-share">More…</button>` : ""}</div>`;
}
function wireShare(p, label) {
  const txt = pinText(p, label);
  $("pl-copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(txt);
      toast("Copied. Paste it into any message.");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (x) {}
      ta.remove();
      toast(
        ok
          ? "Copied. Paste it into any message."
          : "Couldn't copy. Use WhatsApp, Text or Email instead.",
      );
    }
  };
  if ($("pl-share"))
    $("pl-share").onclick = async () => {
      try {
        await navigator.share({ title: label || p.addr || "Location", text: txt });
      } catch (e) {
        if (e && e.name !== "AbortError")
          toast("Sharing isn't available here. Use WhatsApp, Text or Copy.");
      }
    };
  $("pl-chat").onclick = () => pinToChat(p, label);
}
function pinToChat(p, label) {
  const cs = visibleChats().filter((c) => typeof canPost !== "function" || canPost(c));
  if (!cs.length) {
    toast("No chats yet");
    return;
  }
  openSheet(
    `<h3 id="sheettitle">Send location to…</h3><div class="chatlist">${cs.map((c) => `<button type="button" class="chatrow pc-pick" data-c="${esc(c.id)}"><span class="cmain"><b>${esc(chatTitle(c))}</b></span></button>`).join("")}</div>
    <div class="actions"><button type="button" class="btn" id="f-cancel">Cancel</button></div>`,
    null,
  );
  $("form")
    .querySelectorAll(".pc-pick")
    .forEach(
      (b) =>
        (b.onclick = () =>
          sendPinTo(
            cs.find((x) => x.id === b.dataset.c),
            p,
            label,
          )),
    );
}
async function sendPinTo(c, p, label) {
  if (!c) return;
  const id = newId(),
    at = Date.now();
  {
    const loc = {
      lat: p.lat,
      lon: p.lon,
      addr: p.addr || "",
      label: label || p.label || p.addr || "Location",
    };
    const text = pinText(p, label);
    try {
      await submitJob({
        path: "msgs/" + c.id + "/m",
        coll: "msgs",
        docId: id,
        data: {
          by: S.me,
          byName: myName(),
          text,
          at,
          loc,
          site: p.site ? p.site.name : c.kind === "site" ? c.site : "",
          jobId: "",
          jobTitle: "",
        },
        files: [],
        also: {
          path: "chats/" + c.id,
          data: {
            lastAt: at,
            lastBy: S.me,
            lastName: myName(),
            lastText: ("📍 " + loc.label).slice(0, 120),
          },
        },
      });
      closeForm();
      toast("Location sent to " + chatTitle(c));
    } catch (e) {
      toast("Couldn't send");
    }
  }
}
function dropPin(o) {
  o = o || {};
  const s = o.site || null;
  const cl = o.client || null;
  const own = ownerMode();
  openSheet(
    `<h3 id="sheettitle">📍 Drop a pin</h3>
    <button type="button" class="btn primary" id="dp-here" style="align-self:flex-start">📡 Use where I'm standing now</button><div class="who" id="dp-gps"></div>
    <label for="dp-paste">Or paste a location from Google or Apple Maps<input id="dp-paste" placeholder="e.g. 50.6197, -3.4135 or a maps link"></label>
    <div class="who">In Google Maps, press and hold the exact spot, then copy the numbers that appear at the top (or tap Share › Copy link). Paste them here.</div>
    <label for="dp-label">What is it?<input id="dp-label" maxlength="60" value="${esc(o.label || (cl ? "Property" : ""))}" placeholder="e.g. Site gate, Parking, Skip, Welfare cabin"></label>
    <label for="dp-note">Note (optional)<input id="dp-note" maxlength="140" placeholder="e.g. Use the farm track, not the main road"></label>
    <div class="who" id="dp-at"></div>
    ${cl && own ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="dp-save" checked> Save it on ${esc(cl.name)}'s record</label>${cl.lat == null ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="dp-main" checked> Use it as the property's main location</label>` : `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="dp-main"> Make it the property's main location</label>`}` : ""}
    ${s && own ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="dp-save" checked> Save it on ${esc(s.name)} so everyone can find it</label>${s.lat == null ? `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="dp-main" checked> Use it as the site's main location too</label>` : ""}` : ""}
    ${formFoot(false, o.chatId ? "Send to chat" : "Next: send it")}`,
    async () => {
      const ll = pin || parseLatLon($("dp-paste").value);
      if (!ll) {
        showErr(
          /goo\.gl|maps\.app/.test($("dp-paste").value)
            ? "Short maps links can't be read here. In Maps, press and hold the spot and copy the numbers instead."
            : "Use your location or paste a location first.",
        );
        return;
      }
      const label = $("dp-label").value.trim() || "Pin";
      const note = $("dp-note").value.trim();
      if (cl && own && $("dp-save") && $("dp-save").checked) {
        try {
          const upd = {
            pins: (cl.pins || []).concat([
              { id: newId(), label, lat: ll.lat, lon: ll.lon, note, at: Date.now() },
            ]),
          };
          if ($("dp-main") && $("dp-main").checked) {
            upd.lat = ll.lat;
            upd.lon = ll.lon;
            upd.pinApprox = false;
          }
          upd.notes = (cl.notes || []).concat([
            { text: "📍 Pin added: " + label, at: Date.now(), auto: true },
          ]);
          const rec = await saveClient(Object.assign({}, cl, upd));
          Object.assign(cl, rec);
          toast("Pin saved on " + cl.name);
          render();
          if (!$("viewer").hidden && S.otab === "clients") viewClient(rec);
        } catch (e) {
          showErr("Couldn't save the pin");
          return;
        }
      }
      if (s && own && $("dp-save") && $("dp-save").checked) {
        try {
          const upd = {
            pins: (s.pins || []).concat([
              { id: newId(), label, lat: ll.lat, lon: ll.lon, note, at: Date.now() },
            ]),
          };
          if ($("dp-main") && $("dp-main").checked) {
            upd.lat = ll.lat;
            upd.lon = ll.lon;
            upd.pinApprox = false;
          }
          await S.db.doc("sites/" + s.id).update(upd);
          toast("Pin saved on the site");
        } catch (e) {
          showErr("Couldn't save the pin");
          return;
        }
      }
      const p = {
        addr:
          o.addr || (s ? s.name : cl ? [cl.address, cl.postcode].filter(Boolean).join(", ") : ""),
        lat: ll.lat,
        lon: ll.lon,
        note,
        label,
      };
      if (o.chatId) {
        await sendPinTo(
          S.chats.find((x) => x.id === o.chatId),
          p,
          label,
        );
        return;
      }
      openSheet(
        `<h3 id="sheettitle">📍 ${esc(label)}</h3><div class="who">${ll.lat.toFixed(6)}, ${ll.lon.toFixed(6)}${p.addr ? " · " + esc(p.addr) : ""}</div>
        <div class="plgrid"><a class="btn" href="${esc(gmapQ(ll.lat + "," + ll.lon))}" target="_blank" rel="noopener">Check it on the map ↗</a></div>
        <div class="flabel">Send it</div>${shareBtns(p, label)}<div class="actions"><button type="button" class="btn" id="f-cancel">Done</button></div>`,
        null,
      );
      wireShare(p, label);
    },
    "dp-label",
  );
  let pin = null;
  const show = () => {
    $("dp-at").innerHTML = pin
      ? `Pin: <b>${pin.lat.toFixed(6)}, ${pin.lon.toFixed(6)}</b>${pin.acc ? ` (accurate to about ${Math.round(pin.acc)} m)` : ""} · <a href="${esc(gmapQ(pin.lat + "," + pin.lon))}" target="_blank" rel="noopener">check on map ↗</a>`
      : "";
  };
  $("dp-paste").addEventListener("input", () => {
    const v = parseLatLon($("dp-paste").value);
    if (v) {
      pin = v;
      show();
    }
  });
  $("dp-here").onclick = async () => {
    $("dp-gps").textContent = "Finding you…";
    try {
      pin = await hereNow();
      $("dp-gps").textContent = "";
      $("dp-paste").value = "";
      show();
    } catch (e) {
      $("dp-gps").textContent =
        e && e.code === 1
          ? "Location is blocked for this app. Allow location in your phone's settings, or paste the location from Maps below."
          : "Couldn't get your location here. Paste it from Google or Apple Maps below instead.";
    }
  };
}
function enhanceAddrs(root) {
  if (!root) return;
  root.querySelectorAll(".drow").forEach((r) => {
    const sp = r.children;
    if (sp.length < 2 || sp[1].querySelector(".maplink")) return;
    const l = sp[0].textContent.trim();
    if (!ADDR_LABELS.includes(l)) return;
    const v = sp[1].textContent.trim();
    if (!v || /^No site$/i.test(v)) return;
    sp[1].innerHTML = `<button type="button" class="maplink" data-addr="${esc(v)}">📍 ${esc(v)}</button>`;
  });
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initMapsPins() {
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest && e.target.closest(".maplink");
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      openPlace(
        b.dataset.addr,
        b.dataset.lat || null,
        b.dataset.lon || null,
        b.dataset.label || "",
        b.dataset.client || "",
      );
    },
    true,
  );
  if ($("cm-pin"))
    $("cm-pin").onclick = () => {
      const c = S.chats.find((x) => x.id === CH.open);
      dropPin({
        chatId: CH.open,
        site: c && c.kind === "site" ? siteRec(c.site) : null,
        addr: c && c.kind === "site" ? c.site : "",
      });
    };
}
