import { TfCommand, CoreArguments } from "../../../lib/tfcommand";

export function getCommand(args: string[]): HelpCommand {
	return new HelpCommand(args);
}

export class HelpCommand extends TfCommand <CoreArguments, void> {
	protected description = "Commands for managing Build Definitions.";

	protected setCommandArgs(): void {
		super.setCommandArgs();
	}

	public exec(cmd?: any): Q.Promise<any> {
		return this.getHelp(cmd);
	}
}
