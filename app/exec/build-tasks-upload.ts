/// <reference path="../../definitions/q/Q.d.ts"/>
/// <reference path="../../definitions/node/node.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import vm = require('../lib/jsonvalidate')
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');
import fs = require('fs');
import path = require('path');
import params = require('../lib/parameternames');
var archiver = require('archiver');

export function describe(): string {
    return 'upload a build task.';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint([params.TASK_PATH], []);
}

export function getCommand(): cmdm.TfCommand {
    return new BuildTaskUpload();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

var c_taskJsonFile: string = 'task.json';

export class BuildTaskUpload extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var deferred = Q.defer<agentifm.TaskDefinition>();
        var taskPath = args[0] || options[params.TASK_PATH];
        this.checkRequiredParameter(taskPath, params.TASK_PATH, 'path to the task folder');

        try {
            vm.exists(taskPath, 'specified directory does not exist.');
        }
        catch (directoryError) {
            deferred.reject(directoryError);
        }
        //directory is good, check json
        vm.validate(path.join(taskPath, c_taskJsonFile), 'no ' + c_taskJsonFile + ' in specified directory').then((taskJson) => {
            var archive = archiver('zip');
            archive.on('error', function(error) {
                error.message = "Archiving error: " + error.message;
                deferred.reject(error);
            })
            archive.directory(taskPath, false);

            var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

            agentapi.uploadTaskDefinition(archive, null, "", taskJson.id, false, (err, statusCode, task) => {
                if(err) {
                    err.statusCode = statusCode;
                    deferred.reject(err);
                }
                else {
                    deferred.resolve(<agentifm.TaskDefinition>{
                        sourceLocation: taskPath
                    });
                }
            });
            archive.finalize();
        })
        .fail((error) => {
            deferred.reject(error);
        });

        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('task at: ' + data.sourceLocation + ' uploaded successfully!');
    }
}