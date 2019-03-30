import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("azure-devops-node-api/WorkItemTrackingApi");
import witContracts = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemShow {
	return new WorkItemShow(args);
}

export class WorkItemShow extends witBase.WorkItemBase<witContracts.WorkItem> {
	protected description = "Show Work Item details.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["workItemId"];
	}

	public exec(): Promise<witContracts.WorkItem> {
		return this.webApi.getWorkItemTrackingApi()
			.then(witApi => {
				return this.commandArgs.workItemId.val().then(workItemId => {
					return witApi.getWorkItem(workItemId);
				});
			});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		return witBase.friendlyOutput([workItem]);
	}
}
