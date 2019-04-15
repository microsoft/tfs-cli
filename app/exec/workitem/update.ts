import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("azure-devops-node-api/WorkItemTrackingApi");
import witContracts = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemUpdate {
	return new WorkItemUpdate(args);
}

export class WorkItemUpdate extends witBase.WorkItemBase<witContracts.WorkItem> {
	protected description = "Update a Work Item.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["workItemId", "title", "assignedTo", "description", "values"];
	}

	public async exec(): Promise<witContracts.WorkItem> {
		var witapi = await this.webApi.getWorkItemTrackingApi();

		return Promise.all([
			this.commandArgs.workItemId.val(),
			this.commandArgs.title.val(true),
			this.commandArgs.assignedTo.val(true),
			this.commandArgs.description.val(true),
			this.commandArgs.values.val(true),
		]).then(promiseValues => {
			const [workItemId, title, assignedTo, description, values] = promiseValues;
			if (!title && !assignedTo && !description && (!values || Object.keys(values).length <= 0)) {
				throw new Error("At least one field value must be specified.");
			}

			var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
			return witapi.updateWorkItem(null, patchDoc, workItemId);
		});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		return witBase.friendlyOutput([workItem]);
	}
}
