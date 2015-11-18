import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");

export interface WorkItemArguments extends CoreArguments {
	workItemId: args.IntArgument;
	query: args.StringArgument;
	workItemType: args.StringArgument;
	assignedTo: args.StringArgument;
	title: args.StringArgument;
	description: args.StringArgument;
}

export function getCommand(args: string[]): TfCommand<WorkItemArguments, void> {
    return new WorkItemBase<void>(args);
}

export class WorkItemBase<T> extends TfCommand<WorkItemArguments, T> {
	protected description = "Commands for managing Work Items.";
	
	protected setCommandArgs(): void {
		super.setCommandArgs();
		
		this.registerCommandArgument("workItemId", "Work Item ID", "Identifies a particular Work Item.", args.IntArgument);
		this.registerCommandArgument("query", "Work Item Query (WIQL)", null, args.StringArgument);
		this.registerCommandArgument("workItemType", "Work Item Type", "Type of Work Item to create.", args.StringArgument);
		this.registerCommandArgument("assignedTo", "Assign To", "Who to assign the Work Item to.", args.StringArgument);
		this.registerCommandArgument("title", "Work Item Title", "Title of the Work Item.", args.StringArgument);
		this.registerCommandArgument("description", "Work Item Description", "Description of the Work Item.", args.StringArgument);
	}
	
	public exec(cmd?: any): Q.Promise<any> {
		return this.getHelp(cmd);
	}
}