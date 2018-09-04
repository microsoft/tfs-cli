import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import ext = require("../default");

export function getCommand(args: string[]): TfCommand<ext.ExtensionArguments, void> {
	return new ExtensionResourcesBase<void>(args);
}

export class ExtensionResourcesBase<T> extends ext.ExtensionBase<T> {
	protected description = "Commands for working with localization of extensions.";
	protected serverCommand = false;

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}
