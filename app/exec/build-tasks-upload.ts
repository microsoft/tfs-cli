/// <reference path="../../definitions/q/Q.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');
import fs = require('fs');
var archiver = require('archiver');

export function describe(): string {
    return 'upload a build task.\nargs: <taskPath>';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildTaskUpload();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildTaskUpload extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var taskPath = args[0] || options['taskPath'];
        this.checkRequiredParameter(taskPath, 'taskPath', 'path to the task folder');
        console.log(taskPath);

        var archive = archiver('zip');
        archive.directory(taskPath, false);

        var deferred = Q.defer<agentifm.TaskDefinition>();
        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

        agentapi.uploadTaskDefinition(archive, null, "", "AC4EE482-65DA-4485-A532-7B085873E533", true, (err, statusCode, task) => {
            if(err) {
                err.statusCode = statusCode;
                deferred.reject(err);
            }
            else {
                deferred.resolve(<agentifm.TaskDefinition>{
                    sourceLocation: taskPath
                })
            }
        });
        archive.finalize();
        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('source: ' + data.sourceLocation + ' uploaded successfully!');
    }
}