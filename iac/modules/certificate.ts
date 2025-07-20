import { Construct } from "constructs";
import { TerraformOutput, TerraformIterator } from "cdktf";
import { AcmCertificate } from "@cdktf/provider-aws/lib/acm-certificate";
import { AcmCertificateValidation } from "@cdktf/provider-aws/lib/acm-certificate-validation";
import { Route53Record } from "@cdktf/provider-aws/lib/route53-record";
import { DataAwsRoute53Zone } from "@cdktf/provider-aws/lib/data-aws-route53-zone";

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

    
    const validationIterator = TerraformIterator.fromMap(cert.domainValidationOptions);
    
    const validationRecord = new Route53Record(this, "cert-validation-record", {
      forEach: validationIterator,
      zoneId: props.hostedZoneId,
      name: validationIterator.getString("resource_record_name"),
      type: validationIterator.getString("resource_record_type"), 
      ttl: 60,
      records: [validationIterator.getString("resource_record_value")],
      allowOverwrite: true,
    });

    
    new AcmCertificateValidation(this, "cert-validate", {
      certificateArn: cert.arn,
      validationRecordFqdns: [validationRecord.fqdn],
      timeouts: {
        create: "5m",
      },
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