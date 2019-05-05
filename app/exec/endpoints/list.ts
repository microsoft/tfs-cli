import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
import args = require("../../lib/arguments");
import trace = require('../../lib/trace');
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import corem = require('azure-devops-node-api/CoreApi');

export function getCommand(args: string[]): ListEndpoints {
    return new ListEndpoints(args);
}

export class ListEndpoints extends TfCommand<CoreArguments, taskAgentContracts.ServiceEndpoint[]> {
    protected serverCommand = true;
    protected description = "Get a list of build definitions";

    protected getHelpArgs(): string[] {
        return ["project"];
    }

    public exec(): Promise<taskAgentContracts.ServiceEndpoint[]> {
        var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
        var coreapi = this.webApi.getCoreApi(this.connection.getCollectionUrl())
        trace.debug("Searching for Service Endpoints ...");
        return this.commandArgs.project.val().then((project) => {
            return coreapi.then((api) =>{ 
                return api.getProject(project).then((projectObj) =>{               
                    return agentapi.then((api) => { 
                        return api.getServiceEndpoints(projectObj.id).then((endpoints) => {
                            trace.debug("Retrieved " + endpoints.length + " build endpoints from server.");
                            return endpoints;
                        });
                    });
                });
            });
        });
    }

    public friendlyOutput(data: taskAgentContracts.ServiceEndpoint[]): void {
        if (!data) {
            throw new Error('no endpoints supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of endpoints');
        }

        data.forEach((endpoint) => {
            trace.println();
            trace.info('name    : %s',endpoint.name);
            trace.info('id      : %s',endpoint.id);
            trace.info('type    : %s',endpoint.type);
        });
    }
}
