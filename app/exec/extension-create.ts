/// <reference path="../../definitions/tsd.d.ts" />
import { Merger } from "../lib/extensions/merger";
import { VsixManifestBuilder } from "../lib/extensions/vsix-manifest-builder";
import { VsoManifestBuilder } from "../lib/extensions/targets/VSO/vso-manifest-builder";
import { MergeSettings, PackageSettings } from "../lib/extensions/interfaces";
import { VsixWriter } from "../lib/extensions/vsix-writer";
import argm = require('../lib/arguments');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
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
    locRoot?: string;
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
            argm.LOC_ROOT,
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
            let mergeSettings: MergeSettings = {
                root: args.root,
                manifestGlobs: args.manifestglob,
                overrides: args.override,
                bypassValidation: args.bypassvalidation
            };
            let packageSettings: PackageSettings = {
                outputPath: args.outputpath,
                locRoot: args.locRoot
            };
            var merger = new Merger(mergeSettings, [VsixManifestBuilder, VsoManifestBuilder]);
            
            trace.debug("Merge partial manifests");
            return merger.merge().then((components) => {
                trace.success("Merged successfully");
                var vsixWriter = new VsixWriter(packageSettings, components);
                trace.debug("Beginning writing VSIX");
                return vsixWriter.writeVsix().then((outPath: string) => {
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