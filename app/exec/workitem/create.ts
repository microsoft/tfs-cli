import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import Q = require("q");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemCreate {
	return new WorkItemCreate(args);
}

export class WorkItemCreate extends witBase.WorkItemBase<witContracts.WorkItem> {

	protected getHelpArgs(): string[] {
		return ["workItemType", "title", "assignedTo", "description", "project", "values"];
	}

	public exec(): Q.Promise<witContracts.WorkItem> {
		var witapi = this.webApi.getQWorkItemTrackingApi();

		return Q.all([
			this.commandArgs.workItemType.val(),
			this.commandArgs.project.val(),
			this.commandArgs.title.val(true),
			this.commandArgs.assignedTo.val(true),
			this.commandArgs.description.val(true),
			this.commandArgs.project.val()
		]).spread((wiType, assignedTo, title, description, project) => {
			var patchDoc: vssCoreContracts.JsonPatchOperation[]  = [];
			patchDoc.push({
				op: vssCoreContracts.Operation.Add,
				path: "/fields/System.Title",
				value: title,
				from: null
			});

			if (assignedTo) {
				patchDoc.push({
					op: vssCoreContracts.Operation.Add,
					path: "/fields/System.AssignedTo",
					value: assignedTo,
					from: null
				});
			}

			if (description) {
				patchDoc.push({
					op: vssCoreContracts.Operation.Add,
					path: "/fields/System.Description",
					value: description,
					from: null
				});
			}
            // TODO: Check why this is failing in Feature Create
			return witapi.updateWorkItemTemplate(null, <vssCoreContracts.JsonPatchDocument>patchDoc, project, wiType);
			this.commandArgs.values.val(true)
		]).spread((wiType, project, title, assignedTo, description, values) => {
			
            var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
            return witapi.createWorkItem(null, patchDoc, project, wiType);
		});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		return witBase.friendlyOutput([workItem]);
	}
}