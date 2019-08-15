import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");
import trace = require("../../lib/trace");

export function describe(): string {
	return "delete a release";
}

export function getCommand(args: string[]): ReleaseDelete {
	return new ReleaseDelete(args);
}

export class ReleaseDelete extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release> {
    protected serverCommand = true;
	protected description = "Delete a release.";

	protected getHelpArgs(): string[] {
		return ["project", "releaseId"];
	}

	public exec(): Promise<void> {
		trace.debug("delete-release.exec");
		var releaseapi = this.webApi.getReleaseApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.releaseId.val().then((releaseId) => {
				return this._deleteRelease(releaseapi, releaseId, project);
			});
		});

	}

	public friendlyOutput(build: releaseContracts.Release): void {
		trace.println();
	}

	private _deleteRelease(releaseapi: Promise<releaseClient.IReleaseApi>, releaseId: number, project: string) {
		trace.info("Deleting release...")
		return releaseapi.then((api) => {
			api.getRelease(project, releaseId).then((release: releaseContracts.Release) => {
			if (!release.keepForever) {
				release.status = releaseContracts.ReleaseStatus.Abandoned;
				releaseapi.then((api) => { api.updateRelease(release,release.projectReference.name, release.id) });
				releaseapi.then((api) => { api.deleteRelease(release.projectReference.name, release.id) });
				trace.info("release deleted")
			} else {
				trace.warn("release is marked for retention");
			}
		});
	});
	}
}