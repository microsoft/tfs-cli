import { promisify } from "util";
import { TfCommand } from "../../lib/tfcommand";
import * as args from "../../lib/arguments";
import * as colors from "colors";
import * as extBase from "./default";
import * as fs from "fs";
import * as http from "https";
import * as mkdirp from "mkdirp";
import * as path from "path";
import * as trace from "../../lib/trace";
import * as jszip from "jszip";
import { fileAccess } from "../../lib/fsUtils";

const samplePackageUri = "https://codeload.github.com/Microsoft/azure-devops-extension-sample/zip/master";

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, InitResult> {
	return new ExtensionInit(args);
}

export interface InitResult {}

export class ExtensionInit extends extBase.ExtensionBase<InitResult> {
	protected description = "Initialize a directory for development of a new Azure DevOps extension.";
	protected serverCommand = false;

	constructor(passedArgs: string[]) {
		super(passedArgs);
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument(
			"path",
			"Path",
			"Path to the folder where the extension will be initialized. Must be an empty folder.",
			args.FilePathsArgument,
			process.cwd(),
		);
	}

	protected getHelpArgs(): string[] {
		return ["path"];
	}

	public async exec(): Promise<InitResult> {
		const initPath = (await this.commandArgs.path.val())[0];
		await this.createFolderIfNotExists(initPath);

		const isFolder = await this.checkIsFolder(initPath);
		if (!isFolder) {
			throw new Error("Given path is not a folder: " + initPath);
		}

		const isAccessible = await this.checkFolderAccessible(initPath);
		if (!isAccessible) {
			throw new Error("Could not access folder for reading and writing: " + initPath);
		}

		const isEmpty = true || (await this.checkFolderIsEmpty(initPath));
		if (!isEmpty) {
			throw new Error("Folder is not empty: " + initPath);
		}

		const downloadedZipPath = path.join(initPath, "azure-devops-extension-sample.zip");
		const zipFile = fs.createWriteStream(downloadedZipPath);
		let bytesReceived = 0;
		try {
			await new Promise((resolve, reject) => {
				trace.info("Downloading sample package");
				http.get(samplePackageUri, response => {
					response
						.on("data", chunk => {
							bytesReceived += chunk.length;
							zipFile.write(chunk);
						})
						.on("end", () => {
							zipFile.end(resolve);
						})
						.on("error", err => {
							reject(err);
						});
				}).on("error", err => {
					reject(err);
				});
			});
		} catch (e) {
			fs.unlink(downloadedZipPath, err => {});
			throw new Error("Failed to download sample package from " + samplePackageUri + ". Error: " + e);
		}
		trace.info(`Package downloaded to ${downloadedZipPath} (${Math.round(bytesReceived / 1000)} kB)`);

		// Crack open the zip file.
		try {
			await new Promise((resolve, reject) => {
				fs.readFile(downloadedZipPath, async (err, data) => {
					if (err) {
						reject(err);
					} else {
						await jszip.loadAsync(data).then(async zip => {
							// Write each file in the zip to the file system in the same directory as the zip file.
							for (const fileName of Object.keys(zip.files)) {
								trace.debug("Save file " + fileName);
								await zip.files[fileName].async("nodebuffer").then(async buffer => {
									const fullPath = path.join(initPath, fileName);
									if (fullPath.endsWith("\\")) {
										// don't need to "write" the folders since they are handled by createFolderIfNotExists().
										return;
									}
									trace.debug("Creating folder if it doesn't exist: " + path.dirname(fullPath));
									await this.createFolderIfNotExists(path.dirname(fullPath));
									fs.writeFile(fullPath, buffer, err => {
										if (err) {
											console.log("err: " + err);
											reject(err);
										}
									});
								});
							}
						});
						resolve();
					}
				});
			});
		} catch (e) {
			await this.deleteFolderContents(initPath);
			throw new Error(`Error unzipping ${downloadedZipPath}: ${e}`);
		}

		trace.debug("Delete zip file " + downloadedZipPath);
		await promisify(fs.unlink)(downloadedZipPath);

		

		return {} as InitResult;
	}

	protected friendlyOutput(data: InitResult): void {
		trace.info(colors.green("\n=== Completed operation: initialize extension ==="));
	}

	private async checkFolderIsEmpty(folderPath: string) {
		const files = await promisify(fs.readdir)(folderPath);
		return files.length === 0;
	}

	private async checkIsFolder(folderPath: string) {
		const lstat = await promisify(fs.lstat)(folderPath);
		return lstat.isDirectory();
	}

	private async checkFolderAccessible(folderPath: string) {
		try {
			const access = await promisify(fs.access)(folderPath, fs.constants.W_OK | fs.constants.R_OK);
			return true;
		} catch {
			return false;
		}
	}

	private async deleteFolderContents(folderPath: string) {
		trace.debug("Deleting contents of " + folderPath);
		if (folderPath.length <= 3 || !path.isAbsolute(folderPath)) {
			throw new Error("Are you really trying to delete " + folderPath + " ?");
		}
		const files = await promisify(fs.readdir)(folderPath);
		console.log("Files: " + files.join(", "));
		for (const file of files) {
			const fullName = path.join(folderPath, file);
			const stat = await promisify(fs.lstat)(fullName);
			if (stat.isDirectory()) {
				await this.deleteFolderContents(fullName);
			} else {
				await promisify(fs.unlink)(fullName);
			}
		}
	}

	private async createFolderIfNotExists(folderPath: string) {
		try {
			await new Promise((resolve, reject) => {
				mkdirp(folderPath, err => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		} catch {
			// folder already exists, perhaps. Or maybe we can't write to it.
		}
	}
}
