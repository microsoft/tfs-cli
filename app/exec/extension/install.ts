import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import Q = require("q");
import trace = require("../../lib/trace");
import GalleryInterfaces = require("vso-node-api/interfaces/GalleryInterfaces");
import gallerym = require("vso-node-api/GalleryApi");

const SPS_INSTANCE_TYPE = "951917AC-A960-4999-8464-E3F0AA25B381";

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, ExtensionInstallResult> {
	return new ExtensionInstall(args);
}

interface TargetAccount {
	accountName: string;
	accountId: string;
}

export class AccountInstallReport {
	constructor(
		public itemId: string,
		public accountName: string,
		public accountId: string,
		public installed: boolean = false,
		public reason?: string) {
	}

	public setError(reason: string) {
		this.installed = false;
		this.reason = reason;
	}

	public setInstalled(reason?: string) {
		this.installed = true;
		this.reason = reason;
	}
}

export class ExtensionInstallResult {
	constructor(
		public itemId: string,
		public accountReports: AccountInstallReport[]) {
	}

	public hasErrors(): boolean {
		return this.accountReports.some(t => !t.installed);
	}

	public toString() {
		let result: string;
		const status: string = this.hasErrors() ? "Failed" : "Succeeded";

		result = `=== Installation ${status} === ` +
			`\n  - ItemId: ${this.itemId}` +
			"\n  - Accounts:";

		this.accountReports.forEach(t => {
			result += `\n	- ${t.accountName}: [${t.installed ? "OK" : `Failed: ${t.reason}`}]`;
		});

		return result;
	}
}

export class ExtensionInstall extends extBase.ExtensionBase<ExtensionInstallResult> {
	protected description = "Install a Visual Studio Services Extension to a list of VSTS Accounts.";

	constructor(passedArgs: string[]) {
		super(passedArgs);
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument("accounts", "Installation target accounts", "List of accounts where to install the extension.", args.ArrayArgument);
	}

	protected getHelpArgs(): string[] {
		return ["publisher", "extensionId", "vsix", "accounts"];
	}

	public exec(): Q.Promise<ExtensionInstallResult> {
		// Read extension info from arguments
		return this._getExtensionInfo()
			.then(extInfo => {
				const itemId = `${extInfo.publisher}.${extInfo.id}`;
				const galleryApi = this.webApi.getQGalleryApi(this.webApi.serverUrl);

				// Read accounts from arguments and resolve them to get its accountIds
				return this.commandArgs.accounts.val()
					.then((accounts) => {
						return this._resolveInstallationAccounts(galleryApi, accounts);
					})
					.then(accounts => {
						// Install extension in each account
						const installations = [...accounts].map(account => this._installExtension(galleryApi, itemId, account.accountId, account.accountName));
						return Q.all(installations);
					})
					.then(targetReports => {
						// Process installation results. We reject if exists at least one that was not installed successfully
						const result = new ExtensionInstallResult(itemId, targetReports);
						if (result.hasErrors()) {
							return Q.reject<ExtensionInstallResult>(result);
						}

						// All succeeded. Return resolved.
						return result;
					});
			});
	}

	protected friendlyOutput(data: ExtensionInstallResult): void {
		trace.success("\n=== Completed operation: install extension ===");
		trace.info(` - Installed extension ${data.itemId} in:`);

		if (data.accountReports && data.accountReports.length > 0) {
			data.accountReports.forEach((report) => {
				trace.info("   - " + report.accountName);
			});
		} else {
			trace.info("No accounts specified");
		}

	}

	private _getExtensionInfo(): Q.Promise<extInfo.CoreExtInfo> {
		return this.commandArgs.vsix.val(true).then((vsixPath) => {
			let extInfoPromise: Q.Promise<extInfo.CoreExtInfo>;
			if (vsixPath !== null) {
				extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
			} else {
				extInfoPromise = Q.all([
					this.commandArgs.publisher.val(),
					this.commandArgs.extensionId.val()]
				).spread<extInfo.CoreExtInfo>((publisher, extension) => {
					return extInfo.getExtInfo(null, extension, publisher);
				});
			}

			return extInfoPromise;
		});
	}

