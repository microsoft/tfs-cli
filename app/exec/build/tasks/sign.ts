import fs = require("fs");
import path = require("path");
import shell = require("shelljs");
import tasksBase = require("./default");
import { resolve } from "url";
import zip = require("jszip");
var zipFolder = require("zip-folder");

export interface TaskSignResult {
	signingSuccessful: boolean;
}

export function getCommand(args: string[]): BuildTaskSign {
	return new BuildTaskSign(args);
}

export class BuildTaskSign extends tasksBase.BuildTaskBase<TaskSignResult> {
	protected description = "Sign one or more build tasks.";
	protected serverCommand = true;

	constructor(args: string[]) {
		super(args);
	}

	// TODO: Task path needs to be non zipped so we can use tfx build tasks upload --task-path ./Foo after
	// tfx build tasks sign --task-path ./Foo
	// tfx build tasks sign --manifest-path ./Foo/manifest.json
	public async exec(): Promise<TaskSignResult> {
		console.log('starting');

		const taskZipPath: string | null = await this.commandArgs.taskZipPath.val();
		const manifestPath: string | null = await this.commandArgs.manifestPath.val();

		if (taskZipPath && manifestPath) {
			throw new Error('Cannot provide both taskZipPath and manifestPath.');
		}

		if (!taskZipPath && !manifestPath) {
			throw new Error('Must provide either taskZipPath or manifestPath.');
		}

		// verify that we can find NuGet
		const nuGetPath: string = shell.which('nuget');
		if (!nuGetPath) {
			throw new Error('Unable to find NuGet. Please add NuGet to the PATH before continuing.');
		}

		// Sign a single task
		if (taskZipPath) {
			const resolvedTaskPath: string = path.resolve(taskZipPath);

			console.log(`resolved: ${resolvedTaskPath}`);

			const tempFolder: string = 'C:\\temp';
			const taskTempFolder: string = path.join(tempFolder, 'task');

			// Create temp folder
			fs.mkdirSync(tempFolder);
			fs.mkdirSync(taskTempFolder);

			// Copy task contents to temp folder
			shell.cp('-R', taskZipPath, taskTempFolder);

			// Zip
			await zipFolder(taskTempFolder, path.join(tempFolder, 'task.zip'));

			// Rename to nupkg
			
			
			// Sign
			
			
			// Rename to zip
			
			
			// Extract
			
			
			// Copy signature file to original task

			// Delete temp folder

		}

		if (manifestPath) {
			// Process the manifest file

		}

		// TODO: Do we want to generate a manifest file optionally for them?
		// TODO: Should we allow them to pass a flag if it's in the box?

		const result: TaskSignResult = <TaskSignResult>{};

		//shell.exec


		return result;
	}

	protected getHelpArgs(): string[] {
		return ["taskPath", "manifestPath"];
	}
}
