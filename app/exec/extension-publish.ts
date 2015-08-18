/// <reference path="../../definitions/tsd.d.ts" />

import argm = require('../lib/arguments');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import createm = require('./extension-create');
import extinfom = require('../lib/extensioninfo');
import fs = require('fs');
import gallerym = require('vso-node-api/GalleryApi');
import galleryifm = require('vso-node-api/interfaces/GalleryInterfaces');
import os = require('os');
import Q = require('q');
import sharem = require('./extension-share');
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
        var galleryapi: gallerym.IQGalleryApi = this.getWebApi().getQGalleryApi(this.connection.galleryUrl);
        return this.checkArguments(args, options).then( (allArguments: cm.IStringIndexer) => {        
			return Q.Promise<string>((resolve, reject, notify) => {
                if (allArguments[argm.VSIX_PATH.name]) {
                    trace.debug("VSIX was manually specified. Skipping generation.");
                    resolve(allArguments[argm.VSIX_PATH.name]);
                } else {
                    trace.info("VSIX not specified. Creating new package.");
                    resolve(createm.getCommand().exec(args, options));
                }
            }).then((vsixPath: string) => {
                trace.debug("Begin publish to Gallery");
                return new PublisherManager(galleryapi).publish(vsixPath).then(() => {
                    trace.debug("Success");
                    return <PublishResults> {
                        vsixPath: vsixPath
                    };
                });            
            }).then((results: PublishResults) => {
                trace.debug("Begin sharing");
				if (allArguments[argm.SHARE_WITH.name]) {
                    var sharer: sharem.ExtensionShare = sharem.getCommand();
                    sharer.connection = this.connection;
                    options[argm.VSIX_PATH.name] = results.vsixPath;
                    return sharer.exec(args, options).then((accounts) => {
                        results.shareWith = accounts;
                        return results;
                    });
				}
                return results;
			});
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no package supplied');
        }

        var results: PublishResults = data;
        trace.info();
        trace.success("Successfully published VSIX from %s to the gallery.", results.vsixPath);
    }   
}

export class PublisherManager {
    protected galleryapi: gallerym.IQGalleryApi;
    protected cachedExtensionInfo: extinfom.CoreExtInfo;
    private static validationPending = "__validation_pending";
    private static validated = "__validated";
    private static validationInterval = 1000;
    private static validationRetries = 50;
    
    /**
    * Constructor
    * @param PublishSettings
    */
    constructor(galleryapi: gallerym.IQGalleryApi) {
        this.galleryapi = galleryapi;
    }
    
    /**
     * Publish the VSIX extension given by vsixPath
     * @param string path to a VSIX extension to publish
     * @return Q.Promise that is resolved when publish is complete
     */
    public publish(vsixPath: string): Q.Promise<any> {
        trace.debug('publish.publish');
        
        let extPackage: galleryifm.ExtensionPackage = {
            extensionManifest: fs.readFileSync(vsixPath, "base64")
        };
        trace.debug("Publishing %s", vsixPath);
        
        // Check if the app is already published. If so, call the update endpoint. Otherwise, create.
        trace.debug("Checking if this extension is already published");
        return this._createOrUpdateExtension(vsixPath, extPackage).then((extInfo) => {
            trace.info("Waiting for server to validate extension package...");
            return this._waitForValidation(vsixPath, extInfo.version).then((result) => {
                if (result === PublisherManager.validated) {
                    return "success";
                } else {
                    throw new Error("Extension validation failed. Please address the following issues and retry publishing." + os.EOL + result);
                }
            });
        });
    }
    
    private _createOrUpdateExtension(vsixPath: string, extPackage: galleryifm.ExtensionPackage): Q.Promise<extinfom.CoreExtInfo> {
        return this._checkVsixPublished(vsixPath).then((extInfo) => {
            if (extInfo && extInfo.published) {
                trace.info("Extension already published, %s the extension", "updating");
                return this.galleryapi.updateExtension(extPackage, extInfo.publisher, extInfo.id).then((publishedExtension) => {
                    return extInfo;
                });
            } else {
                trace.info("Extension not yet published, %s a new extension.", "creating");
                return this.galleryapi.createExtension(extPackage).then((publishedExtension) => {
                    return extInfo;
                });
            }
        });
    }
    
    private _waitForValidation(vsixPath: string, publisherName: string, version?: string, interval = PublisherManager.validationInterval, retries = PublisherManager.validationRetries): Q.Promise<string> {
        if (retries === 0) {
            throw new Error("Validation timed out. There may be a problem validating your extension. Please try again later.");
        } else if (retries === 25) {
            trace.info("This is taking longer than usual. Hold tight...");
        }
        trace.debug("Polling for validation (%s retries remaining).", retries.toString());
        return Q.delay(this._getValidationStatus(vsixPath, publisherName, version), interval).then((status) => {
            trace.debug("--Retrieved validation status: %s", status);
            if (status === PublisherManager.validationPending) {
                return this._waitForValidation(vsixPath, publisherName, version, interval, retries - 1);
            } else {
                return status;
            }
        });
    }
    
    private _checkVsixPublished(vsixPath: string): Q.Promise<extinfom.CoreExtInfo> {
        trace.debug('publish.checkVsixPublished');
        return extinfom.getExtInfo(vsixPath, null, "", this.cachedExtensionInfo).then((extInfo) => {
            this.cachedExtensionInfo = extInfo;
            return this.galleryapi.getExtension(extInfo.publisher, extInfo.id).then((ext) => {
                if (ext) {
                    extInfo.published = true;
                    return extInfo;
                }
                return extInfo;
            }).catch<{id: string, publisher: string, version: string}>(() => {return extInfo;});
        });
    }
    
    
    private _getValidationStatus(vsixPath: string, publisherName: string, version?: string): Q.Promise<string> {
        return extinfom.getExtInfo(vsixPath, null, "", this.cachedExtensionInfo).then((extInfo) => {
            this.cachedExtensionInfo = extInfo;
            return this.galleryapi.getExtension(extInfo.publisher, extInfo.id, extInfo.version, galleryifm.ExtensionQueryFlags.IncludeVersions).then((ext) => {
                if (!ext || ext.versions.length === 0) {
                    throw "Extension not published.";
                }
                let extVersion = ext.versions[0];
                if (version) {
                    extVersion = this._getVersionedExtension(ext, version);
                }
                // If there is a validationResultMessage, validation failed and this is the error
                // If the validated flag is missing and there is no validationResultMessage, validation is pending
                // If the validated flag is present and there is no validationResultMessage, the extension is validated.
                if (extVersion.validationResultMessage) {
                    return extVersion.validationResultMessage;
                } else if ((extVersion.flags & galleryifm.ExtensionVersionFlags.Validated) === 0) {
                    return PublisherManager.validationPending;
                } else {
                    return PublisherManager.validated;
                }
            });
        });
    }
    
    private _getVersionedExtension(extension: galleryifm.PublishedExtension, version: string): galleryifm.ExtensionVersion {
        let matches = extension.versions.filter(ev => ev.version === version);
        if (matches.length > 0) {
            return matches[0];
        } else {
            return null;
        }
    }
}