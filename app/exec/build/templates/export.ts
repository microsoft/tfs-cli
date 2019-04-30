import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require("fs");

export function getCommand(args: string[]): ExportTemplate {
    return new ExportTemplate(args);
}

export interface ExportTemplateArguments extends CoreArguments {
    templateId: args.StringArgument
    templatePath: args.StringArgument
    overwrite: args.BooleanArgument
}

export class ExportTemplate extends TfCommand<ExportTemplateArguments, buildContracts.BuildDefinitionTemplate> {
    protected serverCommand = true;
    protected description = "Export a build template to a local file";

    protected getHelpArgs(): string[] {
        return ["project", "templateId", "templatePath", "overwrite"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("templateId", "Build Template ID", "Identifies a Build Template.", args.StringArgument, null);
        this.registerCommandArgument("templatePath", "Template Path", "Local path to a Build Template.", args.FilePathsArgument,null);
        this.registerCommandArgument("overwrite", "Overwrite?", "Overwrite existing Build Template.", args.BooleanArgument, "false");
    }

    public exec(): Promise<buildContracts.BuildDefinitionTemplate> {
        var api = this.webApi.getBuildApi(this.connection.getCollectionUrl());

        return Promise.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.templateId.val(),
            this.commandArgs.templatePath.val(),
            this.commandArgs.overwrite.val(),
        ]).then((values) => {
            const [project, templateId, templatePath, overwrite, revision] = values;
            trace.debug("Retrieving build template %s...", templateId);
                return api.then((tempapi) => {return tempapi.getTemplate(project as string, templateId as string).then((template) => {
                    var tempPath = "";
                    if (!templatePath) {
                        tempPath = template.name + '-' + template.id + '.json';                   
                    } else {
                        tempPath = templatePath as string;
                    }
                    if (fs.existsSync(tempPath.toString()) && !overwrite) {
                        return null//<any>Promise.reject(new Error("Build template file already exists"));
                    }
                    fs.writeFileSync(tempPath.toString(), JSON.stringify(template, null, '  '));
                    return template;
                });
            });
        });
    }

    public friendlyOutput(data: buildContracts.BuildDefinitionTemplate): void {
        trace.info('Build Template %s exported successfully', data.id);
    }
}
