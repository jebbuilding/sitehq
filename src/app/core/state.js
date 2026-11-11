/* ================= STATE ================= */
import { addDays, iso, monday, store } from "./helpers.js";
import { acMySites } from "../people/access.js";
import { isPolDoc } from "../safety/policies-insurance.js";
import { same } from "../sites/project-pages.js";
export {
  RAW,
  S,
  applyGone,
  archivedSites,
  clActive,
  docRef,
  equipOf,
  inWeek,
  isArchivedSite,
  liveSite,
  ownerMode,
  siteGone,
  siteNames,
  weekDays,
};
const S = {
  db: null,
  user: null,
  assets: null,
  dl: null,
  invites: null, // use("people"): inviting someone to the app – owner, own hosting only (people/invite.js)
  me: null,
  owner: false,
  preview: false,
  week: monday(new Date()),
  tab: ((t) => (t === "todo" ? "jobs" : t))(store.get("jeb.tab", "time")),
  otab: store.get("jeb.otab", "time"),
  myProfile: null,
  mine: { entries: [], checks: [], photos: [], invoices: [], signoffs: [], signins: [] },
  outbox: [],
  team: {},
  data: { entries: {}, checks: {}, photos: {}, invoices: {}, signoffs: {}, signins: {} },
  names: {},
  sites: [],
  equipment: [],
  docs: [],
  inductions: [],
  jobs: [],
  jobdone: {},
  openJob: null,
  todos: [],
  offapp: [],
  promptsShown: new Set(),
  visitInds: [],
  talks: [],
  plan: [],
  planPrivate: [],
  chats: [],
  settings: {},
  chatsLoaded: false,
  ownerName: "",
  open: new Set(),
  f: { site: "", who: "", inv: "open", proj: "", range: "all", folder: "", path: "" },
  pending: false,
  employeeStarted: false,
};
const ownerMode = () => S.owner && !S.preview;
function inWeek(e) {
  const s = iso(S.week),
    f = iso(addDays(S.week, 6));
  return e.date >= s && e.date <= f;
}
function weekDays() {
  return Array.from({ length: 7 }, (_, i) => addDays(S.week, i));
}
const siteNames = () => {
  const all = S.sites.filter((x) => !x.archived).map((x) => x.name);
  /* Setup › People & access: a trade set to "only these jobs" gets just those */
  const mine = acMySites();
  return mine ? all.filter((n) => mine.some((m) => same(m, n))) : all;
};
const archivedSites = () => (S.sites || []).filter((x) => x.archived);
/* completed or rejected jobs (and their sites) don't appear in drop-downs */
/* a site you've deleted: its name is hidden everywhere (unless a new site is later made with the same name) */
const siteGone = (n) =>
  !!n &&
  ((S.settings || {}).deletedSites || []).some((g) => same(g, n)) &&
  !S.sites.some((x) => same(x.name, n));
/* a client you've deleted: anything still pointing at them is hidden */
const clientGone = (id) =>
  !!id && S.owner && S.suppliersLoaded && !(S.clients || []).some((c) => c.id === id);
const liveSite = (n) => !!n && !archivedSites().some((x) => same(x.name, n)) && !siteGone(n);
/* keep the raw lists and show only what isn't deleted */
const RAW = {
  chats: null,
  docs: null,
  inductions: null,
  plan: null,
  planPrivate: null,
  jobs: null,
};
const docRef = (d) => S.db.doc((d && d._priv ? "todos/" : "docs/") + d.id);
function applyGone() {
  if (RAW.docs || RAW.privDocs) {
    S.docs = (RAW.docs || [])
      .concat(RAW.privDocs || [])
      .filter(
        (d) =>
          !isPolDoc(d) &&
          !siteGone(d.site) &&
          (S.owner || !(d.who || []).length || (d.who || []).includes(S.me)),
      );
    S.policies = (RAW.docs || []).filter(isPolDoc);
  }
  if (RAW.inductions) S.inductions = RAW.inductions.filter((i) => !siteGone(i.site));
  if (RAW.plan) S.plan = RAW.plan.filter((p) => !siteGone(p.site) && !clientGone(p.clientId));
  if (RAW.planPrivate)
    S.planPrivate = RAW.planPrivate.filter((p) => !siteGone(p.site) && !clientGone(p.clientId));
  if (RAW.jobs) S.jobs = RAW.jobs.filter((j) => !siteGone(j.site));
  if (RAW.chats) S.chats = RAW.chats.filter((c) => !(c.site && siteGone(c.site)));
}
const clActive = (c) => c && !["done", "lost"].includes(c.stage);
const isArchivedSite = (n) => archivedSites().some((x) => same(x.name, n));
const equipOf = (k) => S.equipment.filter((x) => x.kind === k).map((x) => x.name);
