/// <reference path="../../../definitions/tsd.d.ts" />

import { PackageFiles, FileDeclaration, ResourcesFile } from "./interfaces";
import { cleanAssetPath, removeMetaKeys } from "./utils";
import _ = require("lodash");
import os = require("os");
import Q = require("q");
import stream = require("stream");
import trace = require('../trace');

export abstract class ManifestBuilder {
    protected packageFiles: PackageFiles = { };
    protected data: any = { };
    
    constructor() { }
    
    /**
     * Explains the type of manifest builder
     */
    public abstract getType(): string;
    
    /**
     * Gets the package path to this manifest
     */
    public abstract getPath(): string;
    
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
     * Return a string[] of current validation errors
     */
    public abstract validate(): Q.Promise<string[]>;
    
    /**
     * Called just before the package is written to make any final adjustments.
     */
    public finalize(files: PackageFiles): Q.Promise<void> {
        return Q.resolve<void>(null);
    }
    
    /**
     * Gives the manifest the chance to transform the key that is used when generating the localization
     * strings file. Path will be a dot-separated set of keys to address the string (or another 
     * object/array) in question. See vso-manifest-builder for an example.
     */
    public getLocKeyPath(path: string): string {
        return path;
    }
    
    /**
     * Write this manifest to a stream.
     */
    public getResult(): string {
        return JSON.stringify(removeMetaKeys(this.data), null, 4).replace(/\n/g, os.EOL);
    }
    
    /**
     * Gets the contents of the file that will serve as localization for this asset.
     * Default implementation returns JSON with all strings replaced given by the translations/defaults objects.
     */
    public getLocResult(translations: ResourcesFile, defaults: ResourcesFile): string {
        return JSON.stringify(this._getLocResult(this.expandResourceFile(translations), this.expandResourceFile(defaults)), null, 4);
    }
    
    private _getLocResult(translations: any, defaults: any, locData = {}, currentPath = "") {
        let currentData = currentPath ? _.get(this.data, currentPath) : this.data;
        
        // CurrentData should be guaranteed to be
        
        // This magically works for arrays too, just go with it.
        Object.keys(currentData).forEach((key) => {
            let nextPath = currentPath + "." + key;
            if (_.isString(currentData[key])) {
                let translation = _.get(translations, nextPath);
                if (translation !== undefined) {
                    _.set(locData, nextPath, translation);
                } else {
                    let defaultString = _.get(defaults, nextPath);
                    if (defaultString !== undefined) {
                        _.set(locData, nextPath, defaultString);
                    } else {
                        throw "Couldn't find a default string - this is definitely a bug.";
                    }
                }
            } else if (_.isObject(currentData[key])) {
                this._getLocResult(translations, defaults, locData, nextPath);
            } else {
                // must be a number of boolean
                _.set(locData, nextPath, currentData[key]);
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
    protected singleValueProperty(path: string, value: any, manifestKey: string, override: boolean = false): boolean {
        let existingValue = _.get(this.data, path);
        
        if (!override && existingValue !== undefined) {
            trace.warn("Multiple values found for '%s'. Ignoring future occurrences and using the value '%s'.", manifestKey, JSON.stringify(existingValue, null, 4));
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
    protected addFile(file: FileDeclaration) {
        file.path = cleanAssetPath(file.path);
        if (!file.partName) {
            file.partName = file.path;
        }
        if (!file.partName) {
            throw "Every file must have a file name.";
        }
        
        // Files added recursively, i.e. from a directory, get lower
        // priority than those specified explicitly. Therefore, if
        // the file has already been added to the package list, don't
        // re-add (overwrite) with this file if it is an auto (from a dir)
        if (file.auto && this.packageFiles[file.path]) {
            // Don't add files discovered via directory if they've already
            // been added.
        } else {
            this.packageFiles[file.path] = file;
        }
        if (file.contentType && this.packageFiles[file.path]) {
            this.packageFiles[file.path].contentType = file.contentType;
        }
    }
}