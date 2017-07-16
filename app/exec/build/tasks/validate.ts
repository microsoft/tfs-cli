import { TfCommand } from "../../../lib/tfcommand";
import agentContracts = require('vso-node-api/interfaces/TaskAgentInterfaces');
import archiver = require('archiver');
import args = require("../../../lib/arguments");
import fs = require('fs');
import path = require('path');
import tasksBase = require("./default");
import trace = require('../../../lib/trace');
import vm = require('../../../lib/jsonvalidate')
var check = require('validator');


export function getCommand(args: string[]): BuildTaskValidate {
	return new BuildTaskValidate(args);
}

var c_taskJsonFile: string = 'task.json';

export class BuildTaskValidate extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition> {
	protected description = "Validate a Build Task.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["taskPath"];
	}

	public exec(): Promise<agentContracts.TaskDefinition> {
		return this.commandArgs.taskPath.val().then((taskPaths) => {
			let taskPath = taskPaths[0];
			return this.commandArgs.overwrite.val().then<agentContracts.TaskDefinition>((overwrite) => {
				vm.exists(taskPath, 'specified directory ' + taskPath + ' does not exist.');
				//directory is good, check json

				let tp = path.join(taskPath, c_taskJsonFile);
				return vm.validate(tp, 'no ' + c_taskJsonFile + ' in specified directory').then((taskJson) => {
					let archive = archiver('zip');
					archive.on('error', function (error) {
						trace.debug('Archiving error: ' + error.message);
						error.message = 'Archiving error: ' + error.message;
						throw error;
					});
					return <agentContracts.TaskDefinition>{
						sourceLocation: taskPath
					};
				});
			});
		});
	}



	public validate(jsonFilePath) {
		var taskJson;
		try {
			taskJson = require(jsonFilePath);
		}
		catch (jsonError) {
			console.log('jsonError = ' + jsonError)
			trace.debug('Invalid task json: %s', jsonError);
			throw new Error("Invalid task json: " + jsonError);
		}

		this.validateTask(jsonFilePath, taskJson);
	}


	/*
	* Validates a parsed json file describing a build task
	* @param taskPath the path to the original json file
	* @param taskData the parsed json file
	* @return list of issues with the json file
	*/
	public validateTask(taskPath: string, taskData: any): string[] {
		var vn = (taskData.name || taskPath);
		var issues: string[] = [];

		if (!taskData.id || !check.isUUID(taskData.id)) {
			issues.push(vn + ': id is a required guid');
		}

		if (!taskData.name || !check.isAlphanumeric(taskData.name)) {
			issues.push(vn + ': name is a required alphanumeric string');
		}

		if (!taskData.friendlyName || !check.isLength(taskData.friendlyName, 1, 40)) {
			issues.push(vn + ': friendlyName is a required string <= 40 chars');
		}

		if (!taskData.instanceNameFormat) {
			issues.push(vn + ': instanceNameFormat is required');
		}
		return issues;
	}

	public friendlyOutput(data: agentContracts.TaskDefinition): void {
		trace.println();
		trace.success('Task at %s Validate successfully!', data.sourceLocation);
	}
}



