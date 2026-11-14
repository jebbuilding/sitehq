/* ================= PRIVACY NOTICE ================= */
import { bossFirst, bossName, coName, coShort } from "./company-names.js";
import { esc } from "./helpers.js";
export { privacyBlock };
function privacyHtml() {
  return `<div class="privacy">
  <p><b>Who we are.</b> ${esc(coName())} (${esc(bossName())}) is responsible for the information in this app.</p>
  <p><b>What we keep.</b> Your name, contact details, address, date of birth, next of kin, work details (trade, NI number, UTR, CSCS), and any health information you choose to give. Also your timesheets and check-ins, vehicle and plant checks, photos (with time and location), invoices, receipts, signatures, training records, accident reports and any personal documents you upload, such as a driving licence or passport.</p>
  <p><b>Why.</b> To pay you and keep pay and tax records (HMRC and CIS), to meet our health and safety duties (inductions, checks, training, accident reports), to check you can legally work and drive our vehicles, and to contact your next of kin in an emergency. Health details are only used to keep you safe at work.</p>
  <p><b>Who can see it.</b> Only you and ${esc(bossFirst())}. Other trades can't see your records. The app is hosted by Claude (Anthropic), which stores the data for us.</p>
  <p><b>How long.</b> While you work with us. When you leave, your personal details, next of kin and personal documents are deleted within 3 months. Pay, tax and invoice records are kept for 6 years, and accident and safety records for at least 3 years, because the law says we must.</p>
  <p><b>Your rights.</b> You can ask to see your information, have it corrected, or have it deleted when we no longer need it. Speak to ${esc(bossFirst())}. If you're unhappy you can complain to the Information Commissioner's Office (ico.org.uk).</p></div>`;
}
const privacyBlock = (open) =>
  `<details class="privbox" ${open ? "open" : ""}><summary>How ${esc(coShort())} uses your information</summary>${privacyHtml()}</details>`;
