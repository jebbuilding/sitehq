/* ================= REVIEWS: every review a client leaves, kept on the client and the job, with an overview of them all ================= */
import { CJOBS } from "./address-book-jobs.js";
import { ptCl, ptOf } from "./portal.js";
import { viewClient } from "./quick-enquiry.js";
import { rqAsk } from "./review-ask.js";
import { coShort } from "../core/company-names.js";
import { $, esc, iso, shortDay, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { openViewer } from "../core/viewer.js";
import { newId } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { SOCIAL } from "../owner/social-posts.js";
export { REVIEWS };
/* James (Nov 2026): "Reviews storage tying it to the job client and overview. Within client portal and to be able to
   send them something to send them where to fill out google review and one for my website".
   A review is a todos record { kind:"review", clientId, clientName, job, site, stars 1–5 (0 = not given), text,
   source (google | website | facebook | checkatrade | portal | other), date, created }. Clients asked through the
   portal answer there: their stars and words land on their own portal record (portal/{uid}.review), shown here
   alongside the ones James adds himself. The portal card also has buttons to the firm's Google review page and the
   review page on its own website (Company details › Google review link / Website review link). */
const REVIEWS = (() => {
  const SOURCES = [
    ["google", "Google"],
    ["website", "Our website"],
    ["facebook", "Facebook"],
    ["checkatrade", "Checkatrade"],
    ["portal", "Client portal"],
    ["other", "Other"],
  ];
  const srcName = (k) => (SOURCES.find((x) => x[0] === k) || SOURCES[SOURCES.length - 1])[1];
  const starsTxt = (n) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "");
  const starsHtml = (n) =>
    n ? `<span class="rv-stars" aria-label="${n} out of 5 stars">${starsTxt(n)}</span>` : "";
  /* reviews from the portal: on the client's own portal record */
  function fromPortal() {
    return (S.portal || [])
      .filter((p) => p.review && (p.review.stars || p.review.text))
      .map((p) => {
        const c = (S.clients || []).find((x) => x.id === p.clientId || x.portalUid === p.id) || {};
        return {
          id: "pt-" + p.id,
          portal: true,
          clientId: c.id || p.clientId || "",
          clientName: c.name || p.name || "",
          job: p.review.job || c.jobName || c.work || p.project || "",
          site: c.site || p.site || "",
          stars: +p.review.stars || 0,
          text: p.review.text || "",
          source: "portal",
          date: iso(new Date(p.review.at || Date.now())),
          created: p.review.at || 0,
        };
      });
  }
  function all() {
    return (S.reviews || [])
      .concat(fromPortal())
      .sort(
        (a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")) ||
          (b.created || 0) - (a.created || 0),
      );
  }
  const ofClient = (c) => all().filter((r) => r.clientId === c.id);
  /* the client's jobs, to tie a review to one */
  function jobNames(c) {
    if (!c) return [];
    const L = [];
    try {
      CJOBS.jobsOf(c).forEach((j) => {
        const n = String(j.jobName || j.work || "").trim();
        if (n && !L.includes(n)) L.push(n);
      });
    } catch (e) {}
    [c.jobName, c.work].forEach((n) => {
      n = String(n || "").trim();
      if (n && !L.includes(n)) L.push(n);
    });
    return L;
  }
  function rowHtml(r, withClient) {
    return `<div class="rv-row"><div class="rv-top">${starsHtml(r.stars)}<span class="tag">${esc(srcName(r.source))}</span><span class="who">${esc(r.date ? shortDay(r.date) : "")}</span></div>
      ${r.text ? `<div class="rv-text">“${esc(r.text)}”</div>` : ""}
      <div class="who">${withClient && r.clientName ? `<button type="button" class="linkbtn rv-cl" data-c="${esc(r.clientId)}">👤 ${esc(r.clientName)}</button> · ` : ""}${r.job ? "🔨 " + esc(r.job) : ""}${r.site ? " · 📍 " + esc(r.site) : ""}</div>
      <div class="rv-acts">${r.portal ? '<span class="who">Left in their portal</span>' : `<button type="button" class="pillbtn rv-ed" data-id="${esc(r.id)}">✎ Edit</button>`}<button type="button" class="pillbtn rv-post" data-id="${esc(r.id)}">📣 Make a post</button></div></div>`;
  }
  /* the client's page: their reviews and the buttons */
  function clientHtml(c) {
    const L = ofClient(c);
    return `<div class="flabel" style="margin-top:12px">⭐ Reviews${L.length ? " (" + L.length + ")" : ""}</div>
      ${L.map((r) => rowHtml(r, false)).join("") || `<div class="who">${c.reviewAskedAt ? "Asked " + esc(stamp(c.reviewAskedAt)) + " – no review noted yet." : "No reviews from them yet."}</div>`}
      <div class="actions"><button type="button" class="btn rv-ask">⭐ Ask for a review</button><button type="button" class="btn rv-add">＋ Add a review they left</button></div>`;
  }
  function wireRows(root, reopen) {
    root.querySelectorAll(".rv-ed").forEach(
      (b) =>
        (b.onclick = () => {
          const r = (S.reviews || []).find((x) => x.id === b.dataset.id);
          if (r) edit(r, null, reopen);
        }),
    );
    root.querySelectorAll(".rv-post").forEach(
      (b) =>
        (b.onclick = () => {
          const r = all().find((x) => x.id === b.dataset.id);
          if (r) SOCIAL.fromReview(r);
        }),
    );
    root.querySelectorAll(".rv-cl").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.c);
          if (c) viewClient(c);
        }),
    );
  }
  function wireClient(c, reopen) {
    wireRows(document, reopen);
    document.querySelectorAll(".rv-ask").forEach((b) => (b.onclick = () => rqAsk(c)));
    document.querySelectorAll(".rv-add").forEach((b) => (b.onclick = () => edit(null, c, reopen)));
  }
  /* add or change one */
  function edit(r, c0, after) {
    const isNew = !r;
    r = r || {};
    const clients = (S.clients || [])
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    let c = c0 || clients.find((x) => x.id === r.clientId) || null;
    const jobOpts = (cc, cur) => {
      const L = jobNames(cc);
      if (cur && !L.includes(cur)) L.unshift(cur);
      return (
        L.map(
          (n) => `<option value="${esc(n)}" ${n === cur ? "selected" : ""}>${esc(n)}</option>`,
        ).join("") + `<option value="">Not for one job</option>`
      );
    };
    const stars = r.stars != null ? +r.stars : 5;
    openSheet(
      `<h3 id="sheettitle">⭐ ${isNew ? "Add a review" : "Edit review"}</h3>
      ${c0 ? `<div class="who">From <b>${esc(c0.name)}</b></div>` : `<label for="rv-c">Client<select id="rv-c"><option value="">Choose…</option>${clients.map((x) => `<option value="${esc(x.id)}" ${c && c.id === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>`}
      <label for="rv-job">Which job<select id="rv-job">${jobOpts(c, r.job || (c && (c.jobName || c.work)) || "")}</select></label>
      <div><div class="flabel">Stars</div><div class="rv-pick" id="rv-st">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" aria-pressed="${n <= stars}" aria-label="${n} star${n === 1 ? "" : "s"}">★</button>`).join("")}<button type="button" class="pillbtn" data-v="0" id="rv-nost">No stars</button></div></div>
      <div><div class="flabel">Where they left it</div><div class="seg" id="rv-src">${SOURCES.filter(
        (x) => x[0] !== "portal",
      )
        .map(
          ([k, l]) =>
            `<button type="button" data-v="${k}" aria-pressed="${(r.source || "google") === k}">${l}</button>`,
        )
        .join("")}</div></div>
      <label for="rv-date">Date<input id="rv-date" type="date" value="${esc(r.date || iso(new Date()))}"></label>
      <label for="rv-text">What they said<textarea id="rv-text" maxlength="3000" rows="5" placeholder="Paste or type the review">${esc(r.text || "")}</textarea></label>
      ${formFoot(!isNew, isNew ? "Save" : "Save")}`,
      async () => {
        const cid = c0 ? c0.id : $("rv-c").value;
        const cc = clients.find((x) => x.id === cid);
        if (!cc) {
          showErr("Choose the client.");
          return;
        }
        const st = +($("rv-st").dataset.n != null ? $("rv-st").dataset.n : stars);
        const text = $("rv-text").value.trim();
        if (!st && !text) {
          showErr("Add the stars or what they said.");
          return;
        }
        const rec = {
          kind: "review",
          clientId: cc.id,
          clientName: cc.name || "",
          job: $("rv-job").value,
          site: cc.site || "",
          stars: st,
          text,
          source: $("rv-src").querySelector('[aria-pressed="true"]').dataset.v,
          date: $("rv-date").value || iso(new Date()),
          created: r.created || Date.now(),
          updated: Date.now(),
        };
        const id = r.id || "rv-" + newId();
        $("f-save").disabled = true;
        try {
          await S.db.doc("todos/" + id).set(rec);
          S.reviews = (S.reviews || [])
            .filter((x) => x.id !== id)
            .concat([Object.assign({ id }, rec)]);
          closeForm();
          toast("Review saved");
          if (after) after();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      c0 ? "rv-text" : "rv-c",
    );
    const box = $("rv-st");
    box.dataset.n = String(stars);
    const paint = (n) => {
      box.dataset.n = String(n);
      box.querySelectorAll("button[data-v]").forEach((b) => {
        if (b.id !== "rv-nost") b.setAttribute("aria-pressed", String(+b.dataset.v <= n));
      });
    };
    box.querySelectorAll("button[data-v]").forEach((b) => (b.onclick = () => paint(+b.dataset.v)));
    $("rv-src")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            $("rv-src")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
      );
    if ($("rv-c"))
      $("rv-c").onchange = () => {
        c = clients.find((x) => x.id === $("rv-c").value) || null;
        $("rv-job").innerHTML = jobOpts(c, c ? c.jobName || c.work || "" : "");
      };
    if (!isNew)
      armDelete(async () => {
        try {
          await S.db.doc("todos/" + r.id).delete();
          S.reviews = (S.reviews || []).filter((x) => x.id !== r.id);
          closeForm();
          toast("Deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
          if (after) after();
        } catch (e) {
          showErr("Couldn't delete");
        }
      });
  }
  /* the review links, kept in Company details */
  function links() {
    const co = coData();
    openSheet(
      `<h3 id="sheettitle">🔗 Where clients leave reviews</h3>
      <label for="rv-g">Google review link<input id="rv-g" maxlength="300" value="${esc(co.reviewUrl || "")}" placeholder="e.g. https://g.page/r/…/review"></label>
      <div class="who">In Google, open your business profile and tap <b>Ask for reviews</b> to get the link.</div>
      <label for="rv-w">Review page on your website<input id="rv-w" maxlength="300" value="${esc(co.webReviewUrl || "")}" placeholder="e.g. https://www.yourfirm.co.uk/reviews"></label>
      ${formFoot(false, "Save")}`,
      async () => {
        const g = $("rv-g").value.trim(),
          w = $("rv-w").value.trim();
        if ((g && !/^https?:\/\//i.test(g)) || (w && !/^https?:\/\//i.test(w))) {
          showErr("Links start with https://");
          return;
        }
        try {
          const company = Object.assign({}, (S.settings || {}).company || {}, {
            reviewUrl: g,
            webReviewUrl: w,
          });
          await S.db.doc("settings/app").update({ company });
          S.settings = Object.assign({}, S.settings, { company });
          closeForm();
          toast("Saved");
          view();
        } catch (e) {
          showErr("Couldn't save");
        }
      },
      "rv-g",
    );
  }
  let filt = "";
  /* ⭐ Reviews: all of them */
  function view() {
    const L = all();
    const shown = filt ? L.filter((r) => r.source === filt) : L;
    const rated = L.filter((r) => r.stars);
    const avg = rated.length ? rated.reduce((s, r) => s + r.stars, 0) / rated.length : 0;
    const byS = SOURCES.map(([k, l]) => [k, l, L.filter((r) => r.source === k).length]).filter(
      (x) => x[2],
    );
    const reviewed = new Set(L.map((r) => r.clientId));
    const waiting = (S.clients || [])
      .filter((c) => c.reviewAskedAt && !reviewed.has(c.id))
      .sort((a, b) => b.reviewAskedAt - a.reviewAskedAt);
    const co = coData();
    openViewer(`<div class="rv-page"><div class="vhead"><b>⭐ Reviews</b></div>
      <div class="rv-sum"><div class="rv-big">${avg ? avg.toFixed(1) : "–"}</div><div>${avg ? starsHtml(Math.round(avg)) : ""}<div class="who">${L.length} review${L.length === 1 ? "" : "s"}${rated.length !== L.length ? " · " + rated.length + " with stars" : ""}</div></div></div>
      ${byS.length ? `<div class="seg rv-f"><button type="button" class="pillbtn" data-v="" aria-pressed="${!filt}">All (${L.length})</button>${byS.map(([k, l, n]) => `<button type="button" class="pillbtn" data-v="${k}" aria-pressed="${filt === k}">${esc(l)} (${n})</button>`).join("")}</div>` : ""}
      <div class="actions"><button type="button" class="btn primary" id="rv-new">＋ Add a review</button><button type="button" class="btn" id="rv-links">🔗 Review links${co.reviewUrl || co.webReviewUrl ? "" : " (not set)"}</button></div>
      ${waiting.length ? `<details class="pmdet"><summary>Asked, no review yet (${waiting.length})</summary>${waiting.map((c) => `<div class="dwsrow"><span><button type="button" class="linkbtn rv-cl" data-c="${esc(c.id)}">${esc(c.name)}</button><br><span class="who">Asked ${esc(stamp(c.reviewAskedAt))}${c.jobName || c.work ? " · " + esc(c.jobName || c.work) : ""}</span></span><button type="button" class="pillbtn rv-again" data-c="${esc(c.id)}">Ask again</button></div>`).join("")}</details>` : ""}
      ${shown.map((r) => rowHtml(r, true)).join("") || '<div class="empty"><strong>No reviews yet</strong>When a job is finished, ask the client from their page (⭐ Ask for a review) or put the ask in their portal. Reviews they leave on Google or your website can be added here so they sit with the client and the job.</div>'}</div>`);
    const root = document.querySelector(".rv-page");
    wireRows(root, view);
    root.querySelectorAll(".rv-f button").forEach(
      (b) =>
        (b.onclick = () => {
          filt = b.dataset.v;
          view();
        }),
    );
    root.querySelectorAll(".rv-again").forEach(
      (b) =>
        (b.onclick = () => {
          const c = (S.clients || []).find((x) => x.id === b.dataset.c);
          if (c) rqAsk(c);
        }),
    );
    $("rv-new").onclick = () => edit(null, null, view);
    $("rv-links").onclick = links;
  }
  /* the portal: ask the client there (owner) */
  async function askInPortal(c) {
    const p = ptOf(ptCl(c));
    if (!p) return false;
    const co = coData();
    await S.db.doc("portal/" + p.id).update({
      reviewAsk: {
        at: Date.now(),
        job: c.jobName || c.work || "",
        google: co.reviewUrl || "",
        web: co.webReviewUrl || "",
      },
    });
    return true;
  }
  /* the portal's home page (client): how did we do? */
  function portalHtml(C) {
    const a = C.reviewAsk;
    if (!a || C.reviewHide) return "";
    const co = coData();
    const g = a.google || co.reviewUrl || "",
      w = a.web || co.webReviewUrl || "";
    const linkBtns = `${g ? `<a class="btn${C.review ? " primary" : ""}" href="${esc(g)}" target="_blank" rel="noopener" style="text-decoration:none">⭐ Review us on Google</a>` : ""}${w ? `<a class="btn" href="${esc(w)}" target="_blank" rel="noopener" style="text-decoration:none">🌐 Review us on our website</a>` : ""}`;
    if (C.review)
      return `<div class="card rv-pt"><b>Thank you for your review ${starsHtml(+C.review.stars || 0)}</b>${g || w ? `<div class="who">It would help us a lot if you put it on Google or our website too. Your words are copied when you tap.</div><div class="actions rv-ptl">${linkBtns}</div>` : ""}<div class="actions"><button type="button" class="linkbtn" id="rv-pthide">Hide this</button></div></div>`;
    return `<div class="card rv-pt"><b>⭐ How did we do?</b><div class="who">${esc(coShort())} would love to know what you thought${a.job ? " of your " + esc(String(a.job).toLowerCase()) : ""}.</div>
      <div class="rv-pick" id="rv-ptst">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" aria-pressed="false" aria-label="${n} star${n === 1 ? "" : "s"}">★</button>`).join("")}</div>
      <label for="rv-pttx">A few words (optional)<textarea id="rv-pttx" maxlength="2000" rows="3" placeholder="What went well? Anything we could do better?"></textarea></label>
      <div class="actions"><button type="button" class="btn primary" id="rv-ptgo">Send my review</button></div>
      ${g || w ? `<div class="who">Or leave one where others can see it:</div><div class="actions rv-ptl">${linkBtns}</div>` : ""}</div>`;
  }
  function wirePortal(C) {
    const box = $("rv-ptst");
    let n = 0;
    if (box)
      box.querySelectorAll("button").forEach(
        (b) =>
          (b.onclick = () => {
            n = +b.dataset.v;
            box
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.v <= n)));
          }),
      );
    document.querySelectorAll(".rv-ptl a").forEach(
      (a) =>
        (a.onclick = () => {
          const t = (C.review && C.review.text) || ($("rv-pttx") ? $("rv-pttx").value.trim() : "");
          if (t)
            try {
              navigator.clipboard.writeText(t);
              toast("Your words are copied – paste them in");
            } catch (e) {}
        }),
    );
    if ($("rv-ptgo"))
      $("rv-ptgo").onclick = async () => {
        const text = $("rv-pttx").value.trim();
        if (!n && !text) {
          toast("Tap the stars or write a few words");
          return;
        }
        $("rv-ptgo").disabled = true;
        try {
          const review = { stars: n, text, at: Date.now(), job: (C.reviewAsk || {}).job || "" };
          await S.db.doc("portal/" + S.me).update({ review });
          S.client = Object.assign({}, S.client, { review });
          toast("Thank you!");
          render();
        } catch (e) {
          toast("Couldn't send. Check your signal.");
          $("rv-ptgo").disabled = false;
        }
      };
    if ($("rv-pthide"))
      $("rv-pthide").onclick = async () => {
        try {
          await S.db.doc("portal/" + S.me).update({ reviewHide: true });
          S.client = Object.assign({}, S.client, { reviewHide: true });
          render();
        } catch (e) {}
      };
  }
  return {
    all,
    ofClient,
    clientHtml,
    wireClient,
    edit,
    view,
    askInPortal,
    portalHtml,
    wirePortal,
    starsTxt,
    srcName,
  };
})();
