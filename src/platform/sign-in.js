/* ================= SIGN-IN: the sign-in screen for SiteHQ on its own hosting (Cognito, emailed one-time code) =================
   Put in the page ahead of the platform adapter by the web build (scripts/bundle.mjs › webPage), with its
   stylesheet sign-in.css. Not part of src/app/ – the app does not know it exists.

   What it gives the page:  window.SITEHQ_AUTH
     token()        → Promise<string>: the Cognito ACCESS token for the adapter to send (server/auth/cognito.mjs
                      checks it). If nobody is signed in it shows this screen and resolves only once somebody is,
                      so the app simply waits and never reaches its own "Sign in to use the app" message. A token
                      close to running out is renewed first.
     signOut()      → ends the sign-in on this device and reloads the page, which then shows this screen.
                      Opening the site's address with #signout on the end does the same (there is no button in
                      the app yet).
     failed(kind)   → for the adapter: "refused" (the server would not accept our token) signs out;
                      "unreachable" shows "Can't reach SiteHQ". Returns true when it has dealt with it.

   Settings, from window.SITEHQ_CONFIG if the page sets it, otherwise /config.json (infra › PageConfig):
     region, userPoolClientId   which Cognito to talk to. No userPoolClientId = no sign-in on this page: with the
                                settings in the page (the local dev pages, which use a dev token) this file does
                                nothing at all.
     cognitoEndpoint            local development only: where the stand-in for Cognito is (server/auth/local-cognito.mjs)

   How somebody signs in: email address → Cognito emails a code (InitiateAuth, USER_AUTH + EMAIL_OTP) → they type
   it (RespondToAuthChallenge) → tokens. Cognito is called straight from the browser with fetch; no SDK.

   Where the sign-in is kept, and why (this app holds personal data and runs on shared site tablets):
     - By default in sessionStorage: it ends when the tab or the home-screen app is closed, and after 8 hours
       without a tap or a key press. Right for a tablet that is passed around.
     - Only if the person ticks "Keep me signed in on this device": in localStorage, until they sign out or
       Cognito's refresh token runs out (30 days after signing in, infra/config.ts).
     - Kept: the access token (an hour) and the refresh token. The ID token, which carries the email address, is
       thrown away. Nothing is kept in a cookie except the adapter's own /_blob one.
     - Both stores can be read by any script running in the page, so this relies on the page never running
       someone else's script. An HttpOnly cookie set by our own server would not have that weakness; it needs a
       server-side sign-in route and is not built.

   What an address without an account sees: exactly what everyone sees – "if it is set up, we have emailed it a
   code". The screen never says whether an address has an account (the user pool is set up the same way,
   preventUserExistenceErrors). The price is that a mistyped address looks like a slow email; the help text under
   the code box covers that. */
