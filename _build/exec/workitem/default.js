"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../../lib/tfcommand");
var args = require("../../lib/arguments");
var vssCoreContracts = require("vso-node-api/interfaces/common/VSSInterfaces");
var trace = require("../../lib/trace");
var os_1 = require("os");
var _ = require("lodash");
var WorkItemValuesJsonArgument = (function (_super) {
    __extends(WorkItemValuesJsonArgument, _super);
    function WorkItemValuesJsonArgument() {
        _super.apply(this, arguments);
    }
    return WorkItemValuesJsonArgument;
}(args.JsonArgument));
exports.WorkItemValuesJsonArgument = WorkItemValuesJsonArgument;
function getCommand(args) {
    return new WorkItemBase(args);
}
exports.getCommand = getCommand;
var WorkItemBase = (function (_super) {
    __extends(WorkItemBase, _super);
    function WorkItemBase() {
        _super.apply(this, arguments);
        this.description = "Commands for managing Work Items.";
    }
    WorkItemBase.prototype.setCommandArgs = function () {
        _super.prototype.setCommandArgs.call(this);
        this.registerCommandArgument("workItemId", "Work Item ID", "Identifies a particular Work Item.", args.IntArgument);
        this.registerCommandArgument("query", "Work Item Query (WIQL)", null, args.StringArgument);
        this.registerCommandArgument("workItemType", "Work Item Type", "Type of Work Item to create.", args.StringArgument);
        this.registerCommandArgument("assignedTo", "Assigned To", "Who to assign the Work Item to.", args.StringArgument);
        this.registerCommandArgument("title", "Work Item Title", "Title of the Work Item.", args.StringArgument);
        this.registerCommandArgument("description", "Work Item Description", "Description of the Work Item.", args.StringArgument);
        this.registerCommandArgument("values", "Work Item Values", "Mapping from field reference name to value to set on the workitem. (E.g. {\"system.assignedto\": \"Some Name\"})", WorkItemValuesJsonArgument, "{}");
    };
    WorkItemBase.prototype.exec = function (cmd) {
        return this.getHelp(cmd);
    };
    return WorkItemBase;
}(tfcommand_1.TfCommand));
exports.WorkItemBase = WorkItemBase;
function friendlyOutput(data) {
    if (!data) {
        throw new Error("no results");
    }
    var fieldsToIgnore = ["System.AreaLevel1", "System.IterationId", "System.IterationLevel1", "System.ExternalLinkCount", "System.AreaLevel1"];
    data.forEach(function (workItem) {
        trace.info(os_1.EOL);
        trace.info("System.Id:          " + workItem.id);
        trace.info("System.Rev:         " + workItem.rev);
        Object.keys(workItem.fields).forEach(function (arg) {
            if (!_.includes(fieldsToIgnore, arg)) {
                trace.info(arg + ":        " + workItem.fields[arg]);
            }
        });
    });
}
exports.friendlyOutput = friendlyOutput;
function buildWorkItemPatchDoc(title, assignedTo, description, values) {
    var patchDoc = [];
    // Check the convienience helpers for wit values
    if (title) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.Title",
            value: title,
            from: null
        });
    }
    if (assignedTo) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.AssignedTo",
            value: assignedTo,
            from: null
        });
    }
    if (description) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.Description",
            value: description,
            from: null
        });
    }
    // Set the field reference values
    Object.keys(values).forEach(function (fieldReference) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/" + fieldReference,
            value: values[fieldReference],
            from: null
        });
    });
    return patchDoc;
}
exports.buildWorkItemPatchDoc = buildWorkItemPatchDoc;
