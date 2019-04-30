import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import agentBase = require("./default");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import trace = require("../../../lib/trace");
import taskAgentApi = require("azure-devops-node-api/TaskAgentApi");

export function getCommand(args: string[]): List {
	return new List(args);
}

export interface ListPoolArguments extends CoreArguments {
}

export class List extends TfCommand<ListPoolArguments, taskAgentContracts.TaskAgentPool[]> {
    protected serverCommand = true;
	protected description = "Show agent pool list.";
	protected getHelpArgs(): string[] {
		return [];
	}

	public exec(): Promise<taskAgentContracts.TaskAgentPool[]> {
		trace.debug("pools.exec");
		if (this.connection.getCollectionUrl().includes("DefaultCollection")) {
			var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));	
		} else {
			var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
		}
		return agentapi.then((api) => { return api.getAgentPools() });
	}
	
	public friendlyOutput(pools: taskAgentContracts.TaskAgentPool[]): void {
		if (!pools) {
			throw new Error("pool not supplied or not found");
		}
		trace.info("Pools on server:")
		trace.println();
		pools.forEach((pool) => {
			trace.info("	%s	:	%s ", pool.id, pool.name);
		});
	}
}
