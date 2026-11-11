// What the stacks promise, checked on the synthesised templates. No AWS access is needed.
// Run with `npm test` in infra/ (or `npm run test:infra` at the repository root).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Template } from "aws-cdk-lib/assertions";
import { config, placeholdersIn, type ProjectConfig } from "../config.ts";
import { buildApp, checkConfig } from "../lib/app.ts";
import { PLACEHOLDER_NOTE } from "../lib/sitehq-stack.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

type Json = Record<string, any>;

// Synthesise with the feature flags from cdk.json, as the CDK command line does.
const context = JSON.parse(readFileSync(resolve(repoRoot, "infra/cdk.json"), "utf8")).context;
const build = (cfg: ProjectConfig = config, root = repoRoot, deployEnv?: string) =>
  buildApp({ config: cfg, repoRoot: root, deployEnv, appProps: { context } });
interface Synthesised {
  bootstrap: Json;
  edge: Json;
  main: Json;
  all: Json[];
  site: string;
  ws: string;
  prefix: string;
}

function synth(cfg: ProjectConfig, root = repoRoot, deployEnv?: string): Record<string, Synthesised> {
  const { environments } = build(cfg, root, deployEnv);
  const out: Record<string, Synthesised> = {};
  for (const [name, s] of Object.entries(environments)) {
    const bootstrap = Template.fromStack(s.bootstrap).toJSON();
    const edge = Template.fromStack(s.edge).toJSON();
    const main = Template.fromStack(s.main).toJSON();
    out[name] = {
      bootstrap,
      edge,
      main,
      all: [bootstrap, edge, main],
      site: s.names.siteDomain,
      ws: s.names.wsDomain,
      prefix: s.names.prefix,
    };
  }
  return out;
}

const resources = (t: Json, type?: string): [string, Json][] =>
  Object.entries(t.Resources as Json).filter(([, r]) => !type || r.Type === type) as [string, Json][];
const only = (t: Json, type: string): Json => {
  const found = resources(t, type);
  assert.equal(found.length, 1, `expected exactly one ${type}`);
  return found[0][1];
};
const byName = (t: Json, type: string, key: string, value: string): Json => {
  const hit = resources(t, type).find(([, r]) => r.Properties?.[key] === value);
  assert.ok(hit, `no ${type} with ${key}=${value}`);
  return hit[1];
};
const tagsOf = (r: Json): Record<string, string> => {
  const raw = r.Properties?.Tags ?? r.Properties?.UserPoolTags;
  if (!raw) return {};
  return Array.isArray(raw) ? Object.fromEntries(raw.map((t: Json) => [t.Key, t.Value])) : raw;
};

// The committed configuration: dev and prod in two (placeholder) accounts.
const two = synth(config);
// The same configuration with both environments in ONE account – only the config changes.
const oneAccountConfig: ProjectConfig = structuredClone(config);
oneAccountConfig.environments.prod.account = oneAccountConfig.environments.dev.account;
oneAccountConfig.environments.prod.githubOidcProvider = "existing";
const one = synth(oneAccountConfig);

// ---------------------------------------------------------------------------------------------
// 1. Names
// ---------------------------------------------------------------------------------------------

/** Every property that sets a physical name, by resource type. */
const NAMED: Record<string, string[]> = {
  "AWS::DynamoDB::Table": ["TableName"],
  "AWS::S3::Bucket": ["BucketName"],
  "AWS::KMS::Alias": ["AliasName"],
  "AWS::Cognito::UserPool": ["UserPoolName"],
  "AWS::Cognito::UserPoolClient": ["ClientName"],
  "AWS::Logs::LogGroup": ["LogGroupName"],
  "AWS::ApiGatewayV2::Api": ["Name"],
  "AWS::ApiGatewayV2::Authorizer": ["Name"],
  "AWS::ApiGatewayV2::DomainName": ["DomainName"],
  "AWS::CloudFront::OriginAccessControl": ["OriginAccessControlConfig.Name"],
  "AWS::CertificateManager::Certificate": ["DomainName"],
  "AWS::SES::EmailIdentity": ["EmailIdentity"],
};
/** Helpers that CDK adds itself (emptying dev buckets); CloudFormation names them after the stack. */
const isCdkHelper = (id: string) => id.startsWith("Custom");

function physicalNames(env: Synthesised): string[] {
  const names: string[] = [];
  for (const t of env.all) {
    for (const [id, r] of resources(t)) {
      if (isCdkHelper(id)) continue;
      const props = [...(NAMED[r.Type] ?? [])];
      if (r.Type === "AWS::Lambda::Function") props.push("FunctionName");
      if (r.Type === "AWS::IAM::Role") props.push("RoleName");
      for (const path of props) {
        const value = path.split(".").reduce((o: any, k) => o?.[k], r.Properties);
        assert.equal(typeof value, "string", `${r.Type} ${id} must have a literal ${path}`);
        names.push(value);
      }
    }
    // DNS records
    for (const [, r] of resources(t, "AWS::Route53::RecordSet"))
      if (typeof r.Properties.Name === "string") names.push(r.Properties.Name);
  }
  return names;
}

