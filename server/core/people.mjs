// Inviting someone to the app: the owner gives a name and an email address; this makes the sign-in account, puts
// their profile where the app looks for it (sheets/<id>) and emails them how to sign in.
//
// Two things it needs from outside, so that it runs the same in production, locally and in tests:
//   directory  { create({ email, role }) → { id }, remove(email) }        auth/cognito-admin.mjs, auth/local-directory.mjs
//              create throws an error with code "exists" when the address already has an account.
//   mailer     { send({ to, subject, text, html }) }                    mail/ses.mjs, mail/outbox.mjs
//
// Order: account, then profile, then email. If the profile cannot be stored the account is removed again, so a
// failure leaves nothing behind. If the email cannot be sent the person is still set up: the answer says
// `emailed: false` and the owner can send them the link another way.
import { ApiError, forbidden, invalid } from "./errors.mjs";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
// Who the owner can invite from the app. Clients join through their portal; another owner is not made from here.
const INVITE_ROLES = new Set(["trade"]);

const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const oneLine = (s, max) => String(s || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

/** The welcome email, as plain text and as HTML. Every value is one line; in the HTML each is escaped. */
export function welcomeEmail({ name, email, company, ownerName, appUrl }) {
  const first = oneLine(name, 80).split(" ")[0] || "there";
  const co = oneLine(company, 80) || "Your employer";
  const boss = oneLine(ownerName, 80);
  const subject = `Welcome to the ${co} app`;
  const steps = [`Open ${appUrl}`, `Type your email address: ${email}`, "We'll email you a code. Type it in and you're signed in."];
  const text = [
    `Hi ${first},`,
    "",
    `${co} has set you up on the app for your hours, checks, photos, drawings and jobs.`,
    "",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "There's no password. Each time you sign in, a new code is emailed to you.",
    "On a phone, add the page to your home screen so it's one tap next time.",
    "",
    boss ? `Any problems, speak to ${boss}.` : "Any problems, speak to the office.",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d1d1f">
<p>Hi ${escHtml(first)},</p>
<p>${escHtml(co)} has set you up on the app for your hours, checks, photos, drawings and jobs.</p>
<ol>
<li>Open <a href="${escHtml(appUrl)}">${escHtml(appUrl)}</a></li>
<li>Type your email address: <b>${escHtml(email)}</b></li>
<li>We'll email you a code. Type it in and you're signed in.</li>
</ol>
<p>There's no password. Each time you sign in, a new code is emailed to you.<br>On a phone, add the page to your home screen so it's one tap next time.</p>
<p>${boss ? `Any problems, speak to ${escHtml(boss)}.` : "Any problems, speak to the office."}</p>
</body></html>`;
  return { subject, text, html };
}

/**
 * @param deps.store      the document store
 * @param deps.directory  makes sign-in accounts (see the top of this file)
 * @param deps.mailer     sends email
 * @param deps.appUrl     the address people sign in at, as put in the email
 * @param deps.changed    (path, origin) – tell open pages a document changed
 * @param deps.checkDoc   the API's document check (size and depth)
 */
export function createPeople({ store, directory, mailer, appUrl, changed, checkDoc }) {
  /** POST /api/people { email, name, role, profile?, company?, ownerName? } → { id, emailed } */
  return async function invite(caller, body) {
    if (caller.role !== "owner") throw forbidden("Only the owner can invite people");
    if (!directory || !mailer || !appUrl) throw new ApiError(501, "not_available", "Inviting people is not set up here");
    const email = String(body.email || "").trim().toLowerCase();
    if (email.length > 254 || !EMAIL.test(email)) throw invalid("email must be an email address");
    const name = oneLine(body.name, 80);
    if (!name) throw invalid("name is required");
    const role = body.role === undefined ? "trade" : body.role;
    if (!INVITE_ROLES.has(role)) throw invalid("role must be trade");
    const extra = body.profile === undefined ? {} : checkDoc(body.profile);

    let id;
    try {
      ({ id } = await directory.create({ email, role }));
    } catch (e) {
      if (e && e.code === "exists") throw new ApiError(409, "already_exists", "That email address already has an account");
      throw e;
    }
    const path = "sheets/" + id;
    try {
      await store.set("sheets", id, checkDoc({ ...extra, name, invitedAt: Date.now(), invitedBy: caller.id }));
    } catch (e) {
      try { await directory.remove(email); } catch (e2) { console.error("people: could not remove the account after a failed profile write:", e2 && e2.name); }
      throw e;
    }
    // Told to every page, the inviting one included: it did not write this document through the database, so the
    // adapter has no own write to re-read and would otherwise skip the change message as its own.
    await changed(path, "");

    let emailed = true;
    try {
      await mailer.send({ to: email, ...welcomeEmail({ name, email, company: body.company, ownerName: body.ownerName, appUrl }) });
    } catch (e) {
      emailed = false;
      console.error("people: welcome email not sent:", e && e.name); // the name only: messages can quote the address
    }
    return { id, emailed };
  };
}
