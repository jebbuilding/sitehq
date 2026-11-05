// Builds dist/index.html = src/shell.html with src/styles/ inlined + <script> + the app assembled from src/app/ + </script> (see bundle.mjs)
// This is exactly the file published to the claude.ai artifact (the platform wraps it in its own <html> skeleton).
import fs from "node:fs";
import path from "node:path";
// Also builds dist/web/index.html: the same app as a complete page for our own hosting, with the platform adapter
// (src/platform/aws-adapter.js) ahead of it. dist/index.html is not affected by the adapter in any way.
import { bundleApp, pageFragment, root, webPage } from "./bundle.mjs";

let out, web;
try { const app = bundleApp(); out = pageFragment(app); web = webPage(app); } catch (e) { console.error(e.message); process.exit(1); }
fs.mkdirSync(path.join(root, "dist/web"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), out);
fs.copyFileSync(path.join(root, "dist/index.html"), path.join(root, "tests/timesheets.html")); // the test harness loads ./timesheets.html
fs.writeFileSync(path.join(root, "dist/web/index.html"), web);
const mb = (s) => (s.length / 1024 / 1024).toFixed(2);
console.log(`dist/index.html ${mb(out)} MB`);
console.log(`dist/web/index.html ${mb(web)} MB`);
