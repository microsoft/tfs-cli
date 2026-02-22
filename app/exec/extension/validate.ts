import { Merger } from "./_lib/merger";
import { TfCommand } from "../../lib/tfcommand";
import colors = require("colors");
import extBase = require("./default");
import trace = require("../../lib/trace");
import { formatDiagnostic } from "../../lib/diagnostics";

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, ValidationResult> {
	return new ExtensionValidate(args);
}

export interface ValidationIssue {
	file: string | null;
	line: number | null;
	col: number | null;
	message: string;
}

export interface ValidationResult {
	source: "manifest";
	status: "success" | "error";
	issues: ValidationIssue[];
}

export class ExtensionValidate extends extBase.ExtensionBase<ValidationResult> {
	protected description =
		"Validate an extension from manifests without packaging or publishing.";
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
			"json5",
			"override",
			"overridesFile",
			"warningsAsErrors",
			"publisher",
			"extensionId",
			"locRoot",
		];
	}

	public async exec(): Promise<ValidationResult> {
		const vsix = await this.commandArgs.vsix.val(true);
		if (vsix && vsix.length > 0) {
			throw new Error("The --vsix argument is not supported by 'tfx extension validate'. Validate command only supports manifest-based local validation.");
		}

		return this.validateManifestInputs();
	}

	private async validateManifestInputs(): Promise<ValidationResult> {
		const mergeSettings = await this.getMergeSettings();

		// Validation command should not mutate version nor bypass validation checks.
		mergeSettings.revVersion = false;
		mergeSettings.bypassValidation = false;

		try {
			await new Merger(mergeSettings).merge();

			return {
				source: "manifest",
				status: "success",
				issues: [],
			};
		} catch (err) {
			return {
				source: "manifest",
				status: "error",
				issues: this.errorToIssues(err),
			};
		}
	}

	private errorToIssues(err: any): ValidationIssue[] {
		const sourceIssues = err && Array.isArray(err.validationIssues) ? err.validationIssues : null;
		if (sourceIssues && sourceIssues.length > 0) {
			return sourceIssues.map(issue => ({
				file: issue && issue.file !== undefined ? issue.file : null,
				line: issue && issue.line !== undefined ? issue.line : null,
				col: issue && issue.col !== undefined ? issue.col : null,
				message: issue && issue.message ? issue.message : String(issue),
			}));
		}

		const message = err && err.message ? err.message : String(err);
		return [{ file: null, line: null, col: null, message: message }];
	}

	protected friendlyOutput(data: ValidationResult): void {
		if (data.status === "success") {
			trace.info(colors.green("\n=== Completed operation: validate extension ==="));
			trace.info(" - Source: %s", data.source);
			trace.info(" - Validation: %s", colors.green("success"));
		} else {
			trace.info(colors.red("\n=== Completed operation: validate extension ==="));
			trace.info(" - Source: %s", data.source);
			trace.info(" - Validation: %s", colors.red("failed"));
			data.issues.forEach(issue => {
				trace.info(formatDiagnostic(issue, "error"));
			});
		}
	}
}
