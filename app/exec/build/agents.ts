import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import agentBase = require("./Tasks/default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");

export function getCommand(args: string[]): Agent {
	return new Agent(args);
}

export class Agent extends agentBase.BuildTaskBase<taskAgentContracts.TaskAgent> {
	protected description = "Show task agent details.";

	protected getHelpArgs(): string[] {
		return ["poolId"];
	}

	public exec(): Q.Promise<taskAgentContracts.TaskAgent[]> {
		trace.debug("agent.exec");
		var agentapi: agentClient.IQTaskAgentApiBase = this.webApi.getQTaskAgentApi(this.connection.getCollectionUrl().substring(0,this.connection.getCollectionUrl().lastIndexOf("/")));
		return this.commandArgs.poolId.val().then((pool) => {
			trace.debug("getting pool  : %s",pool);
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
			trace.info("	%s : %s (version: %s)", agent.name,agent.id, agent.version);
		});
	}
}
