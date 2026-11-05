/* ================= SITE / JOB SUMMARY at the top of a site ================= */
function siteClient(site){return (S.clients||[]).find(c=>clientSites(c).some(x=>same(x,site)))}
