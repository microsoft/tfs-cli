import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import Q = require("q");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemUpdate {
	return new WorkItemUpdate(args);
}

export class WorkItemUpdate extends witBase.WorkItemBase<witContracts.WorkItem> {

	protected getHelpArgs(): string[] {
		return ["workItemId", "title", "assignedTo", "description", "values"];
	}

	public exec(): Q.Promise<witContracts.WorkItem> {
		var witapi = this.webApi.getQWorkItemTrackingApi();

		return Q.all([
			this.commandArgs.workItemId.val(),
			this.commandArgs.title.val(true),
			this.commandArgs.assignedTo.val(true),
			this.commandArgs.description.val(true),
			this.commandArgs.values.val(true)
		]).spread((workItemId, title, assignedTo, description, values) => {
			
            var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
            return witapi.updateWorkItem(null, patchDoc, workItemId);
		});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		return witBase.friendlyOutput([workItem]);
	}
}