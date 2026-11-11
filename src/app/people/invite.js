/* ================= INVITE TO THE APP: owner gives a trade an account and emails them how to sign in ================= */
import { $, toast } from "../core/helpers.js";
import { closeForm, showErr } from "../core/sheet.js";
import { S, ownerMode } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { coData } from "../owner/company-details.js";
export { canInvite, inviteBoxHtml, invitePerson, inviteTicked };
/* Part of "Add a trade not on the app" (people/personal-details.js). When the platform can invite people
   (S.invites, our own hosting only), the form shows "Invite them to the app". Saving with it ticked asks the
   server to make their sign-in account and email them; their details go straight into their own profile
   (sheets/<id>), so they turn up as a trade on the app and are not asked for them again. An existing
   "not on the app" record is moved, not deleted. */
const INV_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const canInvite = () => !!(S.invites && ownerMode());
function inviteBoxHtml(rec) {
  if (!canInvite()) return "";
  return `<div class="card inv-box">
    <label class="inl inv-tick"><input type="checkbox" id="dt-inv"> <b>Invite them to the app</b></label>
    <div class="who">They'll get an email with the link. They sign in with their email address and a code we email them each time – no password. Fill in their email address below.${rec ? " Their details move across with them." : ""}</div>
  </div>`;
}
const inviteTicked = () => canInvite() && !!($("dt-inv") && $("dt-inv").checked);
function inviteErrMsg(e) {
  const c = e && e.code;
  if (c === "already_exists")
    return "That email address already has an account on the app. Check it, or find them in the list.";
  if (c === "invalid_argument")
    return "That email address doesn't look right. Check it and try again.";
  if (c === "forbidden") return "Only the owner can invite people.";
  return "Couldn't send the invite. Check your connection and try again.";
}
/* Returns true when done (form closed); false when the form should stay open. */
async function invitePerson(out, rec, role, roleCompany) {
  if (!INV_EMAIL.test(out.email || "")) {
    showErr("Put in their email address – the invite goes there.");
    return false;
  }
  out.email = out.email.toLowerCase();
  const co = coData();
  let r;
  try {
    r = await S.invites.invite({
      email: out.email,
      name: out.fullName,
      role: "trade",
      profile: { details: out, role, roleCompany, updated: Date.now() },
      company: co.name,
      ownerName: co.owner,
    });
  } catch (e) {
    showErr(inviteErrMsg(e));
    return false;
  }
  // They're on the app now: the "not on the app" record has moved into their profile. Not a delete the owner
  // made, so it does not go to Deleted items.
  if (rec)
    try {
      await S.rawDb.doc("offapp/" + rec.id).delete();
    } catch (e) {}
  closeForm();
  toast(
    r && r.emailed
      ? "Invite emailed to " + out.email
      : "They're set up, but the email didn't send. Send them the app's link yourself.",
  );
  render();
  return true;
}
