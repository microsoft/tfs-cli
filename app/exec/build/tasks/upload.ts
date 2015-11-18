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
	protected description = "Upload a Build Task.";

	protected getHelpArgs(): string[] {
		return ["taskPath", "overwrite"];
	}

	public exec(): Q.Promise<agentContracts.TaskDefinition> {
		return this.commandArgs.taskPath.val().then((taskPaths) => {
			let taskPath = taskPaths[0];
			return this.commandArgs.overwrite.val().then((overwrite) => {
				vm.exists(taskPath, 'specified directory ' + taskPath + ' does not exist.');
				//directory is good, check json

				let tp = path.join(taskPath, c_taskJsonFile);
				return vm.validate(tp, 'no ' + c_taskJsonFile + ' in specified directory').then((taskJson) => {
					let archive = archiver('zip');
					archive.on('error', function(error) {
						trace.debug('Archiving error: ' + error.message);
						error.message = 'Archiving error: ' + error.message;
						throw error;
					});
					archive.directory(path.resolve(taskPath), false);

					let agentApi = this.webApi.getQTaskAgentApi(this.connection.getCollectionUrl());

					archive.finalize();
					return agentApi.uploadTaskDefinition(null, archive, taskJson.id, overwrite).then((task) => {
						trace.debug('Success');
						return <agentContracts.TaskDefinition>{
							sourceLocation: taskPath
						};
					});
				});
			});
		});
	}

	public friendlyOutput(data: agentContracts.TaskDefinition): void {
		trace.println();
		trace.success('Task at %s uploaded successfully!', data.sourceLocation);
	}
}