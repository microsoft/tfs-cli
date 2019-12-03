import agentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import tasksBase = require("./default");
import trace = require("../../../lib/trace");

export function getCommand(args: string[]): BuildTaskList {
	return new BuildTaskList(args);
}

export class BuildTaskList extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition[]> {
	protected description = "Get a list of build tasks";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["all","filter"];
	}

	public async exec(): Promise<agentContracts.TaskDefinition[]> {
		var agentapi = await this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());

		trace.debug("Searching for build tasks...");
		return agentapi.getTaskDefinitions(null, ["build"], null).then(tasks => {
			trace.debug("Retrieved " + tasks.length + " build tasks from server.");
			return this.commandArgs.all.val().then(all => {
				if (all) {
					trace.debug("Listing all build tasks.");
					return tasks;
				} else {
					trace.debug("Filtering build tasks to give only the latest versions.");
					return this._getNewestTasks(tasks);
				}
			});
		});
	}

	/*
	 * takes a list of non-unique task definitions and returns only the newest unique definitions
	 * TODO: move this code to the server, add a parameter to the controllers
	 */
	private _getNewestTasks(allTasks: agentContracts.TaskDefinition[]): agentContracts.TaskDefinition[] {
		var taskDictionary: { [id: string]: agentContracts.TaskDefinition } = {};
		for (var i = 0; i < allTasks.length; i++) {
			var currTask: agentContracts.TaskDefinition = allTasks[i];
			if (taskDictionary[currTask.id]) {
				var newVersion: TaskVersion = new TaskVersion(currTask.version);
				var knownVersion: TaskVersion = new TaskVersion(taskDictionary[currTask.id].version);
				trace.debug(
					"Found additional version of " + currTask.name + " and comparing to the previously encountered version.",
				);
				if (this._compareTaskVersion(newVersion, knownVersion) > 0) {
					trace.debug(
						"Found newer version of " +
							currTask.name +
							".  Previous: " +
							knownVersion.toString() +
							"; New: " +
							newVersion.toString(),
					);
					taskDictionary[currTask.id] = currTask;
				}
			} else {
				trace.debug("Found task " + currTask.name);
				taskDictionary[currTask.id] = currTask;
			}
		}
		var newestTasks: agentContracts.TaskDefinition[] = [];
		for (var id in taskDictionary) {
			newestTasks.push(taskDictionary[id]);
		}
		return newestTasks;
	}
	/*
	 * compares two versions of tasks, which are stored in version objects with fields 'major', 'minor', and 'patch'
	 * @return positive value if version1 > version2, negative value if version2 > version1, 0 otherwise
	 */
	private _compareTaskVersion(version1: TaskVersion, version2: TaskVersion): number {
		if (version1.major != version2.major) {
			return version1.major - version2.major;
		}
		if (version1.minor != version2.minor) {
			return version1.minor - version2.minor;
		}
		if (version1.patch != version2.patch) {
			return version1.patch - version2.patch;
		}
		return 0;
	}

	public friendlyOutput(data: agentContracts.TaskDefinition[]): void {
		if (!data) {
			throw new Error("no tasks supplied");
		}

		if (!(data instanceof Array)) {
			throw new Error("expected an array of tasks");
		}

		data.forEach(task => {
			trace.println();
			trace.info("id            : %s", task.id);
			trace.info("name          : %s", task.name);
			trace.info("friendly name : %s", task.friendlyName);
			trace.info("visibility    : %s", task.visibility ? task.visibility.join(",") : "");
			trace.info("description   : %s", task.description);
			trace.info("version       : %s", new TaskVersion(task.version).toString());
		});
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
