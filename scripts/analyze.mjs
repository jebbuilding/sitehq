// Static analysis of the files under src/app/: what each one declares at the top level, and which names it uses
// that it does not declare itself. Shared by modules.mjs (the checks and docs/MODULES.md).
// Dev-only: needs `npm install` (acorn, eslint-scope, globals). build.mjs and dev.mjs do not use this.
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import { analyze } from "eslint-scope";
import globals from "globals";
import { root, APP_DIR, appFiles, parts } from "./bundle.mjs";

// Names the browser provides. Anything used that is neither declared in src/app/ nor in here is reported.
export const BROWSER = new Set([...Object.keys(globals.browser), ...Object.keys(globals.es2025 || globals.es2021), "webkitSpeechRecognition", "webkitAudioContext"]);

const isFunction = n => n && (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression" || n.type === "FunctionDeclaration");

/** One file: its top-level declarations and its unresolved ("free") references. */
export function analyzeFile(file) {
  const raw = fs.readFileSync(path.join(root, APP_DIR, file), "utf8");
  // Analyse the code without its import/export block (that block is generated from this analysis), keeping line numbers true.
  const p = parts(raw), src = p.banner + p.header.replace(/[^\n]/g, "") + p.body;
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowReturnOutsideFunction: true, ranges: true, locations: true });
  // parent links, to tell a function that is called on the spot (an IIFE, which runs while the page loads) from one that runs later
  (function link(n, parent) {
    if (!n || typeof n.type !== "string") return;
    n.parent = parent;
    for (const k in n) { if (k === "parent") continue; const v = n[k]; if (Array.isArray(v)) v.forEach(c => link(c, n)); else if (v && typeof v.type === "string") link(v, n); }
  })(ast, null);
  const scopes = analyze(ast, { ecmaVersion: 2022, sourceType: "script" });
  const g = scopes.globalScope;
  const runsAtLoad = scope => { // true unless the reference sits inside a function that is not immediately invoked
    for (let s = scope; s && s !== g; s = s.upper) {
      if (s.type !== "function") continue;
      const fn = s.block, p = fn.parent;
      const iife = p && p.type === "CallExpression" && p.callee === fn;
      if (!iife) return false;
    }
    return true;
  };
  const defs = new Map(); // name -> { kind, line }
  for (const v of g.variables) {
    const d = v.defs[0];
    if (!d) continue; // implicit
    const kind = d.type === "FunctionName" ? "function" : d.type === "ClassName" ? "class" : d.parent && d.parent.kind ? d.parent.kind : "var";
    defs.set(v.name, { kind, line: d.name.loc.start.line, count: v.defs.length });
  }
  const uses = new Map(); // name -> { read, write, atLoad, line }
  for (const r of g.through) {
    const name = r.identifier.name;
    const u = uses.get(name) || { read: 0, write: 0, atLoad: 0, line: r.identifier.loc.start.line };
    if (r.isRead()) u.read++;
    if (r.isWrite()) u.write++;
    if (runsAtLoad(r.from)) u.atLoad++;
    uses.set(name, u);
  }
  // statements at the top level that are not declarations: they do something while the page loads
  const loadStatements = ast.body.filter(n => !/Declaration$/.test(n.type) && n.type !== "EmptyStatement").map(n => ({ line: n.loc.start.line, type: n.type, text: src.slice(n.start, Math.min(n.end, n.start + 90)).replace(/\s+/g, " ") }));
  const banner = src.split("\n")[0].replace(/^\/\* =+ | =+ \*\/\s*$/g, "");
  return { file, banner, bytes: Buffer.byteLength(raw), lines: raw.split("\n").length - 1, defs, uses, loadStatements, ast, src, raw, header: p.header };
}

/** All files, plus where every top-level name is declared. */
export function analyzeApp() {
  const files = appFiles().map(analyzeFile);
  const owner = new Map(), duplicates = [];
  for (const f of files) for (const [name, d] of f.defs) {
    if (d.count > 1) duplicates.push({ name, files: [f.file, f.file] });
    if (owner.has(name)) duplicates.push({ name, files: [owner.get(name), f.file] }); else owner.set(name, f.file);
  }
  return { files, owner, duplicates };
}
