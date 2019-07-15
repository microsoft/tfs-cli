import { TfCommand, CoreArguments } from "../../../lib/tfcommand";

export function getCommand(args: string[]): HelpCommand {
	return new HelpCommand(args);
}

export class HelpCommand extends TfCommand <CoreArguments, void> {
	protected serverCommand = false;
	protected description = "Commands for managing Build Definitions.";

	protected setCommandArgs(): void {
		super.setCommandArgs();
	}

	public exec(cmd?: any): Promise<any> {
		return this.getHelp(cmd);
	}
}
