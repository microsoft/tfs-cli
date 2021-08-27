"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var witBase = require("./default");
function getCommand(args) {
    return new WorkItemQuery(args);
}
exports.getCommand = getCommand;
var WorkItemQuery = (function (_super) {
    __extends(WorkItemQuery, _super);
    function WorkItemQuery() {
        _super.apply(this, arguments);
        this.description = "Get a list of Work Items given a query";
    }
    WorkItemQuery.prototype.getHelpArgs = function () {
        return ["project", "query"];
    };
    WorkItemQuery.prototype.exec = function () {
        var _this = this;
        var witApi = this.webApi.getWorkItemTrackingApi();
        return this.commandArgs.project.val(true).then(function (projectName) {
            return _this.commandArgs.query.val().then(function (query) {
                var wiql = { query: query };
                return witApi.queryByWiql(wiql, { project: projectName }).then(function (result) {
                    var workItemIds = result.workItems.map(function (val) { return val.id; }).slice(0, Math.min(200, result.workItems.length));
                    var fieldRefs = result.columns.map(function (val) { return val.referenceName; });
                    fieldRefs = fieldRefs.slice(0, Math.min(20, result.columns.length));
                    return witApi.getWorkItems(workItemIds, fieldRefs);
                });
            });
        });
    };
    WorkItemQuery.prototype.friendlyOutput = function (data) {
        return witBase.friendlyOutput(data);
    };
    return WorkItemQuery;
}(witBase.WorkItemBase));
exports.WorkItemQuery = WorkItemQuery;
