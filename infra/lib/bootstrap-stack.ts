import { CfnOutput, Duration, Stack, type StackProps, Tags } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ses from "aws-cdk-lib/aws-ses";
import type { Construct } from "constructs";
import type { EnvironmentConfig, ProjectConfig } from "../config.ts";
import type { Names } from "./naming.ts";

const GITHUB_ISSUER = "token.actions.githubusercontent.com";

export interface BootstrapStackProps extends StackProps {
  project: ProjectConfig;
  environment: EnvironmentConfig;
  names: Names;
}

/**
 * What has to exist before GitHub can deploy an environment. Deployed once, by hand, by someone
 * with administrator access to the account (README › Bootstrap); the workflows never touch it.
 *
 *  - GitHub's sign-in provider for the account (created here, or already there)
 *  - the role GitHub Actions takes to deploy this environment – no stored keys
 *  - the email identity that sign-in codes are sent from, with its DNS records, so that it has
 *    been verified by the time the main stack creates the user pool
 */
/** The subject as configured, plus the same subject with GitHub's owner and repository ids spelled in. */
export function subjectForms(project: ProjectConfig, subject: string): string[] {
  const [owner, repo] = project.githubRepo.split("/");
  const withIds = subject.replace(`repo:${owner}/${repo}:`, `repo:${owner}@${project.githubRepoIds.owner}/${repo}@${project.githubRepoIds.repo}:`);
  return withIds === subject ? [subject] : [subject, withIds];
}

export class BootstrapStack extends Stack {
  readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: BootstrapStackProps) {
    super(scope, id, props);
    const { project, environment: e, names } = props;
    for (const [k, v] of Object.entries(names.tags)) Tags.of(this).add(k, v);

    // --- GitHub → AWS without stored keys -------------------------------------------------
    const providerArn =
      e.githubOidcProvider === "create"
        ? new iam.OidcProviderNative(this, "GithubOidcProvider", {
            url: `https://${GITHUB_ISSUER}`,
            clientIds: ["sts.amazonaws.com"],
          }).oidcProviderArn
        : `arn:aws:iam::${e.account}:oidc-provider/${GITHUB_ISSUER}`;

    this.deployRole = new iam.Role(this, "DeployRole", {
      roleName: names.deployRoleName,
      description: `GitHub Actions (${project.githubRepo}) deploys ${names.prefix}. Only: ${e.githubSubject}`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.FederatedPrincipal(
        providerArn,
        {
          StringEquals: {
            [`${GITHUB_ISSUER}:aud`]: "sts.amazonaws.com",
            // exact matches, no wildcard: one branch (dev) or one GitHub Environment (prod), in both forms GitHub
            // sends the subject in – repo:owner/name:… and repo:owner@<id>/name@<id>:… (seen from Nov 2026)
            [`${GITHUB_ISSUER}:sub`]: subjectForms(project, e.githubSubject),
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });

    // `cdk deploy` works by taking the roles that `cdk bootstrap` made in this account.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "UseCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [e.region, "us-east-1"].map(
          (region) => `arn:aws:iam::${e.account}:role/cdk-hnb659fds-*-role-${e.account}-${region}`,
        ),
      }),
    );
    // Upload the built page …
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "UploadPage",
        actions: ["s3:PutObject"],
        resources: [`arn:aws:s3:::${names.bucket("page")}/*`],
      }),
    );
    // … and tell CloudFront to fetch it again. The distribution's id is not known until the
    // main stack exists, so it is picked out by the tags every resource of the environment has.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "InvalidateCdn",
        actions: ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
        resources: [`arn:aws:cloudfront::${e.account}:distribution/*`],
        conditions: {
          StringEquals: Object.fromEntries(
            Object.entries(names.tags).map(([k, v]) => [`aws:ResourceTag/${k}`, v]),
          ),
        },
      }),
    );

    // --- Where sign-in codes are sent from ------------------------------------------------
    const identity = new ses.EmailIdentity(this, "EmailIdentity", {
      identity: ses.Identity.domain(names.siteDomain),
    });
    // SES hands back three complete record names (…._domainkey.<site address>), so they are
    // written as they come rather than through CnameRecord, which would append the zone again.
    identity.dkimRecords.forEach((record, i) => {
      new route53.CfnRecordSet(this, `EmailDkim${i + 1}`, {
        hostedZoneId: e.hostedZoneId,
        name: record.name,
        type: "CNAME",
        resourceRecords: [record.value],
        ttl: "3600",
      });
    });

    new CfnOutput(this, "DeployRoleArn", {
      value: this.deployRole.roleArn,
      description: `Set as the GitHub variable AWS_ROLE_ARN_${e.envName.toUpperCase()}`,
    });
    new CfnOutput(this, "EmailIdentityDomain", {
      value: names.siteDomain,
      description: "SES identity for sign-in emails; must show as verified before the first deploy",
    });
  }
}
