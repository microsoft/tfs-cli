import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");

export interface BuildArguments extends CoreArguments {
	definitionId: args.IntArgument,
	definitionName: args.StringArgument,
	status: args.StringArgument;
	top: args.IntArgument;
	buildId: args.IntArgument;
}

export function getCommand(args: string[]): BuildBase<BuildArguments, void> {
	return new BuildBase<BuildArguments, void>(args);
}

export class BuildBase<TArguments extends BuildArguments, TResult> extends TfCommand<TArguments, TResult> {
	protected description = "Commands for managing Builds.";

	protected setCommandArgs(): void {
		super.setCommandArgs();

		this.registerCommandArgument("definitionId", "Build Definition ID", "Identifies a build definition.", args.IntArgument, null);
		this.registerCommandArgument("definitionName", "Build Definition Name", "Name of a Build Definition.", args.StringArgument, null);
		this.registerCommandArgument("status", "Build Status", "Build status filter.", args.StringArgument, null);
		this.registerCommandArgument("top", "Number of builds", "Maximum number of builds to return.", args.IntArgument, null);
		this.registerCommandArgument("buildId", "Build ID", "Identifies a particular Build.", args.IntArgument);
	}

	public exec(cmd?: any): Q.Promise<any> {
		return this.getHelp(cmd);
	}
}
