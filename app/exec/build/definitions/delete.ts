import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('vso-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import Q = require("q");
import fs = require("fs");

export function getCommand(args: string[]): DeleteDefinition {
    return new DeleteDefinition(args);
}

export interface DeleteDefinitionArguments extends CoreArguments {
    definitionId: args.IntArgument
}

export class DeleteDefinition extends TfCommand<DeleteDefinitionArguments, buildContracts.DefinitionReference> {
    protected description = "Delete a build definition";

    protected getHelpArgs(): string[] {
        return ["project", "definitionId"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("definitionId", "Build Definition ID", "Identifies a build definition.", args.IntArgument, null);
    }

    public exec(): Q.Promise<buildContracts.DefinitionReference> {
        var api = this.webApi.getQBuildApi(this.connection.getCollectionUrl());

        return Q.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
        ]).spread((project, definitionId) => {

            trace.debug("Deleting build definition %s...", definitionId);
            return api.deleteDefinition(definitionId, project).then((definition) => {
                return <buildContracts.DefinitionReference>{ id: definitionId }
            });
        });
    }

    public friendlyOutput(data: buildContracts.BuildDefinition): void {
        trace.println();
        trace.success('Build Definition %s deleted successfully!', data.id);
    }
}
