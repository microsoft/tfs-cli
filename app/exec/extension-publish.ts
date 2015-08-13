import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'Publish a VSIX package to your account. Generates the VSIX using [package_settings_path] unless --vsix is specified.';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionPublish;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionPublish extends cmdm.TfCommand {
    optionalArguments = [argm.GALLERY_URL, argm.SETTINGS];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('extension-publish.exec');
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi();
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no package supplied');
        }

        var extensionPackage: galleryifm.ExtensionPackage = <galleryifm.ExtensionPackage>data;
        console.log();
        console.log('Successfully published package');
    }   
}