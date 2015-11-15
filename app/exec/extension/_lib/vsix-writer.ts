import { ManifestBuilder } from "./manifest";
import { VsixManifestBuilder } from "./vsix-manifest-builder";
import { FileDeclaration, PackageSettings, PackageFiles, PackagePart, ResourceSet, ResourcesFile } from "./interfaces";
import { VsixComponents } from "./merger";
import { cleanAssetPath, removeMetaKeys, toZipItemName } from "./utils";
import { LocPrep } from "./loc";
import _ = require("lodash");
import childProcess = require("child_process");
import fs = require("fs");
import mkdirp = require("mkdirp");
import os = require("os");
import path = require("path");
import Q = require("q");
import trace = require('../../../lib/trace');
import winreg = require("winreg");
import xml = require("xml2js");
import zip = require("jszip");

/**
 * Facilitates packaging the vsix and writing it to a file
 */
export class VsixWriter {
	private manifestBuilders: ManifestBuilder[];
	private resources: ResourceSet;

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
			version: "1.0"
		}
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
	 */
	private getOutputPath(outPath: string): string {
		// Find the vsix manifest, if it exists
		let vsixBuilders = this.manifestBuilders.filter(b => b.getType() === VsixManifestBuilder.manifestType);
		let autoName = "extension.vsix";
		if (vsixBuilders.length === 1) {
			let vsixManifest = vsixBuilders[0].getData();
			let pub = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
			let ns = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Id");
			let version = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Version");
			autoName = pub + "." + ns + "-" + version + ".vsix";
		}

		if (outPath === "{auto}") {
			return path.resolve(autoName);
		} else {
			let basename = path.basename(outPath);
			if (basename.indexOf(".") > 0) { // conscious use of >
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

		return segments.filter(segment => re.test(segment)).length === 0
	}

	/**
	 * Write a vsix package to the given file name
	 */
	public writeVsix(): Q.Promise<string> {
		let outputPath = this.getOutputPath(this.settings.outputPath);
		let vsix = new zip();

		let builderPromises: Q.Promise<void>[] = [];
		this.manifestBuilders.forEach((builder) => {
			// Add the package files
			let readFilePromises: Q.Promise<void>[] = [];
			Object.keys(builder.files).forEach((path) => {
				let itemName = toZipItemName(builder.files[path].partName);
				if (!VsixWriter.validatePartName(itemName)) {
					let eol = require("os").EOL;
					throw "Part Name '" + itemName + "' is invalid. Please check the following: " + eol  + "1. No whitespace or any of these characters: #^[]<>?" + eol + "2. Cannot end with a period." + eol + "3. No percent-encoded / or \\ characters. Additionally, % must be followed by two hex characters.";
				}
				if (itemName.indexOf(" ") )
				if (!builder.files[path].content) {
					let readFilePromise = Q.nfcall(fs.readFile, path).then((result) => {
						vsix.file(itemName, result);
					});
					readFilePromises.push(readFilePromise);
				} else {
					vsix.file(itemName, builder.files[path].content);
					readFilePromises.push(Q.resolve<void>(null));
				}
			});

			let builderPromise = Q.all(readFilePromises).then(() => {
				// Add the manifest itself
				vsix.file(toZipItemName(builder.getPath()), builder.getResult());
			});
			builderPromises.push(builderPromise);
		});
		return Q.all(builderPromises).then(() => {
			return this.addResourceStrings(vsix);
		}).then(() => {
			trace.debug("Writing vsix to: %s", outputPath);

			return Q.nfcall(mkdirp, path.dirname(outputPath)).then(() => {
				let buffer = vsix.generate({
					type: "nodebuffer",
					compression: "DEFLATE"
				});
				return Q.nfcall(fs.writeFile, outputPath, buffer).then(() => outputPath);
			});
		});
	}

	/**
	 * For each folder F under the localization folder (--loc-root),
	 * look for a resources.resjson file within F. If it exists, split the
	 * resources.resjson into one file per manifest. Add
	 * each to the vsix archive as F/<manifest_loc_path> and F/Extension.vsixlangpack
	 */
	private addResourceStrings(vsix: zip): Q.Promise<void[]> {
		// Make sure locRoot is set, that it refers to a directory, and
		// iterate each subdirectory of that.
		if (!this.settings.locRoot) {
			return Q.resolve<void[]>(null);
		}
		let stringsPath = path.resolve(this.settings.locRoot);
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
				return Q.resolve<void[]>(null);
			}
			return Q.nfcall(fs.readdir, stringsPath).then((files: string[]) => {
				let promises: Q.Promise<void>[] = [];
				files.forEach((languageTag) => {
					var filePath = path.join(stringsPath, languageTag);
					let promise = Q.nfcall(fs.lstat, filePath).then((fileStats: fs.Stats) => {
						if (fileStats.isDirectory()) {
							let resourcePath = path.join(filePath, "resources.resjson");
							return Q.Promise<boolean>((resolve, reject, notify) => {
								fs.exists(resourcePath, (exists) => {
									resolve(exists);
								});
							}).then<void>((exists: boolean) => {
								if (exists) {
									// A resources.resjson file exists in <locRoot>/<language_tag>/
									// return Q.nfcall<string>(fs.readFile, resourcePath, "utf8").then<void>((contents: string) => {
									//     let resourcesObj = JSON.parse(contents);
									//     let locGen = new LocPrep.LocKeyGenerator(null, null);
									//     let splitRes = locGen.splitIntoVsoAndVsixResourceObjs(resourcesObj);
									//     let locManifestPath = languageTag + "/" + VsixWriter.VSO_MANIFEST_FILENAME;
									//     vsix.file(toZipItemName(locManifestPath), this.getVsoManifestString(splitRes.vsoResources));
									//     this.vsixManifest.PackageManifest.Assets[0].Asset.push({
									//         "$": {
									//             Lang: languageTag,
									//             Type: "Microsoft.VisualStudio.Services.Manifest",
									//             Path: locManifestPath,
									//             Addressable: "true",
									//             "d:Source": "File"
									//         }
									//     });

									//     let builder = new xml.Builder(VsixWriter.DEFAULT_XML_BUILDER_SETTINGS);
									//     let vsixLangPackStr = builder.buildObject(splitRes.vsixResources);
									//     vsix.file(toZipItemName(languageTag + "/Extension.vsixlangpack"), vsixLangPackStr);
									// });
								} else {
									return Q.resolve<void>(null);
								}
							});
						}
					});
					promises.push(promise);
				});
				return Q.all(promises);
			});
		});
	}
}