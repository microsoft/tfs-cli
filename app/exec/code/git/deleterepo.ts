import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import gi = require('vso-node-api/interfaces/GitInterfaces');
import git_Api = require('vso-node-api/GitApi')
import VSSInterfaces = require("vso-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("./default");
import TfsCoreInterfaces = require("vso-node-api/interfaces/CoreInterfaces");

export function getCommand(args: string[]): DeleteRepository {
	return new DeleteRepository(args);
}

export class DeleteRepository extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Create a git repository";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryid"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi: git_Api.IGitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		var repositoryid = await this.commandArgs.repositoryid.val();
		return await gitApi.deleteRepository(repositoryid,project);
	};

	public friendlyOutput(data: gi.GitRepository): void {
		if (!data) {
			trace.warn("repository deleted");
		} else {
			console.log(' ');
			trace.error('unable to delte repository');
			trace.info('name     : %s', data.name);
			trace.info('id       : %s', data.id);
		}
	}
};
