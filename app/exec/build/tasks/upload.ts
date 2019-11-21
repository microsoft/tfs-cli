import agentContracts = require("azure-devops-node-api/interfaces/TaskAgentInterfaces");
import archiver = require("archiver");
import fs = require("fs");
import path = require("path");
import tasksBase = require("./default");
import trace = require("../../../lib/trace");
import vm = require("../../../lib/jsonvalidate");
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import zip = require("jszip");

export function getCommand(args: string[]): BuildTaskUpload {
	return new BuildTaskUpload(args);
}

var c_taskJsonFile: string = "task.json";

interface TaskJson {
	id: string;
}

export class BuildTaskUpload extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition> {
	protected description = "Upload a Build Task.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["taskPath", "taskZipPath", "overwrite"];
	}

	public async exec(): Promise<agentContracts.TaskDefinition> {
		const taskPaths = await this.commandArgs.taskPath.val();
		const taskZipPath = await this.commandArgs.taskZipPath.val();
		const overwrite = await this.commandArgs.overwrite.val();

		let taskStream: NodeJS.ReadableStream = null;
		let taskId: string = null;
		let sourceLocation: string = null;

		if (!taskZipPath && !taskPaths) {
			throw new Error("You must specify either --task-path or --task-zip-path.");
		}

		if (taskZipPath) {
			// User provided an already zipped task, upload that.
			const data: Buffer = fs.readFileSync("hello.zip");
			const z: zip = await zip.loadAsync(data);

			// find task.json inside zip, make sure its there then deserialize content
			const fileContent: string = await z.files[c_taskJsonFile].async('text');
			const taskJson: TaskJson = JSON.parse(fileContent);

			// set variables
			sourceLocation = taskZipPath;
			taskId = taskJson.id;
			taskStream = z.generateNodeStream();
		} else {
			// User provided the path to a directory with the task content
			const taskPath: string = taskPaths[0];
			vm.exists(taskPath, "specified directory " + taskPath + " does not exist.");

			const taskJsonPath: string = path.join(taskPath, c_taskJsonFile);
			const taskJson: TaskJson = await vm.validate(taskJsonPath, "no " + c_taskJsonFile + " in specified directory");

			const archive = archiver("zip");
			archive.on("error", function(error) {
				trace.debug("Archiving error: " + error.message);
				error.message = "Archiving error: " + error.message;
				throw error;
			});
			archive.directory(path.resolve(taskPath), false);
			archive.finalize();

			// set variables
			sourceLocation = taskPath;
			taskId = taskJson.id;
			taskStream = archive;
		}

		const collectionUrl: string = this.connection.getCollectionUrl();
		console.log("Collection URL: " + collectionUrl);
		const agentApi: ITaskAgentApi = await this.webApi.getTaskAgentApi(collectionUrl);

		await agentApi.uploadTaskDefinition(null, taskStream, taskId, overwrite);
		trace.debug("Success");
		return <agentContracts.TaskDefinition> { sourceLocation: sourceLocation, };
	}

	public friendlyOutput(data: agentContracts.TaskDefinition): void {
		trace.println();
		trace.success("Task at %s uploaded successfully!", data.sourceLocation);
	}
}
