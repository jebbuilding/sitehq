// Two browsers on the app's own backend (server/, started here in this process): what the owner does appears in a
// trade's page while it is open, and the other way round; the data is still there after a reload and in a new tab.
// Run from tests/:  node backend-live.mjs      (after `npm run build`; part of `npm run test:backend`)
import { chromium } from "playwright";
import { startLocalSite } from "../scripts/local.mjs";

const local = await startLocalSite();
const browsers = [];
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? "✅" : "❌"} ${what}`); if (!ok) failed++; };

/** A browser of its own, on the page for one role. Requests to anywhere but the local backend are refused. */
async function open(role) {
  const browser = await chromium.launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  ctx.setDefaultTimeout(5000);
  await ctx.route(/^https?:\/\//, (r) => (r.request().url().startsWith(local.url + "/") ? r.continue() : r.abort()));
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${local.url}/${role}`);
  await page.waitForSelector("#tabs .tab");
  return { page, ctx, errors };
}
async function openTeamChat(page) {
  await page.click('#tabs .tab[data-t="chat"]');
  await page.click('.chatrow[data-c="team"]');
  await page.waitForSelector("#chatwin:not([hidden])");
}
const say = async (page, text) => { await page.fill("#cm-text", text); await page.click("#cm-send"); };
const sees = (page, text, ms = 5000) => page.waitForFunction((t) => document.querySelector("#chat-msgs").innerText.includes(t), text, { timeout: ms }).then(() => true, () => false);

try {
  const owner = await open("owner"), trade = await open("trade");
  await openTeamChat(trade.page);
  check(await sees(trade.page, "Morning all"), "trade: the team chat opens with the seeded message");
  check(!(await sees(trade.page, "Concrete at 8", 300)), "trade: the owner's message is not there before it is sent");

  await openTeamChat(owner.page);
  await say(owner.page, "Concrete at 8 tomorrow");
  check(await sees(owner.page, "Concrete at 8 tomorrow"), "owner: sees their own message");
  check(await sees(trade.page, "Concrete at 8 tomorrow"), "trade: the owner's message appears in the open page, live");

  await say(trade.page, "On my way");
  check(await sees(owner.page, "On my way"), "owner: the trade's reply appears live");

  // outside the chat: the trade is looking at the Sites tab when the owner adds a site to the shared list
  await trade.page.click("#chat-back");
  await trade.page.click('#tabs .tab[data-t="plans"]');
  const onScreen = (text, ms) => trade.page.waitForFunction((t) => document.querySelector("#main").innerText.includes(t), text, { timeout: ms }).then(() => true, () => false);
  check((await onScreen("12 Marine Way", 2000)) && !(await onScreen("1 Live Lane", 300)), "trade: the Sites tab lists the seeded site and not the new one yet");
  await owner.page.evaluate(() => window.claude.use("db").then((db) => db.doc("sites/live-test").set({ name: "1 Live Lane, Exmouth" })));
  check(await onScreen("1 Live Lane", 5000), "trade: a site the owner adds appears on the trade's Sites tab, live");

  // a trade cannot do the same: the write is refused and nobody's page changes
  const refused = await trade.page.evaluate(() => window.claude.use("db").then((db) => db.doc("sites/not-allowed").set({ name: "Nope" })).then(() => "written", (e) => e.code));
  check(refused === "invalid_argument", "trade: writing to the site list is refused");

  // files: a seeded image shows through a plain <img> (the cookie signs it in), and a file uploaded in the page
  // comes back from /_blob/<id> and can be drawn on a canvas and read back (it is same-origin, so nothing is locked)
  const files = await trade.page.evaluate(async () => {
    const show = (src) => new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src; });
    const seeded = await show("/_blob/img1");
    const assets = await window.claude.use("assets");
    const up = await assets.upload(await (await fetch("/_blob/img1")).blob());
    const im = await show(up.url);
    if (!seeded || !im) return { seeded: !!seeded, uploaded: !!im };
    const cv = document.createElement("canvas");
    cv.width = im.naturalWidth;
    cv.height = im.naturalHeight;
    cv.getContext("2d").drawImage(im, 0, 0);
    let readable = false;
    try { readable = cv.toDataURL("image/png").length > 100; } catch (e) {}
    return { seeded: seeded.naturalWidth > 0, uploaded: im.naturalWidth > 0, readable, url: up.url, type: up.contentType };
  });
  check(files.seeded, "trade: a seeded image loads through <img src=/_blob/…>");
  check(files.uploaded && files.readable && /^\/_blob\/[0-9a-f]{32}$/.test(files.url) && files.type === "image/png", "trade: an uploaded image comes back from /_blob/<id> and can be drawn and read on a canvas");
  const noCookie = await fetch(local.url + files.url);
  check(noCookie.status === 401, "nobody signed in: the uploaded file is refused");

  // survives a reload, and a second tab sees the same data
  await trade.page.reload();
  await trade.page.waitForSelector("#tabs .tab");
  await openTeamChat(trade.page);
  check((await sees(trade.page, "Concrete at 8 tomorrow")) && (await sees(trade.page, "On my way")), "trade: both messages are still there after a reload");
  const tab2 = await owner.ctx.newPage();
  await tab2.goto(`${local.url}/owner`);
  await tab2.waitForSelector("#tabs .tab");
  await openTeamChat(tab2);
  check(await sees(tab2, "On my way"), "owner: a second tab shows the same conversation");
  await say(tab2, "Thanks Sam");
  check((await sees(owner.page, "Thanks Sam")) && (await sees(trade.page, "Thanks Sam")), "a message from the second tab reaches the first tab and the trade");

  check(!owner.errors.length && !trade.errors.length, "no page errors" + (owner.errors.length || trade.errors.length ? ": " + [...owner.errors, ...trade.errors].join(" | ").slice(0, 300) : ""));
} catch (e) {
  check(false, "live test stopped: " + String(e.message || e).split("\n")[0]);
} finally {
  await Promise.all(browsers.map((b) => b.close().catch(() => {})));
  await local.close();
}
console.log(`live updates: ${failed ? failed + " failed" : "all passed"}`);
process.exit(failed ? 1 : 0);
