import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("vso-node-api/BuildApi");
import buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): BuildLogs {
	return new BuildLogs(args);
}

export class BuildLogs extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
	protected description = "Show build details.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Promise<buildContracts.Build> {
		trace.debug("build-show.exec");
		var buildapi: buildClient.IBuildApi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return buildapi.getBuild(buildId, project).then((build) => {
					return buildapi.getBuildTimeline(project, buildId).then((timeline) => {
						for (var i = 1, len = timeline.records.length; i < len; i++) {
							this._printLines(timeline, buildapi, project, buildId, i);
						}
						return build;
					});
				});
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

	private _printLines(timeline: buildContracts.Timeline, buildApi: buildClient.IBuildApi, project: string, buildId: number, recordId: number) {
		if (timeline.records[recordId].type == "Task") {
			return buildApi.getBuildLogLines(project, buildId, recordId).then((lines) => {
				for (var j = 0, len = lines.length; j < len; j++) {
					trace.info(lines[j]);
				}
			});
		}
	}
}