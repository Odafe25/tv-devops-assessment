import { App, TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import * as aws from "@cdktf/provider-aws";
import * as acm from "@cdktf/provider-aws/lib/acm";
import * as route53 from "@cdktf/provider-aws/lib/route53";
import * as dotenv from "dotenv";
import { Fn } from "cdktf";

dotenv.config();

const app = new App();

class InfraStack extends TerraformStack {
  constructor(scope: App, id: string) {
    super(scope, id);

    const region = process.env.AWS_REGION || "us-east-1";
    const env = process.env.ENV || "dev";
    const domainName = process.env.DOMAIN_NAME || "odafeturbo25.com";
    const subdomain = `${env}.${domainName}`;
    const project = `${env}-tv-devops`;

    new AwsProvider(this, "aws", { region });

    // Remote backend setup
    const tfStateBucket = new aws.s3.S3Bucket(this, "tf-state-bucket", {
      bucket: "tv-devops-cdktf-state",
      versioning: { enabled: true },
      lifecycle: [{ preventDestroy: true }],
      tags: { Name: "CDKTF State Bucket" },
    });

    const lockTable = new aws.dynamodb.DynamodbTable(this, "tf-lock-table", {
      name: "tf-locks",
      billingMode: "PAY_PER_REQUEST",
      hashKey: "LockID",
      attribute: [{ name: "LockID", type: "S" }],
      lifecycle: [{ preventDestroy: true }],
      tags: { Name: "CDKTF Lock Table" },
    });

    new S3Backend(this, {
      bucket: tfStateBucket.bucket,
      key: `${env}/terraform.tfstate`,
      region,
      dynamodbTable: lockTable.name,
      encrypt: true,
    });

    // Networking
    const vpc = new aws.vpc.Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: { Name: `${project}-vpc` },
    });

    const azs = ["a", "b"];
    const subnets = azs.map((az, index) =>
      new aws.vpc.Subnet(this, `subnet-${az}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index + 1}.0/24`,
        availabilityZone: `${region}${az}`,
        mapPublicIpOnLaunch: true,
        tags: { Name: `${project}-subnet-${az}` },
      })
    );

    const igw = new aws.vpc.InternetGateway(this, "igw", {
      vpcId: vpc.id,
      tags: { Name: `${project}-igw` },
    });

    const routeTable = new aws.vpc.RouteTable(this, "rt", {
      vpcId: vpc.id,
    });

    new aws.vpc.Route(this, "default-route", {
      routeTableId: routeTable.id,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    });

    subnets.forEach((subnet, i) => {
      new aws.vpc.RouteTableAssociation(this, `rta-${i}`, {
        subnetId: subnet.id,
        routeTableId: routeTable.id,
      });
    });

    const sg = new aws.vpc.SecurityGroup(this, "ecs-sg", {
      vpcId: vpc.id,
      ingress: [
        { fromPort: 80, toPort: 80, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
        { fromPort: 443, toPort: 443, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
      ],
      egress: [
        { fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] },
      ],
      tags: { Name: `${project}-sg` },
    });

    const hostedZone = new route53.DataAwsRoute53Zone(this, "hosted-zone", {
      name: domainName,
      privateZone: false,
    });

    const certificate = new acm.AcmCertificate(this, "acm-cert", {
      domainName: subdomain,
      validationMethod: "DNS",
      lifecycle: { createBeforeDestroy: true },
      tags: { Name: `${project}-cert` },
    });

    const certValidationRecord = new route53.Route53Record(this, "cert-validation", {
      zoneId: hostedZone.zoneId,
      name: certificate.domainValidationOptions.get(0).resourceRecordName,
      type: certificate.domainValidationOptions.get(0).resourceRecordType,
      ttl: 60,
      records: [certificate.domainValidationOptions.get(0).resourceRecordValue],
    });

    new acm.AcmCertificateValidation(this, "acm-validation", {
      certificateArn: certificate.arn,
      validationRecordFqdns: [certValidationRecord.fqdn],
    });

    const ecrRepo = new aws.ecr.EcrRepository(this, "ecr", {
      name: `${project}-repo`,
    });

    const cluster = new aws.ecs.EcsCluster(this, "ecs-cluster", {
      name: `${project}-cluster`,
    });

    const taskExecRole = new aws.iam.IamRole(this, "ecs-task-exec-role", {
      name: `${project}-exec-role`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "ecs-tasks.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });

    new aws.iam.IamRolePolicyAttachment(this, "exec-policy", {
      role: taskExecRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    const logGroup = new aws.cloudwatch.CloudwatchLogGroup(this, "ecs-log-group", {
      name: `/ecs/${project}`,
      retentionInDays: 7,
      tags: { Environment: env },
    });

    const containerImage = process.env.ECR_IMAGE || `${ecrRepo.repositoryUrl}:latest`;

    const taskDef = new aws.ecs.EcsTaskDefinition(this, "task", {
      family: `${project}-task`,
      cpu: "256",
      memory: "512",
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      executionRoleArn: taskExecRole.arn,
      containerDefinitions: Fn.jsonencode([
        {
          name: "app",
          image: containerImage,
          essential: true,
          portMappings: [{ containerPort: 3000 }],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": logGroup.name,
              "awslogs-region": region,
              "awslogs-stream-prefix": "ecs",
            },
          },
        },
      ]),
    });

    const lb = new aws.lb.Lb(this, "lb", {
      name: `${project}-lb`,
      internal: false,
      loadBalancerType: "application",
      securityGroups: [sg.id],
      subnets: subnets.map((s) => s.id),
    });

    const tg = new aws.lb.LbTargetGroup(this, "tg", {
      name: `${project}-tg`,
      port: 3000,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: vpc.id,
    });

    new aws.lb.LbListener(this, "http-listener", {
      loadBalancerArn: lb.arn,
      port: 80,
      protocol: "HTTP",
      defaultAction: [
        {
          type: "redirect",
          redirect: {
            port: "443",
            protocol: "HTTPS",
            statusCode: "HTTP_301",
          },
        },
      ],
    });

    new aws.lb.LbListener(this, "https-listener", {
      loadBalancerArn: lb.arn,
      port: 443,
      protocol: "HTTPS",
      sslPolicy: "ELBSecurityPolicy-2016-08",
      certificateArn: certificate.arn,
      defaultAction: [{ type: "forward", targetGroupArn: tg.arn }],
    });

    new route53.Route53Record(this, "alb-dns", {
      zoneId: hostedZone.zoneId,
      name: subdomain,
      type: "A",
      alias: {
        name: lb.dnsName,
        zoneId: lb.zoneId,
        evaluateTargetHealth: true,
      },
    });

    new aws.ecs.EcsService(this, "ecs-service", {
      name: `${project}-service`,
      cluster: cluster.id,
      desiredCount: env === "prod" ? 3 : env === "staging" ? 2 : 1,
      launchType: "FARGATE",
      taskDefinition: taskDef.arn,
      networkConfiguration: {
        assignPublicIp: true,
        subnets: subnets.map((s) => s.id),
        securityGroups: [sg.id],
      },
      loadBalancers: [
        {
          containerName: "app",
          containerPort: 3000,
          targetGroupArn: tg.arn,
        },
      ],
    });

    new aws.cloudwatch.CloudwatchMetricAlarm(this, "cpu-alarm", {
      alarmName: `${project}-high-cpu`,
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 2,
      metricName: "CPUUtilization",
      namespace: "AWS/ECS",
      period: 60,
      statistic: "Average",
      threshold: 75,
      dimensions: {
        ClusterName: cluster.name,
        ServiceName: `${project}-service`,
      },
      alarmDescription: "Triggered when ECS CPU > 75%",
    });
  }
}

new InfraStack(app, "tv-devops");
app.synth();
