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
		return ["project", "definitionId"];
	}

	public exec(): Q.Promise<buildContracts.DefinitionReference> {
		trace.debug("build-definition.exec");
		var buildapi: buildClient.IQBuildApi = this.webApi.getQBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.definitionId.val().then((definitionId) => {
				return buildapi.getDefinition(definitionId,project,null,null);
			});
		});

	}

	public friendlyOutput(definition: buildContracts.DefinitionReference): void {
		if (!definition) {
			throw new Error("no definition supplied");
		}

		trace.println();
		trace.info("name            : %s", definition.name);
		trace.info("revision        : %s", definition.revision);
        trace.info("url             : %s", definition.url ? definition.url :"unknown");
		trace.info("requested by    : %s", definition.createdDate.toDateString());
		trace.info("queue status    : %s", definition.queueStatus);
        trace.info("type            : %s", buildContracts.DefinitionType[definition.type]);       
    }
}