for (const [label, envs] of [
  ["two accounts", two],
  ["one account", one],
] as const) {
  test(`names: every named resource carries its environment (${label})`, () => {
    for (const [envName, env] of Object.entries(envs)) {
      const names = physicalNames(env);
      assert.ok(names.length >= 20, "expected the stacks to name their resources");
      for (const n of names) {
        const carriesPrefix = n.includes(`sitehq-${envName}-`);
        const isAddress = n === env.site || n.endsWith(`.${env.site}`) || n.endsWith(`.${env.site}.`) || n === `${env.site}.`;
        assert.ok(carriesPrefix || isAddress, `${envName}: "${n}" does not carry the environment`);
      }
    }
  });

  test(`names: dev and prod share no physical name and no stack name (${label})`, () => {
    const dev = new Set(physicalNames(envs.dev));
    const shared = physicalNames(envs.prod).filter((n) => dev.has(n));
    assert.deepEqual(shared, []);
  });
}

test("names: stacks are sitehq-<env>, sitehq-<env>-edge, sitehq-<env>-bootstrap", () => {
  const { environments } = build();
  const names = Object.values(environments).flatMap((s) => [s.main, s.edge, s.bootstrap].map((x) => x.stackName));
  assert.deepEqual(names.sort(), [
    "sitehq-dev",
    "sitehq-dev-bootstrap",
    "sitehq-dev-edge",
    "sitehq-prod",
    "sitehq-prod-bootstrap",
    "sitehq-prod-edge",
  ]);
});

// ---------------------------------------------------------------------------------------------
// 2. Tags
// ---------------------------------------------------------------------------------------------

const MUST_BE_TAGGED = [
  "AWS::DynamoDB::Table",
  "AWS::S3::Bucket",
  "AWS::Lambda::Function",
  "AWS::IAM::Role",
  "AWS::Logs::LogGroup",
  "AWS::KMS::Key",
  "AWS::Cognito::UserPool",
  "AWS::ApiGatewayV2::Api",
  "AWS::ApiGatewayV2::Stage",
  "AWS::ApiGatewayV2::DomainName",
  "AWS::CloudFront::Distribution",
  "AWS::CertificateManager::Certificate",
  "AWS::IAM::OIDCProvider",
  "AWS::SES::EmailIdentity",
];

