import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("azure-devops-node-api/BuildApi");
import buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");
import fs = require("fs");

export function getCommand(args: string[]): BuildReport {
	return new BuildReport(args);
}

export class BuildReport extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
	protected description = "Download build logs to zip archive.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Promise<buildContracts.BuildReportMetadata> {
		trace.debug("build-logs.exec");
		var buildapi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return buildapi.then((api) => {
					return api.getBuild(project, buildId).then((build) => {
						return buildapi.then((api) => {
							return api.getBuildReport(build.project.name, build.id).then((report) => {				
								return report
							});
						});
					});
				});
			});
		});
	}
	public friendlyOutput(report: buildContracts.BuildReportMetadata): void {
		if (!report) {
			throw new Error("no build supplied");
		}
		trace.println();
		trace.info("build id	: %s", report.buildId);
		trace.info("%s", report.content);
	}
}