import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import colors = require("colors");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import trace = require("../../lib/trace");
import GalleryInterfaces = require("azure-devops-node-api/interfaces/GalleryInterfaces");
import gallerym = require("azure-devops-node-api/GalleryApi");
import emsm = require("azure-devops-node-api/ExtensionManagementApi");
import EmsInterfaces = require("azure-devops-node-api/interfaces/ExtensionManagementInterfaces");
import https = require("https");

import { realPromise } from "../../lib/promiseUtils";

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
		public reason?: string,
	) {}

	public setError(reason: string) {
		this.installed = false;
		this.reason = reason;
	}

	public setInstalled(reason?: string) {
		this.installed = true;
		this.reason = reason;
	}
}

export interface ExtensionInstallResult {
	accounts: { [account: string]: { installed: boolean; issues: string } };
	extension: string;
}

export class ExtensionInstall extends extBase.ExtensionBase<ExtensionInstallResult> {
	protected description = "Install a Azure DevOps Extension to a list of Azure DevOps Organizations.";
	protected serverCommand = true;

	constructor(passedArgs: string[]) {
		super(passedArgs);
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument(
			"accounts",
			"Installation target organizations",
			"List of organizations where to install the extension.",
			args.ArrayArgument,
			null,
			true,
		);
		this.registerCommandArgument(
			"serviceUrl",
			"Collection/Organization URL",
			"URL of the organization or collection to install extension to.",
			args.StringArgument,
			undefined,
		);
	}

	protected getHelpArgs(): string[] {
		return ["publisher", "extensionId", "vsix", "accounts"];
	}

	public async exec(): Promise<ExtensionInstallResult> {
		// Check that they're not trying to use a previous version of this command
		const accounts = await this.commandArgs.accounts.val(true);
		if (accounts) {
			throw new Error(
				"Installing extensions to multiple organizations no longer supported. Please use the following syntax to install an extension to an account/collection:\ntfx extension install --service-url <account/collection url> --token <pat> --publisher <publisher> --extension-id <extension id>",
			);
		}

		// Read extension info from arguments
		const result: ExtensionInstallResult = { accounts: {}, extension: null };
		const extensionInfo = await this._getExtensionInfo();

		const extInfo = await this._getExtensionInfo();
		const itemId = `${extInfo.publisher}.${extInfo.id}`;

		result.extension = itemId;

		// New flow - service-url contains account. Install to 1 account at a time.
		const serviceUrl = await ExtensionInstall.getEmsAccountUrl(await this.commandArgs.serviceUrl.val());
		const emsApi = await this.webApi.getExtensionManagementApi(serviceUrl);

		try {
			const installation = await emsApi.installExtensionByName(extInfo.publisher, extInfo.id);
			const installationResult = { installed: true, issues: null };
			if (installation.installState.installationIssues && installation.installState.installationIssues.length > 0) {
				installationResult.installed = false;
				installationResult.issues = `The following issues were encountered installing to ${serviceUrl}: 
${installation.installState.installationIssues.map(i => " - " + i).join("\n")}`;
			}
			result.accounts[serviceUrl] = installationResult;
		} catch (err) {
			if (err.message.indexOf("TF400856") >= 0) {
				throw new Error(
					"Failed to install extension (TF400856). Ensure service-url includes a collection name, e.g. " +
						serviceUrl.replace(/\/$/, "") +
						"/DefaultCollection",
				);
			} else {
				throw err;
			}
		}

		return result;
	}

	private getEmsAccountUrl(marketplaceUrl: string, accountName: string) {
		if (marketplaceUrl.toLocaleLowerCase().indexOf("marketplace.visualstudio.com") >= 0) {
			return `https://${accountName}.extmgmt.visualstudio.com`;
		}
		if (marketplaceUrl.toLocaleLowerCase().indexOf("me.tfsallin.net") >= 0) {
			return marketplaceUrl.toLocaleLowerCase().indexOf("https://") === 0
				? `https://${accountName}.me.tfsallin.net:8781`
				: `http://${accountName}.me.tfsallin.net:8780`;
		}
		return marketplaceUrl;
	}

	protected friendlyOutput(data: ExtensionInstallResult): void {
		trace.success("\n=== Completed operation: install extension ===");
		Object.keys(data.accounts).forEach(a => {
			trace.info(`- ${a}: ${data.accounts[a].installed ? colors.green("success") : colors.red(data.accounts[a].issues)}`);
		});
	}

	private async _getExtensionInfo(): Promise<extInfo.CoreExtInfo> {
		const vsixPath = await this.commandArgs.vsix.val(true);
		let extInfoPromise: Promise<extInfo.CoreExtInfo>;
		if (vsixPath !== null) {
			extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
		} else {
			extInfoPromise = Promise.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).then<
				extInfo.CoreExtInfo
			>(values => {
				const [publisher, extension] = values;
				return extInfo.getExtInfo(null, extension, publisher);
			});
		}

		return extInfoPromise;
	}

	private static async getEmsAccountUrl(tfsAccountUrl: string): Promise<string> {
		const acctUrlNoSlash = tfsAccountUrl.endsWith("/") ? tfsAccountUrl.substr(0, tfsAccountUrl.length - 1) : tfsAccountUrl;
		const url = `${acctUrlNoSlash}/_apis/resourceareas/6c2b0933-3600-42ae-bf8b-93d4f7e83594`;
		const response = await new Promise<string>((resolve, reject) => {
			https
				.get(url, resp => {
					let data = "";
					resp.on("data", chunk => {
						data += chunk;
					});
					resp.on("end", () => {
						resolve(data);
					});
				})
				.on("error", err => {
					reject(err);
				});
		});
		const resourceArea = JSON.parse(response);
		return resourceArea.locationUrl;
	}
}
