/* ===== Owner tab: every client sign-off in one place ===== */
import { ptOwnerSign, ptSignPdf } from "./portal-calendar.js";
import { PT, ptAskSign, ptKind, ptMgrSubscribe, ptOf } from "./portal.js";
import { mapDocs } from "../core/data.js";
import { $, esc, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet } from "../core/sheet.js";
import { S, clActive } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { closeViewer } from "../core/viewer.js";
import { drawOpen } from "../drawing/drawings-tab.js";
import { SIGNSHEET } from "../drawing/sign-off-sheet.js";
import { uploadFile } from "../files/files.js";
import { newId } from "../files/outbox.js";
export { SO, signoffsTab, soAll, soWatch };
const SO = { subs: {}, signs: {}, docs: {} };
/* a CDM document the client has signed in their portal is filed automatically in the site's CDM folder */
const CDM_FILING = new Set();
async function cdmAutoFile(c, p) {
  if (!S.owner || !S.assets) return;
  for (const x of SO.signs[p.id] || []) {
    if (x.kind !== "cdm" || x.status !== "signed" || x.filedAt || CDM_FILING.has(x.id)) continue;
    CDM_FILING.add(x.id);
    try {
      const blob = await ptSignPdf(c, p, x, SO.docs[p.id] || [], null, true);
      if (!blob) continue;
      const site = x.site || c.site || "General";
      const fn =
        ("Signed by " + c.name + " - " + x.title)
          .replace(/[^\w\s&().-]/g, "")
          .trim()
          .slice(0, 110) + ".pdf";
      const up = await uploadFile(new File([blob], fn, { type: "application/pdf" }), fn);
      await S.db.doc("todos/" + newId()).set({
        kind: "sitedoc",
        site,
        path: "CDM",
        cat: "rams",
        title: fn.replace(/\.pdf$/, ""),
        fileName: fn,
        assetId: up.id,
        contentType: "application/pdf",
        size: blob.size,
        uploaded: Date.now(),
        signedRecord: x.id,
      });
      await S.db.doc("portal/" + p.id + "/signs/" + x.id).update({ filedAt: Date.now() });
      toast(`✍ ${c.name} signed "${x.title}". Filed in ${site} › RAMS › CDM`);
    } catch (e) {
      CDM_FILING.delete(x.id);
    }
  }
}
function soWatch() {
  (S.clients || []).forEach((c) => {
    const p = ptOf(c);
    if (!p || SO.subs[p.id]) return;
    SO.subs[p.id] = [
      S.db.collection("portal/" + p.id + "/signs").onSnapshot(
        (sn) => {
          SO.signs[p.id] = mapDocs(sn).filter((x) => x.title);
          setTimeout(() => cdmAutoFile(c, p), 600);
          if (S.otab === "signoffs" || S.otab === "hs") render();
        },
        () => {},
      ),
      S.db.collection("portal/" + p.id + "/docs").onSnapshot(
        (sn) => {
          SO.docs[p.id] = mapDocs(sn);
        },
        () => {},
      ),
    ];
  });
}
function soAll() {
  soWatch();
  const out = [];
  (S.clients || []).forEach((c) => {
    const p = ptOf(c);
    const list = p ? SO.signs[p.id] || [] : c.ptSigns || [];
    list.forEach((x) => out.push({ c, p, x }));
  });
  return out.sort(
    (a, b) => (b.x.signedAt || b.x.created || 0) - (a.x.signedAt || a.x.created || 0),
  );
}
function signoffsTab() {
  const f = S.f.sof || "open";
  const all = soAll();
  const list = all.filter(
    (r) =>
      f === "all" ||
      (f === "open"
        ? r.x.status === "open"
        : f === "signed"
          ? r.x.status === "signed"
          : r.x.status === "changes"),
  );
  const cnt = (k) =>
    all.filter((r) => k === "all" || r.x.status === k || (k === "open" && r.x.status === "open"))
      .length;
  $("main").innerHTML =
    `<div class="notice">✍ <b>Client sign-offs.</b> Make a sign-off sheet with PDFs or photos, the client approves it in their portal with a signature, and you both get a PDF record. They can download everything you attach.</div>
    <div class="actions"><button type="button" class="btn primary" id="so-new">+ New sign-off sheet</button></div>
    ${(() => {
      const L = (S.mine.photos || [])
        .filter((x) => x.signSheet)
        .concat(S.gosheets || [])
        .sort((a, b) => b.signSheet.at - a.signSheet.at);
      if (!L.length)
        return `<div class="who" style="margin:6px 0">For a drawing that trades and the client sign: open it in <b>✏️ Drawings</b> and tap <b>✍️ Sign-off sheet</b>.</div>`;
      return `<div class="flabel" style="margin-top:10px">✏️ Go-ahead / sign-off sheets (${L.length})</div>${L.map(
        (p) => {
          const st = SIGNSHEET.status(p);
          const ok = st.filter((x) => x.st === "ok").length;
          return `<button type="button" class="incrow so-dw" data-id="${esc(p.id)}"><span><b>${esc(p.signSheet.title)}</b><br><span class="who">${p.signSheet.manual ? "👤 " + esc(p.signSheet.manual.name) + " · " : ""}${esc(p.signSheet.site || p.site || (p.signSheet.manual && p.signSheet.manual.addr) || "")} · ${ok} of ${st.length} signed · ${esc(stamp(p.signSheet.at))}</span></span><span class="tag ${st.length && ok === st.length ? "ok" : "day"}">${st.length && ok === st.length ? "✓ All signed" : "Waiting"}</span></button>`;
        },
      ).join("")}`;
    })()}
    <div class="seg" id="so-f">${[
      ["open", "Waiting"],
      ["signed", "Signed"],
      ["changes", "Changes asked"],
      ["all", "All"],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" data-v="${k}" aria-pressed="${f === k}">${l} (${k === "changes" ? all.filter((r) => r.x.status === "changes").length : k === "signed" ? all.filter((r) => r.x.status === "signed").length : k === "open" ? all.filter((r) => r.x.status === "open").length : all.length})</button>`,
      )
      .join("")}</div>
    ${
      list.length
        ? list
            .map((r, i) => {
              const K = ptKind(r.x.kind);
              const nf = (r.x.docIds || []).length + (r.x.files || []).length;
              return `<button type="button" class="incrow so-row" data-i="${all.indexOf(r)}"><span><b>${esc(r.x.title)}</b><br><span class="who">👤 ${esc(r.c.name)} · ${esc(K[1])}${nf ? ` · ${nf} file${nf === 1 ? "" : "s"}` : ""} · ${r.x.status === "open" ? "sent " + esc(stamp(r.x.created)) : esc(stamp(r.x.signedAt))}${r.p ? "" : " · waiting for them to join the portal"}</span></span><span class="tag ${r.x.status === "signed" ? "ok" : r.x.status === "changes" ? "bad" : "day"}">${r.x.status === "signed" ? "✓ Signed" : r.x.status === "changes" ? "Changes" : "Waiting"}</span></button>`;
            })
            .join("")
        : `<div class="empty"><strong>${f === "open" ? "Nothing waiting" : "Nothing here yet"}</strong>Tap "+ New sign-off sheet" to send one to a client.</div>`
    }`;
  $("so-f")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          S.f.sof = b.dataset.v;
          render();
        }),
    );
  $("main")
    .querySelectorAll(".so-dw")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = (S.mine.photos || []).find((x) => x.id === b.dataset.id);
          if (p) {
            drawOpen(p);
            return;
          }
          const g = (S.gosheets || []).find((x) => x.id === b.dataset.id);
          if (g) SIGNSHEET.view(g);
        }),
    );
  $("so-new").onclick = () => {
    const cls = (S.clients || []).filter(clActive);
    openSheet(
      `<h3 id="sheettitle">✍ New sign-off sheet</h3><label for="so-cl">Which client?<select id="so-cl"><option value="__manual">✏️ Type their details in (not in Clients)</option>${cls.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.site ? " · " + esc(c.site) : ""}${ptOf(c) ? "" : " (not joined the portal yet)"}</option>`).join("")}</select></label><div class="who">Typing their details in makes a sheet they sign on this device or on paper – nothing is added to Clients.</div>${formFoot(false, "Next")}`,
      () => {
        const v = $("so-cl").value;
        const c = cls.find((x) => x.id === v);
        closeForm();
        if (v === "__manual") {
          setTimeout(() => SIGNSHEET.openSolo({ manual: true, kind: "goahead" }), 150);
          return;
        }
        if (c) {
          if (ptOf(c)) ptMgrSubscribe(c);
          setTimeout(
            () =>
              ptAskSign(c, null, "design", () => {
                S.otab = "signoffs";
                render();
              }),
            150,
          );
        }
      },
      null,
    );
  };
  $("main")
    .querySelectorAll(".so-row")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const r = all[+b.dataset.i];
          if (!r) return;
          const docs = r.p ? SO.docs[r.p.id] || [] : r.c.ptDocs || [];
          PT.backTo = () => {
            closeViewer();
            S.otab = "signoffs";
            render();
          };
          ptOwnerSign(r.c, r.p, r.x, docs);
        }),
    );
}
