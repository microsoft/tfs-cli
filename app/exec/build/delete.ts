import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("vso-node-api/BuildApi");
import buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function describe(): string {
	return "delete a build";
}

export function getCommand(args: string[]): BuildDelete {
	return new BuildDelete(args);
}

export class BuildDelete extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
    protected serverCommand = true;
	protected description = "Delete a build.";

	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Promise<void> {
		trace.debug("delete-build.exec");
		var buildapi: buildClient.IBuildApi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return this._deleteBuild(buildapi, buildId, project);
			});
		});

	}

	public friendlyOutput(build: buildContracts.Build): void {
		trace.println();
	}

	private _deleteBuild(buildapi: buildClient.IBuildApi, buildId: number, project: string) {
		trace.info("Deleting build...")
        buildapi.deleteBuild(buildId,project)
        return buildapi.getBuild(buildId,project).then((build: buildContracts.Build) => {
        if (!build.keepForever) {
			build.deleted = true;
			if (build.deleted) {
				trace.info("build deleted")
			} else {
				trace.error("failed to delete")
			}
		} else {
			trace.warn("build is marked for retention");
		}
			
        });
	}
}