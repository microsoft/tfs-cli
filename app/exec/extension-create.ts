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
export var isServerOperation: boolean = false;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionCreate extends cmdm.TfCommand {
    requiredArguments = [argm.OUTPUT_PATH];
    optionalArguments = [argm.ROOT, argm.MANIFEST_GLOB, argm.SETTINGS, argm.OVERRIDE];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('extension-create.exec');
        return this.checkArguments(args, options).then( (allArguments) => {
            trace.debug("Begin package creation");
            let merger = new package.Package.Merger(allArguments);
            trace.debug("Merge partial manifests");
            return merger.merge().then((vsixComponents) => {
                trace.success("Merged successfully");
                let vsixWriter = new package.Package.VsixWriter(vsixComponents.vsoManifest, vsixComponents.vsixManifest, vsixComponents.files);
                trace.debug("Beginning writing VSIX");
                return vsixWriter.writeVsix(allArguments[argm.OUTPUT_PATH.name]).then((outPath: string) => {
                    trace.debug("VSIX written to: %s", outPath);
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