/// <reference path="../../definitions/tsd.d.ts" />

import _ = require("lodash");
import argm = require('../lib/arguments');
import childProcess = require("child_process");
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import fs = require("fs");
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import glob = require("glob");
import os = require('os');
import path = require("path");
import Q = require('q');
import stream = require("stream");
import tmp = require("tmp");
import winreg = require('winreg');
import xml = require("xml2js");
import zip = require("jszip");
import mkdirp = require("mkdirp");
import trace = require('../lib/trace');
var defaultManifest = require("./resources/default-manifest.json");

export function describe(): string {
    return 'Create a vsix package for an extension.';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionCreate;
}

// requires auth, connect etc...
export var isServerOperation: boolean = false;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export interface ExtensionCreateArguments {
    outputpath: string;
    root?: string;
    manifestglob?: string[];
    settings?: string;
    override?: any;
    publisher?: string;
    extensionid?: string;
    bypassvalidation?: boolean
}

export class ExtensionCreate extends cmdm.TfCommand {
    
    constructor() {
        super();
        
        this.requiredArguments = [
            argm.OUTPUT_PATH
        ];
        
        this.optionalArguments = [
            argm.ROOT,
            argm.MANIFEST_GLOB,
            argm.SETTINGS,
            argm.OVERRIDE,
            argm.PUBLISHER_NAME,
            argm.EXTENSION_ID,
            argm.BYPASS_VALIDATION
        ];
    }
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<string> {
        trace.debug('extension-create.exec');
        return this.checkArguments(args, options).then(rawArgs => {
            trace.debug("Begin package creation");
            
            var args = <ExtensionCreateArguments><any>rawArgs;
            var merger = new Merger({
                root: args.root,
                manifestGlobs: args.manifestglob,
                overrides: _.assign({}, args.override, {
                    publisher: args.publisher,
                    extensionid: args.extensionid
                }),
                bypassValidation: args.bypassvalidation
            });
            
            trace.debug("Merge partial manifests");
            return merger.merge().then(({ vsixManifest, manifests, files }) => {
                trace.success("Merged successfully");
                var vsixWriter = new VsixWriter(vsixManifest, manifests, files);
                trace.debug("Beginning writing VSIX");
                return vsixWriter.writeVsix(args[argm.OUTPUT_PATH.name]).then((outPath: string) => {
                    trace.debug("VSIX written to: %s", outPath);
                    return outPath;
                });
            });
        });
    }

    public output(outPath: string): void {
        if (!outPath) {
            throw new Error('no path supplied');
        }

        trace.success('Successfully created package at ' + outPath);
    }   
}

/**
 * Combines the vsix and vso manifests into one object
 */
export interface VsixComponents {
    vsixManifest: VsixManifest;
    manifests: Manifest[];
    files: PackageFiles;
}

/**
 * Represents a part in an OPC package
 */
export interface PackagePart {
    contentType?: string;
    partName: string;
}

/**
 * List of files in the package, mapped to null, or, if it can't be properly auto-
 * detected, a content type.
 */
export interface PackageFiles {
    [path: string]: PackagePart;
}

/**
 * Describes a file in a manifest
 */
export interface FileDeclaration {
    assetType?: string;
    contentType?: string;
    auto?: boolean;
    path: string;
    partName: string;
}

/**
 * Settings for doing the merging
 */
export interface MergeSettings {
    /**
     * Root of source manifests
     */
    root: string;
    
    /**
     * List of globs for searching for partial manifests
     */
    manifestGlobs: string[];
    
    /**
     * Highest priority partial manifest
     */
    overrides: any;
    
    /**
     * True to bypass validation during packaging.
     */
    bypassValidation: boolean;
}

export /* abstract */ class Manifest {
    
    public type: string;
    public path: string;
    
    constructor(protected data: any) {
        // noop
    }
    
    public toJSON(): string {
        return this.data;
    }
    
    public merge(key: string, value: any, packageFiles: PackageFiles, override: boolean): void {
        // noop
    }
    
    public validate(): string[] {
        return [];
    }
    
    public write(stream: stream.Writable): Q.Promise<any> {
        return Q.resolve(null);
    }
    
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
}

