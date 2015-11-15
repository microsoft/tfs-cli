import { IQGalleryApi } from "vso-node-api/GalleryApi";
import { PublishSettings } from "./interfaces";
import _ = require("lodash");
import colors = require("colors");
import errHandler = require("../../../lib/errorhandler");
import fs = require("fs");
import GalleryInterfaces = require("vso-node-api/interfaces/GalleryInterfaces");
import Q = require("q");
import qfs = require("../../../lib/qfs");
import trace = require("../../../lib/trace");
import xml2js = require("xml2js");
import zip = require("jszip");

export interface CoreExtInfo {
	id: string;
	publisher: string;
	version: string;
	published?: boolean;
}

export class GalleryBase {
	private vsixInfoPromise: Q.Promise<CoreExtInfo>;

	/**
	 * Constructor
	 * @param PublishSettings
	 */
	constructor(protected settings: PublishSettings, protected galleryClient: IQGalleryApi, extInfo?: CoreExtInfo) {
		if (extInfo) {
			this.vsixInfoPromise = Q.resolve(extInfo);
		}

		// if (!settings.galleryUrl || !/^https?:\/\//.test(settings.galleryUrl)) {
		//     throw "Invalid or missing gallery URL.";
		// }
		// if (!settings.token || !/^[A-z0-9]{52}$/.test(settings.token)) {
		//     throw "Invalid or missing personal access token.";
		// }
	}

	protected getExtInfo(): Q.Promise<CoreExtInfo> {
		if (!this.vsixInfoPromise) {
			this.vsixInfoPromise = GalleryBase.getExtInfo({
				extensionId: this.settings.extensionId,
				publisher: this.settings.publisher,
				vsixPath: this.settings.vsixPath});
		}
		return this.vsixInfoPromise;
	}

	public static getExtInfo(info: {extensionId?: string, publisher?: string, vsixPath?: string}): Q.Promise<CoreExtInfo> {
		let promise: Q.Promise<CoreExtInfo>;
		if (info.extensionId && info.publisher) {
			promise = Q.resolve({id: info.extensionId, publisher: info.publisher, version: null});
		} else {
			promise = Q.Promise<JSZip>((resolve, reject, notify) => {
				fs.readFile(info.vsixPath, function(err, data) {
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
					throw "Could not locate vsix manifest!";
				}
			}).then((vsixManifestAsJson) => {
				let extensionId: string = info.extensionId || _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
				let extensionPublisher: string = info.publisher || _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
				let extensionVersion: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Version");
				if (extensionId && extensionPublisher) {
					return {id: extensionId, publisher: extensionPublisher, version: extensionVersion};
				} else {
					throw "Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property, or specify the necessary --publisher and/or --extension options.";
				}
			});
		}
		return promise;
	}
}

/**
 * Class that handles creating and deleting publishers
 */
export class PublisherManager extends GalleryBase {

	/**
	 * Constructor
	 * @param PublishSettings
	 */
	constructor(protected settings: PublishSettings, protected galleryClient: IQGalleryApi) {
		super(settings, galleryClient);
	}

	/**
	 * Create a a publisher with the given name, displayName, and description
	 * @param string Publisher's unique name
	 * @param string Publisher's display name
	 * @param string Publisher description
	 * @return Q.Promise that is resolved when publisher is created
	 */
	public createPublisher(name: string, displayName: string, description: string): Q.Promise<any> {
		return this.galleryClient.createPublisher(<GalleryInterfaces.Publisher>{
			publisherName: name,
			displayName: displayName,
			longDescription: description,
			shortDescription: description
		}).catch(errHandler.httpErr);
	}

	/**
	 * Delete the publisher with the given name
	 * @param string Publisher's unique name
	 * @return Q.promise that is resolved when publisher is deleted
	 */
	public deletePublisher(name: string): Q.Promise<any> {
		return this.galleryClient.deletePublisher(name).catch(errHandler.httpErr);
	}
}

export class SharingManager extends GalleryBase {

	private id: Q.Promise<string>;
	private publisher: Q.Promise<string>;

	public shareWith(accounts: string[]): Q.Promise<any> {
		return this.getExtInfo().then((extInfo) => {
			return Q.all(accounts.map((account) => {
				trace.info("Sharing extension with %s.", account);
				return this.galleryClient.shareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr);
			}));
		});
	}

