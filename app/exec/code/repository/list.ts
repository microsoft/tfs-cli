import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require('../../../lib/arguments');
import trace = require('../../../lib/trace');
import gi = require('azure-devops-node-api/interfaces/GitInterfaces');
import git_Api = require('azure-devops-node-api/GitApi')
import VSSInterfaces = require("azure-devops-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("./default");
import TfsCoreInterfaces = require("azure-devops-node-api/interfaces/CoreInterfaces");

export function getCommand(args: string[]): ListRepositories {
	return new ListRepositories(args);
}

export class ListRepositories extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Create a git repository";

	protected getHelpArgs(): string[] {
		return ["project"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		return await gitApi.then((api) => { return api.getRepositories(project); });
	};

	public friendlyOutput(data: gi.GitRepository[]): void {
		if (!data) {
			throw new Error("no repository supplied");
		}
		console.log(' ');
		data.forEach((repo) =>{
			trace.println();
			trace.info('name     : %s', repo.name);
			trace.info('id       : %s', repo.id);
		});
	}

};
