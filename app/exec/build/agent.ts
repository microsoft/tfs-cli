import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../lib/trace");
import taskAgentApi = require("vso-node-api/TaskAgentApi");
import Q = require("q");

export function getCommand(args: string[]): Agent {
	return new Agent(args);
}

export class Agent extends agentBase.BuildBase<agentBase.BuildArguments, taskAgentContracts.TaskAgent> {
	protected description = "Show / Update task agent details.";

	protected getHelpArgs(): string[] {
		return ["poolId","agentId", "agentName","userCapabilityKey","userCapabilityValue"];
	}

	public exec(): Q.Promise<taskAgentContracts.TaskAgent> {
		trace.debug("agent.exec");
		var agentapi: agentClient.IQTaskAgentApiBase = this.webApi.getQTaskAgentApi(this.connection.getCollectionUrl().substring(0,this.connection.getCollectionUrl().lastIndexOf("/")));
		return Q.all<number | string>([
			this.commandArgs.agentId.val(),
			this.commandArgs.agentName.val(),
			this.commandArgs.poolId.val(),
			this.commandArgs.userCapabilityKey.val(),
			this.commandArgs.userCapabilityValue.val()
		]).spread((agentid, agentname, pool, newkey, value) => {
			var agents: number[] = null;
			trace.debug("getting pool  : %s",pool);
			trace.debug("getting agent (id) : %s", agentid);
			trace.debug("getting agent (name) : %s", agentname);
			var include: boolean = true;
			if (agentid) {
				agents = [agentid];
			}
			else if(agentname) {
				trace.debug("No agent Id provided, checking for agent with name " + agentname);
				return agentapi.getAgents(pool, agentname).then((ao: taskAgentContracts.TaskAgent[]) => {
					if(ao.length > 0) {
						agentid = ao[0].id;
						trace.debug("found, agent id %s for agent name %s",agentid, agentname);
						return agentapi.getAgent(pool,agentid,true,true,null).then((agent) => {
							if (newkey) {
								include = false;
								var capabilities: { [key: string] : string; } = agent.userCapabilities;
								capabilities[newkey] = value;					
								agentapi.updateAgentUserCapabilities(capabilities,pool,agentid);
								};
							return agentapi.getAgent(pool,agentid,include,include,null);
						});;
					}
					else {
						trace.debug("No agents found with name " + agentname);
						throw new Error("No agents found with name " + agentname);
					}
				});
			}
			return agentapi.getAgent(pool,agentid,true,true,null).then((agent) => {
			if (newkey) {
				include = false;
					var capabilities: { [key: string] : string; } = agent.userCapabilities;
					capabilities[newkey] = value;					
					agentapi.updateAgentUserCapabilities(capabilities,pool,agentid);
					};
				return agentapi.getAgent(pool,agentid,include,include,null);
				});	
			});
		};
	
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