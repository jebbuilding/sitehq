// Tests of SiteHQ's own backend (server/) and the adapter (src/platform/aws-adapter.js), all on this machine:
//   1. node:test suites in server/test/*.test.mjs – rules matrix, stores, API, live updates, sign-in, files, adapter contract
//   2. the existing crawl (tests/crawl.js) as owner, trade and client against the app served by the local backend
//   3. tests/backend-live.mjs – an owner's write appearing live in a trade's page (two browsers)
//   4. tests/backend-signin.mjs – the sign-in screen on the page as deployed, against the local stand-in for Cognito:
//      emailed code, owner / trade / client, token renewal, signing out, the messages
// Run with `npm run test:backend` (after `npm run build`); `npm test` runs it last. Exits non-zero on any failure.
//   node scripts/test-backend.mjs unit | crawl [role] | live | signin     runs one part
//   VERBOSE=1 prints each crawl's full report and every request the rules refused
import { spawn } from "node:child_process";
import path from "node:path";
import { root } from "./bundle.mjs";
import { startLocalSite } from "./local.mjs";

const [part, arg] = process.argv.slice(2);
const verbose = !!process.env.VERBOSE;
let failed = false;
const fail = (msg) => { failed = true; console.log("  ❌ " + msg); };

/** Run a command; resolves { code, out } with stdout and stderr together. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: root, ...opts, env: { ...process.env, ...opts.env } });
    let out = "";
    child.stdout.on("data", (d) => { out += d; if (opts.echo) process.stdout.write(d); });
    child.stderr.on("data", (d) => { out += d; if (opts.echo) process.stderr.write(d); });
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function unit() {
  console.log("backend unit and contract tests (node --test server/test/*.test.mjs)");
  const r = await run(process.execPath, ["--test", "--test-reporter=tap", "server/test/*.test.mjs"], { echo: verbose });
  const count = (k) => Number((new RegExp(`^# ${k} (\\d+)`, "m").exec(r.out) || [])[1] || 0);
  console.log(`  ${count("pass")} passed, ${count("fail")} failed`);
  if (r.code !== 0 || !count("pass")) { if (!verbose) console.log(r.out.split("\n").filter((l) => /not ok|✖|Error|expected|actual/.test(l)).slice(0, 40).join("\n")); fail("backend unit tests failed"); }
}

// Each role gets a backend of its own, freshly seeded, as each crawl of the fake starts from a fresh page.
async function crawl(role) {
  const local = await startLocalSite();
  try {
    const r = await run(process.execPath, ["crawl.js", role], { cwd: path.join(root, "tests"), env: { SITEHQ_URL: local.url } });
    const line = /^ERRORS \((\d+)\)$/m.exec(r.out);
    console.log(`backend crawl ${role}: ${line ? line[0] : "no result (crashed?)"}`);
    if (verbose || !line || line[1] !== "0") console.log(r.out.trimEnd().split("\n").map((l) => "    " + l).join("\n"));
    if (!line || line[1] !== "0") fail(`crawl as ${role} on the backend reported errors`);
    // What the rules turned away while the app was being clicked through. Reads the app makes before it knows who
    // is signed in are expected here (a trade asking for owner-only lists); a refused WRITE is worth a look.
    const seen = new Map();
    for (const x of local.refused) { const k = `${x.op} ${x.path}`; seen.set(k, (seen.get(k) || 0) + 1); }
    const writes = [...seen.keys()].filter((k) => !/^(get|list) /.test(k));
    console.log(`  rules refused ${local.refused.length} requests (${seen.size} different; ${writes.length} of them writes)`);
    if (verbose || writes.length) for (const [k, n] of seen) if (verbose || !/^(get|list) /.test(k)) console.log(`    ${String(n).padStart(4)} × ${k}`);
  } finally {
    await local.close();
  }
}

async function live() {
  const r = await run(process.execPath, ["backend-live.mjs"], { cwd: path.join(root, "tests") });
  console.log(r.out.trimEnd());
  if (r.code !== 0) fail("live update test failed");
}

if (!part || part === "unit") await unit();
if (!part || part === "crawl") for (const role of arg ? [arg] : ["owner", "trade", "client"]) await crawl(role);
async function signin() {
  const r = await run(process.execPath, ["backend-signin.mjs"], { cwd: path.join(root, "tests") });
  const passed = (r.out.match(/✅/g) || []).length, bad = r.out.split("\n").filter((l) => l.startsWith("❌"));
  console.log(`sign-in screen: ${passed} passed, ${bad.length} failed`);
  if (verbose || r.code !== 0) console.log((verbose ? r.out.trimEnd() : bad.join("\n") || r.out.trimEnd()).split("\n").map((l) => "    " + l).join("\n"));
  if (r.code !== 0 || !passed) fail("sign-in screen test failed");
}

if (!part || part === "live") await live();
if (!part || part === "signin") await signin();
console.log(failed ? "backend tests: FAILED" : "backend tests: OK");
process.exit(failed ? 1 : 0);
