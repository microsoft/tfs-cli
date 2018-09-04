import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, string[]> {
	// this just offers description for help and to offer sub commands
	return new ExtensionShare(args);
}

export class ExtensionShare extends extBase.ExtensionBase<string[]> {
	protected description = "Unshare a Visual Studio Services Extension with VSTS Accounts.";
	protected serverCommand = true;

	constructor(passedArgs: string[]) {
		super(passedArgs);

		// Override this argument so we are prompted (e.g. no default provided)
		this.registerCommandArgument(
			"unshareWith",
			"Un-share with",
			"List of accounts with which to un-share the extension",
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
		return ["publisher", "extensionId", "vsix", "unshareWith"];
	}

	public exec(): Promise<string[]> {
		let galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);

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
				return this.commandArgs.unshareWith.val().then(unshareWith => {
					let sharePromises: Promise<void>[] = [];
					unshareWith.forEach(account => {
						sharePromises.push(galleryApi.unshareExtension(extInfo.publisher, extInfo.id, account));
					});
					return Promise.all(sharePromises).then(() => {
						return unshareWith;
					});
				});
			});
		});
	}

	protected friendlyOutput(data: string[]): void {
		trace.success("\n=== Completed operation: un-share extension ===");
		trace.info(" - Removed sharing from:");
		data.forEach(acct => {
			trace.info("   - " + acct);
		});
	}
}
