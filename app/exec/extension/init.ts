import { createExtension } from "./create";
import { exec } from "child_process";
import * as jsonInPlace from "json-in-place";
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
		this.registerCommandArgument(
			"branch",
			"Branch",
			"Branch name for sample repository (default: master)",
			args.StringArgument,
			"master",
			true,
		);
		this.registerCommandArgument(
			"zipUri",
			"Zip URI",
			"URI to a zip file containing the sample extension. {{branch}} is replaced with the --branch argument value.",
			args.StringArgument,
			"https://codeload.github.com/Microsoft/azure-devops-extension-sample/zip/{{branch}}",
			true,
		);
		this.registerCommandArgument(
			"noDownload",
			"No Download",
			"Do not download or extract the sample package. Instead use the given folder assuming package already exists there.",
			args.BooleanArgument,
			"false",
			true,
		);
		this.registerCommandArgument(
			"npmPath",
			"NPM path",
			"Command line to invoke npm. May need to include the node executable.",
			args.StringArgument,
			"npm",
		);
		this.registerCommandArgument(
			"publisher",
			"Publisher",
			"Publisher ID for this extension. Create a publisher at <url>.",
			args.StringArgument
		);
		this.registerCommandArgument(
			"extensionId",
			"Extension ID",
			"This extension's ID.",
			args.StringArgument
		);
		this.registerCommandArgument(
			"extensionName",
			"Extension name",
			"Friendly name of this extension.",
			args.StringArgument
		);
	}

	protected getHelpArgs(): string[] {
		return ["path", "branch", "zipUri", "noDownload"];
	}

	public async exec(): Promise<InitResult> {

		trace.info("--Azure DevOps Extension Initialization--");
		trace.info("  For all options, run `tfx extension init --help`");

		const initPath = (await this.commandArgs.path.val())[0];
		const branch = await this.commandArgs.branch.val();
		const samplePackageUri = (await this.commandArgs.zipUri.val()).replace("{{branch}}", encodeURIComponent(branch));
		const noDownload = await this.commandArgs.noDownload.val();
		const npmPath = await this.commandArgs.npmPath.val();
		const extensionPublisher = await this.commandArgs.publisher.val();
		const extensionId = await this.commandArgs.extensionId.val();
		const extensionName = await this.commandArgs.extensionName.val();

		await this.createFolderIfNotExists(initPath);

		const isFolder = await this.checkIsFolder(initPath);
		if (!isFolder) {
			throw new Error("Given path is not a folder: " + initPath);
		}

		const isAccessible = await this.checkFolderAccessible(initPath);
		if (!isAccessible) {
			throw new Error("Could not access folder for reading and writing: " + initPath);
		}

		// If --no-download is passed, do not download or unpack the zip file. Assume the folder's contents contain the zip file.
		if (!noDownload) {
			const isEmpty = await this.checkFolderIsEmpty(initPath);
			if (!isEmpty) {
				throw new Error("Folder is not empty: " + initPath);
			}

			const downloadedZipPath = path.join(initPath, "azure-devops-extension-sample.zip");
			const zipFile = fs.createWriteStream(downloadedZipPath);
			let bytesReceived = 0;
			try {
				await new Promise((resolve, reject) => {
					trace.info("Downloading sample package from " + samplePackageUri);
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
										trace.debug("Writing buffer for " + fileName);
										const noLeadingFolderFileName = fileName.substr(fileName.indexOf("/"));
										const fullPath = path.join(initPath, noLeadingFolderFileName);
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
		}

		// Check for existence of node_modules. If it's not there, try installing the package.
		const nodeModulesPath = path.join(initPath, "node_modules");
		const alreadyInstalled = await this.checkFolderAccessible(nodeModulesPath);
		if (!alreadyInstalled) {
			trace.debug("No node_modules folder found.");
			trace.info("Running `" + npmPath + " install in " + initPath + "... please wait.`.");
			await new Promise((resolve, reject) => {
				const npmCommand = exec(
					npmPath + " install",
					{
						cwd: initPath,
					},
					(err, stdout) => {
						if (err) {
							reject(err);
						} else {
							resolve(stdout);
						}
					},
				);
			});
		} else {
			trace.info(`${nodeModulesPath} already exists. Foregoing npm install.`);
		}

		// Yes, this is a lie. We're actually going to run tfx extension create manually.
		trace.info("Building sample with `npm run build`");
		await new Promise((resolve, reject) => {
			const npmCommand = exec(
				npmPath + " run compile:dev",
				{
					cwd: initPath,
				},
				(err, stdout) => {
					if (err) {
						reject(err);
					} else {
						resolve(stdout);
					}
				},
			);
		});

		// @todo Crack the azure-devops-extension.json file to update the publisher and extension id.
		const mainManifestPath = path.join(initPath, "azure-devops-extension.json");
		const manifestContents = await promisify(fs.readFile)(mainManifestPath, "utf8");
		const newManifest = jsonInPlace(manifestContents).set("publisher", extensionPublisher).set("id", extensionId).set("name", extensionName);
		await promisify(fs.writeFile)(mainManifestPath, newManifest.toString(), "utf8");

		trace.debug("Building extension package.");
		const createResult = await createExtension({
			manifestGlobs: ["azure-devops-extension.json", "src/Samples/**/*.json"],
			revVersion: true,
			bypassValidation: false,
			locRoot: null,
			manifests: null,
			overrides: {},
			root: initPath
		}, {
			locRoot: null,
			metadataOnly: false,
			outputPath: initPath
		});

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
