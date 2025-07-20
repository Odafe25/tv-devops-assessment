import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";

export interface VpcProps { env: string; region: string; project: string; }
export class VpcModule extends Construct {
  public readonly subnets: aws.vpc.Subnet[];
  public readonly securityGroupIds: string[];

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    const vpc = new aws.vpc.Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: { Name: `${props.project}-vpc` },
    });

    const azs = ["a", "b"];
    this.subnets = azs.map((az, i) =>
      new aws.vpc.Subnet(this, `subnet-${az}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${i + 1}.0/24`,
        availabilityZone: `${props.region}${az}`,
        mapPublicIpOnLaunch: true,
        tags: { Name: `${props.project}-subnet-${az}` },
      })
    );

    const sg = new aws.vpc.SecurityGroup(this, "sg", {
      vpcId: vpc.id,
      ingress: [
        { fromPort: 80, toPort: 80, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
        { fromPort: 443, toPort: 443, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
      ],
      egress: [{ fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] }],
      tags: { Name: `${props.project}-sg` },
    });

    this.securityGroupIds = [sg.id];
  }
}