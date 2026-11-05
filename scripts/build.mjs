// Builds dist/index.html = src/shell.html + <script> + the app assembled from src/app/ (see bundle.mjs) + </script>
// This is exactly the file published to the claude.ai artifact (the platform wraps it in its own <html> skeleton).
import fs from "node:fs";
import path from "node:path";
import { pageFragment, root } from "./bundle.mjs";

let out;
try { out = pageFragment(); } catch (e) { console.error(e.message); process.exit(1); }
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), out);
fs.copyFileSync(path.join(root, "dist/index.html"), path.join(root, "tests/timesheets.html")); // the test harness loads ./timesheets.html
console.log(`dist/index.html ${(out.length / 1024 / 1024).toFixed(2)} MB`);
