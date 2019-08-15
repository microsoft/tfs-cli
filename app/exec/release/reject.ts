import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import releaseBase = require("./default");
import releaseClient = require("azure-devops-node-api/ReleaseApi");
import releaseContracts = require("azure-devops-node-api/interfaces/ReleaseInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): ReleaseReject {
	return new ReleaseReject(args);
}

export class ReleaseReject extends releaseBase.ReleaseBase<releaseBase.ReleaseArguments, releaseContracts.Release> {
	protected description = "Reject release.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "releaseId", "environmentName"];
	}

	public async exec(): Promise<releaseContracts.Release> {
		trace.debug("release-reject.exec");
		var releaseapi: releaseClient.IReleaseApi = await this.webApi.getReleaseApi();
		return this.commandArgs.project.val().then(project => {
			return this.commandArgs.releaseId.val().then(releaseId => {
				return this.commandArgs.environmentName.val().then(environmentName => {
					return releaseapi.getRelease(project, releaseId).then(release =>{
						return releaseapi.getApprovals(project,null,releaseContracts.ApprovalStatus.Pending,null,null,null,null,null,null).then(approvals => {
							var environmentId
							release.environments.forEach(environment => {
								if (environment.name == environmentName) {
									environmentId = environment.id;
								}
							});
							return releaseapi.getReleaseEnvironment(project,release.id,environmentId).then(environmentReference => {
								var approvalReference;
								approvals.forEach(approval => {
									if (approval.release.id == release.id){
										if (approval.releaseEnvironment.name == environmentReference.name){
											approvalReference = approval;
											approvalReference.status = releaseContracts.ApprovalStatus.Rejected;
											trace.debug(JSON.stringify(approval));
										}
									}
								})
								return releaseapi.updateReleaseApproval(approvalReference,project,approvalReference.id).then(updatedApproval => {
									return release;
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
		trace.info("name            : %s", release.name);
		trace.info("definition name : %s", release.releaseDefinition ? release.releaseDefinition.name : "unknown");
		trace.info("requested by    : %s", release.createdBy ? release.createdBy.displayName : "unknown");
		trace.info("status          : %s", releaseContracts.ReleaseStatus[release.status]);
	}
}