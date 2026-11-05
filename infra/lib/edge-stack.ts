import { Stack, type StackProps, Tags } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../config.ts";
import type { Names } from "./naming.ts";

export interface EdgeStackProps extends StackProps {
  environment: EnvironmentConfig;
  names: Names;
}

/**
 * The one thing that cannot live in London: CloudFront only accepts a certificate held in
 * us-east-1. This stack holds that certificate (no data), and the main stack refers to it.
 */
export class EdgeStack extends Stack {
  readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);
    const { environment: e, names } = props;
    for (const [k, v] of Object.entries(names.tags)) Tags.of(this).add(k, v);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: e.hostedZoneId,
      zoneName: e.hostedZoneName,
    });
    this.certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName: names.siteDomain,
      certificateName: names.resource("site"),
      validation: acm.CertificateValidation.fromDns(zone), // writes the validation record itself
    });
  }
}