function removeMetaKeys(obj: any): any {
    return _.omit(obj, (v, k) => _.startsWith(k, "__meta_"));
}

export class VsoManifest extends Manifest {
    
    public path = "extension.vsomanifest";
    public type = "Microsoft.VisualStudio.Services.Manifest";
    
    constructor() {
        super({
            manifestVersion: 1,
            scopes: [],
            contributions: [],
        });
    }
    
    public merge(key: string, value: any, packageFiles: PackageFiles, override: boolean): void {
        switch(key.toLowerCase()) {
            case "version":
                this.data.version = value;
                break;
            case "name":
                this.data.name = value;
                break;
            case "description":
                this.data.description = value;
                break;
            case "eventcallbacks":
                if (_.isObject(value)) {
                    if (!this.data.eventCallbacks) {
                        this.data.eventCallbacks = {};
                    }
                    _.merge(this.data.eventCallbacks, value);
                }
                break;
            case "manifestversion":
                let version = value;
                if (_.isString(version)) {
                    version = parseFloat(version);
                }
                if (!version) {
                    version = 1;
                }
                this.singleValueProperty("manifestVersion", version, key, true);
                break;
            case "scopes":
                if (_.isArray(value)) {
                    this.data.scopes = _.uniq(this.data.scopes.concat(value));
                }
                break;
            case "baseuri":
                this.singleValueProperty("baseUri", value, key, override);
                break;
            case "contributions":
                if (_.isArray(value)) {
                    this.data.contributions = this.data.contributions.concat(value);
                }
                break;
            case "contributiontypes":
                if (_.isArray(value)) {
                    if (!this.data.contributionTypes) {
                        this.data.contributionTypes = [];
                    }
                    this.data.contributionTypes = this.data.contributionTypes.concat(value);
                }
                break;
            default:
                if (key.substr(0, 2) !== "__") {
                    this.singleValueProperty(key, value, key, override);
                }
                break;
        }
    }
    
    /**
     * Writes the vso manifest to given stream.
     * @param stream.Writable Stream to write the vso manifest (json)
     * @return Q.Promise<any> A promise that is resolved when the stream has been ended
     */
    public write(stream: stream.Writable): Q.Promise<any> {
        const contents = JSON.stringify(removeMetaKeys(this.data), null, 4).replace(/\n/g, os.EOL);
        return Q.ninvoke<any>(stream, "end", contents, "utf8");
    }
}

export class VsixManifest extends Manifest {
    
    private didCleanupAssets = false;
    public path: string = "extension.vsixmanifest";
    
    constructor(public root: string, private manifests: Manifest[]) {
        super(_.cloneDeep(defaultManifest));
    }
    
    public get assets():any[] {
        if (!this.didCleanupAssets) {
            // Remove any vso manifest assets, then add the correct entry.
            let assets = _.get<any[]>(this.data, "PackageManifest.Assets[0].Asset");
            if (assets) {
                _.remove(assets, (asset) => {
                    let type = _.get(asset, "$.Type", "x").toLowerCase();
                    return type === "microsoft.vso.manifest" || type === "microsoft.visualstudio.services.manifest";
                });
            } else {
                assets = [];
                _.set<any, any>(this.data, "PackageManifest.Assets[0].Asset[0]", assets);
            }
            
            assets.concat(this.manifests.map(manifest => ({$:{
                Type: manifest.type,
                Path: manifest.path
            }})));
            
            this.didCleanupAssets = true;
        }
        
        return _.get(this.data, "PackageManifest.Assets[0].Asset", [])
            .filter(asset => asset.$ && !_.contains(this.manifests.map(m => m.type), asset.$.Type));
    }
    
