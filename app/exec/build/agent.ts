import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");

export function getCommand(args: string[]): Agent {
	return new Agent(args);
}

export class Agent extends agentBase.BuildBase<agentBase.BuildArguments, taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Show / Update task agent details.";

	protected getHelpArgs(): string[] {
		return ["poolId", "agentId", "agentName", "userCapabilityKey", "userCapabilityValue", "disable", "deleteAgent", "parallel"];
	}

	public exec(): Promise<taskAgentContracts.TaskAgent> {
		trace.debug("agent.exec");
		var agentapi: agentClient.ITaskAgentApiBase = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
		return Promise.all<number | string>([
			this.commandArgs.agentId.val(),
			this.commandArgs.agentName.val(),
			this.commandArgs.poolId.val(),
			this.commandArgs.userCapabilityKey.val(),
			this.commandArgs.userCapabilityValue.val(),
			this.commandArgs.disable.val(),
			this.commandArgs.deleteAgent.val(),
			this.commandArgs.parallel.val()
		]).then((values) => {
			const [agentid, agentname, pool, newkey, value, disable, deleteAgent, maxParallel] = values;
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
						return this._getOrUpdateAgent(agentapi, pool as number, aid, newkey as string, value as string, include, disable as string, deleteAgent as string, maxParallel as number);
					}
					else {
						trace.debug("No agents found with name " + agentname);
						throw new Error("No agents found with name " + agentname);
					}
				});
			}
			trace.debug("disable request: %s", disable);
			return this._getOrUpdateAgent(agentapi, pool as number, agentid as number, newkey as string, value as string, include, disable as string, deleteAgent as string, maxParallel as number);
		});
	};

	public friendlyOutput(agent: taskAgentContracts.TaskAgent): void {
		if (!agent) {
			throw new Error("agent / pool not supplied or not found");
		}
		else if (!agent.id) {
			trace.success("Agent name          : %s", agent.name + " was deleted");
		}
		else {
			trace.println();
			trace.info("Agent id        	: %s", agent.id ? agent.id : "unknown");
			trace.info("Agent name      	: %s", agent.name ? agent.name : "unknown");
			trace.info("Version         	: %s", agent.version ? agent.version : "unknown");
			trace.info("status          	: %s", agent.status ? taskAgentContracts.TaskAgentStatus[agent.status] : "unknown");
			trace.info("enabled		      	: %s", agent.enabled ? agent.enabled : "unknown");
			trace.info("maxParallelism		: %s", agent.maxParallelism);
			if (agent.systemCapabilities) {
				trace.info("System capabilities : ");
			}
			for (var key in agent.systemCapabilities) {
				trace.info("	%s : %s", key, agent.systemCapabilities[key]);
			}
			if (agent.userCapabilities) {
				trace.info("User capabilities : ");
			}
			for (var key in agent.userCapabilities) {
				trace.info("	%s : %s", key, agent.userCapabilities[key]);
			}
		}
	}
	private _getOrUpdateAgent(agentapi: agentClient.ITaskAgentApiBase, pool: number, agentid: number, newkey: string, value: string, include: boolean, disable: string, deleteAgent: string, Parallel: number) {
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
			if (newkey) {
				include = false;
				var capabilities: { [key: string]: string; } = agent.userCapabilities;
				//capabilities[newkey] = value;
				let userCapabilitiesObj = {};
				for(var attrname in capabilities) { userCapabilitiesObj[attrname] = capabilities[attrname] }
			    userCapabilitiesObj[newkey] = value;
				
				agentapi.updateAgentUserCapabilities(userCapabilitiesObj, pool, agentid);
			};
			return agentapi.getAgent(pool, agentid, include, include, null)
		});
	}
}