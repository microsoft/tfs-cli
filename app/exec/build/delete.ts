import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("azure-devops-node-api/BuildApi");
import buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
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
		var buildapi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return this._deleteBuild(buildapi, buildId, project);
			});
		});

	}

	public friendlyOutput(build: buildContracts.Build): void {
		trace.println();
	}

	private _deleteBuild(buildapi: Promise<buildClient.IBuildApi>, buildId: number, project: string) {
		trace.info("Deleting build...")
		return buildapi.then((api) => {
			api.getBuild(project, buildId).then((build: buildContracts.Build) => {
			if (!build.keepForever) {
				build.deleted = true;
				build.status = buildContracts.BuildStatus.Completed
				build.result = buildContracts.BuildResult.Failed
				if (build.deleted && build.status == buildContracts.BuildStatus.Completed) {
					buildapi.then((api) => { api.updateBuild(build, project ,build.id) });
					buildapi.then((api) => { api.deleteBuild(build.project.name, build.id) });
					trace.info("build deleted")
				} else {
					trace.error("failed to delete")
				}
			} else {
				trace.warn("build is marked for retention");
			}
		});
	});
	}
}