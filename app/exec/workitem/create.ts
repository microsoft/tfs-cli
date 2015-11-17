import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import Q = require("q");
import vssCoreContracts = require("vso-node-api/interfaces/common/VSSInterfaces")
import tfsCoreContracts = require("vso-node-api/interfaces/CoreInterfaces");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemCreate {
	return new WorkItemCreate(args);
}

export class WorkItemCreate extends witBase.WorkItemBase<witContracts.WorkItem> {

	protected getHelpArgs(): string[] {
		return ["workItemType", "title", "assignedTo", "description", "project"];
	}

	public exec(): Q.Promise<witContracts.WorkItem> {
		var witapi = this.webApi.getQWorkItemTrackingApi();

		return Q.all([
			this.commandArgs.workItemType.val(),
			this.commandArgs.assignedTo.val(true),
			this.commandArgs.title.val(),
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

			return witapi.updateWorkItemTemplate(null, <vssCoreContracts.JsonPatchDocument>patchDoc, project, wiType);
		});
	}

	public friendlyOutput(workItem: witContracts.WorkItem): void {
		if (!workItem) {
			throw new Error("no results");
		}
		
		trace.success(eol + "Created Work Item @ " + workItem.id + eol);
		trace.info("id:          " + workItem.id);
		trace.info("rev:         " + workItem.rev);
		trace.info("type:        " + workItem.fields["System.WorkItemType"]);
		trace.info("state:       " + workItem.fields["System.State"]);
		trace.info("title:       " + workItem.fields["System.Title"]);
		trace.info("assigned to: " + workItem.fields["System.AssignedTo"]);
	}
}