	private _resolveInstallationAccounts(galleryApi: gallerym.IQGalleryApi, accounts: string[]): Q.Promise<TargetAccount[]> {
		if (!accounts || accounts.length === 0) {
			return Q.resolve([]);
		}

		const result: Q.Deferred<TargetAccount[]> = Q.defer<TargetAccount[]>();

		// Use connectionData service to determine userId
		trace.debug("Connecting to service to get user");
		galleryApi.connect()
			.then((data: any) => {
				if (!data || !data.authenticatedUser || !data.authenticatedUser.id) {
					throw new Error("Cannot determine authenticated user in order to resolve accounts for which is an owner or a member of.");
				}

				trace.debug("Installation User Id:" + data.authenticatedUser.id);
				return this._getAccountsByMemberId(data.authenticatedUser.id);
			})
			.then((userAccounts: Account[]) => {

				const getAccountId = (accountName: string): string => {
					const resolvedAccount = userAccounts.filter(a => a.accountName.toLowerCase() === accountName.toLowerCase());
					return resolvedAccount && resolvedAccount.length > 0 ? resolvedAccount[0].accountId : undefined;
				};

				return result.resolve(accounts.map(accountName => { return <TargetAccount>{ accountId: getAccountId(accountName), accountName: accountName }; }));
			})
			.fail(err => {
				result.reject(err);
			});

		return result.promise;
	}

	private _installExtension(galleryApi: gallerym.IQGalleryApi, itemId: string, accountId: string, accountName: string): Q.Promise<AccountInstallReport> {
		const accountReport: AccountInstallReport = new AccountInstallReport(itemId, accountName, accountId);

		if (!accountId) {
			accountReport.setError(`Cannot install extension into account ${accountName} because is not an acccount for which the installation user is owner or a member of.`);
			return Q.resolve(accountReport);
		}

		return galleryApi.requestAcquisition(<GalleryInterfaces.ExtensionAcquisitionRequest>{
			assignmentType: GalleryInterfaces.AcquisitionAssignmentType.None,
			billingId: null,
			itemId: itemId,
			operationType: GalleryInterfaces.AcquisitionOperationType.Install,
			targets: [accountId]
		})
			.then(report => {
				trace.debug(`Succeeded GalleryApi.requestAcquisition in ${accountName}: ${report}`);
				accountReport.installed = true;
				return accountReport;
			})
			.fail((err) => {
				// Ignore error 'AlreadyInstalled'
				if (this._isAlreadyInstalledError(err)) {
					trace.debug(`Succeeded GalleryApi.requestAcquisition in ${accountName}: Already installed`);
					accountReport.setInstalled("Extension already installed");
					return accountReport;
				}

				trace.error(`Failed GalleryApi.requestAcquisition for account ${accountName}: ${err}`);
				accountReport.setError(err);
				return accountReport;
			});
	}

	private _isAlreadyInstalledError(err): boolean {
		// 409 - Conflict: means extension already installed
		return err.statusCode === 409;
	}

	private _getAccountsByMemberId(userId: string): Q.Promise<Account[]> {
		trace.debug("Getting Accounts to user:" + userId);
		return this._getAccountsServiceBaseUrl()
			.then(accountsBaseUrl => {
				const accountsApi = new AccountsApi(accountsBaseUrl, [this.webApi.authHandler]);
				return accountsApi.getAccounts(undefined, undefined, userId);
			});
	}

	/**
	 * Determine the Accounts URL based by using the Location Service.
	 *
	 * @param  {string} serviceUrl
	 * @returns string
	 */
	private _getAccountsServiceBaseUrl(): Q.Promise<string> {
		trace.debug("Resolving SPS URL");
		const locationsApi = new LocationsApi(this.webApi.serverUrl, [this.webApi.authHandler]);
		return locationsApi.getServiceDefinition("LocationService2", SPS_INSTANCE_TYPE)
			.then(serviceDefinition => {
				const publicMapping = serviceDefinition.locationMappings.filter(l => l.accessMappingMoniker === "PublicAccessMapping");
				if (!publicMapping || publicMapping.length === 0) {
					throw new Error("Cannot determine base URL for Accounts service.");
				}
				trace.debug("SPS URL resolved: " + publicMapping[0].location);
				return publicMapping[0].location;
			});
	}
}

/**
 * ------------------------------------------
 * VSTS APIs NOT PROVIDED YET BY VSO-NODE-API
 *-------------------------------------------
 *
 */

import VsoBaseInterfaces = require("vso-node-api/interfaces/common/VsoBaseInterfaces");
import { ClientApiBase } from  "vso-node-api/ClientApiBases";

/**
 * --------------
 *  ACCOUNTS API (TODO: REMOVE IT AS SOON AS IT IS INCLUDED IN VSO-NODE-API)
 * --------------
 */

enum AccountStatus {
	None = 0,
	/**
	 * This hosting account is active and assigned to a customer.
	 */
	Enabled = 1,
	/**
	 * This hosting account is disabled.
	 */
	Disabled = 2,
	/**
	 * This account is part of deletion batch and scheduled for deletion.
	 */
	Deleted = 3,
}

enum AccountType {
	Personal = 0,
	Organization = 1,
}

