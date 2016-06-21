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
		return ["poolId", "agentId","userCapabilityKey","userCapabilityValue"];
	}

	public exec(): Q.Promise<taskAgentContracts.TaskAgent> {
		trace.debug("agent.exec");
		var agentapi: agentClient.IQTaskAgentApiBase = this.webApi.getQTaskAgentApi(this.connection.getCollectionUrl().substring(0,this.connection.getCollectionUrl().lastIndexOf("/")));
		return this.commandArgs.poolId.val().then((pool) => {
			trace.debug("getting pool  : %s",pool);
			return this.commandArgs.agentId.val().then((agentid) => {
				trace.debug("getting agent : %s", agentid);
				return this.commandArgs.userCapabilityKey.val().then((newkey) => {
					return this.commandArgs.userCapabilityValue.val().then((value) => {
						return agentapi.getAgent(pool,agentid,true,true,null).then((agent) => {
						var include: boolean = true;
						if (newkey) {
								include = false;
								var capabilities: { [key: string] : string; } = agent.userCapabilities;
								capabilities[newkey] = value;					
								agentapi.updateAgentUserCapabilities(capabilities,pool,agentid);
							};
							return agentapi.getAgent(pool,agentid,include,include,null);
						});
					});
				});
			});
		});
	}
	
	public friendlyOutput(agent: taskAgentContracts.TaskAgent): void {
		if (!agent) {
			throw new Error("agent / pool not supplied or not found");
		}
		trace.println();
		trace.info("Agent id        	: %s", agent.id ? agent.id : "unknown");
		trace.info("Agent name      	: %s", agent.name ? agent.name : "unknown");
		trace.info("Version         	: %s", agent.version ? agent.version : "unknown");
		trace.info("status          	: %s", agent.status ? taskAgentContracts.TaskAgentStatus[agent.status] : "unknown");
		trace.info("enabled		      	: %s", agent.enabled ? agent.enabled : "unknown");
		if (agent.systemCapabilities){
			trace.info("System capabilities : ");
		}
		for (var key in agent.systemCapabilities) {
 		    	trace.info("	%s : %s",key , agent.systemCapabilities[key]);
			}
		if (agent.userCapabilities) {
			trace.info("User capabilities : ");	
		}
		for (var key in agent.userCapabilities) {
				trace.info("	%s : %s", key ,agent.userCapabilities[key]);
		}
	}
}