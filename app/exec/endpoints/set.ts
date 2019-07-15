import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require('../../lib/trace');
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import CoreContracts = require("azure-devops-node-api/interfaces/CoreInterfaces");

export function getCommand(args: string[]): ShowEndpoint {
    return new ShowEndpoint(args);
}
export interface EndpointArguments extends CoreArguments {
    id: args.StringArgument,
}
export class ShowEndpoint extends TfCommand<EndpointArguments, taskAgentContracts.ServiceEndpoint> {
    protected serverCommand = true;
    protected description = "Get a list of build definitions";
    protected setCommandArgs(): void {
        super.setCommandArgs();
        this.registerCommandArgument("id", "Endpoint ID", "Endpoint Guid Identifier.", args.StringArgument, null);
        this.registerCommandArgument("parameters", "parameter file path or JSON string", "Endpoint authorization parameters JSON file / string.", args.StringArgument, null);
    }
    
    protected getHelpArgs(): string[] {
        return ["project", "id", "parameters"];
    }

    public exec(): Promise<CoreContracts.WebApiConnectedServiceDetails> {
        var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
        var coreapi = this.webApi.getCoreApi(this.connection.getCollectionUrl())
        trace.debug("Searching for Service Endpoints ...");
        return this.webApi.getTaskAgentApi(this.connection.getCollectionUrl()).then((agentapi: agentClient.ITaskAgentApiBase) => {
            return this.commandArgs.project.val().then((project) => {
                return this.commandArgs.id.val().then((id) =>{
                    return this.commandArgs.parameters.val().then((params) => {                   
                        return coreapi.then((api) => { 
                            return api.getProject(project).then((projectObj) =>{              
                                return api.getConnectedServiceDetails(projectObj.id,id).then((endpoint) => {
                                endpoint.credentialsXml = JSON.parse(params);
                                    return api.createConnectedService(endpoint,projectObj.id).then(() => {
                                        return endpoint;
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    public friendlyOutput(data: CoreContracts.WebApiConnectedServiceDetails): void {
        if (!data) {
            throw new Error('no endpoints supplied');
        }

        trace.println();
        trace.info('id              : %s', data.connectedServiceMetaData.id);
        trace.info('name            : %s', data.connectedServiceMetaData.friendlyName);
        trace.info('type            : %s', data.connectedServiceMetaData.kind);
        trace.info('description     : %s', data.connectedServiceMetaData.description);
        trace.info('auth scheme     : %s', JSON.stringify(data.credentialsXml));
        trace.info('created By      : %s', data.connectedServiceMetaData.authenticatedBy.displayName);
    }
}
