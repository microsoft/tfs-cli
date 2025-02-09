import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import colors = require("colors");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import trace = require("../../lib/trace");

import { SharingManager } from "./_lib/publish";

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, string[]> {
	return new ExtensionShare(args);
}

export class ExtensionShare extends extBase.ExtensionBase<string[]> {
	protected description = "Share an Azure DevOps Extension with Azure DevOps Organizations.";
	protected serverCommand = true;

	constructor(passedArgs: string[]) {
		super(passedArgs);
		this.registerCommandArgument(
			"shareWith",
			"Share with",
			"List of organizations with which to share the extension.",
			args.ArrayArgument,
		);
		this.registerCommandArgument(
			"serviceUrl",
			"Market URL",
			"URL to the VSS Marketplace.",
			args.StringArgument,
			extBase.ExtensionBase.getMarketplaceUrl,
		);
	}

	protected getHelpArgs(): string[] {
		return ["publisher", "extensionId", "vsix", "shareWith"];
	}

	public async exec(): Promise<string[]> {
		const galleryApi = await this.getGalleryApi();

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
			return extInfoPromise.then(extInfo => {
				return this.commandArgs.shareWith.val().then(accounts => {
					const sharingMgr = new SharingManager({}, galleryApi, extInfo);
					return sharingMgr.shareWith(accounts).then(() => accounts);
				});
			});
		});
	}

	protected friendlyOutput(data: string[]): void {
		trace.success("\n=== Completed operation: share extension ===");
		trace.info(" - Shared with:");
		data.forEach(acct => {
			trace.info("   - " + acct);
		});
	}
}
