/// <reference path="../../definitions/tsd.d.ts" />

import _ = require("lodash");
import argm = require('./arguments');
import colors = require('colors');
import cm = require('./common');
import fs= require("fs");
import gallerym = require("vso-node-api/GalleryApi");
import galleryifm = require("vso-node-api/interfaces/GalleryInterfaces");
import os = require("os");
import trace = require("./trace");
import Q = require("q");
import xml2js = require("xml2js");
import zip = require("jszip");

export module Publish {
	
	interface CoreExtInfo {
		id: string;
		publisher: string;
		version: string;
		published?: boolean;
	}
	
	class GalleryBase {
		protected settings: cm.IStringIndexer;
		protected galleryClient: gallerym.IQGalleryApi;
		private vsixInfoPromise: Q.Promise<CoreExtInfo>;
		private publisherName: string;
		
		/**
		 * Constructor
		 * @param PublishSettings
		 */
		constructor(publisherName: string, galleryapi: gallerym.IQGalleryApi ) {
			this.publisherName = publisherName;
			this.galleryClient = galleryapi;
		}
		
		protected getExtInfo(extensionId: string, vsixPath: string): Q.Promise<CoreExtInfo> {
			if (!this.vsixInfoPromise) {
				if (extensionId && this.publisherName) {
					this.vsixInfoPromise = Q.resolve({id: extensionId, publisher: this.publisherName, version: null});
				} else {
					this.vsixInfoPromise = Q.Promise<JSZip>((resolve, reject, notify) => {
						fs.readFile(vsixPath, function(err, data) {
							if (err) reject(err);
							trace.debug("Read vsix as zip... Size (bytes): %s", data.length.toString());
							try {
								resolve(new zip(data));
							} catch (err) {
								reject(err);
							}
						});
					}).then((zip) => {
						trace.debug("Files in the zip: %s", Object.keys(zip.files).join(", "));
						let vsixManifestFileNames = Object.keys(zip.files).filter(key => _.endsWith(key, "vsixmanifest"));
						if (vsixManifestFileNames.length > 0) {
							return Q.nfcall(xml2js.parseString, zip.files[vsixManifestFileNames[0]].asText());
						} else {
							throw new Error("Could not locate vsix manifest!");
						}
					}).then((vsixManifestAsJson) => {
						let extensionId: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
						let extensionPublisher: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
						let extensionVersion: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Version");
						if (extensionId && extensionPublisher) {
							return {id: extensionId, publisher: extensionPublisher, version: extensionVersion};
						} else {
							throw new Error("Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property.");
						}
					});
				} 
			}
			return this.vsixInfoPromise;
		}
	}
	
	// export class SharingManager extends GalleryBase {
	// 	
	// 	private id: Q.Promise<string>;
	// 	private publisher: Q.Promise<string>;
	// 	
	// 	/**
	// 	 * Constructor
	// 	 * @param PublishSettings
	// 	 */
	// 	constructor(settings: cm.IStringIndexer, galleryapi: gallerym.IQGalleryApi) {
	// 		super(settings, galleryapi);
	// 	}
	// 	
	// 	public shareWith(accounts: string[]): Q.Promise<any> {
	// 		return this.getExtInfo().then((extInfo) => {
	// 			return Q.all(accounts.map((account) => {
	// 				return this.galleryClient.shareExtension(extInfo.publisher, extInfo.id, account);
	// 			}));
	// 		});
	// 	}
	// 	
	// 	public unshareWith(accounts: string[]): Q.Promise<any> {
	// 		return this.getExtInfo().then((extInfo) => {
	// 			return Q.all(accounts.map((account) => {
	// 				return this.galleryClient.unshareExtension(extInfo.publisher, extInfo.id, account);
	// 			}));
	// 		});
	// 	}
	// 	
	// 	public unshareWithAll(): Q.Promise<any> {
	// 		return this.getSharedWithAccounts().then((accounts) => {
	// 			return this.unshareWith(accounts);
	// 		});
	// 	}
	// 	
	// 	public getSharedWithAccounts() {
	// 		return this.getExtensionInfo().then((ext) => {
	// 			return ext.allowedAccounts.map(acct => acct.accountName);
	// 		});
	// 	}
	// 	
	// 	public getExtensionInfo(): Q.Promise<galleryifm.PublishedExtension> {
	// 		return this.getExtInfo().then((extInfo) => {
	// 			return this.galleryClient.getExtension(
	// 				extInfo.publisher, 
	// 				extInfo.id, 
	// 				null, 
	// 				galleryifm.ExtensionQueryFlags.IncludeVersions |
	// 					galleryifm.ExtensionQueryFlags.IncludeFiles |
	// 					galleryifm.ExtensionQueryFlags.IncludeCategoryAndTags |
	// 					galleryifm.ExtensionQueryFlags.IncludeSharedAccounts).then((extension) => {
	// 					
	// 					return extension;
	// 			});
	// 		});
	// 	}
	// }
	
