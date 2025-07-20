import { Construct } from "constructs";
import { AcmCertificate } from "@cdktf/provider-aws/lib/acm-certificate";
import { AcmCertificateValidation } from "@cdktf/provider-aws/lib/acm-certificate-validation";
import { Route53Record } from "@cdktf/provider-aws/lib/route53-record";

export interface CertificateProps {
  domainName: string;
  subdomain: string;
  hostedZoneId: string;
  certificateName: string;
  albDnsName: string;
  albZoneId: string;
}

export class CertificateModule extends Construct {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CertificateProps) {
    super(scope, id);

    const fqdn = `${props.subdomain}.${props.domainName}`;

    const cert = new AcmCertificate(this, "cert", {
      domainName: fqdn,
      validationMethod: "DNS",
      lifecycle: { createBeforeDestroy: true },
      tags: { Name: props.certificateName },
    });

    const record = new Route53Record(this, "cert-record", {
      zoneId: props.hostedZoneId,
      name: cert.domainValidationOptions![0].resourceRecordName!,
      type: cert.domainValidationOptions![0].resourceRecordType!,
      ttl: 60,
      records: [cert.domainValidationOptions![0].resourceRecordValue!],
    });

    new AcmCertificateValidation(this, "certValidation", {
      certificateArn: cert.arn,
      validationRecordFqdns: [record.fqdn],
    });

    new Route53Record(this, "alb-dns", {
      zoneId: props.hostedZoneId,
      name: fqdn,
      type: "A",
      alias: {
        name: props.albDnsName,
        zoneId: props.albZoneId,
        evaluateTargetHealth: true,
      },
    });

    this.certificateArn = cert.arn;
  }
}