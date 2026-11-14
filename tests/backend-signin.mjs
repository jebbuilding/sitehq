// The sign-in screen (src/platform/sign-in.js) in a real browser, on the page exactly as it is deployed (/app on
// the local backend = dist/web/index.html + /config.json), against the local stand-in for Cognito
// (server/auth/local-cognito.mjs): email → code → signed in as owner, trade and client; wrong, used-up and
// run-out codes; an address with no account; no signal; token renewal; signing out; the 8-hour limit.
// Run from tests/:  node backend-signin.mjs      (part of `npm run test:backend`)
//   SHOTS=1 also writes signin-*.png here (git-ignored) to look at: phone and tablet, light and dark.
import { chromium } from "playwright";
import { startLocalSite } from "../scripts/local.mjs";

const local = await startLocalSite();
const cognito = local.cognito;
const browser = await chromium.launch();
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? "✅" : "❌"} ${what}`); if (!ok) failed++; };

const OWNER = "owner@sitehq.test", TRADE = "trade@sitehq.test", CLIENT = "client@sitehq.test";

/** A browser profile of its own (nothing stored). Requests to anywhere but the local backend are refused. */
async function profile(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  ctx.setDefaultTimeout(5000);
  await ctx.route(/^https?:\/\//, (r) => (r.request().url().startsWith(local.url + "/") ? r.fallback() : r.abort()));
  return ctx;
}
async function open(ctx, path = "/app") {
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(local.url + path);
  return page;
}
const step = (page, name) => page.waitForSelector(`#sitehq-signin[data-step="${name}"]:not([hidden])`).then(() => true, () => false);
const gone = (page) => page.waitForSelector("#sitehq-signin", { state: "hidden" }).then(() => true, () => false);
const text = (page, sel) => page.locator(sel).textContent().catch(() => ""); // the words, whatever the stylesheet does to their case
const error = (page) => text(page, "#sitehq-signin .signin-error");
/** Tap the main button and wait for the answer: the screen moves on or goes, or the button is ready again. */
async function go(page) {
  const was = await page.getAttribute("#sitehq-signin", "data-step");
  await page.click("#sitehq-signin .signin-go");
  await page.waitForFunction((was) => { const r = document.getElementById("sitehq-signin"), b = r.querySelector(".signin-go"); return r.hidden || r.dataset.step !== was || (b && !b.disabled); }, was).catch(() => {});
}
async function askForCode(page, email, { keep = false } = {}) {
  await page.fill("#signin-email", email);
  if (keep) await page.check("#signin-keep");
  await go(page);
}
async function enterCode(page, code) {
  await page.fill("#signin-code", code);
  await go(page);
}
async function signIn(page, email, opts) {
  await step(page, "email");
  await askForCode(page, email, opts);
  await step(page, "code");
  await enterCode(page, cognito.codeFor(email));
  return gone(page);
}
/** Who the app's own platform object says is signed in (this waits for sign-in, as the app does). */
const who = (page) => page.evaluate(() => window.claude.use("user").then(async (u) => (u ? { id: await u.id(), owner: await u.isOwner() } : null)));
const me = (page) => page.evaluate(async () => { const r = await fetch("/api/me", { headers: { authorization: "Bearer " + (await window.SITEHQ_AUTH.token()) } }); return r.ok ? r.json() : r.status; });
const stored = (page) => page.evaluate(() => ({ session: sessionStorage.getItem("sitehq.session"), local: localStorage.getItem("sitehq.session") }));
const fileCookie = async (ctx) => (await ctx.cookies(local.url + "/_blob/x")).find((c) => c.name === "sitehq_token");
const count = (op) => cognito.calls.filter((c) => c === op).length;

