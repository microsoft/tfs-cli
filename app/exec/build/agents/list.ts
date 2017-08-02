import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import agentContracts = require("vso-node-api/interfaces/AgentInterfaces");
import trace = require("../../../lib/trace");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");

export function getCommand(args: string[]): AgentDetails {
	return new AgentDetails(args);
}

export class AgentDetails extends agentBase.AgentBase<taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Display extended Agent details.";
	protected getHelpArgs(): string[] {
		return ["project", "AgentId"];
	}

	public exec(): Promise<taskAgentContracts.TaskAgent[]> {
		trace.debug("Agent-details.exec");
		var agentapi: agentClient.ITaskAgentApiBase = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
		return this.commandArgs.poolId.val().then((pool) => {
			trace.debug("getting pool  : %s", pool);
			return agentapi.getAgents(pool);
		});
	}

	public friendlyOutput(agents: taskAgentContracts.TaskAgent[]): void {
		if (!agents) {
			throw new Error("pool not supplied or not found");
		}
		trace.info("Agents in pool:")
		trace.println();
		agents.forEach((agent) => {
			trace.info("	%s	(%s)	:	%s ", agent.id, agent.version, agent.name);
		});
	}
}
