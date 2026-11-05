import { mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { buildSync } from "esbuild";

const done = new Map<string, string>();

/**
 * Bundle one Lambda handler (and whatever it imports) into a single ES module, and return the
 * directory holding it, ready for `lambda.Code.fromAsset`.
 *
 * Done here with esbuild rather than by CDK's NodejsFunction, which shells out to `npx esbuild`
 * from the repository root and falls back to Docker when it is not installed there. This way
 * the result depends only on infra/'s own dependencies, and the same source always gives the
 * same bundle – so a deploy with no code change does not touch the functions.
 *
 * The AWS SDK is left out: the Node 22 Lambda runtime provides it.
 */
export function bundleHandler(repoRoot: string, entry: string, name: string): string {
  const key = `${repoRoot}\n${entry}\n${name}`;
  const cached = done.get(key);
  if (cached) return cached;

  const outdir = join(repoRoot, "infra/.build", name);
  mkdirSync(outdir, { recursive: true });
  try {
    buildSync({
      entryPoints: [entry],
      outfile: join(outdir, "index.mjs"),
      absWorkingDir: repoRoot,
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      sourcemap: true,
      external: ["@aws-sdk/*", "@smithy/*"],
      // lets bundled CommonJS dependencies call require() inside an ES module
      banner: {
        js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);",
      },
      logLevel: "silent",
    });
  } catch (err) {
    throw new Error(
      `Could not bundle ${relative(repoRoot, entry)} for Lambda. If server/ has its own package.json, run "npm ci" in server/ first.\n${(err as Error).message}`,
    );
  }
  done.set(key, outdir);
  return outdir;
}
