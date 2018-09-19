import { ManifestBuilder } from "./manifest";
import { VsixManifestBuilder } from "./vsix-manifest-builder";
import { FileDeclaration, PackageSettings, PackageFiles, PackagePart, ResourceSet, ResourcesFile } from "./interfaces";
import { VsixComponents } from "./merger";
import { cleanAssetPath, toZipItemName } from "./utils";
import { LocPrep } from "./loc";
import _ = require("lodash");
import childProcess = require("child_process");
import mkdirp = require("mkdirp");
import os = require("os");
import path = require("path");
import trace = require("../../../lib/trace");
import winreg = require("winreg");
import xml = require("xml2js");
import zip = require("jszip");

import { defer, Deferred } from "../../../lib/promiseUtils";
import { lstat, readdir, readFile, writeFile } from "fs";
import { promisify } from "util";
import { exists } from "../../../lib/fsUtils";

/**
 * Facilitates packaging the vsix and writing it to a file
 */
export class VsixWriter {
	private manifestBuilders: ManifestBuilder[];
	private resources: ResourceSet;

	private static VSIX_ADD_FILES_BATCH_SIZE: number = 20;
	private static VSO_MANIFEST_FILENAME: string = "extension.vsomanifest";
	private static VSIX_MANIFEST_FILENAME: string = "extension.vsixmanifest";
	private static CONTENT_TYPES_FILENAME: string = "[Content_Types].xml";
	public static DEFAULT_XML_BUILDER_SETTINGS: xml.BuilderOptions = {
		indent: "    ",
		newline: os.EOL,
		pretty: true,
		xmldec: {
			encoding: "utf-8",
			standalone: null,
			version: "1.0",
		},
	};

	/**
	 * constructor
	 * @param any vsoManifest JS Object representing a vso manifest
	 * @param any vsixManifest JS Object representing the XML for a vsix manifest
	 */
	constructor(private settings: PackageSettings, components: VsixComponents) {
		this.manifestBuilders = components.builders;
		this.resources = components.resources;
	}

	/**
	 * If outPath is {auto}, generate an automatic file name.
	 * Otherwise, try to determine if outPath is a directory (checking for a . in the filename)
	 * If it is, generate an automatic filename in the given outpath
	 * Otherwise, outPath doesn't change.
	 * If filename is generated automatically, use fileExt as the extension
	 */
	public getOutputPath(outPath: string, fileExt: string = "vsix"): string {
		// Find the vsix manifest, if it exists
		let vsixBuilders = this.manifestBuilders.filter(b => b.getType() === VsixManifestBuilder.manifestType);
		let autoName = "extension." + fileExt;
		if (vsixBuilders.length === 1) {
			let vsixManifest = vsixBuilders[0].getData();
			let pub = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
			let ns = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Id");
			let version = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Version");
			autoName = `${pub}.${ns}-${version}.${fileExt}`;
		}

		if (outPath === "{auto}") {
			return path.resolve(autoName);
		} else {
			let basename = path.basename(outPath);
			if (basename.indexOf(".") > 0) {
				// conscious use of >
				return path.resolve(outPath);
			} else {
				return path.resolve(path.join(outPath, autoName));
			}
		}
	}

