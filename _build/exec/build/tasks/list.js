"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tasksBase = require("./default");
var trace = require('../../../lib/trace');
function getCommand(args) {
    return new BuildTaskList(args);
}
exports.getCommand = getCommand;
var BuildTaskList = (function (_super) {
    __extends(BuildTaskList, _super);
    function BuildTaskList() {
        _super.apply(this, arguments);
        this.description = "Get a list of build tasks";
    }
    BuildTaskList.prototype.getHelpArgs = function () {
        return ["all"];
    };
    BuildTaskList.prototype.exec = function () {
        var _this = this;
        var agentapi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
        trace.debug("Searching for build tasks...");
        return agentapi.getTaskDefinitions(null, ['build'], null).then(function (tasks) {
            trace.debug("Retrieved " + tasks.length + " build tasks from server.");
            return _this.commandArgs.all.val().then(function (all) {
                if (all) {
                    trace.debug("Listing all build tasks.");
                    return tasks;
                }
                else {
                    trace.debug("Filtering build tasks to give only the latest versions.");
                    return _this._getNewestTasks(tasks);
                }
            });
        });
    };
    /*
     * takes a list of non-unique task definitions and returns only the newest unique definitions
     * TODO: move this code to the server, add a parameter to the controllers
     */
    BuildTaskList.prototype._getNewestTasks = function (allTasks) {
        var taskDictionary = {};
        for (var i = 0; i < allTasks.length; i++) {
            var currTask = allTasks[i];
            if (taskDictionary[currTask.id]) {
                var newVersion = new TaskVersion(currTask.version);
                var knownVersion = new TaskVersion(taskDictionary[currTask.id].version);
                trace.debug("Found additional version of " + currTask.name + " and comparing to the previously encountered version.");
                if (this._compareTaskVersion(newVersion, knownVersion) > 0) {
                    trace.debug("Found newer version of " + currTask.name + ".  Previous: " + knownVersion.toString() + "; New: " + newVersion.toString());
                    taskDictionary[currTask.id] = currTask;
                }
            }
            else {
                trace.debug("Found task " + currTask.name);
                taskDictionary[currTask.id] = currTask;
            }
        }
        var newestTasks = [];
        for (var id in taskDictionary) {
            newestTasks.push(taskDictionary[id]);
        }
        return newestTasks;
    };
    /*
     * compares two versions of tasks, which are stored in version objects with fields 'major', 'minor', and 'patch'
     * @return positive value if version1 > version2, negative value if version2 > version1, 0 otherwise
     */
    BuildTaskList.prototype._compareTaskVersion = function (version1, version2) {
        if (version1.major != version2.major) {
            return version1.major - version2.major;
        }
        if (version1.minor != version2.minor) {
            return version1.minor - version2.minor;
        }
        if (version1.patch != version2.patch) {
            return version1.patch - version2.patch;
        }
        return 0;
    };
    BuildTaskList.prototype.friendlyOutput = function (data) {
        if (!data) {
            throw new Error('no tasks supplied');
        }
        if (!(data instanceof Array)) {
            throw new Error('expected an array of tasks');
        }
        data.forEach(function (task) {
            trace.println();
            trace.info('id            : %s', task.id);
            trace.info('name          : %s', task.name);
            trace.info('friendly name : %s', task.friendlyName);
            trace.info('visibility    : %s', task.visibility ? task.visibility.join(",") : "");
            trace.info('description   : %s', task.description);
            trace.info('version       : %s', new TaskVersion(task.version).toString());
        });
    };
    return BuildTaskList;
}(tasksBase.BuildTaskBase));
exports.BuildTaskList = BuildTaskList;
var TaskVersion = (function () {
    function TaskVersion(versionData) {
        this.major = versionData.major || 0;
        this.minor = versionData.minor || 0;
        this.patch = versionData.patch || 0;
    }
    TaskVersion.prototype.toString = function () {
        return this.major + "." + this.minor + "." + this.patch;
    };
    return TaskVersion;
}());
