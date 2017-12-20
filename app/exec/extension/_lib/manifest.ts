

import { PackageFiles, FileDeclaration, LocalizedResources, ResourcesFile } from "./interfaces";
import { cleanAssetPath, forwardSlashesPath, removeMetaKeys, toZipItemName } from "./utils";
import _ = require("lodash");
import common = require("../../../lib/common");
import os = require("os");
import path = require("path");

import stream = require("stream");
import trace = require('../../../lib/trace');

export abstract class ManifestBuilder {
	protected packageFiles: PackageFiles = { };
	protected lcPartNames: {[filename: string]: string} = { };
	protected data: any = { };
	private static resourcePrefix = "resource:";
	private deferredFiles: FileDeclaration[] = [];

	constructor(private extRoot: string) { }

	/**
	 * Explains the type of manifest builder
	 */
	public abstract getType(): string;

	/**
	 * Gets the package path to this manifest
	 */
	public abstract getPath(): string;

	/**
	 * Get the content type of this manifest (e.g. text/xml)
	 */
	public abstract getContentType(): string;

	/**
	 * Gets the path to the localized resource associated with this manifest
	 */
	public getLocPath(): string {
		return this.getPath();
	}

	/**
	 * Given a key/value pair, decide how this effects the manifest
	 */
	public abstract processKey(key: string, value: any, override: boolean): void;

	/**
	 * Called just before the package is written to make any final adjustments.
	 */
	public finalize(files: PackageFiles, resourceData: LocalizedResources, builders: ManifestBuilder[]): Promise<void> {
		this.deferredFiles.forEach(f => {
			this.addFile(f, false);
			if (f.path && !files[f.path]) {
				files[f.path] = f;
			} else if (!f.path) {
				files[common.newGuid()] = f;
			}
		});
		return Promise.resolve<void>(null);
	}

	/**
	 * Gives the manifest the chance to transform the key that is used when generating the localization
	 * strings file. Path will be a dot-separated set of keys to address the string (or another
	 * object/array) in question. See vso-manifest-builder for an example.
	 */
	public getLocKeyPath(path: string): string {
		return path;
	}

	protected prepResult(resources?: ResourcesFile): any {
		const resultData = resources ? this._getLocResult(resources, resources) : this.data;
		return removeMetaKeys(resultData);
	}

	/**
	 * Generate the manifest as a string.
	 */
	public getResult(resources?: ResourcesFile): string {
		return JSON.stringify(this.prepResult(resources), null, 4).replace(/\n/g, os.EOL);
	}

	public getMetadataResult(resources?: ResourcesFile): string | null {
		return null;
	}

	/**
	 * Gets the contents of the file that will serve as localization for this asset.
	 * Default implementation returns JSON with all strings replaced given by the translations/defaults objects.
	 */
	public getLocResult(translations: ResourcesFile, defaults: ResourcesFile): FileDeclaration[] {
		return [{
			partName: this.getPath(),
			path: null,
			content: JSON.stringify(this._getLocResult(this.expandResourceFile(translations), this.expandResourceFile(defaults)), null, 4)
		}];
	}

	private _getLocResult(translations: any, defaults: any, locData = {}, currentPath: string[] = []) {

		// deep iterate through this.data. If the value is a string that starts with
		// resource:, use the key to look in translations and defaults to find the real string.
		// Do the replacement

		let currentData = currentPath.length > 0 ? _.get(this.data, currentPath) : this.data;
		Object.keys(currentData).forEach(key => {
			// Ignore localization comments
			if (key.startsWith("_") && key.endsWith(".comment")) {
				return;
			}
			const val = currentData[key];
			if (typeof val === "string" && val.substr(0, ManifestBuilder.resourcePrefix.length) === ManifestBuilder.resourcePrefix) {
				const locKey = val.substr(ManifestBuilder.resourcePrefix.length);
				const localized = _.get(translations, locKey) || _.get(defaults, locKey);
				if (localized) {
					_.set(locData, currentPath.concat(key), localized);
				} else {
					throw new Error("Could not find translation or default value for resource " + locKey);
				}
			} else {
				if (typeof val === "object" && val !== null) {
					if (_.isArray(val)) {
						_.set(locData, currentPath.concat(key), []);
					} else {
						_.set(locData, currentPath.concat(key), {});
					}
					this._getLocResult(translations, defaults, locData, currentPath.concat(key));
				} else {
					_.set(locData, currentPath.concat(key), val);
				}
			}
		});
		return locData;
	}

	/**
	 * Resource files are flat key-value pairs where the key is the json "path" to the original element.
	 * This routine expands the resource files back into their original schema
	 */
	private expandResourceFile(resources: ResourcesFile): any {
		let expanded = {};
		Object.keys(resources).forEach((path) => {
			_.set(expanded, path, resources[path]);
		});
		return expanded;
	}

