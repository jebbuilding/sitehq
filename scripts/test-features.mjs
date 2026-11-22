// Runs every feature test in tests/features/ (a few at a time) and says which passed and which didn't.
// `npm run test:features` – also run by CI, so a change that breaks an older feature shows up straight away
// (until Nov 2026 these only ran by hand). Each test passes when its last line says "all passed".
// KNOWN: tests failing for a reason already on the to-do list; they still run and are reported, but don't fail the run.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = join(dirname(fileURLToPath(import.meta.url)), "..", "tests");
const KNOWN = {
  "h456.js": "the drawing's 15° angle snap – to look at when the drawing screen is split (to-do 37)",
};
const N = +(process.env.FEATURE_JOBS || 3);
const only = process.argv.slice(2);
const files = readdirSync(join(TESTS, "features"))
  .filter((f) => f.endsWith(".js") && (!only.length || only.some((o) => f.startsWith(o))))
  .sort();

const run = (f) =>
  new Promise((res) => {
    const p = spawn(process.execPath, [join("features", f)], { cwd: TESTS });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    const t = setTimeout(() => p.kill(), 300000);
    p.on("close", () => {
      clearTimeout(t);
      const lines = out.trim().split("\n");
      const last = lines[lines.length - 1] || "";
      const fails = lines.filter((l) => /❌|^FAIL/.test(l)).slice(0, 3);
      const err = (lines.find((l) => /^\s*\w*Error\b|^\s*at .*features[\\/]h\d+\.js:\d+/.test(l)) || "").trim();
      res({ f, ok: /all passed|ALL OK/i.test(last), last, fails, err: err.slice(0, 300) });
    });
  });

const results = [];
let i = 0;
await Promise.all(
  Array.from({ length: N }, async () => {
    while (i < files.length) {
      const f = files[i++];
      const r = await run(f);
      results.push(r);
      process.stdout.write(r.ok ? "." : KNOWN[f] ? "k" : "F");
    }
  }),
);
console.log();
/* a test that failed while others ran alongside gets one more go on its own: the UI tests wait fixed times, and on a
   busy machine (GitHub's, or several at once) a click can time out. A real fault fails again; one that only passed
   the second time is still listed ("passed on its own"), so a test that keeps needing it can be made sturdier. */
const flaky = [];
for (const r of results.filter((x) => !x.ok && !KNOWN[x.f])) {
  const again = await run(r.f);
  if (again.ok) {
    r.ok = true;
    flaky.push(r);
  } else Object.assign(r, again);
}
flaky.forEach((r) =>
  console.log(`  passed on its own: ${r.f} (first time: ${(r.fails[0] || r.last).slice(0, 150)})`),
);
if (process.env.GITHUB_ACTIONS && flaky.length)
  console.log(
    `::warning title=${flaky.length} feature test(s) passed only on their own::` +
      flaky.map((r) => r.f).join(", "),
  );
const bad = results.filter((r) => !r.ok && !KNOWN[r.f]);
const known = results.filter((r) => !r.ok && KNOWN[r.f]);
known.forEach((r) => console.log(`  known: ${r.f} – ${KNOWN[r.f]}`));
bad
  .sort((a, b) => a.f.localeCompare(b.f))
  .forEach((r) => {
    console.log(`  ❌ ${r.f}: ${(r.fails[0] || r.last).slice(0, 200)}`);
  });
/* on GitHub, also as one annotation listing them all: annotations show on the run's page even to someone not signed
   in (the logs don't), but only 10 per step – so one, with each test's failing lines (or the error if it crashed) */
if (process.env.GITHUB_ACTIONS && bad.length)
  console.log(
    `::error title=${bad.length} feature test(s) failed::` +
      bad
        .map((r) => `${r.f}: ${[...r.fails, r.err, r.last].filter(Boolean).join(" / ")}`)
        .map((s) => s.replace(/%/g, "%25").replace(/[\r\n]/g, " "))
        .join("%0A")
        .slice(0, 30000),
  );
console.log(
  `features: ${results.length - bad.length - known.length} passed, ${bad.length} failed, ${known.length} known`,
);
process.exit(bad.length ? 1 : 0);
