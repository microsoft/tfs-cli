"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var witBase = require("./default");
function getCommand(args) {
    return new WorkItemShow(args);
}
exports.getCommand = getCommand;
var WorkItemShow = (function (_super) {
    __extends(WorkItemShow, _super);
    function WorkItemShow() {
        _super.apply(this, arguments);
        this.description = "Show Work Item details.";
    }
    WorkItemShow.prototype.getHelpArgs = function () {
        return ["workItemId"];
    };
    WorkItemShow.prototype.exec = function () {
        var witapi = this.webApi.getWorkItemTrackingApi();
        return this.commandArgs.workItemId.val().then(function (workItemId) {
            return witapi.getWorkItem(workItemId);
        });
    };
    WorkItemShow.prototype.friendlyOutput = function (workItem) {
        return witBase.friendlyOutput([workItem]);
    };
    return WorkItemShow;
}(witBase.WorkItemBase));
exports.WorkItemShow = WorkItemShow;
