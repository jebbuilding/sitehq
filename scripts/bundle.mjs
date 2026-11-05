// Assembles the app's JavaScript from the files under src/app/, in the order listed in src/app/manifest.txt.
// The files are NOT modules: they are slices of one function body and share one scope, so the result is
//   (function(){ <file 1> <file 2> … })();
// exactly as when it was a single app.js. Order matters (see docs/ARCHITECTURE.md › Load order).
// Used by build.mjs (the published page), dev.mjs (local server) and split.mjs (the reverse operation).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const APP_DIR = "src/app", MANIFEST = APP_DIR + "/manifest.txt";
export const OPEN = "(function(){\n", CLOSE = "})();\n";
// A section banner: the first line of every file under src/app/.
export const BANNER = /^\/\* =+ .+? =+ \*\/\s*$/;

/** Paths (relative to src/app/) in load order. Blank lines and # comments are ignored. */
export function manifest() {
  return fs.readFileSync(path.join(root, MANIFEST), "utf8").split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
}

function jsFilesOnDisk(dir = path.join(root, APP_DIR), rel = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? jsFilesOnDisk(path.join(dir, e.name), rel + e.name + "/") : e.name.endsWith(".js") ? [rel + e.name] : []);
}

/** The assembled app script. Throws an Error naming the file if anything is wrong. */
export function bundleApp() {
  const files = manifest(), listed = new Set();
  const parts = files.map(f => {
    if (listed.has(f)) throw new Error(`${MANIFEST} lists ${f} twice`);
    listed.add(f);
    let src;
    try { src = fs.readFileSync(path.join(root, APP_DIR, f), "utf8"); } catch (e) { throw new Error(`${MANIFEST} lists ${f}, which does not exist`); }
    // Each file must parse on its own, so no statement, string or template can straddle two files.
    try { new Function(src); } catch (e) { throw new Error(`Syntax error in ${APP_DIR}/${f}: ${e.message}`); }
    return src.endsWith("\n") ? src : src + "\n";
  });
  const unlisted = jsFilesOnDisk().filter(f => !listed.has(f));
  if (unlisted.length) throw new Error(`Not in ${MANIFEST}, so they would be left out of the app: ${unlisted.join(", ")}`);
  const app = OPEN + parts.join("") + CLOSE;
  try { new Function(app); } catch (e) { throw new Error(`Syntax error in the assembled app (is a name declared in two files?): ${e.message}`); }
  return app;
}

/** The page fragment that is published: static shell, then the app in one inline script. */
export function pageFragment(app = bundleApp()) {
  return fs.readFileSync(path.join(root, "src/shell.html"), "utf8") + "<script>\n" + app + "</script>\n";
}
