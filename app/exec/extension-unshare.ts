import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
import extinfom = require('../lib/extensioninfo');
import Q = require('q');
var trace = require('../lib/trace');

export function describe(): string {
    return 'un-share a visual studio extension';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionUnshare;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionUnshare extends cmdm.TfCommand {
    requiredArguments = [argm.UNSHARE_WITH];
    optionalArguments = [argm.PUBLISHER_NAME, argm.EXTENSION_ID, argm.VSIX_PATH, argm.GALLERY_URL];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<string[]> {
        trace.debug('extension-unshare.exec');
        var galleryapi: gallerym.IGalleryApi = this.getWebApi().getGalleryApi();
		return this.checkArguments(args, options).then( (allArguments) => {
            var accounts: string[] = allArguments[argm.UNSHARE_WITH.name];
            return extinfom.getExtInfo(allArguments[argm.EXTENSION_ID.name], allArguments[argm.VSIX_PATH.name], allArguments[argm.PUBLISHER_NAME.name]).then((extInfo) => {
                for(var i = 0; i < accounts.length; i++) {
	 				galleryapi.unshareExtension(extInfo.publisher, extInfo.id, accounts[i], (err, statuscode) => {
                         if(err) {
                             Q.reject(err);
                         }
                     });                    
                }
                return Q.resolve(accounts);
            });
        });
    }

    public output(accounts: string[]): void {
        if (!accounts) {
            throw new Error('no sharing information supplied');
        }

        console.log();
        trace.success('Extension successfully unshared from: ' + accounts);
    }   
}