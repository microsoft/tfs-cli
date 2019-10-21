// var extract = require('extract-zip')
import fs = require("fs");
import path = require("path");
import shell = require("shelljs");
import tasksBase = require("./default");
// import { resolve } from "url";
// var JSZip = require("jszip");
// var zipFolder = require("zip-folder");
// import zipdir = require('zip-dir');
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
		return ["taskPath", "manifestPath"]; // TODO: Add other parameters here, test usage of help command for sign
	}

	// TODO: tfx not node tfx-cli.js
	// node tfx-cli.js build tasks sign --task-path E:\github\vsts-tasks\_build\Tasks\CmdLineV2 --cert-fingerprint 515521DB5C8C3FCFDBD62C1D5DFA2583EE3E1BB5 --new-guid 87AC3A14-3F27-49B9-91D6-8E27D4475354 --new-name-suffix '- SIGNED'
	public async exec(): Promise<TaskSignResult> {
		const taskZipsPath: string[] | null = await this.commandArgs.taskPath.val();
		const taskZipPath = taskZipsPath[0];
		const certFingerprint: string | null = await this.commandArgs.certFingerprint.val();

		let newGuid: string | null = null;
		const newGuidArg: any = await this.commandArgs.newGuid;
		if (newGuidArg) {
			newGuid = newGuidArg.val()
		}

		let newNameSuffix: string | null = null;
		const newNameSuffixArg: any = await this.commandArgs.newNameSuffix;
		if (newNameSuffixArg) {
			newNameSuffix = newNameSuffixArg.val();
		}

		// verify that we can find NuGet
		const nuGetPath: string = shell.which('nuget');
		if (!nuGetPath) {
			throw new Error('Unable to find NuGet. Please add NuGet to the PATH before continuing.');
		}

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
		taskTempFolder = path.join(taskTempFolder, path.basename(taskZipPath));

		// Update guid/name
		const needToUpdateTaskJson: boolean = !!newGuid || !!newNameSuffix; // TODO: Is !! correct? What else can we use.
		if (needToUpdateTaskJson) {
			// newGuid
			// newNameSuffix -- idempontent, only set if it's not already the suffix? maybe not. will always be on new task.

		}

		// Zip
		console.log('Zip');
		await this.zipDirectory(taskTempFolder, taskTempZipPath);

		// Rename to nupkg
		console.log('Rename to nupkg');
		fs.renameSync(taskTempZipPath, taskTempNupkgPath);
		
		// Sign
		console.log('Sign');
		const command: string = `"${nuGetPath}" sign ${taskTempNupkgPath} -CertificateFingerprint ${certFingerprint} -NonInteractive`;
		//const command: string = `"${nuGetPath}" sign ${taskTempNupkgPath} -CertificateFingerprint BADCERT -NonInteractive`;
		const execResult: any = shell.exec(command, { silent: true });
		if (execResult.code === 1) { 
			trace.info(execResult.output);

			// TODO: Cleanup.

			return <TaskSignResult> { signingSuccessful: false };
		}
		// var version = exec('node --version', {silent:true}).stdout;
		// .code



		// TODO: Check stdout to see if there's an error, if there is set the result accordingly. And print out the error.
		// TODO: Test this by passing a cert that doesn't exist.

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
		console.log('Copy signature file to original task');
		const signatureFileName: string = '.signature.p7s';
		const signatureFileSource: string = path.join(taskAfterSignTempFolder, signatureFileName);
		const signatureFileDestination: string = path.join(taskZipPath, signatureFileName);
		fs.copyFileSync(signatureFileSource, signatureFileDestination); // TODO: Make sure this overrides existing files.

		// // Delete temp folder
		// //fs.rmdirSync(tempFolder);
		console.log('done');

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
