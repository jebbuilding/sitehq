import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  Annotations,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  Tags,
} from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpLambdaIntegration,
  WebSocketLambdaIntegration,
} from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AccessLogFormat } from "aws-cdk-lib/aws-apigateway";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import type { EnvironmentConfig, ProjectConfig } from "../config.ts";
import { bundleHandler } from "./bundle.ts";
import type { Names } from "./naming.ts";

export const PLACEHOLDER_HANDLER = "infra/placeholder/handler.mjs";
export const PLACEHOLDER_NOTE = "PLACEHOLDER handler (server/ code not found when synthesised)";

export interface SiteHqStackProps extends StackProps {
  project: ProjectConfig;
  environment: EnvironmentConfig;
  names: Names;
  /** The CloudFront certificate, from this environment's EdgeStack in us-east-1. */
  certificate: acm.ICertificate;
  /** Absolute path of the repository root (where server/ and infra/ are). */
  repoRoot: string;
  /** True for a real deploy (`-c deployEnv=…`), false for `cdk synth` and the tests. */
  deploying?: boolean;
}

/** Which file a function is built from: the real handler if it exists, else the placeholder. */
export function resolveHandler(repoRoot: string, entry: string): { entry: string; placeholder: boolean } {
  const real = join(repoRoot, entry);
  return existsSync(real)
    ? { entry: real, placeholder: false }
    : { entry: join(repoRoot, PLACEHOLDER_HANDLER), placeholder: true };
}

/**
 * One SiteHQ environment. The same definition makes dev and prod; every difference between
 * them comes from `props.environment` (infra/config.ts).
 */
export class SiteHqStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteHqStackProps) {
    super(scope, id, props);
    const { project, environment: e, names, repoRoot } = props;
    const sw = e.switches;
    for (const [k, v] of Object.entries(names.tags)) Tags.of(this).add(k, v);

