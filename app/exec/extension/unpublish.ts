import args = require("../../lib/arguments");
import extBase = require("./default");
import galleryContracts = require("azure-devops-node-api/interfaces/GalleryInterfaces");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): extBase.ExtensionBase<galleryContracts.PublishedExtension> {
	return new ExtensionUnpublish(args);
}

export class ExtensionUnpublish extends extBase.ExtensionBase<galleryContracts.PublishedExtension> {
	protected description = "Unpublish (delete) an extension from the Marketplace.";
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

	public async exec(): Promise<boolean> {
		const galleryApi = await this.getGalleryApi();

		const extInfo = await this.identifyExtension();
		await galleryApi.deleteExtension(extInfo.publisher, extInfo.id);
		
		return true;
	}

	protected friendlyOutput(): void {
		trace.success("\n=== Completed operation: unpublish extension ===");
	}
}
