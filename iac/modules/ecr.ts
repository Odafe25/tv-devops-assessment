import { Construct } from "constructs";
import { EcrRepository } from "@cdktf/provider-aws/lib/ecr-repository";

export interface EcrProps {
  project: string;
}

export class EcrModule extends Construct {
  public readonly repositoryUrl: string;

  constructor(scope: Construct, id: string, props: EcrProps) {
    super(scope, id);

    const repo = new EcrRepository(this, "repo", {
      name: props.project,
    });

    this.repositoryUrl = repo.repositoryUrl;
  }
}