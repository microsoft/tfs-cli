import { Merger } from "../_lib/merger";
import { TfCommand } from "../../../lib/tfcommand";
import { VsixWriter } from "../_lib/vsix-writer";
import * as Loc from "../_lib/loc";
import colors = require("colors");
import extBase = require("../default");
import trace = require("../../../lib/trace");

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, GenResourcesResult> {
	return new GenerateExtensionResources(args);
}

export interface GenResourcesResult {
	resjsonPath: string;
}

export class GenerateExtensionResources extends extBase.ExtensionBase<GenResourcesResult> {
	protected description = "Create a vsix package for an extension.";
	protected serverCommand = false;

	constructor(passedArgs: string[]) {
		super(passedArgs);
	}

	protected getHelpArgs(): string[] {
		return [
			"root",
			"manifestJs",
			"env",
			"manifests",
			"manifestGlobs",
			"override",
			"overridesFile",
			"revVersion",
			"bypassScopeCheck",
			"bypassValidation",
			"publisher",
			"extensionId",
			"outputPath",
			"locRoot",
		];
	}

	public async exec(): Promise<GenResourcesResult> {
		return this.getMergeSettings().then(mergeSettings => {
			return this.getPackageSettings().then(packageSettings => {
				return new Merger(mergeSettings).merge().then(components => {
					const writer = new VsixWriter(packageSettings, components);
					const resjsonPath = writer.getOutputPath(packageSettings.outputPath, "resjson");
					Loc.LocPrep.writeResourceFile(resjsonPath, components.resources.combined);
					return <GenResourcesResult>{
						resjsonPath: writer.getOutputPath(packageSettings.outputPath, "resjson"),
					};
				});
			});
		});
	}

	protected friendlyOutput(data: GenResourcesResult): void {
		trace.info(colors.green("\n=== Completed operation: generate extension resources ==="));
		trace.info(" - .resjson: %s", data.resjsonPath);
	}
}
