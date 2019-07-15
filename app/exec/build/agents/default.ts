import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import buildBase = require("../default");

export interface AgentArguments extends buildBase.BuildArguments {
	agentId: args.IntArgument;
	agentName: args.StringArgument;
	poolId: args.IntArgument;
	userCapabilityKey: args.StringArgument;
	userCapabilityValue: args.StringArgument;
	disable: args.StringArgument;
	deleteAgent: args.StringArgument;
	parallel: args.IntArgument;
	waitForInProgressRequests: args.StringArgument;
}

export function getCommand(args: string[]): AgentBase<void> {
	return new AgentBase<void>(args);
}

export class AgentBase<T> extends buildBase.BuildBase<AgentArguments, T> {
	protected description = "Commands for managing Agents.";
	protected serverCommand = false;
	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument("agentId", "Agent ID", "Identifies a particular Agent.", args.IntArgument,null);
		this.registerCommandArgument("agentName", "Agent Name", "Required Agent Name.", args.StringArgument, null);
		this.registerCommandArgument("poolId", "Agent Pool Id", "Required Agent pool ID For Edit.", args.IntArgument, null);
		this.registerCommandArgument("userCapabilityKey", "Capability to add / edit", "Capability to add / edit to the Agent.", args.StringArgument, null);
		this.registerCommandArgument("userCapabilityValue", "Value to add / edit", "Value to add / edit to the Agent User Capabilities.", args.StringArgument, null);
		this.registerCommandArgument("disable", "disable / enable agent", "Update the agent status.", args.StringArgument, null);
		this.registerCommandArgument("deleteAgent", "deleteagent", "Delete an agent.", args.StringArgument, null);
		this.registerCommandArgument("parallel", "max agent parallelism", "Maximum parallel agent runs.", args.IntArgument, null);
		this.registerCommandArgument("waitForInProgressRequests", "Wait For Active Requests", "Waiting for active Agent jobs / requests", args.StringArgument, null);
	}
	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}
