var extract = require('extract-zip')
import fs = require("fs");
import path = require("path");
import shell = require("shelljs");
import tasksBase = require("./default");
import { resolve } from "url";
var JSZip = require("jszip");
var zipFolder = require("zip-folder");
import zipdir = require('zip-dir');
var archiver = require('archiver');
var admZip = require('adm-zip');
import trace = require("../../../lib/trace");

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

	protected getHelpArgs(): string[] {
		return ["taskPath", "manifestPath"];
	}

	// TODO: Task path needs to be non zipped so we can use tfx build tasks upload --task-path ./Foo after
	// node tfx-cli.js build tasks sign --task-path E:\github\vsts-tasks\_build\Tasks\CmdLineV2 --certificate-path C:\certs\user.pfx
	// tfx build tasks sign --manifest-path ./Foo/manifest.json
	public async exec(): Promise<TaskSignResult> {
		// console.log(`taskzippath: ${JSON.stringify(this.commandArgs.taskPath)}`);
		// console.log(`manifestPath: ${JSON.stringify(this.commandArgs.manifestPath)}`);
		// console.log(`certificatepath: ${JSON.stringify(this.commandArgs.certificatePath)}`);

		const taskZipPath: string[] | null = await this.commandArgs.taskPath.val();
		const manifestPath: string | null = await this.commandArgs.manifestPath.val();
		const certificatePath: string | null = await this.commandArgs.certificatePath.val();

		if (taskZipPath && manifestPath) {
			throw new Error('Cannot provide both --task-path and --manifest-path.');
		}

		if (!taskZipPath && !manifestPath) {
			throw new Error('Must provide either --task-path and --manifest-path.');
		}

		if (taskZipPath && !certificatePath) {
			throw new Error('--certificate-path must be provided when --task-path is provided.');
		}

		// verify that we can find NuGet
		const nuGetPath: string = shell.which('nuget');
		if (!nuGetPath) {
			throw new Error('Unable to find NuGet. Please add NuGet to the PATH before continuing.');
		}

		// Sign a single task
		// TODO: Just always use a manifest file?
		if (taskZipPath) {
			// TODO: Fix array usage. Just want first item.
			const resolvedTaskPath: string = path.resolve(taskZipPath[0]); // Need to do this? Paths could be relative for either. Does it matter?

			console.log(`resolved: ${resolvedTaskPath}`);

			const tempFolder: string = 'C:\\temp2\\testing';
			let taskTempFolder: string = path.join(tempFolder, 'task');
			const taskTempZipPath: string = path.join(tempFolder, 'task.zip');
			const taskTempNupkgPath: string = path.join(tempFolder, 'task.nupkg');

			// Create temp folder
			// TODO: Get rid of this?
			if (fs.existsSync(tempFolder)) {
				fs.rmdirSync(tempFolder);
			}

			fs.mkdirSync(tempFolder);
			fs.mkdirSync(taskTempFolder);

			// Copy task contents to temp folder
			console.log('Copy task contents to temp folder');
			shell.cp('-R', taskZipPath, taskTempFolder);

			// Task temp folder is now task\PREVIOUS_NAME
			taskTempFolder = path.join(taskTempFolder, path.basename(taskZipPath[0]));

			// Zip
			console.log('Zip');
			await this.zipDirectory(taskTempFolder, taskTempZipPath);

			// Rename to nupkg
			console.log('Rename to nupkg');
			fs.renameSync(taskTempZipPath, taskTempNupkgPath);
			
			// Sign
			console.log('Sign');
			const command: string = `"${nuGetPath}" sign ${taskTempNupkgPath} -CertificatePath ${certificatePath} -CertificatePassword 1234 -NonInteractive`; // TODO: Pass to cli
			const result = shell.exec(command, { silent: true });
			// TODO: Check stdout to see if there's an error, if there is set the result accordingly. And print out the error.

			// TODO: Update to pass cert password in cli? Or just always use a manifest
			
			// Rename to zip
			console.log('Rename to zip');
			fs.renameSync(taskTempNupkgPath, taskTempZipPath);

			// Extract into new temp task folder
			console.log('Extract into new temp task folder');
			const taskAfterSignTempFolder: string = path.join(tempFolder, 'task-after-sign');
			fs.mkdirSync(taskAfterSignTempFolder);
			var zip = new admZip(taskTempZipPath);
			zip.extractAllTo(taskAfterSignTempFolder);

			// Copy signature file to original task
			console.log('Copy signature file to original task -- TODO');
			const signatureFileName: string = '.signature.p7s';
			const signatureFileSource: string = path.join(taskAfterSignTempFolder, signatureFileName);
			const signatureFileDestination: string = path.join(taskZipPath[0], signatureFileName);
			fs.copyFileSync(signatureFileSource, signatureFileDestination); // TODO: Make sure this overrides existing files.

			// // Delete temp folder
			// //fs.rmdirSync(tempFolder);
			console.log('done');
		}

		if (manifestPath) {
			// Process the manifest file

		}

		// TODO: Do we want to generate a manifest file optionally for them?
		// TODO: Should we allow them to pass a flag if it's in the box?

		const result: TaskSignResult = <TaskSignResult> { signingSuccessful: true };
		return result;
	}

	private zipDirectory(source, out): Promise<any> {
		const archive = archiver('zip', { zlib: { level: 9 }});
		const stream = fs.createWriteStream(out);

		return new Promise((resolve, reject) => {
			archive
				.directory(source, false)
				.on('error', err => reject(err))
				.pipe(stream)
			;

			stream.on('close', () => resolve());
			archive.finalize();
		});
	}

	public friendlyOutput(data: TaskSignResult): void {
		trace.println();

		if (data.signingSuccessful) {
			trace.success("Task signed successfully!");
		} else {
			trace.error("Task signing failed.");
		}
	}
}
