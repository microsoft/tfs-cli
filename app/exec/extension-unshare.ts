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
    requiredArguments = [];
    optionalArguments = [argm.PUBLISHER_NAME, argm.EXTENSION_ID, argm.VSIX_PATH, argm.GALLERY_URL, argm.ALL, argm.UNSHARE_WITH];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<string[]> {
        trace.debug('extension-unshare.exec');
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi(this.connection.galleryUrl);
		return this.checkArguments(args, options).then( (allArguments) => {
            var accounts: string[];
            return extinfom.getExtInfo(allArguments[argm.VSIX_PATH.name], allArguments[argm.EXTENSION_ID.name], allArguments[argm.PUBLISHER_NAME.name]).then((extInfo) => {
                if(allArguments[argm.ALL.name]) {
                    return galleryapi.getExtension(extInfo.publisher, extInfo.id).then((ext) => {
                        return this._unshareWith(extInfo.publisher, extInfo.id, ext.allowedAccounts.map(acct => acct.accountName));
                    });
                }
                else if(allArguments[argm.UNSHARE_WITH.name]) {
                    return this._unshareWith(extInfo.publisher, extInfo.id, allArguments[argm.UNSHARE_WITH.name]);
                }
                else {
                    throw new Error("One of --with <[accounts]> or --all is required.");
                }
            });
        });
    }
    
    private _unshareWith(publisherName: string, extensionId: string, accounts: string[]): string[] {
        var galleryapi: gallerym.IGalleryApi = this.getWebApi().getGalleryApi(this.connection.galleryUrl);
        for(var i = 0; i < accounts.length; i++) {
            galleryapi.unshareExtension(publisherName, extensionId, accounts[i], (err, statuscode) => {
                if(err) {
                    throw err;
                }
            });                    
        }    
        return accounts;
    }

    public output(accounts: string[]): void {
        if (!accounts) {
            throw new Error('no sharing information supplied');
        }

        trace.println();
        trace.success('Extension successfully unshared from:' + accounts.map((account) => " " + account));
    }   
}