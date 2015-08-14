import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import witifm = require('vso-node-api/interfaces/WorkItemTrackingInterfaces');
import VSSInterfaces = require('vso-node-api/interfaces/common/VSSInterfaces');
import witm = require('vso-node-api/WorkItemTrackingApi');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'create a workitem';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new WorkItemCreate;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class WorkItemCreate extends cmdm.TfCommand {
    
    requiredArguments = [argm.PROJECT_NAME, argm.WORKITEMTYPE, argm.TITLE];
    optionalArguments = [argm.ASSIGNEDTO, argm.DESCRIPTION];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace('workitem-create.exec');
        var witapi: witm.IQWorkItemTrackingApi = this.getWebApi().getQWorkItemTrackingApi();
        
        return this.promptArguments(this.requiredArguments, this.optionalArguments).then( (allArguments) => {
   
            var workitemtype: string = allArguments[argm.WORKITEMTYPE.name];
            var assignedto: string = allArguments[argm.ASSIGNEDTO.name];
            var title: string = allArguments[argm.TITLE.name];
            var description: string = allArguments[argm.DESCRIPTION.name];
            var project: string = allArguments[argm.PROJECT_NAME.name];
            var workItemId: number = allArguments[argm.WORKITEM_ID.name];
            
            var patchDoc: VSSInterfaces.JsonPatchOperation[]  = [];
            patchDoc.push({
                op: VSSInterfaces.Operation.Add,
                path: "/fields/System.Title",
                value: title,
                from: null
            });
            
            if(assignedto) {
                patchDoc.push({
                    op: VSSInterfaces.Operation.Add,
                    path: "/fields/System.AssignedTo",
                    value: assignedto,
                    from: null
                });
            }   
                     
            if(description) {
                patchDoc.push({
                    op: VSSInterfaces.Operation.Add,
                    path: "/fields/System.Description",
                    value: description,
                    from: null
                });
            }
            
            return witapi.updateWorkItemTemplate(null, <VSSInterfaces.JsonPatchDocument>patchDoc, project, workitemtype);
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no results');
        }


        var workitem: witifm.WorkItem = data;
        console.log();
        console.log('created workitem @ ' + workitem.id);
        
        console.log();
        console.log('id   : ' + workitem.id);
        console.log('rev : ' + workitem.rev);
        console.log('type : ' + workitem.fields['System.WorkItemType']);
        console.log('state : ' + workitem.fields['System.State']);
        console.log('title : ' + workitem.fields['System.Title']);
        console.log('assigned to : ' + workitem.fields['System.AssignedTo']);
    }   
}