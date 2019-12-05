import { PullRequest } from '../pullrequest/create';
import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require('../../../lib/arguments');

export function getCommand(args: string[]): CodeBase<CodeArguments, void> {
	return new CodeBase(args);
}

export interface CodeArguments extends CoreArguments {
	source: args.StringArgument;
	target: args.StringArgument;
	title: args.StringArgument;
	repositoryName: args.StringArgument;
	pullrequestId: args.StringArgument;
	pullrequestName: args.StringArgument;
	requestStatus: args.StringArgument;
	top: args.IntArgument;
	deleteSourceBranch: args.BooleanArgument;
	repositoryId: args.StringArgument;
	autocomplete: args.BooleanArgument;
	mergeMethod: args.StringArgument;
}

export class CodeBase<TArguments extends CodeArguments, TResult> extends TfCommand<TArguments, TResult> {
	protected serverCommand = false;
	protected description = "Commands for managing source control.";

	protected setCommandArgs(): void {
		super.setCommandArgs();

		this.registerCommandArgument(["repositoryName"], "Repository name", null, args.StringArgument);
		this.registerCommandArgument(["repositoryId"], "Repository id", null, args.StringArgument);
		this.registerCommandArgument(["source"], "Repository source branch name", null, args.StringArgument);
		this.registerCommandArgument(["target"], "Repository target branch name", null, args.StringArgument, null);
		this.registerCommandArgument(["title"], "Title", null, args.StringArgument, null);
		this.registerCommandArgument(["pullrequestName"], "Pull request name", null, args.StringArgument, null);
		this.registerCommandArgument(["pullrequestId"], "Pull request id", null, args.StringArgument);
		this.registerCommandArgument(["top"], "Number of results to get", null, args.IntArgument, null);
		this.registerCommandArgument(["requestStatus"], "filter by status (Active, Abandoned, Completed, All)", null, args.StringArgument, null);
		this.registerCommandArgument(["deleteSourceBranch"], "delete source branch", "delete source branch on successfull merge",args.BooleanArgument,null);
		this.registerCommandArgument(["autocomplete"], "Auto Complete", "Set auto completion for a new pull request.", args.BooleanArgument, null);
		this.registerCommandArgument(["mergeMethod"], "Merge Method", "Set auto merge method for completing the pull request.", args.IntArgument, '1');
		this.registerCommandArgument(["bypass"], "Bypass Reason", "Reason for bypassing branch policy when completing a pull request.", args.StringArgument, null);
	}
	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}