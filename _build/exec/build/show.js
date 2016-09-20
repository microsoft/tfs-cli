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
    return new BuildShow(args);
}
exports.getCommand = getCommand;
var BuildShow = (function (_super) {
    __extends(BuildShow, _super);
    function BuildShow() {
        _super.apply(this, arguments);
        this.description = "Show build details.";
    }
    BuildShow.prototype.getHelpArgs = function () {
        return ["project", "buildId"];
    };
    BuildShow.prototype.exec = function () {
        var _this = this;
        trace.debug("build-show.exec");
        var buildapi = this.webApi.getBuildApi();
        return this.commandArgs.project.val().then(function (project) {
            return _this.commandArgs.buildId.val().then(function (buildId) {
                return buildapi.getBuild(buildId, project);
            });
        });
    };
    BuildShow.prototype.friendlyOutput = function (build) {
        if (!build) {
            throw new Error("no build supplied");
        }
        trace.println();
        trace.info("id              : %s", build.id);
        trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
        trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
        trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
        trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
    };
    return BuildShow;
}(buildBase.BuildBase));
exports.BuildShow = BuildShow;
