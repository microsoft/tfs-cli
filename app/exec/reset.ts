import { TfCommand, CoreArguments } from "../lib/tfcommand";
import { DiskCache } from "../lib/diskcache";
import { EOL as eol } from "os";
import args = require("../lib/arguments");
import common = require("../lib/common");
import path = require("path");
import Q = require("q");
import trace = require("../lib/trace");

export function getCommand(args: string[]): Reset {
	return new Reset(args);
}

export interface ResetArgs extends CoreArguments {
	all: args.BooleanArgument;
} 

export class Reset extends TfCommand<ResetArgs, void> {
	protected description = "Reset any saved options to their defaults.";
	protected getHelpArgs() {return ["all"];}
	
	constructor(args: string[]) {
		super(args, false);
	}
	
	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument("all", "All directories", "Pass this option to reset saved options for all directories.", args.BooleanArgument, "false");
	}

	public exec(): Q.Promise<void> {
		return Q.resolve<void>(null);
	}
	
	public dispose(): Q.Promise<void> {
		let currentPath = path.resolve();
		return this.commandArgs.all.val().then((allSettings) => {
			return args.getOptionsCache().then((existingCache) => {
				if (existingCache[currentPath]) {
					existingCache[currentPath] = {};
					return new DiskCache("tfx").setItem("cache", "command-options", allSettings ? "" : JSON.stringify(existingCache, null, 4).replace(/\n/g, eol));
				} else {
					return Q.resolve<void>(null);
				}
			});
		});
	}

	public friendlyOutput(): void {
		trace.success("Settings reset.");
	}
}