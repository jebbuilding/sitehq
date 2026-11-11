/**
 * SiteHQ infrastructure configuration: the ONE place that says how the environments differ.
 *
 * The stacks in lib/ read everything from here; nothing about an environment is written in them.
 *
 * The values that are not known yet (AWS account ids, the domain, the hosted zone) are the
 * PLACEHOLDERS below. Each can be supplied without editing this file by setting the environment
 * variable named next to it; the GitHub workflows set those from repository variables
 * (infra/README.md › GitHub variables). A value set in the environment wins over this file.
 */

/** Obvious stand-ins, so that `cdk synth` and the tests run before the real values exist. */
export const PLACEHOLDERS = {
  /** env SITEHQ_DOMAIN – the domain the app lives under, e.g. "jebbuilding.example". */
  domain: "example.com",
  /** env SITEHQ_DEV_ACCOUNT – 12-digit AWS account id for dev. */
  devAccount: "111111111111",
  /** env SITEHQ_PROD_ACCOUNT – 12-digit AWS account id for prod (may equal dev's: one account). */
  prodAccount: "222222222222",
  /** env SITEHQ_DEV_HOSTED_ZONE_ID / SITEHQ_PROD_HOSTED_ZONE_ID – Route 53 hosted zone id. */
  hostedZoneId: "Z0000000PLACEHOLDER",
} as const;

/** Settings that differ between a throwaway environment and one holding real personal data. */
export interface ProductionSwitches {
  /** DynamoDB point-in-time recovery on the data table (restore to any second in the last 35 days). */
  pointInTimeRecovery: boolean;
  /** Refuse to delete the tables and the user pool until this is switched off again. */
  deletionProtection: boolean;
  /** Keep earlier versions of uploaded files (deleted or overwritten) for `noncurrentVersionDays`. */
  bucketVersioning: boolean;
  /** How long an overwritten or deleted file version is kept before S3 removes it for good. */
  noncurrentVersionDays: number;
  /** Keep the data table, files bucket, user pool, key and logs if the stack is deleted. */
  retainData: boolean;
  /**
   * Origins allowed to call the API and upload files, in addition to the environment's own
   * address. Empty = stricter CORS: only the site itself.
   */
  extraCorsOrigins: string[];
  /** Days CloudWatch keeps the Lambda and API logs (one of the periods CloudWatch offers: 7, 14, 30, 90, 365 …). */
  logRetentionDays: number;
  /**
   * May a deploy go ahead with the placeholder Lambda handler because server/ is missing?
   * (`cdk synth` always may; this is checked only when deploying, see lib/sitehq-stack.ts.)
   */
  allowPlaceholderHandlers: boolean;
  /** Sign-in session lengths. */
  accessTokenMinutes: number;
  refreshTokenDays: number;
  /**
   * API throttle: steady requests per second, and how many may arrive at once. A ceiling on
   * runaway cost. One page start-up makes ~40 requests at once (one per live subscription),
   * so the burst must cover several people opening the app in the same second.
   */
  apiRateLimit: number;
  apiBurstLimit: number;
}

export interface EnvironmentConfig {
  /** "dev" or "prod": goes into every resource name (sitehq-<envName>-…) and the `env` tag. */
  envName: string;
  /** AWS account id. dev and prod may share one or have one each; nothing else changes. */
  account: string;
  /** Where everything lives (the CloudFront certificate alone must be in us-east-1). */
  region: string;
  /** The domain, e.g. example.com. */
  domain: string;
  /** This environment's subdomain: the app is served at <subdomain>.<domain>. */
  subdomain: string;
  /**
   * The Route 53 hosted zone that the DNS records go into. It must be in this environment's
   * AWS account and contain <subdomain>.<domain>: either the zone for <domain> itself (one
   * account) or a zone delegated for <subdomain>.<domain> (two accounts; README › Hosted zone).
   */
  hostedZoneId: string;
  hostedZoneName: string;
  /**
   * The GitHub sign-in provider can exist only once per AWS account. "create" = the bootstrap
   * stack of this environment creates it; "existing" = the account already has one (from another
   * project, or from the other environment's bootstrap stack when both share an account).
   */
  githubOidcProvider: "create" | "existing";
  /**
   * What GitHub must present to take this environment's deploy role (the `sub` of its token):
   * a branch for dev, a GitHub Environment for prod.
   */
  githubSubject: string;
  switches: ProductionSwitches;
}

