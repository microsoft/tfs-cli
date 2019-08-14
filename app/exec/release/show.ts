import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): ReleaseShow {
	return new ReleaseShow(args);
}

export class ReleaseShow extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release> {
	protected description = "Show release details.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "releaseId"];
	}

	public async exec(): Promise<releaseContracts.Release> {
		trace.debug("release-show.exec");
		var releaseapi: releaseClient.IReleaseApi = await this.webApi.getReleaseApi();
		return this.commandArgs.project.val().then(project => {
			return this.commandArgs.releaseId.val().then(releaseId => {
				return releaseapi.getRelease(project, releaseId);
			});
		});
	}

	public friendlyOutput(release: releaseContracts.Release): void {
		if (!release) {
			throw new Error("no release supplied");
		}

		trace.println();
		trace.info("id              : %s", release.id);
		trace.info("definition name : %s", release.releaseDefinition ? release.releaseDefinition.name : "unknown");
		trace.info("requested by    : %s", release.createdBy ? release.createdBy.displayName : "unknown");
		trace.info("status          : %s", releaseContracts.ReleaseStatus[release.status]);
	}
}
