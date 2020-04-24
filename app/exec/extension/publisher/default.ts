import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import extPub = require("../default");
import args = require("../../../lib/arguments");
import extBase = require("../default");

export function getCommand(args: string[]): TfCommand<extPub.ExtensionArguments, void> {
	return new ExtensionPublisherBase<void>(args);
}

export class ExtensionPublisherBase<T> extends extPub.ExtensionBase<T> {
	protected description = "Commands for managing Visual Studio Marketplace Publishers.";
	protected serverCommand = false;

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument(
			"serviceUrl",
			"Market URL",
			"URL to the VSS Marketplace.",
			args.StringArgument,
			extBase.ExtensionBase.getMarketplaceUrl,
		);
	}

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}
