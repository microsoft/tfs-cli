import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import extPub = require("../default");


export function getCommand(args: string[]): TfCommand<extPub.ExtensionArguments, void> {
	return new ExtensionPublisherBase<void>(args);
}

export class ExtensionPublisherBase<T> extends extPub.ExtensionBase<T> {
	protected description = "Commands for managing Visual Studio Services Marketplace Publishers.";

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}