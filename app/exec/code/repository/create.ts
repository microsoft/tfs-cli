import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import gi = require('azure-devops-node-api/interfaces/GitInterfaces');
import git_Api = require('azure-devops-node-api/GitApi')
import VSSInterfaces = require("azure-devops-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("./default");
import TfsCoreInterfaces = require("azure-devops-node-api/interfaces/CoreInterfaces");

export function getCommand(args: string[]): CreateRepository {
	return new CreateRepository(args);
}
class GR implements gi.GitRepository{
	_links: any;
	defaultBranch: string;
	id: string;
	name: string;
	project: TfsCoreInterfaces.TeamProjectReference;
	remoteUrl: string;
	url: string;
	validRemoteUrls: string[];
}

export class CreateRepository extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Create a git repository";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryName"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		var repositoryName = await this.commandArgs.repositoryName.val();
		var NewRepo:GR = new GR;
		NewRepo.name = repositoryName;
		return await gitApi.then((api) => { return api.createRepository(NewRepo, project); });
	};

	public friendlyOutput(data: gi.GitRepository): void {
		if (!data) {
			throw new Error("no pull requests supplied");
		}
		console.log(' ');
		success('New repository created');
		trace.info('name     : %s', data.name);
		trace.info('id       : %s', data.id);

	}

};
