import { App, type AppProps } from "aws-cdk-lib";
import { placeholdersIn, type EnvironmentConfig, type ProjectConfig } from "../config.ts";
import { BootstrapStack } from "./bootstrap-stack.ts";
import { EdgeStack } from "./edge-stack.ts";
import { Names } from "./naming.ts";
import { SiteHqStack } from "./sitehq-stack.ts";

export interface BuildOptions {
  config: ProjectConfig;
  /** Absolute path of the repository root. */
  repoRoot: string;
  /**
   * Set when really deploying (`cdk deploy -c deployEnv=dev`, read from the CDK context when not
   * given here): only that environment is built, it must have no placeholder settings left, and
   * its main stack refuses the placeholder Lambda handler unless its switches allow it. Unset
   * for `cdk synth` and the tests: every environment is built and placeholders are allowed.
   */
  deployEnv?: string;
  appProps?: AppProps;
}

export interface EnvironmentStacks {
  names: Names;
  bootstrap: BootstrapStack;
  edge: EdgeStack;
  main: SiteHqStack;
}

/** Things that would only fail later, at deploy time or in production, caught here instead. */
export function checkConfig(config: ProjectConfig): void {
  const envs = Object.values(config.environments);
  const fail = (msg: string) => {
    throw new Error(`infra/config.ts: ${msg}`);
  };
  const seen = new Set<string>();
  for (const e of envs) {
    const names = new Names(config, e);
    if (!/^[a-z][a-z0-9]{1,9}$/.test(e.envName)) fail(`envName "${e.envName}" must be short, lower-case letters/digits`);
    if (!/^\d{12}$/.test(e.account)) fail(`${e.envName}: account "${e.account}" is not a 12-digit AWS account id`);
    if (seen.has(e.envName)) fail(`two environments are called "${e.envName}"`);
    seen.add(e.envName);
    if (names.siteDomain !== e.hostedZoneName && !names.siteDomain.endsWith(`.${e.hostedZoneName}`))
      fail(`${e.envName}: ${names.siteDomain} is not inside the hosted zone ${e.hostedZoneName}`);
    for (const other of envs) {
      if (other === e) continue;
      if (new Names(config, other).siteDomain === names.siteDomain)
        fail(`${e.envName} and ${other.envName} have the same address ${names.siteDomain}`);
      if (other.account === e.account && other.githubOidcProvider === "create" && e.githubOidcProvider === "create")
        fail(
          `${e.envName} and ${other.envName} share account ${e.account} and both say githubOidcProvider: "create"; an account can have only one`,
        );
    }
  }
}

/** Refuse to deploy an environment whose settings are still placeholders. */
function checkDeployable(e: EnvironmentConfig): void {
  const left = placeholdersIn(e);
  if (left.length)
    throw new Error(`Cannot deploy ${e.envName}: placeholder values remain for ${left.join(", ")}. See infra/README.md.`);
}

export function buildApp(options: BuildOptions): { app: App; environments: Record<string, EnvironmentStacks> } {
  const { config, repoRoot } = options;
  checkConfig(config);
  const app = new App(options.appProps);
  // The deploy workflows pass `-c deployEnv=dev|prod` on the command line.
  const deployEnv = options.deployEnv ?? (app.node.tryGetContext("deployEnv") as string | undefined);
  if (deployEnv && !config.environments[deployEnv])
    throw new Error(`deployEnv "${deployEnv}" is not one of: ${Object.keys(config.environments).join(", ")}`);
  const environments: Record<string, EnvironmentStacks> = {};
  for (const [key, e] of Object.entries(config.environments)) {
    if (deployEnv) {
      if (key !== deployEnv) continue;
      checkDeployable(e);
    }
    const names = new Names(config, e);
    const common = { environment: e, names, tags: names.tags };

    const bootstrap = new BootstrapStack(app, names.stackNames.bootstrap, {
      ...common,
      project: config,
      env: { account: e.account, region: e.region },
      description: `SiteHQ ${e.envName}: GitHub deploy role and sign-in email identity (deployed by hand, once)`,
    });
    const edge = new EdgeStack(app, names.stackNames.edge, {
      ...common,
      env: { account: e.account, region: "us-east-1" },
      crossRegionReferences: true,
      description: `SiteHQ ${e.envName}: CloudFront certificate (must be in us-east-1)`,
    });
    const main = new SiteHqStack(app, names.stackNames.main, {
      ...common,
      project: config,
      certificate: edge.certificate,
      repoRoot,
      deploying: !!deployEnv,
      env: { account: e.account, region: e.region },
      crossRegionReferences: true,
      description: `SiteHQ ${e.envName}: data, files, API, live updates, sign-in, site`,
    });
    environments[key] = { names, bootstrap, edge, main };
  }
  return { app, environments };
}
