import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import { MergeSettings, PackageSettings, PublishSettings } from "./_lib/interfaces";
import { WebApi, getBasicHandler } from "vso-node-api/WebApi";
import { BasicCredentialHandler } from "vso-node-api/handlers/basiccreds";
import { GalleryBase, CoreExtInfo } from "./_lib/publish";
import _ = require("lodash");
import args = require("../../lib/arguments");
import Q = require("q");

export function getCommand(args: string[]): TfCommand<ExtensionArguments, void> {
	return new ExtensionBase<void>(args);
}

export class ManifestJsonArgument extends args.JsonArgument<any> {}

export interface ExtensionArguments extends CoreArguments {
	extensionId: args.StringArgument;
	publisher: args.StringArgument;
	manifestGlobs: args.ArrayArgument;
	outputPath: args.StringArgument;
	override: ManifestJsonArgument;
	shareWith: args.ArrayArgument;
	unshareWith: args.ArrayArgument;
	vsix: args.ReadableFilePathsArgument;
	bypassValidation: args.BooleanArgument;
	locRoot: args.ExistingDirectoriesArgument;
	displayName: args.StringArgument;
	description: args.StringArgument;
}

export class ExtensionBase<T> extends TfCommand<ExtensionArguments, T> {
	protected description = "Commands to package, publish, and manage Extensions for Visual Studio Online.";

	constructor(passedArgs: string[], serverCommand: boolean = true) {
		super(passedArgs, serverCommand);
	}

	protected getHelpArgs(): string[] {
		return [];
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument("extensionId", "Extension ID", "Use this as the extension ID instead of what is specified in the manifest.", args.StringArgument);
		this.registerCommandArgument("publisher", "Publisher name", "Use this as the publisher ID instead of what is specified in the manifest.", args.StringArgument);
		this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, "https://app.market.visualstudio.com");
		this.registerCommandArgument("manifestGlobs", "Manifest globs", "List of globs to find manifests.", args.ArrayArgument, "vss-extension.json");
		this.registerCommandArgument("outputPath", "Output path", "Path to write the VSIX.", args.StringArgument, "{auto}");
		this.registerCommandArgument("override", "Overrides JSON", "JSON string which is merged into the manifests, overriding any values.", ManifestJsonArgument, "{}");
		this.registerCommandArgument("shareWith", "Share with", "List of VSO Accounts with which to share the extension.", args.ArrayArgument, null);
		this.registerCommandArgument("unshareWith", "Un-share with", "List of VSO Accounts with which to un-share the extension.", args.ArrayArgument, null);
		this.registerCommandArgument("vsix", "VSIX path", "Path to an existing VSIX (to publish or query for).", args.ReadableFilePathsArgument);
		this.registerCommandArgument("bypassValidation", "Bypass local validation", null, args.BooleanArgument, "false");
		this.registerCommandArgument("locRoot", "Localization root", "Root of localization hierarchy (see README for more info).", args.ExistingDirectoriesArgument, null);
		this.registerCommandArgument("displayName", "Display name", null, args.StringArgument);
		this.registerCommandArgument("description", "Description", "Description of the Publisher.", args.StringArgument);
	}

	protected getMergeSettings(): Q.Promise<MergeSettings> {
		return Q.all([
			this.commandArgs.root.val(),
			this.commandArgs.manifestGlobs.val(),
			this.commandArgs.override.val(),
			this.commandArgs.bypassValidation.val(),
			this.commandArgs.publisher.val(true),
			this.commandArgs.extensionId.val(true)
		]).spread<MergeSettings>((root: string[], manifestGlob: string[], override: any, bypassValidation: boolean, publisher: string, extensionId: String) => {
			if (publisher) {
				_.set(override, "publisher", publisher);
			}
			if (extensionId) {
				_.set(override, "extensionid", extensionId);
			}
			return {
				root: root[0],
				manifestGlobs: manifestGlob,
				overrides: override,
				bypassValidation: bypassValidation
			};
		});
	}

	protected getPackageSettings(): Q.Promise<PackageSettings> {
		return Q.all<string | string[]>([
			this.commandArgs.outputPath.val(),
			this.commandArgs.locRoot.val()
		]).spread<PackageSettings>((outputPath: string, locRoot: string[]) => {
			return {
				outputPath: outputPath,
				locRoot: locRoot && locRoot[0]
			};
		});
	}

	protected identifyExtension(): Q.Promise<CoreExtInfo> {
		return this.commandArgs.vsix.val(true).then((result) => {
			let vsixPath = _.isArray(result) ? result[0] : null;
			let infoPromise: Q.Promise<CoreExtInfo>;
			if (!vsixPath) {
				infoPromise = Q.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).spread((publisher: string, extensionId: string) => {
					return GalleryBase.getExtInfo({ extensionId: extensionId, publisher: publisher });
				});
			} else {
				infoPromise = Q.all([
					this.commandArgs.publisher.val(true),
					this.commandArgs.extensionId.val(true)]).spread((publisher, extensionId) => {

					return GalleryBase.getExtInfo({ vsixPath: vsixPath, publisher: publisher, extensionId: extensionId });
				});
			}
			return infoPromise;
		});
	}

	protected getPublishSettings(): Q.Promise<PublishSettings> {
		return Q.all<any>([
			this.commandArgs.serviceUrl.val(),
			this.commandArgs.vsix.val(true),
			this.commandArgs.publisher.val(true),
			this.commandArgs.extensionId.val(true),
			this.commandArgs.shareWith.val()
		]).spread<PublishSettings>((marketUrl: string, vsix: string[], publisher: string, extensionId: string, shareWith: string[]) => {
			let vsixPath: string = _.isArray(vsix) ? vsix[0] : null;
			return {
				galleryUrl: marketUrl,
				vsixPath: vsixPath,
				publisher: publisher,
				extensionId: extensionId,
				shareWith: shareWith
			};
		});
	}

	public exec(cmd?: any): Q.Promise<any> {
		return this.getHelp(cmd);
	}
}