import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");

export function getCommand(args: string[]): Agents {
	return new Agents(args);
}

export class Agents extends agentBase.BuildBase<agentBase.BuildArguments, taskAgentContracts.TaskAgent> {
	protected description = "Show task agent list in a pool.";

	protected getHelpArgs(): string[] {
		return ["poolId"];
	}

	public exec(): Promise<taskAgentContracts.TaskAgent[]> {
		trace.debug("agents.exec");
		var agentapi: agentClient.ITaskAgentApiBase = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0,this.connection.getCollectionUrl().lastIndexOf("/")));
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
			trace.info("	%s	(%s)	:	%s ", agent.id,agent.version, agent.name);
		});
	}
}
