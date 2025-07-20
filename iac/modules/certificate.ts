import { Construct } from "constructs";
import { Fn } from "cdktf";
import { acmCertificate, acmCertificateValidation } from "@cdktf/provider-aws"; //  /lib/acm
import { route53Record } from "@cdktf/provider-aws";  // /lib/route53

export interface CertProps {
  env: string;
  domainName: string;
  subdomain: string;
  hostedZoneId: string;
  certificateName: string;
  albDnsName: string;
  albZoneId: string;
}

export class CertificateModule extends Construct {
  constructor(scope: Construct, id: string, props: CertProps) {
    super(scope, id);

    const cert = new AcmCertificate(this, "cert", {
      domainName: props.subdomain,
      validationMethod: "DNS",
      lifecycle: { createBeforeDestroy: true },
      tags: { Name: props.certificateName },
    });

    const record = new Route53Record(this, "cert-record", {
      zoneId: props.hostedZoneId,
      name: Fn.element(cert.domainValidationOptions, 0).resourceRecordName,
      type: Fn.element(cert.domainValidationOptions, 0).resourceRecordType,
      ttl: 60,
      records: [Fn.element(cert.domainValidationOptions, 0).resourceRecordValue],
    });

    new AcmCertificateValidation(this, "cert-validate", {
      certificateArn: cert.arn,
      validationRecordFqdns: [record.fqdn],
    });

    new Route53Record(this, "alb-dns", {
      zoneId: props.hostedZoneId,
      name: props.subdomain,
      type: "A",
      alias: {
        name: props.albDnsName,
        zoneId: props.albZoneId,
        evaluateTargetHealth: true,
      },
    });
  }
}