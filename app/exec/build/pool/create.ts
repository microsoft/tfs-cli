import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require('fs');
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import VSSInterfaces = require('azure-devops-node-api/interfaces/common/VSSInterfaces');

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

            trace.debug("Trying to Create build agent pool %s...", name);
            if (this.connection.getCollectionUrl().includes("DefaultCollection")) {
                var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl().substring(0, this.connection.getCollectionUrl().lastIndexOf("/")));
            } else {
                var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
            }
            return agentapi.then((api) =>{return api.getAgentPools(name).then((pools) => {
                if (pools.length <= 0){
                    trace.debug("build agent pool %s does not exist", name);
                    var NewPool: AP = new AP;
                    NewPool.name = name;
                    NewPool.autoProvision = true;
                        return agentapi.then((api) => {return api.addAgentPool(NewPool).then((pool) => {
                            return pool;
                        });
                    });
                } else {
                    var exists = false;
                    pools.forEach((pool) => {
                        if (pool.name == name){
                            trace.warn("Agent pool %s already exsits (id: %s)", pool.name, pool.id)
                            exists = true;
                            return pool;
                        }
                    });
                     if (!exists){
                        trace.debug("build agent pool %s", name);
                        var NewPool: AP = new AP;
                        NewPool.name = name;
                        NewPool.autoProvision = true;
                        return agentapi.then((api) => {return api.addAgentPool(NewPool).then((pool) => {
                            return pool;
                        });
                        });
                    }

                }
            })
            });
        });
    }

    public friendlyOutput(pool: taskAgentContracts.TaskAgentPool): void {
        if (pool) {
            trace.println();
            trace.info('id            : %s', pool.id);
            trace.info('name          : %s', pool.name);
        }
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
