import args = require("../../lib/arguments");
import extBase = require("./default");
import galleryContracts = require("vso-node-api/interfaces/GalleryInterfaces");
import publishUtils = require("./_lib/publish");

export function getCommand(args: string[]): extBase.ExtensionBase<galleryContracts.PublishedExtension> {
	return new ExtensionShow(args);
}

export class ExtensionShow extends extBase.ExtensionBase<galleryContracts.PublishedExtension> {
	protected description = "Show info about a published Azure DevOps Services Extension.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["publisher", "extensionId", "vsix"];
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument(
			"serviceUrl",
			"Market URL",
			"URL to the VSS Marketplace.",
			args.StringArgument,
			extBase.ExtensionBase.getMarketplaceUrl,
		);
	}

	public exec(): Promise<galleryContracts.PublishedExtension> {
		let galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);

		return this.identifyExtension().then(extInfo => {
			let sharingMgr = new publishUtils.SharingManager({}, galleryApi, extInfo);
			return sharingMgr.getExtensionInfo();
		});
	}
}
