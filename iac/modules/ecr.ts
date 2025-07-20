import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";

export interface EcrProps { project: string; }
export class EcrModule extends Construct {
  public readonly repositoryUrl: string;

  constructor(scope: Construct, id: string, props: EcrProps) {
    super(scope, id);
    const repo = new aws.ecr.EcrRepository(this, "repo", {
      name: `${props.project}-repo`,
    });
    this.repositoryUrl = repo.repositoryUrl;
  }
}