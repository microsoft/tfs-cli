import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
import package = require('../lib/package');
var trace = require('../lib/trace');

export function describe(): string {
    return 'Create a vsix package for an extension.';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionCreate;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionCreate extends cmdm.TfCommand {
    requiredArguments = [argm.OUTPUT_PATH];
    optionalArguments = [argm.ROOT, argm.MANIFEST_GLOB, argm.SETTINGS, argm.OVERRIDE];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace('extension-create.exec');
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi();
        this.checkArguments(args, options).then( (allArguments) => {
            trace("Begin package creation", 1);
            let merger = new package.Package.Merger(allArguments);
            trace("Merge partial manifests", 2);
            return merger.merge().then((vsixComponents) => {
                trace.success("Merged successfully");
                let vsixWriter = new package.Package.VsixWriter(vsixComponents.vsoManifest, vsixComponents.vsixManifest, vsixComponents.files);
                trace("Beginning writing VSIX", 2);
                return vsixWriter.writeVsix(allArguments[argm.OUTPUT_PATH.name]).then((outPath: string) => {
                    trace("VSIX written to: %s", 3, outPath);
                    return outPath;
                });
            }).then((outPath) => {
                trace.success("Successfully created VSIX package.");
                return outPath;
            });
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no path supplied');
        }

        var outPath: string = data;
        console.log();
        trace.success('Successfully created package at ' + outPath);
    }   
}