    public merge(key: string, value: any, packageFiles: PackageFiles, override: boolean): void {
        switch(key.toLowerCase()) {
            case "namespace":
            case "extensionid":
            case "id":
                if (_.isString(value)) {
                    this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Id", value.replace(/\./g, "-"), "namespace/extensionId/id", override);
                }
                break;
            case "version":
                this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Version", value, key, override);
                break;
            case "name":
                this.singleValueProperty("PackageManifest.Metadata[0].DisplayName[0]", value, key, override);
                break;
            case "description":
                this.data.PackageManifest.Metadata[0].Description[0]._ = value;
                break;
            case "icons":
                if (_.isString(value["default"])) {
                    let assets = _.get<any>(this.data, "PackageManifest.Assets[0].Asset");
                    let iconPath = value["default"].replace(/\\/g, "/");
                    assets.push({
                        "$": {
                            "Type": "Microsoft.VisualStudio.Services.Icons.Default",
                            "d:Source": "File",
                            "Path": iconPath
                        }
                    });
                    
                    // Default icon is also the package icon
                    this.singleValueProperty("PackageManifest.Metadata[0].Icon[0]", iconPath, "icons['default']", override);
                }
                if (_.isString(value["wide"])) {
                    let assets = _.get<any>(this.data, "PackageManifest.Assets[0].Asset");
                    assets.push({
                        "$": {
                            "Type": "Microsoft.VisualStudio.Services.Icons.Wide",
                            "d:Source": "File",
                            "Path": value["wide"].replace(/\\/g, "/")
                        }
                    });
                }
                break;
            case "public": 
                if (typeof value === "boolean") {
                    let flags = _.get(this.data, "PackageManifest.Metadata[0].GalleryFlags[0]", "").split(",");
                    _.remove(flags, v => v === "");
                    if (value === true) {
                        flags.push("Public");
                    }
                    _.set(this.data, "PackageManifest.Metadata[0].GalleryFlags[0]", _.uniq(flags).join(","));
                }
                break;
            case "publisher":
                this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Publisher", value, key, override);
                break;
            case "releasenotes":
                this.singleValueProperty("PackageManifest.Metadata[0].ReleaseNotes[0]", value, key, override);
                break;
            case "tags":
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].Tags[0]");
                break;
            case "vsoflags":
            case "galleryflags":
                // Gallery Flags are space-separated since it's a Flags enum.
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].GalleryFlags[0]", " ");
                break;
            case "categories":
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].Categories[0]");
                break;
            case "files": 
                if (_.isArray(value)) {
                    value.forEach((asset: FileDeclaration) => {
                        let assetPath = asset.path.replace(/\\/g, "/");
                        if (!asset.auto || !packageFiles[assetPath]) {
                            packageFiles[assetPath] = {
                                partName: asset.partName || assetPath
                            };
                        }
                        if (asset.contentType) {
                            packageFiles[assetPath].contentType = asset.contentType;
                        }
                        if (asset.assetType) {
                            this.data.PackageManifest.Assets[0].Asset.push({
                                "$": {
                                    "Type": asset.assetType,
                                    "d:Source": "File",
                                    "Path": assetPath
                                }
                            });
                        }
                        if (asset.assetType === "Microsoft.VisualStudio.Services.Icons.Default") {
                            this.data.PackageManifest.Metadata[0].Icon = [assetPath];
                        }
                    });
                }
                break;
        }
    }
    
    public validate(): string[] {
        return Object
            .keys(VsixManifest.vsixValidators)
            .map(path => VsixManifest.vsixValidators[path](_.get(this.data, path)))
            .filter(r => !!r);
    }
    
    /**
     * Writes the vsix manifest to given stream.
     * @param stream.Writable Stream to write the vsix manifest (xml)
     * @return Q.Promise<any> A promise that is resolved when the stream has been ended
     */
    public write(stream: stream.Writable): Q.Promise<any> {
        const builder = new xml.Builder({
            indent: "    ",
            newline: os.EOL,
            pretty: true,
            xmldec: {
                encoding: "utf-8",
                standalone: null,
                version: "1.0"
            }
        });
        const vsix = builder.buildObject(removeMetaKeys(this.data));
        
        return Q.ninvoke<any>(stream, 'end', vsix, "utf8");
    }
    
    /**
     * If outPath is {auto}, generate an automatic file name.
     * Otherwise, try to determine if outPath is a directory (checking for a . in the filename)
     * If it is, generate an automatic filename in the given outpath
     * Otherwise, outPath doesn't change.
     */
    public getOutputPath(outPath: string): string {
        let newPath = outPath;
        let pub = _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
        let ns = _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Id");
        let version = _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Version");
        let autoName = pub + "." + ns + "-" + version + ".vsix";
        
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
    
    private static vsixValidators: {[path: string]: (value) => string} = {
        "PackageManifest.Metadata[0].Identity[0].$.Id": (value) => {
            if (/^[A-z0-9_-]+$/.test(value)) {
                return null;
            } else {
                return "'extensionId' may only include letters, numbers, underscores, and dashes.";
            }
        },
        "PackageManifest.Metadata[0].Identity[0].$.Version": (value) => {
            if (typeof value === "string" && value.length > 0) {
                return null;
            } else {
                return "'version' must be provided.";
            }
        },
        "PackageManifest.Metadata[0].DisplayName[0]": (value) => {
            if (typeof value === "string" && value.length > 0) {
                return null;
            } else {
                return "'name' must be provided.";
            }
        },
        "PackageManifest.Assets[0].Asset": (value) => {
            let usedAssetTypes = {};
            if (_.isArray(value)) {
                for (let i = 0; i < value.length; ++i) {
                    let asset = value[i].$;
                    if (asset) {
                        if (!asset.Path) {
                            return "All 'files' must include a 'path'.";
                        }
                        if (asset.Type) {
                            if (usedAssetTypes[asset.Type]) {
                                return "Cannot have multiple files with the same 'assetType'.\nFile1: " + usedAssetTypes[asset.Type] + ", File 2: " + asset.Path + " (asset type: " + asset.Type + ")";
                            } else {
                                usedAssetTypes[asset.Type] = asset.Path;
                            }
                        }
                    }
                }
            }
            
            return null;
        },
        "PackageManifest.Metadata[0].Identity[0].$.Publisher": (value) => {
            if (typeof value === "string" && value.length > 0) {
                return null;
            } else {
                return "'publisher' must be provided.";
            }
        },
        "PackageManifest.Metadata[0].Categories[0]": (value) => {
            if (!value) {
                return null;
            }
            let categories = value.split(",");
            let validCategories = [
                "Build and release",
                "Collaboration",
                "Customer support",
                "Planning",
                "Productivity",
                "Sync and integration",
                "Testing"
            ];
            _.remove(categories, c => !c);
            let badCategories = categories.filter(c => validCategories.indexOf(c) === -1);
            return badCategories.length ? "The following categories are not valid: " + badCategories.join(", ") + ". Valid categories are: " + validCategories.join(", ") + "." : null;
        }
    }
}

