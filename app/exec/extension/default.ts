import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import { MergeSettings, PackageSettings, PublishSettings } from "./_lib/interfaces";
import { WebApi, getBasicHandler } from "vso-node-api/WebApi";
import { BasicCredentialHandler } from "vso-node-api/handlers/basiccreds";
import { GalleryBase, CoreExtInfo, PublisherManager, PackagePublisher } from "./_lib/publish";
import * as path from "path";
import _ = require("lodash");
import args = require("../../lib/arguments");
import https = require("https");
import trace = require("../../lib/trace");

import { readFile } from "fs";
import { promisify } from "util";

export function getCommand(args: string[]): TfCommand<ExtensionArguments, void> {
	return new ExtensionBase<void>(args);
}

export class ManifestJsonArgument extends args.JsonArgument<any> {}

export interface ExtensionArguments extends CoreArguments {
	extensionId: args.StringArgument;
	publisher: args.StringArgument;
	manifests: args.ArrayArgument;
	manifestGlobs: args.ArrayArgument;
	outputPath: args.StringArgument;
	override: ManifestJsonArgument;
	overridesFile: args.ReadableFilePathsArgument;
	shareWith: args.ArrayArgument;
	unshareWith: args.ArrayArgument;
	vsix: args.ReadableFilePathsArgument;
	bypassValidation: args.BooleanArgument;
	locRoot: args.ExistingDirectoriesArgument;
	displayName: args.StringArgument;
	description: args.StringArgument;
	accounts: args.ArrayArgument;
	revVersion: args.BooleanArgument;
	noWaitValidation: args.BooleanArgument;
	version: args.StringArgument;
	noArchive: args.BooleanArgument;
	metadataOnly: args.BooleanArgument;
}

export class ExtensionBase<T> extends TfCommand<ExtensionArguments, T> {
	protected description = "Commands to package, publish, and manage Extensions for Azure DevOps Services.";
	protected serverCommand = false;

	constructor(passedArgs: string[]) {
		super(passedArgs);
	}

