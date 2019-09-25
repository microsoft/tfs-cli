import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("azure-devops-node-api/BuildApi");
import buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");
import fs = require("fs");
import { TLSSocket } from "tls";
import { Stream } from "stream";

export function getCommand(args: string[]): BuildTimeline {
	return new BuildTimeline(args);
}

export class BuildTimeline extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
	protected description = "Download build timeline records to json file.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "buildId"];
	}

	public exec(): Promise<buildContracts.Timeline> {
		trace.debug("build-timeline.exec");
		var buildapi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.buildId.val().then((buildId) => {
				return buildapi.then((api) => { 
					return api.getBuild(project, buildId).then((build) => {
						return buildapi.then((api) => {
							return api.getBuildTimeline(build.project.name, build.id).then((timeline) => {
								var filename = build.definition.name + "-" + build.buildNumber + "_" + build.id + ".json";
								trace.info('Downloading ... ');
								fs.writeFile(filename, JSON.stringify(timeline), function (err) {
									if (err) {
										trace.error(err);
									}
								});
								trace.info('File: %s Created', filename);
								return timeline;
							});
						});
					});
				});
			});
		});
	}
	public friendlyOutput(timeline: buildContracts.Timeline): void {
		if (!timeline) {
			throw new Error("no build supplied");
		}
		trace.println();
		trace.info("%s", timeline.id);
	}
}