import { Construct } from "constructs";
import { Fn, TerraformOutput } from "cdktf";
import { AcmCertificate } from "@cdktf/provider-aws/lib/acm-certificate";
import { AcmCertificateValidation } from "@cdktf/provider-aws/lib/acm-certificate-validation";
import { Route53Record } from "@cdktf/provider-aws/lib/route53-record";

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
  public readonly certArn: string;

  constructor(scope: Construct, id: string, props: CertProps) {
    super(scope, id);

    const cert = new AcmCertificate(this, "cert", {
      domainName: props.subdomain,
      validationMethod: "DNS",
      lifecycle: { createBeforeDestroy: true },
      tags: { Name: props.certificateName },
    });

    const validationOption = Fn.element(cert.domainValidationOptions, 0) as any;

    const record = new Route53Record(this, "cert-record", {
      zoneId: props.hostedZoneId,
      name: Fn.lookup(validationOption, "resourceRecordName"),
      type: Fn.lookup(validationOption, "resourceRecordType"),
      ttl: 60,
      records: [Fn.lookup(validationOption, "resourceRecordValue")],
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

    this.certArn = cert.arn;

    new TerraformOutput(this, "certificate_arn", {
      value: this.certArn,
    });
  }
}