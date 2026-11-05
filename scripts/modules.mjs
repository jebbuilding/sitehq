// Keeps the import/export block at the top of every file under src/app/ in step with the code, checks the
// structure, and writes docs/MODULES.md (the generated map of what each file declares and uses).
//   node scripts/modules.mjs           rewrite the import/export blocks and docs/MODULES.md, then run the checks
//   node scripts/modules.mjs --check   change nothing; fail if a block or docs/MODULES.md is out of date (npm test, CI)
// Every top-level name is unique across src/app/ (checked), so "which file does this name come from" always has
// one answer and the blocks can be generated: write the code, run this, and the imports and exports follow.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { root, APP_DIR, ENTRY, parts, order } from "./bundle.mjs";
import { analyzeApp, BROWSER } from "./analyze.mjs";

// Globals created by the libraries the app loads from the CDN on demand (docs/ARCHITECTURE.md › Runtime).
const LIBRARIES = new Set(["jspdf", "pdfjsLib", "XLSX", "JSZip", "mammoth", "qrcode"]);
const DOC = "docs/MODULES.md";

const { files, owner, duplicates } = analyzeApp();
const byFile = new Map(files.map(f => [f.file, f]));

// ---- resolve every free name to the file that declares it
const problems = [];
const usedBy = new Map(files.map(f => [f.file, new Map()])); // declaring file -> name -> Set(using files)
const deps = new Map(files.map(f => [f.file, new Map()]));   // using file -> declaring file -> Set(names)
const crossWrites = [], loadUses = [];
for (const d of duplicates) problems.push(`"${d.name}" is declared twice: ${d.files.join(" and ")}`);
for (const f of files) for (const [name, u] of f.uses) {
  const o = owner.get(name);
  if (!o) {
    if (!BROWSER.has(name) && !LIBRARIES.has(name)) problems.push(`${f.file}:${u.line} uses "${name}", which is not declared anywhere in src/app/ and is not a browser or library global`);
    continue;
  }
  if (u.atLoad && byFile.get(o).defs.get(name).kind !== "function") loadUses.push({ user: f.file, provider: o, name, line: u.line });
  if (u.write) crossWrites.push({ name, declared: o, written: f.file, line: u.line });
  const m = usedBy.get(o); if (!m.has(name)) m.set(name, new Set()); m.get(name).add(f.file);
  const dm = deps.get(f.file); if (!dm.has(o)) dm.set(o, new Set()); dm.get(o).add(name);
}

// ---- only the entry may do anything while the page loads; everything else declares, and exposes an init if it needs one
for (const f of files) if (f.file !== ENTRY) for (const s of f.loadStatements)
  problems.push(`${f.file}:${s.line} runs at load ("${s.text.slice(0, 50)}…"). Put it in an init function and call that from ${ENTRY}`);

// ---- a const/let used while another module is being evaluated must be ready: its file must not import the user back
const reaches = (from, to) => { const seen = new Set([from]), todo = [from]; while (todo.length) for (const w of deps.get(todo.pop()).keys()) { if (w === to) return true; if (!seen.has(w)) { seen.add(w); todo.push(w); } } return false; };
for (const u of loadUses) if (u.user !== ENTRY && reaches(u.provider, u.user))
  problems.push(`${u.user}:${u.line} uses "${u.name}" while it is being loaded, but ${u.provider} (which declares it) imports ${u.user} back, directly or through other files, so it may not be ready. Move "${u.name}" to a file that does not depend on ${u.user}`);

// ---- the import/export block each file should have
const check = process.argv.includes("--check");
const sorted = names => [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const relative = (from, to) => { const r = path.posix.relative(path.posix.dirname(from), to); return r.startsWith(".") ? r : "./" + r; };
let rewritten = 0;
for (const f of files) {
  // written the way Prettier would print it (.prettierrc.json: printWidth 100), so formatting never fights the generator
  const list = (names, before, after) => { const one = `${before} { ${names.join(", ")} }${after};\n`; return one.length - 1 <= 100 ? one : `${before} {\n${names.map(n => `  ${n},\n`).join("")}}${after};\n`; };
  const imports = [...deps.get(f.file)].sort(([a], [b]) => (a < b ? -1 : 1)).map(([file, names]) => list(sorted(names), "import", ` from "${relative(f.file, file)}"`));
  const exported = sorted(usedBy.get(f.file).keys());
  const header = imports.join("") + (exported.length ? list(exported, "export", "") : "");
  if (header === f.header) continue;
  if (check) { problems.push(`${APP_DIR}/${f.file}: its import/export block is out of date – run: npm run modules`); continue; }
  const p = parts(f.raw);
  fs.writeFileSync(path.join(root, APP_DIR, f.file), p.banner + header + p.body);
  rewritten++;
}
if (rewritten) { // the blocks changed length, so line numbers and sizes moved: start again from the files as they now are
  console.log(`modules: ${rewritten} import/export block(s) rewritten`);
  try { execFileSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: "inherit" }); } catch (e) { process.exit(1); }
  process.exit(0);
}

// ---- a standard bundler must accept the modules, and evaluate them in the order scripts/bundle.mjs joins them in
let loadOrder = [];
try {
  loadOrder = order();
  const r = await build({ absWorkingDir: root, entryPoints: [`${APP_DIR}/${ENTRY}`], bundle: true, format: "iife", treeShaking: false, write: false, logLevel: "silent" });
  const theirs = [...r.outputFiles[0].text.matchAll(/^  \/\/ src\/app\/(.+)$/gm)].map(m => m[1]);
  if (theirs.join("\n") !== loadOrder.join("\n")) problems.push("esbuild would evaluate the modules in a different order from scripts/bundle.mjs");
} catch (e) {
  (e.errors || [{ text: e.message }]).forEach(x => problems.push(`${x.location ? `${x.location.file}:${x.location.line} ` : ""}${x.text}`));
}

