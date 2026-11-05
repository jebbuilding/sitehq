/* ================= SIGN-OFF SHEET from a drawing: printable with signature boxes, or signed in the app by client / trades / everyone on a site ================= */
import { clientSites } from "../clients/address-book.js";
import { clAddNote, saveClient } from "../clients/clients.js";
import { signHere } from "../clients/portal-calendar.js";
import { PT_KINDS, ptCl, ptKind, ptOf, ptSrc } from "../clients/portal.js";
import { SO } from "../clients/sign-offs.js";
import { pickField, pickVal } from "../core/fields.js";
import { $, esc, iso, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, clActive, siteNames } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { drawOpen } from "./drawings-tab.js";
import { pdfShow } from "./paving.js";
import { SK_CAT } from "./trade-drawings.js";
import { CUT } from "../files/cut-outs.js";
import { uploadFile } from "../files/files.js";
import { getFileBlob } from "../files/in-app-files.js";
import { newId } from "../files/outbox.js";
import { printAsset, printBlob } from "../files/print.js";
import { SENDTO } from "../files/send-to.js";
import { coData } from "../owner/company-details.js";
import { auditLog } from "../owner/deletion-record.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { BRGB, pdfLogo } from "../photos/photos.js";
import { loadJsPdf, sigPad } from "../safety/site-inductions.js";
import { mySign, openSign } from "../sites/plans-specs.js";
import { same } from "../sites/project-pages.js";
import { siteClient } from "../sites/summary.js";
import { myName } from "../survey/door-window-survey.js";
export { SIGNSHEET };
const SIGNSHEET = (() => {
  const DEF_STMT = "I approve this and give the go-ahead for the work to go ahead as shown.";
  const SS_KINDS = ["design", "materials", "goahead", "variation", "stage"];
  async function imgData(id) {
    const b = await getFileBlob(id);
    const u = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(b);
    });
    const dim = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res([im.naturalWidth, im.naturalHeight]);
      im.onerror = () => res([4, 3]);
      im.src = u;
    });
    return { u, w: dim[0], h: dim[1], fmt: /png/i.test(b.type || "") ? "PNG" : "JPEG" };
  }
  async function sigDim(u) {
    return await new Promise((res) => {
      const im = new Image();
      im.onload = () => res([im.naturalWidth, im.naturalHeight]);
      im.onerror = () => res([420, 150]);
      im.src = u;
    });
  }
  /* rows = [{role,name,sig?,date?,status?}] */
  async function buildPdf(p, s, rows) {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const W = 210,
      H = 297,
      M = 14,
      CW = W - 2 * M,
      co = coData(),
      BR = BRGB(),
      GR = [75, 68, 65];
    let y = 0;
    const clean = (t) =>
      String(t || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\x20-\x7E£·]/g, "");
    const T = (t, x, yy, sz, st, col, al) => {
      doc.setFont("helvetica", st || "normal");
      doc.setFontSize(sz);
      doc.setTextColor(...(col || [22, 20, 19]));
      doc.text(clean(t), x, yy, al ? { align: al } : undefined);
    };
    doc.setFillColor(...BR);
    doc.rect(0, 0, W, 4, "F");
    await pdfLogo(doc, W - M, 8, 36, 16);
    T(co.name.toUpperCase(), M, 13, 8, "bold", BR);
    T(s.client || s.manual ? "Client go-ahead" : "Sign-off sheet", M, 20.5, 15, "bold");
    T(s.title, M, 26.5, 11, "bold", GR);
    const cl = s.client ? (S.clients || []).find((c) => c.id === s.client) : null;
    const mc = s.manual || null;
    const meta = [
      ["Site", s.site || p.site || (mc && mc.addr) || "-"],
      ["Client", cl ? cl.name : mc ? mc.name : "-"],
      [
        "Date issued",
        new Date(s.at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      ],
      ["Ref", s.ref],
    ];
    if (mc && (mc.phone || mc.email))
      meta.push(["Contact", [mc.phone, mc.email].filter(Boolean).join(" · ")]);
    y = 33;
    meta.forEach(([l, v], i) => {
      const x = M + (i % 2) * (CW / 2);
      T(l, x, y + Math.floor(i / 2) * 5, 7.5, "bold", [110, 100, 100]);
      T(doc.splitTextToSize(clean(v), CW / 2 - 26)[0], x + 22, y + Math.floor(i / 2) * 5, 9);
    });
    y += Math.ceil(meta.length / 2) * 5 + 2;
    /* the drawing */
    const sigH = 14,
      rowN = Math.max(rows.length, 3),
      tableH = 8 + rowN * (sigH + 2);
    const stmtLines = doc.splitTextToSize(clean(s.statement), CW - 8);
    const noteLines = s.note ? doc.splitTextToSize(clean("Note: " + s.note), CW - 8) : [];
    const ex = (s.extras || []).slice(0, 6);
    const big = !p.assetId;
    const perRow = big && ex.length <= 2 ? ex.length || 1 : 3;
    const exRows = Math.ceil(ex.length / perRow);
    const exH = exRows ? exRows * 40 + 2 : 0;
    const room =
      H -
      18 -
      y -
      tableH -
      (stmtLines.length * 4.2 + 8) -
      (noteLines.length ? noteLines.length * 4 + 2 : 0) -
      6 -
      exH;
    if (p.assetId)
      try {
        const im = await imgData(p.assetId);
        let dw = CW,
          dh = (dw * im.h) / im.w;
        if (dh > room) {
          dh = Math.max(40, room);
          dw = (dh * im.w) / im.h;
        }
        doc.setDrawColor(200, 192, 190);
        doc.setLineWidth(0.3);
        doc.rect(M, y, CW, dh + 4);
        doc.addImage(im.u, im.fmt, M + (CW - dw) / 2, y + 2, dw, dh);
        y += dh + 8;
      } catch (e) {
        T("(drawing could not be added)", M, y + 6, 9, "normal", [160, 40, 30]);
        y += 12;
      }
    if (ex.length) {
      const cw = (CW - 4 * (perRow - 1)) / perRow;
      let ch = 36;
      if (big) {
        const rm =
          H -
          18 -
          y -
          tableH -
          (stmtLines.length * 4.2 + 8) -
          (noteLines.length ? noteLines.length * 4 + 2 : 0) -
          6;
        ch = Math.max(36, Math.min(110, rm / exRows - 4));
      }
      let col = 0;
      for (const e of ex) {
        try {
          const im = await imgData(e.assetId);
          let w = cw - 2,
            h = (w * im.h) / im.w;
          if (h > ch - 2) {
            h = ch - 2;
            w = (h * im.w) / im.h;
          }
          const x0 = M + col * (cw + 4);
          doc.setDrawColor(210, 204, 202);
          doc.setLineWidth(0.3);
          doc.rect(x0, y, cw, ch);
          doc.addImage(im.u, im.fmt, x0 + (cw - w) / 2, y + (ch - h) / 2, w, h);
        } catch (err) {}
        col++;
        if (col === perRow) {
          col = 0;
          y += ch + 4;
        }
      }
      if (col) y += ch + 4;
    }
    if (noteLines.length) {
      noteLines.forEach((l) => {
        T(l, M, y, 8.5, "normal", GR);
        y += 4;
      });
      y += 2;
    }
    doc.setFillColor(248, 245, 243);
    doc.rect(M, y, CW, stmtLines.length * 4.2 + 6, "F");
    doc.setDrawColor(...BR);
    doc.setLineWidth(0.8);
    doc.line(M, y, M, y + stmtLines.length * 4.2 + 6);
    T("By signing below I confirm:", M + 4, y + 4.5, 8, "bold", [110, 100, 100]);
    stmtLines.forEach((l, i) => T(l, M + 4, y + 9 + i * 4.2, 9.5, "bold"));
    y += stmtLines.length * 4.2 + 10;
    /* signature table */
    const cols = [
      ["Signing for", 34],
      ["Name", 48],
      ["Signature", 68],
      ["Date", CW - 150],
    ];
    doc.setFillColor(240, 236, 234);
    doc.rect(M, y, CW, 6, "F");
    let x = M;
    cols.forEach(([h, w]) => {
      T(h, x + 2, y + 4.2, 8, "bold", [80, 72, 70]);
      x += w;
    });
    y += 6;
    for (let i = 0; i < rowN; i++) {
      const r = rows[i] || { role: "", name: "" };
      x = M;
      doc.setDrawColor(200, 192, 190);
      doc.setLineWidth(0.25);
      doc.rect(M, y, CW, sigH + 2);
      let cx = M;
      cols.forEach(([, w], k) => {
        if (k) doc.line(cx, y, cx, y + sigH + 2);
        cx += w;
      });
      T(r.role, M + 2, y + 6, 8.5, "bold");
      T(r.name, M + cols[0][1] + 2, y + 6, 9);
      if (r.status && !r.sig)
        T(
          r.status,
          M + cols[0][1] + 2,
          y + 11,
          7.5,
          "normal",
          r.status === "Needs changes" ? [180, 35, 24] : GR,
        );
      if (r.sig) {
        try {
          const d2 = await sigDim(r.sig);
          let ih = sigH - 1,
            iw = (ih * d2[0]) / d2[1];
          if (iw > cols[2][1] - 4) {
            iw = cols[2][1] - 4;
            ih = (iw * d2[1]) / d2[0];
          }
          doc.addImage(r.sig, "PNG", M + cols[0][1] + cols[1][1] + 2, y + 1.5, iw, ih);
        } catch (e) {}
      }
      if (r.date) T(r.date, M + 150 + 2, y + 6, 9);
      y += sigH + 2;
    }
    T(
      `${co.name} · ${s.ref} · sign and return a copy, or sign in the SiteHQ app`,
      M,
      H - 8,
      7,
      "normal",
      [130, 120, 120],
    );
    return doc.output("blob");
  }
  function blankRows(s) {
    const cl = s.client ? (S.clients || []).find((c) => c.id === s.client) : null;
    const r = [];
    if (cl) r.push({ role: "Client", name: cl.name });
    else if (s.manual) r.push({ role: "Client", name: s.manual.name });
    (s.trades || []).forEach((id) => r.push({ role: "Trade", name: nameOf(id) }));
    if (s.site) for (let i = 0; i < 3; i++) r.push({ role: "Trade", name: "" });
    r.push({ role: coData().name, name: coData().owner || "" });
    return r;
  }
  /* who has signed so far: client (portal), trades sent it directly, everyone on the site */
  function status(p) {
    const s = p.signSheet;
    if (!s) return [];
    const out = [];
    const dt = (t) => (t ? new Date(t).toLocaleDateString("en-GB") : "");
    if (s.client) {
      const c = (S.clients || []).find((x) => x.id === s.client);
      const pp = c && ptOf(c);
      const x =
        c &&
        (pp ? ((SO && SO.signs) || {})[pp.id] || [] : c.ptSigns || []).find(
          (y) => y.id === s.clientSign,
        );
      out.push({
        role: "Client",
        name: (x && x.signedName) || (c ? c.name : "Client"),
        st: x
          ? x.status === "signed"
            ? "ok"
            : x.status === "changes"
              ? "change"
              : "open"
          : "open",
        sig: (x && x.sig) || "",
        at: x && x.signedAt,
        note: (x && x.comment) || "",
        how: pp ? "portal" : "not on the portal yet",
      });
    } else if (s.manual) {
      const m = s.manualSign;
      out.push({
        role: "Client",
        name: (m && m.signedName) || s.manual.name,
        st: m ? "ok" : "open",
        sig: (m && m.sig) || "",
        at: m && m.signedAt,
        note: (m && m.comment) || "",
        how: "typed in · sign on this device or paper",
      });
    }
    if (!p.assetId && !s.client && !s.manual) return out;
    allTeam("photos")
      .filter((x) => x.signOf === p.id && x.who !== S.me)
      .forEach((x) =>
        out.push({
          role: "Trade",
          name: x.signedName || nameOf(x.who),
          st: x.signReq || "open",
          sig: x.signImg || "",
          at: x.signedAt,
          note: x.signNote || "",
          how: "sent to them",
        }),
      );
    const direct = new Set(
      allTeam("photos")
        .filter((x) => x.signOf === p.id)
        .map((x) => x.who),
    );
    if (s.siteDoc)
      allTeam("signoffs")
        .filter((x) => x.docId === s.siteDoc && !direct.has(x.who))
        .forEach((x) =>
          out.push({
            role: "Trade",
            name: x.name || nameOf(x.who),
            st: "ok",
            sig: x.sig || "",
            at: x.signedAt,
            note: "",
            how: "on site",
          }),
        );
    return out;
  }
  function recordRows(p) {
    const st = status(p);
    const rows = st.map((x) => ({
      role: x.role,
      name: x.name,
      sig: x.st === "ok" ? x.sig : "",
      date: x.st === "ok" ? new Date(x.at).toLocaleDateString("en-GB") : "",
      status: x.st === "ok" ? "" : x.st === "change" ? "Needs changes" : "Waiting",
    }));
    rows.push({ role: coData().name, name: coData().owner || "" });
    return rows;
  }
  function doneDlg(p, blob, name, upd) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "125";
    d.innerHTML = `<div class="dimbox"><b>✍️ Sign-off sheet made</b><div class="who">It's saved ${p.assetId ? "on the drawing" : "in Sign-offs"}${p.signSheet && p.signSheet.client ? " and the client's record" : ""}. Signatures made in the app are added to the signed copy.</div><div class="actions" style="flex-direction:column;align-items:stretch;margin-top:8px">${p.signSheet && (p.signSheet.client || p.signSheet.manual) ? `<button type="button" class="btn primary" data-a="here">✍️ Client signs now on this device</button>` : ""}<button type="button" class="btn ${p.signSheet && (p.signSheet.client || p.signSheet.manual) ? "" : "primary"}" data-a="print">🖨 Print it to sign on paper</button><button type="button" class="btn" data-a="send">📤 Send to… (trade, client, email)</button><button type="button" class="btn" data-a="dl">⬇ Download</button></div><div class="dimbtns"><button type="button" class="btn ss-x">Done</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".ss-x").onclick = () => d.remove();
    d.querySelectorAll("[data-a]").forEach(
      (b) =>
        (b.onclick = async () => {
          const a = b.dataset.a;
          if (a === "here") {
            const back = () => {
              try {
                if (p.assetId) drawOpen(p);
                else view(p);
              } catch (e) {}
            };
            if (p.signSheet.manual && upd) {
              d.remove();
              manualSign(p, upd, back);
              return;
            }
            const r = clientRec(p);
            if (r) {
              d.remove();
              signHere(r.c, r.x, back);
            }
            return;
          }
          if (a === "print") printBlob(blob, name);
          else if (a === "dl") {
            try {
              if (S.dl) await S.dl.save({ filename: name, data: blob });
              else pdfShow(blob, name);
            } catch (e) {
              pdfShow(blob, name);
            }
          } else if (a === "send") {
            d.remove();
            SENDTO.open({
              assetId: p.signSheet.asset,
              name,
              type: "application/pdf",
              title: p.signSheet.title,
              site: p.signSheet.site || p.site,
              clientId: p.signSheet.client,
              folder: "designs",
              cat: "plans",
            });
          }
        }),
    );
  }
  function open(p, upd, o) {
    o = o || {};
    const ids = teamIds();
    const cls = (S.clients || []).filter(clActive);
    const sc = p.site ? siteClient(p.site) : null;
    const solo = !p.assetId;
    openSheet(
      `<h3 id="sheettitle">✍️ ${solo ? "New sign-off sheet" : "Client go-ahead"}</h3><div class="who">A one-page sheet with ${solo ? "your pictures" : "this drawing"}, what they're agreeing to and a signature box. The client can sign it on this device now${solo ? "" : ", in their portal"}, or on a printed copy.</div>
    <label for="ss-cl">Client<select id="ss-cl"><option value="">No client</option><option value="__manual" ${o.manual || (solo && !sc) ? "selected" : ""}>✏️ Type their details in (not in Clients)</option>${cls.map((c) => `<option value="${esc(c.id)}" ${!o.manual && sc && sc.id === c.id ? "selected" : ""}>${esc(c.name)}${c.site ? " · " + esc(c.site) : ""}${ptOf(c) ? "" : " (not on the portal yet)"}</option>`).join("")}</select></label>
    <div id="ss-man" class="ssman"><label for="ss-mname">Client name<input id="ss-mname" maxlength="80" autocomplete="off" placeholder="e.g. Mr & Mrs Smith"></label>
    <label for="ss-maddr">Property address<input id="ss-maddr" maxlength="160" autocomplete="off" placeholder="e.g. 4 Rolle Road, Exmouth EX8 2AB"></label>
    <div class="grid2"><label for="ss-mtel">Phone (optional)<input id="ss-mtel" type="tel" maxlength="30" autocomplete="off"></label><label for="ss-mmail">Email (optional)<input id="ss-mmail" type="email" maxlength="120" autocomplete="off"></label></div>
    <div class="who">Only kept on this sheet – they won't be added to your Clients.</div></div>
    <label for="ss-kind">What needs the go-ahead<select id="ss-kind">${PT_KINDS.filter((k) =>
      SS_KINDS.includes(k[0]),
    )
      .map(
        ([k, l]) =>
          `<option value="${k}" ${k === (o.kind || "design") ? "selected" : ""}>${esc(l)}</option>`,
      )
      .join("")}</select></label>
    <label for="ss-title">Title<input id="ss-title" maxlength="120" value="${esc(o.title || p.title || (solo ? "" : "Drawing"))}" ${solo ? 'placeholder="e.g. Kitchen worktop and doors"' : ""}></label>
    <label for="ss-stmt">What they're agreeing to<textarea id="ss-stmt" maxlength="400" style="min-height:60px">${esc(ptKind(o.kind || "design")[2])}</textarea></label>
    <label for="ss-note">Details / message (optional)<textarea id="ss-note" maxlength="300" placeholder="e.g. Sage green shaker doors, oak worktops, sockets as marked"></textarea></label>
    <div class="flabel">📎 Photos and parts of PDFs or drawings to go on the sheet (optional)</div>${CUT.pickerBox("ss-clip", o.clips || [])}
    <details class="pmdet" ${solo ? "hidden" : ""}><summary>Also ask trades to sign (optional)</summary>
    <fieldset class="od-who"><legend>Trades</legend>${ids.map((id) => `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" class="ss-t" value="${esc(id)}"> ${esc(nameOf(id))}</label>`).join("") || '<span class="who">No trades on the app yet.</span>'}</fieldset>
    <label class="tick"><input type="checkbox" id="ss-site"> <span>Put it on the site – every trade on that site can open and sign it (in <b>Sites</b>)</span></label>
    ${pickField("ss-sitev", "Site", siteNames(), p.site || "", "e.g. 12 Marine Way, Exmouth", false)}</details>
    <div class="who" id="ss-prog"></div>${formFoot(false, "✍️ Make the sheet")}`,
      async () => {
        const title = $("ss-title").value.trim() || "Sign-off";
        const kind = $("ss-kind").value;
        const statement = $("ss-stmt").value.trim() || DEF_STMT;
        const cv = $("ss-cl").value;
        const cid = cv === "__manual" ? "" : cv;
        const manual =
          cv === "__manual"
            ? {
                name: $("ss-mname").value.trim(),
                addr: $("ss-maddr").value.trim(),
                phone: $("ss-mtel").value.trim(),
                email: $("ss-mmail").value.trim(),
              }
            : null;
        const trades = [...document.querySelectorAll(".ss-t:checked")].map((x) => x.value);
        const onSite = $("ss-site").checked;
        const site = pickVal("ss-sitev");
        const note = $("ss-note").value.trim();
        if (onSite && !site) {
          showErr("Choose the site, or untick put it on the site.");
          return;
        }
        if (manual && !manual.name) {
          showErr("Type the client's name.");
          return;
        }
        if (!cid && !manual && !trades.length && !onSite) {
          showErr("Choose the client (or trades) to sign it.");
          return;
        }
        $("f-save").disabled = true;
        const now = Date.now();
        const ref =
          "SO-" + iso(new Date()).replace(/-/g, "").slice(2) + "-" + String(now).slice(-3);
        const s = {
          at: now,
          ref,
          title,
          kind,
          statement,
          note,
          client: cid,
          manual,
          trades,
          site: onSite ? site : "",
          asset: "",
          siteDoc: "",
          clientSign: "",
          extras: [],
        };
        s.extras = [...document.querySelectorAll(".ss-clip:checked")]
          .map((x) => (S.clips || []).find((c) => c.id === x.value))
          .filter(Boolean)
          .map((c) => ({ assetId: c.assetId, name: c.name }));
        try {
          $("ss-prog").textContent = "Making the sheet…";
          const blob = await buildPdf(p, s, blankRows(s));
          const name =
            title
              .replace(/[^\w\s&,-]/g, "")
              .trim()
              .slice(0, 60) + ".pdf";
          const a = await uploadFile(blob, name);
          s.asset = a.id;
          s.name = name;
          $("ss-prog").textContent = "Sending…";
          if (cid) {
            const c = cls.find((x) => x.id === cid);
            const src = ptSrc(c);
            s.clientSign = newId();
            await src.addSign(s.clientSign, {
              kind,
              title: title.slice(0, 120),
              details: note,
              docIds: [],
              files: [{ assetId: a.id, name, type: "application/pdf" }]
                .concat(
                  p.assetId
                    ? [
                        {
                          assetId: p.assetId,
                          name: (p.title || "Drawing") + ".jpg",
                          type: "image/jpeg",
                        },
                      ]
                    : [],
                )
                .concat(
                  s.extras.map((e) => ({
                    assetId: e.assetId,
                    name: e.name + ".jpg",
                    type: "image/jpeg",
                  })),
                ),
              statement,
              status: "open",
              created: now,
              fromDrawing: p.id,
            });
            try {
              await src.bump();
            } catch (e) {}
            try {
              const cur = ptCl(c);
              const lst = [{ assetId: a.id, name, at: now, pages: 1 }]
                .concat((cur.recordPdfs || []).filter((x) => x.name !== name))
                .slice(0, 10);
              await saveClient(Object.assign({}, cur, { recordPdfs: lst }));
            } catch (e) {}
            try {
              await clAddNote(c, "Go-ahead sheet sent: " + title);
            } catch (e) {}
          }
          for (const who of trades) {
            const pid = newId();
            await S.db.doc("sheets/" + who + "/photos/" + pid).set({
              kind: "sketch",
              assetId: p.assetId || a.id,
              pageSrc: p.pageSrc || "",
              title: p.title || title,
              site: p.site || site || "",
              category: SK_CAT,
              caption: note,
              takenAt: now,
              date: iso(new Date(now)),
              fromOwner: true,
              check: "",
              signReq: "open",
              signOf: p.id,
              signStmt: statement,
              sheetAsset: a.id,
              created: now,
            });
            await SENDTO.notifyTrade(who, "sketch:" + pid, title, note || "Please check and sign");
          }
          if (onSite) {
            const did = newId();
            s.siteDoc = did;
            await S.db.doc("docs/" + did).set({
              site,
              cat: "plans",
              title,
              fileName: name,
              assetId: a.id,
              contentType: "application/pdf",
              path: "Sign-off sheets",
              uploaded: now,
              needSign: true,
              signStmt: statement,
              signOf: p.id,
              who: [],
            });
          }
          await upd({
            signSheet: s,
            signSent: { at: now, trades, client: cid || "", clientSign: s.clientSign },
          });
          closeForm();
          toast("Sign-off sheet made" + (trades.length || cid || onSite ? " and sent" : ""));
          try {
            await auditLog(
              "Sign-off sheet made",
              title,
              `Client: ${cid ? (cls.find((x) => x.id === cid) || {}).name : manual ? manual.name + " (typed in)" : "none"} · trades: ${trades.map(nameOf).join(", ") || "none"}${onSite ? " · on site " + site : ""}`,
              { ref, drawing: p.id },
            );
          } catch (e) {}
          doneDlg(p, blob, name, upd);
          render();
        } catch (e) {
          console.error(e);
          showErr("Couldn't make it. Check your connection.");
          $("f-save").disabled = false;
        }
      },
      "ss-title",
    );
    const sync = () => {
      const on = $("ss-site").checked;
      const l = $("ss-sitev") && $("ss-sitev").closest("label");
      if (l) l.hidden = !on;
      $("ss-man").hidden = $("ss-cl").value !== "__manual";
    };
    $("ss-site").onchange = sync;
    $("ss-cl").onchange = sync;
    sync();
    CUT.wireBox($("form"), () => {
      const v = $("ss-cl") && $("ss-cl").value;
      const c = v && v !== "__manual" && (S.clients || []).find((x) => x.id === v);
      const L = c ? clientSites(c) : [];
      if (p.site && !L.some((x) => same(x, p.site))) L.push(p.site);
      return { sites: L, client: c ? c.id : v === "__manual" ? "manual-" + p.id : "" };
    });
    let edited = false;
    $("ss-stmt").oninput = () => {
      edited = true;
    };
    $("ss-kind").onchange = () => {
      if (!edited) $("ss-stmt").value = ptKind($("ss-kind").value)[2];
    };
  }
  /* client typed in by hand (not in Clients): they sign on this device and it's kept on the sheet */
  function manualSign(p, upd, after) {
    const s = p.signSheet;
    const m = s.manual || {};
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "130";
    d.innerHTML = `<div class="dimbox" style="width:min(560px,100%);max-height:92vh;overflow:auto"><b>✍️ ${esc(s.title)}</b><div class="who">Hand the device to ${esc(m.name || "the client")} to read and sign.</div>
    ${s.note ? `<div class="talkbody pnotes" style="margin-top:6px">${esc(s.note)}</div>` : ""}
    <label class="inl ptconfirm" style="margin-top:8px"><input type="checkbox" class="sh-ok"> ${esc(s.statement || DEF_STMT)}</label>
    <label>Full name<input class="sh-name" maxlength="80" value="${esc(m.name || "")}"></label>
    <div><div class="checkhead"><span class="flabel" style="margin:0">Sign with your finger</span><button type="button" class="pillbtn sh-clr">Clear</button></div><canvas class="sigpad sh-sig" aria-label="Signature box"></canvas></div>
    <label>Comments (optional)<textarea class="sh-com" maxlength="600"></textarea></label>
    <div class="dimbtns"><button type="button" class="btn sh-x">Cancel</button><button type="button" class="btn primary sh-go">✍ Sign and approve</button></div></div>`;
    document.body.appendChild(d);
    const pad = sigPad(d.querySelector(".sh-sig"));
    d.querySelector(".sh-clr").onclick = () => pad.clear();
    d.querySelector(".sh-x").onclick = () => d.remove();
    d.querySelector(".sh-go").onclick = async () => {
      const nm = d.querySelector(".sh-name").value.trim();
      if (!d.querySelector(".sh-ok").checked) {
        toast("Tick the box to agree");
        return;
      }
      if (!nm) {
        toast("Add the name");
        return;
      }
      if (!pad.drawn) {
        toast("Please sign in the box");
        return;
      }
      const b = d.querySelector(".sh-go");
      b.disabled = true;
      b.textContent = "Saving…";
      const ms = {
        signedName: nm,
        comment: d.querySelector(".sh-com").value.trim(),
        signedAt: Date.now(),
        sig: pad.data(),
        onDevice: true,
        witnessedBy: myName(),
      };
      try {
        await upd({ signSheet: Object.assign({}, s, { manualSign: ms }) });
        try {
          await auditLog(
            "Client signed in person",
            s.title,
            `${nm} signed on ${myName()}'s device`,
            { ref: s.ref },
          );
        } catch (e) {}
        d.remove();
        toast("Signed by " + nm);
        if (after) after();
      } catch (e) {
        b.disabled = false;
        b.textContent = "✍ Sign and approve";
        toast("Couldn't save. Check your connection.");
      }
    };
  }
  /* sign-off sheets that aren't on a drawing (made from Sign-offs or a cut-out), kept in todos kind "gosheet" */
  const soloUpd = (p) => async (patch) => {
    Object.assign(p, patch);
    p.at = p.at || Date.now();
    const rec = {
      kind: "gosheet",
      at: p.at,
      title: (p.signSheet && p.signSheet.title) || "",
      signSheet: p.signSheet || null,
    };
    if (p.signSent) rec.signSent = p.signSent;
    await S.db.doc("todos/" + p.id).set(rec);
    const L = S.gosheets || (S.gosheets = []);
    if (!L.includes(p) && !L.some((x) => x.id === p.id)) L.push(p);
  };
  function openSolo(o) {
    const p = { id: "gs-" + newId(), assetId: "", site: "", title: "" };
    open(p, soloUpd(p), o);
  }
  function view(p) {
    const s = p.signSheet;
    if (!s) return;
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "120";
    const draw = () => {
      d.innerHTML = `<div class="dimbox" style="width:min(600px,100%);max-height:92vh;overflow:auto">${cardHtml(p)}<div class="dimbtns"><button type="button" class="btn danger gs-del">Delete</button><button type="button" class="btn gs-x">Close</button></div></div>`;
      d.querySelector(".gs-x").onclick = () => d.remove();
      d.querySelector(".gs-del").onclick = async (e) => {
        const b = e.currentTarget;
        if (s.manualSign) {
          toast("It's signed, so it's kept on the record");
          return;
        }
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1";
          b.textContent = "Delete?";
          return;
        }
        try {
          await S.db.doc("todos/" + p.id).delete();
          S.gosheets = (S.gosheets || []).filter((x) => x.id !== p.id);
          d.remove();
          render();
        } catch (x) {
          toast("Couldn't delete");
        }
      };
      wireCard(p, soloUpd(p), () => {
        d.remove();
        view(p);
      });
    };
    document.body.appendChild(d);
    draw();
  }
  /* the client's sign-off record for a sheet, so they can sign it here on site */
  function clientRec(p) {
    const s = p.signSheet;
    if (!s || !s.client) return null;
    const c = (S.clients || []).find((x) => x.id === s.client);
    if (!c) return null;
    const pp = ptOf(c);
    const x = (pp ? ((SO && SO.signs) || {})[pp.id] || [] : c.ptSigns || []).find(
      (y) => y.id === s.clientSign,
    ) || {
      id: s.clientSign,
      kind: s.kind || "design",
      title: s.title,
      statement: s.statement,
      details: s.note,
      status: "open",
    };
    return { c, x };
  }
  /* owner's card on the drawing */
  function cardHtml(p) {
    const s = p.signSheet;
    if (!s) return "";
    const st = status(p);
    const ok = st.filter((x) => x.st === "ok").length;
    return `<div class="card" style="margin:10px 0;padding:10px 12px"><b>✍️ ${esc(s.title)}</b> <span class="who">${esc(s.ref)} · made ${esc(stamp(s.at))} · ${ok} of ${st.length} signed${s.site ? " · on " + esc(s.site) : ""}</span>
    ${st.map((x) => `<div class="dwsrow"><span>${esc(x.name)} <span class="who">${esc(x.role)} · ${esc(x.how)}</span></span><span class="tag ${x.st === "ok" ? "ok" : x.st === "change" ? "bad" : "day"}">${x.st === "ok" ? "✓ Signed" : x.st === "change" ? "Needs changes" : "Waiting"}</span>${x.note ? `<div class="who">“${esc(x.note)}”</div>` : ""}</div>`).join("") || '<div class="who">Nobody has signed in the app yet.</div>'}
    <div class="actions" style="margin-top:8px">${
      s.manual
        ? s.manualSign
          ? ""
          : `<button type="button" class="btn primary" id="ss-here">✍️ ${esc(s.manual.name)} signs now</button>`
        : (() => {
            const r = clientRec(p);
            return r && r.x.status !== "signed"
              ? `<button type="button" class="btn primary" id="ss-here">✍️ ${esc(r.c.name)} signs now</button>`
              : "";
          })()
    }<button type="button" class="btn" id="ss-print">🖨 Print blank sheet</button><button type="button" class="btn primary" id="ss-rec">📄 Signed copy (PDF)</button><button type="button" class="btn" id="ss-send">📤 Send to…</button></div></div>`;
  }
  function wireCard(p, upd, back) {
    if (!p.signSheet) return;
    const s = p.signSheet;
    back =
      back ||
      (() => {
        closeViewer();
        drawOpen(p);
      });
    if ($("ss-print"))
      $("ss-print").onclick = () => printAsset(s.asset, s.name || "Sign-off sheet.pdf");
    if ($("ss-here"))
      $("ss-here").onclick = () => {
        if (s.manual) {
          if (upd) manualSign(p, upd, back);
          return;
        }
        const r = clientRec(p);
        if (r) signHere(r.c, r.x, back);
      };
    if ($("ss-send"))
      $("ss-send").onclick = () =>
        SENDTO.open({
          assetId: s.asset,
          name: s.name || "Sign-off sheet.pdf",
          type: "application/pdf",
          title: s.title,
          site: s.site || p.site,
          clientId: s.client,
          folder: "designs",
          cat: "plans",
        });
    if ($("ss-rec"))
      $("ss-rec").onclick = async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        b.textContent = "Making it…";
        try {
          const blob = await buildPdf(p, s, recordRows(p));
          const name =
            (s.title + " - signed " + iso(new Date())).replace(/[^\w\s&,-]/g, "").trim() + ".pdf";
          if (S.dl) {
            try {
              await S.dl.save({ filename: name, data: blob });
            } catch (x) {
              pdfShow(blob, name);
            }
          } else pdfShow(blob, name);
        } catch (x) {
          toast("Couldn't make the PDF");
        }
        b.disabled = false;
        b.textContent = "📄 Signed copy (PDF)";
      };
  }
  /* trades: sheets put on their site waiting for their signature */
  function unsigned() {
    return (S.docs || []).filter(
      (d) =>
        d.needSign &&
        !mySign(d.id) &&
        !(S.mine.photos || []).some((p) => p.signOf && p.signOf === d.signOf),
    );
  }
  function bannerHtml() {
    const u = unsigned();
    if (!u.length) return "";
    return `<div class="notice warn" style="display:flex;flex-direction:column;gap:6px"><b>✍️ ${u.length} sign-off sheet${u.length === 1 ? "" : "s"} to sign</b>${u.map((d) => `<button type="button" class="incrow ss-sign" data-id="${esc(d.id)}"><span><b>${esc(d.title)}</b><br><span class="who">${esc(d.site || "")}</span></span><span>Sign ›</span></button>`).join("")}</div>`;
  }
  function wireBanner(root) {
    (root || document).querySelectorAll(".ss-sign").forEach(
      (b) =>
        (b.onclick = () => {
          const d = (S.docs || []).find((x) => x.id === b.dataset.id);
          if (d) openSign(d);
        }),
    );
  }
  return { open, openSolo, view, cardHtml, wireCard, unsigned, bannerHtml, wireBanner, status };
})();
