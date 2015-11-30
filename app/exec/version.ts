import { TfCommand, CoreArguments } from "../lib/tfcommand";
import version = require("../lib/version");
import trace = require("../lib/trace");

export function getCommand(args: string[]): TfCommand<CoreArguments, version.SemanticVersion> {
	return new Version(args);
}



export class Version extends TfCommand<CoreArguments, version.SemanticVersion> {
	protected description = "Output the version of this tool.";
	protected getHelpArgs() {return [];}
	
	constructor(args: string[]) {
		super(args, false);
	}

	public exec(): Q.Promise<version.SemanticVersion> {
		trace.debug("version.exec");
		return version.getTfxVersion();
	}

	public friendlyOutput(data: version.SemanticVersion): void {
		trace.info("Version %s", data.toString());
	}
}