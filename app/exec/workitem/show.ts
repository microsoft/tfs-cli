import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemShow {
	return new WorkItemShow(args);
}

export class WorkItemShow extends witBase.WorkItemBase<witContracts.WorkItem> {
	protected description = "Show Work Item details.";

	protected getHelpArgs(): string[] {
		return ["workItemId"];
	}

	public exec(): Q.Promise<witContracts.WorkItem> {
		var witapi: witClient.IQWorkItemTrackingApi = this.webApi.getQWorkItemTrackingApi();
		return this.commandArgs.workItemId.val().then((workItemId) => {
			return witapi.getWorkItem(workItemId)
		});
	}

	public friendlyOutput(data: witContracts.WorkItem): void {
		if (!data) {
			throw new Error("no results");
		}

		var workItem: witContracts.WorkItem = data;

		trace.info(eol);
		trace.info("id:          " + workItem.id);
		trace.info("rev:         " + workItem.rev);
		trace.info("type:        " + workItem.fields["System.WorkItemType"]);
		trace.info("state:       " + workItem.fields["System.State"]);
		trace.info("title:       " + workItem.fields["System.Title"]);
		trace.info("assigned to: " + workItem.fields["System.AssignedTo"]);
	}
}