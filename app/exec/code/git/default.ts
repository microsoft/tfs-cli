import { PullRequest } from '../git/pullrequest';
import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");

export function getCommand(args: string[]): CodeBase<CodeArguments, void> {
	return new CodeBase(args);
}

export interface CodeArguments extends CoreArguments {
	source: args.StringArgument;
	target: args.StringArgument;
	title: args.StringArgument;
	repositoryname: args.StringArgument;
	pullrequestid: args.StringArgument;
	pullrequestname: args.StringArgument;
}

export class CodeBase<TArguments extends CodeArguments, TResult> extends TfCommand<TArguments, TResult> {
	protected serverCommand = false;
	protected description = "Commands for managing source control.";

	protected setCommandArgs(): void {
		super.setCommandArgs();

		this.registerCommandArgument(["repositoryname", "-rn"], "Repository name", null, args.StringArgument);
		this.registerCommandArgument(["source", "-so"], "Repository source branch name", null, args.StringArgument);
		this.registerCommandArgument(["target", "-ta"], "Repository target branch name", null, args.StringArgument, null);
		this.registerCommandArgument(["title", "-ti"], "Title", null, args.StringArgument, null);
		this.registerCommandArgument(["pullrequestname", "-prn"], "Pull request name", null, args.StringArgument, null);
		this.registerCommandArgument(["pullrequestid", "-pri"], "Pull request id", null, args.StringArgument);
	}
	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}