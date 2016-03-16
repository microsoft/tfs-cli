import { TfCommand, CoreArguments } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import vssCoreContracts = require("vso-node-api/interfaces/common/VSSInterfaces")
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");
import trace = require("../../lib/trace");
import { EOL as eol } from "os";
import _ = require("lodash");


export class WorkItemValuesJsonArgument extends args.JsonArgument<any> {}

export interface WorkItemArguments extends CoreArguments {
	workItemId: args.IntArgument;
	query: args.StringArgument;
	workItemType: args.StringArgument;
    
    // Convienience way to set common work item arguments
	assignedTo: args.StringArgument;
	title: args.StringArgument;
	description: args.StringArgument;
    
    
    // Generic way to assign work item values
    values: WorkItemValuesJsonArgument;
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
		this.registerCommandArgument("assignedTo", "Assigned To", "Who to assign the Work Item to.", args.StringArgument);
		this.registerCommandArgument("title", "Work Item Title", "Title of the Work Item.", args.StringArgument);
		this.registerCommandArgument("description", "Work Item Description", "Description of the Work Item.", args.StringArgument);
		this.registerCommandArgument("values", "Work Item Values", "Mapping from field reference name to value to set on the workitem. (E.g. {\"system.assignedto\": \"Some Name\"})", WorkItemValuesJsonArgument, "{}");
	}
	
	public exec(cmd?: any): Q.Promise<any> {
		return this.getHelp(cmd);
	}
}


export function friendlyOutput(data: witContracts.WorkItem[]): void {
    if (!data) {
        throw new Error("no results");
    }
    
    let fieldsToIgnore = ["System.AreaLevel1", "System.IterationId", "System.IterationLevel1", "System.ExternalLinkCount", "System.AreaLevel1"];
    
    data.forEach((workItem) => {
        trace.info(eol);
        trace.info("System.Id:          " + workItem.id);
        trace.info("System.Rev:         " + workItem.rev);
        Object.keys(workItem.fields).forEach((arg) => {
            if(!_.contains(fieldsToIgnore, arg)) {
                trace.info(arg + ":        " + workItem.fields[arg]);
            }   
        });
    });
}


export function buildWorkItemPatchDoc(title, assignedTo, description, values) {
    var patchDoc: vssCoreContracts.JsonPatchOperation[]  = [];
    
    // Check the convienience helpers for wit values
    if(title){
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.Title",
            value: title,
            from: null
        });
    }
    
    if (assignedTo) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.AssignedTo",
            value: assignedTo,
            from: null
        });
    }

    if (description) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.Description",
            value: description,
            from: null
        });
    }

    // Set the field reference values
    Object.keys(values).forEach((fieldReference) => {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/" + fieldReference,
            value: values[fieldReference],
            from: null
        });
    });
    
    return patchDoc;
}
