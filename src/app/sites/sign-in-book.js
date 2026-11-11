/* ================= SITE SIGN-IN BOOK: timesheet check-ins fill it automatically; other-company / agency people sign in and out here instead ================= */
import { lastOf, pickField, pickVal, wirePicks } from "../core/fields.js";
import { $, esc, iso, pad, shortDay, stamp, toast } from "../core/helpers.js";
import { armDelete, closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, ownerMode, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { pdfShow } from "../drawing/paving.js";
import { newId, submitJob } from "../files/outbox.js";
import { coData } from "../owner/company-details.js";
import { BIN_DAYS } from "../owner/deleted-items.js";
import { nameOf, teamIds } from "../owner/owner.js";
import { tlOn } from "../owner/trade-look.js";
import { EMP_TYPES } from "../people/employment-types.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf } from "../safety/site-inductions.js";
import { empTypeOf } from "./job-details.js";
import { QRSITE } from "./qr-sign-in.js";
import { openRollCall } from "./roll-call.js";
import { myName } from "../survey/door-window-survey.js";
import { checkIn, checkOut, openEntry } from "../timesheets/time.js";
export { SIGNIN, signOnly };
const signOnly = (id) => {
  if (id === S.me && !ownerMode()) return !!(S.myProfile && S.myProfile.signInOnly);
  return !!((S.team || {})[id] && S.team[id].signInOnly);
};
const SIGNIN = (() => {
  const nowHM2 = () => {
    const d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  const compOf = (id) => {
    const d = (S.team[id] && S.team[id].details) || {};
    return d.company || EMP_TYPES[empTypeOf(id)] || "";
  };
  const gName = (x) =>
    String((x.guest && x.guest.name) || "Visitor")
      .replace(/\s+/g, " ")
      .trim();
  const sinsOf = (id) => (id === S.me ? S.mine.signins || [] : (S.data.signins || {})[id] || []);
  /* the plain sign-in book (no timesheet check-in) for sign-in-only people, and for every trade in the new look,
   where the trades don't see timesheets (James, Nov 2026) */
  const siPlain = () => signOnly(S.me) || tlOn();
  /* every sign-in row for a date: from timesheets (automatic) and from the sign-in tab */
  function rows(date) {
    const out = [];
    const ids = teamIds().concat(S.owner ? [S.me] : []);
    ids.forEach((id) => {
      ((id === S.me ? S.mine.entries : S.data.entries[id]) || [])
        .filter(
          (e) => e.type === "hours" && e.date === date && (e.checkIn || e.actualIn || e.start),
        )
        .forEach((e) =>
          out.push({
            who: id,
            site: e.job || "No site given",
            in: e.actualIn || e.start || "",
            out: e.open ? "" : e.actualOut || e.finish || "",
            open: !!e.open,
            src: "timesheet",
            id: e.id,
          }),
        );
      sinsOf(id)
        .filter((x) => x.date === date)
        .forEach((x) =>
          out.push(
            x.guest
              ? {
                  who: "px:" + gName(x),
                  owner: id,
                  guest: true,
                  comp: x.guest.company || x.guest.reason || "Visitor",
                  phone: x.guest.phone || "",
                  site: x.site || "No site given",
                  in: x.in || "",
                  out: x.out || "",
                  open: !!x.open,
                  src: "signin",
                  id: x.id,
                  by: x.byName || "",
                }
              : {
                  who: id,
                  site: x.site || "No site given",
                  in: x.in || "",
                  out: x.out || "",
                  open: !!x.open,
                  src: "signin",
                  id: x.id,
                  by: x.byName || "",
                },
          ),
        );
    });
    return out.sort(
      (a, b) =>
        (a.site || "").localeCompare(b.site || "") || (a.in || "").localeCompare(b.in || ""),
    );
  }
  /* open sign-ins also count as "on site now" for the roll call */
  function openToday() {
    const t = iso(new Date());
    const out = [];
    teamIds()
      .concat(S.owner ? [S.me] : [])
      .forEach((id) =>
        sinsOf(id)
          .filter((x) => x.open && x.date === t)
          .forEach((x) =>
            out.push(
              x.guest
                ? {
                    who: "px:" + gName(x),
                    guest: true,
                    phone: x.guest.phone || "",
                    job: x.site,
                    start: x.in,
                    actualIn: x.in,
                    open: true,
                    signin: true,
                  }
                : { who: id, job: x.site, start: x.in, actualIn: x.in, open: true, signin: true },
            ),
          ),
      );
    return out;
  }
  async function signIn(site, who, time, guest) {
    who = who || S.me;
    const id = newId();
    const now = Date.now();
    const t = time || nowHM2();
    const data = {
      site,
      date: iso(new Date()),
      in: t,
      out: "",
      open: true,
      inAt: now,
      by: guest ? "owner" : who === S.me ? "self" : "owner",
      byName: myName(),
      created: now,
    };
    if (guest) data.guest = guest;
    if (who === S.me) {
      S.mine.signins = (S.mine.signins || []).concat([Object.assign({ id }, data)]);
      render();
      const r = await submitJob({ coll: "signins", docId: id, data });
      toast(
        (guest ? guest.name + " " : "") +
          (r === "queued" ? "Signed in (sends when you have signal)" : "Signed in at " + t),
      );
      return id;
    } else {
      await S.db.doc("sheets/" + who + "/signins/" + id).set(data);
      S.data.signins = S.data.signins || {};
      S.data.signins[who] = (S.data.signins[who] || []).concat([Object.assign({ id }, data)]);
      toast(nameOf(who) + " signed in at " + t);
      return id;
    }
  }
  async function signOut(x, who, time) {
    who = who || S.me;
    const t = time || nowHM2();
    const data = Object.assign({}, x, { out: t, open: false, outAt: Date.now() });
    delete data.id;
    if (who === S.me) {
      S.mine.signins = (S.mine.signins || []).map((y) =>
        y.id === x.id ? Object.assign({ id: x.id }, data) : y,
      );
      render();
      const r = await submitJob({ coll: "signins", docId: x.id, data });
      toast(
        (x.guest ? gName(x) + " " : "") +
          (r === "queued" ? "Signed out (sends when you have signal)" : "Signed out at " + t),
      );
    } else {
      await S.db.doc("sheets/" + who + "/signins/" + x.id).set(data);
      S.data.signins[who] = (S.data.signins[who] || []).map((y) =>
        y.id === x.id ? Object.assign({ id: x.id }, data) : y,
      );
      toast(nameOf(who) + " signed out at " + t);
    }
  }
  /* change the times, site or date of a sign-in, or delete it (owner: anyone's; trades: their own) */
  function editDlg(x, who, after) {
    who = who || S.me;
    const g = x.guest;
    openSheet(
      `<h3 id="sheettitle">✎ Change sign-in</h3>${g ? guestFields(g) : who !== S.me ? `<div class="who">${esc(nameOf(who))}</div>` : ""}
    ${pickField("se-site", "Site", siteNames(), x.site || "", "e.g. 12 Marine Way, Exmouth")}
    <label for="se-date">Date<input type="date" id="se-date" value="${esc(x.date || iso(new Date()))}"></label>
    <div class="grid2"><label for="se-in">Time in<input type="time" id="se-in" value="${esc(x.in || "")}" required></label><label for="se-out">Time out (blank = still on site)<input type="time" id="se-out" value="${esc(x.out || "")}"></label></div>
    ${formFoot(true, "Save")}`,
      async () => {
        const site = pickVal("se-site"),
          date = $("se-date").value,
          tin = $("se-in").value,
          tout = $("se-out").value;
        if (!site) {
          showErr("Choose the site");
          return;
        }
        if (!tin) {
          showErr("Add the time in");
          return;
        }
        if (tout && tout < tin) {
          showErr("Time out is before time in");
          return;
        }
        const data = Object.assign({}, x, {
          site,
          date,
          in: tin,
          out: tout,
          open: !tout,
          edited: Date.now(),
          editedBy: myName(),
        });
        delete data.id;
        if (g) {
          const ng = guestVal();
          if (!ng.name) {
            showErr("Add their name");
            return;
          }
          data.guest = ng;
        }
        $("f-save").disabled = true;
        try {
          if (who === S.me && !ownerMode()) {
            S.mine.signins = (S.mine.signins || []).map((y) =>
              y.id === x.id ? Object.assign({ id: x.id }, data) : y,
            );
            await submitJob({ coll: "signins", docId: x.id, data });
          } else {
            await S.db.doc("sheets/" + who + "/signins/" + x.id).set(data);
            if (who === S.me)
              S.mine.signins = (S.mine.signins || []).map((y) =>
                y.id === x.id ? Object.assign({ id: x.id }, data) : y,
              );
            else
              S.data.signins[who] = (S.data.signins[who] || []).map((y) =>
                y.id === x.id ? Object.assign({ id: x.id }, data) : y,
              );
          }
          closeForm();
          toast("Saved");
          if (after) after();
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      "se-in",
    );
    armDelete(async () => {
      await delSignin(x, who);
      if (after) after();
    });
  }
  async function delSignin(x, who) {
    who = who || S.me;
    await S.db.doc("sheets/" + who + "/signins/" + x.id).delete();
    if (who === S.me) S.mine.signins = (S.mine.signins || []).filter((y) => y.id !== x.id);
    else S.data.signins[who] = (S.data.signins[who] || []).filter((y) => y.id !== x.id);
  }
  /* ---- the trade's tab ---- */
  function tradeView() {
    const today = iso(new Date());
    const mineS = (S.mine.signins || []).filter((x) => x.date === today);
    const openS = mineS.find((x) => x.open);
    const openT = !siPlain() && (S.mine.entries || []).find((e) => e.open && e.date === today);
    const last =
      ((S.mine.signins || []).slice().sort((a, b) => (b.inAt || 0) - (a.inAt || 0))[0] || {})
        .site || lastOf(S.mine.entries || [], () => true, "job");
    let h = `<div class="who" style="margin-bottom:8px">${siPlain() ? "Sign in when you arrive on site and sign out when you leave. This is the site's sign-in book, used for fire roll calls and health &amp; safety." : "Your timesheet check-in and check-out fill in the site sign-in book for you."}</div>`;
    if (openS)
      h += `<div class="checkin"><b>✅ Signed in at ${esc(openS.site)}</b><div class="who">Since ${esc(openS.in)} today</div><button class="btn danger big" type="button" id="si-out">Sign out now</button></div>`;
    else if (openT)
      h += `<div class="checkin"><b>✅ Signed in at ${esc(openT.job)}</b><div class="who">Since ${esc(openT.actualIn || openT.start)} today, from your timesheet check-in</div><button class="btn danger big" type="button" id="si-tout">Check out (signs you out too)</button></div>`;
    else
      h += `<div class="checkin"><b>📍 Sign in to site</b>${pickField("ci-site", "Site", siteNames(), last, "e.g. 12 Marine Way, Exmouth")}<button class="btn primary big" type="button" id="si-in">${siPlain() ? "Sign in now" : "Check in now (timesheet + sign-in)"}</button></div>`;
    const hist = (
      siPlain()
        ? []
        : (S.mine.entries || [])
            .filter((e) => e.type === "hours")
            .map((e) => ({
              d: e.date,
              site: e.job,
              in: e.actualIn || e.start,
              out: e.open ? "" : e.actualOut || e.finish,
              open: e.open,
              src: "t",
              id: e.id,
            }))
    )
      .concat(
        (S.mine.signins || []).map((x) => ({
          d: x.date,
          site: x.site,
          in: x.in,
          out: x.out,
          open: x.open,
          src: "s",
          id: x.id,
        })),
      )
      .sort((a, b) => (b.d + b.in).localeCompare(a.d + a.in))
      .slice(0, 20);
    h += `<div class="day" style="margin-top:12px"><div class="dayh"><span>Your recent sign-ins</span><span class="who">tap ✎ to change a time</span></div>${hist.map((x) => `<div class="citem"><span><b>${esc(shortDay(x.d))}</b> · ${esc(x.site || "")}<br><span class="who">${x.src === "t" ? "from your timesheet" : "signed in"}</span></span><span class="otime" style="display:flex;gap:6px;align-items:center">in <b>${esc(x.in || "")}</b>${x.open ? ' <span class="tag ok">On site</span>' : x.out ? ` · out <b>${esc(x.out)}</b>` : ""}<button type="button" class="iconbtn si-ed" data-src="${x.src}" data-id="${esc(x.id)}" aria-label="Change">✎</button></span></div>`).join("") || '<div class="nothing">Nothing yet.</div>'}</div>`;
    $("main").innerHTML = h;
    wirePicks($("main"));
    if ($("si-in"))
      $("si-in").onclick = async () => {
        const site = pickVal("ci-site");
        if (!site) {
          toast("Choose the site first");
          return;
        }
        if (siPlain()) await signIn(site);
        else await checkIn();
      };
    if ($("si-out")) $("si-out").onclick = () => signOut(openS);
    if ($("si-tout")) $("si-tout").onclick = () => checkOut(openT);
    $("main")
      .querySelectorAll(".si-ed")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (b.dataset.src === "t") {
              const e = (S.mine.entries || []).find((y) => y.id === b.dataset.id);
              if (e) openEntry("hours", e);
            } else {
              const x = (S.mine.signins || []).find((y) => y.id === b.dataset.id);
              if (x) editDlg(x, S.me);
            }
          }),
      );
  }
  /* ---- the owner's sign-in book ---- */
  function ownerView() {
    const date = S.f.sbDate || iso(new Date());
    const site = S.f.sbSite || "";
    const all = rows(date);
    const list = site ? all.filter((r) => r.site === site) : all;
    const sites = [...new Set(siteNames().concat(all.map((r) => r.site)))].sort();
    const by = {};
    list.forEach((r) => {
      (by[r.site] = by[r.site] || []).push(r);
    });
    const seen = new Set(all.map((r) => r.who));
    const missing = date === iso(new Date()) ? teamIds().filter((id) => !seen.has(id)) : [];
    let h = `<div class="actions" style="align-items:flex-end;flex-wrap:wrap"><label style="max-width:180px">Date<input type="date" id="sb-date" value="${date}"></label><label style="max-width:320px;flex:1">Site<select id="sb-site"><option value="">All sites</option>${sites.map((s) => `<option ${s === site ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label></div>
   <div class="actions" style="margin-top:8px"><button type="button" class="btn primary" id="sb-add">+ Sign someone in</button><button type="button" class="btn" id="sb-pdf">📄 Sign-in register PDF</button><button type="button" class="btn" id="sb-qr">⬇ Import QR sign-ins</button><button type="button" class="btn danger" id="sb-roll">Roll call</button></div>
   <div class="who" style="margin:8px 0">Timesheet check-ins appear here automatically. Use <b>+ Sign someone in</b> for anyone not on the app too – visitors, deliveries, inspectors, another firm's workers. People set to <b>sign in only</b> (other company / agency – change it on their page in Employees) sign in and out on their Sign in tab instead of doing timesheets.</div>`;
    h +=
      Object.keys(by)
        .sort()
        .map(
          (s) =>
            `<div class="day"><div class="dayh"><span>📍 ${esc(s)}</span><span class="sum">${by[s].length} · ${by[s].filter((r) => r.open).length} on site</span></div>${by[
              s
            ]
              .map((r) => {
                const w = r.owner || r.who,
                  cp = r.guest ? r.comp : compOf(r.who);
                return `<div class="citem"><span><b>${esc(nameOf(r.who))}</b>${cp ? ` <span class="who">· ${esc(cp)}</span>` : ""}${r.guest ? ' <span class="tag day">Not on the app</span>' : ""}<br><span class="who">${r.src === "timesheet" ? "⏱ from timesheet" : "📍 signed in" + (r.by && r.by !== nameOf(r.who) ? " by " + esc(r.by) : "")}${r.phone ? ` · <a href="tel:${esc(r.phone.replace(/\s+/g, ""))}">${esc(r.phone)}</a>` : ""}</span></span>
     <span class="otime" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">in <b>${esc(r.in)}</b>${r.open ? ' <span class="tag ok">On site</span>' : r.out ? ` · out <b>${esc(r.out)}</b>` : ""}${r.src === "signin" && r.open ? `<button type="button" class="pillbtn sb-out" data-w="${esc(w)}" data-id="${esc(r.id)}">Sign out</button>` : ""}<button type="button" class="iconbtn sb-ed" data-w="${esc(w)}" data-id="${esc(r.id)}" data-src="${r.src}" aria-label="Change the times">✎</button>${r.src === "signin" ? `<button type="button" class="iconbtn sb-del" data-w="${esc(w)}" data-id="${esc(r.id)}" aria-label="Delete" style="color:var(--danger)">🗑</button>` : ""}</span></div>`;
              })
              .join("")}</div>`,
        )
        .join("") ||
      `<div class="empty"><strong>Nobody signed in${date === iso(new Date()) ? " yet today" : " on " + esc(shortDay(date))}</strong>${site ? "on " + esc(site) : ""}</div>`;
    if (missing.length)
      h += `<div class="who" style="margin-top:8px">Not signed in today: ${missing.map((id) => esc(nameOf(id)) + (signOnly(id) ? " (sign-in only)" : "")).join(", ")}</div>`;
    $("main").innerHTML = h;
    $("sb-date").onchange = (e) => {
      S.f.sbDate = e.target.value;
      render();
    };
    $("sb-site").onchange = (e) => {
      S.f.sbSite = e.target.value;
      render();
    };
    $("sb-add").onclick = () => addDlg(site);
    if ($("sb-qr")) $("sb-qr").onclick = QRSITE.importDlg;
    $("sb-pdf").onclick = (e) => pdf(date, site, e.currentTarget);
    $("sb-roll").onclick = () => openRollCall();
    $("main")
      .querySelectorAll(".sb-out")
      .forEach(
        (b) =>
          (b.onclick = async () => {
            const x = sinsOf(b.dataset.w).find((y) => y.id === b.dataset.id);
            if (!x) return;
            b.disabled = true;
            try {
              await signOut(x, b.dataset.w);
              render();
            } catch (e) {
              toast("Couldn't save");
              b.disabled = false;
            }
          }),
      );
    $("main")
      .querySelectorAll(".sb-del")
      .forEach(
        (b) =>
          (b.onclick = async () => {
            if (b.dataset.armed !== "1") {
              b.dataset.armed = "1";
              b.textContent = "Sure?";
              return;
            }
            try {
              await delSignin({ id: b.dataset.id }, b.dataset.w);
              toast("Removed · in Deleted items for " + BIN_DAYS + " days");
              render();
            } catch (e) {
              toast("Couldn't delete");
            }
          }),
      );
    $("main")
      .querySelectorAll(".sb-ed")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const w = b.dataset.w;
            if (b.dataset.src === "timesheet") {
              const e = ((w === S.me ? S.mine.entries : S.data.entries[w]) || []).find(
                (y) => y.id === b.dataset.id,
              );
              if (e) openEntry("hours", e, w === S.me ? null : w);
            } else {
              const x = sinsOf(w).find((y) => y.id === b.dataset.id);
              if (x) editDlg(x, w);
            }
          }),
      );
  }
  function guestFields(g) {
    g = g || {};
    return `<div id="sa-guest"><label for="sa-gname">Their name<input id="sa-gname" maxlength="80" autocomplete="off" value="${esc(g.name || "")}" placeholder="e.g. Tom Baker"></label>
    <label for="sa-gco">Company or reason (optional)<input id="sa-gco" maxlength="80" autocomplete="off" value="${esc(g.company || "")}" placeholder="e.g. Building control, Travis Perkins delivery, ABC Scaffolding"></label>
    <label for="sa-gtel">Phone (optional – for the roll call)<input id="sa-gtel" type="tel" maxlength="30" autocomplete="off" value="${esc(g.phone || "")}"></label></div>`;
  }
  const guestVal = () => ({
    name: $("sa-gname").value.trim(),
    company: $("sa-gco").value.trim(),
    phone: $("sa-gtel").value.trim(),
  });
  function addDlg(site0) {
    const ids = teamIds();
    openSheet(
      `<h3 id="sheettitle">📍 Sign someone in</h3><div class="who">For someone without the app on them, who forgot, or who isn't on the app at all.</div>
    <label for="sa-who">Who<select id="sa-who">${ids.map((id) => `<option value="${esc(id)}">${esc(nameOf(id))}${compOf(id) ? " · " + esc(compOf(id)) : ""}</option>`).join("")}<option value="__guest" ${ids.length ? "" : "selected"}>✏️ Someone not on the list (type their name)</option></select></label>
    ${guestFields()}
    ${pickField("sa-site", "Site", siteNames(), site0 || "", "e.g. 12 Marine Way, Exmouth")}
    <div class="grid2"><label for="sa-in">Time in<input type="time" id="sa-in" value="${nowHM2()}"></label><label for="sa-out">Time out (if they've gone)<input type="time" id="sa-out"></label></div>
    ${formFoot(false, "Sign in")}`,
      async () => {
        let who = $("sa-who").value;
        const site = pickVal("sa-site"),
          tin = $("sa-in").value,
          tout = $("sa-out").value;
        let guest = null;
        if (who === "__guest") {
          guest = guestVal();
          if (!guest.name) {
            showErr("Type their name");
            return;
          }
          who = S.me;
        }
        if (!site) {
          showErr("Choose the site");
          return;
        }
        if (!tin) {
          showErr("Add the time in");
          return;
        }
        if (tout && tout < tin) {
          showErr("Time out is before time in");
          return;
        }
        $("f-save").disabled = true;
        try {
          const id = await signIn(site, who, tin, guest);
          if (tout) {
            const x = sinsOf(who).find((y) => y.id === id);
            if (x) await signOut(x, who, tout);
          }
          closeForm();
          render();
        } catch (e) {
          showErr("Couldn't save. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      "sa-who",
    );
    const sync = () => {
      $("sa-guest").hidden = $("sa-who").value !== "__guest";
      if (!$("sa-guest").hidden)
        setTimeout(() => {
          try {
            $("sa-gname").focus();
          } catch (e) {}
        }, 50);
    };
    $("sa-who").onchange = sync;
    sync();
  }
  async function pdf(date, site, btn) {
    const list = rows(date).filter((r) => !site || r.site === site);
    if (!list.length) {
      toast("Nobody signed in on that day");
      return;
    }
    const lab = btn && btn.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Making the PDF…";
    }
    try {
      await loadJsPdf();
      const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const W = 210,
        M = 14,
        co = coData(),
        BR = BRGB();
      let y = 0;
      const clean = (t) =>
        String(t || "")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[–—]/g, "-")
          .replace(/[^\x20-\x7E£·]/g, "");
      const T = (t, x, yy, sz, st, col) => {
        doc.setFont("helvetica", st || "normal");
        doc.setFontSize(sz);
        doc.setTextColor(...(col || [25, 22, 21]));
        doc.text(clean(t), x, yy);
      };
      doc.setFillColor(...BR);
      doc.rect(0, 0, W, 4, "F");
      await pdfLogo(doc, W - M, 8, 36, 16);
      const dl = new Date(date + "T12:00").toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      T(co.name.toUpperCase(), M, 13, 8, "bold", BR);
      T("Site sign-in register", M, 20, 15, "bold");
      T(dl + (site ? " · " + site : " · all sites"), M, 25.5, 9, "normal", [90, 80, 80]);
      y = 33;
      const cols = [
        ["Name", 46],
        ["Company", 38],
        ["Site", 54],
        ["In", 14],
        ["Out", 14],
        ["How", 16],
      ];
      const by = {};
      list.forEach((r) => {
        (by[r.site] = by[r.site] || []).push(r);
      });
      for (const s of Object.keys(by).sort()) {
        if (y > 262) {
          doc.addPage();
          y = 16;
        }
        T(s, M, y, 10, "bold", BR);
        y += 2;
        doc.setFillColor(240, 236, 234);
        doc.rect(M, y, W - 2 * M, 6, "F");
        let x = M;
        cols.forEach(([h, w]) => {
          T(h, x + 1.5, y + 4.2, 7.5, "bold", [80, 72, 70]);
          x += w;
        });
        y += 6;
        for (const r of by[s]) {
          if (y > 278) {
            doc.addPage();
            y = 16;
          }
          x = M;
          [
            nameOf(r.who),
            r.guest ? r.comp : compOf(r.who),
            r.site,
            r.in,
            r.open ? "on site" : r.out,
            r.src === "timesheet" ? "Timesheet" : r.guest ? "Visitor" : "Sign-in",
          ].forEach((v, i) => {
            doc.setFontSize(8.5);
            T(
              doc.splitTextToSize(clean(v), cols[i][1] - 3)[0] || "",
              x + 1.5,
              y + 4.4,
              8.5,
              i === 0 ? "bold" : "normal",
            );
            x += cols[i][1];
          });
          y += 6.4;
          doc.setDrawColor(225, 218, 214);
          doc.setLineWidth(0.2);
          doc.line(M, y, W - M, y);
        }
        y += 6;
      }
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        T(
          `${co.name} · Site sign-in register · ${date} · printed ${stamp(Date.now())} · page ${i} of ${n}`,
          M,
          290,
          7,
          "normal",
          [130, 120, 120],
        );
      }
      const fn = `Sign-in register ${date}${
        site
          ? " - " +
            clean(site)
              .replace(/[^\w\s,-]/g, "")
              .slice(0, 40)
          : ""
      }.pdf`;
      const blob = doc.output("blob");
      if (S.dl) {
        try {
          await S.dl.save({ filename: fn, data: blob });
          toast("PDF saved");
        } catch (e) {
          if (!(e && e.code === "declined")) pdfShow(blob, fn);
        }
      } else pdfShow(blob, fn);
    } catch (e) {
      console.error(e);
      toast("Couldn't make the PDF");
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = lab;
    }
  }
  function view() {
    if (ownerMode() && !S.preview) ownerView();
    else tradeView();
  }
  return { view, rows, openToday, signIn, signOut };
})();
