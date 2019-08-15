import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");

export interface ReleaseArguments extends CoreArguments {
	definitionId: args.IntArgument;
	definitionName: args.StringArgument;
	status: args.StringArgument;
	top: args.IntArgument;
	releaseId: args.IntArgument;
    parameters: args.StringArgument;
    priority: args.IntArgument;
	version: args.StringArgument;
	shelveset: args.StringArgument;
    demands: args.StringArgument;
	wait: args.BooleanArgument;
	timeout: args.IntArgument;

}

export function getCommand(args: string[]): ReleaseBase<ReleaseArguments, void> {
	return new ReleaseBase<ReleaseArguments, void>(args);
}

export class ReleaseBase<TArguments extends ReleaseArguments, TResult> extends TfCommand<TArguments, TResult> {
	protected description = "Commands for managing Releases.";
	protected serverCommand = false;

	protected setCommandArgs(): void {
		super.setCommandArgs();

		this.registerCommandArgument(
			"definitionId",
			"Release Definition ID",
			"Identifies a Release definition.",
			args.IntArgument,
			null,
		);
		this.registerCommandArgument(
			"definitionName",
			"Release Definition Name",
			"Name of a Release Definition.",
			args.StringArgument,
			null,
		);
		this.registerCommandArgument("status", "Release Status", "Release status filter.", args.StringArgument, null);
		this.registerCommandArgument("top", "Number of Releases", "Maximum number of Releases to return.", args.IntArgument, null);
		this.registerCommandArgument("releaseId", "Release ID", "Identifies a particular Release.", args.IntArgument);
        this.registerCommandArgument("parameters", "parameter file path or JSON string ", "Release process Parameters JSON file / string.", args.StringArgument,null);
        this.registerCommandArgument("priority", "Release queue priority", "Queue a Release with priority 1 [High] - 5 [Low] default = 3 [Normal]).", args.IntArgument, null);
		this.registerCommandArgument("version","Release Sources Version", "the source version for the queued Release.",args.StringArgument,null);
		this.registerCommandArgument("shelveset", "Shelveset to validate", "the shelveset to queue in the Release.", args.StringArgument,null );
		this.registerCommandArgument("poolId", "Agent Pool Id", "Required Agent pool ID For Edit.", args.IntArgument,null);
		this.registerCommandArgument("agentId", "Agent ID", "Required Agent ID.", args.IntArgument,null);
		this.registerCommandArgument("agentName", "Agent Name", "Required Agent Name.", args.StringArgument,null);
		this.registerCommandArgument("userCapabilityKey", "Capability to add / edit", "Capability to add / edit to the Agent.", args.StringArgument,null);
		this.registerCommandArgument("userCapabilityValue", "Value to add / edit", "Value to add / edit to the Agent User Capabilities.", args.StringArgument,null);
        this.registerCommandArgument("demands","Release demand key","Demands string [semi-colon separator] for Queued Release [key / key -equals value].",args.StringArgument,null);
		this.registerCommandArgument("disable","disable / enable agent","Update the agent status.",args.StringArgument,null);
		this.registerCommandArgument("deleteAgent", "deleteagent", "Delete an agent.", args.StringArgument, null);
		this.registerCommandArgument("wait","wait for the Release","wait for the triggered Release",args.BooleanArgument,"false");
		this.registerCommandArgument("timeout","max time to wait","Maximum time to wait for the Release to complete (in seconds).",args.IntArgument,"0");
		this.registerCommandArgument("parallel", "max agent parallelism", "Maximum parallel agent runs.", args.IntArgument, null);
		this.registerCommandArgument("waitForInProgressRequests", "Wait For Active Requests", "Waiting for active Agent jobs / requests", args.StringArgument,null);
		this.registerCommandArgument("artifact", "Name of Artifact for release", "Name of Artifact for new release", args.StringArgument, null);
		this.registerCommandArgument("manualEnvironments", "Manual environments", "List of manual environments in a new release (semi-column separated)", args.StringArgument, null);
		this.registerCommandArgument("environmentName", "Environment Name", "Name of the release environment", args.StringArgument, null);
		
}

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}
