// The release workflows' promises, checked on the files themselves (actionlint checks their
// syntax separately: `npm run lint:workflows`).
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const github = resolve(dirname(fileURLToPath(import.meta.url)), "../../.github");
const text = (path: string) => readFileSync(join(github, path), "utf8");
const yaml = (path: string) => parse(text(path)) as Record<string, any>;

const workflowFiles = readdirSync(join(github, "workflows")).filter((f) => f.endsWith(".yml"));
const everything = [...workflowFiles.map((f) => `workflows/${f}`), "actions/deploy/action.yml"];
const ci = yaml("workflows/ci.yml");
const promote = yaml("workflows/promote.yml");
const deployAction = yaml("actions/deploy/action.yml");
const runScripts = (steps: any[]) => steps.map((s) => s.run ?? "").join("\n");

test("AWS is reached only through short-lived roles: no stored keys anywhere", () => {
  for (const file of everything) {
    const body = text(file);
    assert.doesNotMatch(body, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|aws-access-key-id|aws-secret-access-key/, file);
    assert.doesNotMatch(body, /secrets\.AWS/, file);
  }
  const signIn = deployAction.runs.steps.find((s: any) => String(s.uses).startsWith("aws-actions/configure-aws-credentials@"));
  assert.equal(signIn.with["role-to-assume"], "${{ inputs.role-arn }}");
});

test("only the two deploy jobs can ask for an AWS role; everything else is read-only", () => {
  const holders: string[] = [];
  for (const file of workflowFiles) {
    const wf = yaml(`workflows/${file}`);
    assert.notEqual(wf.permissions, undefined, `${file} sets default permissions`);
    assert.ok(!JSON.stringify(wf.permissions).includes("write"), `${file}: no write permission by default`);
    for (const [id, job] of Object.entries<any>(wf.jobs)) {
      if (job.permissions?.["id-token"] === "write") holders.push(`${file}:${id}`);
    }
  }
  assert.deepEqual(holders.sort(), ["ci.yml:deploy-dev", "promote.yml:deploy"]);
});

test("ci: the existing tests and the infrastructure checks run on pushes and pull requests", () => {
  assert.ok("push" in ci.on && "pull_request" in ci.on);
  const testSteps = runScripts(ci.jobs.test.steps);
  for (const cmd of ["npm run vendor", "npm test", "node mock_test.js"]) assert.ok(testSteps.includes(cmd), cmd);
  assert.ok(runScripts(ci.jobs.infra.steps).includes("npm run test:infra"));
});

test("ci: dev is deployed only from a push to main, after the tests and infra checks pass", () => {
  const job = ci.jobs["deploy-dev"];
  assert.deepEqual([...job.needs].sort(), ["infra", "test"]);
  assert.match(job.if, /github\.event_name == 'push'/);
  assert.match(job.if, /github\.ref == 'refs\/heads\/main'/);
  assert.equal(job.environment, undefined, "no GitHub Environment: the dev role trusts the main branch itself");
  const deploy = job.steps.at(-1);
  assert.equal(deploy.uses, "./.github/actions/deploy");
  assert.equal(deploy.with.environment, "dev");
  assert.equal(deploy.with["role-arn"], "${{ vars.AWS_ROLE_ARN_DEV }}");
});

test("promote: run by hand, checks CI, then deploys prod through the production environment", () => {
  assert.deepEqual(Object.keys(promote.on), ["workflow_dispatch"]);
  assert.equal(promote.on.workflow_dispatch.inputs.commit.required, false);
  assert.equal(promote.concurrency["cancel-in-progress"], false);

  const check = runScripts(promote.jobs.check.steps);
  assert.match(check, /merge-base --is-ancestor "\$sha" origin\/main/, "the commit must be on main");
  assert.match(check, /gh run list .*--workflow ci\.yml --commit "\$sha"[\s\S]*--status success/, "and have passed ci");
  assert.equal(promote.jobs.check.environment, undefined);
  assert.equal(promote.jobs.check.permissions["id-token"], undefined);

  const deploy = promote.jobs.deploy;
  assert.equal(deploy.needs, "check");
  assert.equal(deploy.environment.name, "production");
  const last = deploy.steps.at(-1);
  assert.equal(last.uses, "./.github/actions/deploy");
  assert.equal(last.with.environment, "prod");
  assert.equal(last.with["role-arn"], "${{ vars.AWS_ROLE_ARN_PROD }}");
  // what is deployed is the checked commit, not whatever main is by the time it is approved
  const checkout = deploy.steps.find((s: any) => String(s.uses).startsWith("actions/checkout@"));
  assert.equal(checkout.with.ref, "${{ needs.check.outputs.sha }}");
});

test("promote: the production branch is only ever fast-forwarded", () => {
  const pushes = everything.flatMap((file) =>
    text(file)
      .split("\n")
      .filter((line) => /\bgit push\b/.test(line) && !line.trim().startsWith("#"))
      .map((line) => ({ file, line: line.trim() })),
  );
  assert.deepEqual(pushes, [{ file: "workflows/promote.yml", line: 'git push origin "$SHA:refs/heads/production"' }]);
  for (const file of everything) assert.doesNotMatch(text(file), /--force|force-with-lease|push\s+-f\b|\+refs\/heads/, file);
  // … and only when the commit is ahead of the branch; a rollback leaves it alone
  const push = promote.jobs.deploy.steps.find((s: any) => String(s.run).includes("git push"));
  assert.match(push.if, /'first'/);
  assert.match(push.if, /'forward'/);
  assert.doesNotMatch(push.if, /rollback|redeploy/);
});

test("deploy action: CDK deploy of one environment, then the page, then CloudFront", () => {
  const steps: any[] = deployAction.runs.steps;
  const order = ["npm run build", "cdk deploy", "aws s3 cp", "create-invalidation"].map((needle) =>
    steps.findIndex((s) => String(s.run).includes(needle)),
  );
  assert.ok(order.every((i) => i >= 0), "all four steps exist");
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "in that order");
  const cdk = steps[order[1]].run;
  assert.match(cdk, /--context "deployEnv=\$DEPLOY_ENV"/, "placeholders and missing server code are refused");
  assert.match(cdk, /--require-approval never/);
  assert.doesNotMatch(cdk, /bootstrap/, "the bootstrap stack is never deployed from a workflow");
});

test("CODEOWNERS: Jasper reviews rules, infrastructure, server, scripts and workflows – not feature code", () => {
  const lines = text("CODEOWNERS")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.trim().split(/\s+/));
  const paths = lines.map(([path]) => path);
  assert.deepEqual(paths.sort(), ["/.github/", "/infra/", "/platform/capabilities.json", "/scripts/", "/server/"]);
  for (const [path, ...owners] of lines) assert.equal(owners.length, 1, `${path} has one owner`);
  assert.equal(new Set(lines.map(([, owner]) => owner)).size, 1, "the same owner on every line");
  assert.ok(!paths.some((p) => p.startsWith("/src") || p === "*"), "src/app and src/styles need green CI only");
});
