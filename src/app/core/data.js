/* ================= DATA ================= */
import { syncSettings } from "../chat/chat.js";
import { bossFirst } from "./company-names.js";
import { $ } from "./helpers.js";
import { refreshAllTrades, syncTradeFetches } from "./live-feed.js";
import { myColl } from "./sheet.js";
import { S, ownerMode } from "./state.js";
import { render } from "./tabs-week.js";
import { sphotoPut, sphotoWanted } from "../files/outbox.js";
import { allTeam } from "../owner/owner.js";
export { mapDocs, startEmployee, startOwner };
const mapDocs = (snap) => snap.docs.map((d) => Object.assign({}, d.data(), { id: d.id }));
function startEmployee() {
  S.db.doc("sheets/" + S.me).onSnapshot(
    (s) => {
      if (S.client) return;
      S.myProfile = s.exists ? s.data() : null;
      render();
    },
    () => {},
  );
  ["entries", "checks", "photos", "invoices", "signoffs", "signins"].forEach((c) =>
    myColl(c).onSnapshot(
      (snap) => {
        S.mine[c] = mapDocs(snap);
        render();
        if (!ownerMode())
          $("status").textContent =
            `Saved to your account · only you and ${bossFirst()} can see this`;
      },
      () => {
        $("status").textContent = "Couldn't load your entries. Reload to try again.";
      },
    ),
  );
}
function startOwner() {
  setInterval(refreshAllTrades, 10 * 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshAllTrades();
  });
  const subs = {};
  if (!S.employeeStarted) {
    S.employeeStarted = true;
    startEmployee();
  }
  S.db.doc("sheets/" + S.me).onSnapshot(
    (s) => {
      if (!S.preview || !S.myProfile) S.myProfile = s.exists ? s.data() : null;
      render();
    },
    () => {},
  );
  S.db.collection("sheets").onSnapshot(
    (snap) => {
      S.team = {};
      snap.docs.forEach((d) => {
        S.team[d.id] = d.data();
      });
      syncTradeFetches();
      resolveNames();
      render();
      syncSettings();
      if (!S.sphTimer) {
        S.sphTimer = 1;
        setTimeout(syncSitePhotos, 25000);
        setTimeout(syncSitePhotos, 150000);
      }
      $("status").textContent = "Live · updates as employees add things";
    },
    () => {
      $("status").textContent = "Couldn't load the team. Reload to try again.";
    },
  );
}
async function syncSitePhotos() {
  if (!ownerMode() || S.sphSyncing) return;
  S.sphSyncing = true;
  try {
    let n = 0;
    const byWho = {};
    allTeam("photos")
      .filter(sphotoWanted)
      .forEach((p) => {
        (byWho[p.who] = byWho[p.who] || []).push(p);
      });
    for (const who of Object.keys(byWho)) {
      let have = {};
      try {
        const snap = await S.rawDb.collection("sphotos/" + who + "/p").get();
        mapDocs(snap).forEach((x) => (have[x.id] = x));
      } catch (e) {}
      for (const p of byWho[who]) {
        const h = have[p.id];
        if (
          h &&
          h.site === p.site &&
          h.category === (p.category || "") &&
          h.caption === (p.caption || "")
        )
          continue;
        if (n++ > 250) return;
        await sphotoPut(who, p.id, p);
      }
    }
  } finally {
    S.sphSyncing = false;
  }
}
async function resolveNames() {
  try {
    const ids = Object.keys(S.team);
    if (!ids.length || !S.user.profiles) return;
    const ps = await S.user.profiles(ids);
    ids.forEach((id) => {
      if (ps && ps[id] && ps[id].name) S.names[id] = ps[id].name;
    });
    render();
  } catch (e) {}
}
