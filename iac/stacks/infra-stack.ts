import { TerraformStack, S3Backend, Fn, TerraformOutput } from "cdktf";
import { Construct } from "constructs";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import * as dotenv from "dotenv";
import { VpcModule } from "../modules/vpc";
import { EcrModule } from "../modules/ecr";
import { EcsModule } from "../modules/ecs";
import { AlbModule } from "../modules/alb";
import { CertModule } from "../modules/certificate";
import { LoggingModule } from "../modules/logging";

dotenv.config();

export class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const region = process.env.AWS_REGION || "us-east-1";
    const env = process.env.ENV || "dev";
    const domainName = process.env.DOMAIN_NAME || "odafeturbo25.com";
    const project = `${env}-tv-devops`;

    new AwsProvider(this, "aws", { region });

    // Remote backend
    new S3Backend(this, {
      bucket: "tv-devops-cdktf-state",
      key: `${env}/terraform.tfstate`,
      region,
      encrypt: true,
      dynamodbTable: "tf-locks",
    });

    // Network (VPC)
    const vpc = new VpcModule(this, "vpc", { env, region, project });

    // ECR
    const repo = new EcrModule(this, "ecr", { project });

    // ECS
    const ecsCluster = new EcsModule(this, "ecs", {
      env,
      project,
      vpc,
      repoUrl: repo.repositoryUrl,
    });

    // ALB + HTTPS
    const alb = new AlbModule(this, "alb", {
      env,
      project,
      vpc,
      subnets: vpc.subnets,
      securityGroups: vpc.securityGroupIds,
    });

    // Certificate + DNS
    new CertModule(this, "cert", {
      env,
      domainName,
      hostedZoneId: alb.hostedZoneId,
      subdomain: `${env}.${domainName}`,
      certificateName: `${project}-cert`,
      albDnsName: alb.dnsName,
      albZoneId: alb.zoneId,
    });

    // Logging & Alerts
    new LoggingModule(this, "logging", { env, project, clusterName: ecsCluster.clusterName });

    // Outputs
    new TerraformOutput(this, "alb_dns", { value: alb.dnsName });
  }
}
