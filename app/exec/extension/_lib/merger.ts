import { ManifestBuilder } from "./manifest";
import { ComposerFactory } from "./extension-composer-factory";
import { ExtensionComposer } from "./extension-composer";
import { FileDeclaration, LocalizedResources, MergeSettings, PackageFiles, ResourceSet, ResourcesFile, TargetDeclaration } from "./interfaces";
import _ = require("lodash");
import fs = require("fs");
import glob = require("glob");
import jsonInPlace = require("json-in-place");
import loc = require("./loc");
import path = require("path");
import Q = require("q");
import qfs = require("../../../lib/qfs");
import trace = require("../../../lib/trace");
import version = require("../../../lib/version");

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
		trace.debug('merger.gatherManifests');

		if (this.settings.manifestGlobs && this.settings.manifestGlobs.length > 0) {
			const globs = this.settings.manifestGlobs.map(p => path.isAbsolute(p) ? p : path.join(this.settings.root, p));

			trace.debug('merger.gatherManifestsFromGlob');
			const promises = globs.map(pattern => Q.nfcall<string[]>(glob, pattern));

			return Promise.all(promises)
				.then(results => _.uniq(_.flatten<string>(results)))
				.then(results => {
					if (results.length > 0) {
						trace.debug("Merging %s manifests from the following paths: ", results.length.toString());
						results.forEach(path => trace.debug(path));
					} else {
						throw new Error("No manifests found from the following glob patterns: \n" + this.settings.manifestGlobs.join("\n"));
					}

					return results;
				});
		} else {
			const manifests = this.settings.manifests
			if (!manifests || manifests.length === 0) {
				return Q.reject<string[]>("No manifests specified.");
			}
			this.settings.manifests = _.uniq(manifests).map(p => path.isAbsolute(p) ? p : path.join(this.settings.root, p));
			trace.debug("Merging %s manifest%s from the following paths: ", manifests.length.toString(), manifests.length === 1 ? "" : "s");
			manifests.forEach(path => trace.debug(path));
			return Q.resolve(this.settings.manifests);
		}
	}

	/**
	 * Finds all manifests and merges them into two JS Objects: vsoManifest and vsixManifest
	 * @return Q.Promise<SplitManifest> An object containing the two manifests
	 */
	public merge(): Promise<VsixComponents> {
		trace.debug('merger.merge')

		return this.gatherManifests().then(files => {
			let overridesProvided = false;
			let manifestPromises: Promise<any>[] = [];
			files.forEach((file) => {
				manifestPromises.push(Q.nfcall<any>(fs.readFile, file, "utf8").then((data) => {
					let jsonData = data.replace(/^\uFEFF/, '');
					try {
						let result = JSON.parse(jsonData);
						result.__origin = file; // save the origin in order to resolve relative paths later.
						return result;
					} catch (err) {
						trace.error("Error parsing the JSON in %s: ", file);
						trace.debug(jsonData, null);
						throw err;
					}
				}));
			});

			// Add the overrides if necessary
			if (this.settings.overrides) {
				overridesProvided = true;
				manifestPromises.push(Q.resolve(this.settings.overrides));
			}

			return Promise.all(manifestPromises).then(partials => {
				// Determine the targets so we can construct the builders
				let targets: TargetDeclaration[] = [];
				partials.forEach((partial) => {
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
								const semver = version.SemanticVersion.parse(partial["version"]);
								const newVersion = new version.SemanticVersion(semver.major, semver.minor, semver.patch + 1);
								const newVersionString = newVersion.toString();
								partial["version"] = newVersionString;
								updateVersionPromise = qfs.readFile(partial.__origin, "utf8").then(versionPartial => {
									try {
										const newPartial = jsonInPlace(versionPartial).set("version", newVersionString);
										return qfs.writeFile(partial.__origin, newPartial);
									}
									catch (e) {
										trace.warn("Failed to lex partial as JSON to update the version. Skipping version rev...");
									}
								});
							}
							catch (e) {
								trace.warn("Could not parse %s as a semantic version (major.minor.patch). Skipping version rev...", partial["version"]);
							}
						}
					}

					// Transform asset paths to be relative to the root of all manifests, verify assets
					if (_.isArray(partial["files"])) {
						(<Array<FileDeclaration>>partial["files"]).forEach((asset) => {
							let keys = Object.keys(asset);
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
						});
					}
					// Transform icon paths as above
					if (_.isObject(partial["icons"])) {
						let icons = partial["icons"];
						Object.keys(icons).forEach((iconKind: string) => {
							let absolutePath = path.join(path.dirname(partial.__origin), icons[iconKind]);
							icons[iconKind] = path.relative(this.settings.root, absolutePath);
						});
					}

					// Expand any directories listed in the files array
					if (_.isArray(partial["files"])) {
						for (let i = partial["files"].length - 1; i >= 0; --i) {
							let fileDecl: FileDeclaration = partial["files"][i];
							let fsPath = path.join(this.settings.root, fileDecl.path);
							if (fs.lstatSync(fsPath).isDirectory()) {
								Array.prototype.splice.apply(partial["files"], (<any[]>[i, 1]).concat(this.pathToFileDeclarations(fsPath, this.settings.root, fileDecl.addressable)));
							}
						}
					}

					// Process each key by each manifest builder.
					Object.keys(partial).forEach((key) => {
						let isOverridePartial = partials.length - 1 === partialIndex && overridesProvided;
						if (partial[key] !== undefined && (partial[key] !== null || isOverridePartial)) {

							// Notify each manifest builder of the key/value pair
							this.manifestBuilders.forEach((builder) => {
								builder.processKey(key, partial[key], isOverridePartial);
							});
						}
					});
				});

				// Generate localization resources
				let locPrepper = new loc.LocPrep.LocKeyGenerator(this.manifestBuilders);
				let resources = locPrepper.generateLocalizationKeys();

				// Build up resource data by reading the translations from disk
				return this.buildResourcesData().then(resourceData => {
					if (resourceData) {
						resourceData["defaults"] = resources.combined;
					}

					// Build up a master file list
					let packageFiles: PackageFiles = {};
					this.manifestBuilders.forEach((builder) => {
						_.assign(packageFiles, builder.files);
					});

					let components: VsixComponents = { builders: this.manifestBuilders, resources: resources };
					
					// Finalize each builder
					return Promise.all([updateVersionPromise].concat(this.manifestBuilders.map(b => b.finalize(packageFiles, resourceData, this.manifestBuilders)))).then(() => {
						// Let the composer do validation
						return this.extensionComposer.validate(components).then((validationResult) => {
							if (validationResult.length === 0 || this.settings.bypassValidation) {
								return components;
							} else {
								throw new Error("There were errors with your extension. Address the following and re-run the tool.\n" + validationResult);
							}
						});
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
			return Promise.resolve<void[]>(null);
		}
		let stringsPath = path.resolve(this.settings.locRoot);

		const data: LocalizedResources = {defaults: null};

		// Check that --loc-root exists and is a directory.
		return Q.Promise((resolve, reject, notify) => {
			fs.exists(stringsPath, (exists) => {
				resolve(exists);
			});
		}).then<boolean>((exists) => {
			if (exists) {
				return Q.nfcall(fs.lstat, stringsPath).then((stats: fs.Stats) => {
					if (stats.isDirectory()) {
						return true;
					}
				});
			} else {
				return Q.resolve(false);
			}
		}).then<void[]>((stringsFolderExists) => {
			if (!stringsFolderExists) {
				return Promise.resolve<void[]>(null);
			}

			// stringsPath exists and is a directory - read it.
			return <Promise<void[]>><any>Q.nfcall(fs.readdir, stringsPath).then((files: string[]) => {
				let promises: Promise<void>[] = [];
				files.forEach((languageTag) => {
					var filePath = path.join(stringsPath, languageTag);
					let promise = Q.nfcall(fs.lstat, filePath).then((fileStats: fs.Stats) => {
						if (fileStats.isDirectory()) {

							// We're under a language tag directory within locRoot. Look for
							// resources.resjson and use that to generate manfiest files
							let resourcePath = path.join(filePath, "resources.resjson");
							return Q.Promise<boolean>((resolve, reject, notify) => {
								fs.exists(resourcePath, (exists) => {
									resolve(exists);
								});
							}).then<void>((exists: boolean) => {
								if (exists) {
									// A resources.resjson file exists in <locRoot>/<language_tag>/
									return Q.nfcall<string>(fs.readFile, resourcePath, "utf8").then<void>((contents: string) => {
										let resourcesObj = JSON.parse(contents);
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
		}).then(() => {
			return data;
		});
	}

	/**
	 * Recursively converts a given path to a flat list of FileDeclaration
	 * @TODO: Async.
	 */
	private pathToFileDeclarations(fsPath: string, root: string, addressable: boolean): FileDeclaration[] {
		let files: FileDeclaration[] = [];
		if (fs.lstatSync(fsPath).isDirectory()) {
			trace.debug("Path '%s` is a directory. Adding all contained files (recursive).", fsPath);
			fs.readdirSync(fsPath).forEach((dirChildPath) => {
				trace.debug("-- %s", dirChildPath);
				files = files.concat(this.pathToFileDeclarations(path.join(fsPath, dirChildPath), root, addressable));
			});
		} else {
			let relativePath = path.relative(root, fsPath);
			files.push({path: relativePath, partName: "/" + relativePath, auto: true, addressable: addressable});
		}
		return files;
	}
}