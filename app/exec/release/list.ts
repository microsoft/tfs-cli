import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");

import trace = require("../../lib/trace");

export function getCommand(args: string[]): ReleaseGetList {
	return new ReleaseGetList(args);
}

export class ReleaseGetList extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release[]> {
	protected description = "Get a list of Releases.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["definitionId", "definitionName", "status", "top", "project"];
	}

	public async exec(): Promise<releaseContracts.Release[]> {
		trace.debug("build-list.exec");
		var releaseapi: releaseClient.IReleaseApi = await this.webApi.getReleaseApi();

		return Promise.all<number | string>([
			this.commandArgs.project.val(),
			this.commandArgs.definitionId.val(),
			this.commandArgs.definitionName.val(),
			this.commandArgs.status.val(),
			this.commandArgs.top.val(),
		]).then(values => {
			const [project, definitionId, definitionName, status, top] = values;
			var definitions: number = null;
			if (definitionId) {
				definitions = definitionId as number;
			} else if (definitionName) {
				trace.debug("No definition Id provided, checking for definitions with name " + definitionName);
				return releaseapi.getReleaseDefinitions(project as string, definitionName as string)
					.then((defs: releaseContracts.ReleaseDefinitionShallowReference[]) => {
						if (defs.length > 0) {
							definitions = defs[0].id;
							return this._getReleases(
								releaseapi,
								project as string,
								definitions,
								releaseContracts.ReleaseStatus[status],
								top as number,
							);
						} else {
							trace.debug("No definition found with name " + definitionName);
							throw new Error("No definition found with name " + definitionName);
						}
					});
			}
			return this._getReleases(releaseapi, project as string, definitions, releaseContracts.ReleaseStatus[status], top as number);
		});
	}

	public friendlyOutput(data: releaseContracts.Release[]): void {
		if (!data) {
			throw new Error("no release supplied");
		}

		if (!(data instanceof Array)) {
			throw new Error("expected an array of builds");
		}

		data.forEach(release => {
			trace.println();
			trace.info("id              : %s", release.id);
			trace.info("definition name : %s", release.releaseDefinition  ? release.releaseDefinition.name : "unknown");
			trace.info("created by	    : %s", release.createdBy ? release.createdBy.displayName : "unknown");
			trace.info("status          : %s", releaseContracts.ReleaseStatus[release.status]);
		});
	}

	private _getReleases(releaseapi: releaseClient.IReleaseApi, project: string, definitions: number, status: string, top: number) {
		// I promise that this was as painful to write as it is to read
		return releaseapi.getReleases(
			project,
			definitions,
			null,
			null,
			null,
			releaseContracts.ReleaseStatus[status],
			null,
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
			null,
			null,
		);
	}
}
