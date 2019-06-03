import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import trace = require('../../lib/trace');
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import CoreContracts = require("azure-devops-node-api/interfaces/CoreInterfaces");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");

export function getCommand(args: string[]): ListEndpoints {
    return new ListEndpoints(args);
}

export class ListEndpoints extends TfCommand<CoreArguments, taskAgentContracts.ServiceEndpoint[]> {
    protected serverCommand = true;
    protected description = "Get a list of build definitions";

    protected getHelpArgs(): string[] {
        return ["project"];
    }

    public exec(): Promise<CoreContracts.WebApiConnectedServiceDetails[]> {
        var coreapi = this.webApi.getCoreApi(this.connection.getCollectionUrl())
        trace.debug("Searching for Service Endpoints ...");
        return this.webApi.getTaskAgentApi(this.connection.getCollectionUrl()).then((agentapi: agentClient.ITaskAgentApiBase) => {
            return this.commandArgs.project.val().then((project) => {
                return coreapi.then((api) =>{ 
                    return api.getProject(project).then((projectObj) =>{
                        return api.getConnectedServices(projectObj.id).then((endpoints) => {
                            trace.debug("Retrieved " + endpoints.length + " build endpoints from server.");
                            return endpoints;
                        });
                    });
                });
            });
        });
    }

    public friendlyOutput(data: CoreContracts.WebApiConnectedServiceDetails[]): void {
        if (!data) {
            throw new Error('no endpoints supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of endpoints');
        }

        data.forEach((endpoint) => {
            trace.println();
            trace.info('name        : %s',endpoint.connectedServiceMetaData.friendlyName);
            trace.info('description : %s', endpoint.connectedServiceMetaData.description);
            trace.info('author      : %s', endpoint.connectedServiceMetaData.authenticatedBy.displayName);
            trace.info('id          : %s',endpoint.connectedServiceMetaData.id);
            trace.info('type        : %s',endpoint.connectedServiceMetaData.kind);
        });
    }
}