/**
 * Facilitates the gathering/reading of partial manifests and creating the merged
 * manifests (one vsoManifest and one vsixManifest)
 */
export class Merger {
    
    /**
     * constructor
     * @param string Root path for locating candidate manifests
     */
    constructor(private settings: MergeSettings) {
        // noop
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
            
            let vsoManifest = new VsoManifest();
            let vsixManifest = new VsixManifest(this.settings.root, [vsoManifest]);
            let packageFiles: PackageFiles = {};
            
            return Q.all(manifestPromises).then(partials => {
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
                    let pathToFileDeclarations = (fsPath: string, root: string): FileDeclaration[] => {
                        let files: FileDeclaration[] = [];
                        if (fs.lstatSync(fsPath).isDirectory()) {
                            trace.debug("Path '%s` is a directory. Adding all contained files (recursive).", fsPath);
                            fs.readdirSync(fsPath).forEach((dirChildPath) => {
                                trace.debug("-- %s", dirChildPath);
                                files = files.concat(pathToFileDeclarations(path.join(fsPath, dirChildPath), root));
                            });
                        } else {
                            let relativePath = path.relative(root, fsPath);
                            files.push({path: relativePath, partName: relativePath, auto: true});
                        }
                        return files;
                    };
                    
                    if (_.isArray(partial["files"])) {
                        for (let i = partial["files"].length - 1; i >= 0; --i) {
                            let fileDecl: FileDeclaration = partial["files"][i];
                            let fsPath = path.join(this.settings.root, fileDecl.path);
                            if (fs.lstatSync(fsPath).isDirectory()) {
                                Array.prototype.splice.apply(partial["files"], (<any[]>[i, 1]).concat(pathToFileDeclarations(fsPath, this.settings.root)));
                            }
                        }
                    }
                    
                    // Merge each key of each partial manifest into the joined manifests
                    Object.keys(partial).forEach((key) => {
                        if (partial[key] !== undefined && partial[key] !== null) {
                            vsixManifest.merge(key, partial[key], packageFiles, partials.length - 1 === partialIndex && overridesProvided);
                            vsoManifest.merge(key, partial[key], packageFiles, partials.length - 1 === partialIndex && overridesProvided);
                        }
                    });
                });
                
                trace.debug("VSO Manifest: " + JSON.stringify(vsoManifest));
                trace.debug("VSIX Manifest: " + JSON.stringify(vsixManifest)); 
                
                let validationResult = [...vsixManifest.validate(), ...vsoManifest.validate()];
                
                if (validationResult.length === 0 || this.settings.bypassValidation) {
                    return <VsixComponents>{ vsixManifest, manifests: [vsoManifest], files: packageFiles };
                } else {
                    throw new Error("There were errors with your manifests. Address the following errors and re-run the tool.\n" + validationResult);
                }
            });
        });
    }
}

