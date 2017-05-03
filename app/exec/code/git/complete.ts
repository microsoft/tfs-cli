import { PullRequest } from './pullrequest';
import { PullRequestAsyncStatus } from 'vso-node-api/interfaces/GitInterfaces';
import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require('../../../lib/arguments');
import trace = require('../../../lib/trace');
import gi = require('vso-node-api/interfaces/GitInterfaces');
import git_Api = require('vso-node-api/GitApi');
import VSSInterfaces = require('vso-node-api/interfaces/common/VSSInterfaces');
import codedBase = require('../default');

export function getCommand(args: string[]): Complete {
	return new Complete(args);
}

export class Complete extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Get a list of pull requests";
	protected getHelpArgs(): string[] {
		return ["project", "repositoryName"];
	}

	public async exec(): Promise<any> {
		var gitApi: git_Api.IGitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		var repositoryName = await this.commandArgs.repositoryname.val();
		var pullRequestName = await this.commandArgs.pullrequestname.val();
		var pullRequestId;
		if (!pullRequestName) {
			pullRequestId = await this.commandArgs.pullrequestid.val();
		}
		var gitRepositories = await gitApi.getRepositories(project);
		var gitRepositorie;
		if (!pullRequestId) {
			gitRepositories.forEach(repo => {
				if (repo.name.toLowerCase() == repositoryName.toLowerCase()) {
					gitRepositorie = repo;
					return;
				};
			});
			var pullRequestes = await gitApi.getPullRequests(gitRepositorie.id, null);
			var myPullRequestId
			var count = 0;
			pullRequestes.forEach(request => {
				if (request.title == pullRequestName) {
					myPullRequestId = request.pullRequestId;
					count++;
				}
			})
			if (!myPullRequestId) {
				errLog('No pull requests found')
				process.exit(1);
			}
			else if (count > 1) {
				errLog('More then one pullrequest was found, please use Pull Request Id')
				process.exit(1);
			}
			pullRequestId = myPullRequestId;
		}
		console.log('here')
		var myPullRequest = await gitApi.getPullRequestById(+pullRequestId)
		var updatedPullRequest: GR = new GR;
		var completeOptions:CO = new CO;
		updatedPullRequest.completionOptions.deleteSourceBranch = false;
		updatedPullRequest.completionOptions.mergeCommitMessage = 'Auto complittind PullRequest';
		updatedPullRequest.completionOptions.squashMerge = false;
		updatedPullRequest.autoCompleteSetBy.id = myPullRequest.createdBy.id;
		//updatedPullRequest = myPullRequest;
		//updatedPullRequest.autoCompleteSetBy.id = 
		//updatedPullRequest.autoCompleteSetBy.id = '21dfff08-525a-6ade-ae74-0312944f4448';
		updatedPullRequest = await gitApi.updatePullRequest(updatedPullRequest, gitRepositorie.id, pullRequestId, project)


		return new Promise<any>(() => {
			success('Pull request completed');
			trace.info('Title    : %s', updatedPullRequest.title);
			trace.info('id       : %s', updatedPullRequest.pullRequestId);
		})
	};
};

class GR implements gi.GitPullRequest {
	_links: any;
	artifactId: string;
	autoCompleteSetBy: IdentityRef = new IdentityRef;
	closedBy: VSSInterfaces.IdentityRef;
	closedDate: Date;
	codeReviewId: number;
	commits: gi.GitCommitRef[];
	completionOptions: CO = new CO;
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

class CO implements gi.GitPullRequestCompletionOptions{
	deleteSourceBranch: boolean;
	mergeCommitMessage: string;
	squashMerge: boolean;
}

class IdentityRef implements VSSInterfaces.IdentityRef{
	displayName: string;
	id: string = '';
	imageUrl: string;
	isAadIdentity: boolean;
	isContainer: boolean;
	profileUrl: string;
	uniqueName: string;
	url: string;
}