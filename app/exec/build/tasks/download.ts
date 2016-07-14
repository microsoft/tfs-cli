import { TfCommand } from "../../../lib/tfcommand";
import agentContracts = require('vso-node-api/interfaces/TaskAgentInterfaces');
import archiver = require('archiver');
import args = require("../../../lib/arguments");
import fs = require('fs');
import path = require('path');
import Q = require('q');
import tasksBase = require("./default");
import trace = require('../../../lib/trace');
import vm = require('../../../lib/jsonvalidate')

export function getCommand(args: string[]): BuildTaskUpload {
	return new BuildTaskUpload(args);
}

var c_taskJsonFile: string = 'task.json';

export class BuildTaskUpload extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition> {
	protected description = "Download a Build Task.";

	protected getHelpArgs(): string[] {
		return ["taskId","taskVersion"];
	}

	public exec(): Q.Promise<agentContracts.TaskDefinition> {
		return this.commandArgs.taskId.val().then((Id) => {
			return this.commandArgs.taskVersion.val().then((Version) =>{
				let agentApi = this.webApi.getQTaskAgentApi(this.connection.getCollectionUrl());
				return agentApi.getTaskContentZip(Id,Version).then((task) => {
						task.pipe(fs.createWriteStream(Id+"-"+Version+".zip"));
						trace.info('Downloading ... ');
						return <agentContracts.TaskDefinition>{
							id: Id
						};
					});
				});
			});	
		}

	public friendlyOutput(task: agentContracts.TaskDefinition): void {
		trace.println();
		trace.success('[%s] Downloaded successfully!', task.id);
	}
}