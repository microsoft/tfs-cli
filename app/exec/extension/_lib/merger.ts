import { ManifestBuilder } from "./manifest";
import { ComposerFactory } from "./extension-composer-factory";
import { ExtensionComposer } from "./extension-composer";
import {
	FileDeclaration,
	LocalizedResources,
	MergeSettings,
	PackageFiles,
	ResourceSet,
	ResourcesFile,
	TargetDeclaration,
} from "./interfaces";
import { forwardSlashesPath, toZipItemName } from "./utils";
import _ = require("lodash");
import fs = require("fs");
import glob = require("glob");
import jju = require("jju");
import jsonInPlace = require("json-in-place");
import loc = require("./loc");
import path = require("path");
import trace = require("../../../lib/trace");
import version = require("../../../lib/dynamicVersion");

import { promisify } from "util";
import { readdir, readFile, writeFile, lstat } from "fs";
import { exists } from "../../../lib/fsUtils";
import { validate, TaskJson } from "../../../lib/jsonvalidate";

/**
 * Combines the vsix and vso manifests into one object
 */
export interface VsixComponents {
	builders: ManifestBuilder[];
	resources: ResourceSet;
}

/**
 * Facilitates the gathering/reading of partial manifests and creating the merged
 * manifests (one for each manifest builder)
 */
export class Merger {
	private extensionComposer: ExtensionComposer;
	private manifestBuilders: ManifestBuilder[];

	/**
	 * constructor. Instantiates one of each manifest builder.
	 */
	constructor(private settings: MergeSettings) {
		this.manifestBuilders = [];
	}

	private gatherManifests(): Promise<string[]> {
		trace.debug("merger.gatherManifests");

		if (this.settings.manifestGlobs && this.settings.manifestGlobs.length > 0) {
			const globs = this.settings.manifestGlobs.map(p => (path.isAbsolute(p) ? p : path.join(this.settings.root, p)));

			trace.debug("merger.gatherManifestsFromGlob");
			const promises = globs.map(
				pattern =>
					new Promise<string[]>((resolve, reject) => {
						glob(pattern, (err, matches) => {
							if (err) {
								reject(err);
							} else {
								resolve(matches);
							}
						});
					}),
			);

			return Promise.all(promises)
				.then(results => _.uniq(_.flatten<string>(results)))
				.then(results => {
					if (results.length > 0) {
						trace.debug("Merging %s manifests from the following paths: ", results.length.toString());
						results.forEach(path => trace.debug(path));
					} else {
						throw new Error(
							"No manifests found from the following glob patterns: \n" + this.settings.manifestGlobs.join("\n"),
						);
					}

					return results;
				});
		} else {
			const manifests = this.settings.manifests;
			if (!manifests || manifests.length === 0) {
				return Promise.reject("No manifests specified.");
			}
			this.settings.manifests = _.uniq(manifests).map(p => (path.isAbsolute(p) ? p : path.join(this.settings.root, p)));
			trace.debug(
				"Merging %s manifest%s from the following paths: ",
				manifests.length.toString(),
				manifests.length === 1 ? "" : "s",
			);
			manifests.forEach(path => trace.debug(path));
			return Promise.resolve(this.settings.manifests);
		}
	}

	private loadManifestJs(): any {
		trace.debug("merger.manifestJs");

		// build environment object from --env parameter
		const env = {};
		(this.settings.env || []).forEach(kvp => {
			const [key, ...value] = kvp.split('=');
			env[key] = value.join('=');
		});

		const fullJsFile = path.resolve(this.settings.manifestJs);
		const manifestModuleFn = require(fullJsFile);
		if (!manifestModuleFn || typeof manifestModuleFn != "function") {
			throw new Error(`Missing export function from manifest-js file ${fullJsFile}`)
		}
		const manifestData = manifestModuleFn(env);
		if (!manifestData) {
			throw new Error(`The export function from manifest-js file ${fullJsFile} must return the manifest object`)
		}
		return manifestData;
	}

