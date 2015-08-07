/// <reference path="../../definitions/q/Q.d.ts"/>

import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import params = require('../lib/parameternames')
import Q = require('q');
var trace = require('../lib/trace');

export function describe(): string {
    return 'delete a build task';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint([params.GENERIC_ID], []);
}

export function getCommand(): cmdm.TfCommand {
    return new BuildTaskDelete();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildTaskDelete extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        trace("User requested to delete a build task.");
        var deferred = Q.defer<agentifm.TaskDefinition>();
        var taskId = args[0] || options[params.GENERIC_ID];
        this.checkRequiredParameter(taskId, params.GENERIC_ID, params.TASK_ID);

        trace("Initializing agent API...");
        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

        trace("Searching for tasks with id: " + taskId);
        agentapi.getTaskContent(taskId, "", (err, statusCode, tasks) => {
            trace("Found " + tasks.length + " tasks with provided id.")
            if (tasks.length > 0) {
                trace("Deleting task(s)...");
                agentapi.deleteTaskDefinition(taskId, (err, statusCode) => {
                    if (err) {
                        trace("Call to TaskAgentApi.deleteTaskDefinition failed. Message: " + err.message);
                        err.statusCode = statusCode;
                        deferred.reject(err);
                    }
                    else {
                        trace("Successfully deleted task(s).")
                        deferred.resolve(<agentifm.TaskDefinition>{
                            id: taskId
                        });
                    }
                });
            }
            else {
                trace("No task found with provided id: " + taskId);
                deferred.reject(new Error("No task found with provided ID: " + taskId));
            }
        });
        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('task: ' + data.id + ' deleted successfully!');
    }
}
