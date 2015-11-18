import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("vso-node-api/BuildApi");
import buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): BuildShow {
	return new BuildShow(args);
}

export class BuildShow extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
	protected description = "Show build details.";

	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Q.Promise<buildContracts.Build> {
		trace.debug("build-show.exec");
		var buildapi: buildClient.IQBuildApi = this.webApi.getQBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return buildapi.getBuild(buildId, project);
			});
		});

	}

	public friendlyOutput(build: buildContracts.Build): void {
		if (!build) {
			throw new Error("no build supplied");
		}

		trace.println();
		trace.info("id              : %s", build.id);
		trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
		trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
		trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
		trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
	}
}