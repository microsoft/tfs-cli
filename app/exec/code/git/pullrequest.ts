import { success, warn } from '../../../lib/trace';
import os = require('os');
import { errLog } from '../../../lib/errorhandler';
import { isNull } from 'util';
import { GitPushSearchCriteria } from 'vso-node-api/interfaces/TfvcInterfaces';
import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import { getCredentialStore } from "../../../lib/credstore";
//import buildContracts = require('vso-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import corem = require('vso-node-api/CoreApi');
import gi = require('vso-node-api/interfaces/GitInterfaces');
import vm = require('vso-node-api');
import git_Api = require('vso-node-api/GitApi')
import VSSInterfaces = require("vso-node-api/interfaces/common/VSSInterfaces");
import codedBase = require("../default");
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
	completionOptions: gi.GitPullRequestCompletionOptions;
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

export class PullRequest extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Pull request";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryName", 'source', 'target', 'title'];
	}

	public async exec(): Promise<any> {
		var gitApi: git_Api.IGitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		var repositoryName = await this.commandArgs.repositoryName.val();
		var source = await this.commandArgs.source.val();
		var target = await this.commandArgs.target.val();
		var title = await this.commandArgs.title.val();

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
		var pullRequest = await gitApi.createPullRequest(newPullrequest, gitRepositorieId, project).catch((err) => {
			errLog(err.message);
		});
		var pullRequestType: any = pullRequest
		return new Promise<any>(() => {
			success('New pull request created');
			trace.info('Title    : %s', pullRequestType.title);
			trace.info('id       : %s', pullRequestType.pullRequestId);
		})
	}

	// public friendlyOutput(data: taskAgentContracts.ServiceEndpoint[]): void {
	// 	if (!data) {
	// 		throw new Error('no endpoints supplied');
	// 	}

	// 	if (!(data instanceof Array)) {
	// 		throw new Error('expected an array of endpoints');
	// 	}

	// 	data.forEach((endpoint) => {
	// 		trace.println();
	// 		trace.info('name    : %s', endpoint.name);
	// 		trace.info('id      : %s', endpoint.id);
	// 		trace.info('type    : %s', endpoint.type);
	// 	});
	// }
}
