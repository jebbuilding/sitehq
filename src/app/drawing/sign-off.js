/* ===== Drawing sign-off (owner sends to client and/or trades) ===== */
import { ptKind, ptOf, ptSrc } from "../clients/portal.js";
import { $, esc, iso, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S, clActive } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { SK_CAT } from "./trade-drawings.js";
import { newId } from "../files/outbox.js";
import { allTeam, nameOf, teamIds } from "../owner/owner.js";
import { siteClient } from "../sites/summary.js";
export { dwSendForSign, dwSignStatus };
function dwSignStatus(p) {
  if (!p || !p.signSent) return [];
  return allTeam("photos")
    .filter((x) => x.signOf === p.id && x.who !== S.me)
    .map((x) => ({
      name: nameOf(x.who),
      s: x.signReq || "open",
      note: x.signNote || "",
      at: x.signedAt,
    }));
}
function dwSendForSign(p, upd) {
  const ids = teamIds();
  const cls = (S.clients || []).filter(clActive);
  const sc = p.site ? siteClient(p.site) : null;
  openSheet(
    `<h3 id="sheettitle">📤 Send "${esc(p.title || "Drawing")}"</h3>${p.site ? `<div class="who">Job: <b>${esc(p.site)}</b></div>` : ""}
    <label for="sg-cl">Client<select id="sg-cl"><option value="">No client</option>${cls.map((c) => `<option value="${esc(c.id)}" ${sc && sc.id === c.id ? "selected" : ""}>${esc(c.name)}${c.site ? " · " + esc(c.site) : ""}${ptOf(c) ? "" : " (not joined yet)"}</option>`).join("")}</select></label>
    <fieldset class="od-who"><legend>Trades</legend>${ids.map((id) => `<label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" value="${esc(id)}"> ${esc(nameOf(id))}</label>`).join("") || "No trades on the app yet."}</fieldset>
    <label for="sg-note">Message (optional)<textarea id="sg-note" maxlength="400" placeholder="e.g. Please check the kitchen layout before we order units"></textarea></label>
    <label class="inl" style="color:var(--ink);font-weight:500"><input type="checkbox" id="sg-ask" checked> Ask them to approve it (they tap Approve or Needs changes and you see who has)</label>${formFoot(false, "📤 Send")}`,
    async () => {
      const to = [...document.querySelectorAll(".od-who input:checked")].map((x) => x.value);
      const cid = $("sg-cl").value;
      if (!to.length && !cid) {
        showErr("Choose a client or at least one trade.");
        return;
      }
      $("f-save").disabled = true;
      const now = Date.now();
      const note = $("sg-note").value.trim();
      const title = p.title || "Drawing";
      const ask = $("sg-ask").checked;
      try {
        let clientSign = "";
        if (cid && !ask) {
          const c = cls.find((x) => x.id === cid);
          const src = ptSrc(c);
          await src.addDoc(newId(), {
            title,
            fileName: title + ".jpg",
            assetId: p.assetId,
            contentType: "image/jpeg",
            folder: "drawings",
            note,
            sharedAt: now,
            fromSite: p.site || "",
          });
          try {
            await src.bump();
          } catch (e) {}
        }
        if (cid && ask) {
          const c = cls.find((x) => x.id === cid);
          const src = ptSrc(c);
          clientSign = newId();
          await src.addSign(clientSign, {
            kind: "design",
            title: ("Drawing: " + title).slice(0, 120),
            details: note,
            docIds: [],
            files: [{ assetId: p.assetId, name: title + ".jpg", type: "image/jpeg" }],
            statement: ptKind("design")[2],
            status: "open",
            created: now,
          });
          try {
            await src.bump();
          } catch (e) {}
        }
        for (const who of to) {
          await S.db.doc("sheets/" + who + "/photos/" + newId()).set({
            kind: "sketch",
            assetId: p.assetId,
            pageSrc: p.pageSrc || "",
            title,
            site: p.site || "",
            category: SK_CAT,
            caption: note,
            takenAt: now,
            date: iso(new Date(now)),
            fromOwner: true,
            check: "",
            signReq: ask ? "open" : "",
            signOf: ask ? p.id : "",
            created: now,
          });
        }
        if (ask) await upd({ signSent: { at: now, trades: to, client: cid || "", clientSign } });
        closeForm();
        toast(
          (ask ? "Sent for sign-off" : "Sent") +
            (to.length ? " to " + to.map(nameOf).join(", ") : "") +
            (cid ? (to.length ? " and the client" : " to the client") : ""),
        );
        render();
      } catch (e) {
        showErr("Couldn't send. Check your connection.");
        $("f-save").disabled = false;
      }
    },
    null,
  );
}
