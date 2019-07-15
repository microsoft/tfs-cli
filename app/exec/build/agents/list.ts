import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import trace = require("../../../lib/trace");
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");

export function getCommand(args: string[]): AgentDetails {
	return new AgentDetails(args);
}

export class AgentDetails extends agentBase.AgentBase<taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Display extended Agent details.";
	protected getHelpArgs(): string[] {
		return ["project", "poolId"];
	}

	public exec(): Promise<taskAgentContracts.TaskAgent[]>  {
		trace.debug("list-agents.exec");
		if (this.connection.getCollectionUrl().includes("DefaultCollection")) {
			var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
		} else {
			var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
		}
		return this.commandArgs.poolId.val().then((pool) => {
			trace.debug("getting pool  : %s", pool);
				return agentapi.then((api) => {  return api.getAgents(pool);
			});
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
