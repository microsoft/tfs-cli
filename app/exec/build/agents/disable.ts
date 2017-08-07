import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");

export function describe(): string {
	return "Disable Agent";
}

export function getCommand(args: string[]): AgentDisable {
	return new AgentDisable(args);
}

export class AgentDisable extends agentBase.AgentBase<taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Disable Agent.";
	protected getHelpArgs(): string[] {
		return ["poolId", "agentId", "agentName", "userCapabilityKey", "userCapabilityValue", "disable", "deleteAgent", "parallel", "waitForInProgressRequests"];
	}

	public exec(): Promise<taskAgentContracts.TaskAgent> {
		trace.debug("agent.exec");
		var agentapi: agentClient.ITaskAgentApiBase = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
		return Promise.all<number | string | boolean>([
			this.commandArgs.agentId.val(),
			this.commandArgs.agentName.val(),
			this.commandArgs.poolId.val(),
			this.commandArgs.userCapabilityKey.val(),
			this.commandArgs.userCapabilityValue.val(),
			this.commandArgs.disable.val(),
			this.commandArgs.deleteAgent.val(),
			this.commandArgs.parallel.val(),
			this.commandArgs.waitForInProgressRequests.val(),
		]).then((values) => {
			const [agentid, agentname, pool, newkey, value, disable, deleteAgent, maxParallel, waitForInProgressRequests] = values;
			var agents: number[] = null;
			trace.debug("getting pool  : %s", pool);
			trace.debug("getting agent (id) : %s", agentid);
			trace.debug("getting agent (name) : %s", agentname);
			var include: boolean = true;
			if (agentid) {
				agents = [agentid as number];
			}
			else if (agentname) {
				trace.debug("No agent Id provided, checking for agent with name " + agentname);
				return agentapi.getAgents(pool as number, agentname as string).then((ao: taskAgentContracts.TaskAgent[]) => {
					if (ao.length > 0) {
						var aid = ao[0].id;
						var an = ao[0].name;
						trace.debug("found, agent id %s for agent name %s", aid, an);
						return this._getOrUpdateAgent(agentapi, pool as number, aid, newkey as string, value as string, include, disable as string, deleteAgent as string, maxParallel as number, waitForInProgressRequests as string);
					}
					else {
						trace.debug("No agents found with name " + agentname);
						throw new Error("No agents found with name " + agentname);

					}
				});
			}

			trace.debug("disable request: %s", disable);
			return this._getOrUpdateAgent(agentapi, pool as number, agentid as number, newkey as string, value as string, include, disable as string, deleteAgent as string, maxParallel as number, waitForInProgressRequests as string);
		});
	};
	private _getOrUpdateAgent(agentapi: agentClient.ITaskAgentApiBase, pool: number, agentid: number, newkey: string, value: string, include: boolean, disable: string, deleteAgent: string, Parallel: number, waitForInProgressRequests: string) {
		return agentapi.getAgent(pool, agentid, true, true, null).then((agent) => {
			trace.debug("disable request: %s", disable);
			if (Parallel) {
				agent.maxParallelism = Parallel;
				agentapi.updateAgent(agent, pool, agentid);
			}
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
			if (disable) {
				if (disable == "true") {
					include = false;
					trace.debug("agent status (enabled): %s", agent.enabled);
					agent.enabled = false;
					agentapi.updateAgent(agent, pool, agentid);
					trace.debug("agent status (enabled): %s", agent.enabled);
				}
				if (disable == "false") {
					include = false;
					trace.debug("agent status (enabled): %s", agent.enabled);
					agent.enabled = true;
					agentapi.updateAgent(agent, pool, agentid);
					trace.debug("agent status (enabled): %s", agent.enabled);
				}
				if (disable != "true" && disable != "false") {
					trace.error("allowed values are [true] or [false]!")
				}
			}
			
			if (waitForInProgressRequests == "true") {
				var timer = setInterval(function () {
					return agentapi.getAgentRequestsForAgent(pool, agent.id, 0).then(function (requests) {
						if (requests.length <= 0) {
							clearInterval(timer);
							timer = null;
							trace.info("-------------- There are no requests which are 'in progress' state ");
						}
						else {
							trace.info("-------------- The agent [ %s ]  is currently running the job [ %s ] ", agent.name, requests[0].definition.name);
						}
					}).catch(function (e) {
						trace.info("==== ERROR Occurred ===== ");
						trace.error(e.stack);
						trace.error(e.message);
						clearInterval(timer);
						timer = null;
					});
				}, 60000);
			}
			return agentapi.getAgent(pool, agentid, include, include, null)
		});
	}
}
