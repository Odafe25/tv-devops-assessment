import { Construct } from "constructs";
import { TerraformIterator, Fn } from "cdktf";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";

export interface VpcProps {
  project: string;
  cidrBlock: string;
  azs: string[];
}

export class VpcModule extends Construct {
  public readonly vpc: Vpc;
  public readonly publicSubnets: Subnet[];
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);
    
    this.vpc = new Vpc(this, "vpc", {
      cidrBlock: props.cidrBlock,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: { Name: `${props.project}-vpc` },
    });

    // Create a map of AZ to index for CIDR calculation
    const azToIndex: { [key: string]: number } = {};
    props.azs.forEach((az, index) => {
      azToIndex[az] = index + 1; // Start from 1 instead of 0
    });

    const azIterator = TerraformIterator.fromMap(azToIndex);
    
    const subnetResource = new Subnet(this, "subnet", {
      forEach: azIterator,
      vpcId: this.vpc.id,
      cidrBlock: `10.0.\${${azIterator.value}}.0/24`, // Use iterator.value (the numeric index)
      availabilityZone: azIterator.key, // Use iterator.key (the AZ name)
      mapPublicIpOnLaunch: true,
      tags: { 
        Name: `${props.project}-subnet-\${${azIterator.key}}` // Use AZ name in tag
      },
    });

    this.publicSubnets = [subnetResource];

    this.securityGroup = new SecurityGroup(this, "sg", {
      name: `${props.project}-sg`,
      description: "Allow HTTP",
      vpcId: this.vpc.id,
      ingress: [
        { fromPort: 80, toPort: 80, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
        { fromPort: 443, toPort: 443, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
      ],
      egress: [
        { fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] },
      ],
      tags: { Name: `${props.project}-sg` },
    });
  }
}