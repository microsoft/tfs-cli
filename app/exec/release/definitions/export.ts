import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import releaseContracts = require('azure-devops-node-api/interfaces/ReleaseInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require("fs");

export function getCommand(args: string[]): ExportDefinition {
    return new ExportDefinition(args);
}

export interface ExportDefinitionArguments extends CoreArguments {
    definitionId: args.IntArgument
    definitionPath: args.StringArgument
    overwrite: args.BooleanArgument
    revision: args.IntArgument
}

export class ExportDefinition extends TfCommand<ExportDefinitionArguments, releaseContracts.ReleaseDefinitionShallowReference> {
    protected serverCommand = true;
    protected description = "Export a release definition to a local file";

    protected getHelpArgs(): string[] {
        return ["project", "definitionId", "definitionPath", "overwrite"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("definitionId", "release Definition ID", "Identifies a release definition.", args.IntArgument, null);
        this.registerCommandArgument("definitionPath", "Definition Path", "Local path to a Release Definition.", args.FilePathsArgument,null);
        this.registerCommandArgument("overwrite", "Overwrite?", "Overwrite existing Release Definition.", args.BooleanArgument, "false");
    }

    public exec(): Promise<releaseContracts.ReleaseDefinitionShallowReference> {
        var api = this.webApi.getReleaseApi();

        return Promise.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
            this.commandArgs.definitionPath.val(),
            this.commandArgs.overwrite.val()
        ]).then((values) => {
            const [project, definitionId, definitionPath, overwrite] = values;
            trace.debug("Retrieving release definition %s...", definitionId);
            return api.then((defapi) => {
                return defapi.getReleaseDefinition(project as string, definitionId as number).then((definition) => {
                var defpath = "";
                if (!definitionPath) {
                    defpath = definition.name + '-' + definition.id + '-' + definition.revision + '.json';                   
                } else {
                    defpath = definitionPath as string;
                }
                if (fs.existsSync(defpath) && !overwrite) {
                    return null//<any>Promise.reject(new Error("Build definition file already exists"));
                }
                fs.writeFileSync(defpath, JSON.stringify(definition, null, '  '));
                return definition;
            });
        });
        });
    }

    public friendlyOutput(data: releaseContracts.ReleaseDefinition): void {
        trace.info('Build Definition %s exported successfully', data.id);
    }
}
