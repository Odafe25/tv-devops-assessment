import { App } from "cdktf";
import { InfraStack } from "./stacks/infra-stack";

const app = new App();
new InfraStack(app, "tv-devops");
app.synth();
