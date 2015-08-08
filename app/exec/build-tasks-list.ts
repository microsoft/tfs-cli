import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import Q = require('q');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'get a list of build tasks';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildTaskList;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildTaskList extends cmdm.TfCommand {
    flags = [argm.ALL];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace("build-tasks-list.exec");
        var deferred = Q.defer<agentifm.TaskDefinition[]>();
        var allArguments = this.checkArguments(args, options);
        
        trace("Initializing agent API...");
        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);
        
        trace("Searching for build tasks...");
        agentapi.getTaskDefinitions(['build'], (err, statusCode, tasks) => {
            if(err) {
                trace("Call to TaskAgentApi.getTaskDefinitions failed with code " + statusCode + ". Message: " + err.message);
                err.statusCode = statusCode;
                deferred.reject(err);
            }
            else {
                trace("Retrieved " + tasks.length + " build tasks from server.");
                if(allArguments[argm.ALL.name]) {
                    trace("Listing all build tasks.");
                    deferred.resolve(tasks);
                }
                else {
                    trace("Filtering build tasks to give only the latest versions.");
                    deferred.resolve(this._getNewestTasks(tasks));
                }
            }
        });
        return <Q.Promise<agentifm.TaskDefinition[]>>deferred.promise;
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no tasks supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of tasks');
        }

        data.forEach((task) => {
            console.log();
            console.log('id   : ' + task.id);
            console.log('name : ' + task.name);
            console.log('friendly name : ' + task.friendlyName);
            console.log('visibility: ' + task.visibility);
            console.log('description: ' + task.description);
            console.log('version: ' + new TaskVersion(task.version).toString());
        });
    }   

    /*
     * takes a list of non-unique task definitions and returns only the newest unique definitions
     * TODO: move this code to the server, add a parameter to the controllers
     */ 
    private _getNewestTasks(allTasks: agentifm.TaskDefinition[]): agentifm.TaskDefinition[] {
        var taskDictionary: { [id: string]: agentifm.TaskDefinition; } = {};
        for (var i = 0; i < allTasks.length; i++) {
            var currTask: agentifm.TaskDefinition = allTasks[i];
            if(taskDictionary[currTask.id])
            {
                var newVersion: TaskVersion = new TaskVersion(currTask.version);
                var knownVersion: TaskVersion = new TaskVersion(taskDictionary[currTask.id].version);
                trace("Found additional version of " + currTask.name + " and comparing to the previously encountered version.");
                if (this._compareTaskVersion(newVersion, knownVersion) > 0) {
                    trace("Found newer version of " + currTask.name + ".  Previous: " + knownVersion.toString() + "; New: " + newVersion.toString());
                    taskDictionary[currTask.id] = currTask;
                }
            }
            else {
                trace("Found task " + currTask.name);
                taskDictionary[currTask.id] = currTask;
            }
        }
        var newestTasks: agentifm.TaskDefinition[] = [];
        for(var id in taskDictionary) {
            newestTasks.push(taskDictionary[id]);
        }
        return newestTasks;
    }
    /*
     * compares two versions of tasks, which are stored in version objects with fields 'major', 'minor', and 'patch'
     * @return positive value if version1 > version2, negative value if version2 > version1, 0 otherwise
     */
    private _compareTaskVersion(version1: TaskVersion, version2: TaskVersion): number {
        if(version1.major != version2.major) {
            return version1.major - version2.major;
        }
        if(version1.minor != version2.minor) {
            return version1.minor - version2.minor;
        }
        if(version1.patch != version2.patch) {
            return version1.patch - version2.patch;
        }
        return 0;
    }
}

class TaskVersion {
    major: number;
    minor: number;
    patch: number;
    
    constructor(versionData: any) {
        this.major = versionData.major || 0;
        this.minor = versionData.minor || 0;
        this.patch = versionData.patch || 0;    
    }
    
    public toString(): string {
        return this.major + "." + this.minor + "." + this.patch;
    }
}