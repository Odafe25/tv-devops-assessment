import { TerraformStack, S3Backend, TerraformOutput } from "cdktf";
import { Construct }              from "constructs";
import { AwsProvider }           from "@cdktf/provider-aws/lib/provider";
import { DataAwsAvailabilityZones } from "@cdktf/provider-aws/lib/data-aws-availability-zones";
import { IamRole }               from "@cdktf/provider-aws/lib/iam-role";
import * as dotenv               from "dotenv";

import { VpcModule }      from "../modules/vpc";
import { EcrModule }      from "../modules/ecr";
import { EcsModule }      from "../modules/ecs";
import { AlbModule }      from "../modules/alb";
import { CertificateModule } from "../modules/certificate";
import { LoggingModule }  from "../modules/logging";

dotenv.config();

export class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Basic env/config
    const region     = process.env.AWS_REGION   || "us-east-1";
    const env        = process.env.ENV          || "dev";
    const domainName = process.env.DOMAIN_NAME  || "odafeturbo25.com";
    const project    = `${env}-tv-devops`;

    new AwsProvider(this, "aws", { region });

    // Remote state
    new S3Backend(this, {
      bucket:       "tv-devops-cdktf-state",
      key:          `${env}/terraform.tfstate`,
      region,
      encrypt:      true,
      dynamodbTable:"tf-locks",
    });

    // Fetch AZs dynamically
    const azs = new DataAwsAvailabilityZones(this, "azs", {});

    // VPC
    const vpc = new VpcModule(this, "vpc", {
      project,
      cidrBlock: process.env.VPC_CIDR || "10.0.0.0/16",
      azs: azs.names,
    });

    // ECR
    const ecr = new EcrModule(this, "ecr", { project });

    // IAM Roles for ECS
    const execRole = new IamRole(this, "ecsExecRole", {
      name: `${project}-exec-role`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Principal: { Service: "ecs-tasks.amazonaws.com" },
          Action: "sts:AssumeRole",
        }],
      }),
    });
    // reuse same role for task role if you want
    const taskRole = execRole;

    // ECS
    const ecs = new EcsModule(this, "ecs", {
      project,
      clusterName:     `${project}-cluster`,
      executionRoleArn: execRole.arn,
      taskRoleArn:     taskRole.arn,
      containerImage:  ecr.repositoryUrl,
      containerPort:   3000,
      subnets: vpc.publicSubnets.map(subnet => subnet.id),
      securityGroups:   [ vpc.securityGroup.id ],
    });

    // ALB
    const alb = new AlbModule(this, "alb", {
      project,
      env,
      vpc: vpc.vpc,
      subnets: vpc.publicSubnets.map(subnet => subnet.id),
      securityGroups: [ vpc.securityGroup.id ],
    });

    // Certificate + DNS
    new CertificateModule(this, "cert", {
      domainName,
      subdomain:       env,
      hostedZoneId:    alb.zoneId,
      certificateName: `${project}-cert`,
      albDnsName:      alb.dnsName,
      albZoneId:       alb.zoneId,
      env
    });

    // Logging
    new LoggingModule(this, "logging", {
      project,
    });

    // Outputs
    new TerraformOutput(this, "alb_dns", { value: alb.dnsName });
    new TerraformOutput(this, "cluster_arn", { value: ecs.clusterArn });
  }
}