	private static validatePartName(partName: string): boolean {
		let segments = partName.split("/");
		if (segments.length === 1 && segments[0] === "[Content_Types].xml") {
			return true;
		}

		// matches most invalid segments.
		let re = /(%2f)|(%5c)|(^$)|(%[^0-9a-f])|(%.[^0-9a-f])|(\.$)|([^a-z0-9._~%!$&'()*+,;=:@-])/i;

		return segments.filter(segment => re.test(segment)).length === 0;
	}

	private async writeVsixMetadata(): Promise<string> {
		let prevWrittenOutput = null;
		const outputPath = this.settings.outputPath;

		for (const builder of this.manifestBuilders) {
			const metadataResult = builder.getMetadataResult(this.resources.combined);
			if (typeof metadataResult === "string") {
				if (prevWrittenOutput === outputPath) {
					trace.warn(
						"Warning: Multiple files written to " +
							outputPath +
							". Last writer will win. Instead, try providing a folder path in --output-path.",
					);
				}
				const writePath = path.join(outputPath, builder.getPath());
				await promisify(writeFile)(writePath, metadataResult, "utf8");
				prevWrittenOutput = outputPath;
			}
		}
		return outputPath;
	}

	/**
	 * Write a vsix package to the given file name
	 */
	public async writeVsix(): Promise<string> {
		if (this.settings.metadataOnly) {
			const outputPath = this.settings.outputPath;
			const pathExists = await exists(outputPath);
			if (pathExists && !(await promisify(lstat)(outputPath)).isDirectory()) {
				throw new Error("--output-path must be a directory when using --metadata-only.");
			}
			if (!pathExists) {
				await promisify(mkdirp)(outputPath, undefined);
			}

			for (const builder of this.manifestBuilders) {
				for (const filePath of Object.keys(builder.files)) {
					const fileObj = builder.files[filePath];
					if (fileObj.isMetadata) {
						const content = fileObj.content || (await promisify(readFile)(fileObj.path, "utf-8"));
						const writePath = path.join(this.settings.outputPath, fileObj.partName);
						const folder = path.dirname(writePath);
						await promisify(mkdirp)(folder, undefined);
						await promisify(writeFile)(writePath, content, "utf-8");
					}
				}
			}
			return this.writeVsixMetadata();
		}

		let outputPath = this.getOutputPath(this.settings.outputPath);
		let vsix = new zip();

		let builderPromises: Promise<void>[] = [];
		this.manifestBuilders.forEach(builder => {
			// Avoid the error EMFILE: too many open files
			const addPackageFilesBatch = (
				paths: string[],
				numBatch: number,
				batchSize: number,
				deferred?: Deferred<void>,
			): Promise<void> => {
				deferred = deferred || defer<void>();

				let readFilePromises = [];
				const start = numBatch * batchSize;
				const end = Math.min(paths.length, start + batchSize);
				for (let i = start; i < end; i++) {
					const path = paths[i];
					let itemName = toZipItemName(builder.files[path].partName);
					if (!VsixWriter.validatePartName(itemName)) {
						let eol = require("os").EOL;
						throw new Error(
							"Part Name '" +
								itemName +
								"' is invalid. Please check the following: " +
								eol +
								"1. No whitespace or any of these characters: #^[]<>?" +
								eol +
								"2. Cannot end with a period." +
								eol +
								"3. No percent-encoded / or \\ characters. Additionally, % must be followed by two hex characters.",
						);
					}
					if (itemName.indexOf(" "))
						if (!builder.files[path].content) {
							let readFilePromise = promisify(readFile)(path).then(result => {
								vsix.file(itemName, result);
								if ((builder.files[path] as any)._additionalPackagePaths) {
									for (const p of (builder.files[path] as any)._additionalPackagePaths) {
										vsix.file(p, result);
									}
								}
							});
							readFilePromises.push(readFilePromise);
						} else {
							vsix.file(itemName, builder.files[path].content);
							if ((builder.files[path] as any)._additionalPackagePaths) {
								for (const p of (builder.files[path] as any)._additionalPackagePaths) {
									vsix.file(p, builder.files[path].content);
								}
							}
							readFilePromises.push(Promise.resolve<void>(null));
						}
				}

				Promise.all(readFilePromises)
					.then(function() {
						if (end < paths.length) {
							// Next batch
							addPackageFilesBatch(paths, numBatch + 1, batchSize, deferred);
						} else {
							deferred.resolve(null);
						}
					})
					.catch(function(err) {
						deferred.reject(err);
					});

				return deferred.promise;
			};

			// Add the package files in batches
			let builderPromise = addPackageFilesBatch(Object.keys(builder.files), 0, VsixWriter.VSIX_ADD_FILES_BATCH_SIZE).then(
				() => {
					// Add the manifest itself
					vsix.file(toZipItemName(builder.getPath()), builder.getResult(this.resources.combined));
				},
			);
			builderPromises.push(builderPromise);
		});
		return Promise.all(builderPromises).then(() => {
			trace.debug("Writing vsix to: %s", outputPath);

			return new Promise((resolve, reject) => {
				mkdirp(path.dirname(outputPath), (err, made) => {
					if (err) {
						reject(err);
					} else {
						resolve(made);
					}
				});
			}).then(async () => {
				let buffer = await vsix.generateAsync({
					type: "nodebuffer",
					compression: "DEFLATE",
				});

				return promisify(writeFile)(outputPath, buffer).then(() => outputPath);
			});
		});
	}

	/**
	 * For each folder F under the localization folder (--loc-root),
	 * look for a resources.resjson file within F. If it exists, split the
	 * resources.resjson into one file per manifest. Add
	 * each to the vsix archive as F/<manifest_loc_path> and F/Extension.vsixlangpack
	 */
	private addResourceStrings(vsix: zip): Promise<void[]> {
		// Make sure locRoot is set, that it refers to a directory, and
		// iterate each subdirectory of that.
		if (!this.settings.locRoot) {
			return Promise.resolve<void[]>(null);
		}
		let stringsPath = path.resolve(this.settings.locRoot);

		// Check that --loc-root exists and is a directory.
		return exists(stringsPath)
			.then<boolean>(exists => {
				if (exists) {
					return promisify(lstat)(stringsPath).then(stats => {
						if (stats.isDirectory()) {
							return true;
						}
					});
				} else {
					return false;
				}
			})
			.then<void[]>(stringsFolderExists => {
				if (!stringsFolderExists) {
					return Promise.resolve<void[]>(null);
				}

				// stringsPath exists and is a directory - read it.
				return promisify(readdir)(stringsPath).then((files: string[]) => {
					let promises: Promise<void>[] = [];
					files.forEach(languageTag => {
						var filePath = path.join(stringsPath, languageTag);
						let promise = promisify(lstat)(filePath).then(fileStats => {
							if (fileStats.isDirectory()) {
								// We're under a language tag directory within locRoot. Look for
								// resources.resjson and use that to generate manfiest files
								let resourcePath = path.join(filePath, "resources.resjson");
								exists(resourcePath).then(exists => {
									if (exists) {
										// A resources.resjson file exists in <locRoot>/<language_tag>/
										return promisify(readFile)(resourcePath, "utf8").then(contents => {
											let resourcesObj = JSON.parse(contents);

											// For each language, go through each builder and generate its
											// localized resources.
											this.manifestBuilders.forEach(builder => {
												const locFiles = builder.getLocResult(resourcesObj, null);
												locFiles.forEach(locFile => {});
											});

											let locGen = new LocPrep.LocKeyGenerator(null);
											// let splitRes = locGen.splitIntoVsoAndVsixResourceObjs(resourcesObj);
											// let locManifestPath = languageTag + "/" + VsixWriter.VSO_MANIFEST_FILENAME;
											// vsix.file(toZipItemName(locManifestPath), this.getVsoManifestString(splitRes.vsoResources));
											// this.vsixManifest.PackageManifest.Assets[0].Asset.push({
											// 	"$": {
											// 		Lang: languageTag,
											// 		Type: "Microsoft.VisualStudio.Services.Manifest",
											// 		Path: locManifestPath,
											// 		Addressable: "true",
											// 		"d:Source": "File"
											// 	}
											// });

											// let builder = new xml.Builder(VsixWriter.DEFAULT_XML_BUILDER_SETTINGS);
											// let vsixLangPackStr = builder.buildObject(splitRes.vsixResources);
											// vsix.file(toZipItemName(languageTag + "/Extension.vsixlangpack"), vsixLangPackStr);
										});
									} else {
										return Promise.resolve<void>(null);
									}
								});
							}
						});
						promises.push(promise);
					});
					return Promise.all(promises);
				});
			});
	}
}
