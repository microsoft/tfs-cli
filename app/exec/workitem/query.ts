import { EOL as eol } from "os";
import { TfCommand } from "../../lib/tfcommand";
import _ = require("lodash");
import args = require("../../lib/arguments");
import coreContracts = require("vso-node-api/interfaces/CoreInterfaces");
import trace = require("../../lib/trace");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemQuery {
	return new WorkItemQuery(args);
}

export class WorkItemQuery extends witBase.WorkItemBase<witContracts.WorkItem[]> {
	protected description = "Get a list of workitems given query";

	public exec(): Q.Promise<witContracts.WorkItem[]> {
		var witApi: witClient.IQWorkItemTrackingApi = this.webApi.getQWorkItemTrackingApi();

		return this.commandArgs.project.val().then((projectName) => {
			return this.commandArgs.query.val().then((query) => {
				let wiql: witContracts.Wiql = { query: query };
				return witApi.queryByWiql(wiql, <coreContracts.TeamContext>{ project: projectName }).then((result) => {
					let workItemIds = result.workItems.map(val => val.id).slice(0, Math.min(200, result.workItems.length));
					let fieldRefs = result.columns.map(val => val.referenceName).slice(0, Math.min(20, result.columns.length));
					return witApi.getWorkItems(workItemIds, fieldRefs);
				});
			});
		});

	}

	public friendlyOutput(data: witContracts.WorkItem[]): void {
		if (!data) {
			throw new Error("no results");
		}

		if (_.isArray(data)) {
			throw new Error("expected an array of workitems");
		}

		data.forEach((workItem) => {
			trace.info(eol);
			trace.info("id:          " + workItem.id);
			trace.info("rev:         " + workItem.rev);
			trace.info("type:        " + workItem.fields["System.WorkItemType"]);
			trace.info("state:       " + workItem.fields["System.State"]);
			trace.info("title:       " + workItem.fields["System.Title"]);
			trace.info("assigned to: " + workItem.fields["System.AssignedTo"]);
		});
	}
}