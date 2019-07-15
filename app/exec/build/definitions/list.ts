import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
import buildClient = require("azure-devops-node-api/BuildApi");
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');

export function getCommand(args: string[]): ListDefinitions {
    return new ListDefinitions(args);
}

export class ListDefinitions extends TfCommand<CoreArguments, buildContracts.DefinitionReference[]> {
    protected serverCommand = true;
    protected description = "Get a list of build definitions";

    protected getHelpArgs(): string[] {
        return ["project"];
    }

    public exec(): Promise<buildContracts.DefinitionReference[]> {
        var api = this.webApi.getBuildApi(this.connection.getCollectionUrl());
        trace.debug("Searching for build definitions...");

        return this.commandArgs.project.val().then((project) => {
                return api.then((defapi) => {return defapi.getDefinitions(project as string).then((definitions) => {
                    trace.debug("Retrieved " + definitions.length + " build definitions from server.");
                    return definitions;
                });
            });
        });
    }

    public friendlyOutput(data: buildContracts.BuildDefinition[]): void {
        if (!data) {
            throw new Error('no definitions supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of definitions');
        }

        data.forEach((definition) => {
            trace.info('%s: %s: %s%s',definition.type == buildContracts.DefinitionType.Xaml ? "Xaml" : "Build", definition.id,definition.name,definition.draftOf ? " - (Draft of: " + definition.draftOf.id +")":"");
        });
    }
}