	protected getHelpArgs(): string[] {
		return [];
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument(
			"extensionId",
			"Extension ID",
			"Use this as the extension ID instead of what is specified in the manifest.",
			args.StringArgument,
		);
		this.registerCommandArgument(
			"publisher",
			"Publisher name",
			"Use this as the publisher ID instead of what is specified in the manifest.",
			args.StringArgument,
		);
		this.registerCommandArgument(
			"manifests",
			"Manifests",
			"List of individual manifest files (space separated).",
			args.ArrayArgument,
			"vss-extension.json",
		);
		this.registerCommandArgument(
			"manifestGlobs",
			"Manifest globs",
			"List of globs to find manifests (space separated).",
			args.ArrayArgument,
			null,
		);
		this.registerCommandArgument("outputPath", "Output path", "Path to write the VSIX.", args.StringArgument, "{auto}");
		this.registerCommandArgument(
			"override",
			"Overrides JSON",
			"JSON string which is merged into the manifests, overriding any values.",
			ManifestJsonArgument,
			"{}",
		);
		this.registerCommandArgument(
			"overridesFile",
			"Overrides JSON file",
			"Path to a JSON file with overrides. This partial manifest will always take precedence over any values in the manifests.",
			args.ReadableFilePathsArgument,
			null,
		);
		this.registerCommandArgument(
			"shareWith",
			"Share with",
			"List of Azure DevOps organization(s) with which to share the extension (space separated).",
			args.ArrayArgument, 
			null,
		);
		this.registerCommandArgument(
			"unshareWith",
			"Un-share with",
			"List of Azure DevOps organization(s) with which to un-share the extension (space separated).",
			args.ArrayArgument,
			null,
		);
		this.registerCommandArgument(
			"vsix",
			"VSIX path",
			"Path to an existing VSIX (to publish or query for).",
			args.ReadableFilePathsArgument,
		);
		this.registerCommandArgument("bypassValidation", "Bypass local validation", null, args.BooleanArgument, "false");
		this.registerCommandArgument(
			"locRoot",
			"Localization root",
			"Root of localization hierarchy (see README for more info).",
			args.ExistingDirectoriesArgument,
			null,
		);
		this.registerCommandArgument("displayName", "Display name", null, args.StringArgument);
		this.registerCommandArgument("description", "Description", "Description of the Publisher.", args.StringArgument);
		this.registerCommandArgument(
			"revVersion",
			"Rev version",
			"Rev the patch-version of the extension and save the result.",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(
			"noWaitValidation",
			"Wait for validation?",
			"Don't block command for extension validation.",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(
			"metadataOnly",
			"Metadata only",
			"Only copy metadata to the path specified and do not package the extension",
			args.BooleanArgument,
			"false",
			true, // undocumented
		);
	}

	protected getMergeSettings(): Promise<MergeSettings> {
		return Promise.all([
			this.commandArgs.root.val(),
			this.commandArgs.locRoot.val(),
			this.commandArgs.manifests.val(),
			this.commandArgs.manifestGlobs.val(),
			this.commandArgs.override.val(),
			this.commandArgs.overridesFile.val(),
			this.commandArgs.revVersion.val(),
			this.commandArgs.bypassValidation.val(),
			this.commandArgs.publisher.val(true),
			this.commandArgs.extensionId.val(true),
		]).then<MergeSettings>(values => {
			const [
				root,
				locRoot,
				manifests,
				manifestGlob,
				override,
				overridesFile,
				revVersion,
				bypassValidation,
				publisher,
				extensionId,
			] = values;
			if (publisher) {
				_.set(override, "publisher", publisher);
			}
			if (extensionId) {
				_.set(override, "extensionid", extensionId);
			}
			let overrideFileContent = Promise.resolve("");
			if (overridesFile && overridesFile.length > 0) {
				overrideFileContent = promisify(readFile)(overridesFile[0], "utf8");
			}
			return overrideFileContent.then(contentStr => {
				let content = contentStr;
				if (content === "") {
					content = "{}";
					if (overridesFile && overridesFile.length > 0) {
						trace.warn("Overrides file was empty. No overrides will be imported from " + overridesFile[0]);
					}
				}
				let mergedOverrides = {};
				let contentJSON = {};
				try {
					contentJSON = JSON.parse(content);
				} catch (e) {
					throw new Error("Could not parse contents of " + overridesFile[0] + " as JSON. \n");
				}
				contentJSON["__origin"] = overridesFile ? overridesFile[0] : path.join(root[0], "_override.json");
				_.merge(mergedOverrides, contentJSON, override);
				return {
					root: root[0],
					locRoot: locRoot && locRoot[0],
					manifests: manifests,
					manifestGlobs: manifestGlob,
					overrides: mergedOverrides,
					bypassValidation: bypassValidation,
					revVersion: revVersion,
				};
			});
		});
	}

	protected getPackageSettings(): Promise<PackageSettings> {
		return Promise.all([
			this.commandArgs.outputPath.val(),
			this.commandArgs.locRoot.val(),
			this.commandArgs.metadataOnly.val(),
		]).then(values => {
			const [outputPath, locRoot, metadataOnly] = values;
			return {
				outputPath: outputPath as string,
				locRoot: locRoot && locRoot[0],
				metadataOnly: metadataOnly,
			};
		});
	}

	protected identifyExtension(): Promise<CoreExtInfo> {
		return this.commandArgs.vsix.val(true).then(result => {
			let vsixPath = _.isArray(result) ? result[0] : null;
			let infoPromise: Promise<CoreExtInfo>;
			if (!vsixPath) {
				infoPromise = Promise.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).then(values => {
					const [publisher, extensionId] = values;
					return GalleryBase.getExtInfo({ extensionId: extensionId, publisher: publisher });
				});
			} else {
				infoPromise = Promise.all([this.commandArgs.publisher.val(true), this.commandArgs.extensionId.val(true)]).then(
					values => {
						const [publisher, extensionId] = values;
						return GalleryBase.getExtInfo({ vsixPath: vsixPath, publisher: publisher, extensionId: extensionId });
					},
				);
			}
			return infoPromise;
		});
	}

	protected getPublishSettings(): Promise<PublishSettings> {
		return Promise.all<any>([
			this.commandArgs.serviceUrl.val(),
			this.commandArgs.vsix.val(true),
			this.commandArgs.publisher.val(true),
			this.commandArgs.extensionId.val(true),
			this.commandArgs.shareWith.val(),
			this.commandArgs.noWaitValidation.val(),
		]).then<PublishSettings>(values => {
			const [marketUrl, vsix, publisher, extensionId, shareWith, noWaitValidation] = values;
			let vsixPath: string = _.isArray<string>(vsix) ? vsix[0] : null;
			return {
				galleryUrl: marketUrl,
				vsixPath: vsixPath,
				publisher: publisher,
				extensionId: extensionId,
				shareWith: shareWith,
				noWaitValidation: noWaitValidation,
			};
		});
	}

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}

	public static async getMarketplaceUrl(): Promise<string[]> {
		const url = "https://app.vssps.visualstudio.com/_apis/resourceareas/69D21C00-F135-441B-B5CE-3626378E0819";
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
		return [resourceArea["locationUrl"]];
	}
}
