import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require('fs');
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import VSSInterfaces = require('azure-devops-node-api/interfaces/common/VSSInterfaces');

export function getCommand(args: string[]): PoolDetails {
    return new PoolDetails(args);
}

export interface PoolDetailsArguments extends CoreArguments {
    id: args.IntArgument;
}

export class PoolDetails extends TfCommand<PoolDetailsArguments, taskAgentContracts.TaskAgentPool> {
    protected serverCommand = true;
    protected description = "Create a build agent pool";

    protected getHelpArgs(): string[] {
        return ["id"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("id", "Id of the Build Agent Pool", "", args.IntArgument);
    }

    public exec(): Promise<taskAgentContracts.TaskAgentPool> {
        var api = this.webApi.getBuildApi();

        return Promise.all<number>([
            this.commandArgs.id.val(),
        ]).then((values) => {
            const [id] = values;
            if (this.connection.getCollectionUrl().includes("DefaultCollection")) {
                var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
            } else {
                var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
            }
            return agentapi.then((api) => {return api.getAgentPool(id).then((pool) => {
                trace.debug("found build agent pool %s", pool.id);
                    return pool;                    
                });
            });
        });
    }

    public friendlyOutput(pool: taskAgentContracts.TaskAgentPool): void {
        if (pool) {
            trace.println();
            trace.info('id            : %s', pool.id);
            trace.info('name          : %s', pool.name);
            trace.info('auto provision: %s', pool.autoProvision);
            trace.info('created by    : %s', pool.createdBy.displayName);
            trace.info('scope         : %s', pool.scope);
            trace.info('size          : %s', pool.size);
        }
    }   
}