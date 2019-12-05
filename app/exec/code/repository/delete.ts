import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require('../../../lib/arguments');
import trace = require('../../../lib/trace');
import gi = require('azure-devops-node-api/interfaces/GitInterfaces');
import git_Api = require('azure-devops-node-api/GitApi')
import VSSInterfaces = require("azure-devops-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("./default");
import TfsCoreInterfaces = require("azure-devops-node-api/interfaces/CoreInterfaces");

export function getCommand(args: string[]): DeleteRepository {
	return new DeleteRepository(args);
}

export class DeleteRepository extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Create a git repository";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryId"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		var repositoryid = await this.commandArgs.repositoryId.val();
		return await gitApi.then((api) => { return api.deleteRepository(repositoryid, project); });
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