test("tags: project=sitehq and env=<env> on the stacks and on every taggable resource", () => {
  const { environments } = build();
  for (const [envName, s] of Object.entries(environments)) {
    for (const stack of [s.main, s.edge, s.bootstrap]) {
      assert.deepEqual(stack.tags.tagValues(), { project: "sitehq", env: envName }, `${stack.stackName} stack tags`);
      const t = Template.fromStack(stack).toJSON();
      let checked = 0;
      for (const [id, r] of resources(t)) {
        // (CloudFormation itself puts the stack's tags on CDK's helper resources when it creates them)
        if (!MUST_BE_TAGGED.includes(r.Type) || isCdkHelper(id)) continue;
        const tags = tagsOf(r);
        assert.equal(tags.project, "sitehq", `${stack.stackName}/${id} project tag`);
        assert.equal(tags.env, envName, `${stack.stackName}/${id} env tag`);
        checked++;
      }
      assert.ok(checked > 0, `${stack.stackName}: nothing was checked`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// 3. Subdomains, certificates, DNS
// ---------------------------------------------------------------------------------------------

test("subdomains: each environment on its own configured subdomain, with its own certificates and DNS records", () => {
  assert.equal(two.dev.site, `${config.environments.dev.subdomain}.${config.environments.dev.domain}`);
  assert.equal(two.prod.site, `${config.environments.prod.subdomain}.${config.environments.prod.domain}`);
  for (const env of Object.values(two)) {
    const dist = only(env.main, "AWS::CloudFront::Distribution").Properties.DistributionConfig;
    assert.deepEqual(dist.Aliases, [env.site]);

    // the site: A and AAAA records pointing at the distribution
    const records = resources(env.main, "AWS::Route53::RecordSet").map(([, r]) => r.Properties);
    const site = records.filter((r) => r.Name === `${env.site}.`);
    assert.deepEqual(site.map((r) => r.Type).sort(), ["A", "AAAA"]);
    for (const r of site) assert.ok(r.AliasTarget, "site records are aliases to CloudFront");

    // live updates: ws.<site>, its own certificate, a record pointing at the API's domain
    assert.equal(only(env.main, "AWS::ApiGatewayV2::DomainName").Properties.DomainName, env.ws);
    assert.equal(only(env.main, "AWS::CertificateManager::Certificate").Properties.DomainName, env.ws);
    assert.equal(records.filter((r) => r.Name === `${env.ws}.` && r.Type === "A").length, 1);

    // every certificate is validated through DNS by CloudFormation itself
    for (const t of [env.edge, env.main])
      for (const [, c] of resources(t, "AWS::CertificateManager::Certificate")) {
        assert.equal(c.Properties.ValidationMethod, "DNS");
        assert.ok(c.Properties.DomainValidationOptions[0].HostedZoneId);
      }
  }
});

test("CloudFront's certificate is created in us-east-1 and used by the London stack", () => {
  const { environments } = build();
  for (const [envName, s] of Object.entries(environments)) {
    assert.equal(s.edge.region, "us-east-1");
    assert.equal(s.main.region, "eu-west-2");
    assert.equal(s.bootstrap.region, "eu-west-2");
    const cert = only(two[envName].edge, "AWS::CertificateManager::Certificate");
    assert.equal(cert.Properties.DomainName, two[envName].site);
    const viewer = only(two[envName].main, "AWS::CloudFront::Distribution").Properties.DistributionConfig.ViewerCertificate;
    assert.match(JSON.stringify(viewer.AcmCertificateArn), new RegExp(`sitehq-${envName}-edge`));
    assert.match(JSON.stringify(viewer.AcmCertificateArn), /us-east-1/);
    assert.equal(viewer.MinimumProtocolVersion, "TLSv1.2_2021");
  }
});

// ---------------------------------------------------------------------------------------------
// 4. Routing
// ---------------------------------------------------------------------------------------------

test("CloudFront: default → page bucket; /api/* and /_blob/* → HTTP API, uncached; HTTPS only", () => {
  for (const env of Object.values(two)) {
    const dist = only(env.main, "AWS::CloudFront::Distribution").Properties.DistributionConfig;
    const origin = (id: string) => dist.Origins.find((o: Json) => o.Id === id);

    const page = origin(dist.DefaultCacheBehavior.TargetOriginId);
    const pageBucket = env.main.Resources[page.DomainName["Fn::GetAtt"][0]].Properties.BucketName;
    assert.match(pageBucket, /-page-/);
    assert.ok(page.OriginAccessControlId, "page bucket is read through origin access control");
    assert.equal(dist.DefaultRootObject, "index.html");

    const behaviours = Object.fromEntries(dist.CacheBehaviors.map((b: Json) => [b.PathPattern, b]));
    assert.deepEqual(Object.keys(behaviours).sort(), ["/_blob/*", "/api/*"]);
    const CACHING_DISABLED = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"; // AWS's managed policy id
    for (const path of ["/api/*", "/_blob/*"]) {
      const api = origin(behaviours[path].TargetOriginId);
      assert.match(JSON.stringify(api.DomainName), /execute-api\.eu-west-2\.amazonaws\.com/);
      assert.equal(api.CustomOriginConfig.OriginProtocolPolicy, "https-only");
      assert.equal(behaviours[path].CachePolicyId, CACHING_DISABLED, `${path} is never cached by CloudFront`);
      assert.equal(behaviours[path].ViewerProtocolPolicy, "https-only");
    }
    assert.equal(behaviours["/api/*"].AllowedMethods.length, 7, "all methods reach the API");
    assert.deepEqual(behaviours["/_blob/*"].AllowedMethods.sort(), ["GET", "HEAD"]);

    // the files bucket is not an origin: uploaded files are never served without the API's check
    assert.equal(dist.Origins.length, 2);
    assert.ok(!JSON.stringify(dist.Origins).includes("FilesBucket"));
    assert.equal(dist.DefaultCacheBehavior.ViewerProtocolPolicy, "redirect-to-https");
  }
});

test("HTTP API: /api/* and /_blob/* go to the HTTP function; the WebSocket routes to the other", () => {
  for (const env of Object.values(two)) {
    const routes = Object.fromEntries(
      resources(env.main, "AWS::ApiGatewayV2::Route").map(([, r]) => [r.Properties.RouteKey, r.Properties]),
    );
    assert.deepEqual(Object.keys(routes).sort(), [
      "$connect",
      "$default",
      "$disconnect",
      "ANY /_blob/{proxy+}",
      "ANY /api/{proxy+}",
    ]);
    const fnOf = (route: Json) => {
      const integration = env.main.Resources[route.Target["Fn::Join"][1][1].Ref];
      return JSON.stringify(integration.Properties.IntegrationUri);
    };
    for (const key of ["ANY /api/{proxy+}", "ANY /_blob/{proxy+}"]) assert.match(fnOf(routes[key]), /HttpFunction/);
    for (const key of ["$connect", "$disconnect", "$default"]) assert.match(fnOf(routes[key]), /WsFunction/);
    const stage = byName(env.main, "AWS::ApiGatewayV2::Stage", "StageName", "$default").Properties;
    assert.ok(stage.DefaultRouteSettings.ThrottlingRateLimit > 0, "the API is throttled");
    assert.ok(stage.AccessLogSettings.DestinationArn, "the API keeps an access log");
  }
});

// ---------------------------------------------------------------------------------------------
// 5. Production switches
// ---------------------------------------------------------------------------------------------

test("production switches: recovery, deletion protection, versioning, retention, strict CORS", () => {
  const data = (env: Synthesised) => byName(env.main, "AWS::DynamoDB::Table", "TableName", `${env.prefix}-data`);
  const conns = (env: Synthesised) => byName(env.main, "AWS::DynamoDB::Table", "TableName", `${env.prefix}-connections`);
  const files = (env: Synthesised) =>
    resources(env.main, "AWS::S3::Bucket").find(([, r]) => r.Properties.BucketName.includes("-files-"))![1];
  const { dev, prod } = two;

  // point-in-time recovery
  assert.equal(data(prod).Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled, true);
  assert.equal(data(dev).Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled, false);

  // deletion protection: both tables and the user pool
  assert.equal(data(prod).Properties.DeletionProtectionEnabled, true);
  assert.equal(conns(prod).Properties.DeletionProtectionEnabled, true);
  assert.equal(data(dev).Properties.DeletionProtectionEnabled, false);
  assert.equal(only(prod.main, "AWS::Cognito::UserPool").Properties.DeletionProtection, "ACTIVE");
  assert.equal(only(dev.main, "AWS::Cognito::UserPool").Properties.DeletionProtection, "INACTIVE");

  // versioning of uploaded files, with old versions expiring
  assert.equal(files(prod).Properties.VersioningConfiguration.Status, "Enabled");
  assert.equal(files(dev).Properties.VersioningConfiguration, undefined);
  const rule = files(prod).Properties.LifecycleConfiguration.Rules[0];
  assert.equal(rule.NoncurrentVersionExpiration.NoncurrentDays, config.environments.prod.switches.noncurrentVersionDays);

  // data resources survive deletion of the prod stack, and go with the dev stack
  const dataResources = (env: Synthesised) => [
    data(env),
    files(env),
    only(env.main, "AWS::Cognito::UserPool"),
    only(env.main, "AWS::KMS::Key"),
    ...resources(env.main, "AWS::Logs::LogGroup").map(([, r]) => r),
  ];
  for (const r of dataResources(prod)) {
    assert.equal(r.DeletionPolicy, "Retain", `${r.Type} in prod`);
    assert.equal(r.UpdateReplacePolicy, "Retain", `${r.Type} in prod`);
  }
  for (const r of dataResources(dev)) assert.equal(r.DeletionPolicy, "Delete", `${r.Type} in dev`);
  // nothing that empties buckets exists in prod
  assert.equal(resources(prod.main, "Custom::S3AutoDeleteObjects").length, 0);

  // CORS: prod allows its own address only; dev also the local dev server
  const apiCors = (env: Synthesised) =>
    byName(env.main, "AWS::ApiGatewayV2::Api", "Name", `${env.prefix}-http`).Properties.CorsConfiguration.AllowOrigins;
  const bucketCors = (env: Synthesised) => files(env).Properties.CorsConfiguration.CorsRules[0].AllowedOrigins;
  assert.deepEqual(apiCors(prod), [`https://${prod.site}`]);
  assert.deepEqual(bucketCors(prod), [`https://${prod.site}`]);
  assert.deepEqual(apiCors(dev), [`https://${dev.site}`, "http://localhost:4321"]);
  for (const env of [dev, prod]) assert.ok(!JSON.stringify([apiCors(env), bucketCors(env)]).includes("*"));

  // logs are kept for a set time, longer in prod
  for (const [, g] of resources(prod.main, "AWS::Logs::LogGroup")) assert.equal(g.Properties.RetentionInDays, 90);
  for (const [, g] of resources(dev.main, "AWS::Logs::LogGroup")) assert.equal(g.Properties.RetentionInDays, 14);
});

// ---------------------------------------------------------------------------------------------
// 6. Buckets
// ---------------------------------------------------------------------------------------------

test("buckets: private, encrypted, TLS only; only the page bucket is readable, by its own distribution", () => {
  for (const env of Object.values(two)) {
    const buckets = resources(env.main, "AWS::S3::Bucket");
    assert.equal(buckets.length, 2);
    for (const [id, b] of buckets) {
      assert.deepEqual(
        b.Properties.PublicAccessBlockConfiguration,
        { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
        `${id} blocks all public access`,
      );
      const enc = b.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0];
      assert.equal(enc.ServerSideEncryptionByDefault.SSEAlgorithm, "AES256");
      assert.equal(b.Properties.OwnershipControls.Rules[0].ObjectOwnership, "BucketOwnerEnforced");
      assert.equal(b.Properties.AccessControl, undefined, "no ACLs");
      assert.equal(b.Properties.WebsiteConfiguration, undefined, "no public website hosting");
    }
    const policies = resources(env.main, "AWS::S3::BucketPolicy");
    assert.equal(policies.length, 2);
    for (const [, p] of policies) {
      const statements: Json[] = p.Properties.PolicyDocument.Statement;
      const isFiles = env.main.Resources[p.Properties.Bucket.Ref].Properties.BucketName.includes("-files-");
      // (in dev, CDK's helper that empties the buckets on deletion is also let in, by role)
      const allows = statements.filter((s) => s.Effect === "Allow" && !JSON.stringify(s.Principal).includes("CustomS3AutoDelete"));
      for (const s of allows) {
        assert.ok(!JSON.stringify(s.Principal).includes('"*"'), "no Allow to everyone");
        // the only reader let in by a bucket policy is this environment's distribution, on the page bucket
        assert.equal(isFiles, false, "nothing but the HTTP function's role reads the files bucket");
        assert.equal(s.Principal.Service, "cloudfront.amazonaws.com");
        assert.equal(s.Action, "s3:GetObject");
        assert.ok(s.Condition.StringEquals["AWS:SourceArn"], "limited to one distribution");
      }
      const tlsOnly = statements.find((s) => s.Effect === "Deny" && s.Condition?.Bool?.["aws:SecureTransport"] === "false");
      assert.ok(tlsOnly, "plain HTTP is refused");
    }
  }
});

// ---------------------------------------------------------------------------------------------
// 7. Tables, functions, least privilege
// ---------------------------------------------------------------------------------------------

test("tables: string partition and sort keys, on-demand, expiring rows through ttl", () => {
  for (const env of Object.values(two)) {
    for (const [, t] of resources(env.main, "AWS::DynamoDB::Table")) {
      assert.deepEqual(t.Properties.KeySchema, [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ]);
      assert.deepEqual(t.Properties.AttributeDefinitions, [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ]);
      assert.equal(t.Properties.BillingMode, "PAY_PER_REQUEST");
      assert.deepEqual(t.Properties.TimeToLiveSpecification, { AttributeName: "ttl", Enabled: true });
    }
    assert.deepEqual(
      resources(env.main, "AWS::DynamoDB::Table").map(([, t]) => t.Properties.TableName).sort(),
      [`${env.prefix}-connections`, `${env.prefix}-data`],
    );
  }
});

const appFunctions = (t: Json) => resources(t, "AWS::Lambda::Function").filter(([id]) => !isCdkHelper(id));

test("functions: Node 22, own log group, and the placeholder is marked while server/ is missing", () => {
  for (const env of Object.values(two)) {
    const fns = appFunctions(env.main);
    assert.deepEqual(fns.map(([, f]) => f.Properties.FunctionName).sort(), [`${env.prefix}-http`, `${env.prefix}-ws`]);
    for (const [, f] of fns) {
      assert.equal(f.Properties.Runtime, "nodejs22.x");
      assert.equal(f.Properties.Handler, "index.handler");
      const group = env.main.Resources[f.Properties.LoggingConfig.LogGroup.Ref];
      assert.equal(group.Properties.LogGroupName, `/aws/lambda/${f.Properties.FunctionName}`);
      assert.ok(group.Properties.RetentionInDays > 0);
    }
  }
});

test("functions: built from server/ when it exists, from the placeholder when it does not", () => {
  // this checkout, whatever its state
  const hasServer = [config.server.httpEntry, config.server.wsEntry].every((f) => existsSync(join(repoRoot, f)));
  const describe = (env: Synthesised) => appFunctions(env.main).map(([, f]) => f.Properties.Description);
  const here = describe(two.dev);
  if (hasServer) for (const d of here) assert.notEqual(d, PLACEHOLDER_NOTE);
  else for (const d of here) assert.equal(d, PLACEHOLDER_NOTE);

  // a made-up repository that does have server/handlers/*.mjs
  const fake = mkdtempSync(join(tmpdir(), "sitehq-infra-test-"));
  mkdirSync(join(fake, "server/handlers"), { recursive: true });
  mkdirSync(join(fake, "infra/placeholder"), { recursive: true });
  for (const f of [config.server.httpEntry, config.server.wsEntry])
    writeFileSync(join(fake, f), "export const handler = async () => ({ statusCode: 204 });\n");
  for (const d of describe(synth(config, fake).prod)) assert.notEqual(d, PLACEHOLDER_NOTE);
});
test("IAM: each function has its own role, no managed policies, no wildcards, only what it needs", () => {
  for (const env of Object.values(two)) {
    const policyOf = (roleName: string): Json[] => {
      const [roleId, role] = resources(env.main, "AWS::IAM::Role").find(([, r]) => r.Properties.RoleName === roleName)!;
      assert.equal(role.Properties.ManagedPolicyArns, undefined, `${roleName}: no managed policies`);
      assert.equal(role.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service, "lambda.amazonaws.com");
      return resources(env.main, "AWS::IAM::Policy")
        .filter(([, p]) => p.Properties.Roles.some((r: Json) => r.Ref === roleId))
        .flatMap(([, p]) => p.Properties.PolicyDocument.Statement);
    };
    const actions = (statements: Json[]) => statements.flatMap((s) => [s.Action].flat() as string[]);
    const http = policyOf(`${env.prefix}-http-fn`);
    const ws = policyOf(`${env.prefix}-ws-fn`);

    for (const s of [...http, ...ws]) {
      assert.equal(s.Effect, "Allow");
      assert.notEqual(s.Resource, "*", `no statement on every resource: ${JSON.stringify(s.Action)}`);
      for (const a of [s.Action].flat()) assert.ok(!/^\*$|:\*$/.test(a), `no wildcard action: ${a}`);
    }
    // logging: own log group only
    for (const [statements, fn] of [
      [http, "http"],
      [ws, "ws"],
    ] as const) {
      const logging = statements.filter((s) => actions([s]).some((a) => a.startsWith("logs:")));
      assert.equal(logging.length, 1);
      const group = env.main.Resources[logging[0].Resource["Fn::GetAtt"][0]];
      assert.equal(group.Properties.LogGroupName, `/aws/lambda/${env.prefix}-${fn}`);
    }
    // the WebSocket function: no files, key or user management; in the data table only the
    // server's own "$…" collections
    const wsActions = actions(ws);
    assert.ok(!wsActions.some((a) => /^(s3|kms|cognito-idp):/.test(a)), "ws: no files, key or user management");
    const onData = (s: Json) => JSON.stringify(s.Resource).includes("DataTable");
    const wsOnData = ws.filter(onData);
    assert.equal(wsOnData.length, 1);
    assert.deepEqual(wsOnData[0].Condition, { "ForAllValues:StringLike": { "dynamodb:LeadingKeys": ["$*"] } });
    assert.ok(!actions(wsOnData).some((a) => /Scan|Batch/.test(a)), "ws: nothing that could bypass the key condition");
    // the HTTP function: files only under the assets prefix, one key, and no user management
    const s3 = http.filter((s) => actions([s]).some((a) => a.startsWith("s3:")));
    assert.match(JSON.stringify(s3.find((s) => s.Sid === "FilesUnderAssetsPrefix")!.Resource), /\/assets\/\*/);
    assert.deepEqual(actions(s3).sort(), ["s3:DeleteObject", "s3:GetObject", "s3:ListBucket", "s3:PutObject"]);
    assert.equal(http.filter((s) => actions([s]).some((a) => a.startsWith("kms:"))).length, 1);
    assert.ok(!actions(http).some((a) => a.startsWith("cognito-idp:")));
    // each is told where things are, under the names server/handlers/env.mjs reads
    const envOf = (fn: string) => byName(env.main, "AWS::Lambda::Function", "FunctionName", `${env.prefix}-${fn}`).Properties.Environment.Variables;
    for (const key of ["TABLE_NAME", "USER_POOL_ID", "USER_POOL_CLIENT_ID", "WS_ENDPOINT", "ASSETS_BUCKET", "ASSETS_PREFIX"])
      assert.ok(envOf("http")[key], `http function is given ${key}`);
    for (const key of ["TABLE_NAME", "USER_POOL_ID", "USER_POOL_CLIENT_ID", "WS_ENDPOINT"])
      assert.ok(envOf("ws")[key], `ws function is given ${key}`);
    assert.equal(envOf("ws").ASSETS_BUCKET, undefined);
  }
});

// ---------------------------------------------------------------------------------------------
// 8. Sign-in
// ---------------------------------------------------------------------------------------------

test("sign-in: invite only, emailed one-time code, public browser client, three roles", () => {
  for (const env of Object.values(two)) {
    const pool = only(env.main, "AWS::Cognito::UserPool").Properties;
    assert.equal(pool.AdminCreateUserConfig.AllowAdminCreateUserOnly, true, "no self sign-up");
    assert.ok(pool.Policies.SignInPolicy.AllowedFirstAuthFactors.includes("EMAIL_OTP"));
    assert.deepEqual(pool.UsernameAttributes, ["email"]);
    assert.equal(pool.MfaConfiguration, "OFF");
    assert.equal(pool.AccountRecoverySetting.RecoveryMechanisms[0].Name, "admin_only");
    assert.equal(pool.EmailConfiguration.EmailSendingAccount, "DEVELOPER");
    assert.match(pool.EmailConfiguration.From, new RegExp(`no-reply@${env.site.replaceAll(".", "\\.")}`));
    assert.match(pool.EmailConfiguration.SourceArn, new RegExp(`:ses:eu-west-2:\\d{12}:identity/${env.site}$`));
    // … and that identity is the one the bootstrap stack creates, with its three DKIM records
    assert.equal(only(env.bootstrap, "AWS::SES::EmailIdentity").Properties.EmailIdentity, env.site);
    assert.equal(resources(env.bootstrap, "AWS::Route53::RecordSet").length, 3);

    const client = only(env.main, "AWS::Cognito::UserPoolClient").Properties;
    assert.equal(client.GenerateSecret, false);
    assert.ok(client.ExplicitAuthFlows.includes("ALLOW_USER_AUTH"));
    assert.ok(!client.ExplicitAuthFlows.some((f: string) => /PASSWORD|SRP/.test(f)), "no password flows");
    assert.equal(client.AllowedOAuthFlows, undefined);
    // what the sign-in screen (src/platform/sign-in.js) relies on
    assert.deepEqual([...client.ExplicitAuthFlows].sort(), ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_AUTH"], "the emailed code, and renewing the token – nothing else");
    assert.equal(client.PreventUserExistenceErrors, "ENABLED", "never says whether an address has an account");
    assert.equal(client.EnableTokenRevocation, true, "signing out can revoke the refresh token");
    assert.equal(client.AuthSessionValidity, 15, "15 minutes to type the emailed code in");
    assert.equal(client.RefreshTokenRotation, undefined, "the screen renews with REFRESH_TOKEN_AUTH, which rotation would switch off");
    assert.deepEqual([client.AccessTokenValidity, client.TokenValidityUnits.AccessToken, client.RefreshTokenValidity, client.TokenValidityUnits.RefreshToken], [60, "minutes", 43200, "minutes"]);

    const groups = resources(env.main, "AWS::Cognito::UserPoolGroup").map(([, g]) => g.Properties.GroupName);
    assert.deepEqual(groups.sort(), ["client", "owner", "trade"]);
  }
});

test("sensitive-field key: one per environment, rotated, named for it", () => {
  for (const env of Object.values(two)) {
    assert.equal(only(env.main, "AWS::KMS::Key").Properties.EnableKeyRotation, true);
    assert.equal(only(env.main, "AWS::KMS::Alias").Properties.AliasName, `alias/${env.prefix}-sensitive`);
  }
});

// ---------------------------------------------------------------------------------------------
// 9. GitHub deploy roles
// ---------------------------------------------------------------------------------------------

test("deploy roles: dev only from main, prod only from the production GitHub Environment", () => {
  const trust = (env: Synthesised) => {
    const role = byName(env.bootstrap, "AWS::IAM::Role", "RoleName", `${env.prefix}-github-deploy`);
    const statements = role.Properties.AssumeRolePolicyDocument.Statement;
    assert.equal(statements.length, 1);
    assert.equal(statements[0].Action, "sts:AssumeRoleWithWebIdentity");
    assert.deepEqual(Object.keys(statements[0].Condition), ["StringEquals"], "exact matches only, no patterns");
    return statements[0].Condition.StringEquals;
  };
  const issuer = "token.actions.githubusercontent.com";
  assert.deepEqual(trust(two.dev), {
    [`${issuer}:aud`]: "sts.amazonaws.com",
    [`${issuer}:sub`]: `repo:${config.githubRepo}:ref:refs/heads/main`,
  });
  assert.deepEqual(trust(two.prod), {
    [`${issuer}:aud`]: "sts.amazonaws.com",
    [`${issuer}:sub`]: `repo:${config.githubRepo}:environment:production`,
  });
});

test("deploy roles: may only use CDK's roles, upload the page and invalidate this environment's CDN", () => {
  for (const [envName, env] of Object.entries(two)) {
    const statements: Json[] = only(env.bootstrap, "AWS::IAM::Policy").Properties.PolicyDocument.Statement;
    assert.deepEqual(statements.map((s) => s.Sid).sort(), ["InvalidateCdn", "UploadPage", "UseCdkBootstrapRoles"]);
    const sid = (id: string) => statements.find((s) => s.Sid === id)!;
    const account = config.environments[envName].account;
    for (const arn of sid("UseCdkBootstrapRoles").Resource) assert.ok(arn.startsWith(`arn:aws:iam::${account}:role/cdk-`));
    assert.equal(sid("UploadPage").Resource, `arn:aws:s3:::${env.prefix}-page-${account}/*`);
    assert.deepEqual(sid("InvalidateCdn").Condition.StringEquals, {
      "aws:ResourceTag/project": "sitehq",
      "aws:ResourceTag/env": envName,
    });
  }
});

test("GitHub provider: one per account – two when the accounts differ, one when they are shared", () => {
  const count = (envs: Record<string, Synthesised>) =>
    Object.values(envs).reduce((n, e) => n + resources(e.bootstrap, "AWS::IAM::OIDCProvider").length, 0);
  if (config.environments.dev.account !== config.environments.prod.account) assert.equal(count(two), 2);
  assert.equal(count(one), 1);
  // the role in the stack without a provider trusts the account's existing one
  const prodRole = byName(one.prod.bootstrap, "AWS::IAM::Role", "RoleName", "sitehq-prod-github-deploy");
  assert.equal(
    prodRole.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Federated,
    `arn:aws:iam::${oneAccountConfig.environments.prod.account}:oidc-provider/token.actions.githubusercontent.com`,
  );
});

// ---------------------------------------------------------------------------------------------
// 10. Outputs and deploy-time checks
// ---------------------------------------------------------------------------------------------

test("outputs: what the deploy workflow reads, and the page's /config.json", () => {
  for (const env of Object.values(two)) {
    for (const key of ["SiteUrl", "PageBucketName", "DistributionId", "PageConfig"])
      assert.ok(env.main.Outputs[key], `output ${key}`);
    assert.equal(env.main.Outputs.SiteUrl.Value, `https://${env.site}`);
    const pageConfig = JSON.stringify(env.main.Outputs.PageConfig.Value);
    for (const expected of [`"ws\\":\\"wss://${env.ws}`, `"api\\":\\"/api`, "userPoolId", `"userPoolClientId\\":`, `"region\\":\\"eu-west-2`, `"env\\":\\"`])
      assert.ok(pageConfig.includes(expected), `PageConfig mentions ${expected}`);
    // local development only: a deployed page must always talk to the real Cognito
    assert.ok(!/cognitoEndpoint|devToken/.test(pageConfig), "no local-development settings in a deployed /config.json");
    assert.ok(env.bootstrap.Outputs.DeployRoleArn);
  }
});

test("deploying: refused while placeholders remain; prod's main stack is refused without server/", () => {
  const real: ProjectConfig = structuredClone(config);
  for (const e of Object.values(real.environments)) {
    e.domain = "sitehq-test.invalid";
    e.hostedZoneName = "sitehq-test.invalid";
    e.hostedZoneId = "Z123456789TEST";
  }
  real.environments.dev.account = "333333333333";
  real.environments.prod.account = "444444444444";

  // placeholders left in dev's own settings → no deploy (only meaningful while they are still placeholders; the
  // SITEHQ_* variables fill dev's in before prod's)
  const stillPlaceholders = placeholdersIn(config.environments.dev).length > 0;
  if (stillPlaceholders) assert.throws(() => synth(config, repoRoot, "dev"), /placeholder values remain/);

  // real values: dev deploys alone, with the placeholder handler allowed
  const empty = mkdtempSync(join(tmpdir(), "sitehq-infra-test-"));
  mkdirSync(join(empty, "infra/placeholder"), { recursive: true });
  writeFileSync(join(empty, "infra/placeholder/handler.mjs"), "export const handler = async () => ({ statusCode: 501 });\n");
  assert.deepEqual(Object.keys(synth(real, empty, "dev")), ["dev"]);
  // (error annotations, read straight off the stack: the CDK command line refuses to deploy a stack that has any)
  const errors = (envName: string, root: string, stack: "main" | "bootstrap"): string[] =>
    build(real, root, envName)
      .environments[envName][stack].node.metadata.filter((m) => m.type === "aws:cdk:error")
      .map((m) => String(m.data));
  assert.equal(errors("dev", empty, "main").length, 0);
  // prod without server/ → its main stack carries an error, which stops `cdk deploy` of it …
  const refused = errors("prod", empty, "main");
  assert.equal(refused.length, 2);
  for (const message of refused) assert.match(message, /does not allow the placeholder handler/);
  // … but not of its bootstrap stack, which has to be deployed first
  assert.equal(errors("prod", empty, "bootstrap").length, 0);
  // prod with server/ → nothing in the way
  for (const f of [config.server.httpEntry, config.server.wsEntry]) {
    mkdirSync(dirname(join(empty, f)), { recursive: true });
    writeFileSync(join(empty, f), "export const handler = async () => ({ statusCode: 204 });\n");
  }
  assert.equal(errors("prod", empty, "main").length, 0);
  assert.throws(() => synth(real, empty, "staging"), /not one of/);
});

test("config mistakes are caught before anything is synthesised", () => {
  const bad = (change: (c: ProjectConfig) => void, message: RegExp) => {
    const c: ProjectConfig = structuredClone(config);
    change(c);
    assert.throws(() => checkConfig(c), message);
  };
  bad((c) => (c.environments.dev.hostedZoneName = "another-domain.invalid"), /not inside the hosted zone/);
  bad((c) => (c.environments.prod.subdomain = c.environments.dev.subdomain), /same address/);
  bad((c) => (c.environments.dev.account = "123"), /12-digit/);
  bad((c) => {
    c.environments.prod.account = c.environments.dev.account;
    c.environments.prod.githubOidcProvider = "create";
    c.environments.dev.githubOidcProvider = "create";
  }, /only one/);
  checkConfig(config);
});
