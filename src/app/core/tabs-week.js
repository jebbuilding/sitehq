/* ================= TABS & WEEK ================= */
import { calcView } from "../calculators/calculator.js";
import { chatView, unread, visibleChats } from "../chat/chat.js";
import { clientsView } from "../clients/address-book.js";
import { portalTab } from "../clients/portal-calendar.js";
import { renderClient, renderClientJoin, renderWelcomeChoice } from "../clients/portal.js";
import { signoffsTab } from "../clients/sign-offs.js";
import { $, addDays, esc, iso, monday, store, toast } from "./helpers.js";
import { drawNowBar } from "./now-bar.js";
import { issueBadge } from "./report-issue.js";
import { S, ownerMode } from "./state.js";
import { drawView } from "../drawing/drawings-tab.js";
import { SIGNSHEET } from "../drawing/sign-off-sheet.js";
import { isSketch } from "../drawing/trade-drawings.js";
import { flushOutbox, outboxBanner } from "../files/outbox.js";
import { nfCounts, nfMarkSeenSoon } from "../owner/alerts.js";
import { costsView } from "../owner/biz-costs.js";
import { LEADS } from "../owner/leads.js";
import {
  allTeam,
  ownerInvoices,
  ownerPhotos,
  ownerSetup,
  ownerTime,
  startPreview,
  teamIds,
} from "../owner/owner.js";
import { empChecks, ownerChecks } from "../owner/reports-home.js";
import { nlApply, nlName, nlSectionView, todayView } from "../owner/today.js";
import {
  sentTodosHTML,
  todoView,
  todosOf,
  tradeTodosHTML,
  wireSentTodos,
  wireTradeTodos,
} from "../owner/todo-lists.js";
import { whatsNewHTML, wireWhatsNew, wnCapture } from "../owner/whats-new.js";
import { amForeman, foremanView } from "../people/foreman.js";
import { inductionsView } from "../people/induction-matrix.js";
import { detailsDone, myDetails, renderDetailsNeeded } from "../people/personal-details.js";
import { myDetailsView, peopleView } from "../people/profile-photos.js";
import {
  PROMPT_FORMS,
  installCard,
  maybePopPrompts,
  myOpenPrompts,
  mySchedDue,
  openPromptSender,
  promptBanner,
  schedBanner,
  wireInstall,
  wirePromptBanner,
  wireSched,
} from "../people/reminders.js";
import { wagesView } from "../people/wage-calc.js";
import { empPhotos } from "../photos/photos.js";
import { enhancePhotoGrids } from "../photos/select-zip.js";
import { plannerView } from "../planner/board.js";
import { empInvoices } from "../purchasing/invoices.js";
import { isInv, materialsView, receiptsView } from "../purchasing/materials-receipts.js";
import { SAMPLES } from "../purchasing/samples.js";
import { suppliersView } from "../purchasing/suppliers.js";
import { hasProblem } from "../safety/checklists.js";
import { myVehIns } from "../safety/expiry-dates.js";
import { myPolTodo, policiesView } from "../safety/policies-insurance.js";
import { empIndTodo, indFor } from "../safety/site-inductions.js";
import { expiryState, myTalkTodo, trainingView } from "../safety/training.js";
import { accountsView } from "../sales/accounts.js";
import { acTradeRcpts } from "../sales/acct-receipts.js";
import { cisView } from "../sales/cis-returns.js";
import { estView } from "../sales/estimating.js";
import { salesView } from "../sales/sales.js";
import { hsView } from "../sites/doc-visibility.js";
import { jobProgress, myJobs } from "../sites/job-sheets.js";
import { autoPins } from "../sites/maps-pins.js";
import { plansView, unsignedRams } from "../sites/plans-specs.js";
import { ownerProjects } from "../sites/project-pages.js";
import { SIGNIN, signOnly } from "../sites/sign-in-book.js";
import { arcMigrate } from "../sites/storage.js";
import { jobsView, renderJobDetail } from "../survey/door-window-survey.js";
import { dayworkView, myDayworkView } from "../timesheets/day-work.js";
import { empTime } from "../timesheets/time.js";
export { EMP_TABS, OWN_TABS, curTab, empTabs, initTabsWeek, refreshJobDetail, render, renderTabs };
const TAB_SVG = {
  calc: `<svg class="tabico" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="1" width="11" height="14" rx="2" fill="#5b6b7a"/><rect x="4" y="2.6" width="8" height="3.2" rx=".6" fill="#cfe8d6"/><g fill="#fff"><rect x="4" y="7" width="2.2" height="1.8" rx=".4"/><rect x="6.9" y="7" width="2.2" height="1.8" rx=".4"/><rect x="9.8" y="7" width="2.2" height="1.8" rx=".4"/><rect x="4" y="9.6" width="2.2" height="1.8" rx=".4"/><rect x="6.9" y="9.6" width="2.2" height="1.8" rx=".4"/><rect x="4" y="12.2" width="2.2" height="1.8" rx=".4"/><rect x="6.9" y="12.2" width="2.2" height="1.8" rx=".4"/></g><rect x="9.8" y="9.6" width="2.2" height="4.4" rx=".4" fill="#f2a33a"/></svg>`,
  invoices: `<svg class="tabico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#5b6b7a" stroke-width="1.1" stroke-linejoin="round"/><path d="M10 1v3h3" fill="#e6ecf1" stroke="#5b6b7a" stroke-width="1.1" stroke-linejoin="round"/><text x="4.4" y="8.6" font-size="6" font-weight="800" fill="#1d8a4a" font-family="system-ui,sans-serif">£</text><g stroke="#9aa7b3" stroke-width="1" stroke-linecap="round"><path d="M8 6.4h3M8 8.2h3M4.6 10.6h6.4M4.6 12.6h4"/></g></svg>`,
};
const EMP_TABS = [
  ["time", "⏱️ Timesheets"],
  ["mydw", "🧱 Day work"],
  ["chat", "💬 Chat"],
  ["planner", "🗓️ Planner"],
  ["jobs", "🔨 Jobs & to-dos"],
  ["plans", "🏗️ Sites"],
  ["checks", "📋 Reports"],
  ["photos", "📷 Photos"],
  ["materials", "🧰 Materials & tools"],
  ["suppliers", "🏪 Merchants"],
  ["receipts", "🧾 Receipts"],
  ["invoices", "📑 Invoices"],
  ["training", "🎓 Training"],
  ["policies", "🛡️ Policies & insurance"],
  ["calc", "🧮 Calculator"],
  ["draw", "✏️ Drawings"],
  ["details", "🪪 My details"],
];
const OWN_TABS = [
  ["me", "📝 My forms"],
  ["planner", "🗓️ Planner"],
  ["todo", "✅ My to-do"],
  ["time", "⏱️ Timesheets"],
  ["signin", "📍 Sign-in book"],
  ["daywork", "🧱 Day work"],
  ["chat", "💬 Chat"],
  ["jobs", "📋 Forms"],
  ["projects", "🏗️ Sites"],
  ["clients", "👥 Clients"],
  ["samples", "🎨 Samples"],
  ["leads", "📬 Leads"],
  ["portal", "🏡 Client portal"],
  ["hs", "🦺 Health & safety"],
  ["checks", "📋 Reports"],
  ["photos", "📷 Photos"],
  ["materials", "🧰 Materials & tools"],
  ["suppliers", "🏪 Merchants"],
  ["invoices", "📑 Trades' invoices"],
  ["training", "🎓 Training"],
  ["policies", "🛡️ Policies & insurance"],
  ["people", "👷 Employees"],
  ["wages", "💷 Wage calculator"],
  ["inductions", "🦺 Site inductions"],
  ["costs", "📊 Business costings"],
  ["sales", "💰 Estimates & invoices"],
  ["estim", "📐 Estimating"],
  ["cis", "🏗️ CIS returns"],
  ["accounts", "📒 Accounts"],
  ["calc", "🧮 Calculator"],
  ["draw", "✏️ Drawings"],
  ["setup", "⚙️ Setup"],
];
function curTab() {
  if (ownerMode()) return S.otab;
  if (signOnly(S.me) && (!S.tab || S.tab === "time" || S.tab === "mydw")) return "signin";
  return S.tab;
}
/* trades' tabs: everyone gets Sign in; people from another company / agency set to sign-in only don't get timesheets or day work */
function empTabs() {
  const so = signOnly(S.me);
  let t = EMP_TABS.filter((x) => !(so && (x[0] === "time" || x[0] === "mydw")));
  const i = so ? 0 : t.findIndex((x) => x[0] === "time") + 1;
  t = t.slice(0, i).concat([["signin", "📍 Sign in"]], t.slice(i));
  return t;
}
function renderTabs() {
  const tabs = ownerMode()
    ? OWN_TABS
    : amForeman()
      ? [["foreman", "🦺 Foreman"]].concat(empTabs())
      : empTabs();
  const t = curTab();
  const badge = {};
  const cu = visibleChats().filter(unread).length;
  if (cu) badge.chat = cu;
  if (!ownerMode()) {
    const u = unsignedRams().length + empIndTodo().length + SIGNSHEET.unsigned().length;
    if (u) badge.plans = u;
    const jo = myJobs().filter(
      (j) =>
        j.status !== "closed" &&
        (() => {
          const p = jobProgress(j);
          return p.d < p.n;
        })(),
    ).length;
    if (jo) badge.jobs = jo;
    const tdn = todosOf(S.mine.signoffs).filter((t) => !t.done).length;
    if (tdn) badge.jobs = (badge.jobs || 0) + tdn;
    const sdn = mySchedDue().length;
    if (sdn) badge.checks = (badge.checks || 0) + sdn;
    const op = myOpenPrompts();
    op.forEach((p) => {
      const t = (PROMPT_FORMS[p.form] || [])[1] || "time";
      badge[t] = (badge[t] || 0) + 1;
    });
    const tt = myTalkTodo().length;
    if (tt) badge.training = tt;
    const pt = myPolTodo().length;
    if (pt) badge.policies = (badge.policies || 0) + pt;
  } else {
    const r = S.jobs.filter(
      (j) =>
        j.status !== "closed" &&
        (() => {
          const p = jobProgress(j);
          return p.n && p.d === p.n;
        })(),
    ).length;
    if (r) badge.jobs = r;
    const ce = allTeam("signoffs").filter(
      (c) => c.type === "cert" && expiryState(c.expires),
    ).length;
    if (ce) badge.training = ce;
    const lp = allTeam("signoffs").filter(
      (x) => x.type === "leave" && x.status === "pending",
    ).length;
    if (lp) badge.planner = lp;
    const pm = teamIds().filter((id) => !detailsDone(S.team[id] && S.team[id].details)).length;
    if (pm) badge.people = pm;
    const mt2 = S.todos.filter((t) => !t.done && t.due && t.due <= iso(new Date())).length;
    if (mt2) badge.todo = mt2;
    const skc = allTeam("photos").filter((p) => isSketch(p) && p.check === "open").length;
    if (skc) badge.photos = skc;
  }
  if (ownerMode()) {
    const def =
      allTeam("checks").filter((c) => hasProblem(c) && !c.fixed).length +
      allTeam("signoffs").filter(
        (x) =>
          (x.type === "incident" && x.status !== "reviewed") ||
          (x.type === "ra" && !x.reviewedAt && x.who !== S.me),
      ).length;
    if (def) badge.checks = def;
    const inv = allTeam("invoices").filter(
      (i) => isInv(i) && (i.status || "sent") === "sent",
    ).length;
    if (inv) badge.invoices = inv;
    const mt = allTeam("invoices").filter(
      (i) => i.kind === "materials" && !i.fromOwner && (i.status || "sent") === "sent",
    ).length;
    if (mt) badge.materials = mt;
    /* trades' receipts not yet filed into the accounts */
    const rn = acTradeRcpts().length;
    if (rn) badge.accounts = (badge.accounts || 0) + rn;
    const cf = (S.clients || []).filter((c) => c.stage === "enquiry").length;
    if (cf) badge.clients = cf;
  }
  try {
    issueBadge();
  } catch (e) {}
  S.badgeNow = badge;
  try {
    wnCapture(t);
  } catch (e) {}
  try {
    arcMigrate();
  } catch (e) {}
  try {
    if (!S.preview && (S.sites || []).length && !S.autoPinsDone) setTimeout(autoPins, 4000);
  } catch (e) {}
  let nb = {};
  try {
    if (ownerMode() && !S.preview) {
      nfMarkSeenSoon(t);
      nb = nfCounts();
      delete nb[t];
    }
  } catch (e) {}
  $("tabs").innerHTML = tabs
    .map(
      ([k, l]) =>
        `<button type="button" class="tab" role="tab" data-t="${k}" aria-selected="${k === t || (k === "jobs" && t === "signoffs")}">${TAB_SVG[k] || ""}${l}${badge[k] ? `<span class="badge">${badge[k]}</span>` : ""}${nb[k] ? `<span class="badge newb" title="New since you last looked">${badge[k] ? "+" : ""}${nb[k]} new</span>` : ""}</button>`,
    )
    .join("");
  if (S.preview)
    $("tabs").insertAdjacentHTML(
      "afterbegin",
      `<button type="button" class="tab backtab" data-t="__back">‹ Team view</button>`,
    );
  drawNowBar();
  $("tabs")
    .querySelectorAll(".tab")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.t === "__back") {
            S.preview = false;
            render();
            return;
          }
          if (b.dataset.t === "me") {
            startPreview();
            return;
          }
          if (b.dataset.t === "checks") S.f.rcat = "";
          if (b.dataset.t === "policies") S.f.polf = "";
          if (b.dataset.t === "projects") S.f.projList = true;
          if (b.dataset.t === "clients" && ownerMode()) {
            S.f.clf = "onsite";
            S.f.clq = "";
          }
          if (ownerMode()) {
            S.otab = b.dataset.t;
            store.set("jeb.otab", S.otab);
          } else {
            S.tab = b.dataset.t;
            store.set("jeb.tab", S.tab);
          }
          render();
        }),
    );
}
function renderWeek() {
  const show =
    (curTab() === "time" && ownerMode()) ||
    curTab() === "checks" ||
    (curTab() === "photos" && (!ownerMode() || S.f.pwhen === "week")) ||
    (curTab() === "planner" && (S.f.pmode || (ownerMode() ? "board" : "week")) === "week");
  $("weekbar").hidden = !show;
  if (!show) return;
  const e = addDays(S.week, 6);
  const sameM = S.week.getMonth() === e.getMonth();
  $("wk").textContent =
    "Week of " +
    S.week.getDate() +
    (sameM ? "" : " " + S.week.toLocaleDateString("en-GB", { month: "short" })) +
    " – " +
    e.getDate() +
    " " +
    e.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  $("thisweek").hidden = iso(S.week) === iso(monday(new Date()));
}

