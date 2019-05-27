import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
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

export class ExportDefinition extends TfCommand<ExportDefinitionArguments, buildContracts.DefinitionReference> {
    protected serverCommand = true;
    protected description = "Export a build definition to a local file";

    protected getHelpArgs(): string[] {
        return ["project", "definitionId", "definitionPath", "overwrite","revision"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("definitionId", "Build Definition ID", "Identifies a build definition.", args.IntArgument, null);
        this.registerCommandArgument("definitionPath", "Definition Path", "Local path to a Build Definition.", args.FilePathsArgument,null);
        this.registerCommandArgument("overwrite", "Overwrite?", "Overwrite existing Build Definition.", args.BooleanArgument, "false");
        this.registerCommandArgument("revision", "Revision", "Get specific definition revision.", args.IntArgument, null);
    }

    public exec(): Promise<buildContracts.DefinitionReference> {
        var api = this.webApi.getBuildApi();

        return Promise.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
            this.commandArgs.definitionPath.val(),
            this.commandArgs.overwrite.val(),
            this.commandArgs.revision.val()
        ]).then((values) => {
            const [project, definitionId, definitionPath, overwrite, revision] = values;
            trace.debug("Retrieving build definition %s...", definitionId);
            return api.then((defapi) => {
                return defapi.getDefinition(project as string, definitionId as number, revision as number).then((definition) => {
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

    public friendlyOutput(data: buildContracts.BuildDefinition): void {
        trace.info('Build Definition %s exported successfully', data.id);
    }
}
