import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("azure-devops-node-api/BuildApi");
import buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function describe(): string {
	return "change build retention policy";
}

export function getCommand(args: string[]): BuildKeep {
	return new BuildKeep(args);
}

export class BuildKeep extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
    protected serverCommand = true;
	protected description = "change build retention policy.";

	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Promise<buildContracts.Build> {
		trace.debug("keep-build.exec");
		var buildapi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return this._keepBuild(buildapi, buildId, project);
			});
		});

	}

	public friendlyOutput(build: buildContracts.Build): void {
		trace.println();
	}

	private _keepBuild(buildapi: Promise<buildClient.IBuildApi>, buildId: number, project: string) :Promise<buildContracts.Build> {
		trace.info("Searching for build...")
        return buildapi.then((api) => { 
			return api.getBuild(project, buildId).then((build: buildContracts.Build) => {
				if (build.keepForever) {
					trace.warn("Retention unlocked for %s", build.buildNumber);
					build.keepForever = false;
				} else {
					trace.warn("Build %s Retained indefinatly", build.buildNumber);
					build.keepForever = true;                  
				}
				return buildapi.then((api) => { return api.updateBuild(build, project, build.id); });
			});
		});
	}
}