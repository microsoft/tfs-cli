import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
import extinfom = require('../lib/extensioninfo');
import Q = require('q');
var trace = require('../lib/trace');

export function describe(): string {
    return 'share a visual studio extension';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionShow;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionShow extends cmdm.TfCommand {
    requiredArguments = [argm.SHARE_WITH];
    optionalArguments = [argm.PUBLISHER_NAME, argm.EXTENSION_ID, argm.VSIX_PATH, argm.GALLERY_URL];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<galleryifm.PublishedExtension> {
        trace.debug('extension-show.exec');
        var galleryapi: gallerym.IGalleryApi = this.getWebApi().getGalleryApi();
		return this.checkArguments(args, options).then( (allArguments) => {
			return null;
        });
    }

    public output(info: string): void {
        if (!info) {
            throw new Error('no extension information supplied');
        }

        console.log();
        console.log(info);
    }   
}