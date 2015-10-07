import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
import extinfom = require('../lib/extensions/extensioninfo');
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
    optionalArguments = [argm.PUBLISHER_NAME, argm.EXTENSION_ID, argm.VSIX_PATH, argm.MARKET_URL, argm.ALL, argm.UNSHARE_WITH];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<string[]> {
        trace.debug('extension-unshare.exec');
        let galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi(this.connection.galleryUrl);
        return this.checkArguments(args, options).then( (allArguments) => {
            let accounts: string[];
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
    
    private _unshareWith(publisherName: string, extensionId: string, accounts: string[]): Q.Promise<string[]> {
        let galleryapi: gallerym.IGalleryApi = this.getWebApi().getGalleryApi(this.connection.galleryUrl);
        let promises = []
        for (var account of accounts) {
            let promise = Q.Promise((resolve, reject) => {
                galleryapi.unshareExtension(publisherName, extensionId, account, (err, statuscode) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(accounts);
                    }
                });
            });
            promises.push(promise);
        }
        return Q.all(promises).then(() => accounts);
    }

    public output(accounts: string[]): void {
        if (!accounts) {
            throw new Error('no sharing information supplied');
        }

        trace.println();
        trace.success('Extension successfully unshared from: %s', accounts.join(','));
    }   
}