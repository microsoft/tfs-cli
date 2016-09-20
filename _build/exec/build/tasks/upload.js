"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var archiver = require('archiver');
var path = require('path');
var tasksBase = require("./default");
var trace = require('../../../lib/trace');
var vm = require('../../../lib/jsonvalidate');
function getCommand(args) {
    return new BuildTaskUpload(args);
}
exports.getCommand = getCommand;
var c_taskJsonFile = 'task.json';
var BuildTaskUpload = (function (_super) {
    __extends(BuildTaskUpload, _super);
    function BuildTaskUpload() {
        _super.apply(this, arguments);
        this.description = "Upload a Build Task.";
    }
    BuildTaskUpload.prototype.getHelpArgs = function () {
        return ["taskPath", "overwrite"];
    };
    BuildTaskUpload.prototype.exec = function () {
        var _this = this;
        return this.commandArgs.taskPath.val().then(function (taskPaths) {
            var taskPath = taskPaths[0];
            return _this.commandArgs.overwrite.val().then(function (overwrite) {
                vm.exists(taskPath, 'specified directory ' + taskPath + ' does not exist.');
                //directory is good, check json
                var tp = path.join(taskPath, c_taskJsonFile);
                return vm.validate(tp, 'no ' + c_taskJsonFile + ' in specified directory').then(function (taskJson) {
                    var archive = archiver('zip');
                    archive.on('error', function (error) {
                        trace.debug('Archiving error: ' + error.message);
                        error.message = 'Archiving error: ' + error.message;
                        throw error;
                    });
                    archive.directory(path.resolve(taskPath), false);
                    var agentApi = _this.webApi.getTaskAgentApi(_this.connection.getCollectionUrl());
                    archive.finalize();
                    return agentApi.uploadTaskDefinition(null, archive, taskJson.id, overwrite).then(function (task) {
                        trace.debug('Success');
                        return {
                            sourceLocation: taskPath
                        };
                    });
                });
            });
        });
    };
    BuildTaskUpload.prototype.friendlyOutput = function (data) {
        trace.println();
        trace.success('Task at %s uploaded successfully!', data.sourceLocation);
    };
    return BuildTaskUpload;
}(tasksBase.BuildTaskBase));
exports.BuildTaskUpload = BuildTaskUpload;
