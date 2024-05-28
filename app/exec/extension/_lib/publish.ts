import { IGalleryApi } from "azure-devops-node-api/GalleryApi";
import { PublishSettings } from "./interfaces";
import _ = require("lodash");
import colors = require("colors");
import errHandler = require("../../../lib/errorhandler");
import fs = require("fs");
import GalleryInterfaces = require("azure-devops-node-api/interfaces/GalleryInterfaces");
import trace = require("../../../lib/trace");
import xml2js = require("xml2js");
import zip = require("jszip");

import { delay } from "../../../lib/promiseUtils";

export interface CoreExtInfo {
	id: string;
	publisher: string;
	version: string;
	published?: boolean;
	isPublicExtension?: boolean;
}

export class GalleryBase {
	public static validationPending = "__validation_pending";
	public static validated = "__validated";

	private vsixInfoPromise: Promise<CoreExtInfo>;

	/**
	 * Constructor
	 * @param PublishSettings
	 */
	constructor(protected settings: PublishSettings, protected galleryClient: IGalleryApi, extInfo?: CoreExtInfo) {
		if (extInfo) {
			this.vsixInfoPromise = Promise.resolve(extInfo);
		}

		// if (!settings.galleryUrl || !/^https?:\/\//.test(settings.galleryUrl)) {
		//     throw "Invalid or missing gallery URL.";
		// }
		// if (!settings.token || !/^[A-z0-9]{52}$/.test(settings.token)) {
		//     throw "Invalid or missing personal access token.";
		// }
	}

	protected getExtInfo(): Promise<CoreExtInfo> {
		if (!this.vsixInfoPromise) {
			this.vsixInfoPromise = GalleryBase.getExtInfo({
				extensionId: this.settings.extensionId,
				publisher: this.settings.publisher,
				vsixPath: this.settings.vsixPath,
			});
		}
		return this.vsixInfoPromise;
	}

	public static getExtInfo(info: { extensionId?: string; publisher?: string; vsixPath?: string }): Promise<CoreExtInfo> {
		let promise: Promise<CoreExtInfo>;
		if (info.extensionId && info.publisher) {
			promise = Promise.resolve<CoreExtInfo>({ id: info.extensionId, publisher: info.publisher, version: null });
		} else {
			promise = new Promise<zip>((resolve, reject) => {
				fs.readFile(info.vsixPath, async function(err, data) {
					if (err) reject(err);
					trace.debug("Read vsix as zip... Size (bytes): %s", data.length.toString());
					try {
						const archive = new zip();
						await archive.loadAsync(data);
						resolve(archive);
					} catch (err) {
						reject(err);
					}
				});
			})
				.then(zip => {
					trace.debug("Files in the zip: %s", Object.keys(zip.files).join(", "));
					const vsixManifestFileNames = Object.keys(zip.files).filter(key => _.endsWith(key, "vsixmanifest"));
					if (vsixManifestFileNames.length > 0) {
						return new Promise(async (resolve, reject) => {
							xml2js.parseString(await zip.files[vsixManifestFileNames[0]].async("text"), (err, result) => {
								if (err) {
									reject(err);
								} else {
									resolve(result);
								}
							});
						});
					} else {
						throw new Error("Could not locate vsix manifest!");
					}
				})
				.then(vsixManifestAsJson => {
					const extensionId: string =
						info.extensionId || _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
					const extensionPublisher: string =
						info.publisher || _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
					const extensionVersion: string = _.get(
						vsixManifestAsJson,
						"PackageManifest.Metadata[0].Identity[0].$.Version",
					);
					const isPublicExtension: boolean =
						_.get(vsixManifestAsJson, "PackageManifest.Metadata[0].GalleryFlags[0]", []).indexOf("Public") >= 0;
					if (extensionId && extensionPublisher) {
						return {
							id: extensionId,
							publisher: extensionPublisher,
							version: extensionVersion,
							isPublicExtension: isPublicExtension,
						};
					} else {
						throw new Error(
							"Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property, or specify the necessary --publisher and/or --extension options.",
						);
					}
				});
		}
		return promise;
	}

	public getValidationStatus(version?: string): Promise<string> {
		return this.getExtInfo().then(extInfo => {
			return this.galleryClient
				.getExtension(
					null,
					extInfo.publisher,
					extInfo.id,
					extInfo.version,
					GalleryInterfaces.ExtensionQueryFlags.IncludeVersions,
				)
				.then(ext => {
					return this.extToValidationStatus(ext, version);
				});
		});
	}

