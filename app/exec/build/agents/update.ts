import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");


export function getCommand(args: string[]): Agent {
	return new Agent(args);
}

export class Agent extends agentBase.AgentBase<taskAgentContracts.TaskAgent> {
	protected serverCommand = true;
	protected description = "Show / Update task agent details.";
	protected getHelpArgs(): string[] {
		return ["poolId", "agentId", "agentName", "userCapabilityKey", "userCapabilityValue", "disable", "deleteAgent", "parallel", "waitForInProgressRequests"];
	}


	private _getOrUpdateAgent(agentapi: agentClient.ITaskAgentApiBase, pool: number, agentid: number, newkey: string, value: string, include: boolean, disable: string, deleteAgent: string, Parallel: number, waitForInProgressRequests: string) {
		return agentapi.getAgent(pool, agentid, true, true, null).then((agent) => {
			trace.debug("disable request: %s", disable);
			if (Parallel) {
				agent.maxParallelism = Parallel;
				agentapi.updateAgent(agent, pool, agentid);
			}
			
			if (newkey) {
				include = false;
				var capabilities: { [key: string]: string; } = agent.userCapabilities;
				//capabilities[newkey] = value;
				let userCapabilitiesObj = {};
				for (var attrname in capabilities) { userCapabilitiesObj[attrname] = capabilities[attrname] }
				userCapabilitiesObj[newkey] = value;

				agentapi.updateAgentUserCapabilities(userCapabilitiesObj, pool, agentid);
			};

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
	}}

