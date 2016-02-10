import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import colors = require("colors");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import Q = require('q');
import trace = require('../../lib/trace');

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, string[]> {
	return new ExtensionShare(args);
}

export class ExtensionShare extends extBase.ExtensionBase<string[]> {
	protected description = "Share a Visual Studio Services Extension with VSTS Accounts.";
	constructor(passedArgs: string[]) {
		super(passedArgs);
		this.registerCommandArgument("shareWith", "Share with", "List of accounts with which to share the extension.", args.ArrayArgument);
	}

	protected getHelpArgs(): string[] {
		return ["publisher", "extensionId", "vsix", "shareWith"];
	}

	public exec(): Q.Promise<string[]> {
		let galleryApi = this.webApi.getQGalleryApi(this.webApi.serverUrl);

		return this.commandArgs.vsix.val(true).then((vsixPath) => {
			let extInfoPromise: Q.Promise<extInfo.CoreExtInfo>;
			if (vsixPath !== null) {
				extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
			} else {
				extInfoPromise = Q.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).spread<extInfo.CoreExtInfo>((publisher, extension) => {
					return extInfo.getExtInfo(null, extension, publisher);
				});
			}
			return extInfoPromise.then((extInfo) => {
				return this.commandArgs.shareWith.val().then((shareWith) => {
					let sharePromises: Q.Promise<void>[] = [];
					shareWith.forEach((account) => {
						sharePromises.push(galleryApi.shareExtension(extInfo.publisher, extInfo.id, account));
					});
					return Q.all(sharePromises).then(() => { return shareWith; });
				});
			});
		});
	}

	protected friendlyOutput(data: string[]): void {
		trace.success("\n=== Completed operation: share extension ===");
		trace.info(" - Shared with:");
		data.forEach((acct) => {
			trace.info("   - " + acct);
		});
	}
}