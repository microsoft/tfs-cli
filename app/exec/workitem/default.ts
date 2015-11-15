import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import extPub = require("../default");
import Q = require("q");

export interface WorkItemArguments extends CoreArguments {
    
}

export function getCommand(args: string[]): TfCommand<WorkItemArguments, void> {
    return new WorkItemBase<void>(args);
}

export class WorkItemBase<T> extends TfCommand<WorkItemArguments, T> {
	protected description = "Commands for managing Work Items.";
    
    public exec(cmd?: any): Q.Promise<any> {
        return this.getHelp(cmd);
    }
}