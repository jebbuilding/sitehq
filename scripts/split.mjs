// The reverse of bundle.mjs: cuts an assembled app back into the files under src/app/.
//   node scripts/split.mjs <file>      <file> = a built/published page (index.html) or just its app script
// Use it to merge a version that was published to the artifact from somewhere else (docs/PLATFORM.md › Publishing):
// run it on that version, then review `git diff`.
// Sections are cut at their banner lines. A banner that already heads a file under src/app/ goes back into that
// file; a banner not seen before becomes src/app/unsorted/<name>.js for you to move. Files whose banner is no longer
// there are deleted (they stay in git history). The order of the sections is not recorded: it comes from the imports.
import fs from "node:fs";
import path from "node:path";
import { root, APP_DIR, OPEN, CLOSE, BANNER, appFiles, parts } from "./bundle.mjs";

const arg = process.argv[2];
if (!arg) { console.error("usage: node scripts/split.mjs <index.html | app.js>"); process.exit(1); }
const fail = m => { console.error("split: " + m); process.exit(1); };

let app = fs.readFileSync(arg, "utf8");
const a = app.lastIndexOf("<script>\n"), b = app.lastIndexOf("</script>");
if (a >= 0 && b > a) app = app.slice(a + 9, b); // a whole page: the app is its last inline script
if (!app.startsWith(OPEN) || !app.endsWith(CLOSE)) fail("this does not look like the app: expected it to start with (function(){ and end with })();");

const lines = app.slice(OPEN.length, app.length - CLOSE.length).split("\n");
if (lines.pop() !== "") fail("unexpected text before the closing })();");
const cuts = lines.map((l, i) => BANNER.test(l) ? i : -1).filter(i => i >= 0);
if (cuts[0] !== 0) fail("there is code before the first section banner; every section must start with a /* ===== NAME ===== */ line");
const sections = cuts.map((c, k) => ({ banner: lines[c], text: lines.slice(c, cuts[k + 1] ?? lines.length).join("\n") + "\n" }));
const dup = sections.map(s => s.banner).find((x, i, all) => all.indexOf(x) !== i);
if (dup) fail("two sections have the same banner, so they cannot be told apart: " + dup);

const dir = path.join(root, APP_DIR);
const old = appFiles();
const byBanner = new Map(old.map(f => [fs.readFileSync(path.join(dir, f), "utf8").split("\n")[0], f]));

const taken = new Set(old), order = [], count = { same: 0, changed: [], added: [] };
for (const s of sections) {
  let f = byBanner.get(s.banner);
  if (!f) {
    const title = s.banner.replace(/^\/\* =+ | =+ \*\/\s*$/g, "").split(/[:(›→]/)[0];
    const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "section";
    for (let n = 1; taken.has(f = `unsorted/${slug}${n > 1 ? "-" + n : ""}.js`); n++);
    count.added.push(f);
  }
  taken.add(f); order.push(f);
  const file = path.join(dir, f);
  // The assembled app has no import/export blocks; keep the one the file has (npm run modules brings it up to date).
  const had = fs.existsSync(file) ? parts(fs.readFileSync(file, "utf8")) : null, now = parts(s.text);
  if (had && had.banner + had.body === s.text) { count.same++; continue; }
  if (!count.added.includes(f)) count.changed.push(f);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, now.banner + (had ? had.header : "") + now.body);
}
const removed = old.filter(f => !order.includes(f));
removed.forEach(f => fs.rmSync(path.join(dir, f)));

console.log(`${sections.length} sections: ${count.same} unchanged, ${count.changed.length} changed, ${count.added.length} new, ${removed.length} removed`);
if (count.changed.length || count.added.length) console.log("now run: npm run modules   (brings the import/export blocks up to date)");
count.changed.forEach(f => console.log("  changed  " + f));
count.added.forEach(f => console.log("  new      " + f + "   (move it to the right folder)"));
removed.forEach(f => console.log("  removed  " + f + "   (its banner is gone or was reworded – check it was not just renamed)"));
