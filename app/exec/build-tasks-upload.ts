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
    optionalArguments = [argm.OVERWRITE];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('build-task-upload.exec');
        var defer = Q.defer<agentifm.TaskDefinition>();
		this.checkArguments(args, options).then( (allArguments) => {
            var taskPath: string = allArguments[argm.TASK_PATH.name];
            var overwrite: boolean = allArguments[argm.OVERWRITE.name];
    
            trace.debug('taskPath: ' + taskPath);
            try {
                vm.exists(taskPath, 'specified directory ' + taskPath + ' does not exist.');
            }
            catch (directoryError) {
                defer.reject(directoryError);
            }
            //directory is good, check json
    
            var tp = path.resolve(process.cwd(), path.join(taskPath, c_taskJsonFile));
            trace.debug('task.json path: ' + tp);
    
            vm.validate(tp, 'no ' + c_taskJsonFile + ' in specified directory')
            .then((taskJson) => {
                var archive = archiver('zip');
                archive.on('error', function(error) {
                    trace.debug('Archiving error: ' + error.message);
                    error.message = 'Archiving error: ' + error.message;
                    defer.reject(error);
                })
                archive.directory(taskPath, false);
    
                trace.debug("Initializing agent API...");
                var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);
    
                agentapi.uploadTaskDefinition(null, archive, taskJson.id, overwrite, (err, statusCode, task) => {
                    if(err) {
                        trace.debug('TaskAgentApi.uploadTaskDefinition failed with code %s. Message: %s', statusCode, err.message);
                        err.statusCode = statusCode;
                        defer.reject(err);
                    }
                    else {
                        trace.debug('Success');
                        defer.resolve(<agentifm.TaskDefinition>{
                            sourceLocation: taskPath
                        });
                    }
                });
                archive.finalize();
            })
            .fail((error) => {
                trace.debug('Task json validation failed.');
                defer.reject(error);
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
        trace.success('Task at %s uploaded successfully!', data.sourceLocation);
    }
}