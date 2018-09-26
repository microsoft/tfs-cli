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
	protected description = "Get a list of Work Items given a query";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["project", "query"];
	}

	public async exec(): Promise<witContracts.WorkItem[]> {
		var witApi: witClient.IWorkItemTrackingApi = await this.webApi.getWorkItemTrackingApi();

		return this.commandArgs.project.val(true).then(projectName => {
			return this.commandArgs.query.val().then(query => {
				let wiql: witContracts.Wiql = { query: query };
				return witApi.queryByWiql(wiql, <coreContracts.TeamContext>{ project: projectName }).then(result => {
					let workItemIds: number[] = [];

					// Flat Query
					if (result.queryType == witContracts.QueryType.Flat) {
						workItemIds = result.workItems.map(val => val.id).slice(0, Math.min(200, result.workItems.length));
					}

					// Link Query
					else {
						let sourceIds = result.workItemRelations
							.filter(relation => relation.source && relation.source.id)
							.map(relation => relation.source.id);
						let targetIds = result.workItemRelations
							.filter(relation => relation.target && relation.target.id)
							.map(relation => relation.target.id);
						let allIds = sourceIds.concat(targetIds);
						workItemIds = allIds.slice(0, Math.min(200, allIds.length));
					}

					let fieldRefs = result.columns.map(val => val.referenceName);

					fieldRefs = fieldRefs.slice(0, Math.min(20, result.columns.length));
					return workItemIds.length > 0 ? witApi.getWorkItems(workItemIds, fieldRefs) : [];
				});
			});
		});
	}

	public friendlyOutput(data: witContracts.WorkItem[]): void {
		return witBase.friendlyOutput(data);
	}
}