function render() {
  const m0 = $("main");
  if (m0) {
    const keep =
      window.scrollY + window.innerHeight - m0.getBoundingClientRect().top - window.scrollY;
    m0.style.minHeight = Math.max(0, Math.round(keep)) + "px";
  }
  const a = document.activeElement;
  if (
    a &&
    $("main").contains(a) &&
    /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) &&
    a.type !== "checkbox"
  ) {
    S.pending = true;
    return;
  }
  S.pending = false;
  if (!S.db) return;
  if (S.client) {
    renderClient();
    return;
  }
  if (S.roleChecking) {
    $("tabs").hidden = true;
    $("weekbar").hidden = true;
    $("main").innerHTML =
      '<div class="nothing" style="padding:30px;text-align:center">Loading…</div>';
    return;
  }
  if (!ownerMode() && (!S.myProfile || !S.myProfile.name)) {
    $("tabs").hidden = true;
    $("weekbar").hidden = true;
    if (S.wcRole === "client") {
      renderClientJoin();
      return;
    }
    if (S.wcRole !== "team") {
      renderWelcomeChoice();
      return;
    }
    renderWelcome();
    return;
  }
  if (!ownerMode() && !S.preview && !detailsDone(myDetails())) {
    $("tabs").hidden = true;
    $("weekbar").hidden = true;
    renderDetailsNeeded();
    return;
  }
  $("tabs").hidden = false;
  renderTabs();
  renderWeek();
  nlApply();
  $("offline").hidden = navigator.onLine !== false;
  const t = curTab();
  if (ownerMode()) {
    $("h1").textContent =
      t === "today"
        ? "Today"
        : t === "wages"
          ? "Wage calculator"
          : t === "inductions"
            ? "Site inductions"
            : t === "costs"
              ? "Business costings"
              : t === "sales"
                ? "Estimates & invoices"
                : t === "cis"
                  ? "CIS returns"
                  : t === "accounts"
                    ? "Accounts"
                    : /^sec-/.test(t)
                      ? nlName(t.slice(4))
                      : t === "daywork"
                        ? "Day work (chargeable hours)"
                        : t === "draw"
                          ? "Drawings"
                          : t === "portal"
                            ? "Client portal"
                            : t === "leads"
                              ? "Planning leads"
                              : t === "samples"
                                ? "Samples"
                                : t === "signin"
                                  ? "Site sign-in book"
                                  : t === "signoffs"
                                    ? "Forms · sign-offs"
                                    : t === "clients"
                                      ? "Clients"
                                      : t === "projects"
                                        ? "Sites"
                                        : t === "suppliers"
                                          ? "Merchants"
                                          : t === "policies"
                                            ? "Policies & insurance"
                                            : t === "hs"
                                              ? "Health & safety"
                                              : t === "checks"
                                                ? "Reports"
                                                : t === "jobs"
                                                  ? "Forms"
                                                  : t === "training"
                                                    ? "Training"
                                                    : t === "chat"
                                                      ? "Chat"
                                                      : t === "planner"
                                                        ? "Planner"
                                                        : t === "materials"
                                                          ? "Materials & tools"
                                                          : t === "receipts"
                                                            ? "Receipts"
                                                            : t === "people"
                                                              ? "Employees"
                                                              : t === "todo"
                                                                ? "To do"
                                                                : t === "estim"
                                                                  ? "Estimating"
                                                                  : t === "calc"
                                                                    ? "Calculator"
                                                                    : "Team";
    $("who").textContent = "Owner view · you see everyone";
    const ASK = {
      policies: "policy",
      todo: "",
      time: "timesheet",
      checks: "check-vehicle",
      photos: "photos",
      materials: "materials",
      receipts: "receipt",
      invoices: "invoice",
      training: "talk",
      plans: "rams",
      projects: "induction",
    };
    (
      ({
        today: todayView,
        wages: wagesView,
        inductions: inductionsView,
        costs: costsView,
        sales: salesView,
        cis: cisView,
        accounts: accountsView,
        "sec-jobs": () => nlSectionView("jobs"),
        "sec-people": () => nlSectionView("people"),
        "sec-paper": () => nlSectionView("paper"),
        "sec-setup": () => nlSectionView("setup"),
        hs: hsView,
        draw: drawView,
        daywork: dayworkView,
        portal: portalTab,
        leads: LEADS.view,
        samples: SAMPLES.view,
        signin: SIGNIN.view,
        signoffs: signoffsTab,
        time: ownerTime,
        checks: ownerChecks,
        photos: ownerPhotos,
        invoices: ownerInvoices,
        plans: plansView,
        projects: ownerProjects,
        setup: ownerSetup,
        people: peopleView,
        todo: todoView,
        jobs: jobsView,
        training: trainingView,
        chat: chatView,
        planner: plannerView,
        materials: materialsView,
        receipts: () => {
          S.otab = "accounts";
          S.f.act = "rcpt";
          accountsView();
        },
        calc: calcView,
        estim: estView,
        policies: policiesView,
        suppliers: suppliersView,
        clients: clientsView,
      })[t] || ownerTime
    )();
    if (t === "jobs") {
      $("main").insertAdjacentHTML("afterbegin", sentTodosHTML());
      wireSentTodos();
    }
    if (t === "jobs" || t === "signoffs") {
      $("main").insertAdjacentHTML(
        "afterbegin",
        `<div class="seg fmtabs" style="margin-bottom:10px"><button type="button" class="fm-t" data-v="jobs" aria-pressed="${t === "jobs"}">📋 Forms</button><button type="button" class="fm-t" data-v="signoffs" aria-pressed="${t === "signoffs"}">✍️ Sign-offs</button></div>`,
      );
      $("main")
        .querySelectorAll(".fm-t")
        .forEach(
          (b) =>
            (b.onclick = () => {
              S.otab = b.dataset.v;
              store.set("jeb.otab", S.otab);
              render();
              window.scrollTo(0, 0);
            }),
        );
    }
    if (ASK[t] && teamIds().length) {
      const site = t === "projects" ? S.f.proj : "";
      const ind = site ? indFor(site) : null;
      $("main").insertAdjacentHTML(
        "afterbegin",
        `<div class="askbar"><button type="button" class="pillbtn pr-ask" data-form="${t === "projects" && !ind ? "photos" : ASK[t]}" data-ref="${ind ? esc(ind.id) : ""}">Send a reminder…</button></div>`,
      );
      $("main").querySelector(".pr-ask").onclick = (e) =>
        openPromptSender([], {
          form: e.currentTarget.dataset.form,
          ref: e.currentTarget.dataset.ref,
          note: t === "projects" && site && !ind ? "For " + site + "." : "",
        });
    }
    try {
      const wn = t === "planner" ? "" : whatsNewHTML(t);
      if (wn) {
        $("main").insertAdjacentHTML("afterbegin", wn);
        wireWhatsNew();
      }
    } catch (e) {}
  } else {
    $("h1").textContent =
      {
        signin: "Sign in",
        mydw: "My day work",
        draw: "Drawings",
        time: "My timesheet",
        checks: "My reports",
        photos: "My photos",
        invoices: "My invoices",
        plans: "Sites",
        jobs: "My jobs",
        training: "Training",
        chat: "Chat",
        planner: "Planner",
        materials: "Materials & tools",
        receipts: "My receipts",
        details: "My details",
        todo: "My jobs",
        calc: "Calculator",
        policies: "Policies & insurance",
        suppliers: "Suppliers",
        foreman: "Foreman",
      }[t] || "My timesheet";
    $("who").textContent = S.myProfile.name + (S.preview ? " · preview" : "");
    (
      ({
        signin: SIGNIN.view,
        mydw: myDayworkView,
        draw: drawView,
        time: empTime,
        checks: () => {
          empChecks();
          try {
            myVehIns();
          } catch (e) {}
        },
        photos: empPhotos,
        invoices: empInvoices,
        plans: plansView,
        jobs: jobsView,
        training: trainingView,
        chat: chatView,
        planner: plannerView,
        materials: materialsView,
        receipts: receiptsView,
        details: myDetailsView,
        todo: jobsView,
        calc: calcView,
        policies: policiesView,
        suppliers: suppliersView,
        foreman: amForeman() ? foremanView : empTime,
      })[t] || empTime
    )();
    if (t === "jobs" || t === "todo") {
      const th = tradeTodosHTML();
      if (th) {
        $("main").insertAdjacentHTML("afterbegin", th);
        wireTradeTodos();
      }
    }
    if (t === "plans" || t === "signin") {
      const sb = SIGNSHEET.bannerHtml();
      if (sb) {
        $("main").insertAdjacentHTML("afterbegin", sb);
        SIGNSHEET.wireBanner($("main"));
      }
    }
    const ob = outboxBanner();
    if (ob) {
      $("main").insertAdjacentHTML("afterbegin", ob);
      $("ob-send").onclick = () => {
        toast("Trying to send…");
        flushOutbox();
      };
    }
    const pb = promptBanner();
    if (pb) {
      $("main").insertAdjacentHTML("afterbegin", pb);
      wirePromptBanner();
    }
    const sb = schedBanner();
    if (sb) {
      $("main").insertAdjacentHTML("afterbegin", sb);
      wireSched($("main"));
    }
    if (!S.preview && !S.instLater && curTab() === "time") {
      const ic = installCard();
      if (ic) {
        $("main").insertAdjacentHTML("afterbegin", ic);
        wireInstall();
      }
    }
    setTimeout(maybePopPrompts, 300);
    try {
      const wn = whatsNewHTML(t);
      if (wn) {
        $("main").insertAdjacentHTML("afterbegin", wn);
        wireWhatsNew();
      }
    } catch (e) {}
    if (S.preview) {
      $("main").insertAdjacentHTML(
        "afterbegin",
        `<div class="notice me-bar"><span><b>My forms.</b> You're filling in forms as yourself. Anything you save is recorded under your name and shows in your team views.</span><button class="btn primary backbtn" id="endprev" type="button">‹ Back to team view</button></div>`,
      );
      $("endprev").onclick = () => {
        S.preview = false;
        render();
      };
    }
  }
}
const _render0 = render;
function refreshJobDetail() {
  const a = document.activeElement;
  if (
    S.openJob &&
    !$("viewer").hidden &&
    !(a && $("viewer").contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== "checkbox")
  )
    renderJobDetail();
}

