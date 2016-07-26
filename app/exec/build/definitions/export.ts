import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('vso-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import Q = require("q");
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

    public exec(): Q.Promise<buildContracts.DefinitionReference> {
        var api = this.webApi.getQBuildApi(this.connection.getCollectionUrl());

        return Q.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
            this.commandArgs.definitionPath.val(),
            this.commandArgs.overwrite.val(),
            this.commandArgs.revision.val()
        ]).spread((project, definitionId, definitionPath, overwrite, revision) => {
            trace.debug("Retrieving build definition %s...", definitionId);
            return api.getDefinition(definitionId, project, revision).then((definition) => {
                if (!definitionPath) {
                    definitionPath = definition.name + '-' + definition.id + '-' + definition.revision + '.json';                   
                }
                if (fs.existsSync(definitionPath.toString()) && !overwrite) {
                    return <any>Q.reject(new Error("Build definition file already exists"));
                }
                fs.writeFileSync(definitionPath.toString(), JSON.stringify(definition, null, '  '));
                return definition;
            });
        });
    }

    public friendlyOutput(data: buildContracts.BuildDefinition): void {
        trace.info('Build Definition %s exported successfully', data.id);
    }
}