(function () {
  "use strict";
  const W = window, D = document;
  const inline = W.SITEHQ_CONFIG;
  if (inline && !inline.userPoolClientId) return; // a local dev page: it signs in with its dev token

  const KEY = "sitehq.session", NOTE = "sitehq.signin.note", OUT = "#signout";
  const ROLES = ["owner", "trade", "client"]; // server/core/roles.mjs: a person is in exactly one of these groups
  const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // a sign-in that is not "kept" ends after this long without use
  const RESEND_SECONDS = 30; // codes arrive out of order if they are asked for faster than email delivers
  const ASK = "ask whoever runs your company's account"; // who adds people

  const MSG = {
    email: "That doesn’t look like an email address. Check it and try again.",
    nocode: "Type in the code from the email.",
    wrong: "That code isn’t right. Check the email and type it in again.",
    spent: "That code can’t be used any more. It ran out, or was tried too many times. Tap “Send a new code”.",
    slow: "Too many tries. Wait a few minutes, then try again.",
    offline: "No signal. Check your connection, then try again.",
    server: "SiteHQ’s sign-in isn’t answering properly. Try again in a minute.",
    norole: "Your code was right, but your account isn’t finished being set up. Please " + ASK + " to finish adding you, then sign in again.",
  };
  const NOTES = {
    out: "You’re signed out.",
    expired: "You’ve been signed out. Sign in again to carry on.",
    idle: "You were signed out because SiteHQ hadn’t been used for a while.",
    refused: "SiteHQ didn’t accept that sign-in. Try again, and if it keeps happening please " + ASK + " to check your account.",
  };
  // Cognito's ways of saying "this person cannot sign in". The screen treats them all like a code that will not work.
  const NOT_ALLOWED = ["NotAuthorizedException", "UserNotFoundException", "UserNotConfirmedException", "PasswordResetRequiredException"];
  const THROTTLED = ["TooManyRequestsException", "LimitExceededException"];

  const never = () => new Promise(() => {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // For whoever is setting an environment up: what Cognito said, never who was signing in.
  const quiet = (what) => { try { console.warn("SiteHQ sign-in: " + what); } catch (e) {} };

  /* ---------- where the sign-in is kept ---------- */
  const store = (keep) => { try { return keep ? W.localStorage : W.sessionStorage; } catch (e) { return null; } };
  function read() {
    for (const keep of [false, true]) { // this tab's own sign-in first
      try {
        const s = JSON.parse(store(keep).getItem(KEY));
        if (s && typeof s.access === "string" && typeof s.refresh === "string" && s.until > 0) return { access: s.access, refresh: s.refresh, until: s.until, life: s.life || 3600, seen: s.seen || 0, keep };
      } catch (e) {}
    }
    return null;
  }
  function write() {
    try {
      store(session.keep).setItem(KEY, JSON.stringify({ access: session.access, refresh: session.refresh, until: session.until, life: session.life, seen: session.seen }));
      store(!session.keep).removeItem(KEY);
    } catch (e) {} // storage refused (private browsing, full): the sign-in lasts until the page is closed
  }
  function drop(reason) {
    session = null;
    for (const keep of [false, true]) try { store(keep).removeItem(KEY); } catch (e) {}
    try { D.cookie = "sitehq_token=; path=/_blob; SameSite=Strict; Max-Age=0" + (location.protocol === "https:" ? "; Secure" : ""); } catch (e) {} // the adapter's file cookie
    if (reason) try { W.sessionStorage.setItem(NOTE, reason); } catch (e) {}
  }
  function takeNote() {
    try {
      const n = W.sessionStorage.getItem(NOTE);
      W.sessionStorage.removeItem(NOTE);
      return NOTES[n] || "";
    } catch (e) {
      return "";
    }
  }

  /* ---------- tokens ---------- */
  function claims(jwt) {
    try { return JSON.parse(atob(String(jwt).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch (e) { return null; }
  }
  // Only to give a useful message early: the server decides what a token is worth, on every request.
  function hasOneRole(jwt) {
    const c = claims(jwt), groups = c && Array.isArray(c["cognito:groups"]) ? c["cognito:groups"] : [];
    return groups.filter((g) => ROLES.includes(g)).length === 1;
  }
  // Take Cognito's AuthenticationResult as the sign-in. How long the token lasts is counted from now on this
  // device's clock (ExpiresIn), so a tablet with the wrong date still renews it on time.
  function adopt(result, keep) {
    if (!result || typeof result.AccessToken !== "string" || !hasOneRole(result.AccessToken)) return false;
    const c = claims(result.AccessToken) || {}, life = Number(result.ExpiresIn) || c.exp - c.iat || 3600;
    session = { access: result.AccessToken, refresh: result.RefreshToken || (session && session.refresh) || "", until: Date.now() + life * 1000, life, seen: session ? session.seen : Date.now(), keep };
    write();
    return true;
  }

  /* ---------- Cognito ---------- */
  const endpoint = () => cfg.cognitoEndpoint || "https://cognito-idp." + cfg.region + ".amazonaws.com/";
  // Resolves Cognito's reply, or rejects { kind: "offline" | "server" | "refused", type } (type = Cognito's error name).
  async function cognito(operation, body) {
    let r;
    try {
      r = await fetch(endpoint(), {
        method: "POST",
        headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "AWSCognitoIdentityProviderService." + operation },
        body: JSON.stringify(Object.assign({ ClientId: cfg.userPoolClientId }, body)),
        cache: "no-store",
        credentials: "omit",
      });
    } catch (e) {
      throw { kind: "offline", type: "" };
    }
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (r.ok) return j || {};
    const type = String((j && j.__type) || r.headers.get("x-amzn-errortype") || "").split("#").pop().split(":")[0];
    throw { kind: r.status >= 500 ? "server" : "refused", type };
  }
  const revoke = (refreshToken) => cognito("RevokeToken", { Token: refreshToken }).catch(() => {});

  let renewing = null;
  // One renewal at a time. Rejects { final: true } when Cognito says this sign-in is over; anything else (no
  // signal, Cognito busy) leaves the sign-in as it is, to be tried again on the next request.
  function renew() {
    if (!renewing) {
      const keep = session.keep;
      renewing = cognito("InitiateAuth", { AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: session.refresh } })
        .then(
          (r) => { if (!session || !adopt(r.AuthenticationResult, keep)) throw { final: true }; },
          (e) => { throw { final: e.kind === "refused" && NOT_ALLOWED.includes(e.type) }; },
        )
        .finally(() => { renewing = null; });
    }
    return renewing;
  }

  /* ---------- the screen ---------- */
  let root = null, locked = [];
  let ask = { email: "", keep: false, session: "", tries: 0, resendAt: 0 }; // the sign-in being attempted
  function el(tag, attrs, ...kids) {
    const n = D.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    for (const k of kids) if (k) n.append(k); // strings go in as text, never as markup
    return n;
  }
  // Everything else in the page is out of reach of touch, keyboard and screen readers while the screen is up.
  function lock() {
    if (!root || root.hidden || !D.body) return;
    for (const n of D.body.children) if (n !== root && !n.hasAttribute("inert")) { n.setAttribute("inert", ""); locked.push(n); }
  }
  function show(step) {
    if (!root) {
      root = el("div", { id: "sitehq-signin", class: "signin", role: "dialog", "aria-modal": "true", "aria-labelledby": "signin-title" });
      (D.body || D.documentElement).appendChild(root);
    }
    const s = STEPS[step]();
    root.dataset.step = step;
    root.replaceChildren(s.form);
    root.hidden = false;
    lock();
    if (s.focus) try { s.focus.focus({ preventScroll: true }); } catch (e) {}
  }
  function hide() {
    if (root) { root.hidden = true; root.replaceChildren(); }
    for (const n of locked) n.removeAttribute("inert");
    locked = [];
  }
  const card = (title, ...kids) => el("form", { class: "signin-card", novalidate: "" }, el("div", { class: "signin-brand" }, "Site", el("b", null, "HQ")), el("h1", { id: "signin-title" }, title), ...kids);
  const errorBox = () => el("p", { class: "signin-error", role: "alert" });
  function working(button, label) { button.disabled = !!label; if (label) { button.dataset.label = button.textContent; button.textContent = label; } else button.textContent = button.dataset.label; }

  const STEPS = {
    // while the settings are fetched: covers the app's empty shell
    wait: () => ({ form: card("Opening…") }),

    down: () => {
      const go = el("button", { type: "submit", class: "signin-go" }, "Try again");
      const form = card("Can’t reach SiteHQ", el("p", { class: "signin-lead" }, "Check your signal, then try again."), go);
      form.onsubmit = (ev) => { ev.preventDefault(); location.reload(); };
      return { form, focus: go };
    },

    email: () => {
      const note = takeNote();
      const input = el("input", { id: "signin-email", type: "email", name: "email", autocomplete: "email", inputmode: "email", autocapitalize: "none", autocorrect: "off", spellcheck: "false" });
      input.value = ask.email;
      const keep = el("input", { id: "signin-keep", type: "checkbox" });
      keep.checked = ask.keep;
      const error = errorBox(), go = el("button", { type: "submit", class: "signin-go" }, "Send me a code");
      const form = card(
        "Sign in",
        note && el("p", { class: "signin-note", role: "status" }, note),
        el("p", { class: "signin-lead" }, "Enter your email address and we’ll email you a code to sign in with. There’s no password."),
        el("label", { class: "signin-field" }, "Email address", input),
        el("label", { class: "signin-keep" }, keep, el("span", null, "Keep me signed in on this device", el("small", null, "Only tick this on your own phone or tablet, not one you share."))),
        error,
        go,
      );
      form.onsubmit = async (ev) => {
        ev.preventDefault();
        if (go.disabled) return;
        const email = input.value.trim().toLowerCase();
        error.textContent = "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = MSG.email; return; }
        ask = { email, keep: keep.checked, session: "", tries: 0, resendAt: 0 };
        working(go, "Sending…");
        const problem = await sendCode();
        if (!problem) return show("code");
        working(go, "");
        error.textContent = problem;
      };
      return { form, focus: input };
    },

    code: () => {
      const input = el("input", { id: "signin-code", class: "signin-code", type: "text", name: "code", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "one-time-code", maxlength: "12", autocapitalize: "none", autocorrect: "off", spellcheck: "false" });
      const error = errorBox(), go = el("button", { type: "submit", class: "signin-go" }, "Sign in");
      const again = el("button", { type: "button", class: "signin-alt", id: "signin-again" }, "Send a new code");
      const other = el("button", { type: "button", class: "signin-alt", id: "signin-other" }, "Use a different email address");
      const form = card(
        "Check your email",
        el("p", { class: "signin-lead" }, "If ", el("b", null, ask.email), " is set up for SiteHQ, we’ve just emailed it a code. It can take a minute to arrive."),
        el("label", { class: "signin-field" }, "Code from the email", input),
        error,
        go,
        again,
        other,
        el("p", { class: "signin-help" }, "No email? Check your junk folder, and that the address above is right. If it still doesn’t come, " + ASK + " to add you to SiteHQ."),
      );
      // a new code only once the last one has had time to arrive
      again.disabled = true;
      const mine = ask;
      setTimeout(() => { if (ask === mine && again.isConnected) again.disabled = false; }, Math.max(0, ask.resendAt - Date.now()));
      form.onsubmit = async (ev) => {
        ev.preventDefault();
        if (go.disabled) return;
        const code = input.value.replace(/\D/g, "");
        error.textContent = "";
        if (code.length < 4) { error.textContent = MSG.nocode; return; }
        working(go, "Checking…");
        const problem = await checkCode(code);
        if (!problem) return;
        working(go, "");
        error.textContent = problem;
        try { input.select(); } catch (e) {}
      };
      again.onclick = async () => {
        error.textContent = "";
        working(again, "Sending…");
        const problem = await sendCode();
        if (!problem) return show("code");
        working(again, "");
        error.textContent = problem;
      };
      other.onclick = () => show("email");
      return { form, focus: input };
    },
  };

  // Ask Cognito to email a code. Resolves "" when the code step should be shown – which is also what happens for
  // an address with no account – or the message to show instead.
  async function sendCode() {
    ask.session = "";
    ask.tries = 0;
    try {
      const r = await cognito("InitiateAuth", { AuthFlow: "USER_AUTH", AuthParameters: { USERNAME: ask.email, PREFERRED_CHALLENGE: "EMAIL_OTP" } });
      if (r.ChallengeName === "EMAIL_OTP" && r.Session) ask.session = r.Session;
      else quiet("no emailed-code challenge was offered (" + (r.ChallengeName || "none") + ")"); // e.g. Cognito's stand-in challenge for an unknown address
    } catch (e) {
      if (e.kind !== "refused") return e.kind === "offline" ? MSG.offline : MSG.server;
      if (THROTTLED.includes(e.type)) return MSG.slow;
      quiet("InitiateAuth was refused: " + (e.type || "no reason given"));
      if (!NOT_ALLOWED.includes(e.type)) return MSG.server; // our set-up is wrong, not the person
    }
    ask.resendAt = Date.now() + RESEND_SECONDS * 1000;
    return "";
  }

  // Resolves "" once signed in (the screen has gone), or the message to show.
  async function checkCode(code) {
    if (!ask.session) { // nothing was sent: answer as Cognito does for a real code that is wrong
      await sleep(500 + Math.random() * 500);
      return ++ask.tries >= 3 ? MSG.spent : MSG.wrong;
    }
    let r;
    try {
      r = await cognito("RespondToAuthChallenge", { ChallengeName: "EMAIL_OTP", Session: ask.session, ChallengeResponses: { USERNAME: ask.email, EMAIL_OTP_CODE: code } });
    } catch (e) {
      if (e.kind !== "refused") return e.kind === "offline" ? MSG.offline : MSG.server;
      if (THROTTLED.includes(e.type)) return MSG.slow;
      if (e.type === "CodeMismatchException") return MSG.wrong;
      if (e.type === "ExpiredCodeException" || NOT_ALLOWED.includes(e.type)) { ask.session = ""; ask.tries = 3; return MSG.spent; }
      quiet("RespondToAuthChallenge was refused: " + (e.type || "no reason given"));
      return MSG.server;
    }
    if (!r.AuthenticationResult) {
      if (r.ChallengeName === "EMAIL_OTP" && r.Session) { ask.session = r.Session; return MSG.wrong; } // asked again
      quiet("an unexpected further challenge: " + (r.ChallengeName || "none"));
      return MSG.server;
    }
    session = null;
    if (!adopt(r.AuthenticationResult, ask.keep)) {
      quiet("the account is not in exactly one of the groups " + ROLES.join(", "));
      if (r.AuthenticationResult.RefreshToken) revoke(r.AuthenticationResult.RefreshToken);
      ask.session = "";
      ask.tries = 3;
      return MSG.norole;
    }
    ask = { email: "", keep: false, session: "", tries: 0, resendAt: 0 };
    hide();
    const done = arrived;
    waiting = arrived = null;
    if (done) done();
    return "";
  }

  /* ---------- window.SITEHQ_AUTH ---------- */
  let cfg = null, session = read(), handedOut = false, waiting = null, arrived = null, lastSaved = 0;
  const leaving = () => {
    if (location.hash !== OUT) return false;
    try { history.replaceState(history.state, "", location.pathname + location.search); } catch (e) {}
    return true;
  };
  const leaveNow = leaving();
  if (!session || leaveNow) show("wait");

  const ready = (async () => {
    let c = inline;
    if (!c) {
      try {
        const r = await fetch("/config.json", { cache: "no-store" });
        if (r.ok) c = await r.json();
      } catch (e) {}
    }
    if (!c || typeof c !== "object") return show("down");
    cfg = c;
    if (!cfg.userPoolClientId) return hide(); // this page has no sign-in
    if (leaveNow && session) { const s = session; drop("out"); await Promise.race([revoke(s.refresh), sleep(3000)]); }
  })();

  const idle = () => !session.keep && Date.now() - session.seen > IDLE_LIMIT_MS;
  const nearlyOver = () => session.until - Date.now() < Math.min(300, session.life / 4) * 1000;
  function someoneSignsIn() {
    if (!waiting) { waiting = new Promise((r) => { arrived = r; }); show("email"); }
    return waiting;
  }

  async function token() {
    await ready;
    if (!cfg) return never(); // "Can't reach SiteHQ" is showing; its button reloads the page
    if (!cfg.userPoolClientId) return "";
    if (session && idle()) drop("idle");
    else if (session && nearlyOver()) {
      try { await renew(); } catch (e) { if (e.final) drop("expired"); }
    }
    if (!session) {
      // With the app already running there is somebody's data on the screen and in memory: start the page again.
      if (handedOut) { location.reload(); return never(); }
      await someoneSignsIn();
    }
    handedOut = true;
    return session.access;
  }

  async function signOut() {
    await ready;
    const s = session;
    drop("out");
    if (s && cfg && cfg.userPoolClientId) await Promise.race([revoke(s.refresh), sleep(3000)]); // so the refresh token is dead, not just forgotten
    location.reload();
    return never();
  }

  function failed(kind) {
    if (!cfg || !cfg.userPoolClientId) return false;
    if (kind === "refused") { drop("refused"); location.reload(); }
    else show("down");
    return true;
  }

  // use, for the 8-hour limit: taps and key presses, written down at most once a minute
  function used() {
    if (!session) return;
    session.seen = Date.now();
    if (session.seen - lastSaved > 60000) { lastSaved = session.seen; write(); }
  }
  for (const ev of ["pointerdown", "keydown"]) W.addEventListener(ev, used, { capture: true, passive: true });
  // a kept sign-in is shared by every tab: follow another tab's renewal, and leave when it signs out
  W.addEventListener("storage", (ev) => {
    if (ev.key !== KEY || (session && !session.keep)) return;
    const had = !!session;
    session = read();
    if (had && !session && handedOut) location.reload();
  });
  W.addEventListener("hashchange", () => { if (leaving()) signOut(); });
  D.addEventListener("DOMContentLoaded", lock); // the rest of the page is parsed after this script

  W.SITEHQ_AUTH = { token, signOut, failed };
})();