/**
    * Facilitates packaging the vsix and writing it to a file
    */
export class VsixWriter {
    
    private static VSO_MANIFEST_FILENAME: string = "extension.vsomanifest";
    private static VSIX_MANIFEST_FILENAME: string = "extension.vsixmanifest";
    private static CONTENT_TYPES_FILENAME: string = "[Content_Types].xml";
    
    /**
        * List of known file types to use in the [Content_Types].xml file in the VSIX package.
        */
    private static CONTENT_TYPE_MAP: {[key: string]: string} = {
        ".bat": "application/bat",
        ".gif": "image/gif",
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".json": "application/json",
        ".md": "text/markdown",
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".ps1": "text/ps1",
        ".vsixmanifest": "text/xml",
        ".vsomanifest": "application/json"
    };
    
    /**
        * constructor
        * @param any vsoManifest JS Object representing a vso manifest
        * @param any vsixManifest JS Object representing the XML for a vsix manifest
        */
    constructor(private vsixManifest: VsixManifest, private manifests: Manifest[], private files: PackageFiles) {
        // noop
    }
    
    /**
        * Write a vsix package to the given file name
        * @param stream.Writable Stream to write the vsix package
        */
    public writeVsix(outPath: string): Q.Promise<any> {
        let outputPath = this.vsixManifest.getOutputPath(outPath);
        let vsixzip = new zip();
        let root = this.vsixManifest.root;
        if (!root) {
            throw new Error("Manifest root unknown. Manifest objects should have a __meta_root key specifying the absolute path to the root of assets.");
        }
        // Add assets to vsix archive
        let overrides: {[partName: string]: PackagePart} = {};
        Object.keys(this.files).forEach((file) => {
            if (_.endsWith(file, VsixWriter.VSO_MANIFEST_FILENAME)) {
                return;
            }
            
            let partName = this.files[file].partName.replace(/\\/g, "/"); 
            let fsPath = path.join(root, file);
            
            vsixzip.file(partName, fs.readFileSync(path.join(root, file)));
            if (this.files[file].contentType) {
                overrides[partName] = this.files[file];
            }
        });
        
        this.vsixManifest.assets.forEach(asset => {
            vsixzip.file((<string>asset.$.Path).replace(/\\/g, "/"), fs.readFileSync(path.join(root, asset.$.Path)));
        });
        
        // Write the manifests to a temporary path and add them to the zip
        return Q.nfcall(tmp.dir, {unsafeCleanup: true}).then((result) => {
            let tmpPath = result[0];
            let manifests = [<Manifest> this.vsixManifest].concat(this.manifests);
            
            return Q.all(manifests.map(manifest => {
                const manifestPath = path.join(tmpPath, manifest.path);
                const stream = fs.createWriteStream(manifestPath);
                
                return manifest.write(stream).then(() => {
                    vsixzip.file(manifest.path, fs.readFileSync(manifestPath, "utf-8"));
                });
            }));
        }).then(() => {
            return this.genContentTypesXml(Object.keys(vsixzip.files), overrides);
        }).then((contentTypesXml) => {
            vsixzip.file(VsixWriter.CONTENT_TYPES_FILENAME, contentTypesXml);
            let buffer = vsixzip.generate({
                type: "nodebuffer",
                compression: "DEFLATE",
                compressionOptions: { level: 9 },
                platform: process.platform
            });
            trace.debug("Writing vsix to: %s", outputPath);
            return Q.nfcall(mkdirp, path.dirname(outputPath))
                .then(() => Q.nfcall(fs.writeFile, outputPath, buffer))
                .then(() => outputPath);
        });
    }
    
