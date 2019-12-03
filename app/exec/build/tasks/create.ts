import check = require("validator");
import fs = require("fs");
import path = require("path");
import shell = require("shelljs");
import tasksBase = require("./default");
import trace = require("../../../lib/trace");
import uuid = require("uuid");


export interface TaskCreateResult {
	taskPath: string;
	definition: TaskDefinition;
}

export interface TaskDefinition {
	id: string;
	name: string;
	friendlyName: string;
	description: string;
	author: string;
	helpMarkDown: string;
	category: string;
	visibility: string[];
	demands: any[];
	version: { Major: string; Minor: string; Patch: string };
	minimumAgentVersion: string;
	instanceNameFormat: string;
}

export function getCommand(args: string[]): TaskCreate {
	return new TaskCreate(args);
}

export class TaskCreate extends tasksBase.BuildTaskBase<TaskCreateResult> {
	protected description = "Create files for new Build Task";
	protected serverCommand = false;

	constructor(args: string[]) {
		super(args);
	}

	protected getHelpArgs(): string[] {
		return ["taskName", "friendlyName", "description", "author"];
	}

	public async exec(): Promise<TaskCreateResult> {
		trace.debug("build-create.exec");

		return Promise.all([
			this.commandArgs.taskName.val(),
			this.commandArgs.friendlyName.val(),
			this.commandArgs.description.val(),
			this.commandArgs.author.val(),
		]).then(values => {
			const [taskName, friendlyName, description, author] = values;
			if (!taskName || !check.isAlphanumeric(taskName)) {
				throw new Error("taskName is a required alphanumeric string with no spaces");
			}

			if (!friendlyName || !check.isLength(friendlyName, 1, 40)) {
				throw new Error("friendlyName is a required string <= 40 chars");
			}

			if (!description || !check.isLength(description, 1, 80)) {
				throw new Error("description is a required string <= 80 chars");
			}

			if (!author || !check.isLength(author, 1, 40)) {
				throw new Error("author is a required string <= 40 chars");
			}

			let ret = <TaskCreateResult>{};

			// create definition
			trace.debug("creating folder for task");
			let tp = path.join(process.cwd(), taskName);
			trace.debug(tp);
			shell.mkdir("-p", tp);
			trace.debug("created folder");
			ret.taskPath = tp;

			trace.debug("creating definition");
			let def: any = {};
			def.id = uuid.v1();
			trace.debug("id: " + def.id);
			def.name = taskName;
			trace.debug("name: " + def.name);
			def.friendlyName = friendlyName;
			trace.debug("friendlyName: " + def.friendlyName);
			def.description = description;
			trace.debug("description: " + def.description);
			def.author = author;
			trace.debug("author: " + def.author);

			def.helpMarkDown = "Replace with markdown to show in help";
			def.category = "Utility";
			def.visibility = ["Build", "Release"];
			def.demands = [];
			def.version = { Major: "0", Minor: "1", Patch: "0" };
			def.minimumAgentVersion = "1.95.0";
			def.instanceNameFormat = taskName + " $(message)";

			let cwdInput = {
				name: "cwd",
				type: "filePath",
				label: "Working Directory",
				defaultValue: "",
				required: false,
				helpMarkDown: "Current working directory when " + taskName + " is run.",
			};

			let msgInput = {
				name: "msg",
				type: "string",
				label: "Message",
				defaultValue: "Hello World",
				required: true,
				helpMarkDown: "Message to echo out",
			};

			def.inputs = [cwdInput, msgInput];

			def.execution = {
				Node: {
					target: "sample.js",
					argumentFormat: "",
				},
				PowerShell3: {
					target: "sample.ps1",
				},
			};

			ret.definition = def;

			trace.debug("writing definition file");
			let defPath = path.join(tp, "task.json");
			trace.debug(defPath);
			try {
				let defStr = JSON.stringify(def, null, 2);
				trace.debug(defStr);
				fs.writeFileSync(defPath, defStr);
			} catch (err) {
				throw new Error("Failed creating task: " + err.message);
			}
			trace.debug("created definition file.");

			let copyResource = function(fileName) {
				let src = path.join(__dirname, "_resources", fileName);
				trace.debug("src: " + src);
				let dest = path.join(tp, fileName);
				trace.debug("dest: " + dest);
				shell.cp(src, dest);
				trace.debug(fileName + " copied");
			};

			trace.debug("creating temporary icon");
			copyResource("icon.png");
			copyResource("sample.js");
			copyResource("sample.ps1");
			return ret;
		});
	}

	public friendlyOutput(data: TaskCreateResult): void {
		if (!data) {
			throw new Error("no results");
		}

		trace.println();
		trace.success("created task @ %s", data.taskPath);
		let def = data.definition;
		trace.info("id   : %s", def.id);
		trace.info("name: %s", def.name);
		trace.println();
		trace.info("A temporary task icon was created.  Replace with a 32x32 png with transparencies");
	}
}
