import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import argm = require('../lib/arguments');
import Q = require('q');
var trace = require('../lib/trace');

export function describe(): string {
    return 'delete a visual studio extensions publisher';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new ExtensionPublisherDelete;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class ExtensionPublisherDelete extends cmdm.TfCommand {
    requiredArguments = [argm.PUBLISHER_NAME];
    optionalArguments = [argm.GALLERY_URL, argm.SETTINGS];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace('extension-publisher-delete.exec');
        var defer = Q.defer<galleryifm.Publisher>();
        var galleryapi: gallerym.IGalleryApi = this.getWebApi().getGalleryApi();
		this.checkArguments(args, options).then( (allArguments) => {
            var name: string = allArguments[argm.PUBLISHER_NAME.name];
            galleryapi.deletePublisher(name, (err, statusCode: number) => {
                if (err) {
                    trace("Call to TaskAgentApi.deleteTaskDefinition failed with code " + statusCode + ". Message: " + err.message);
                    err.statusCode = statusCode;
                    defer.reject(err);
                }
                else {
                    trace("Success.");
                    defer.resolve(<galleryifm.Publisher>{
                        publisherName: name
                    })
                }
            });
		})
        .fail((err) => {
            trace('Failed to gather inputs. Message: ' + err.message);
            defer.reject(err);
        });
        return <Q.Promise<galleryifm.Publisher>>defer.promise;
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no publisher supplied');
        }

        var publisher: galleryifm.Publisher = <galleryifm.Publisher>data;
        console.log();
        console.log('Successfully deleted publisher ' + publisher.publisherName);
    }   
}