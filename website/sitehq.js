/* SiteHQ link for the JEB website.
   1. Every enquiry sent from the contact form also goes to SiteHQ, where it pops up for James (the form still
      sends as it does now, so nothing is lost if SiteHQ can't be reached).
   2. Counts page views for the "Your website" page in SiteHQ: which page, where the visitor came from (Google,
      Facebook…) and phone or computer. No cookies, nothing stored on the visitor's device and nothing about who
      they are – so no cookie banner is needed for it.
   It does nothing until SITEHQ is set to SiteHQ's address (done at go-live), and only on jebbuilding.co.uk. */
(function () {
  var SITEHQ = ""; /* e.g. "https://app.jebbuilding.co.uk" – SiteHQ's own address, set at go-live */
  if (!SITEHQ || location.hostname.indexOf("jebbuilding.co.uk") === -1) return;
  var API = SITEHQ.replace(/\/$/, "") + "/api/public/";
  function send(path, data) {
    try {
      var body = JSON.stringify(data);
      if (navigator.sendBeacon && navigator.sendBeacon(API + path, new Blob([body], { type: "text/plain" }))) return;
      fetch(API + path, { method: "POST", mode: "no-cors", keepalive: true, headers: { "content-type": "text/plain" }, body: body });
    } catch (e) {}
  }
  var from = "";
  try { from = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
  var inside = from === location.hostname;
  send("hit", {
    p: location.pathname,
    r: inside ? "" : from,
    m: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    n: inside ? 0 : 1 /* a new visit: they came from somewhere else, not another page of this site */
  });
  var f = document.getElementById("enquiry");
  if (f)
    f.addEventListener("submit", function () {
      var d = { page: location.pathname };
      try { new FormData(f).forEach(function (v, k) { if (typeof v === "string") d[k] = v.slice(0, 4000); }); } catch (e) {}
      send("enquiry", d);
    });
})();
