import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("azure-devops-node-api/BuildApi");
import buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): BuildDetails {
	return new BuildDetails(args);
}

export class BuildDetails extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
    protected serverCommand = true;
	protected description = "Display extended build details.";
	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Promise<buildContracts.Build> {
		trace.debug("build-details.exec");
		var buildapi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return buildapi.then((api) => { return api.getBuild(project, buildId); });
			});
		});

	}

	public friendlyOutput(build: buildContracts.Build): void {
		if (!build) {
			throw new Error("no build supplied");
		}

		trace.println();
		trace.info("id              : %s", build.id);
		trace.info("number (name)   : %s", build.buildNumber);
        trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
        trace.info("definition id   : %s", build.definition ? build.definition.id :"unknown");
		trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
		trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
        trace.info("result          : %s", build.result ? buildContracts.BuildResult[build.result] : "unknown")
		trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
        trace.info("start time      : %s", build.startTime ? build.startTime.toJSON() : "not started");
        trace.info("finish time     : %s", build.finishTime ? build.finishTime.toJSON() : "in progress");
        trace.info("quality         : %s", build.quality);
        trace.info("reason          : %s", buildContracts.BuildReason[build.reason]);
        trace.info("version         : %s", build.sourceVersion ? build.sourceVersion.replace("C","") : "unknown");
        trace.info("API URL         : %s", build.url); 
    }
}