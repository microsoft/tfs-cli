import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import buildBase = require("./default");
import buildClient = require("vso-node-api/BuildApi");
import buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): BuildDefinition {
	return new BuildDefinition(args);
}

export class BuildDefinition extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
	protected description = "Display build definition details.";

	protected getHelpArgs(): string[] {
		return ["project", "definitionId", "definitionName"];
	}

	public exec(): Promise<buildContracts.DefinitionReference> {
		trace.debug("build-definition.exec");
		var buildapi: buildClient.IBuildApi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.definitionId.val().then((definitionId) => {
                return this.commandArgs.definitionName.val().then((definitionName) => {
                    if (definitionId){  
                        return buildapi.getDefinition(definitionId,project,null,null);
                    } else {
                        return buildapi.getDefinitions(project, definitionName).then((definitions: buildContracts.DefinitionReference[]) => {
							if(definitionName && definitions.length > 0) {
								var definition = definitions[0];
								return definition;
							} else {
								trace.debug("No definition found with name " + definitionName);
								throw new Error("No definition found with name " + definitionName);
							}
						});
                    }    
                });
			});
		});
	}

	public friendlyOutput(definition: buildContracts.DefinitionReference): void {
		if (!definition) {
			throw new Error("no definition supplied");
		}

		trace.println();
		trace.info("name            : %s", definition.name);
		trace.info("id              : %s", definition.id);
        trace.info("revision        : %s", definition.revision);
        trace.info("Created Date    : %s", definition.createdDate ? definition.createdDate.toDateString():"unknown");
		trace.info("Queue Status	: %s", definition.queueStatus ? buildContracts.DefinitionQueueStatus[definition.queueStatus]: buildContracts.DefinitionQueueStatus[0])
        trace.info("type            : %s", buildContracts.DefinitionType[definition.type]);
        trace.info("url             : %s", definition.url ? definition.url :"unknown");       
    }
}