try {
  /* ---------- signed out: the screen, not the app's own message ---------- */
  {
    const ctx = await profile(), page = await open(ctx);
    check(await step(page, "email"), "signed out: the sign-in screen is shown");
    await page.waitForLoadState("load");
    const body = await page.evaluate(() => document.body.innerText);
    check(/Enter your email address/.test(await text(page, "#sitehq-signin")) && !/Sign in to use the app/.test(body), "signed out: it asks for an email address; the app's \"Sign in to use the app\" is not what is shown");
    check(await page.evaluate(() => [...document.body.children].every((n) => n.id === "sitehq-signin" || n.inert)), "signed out: the app behind the screen cannot be reached");
    check(await page.evaluate(() => document.activeElement && document.activeElement.id === "signin-email"), "signed out: the email box has the cursor");
    const small = await page.evaluate(() => [...document.querySelectorAll("#sitehq-signin input, #sitehq-signin button, #sitehq-signin .signin-keep")].map((n) => n.getBoundingClientRect()).filter((r) => r.height < 44 && !(r.width === 26 && r.height === 26)).length);
    check(small === 0, "signed out: every box and button is at least 44px tall");

    await askForCode(page, "not-an-address");
    check(/doesn’t look like an email address/.test(await error(page)) && count("InitiateAuth:USER_AUTH") === 0, "an address that is not an email address is caught before anything is sent");

    /* ---------- an address with no account looks exactly like one with ---------- */
    await askForCode(page, "Nobody@Example.test");
    check(await step(page, "code"), "no account: the code screen is shown all the same");
    const forNobody = await text(page, "#sitehq-signin");
    check(/If nobody@example\.test is set up for SiteHQ/.test(forNobody) && /ask whoever runs your company.s account to add you/.test(forNobody), "no account: it says a code was sent if the address is set up, and to ask James if nothing comes");
    check(await page.isDisabled("#signin-again"), "a new code cannot be asked for straight away");
    await enterCode(page, "12345678");
    check(/That code isn’t right/.test(await error(page)), "no account: any code is \"not right\"");
    await enterCode(page, "12345678");
    await enterCode(page, "12345678");
    check(/can’t be used any more/.test(await error(page)), "no account: after three tries the code is finished, as a real one would be");

    // Cognito may answer an unknown address with a different kind of challenge; the screen must look the same
    cognito.settings.unknownUserChallenge = "PASSWORD";
    await page.click("#signin-other");
    await step(page, "email");
    check((await page.inputValue("#signin-email")) === "nobody@example.test", "\"Use a different email address\" goes back, with the address still there to correct");
    await askForCode(page, "someone-else@example.test");
    check((await step(page, "code")) && (await text(page, "#sitehq-signin")).replace("someone-else", "nobody") === forNobody, "no account, answered with a password challenge: the screen is word for word the same");
    await enterCode(page, "87654321");
    check(/That code isn’t right/.test(await error(page)) && count("RespondToAuthChallenge") === 3, "…and its code is \"not right\" without asking Cognito");
    cognito.settings.unknownUserChallenge = "EMAIL_OTP";

    /* ---------- owner: wrong code, then the right one ---------- */
    await page.click("#signin-other");
    await askForCode(page, " Owner@SiteHQ.test "); // as a phone keyboard would leave it
    await step(page, "code");
    const forOwner = await text(page, "#sitehq-signin");
    check(forOwner.replace("owner@sitehq", "nobody@example") === forNobody, "an address with an account sees the same words as one without");
    const code = cognito.codeFor(OWNER);
    check(/^\d{8}$/.test(code || ""), "the stand-in \"sent\" the owner a code");
    await enterCode(page, code === "00000000" ? "00000001" : "00000000");
    check(/That code isn’t right/.test(await error(page)), "owner: a wrong code says so");
    await enterCode(page, code.slice(0, 4) + " " + code.slice(4)); // spaces, as copied from an email
    check(await gone(page), "owner: the right code closes the sign-in screen");
    await page.waitForSelector("#tabs .tab");
    check(JSON.stringify(await who(page)) === JSON.stringify({ id: "owner", owner: true }), "owner: the app starts as the seeded owner");
    check((await me(page)).role === "owner", "owner: the server reads the role \"owner\" from the token");
    check(await page.evaluate(() => [...document.body.children].every((n) => !n.inert)), "owner: the app can be used again");
    const logo = await page.waitForFunction(() => document.getElementById("hlogo").naturalWidth > 0).then(() => true, () => false);
    check(logo, "owner: the logo in the page's own markup, first asked for before anyone had signed in, loads once they have");
    const s = await stored(page), kept = JSON.parse(s.session || "{}");
    check(!!s.session && !s.local, "by default the sign-in is kept for this tab only (sessionStorage), not on the device");
    const access = JSON.parse(Buffer.from((kept.access || "..").split(".")[1], "base64url").toString() || "{}");
    check(access.token_use === "access" && !/@/.test(s.session), "what is kept is the access token and the refresh token: no ID token, no email address");
    const cookie = await fileCookie(ctx);
    check(!!cookie && cookie.path === "/_blob" && decodeURIComponent(cookie.value) === kept.access, "the adapter's file cookie carries the same token, for /_blob only");
    check(!/Sign in to use the app/.test(await page.evaluate(() => document.body.innerText)) && page.errors.length === 0, "owner: no page errors, and never the app's own sign-in message");

    const before = cognito.calls.length;
    await page.reload();
    await page.waitForSelector("#tabs .tab");
    check((await who(page)).id === "owner" && cognito.calls.length === before, "a reload stays signed in, without asking Cognito anything");

    const second = await open(ctx);
    check(await step(second, "email"), "another tab is not signed in (the sign-in belongs to the tab)");
    await second.close();

    /* ---------- signing out ---------- */
    await page.evaluate(() => { window.SITEHQ_AUTH.signOut(); });
    check((await step(page, "email")) && /You’re signed out/.test(await text(page, "#sitehq-signin .signin-note")), "signOut(): the page starts again at the sign-in screen and says so");
    const after = await stored(page);
    check(!after.session && !after.local && !(await fileCookie(ctx)), "signOut(): nothing is left in the browser – no tokens, no file cookie");
    check(count("RevokeToken") === 1, "signOut(): the refresh token was revoked at Cognito");
    const dead = await page.evaluate(async (t) => (await fetch("/cognito", { method: "POST", headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "AWSCognitoIdentityProviderService.InitiateAuth" }, body: JSON.stringify({ ClientId: "localwebclient", AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: t } }) })).status, kept.refresh);
    check(dead === 400, "signOut(): the old refresh token no longer works");
    await ctx.close();
  }

  /* ---------- trade, kept on the device; signing out reaches the other tabs ---------- */
  {
    const ctx = await profile(), page = await open(ctx);
    check(await signIn(page, TRADE, { keep: true }), "trade: signs in with \"Keep me signed in on this device\" ticked");
    check(JSON.stringify(await who(page)) === JSON.stringify({ id: "emp1", owner: false }) && (await me(page)).role === "trade", "trade: the app starts as the seeded trade, role \"trade\"");
    const s = await stored(page);
    check(!!s.local && !s.session, "kept: the sign-in is in localStorage");
    const refused = await page.evaluate(() => window.claude.use("db").then((db) => db.doc("sites/not-allowed").set({ name: "Nope" })).then(() => "written", (e) => e.code));
    check(refused === "invalid_argument", "trade: the access rules apply to a signed-in trade (writing the site list is refused)");
    const second = await open(ctx);
    check((await who(second)).id === "emp1", "kept: another tab is signed in too");
    await second.goto(local.url + "/app#signout");
    check((await step(second, "email")) && /You’re signed out/.test(await text(second, "#sitehq-signin .signin-note")) && !second.url().includes("#"), "opening the address with #signout signs out");
    check(await step(page, "email"), "…and the first tab, which was showing the trade's data, goes back to the sign-in screen by itself");
    await ctx.close();
  }

  /* ---------- client ---------- */
  {
    const ctx = await profile({ viewport: { width: 820, height: 1180 } }), page = await open(ctx);
    check(await signIn(page, CLIENT), "client: signs in");
    check(JSON.stringify(await who(page)) === JSON.stringify({ id: "u9", owner: false }) && (await me(page)).role === "client", "client: the app starts as the seeded client, role \"client\"");
    const sites = await page.evaluate(() => window.claude.use("db").then((db) => db.collection("sites").get()).then((q) => q.size));
    check(sites === 0, "client: confined to their own portal (the site list reads as empty)");
    await ctx.close();
  }

  /* ---------- an account with no role; a code that has run out; a new code ---------- */
  {
    const ctx = await profile(), page = await open(ctx);
    await step(page, "email");
    await askForCode(page, "norole@sitehq.test");
    await step(page, "code");
    await enterCode(page, cognito.codeFor("norole@sitehq.test"));
    const s = await stored(page);
    check(/isn’t finished being set up/.test(await error(page)) && !s.session && !s.local, "an account in no role group: told to ask James to finish adding them, and not signed in");

    await page.clock.install();
    await page.click("#signin-other");
    cognito.settings.sessionSeconds = 1;
    await askForCode(page, OWNER);
    await step(page, "code");
    cognito.settings.sessionSeconds = 180;
    const old = cognito.codeFor(OWNER);
    await new Promise((r) => setTimeout(r, 1200));
    await enterCode(page, old);
    check(/can’t be used any more/.test(await error(page)) && /Send a new code/.test(await error(page)), "a code that has run out says so, and to send a new one");
    check(await page.isDisabled("#signin-again"), "\"Send a new code\" waits half a minute…");
    await page.clock.fastForward(31000);
    check(await page.isEnabled("#signin-again"), "…then can be tapped");
    await page.click("#signin-again");
    await page.waitForFunction(() => document.querySelector("#signin-code").value === "" && document.querySelector("#signin-again").disabled);
    const fresh = cognito.codeFor(OWNER);
    await enterCode(page, fresh);
    check(fresh !== old && (await gone(page)) && (await who(page)).id === "owner", "the new code signs in");
    await ctx.close();
  }

  /* ---------- no signal ---------- */
  {
    const ctx = await profile(), page = await open(ctx);
    await step(page, "email");
    await ctx.route("**/cognito", (r) => r.abort());
    await askForCode(page, OWNER);
    check(/No signal/.test(await error(page)) && (await page.isEnabled("#sitehq-signin .signin-go")), "no signal when asking for a code: says so, and the button can be tapped again");
    await ctx.unroute("**/cognito");
    await go(page);
    check(await step(page, "code"), "…and it works once the signal is back");
    await ctx.route("**/cognito", (r) => r.abort());
    await enterCode(page, cognito.codeFor(OWNER));
    check(/No signal/.test(await error(page)), "no signal when checking the code: says so");
    await ctx.unroute("**/cognito");
    await go(page);
    check(await gone(page), "…and the same code works once the signal is back");

    // the server cannot be reached when the page starts
    await ctx.route("**/api/me", (r) => r.abort());
    await page.reload();
    check((await step(page, "down")) && /Can’t reach SiteHQ/.test(await text(page, "#sitehq-signin")), "signed in but the server cannot be reached: \"Can't reach SiteHQ\", not \"Sign in\"");
    await ctx.unroute("**/api/me");
    await page.click("#sitehq-signin .signin-go");
    await page.waitForSelector("#tabs .tab");
    check((await who(page)).id === "owner", "\"Try again\" starts the page again, still signed in");

    // the settings file cannot be fetched
    await ctx.route("**/config.json", (r) => r.abort());
    await page.reload();
    check(await step(page, "down"), "the page's settings cannot be fetched: \"Can't reach SiteHQ\"");
    await ctx.unroute("**/config.json");

    // the server will not have the token (a person removed from their group, say)
    await ctx.route("**/api/me", (r) => r.fulfill({ status: 401, contentType: "application/json", body: '{"error":{"code":"unauthenticated"}}' }), { times: 1 });
    await page.reload();
    await page.waitForSelector("#sitehq-signin .signin-note").catch(() => {});
    const s = await stored(page);
    check((await step(page, "email")) && /didn’t accept that sign-in/.test(await text(page, "#sitehq-signin .signin-note")) && !s.session, "the server refuses the token: signed out, with a message, not left on the app's own \"Sign in\"");
    await ctx.close();
  }

  /* ---------- renewal ---------- */
  {
    cognito.settings.accessTokenSeconds = 6; // renewed when under 1.5 s is left
    const ctx = await profile(), page = await open(ctx);
    await signIn(page, OWNER);
    await page.waitForSelector("#tabs .tab");
    const first = await page.evaluate(() => window.SITEHQ_AUTH.token());
    const renewals = count("InitiateAuth:REFRESH_TOKEN_AUTH");
    await new Promise((r) => setTimeout(r, 5000));
    const next = await page.evaluate(() => window.SITEHQ_AUTH.token());
    check(next !== first && count("InitiateAuth:REFRESH_TOKEN_AUTH") === renewals + 1, "a token that is about to run out is renewed before it is handed over, once");
    await new Promise((r) => setTimeout(r, 1500));
    const old = await page.evaluate((t) => fetch("/api/me", { headers: { authorization: "Bearer " + t } }).then((r) => r.status), first);
    check(old === 401 && (await me(page)).role === "owner", "the server refuses the old token once its time is up, and accepts the renewed one");
    const written = await page.evaluate(() => window.claude.use("db").then((db) => db.doc("sites/renewed").set({ name: "2 Renewal Road" })).then(() => "written", (e) => e.code));
    check(written === "written", "the app carries on working across the renewal");
    check(decodeURIComponent((await fileCookie(ctx)).value) !== first, "the file cookie has moved on to the renewed token");

    // no signal at renewal time is not a reason to sign anybody out
    await ctx.route("**/cognito", (r) => r.abort());
    await new Promise((r) => setTimeout(r, 5000));
    await page.evaluate(() => window.SITEHQ_AUTH.token());
    check(!!(await stored(page)).session && !(await page.isVisible("#sitehq-signin")), "renewal with no signal: still signed in");
    await ctx.unroute("**/cognito");

    // the refresh token no longer works (30 days up, or the person was removed): signed out cleanly
    cognito.revokeRefreshTokens();
    await page.evaluate(() => { window.SITEHQ_AUTH.token(); });
    check((await step(page, "email")) && /You’ve been signed out/.test(await text(page, "#sitehq-signin .signin-note")), "renewal refused: the page starts again at the sign-in screen and says so");
    const s = await stored(page);
    check(!s.session && !s.local && !(await fileCookie(ctx)), "renewal refused: nothing is left in the browser");
    cognito.settings.accessTokenSeconds = 3600;
    await ctx.close();
  }

  /* ---------- the 8-hour limit on a sign-in that is not kept ---------- */
  {
    const ctx = await profile(), page = await open(ctx);
    await signIn(page, TRADE);
    await page.evaluate(() => { const s = JSON.parse(sessionStorage.getItem("sitehq.session")); s.seen = Date.now() - 9 * 3600e3; sessionStorage.setItem("sitehq.session", JSON.stringify(s)); });
    await page.reload();
    check((await step(page, "email")) && /hadn’t been used for a while/.test(await text(page, "#sitehq-signin .signin-note")) && !(await stored(page)).session, "not kept, and unused for over 8 hours: signed out, and told why");
    await signIn(page, TRADE, { keep: true });
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sitehq.session")); s.seen = Date.now() - 9 * 3600e3; localStorage.setItem("sitehq.session", JSON.stringify(s)); });
    await page.reload();
    check((await who(page)).id === "emp1" && !(await page.isVisible("#sitehq-signin")), "kept on the device: the 8-hour limit does not apply");
    await ctx.close();
  }

  /* ---------- the dev pages are untouched; looks ---------- */
  {
    const ctx = await profile(), page = await open(ctx, "/owner");
    await page.waitForSelector("#tabs .tab");
    check(await page.evaluate(() => window.SITEHQ_AUTH === undefined && !document.getElementById("sitehq-signin")), "the dev-token pages (/owner, /trade, /client) have no sign-in screen");
    await ctx.close();

    const colours = {};
    for (const [name, options] of Object.entries({ "phone-light": { colorScheme: "light" }, "phone-dark": { colorScheme: "dark" }, "tablet-dark": { colorScheme: "dark", viewport: { width: 820, height: 1180 } } })) {
      const c = await profile(options), p = await open(c);
      await step(p, "email");
      await p.waitForLoadState("load");
      colours[name] = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector(s)); return [g("#sitehq-signin").backgroundColor, g(".signin-card").backgroundColor, g(".signin-card h1").color, g(".signin-go").backgroundColor].join(" "); });
      const fits = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector(".signin-card").getBoundingClientRect().right <= innerWidth);
      check(fits, `${name}: the screen fits the width`);
      if (process.env.SHOTS) {
        await p.screenshot({ path: `signin-${name}-email.png` });
        await askForCode(p, OWNER);
        await step(p, "code");
        await enterCode(p, "1");
        await p.screenshot({ path: `signin-${name}-code.png` });
      }
      await c.close();
    }
    check(colours["phone-light"] !== colours["phone-dark"] && colours["phone-dark"] === colours["tablet-dark"], "dark mode: the screen takes the app's dark colours");
  }
} catch (e) {
  failed++;
  console.log("❌ the test stopped: " + (e && e.stack ? e.stack : e));
} finally {
  await browser.close();
  await local.close();
}
console.log(failed ? `sign-in: ${failed} FAILED` : "sign-in: all passed");
process.exit(failed ? 1 : 0);
