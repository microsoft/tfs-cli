import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");
import trace = require("../../lib/trace");
import fs = require("fs");
import http = require("http");
import { TLSSocket } from "tls";
import { Stream } from "stream";
import { request } from "https";

export function getCommand(args: string[]): ReleaseLogs {
	return new ReleaseLogs(args);
}

export class ReleaseLogs extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release> {
	protected description = "Download release logs to zip archive.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "releaseId"];
	}

	public exec(): Promise<releaseContracts.Release> {
		trace.debug("release-logs.exec");
		var releaseapi = this.webApi.getReleaseApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.releaseId.val().then((releaseId) => {
				return releaseapi.then((api) => { 
					return api.getRelease(project, releaseId).then((release) => {
						return releaseapi.then((api) => {
							return api.getLogs(release.projectReference.id,release.id).then((stream) => {
								var archiveName = release.name + "-" + release.id + ".zip";
								trace.info('Downloading ... ');
								stream.pipe(fs.createWriteStream(archiveName));
								trace.info('File: %s Created', archiveName);
								return release;
							})
						});
					});
				});
			});
		});
	}
	public friendlyOutput(release: releaseContracts.Release): void {
		if (!release) {
			throw new Error("no release supplied");
		}
		//trace.println();
		//trace.info("%s", release.id);
	}
}