function renderWelcome() {
  $("h1").textContent = "Welcome";
  $("main").innerHTML =
    `<form class="card" id="nameform" style="padding:16px;display:flex;flex-direction:column;gap:12px">
    <div class="who">Enter your name once so your hours, checks, photos and invoices go to the right person. Only you and James can see them.</div>
    <label for="nm">Your full name<input id="nm" required maxlength="60" placeholder="e.g. Sam Taylor"></label>
    <button class="btn primary" type="submit">Start</button></form>`;
  $("nameform").onsubmit = async (e) => {
    e.preventDefault();
    const n = $("nm").value.trim();
    if (!n) return;
    $("nm").blur();
    try {
      await S.db.doc("sheets/" + S.me).set({ name: n, joined: Date.now(), updated: Date.now() });
    } catch (err) {
      toast("Couldn't save. Ask James to make you an Editor on this page.");
    }
  };
}

/* Runs once when the app starts, called from core/boot.js. Nothing else in this file runs at load. */
function initTabsWeek() {
  $("prev").onclick = () => {
    S.week = addDays(S.week, -7);
    render();
  };
  $("next").onclick = () => {
    S.week = addDays(S.week, 7);
    render();
  };
  $("thisweek").onclick = () => {
    S.week = monday(new Date());
    render();
  };
  render = function () {
    _render0.apply(this, arguments);
    try {
      if (!S.pending) enhancePhotoGrids($("main"));
    } catch (e) {}
  };
  {
    let lastY = window.scrollY;
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        if (y < lastY - 40) {
          const m = $("main");
          if (m && m.style.minHeight) m.style.minHeight = "";
        }
        lastY = y;
      },
      { passive: true },
    );
  }
  $("main").addEventListener("focusout", (e) => {
    const nx = e.relatedTarget;
    const wait = nx && $("main").contains(nx) && /^(BUTTON|A|LABEL)$/.test(nx.tagName) ? 400 : 0;
    setTimeout(() => {
      const a = document.activeElement;
      if (
        S.pending &&
        !(
          a &&
          $("main").contains(a) &&
          /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) &&
          a.type !== "checkbox"
        )
      )
        render();
    }, wait);
  });
}