    /**
        * Generates the required [Content_Types].xml file for the vsix package.
        * This xml contains a <Default> entry for each different file extension
        * found in the package, mapping it to the appropriate MIME type.
        */
    private genContentTypesXml(fileNames: string[], overrides: {[partName: string]: PackagePart}): Q.Promise<string> {
        trace.debug("Generating [Content_Types].xml");
        let contentTypes: any = {
            Types: {
                $: {
                    xmlns: "http://schemas.openxmlformats.org/package/2006/content-types"
                },
                Default: [],
                Override: []
            }
        };
        let windows = /^win/.test(process.platform);
        let contentTypePromise;
        if (windows) {
            // On windows, check HKCR to get the content type of the file based on the extension
            let contentTypePromises: Q.Promise<any>[] = [];
            let extensionlessFiles = [];
            let uniqueExtensions = _.unique<string>(fileNames.map((f) => {
                let extName = path.extname(f);
                if (!extName && !overrides[f]) {
                    trace.warn("File %s does not have an extension, and its content-type is not declared. Defaulting to application/octet-stream.", path.resolve(f));
                }
                if (overrides[f]) {
                    // If there is an override for this file, ignore its extension
                    return "";
                }
                return extName;
            }));
            uniqueExtensions.forEach((ext) => {
                if (!ext.trim()) {
                    return;
                }
                if (!ext) {
                    return;
                }
                if (VsixWriter.CONTENT_TYPE_MAP[ext.toLowerCase()]) {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: VsixWriter.CONTENT_TYPE_MAP[ext.toLowerCase()]
                        }
                    });
                    return;
                }
                let hkcrKey = new winreg({
                    hive: winreg.HKCR,
                    key: "\\" + ext.toLowerCase()
                });
                let regPromise = Q.ninvoke(hkcrKey, "get", "Content Type").then((type: WinregValue) => {
                    trace.debug("Found content type for %s: %s.", ext, type.value);
                    let contentType = "application/octet-stream";
                    if (type) {
                        contentType = type.value;
                    }
                    return contentType;
                }).catch((err) => {
                    trace.warn("Could not determine content type for extension %s. Defaulting to application/octet-stream. To override this, add a contentType property to this file entry in the manifest.", ext);
                    return "application/octet-stream";
                }).then((contentType) => {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: contentType
                        }
                    });
                });
                contentTypePromises.push(regPromise);
            });
            contentTypePromise = Q.all(contentTypePromises);
        } else {
            // If not on windows, run the file --mime-type command to use magic to get the content type.
            // If the file has an extension, rev a hit counter for that extension and the extension
            // If there is no extension, create an <Override> element for the element
            // For each file with an extension that doesn't match the most common type for that extension
            // (tracked by the hit counter), create an <Override> element.
            // Finally, add a <Default> element for each extension mapped to the most common type.
            
            let contentTypePromises: Q.Promise<any>[] = [];
            let extTypeCounter: {[ext: string]: {[type: string]: string[]}} = {};
            fileNames.forEach((fileName) => {
                let extension = path.extname(fileName);
                let mimePromise;
                if (VsixWriter.CONTENT_TYPE_MAP[extension]) {
                    if (!extTypeCounter[extension]) {
                        extTypeCounter[extension] = {};
                    }
                    if (!extTypeCounter[extension][VsixWriter.CONTENT_TYPE_MAP[extension]]) {
                        extTypeCounter[extension][VsixWriter.CONTENT_TYPE_MAP[extension]] = [];
                    }
                    extTypeCounter[extension][VsixWriter.CONTENT_TYPE_MAP[extension]].push(fileName);
                    mimePromise = Q.resolve(null);
                    return;
                }
                mimePromise = Q.Promise((resolve, reject, notify) => {
                    let child = childProcess.exec("file --mime-type \"" + fileName + "\"", (err, stdout, stderr) => {
                        try {
                            if (err) {
                                reject(err);
                            }
                            let stdoutStr = stdout.toString("utf8");
                            let magicMime = _.trimRight(stdoutStr.substr(stdoutStr.lastIndexOf(" ") + 1), "\n");
                            trace.debug("Magic mime type for %s is %s.", fileName, magicMime);
                            if (magicMime) {
                                if (extension) {
                                    if (!extTypeCounter[extension]) {
                                        extTypeCounter[extension] = {};
                                    }
                                    let hitCounters = extTypeCounter[extension];
                                    if (!hitCounters[magicMime]) {
                                        hitCounters[magicMime] = [];
                                    } 
                                    hitCounters[magicMime].push(fileName);
                                } else {
                                    if (!overrides[fileName]) {
                                        overrides[fileName].contentType = magicMime;
                                    }
                                }
                            } else {
                                if (stderr) {
                                    reject(stderr.toString("utf8"));
                                } else {
                                    trace.warn("Could not determine content type for %s. Defaulting to application/octet-stream. To override this, add a contentType property to this file entry in the manifest.", fileName);
                                    overrides[fileName].contentType = "application/octet-stream";
                                }
                            }
                            resolve(null);
                        } catch (e) {
                            reject(e);
                        }
                    });
                });
                contentTypePromises.push(mimePromise);
            });
            contentTypePromise = Q.all(contentTypePromises).then(() => {
                Object.keys(extTypeCounter).forEach((ext) => {
                    let hitCounts = extTypeCounter[ext];
                    let bestMatch = this.maxKey<string[]>(hitCounts, (i => i.length));
                    Object.keys(hitCounts).forEach((type) => {
                        if (type === bestMatch) {
                            return;
                        }
                        hitCounts[type].forEach((fileName) => {
                            overrides[fileName].contentType = type;
                        });
                    });
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: bestMatch
                        }
                    });
                });
            });
        }
        return contentTypePromise.then(() => {
            Object.keys(overrides).forEach((partName) => {
                contentTypes.Types.Override.push({
                    $: {
                        ContentType: overrides[partName].contentType,
                        PartName: "/" + _.trimLeft(partName, "/")
                    }
                })
            });
            let builder = new xml.Builder({
                indent: "    ",
                newline: os.EOL,
                pretty: true,
                xmldec: {
                    encoding: "utf-8",
                    standalone: null,
                    version: "1.0"
                }
            });
            return builder.buildObject(contentTypes);
        });
    }
    
    private maxKey<T>(obj: {[key: string]: T}, func: (input: T) => number): string {
        let maxProp;
        for (let prop in obj) {
            if (!maxProp || func(obj[prop]) > func(obj[maxProp])) {
                maxProp = prop;
            }
        }
        return maxProp;
    }
}