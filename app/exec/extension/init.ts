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

const basicWebpackConfig = `const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: "./src/index.js",
    output: {
        filename: "[name]/[name].js"
    },
    resolve: {
        extensions: [".js"],
    },
    stats: {
        warnings: false
    },
    module: {
        rules: [
            
        ]
    },
    plugins: [
        new CopyWebpackPlugin([ { from: "**/*.html", context: "src/" }])
    ]
};
`;
const basicDevDependencies = {
	"copy-webpack-plugin": "^4.5.4",
	"file-loader": "~2.0.0",
	rimraf: "~2.6.2",
	"tfx-cli": "^0.6.3",
	webpack: "^4.22.0",
	"webpack-cli": "^3.1.2",
};

const shorthandMap = {
	a: "<all>",
	all: "<all>",
	f: "feature",
	h: "hub",
	m: "menu",
	p: "panel",
	v: "pivot",
	w: "workitemopen",
	n: "<none>",
	none: "<none>",
};

function getSamplesToRemove(selection: string, availableSamples: string[]) {
	const split = selection
		.split(/,|;|\s+/)
		.filter(v => v.trim().length > 0)
		.map(v => v.toLowerCase().trim())
		.map(v => shorthandMap[v] || v);

	if (split.indexOf("<all>") >= 0) {
		return [];
	}
	if (split.indexOf("<none>") >= 0) {
		return [...availableSamples];
	}
	return availableSamples.filter(as => split.indexOf(as.toLowerCase()) === -1);
}

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, InitResult> {
	return new ExtensionInit(args);
}