	public extToValidationStatus(extension: GalleryInterfaces.PublishedExtension, version?: string): string {
		if (!extension || extension.versions.length === 0) {
			throw new Error("Extension not published.");
		}
		let extVersion = extension.versions[0];
		if (version) {
			extVersion = this.getVersionedExtension(extension, version);
		}

		if (!extVersion) {
			throw new Error("Could not find extension version " + version);
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
	}

	private getVersionedExtension(
		extension: GalleryInterfaces.PublishedExtension,
		version: string,
	): GalleryInterfaces.ExtensionVersion {
		const matches = extension.versions.filter(ev => ev.version === version);
		if (matches.length > 0) {
			return matches[0];
		} else {
			return null;
		}
	}

	public getExtensionInfo(): Promise<GalleryInterfaces.PublishedExtension> {
		return this.getExtInfo().then<GalleryInterfaces.PublishedExtension>(extInfo => {
			return this.galleryClient
				.getExtension(
					null,
					extInfo.publisher,
					extInfo.id,
					null,
					GalleryInterfaces.ExtensionQueryFlags.IncludeVersions |
						GalleryInterfaces.ExtensionQueryFlags.IncludeFiles |
						GalleryInterfaces.ExtensionQueryFlags.IncludeCategoryAndTags |
						GalleryInterfaces.ExtensionQueryFlags.IncludeSharedAccounts,
				)
				.then(extension => {
					return extension;
				})
				.catch(errHandler.httpErr);
		});
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
	constructor(protected settings: PublishSettings, protected galleryClient: IGalleryApi) {
		super(settings, galleryClient);
	}

	/**
	 * Create a a publisher with the given name, displayName, and description
	 * @param string Publisher's unique name
	 * @param string Publisher's display name
	 * @param string Publisher description
	 * @return Q.Promise that is resolved when publisher is created
	 */
	public createPublisher(name: string, displayName: string, description: string): Promise<any> {
		return this.galleryClient
			.createPublisher(<GalleryInterfaces.Publisher>{
				publisherName: name,
				displayName: displayName,
				longDescription: description,
				shortDescription: description,
			})
			.catch(errHandler.httpErr);
	}

	/**
	 * Delete the publisher with the given name
	 * @param string Publisher's unique name
	 * @return Q.promise that is resolved when publisher is deleted
	 */
	public deletePublisher(name: string): Promise<any> {
		return this.galleryClient.deletePublisher(name).catch(errHandler.httpErr);
	}
}

export class SharingManager extends GalleryBase {

	public shareWith(accounts: string[]): Promise<any> {
		return this.getExtInfo().then(extInfo => {
			return Promise.all(
				accounts.map(account => {
					trace.info("Sharing extension with %s.", account);
					return this.galleryClient.shareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr);
				}),
			);
		});
	}

	public unshareWith(accounts: string[]): Promise<any> {
		return this.getExtInfo().then(extInfo => {
			return Promise.all(
				accounts.map(account => {
					return this.galleryClient.unshareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr);
				}),
			);
		});
	}

	public unshareWithAll(): Promise<any> {
		return this.getSharedWithAccounts().then(accounts => {
			return this.unshareWith(accounts);
		});
	}

	public getSharedWithAccounts() {
		return this.getExtensionInfo().then(ext => {
			return ext.sharedWith.map(acct => acct.name);
		});
	}
}

export class PackagePublisher extends GalleryBase {
	private static fastValidationInterval = 2000;
	private static fastValidationRetries = 120;
	private static fullValidationInterval = 15000;
	private static fullValidationRetries = 80;

	private checkVsixPublished(): Promise<CoreExtInfo> {
		return this.getExtInfo().then(extInfo => {
			return this.galleryClient
				.getExtension(null, extInfo.publisher, extInfo.id)
				.then(ext => {
					if (ext) {
						extInfo.published = true;
						return extInfo;
					}
					return extInfo;
				})
				.catch<CoreExtInfo>(() => extInfo);
		});
	}

