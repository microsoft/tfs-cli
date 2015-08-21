/// <reference path="../../definitions/q/Q.d.ts"/>

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
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<agentifm.TaskDefinition> {
        trace.debug("build-tasks-delete.exec");
        var defer = Q.defer<agentifm.TaskDefinition>();
		this.checkArguments(args, options).then( (allArguments) => {
            var taskId: string = allArguments[argm.TASK_ID.name];
    
            trace.debug("Initializing agent API...");
            var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);
    
            trace.debug("Searching for tasks with id: " + taskId);
            agentapi.getTaskDefinitions(taskId, null, null, null, (err, statusCode, tasks) => {
                trace.debug("Found %s tasks with provided id.", tasks.length)
                if (tasks && tasks.length > 0) {
                    trace.debug("Deleting task(s)...");
                    agentapi.deleteTaskDefinition(taskId, (err, statusCode) => {
                        if (err) {
                            trace.debug("Call to TaskAgentApi.deleteTaskDefinition failed with code %s. Message: %s", statusCode, err.message);
                            err.statusCode = statusCode;
                            defer.reject(err);
                        }
                        else {
                            trace.debug("Success.")
                            defer.resolve(<agentifm.TaskDefinition>{
                                id: taskId
                            });
                        }
                    });
                }
                else {
                    trace.debug("No such task.");
                    defer.reject(new Error("No task found with provided ID: " + taskId));
                }
            });
        })
        .fail((err) => {
            trace.debug('Failed to gather inputs. Message: %s', err.message);
            defer.reject(err);
        });
        return <Q.Promise<agentifm.TaskDefinition>>defer.promise;
    }

    public output(data: agentifm.TaskDefinition): void {
        trace.println();
        trace.success('Task %s deleted successfully!', data.id);
    }
}
