import { TfCommand } from "../../lib/tfcommand";
import args = require("../../lib/arguments");
import witBase = require("./default");
import witClient = require("vso-node-api/WorkItemTrackingApi");
import witContracts = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");

export function getCommand(args: string[]): WorkItemShow {
    return new WorkItemShow(args);
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class WorkItemShow extends witBase.WorkItemBase<witContracts.WorkItem> {
    protected description = "Show Work Item details.";
    
    protected getHelpArgs(): string[] {
        return ["workItemId"];
    }
    
    public exec(): Q.Promise<witContracts.WorkItem> {
        var witapi: witClient.IQWorkItemTrackingApi = this.webApi.getQWorkItemTrackingApi();
        return this.commandArgs.workItemId.val().then((workItemId) => {
            return witapi.getWorkItem(workItemId)
        });
    }

    public friendlyOutput(data: witContracts.WorkItem): void {
        if (!data) {
            throw new Error('no results');
        }

        var workitem: witContracts.WorkItem = data;
        
        console.log();
        console.log('id   : ' + workitem.id);
        console.log('rev : ' + workitem.rev);
        console.log('type : ' + workitem.fields['System.WorkItemType']);
        console.log('state : ' + workitem.fields['System.State']);
        console.log('title : ' + workitem.fields['System.Title']);
        console.log('assigned to : ' + workitem.fields['System.AssignedTo']);
    }
}