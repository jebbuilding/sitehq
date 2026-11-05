// The made-up data the tests run on, read out of the test files so there is one copy of it:
// the documents seeded in tests/harness8src.js (the fake platform) and tests/crawl.js (the extras for the crawl),
// and stand-in files for the asset ids those documents point at. Used by dev.mjs and local.mjs. Synthetic data only.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { root } from "./bundle.mjs";

const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

/** The text between two markers, or an error naming what could not be found. */
export function between(s, a, b, what) {
  const i = s.indexOf(a), j = i < 0 ? -1 : s.indexOf(b, i + a.length);
  if (j < 0) throw new Error(`cannot find ${what} – has it changed shape?`);
  return s.slice(i + a.length, j);
}

/** The seed lines of tests/crawl.js: statements of the form store["path"]={…}; */
export const crawlSeedSource = () => between(read("tests/crawl.js"), "const seed=`", "`;\nsrc=src.replace", "the seed in tests/crawl.js");

/**
 * The test seed as { "collection/id": data }: the crawl's extras first, then the harness's own documents on top,
 * which is the order the tests apply them in.
 */
export function testSeed() {
  const base = between(read("tests/harness8src.js"), "const t=new Date();", "const ns={db:", "the seed in tests/harness8src.js");
  const source = crawlSeedSource() + "\nconst t=new Date();" + base;
  // Both pieces sit inside template literals in the test files; they are run here as plain code, which is only
  // the same thing while they contain nothing a template would change.
  if (/[\\`]|\$\{/.test(source)) throw new Error("the test seed now contains a backslash, backtick or ${ – scripts/seed.mjs needs to handle it");
  const store = {};
  new Function("store", "window", source)(store, {});
  return store;
}

/** A plain grey PNG, w × h. */
export function greyPng(w, h) {
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(body.length + 8); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(zlib.crc32(body), out.length - 4); return out; };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; // 8-bit greyscale
  const rows = Buffer.alloc((w + 1) * h, 0x9a); for (let y = 0; y < h; y++) rows[y * (w + 1)] = 0; // filter byte per row
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

/** Asset ids the seed documents point at → a fixture file to stand in for each. */
export const SEEDED = { a1: ["clip_sheet.pdf", "application/pdf"], a3: ["clip_sheet.pdf", "application/pdf"], a9: ["clip_sheet.pdf", "application/pdf"], a2: ["test.jpg", "image/jpeg"], img1: ["ld1.png", "image/png"] };

/** The id of the company logo asset, read from the app (the real logo exists only on the live artifact). */
export function logoIdOf(app) {
  const logo = /const LOGO_ID\s*=\s*"([^"]+)"/.exec(app);
  if (!logo) throw new Error("cannot find LOGO_ID in the app – has it changed shape?");
  return logo[1];
}

/** Stand-in files for the local backend: { id: { bytes, type } } – the fixtures, plus a grey block for the logo. */
export function seedFiles(app) {
  const files = { [logoIdOf(app)]: { bytes: greyPng(240, 80), type: "image/png" } };
  for (const [id, [name, type]] of Object.entries(SEEDED)) files[id] = { bytes: fs.readFileSync(path.join(root, "tests/fixtures", name)), type };
  return files;
}
