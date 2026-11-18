/* ================= WEB ENQUIRIES: enquiries from the website pop up, become quick enquiries; how the website is doing ================= */
import { quickEnquiry, viewClient } from "./quick-enquiry.js";
import { $, addDays, esc, iso, shortDay, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BRGB } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { jfSave } from "../sales/job-file.js";
export { webBtnHtml, webEnqFiled, webEnqNew, webEnqWatch, webView };
/* The website's contact form also sends each enquiry to SiteHQ (server: /api/public/enquiry → webenq/<id>,
   owner-only). A new one pops up while the app is open (and as a phone notification when allowed): ⚡ Make a quick
   enquiry fills in the quick enquiry from it (name, phone, email, address, what it's about, source Website) and,
   once saved, files a copy of what they sent in the new client's job file (Letters & emails). "Not for us" puts it
   away. The website also counts page views (server: /api/public/hit → webstats/<day>): visits, pages, where people
   came from, phone or computer – no cookies and nothing about who. Both only fill once the website is live and
   pointed at our own server; on claude.ai they stay empty. */
const WEBQ = { seen: new Set(), primed: false };
const webEnqs = () => (S.webEnq || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
const webEnqNew = () => webEnqs().filter((e) => e.status === "new");
/* after each change to the website enquiries: pop up any new one (not the ones already there when the app opened) */
function webEnqWatch() {
  if (!S.owner) return;
  const fresh = webEnqNew().filter((e) => !WEBQ.seen.has(e.id));
  fresh.forEach((e) => WEBQ.seen.add(e.id));
  if (!WEBQ.primed) {
    WEBQ.primed = true;
    return;
  }
  if (!fresh.length) return;
  const e = fresh[0];
  try {
    if ("Notification" in window && Notification.permission === "granted")
      new Notification("🌐 New website enquiry", {
        body: [e.name, e.type].filter(Boolean).join(" – "),
        tag: "webenq-" + e.id,
      });
  } catch (x) {}
  if (!$("sheet").hidden || document.querySelector(".we-pop")) return;
  webEnqPop(e);
}
const webEnqHtml = (e) =>
  `<div class="we-det"><div class="drow"><span>Name</span><b>${esc(e.name)}</b></div>${e.phone ? `<div class="drow"><span>Phone</span><a href="tel:${esc(e.phone.replace(/\s+/g, ""))}">${esc(e.phone)}</a></div>` : ""}${e.email ? `<div class="drow"><span>Email</span><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></div>` : ""}${e.location ? `<div class="drow"><span>Where</span><span>${esc(e.location)}</span></div>` : ""}${e.type ? `<div class="drow"><span>Project</span><span>${esc(e.type)}</span></div>` : ""}<div class="drow"><span>Sent</span><span>${esc(new Date(e.at || Date.now()).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span></div>${e.message ? `<p class="we-msg">${esc(e.message)}</p>` : ""}</div>`;
/* the pop-up */
function webEnqPop(e) {
  const d = document.createElement("div");
  d.className = "dimask we-pop";
  d.innerHTML = `<div class="dimbox" role="dialog" aria-labelledby="we-h"><b id="we-h">🌐 New enquiry from your website</b>${webEnqHtml(e)}
    <div class="dimbtns"><button type="button" class="btn" id="we-later">Later</button><button type="button" class="btn primary" id="we-make">⚡ Make a quick enquiry</button></div></div>`;
  document.body.appendChild(d);
  $("we-later").onclick = () => d.remove();
  $("we-make").onclick = () => {
    d.remove();
    webEnqMake(e);
  };
}
/* fill in the quick enquiry from it */
function webEnqMake(e) {
  closeViewer();
  quickEnquiry({
    name: e.name,
    phone: e.phone,
    email: e.email,
    address: e.location,
    what: [e.type, e.message].filter(Boolean).join("\n").slice(0, 600),
    source: "Website",
    web: e,
  });
}
/* once the quick enquiry is saved: a copy of what they sent in the client's job file, and the enquiry put away */
async function webEnqFiled(e, rec) {
  try {
    await S.db
      .doc("webenq/" + e.id)
      .update({ status: "done", clientId: rec.id, doneAt: Date.now() });
  } catch (x) {}
  try {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const [r, g, b] = BRGB();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(r, g, b);
    doc.text("Enquiry from the website", 20, 24);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(coData().name || "", 20, 31);
    let y = 44;
    [
      ["Name", e.name],
      ["Phone", e.phone],
      ["Email", e.email],
      ["Where", e.location],
      ["Project", e.type],
      ["Sent", new Date(e.at || Date.now()).toLocaleString("en-GB")],
    ]
      .filter((x) => x[1])
      .forEach(([k, v]) => {
        doc.setFont("helvetica", "bold");
        doc.text(k, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(v), 50, y);
        y += 7;
      });
    if (e.message) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Their message", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      doc.splitTextToSize(e.message, 170).forEach((ln) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(ln, 20, y);
        y += 5;
      });
    }
    const fn = "Website enquiry " + (e.name || "") + ".pdf";
    const a = await uploadFile(new File([doc.output("blob")], fn, { type: "application/pdf" }), fn);
    const j = (S.jobFiles || []).find((x) => x.clientId === rec.id) || {
      clientId: rec.id,
      estId: "",
      client: rec.name,
      title: e.type || "",
      site: e.location || "",
      items: [],
    };
    await jfSave(
      Object.assign({}, j, {
        items: (j.items || []).concat([
          {
            id: newId(),
            assetId: a.id,
            name: fn,
            type: "application/pdf",
            folder: "mail",
            added: Date.now(),
          },
        ]),
      }),
    );
  } catch (x) {
    toast("Saved, but the copy for the job file didn't go – check your connection");
  }
}
/* the Clients page button */
function webBtnHtml() {
  const n = webEnqNew().length;
  return `<button class="btn${n ? " primary" : ""}" id="cl-web" type="button">🌐 Website${n ? ` (${n} new)` : ""}</button>`;
}
/* ---------- the Website page: enquiries and how it's doing ---------- */
function webStatsDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = iso(addDays(new Date(), -i));
    out.push(Object.assign({ day: d }, (S.webStats || []).find((s) => s.id === d) || {}));
  }
  return out;
}
function webSum(days, key) {
  const m = {};
  days.forEach((d) => Object.entries(d[key] || {}).forEach(([k, v]) => (m[k] = (m[k] || 0) + v)));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
const WEB_PAGE_NAMES = { "/": "Home page", other: "Other pages" };
const webPageName = (p) =>
  WEB_PAGE_NAMES[p] ||
  p
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
const webRefName = (r) =>
  r === "direct"
    ? "Typed in / bookmark / app"
    : /google/.test(r)
      ? "Google"
      : /facebook|fb\./.test(r)
        ? "Facebook"
        : /instagram/.test(r)
          ? "Instagram"
          : /bing/.test(r)
            ? "Bing"
            : /pinterest|pin\.it/.test(r)
              ? "Pinterest"
              : /checkatrade|mybuilder|ratedpeople|fmb/.test(r)
                ? r + " (trade site)"
                : r;
function webView() {
  const per = +(S.f.webp || 30);
  const days = webStatsDays(per);
  const tot = (k) => days.reduce((a, d) => a + (+d[k] || 0), 0);
  const visits = tot("visits"),
    views = tot("views"),
    enq = tot("enquiries");
  const max = Math.max(1, ...days.map((d) => d.visits || 0));
  const refs = webSum(days, "refs");
  const refMerged = {};
  refs.forEach(([k, v]) => (refMerged[webRefName(k)] = (refMerged[webRefName(k)] || 0) + v));
  const pages = webSum(days, "pages").slice(0, 10);
  const dev = Object.fromEntries(webSum(days, "dev"));
  /* time on each page (average), landing pages, where they are */
  const secs = Object.fromEntries(webSum(days, "secs")),
    secsN = Object.fromEntries(webSum(days, "secsN"));
  const stay = Object.keys(secs)
    .filter((k) => secsN[k])
    .map((k) => [k, Math.round(secs[k] / secsN[k]), secsN[k]])
    .sort((a, b) => b[2] - a[2])
    .slice(0, 12);
  const stayMax = Math.max(1, ...stay.map((x) => x[1]));
  const visitSecs = days.reduce((a, d) => a + (+d.visitSecs || 0), 0);
  const entry = webSum(days, "entry").slice(0, 8);
  const places = webSum(days, "places").slice(0, 10);
  const mmss = (n) =>
    (n >= 60 ? Math.floor(n / 60) + " min " + (n % 60 ? (n % 60) + " s" : "") : n + " s").trim();
  const devTot = (dev.phone || 0) + (dev.computer || 0);
  const list = webEnqs();
  const bar = (label, v, of) =>
    `<div class="we-bar"><span>${esc(label)}</span><span class="we-track"><span style="width:${of ? Math.round((v / of) * 100) : 0}%"></span></span><b>${v}</b></div>`;
  openViewer(`<div class="we-page"><h2>🌐 Your website</h2>
    <section class="card"><div class="cardbody"><b>Enquiries from the website</b>
      ${
        list.length
          ? list
              .slice(0, 40)
              .map(
                (e) =>
                  `<details class="we-item"${e.status === "new" ? " open" : ""}><summary><span><b>${esc(e.name)}</b> ${e.status === "new" ? '<span class="tag warn">New</span>' : e.status === "done" ? '<span class="tag ok">Enquiry made</span>' : '<span class="tag">Put away</span>'}<small>${esc([e.type, shortDay(iso(new Date(e.at || 0)))].filter(Boolean).join(" · "))}</small></span></summary>${webEnqHtml(e)}<div class="actions">${e.status === "new" ? `<button type="button" class="btn primary we-mk" data-id="${esc(e.id)}">⚡ Make a quick enquiry</button><button type="button" class="btn we-no" data-id="${esc(e.id)}">Not for us</button>` : e.clientId ? `<button type="button" class="btn we-cl" data-c="${esc(e.clientId)}">Open the client</button>` : `<button type="button" class="btn we-mk" data-id="${esc(e.id)}">⚡ Make a quick enquiry</button>`}</div></details>`,
              )
              .join("")
          : `<div class="who">None yet. When the website is live, enquiries sent from its contact form come straight here and pop up on your screen.</div>`
      }
    </div></section>
    <div class="seg" id="we-per">${[
      [7, "Last 7 days"],
      [30, "Last 30 days"],
      [90, "Last 3 months"],
    ]
      .map(
        ([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${per === k}">${l}</button>`,
      )
      .join("")}</div>
    <div class="we-boxes">
      <div class="we-box"><small>Visits</small><b>${visits}</b><span>people coming to the site</span></div>
      <div class="we-box"><small>Pages looked at</small><b>${views}</b><span>${visits ? (views / visits).toFixed(1) + " a visit" : "–"}</span></div>
      <div class="we-box"><small>Enquiries</small><b>${enq}</b><span>${visits ? ((enq / visits) * 100).toFixed(1) + "% of visits" : "–"}</span></div>
      <div class="we-box"><small>Average visit</small><b>${visits && visitSecs ? esc(mmss(Math.round(visitSecs / visits))) : "–"}</b><span>time on the site</span></div>
      <div class="we-box"><small>On a phone</small><b>${devTot ? Math.round(((dev.phone || 0) / devTot) * 100) + "%" : "–"}</b><span>the rest on a computer</span></div>
    </div>
    ${
      views
        ? `<section class="card"><div class="cardbody"><b>Visits each day</b><div class="we-chart" role="img" aria-label="Visits each day">${days.map((d) => `<span class="we-col" title="${esc(shortDay(d.day))}: ${d.visits || 0} visits"><span style="height:${Math.round(((d.visits || 0) / max) * 100)}%"></span></span>`).join("")}</div><div class="who">${esc(shortDay(days[0].day))} to today</div></div></section>
    <section class="card"><div class="cardbody"><b>Where they came from</b>${Object.entries(
      refMerged,
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => bar(k, v, visits))
      .join("")}</div></section>
    <section class="card"><div class="cardbody"><b>Pages looked at most</b>${pages.map(([k, v]) => bar(webPageName(k), v, views)).join("")}</div></section>
    ${stay.length ? `<section class="card"><div class="cardbody"><b>How long people stay on each page</b><div class="who">The average time a page was on someone's screen.</div>${stay.map(([k, v, n]) => `<div class="we-bar"><span>${esc(webPageName(k))}</span><span class="we-track"><span style="width:${Math.round((v / stayMax) * 100)}%"></span></span><b>${esc(mmss(v))}</b></div>`).join("")}</div></section>` : ""}
    ${entry.length ? `<section class="card"><div class="cardbody"><b>The first page people land on</b>${entry.map(([k, v]) => bar(webPageName(k), v, visits)).join("")}</div></section>` : ""}
    ${places.length ? `<section class="card"><div class="cardbody"><b>Where they are</b><div class="who">Town or area, roughly, from their internet connection – nothing about who they are.</div>${places.map(([k, v]) => bar(k, v, visits)).join("")}</div></section>` : ""}`
        : `<div class="nothing">No visits counted yet. The counter starts when your website goes live with the SiteHQ counter switched on (in Jasper's list). It counts visits without cookies and never records who someone is, so there's no cookie banner needed for it.</div>`
    }
  </div>`);
  const vb = $("viewer-body");
  vb.querySelectorAll("#we-per button").forEach(
    (b) =>
      (b.onclick = () => {
        S.f.webp = b.dataset.v;
        webView();
      }),
  );
  vb.querySelectorAll(".we-mk").forEach(
    (b) => (b.onclick = () => webEnqMake(webEnqs().find((e) => e.id === b.dataset.id))),
  );
  vb.querySelectorAll(".we-no").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await S.db.doc("webenq/" + b.dataset.id).update({ status: "no", doneAt: Date.now() });
          toast("Put away");
          setTimeout(webView, 200);
        } catch (e) {
          toast("Couldn't save. Check your connection.");
        }
      }),
  );
  vb.querySelectorAll(".we-cl").forEach(
    (b) =>
      (b.onclick = () => {
        const c = (S.clients || []).find((x) => x.id === b.dataset.c);
        if (c) viewClient(c);
      }),
  );
}
