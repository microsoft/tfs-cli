import { TfCommand } from "../lib/tfcommand";
import args = require("../lib/arguments");

export function getCommand(args: string[]): TfCommand<any, void> {
	return new DefaultCommand(args);
}

export class DefaultCommand extends TfCommand<any, void> {
	protected serverCommand = false;

	constructor(passedArgs: string[]) {
		super(passedArgs);
	}

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}