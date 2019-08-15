import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");
import trace = require("../../lib/trace");
import buildClient = require("azure-devops-node-api/BuildApi");
import { TLSSocket } from "tls";

export function getCommand(args: string[]): ReleaseCreate {
	return new ReleaseCreate(args);
}

export class ReleaseCreate extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release> {
	protected description = "create a new release of definition.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "definitionId", "artifact", "manualEnvironments"];
	}

	public async exec(): Promise<releaseContracts.Release> {
		trace.debug("release-create.exec");
		var releaseapi: releaseClient.IReleaseApi = await this.webApi.getReleaseApi();
		var definitionapi = this.webApi.getReleaseApi();
		var buildapi: buildClient.IBuildApi = await this.webApi.getBuildApi();
		return this.commandArgs.project.val().then(project => {
			return this.commandArgs.definitionId.val().then(definitionId => {
				return this.commandArgs.artifact.val().then(artifact => {
					return this.commandArgs.manualEnvironments.val().then(manualEnvironments => {
						return definitionapi.then((defapi) => {
							return defapi.getReleaseDefinition(project as string, definitionId as number).then((definition) => {
								var releaseMetadata: releaseContracts.ReleaseStartMetadata = new RMD;
								var artifactMetadata: releaseContracts.ArtifactMetadata = new AMD;
								var artifactVersion: releaseContracts.BuildVersion = new BV;
								return buildapi.getBuild(project, artifact).then(build => {
									artifactVersion.definitionId = build.definition.id.toString();
									artifactVersion.definitionName = build.definition.name;
									artifactVersion.id = build.id.toString();
									artifactVersion.sourceBranch = build.sourceBranch;
									artifactMetadata.alias = definition.artifacts[0].alias;
									artifactMetadata.instanceReference = new BV;
									artifactMetadata.instanceReference = artifactVersion;
									releaseMetadata.definitionId = definitionId;
									releaseMetadata.artifacts = [artifactMetadata];
									var manualEnvironmentlist = manualEnvironments ? manualEnvironments.split(";"): [];
									manualEnvironmentlist.forEach(environment => {
										trace.debug("setting environment %s to manual",environment)
									});
									releaseMetadata.manualEnvironments = manualEnvironmentlist;
									return releaseapi.createRelease(releaseMetadata,project);
								});
							});
						});
					});
				});
			});
		});
	}

	public friendlyOutput(release: releaseContracts.Release): void {
		if (!release) {
			throw new Error("no release supplied");
		}

		trace.println();
		trace.info("id              : %s", release.id);
		trace.info("definition name : %s", release.releaseDefinition ? release.releaseDefinition.name : "unknown");
		trace.info("requested by    : %s", release.createdBy ? release.createdBy.displayName : "unknown");
		trace.info("status          : %s", releaseContracts.ReleaseStatus[release.status]);
	}
	
}
class RMD implements releaseContracts.ReleaseStartMetadata {
	artifacts?: releaseContracts.ArtifactMetadata[];
	definitionId?: number;
	description?: string;
	environmentsMetadata?: releaseContracts.ReleaseStartEnvironmentMetadata[];
	isDraft?: boolean;
	manualEnvironments?: string[];
	properties?: any;
	reason?: releaseContracts.ReleaseReason;
	variables?: {
		[key: string]: releaseContracts.ConfigurationVariableValue;
	};
}
class AMD implements releaseContracts.ArtifactMetadata {
	alias?: string;
	instanceReference?: releaseContracts.BuildVersion;
}
class BV implements releaseContracts.BuildVersion {
	commitMessage?: string;
	definitionId?: string;
	definitionName?: string;
	id?: string;
	isMultiDefinitionType?: boolean;
	name?: string;
	sourceBranch?: string;
	sourcePullRequestVersion?: releaseContracts.SourcePullRequestVersion;
	sourceRepositoryId?: string;
	sourceRepositoryType?: string;
	sourceVersion?: string;
}
class ASR implements releaseContracts.ArtifactSourceReference {
    /**
     * ID of the artifact source.
     */
	id?: string;
    /**
     * Name of the artifact source.
     */
	name?: string;
}