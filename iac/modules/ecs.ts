import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";
import { Fn } from "cdktf";

export interface EcsProps { env: string; project: string; vpc: any; repoUrl: string; }
export class EcsModule extends Construct {
  public readonly clusterName: string;

  constructor(scope: Construct, id: string, props: EcsProps) {
    super(scope, id);
    const cluster = new aws.ecs.EcsCluster(this, "cluster", {
      name: `${props.project}-cluster`,
    });
    this.clusterName = cluster.name;

    const role = new aws.iam.IamRole(this, "exec-role", {
      name: `${props.project}-exec-role`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Principal: { Service: "ecs-tasks.amazonaws.com" }, Action: "sts:AssumeRole" }],
      }),
    });

    new aws.iam.IamRolePolicyAttachment(this, "exec-policy", {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    new aws.ecs.EcsTaskDefinition(this, "task", {
      family: `${props.project}-task`, 
      executionRoleArn: role.arn,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "256",
      memory: "512",
      containerDefinitions: Fn.jsonencode([
        { name: "app", image: props.repoUrl, essential: true, portMappings: [{ containerPort: 3000 }] }
      ]),
    });
  }
}