export interface ProjectConfig {
  /** Goes into every resource name and the `project` tag. */
  project: string;
  /** owner/name of the GitHub repository allowed to deploy. */
  githubRepo: string;
  /** GitHub's numeric ids for the owner and the repository: GitHub also sends the token subject as
   *  repo:<owner>@<owner id>/<repo>@<repo id>:…, so the deploy roles accept that exact form too. `gh api repos/<owner>/<repo>` shows them. */
  githubRepoIds: { owner: number; repo: number };
  /**
   * Where the Lambda code comes from, relative to the repository root. If a file does not
   * exist yet, the stack deploys infra/placeholder/handler.mjs instead and says so.
   */
  server: {
    httpEntry: string;
    wsEntry: string;
    handlerExport: string;
    /** Uploaded files are stored in the files bucket under this prefix (ASSETS_PREFIX). */
    assetsPrefix: string;
  };
  /** Paths on the site's address that go to the HTTP API; everything else is the page. */
  apiPath: string; // documents, uploads, who-am-I
  blobPath: string; // uploaded files: /_blob/<id>. The API checks the sign-in, then serves the file
  environments: Record<string, EnvironmentConfig>;
}

const env = (name: string, fallback: string): string => process.env[name]?.trim() || fallback;

const REGION = "eu-west-2"; // London (docs/ROADMAP.md › GDPR decision 5)
const GITHUB_REPO = "jebbuilding/sitehq";
const DOMAIN = env("SITEHQ_DOMAIN", PLACEHOLDERS.domain);
const DEV_ACCOUNT = env("SITEHQ_DEV_ACCOUNT", PLACEHOLDERS.devAccount);
const PROD_ACCOUNT = env("SITEHQ_PROD_ACCOUNT", PLACEHOLDERS.prodAccount);

export const config: ProjectConfig = {
  project: "sitehq",
  githubRepo: GITHUB_REPO,
  githubRepoIds: { owner: 352964822, repo: 1447190975 },
  server: {
    httpEntry: "server/handlers/http.mjs",
    wsEntry: "server/handlers/ws.mjs",
    handlerExport: "handler",
    assetsPrefix: "assets/",
  },
  apiPath: "/api",
  blobPath: "/_blob",
  environments: {
    dev: {
      envName: "dev",
      account: DEV_ACCOUNT,
      region: REGION,
      domain: DOMAIN,
      subdomain: "sitehq", // the first, temporary site: sitehq.jevul.com in Jasper's account, synthetic data only
      hostedZoneId: env("SITEHQ_DEV_HOSTED_ZONE_ID", PLACEHOLDERS.hostedZoneId),
      hostedZoneName: env("SITEHQ_DEV_HOSTED_ZONE_NAME", DOMAIN),
      githubOidcProvider: "create",
      githubSubject: `repo:${GITHUB_REPO}:ref:refs/heads/main`,
      switches: {
        pointInTimeRecovery: false,
        deletionProtection: false,
        bucketVersioning: false,
        noncurrentVersionDays: 30,
        retainData: false,
        extraCorsOrigins: ["http://localhost:4321"], // `npm run dev` against the dev backend
        logRetentionDays: 14,
        allowPlaceholderHandlers: true,
        accessTokenMinutes: 60,
        refreshTokenDays: 30,
        apiRateLimit: 100,
        apiBurstLimit: 500,
      },
    },
    prod: {
      envName: "prod",
      account: PROD_ACCOUNT,
      region: REGION,
      domain: DOMAIN,
      subdomain: "app",
      hostedZoneId: env("SITEHQ_PROD_HOSTED_ZONE_ID", PLACEHOLDERS.hostedZoneId),
      hostedZoneName: env("SITEHQ_PROD_HOSTED_ZONE_NAME", DOMAIN),
      // One GitHub provider per account: if prod shares dev's account, dev's stack has made it.
      githubOidcProvider: PROD_ACCOUNT === DEV_ACCOUNT ? "existing" : "create",
      githubSubject: `repo:${GITHUB_REPO}:environment:production`,
      switches: {
        pointInTimeRecovery: true,
        deletionProtection: true,
        bucketVersioning: true,
        noncurrentVersionDays: 30,
        retainData: true,
        extraCorsOrigins: [],
        logRetentionDays: 90,
        allowPlaceholderHandlers: false,
        accessTokenMinutes: 60,
        refreshTokenDays: 30,
        apiRateLimit: 100,
        apiBurstLimit: 500,
      },
    },
  },
};

/** The placeholders still present in one environment's settings (empty = ready to deploy). */
export function placeholdersIn(e: EnvironmentConfig): string[] {
  const found: string[] = [];
  if (e.domain === PLACEHOLDERS.domain) found.push("domain (SITEHQ_DOMAIN)");
  if (e.account === PLACEHOLDERS.devAccount || e.account === PLACEHOLDERS.prodAccount)
    found.push(`account (SITEHQ_${e.envName.toUpperCase()}_ACCOUNT)`);
  if (e.hostedZoneId === PLACEHOLDERS.hostedZoneId)
    found.push(`hostedZoneId (SITEHQ_${e.envName.toUpperCase()}_HOSTED_ZONE_ID)`);
  return found;
}
