import { TfCommand } from "../../../lib/tfcommand";
import agentContracts = require('azure-devops-node-api/interfaces/TaskAgentInterfaces');
import args = require("../../../lib/arguments");
import fs = require('fs');
import path = require('path');
import tasksBase = require("./default");
import trace = require('../../../lib/trace');
import vm = require('../../../lib/jsonvalidate')

export function getCommand(args: string[]): BuildTaskDownload {
	return new BuildTaskDownload(args);
}

var c_taskJsonFile: string = 'task.json';

export class BuildTaskDownload extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition> {
    protected serverCommand = true;
	protected description = "Download a Build Task.";

	protected getHelpArgs(): string[] {
		return ["id","taskVersion","name"];
	}

	public exec(): Promise<agentContracts.TaskDefinition> {
		return this.commandArgs.id.val().then((Id) => {
			if (!Id) {
				Id = "";
			}
			return this.commandArgs.taskVersion.val().then((Version) =>{
				let agentApi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
				trace.debug("retriving tasks from the server ...")
					return agentApi.then((api) => {return api.getTaskDefinitions(null, ['build'], null).then((tasks) => {
						var taskDictionary = this._getNewestTasks(tasks);
						return this.commandArgs.name.val().then((Name) => {
							if (!Id) {
								taskDictionary.forEach(element => {
									if (element.name == Name) {
										Id = element.id;
										if (!Version) {
											Version = element.version.major + "." + element.version.minor + "." + element.version.patch;;
										}
									}
								});
								trace.info("found %s with version %s ...",Name,Version);
							}
							else
							{
								taskDictionary.forEach(element => {
									if (element.id == Id) {
										Name = element.name;
										if (!Version) {
											Version = element.version.major + "." + element.version.minor + "." + element.version.patch;;
										}
									}
								});
								trace.info("found %s with version %s ...",Name,Version);	
							}
							if (!Id && !Version) {
								var error = ("error: No Tasks found with this name ["+Name+"]");
								throw(error);
							}
								return agentApi.then((api) => { return api.getTaskDefinition(Id,Version).then((task) => {
									return task;
								});
							});
						});
					});
				});
			});	
		});
		}

	public friendlyOutput(task: agentContracts.TaskDefinition): void {
		if (!task) {
			throw new Error('no tasks supplied');
		}
		trace.println();
		trace.info('id			: %s', task.id);
		trace.info('name			: %s', task.name);
		trace.info('friendly name		: %s', task.friendlyName);
		trace.info('description		: %s', task.description);
		trace.info('visibility		: %s', task.visibility ? task.visibility.join(",") : "");
		trace.info('category		: %s', task.category);
		trace.info('demands			: %s', JSON.stringify(task.demands));
		trace.info('version			: %s', new TaskVersion(task.version).toString());
		};

	
	private _getNewestTasks(allTasks: agentContracts.TaskDefinition[]): agentContracts.TaskDefinition[] {
		var taskDictionary: { [id: string]: agentContracts.TaskDefinition; } = {};
		for (var i = 0; i < allTasks.length; i++) {
			var currTask: agentContracts.TaskDefinition = allTasks[i];
			if(taskDictionary[currTask.id])
			{
				var newVersion: TaskVersion = new TaskVersion(currTask.version);
				var knownVersion: TaskVersion = new TaskVersion(taskDictionary[currTask.id].version);
				trace.debug("Found additional version of " + currTask.name + " and comparing to the previously encountered version.");
				if (this._compareTaskVersion(newVersion, knownVersion) > 0) {
					trace.debug("Found newer version of " + currTask.name + ".  Previous: " + knownVersion.toString() + "; New: " + newVersion.toString());
					taskDictionary[currTask.id] = currTask;
				}
			}
			else {
				trace.debug("Found task " + currTask.name);
				taskDictionary[currTask.id] = currTask;
			}
		}
		var newestTasks: agentContracts.TaskDefinition[] = [];
		for(var id in taskDictionary) {
			newestTasks.push(taskDictionary[id]);
		}
		return newestTasks;
	}
	
	private _compareTaskVersion(version1: TaskVersion, version2: TaskVersion): number {
		if(version1.major != version2.major) {
			return version1.major - version2.major;
		}
		if(version1.minor != version2.minor) {
			return version1.minor - version2.minor;
		}
		if(version1.patch != version2.patch) {
			return version1.patch - version2.patch;
		}
		return 0;
	}
}
class TaskVersion {
	major: number;
	minor: number;
	patch: number;

	constructor(versionData: any) {
		this.major = versionData.major || 0;
		this.minor = versionData.minor || 0;
		this.patch = versionData.patch || 0;
	}

	public toString(): string {
		return this.major + "." + this.minor + "." + this.patch;
	}
}
