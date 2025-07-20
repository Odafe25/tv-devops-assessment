import { Construct } from "constructs";
import { Lb } from "@cdktf/provider-aws/lib/lb";
import { LbTargetGroup } from "@cdktf/provider-aws/lib/lb-target-group";
import { LbListener } from "@cdktf/provider-aws/lib/lb-listener";

export interface AlbProps {
  env: string;
  project: string;
  vpc: any;
  subnets: string[];
  securityGroups: string[];
}

export class AlbModule extends Construct {
  public readonly dnsName: string;
  public readonly zoneId: string;
  public readonly arn: string;

  constructor(scope: Construct, id: string, props: AlbProps) {
    super(scope, id);

    const lb = new Lb(this, "lb", {
      name: `${props.project}-lb`,
      internal: false,
      loadBalancerType: "application",
      securityGroups: props.securityGroups,
      subnets: props.subnets,
    });

    new LbTargetGroup(this, "tg", {
      name: `${props.project}-tg`,
      port: 3000,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: props.vpc.id,
    });

    new LbListener(this, "http-listener", {
      loadBalancerArn: lb.arn,
      port: 80,
      protocol: "HTTP",
      defaultAction: [{
        type: "redirect",
        redirect: {
          port: "443",
          protocol: "HTTPS",
          statusCode: "HTTP_301",
        },
      }],
    });

    this.dnsName = lb.dnsName;
    this.zoneId = lb.canonicalHostedZoneId;
    this.arn = lb.arn;
  }
}