	/**
	 * Publish the VSIX extension given by vsixPath
	 * @param string path to a VSIX extension to publish
	 * @return Q.Promise that is resolved when publish is complete
	 */
	public publish(): Promise<GalleryInterfaces.PublishedExtension> {
		const extPackage = fs.createReadStream(this.settings.vsixPath)
		trace.debug("Publishing %s", this.settings.vsixPath);

		// Check if the app is already published. If so, call the update endpoint. Otherwise, create.
		trace.info("Checking if this extension is already published");

		return this.getExtInfo().then(extInfo => {
			const quitValidation = this.settings.noWaitValidation
				? "You passed --no-wait-validation, so TFX is exiting."
				: "You can choose to exit (Ctrl-C) if you don't want to wait.";
			const noWaitHelp = this.settings.noWaitValidation
				? ""
				: "If you don't want TFX to wait for validation, use the --no-wait-validation parameter. ";
			const extensionValidationTime = extInfo.isPublicExtension
				? "Based on the package size, this can take up to 20 mins."
				: "This should take only a few seconds, but in some cases may take a bit longer.";
			const validationMessage = `\n== Extension Validation In Progress ==\n${extensionValidationTime} ${quitValidation} To get the validation status, you may run the command below. ${noWaitHelp}This extension will be available after validation is successful.\n\n${colors.yellow(
				`tfx extension isvalid --publisher ${extInfo.publisher} --extension-id ${extInfo.id} --version ${
					extInfo.version
				} --service-url ${this.settings.galleryUrl} --token <your PAT>`,
			)}`;
			return this.createOrUpdateExtension(extPackage).then(ext => {
				if (this.settings.noWaitValidation) {
					trace.info(validationMessage);
					return ext;
				} else {
					trace.info(validationMessage);
					const versions = ext.versions;
					versions.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

					const validationInterval = extInfo.isPublicExtension
						? PackagePublisher.fullValidationInterval
						: PackagePublisher.fastValidationInterval;
					const validationRetries = extInfo.isPublicExtension
						? PackagePublisher.fullValidationRetries
						: PackagePublisher.fastValidationRetries;
					const hangTightMessageRetryCount = extInfo.isPublicExtension ? -1 : 25;

					return this.waitForValidation(
						1000,
						validationInterval,
						validationRetries,
						hangTightMessageRetryCount,
						extInfo.publisher,
						extInfo.id,
						versions[0].version,
					).then(result => {
						if (result === PackagePublisher.validated) {
							return ext;
						} else {
							throw new Error(
								"Extension validation failed. Please address the following issues and retry publishing.\n" +
									result,
							);
						}
					});
				}
			});
		});
	}

	private createOrUpdateExtension(
		extPackage: fs.ReadStream,
	): Promise<GalleryInterfaces.PublishedExtension> {
		return this.checkVsixPublished().then(extInfo => {
			let publishPromise: Promise<GalleryInterfaces.PublishedExtension>;
			if (extInfo && extInfo.published) {
				trace.info("It is, %s the extension", colors.cyan("update").toString());
				publishPromise = this.galleryClient.updateExtension(null, extPackage, extInfo.publisher, extInfo.id).catch(errHandler.httpErr);
			} else {
				trace.info("It isn't, %s a new extension.", colors.cyan("create").toString());
				publishPromise = this.galleryClient.createExtension(null, extPackage).catch(errHandler.httpErr);
			}
			return publishPromise.then(() => {
				return this.galleryClient.getExtension(
					null,
					extInfo.publisher,
					extInfo.id,
					null,
					GalleryInterfaces.ExtensionQueryFlags.IncludeVersions,
				);
			});
		});
	}

	public waitForValidation(
		interval: number,
		maxInterval: number,
		retries: number,
		showPatienceMessageAt: number,
		publisher: string,
		extensionId: string,
		version?: string,
	): Promise<string> {
		if (retries === 0) {
			const validationTimedOutMessage = `Validation is taking much longer than usual. TFX is exiting. To get the validation status, you may run the command below. This extension will be available after validation is successful.\n\n${colors.yellow(
				`tfx extension isvalid --publisher ${publisher} --extension-id ${extensionId} --version ${version} --service-url ${
					this.settings.galleryUrl
				} --token <your PAT>`,
			)}`;
			throw new Error(validationTimedOutMessage);
		} else if (retries === showPatienceMessageAt) {
			trace.info("This is taking longer than usual. Hang tight...");
		}

		trace.debug("Polling for validation (%s retries remaining).", retries.toString());
		return delay(this.getValidationStatus(version), interval).then(status => {
			trace.debug("--Retrieved validation status: %s", status);
			if (status === PackagePublisher.validationPending) {
				// exponentially increase interval until we reach max interval
				return this.waitForValidation(
					Math.min(interval * 2, maxInterval),
					maxInterval,
					retries - 1,
					showPatienceMessageAt,
					publisher,
					extensionId,
					version,
				);
			} else {
				return status;
			}
		});
	}
}
