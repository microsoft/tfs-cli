import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");

export interface BuildArguments extends CoreArguments {
	definitionId: args.IntArgument;
	definitionName: args.StringArgument;
	status: args.StringArgument;
	top: args.IntArgument;
	buildId: args.IntArgument;
    parameters: args.StringArgument;
    priority: args.IntArgument;
	version: args.StringArgument;
	shelveset: args.StringArgument;
    demands: args.StringArgument;
	wait: args.BooleanArgument;
	timeout: args.IntArgument;

}

export function getCommand(args: string[]): BuildBase<BuildArguments, void> {
	return new BuildBase<BuildArguments, void>(args);
}

export class BuildBase<TArguments extends BuildArguments, TResult> extends TfCommand<TArguments, TResult> {
	protected description = "Commands for managing Builds.";
	protected serverCommand = false;

	protected setCommandArgs(): void {
		super.setCommandArgs();

		this.registerCommandArgument(
			"definitionId",
			"Build Definition ID",
			"Identifies a build definition.",
			args.IntArgument,
			null,
		);
		this.registerCommandArgument(
			"definitionName",
			"Build Definition Name",
			"Name of a Build Definition.",
			args.StringArgument,
			null,
		);
		this.registerCommandArgument("status", "Build Status", "Build status filter.", args.StringArgument, null);
		this.registerCommandArgument("top", "Number of builds", "Maximum number of builds to return.", args.IntArgument, null);
		this.registerCommandArgument("buildId", "Build ID", "Identifies a particular Build.", args.IntArgument);
        this.registerCommandArgument("parameters", "parameter file path or JSON string ", "Build process Parameters JSON file / string.", args.StringArgument,null);
        this.registerCommandArgument("priority", "build queue priority", "Queue a build with priority 1 [High] - 5 [Low] default = 3 [Normal]).", args.IntArgument, null);
		this.registerCommandArgument("version","Build Sources Version", "the source version for the queued build.",args.StringArgument,null);
		this.registerCommandArgument("shelveset", "Shelveset to validate", "the shelveset to queue in the build.", args.StringArgument,null );
		this.registerCommandArgument("poolId", "Agent Pool Id", "Required Agent pool ID For Edit.", args.IntArgument,null);
		this.registerCommandArgument("agentId", "Agent ID", "Required Agent ID.", args.IntArgument,null);
		this.registerCommandArgument("agentName", "Agent Name", "Required Agent Name.", args.StringArgument,null);
		this.registerCommandArgument("userCapabilityKey", "Capability to add / edit", "Capability to add / edit to the Agent.", args.StringArgument,null);
		this.registerCommandArgument("userCapabilityValue", "Value to add / edit", "Value to add / edit to the Agent User Capabilities.", args.StringArgument,null);
        this.registerCommandArgument("demands","Build demand key","Demands string [semi-colon separator] for Queued Build [key / key -equals value].",args.StringArgument,null);
		this.registerCommandArgument("disable","disable / enable agent","Update the agent status.",args.StringArgument,null);
		this.registerCommandArgument("deleteAgent", "deleteagent", "Delete an agent.", args.StringArgument, null);
		this.registerCommandArgument("wait","wait for the build","wait for the triggered build",args.BooleanArgument,"false");
		this.registerCommandArgument("timeout","max time to wait","Maximum time to wait for the build to complete (in seconds).",args.IntArgument,"0");
		this.registerCommandArgument("parallel", "max agent parallelism", "Maximum parallel agent runs.", args.IntArgument, null);
		this.registerCommandArgument("waitForInProgressRequests", "Wait For Active Requests", "Waiting for active Agent jobs / requests", args.StringArgument,null);
}

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}
