import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("vso-node-api/BuildApi");
import buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): BuildGetList {
	return new BuildGetList(args);
}

export class BuildGetList extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build[]> {
	protected description = "Get a list of builds.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["definitionId", "definitionName", "status", "top", "project"];
	}

	public exec(): Promise<buildContracts.Build[]> {
		trace.debug("build-list.exec");
		var buildapi: buildClient.IBuildApi = this.webApi.getBuildApi();

		return Promise.all<number | string>([
			this.commandArgs.project.val(),
			this.commandArgs.definitionId.val(),
			this.commandArgs.definitionName.val(),
			this.commandArgs.status.val(),
			this.commandArgs.top.val(),
		]).then(values => {
			const [project, definitionId, definitionName, status, top] = values;
			var definitions: number[] = null;
			if (definitionId) {
				definitions = [definitionId as number];
			} else if (definitionName) {
				trace.debug("No definition Id provided, checking for definitions with name " + definitionName);
				return buildapi
					.getDefinitions(project as string, definitionName as string)
					.then((defs: buildContracts.DefinitionReference[]) => {
						if (defs.length > 0) {
							definitions = [defs[0].id];
							return this._getBuilds(
								buildapi,
								project as string,
								definitions,
								buildContracts.BuildStatus[status],
								top as number,
							);
						} else {
							trace.debug("No definition found with name " + definitionName);
							throw new Error("No definition found with name " + definitionName);
						}
					});
			}
			return this._getBuilds(buildapi, project as string, definitions, buildContracts.BuildStatus[status], top as number);
		});
	}

	public friendlyOutput(data: buildContracts.Build[]): void {
		if (!data) {
			throw new Error("no build supplied");
		}

		if (!(data instanceof Array)) {
			throw new Error("expected an array of builds");
		}

		data.forEach(build => {
			trace.println();
			trace.info("id              : %s", build.id);
			trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
			trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
			trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
			trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
		});
	}

	private _getBuilds(buildapi: buildClient.IBuildApi, project: string, definitions: number[], status: string, top: number) {
		// I promise that this was as painful to write as it is to read
		return buildapi.getBuilds(
			project,
			definitions,
			null,
			null,
			null,
			null,
			null,
			null,
			buildContracts.BuildStatus[status],
			null,
			null,
			null,
			top,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		);
	}
}