// ---- cycles: strongly connected groups of files (Tarjan)
function cycles() {
  let n = 0; const idx = new Map(), low = new Map(), stack = [], on = new Set(), out = [];
  const visit = v => {
    idx.set(v, n); low.set(v, n); n++; stack.push(v); on.add(v);
    for (const w of deps.get(v).keys()) {
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) { const c = []; let w; do { w = stack.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) out.push(c); }
  };
  for (const f of files) if (!idx.has(f.file)) visit(f.file);
  return out.sort((a, b) => b.length - a.length);
}

// ---- the document
const kb = b => (b / 1024).toFixed(b < 10240 ? 1 : 0) + " KB";
const code = s => "`" + s + "`";
const totalNames = owner.size, shared = [...usedBy.values()].reduce((n, m) => n + m.size, 0);
const edges = [...deps.values()].reduce((n, m) => n + m.size, 0);
const loadCount = files.reduce((n, f) => n + f.loadStatements.length, 0);
const cyc = cycles();
const top = [];
for (const [file, m] of usedBy) for (const [name, set] of m) top.push({ name, file, n: set.size });
top.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

const out = [];
out.push("# Module map", "",
  "**Generated by `node scripts/modules.mjs` – do not edit.** `npm test` fails if this file is out of date.", "",
  "What each file under `src/app/` declares at its top level, which of those names other files use, and which files it depends on. Read `docs/ARCHITECTURE.md` first for how the files are joined and why order matters.", "",
  "## Totals", "",
  `- ${files.length} files, ${kb(files.reduce((n, f) => n + f.bytes, 0))}, ${files.reduce((n, f) => n + f.lines, 0)} lines.`,
  `- ${totalNames} names declared at the top level (the shared scope); ${shared} of them are used by a file other than the one that declares them.`,
  `- ${edges} file-to-file dependencies (file A uses at least one name from file B).`,
  `- ${loadCount} statements run while the page loads, all in ${code(ENTRY)}.`,
  cyc.length ? `- Dependency cycles: ${cyc.map(c => c.length + " files").join(", ")} depend on each other in a loop (directly or through other files); the other ${files.length - cyc.reduce((n, c) => n + c.length, 0)} files are outside any loop.` : "- No dependency cycles.",
  "");
out.push("## The most widely used names", "", "The de facto shared API: names used by the most files.", "", "| Name | Declared in | Used by |", "|---|---|---|");
top.slice(0, 40).forEach(t => out.push(`| ${code(t.name)} | ${code(t.file)} | ${t.n} files |`));
out.push("");
out.push("## Variables changed from another file", "",
  crossWrites.length ? "A file assigns to a variable that a different file declares. These are the places that would not be legal across real ES modules (an import cannot be assigned to)." : "None.", "");
if (crossWrites.length) {
  const g = new Map();
  for (const w of crossWrites) { const k = w.name + "\u0000" + w.declared; if (!g.has(k)) g.set(k, []); g.get(k).push(`${w.written}:${w.line}`); }
  out.push("| Variable | Declared in | Assigned in |", "|---|---|---|");
  for (const [k, where] of g) { const [name, declared] = k.split("\u0000"); out.push(`| ${code(name)} | ${code(declared)} | ${where.map(code).join(", ")} |`); }
  out.push("");
}
out.push("## What runs when the page loads", "", `Only ${code(ENTRY)} has statements that run at load; every other file only declares things. In order:`, "");
for (const s of byFile.get(ENTRY).loadStatements) out.push(`1. ${code(s.text.slice(0, 70).replace(/[`|]/g, "'") + (s.text.length > 70 ? "…" : ""))}`);
out.push("");
out.push("## Evaluation order", "", `The order the files are joined in: from ${code(ENTRY)}, each file after the files it imports (the order ES modules are evaluated in). Derived from the imports, not maintained by hand.`, "");
out.push(loadOrder.map(code).join(" → "), "");
out.push("## Files", "", "By folder. \"Used elsewhere\" lists each name with the number of other files using it.", "");
for (const f of files) {
  const exported = [...usedBy.get(f.file)].map(([name, set]) => ({ name, n: set.size })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const d = [...deps.get(f.file)].map(([file, set]) => ({ file, n: set.size })).sort((a, b) => b.n - a.n || a.file.localeCompare(b.file));
  const users = new Set(); for (const set of usedBy.get(f.file).values()) set.forEach(x => users.add(x));
  out.push(`### ${code(f.file)}`, "",
    `${f.banner.replace(/\|/g, "/")}`, "",
    `- ${f.lines} lines, ${kb(f.bytes)}. Declares ${f.defs.size} names, ${exported.length} used elsewhere.`,
    `- **Used elsewhere:** ${exported.length ? exported.map(e => `${code(e.name)} (${e.n})`).join(", ") : "nothing"}`,
    `- **Uses names from ${d.length} files:** ${d.length ? d.map(e => `${code(e.file)} (${e.n})`).join(", ") : "none"}`,
    `- **Used by ${users.size} files**`, "");
}
const text = out.join("\n");

// ---- write or verify, then report
const docFile = path.join(root, DOC);
if (check) {
  if (!fs.existsSync(docFile) || fs.readFileSync(docFile, "utf8") !== text) problems.push(`${DOC} is out of date – run: node scripts/modules.mjs`);
} else fs.writeFileSync(docFile, text);

if (problems.length) { console.error(`modules: ${problems.length} problem(s)`); problems.forEach(p => console.error("  - " + p)); process.exit(1); }
console.log(`modules: ${files.length} files, ${totalNames} names, ${edges} dependencies, ${crossWrites.length} cross-file assignments – OK`);
