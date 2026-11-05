// Assembles the app's JavaScript from the ES modules under src/app/ into the one script that is published.
//
// The files are real ES modules: each begins with a banner, then an import/export block, then code. This joiner
// does what a bundler does for modules of this shape, and nothing else:
//   - the order is the order ES modules are evaluated in: starting from ENTRY, each file after the files it imports;
//   - the import/export blocks are dropped and the files are put in one function scope, where every name is in reach
//     (every top-level name is unique across src/app/ – scripts/modules.mjs checks that, and that the blocks are right);
//   - the code itself is copied through character for character.
// The last point is why this is not esbuild: the published script stays the source text, so a version published
// from somewhere else can be cut back into files (scripts/split.mjs). `npm run check` proves with esbuild that the
// modules are valid and that it would evaluate them in this same order, so swapping bundlers later is a small change.
// Used by build.mjs (the published page), dev.mjs (local server) and split.mjs (the reverse operation).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const APP_DIR = "src/app", ENTRY = "core/boot.js";
export const OPEN = "(function(){\n", CLOSE = "})();\n";
// A section banner: the first line of every file under src/app/.
export const BANNER = /^\/\* =+ .+? =+ \*\/\s*$/;
// The import/export block that follows the banner. It is generated (scripts/modules.mjs) from what the file uses
// and what other files use from it.
const HEADER = /^(?:import\s*\{[^}]*\}\s*from\s*"[^"]+";[ \t]*\n|export\s*\{[^}]*\};[ \t]*\n)+/;

/** A source file in three parts: its banner line, its import/export block (may be empty), and the code. */
export function parts(src) {
  const nl = src.indexOf("\n") + 1, rest = src.slice(nl), m = HEADER.exec(rest);
  return { banner: src.slice(0, nl), header: m ? m[0] : "", body: m ? rest.slice(m[0].length) : rest };
}

/** Every .js file under src/app/, as paths relative to it, sorted. */
export function appFiles(dir = path.join(root, APP_DIR), rel = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? appFiles(path.join(dir, e.name), rel + e.name + "/") : e.name.endsWith(".js") ? [rel + e.name] : []).sort();
}

const read = f => fs.readFileSync(path.join(root, APP_DIR, f), "utf8");

/** The files a file imports, in the order its import lines are written. */
export function importsOf(file, src = read(file)) {
  return [...parts(src).header.matchAll(/from\s*"([^"]+)"/g)].map(m => path.posix.join(path.posix.dirname(file), m[1]));
}

/** The order the modules are evaluated in, from ENTRY: each file after everything it imports (loops are entered once). */
export function order() {
  const all = new Set(appFiles()), done = new Set(), out = [];
  const visit = (f, from) => {
    if (done.has(f)) return;
    if (!all.has(f)) throw new Error(`${APP_DIR}/${from} imports ${f}, which does not exist`);
    done.add(f);
    importsOf(f).forEach(d => visit(d, f));
    out.push(f);
  };
  visit(ENTRY, "(entry)");
  const unreached = [...all].filter(f => !done.has(f));
  if (unreached.length) throw new Error(`Nothing imports these, so they would be left out of the app (unused code, or run npm run modules): ${unreached.join(", ")}`);
  return out;
}

/** The assembled app script. Throws an Error naming the file if anything is wrong. */
export function bundleApp() {
  const sources = order().map(f => {
    const p = parts(read(f)), src = p.banner + p.body;
    // Each file must parse on its own, so no statement, string or template can straddle two files.
    try { new Function(src); } catch (e) { throw new Error(`Syntax error in ${APP_DIR}/${f}: ${e.message}`); }
    return src.endsWith("\n") ? src : src + "\n";
  });
  const app = OPEN + sources.join("") + CLOSE;
  try { new Function(app); } catch (e) { throw new Error(`Syntax error in the assembled app (is a name declared in two files?): ${e.message}`); }
  return app;
}

export const STYLES_DIR = "src/styles", STYLES_ENTRY = "index.css";
const STYLE_SLOT = "<!-- styles: src/styles/index.css and the files it imports are inlined here by scripts/bundle.mjs -->";

/** The stylesheet files, in the order src/styles/index.css imports them. */
export function styleFiles() {
  const dir = path.join(root, STYLES_DIR), files = [];
  const entry = fs.readFileSync(path.join(dir, STYLES_ENTRY), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const line of entry.split("\n").map(l => l.trim()).filter(Boolean)) {
    const m = /^@import "\.\/([^"]+\.css)";$/.exec(line);
    if (!m) throw new Error(`${STYLES_DIR}/${STYLES_ENTRY} may only contain comments and lines like @import "./name.css"; – found: ${line.slice(0, 60)}`);
    if (files.includes(m[1])) throw new Error(`${STYLES_DIR}/${STYLES_ENTRY} imports ${m[1]} twice`);
    if (!fs.existsSync(path.join(dir, m[1]))) throw new Error(`${STYLES_DIR}/${STYLES_ENTRY} imports ${m[1]}, which does not exist`);
    files.push(m[1]);
  }
  const unlisted = fs.readdirSync(dir).filter(f => f.endsWith(".css") && f !== STYLES_ENTRY && !files.includes(f));
  if (unlisted.length) throw new Error(`Not imported by ${STYLES_DIR}/${STYLES_ENTRY}, so they would be left out of the page: ${unlisted.join(", ")}`);
  return files;
}

/** The stylesheet: the imported files joined in order, text unchanged. */
export function bundleCss() {
  return styleFiles().map(f => { const s = fs.readFileSync(path.join(root, STYLES_DIR, f), "utf8"); return s.endsWith("\n") ? s : s + "\n"; }).join("");
}

/** The page fragment that is published: static shell with the stylesheet inlined, then the app in one inline script. */
export function pageFragment(app = bundleApp()) {
  const shell = fs.readFileSync(path.join(root, "src/shell.html"), "utf8");
  if (shell.split(STYLE_SLOT).length !== 2) throw new Error("src/shell.html must contain the styles placeholder comment exactly once");
  return shell.replace(STYLE_SLOT, () => "<style>\n" + bundleCss() + "</style>") + "<script>\n" + app + "</script>\n";
}
