import { PullRequestAsyncStatus } from 'vso-node-api/interfaces/GitInterfaces';
import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require('../../../lib/arguments');
import trace = require('../../../lib/trace');
import gi = require('vso-node-api/interfaces/GitInterfaces');
import git_Api = require('vso-node-api/GitApi');
import VSSInterfaces = require('vso-node-api/interfaces/common/VSSInterfaces');
import codedBase = require('./default');
var repositoryName;

export function getCommand(args: string[]): RequestDetails {
	return new RequestDetails(args);
}

export class RequestDetails extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Get a list of pull requests";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryname","pullrequestid"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi: git_Api.IGitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		repositoryName = await this.commandArgs.repositoryname.val();
		var gitRepositories = await gitApi.getRepositories(project);
		var requestId = await this.commandArgs.pullrequestid.val();
		var gitRepositorie;
		gitRepositories.forEach(repo => {
			if (repo.name.toLowerCase() == repositoryName.toLowerCase()) {
				gitRepositorie = repo;
				return;
			};
		});
		var request = await gitApi.getPullRequest(gitRepositorie.id, +requestId);
		return request.completionOptions;
	};
	
	public friendlyOutput(opt: gi.GitPullRequestCompletionOptions): void {
		if (!opt) {
			throw new Error("no pull requests supplied");
		}		
			trace.info('Source Branch		: %s', opt.deleteSourceBranch);
			trace.info('Commit Message	: %s', opt.mergeCommitMessage);
			trace.info('Squash Merge		: %s', opt.squashMerge);
			trace.println();
	}
};

