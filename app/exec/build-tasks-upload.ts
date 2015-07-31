/// <reference path="../../definitions/q/Q.d.ts"/>

import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import Q = require('q');
import fs = require('fs');
import path = require('path');
var check = require('validator');
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
        var taskPath = args[0] || options['taskPath'];
        this.checkRequiredParameter(taskPath, 'taskPath', 'path to the task folder');
        var deferred = Q.defer<agentifm.TaskDefinition>();
        fs.readFile(path.join(taskPath, 'task.json'), 'utf8', (err, data) => {
            if(err) {
                return console.log(err);
            }

            var taskJson = JSON.parse(data);

            var vn = (taskJson.name  || taskPath);

            if (!taskJson.id || !check.isUUID(taskJson.id)) {
                return console.log(vn + ': id is a required guid');
            }

            if (!taskJson.name || !check.isAlphanumeric(taskJson.name)) {
                return console.log(vn + ': name is a required alphanumeric string');
            }

            if (!taskJson.friendlyName || !check.isLength(taskJson.friendlyName, 1, 40)) {
                return console.log(vn + ': friendlyName is a required string <= 40 chars');
            }

            if (!taskJson.instanceNameFormat) {
                return console.log(vn + ': instanceNameFormat is required');    
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
                    deferred.resolve(task);
                }
            });
            archive.finalize();
        });
        return <Q.Promise<agentifm.TaskDefinition>>deferred.promise;
    }

    public output(data: any): void {
        console.log('source: ' + data.sourceLocation + ' uploaded successfully!');
    }
}