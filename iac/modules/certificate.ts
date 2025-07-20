import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";

export interface CertProps { env: string; domainName: string; subdomain: string; hostedZoneId: string; certificateName: string; albDnsName: string; albZoneId: string; }
export class CertModule extends Construct {
  constructor(scope: Construct, id: string, props: CertProps) {
    super(scope, id);
    const cert = new aws.acm.AcmCertificate(this, "cert", {
      domainName: props.subdomain,
      validationMethod: "DNS",
      lifecycle: { createBeforeDestroy: true },
      tags: { Name: props.certificateName },
    });

    const record = new aws.route53.Route53Record(this, "cert-record", {
      zoneId: props.hostedZoneId,
      name: cert.domainValidationOptions.get(0).resourceRecordName,
      type: cert.domainValidationOptions.get(0).resourceRecordType,
      ttl: 60,
      records: [cert.domainValidationOptions.get(0).resourceRecordValue],
    });

    new aws.acm.AcmCertificateValidation(this, "cert-validate", {
      certificateArn: cert.arn,
      validationRecordFqdns: [record.fqdn],
    });

    new aws.route53.Route53Record(this, "alb-dns", {
      zoneId: props.hostedZoneId,
      name: props.subdomain,
      type: "A",
      alias: { name: props.albDnsName, zoneId: props.albZoneId, evaluateTargetHealth: true },
    });
  }
}