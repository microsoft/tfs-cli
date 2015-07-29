/// <reference path="../../definitions/q/Q.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');
var archiver = require('archiver');

export function describe(): string {
    return 'upload a build task. args: name taskPath';
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
        var name = args[0];
        var taskPath = args[1];
        if(!name) {
            throw new Error('name and task path not supplied.');
        }
        if (!taskPath) {
            throw new Error('task path not supplied.');
        }

        var result: any = {};
        result.task = { name: name };
        var archive = archiver('zip');
        archive.directory(taskPath, false);
        //result.source = taskPath;

        var deferred = Q.defer<agentifm.TaskDefinition>();
        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

        agentapi.uploadTaskDefinition(archive, null, "", name, true, (err, statusCode, task) => {
            if(err) {
                err.statusCode = statusCode;
                deferred.reject(err);
            }
            else {
                deferred.resolve(<agentifm.TaskDefinition>{
                    name: name,
                    sourceLocation: taskPath
                })
            }
        });
        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('source: ' + data.sourceLocation);
        console.log(data.name + ' uploaded successfully!')
    }
}