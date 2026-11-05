// Builds dist/index.html = src/shell.html + <script> + src/app.js + </script>
// This is exactly the file published to the claude.ai artifact (the platform wraps it in its own <html> skeleton).
import fs from "node:fs";
const shell = fs.readFileSync("src/shell.html", "utf8");
const app = fs.readFileSync("src/app.js", "utf8");
try { new Function(app); } catch (e) { console.error("Syntax error in src/app.js:", e.message); process.exit(1); }
fs.mkdirSync("dist", { recursive: true });
const out = shell + "<script>\n" + app + "</script>\n";
fs.writeFileSync("dist/index.html", out);
fs.copyFileSync("dist/index.html", "tests/timesheets.html"); // the test harness loads ./timesheets.html
console.log(`dist/index.html ${(out.length / 1024 / 1024).toFixed(2)} MB`);
