import { TfCommand } from "../lib/tfcommand";
import args = require("../lib/arguments");
import Q = require("q");

export function getCommand(args: string[]): TfCommand<any, void> {
	return new DefaultCommand(args);
}

export class DefaultCommand extends TfCommand<any, void> {
	constructor(passedArgs: string[]) {
		super(passedArgs, false);
	}

	public exec(cmd?: any): Q.Promise<any> {
		return this.getHelp(cmd);
	}
}