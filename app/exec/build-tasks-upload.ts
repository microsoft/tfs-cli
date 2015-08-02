/// <reference path="../../definitions/q/Q.d.ts"/>
/// <reference path="../../definitions/node/node.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import validatem = require('../lib/jsonvalidate')
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');
import fs = require('fs');
import path = require('path');
var archiver = require('archiver');

export function describe(): string {
    return 'upload a build task.\nargs: <taskPath>';
}

export function getCommand(): cmdm.TfCommand {
    return new BuildTaskUpload();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildTaskUpload extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var deferred = Q.defer<agentifm.TaskDefinition>();
        var taskPath = args[0] || options['taskPath'];
        this.checkRequiredParameter(taskPath, 'taskPath', 'path to the task folder');
        if(!fs.existsSync(taskPath)) {
            deferred.reject(new validatem.InvalidDirectoryException('specified directory does not exist.'));
        }
        var taskJsonPath = path.join(taskPath, 'task.json');
        if(!fs.existsSync(taskJsonPath)) {
            deferred.reject(new validatem.InvalidDirectoryException('no task.json in specified directory'));
        }

        var taskJson;
        try {
            taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
            var validator: validatem.JsonValidate = new validatem.JsonValidate();
            validator.validateTask(taskJson, taskPath);
        }
        catch (readError) {
            deferred.reject(readError)
        }


        var archive = archiver('zip');
        archive.directory(taskPath, false);

        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);

        agentapi.uploadTaskDefinition(archive, null, "", taskJson.id, true, (err, statusCode, task) => {
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
        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('source: ' + data.sourceLocation + ' uploaded successfully!');
    }
}