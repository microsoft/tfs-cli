import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require('../../lib/trace');
import taskAgentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import agentClient = require("azure-devops-node-api/TaskAgentApiBase");
import corem = require('azure-devops-node-api/CoreApi');

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

    public exec(): Promise<taskAgentContracts.ServiceEndpoint> {
        var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
        var coreapi = this.webApi.getCoreApi(this.connection.getCollectionUrl())
        trace.debug("Searching for Service Endpoints ...");
        return this.commandArgs.project.val().then((project) => {
            return this.commandArgs.id.val().then((id) =>{
                return this.commandArgs.parameters.val().then((params) => {                   
                    return coreapi.then((api) => { 
                    return api.getProject(project).then((projectObj) =>{              
                        return agentapi.then((api)=>{ 
                            return api.getServiceEndpointDetails(projectObj.id,id).then((endpoint) => {
                                //trace.info(JSON.stringify(JSON.parse(params)));
                                endpoint.authorization.parameters = JSON.parse(params);
                                    return agentapi.then((api) => {
                                        return api.updateServiceEndpoint(endpoint,projectObj.name,endpoint.id).then(() => {
                                            return endpoint;
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    public friendlyOutput(data: taskAgentContracts.ServiceEndpoint): void {
        if (!data) {
            throw new Error('no endpoints supplied');
        }

        trace.println();
        trace.info('id              : %s', data.id);
        trace.info('name            : %s', data.name);
        trace.info('type            : %s', data.type);
        trace.info('description     : %s', data.description);
        trace.info('visibility      : %s', JSON.stringify(data.data));
        trace.info('auth scheme     : %s', JSON.stringify(data.authorization.scheme));
        //trace.info('auth parameters : %s', JSON.stringify(data.authorization.parameters));
        trace.info('created By      : %s', data.createdBy.displayName);
    }
}
