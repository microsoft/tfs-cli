/// <reference path="../../definitions/q/Q.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');

export function describe(): string {
    return 'delete a build task.\nargs: <id>';
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
        var taskId = args[0] || options['id'];
        this.checkRequiredParameter(taskId, 'id', 'taskId');
        var deferred = Q.defer<agentifm.TaskDefinition>();

        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

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
