var extract = require('extract-zip')
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
	// tfx build tasks sign --task-path ./Foo --cert-path C:/mycert
	// tfx build tasks sign --manifest-path ./Foo/manifest.json
	public async exec(): Promise<TaskSignResult> {
		console.log('starting');

		const taskZipPath: string | null = await this.commandArgs.taskZipPath.val();
		const manifestPath: string | null = await this.commandArgs.manifestPath.val();
		const certificatePath: string | null = await this.commandArgs.certificatePath.val();

		if (taskZipPath && manifestPath) {
			throw new Error('Cannot provide both taskZipPath and manifestPath.');
		}

		if (!taskZipPath && !manifestPath) {
			throw new Error('Must provide either taskZipPath or manifestPath.');
		}

		if (taskZipPath && !certificatePath) {
			throw new Error('--cert-path must be provided when --task-path is provided.');
		}

		// verify that we can find NuGet
		const nuGetPath: string = shell.which('nuget');
		if (!nuGetPath) {
			throw new Error('Unable to find NuGet. Please add NuGet to the PATH before continuing.');
		}

		// Sign a single task
		if (taskZipPath) {
			const resolvedTaskPath: string = path.resolve(taskZipPath); // Need to do this? Paths could be relative for either.

			console.log(`resolved: ${resolvedTaskPath}`);

			const tempFolder: string = 'C:\\temp';
			const taskTempFolder: string = path.join(tempFolder, 'task');
			const taskTempZipPath: string = path.join(tempFolder, 'task.zip');
			const taskTempNupkgPath: string = path.join(tempFolder, 'task.nupkg');

			// Create temp folder
			fs.mkdirSync(tempFolder);
			fs.mkdirSync(taskTempFolder);

			// Copy task contents to temp folder
			shell.cp('-R', taskZipPath, taskTempFolder);

			// Zip
			await zipFolder(taskTempFolder, taskTempZipPath);

			// Rename to nupkg
			fs.renameSync(taskTempZipPath, taskTempNupkgPath);
			
			// Sign
			shell.exec(`${nuGetPath} sign ${taskTempNupkgPath} -CertificatePath ${certificatePath}`);
			
			// Rename to zip
			fs.renameSync(taskTempNupkgPath, taskTempZipPath);
			
			// Extract into new temp task folder
			const taskAfterSignTempFolder: string = path.join(tempFolder, 'task-after-sign');
			fs.mkdirSync(taskAfterSignTempFolder);
			await extract(taskTempZipPath, taskAfterSignTempFolder);
			
			// Copy signature file to original task
			

			// Delete temp folder
			//fs.rmdirSync(tempFolder);
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
