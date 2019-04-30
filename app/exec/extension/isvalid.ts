import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import colors = require("colors");
import extBase = require("./default");
import extInfo = require("./_lib/extensioninfo");
import galleryContracts = require("azure-devops-node-api/interfaces/GalleryInterfaces");
import publishUtils = require("./_lib/publish");
import trace = require("../../lib/trace");

export function getCommand(args: string[]): extBase.ExtensionBase<galleryContracts.PublishedExtension> {
	return new ExtensionIsValid(args);
}

export class ExtensionIsValid extends extBase.ExtensionBase<galleryContracts.PublishedExtension> {
	protected description = "Show the validation status of a given extension.";
	protected serverCommand = true;

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument(
			"version",
			"Extension version",
			"Specify the version of the extension of which to get the validation status. Defaults to the latest version.",
			args.StringArgument,
			null,
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
		return ["publisher", "extensionId", "vsix", "version"];
	}

	public async exec(): Promise<string> {
		const galleryApi = await this.webApi.getGalleryApi(this.webApi.serverUrl);

		const extInfo = await this.identifyExtension();
		const version = await this.commandArgs.version.val();
		const sharingMgr = new publishUtils.SharingManager({}, galleryApi, extInfo);
		const validationStatus = await sharingMgr.getValidationStatus(version);
		return validationStatus;
	}

	protected friendlyOutput(data: string): void {
		if (data === publishUtils.GalleryBase.validated) {
			trace.info(colors.green("Valid"));
		} else if (data === publishUtils.GalleryBase.validationPending) {
			trace.info(colors.yellow("Validation pending..."));
		} else {
			trace.info(colors.red("Validation error: " + data));
		}
	}

	protected jsonOutput(data: string): void {
		const result = <{ status: string; message?: string }>{
			status: "error",
		};
		if (data === publishUtils.GalleryBase.validationPending) {
			result.status = "pending";
		} else if (data === publishUtils.GalleryBase.validated) {
			result.status = "success";
		} else {
			result.message = data;
		}
		console.log(JSON.stringify(result, null, 4));
	}
}
