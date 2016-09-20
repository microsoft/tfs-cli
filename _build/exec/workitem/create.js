"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require("q");
var witBase = require("./default");
function getCommand(args) {
    return new WorkItemCreate(args);
}
exports.getCommand = getCommand;
var WorkItemCreate = (function (_super) {
    __extends(WorkItemCreate, _super);
    function WorkItemCreate() {
        _super.apply(this, arguments);
        this.description = "Create a Work Item.";
    }
    WorkItemCreate.prototype.getHelpArgs = function () {
        return ["workItemType", "title", "assignedTo", "description", "project", "values"];
    };
    WorkItemCreate.prototype.exec = function () {
        var witapi = this.webApi.getWorkItemTrackingApi();
        return Promise.all([
            this.commandArgs.workItemType.val(),
            this.commandArgs.project.val(),
            this.commandArgs.title.val(true),
            this.commandArgs.assignedTo.val(true),
            this.commandArgs.description.val(true),
            this.commandArgs.values.val(true)
        ]).then(function (promiseValues) {
            var wiType = promiseValues[0], project = promiseValues[1], title = promiseValues[2], assignedTo = promiseValues[3], description = promiseValues[4], values = promiseValues[5];
            if (!title && !assignedTo && !description && (!values || Object.keys(values).length <= 0)) {
                return Q.reject("At least one field value must be specified.");
            }
            var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
            return witapi.createWorkItem(null, patchDoc, project, wiType);
        });
    };
    WorkItemCreate.prototype.friendlyOutput = function (workItem) {
        return witBase.friendlyOutput([workItem]);
    };
    return WorkItemCreate;
}(witBase.WorkItemBase));
exports.WorkItemCreate = WorkItemCreate;