	public unshareWith(accounts: string[]): Q.Promise<any> {
		return this.getExtInfo().then((extInfo) => {
			return Q.all(accounts.map((account) => {
				return this.galleryClient.unshareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr);
			}));
		});
	}

	public unshareWithAll(): Q.Promise<any> {
		return this.getSharedWithAccounts().then((accounts) => {
			return this.unshareWith(accounts);
		});
	}

	public getSharedWithAccounts() {
		return this.getExtensionInfo().then((ext) => {
			return ext.sharedWith.map(acct => acct.name);
		});
	}

	public getExtensionInfo(): Q.Promise<GalleryInterfaces.PublishedExtension> {
		return this.getExtInfo().then((extInfo) => {
			return this.galleryClient.getExtension(
				extInfo.publisher,
				extInfo.id,
				null,
				GalleryInterfaces.ExtensionQueryFlags.IncludeVersions |
					GalleryInterfaces.ExtensionQueryFlags.IncludeFiles |
					GalleryInterfaces.ExtensionQueryFlags.IncludeCategoryAndTags |
					GalleryInterfaces.ExtensionQueryFlags.IncludeSharedAccounts).then((extension) => {

					return extension;
			}).catch(errHandler.httpErr);
		});
	}
}

export class PackagePublisher extends GalleryBase {

	private static validationPending = "__validation_pending";
	private static validated = "__validated";
	private static validationInterval = 1000;
	private static validationRetries = 50;

	private checkVsixPublished(): Q.Promise<CoreExtInfo> {
		return this.getExtInfo().then((extInfo) => {
			return this.galleryClient.getExtension(extInfo.publisher, extInfo.id).then((ext) => {
				if (ext) {
					extInfo.published = true;
					return extInfo;
				}
				return extInfo;
			}).catch<{id: string, publisher: string, version: string}>(() => extInfo);
		});
	}

	/**
	 * Publish the VSIX extension given by vsixPath
	 * @param string path to a VSIX extension to publish
	 * @return Q.Promise that is resolved when publish is complete
	 */
	public publish(): Q.Promise<GalleryInterfaces.PublishedExtension> {

		let extPackage: GalleryInterfaces.ExtensionPackage = {
			extensionManifest: fs.readFileSync(this.settings.vsixPath, "base64")
		};
		trace.debug("Publishing %s", this.settings.vsixPath);

		// Check if the app is already published. If so, call the update endpoint. Otherwise, create.
		trace.info("Checking if this extension is already published");
		return this.createOrUpdateExtension(extPackage).then((ext) => {
			trace.info("Waiting for server to validate extension package...");
			return this.waitForValidation(ext.versions[ext.versions.length - 1].version).then((result) => {
				if (result === PackagePublisher.validated) {
					return ext;
				} else {
					throw "Extension validation failed. Please address the following issues and retry publishing.\n" + result;
				}
			});
		});
	}

	private createOrUpdateExtension(extPackage: GalleryInterfaces.ExtensionPackage): Q.Promise<GalleryInterfaces.PublishedExtension> {
		return this.checkVsixPublished().then((extInfo) => {
			let publishPromise;
			if (extInfo && extInfo.published) {
				trace.info("It is, %s the extension", colors.cyan("update").toString());
				publishPromise = this.galleryClient.updateExtension(extPackage, extInfo.publisher, extInfo.id).catch(errHandler.httpErr);
			} else {
				trace.info("It isn't, %s a new extension.", colors.cyan("create").toString());
				publishPromise = this.galleryClient.createExtension(extPackage).catch(errHandler.httpErr);
			}
			return publishPromise.then(() => {
				return this.galleryClient.getExtension(extInfo.publisher, extInfo.id, null, GalleryInterfaces.ExtensionQueryFlags.IncludeVersions);
			});
		})
	}

	public waitForValidation(version?: string, interval = PackagePublisher.validationInterval, retries = PackagePublisher.validationRetries): Q.Promise<string> {
		if (retries === 0) {
			throw "Validation timed out. There may be a problem validating your extension. Please try again later.";
		} else if (retries === 25) {
			trace.info("This is taking longer than usual. Hold tight...");
		}
		trace.debug("Polling for validation (%s retries remaining).", retries.toString());
		return Q.delay(this.getValidationStatus(version), interval).then((status) => {
			trace.debug("--Retrieved validation status: %s", status);
			if (status === PackagePublisher.validationPending) {
				return this.waitForValidation(version, interval, retries - 1);
			} else {
				return Q.resolve(status); // otherwise TypeScript gets upset... I don't really know why.
			}
		});
	}

	public getValidationStatus(version?: string): Q.Promise<string> {
		return this.getExtInfo().then((extInfo) => {
			return this.galleryClient.getExtension(extInfo.publisher, extInfo.id, extInfo.version, GalleryInterfaces.ExtensionQueryFlags.IncludeVersions).then((ext) => {
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
				} else if ((extVersion.flags & GalleryInterfaces.ExtensionVersionFlags.Validated) === 0) {
					return PackagePublisher.validationPending;
				} else {
					return PackagePublisher.validated;
				}
			});
		});
	}

	private getVersionedExtension(extension: GalleryInterfaces.PublishedExtension, version: string): GalleryInterfaces.ExtensionVersion {
		let matches = extension.versions.filter(ev => ev.version === version);
		if (matches.length > 0) {
			return matches[0];
		} else {
			return null;
		}
	}
}