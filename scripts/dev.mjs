// Local dev server: the app wrapped in the test suite's fake platform, so it can be used in a real browser.
//   npm run dev  →  http://localhost:4321/owner | /trade | /client     (PORT and HOST env vars override)
// Sources are re-read and re-assembled (scripts/bundle.mjs) on every request: edit src/, reload the page.
// The database is the in-memory fake from tests/harness8src.js with the seed from tests/crawl.js – it lives in the
// page, so a reload resets it, tabs do not share data, and no access rules are enforced. Synthetic data only.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { bundleApp, root } from "./bundle.mjs";

const read = f => fs.readFileSync(path.join(root, f), "utf8");
const PORT = Number(process.env.PORT) || 4321, HOST = process.env.HOST || "127.0.0.1";
const ROLES = ["owner", "trade", "client"];
const MAX_UPLOAD = 20 * 1024 * 1024; // same limit as the platform

function between(s, a, b, what) {
  const i = s.indexOf(a), j = i < 0 ? -1 : s.indexOf(b, i + a.length);
  if (j < 0) throw new Error(`dev: cannot find ${what} – has it changed shape?`);
  return s.slice(i + a.length, j);
}

// Same construction as tests/crawl.js and tests/flows.js: the harness's `fake` template with the crawl seed spliced in.
function fakePlatform(owner) {
  const seed = between(read("tests/crawl.js"), "const seed=`", "`;\nsrc=src.replace", "the seed in tests/crawl.js");
  const anchor = "const store={}, listeners=[];";
  const harness = read("tests/harness8src.js");
  if (!harness.includes(anchor)) throw new Error("dev: cannot find the store in tests/harness8src.js – has it changed shape?");
  const fake = between(harness.replace(anchor, () => anchor + seed), "const fake=", "(async()=>{\n  const b=await chromium.launch();", "the fake in tests/harness8src.js");
  return new Function("return " + fake.trim().replace(/;$/, ""))()(owner);
}

// What the test fake stubs out but a person at a browser needs: uploads that can be shown again (/_blob/<id>,
// kept in this server's memory), downloads that really save, and the client's user id.
const overlay = role => `<script>
(function(){
const base=window.claude.use,role=${JSON.stringify(role)};let n=0;
const assets={
  upload:async(b,o)=>{const type=(o&&o.type)||b.type||"application/octet-stream",id="dev"+Date.now().toString(36)+(n++);
    const r=await fetch("/_blob/"+id,{method:"PUT",headers:{"content-type":type},body:b});
    if(!r.ok)throw {code:r.status===413?"too_large":"store_unavailable"};
    return {id,url:"/_blob/"+id,sizeBytes:b.size,contentType:type}},
  delete:async id=>{await fetch("/_blob/"+id,{method:"DELETE"});return {}},
  list:async()=>({assets:[]})};
const downloads={save:async r=>{const b=r.data instanceof Blob?r.data:new Blob([r.data]);
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=r.filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),60000);return {}}};
window.claude={use:async name=>{
  if(name==="assets")return assets;
  if(name==="downloads")return downloads;
  const x=await base(name);
  return x&&name==="user"&&role==="client"?Object.assign({},x,{id:async()=>"u9"}):x}};
})();
</script>`;

let logoId = null; // read from the app each time a page is built
function page(role, onboarding) {
  let app = bundleApp();
  const logo = /const LOGO_ID\s*=\s*"([^"]+)"/.exec(app);
  if (!logo) throw new Error("dev: cannot find LOGO_ID in the app – has it changed shape?");
  logoId = logo[1];
  if (role === "trade" && !onboarding) { // as the crawl does: skip the "fill in your details" gate
    const gate = "function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}";
    if (!app.includes(gate)) throw new Error("dev: cannot find detailsDone in the app – has it changed shape?");
    app = app.replace(gate, () => "function detailsDone(d){return true}");
  }
  // The platform supplies the <html> skeleton (and viewport) around the published fragment; so do we.
  return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
    + fakePlatform(role === "owner") + overlay(role) + read("src/shell.html") + "<script>\n" + app + "</script>\n</body></html>";
}

// Uploaded files, plus stand-ins for the asset ids the seed data points at.
const blobs = new Map();
// The real company logo exists only as an asset on the live artifact (LOGO_ID in the app). Stand in a plain grey
// block so the header and PDFs have something in the logo slot.
function greyPng(w, h) {
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(body.length + 8); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(zlib.crc32(body), out.length - 4); return out; };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; // 8-bit greyscale
  const rows = Buffer.alloc((w + 1) * h, 0x9a); for (let y = 0; y < h; y++) rows[y * (w + 1)] = 0; // filter byte per row
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
const LOGO = { type: "image/png", body: greyPng(240, 80) };
const SEEDED = { a1: ["clip_sheet.pdf", "application/pdf"], a3: ["clip_sheet.pdf", "application/pdf"], a9: ["clip_sheet.pdf", "application/pdf"], a2: ["test.jpg", "image/jpeg"], img1: ["ld1.png", "image/png"] };

function blob(req, res, id) {
  if (!/^[\w-]{1,64}$/.test(id)) { res.writeHead(400); return res.end(); }
  if (req.method === "PUT") {
    const chunks = []; let size = 0, over = false;
    req.on("data", c => { size += c.length; if (size > MAX_UPLOAD) over = true; else chunks.push(c); });
    req.on("end", () => {
      if (over) { res.writeHead(413); return res.end(); }
      blobs.set(id, { type: req.headers["content-type"] || "application/octet-stream", body: Buffer.concat(chunks) });
      res.writeHead(204); res.end();
    });
    return;
  }
  if (req.method === "DELETE") { blobs.delete(id); res.writeHead(204); return res.end(); }
  let b = blobs.get(id);
  if (!b && id === logoId) b = LOGO;
  if (!b && SEEDED[id]) b = { type: SEEDED[id][1], body: fs.readFileSync(path.join(root, "tests/fixtures", SEEDED[id][0])) };
  if (!b) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": b.type, "content-length": b.body.length, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(b.body);
}

http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"), p = url.pathname;
    if (p.startsWith("/_blob/")) return blob(req, res, p.slice(7));
    if (p === "/") { res.writeHead(302, { location: "/owner" }); return res.end(); }
    const role = p.slice(1);
    if (!ROLES.includes(role)) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Not found. Try /owner, /trade or /client"); }
    const html = page(role, url.searchParams.has("onboarding"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
  } catch (e) {
    console.error(e.message || e);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(e.message || e));
  }
}).listen(PORT, HOST, () => {
  const at = `http://${HOST === "0.0.0.0" || HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`;
  console.log(`SiteHQ dev (fake backend, synthetic data – resets on reload)\n  owner   ${at}/owner\n  trade   ${at}/trade   (${at}/trade?onboarding to see the details gate)\n  client  ${at}/client`);
});
