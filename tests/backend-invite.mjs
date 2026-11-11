// Inviting a trade to the app, end to end on the local backend: the owner fills in "Add a trade" and ticks
// "Invite them to the app"; the server makes the account, stores their profile and "sends" the welcome email
// (server/mail/outbox.mjs keeps it); the new person then signs in on the page as deployed (/app) with the
// emailed code and lands in the app as themselves, without being asked for their name or details again.
// Also: an existing "not on the app" record moves across; a taken address is refused in plain words.
// Run from tests/:  node backend-invite.mjs      (part of `npm run test:backend`)
//   SHOTS=1 also writes invite-*.png here (git-ignored).
import { chromium } from "playwright";
import { startLocalSite } from "../scripts/local.mjs";

const local = await startLocalSite();
const browser = await chromium.launch();
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? "✅" : "❌"} ${what}`); if (!ok) failed++; };
const shot = (page, name) => (process.env.SHOTS ? page.screenshot({ path: `invite-${name}.png`, fullPage: true }) : null);

async function open(path, viewport = { width: 820, height: 1180 }) {
  const ctx = await browser.newContext({ viewport });
  ctx.setDefaultTimeout(6000);
  await ctx.route(/^https?:\/\//, (r) => (r.request().url().startsWith(local.url + "/") ? r.fallback() : r.abort()));
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(local.url + path);
  return page;
}
async function employeesTab(page) {
  await page.waitForSelector(".tab");
  await page.evaluate(() => { const t = document.querySelector('.tab[data-t="people"]'); if (t) t.click(); });
  if (!(await page.$("#pp-add"))) { // not on the tab bar: through the "More" list
    await page.locator('[data-t="people"], [data-k="people"]').first().click().catch(() => {});
  }
  await page.waitForSelector("#pp-add");
}
async function fillTrade(page, { name, email, mobile = "07700 900123" }) {
  await page.fill("#dt-fullName", name);
  await page.fill("#dt-email", email);
  await page.fill("#dt-mobile", mobile);
  await page.selectOption("#dt-role", "employee");
  await page.check("#dt-ok");
}
const toastText = (page) => page.waitForSelector("#toast:not([hidden]), .toast", { timeout: 4000 }).then((el) => el.textContent(), () => "");
const sheets = async () => Object.fromEntries((await local.store.list("sheets")).map((d) => [d.id, d.data]));

try {
  const owner = await open("/owner");
  await employeesTab(owner);
  check((await owner.textContent("#pp-add")).trim() === "+ Add a trade", "the button says “+ Add a trade”");
  await owner.click("#pp-add");
  await owner.waitForSelector("#dt-inv");
  check(true, "the form offers “Invite them to the app”");
  await fillTrade(owner, { name: "Alex Newman", email: "Alex.Newman@Example.TEST" });
  await owner.check("#dt-inv");
  await shot(owner, "form");
  await owner.click("#f-save");
  const t = await toastText(owner);
  check(/Invite emailed to alex\.newman@example\.test/.test(t), "James is told the invite was emailed: " + JSON.stringify(t));

  const mail = local.mail.find((m) => m.to === "alex.newman@example.test");
  check(!!mail, "a welcome email went to the address, in lower case");
  check(mail && /^Hi Alex,/.test(mail.text) && mail.text.includes(local.url + "/app") && /JEB Building Services/.test(mail.subject), "the email greets them, names the firm and has the sign-in link");
  const person = local.cognito.people["alex.newman@example.test"];
  check(person && person.groups.join() === "trade", "they have a sign-in account in the trade group");
  const prof = person && (await sheets())[person.sub];
  check(prof && prof.name === "Alex Newman" && prof.role === "employee" && prof.details.mobile === "07700 900123" && !!prof.details.confirmedAt, "their profile holds the details James entered");
  await owner.waitForFunction(() => document.querySelector("#main").textContent.includes("Alex Newman"));
  check(true, "they show up on the Employees tab straight away");
  await shot(owner, "listed");

  /* the new person signs in with the emailed code */
  const alex = await open("/app", { width: 390, height: 844 });
  await alex.waitForSelector('#sitehq-signin[data-step="email"]:not([hidden])');
  await alex.fill("#signin-email", "alex.newman@example.test");
  await alex.click("#sitehq-signin .signin-go");
  await alex.waitForSelector('#sitehq-signin[data-step="code"]:not([hidden])');
  await alex.fill("#signin-code", local.cognito.codeFor("alex.newman@example.test"));
  await alex.click("#sitehq-signin .signin-go");
  await alex.waitForSelector("#sitehq-signin", { state: "hidden" });
  const meNow = await alex.evaluate(() => window.claude.use("user").then(async (u) => ({ id: await u.id(), owner: await u.isOwner(), name: await u.name() })));
  check(meNow.id === person.sub && !meNow.owner && meNow.name === "Alex Newman", "they sign in as themselves, a trade: " + JSON.stringify(meNow));
  await alex.waitForSelector(".tab");
  await alex.waitForTimeout(500);
  check(!(await alex.$("#nameform")) && !(await alex.$("#dt-start")), "they are not asked for their name or details again");
  check((await alex.textContent("#who").catch(() => "")).includes("Alex Newman"), "the app shows their name");
  await shot(alex, "signed-in");

  /* the same address again */
  await owner.click("#pp-add");
  await owner.waitForSelector("#dt-inv");
  await fillTrade(owner, { name: "Someone Else", email: "alex.newman@example.test" });
  await owner.check("#dt-inv");
  await owner.click("#f-save");
  const err = await owner.waitForSelector(".err:not(:empty), #f-err:not(:empty)").then((e) => e.textContent(), () => "");
  check(/already has an account/.test(err), "an address already on the app is refused in plain words: " + JSON.stringify(err));
  check(local.mail.length === 1, "and no second email goes out");
  await owner.click("#f-cancel");

  /* no email address */
  await owner.click("#pp-add");
  await owner.waitForSelector("#dt-inv");
  await fillTrade(owner, { name: "No Email", email: "" });
  await owner.check("#dt-inv");
  await owner.click("#f-save");
  const err2 = await owner.waitForSelector(".err:not(:empty), #f-err:not(:empty)").then((e) => e.textContent(), () => "");
  check(/Put in their email address/.test(err2), "no email address: asked for one");
  await owner.click("#f-cancel");

  /* someone already listed as "not on the app" is invited later: their record moves across */
  // written through the API, as the owner, so the owner's open page hears about it
  await fetch(local.url + "/api/db/set", { method: "POST", headers: { authorization: "Bearer dev:owner", "content-type": "application/json" },
    body: JSON.stringify({ path: "offapp/t-old", data: { details: { fullName: "Pat Older", email: "pat@example.test", mobile: "07700 900456", confirmedAt: 1 }, role: "employee", roleCompany: "Older Roofing", created: 1, updated: 1 } }) });
  await owner.waitForSelector('.pp-edit[data-w="off:t-old"]', { state: "attached" });
  await owner.evaluate(() => document.querySelector('.pp-edit[data-w="off:t-old"]').click()); // the button sits in a folded row
  await owner.waitForSelector("#dt-inv");
  await owner.check("#dt-ok");
  await owner.check("#dt-inv");
  await owner.click("#f-save");
  await owner.waitForSelector("#dt-inv", { state: "detached" }).catch(() => {});
  const pat = local.cognito.people["pat@example.test"];
  const patProf = pat && (await sheets())[pat.sub];
  check(patProf && patProf.name === "Pat Older" && patProf.role === "employee" && patProf.roleCompany === "Older Roofing", "a “not on the app” trade invited later keeps their details and company");
  check(!(await local.store.get("offapp", "t-old")), "and their “not on the app” record is gone");
  const trash = (await local.store.list("todos")).filter((d) => JSON.stringify(d.data).includes("Pat Older"));
  check(trash.length === 0, "moving them does not put anything in Deleted items");

  check(owner.errors.length === 0 && alex.errors.length === 0, "no page errors: " + JSON.stringify([...owner.errors, ...alex.errors]));
} catch (e) {
  check(false, "the test stopped: " + (e && e.message));
} finally {
  await browser.close();
  await local.close();
}
process.exit(failed ? 1 : 0);
