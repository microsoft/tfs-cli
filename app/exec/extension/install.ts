import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import colors = require("colors");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import trace = require("../../lib/trace");
import GalleryInterfaces = require("vso-node-api/interfaces/GalleryInterfaces");
import gallerym = require("vso-node-api/GalleryApi");
import emsm = require("vso-node-api/ExtensionManagementApi");
import EmsInterfaces = require("vso-node-api/interfaces/ExtensionManagementInterfaces");

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

// export class ExtensionInstallResult {
// 	constructor(
// 		public itemId: string,
// 		public accountReports: AccountInstallReport[]) {
// 	}

// 	public hasErrors(): boolean {
// 		return this.accountReports.some(t => !t.installed);
// 	}

// 	public toString() {
// 		let result: string;
// 		const status: string = this.hasErrors() ? "Failed" : "Succeeded";

// 		result = `=== Installation ${status} === ` +
// 			`\n  - ItemId: ${this.itemId}` +
// 			"\n  - Accounts:";

// 		this.accountReports.forEach(t => {
// 			result += `\n	- ${t.accountName}: [${t.installed ? "OK" : `Failed: ${t.reason}`}]`;
// 		});

// 		return result;
// 	}
// }

export interface ExtensionInstallResult {
    accounts: { [account: string]: { installed: boolean; issues: string } };
    extension: string;
}

export class ExtensionInstall extends extBase.ExtensionBase<ExtensionInstallResult> {
    protected description = "Install a Visual Studio Services Extension to a list of VSTS Accounts.";
    protected serverCommand = true;

    constructor(passedArgs: string[]) {
        super(passedArgs);
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();
        this.registerCommandArgument(
            "accounts",
            "Installation target accounts",
            "List of accounts where to install the extension.",
            args.ArrayArgument,
        );
    }

    protected getHelpArgs(): string[] {
        return ["publisher", "extensionId", "vsix", "accounts"];
    }

    public exec(): Promise<ExtensionInstallResult> {
        // Read extension info from arguments
        const result: ExtensionInstallResult = { accounts: {}, extension: null };
        return this._getExtensionInfo().then(extInfo => {
            const itemId = `${extInfo.publisher}.${extInfo.id}`;
            const galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);

            result.extension = itemId;

            // Read accounts from arguments and resolve them to get its accountIds
            return this.commandArgs.accounts
                .val()
                .then(accounts => {
                    // Install extension in each account
                    const installations = [...accounts].map((account): Promise<[string, EmsInterfaces.InstalledExtension]> => {
                        const emsApi = this.webApi.getExtensionManagementApi(
                            this.getEmsAccountUrl(this.webApi.serverUrl, account),
                        );
                        return emsApi
                            .installExtensionByName(extInfo.publisher, extInfo.id)
                            .then(installation => [account, installation] as [string, EmsInterfaces.InstalledExtension]);
                    });
                    return Promise.all(installations);
                })
                .then(installations => {
                    installations.forEach(installation => {
                        const account: string = installation[0];
                        const installedExtension: EmsInterfaces.InstalledExtension = installation[1];
                        const installationResult = { installed: true, issues: null };
                        if (
                            installedExtension.installState.installationIssues &&
                            installedExtension.installState.installationIssues.length > 0
                        ) {
                            installationResult.installed = false;
                            installationResult.issues = `The following issues were encountered installing to ${account}: 
${installedExtension.installState.installationIssues.map(i => " - " + i).join("\n")}`;
                        }
                        result.accounts[account] = installationResult;
                    });
                    return result;
                });
        });
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

    private _getExtensionInfo(): Promise<extInfo.CoreExtInfo> {
        return this.commandArgs.vsix.val(true).then(vsixPath => {
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
        });
    }
}
