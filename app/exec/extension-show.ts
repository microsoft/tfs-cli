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
    optionalArguments = [argm.PUBLISHER_NAME, argm.EXTENSION_ID, argm.VSIX_PATH, argm.MARKET_URL];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<galleryifm.PublishedExtension> {
        trace.debug('extension-show.exec');
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi(this.connection.galleryUrl);
        return this.checkArguments(args, options).then( (allArguments) => {
            return extinfom.getExtInfo(allArguments[argm.VSIX_PATH.name], allArguments[argm.EXTENSION_ID.name], allArguments[argm.PUBLISHER_NAME.name]).then((extInfo) => {
                return galleryapi.getExtension(
                    extInfo.publisher, 
                    extInfo.id, 
                    null, 
                    galleryifm.ExtensionQueryFlags.IncludeVersions |
                        galleryifm.ExtensionQueryFlags.IncludeFiles |
                        galleryifm.ExtensionQueryFlags.IncludeCategoryAndTags |
                        galleryifm.ExtensionQueryFlags.IncludeSharedAccounts).then((extension) => {
                        
                        return extension;
                });
            });
        });
    }

    public output(ext: galleryifm.PublishedExtension): void {
        if (!ext) {
            throw new Error('no extension information supplied');
        }

        trace.println();
        trace.info("Extension name : %s", ext.extensionName);
        trace.info("Publisher name : %s", ext.publisher.displayName);
        trace.info("Extension id   : %s", ext.extensionId);
        trace.info("Last updated   : %s", ext.lastUpdated.toLocaleTimeString());
        trace.info("Shared with    : %s", ext.allowedAccounts.map(acct => acct.accountName));
    }   
}