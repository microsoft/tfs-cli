import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');

export function getCommand(args: string[]): ListTemplates {
    return new ListTemplates(args);
}

export class ListTemplates extends TfCommand<CoreArguments, buildContracts.BuildDefinitionTemplate[]> {
    protected serverCommand = true;
    protected description = "Get a list of build templates";

    protected getHelpArgs(): string[] {
        return ["project"];
    }

    public exec(): Promise<buildContracts.BuildDefinitionTemplate[]> {
        var api = this.webApi.getBuildApi(this.connection.getCollectionUrl());
        trace.debug("Searching for build templates...");

        return this.commandArgs.project.val().then((project) => {
           return api.then((tempapi) => {return tempapi.getTemplates(project).then((templates) => {
                    trace.debug("Retrieved " + templates.length + " build templates from server.");
                    return templates;
                });
            });
        });
    }

    public friendlyOutput(data: buildContracts.BuildDefinitionTemplate[]): void {
        if (!data) {
            throw new Error('no templates supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of templates');
        }

        data.forEach((template) => {
            trace.println();
            trace.info('id            : %s', template.id);
            trace.info('name          : %s', template.name);
            trace.info('category      : %s', template.category);
            trace.info('description   : %s', template.description);
        });
    }
}
