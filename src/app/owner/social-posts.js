/* ================= SOCIAL POSTS: Claude helps write posts for Facebook, Instagram, LinkedIn and Google, with the job's photos ================= */
import { REVIEWS } from "../clients/reviews.js";
import { coTown } from "../core/company-names.js";
import { $, esc, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, siteNames } from "../core/state.js";
import { closeViewer, openViewer } from "../core/viewer.js";
import { blobUrl, uploadErr, uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { coData } from "./company-details.js";
import { BIN_DAYS } from "./deleted-items.js";
import { siteRec } from "../photos/photos.js";
import { shrinkImage } from "../safety/training.js";
import { siteLabel } from "../sites/job-details.js";
import { loadSitePhotos, sitePhotosFor } from "../sites/trade-sites.js";
export { SOCIAL };
/* James (Nov 2026): "Social media suite - AI to help do and make posts". 📣 Social media posts (Jobs & clients ›
   Clients): pick what the post is about (a finished job, a review, a tip, an offer, "we're hiring", or his own words),
   tick photos from the site or add some, choose where it goes – Claude writes a post for each place in the firm's
   voice (never the client's name or full address). He edits it, then 📤 Share hands the words and photos to the
   Facebook / Instagram app on the iPad (the phone's own share sheet), or 📋 Copy. Each post is kept in todos
   { kind:"socialpost", about, title, texts {platform: text}, photos [assetIds], site, reviewId, status draft|posted,
   postedAt, created }, so he can see what went out and when. 💡 Ideas asks Claude for posts from recent work. Posting
   straight to the accounts: 🔗 Linked accounts (James, Nov 2026: "can that be made to be able to link to the different
   social media"). On our own hosting window.claude.use("social") (owner only) links each account and posts now or
   at a set time – the server keeps the sign-ins, never the app or the database (docs/specs/social-linking.md, for
   Jasper). Where it isn't there (claude.ai, or not set up yet) the page says so and 📤 Share is used. The firm's own
   page addresses are kept in settings/app.socialPages { platform: url }; 📤 Share opens them. */
const SOCIAL = (() => {
  const PLACES = [
    ["facebook", "Facebook", "https://www.facebook.com/"],
    ["instagram", "Instagram", "https://www.instagram.com/"],
    ["linkedin", "LinkedIn", "https://www.linkedin.com/feed/"],
    ["google", "Google profile", "https://business.google.com/"],
  ];
  const ABOUT = [
    ["job", "🏗 A finished job"],
    ["progress", "🚧 Work in progress"],
    ["review", "⭐ A review"],
    ["tip", "💡 A tip or advice"],
    ["offer", "🏷 An offer or opening"],
    ["hiring", "👷 We're hiring"],
    ["own", "✍️ My own words"],
  ];
  const placeName = (k) => (PLACES.find((x) => x[0] === k) || [0, k])[1];
  /* the linked accounts (our own hosting only) */
  let svc = null;
  let linked = {};
  async function refreshLinked() {
    svc = null;
    linked = {};
    try {
      svc = await window.claude.use("social");
    } catch (e) {}
    if (svc)
      try {
        linked = (await svc.status()) || {};
      } catch (e) {
        /* the server hasn't got it set up yet: as if it weren't there */
        svc = null;
        linked = {};
      }
    return linked;
  }
  const isLinked = (k) => !!(svc && linked[k] && linked[k].linked);
  const pages = () => (S.settings || {}).socialPages || {};
  const failTxt = (e) =>
    e && e.code === "not_linked"
      ? "That account isn't linked any more – link it again in 🔗 Linked accounts"
      : e && e.message
        ? String(e.message).slice(0, 160)
        : "Couldn't post it. Check your signal and try again.";
  /* 🔗 Linked accounts: link or unlink each one, and each page's address */
  async function links() {
    await refreshLinked();
    const pg = pages();
    openSheet(
      `<h3 id="sheettitle">🔗 Linked accounts</h3>
      ${svc ? '<div class="who">Link each account once. Then a post goes straight from here, now or at a time you pick.</div>' : '<div class="notice">Linking works on the hosted site (sitehq.jevul.com) once it has been set up there. Until then, 📤 Share sends a post through the Facebook or Instagram app on this iPad.</div>'}
      <div class="sp-links">${PLACES.map(([k, l]) => {
        const st = linked[k] || {};
        return `<div class="sp-link"><div class="sp-lw"><b>${esc(l)}</b><span class="who">${st.linked ? "✅ Linked" + (st.name ? " as " + esc(st.name) : "") : "Not linked yet"}</span>${svc ? `<button type="button" class="btn${st.linked ? "" : " primary"} sp-lk" data-k="${k}" data-on="${st.linked ? 1 : 0}">${st.linked ? "Unlink" : "Link"}</button>` : ""}</div>
          <label for="sp-pg-${k}">Your ${esc(l)} page's web address (optional)<input id="sp-pg-${k}" class="sp-pg" data-k="${k}" maxlength="300" value="${esc(pg[k] || "")}" placeholder="https://…"></label></div>`;
      }).join("")}</div>
      ${formFoot(false, "Save")}`,
      async () => {
        const socialPages = {};
        let bad = "";
        document.querySelectorAll(".sp-pg").forEach((i) => {
          const v = i.value.trim();
          if (v && !/^https?:\/\//i.test(v)) bad = placeName(i.dataset.k);
          if (v) socialPages[i.dataset.k] = v;
        });
        if (bad) {
          showErr("The " + bad + " address should start with https://");
          return;
        }
        try {
          await S.db.doc("settings/app").update({ socialPages });
          S.settings = Object.assign({}, S.settings, { socialPages });
          closeForm();
          toast("Saved");
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
        }
      },
    );
    document.querySelectorAll(".sp-lk").forEach(
      (b) =>
        (b.onclick = async () => {
          const k = b.dataset.k;
          b.disabled = true;
          try {
            if (b.dataset.on === "1") {
              await svc.disconnect(k);
              toast(placeName(k) + " unlinked");
              closeForm();
              links();
            } else {
              /* the server gives the page where he signs in to that account and says yes; it comes back to the app after */
              const r = await svc.connect(k);
              if (r && r.url) window.location.assign(r.url);
              else {
                closeForm();
                links();
              }
            }
          } catch (e) {
            toast(failTxt(e));
            b.disabled = false;
          }
        }),
    );
  }
  const posts = () =>
    (S.socialPosts || [])
      .slice()
      .sort((a, b) => (b.postedAt || b.created || 0) - (a.postedAt || a.created || 0));
  async function claude() {
    try {
      return await window.claude.use("sample");
    } catch (e) {
      return null;
    }
  }
  function firmLine() {
    const co = coData();
    return `${co.name}${coTown() ? ", a building firm in " + coTown() : ", a UK building firm"}${co.workArea ? " (works in " + co.workArea + ")" : ""}${co.website ? ". Website: " + co.website : ""}${co.phone || co.mobile ? ". Phone: " + (co.phone || co.mobile) : ""}`;
  }
  /* Claude writes a post for each place; falls back to a plain one if Claude isn't there */
  async function write(o) {
    const sample = await claude();
    const pl = o.places.length ? o.places : ["facebook"];
    if (!sample) {
      const t = (o.detail || "").trim() || "Another job finished.";
      return Object.fromEntries(
        pl.map((k) => [
          k,
          t + "\n\n" + coData().name + (coData().phone ? " · " + coData().phone : ""),
        ]),
      );
    }
    const j = await sample.json(
      `Write social media posts for ${firmLine()}.
What the post is about: ${(ABOUT.find((x) => x[0] === o.about) || ABOUT[0])[1].replace(/^\S+\s/, "")}.
Details from the owner: ${o.detail || "(none)"}
${o.site ? "Where: the job was in " + o.town + " (do not give the street or house number)." : ""}
${o.photos ? o.photos + " photo" + (o.photos === 1 ? "" : "s") + " will go with it." : "No photos."}
Tone: ${o.tone || "friendly and proud of the work, down to earth"}.
Rules: UK English. Never use the client's surname or full address – first name only if it's a review, and only if given. Don't invent facts, prices or dates that aren't in the details. Keep it honest and specific. A short call to action at the end (ask for a quote, visit the website or call).
Write one post for each of: ${pl.map(placeName).join(", ")}. Facebook: 2–4 short paragraphs, 1–3 emoji at most. Instagram: punchy, line breaks, then 8–15 relevant local and trade hashtags on the last line. LinkedIn: professional, no more than 2 hashtags. Google profile: under 1,200 characters, no hashtags.
Reply with JSON only: {${pl.map((k) => `"${k}":"post text"`).join(",")}}`,
      { modelTier: "default" },
    );
    const out = {};
    pl.forEach((k) => {
      out[k] = String((j && j[k]) || "").trim();
    });
    return out;
  }
  /* the post maker */
  function compose(pre) {
    pre = pre || {};
    const sites = siteNames();
    let photos = (pre.photos || []).slice();
    let places = pre.places || ["facebook", "instagram"];
    let about = pre.about || "job";
    let texts = Object.assign({}, pre.texts || {});
    const id = pre.id || "sp-" + newId();
    const thumbs = () =>
      photos
        .map(
          (a, i) =>
            `<span class="sp-th"><img src="${blobUrl(a)}" alt="Photo ${i + 1}"><button type="button" class="sp-thx" data-i="${i}" aria-label="Take this photo off">✕</button></span>`,
        )
        .join("") || '<span class="who">No photos yet.</span>';
    const textBoxes = () =>
      places
        .map(
          (k) =>
            `<label for="sp-t-${k}">${esc(placeName(k))}<textarea id="sp-t-${k}" class="sp-tx" data-k="${k}" rows="7" maxlength="5000" placeholder="Tap ✨ Write it for me, or type your own">${esc(texts[k] || "")}</textarea></label>`,
        )
        .join("");
    openSheet(
      `<h3 id="sheettitle">📣 ${pre.id ? "Your post" : "Make a post"}</h3>
      <div><div class="flabel">What's it about?</div><div class="seg sp-about" id="sp-about">${ABOUT.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${about === k}">${l}</button>`).join("")}</div></div>
      <label for="sp-site">Which job (optional)<select id="sp-site"><option value="">Not one job</option>${sites.map((n) => `<option value="${esc(n)}" ${pre.site === n ? "selected" : ""}>${esc(siteLabel(n))}</option>`).join("")}</select></label>
      <label for="sp-detail">Tell Claude about it<textarea id="sp-detail" rows="4" maxlength="2000" placeholder="e.g. Single-storey rear extension, bifolds, vaulted ceiling with roof lights. Took 10 weeks. Client over the moon.">${esc(pre.detail || "")}</textarea></label>
      <div><div class="flabel">Photos</div><div class="sp-ths" id="sp-ths">${thumbs()}</div>
      <div class="actions"><button type="button" class="btn" id="sp-fromsite">📷 From the job's photos</button></div><label for="sp-add">Or add photos<input type="file" id="sp-add" accept="image/*" multiple></label></div>
      <div><div class="flabel">Where it goes</div><div class="seg" id="sp-pl">${PLACES.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${places.includes(k)}">${l}</button>`).join("")}</div></div>
      <div class="actions"><button type="button" class="btn primary" id="sp-ai">✨ Write it for me</button></div>
      <div id="sp-texts">${textBoxes()}</div>
      <div class="actions sp-share" id="sp-share"></div>
      ${formFoot(!!pre.id, "Save draft")}`,
      async () => {
        await save("draft");
        closeForm();
        toast("Draft saved");
        view();
      },
      "sp-detail",
    );
    const keepTexts = () =>
      document.querySelectorAll(".sp-tx").forEach((t) => {
        texts[t.dataset.k] = t.value;
      });
    const drawShare = () => {
      const on = places.filter(isLinked);
      $("sp-share").innerHTML =
        places
          .map((k) =>
            isLinked(k)
              ? `<button type="button" class="btn primary sp-now" data-k="${k}">🚀 Post to ${esc(placeName(k))} now</button><button type="button" class="pillbtn sp-cp" data-k="${k}">📋 Copy</button>`
              : `<button type="button" class="btn sp-go" data-k="${k}">📤 Share to ${esc(placeName(k))}</button><button type="button" class="pillbtn sp-cp" data-k="${k}">📋 Copy</button>`,
          )
          .join("") +
        (on.length
          ? `<div class="sp-sched"><label for="sp-when">🕒 Or post later (${esc(on.map(placeName).join(", "))})<input id="sp-when" type="datetime-local"></label><button type="button" class="btn" id="sp-later">Schedule it</button></div>`
          : "");
      $("sp-share")
        .querySelectorAll(".sp-now")
        .forEach((b) => (b.onclick = () => postVia([b.dataset.k], 0, b)));
      if ($("sp-later"))
        $("sp-later").onclick = () => {
          const at = new Date($("sp-when").value).getTime();
          if (!at || at < Date.now() + 60000) {
            toast("Pick a time from now on");
            return;
          }
          postVia(on, at, $("sp-later"));
        };
      $("sp-share")
        .querySelectorAll(".sp-cp")
        .forEach(
          (b) =>
            (b.onclick = async () => {
              keepTexts();
              try {
                await navigator.clipboard.writeText(texts[b.dataset.k] || "");
                toast("Copied – paste it in " + placeName(b.dataset.k));
              } catch (e) {
                toast("Couldn't copy");
              }
            }),
        );
      $("sp-share")
        .querySelectorAll(".sp-go")
        .forEach((b) => (b.onclick = () => share(b.dataset.k)));
    };
    const redraw = () => {
      keepTexts();
      $("sp-texts").innerHTML = textBoxes();
      drawShare();
    };
    const drawThumbs = () => {
      $("sp-ths").innerHTML = thumbs();
      $("sp-ths")
        .querySelectorAll(".sp-thx")
        .forEach(
          (b) =>
            (b.onclick = () => {
              photos.splice(+b.dataset.i, 1);
              drawThumbs();
            }),
        );
    };
    drawThumbs();
    drawShare();
    refreshLinked().then(() => {
      if ($("sp-share")) drawShare();
    });
    $("sp-about")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            about = b.dataset.v;
            $("sp-about")
              .querySelectorAll("button")
              .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          }),
      );
    $("sp-pl")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const on = b.getAttribute("aria-pressed") !== "true";
            if (!on && places.length === 1) return;
            b.setAttribute("aria-pressed", String(on));
            places = PLACES.map((x) => x[0]).filter(
              (k) =>
                $("sp-pl").querySelector(`[data-v="${k}"]`).getAttribute("aria-pressed") === "true",
            );
            redraw();
          }),
      );
    $("sp-add").onchange = async (e) => {
      const fs = [...(e.target.files || [])];
      e.target.value = "";
      for (const f of fs.slice(0, 10)) {
        try {
          toast("Adding the photo…");
          const a = await uploadFile(await shrinkImage(f, 2000), f.name || "photo.jpg");
          photos.push(a.id);
        } catch (x) {
          toast(uploadErr(x));
        }
      }
      drawThumbs();
    };
    $("sp-fromsite").onclick = async () => {
      const site = $("sp-site").value;
      if (!site) {
        toast("Choose the job first");
        return;
      }
      toast("Finding the photos…");
      await loadSitePhotos();
      const L = (sitePhotosFor(site) || []).slice(0, 60);
      if (!L.length) {
        toast("No photos for that job yet");
        return;
      }
      const d = document.createElement("div");
      d.className = "dimask";
      d.style.zIndex = "120";
      d.innerHTML = `<div class="dimbox sp-pick" role="dialog" aria-label="Choose photos"><b>📷 ${esc(siteLabel(site))}</b><div class="who">Tap the photos to use (up to 10).</div><div class="sp-grid">${L.map((p) => `<button type="button" class="sp-gp" data-a="${esc(p.assetId)}" aria-pressed="${photos.includes(p.assetId)}"><img src="${blobUrl(p.assetId)}" alt="${esc(p.caption || "Site photo")}"></button>`).join("")}</div><div class="dimbtns"><button type="button" class="btn primary sp-gok">Use these</button></div></div>`;
      document.body.appendChild(d);
      d.querySelectorAll(".sp-gp").forEach(
        (b) =>
          (b.onclick = () =>
            b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))),
      );
      d.querySelector(".sp-gok").onclick = () => {
        const picked = [...d.querySelectorAll('.sp-gp[aria-pressed="true"]')].map(
          (b) => b.dataset.a,
        );
        photos = photos
          .filter((a) => !L.some((p) => p.assetId === a))
          .concat(picked)
          .slice(0, 10);
        d.remove();
        drawThumbs();
      };
    };
    $("sp-ai").onclick = async () => {
      const b = $("sp-ai");
      const site = $("sp-site").value;
      b.disabled = true;
      b.textContent = "✨ Writing…";
      try {
        const sr = site ? siteRec(site) || {} : {};
        /* the town only – the last part of the address, without a postcode or house number */
        const parts = String(site)
          .split(",")
          .map((x) => x.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i, "").trim())
          .filter(Boolean);
        const last = parts.length > 1 ? parts[parts.length - 1] : "";
        const town = sr.town || (/\d/.test(last) ? "" : last) || coTown();
        texts = Object.assign(
          texts,
          await write({
            about,
            detail: $("sp-detail").value.trim(),
            site,
            town,
            photos: photos.length,
            places,
          }),
        );
        $("sp-texts").innerHTML = textBoxes();
        drawShare();
      } catch (e) {
        toast(
          e && e.code === "not_granted"
            ? "Claude isn't allowed for this app"
            : "Couldn't write it just now. Try again.",
        );
      }
      b.disabled = false;
      b.textContent = "✨ Write it again";
    };
    async function save(status, extra) {
      keepTexts();
      const old = (S.socialPosts || []).find((x) => x.id === id) || {};
      const rec = {
        kind: "socialpost",
        about,
        title: (
          $("sp-detail").value.trim() || (ABOUT.find((x) => x[0] === about) || ABOUT[0])[1]
        ).slice(0, 80),
        detail: $("sp-detail").value.trim(),
        site: $("sp-site").value,
        texts,
        places,
        photos,
        reviewId: pre.reviewId || old.reviewId || "",
        status:
          status === "posted" || old.status === "posted"
            ? "posted"
            : status === "scheduled" || old.status === "scheduled"
              ? "scheduled"
              : "draft",
        postedTo:
          status === "posted"
            ? [...new Set((old.postedTo || []).concat(pre._to || []))]
            : old.postedTo || [],
        postedAt: status === "posted" ? Date.now() : old.postedAt || 0,
        created: old.created || Date.now(),
        postIds: old.postIds || {},
        scheduledAt: old.scheduledAt || 0,
        scheduleId: old.scheduleId || "",
      };
      if (extra)
        Object.assign(rec, extra, { postIds: Object.assign({}, rec.postIds, extra.postIds || {}) });
      await S.db.doc("todos/" + id).set(rec);
      S.socialPosts = (S.socialPosts || [])
        .filter((x) => x.id !== id)
        .concat([Object.assign({ id }, rec)]);
    }
    /* straight to the linked accounts, now (at = 0) or later */
    async function postVia(ks, at, btn) {
      keepTexts();
      if (ks.some((k) => !String(texts[k] || "").trim())) {
        toast("Write the post first");
        return;
      }
      const was = btn.textContent;
      btn.disabled = true;
      btn.textContent = at ? "Scheduling…" : "Posting…";
      try {
        const r =
          (await svc.post({
            platforms: ks,
            texts: Object.fromEntries(ks.map((k) => [k, texts[k]])),
            photos,
            at: at || 0,
          })) || {};
        if (at) {
          await save("scheduled", { scheduledAt: at, scheduleId: r.scheduled || "" });
          toast("Scheduled for " + stamp(at));
          closeForm();
          view();
          return;
        }
        const res = r.results || {};
        const okK = ks.filter((k) => res[k] && res[k].ok);
        const bad = ks.filter((k) => !(res[k] && res[k].ok));
        if (okK.length) {
          pre._to = okK;
          await save("posted", {
            postIds: Object.fromEntries(
              okK.map((k) => [k, { id: res[k].id || "", url: res[k].url || "" }]),
            ),
          });
        }
        toast(
          (okK.length ? "Posted to " + okK.map(placeName).join(", ") : "") +
            (bad.length
              ? (okK.length ? " · " : "") + placeName(bad[0]) + ": " + failTxt(res[bad[0]] || {})
              : ""),
        );
      } catch (e) {
        toast(failTxt(e));
      }
      btn.disabled = false;
      btn.textContent = was;
    }
    async function share(k) {
      keepTexts();
      const text = texts[k] || "";
      if (!text.trim()) {
        toast("Write the post first");
        return;
      }
      let files = [];
      try {
        for (const a of photos) {
          const bl = await getFileBlob(a);
          if (bl)
            files.push(
              new File([bl], "photo-" + (files.length + 1) + ".jpg", {
                type: bl.type || "image/jpeg",
              }),
            );
        }
      } catch (e) {}
      let done = false;
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {}
      try {
        if (navigator.share) {
          const data =
            files.length && navigator.canShare && navigator.canShare({ files })
              ? { text, files }
              : { text };
          await navigator.share(data);
          done = true;
        }
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
      if (!done) {
        const p = PLACES.find((x) => x[0] === k);
        const a = document.createElement("a");
        a.href = pages()[k] || p[2];
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast("The words are copied – paste them into " + placeName(k));
      }
      pre._to = [k];
      try {
        await save("posted");
        toast("Noted as posted to " + placeName(k));
      } catch (e) {}
    }
    if (pre.id)
      armDelete(async () => {
        try {
          await S.db.doc("todos/" + id).delete();
          S.socialPosts = (S.socialPosts || []).filter((x) => x.id !== id);
          closeForm();
          toast("Deleted · in Setup › Deleted items for " + BIN_DAYS + " days");
          view();
        } catch (e) {
          showErr("Couldn't delete");
        }
      });
  }
  /* from a review: the review's words, first name only */
  function fromReview(r) {
    closeViewer();
    const first =
      String(r.clientName || "")
        .trim()
        .split(/\s+/)[0] || "";
    compose({
      about: "review",
      site: r.site || "",
      reviewId: r.id,
      detail: `${r.stars ? r.stars + "-star review" : "Review"}${first ? " from " + first : ""}${r.job ? " for their " + r.job : ""}${r.text ? ': "' + r.text + '"' : ""}`,
    });
  }
  /* 💡 ideas from recent work */
  async function ideas() {
    const sample = await claude();
    if (!sample) {
      toast("Claude isn't available on this device");
      return;
    }
    toast("Asking Claude for ideas…");
    const done = (S.clients || [])
      .filter((c) => c.stage === "done")
      .slice(-8)
      .map((c) => c.jobName || c.work)
      .filter(Boolean);
    const live = siteNames().slice(0, 10).map(siteLabel);
    const rv = REVIEWS.all()
      .slice(0, 5)
      .map((r) => (r.stars ? r.stars + "★ " : "") + String(r.text || "").slice(0, 120));
    let j = null;
    try {
      j = await sample.json(
        `Suggest 6 social media post ideas for ${firmLine()}. Month: ${new Date().toLocaleDateString("en-GB", { month: "long" })}.
Recently finished: ${done.join("; ") || "unknown"}. Jobs on now: ${live.join("; ") || "unknown"}. Recent reviews: ${rv.join(" | ") || "none"}.
Mix finished work, work in progress, seasonal home tips, reviews and the team. UK English, practical. Never use client names or addresses.
Reply with JSON only: {"ideas":[{"about":"job|progress|review|tip|offer|hiring","title":"short title","detail":"two sentences of what to say"}]}`,
        { modelTier: "default" },
      );
    } catch (e) {
      toast("Couldn't get ideas just now");
      return;
    }
    const L = ((j && j.ideas) || []).filter((x) => x && x.title).slice(0, 8);
    if (!L.length) {
      toast("No ideas came back – try again");
      return;
    }
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "120";
    d.innerHTML = `<div class="dimbox sp-ideas" role="dialog" aria-label="Post ideas"><b>💡 Post ideas</b>${L.map((x, i) => `<button type="button" class="sp-idea" data-i="${i}"><b>${esc(x.title)}</b><span class="who">${esc(x.detail || "")}</span></button>`).join("")}<div class="dimbtns"><button type="button" class="btn sp-ix">Close</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".sp-ix").onclick = () => d.remove();
    d.querySelectorAll(".sp-idea").forEach(
      (b) =>
        (b.onclick = () => {
          const x = L[+b.dataset.i];
          d.remove();
          closeViewer();
          compose({
            about: ABOUT.some((a) => a[0] === x.about) ? x.about : "own",
            detail: x.title + ". " + (x.detail || ""),
          });
        }),
    );
  }
  function view() {
    const L = posts();
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = L.filter(
      (p) => p.status === "posted" && new Date(p.postedAt).toISOString().slice(0, 7) === month,
    ).length;
    openViewer(`<div class="sp-page"><div class="vhead"><b>📣 Social media posts</b></div>
      <div class="who">Claude writes the post from a job, a review or your own words; you check it, then share it with the photos to Facebook, Instagram, LinkedIn or your Google profile.</div>
      <div class="actions"><button type="button" class="btn primary" id="sp-new">✨ Make a post</button><button type="button" class="btn" id="sp-ideas">💡 Ideas for posts</button><button type="button" class="btn" id="sp-links">🔗 Linked accounts</button></div>
      <div class="who">${thisMonth} posted this month · ${L.filter((p) => p.status !== "posted").length} draft${L.filter((p) => p.status !== "posted").length === 1 ? "" : "s"}</div>
      ${
        L.map((p) => {
          const t = (p.texts || {})[(p.places || [])[0]] || p.detail || "";
          return `<button type="button" class="sp-row" data-id="${esc(p.id)}">${(p.photos || [])[0] ? `<img src="${blobUrl(p.photos[0])}" alt="">` : '<span class="sp-noph">📣</span>'}<span class="sp-rw"><b>${esc(p.title || "Post")}</b><span class="who">${p.status === "posted" ? "✅ Posted " + esc(stamp(p.postedAt)) + " · " + esc((p.postedTo || p.places || []).map(placeName).join(", ")) : p.status === "scheduled" ? "🕒 Scheduled for " + esc(stamp(p.scheduledAt)) + " · " + esc((p.places || []).map(placeName).join(", ")) : "📝 Draft · " + esc((p.places || []).map(placeName).join(", "))}</span><span class="sp-snip">${esc(String(t).slice(0, 140))}</span></span></button>`;
        }).join("") ||
        '<div class="empty"><strong>No posts yet</strong>Tap ✨ Make a post. Finished jobs and good reviews make the best ones.</div>'
      }</div>`);
    $("sp-new").onclick = () => {
      closeViewer();
      compose();
    };
    $("sp-ideas").onclick = ideas;
    $("sp-links").onclick = () => {
      closeViewer();
      links();
    };
    document.querySelectorAll(".sp-row").forEach(
      (b) =>
        (b.onclick = () => {
          const p = (S.socialPosts || []).find((x) => x.id === b.dataset.id);
          if (!p) return;
          closeViewer();
          compose(p);
        }),
    );
  }
  return { view, compose, fromReview, links };
})();