interface Account {
	/**
	 * Identifier for an Account
	 */
	accountId: string;
	/**
	 * Name for an account
	 */
	accountName: string;
	/**
	 * Owner of account
	 */
	accountOwner: string;
	/**
	 * Current account status
	 */
	accountStatus: AccountStatus;
	/**
	 * Type of account: Personal, Organization
	 */
	accountType: AccountType;
	/**
	 * Uri for an account
	 */
	accountUri: string;
	/**
	 * Who created the account
	 */
	createdBy: string;
	/**
	 * Date account was created
	 */
	createdDate: Date;
	/**
	 * Identity of last person to update the account
	 */
	lastUpdatedBy: string;
	/**
	 * Date account was last updated
	 */
	lastUpdatedDate: Date;
	/**
	 * Namespace for an account
	 */
	namespaceId: string;
	/**
	 * Organization that created the account
	 */
	organizationName: string;
	/**
	 * Extended properties
	 */
	properties: any;
	/**
	 * Reason for current status
	 */
	statusReason: string;
}

class AccountsApi extends ClientApiBase {
	constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]) {
		super(baseUrl, handlers, "tfx-cli");
	}

	public getAccounts(
		creatorId?: string,
		ownerId?: string,
		memberId?: string,
		includeOwner?: boolean,
		properties?: string,
		includeDisabledAccounts?: boolean): Q.Promise<Account[]> {
		const deferred = Q.defer<Account[]>();

		const onResult = (err: any, statusCode: number, accounts: Account[]) => {
			if (err) {
				err.statusCode = statusCode;
				deferred.reject(err);
			}
			else {
				deferred.resolve(accounts);
			}
		};

		const queryValues: any = {
			creatorId: creatorId,
			ownerId: ownerId,
			memberId: memberId,
			includeOwner: includeOwner,
			properties: properties,
			includeDisabledAccounts: includeDisabledAccounts,
		};

		this.vsoClient.getVersioningData("2.0", "account", "229a6a53-b428-4ffb-a835-e8f36b5b4b1e", null, queryValues)
			.then(versioningData => {
				const url: string = versioningData.requestUrl;
				const apiVersion: string = versioningData.apiVersion;
				const serializationData = { responseIsCollection: true };

				this.restClient.getJson(url, apiVersion, null, serializationData, onResult);
			})
			.fail(error => {
				onResult(error, error.statusCode, null);
			});

		return deferred.promise;
	}
}

/**
 * ---------------
 *  LOCATIONS API (TODO: REMOVE IT AS SOON AS IT IS INCLUDED IN VSO-NODE-API)
 * ---------------
 */

enum InheritLevel {
	None = 0,
	Deployment = 1,
	Account = 2,
	Collection = 4,
	All = 7,
}

enum RelativeToSetting {
	Context = 0,
	WebApplication = 2,
	FullyQualified = 3,
}

enum ServiceStatus {
	Assigned = 0,
	Active = 1,
	Moving = 2,
}

interface LocationMapping {
	accessMappingMoniker: string;
	location: string;
}

interface ServiceDefinition {
	description: string;
	displayName: string;
	identifier: string;
	inheritLevel: InheritLevel;
	locationMappings: LocationMapping[];
	/**
	 * Maximum api version that this resource supports (current server version for this resource). Copied from ApiResourceLocation.
	 */
	maxVersion: string;
	/**
	 * Minimum api version that this resource supports. Copied from ApiResourceLocation.
	 */
	minVersion: string;
	parentIdentifier: string;
	parentServiceType: string;
	properties: any;
	relativePath: string;
	relativeToSetting: RelativeToSetting;
	/**
	 * The latest version of this resource location that is in "Release" (non-preview) mode. Copied from ApiResourceLocation.
	 */
	releasedVersion: string;
	/**
	 * The current resource version supported by this resource location. Copied from ApiResourceLocation.
	 */
	resourceVersion: number;
	serviceType: string;
	status: ServiceStatus;
}

class LocationsApi extends ClientApiBase {
	constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]) {
		super(baseUrl, handlers, "tfx-cli");
	}

	public getServiceDefinition(serviceType: string, identifier: string): Q.Promise<ServiceDefinition> {
		const deferred = Q.defer<ServiceDefinition>();

		const onResult = (err: any, statusCode: number, serviceDefinition: ServiceDefinition) => {
			if (err) {
				err.statusCode = statusCode;
				deferred.reject(err);
			}
			else {
				deferred.resolve(serviceDefinition);
			}
		};

		const routeValues = {
			serviceType: serviceType,
			identifier: identifier
		};

		this.vsoClient.getVersioningData("3.0-preview.1", "location", "d810a47d-f4f4-4a62-a03f-fa1860585c4c", routeValues)
			.then(versioningData => {
				const url: string = versioningData.requestUrl;
				const apiVersion: string = versioningData.apiVersion;
				const serializationData = { responseIsCollection: false };

				this.restClient.getJson(url, apiVersion, null, serializationData, onResult);
			})
			.fail(error => {
				onResult(error, error.statusCode, null);
			});

		return deferred.promise;
	}
}