	export class PackagePublisher extends GalleryBase {
		
		private static validationPending = "__validation_pending";
		private static validated = "__validated";
		private static validationInterval = 1000;
		private static validationRetries = 50;
		
		/**
		 * Constructor
		 * @param PublishSettings settings
		 */
		constructor(publisherName: string, galleryapi: gallerym.IQGalleryApi) {
			super(publisherName, galleryapi);
		}
		
		private checkVsixPublished(vsixPath: string): Q.Promise<CoreExtInfo> {
			trace.debug('publish.checkVsixPublished');
			return this.getExtInfo(null, vsixPath).then((extInfo) => {
				return this.galleryClient.getExtension(extInfo.publisher, extInfo.id).then((ext) => {
					if (ext) {
						extInfo.published = true;
						return extInfo;
					}
					return extInfo;
				}).catch<{id: string, publisher: string, version: string}>(() => {return extInfo;});
			});
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
			return this.createOrUpdateExtension(vsixPath, extPackage).then((extInfo) => {
				trace.info("Waiting for server to validate extension package...");
				return this.waitForValidation(vsixPath, extInfo.version).then((result) => {
					if (result === PackagePublisher.validated) {
						return "success";
					} else {
						throw new Error("Extension validation failed. Please address the following issues and retry publishing." + os.EOL + result);
					}
				});
			});
		}
		
		private createOrUpdateExtension(vsixPath: string, extPackage: galleryifm.ExtensionPackage): Q.Promise<CoreExtInfo> {
			return this.checkVsixPublished(vsixPath).then((extInfo) => {
				if (extInfo && extInfo.published) {
					trace.info("Extension already published, %s the extension", "updating");
					return this.galleryClient.updateExtension(extPackage, extInfo.publisher, extInfo.id).then((publishedExtension) => {
						return extInfo;
					});
				} else {
					trace.info("Extension not yet published, %s a new extension.", "creating");
					return this.galleryClient.createExtension(extPackage).then((publishedExtension) => {
						return extInfo;
					});
				}
			});
		}
		
		public waitForValidation(vsixPath: string, version?: string, interval = PackagePublisher.validationInterval, retries = PackagePublisher.validationRetries): Q.Promise<string> {
			if (retries === 0) {
				throw "Validation timed out. There may be a problem validating your extension. Please try again later.";
			} else if (retries === 25) {
				trace.info("This is taking longer than usual. Hold tight...");
			}
			trace.debug("Polling for validation (%s retries remaining).", retries.toString());
			return Q.delay(this.getValidationStatus(version), interval).then((status) => {
				trace.debug("--Retrieved validation status: %s", status);
				if (status === PackagePublisher.validationPending) {
					return this.waitForValidation(vsixPath, version, interval, retries - 1);
				} else {
					return status;
				}
			});
		}
		
		public getValidationStatus(vsixPath: string, version?: string): Q.Promise<string> {
			return this.getExtInfo(null, vsixPath).then((extInfo) => {
				return this.galleryClient.getExtension(extInfo.publisher, extInfo.id, extInfo.version, galleryifm.ExtensionQueryFlags.IncludeVersions).then((ext) => {
					if (!ext || ext.versions.length === 0) {
						throw "Extension not published.";
					}
					let extVersion = ext.versions[0];
					if (version) {
						extVersion = this.getVersionedExtension(ext, version);
					}
					// If there is a validationResultMessage, validation failed and this is the error
					// If the validated flag is missing and there is no validationResultMessage, validation is pending
					// If the validated flag is present and there is no validationResultMessage, the extension is validated.
					if (extVersion.validationResultMessage) {
						return extVersion.validationResultMessage;
					} else if ((extVersion.flags & galleryifm.ExtensionVersionFlags.Validated) === 0) {
						return PackagePublisher.validationPending;
					} else {
						return PackagePublisher.validated;
					}
				});
			});
		}
		
		private getVersionedExtension(extension: galleryifm.PublishedExtension, version: string): galleryifm.ExtensionVersion {
			let matches = extension.versions.filter(ev => ev.version === version);
			if (matches.length > 0) {
				return matches[0];
			} else {
				return null;
			}
		}
	}
}