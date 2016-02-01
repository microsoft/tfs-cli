/// <reference path="../../../../typings/tsd.d.ts" />

import { ManifestBuilder } from "./manifest";
import { ComposerFactory } from "./extension-composer-factory";
import { ExtensionComposer } from "./extension-composer";
import { FileDeclaration, MergeSettings, PackageFiles, ResourceSet, TargetDeclaration } from "./interfaces";
import _ = require("lodash");
import fs = require("fs");
import glob = require("glob");
import loc = require("./loc");
import path = require("path");
import Q = require("q");
import trace = require('../../../lib/trace');

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

	private gatherManifests(): Q.Promise<string[]> {
		trace.debug('merger.gatherManifests');

		const globs = this.settings.manifestGlobs.map(p => path.isAbsolute(p) ? p : path.join(this.settings.root, p));

		trace.debug('merger.gatherManifestsFromGlob');
		const promises = globs.map(pattern => Q.nfcall<string[]>(glob, pattern));

		return Q.all(promises)
			.then(results => _.unique(_.flatten<string>(results)))
			.then(results => {
				if (results.length > 0) {
					trace.debug("Merging %s manifests from the following paths: ", results.length.toString());
					results.forEach(path => trace.debug(path));
				} else {
					throw new Error("No manifests found from the following glob patterns: \n" + this.settings.manifestGlobs.join("\n"));
				}

				return results;
			});
	}

	/**
	 * Finds all manifests and merges them into two JS Objects: vsoManifest and vsixManifest
	 * @return Q.Promise<SplitManifest> An object containing the two manifests
	 */
	public merge(): Q.Promise<VsixComponents> {
		trace.debug('merger.merge')

		return this.gatherManifests().then(files => {
			let overridesProvided = false;
			let manifestPromises: Q.Promise<any>[] = [];
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

			return Q.all(manifestPromises).then(partials => {
				// Determine the targets so we can construct the builders
				let targets: TargetDeclaration[] = [];
				partials.forEach((partial) => {
					if (_.isArray(partial["targets"])) {
						targets = targets.concat(partial["targets"]);
					}
				});
				this.extensionComposer = ComposerFactory.GetComposer(this.settings, targets);
				this.manifestBuilders = this.extensionComposer.getBuilders();
				
				partials.forEach((partial, partialIndex) => {
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

				// Build up a master file list
				let packageFiles: PackageFiles = {};
				this.manifestBuilders.forEach((builder) => {
					_.assign(packageFiles, builder.files);
				});

				let components: VsixComponents = { builders: this.manifestBuilders, resources: resources };

				// Finalize each builder
				return Q.all(this.manifestBuilders.map(b => b.finalize(packageFiles, this.manifestBuilders))).then(() => {
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