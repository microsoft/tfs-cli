import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'create a visual studio extensions publisher';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionPublisherCreate;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionPublisherCreate extends cmdm.TfCommand {
    requiredArguments = [argm.PUBLISHER_NAME, argm.DISPLAY_NAME, argm.DESCRIPTION];
    optionalArguments = [argm.GALLERY_URL, argm.SETTINGS];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('extension-publisher-create.exec');
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi();
		return this.checkArguments(args, options).then( (allArguments) => {
			return galleryapi.createPublisher(<galleryifm.Publisher>{
				publisherName: allArguments[argm.PUBLISHER_NAME.name],
				displayName: allArguments[argm.DISPLAY_NAME.name],
				longDescription: allArguments[argm.DESCRIPTION.name],
				shortDescription: allArguments[argm.DESCRIPTION.name]
			})
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no publisher supplied');
        }

        var publisher: galleryifm.Publisher = <galleryifm.Publisher>data;
        console.log();
        console.log('Successfully created publisher');
        console.log('name   : ' + publisher.publisherName);
        console.log('display name: ' + publisher.displayName);
        console.log('description : ' + publisher.shortDescription);
    }   
}