/// <reference path="../../definitions/q/Q.d.ts"/>
/// <reference path="../../definitions/node/node.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import vm = require('../lib/jsonvalidate')
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');
import fs = require('fs');
import path = require('path');
import argm = require('../lib/arguments');
var archiver = require('archiver');
var trace = require('../lib/trace');

export function describe(): string {
    return 'upload a build task';
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
    requiredArguments = [argm.TASK_PATH];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace('build-task-upload.exec');
        var deferred = Q.defer<agentifm.TaskDefinition>();
        var allArguments = this.checkArguments(args, options);
        var taskPath: string = allArguments[argm.TASK_PATH.name];

        trace('taskPath: ' + taskPath);
        try {
            vm.exists(taskPath, 'specified directory ' + taskPath + ' does not exist.');
        }
        catch (directoryError) {
            deferred.reject(directoryError);
        }
        //directory is good, check json

        var tp = path.resolve(process.cwd(), path.join(taskPath, c_taskJsonFile));
        trace('task.json path: ' + tp);

        vm.validate(tp, 'no ' + c_taskJsonFile + ' in specified directory')
        .then((taskJson) => {
            var archive = archiver('zip');
            archive.on('error', function(error) {
                trace('Archiving error: ' + error.message);
                error.message = 'Archiving error: ' + error.message;
                deferred.reject(error);
            })
            archive.directory(taskPath, false);

            trace("Initializing agent API...");
            var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

            agentapi.uploadTaskDefinition(null, archive, taskJson.id, false, (err, statusCode, task) => {
                if(err) {
                    trace('TaskAgentApi.uploadTaskDefinition failed with code ' + statusCode + '. Message: ' + err.message);
                    err.statusCode = statusCode;
                    deferred.reject(err);
                }
                else {
                    trace('Success');
                    deferred.resolve(<agentifm.TaskDefinition>{
                        sourceLocation: taskPath
                    });
                }
            });
            archive.finalize();
        })
        .fail((error) => {
            trace('Task json validation failed.');
            deferred.reject(error);
        });

        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('task at: ' + data.sourceLocation + ' uploaded successfully!');
    }
}