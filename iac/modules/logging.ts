import { Construct } from "constructs";
import { CloudwatchLogGroup } from "@cdktf/provider-aws/lib/cloudwatch-log-group";

export interface LoggingProps {
  project: string;
  retentionInDays?: number;
}

export class LoggingModule extends Construct {
  public readonly logGroupName: string;

  constructor(scope: Construct, id: string, props: LoggingProps) {
    super(scope, id);
    const logGroup = new CloudwatchLogGroup(this, "logGroup", {
      name: `${props.project}-logs`,
      retentionInDays: props.retentionInDays ?? 14,
    });
    this.logGroupName = logGroup.name;
  }
}