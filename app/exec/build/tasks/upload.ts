import { TfCommand } from "../../../lib/tfcommand";
import agentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import archiver = require("archiver");
import args = require("../../../lib/arguments");
import fs = require("fs");
import path = require("path");
import tasksBase = require("./default");
import trace = require("../../../lib/trace");
import vm = require("../../../lib/jsonvalidate");

export function getCommand(args: string[]): BuildTaskUpload {
	return new BuildTaskUpload(args);
}

var c_taskJsonFile: string = "task.json";

export class BuildTaskUpload extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition[]> {
	protected description = "Upload Build Tasks.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["taskPath", "overwrite"];
	}

	public async exec(): Promise<agentContracts.TaskDefinition[]> {
		return this.commandArgs.taskPath.val().then(async (taskPaths) => {
			let definitionArr: agentContracts.TaskDefinition[] = [];

			const collectionUrl = this.connection.getCollectionUrl();
			console.log("Collection URL: " + collectionUrl);
			let agentApi = await this.webApi.getTaskAgentApi(collectionUrl);

			for (let i = 0; i < taskPaths.length; i++) {
				let taskPath = taskPaths[i];
				console.log("Uploading task: " + taskPath);
				let definition: agentContracts.TaskDefinition | null = await this.commandArgs.overwrite.val().then<agentContracts.TaskDefinition>(overwrite => {
					vm.exists(taskPath, "specified directory " + taskPath + " does not exist.");
					//directory is good, check json
	
					let tp = path.join(taskPath, c_taskJsonFile);
					return vm.validate(tp, "no " + c_taskJsonFile + " in specified directory").then(async taskJson => {
						let archive = archiver("zip");
						archive.on("error", function(error) {
							trace.debug("Archiving error: " + error.message);
							error.message = "Archiving error: " + error.message;
							throw error;
						});
						archive.directory(path.resolve(taskPath), false);
	
						archive.finalize();
						return agentApi.uploadTaskDefinition(null, <any>archive, taskJson.id, overwrite).then(() => {
							trace.debug("Success");
							return <agentContracts.TaskDefinition>{
								sourceLocation: taskPath,
							};
						});
					});
				});
				if (definition) {
					definitionArr.push(definition);
				}
			}
			return definitionArr;
		});
	}

	public friendlyOutput(dataArray: agentContracts.TaskDefinition[]): void {
		trace.println();
		dataArray.forEach(data => {
			trace.success("Task at %s uploaded successfully!", data.sourceLocation);
		})
	}
}