export interface InitResult {
	path: string;
}

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
			"Publisher ID",
			"Publisher ID for this extension. Create a publisher at https://marketplace.visualstudio.com/manage.",
			args.StringArgument,
		);
		this.registerCommandArgument("extensionId", "Extension ID", "This extension's ID.", args.StringArgument);
		this.registerCommandArgument("extensionName", "Extension name", "Friendly name of this extension.", args.StringArgument);
		this.registerCommandArgument(
			"samples",
			colors.white("Which samples do you want to start with?") +
				colors.gray(
					" You may specifiy multiple (comma-separated).\nFor descriptions, see https://github.com/Microsoft/azure-devops-extension-sample\n  (A)ll, \n  (F)eature, \n  (H)ub, \n  (M)enu, \n  (P)anel, \n  Pi(v)ot, \n  (W)orkItemOpen, \n  (N)one - empty project\n",
				),
			"Specify which samples to include in the new extension.",
			args.StringArgument,
			undefined,
			false,
			"All",
		);
	}

	protected getHelpArgs(): string[] {
		return ["path", "branch", "zipUri", "noDownload", "npmPath", "publisher", "extensionId", "extensionName"];
	}

	public async exec(): Promise<InitResult> {
		trace.info("");
		trace.info(colors.yellow("  --  New Azure DevOps Extension  --"));
		trace.info("");
		trace.info(colors.cyan("For all options and help, run `tfx extension init --help`"));
		trace.info("");

		const initPath = (await this.commandArgs.path.val())[0];
		const noDownload = await this.commandArgs.noDownload.val();
		await this.createFolderIfNotExists(initPath);

		const isFolder = await this.checkIsFolder(initPath);
		if (!isFolder) {
			throw new Error("Given path is not a folder: " + initPath);
		}

		const isAccessible = await this.checkFolderAccessible(initPath);
		if (!isAccessible) {
			throw new Error("Could not access folder for reading and writing: " + initPath);
		}

		if (!noDownload) {
			const isEmpty = await this.checkFolderIsEmpty(initPath, ["node_modules"]);
			if (!isEmpty) {
				throw new Error("Folder is not empty: " + initPath);
			}
		}

		const branch = await this.commandArgs.branch.val();
		const samplePackageUri = (await this.commandArgs.zipUri.val()).replace("{{branch}}", encodeURIComponent(branch));
		const npmPath = await this.commandArgs.npmPath.val();
		const extensionPublisher = await this.commandArgs.publisher.val();
		const extensionId = await this.commandArgs.extensionId.val();
		const extensionName = await this.commandArgs.extensionName.val();
		const wantedSamples = await this.commandArgs.samples.val();

		// If --no-download is passed, do not download or unpack the zip file. Assume the folder's contents contain the zip file.
		if (!noDownload) {
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
										if (fullPath.endsWith("\\") || fullPath.endsWith("/")) {
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

		trace.debug("Getting available samples");
		const samplesPath = path.join(initPath, "src", "Samples");
		const samplesList = await promisify(fs.readdir)(samplesPath);
		let samplesToRemove = getSamplesToRemove(wantedSamples, samplesList);
		const includesHub = samplesToRemove.indexOf("Hub") >= 0;
		const includesBcs = samplesToRemove.indexOf("BreadcrumbService") >= 0;
		if (includesHub && !includesBcs) {
			samplesToRemove.push("BreadcrumbService");
		} else if (!includesHub && includesBcs) {
			samplesToRemove = samplesToRemove.filter(s => s !== "BreadcrumbService");
		}

		const includedSamples = samplesList.filter(s => samplesToRemove.indexOf(s) === -1 && s !== "BreadcrumbService");
		if (includedSamples.length > 0) {
			trace.info("Including the following samples: ");
			trace.info(
				includedSamples.map(s => {
					const text = s === "Hub" ? s + " (with BreadcrumbService)" : s;
					return " - " + text;
				}),
			);

			trace.debug("Deleting the following samples: " + samplesToRemove.join(", "));
			for (const sampleToRemove of samplesToRemove) {
				await this.deleteNonEmptyFolder(path.join(samplesPath, sampleToRemove));
			}
		} else {
			trace.info("Including no samples (starting with an empty project).");
			const webpackConfigPath = path.join(initPath, "webpack.config.js");

			// Delete all the samples
			await this.deleteNonEmptyFolder(samplesPath);
			await promisify(fs.unlink)(path.join(initPath, "src", "Common.scss"));
			await promisify(fs.unlink)(path.join(initPath, "src", "Common.tsx"));

			// Update the webpack config and create a dummy js file in src.
			await promisify(fs.unlink)(webpackConfigPath);
			await promisify(fs.writeFile)(webpackConfigPath, basicWebpackConfig, "utf8");
			await promisify(fs.writeFile)(path.join(initPath, "src", "index.js"), "", "utf8");

			// Delete tsconfig, overview.md, and truncate readme
			await promisify(fs.unlink)(path.join(initPath, "tsconfig.json"));
			await promisify(fs.unlink)(path.join(initPath, "overview.md"));
			await promisify(fs.writeFile)(path.join(initPath, "README.md"), "", "utf8");
		}

		trace.info("Updating azure-devops-extension.json with publisher ID, extension ID, and extension name.");
		const mainManifestPath = path.join(initPath, "azure-devops-extension.json");
		const manifestContents = await promisify(fs.readFile)(mainManifestPath, "utf8");
		const packageJsonPath = path.join(initPath, "package.json");
		const packageJsonContents = await promisify(fs.readFile)(packageJsonPath, "utf8");
		const newManifest = jsonInPlace(manifestContents)
			.set("publisher", extensionPublisher)
			.set("id", extensionId)
			.set("name", extensionName)
			.set("version", "1.0.0")
			.set("description", "Azure DevOps Extension")
			.set("categories", ["Azure Repos", "Azure Boards", "Azure Pipelines", "Azure Test Plans", "Azure Artifacts"]);

		const newPackageJson = jsonInPlace(packageJsonContents)
			.set("repository.url", "")
			.set("description", extensionName)
			.set("name", extensionId)
			.set("version", "1.0.0");
		const newManifestObj = JSON.parse(newManifest.toString());
		if (includedSamples.length === 0) {
			newPackageJson
				.set("scripts.package-extension", "tfx extension create --manifests azure-devops-extension.json")
				.set("scripts.publish-extension", "tfx extension publish --manifests azure-devops-extension.json")
				.set("devDependencies", basicDevDependencies);
			delete newManifestObj["icons"];
			delete newManifestObj["content"];
		}
		await promisify(fs.writeFile)(mainManifestPath, JSON.stringify(newManifestObj, null, 4), "utf8");
		await promisify(fs.writeFile)(packageJsonPath, newPackageJson.toString(), "utf8");

		// Check for existence of node_modules. If it's not there, try installing the package.
		const nodeModulesPath = path.join(initPath, "node_modules");
		const alreadyInstalled = await this.checkFolderAccessible(nodeModulesPath);
		if (!alreadyInstalled) {
			trace.debug("No node_modules folder found.");
			trace.info("Running `" + npmPath + " install` in " + initPath + "... please wait.");
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
			trace.info(`The folder "${nodeModulesPath}" already exists. Foregoing npm install.`);
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

		trace.debug("Building extension package.");
		const manifestGlobs = ["azure-devops-extension.json"];
		if (includedSamples.length > 0) {
			manifestGlobs.push("src/Samples/**/*.json");
		}
		const createResult = await createExtension(
			{
				manifestGlobs: manifestGlobs,
				revVersion: false,
				bypassValidation: includedSamples.length === 0, // need to bypass validation when there are no contributions
				locRoot: null,
				manifestJs: null,
				env: null,
				manifests: null,
				overrides: {},
				root: initPath,
				json5: false,
			},
			{
				locRoot: null,
				metadataOnly: false,
				outputPath: initPath,
			},
		);

		return { path: initPath } as InitResult;
	}

	protected friendlyOutput(data: InitResult): void {
		trace.info(colors.green("\n=== Completed operation: initialize extension ==="));
		trace.info(`Azure DevOps Extension initialized in "${data.path}".`);
		trace.info("");
		trace.info(colors.red("Don't forget to update the package.json file with relevant details about your project and update LICENSE as necessary."));
	}

	private async checkFolderIsEmpty(folderPath: string, allowedNames: string[] = []) {
		const files = (await promisify(fs.readdir)(folderPath)).filter(n => allowedNames.indexOf(n) === -1);
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
		for (const file of files) {
			const fullName = path.join(folderPath, file);
			const stat = await promisify(fs.lstat)(fullName);
			if (stat.isDirectory()) {
				await this.deleteFolderContents(fullName);
				await promisify(fs.rmdir)(fullName);
			} else {
				await promisify(fs.unlink)(fullName);
			}
		}
	}

	private async deleteNonEmptyFolder(folderPath: string) {
		await this.deleteFolderContents(folderPath);
		await promisify(fs.rmdir)(folderPath);
	}

	private async createFolderIfNotExists(folderPath: string) {
		try {
			await mkdirp(folderPath);
		} catch {
			// folder already exists, perhaps. Or maybe we can't write to it.
		}
	}
}
