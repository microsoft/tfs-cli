import agentifm = require('vso-node-api/interfaces/TaskAgentInterfaces');
import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import Q = require('q');
import params = require('../lib/parameternames');

export function describe(): string {
    return 'get a list of build tasks.';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint([], [], [params.ALL]);
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
    public exec(args: string[], options: cm.IOptions): any {
        var deferred = Q.defer<agentifm.TaskDefinition[]>();
        var all = options['all'] || false;
        var agentapi = this.getWebApi().getTaskAgentApi(this.connection.accountUrl);
        agentapi.getTaskDefinitions(['build'], (err, statusCode, tasks) => {
            if(err) {
                err.statusCode = statusCode;
                deferred.reject(err);
            }
            else {
                if(all) {
                    deferred.resolve(tasks);
                }
                else {
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
            console.log('version: ' + task.version.major + '.' + task.version.minor + '.' + task.version.patch);
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
                if (this._compareTaskVersion(<TaskVersion>currTask.version, <TaskVersion>taskDictionary[currTask.id].version) > 0) {
                    taskDictionary[currTask.id] = currTask;
                }
            }
            else {
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
            console.log(version1.patch - version2.patch);
            return version1.patch - version2.patch;
        }
        return 0;
    }
}

class TaskVersion {
    major: number;
    minor: number;
    patch: number;
}