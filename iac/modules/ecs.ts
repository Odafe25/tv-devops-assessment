import { Construct } from "constructs";
import { EcsCluster } from "@cdktf/provider-aws/lib/ecs-cluster";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { EcsTaskDefinition } from "@cdktf/provider-aws/lib/ecs-task-definition";
import { EcsService } from "@cdktf/provider-aws/lib/ecs-service";

export interface EcsProps {
  project: string;
  clusterName: string;
  executionRoleArn: string;
  taskRoleArn: string;
  containerImage: string;
  containerPort: number;
}

export class EcsModule extends Construct {
  public readonly clusterArn: string;

  constructor(scope: Construct, id: string, props: EcsProps) {
    super(scope, id);

    const cluster = new EcsCluster(this, "cluster", {
      name: props.clusterName,
    });

    new IamRolePolicyAttachment(this, "execAttach", {
      role: props.executionRoleArn,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    const taskDef = new EcsTaskDefinition(this, "taskDef", {
      family: `${props.project}-task`,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "256",
      memory: "512",
      executionRoleArn: props.executionRoleArn,
      taskRoleArn: props.taskRoleArn,
      containerDefinitions: JSON.stringify([{ name: props.project, image: props.containerImage, portMappings: [{ containerPort: props.containerPort }], essential: true }]),
    });

    new EcsService(this, "service", {
      name: `${props.project}-service`,
      cluster: cluster.arn,
      taskDefinition: taskDef.arn,
      desiredCount: 1,
      launchType: "FARGATE",
      networkConfiguration: [{ subnets: [], securityGroups: [], assignPublicIp: true }],
    });

    this.clusterArn = cluster.arn;
  }
}
