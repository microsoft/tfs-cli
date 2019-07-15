import buildBase = require("./default");
import buildClient = require("azure-devops-node-api/BuildApi");
import buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): BuildDefinition {
	return new BuildDefinition(args);
}

export class BuildDefinition extends buildBase.BuildBase<buildBase.BuildArguments, buildContracts.Build> {
    protected serverCommand = true;
	protected description = "Display build definition details.";

	protected getHelpArgs(): string[] {
		return ["project", "definitionId", "definitionName"];
	}

	public exec(): Promise<buildContracts.DefinitionReference> {
		trace.debug("build-definition.exec");
		var buildapi = this.webApi.getBuildApi();
		return this.commandArgs.project.val().then((project) => {
			return this.commandArgs.definitionId.val().then((definitionId) => {
                return this.commandArgs.definitionName.val().then((definitionName) => {
                    if (definitionId){  
						return buildapi.then((api) => { return api.getDefinition(project,definitionId,null,null) }); 
                    } else {
						if (definitionName) {
							return this._getDefinitionByName(definitionName, project, buildapi);
						}
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
	
	/**
	 * _getDefinitionByName
definitionName: string, project: string	 */
	public _getDefinitionByName(definitionName: string, project: string, buildapi: Promise<buildClient.BuildApi>) :Promise <buildContracts.DefinitionReference> {
	return buildapi.then((bapi) => {
		var definitionsPromise = bapi.getDefinitions(project, definitionName)
			return definitionsPromise.then((definitions) => {
				if (definitions.length > 0) {
						return definitions[0];
				} else {
					trace.debug("No definition found with name " + definitionName);	
					throw new Error("No definition found with name " + definitionName);
				}	
			});			
		});
	}
}