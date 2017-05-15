import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('vso-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require('fs');
import taskAgentContracts = require("vso-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("vso-node-api/TaskAgentApiBase");
import VSSInterfaces = require('vso-node-api/interfaces/common/VSSInterfaces');

export function getCommand(args: string[]): CreatePool {
    return new CreatePool(args);
}

export interface CreatePoolArguments extends CoreArguments {
    name: args.StringArgument
}

export class CreatePool extends TfCommand<CreatePoolArguments, taskAgentContracts.TaskAgentPool> {
    protected serverCommand = true;
    protected description = "Create a build agent pool";

    protected getHelpArgs(): string[] {
        return ["name"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("name", "Name of the Build Agent Pool", "", args.StringArgument);
    }

    public exec(): Promise<taskAgentContracts.TaskAgentPool> {
        var api = this.webApi.getBuildApi();

        return Promise.all<string>([
            this.commandArgs.name.val(),
        ]).then((values) => {
            const [name] = values;
            var Name = name as string;

            trace.debug("Creating build agent pool %s...", name);
            var agentapi: agentClient.ITaskAgentApiBase = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
            var NewPool:AP = new AP;
            NewPool.name = Name;
            return agentapi.addAgentPool(NewPool).then((pool) => {
                return pool;
            });
        });
    }

    public friendlyOutput(pool: taskAgentContracts.TaskAgentPool): void {
        trace.println();
        trace.info('id            : %s', pool.id);
        trace.info('name          : %s', pool.name);
    }
    
}

class AP implements taskAgentContracts.TaskAgentPool {
    id: number;
    name: string;
    scope: string;
    administratorsGroup: VSSInterfaces.IdentityRef;
    autoProvision: boolean;
    createdBy: VSSInterfaces.IdentityRef;
    createdOn: Date;
    groupScopeId: string;
    isHosted: boolean;
    properties: any;
    provisioned: boolean;
    serviceAccountsGroup: VSSInterfaces.IdentityRef;
    size: number;
}
