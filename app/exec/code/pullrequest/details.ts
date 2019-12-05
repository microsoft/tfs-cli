import { PullRequestAsyncStatus } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require('../../../lib/arguments');
import trace = require('../../../lib/trace');
import gi = require('azure-devops-node-api/interfaces/GitInterfaces');
import git_Api = require('azure-devops-node-api/GitApi');
import VSSInterfaces = require('azure-devops-node-api/interfaces/common/VSSInterfaces');
import codedBase = require('./default');
var repositoryName;

export function getCommand(args: string[]): RequestDetails {
	return new RequestDetails(args);
}

export class RequestDetails extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Get a list of pull requests";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryName","pullrequestId"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		repositoryName = await this.commandArgs.repositoryName.val();
		var gitRepositories = await gitApi.then((api) => { return api.getRepositories(project); });
		var requestId = await this.commandArgs.pullrequestId.val();
		var gitRepository;
		gitRepositories.forEach(repo => {
			if (repo.name.toLowerCase() == repositoryName.toLowerCase()) {
				gitRepository = repo;
				return;
			};
		});

		return await gitApi.then((api) => { return api.getPullRequest(gitRepository.id, +requestId); });
	};
	
	public friendlyOutput(req: gi.GitPullRequest): void {
		if (!req) {
			throw new Error("no pull requests supplied");
		}		
			trace.info('Title		: %s', req.title);
			trace.info('Description	: %s', req.description);
			trace.info('id		: %s', req.pullRequestId);
			trace.info('Created by	: %s', req.createdBy.displayName);
			trace.info('Status		: %s',gi.PullRequestStatus[req.status]);
			trace.info('Created Date	: %s', req.creationDate.toString());
			trace.info('Merge Status	: %s', PullRequestAsyncStatus[req.mergeStatus]);
			trace.info('Last commit	: %s', req.lastMergeCommit.commitId);
			trace.info('API Url		: %s', req.url);
			trace.println();
	}
};

