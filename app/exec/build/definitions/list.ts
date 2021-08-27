import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('vso-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import Q = require("q");

export function getCommand(args: string[]): ListDefinitions {
    return new ListDefinitions(args);
}

export class ListDefinitions extends TfCommand<CoreArguments, buildContracts.DefinitionReference[]> {

    protected description = "Get a list of build definitions";

    protected getHelpArgs(): string[] {
        return ["project"];
    }

    public exec(): Q.Promise<buildContracts.DefinitionReference[]> {
        var api = this.webApi.getQBuildApi(this.connection.getCollectionUrl());
        trace.debug("Searching for build definitions...");

        return Q.all<number | string>([
            this.commandArgs.project.val()
        ]).spread((project) => {
            return api.getDefinitions(project).then((definitions) => {
                trace.debug("Retrieved " + definitions.length + " build definitions from server.");
                return definitions;
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
            trace.println();
            trace.info('id            : %s', definition.id);
            trace.info('name          : %s', definition.name);
            trace.info('type          : %s', definition.type == buildContracts.DefinitionType.Xaml ? "Xaml" : "Build");
        });
    }
}
