/// <reference path="../../../typings/tsd.d.ts" />

import { Merger } from "./_lib/merger";
import { VsixManifestBuilder } from "./_lib/vsix-manifest-builder";
import { MergeSettings, PackageSettings } from "./_lib/interfaces";
import { VsixWriter } from "./_lib/vsix-writer";
import { TfCommand } from "../../lib/tfcommand";
import colors = require("colors");
import extBase = require("./default");
import trace = require('../../lib/trace');

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, CreationResult> {
	return new ExtensionCreate(args);
}

export interface CreationResult {
	path: string;
	extensionId: string;
	publisher: string;
}

export function createExtension(mergeSettings: MergeSettings, packageSettings: PackageSettings): Q.Promise<CreationResult> {
	return new Merger(mergeSettings).merge().then((components) => {
		return new VsixWriter(packageSettings, components).writeVsix().then((outPath) => {
			let vsixBuilders = components.builders.filter(b => b.getType() === VsixManifestBuilder.manifestType);
			let vsixBuilder: VsixManifestBuilder;
			if (vsixBuilders.length > 0) {
				vsixBuilder = <VsixManifestBuilder>vsixBuilders[0];
			}
			return {
				path: outPath,
				extensionId: vsixBuilder ? vsixBuilder.getExtensionId() : null,
				publisher: vsixBuilder ? vsixBuilder.getExtensionPublisher() : null
			};
		});
	});
}

export class ExtensionCreate extends extBase.ExtensionBase<CreationResult> {
	protected description = "Create a vsix package for an extension.";

	constructor(passedArgs: string[]) {
		super(passedArgs, false);
	}

	protected getHelpArgs(): string[] {
		return ["root", "manifestGlobs", "override", "overridesFile", "bypassValidation", "publisher", "extensionId", "outputPath", "locRoot"];
	}

	public exec(): Q.Promise<CreationResult> {
		return this.getMergeSettings().then((mergeSettings) => {
			return this.getPackageSettings().then((packageSettings) => {
				return createExtension(mergeSettings, packageSettings);
			});
		});
	}

	protected friendlyOutput(data: CreationResult): void {
		trace.info(colors.green("\n=== Completed operation: create extension ==="));
		trace.info(" - VSIX: %s", data.path);
		trace.info(" - Extension ID: %s", data.extensionId);
		trace.info(" - Publisher: %s", data.publisher);
	}
}