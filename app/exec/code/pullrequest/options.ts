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

export function getCommand(args: string[]): RequestOptions {
	return new RequestOptions(args);
}

export class RequestOptions extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "view options of a pull request";

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
		var request = await gitApi.then((api) => { return api.getPullRequest(gitRepository.id, +requestId); });
		var gprco = request.completionOptions as GPRCO;
		gprco.requestId = request.pullRequestId;
		return gprco;
	};
	
	public friendlyOutput(opt: GPRCO): void {
		if (!opt) {
			throw new Error("no pull requests supplied");
		}		
		trace.info('Request Id		: %s', opt.requestId);
		trace.info('Bypass Reason		: %s', opt.bypassReason ? opt.bypassReason : "None");
		trace.info('Auto Complete		: %s', opt.triggeredByAutoComplete ? opt.triggeredByAutoComplete : false);
		trace.info('Delete Branch		: %s', opt.deleteSourceBranch ? opt.deleteSourceBranch : false);
		trace.info('Squash Merge		: %s', opt.squashMerge ? opt.squashMerge : false);
		trace.info('Commit Message		: _____ \n%s', opt.mergeCommitMessage ? opt.mergeCommitMessage : "No Comment");
		trace.println();
	}
};



class GPRCO implements gi.GitPullRequestCompletionOptions {
	requestId: number;
	deleteSourceBranch: boolean;
	mergeCommitMessage: string;
	squashMerge: boolean;
	triggeredByAutoComplete: boolean;
	bypassReason: string;
}

