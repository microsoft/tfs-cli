import cmdm = require('../../lib/tfcommand');
import cm = require('../../lib/common');
import witifm = require('vso-node-api/interfaces/WorkItemTrackingInterfaces');
import witm = require('vso-node-api/WorkItemTrackingApi');
import argm = require('../../lib/arguments');
import trace = require('../../lib/trace');

export function describe(): string {
    return 'show a work item given an id';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new WorkItemShow;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class WorkItemShow extends cmdm.TfCommand {
    public requiredArguments = [argm.WORKITEM_ID];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('workitem-show.exec');
        var witapi: witm.IQWorkItemTrackingApi = this.getWebApi().getQWorkItemTrackingApi();
        
        return this.checkArguments(args, options).then( (allArguments) => {
            var project: string = allArguments[argm.PROJECT_NAME.name];
            var workItemId: number = allArguments[argm.WORKITEM_ID.name];
            return witapi.getWorkItem(workItemId);
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no results');
        }

        var workitem: witifm.WorkItem = data;
        
        console.log();
        console.log('id   : ' + workitem.id);
        console.log('rev : ' + workitem.rev);
        console.log('type : ' + workitem.fields['System.WorkItemType']);
        console.log('state : ' + workitem.fields['System.State']);
        console.log('title : ' + workitem.fields['System.Title']);
        console.log('assigned to : ' + workitem.fields['System.AssignedTo']);
    }   
}