import { ResourcesFile, VsixLanguagePack, ResourceSet } from "./interfaces";
import { ManifestBuilder } from "./manifest";
import { VsixManifestBuilder } from "./vsix-manifest-builder";
import _ = require("lodash");
import fs = require("fs");
import trace = require("../../../lib/trace");
import mkdirp = require('mkdirp');
import path = require("path");
import Q = require("q");

export module LocPrep {

	/**
	 * Creates a deep copy of document, replacing resource keys with the values from
	 * the resources object.
	 * If a resource cannot be found, the same string from the defaults document will be substituted.
	 * The defaults object must have the same structure/schema as document.
	 */
	export function makeReplacements(document: any, resources: ResourcesFile, defaults: ResourcesFile): any {
		let locDocument = _.isArray(document) ? [] : {};
		for (let key in document) {
			if (propertyIsComment(key)) {
				continue;
			} else if (_.isObject(document[key])) {
				locDocument[key] = makeReplacements(document[key], resources, defaults);
			} else if (_.isString(document[key]) && _.startsWith(document[key], "resource:")) {
				let resourceKey = document[key].substr("resource:".length).trim();
				let replacement = resources[resourceKey];
				if (!_.isString(replacement)) {
					replacement = defaults[resourceKey];
					trace.warn("Could not find a replacement for resource key %s. Falling back to '%s'.", resourceKey, replacement);
				}
				locDocument[key] = replacement;
			} else {
				locDocument[key] = document[key];
			}
		}
		return locDocument;
	}

	/**
	 * If the resjsonPath setting is set...
	 * Check if the path exists. If it does, check if it's a directory.
	 * If it's a directory, write to path + extension.resjson
	 * All other cases just write to path.
	 */
	export function writeResourceFile(fullResjsonPath: string, resources: ResourcesFile): Q.Promise<void> {
		return Q.Promise<boolean>((resolve, reject, notify) => {
			fs.exists(fullResjsonPath, (exists) => {
				resolve(exists);
			});
		}).then<string>((exists) => {
			if (exists) {
				return Q.nfcall(fs.lstat, fullResjsonPath).then((obj: fs.Stats) => {
					return obj.isDirectory();
				}).then<string>((isDir) => {
					if (isDir) {
						return path.join(fullResjsonPath, "extension.resjson");
					} else {
						return fullResjsonPath;
					}
				});
			} else {
				return Q.resolve(fullResjsonPath)
			}
		}).then((determinedPath) => {
			return Q.nfcall(mkdirp, path.dirname(determinedPath)).then(() => {
				return Q.nfcall<void>(fs.writeFile, determinedPath, JSON.stringify(resources, null, 4), "utf8");
			});
		});
	}

	export function propertyIsComment(property: string): boolean {
		return _.startsWith(property, "_") && _.endsWith(property, ".comment");
	}

	export class LocKeyGenerator {
		private static I18N_PREFIX = "i18n:";
		private combined: ResourcesFile;
		private resourceFileMap: {[manifestType: string]: ResourcesFile};
		private vsixManifestBuilder: VsixManifestBuilder;

		constructor(private manifestBuilders: ManifestBuilder[]) {
			this.initStringObjs();

			// find the vsixmanifest and pull it out because we treat it a bit differently
			let vsixManifest = manifestBuilders.filter(b => b.getType() === VsixManifestBuilder.manifestType);
			if (vsixManifest.length === 1) {
				this.vsixManifestBuilder = <VsixManifestBuilder>vsixManifest[0];
			} else {
				throw "Found " + vsixManifest.length + " vsix manifest builders (expected 1). Something is not right!";
			}
		}

		private initStringObjs() {
			this.resourceFileMap = {};
			this.manifestBuilders.forEach((b) => {
				this.resourceFileMap[b.getType()] = {};
			});
			this.combined = {};
		}

		/**
		 * Destructive method modifies the manifests by replacing i18nable strings with resource:
		 * keys. Adds all the original resources to the resources object.
		 */
		public generateLocalizationKeys(): ResourceSet {
			this.initStringObjs();
			this.manifestBuilders.forEach((builder) => {
				if (builder.getType() !== VsixManifestBuilder.manifestType) {
					this.jsonReplaceWithKeysAndGenerateDefaultStrings(builder);
				}
			});
			this.vsixGenerateDefaultStrings();
			return {
				manifestResources: this.resourceFileMap,
				combined: this.generateCombinedResourceFile()
			}
		}

		private generateCombinedResourceFile(): ResourcesFile {
			let combined: ResourcesFile = {};
			let resValues = Object.keys(this.resourceFileMap).map(k => this.resourceFileMap[k]);

			// the .d.ts file falls short in this case
			let anyAssign: any = _.assign;
			anyAssign(combined, ...resValues);

			return combined;
		}

		private addResource(builderType: string, sourceKey: string, resourceKey: string, obj: any) {
			let resourceVal = this.removeI18nPrefix(obj[sourceKey]);
			this.resourceFileMap[builderType][resourceKey] = resourceVal;
			let comment = obj["_" + sourceKey + ".comment"];
			if (comment) {
				this.resourceFileMap[builderType]["_" + resourceKey + ".comment"] = comment;
			}
			obj[sourceKey] = "resource:" + resourceKey;
		}

		private removeI18nPrefix(str: string): string {
			if (_.startsWith(str, LocKeyGenerator.I18N_PREFIX)) {
				return str.substr(LocKeyGenerator.I18N_PREFIX.length);
			}
			return str;
		}

		private vsixGenerateDefaultStrings(): void {
			let vsixManifest = this.vsixManifestBuilder.getData();
			let displayName = this.removeI18nPrefix(_.get<string>(vsixManifest, "PackageManifest.Metadata[0].DisplayName[0]"));
			let description = this.removeI18nPrefix(_.get<string>(vsixManifest, "PackageManifest.Metadata[0].Description[0]._"));
			let releaseNotes = this.removeI18nPrefix(_.get<string>(vsixManifest, "PackageManifest.Metadata[0].ReleaseNotes[0]"));
			let vsixRes: ResourcesFile = {};
			if (displayName) {
				vsixRes["displayName"] = displayName;
				_.set<any, string>(vsixManifest, "PackageManifest.Metadata[0].DisplayName[0]", displayName);
			}
			if (displayName) {
				vsixRes["description"] = description;
				_.set<any, string>(vsixManifest, "PackageManifest.Metadata[0].Description[0]._", description);
			}
			if (releaseNotes) {
				vsixRes["releaseNotes"] = releaseNotes;
				_.set<any, string>(vsixManifest, "PackageManifest.Metadata[0].ReleaseNotes[0]", releaseNotes);
			}
			this.resourceFileMap[this.vsixManifestBuilder.getType()] = vsixRes;
		}

		private jsonReplaceWithKeysAndGenerateDefaultStrings(builder: ManifestBuilder, json: any = null, path: string = ""): void {
			if (!json) {
				json = builder.getData();
			}
			for (let key in json) {
				let val = json[key];
				if (_.isObject(val)) {
					let nextPath = builder.getLocKeyPath(path + key + ".");
					while (_.endsWith(nextPath, ".")) {
						nextPath = nextPath.substr(0, nextPath.length - 1);
					}
					this.jsonReplaceWithKeysAndGenerateDefaultStrings(builder, val, nextPath);
				} else if (_.isString(val) && _.startsWith(val, LocKeyGenerator.I18N_PREFIX)) {
					this.addResource(builder.getType(), key, path + key, json)
				}
			}
		}
	}
}