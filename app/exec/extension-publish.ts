import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
import createm = require('./extension-create');
import publishm = require('../lib/publish');
import Q = require('q');
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

export interface PublishResults {
    vsixPath: string,
    shareWith: string[]
}

export class ExtensionPublish extends cmdm.TfCommand {
    optionalArguments = [argm.VSIX_PATH, argm.SHARE_WITH];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('extension-publish.exec');
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi();
        return this.checkArguments(args, options).then( (allArguments) => {        
			return Q.Promise<string>((resolve, reject, notify) => {
                if (allArguments[argm.VSIX_PATH.name]) {
                    trace.debug("VSIX was manually specified. Skipping generation.");
                    resolve(allArguments[argm.VSIX_PATH.name]);
                } else {
                    trace.info("VSIX not specified. Creating new package.");
                    resolve(createm.getCommand().exec(args, options));
                }
            }).then((vsixPath) => {
                trace.debug("Begin publish to Gallery");
                let publisher = new publishm.Publish.PackagePublisher(allArguments[argm.PUBLISHER_NAME.name], this.getWebApi().getQGalleryApi());
                return publisher.publish(vsixPath).then(() => {
                    trace.debug("Success");
                    return <PublishResults> {
                        vsixPath: vsixPath
                    };
                });            
            });/*.then(() => {
				/*if (settings.publish.shareWith && settings.publish.shareWith.length > 0) {
					return doSharing(settings.publish);
				}
			});*/
        });
        
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no package supplied');
        }

        var results: PublishResults = data;
        console.log();
        trace.success("Successfully published VSIX from %s to the gallery.", results.vsixPath);
    }   
}