	/**
	 * Get the raw JSON data. Please do not modify it.
	 */
	public getData(): any {
		return this.data;
	}

	/**
	 * Get a list of files to be included in the package
	 */
	public get files(): PackageFiles {
		return this.packageFiles;
	}

	/**
	 * Set 'value' to data[path] in this manifest if it has not been set, or if override is true.
	 * If it has been set, issue a warning.
	 */
	protected singleValueProperty(path: string, value: any, manifestKey: string, override: boolean = false, duplicatesAreErrors: boolean = false): boolean {
		let existingValue = _.get(this.data, path);

		if (!override && existingValue !== undefined) {
			if (duplicatesAreErrors) {
				throw new Error(trace.format("Multiple values found for '%s'. Ensure only one occurrence of '%s' exists across all manifest files.", manifestKey, manifestKey));
			} else {
				trace.warn("Multiple values found for '%s'. Ignoring future occurrences and using the value '%s'.", manifestKey, JSON.stringify(existingValue, null, 4));
			}
			return false;
		} else {
			_.set(this.data, path, value);
			return true;
		}
	}

	/**
	 * Read a value as a delimited string or array and concat it to the existing list at data[path]
	 */
	protected handleDelimitedList(value: any, path: string, delimiter: string = ",", uniq: boolean = true): void {
		if (_.isString(value)) {
			value = value.split(delimiter);
			_.remove(value, v => v === "");
		}
		var items = _.get(this.data, path, "").split(delimiter);
		_.remove(items, v => v === "");
		let val = items.concat(value);
		if (uniq) {
			val = _.uniq(val);
		}
		_.set(this.data, path, val.join(delimiter));
	}

	/**
	 * Add a file to the vsix package
	 */
	protected addFile(file: FileDeclaration, defer: boolean = false) {
		if (defer) {
			this.deferredFiles.push(file);
			return file;
		}
		if (!file.partName && file.packagePath) {
			file.partName = file.packagePath;
		}

		if (_.isArray(file.partName)) {
			let lastAdd = null;
			for (let i = 0; i < file.partName.length; ++i) {
				const newFile = {...file};
				newFile.partName = file.partName[i];
				lastAdd = this.addFile(newFile);
			}
			return lastAdd;
		}

		if (typeof file.assetType === "string") {
			file.assetType = [<string>file.assetType];
		}
		
		file.path = cleanAssetPath(file.path, this.extRoot);
		if (!file.partName) {
			file.partName = "/" + path.relative(this.extRoot, file.path);
		}
		if (!file.partName) {
			throw new Error("Every file must have a path specified name.");
		}

		file.partName = forwardSlashesPath(file.partName);
		
		// Default the assetType to the partName.
		if (file.addressable && !file.assetType) {
			file.assetType = [toZipItemName(file.partName)];
		}

		if (this.packageFiles[file.path]) {
			if (_.isArray(this.packageFiles[file.path].assetType) && file.assetType) {
				file.assetType = (<string[]>(this.packageFiles[file.path].assetType)).concat(<string[]>file.assetType);
				this.packageFiles[file.path].assetType = file.assetType;
			}
		}

		// Files added recursively, i.e. from a directory, get lower
		// priority than those specified explicitly. Therefore, if
		// the file has already been added to the package list, don't
		// re-add (overwrite) with this file if it is an auto (from a dir)
		if (file.auto && this.packageFiles[file.path] && this.packageFiles[file.path].partName === file.partName) {
			// Don't add files discovered via directory if they've already
			// been added.
		} else {
			let existPartName = this.lcPartNames[file.partName.toLowerCase()];
			if (!existPartName || file.partName === existPartName) {
				// key off a guid if there is no file path.
				const key = file.path || common.newGuid()
				if (this.packageFiles[key]) {

					// Additional package paths is an UNSUPPORTED and UNDOCUMENTED feature.
					// It may trample on other existing files with no warning or error.
					// Use at your own risk.
					const additionalPackagePaths = (this.packageFiles[key] as any)._additionalPackagePaths;
					if (additionalPackagePaths) {
						additionalPackagePaths.push(file.partName);
					} else {
						(this.packageFiles[key] as any)._additionalPackagePaths = [file.partName];
					}
				} else {
					this.packageFiles[key] = file;
					this.lcPartNames[file.partName.toLowerCase()] = file.partName;
				}
			} else {
				throw new Error("All files in the package must have a case-insensitive unique filename. Trying to add " + file.partName + ", but " + existPartName + " was already added to the package.");
			}
		}
		if (file.contentType && this.packageFiles[file.path]) {
			this.packageFiles[file.path].contentType = file.contentType;
		}

		return file;
	}
}