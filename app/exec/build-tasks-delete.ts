/// <reference path="../../definitions/q/Q.d.ts"/>

import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import parameternames = require('../lib/parameternames')
import Q = require('q');

export function describe(): string {
    return 'delete a build task.';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint([parameternames.GENERIC_ID], []);
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
        var taskId = args[0] || options[parameternames.GENERIC_ID];
        this.checkRequiredParameter(taskId, parameternames.GENERIC_ID, parameternames.TASK_ID);
        var deferred = Q.defer<agentifm.TaskDefinition>();

        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

        //TODO: update server api to give ability to check if task exists first
        agentapi.deleteTaskDefinition(taskId, (err, statusCode) => {
            if(err) {
                err.statusCode = statusCode;
                deferred.reject(err);
            }
            else {
                deferred.resolve(<agentifm.TaskDefinition>{
                    id: taskId
                });
            }
        });
        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('task: ' + data.id + ' deleted successfully!');
    }
}
