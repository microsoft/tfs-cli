import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import gi = require('azure-devops-node-api/interfaces/GitInterfaces');
import git_Api = require('azure-devops-node-api/GitApi')
import VSSInterfaces = require("azure-devops-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("./default");

export function getCommand(args: string[]): PullRequest {
	return new PullRequest(args);
}

class GR implements gi.GitPullRequest {
	_links: any;
	artifactId: string;
	autoCompleteSetBy: VSSInterfaces.IdentityRef;
	closedBy: VSSInterfaces.IdentityRef;
	closedDate: Date;
	codeReviewId: number;
	commits: gi.GitCommitRef[];
	completionOptions: completionOptions = new completionOptions;
	completionQueueTime: Date;
	createdBy: VSSInterfaces.IdentityRef;
	creationDate: Date;
	description: string;
	lastMergeCommit: gi.GitCommitRef;
	lastMergeSourceCommit: gi.GitCommitRef;
	lastMergeTargetCommit: gi.GitCommitRef;
	mergeId: string;
	mergeStatus: gi.PullRequestAsyncStatus;
	pullRequestId: number;
	remoteUrl: string;
	repository: gi.GitRepository;
	reviewers: gi.IdentityRefWithVote[];
	sourceRefName: string;
	status: gi.PullRequestStatus;
	supportsIterations: boolean;
	targetRefName: string;
	title: string;
	url: string;
	workItemRefs: VSSInterfaces.ResourceRef[];
}

class completionOptions implements gi.GitPullRequestCompletionOptions {
	deleteSourceBranch: boolean;
	mergeCommitMessage: string;
	squashMerge: boolean;;
}

export class PullRequest extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Create a pull request";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryname", 'source', 'target', 'title', 'autocomplete', 'deletesourcebranch'];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		var repositoryName = await this.commandArgs.repositoryname.val();
		var source = await this.commandArgs.source.val();
		var target = await this.commandArgs.target.val();
		var title = await this.commandArgs.title.val();
		var autoComplete = await this.commandArgs.autocomplete.val();
		var delSources = await this.commandArgs.deletesourcebranch.val();

		var gitRepositories = await gitApi.getRepositories(project);
		var gitRepositorie;
		gitRepositories.forEach(repo => {
			if (repo.name.toLowerCase() == repositoryName.toLowerCase()) {
				gitRepositorie = repo;
				return;
			};
		});
		if (!gitRepositorie) {
			errLog('No repository found');
			process.exit(1);
		}
		var gitRepositorieId = gitRepositorie.id
		var pullRequests = await gitApi.getPullRequests(gitRepositorieId, null)
		var myBranchComment = '';
		var newPullrequest: GR = new GR;
		newPullrequest.sourceRefName = 'refs/heads/' + source;
		//Getting source branch name
		if (target && target.length > 0)
			newPullrequest.targetRefName = 'refs/heads/' + target;
		else {
			warn('No target branch specified, using master.')
			var masterPath = await gitApi.getSuggestions(gitRepositorieId, project)
			target = gitRepositorie.defaultBranch.split('/')[gitRepositorie.defaultBranch.split('/').length - 1];
			newPullrequest.targetRefName = gitRepositorie.defaultBranch;
		}
		//Getting title.
		if (title && title.length > 0)
			myBranchComment = title;
		else {
			var myBranch;
			warn('No title specified, using last comment of source branch.')
			var branches = await gitApi.getBranches(gitRepositorieId, project);
			branches.forEach(branch => {
				if (branch.name == source) {
					myBranch = branch;
				}
			});
			if (!myBranch) {
				errLog('Source Branch ' + source + ' not found (brach name is key sensitive)');
				process.exit(1);
			}
			myBranchComment += myBranch.commit.comment + ' from ' + source + ' to ' + target;

		}

		newPullrequest.title = myBranchComment;

		//Creating the request
		if (!autoComplete)
			return await gitApi.createPullRequest(newPullrequest, gitRepositorieId, project)

		var createdRequest = await gitApi.createPullRequest(newPullrequest, gitRepositorieId, project)
		var newPullrequest: GR = new GR;
		if (delSources) {
			newPullrequest.completionOptions.deleteSourceBranch = true
		}
		newPullrequest.autoCompleteSetBy = createdRequest.createdBy;
		return await gitApi.updatePullRequest(newPullrequest, gitRepositorieId, createdRequest.pullRequestId, project);
	};

	public friendlyOutput(data: gi.GitPullRequest): void {
		if (!data) {
			throw new Error("no pull requests supplied");
		}
		console.log(' ');
		success('New pull request created');
		trace.info('Title                 : %s', data.title);
		trace.info('id                    : %s', data.pullRequestId);
		if (data.autoCompleteSetBy)
		trace.info('AutoCompleteSetBy     : %s', data.autoCompleteSetBy.displayName);
		if (data.completionOptions.deleteSourceBranch)
	    trace.info('Delete Source Branch  : %s', data.completionOptions.deleteSourceBranch);
	}
};
