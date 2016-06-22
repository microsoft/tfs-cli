import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('vso-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import Q = require("q");
import fs = require("fs");

export function getCommand(args: string[]): CreateDefinition {
    return new CreateDefinition(args);
}

export interface CreateDefinitionArguments extends CoreArguments {
    name: args.StringArgument
    definitionPath: args.StringArgument
}

export class CreateDefinition extends TfCommand<CreateDefinitionArguments, buildContracts.DefinitionReference> {
    protected description = "Create a build definition";

    protected getHelpArgs(): string[] {
        return ["project", "definitionPath", "name"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("name", "Name of the Build Definition", "", args.StringArgument);
        this.registerCommandArgument("definitionPath", "Definition path", "Local path to a Build Definition.", args.ExistingFilePathsArgument);
    }

    public exec(): Q.Promise<buildContracts.DefinitionReference> {
        var api = this.webApi.getQBuildApi(this.connection.getCollectionUrl());

        return Q.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.name.val(),
            this.commandArgs.definitionPath.val(),
        ]).spread((project, name, definitionPath) => {
            let definition: buildContracts.BuildDefinition = JSON.parse(fs.readFileSync(definitionPath.toString(), 'utf-8'));
            definition.name = name;

            trace.debug("Updating build definition %s...", name);
            return api.createDefinition(definition, project).then((definition) => {
                return definition;
            });
        });
    }

    public friendlyOutput(definition: buildContracts.BuildDefinition): void {
        trace.println();
        trace.info('id            : %s', definition.id);
        trace.info('name          : %s', definition.name);
        trace.info('type          : %s', definition.type == buildContracts.DefinitionType.Xaml ? "Xaml" : "Build");
    }
}
