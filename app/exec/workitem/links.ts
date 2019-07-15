import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("azure-devops-node-api/WorkItemTrackingApi");
import witContracts = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");
import { WorkItemExpand } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";

export function getCommand(args: string[]): WorkItemLinks {
	return new WorkItemLinks(args);
}

export class WorkItemLinks extends witBase.WorkItemBase<witContracts.WorkItem[]> {
	protected description = "Show Work Item links.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["workItemId"];
	}

	public exec(): Promise<witContracts.WorkItem[]> {
		var ids = [];
		var witapi = this.webApi.getWorkItemTrackingApi();
		return this.commandArgs.workItemId.val().then((workItemId) => {
			ids[0] = workItemId;
			return witapi.then((api) => { return api.getWorkItems(ids, null, null, WorkItemExpand.All) });
		});
	}

	public friendlyOutput(workItems: witContracts.WorkItem[]): void {
		workItems.forEach((wi) => {
			wi.relations.forEach((link) =>{
				trace.println();
				trace.info("%s: [%s] %s", link.rel, link.url, link.attributes["name"] ? "- " + link.attributes["name"] : "")
			})
			trace.println();
		})
		return //witBase.friendlyOutput(workItems);
	}
}