import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import witifm = require('vso-node-api/interfaces/WorkItemTrackingInterfaces');
import witm = require('vso-node-api/WorkItemTrackingApi');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'get a list of workitems given query';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new WorkItemQuery;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class WorkItemQuery extends cmdm.TfCommand {
    requiredArguments = [argm.PROJECT_NAME, argm.QUERY];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace('workitem-list.exec');
        var witapi: witm.IQWorkItemTrackingApi = this.getWebApi().getQWorkItemTrackingApi();
        
		return this.checkArguments(args, options).then( (allArguments) => {
            var project: string = allArguments[argm.PROJECT_NAME.name];
            var query: string = allArguments[argm.QUERY.name];
            var wiql: witifm.Wiql = { query: query }
            var workItemIds: witifm.WorkItemReference[] = [];
            
            return witapi.queryByWiql(wiql, project).then((result: witifm.WorkItemQueryResult) => {
               
               var workItemIds = result.workItems.map(val => val.id) .slice(0,Math.min(200, result.workItems.length));
               var fieldRefs = result.columns.map(val => val.referenceName);
               
               return witapi.getWorkItems(workItemIds, fieldRefs);
            });
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no results');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of workitems');
        }
        
        data.forEach((workitem: witifm.WorkItem) => {
            console.log();
            console.log('id   : ' + workitem.id);
            console.log('rev : ' + workitem.rev);
            console.log('type : ' + workitem.fields['System.WorkItemType']);
            console.log('state : ' + workitem.fields['System.State']);
            console.log('title : ' + workitem.fields['System.Title']);
            console.log('assigned to : ' + workitem.fields['System.AssignedTo']);
        });
    }   
}