import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import trace = require("../../../lib/trace");
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");

export function describe(): string {
	return "Delete an Agent";
}

export function getCommand(args: string[]): AgentDelete {
	return new AgentDelete(args);
}

export class AgentDelete extends agentBase.AgentBase<taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Delete a Agent.";
	protected getHelpArgs(): string[] {
		return ["poolId", "agentId", "agentName", "deleteAgent"];
	}


	public exec(): Promise<void | taskAgentContracts.TaskAgent> {
		trace.debug("delete-agents.exec");
		if (this.connection.getCollectionUrl().includes("DefaultCollection")) {
			var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
		} else {
			var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
		}

		return Promise.all<number | string>([
			this.commandArgs.poolId.val(),
			this.commandArgs.agentId.val(),
			this.commandArgs.agentName.val(),
			this.commandArgs.deleteAgent.val()
		]).then((values) => {
			const [poolId, agentid, agentname, deleteAgent] = values;
			var agents: number[] = null;
			trace.debug("getting pool  (id) : %s", poolId);
			trace.debug("getting agent (id) : %s", agentid);
			trace.debug("getting agent (name) : %s", agentname);
			trace.info("Deleting Agent...");
			if (agentid) {
				agents = [agentid as number];
			}
			else if (agentname) {
				trace.debug("No agent Id provided, checking for agent with name " + agentname);
				return agentapi.then((api) => { api.getAgents(poolId as number, agentname as string).then((ao: taskAgentContracts.TaskAgent[]) => {
						if (ao.length > 0) {
							var aid = ao[0].id;
							var an = ao[0].name;
							trace.debug("found, agent id %s for agent name %s", aid, an);
							return this._deleteAgent(agentapi, poolId as number, agentid as number, deleteAgent as string);
						}
						else {
							trace.debug("No agents found with name " + agentname);
							throw new Error("No agents found with name " + agentname);

						}
					});
				});
			}

			trace.debug("deleting agent: %s", agentname);
			return this._deleteAgent(agentapi, poolId as number, agentid as number, deleteAgent as string);
		});
	}

	public friendlyOutput(agent: taskAgentContracts.TaskAgent): void {
		trace.println();
		trace.success('Agent %s deleted successfully!', agent.name);
	}

	private _deleteAgent(agentapi, pool: number, agentid: number, deleteAgent: string) {
		return agentapi.getAgent(pool, agentid, true, true, null).then((agent) => {
			trace.debug("deleting Agent: %s", deleteAgent);

			if (deleteAgent) {
				if (deleteAgent == "true") {
					return agentapi.deleteAgent(pool, agentid).then(() => {
						trace.debug("agent set for deletion : %s");
						agent.id = null;
						return agent;
					})
				}
				if (deleteAgent != "true") {
					trace.error("allowed value is [true] only!")
				}
			}
		});
	}
}
