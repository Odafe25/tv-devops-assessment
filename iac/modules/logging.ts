import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";

export interface LoggingProps { env: string; project: string; clusterName: string; }
export class LoggingModule extends Construct {
  constructor(scope: Construct, id: string, props: LoggingProps) {
    super(scope, id);
    new aws.cloudwatch.CloudwatchLogGroup(this, "log-group", {
      name: `/ecs/${props.project}`,
      retentionInDays: 7,
    });

    new aws.cloudwatch.CloudwatchMetricAlarm(this, "cpu-alarm", {
      alarmName: `${props.project}-high-cpu`,
      namespace: "AWS/ECS", metricName: "CPUUtilization",
      period: 60, evaluationPeriods: 2, threshold: 75,
      comparisonOperator: "GreaterThanThreshold",
      dimensions: { ClusterName: props.clusterName, ServiceName: `${props.project}-service` },
    });
  }
}