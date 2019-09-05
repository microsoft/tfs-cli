import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import releaseContracts = require('azure-devops-node-api/interfaces/ReleaseInterfaces');
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');

export function getCommand(args: string[]): ListDefinitions {
    return new ListDefinitions(args);
}

export class ListDefinitions extends TfCommand<CoreArguments, releaseContracts.ReleaseDefinitionShallowReference[]> {
    protected serverCommand = true;
    protected description = "Get a list of release definitions";

    protected getHelpArgs(): string[] {
        return ["project"];
    }

    public exec(): Promise<releaseContracts.ReleaseDefinitionShallowReference[]> {
        var api = this.webApi.getReleaseApi(this.connection.getCollectionUrl());
        trace.debug("Searching for build definitions...");

        return this.commandArgs.project.val().then((project) => {
                return api.then((defapi) => {return defapi.getReleaseDefinitions(project as string).then((definitions) => {
                    if(definitions){ trace.debug("Retrieved " + definitions.length ? definitions.length : "0" + " release definitions from server. (project: " + project + ")");}
                    return definitions;
                });
            });
        });
    }

    public friendlyOutput(data: releaseContracts.ReleaseDefinition[]): void {
        if (!data) {
            throw new Error('no definitions supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of definitions');
        }

        data.forEach((definition) => {
            trace.info('%s: %s', definition.id,definition.name);
        });
    }
}
