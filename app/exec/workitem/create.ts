import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("azure-devops-node-api/WorkItemTrackingApi");
import witContracts = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemCreate {
	return new WorkItemCreate(args);
}

export class WorkItemCreate extends witBase.WorkItemBase<witContracts.WorkItem> {
	protected description = "Create a Work Item.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["workItemType", "title", "assignedTo", "description", "project", "values"];
	}

	public exec(): Promise<witContracts.WorkItem> {
		return Promise.all([
			this.commandArgs.workItemType.val(),
			this.commandArgs.project.val(),
			this.commandArgs.title.val(true),
			this.commandArgs.assignedTo.val(true),
			this.commandArgs.description.val(true),
			this.commandArgs.values.val(true),
			this.webApi.getWorkItemTrackingApi()
		]).then(promiseValues => {
			const [wiType, project, title, assignedTo, description, values, witApi] = promiseValues;
			if (!title && !assignedTo && !description && (!values || Object.keys(values).length <= 0)) {
				throw new Error("At least one field value must be specified.");
			}

			var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
			return witApi.createWorkItem(null, patchDoc, project, wiType);
		});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		return witBase.friendlyOutput([workItem]);
	}
}
