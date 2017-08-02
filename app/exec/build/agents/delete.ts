import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import agentContracts = require("vso-node-api/interfaces/AgentInterfaces");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");

export function describe(): string {
	return "Delete a Agent";
}

export function getCommand(args: string[]): AgentDelete {
	return new AgentDelete(args);
}

export class AgentDelete extends agentBase.AgentBase<taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Delete a Agent.";
	protected getHelpArgs(): string[] {
		return ["poolId", "agentId", "agentName"];
	}

	public exec(): Promise<taskAgentContracts.TaskAgent> {
		trace.debug("delete-Agent.exec");
		var agentapi: agentClient.ITaskAgentApiBase = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
		return Promise.all<number | string>([
			this.commandArgs.poolId.val(),
			this.commandArgs.agentId.val(),
			this.commandArgs.agentName.val()
		]).then((values) => {
			const [poolId, agentid, agentname] = values;
			var agents: number[] = null;
			trace.debug("getting pool  (id) : %s", poolId);
			trace.debug("getting agent (id) : %s", agentid);
			trace.debug("getting agent (name) : %s", agentname);
			return this.commandArgs.AgentId.val().then((AgentId) => {
				return this._deleteAgent(agentapi, poolId as number, agentid as number);
			});
		});
	}

	public friendlyOutput(Agent: agentContracts.Agent): void {
		trace.println();
	}

	private _deleteAgent(agentapi: agentClient.ITaskAgentApiBase, pool: number, agentid: number) {
		trace.info("Deleting Agent...");
		return agentapi.getAgent(pool, agentid, true, true, null).then((agent) => {
			return agentapi.deleteAgent(pool, agentid).then(() => {
				trace.debug("agent set for deletion : %s", agent.name);
				agent.id = null;
				trace.info("Agent deleted");
				return agent;
			});
		}).catch((err) => {
			trace.error("Failed to delete the agent");
			trace.error(err);
		});
	}
}
