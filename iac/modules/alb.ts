import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";

export interface AlbProps { env: string; project: string; vpc: any; subnets: any[]; securityGroups: string[]; }
export class AlbModule extends Construct {
  public readonly dnsName: string;
  public readonly zoneId: string;

  constructor(scope: Construct, id: string, props: AlbProps) {
    super(scope, id);
    const lb = new aws.lb.Lb(this, "lb", {
      name: `${props.project}-lb`,
      internal: false,
      loadBalancerType: "application",
      securityGroups: props.securityGroups,
      subnets: props.subnets,
    });

    const tg = new aws.lb.LbTargetGroup(this, "tg", {
      name: `${props.project}-tg`,
      port: 3000,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: props.vpc.vpc.id,
    });

    new aws.lb.LbListener(this, "http-listener", {
      loadBalancerArn: lb.arn,
      port: 80,
      protocol: "HTTP",
      defaultAction: [{ type: "redirect", redirect: { port: "443", protocol: "HTTPS", statusCode: "HTTP_301" } }],
    });

    this.dnsName = lb.dnsName;
    this.zoneId = lb.zoneId;
  }
}