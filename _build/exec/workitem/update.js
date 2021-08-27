"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require("q");
var witBase = require("./default");
function getCommand(args) {
    return new WorkItemUpdate(args);
}
exports.getCommand = getCommand;
var WorkItemUpdate = (function (_super) {
    __extends(WorkItemUpdate, _super);
    function WorkItemUpdate() {
        _super.apply(this, arguments);
        this.description = "Update a Work Item.";
    }
    WorkItemUpdate.prototype.getHelpArgs = function () {
        return ["workItemId", "title", "assignedTo", "description", "values"];
    };
    WorkItemUpdate.prototype.exec = function () {
        var witapi = this.webApi.getWorkItemTrackingApi();
        return Promise.all([
            this.commandArgs.workItemId.val(),
            this.commandArgs.title.val(true),
            this.commandArgs.assignedTo.val(true),
            this.commandArgs.description.val(true),
            this.commandArgs.values.val(true)
        ]).then(function (promiseValues) {
            var workItemId = promiseValues[0], title = promiseValues[1], assignedTo = promiseValues[2], description = promiseValues[3], values = promiseValues[4];
            if (!title && !assignedTo && !description && (!values || Object.keys(values).length <= 0)) {
                return Q.reject("At least one field value must be specified.");
            }
            var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
            return witapi.updateWorkItem(null, patchDoc, workItemId);
        });
    };
    WorkItemUpdate.prototype.friendlyOutput = function (workItem) {
        return witBase.friendlyOutput([workItem]);
    };
    return WorkItemUpdate;
}(witBase.WorkItemBase));
exports.WorkItemUpdate = WorkItemUpdate;
