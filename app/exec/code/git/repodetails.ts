import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import gi = require('vso-node-api/interfaces/GitInterfaces');
import git_Api = require('vso-node-api/GitApi')
import VSSInterfaces = require("vso-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("./default");
import TfsCoreInterfaces = require("vso-node-api/interfaces/CoreInterfaces");

export function getCommand(args: string[]): GetRepositoryDetails {
	return new GetRepositoryDetails(args);
}

export class GetRepositoryDetails extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Get a git repository details";

	protected getHelpArgs(): string[] {
		return ["repositoryid"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi: git_Api.IGitApi = this.webApi.getGitApi();
		var id = await this.commandArgs.repositoryid.val();
		return await gitApi.getRepository(id);
	};

	public friendlyOutput(data: gi.GitRepository): void {
		if (!data) {
			throw new Error("no repository supplied");
		}
		console.log(' ');
		trace.println();
		trace.info('name			: %s', data.name);
		trace.info('id       		: %s', data.id);
		trace.info('clone (https)		: %s', data.remoteUrl);
		trace.info('clone (ssh)		: %s', data.remoteUrl.replace("https", "ssh").replace(".visualstudio.com","@vs-ssh.visualstudio.com:22").replace("_git","_ssh"));
		trace.info('API URL			: %s', data.url);
	}

};