	/**
	 * Finds all manifests and merges them into two JS Objects: vsoManifest and vsixManifest
	 * @return Q.Promise<SplitManifest> An object containing the two manifests
	 */
	public async merge(): Promise<VsixComponents> {
		trace.debug("merger.merge");

		let overridesProvided = false;
		const manifestPromises: Promise<any>[] = [];

		if (this.settings.manifestJs) {
			const result = this.loadManifestJs();
			result.__origin = this.settings.manifestJs; // save the origin in order to resolve relative paths later.
			manifestPromises.push(Promise.resolve(result));
		} else {
			let manifestFiles = await this.gatherManifests();
			manifestFiles.forEach(file => {
				manifestPromises.push(
					promisify(readFile)(file, "utf8").then(data => {
						const jsonData = data.replace(/^\uFEFF/, "");
						try {
							const result = jju.parse(jsonData);
							result.__origin = file; // save the origin in order to resolve relative paths later.
							return result;
						} catch (err) {
							trace.error("Error parsing the JSON in %s: ", file);
							trace.debug(jsonData, null);
							throw err;
						}
					}),
				);
			});
		}

		// Add the overrides if necessary
		if (this.settings.overrides) {
			overridesProvided = true;
			manifestPromises.push(Promise.resolve(this.settings.overrides));
		}

		return Promise.all(manifestPromises).then(partials => {
			// Determine the targets so we can construct the builders
			let targets: TargetDeclaration[] = [];
			const taskJsonValidationPromises: Promise<any>[] = [];
			partials.forEach(partial => {
				if (_.isArray(partial["targets"])) {
					targets = targets.concat(partial["targets"]);
				}
			});
			this.extensionComposer = ComposerFactory.GetComposer(this.settings, targets);
			this.manifestBuilders = this.extensionComposer.getBuilders();
			let updateVersionPromise = Promise.resolve<void>(null);
			partials.forEach((partial, partialIndex) => {
				// Rev the version if necessary
				if (this.settings.revVersion) {
					if (partial["version"] && partial.__origin) {
						try {
							const parsedVersion = version.DynamicVersion.parse(partial["version"]);
							const newVersion = version.DynamicVersion.increase(parsedVersion);
							const newVersionString = newVersion.toString();
							partial["version"] = newVersionString;

							updateVersionPromise = promisify(readFile)(partial.__origin, "utf8").then(versionPartial => {
								try {
									let newPartial: any;
									if (this.settings.json5) {
										const parsed = jju.parse(versionPartial);
										parsed["version"] = newVersionString;
										newPartial = jju.update(versionPartial, parsed);
									} else {
										newPartial = jsonInPlace(versionPartial).set("version", newVersionString).toString();
									}
									return promisify(writeFile)(partial.__origin, newPartial);
								} catch (e) {
									trace.warn(
										"Failed to lex partial as JSON to update the version. Skipping version rev...",
									);
								}
							});
						} catch (e) {
							trace.warn(
								"Could not parse %s as a version (e.g. major.minor.patch). Skipping version rev...",
								partial["version"],
							);
						}
					}
				}

				// Transform asset paths to be relative to the root of all manifests, verify assets
				if (_.isArray(partial["files"])) {
					(<Array<FileDeclaration>>partial["files"]).forEach(asset => {
						const keys = Object.keys(asset);
						if (keys.indexOf("path") < 0) {
							throw new Error("Files must have an absolute or relative (to the manifest) path.");
						}
						let absolutePath;
						if (path.isAbsolute(asset.path)) {
							absolutePath = asset.path;
						} else {
							absolutePath = path.join(path.dirname(partial.__origin), asset.path);
						}
						asset.path = path.relative(this.settings.root, absolutePath);

						const taskJsonPattern: string = path.join(absolutePath, '**', "task.json");
						taskJsonValidationPromises.push(this.validateTaskJson(taskJsonPattern));
					});
				}
				// Transform icon paths as above
				if (_.isObject(partial["icons"])) {
					const icons = partial["icons"];
					Object.keys(icons).forEach((iconKind: string) => {
						const absolutePath = path.join(path.dirname(partial.__origin), icons[iconKind]);
						icons[iconKind] = path.relative(this.settings.root, absolutePath);
					});
				}

				// Expand any directories listed in the files array
				if (_.isArray(partial["files"])) {
					for (let i = partial["files"].length - 1; i >= 0; --i) {
						const fileDecl: FileDeclaration = partial["files"][i];
						const fsPath = path.join(this.settings.root, fileDecl.path);
						if (fs.lstatSync(fsPath).isDirectory()) {
							Array.prototype.splice.apply(
								partial["files"],
								(<any[]>[i, 1]).concat(this.pathToFileDeclarations(fsPath, this.settings.root, fileDecl)),
							);
						}
					}
				}

				// Process each key by each manifest builder.
				Object.keys(partial).forEach(key => {
					const isOverridePartial = partials.length - 1 === partialIndex && overridesProvided;
					if (partial[key] !== undefined && (partial[key] !== null || isOverridePartial)) {
						// Notify each manifest builder of the key/value pair
						this.manifestBuilders.forEach(builder => {
							builder.processKey(key, partial[key], isOverridePartial);
						});
					}
				});
			});

			// Generate localization resources
			const locPrepper = new loc.LocPrep.LocKeyGenerator(this.manifestBuilders);
			const resources = locPrepper.generateLocalizationKeys();

			// Build up resource data by reading the translations from disk
			return this.buildResourcesData().then(resourceData => {
				if (resourceData) {
					resourceData["defaults"] = resources.combined;
				}

				// Build up a master file list
				const packageFiles: PackageFiles = {};
				this.manifestBuilders.forEach(builder => {
					_.assign(packageFiles, builder.files);
				});

				const components: VsixComponents = { builders: this.manifestBuilders, resources: resources };

				// Finalize each builder
				return Promise.all(
					[updateVersionPromise].concat(
						this.manifestBuilders.map(b => b.finalize(packageFiles, resourceData, this.manifestBuilders)),
						taskJsonValidationPromises
					),
				).then(() => {
					// const the composer do validation
					return this.extensionComposer.validate(components).then(validationResult => {
						if (validationResult.length === 0 || this.settings.bypassValidation) {
							return components;
						} else {
							throw new Error(
								"There were errors with your extension. Address the following and re-run the tool.\n" +
								validationResult,
							);
						}
					});
				});
			});
		});
	}

