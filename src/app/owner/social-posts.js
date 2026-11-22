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
   straight to the accounts needs them linked on our own hosting (on the hosting list). */
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
      $("sp-share").innerHTML = places
        .map(
          (k) =>
            `<button type="button" class="btn sp-go" data-k="${k}">📤 Share to ${esc(placeName(k))}</button><button type="button" class="pillbtn sp-cp" data-k="${k}">📋 Copy</button>`,
        )
        .join("");
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
    async function save(status) {
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
        status: status === "posted" || old.status === "posted" ? "posted" : "draft",
        postedTo:
          status === "posted"
            ? [...new Set((old.postedTo || []).concat(pre._to || []))]
            : old.postedTo || [],
        postedAt: status === "posted" ? Date.now() : old.postedAt || 0,
        created: old.created || Date.now(),
      };
      await S.db.doc("todos/" + id).set(rec);
      S.socialPosts = (S.socialPosts || [])
        .filter((x) => x.id !== id)
        .concat([Object.assign({ id }, rec)]);
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
        a.href = p[2];
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
      <div class="actions"><button type="button" class="btn primary" id="sp-new">✨ Make a post</button><button type="button" class="btn" id="sp-ideas">💡 Ideas for posts</button></div>
      <div class="who">${thisMonth} posted this month · ${L.filter((p) => p.status !== "posted").length} draft${L.filter((p) => p.status !== "posted").length === 1 ? "" : "s"}</div>
      ${
        L.map((p) => {
          const t = (p.texts || {})[(p.places || [])[0]] || p.detail || "";
          return `<button type="button" class="sp-row" data-id="${esc(p.id)}">${(p.photos || [])[0] ? `<img src="${blobUrl(p.photos[0])}" alt="">` : '<span class="sp-noph">📣</span>'}<span class="sp-rw"><b>${esc(p.title || "Post")}</b><span class="who">${p.status === "posted" ? "✅ Posted " + esc(stamp(p.postedAt)) + " · " + esc((p.postedTo || p.places || []).map(placeName).join(", ")) : "📝 Draft · " + esc((p.places || []).map(placeName).join(", "))}</span><span class="sp-snip">${esc(String(t).slice(0, 140))}</span></span></button>`;
        }).join("") ||
        '<div class="empty"><strong>No posts yet</strong>Tap ✨ Make a post. Finished jobs and good reviews make the best ones.</div>'
      }</div>`);
    $("sp-new").onclick = () => {
      closeViewer();
      compose();
    };
    $("sp-ideas").onclick = ideas;
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
  return { view, compose, fromReview };
})();