    const dataRemoval = sw.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
    const allowedOrigins = [names.siteOrigin, ...sw.extraCorsOrigins];
    const assetsPrefix = project.server.assetsPrefix; // "assets/"

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: e.hostedZoneId,
      zoneName: e.hostedZoneName,
    });

    // ===================== Data =====================
    // Every document: partition key = collection path, sort key = document id. The server also
    // keeps its own records here in collections whose names start with "$" (file details, and –
    // as server/ stands – who is connected for live updates, which expire through `ttl`).
    const dataTable = new dynamodb.Table(this, "DataTable", {
      tableName: names.resource("data"),
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: sw.pointInTimeRecovery },
      deletionProtection: sw.deletionProtection,
      removalPolicy: dataRemoval,
    });

    // For who is connected to live updates and what they are subscribed to: same key layout as
    // the data table, so the server's store works on either. Nothing here outlives a connection
    // (rows expire through `ttl`), so it is never retained or backed up.
    const connectionsTable = new dynamodb.Table(this, "ConnectionsTable", {
      tableName: names.resource("connections"),
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      deletionProtection: sw.deletionProtection,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // The built page. Rebuilt from the repository on every deploy, so never worth keeping.
    const pageBucket = new s3.Bucket(this, "PageBucket", {
      bucketName: names.bucket("page"),
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      // Emptying a bucket on deletion needs a helper function; only throwaway environments get it.
      autoDeleteObjects: !sw.retainData,
    });

    // Uploaded files (photos, documents, signatures): personal data.
    const filesBucket = new s3.Bucket(this, "FilesBucket", {
      bucketName: names.bucket("files"),
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      versioned: sw.bucketVersioning,
      removalPolicy: dataRemoval,
      autoDeleteObjects: !sw.retainData,
      lifecycleRules: [
        {
          id: "tidy-up",
          abortIncompleteMultipartUploadAfter: Duration.days(7),
          // An old version is a backup, not an archive: a deleted file must really go in the end.
          ...(sw.bucketVersioning
            ? { noncurrentVersionExpiration: Duration.days(sw.noncurrentVersionDays) }
            : {}),
        },
      ],
      // Nothing reads this bucket except the HTTP function. The browser reaches a file only with
      // a one-off signed address the API hands out after checking the sign-in: to upload (PUT),
      // or to fetch a large file the API redirects it to (GET).
      cors: [
        {
          allowedOrigins,
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

    // Key for the sensitive fields (NI number, medical notes, next of kin, key-safe and alarm
    // codes – docs/ROADMAP.md › GDPR decision 6). Only the HTTP function may use it.
    const sensitiveKey = new kms.Key(this, "SensitiveKey", {
      alias: names.resource("sensitive"),
      description: `${names.prefix}: encrypts the sensitive fields of SiteHQ records`,
      enableKeyRotation: true,
      removalPolicy: dataRemoval,
    });

    // ===================== Sign-in =====================
    // Invite only: accounts are created by an administrator, never by signing up (README ›
    // First people; the function gets no user-management rights until an invite flow needs
    // them). People sign in with a one-time code emailed to them. Cognito insists that
    // "password" stays in the list of allowed factors, but nobody is ever given one and nobody
    // can set one (no self-service recovery).
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: names.resource("users"),
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      featurePlan: cognito.FeaturePlan.ESSENTIALS,
      signInPolicy: { allowedFirstAuthFactors: { password: true, emailOtp: true } },
      mfa: cognito.Mfa.OFF, // Cognito does not allow emailed-code sign-in together with MFA
      accountRecovery: cognito.AccountRecovery.NONE,
      passwordPolicy: {
        minLength: 20,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      // Sent through SES from the identity the bootstrap stack created and verified.
      email: cognito.UserPoolEmail.withSES({
        fromEmail: names.emailFrom,
        fromName: "SiteHQ",
        sesRegion: e.region,
        sesVerifiedDomain: names.siteDomain,
      }),
      deletionProtection: sw.deletionProtection,
      removalPolicy: dataRemoval,
    });
    // The role travels in the sign-in token as `cognito:groups`.
    for (const role of ["owner", "trade", "client"]) {
      new cognito.UserPoolGroup(this, `Group-${role}`, {
        userPool,
        groupName: role,
        description: `SiteHQ ${role}s`,
      });
    }
    const webClient = userPool.addClient("WebClient", {
      userPoolClientName: names.resource("web"),
      generateSecret: false, // it runs in a browser; there is nowhere to keep a secret
      // Choice-based sign-in: the emailed code. CDK adds the refresh-token flow to any list of flows;
      // the sign-in screen (src/platform/sign-in.js) renews the hourly token with it.
      authFlows: { user: true },
      disableOAuth: true,
      // An address with no account is answered like one with: the screen never says which.
      preventUserExistenceErrors: true,
      enableTokenRevocation: true, // signing out revokes the refresh token
      // How long a person has to type the emailed code in. Cognito's default is 3 minutes, which
      // email on a building site does not always manage; 15 is the most it allows.
      authSessionValidity: Duration.minutes(15),
      accessTokenValidity: Duration.minutes(sw.accessTokenMinutes),
      idTokenValidity: Duration.minutes(sw.accessTokenMinutes),
      refreshTokenValidity: Duration.days(sw.refreshTokenDays),
    });

    // ===================== Logs =====================
    const logRetention = sw.logRetentionDays as logs.RetentionDays;
    const logGroup = (id: string, logGroupName: string) =>
      new logs.LogGroup(this, id, { logGroupName, retention: logRetention, removalPolicy: dataRemoval });
    const httpLogs = logGroup("HttpFunctionLogs", `/aws/lambda/${names.resource("http")}`);
    const wsLogs = logGroup("WsFunctionLogs", `/aws/lambda/${names.resource("ws")}`);
    const accessLogs = logGroup("HttpApiAccessLogs", `/aws/vendedlogs/${names.resource("http-api")}`);

    // ===================== Functions =====================
    const http = resolveHandler(repoRoot, project.server.httpEntry);
    const ws = resolveHandler(repoRoot, project.server.wsEntry);
    for (const [what, h] of [
      [project.server.httpEntry, http],
      [project.server.wsEntry, ws],
    ] as const) {
      if (!h.placeholder) continue;
      // An error on this stack stops `cdk deploy` of it, and of nothing else (the bootstrap
      // stack of the same environment can still be deployed before server/ exists).
      if (props.deploying && !sw.allowPlaceholderHandlers)
        Annotations.of(this).addError(
          `${what} does not exist and ${e.envName} does not allow the placeholder handler (infra/config.ts › allowPlaceholderHandlers)`,
        );
      else Annotations.of(this).addWarning(`${what} not found: using the ${PLACEHOLDER_NOTE}`);
    }
    // Each function has its own role with only what is granted below. No managed policies:
    // even logging is limited to the function's own log group.
    const role = (id: string, name: string, logs_: logs.LogGroup) => {
      const r = new iam.Role(this, id, {
        roleName: names.resource(name),
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      });
      logs_.grantWrite(r);
      return r;
    };
    const httpRole = role("HttpFunctionRole", "http-fn", httpLogs);
    const wsRole = role("WsFunctionRole", "ws-fn", wsLogs);

    const fn = (
      id: string,
      name: string,
      handler: { entry: string; placeholder: boolean },
      fnRole: iam.Role,
      fnLogs: logs.LogGroup,
      timeout: Duration,
    ) =>
      new lambda.Function(this, id, {
        functionName: names.resource(name),
        description: handler.placeholder ? PLACEHOLDER_NOTE : `SiteHQ ${name} handler (${e.envName})`,
        code: lambda.Code.fromAsset(bundleHandler(repoRoot, handler.entry, name)),
        handler: `index.${project.server.handlerExport}`,
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        timeout,
        role: fnRole,
        logGroup: fnLogs,
      });
    const httpFn = fn("HttpFunction", "http", http, httpRole, httpLogs, Duration.seconds(29));
    const wsFn = fn("WsFunction", "ws", ws, wsRole, wsLogs, Duration.seconds(10));

    // ===================== HTTP API =====================
    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: names.resource("http"),
      description: `SiteHQ API (${e.envName}), reached through CloudFront at ${names.siteOrigin}`,
      createDefaultStage: false,
      corsPreflight: {
        allowOrigins: allowedOrigins,
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ["authorization", "content-type"],
        maxAge: Duration.hours(1),
      },
    });
    new apigwv2.HttpStage(this, "HttpStage", {
      httpApi,
      stageName: "$default",
      autoDeploy: true,
      throttle: { rateLimit: sw.apiRateLimit, burstLimit: sw.apiBurstLimit },
      accessLogSettings: {
        destination: new apigwv2.LogGroupLogDestination(accessLogs),
        // what was called and when; never bodies, tokens or query strings (document paths
        // travel in request bodies, so they are not here either)
        format: AccessLogFormat.custom(
          JSON.stringify({
            requestId: "$context.requestId",
            time: "$context.requestTime",
            ip: "$context.identity.sourceIp",
            method: "$context.httpMethod",
            path: "$context.path",
            status: "$context.status",
            ms: "$context.responseLatency",
          }),
        ),
      },
    });
    // The function checks the sign-in token on every request itself (server/core/api.mjs), so
    // the routes carry no authoriser: files are asked for by <img>, which can only send a cookie.
    const httpIntegration = new HttpLambdaIntegration("HttpIntegration", httpFn);
    for (const path of [project.apiPath, project.blobPath]) {
      httpApi.addRoutes({
        path: `${path}/{proxy+}`,
        methods: [apigwv2.HttpMethod.ANY],
        integration: httpIntegration,
      });
    }

    // ===================== WebSocket API (live updates) =====================
    const wsIntegration = (id: string) => new WebSocketLambdaIntegration(id, wsFn);
    const wsApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
      apiName: names.resource("ws"),
      description: `SiteHQ live updates (${e.envName})`,
      connectRouteOptions: { integration: wsIntegration("WsConnect") },
      disconnectRouteOptions: { integration: wsIntegration("WsDisconnect") },
      defaultRouteOptions: { integration: wsIntegration("WsDefault") },
    });
    const wsCertificate = new acm.Certificate(this, "WsCertificate", {
      domainName: names.wsDomain,
      certificateName: names.resource("ws"),
      validation: acm.CertificateValidation.fromDns(zone),
    });
    const wsDomain = new apigwv2.DomainName(this, "WsDomain", {
      domainName: names.wsDomain,
      certificate: wsCertificate,
    });
    const wsStage = new apigwv2.WebSocketStage(this, "WebSocketStage", {
      webSocketApi: wsApi,
      stageName: e.envName,
      autoDeploy: true,
      throttle: { rateLimit: sw.apiRateLimit, burstLimit: sw.apiBurstLimit },
      domainMapping: { domainName: wsDomain },
    });
    new route53.ARecord(this, "WsAlias", {
      zone,
      recordName: names.wsDomain,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          wsDomain.regionalDomainName,
          wsDomain.regionalHostedZoneId,
        ),
      ),
    });

    // ===================== What each function is told and may do =====================
    // Names as server/handlers/env.mjs reads them.
    const shared = {
      SITEHQ_ENV: e.envName,
      TABLE_NAME: dataTable.tableName,
      CONNECTIONS_TABLE_NAME: connectionsTable.tableName,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: webClient.userPoolClientId,
      WS_ENDPOINT: wsStage.callbackUrl, // where to push messages to connected browsers
      NODE_OPTIONS: "--enable-source-maps",
    };
    for (const [k, v] of Object.entries(shared)) {
      httpFn.addEnvironment(k, v);
      wsFn.addEnvironment(k, v);
    }
    httpFn.addEnvironment("ASSETS_BUCKET", filesBucket.bucketName);
    httpFn.addEnvironment("ASSETS_PREFIX", assetsPrefix);
    httpFn.addEnvironment("SENSITIVE_KEY_ARN", sensitiveKey.keyArn);

    // HTTP function: the only thing that reads or writes documents, touches files or uses the key.
    dataTable.grantReadWriteData(httpRole);
    connectionsTable.grantReadWriteData(httpRole);
    httpRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "FilesUnderAssetsPrefix",
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [filesBucket.arnForObjects(`${assetsPrefix}*`)],
      }),
    );
    httpRole.addToPolicy(
      new iam.PolicyStatement({
        // without this S3 answers "access denied" instead of "not found" for a missing file
        sid: "TellMissingFromForbidden",
        actions: ["s3:ListBucket"],
        resources: [filesBucket.bucketArn],
      }),
    );
    sensitiveKey.grantEncryptDecrypt(httpRole);
    wsStage.grantManagementApiAccess(httpRole);

    // WebSocket function: keeps the records of who is connected and pushes to browsers. It
    // cannot read or write documents, files or the key. In the data table it reaches only the
    // server's own "$…" collections (where server/core/live.mjs keeps connections today).
    connectionsTable.grantReadWriteData(wsRole);
    wsRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "LiveRecordsInDataTable",
        actions: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem", "dynamodb:DeleteItem"],
        resources: [dataTable.tableArn],
        conditions: { "ForAllValues:StringLike": { "dynamodb:LeadingKeys": ["$*"] } },
      }),
    );
    wsStage.grantManagementApiAccess(wsRole);

    // ===================== The site: one address for page, files and API =====================
    const securityHeaders = cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS;
    // Requests for the API and for files are passed on whole (sign-in header, cookie, body) and
    // never kept by CloudFront: what a person may see is decided by the API on every request.
    const apiOrigin = new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${e.region}.amazonaws.com`);
    const toApi = (allowedMethods: cloudfront.AllowedMethods): cloudfront.BehaviorOptions => ({
      origin: apiOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: securityHeaders,
    });
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: names.prefix,
      domainNames: [names.siteDomain],
      certificate: props.certificate,
      defaultRootObject: "index.html",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Europe + North America
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(pageBucket, {
          originAccessControl: new cloudfront.S3OriginAccessControl(this, "PageAccess", {
            originAccessControlName: names.resource("page"),
          }),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        compress: true,
      },
      additionalBehaviors: {
        [`${project.apiPath}/*`]: toApi(cloudfront.AllowedMethods.ALLOW_ALL),
        [`${project.blobPath}/*`]: toApi(cloudfront.AllowedMethods.ALLOW_GET_HEAD),
      },
    });
    const siteTarget = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
    new route53.ARecord(this, "SiteAlias", { zone, recordName: names.siteDomain, target: siteTarget });
    new route53.AaaaRecord(this, "SiteAliasV6", { zone, recordName: names.siteDomain, target: siteTarget });

    // ===================== Outputs (read by the deploy workflow) =====================
    const out = (id: string, value: string, description: string) =>
      new CfnOutput(this, id, { value, description });
    out("SiteUrl", names.siteOrigin, "Where the app is served");
    out("PageBucketName", pageBucket.bucketName, "Upload the built page here as index.html");
    out("DistributionId", distribution.distributionId, "Invalidate after uploading the page");
    out("DataTableName", dataTable.tableName, "Documents");
    out("FilesBucketName", filesBucket.bucketName, "Uploaded files");
    out("UserPoolId", userPool.userPoolId, "Sign-in");
    // Everything the page needs to find its backend (src/platform/aws-adapter.js reads `api`
    // and `ws`; the sign-in screen, src/platform/sign-in.js, reads `region` and
    // `userPoolClientId`). The deploy writes it to /config.json, so the same built page works in
    // every environment.
    out(
      "PageConfig",
      this.toJsonString({
        env: e.envName,
        region: e.region,
        api: project.apiPath,
        ws: `wss://${names.wsDomain}`,
        userPoolId: userPool.userPoolId,
        userPoolClientId: webClient.userPoolClientId,
      }),
      "Contents of /config.json",
    );
  }
}