	/**
	 * For each folder F under the localization folder (--loc-root),
	 * look for a resources.resjson file within F. If it exists, split the
	 * resources.resjson into one file per manifest. Add
	 * each to the vsix archive as F/<manifest_loc_path> and F/Extension.vsixlangpack
	 */
	private buildResourcesData(): Promise<LocalizedResources> {
		// Make sure locRoot is set, that it refers to a directory, and
		// iterate each subdirectory of that.
		if (!this.settings.locRoot) {
			return Promise.resolve<LocalizedResources>(null);
		}
		const stringsPath = path.resolve(this.settings.locRoot);

		const data: LocalizedResources = { defaults: null };

		// Check that --loc-root exists and is a directory.

		return exists(stringsPath)
			.then(exists => {
				if (exists) {
					return promisify(lstat)(stringsPath).then((stats: fs.Stats) => {
						if (stats.isDirectory()) {
							return true;
						}
					});
				} else {
					return Promise.resolve(false);
				}
			})
			.then(stringsFolderExists => {
				if (!stringsFolderExists) {
					return Promise.resolve<void[]>(null);
				}

				// stringsPath exists and is a directory - read it.
				return promisify(readdir)(stringsPath).then((files: string[]) => {
					const promises: Promise<void>[] = [];
					files.forEach(languageTag => {
						const filePath = path.join(stringsPath, languageTag);
						const promise = promisify(lstat)(filePath).then(fileStats => {
							if (fileStats.isDirectory()) {
								// We're under a language tag directory within locRoot. Look for
								// resources.resjson and use that to generate manfiest files
								const resourcePath = path.join(filePath, "resources.resjson");
								return exists(resourcePath).then<void>(exists => {
									if (exists) {
										// A resources.resjson file exists in <locRoot>/<language_tag>/
										return promisify(readFile)(resourcePath, "utf8").then((contents: string) => {
											const resourcesObj = JSON.parse(contents);
											data[languageTag] = resourcesObj;
										});
									}
								});
							}
						});
						promises.push(promise);
					});
					return Promise.all(promises);
				});
			})
			.then(() => {
				return data;
			});
	}

	/**
	 * Recursively converts a given path to a flat list of FileDeclaration
	 * @TODO: Async.
	 */
	private pathToFileDeclarations(fsPath: string, root: string, fileDecl: FileDeclaration): FileDeclaration[] {
		let files: FileDeclaration[] = [];
		if (fs.lstatSync(fsPath).isDirectory()) {
			trace.debug("Path '%s` is a directory. Adding all contained files (recursive).", fsPath);
			fs.readdirSync(fsPath).forEach(dirChildPath => {
				trace.debug("-- %s", dirChildPath);
				files = files.concat(this.pathToFileDeclarations(path.join(fsPath, dirChildPath), root, fileDecl));
			});
		} else {
			const relativePath = path.relative(root, fsPath);
			let partName: any = "/" + relativePath;
			if (fileDecl.partName || fileDecl.packagePath) {
				partName = fileDecl.partName || fileDecl.packagePath;
				if (typeof partName === "string") {
					partName = toZipItemName(
						forwardSlashesPath(_.trimEnd(partName, "/") + relativePath.substr(fileDecl.path.length)),
					);
				} else {
					partName = partName.map(pn =>
						toZipItemName(forwardSlashesPath(_.trimEnd(pn, "/") + relativePath.substr(fileDecl.path.length))),
					);
				}
			}

			files.push({
				path: relativePath,
				partName: partName,
				auto: true,
				addressable: fileDecl.addressable,
			});
		}
		return files;
	}

	private async validateTaskJson(taskJsonSearchPattern: string): Promise<TaskJson> {
		try {
			const matches: string[] = await promisify(glob)(taskJsonSearchPattern);
			
			if (matches.length === 0) {
				trace.debug(`No task.json file found for validation in ${taskJsonSearchPattern}`);
				return;
			}

			const taskJsonPath = matches[0];
			const taskJsonExists = await exists(taskJsonPath);
			
			if (taskJsonExists) {
				return validate(taskJsonPath, "no task.json in specified directory");
			}

		} catch (err) {
			const warningMessage = "Please, make sure the task.json file is correct. In the future, this warning will be treated as an error.\n";
			trace.warn(err && err instanceof Error
				? warningMessage + err.message
				: `Error occurred while validating task.json. ${warningMessage}`);
		}
	}
}
