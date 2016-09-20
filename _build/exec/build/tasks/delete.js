"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tasksBase = require("./default");
var trace = require('../../../lib/trace');
function getCommand(args) {
    return new BuildTaskDelete(args);
}
exports.getCommand = getCommand;
var BuildTaskDelete = (function (_super) {
    __extends(BuildTaskDelete, _super);
    function BuildTaskDelete() {
        _super.apply(this, arguments);
        this.description = "Delete a Build Task.";
    }
    BuildTaskDelete.prototype.getHelpArgs = function () {
        return ["taskId"];
    };
    BuildTaskDelete.prototype.exec = function () {
        var agentApi = this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
        return this.commandArgs.taskId.val().then(function (taskId) {
            return agentApi.getTaskDefinitions(taskId).then(function (tasks) {
                if (tasks && tasks.length > 0) {
                    trace.debug("Deleting task(s)...");
                    return agentApi.deleteTaskDefinition(taskId).then(function () {
                        return {
                            id: taskId
                        };
                    });
                }
                else {
                    trace.debug("No such task.");
                    throw new Error("No task found with provided ID: " + taskId);
                }
            });
        });
    };
    BuildTaskDelete.prototype.friendlyOutput = function (data) {
        trace.println();
        trace.success('Task %s deleted successfully!', data.id);
    };
    return BuildTaskDelete;
}(tasksBase.BuildTaskBase));
exports.BuildTaskDelete = BuildTaskDelete;
