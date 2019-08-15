import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): ReleaseAbandon {
	return new ReleaseAbandon(args);
}

export class ReleaseAbandon extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release> {
	protected description = "Abandon release.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "releaseId"];
	}

	public async exec(): Promise<releaseContracts.Release> {
		trace.debug("release-show.exec");
		var releaseapi: releaseClient.IReleaseApi = await this.webApi.getReleaseApi();
		return this.commandArgs.project.val().then(project => {
			return this.commandArgs.releaseId.val().then(releaseId => {
				return releaseapi.getRelease(project, releaseId).then(release => {
					const releaseReference = <releaseContracts.Release>({
						name: release.name,
						id: release.id,
						environments: release.environments,
						artifacts: release.artifacts,
						variableGroups: release.variableGroups,
						status: releaseContracts.ReleaseStatus.Abandoned,
						comment: "release abandoned from tfx"
					});
					return releaseapi.updateRelease(releaseReference,project,release.id).then(updatedRelease => {
						return updatedRelease;
					})
					
				});
			});
		});
	}

	public friendlyOutput(release: releaseContracts.Release): void {
		if (!release) {
			throw new Error("no release supplied");
		}

		trace.println();
		trace.info("id              : %s", release.id);
		trace.info("name            : %s", release.name);
		trace.info("definition name : %s", release.releaseDefinition ? release.releaseDefinition.name : "unknown");
		trace.info("requested by    : %s", release.createdBy ? release.createdBy.displayName : "unknown");
		trace.info("status          : %s", releaseContracts.ReleaseStatus[release.status]);
	}
}