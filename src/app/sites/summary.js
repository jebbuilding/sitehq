/* ================= SITE / JOB SUMMARY at the top of a site ================= */
import { clientSites } from "../clients/address-book.js";
import { S } from "../core/state.js";
import { same } from "./project-pages.js";
export { siteClient };
function siteClient(site){return (S.clients||[]).find(c=>clientSites(c).some(x=>same(x,site)))}
