import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import argm = require('../lib/arguments')
import Q = require('q');
var trace = require('../lib/trace');

export function describe(): string {
    return 'delete a build task';
}

export function getCommand(): cmdm.TfCommand {
    return new BuildTaskDelete();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildTaskDelete extends cmdm.TfCommand {
    requiredArguments = [argm.TASK_ID];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace("build-tasks-delete.exec");
        var defer = Q.defer<agentifm.TaskDefinition>();
		this.checkArguments(args, options).then( (allArguments) => {
            var taskId: string = allArguments[argm.TASK_ID.name];
    
            trace("Initializing agent API...");
            var agentapi = this.getWebApi().getTaskAgentApi(this.connection.collectionUrl);
    
            agentapi.deleteTaskDefinition(taskId, (err, statusCode) => {
                if (err) {
                    trace("Call to TaskAgentApi.deleteTaskDefinition failed with code " + statusCode + ". Message: " + err.message);
                    err.statusCode = statusCode;
                    defer.reject(err);
                }
                else {
                    trace("Success.")
                    defer.resolve(<agentifm.TaskDefinition>{
                        id: taskId
                    });
                }
            });
        })
        .fail((err) => {
            trace('Failed to gather inputs. Message: ' + err.message);
            defer.reject(err);
        });
        return <Q.Promise<agentifm.TaskDefinition>>defer.promise;
    }

    public output(data: any): void {
        console.log('task: ' + data.id + ' deleted successfully!');
    }
}
