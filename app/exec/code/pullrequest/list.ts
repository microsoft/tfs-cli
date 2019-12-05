import { success, warn } from '../../../lib/trace';
import { errLog } from '../../../lib/errorhandler';
import args = require('../../../lib/arguments');
import trace = require('../../../lib/trace');
import gi = require('azure-devops-node-api/interfaces/GitInterfaces');
import git_Api = require('azure-devops-node-api/GitApi');
import VSSInterfaces = require('azure-devops-node-api/interfaces/common/VSSInterfaces');
import codedBase = require('./default');
var repositoryName;

export function getCommand(args: string[]): RequestList {
	return new RequestList(args);
}

export class RequestList extends codedBase.CodeBase<codedBase.CodeArguments, void> {
	protected serverCommand = true;
	protected description = "Get a list of pull requests";

	protected getHelpArgs(): string[] {
		return ["project", "repositoryName", "requestStatus", "top"];
	}

	public async exec(): Promise<any> {
		//getting variables.
		var gitApi = this.webApi.getGitApi();
		var project = await this.commandArgs.project.val();
		repositoryName = await this.commandArgs.repositoryName.val();
		var requestStatus = await this.commandArgs.requestStatus.val();
		var top = await this.commandArgs.top.val();
		var gitRepositories = await gitApi.then((api) => { return api.getRepositories(project); });
		var gitRepository;
		gitRepositories.forEach(repo => {
			if (repo.name.toLowerCase() == repositoryName.toLowerCase()) {
				gitRepository = repo;
				return;
			};
		});
		var searchCriteria: SearchCriteria = new SearchCriteria;
		if (requestStatus) {
			searchCriteria.status = gi.PullRequestStatus[requestStatus];
		}
		else{
			searchCriteria.status = 4;
		}
		return await gitApi.then((api) => { return api.getPullRequests(gitRepository.id, searchCriteria, null, null, null, top); });
	};

	public friendlyOutput(data: gi.GitPullRequest[]): void {
		if (!data) {
			throw new Error("no pull requests supplied");
		}

		if (!(data instanceof Array)) {
			throw new Error("expected an array of pull requests");
		}
		console.log(' ');
		success('Pull Requestes for ' + repositoryName + ':')
		data.forEach(req => {
			var reviewerList = '';
			if (req.reviewers) {
				req.reviewers.forEach(reviewers => {
					reviewerList += reviewers.displayName + '; '
				});
			};
			trace.info('Title         : %s', req.title);
			trace.info('id            : %s', req.pullRequestId);
			trace.info('Created by    : %s', req.createdBy.displayName);
			trace.info('Created Date  : %s', req.creationDate.toString());
			trace.info('Status        : %s', gi.PullRequestStatus[req.status]);
			trace.info('Merge Status  : %s', gi.PullRequestAsyncStatus[req.mergeStatus]);
			trace.info('Url           : %s', req.url);
			trace.info('Reviewers     : %s', reviewerList);
			console.log(' ');
		});
	}
};

class SearchCriteria implements gi.GitPullRequestSearchCriteria {
	creatorId: string;
    /**
     * Whether to include the _links field on the shallow references
     */
	includeLinks: boolean;
	repositoryId: string;
	reviewerId: string;
	sourceRefName: string;
	status: gi.PullRequestStatus;
	targetRefName: string;
}
