import { CreationResult, createExtension } from "./create";
import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import colors = require("colors");
import extBase = require("./default");
import publishUtils = require("./_lib/publish");
import trace = require("../../lib/trace");
import { GalleryApi } from "azure-devops-node-api/GalleryApi";

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, ExtensionPublishResult> {
	return new ExtensionPublish(args);
}

export interface ExtensionCreateArguments {
	outputpath: string;
	root?: string;
	locRoot?: string;
	manifestglob?: string[];
	settings?: string;
	override?: any;
	publisher?: string;
	extensionid?: string;
	bypassvalidation?: boolean;
}

export interface ExtensionPublishArguments {}

export interface ExtensionPublishResult {
	packaged: string;
	published: boolean;
	shared: string[];
}

export class ExtensionPublish extends extBase.ExtensionBase<ExtensionPublishResult> {
	protected description = "Publish a Visual Studio Marketplace Extension.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return [
			"root",
			"manifestJs",
			"env",
			"manifests",
			"manifestGlobs",
			"json5",
			"override",
			"overridesFile",
			"bypassValidation",
			"publisher",
			"extensionId",
			"outputPath",
			"locRoot",
			"vsix",
			"shareWith",
			"noWaitValidation",
			"metadataOnly",
		];
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

	public async exec(): Promise<ExtensionPublishResult> {
		const galleryApi = await this.webApi.getGalleryApi(this.webApi.serverUrl)
		let result = <ExtensionPublishResult>{};

		const publishSettings = await this.getPublishSettings();

		let extensionCreatePromise: Promise<string>;
		if (publishSettings.vsixPath) {
			result.packaged = null;
		} else {
			// Run two async operations in parallel and destructure the result.
			const [mergeSettings, packageSettings] = await Promise.all([this.getMergeSettings(), this.getPackageSettings()]);
			const createdExtension = await createExtension(mergeSettings, packageSettings);
			result.packaged = createdExtension.path;
			publishSettings.vsixPath = createdExtension.path;
		}
		const packagePublisher = new publishUtils.PackagePublisher(publishSettings, galleryApi);
		const publishedExtension = await packagePublisher.publish();
		result.published = true;
		if (publishSettings.shareWith && publishSettings.shareWith.length >= 0) {
			const sharingMgr = new publishUtils.SharingManager(publishSettings, galleryApi);
			await sharingMgr.shareWith(publishSettings.shareWith);
			result.shared = publishSettings.shareWith;
		} else {
			result.shared = null;
		}
		return result;
	}

	protected friendlyOutput(data: ExtensionPublishResult): void {
		trace.info(colors.green("\n=== Completed operation: publish extension ==="));
		let packagingStr = data.packaged ? colors.green(data.packaged) : colors.yellow("not packaged (existing package used)");
		let publishingStr = data.published ? colors.green("success") : colors.yellow("???");
		let sharingStr = data.shared
			? "shared with " + data.shared.map(s => colors.green(s)).join(", ")
			: colors.yellow("not shared (use --share-with to share)");
		trace.info(" - Packaging: %s", packagingStr);
		trace.info(" - Publishing: %s", publishingStr);
		trace.info(" - Sharing: %s", sharingStr);
	}
}
