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
		return ["poolId", "agentId"];
	}

	public exec(): Q.Promise<taskAgentContracts.TaskAgent> {
		trace.debug("agent.exec");
		var agentapi: agentClient.IQTaskAgentApiBase = this.webApi.getQTaskAgentApi(this.connection.getCollectionUrl().substring(0,this.connection.getCollectionUrl().lastIndexOf("/")));
		return this.commandArgs.poolId.val().then((pool) => {
			trace.debug("getting pool  : %s",pool);
			return this.commandArgs.agentId.val().then((agent) => {
				trace.debug("getting agent : %s", agent);
				return agentapi.getAgent(pool,agent,true,true,null);
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
		trace.info("status          	: %s", agent.status ? agent.status : "unknown");
		trace.info("enabled		      	: %s", agent.enabled ? agent.enabled : "unknown");
		trace.info("System capabilities : ");
		for (var key in agent.systemCapabilities) {
 		    	trace.info("	%s : %s",key , agent.systemCapabilities[key]);
			}
		trace.info("User capabilities : ");
		for (var key in agent.userCapabilities) {
				trace.info("	%s : %s", key ,agent.userCapabilities[key]);
		}
	}
}