"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var buildBase = require("./default");
var buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
var trace = require("../../lib/trace");
function getCommand(args) {
    return new BuildGetList(args);
}
exports.getCommand = getCommand;
var BuildGetList = (function (_super) {
    __extends(BuildGetList, _super);
    function BuildGetList() {
        _super.apply(this, arguments);
        this.description = "Get a list of builds.";
    }
    BuildGetList.prototype.getHelpArgs = function () {
        return ["definitionId", "definitionName", "status", "top", "project"];
    };
    BuildGetList.prototype.exec = function () {
        var _this = this;
        trace.debug("build-list.exec");
        var buildapi = this.webApi.getBuildApi();
        return Promise.all([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
            this.commandArgs.definitionName.val(),
            this.commandArgs.status.val(),
            this.commandArgs.top.val()
        ]).then(function (values) {
            var project = values[0], definitionId = values[1], definitionName = values[2], status = values[3], top = values[4];
            var definitions = null;
            if (definitionId) {
                definitions = [definitionId];
            }
            else if (definitionName) {
                trace.debug("No definition Id provided, checking for definitions with name " + definitionName);
                return buildapi.getDefinitions(project, definitionName).then(function (defs) {
                    if (defs.length > 0) {
                        definitions = [defs[0].id];
                        return _this._getBuilds(buildapi, project, definitions, buildContracts.BuildStatus[status], top);
                    }
                    else {
                        trace.debug("No definition found with name " + definitionName);
                        throw new Error("No definition found with name " + definitionName);
                    }
                });
            }
            return _this._getBuilds(buildapi, project, definitions, buildContracts.BuildStatus[status], top);
        });
    };
    BuildGetList.prototype.friendlyOutput = function (data) {
        if (!data) {
            throw new Error("no build supplied");
        }
        if (!(data instanceof Array)) {
            throw new Error("expected an array of builds");
        }
        data.forEach(function (build) {
            trace.println();
            trace.info("id              : %s", build.id);
            trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
            trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
            trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
            trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
        });
    };
    BuildGetList.prototype._getBuilds = function (buildapi, project, definitions, status, top) {
        // I promise that this was as painful to write as it is to read
        return buildapi.getBuilds(project, definitions, null, null, null, null, null, null, buildContracts.BuildStatus[status], null, null, null, top, null, null, null, null, null, null, null, null);
    };
    return BuildGetList;
}(buildBase.BuildBase));
exports.BuildGetList = BuildGetList;
