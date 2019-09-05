import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import releaseContracts = require('azure-devops-node-api/interfaces/ReleaseInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require('fs');

export function getCommand(args: string[]): CreateDefinition {
    return new CreateDefinition(args);
}

export interface CreateDefinitionArguments extends CoreArguments {
    name: args.StringArgument
    definitionPath: args.StringArgument
}

export class CreateDefinition extends TfCommand<CreateDefinitionArguments, releaseContracts.ReleaseDefinition> {
    protected serverCommand = true;
    protected description = "Create a release definition";

    protected getHelpArgs(): string[] {
        return ["project", "definitionPath", "name"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("name", "Name of the release Definition", "", args.StringArgument);
        this.registerCommandArgument("definitionPath", "Definition path", "Local path to a release Definition.", args.ExistingFilePathsArgument);
    }

    public exec(): Promise<releaseContracts.ReleaseDefinition> {
        var api = this.webApi.getReleaseApi();

        return Promise.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.name.val(),
            this.commandArgs.definitionPath.val(),
        ]).then((values) => {
            const [project, name, definitionPath] = values;
            let definition: releaseContracts.ReleaseDefinition = JSON.parse(fs.readFileSync(definitionPath.toString(), 'utf-8'));
            definition.name = name as string;

            trace.debug("Creating release definition %s...", name);
                return api.then((defapi) => { return defapi.createReleaseDefinition(definition, project as string).then((definition) => {
                    return definition;
                });
            });
        });
    }

    public friendlyOutput(definition: releaseContracts.ReleaseDefinition): void {
        trace.println();
        trace.info('id            : %s', definition.id);
        trace.info('name          : %s', definition.name);
    }
}
