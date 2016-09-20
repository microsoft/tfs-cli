"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var buildBase = require("./default");
var buildContracts = require("vso-node-api/interfaces/BuildInterfaces");
var trace = require("../../lib/trace");
function describe() {
    return "queue a build";
}
exports.describe = describe;
function getCommand(args) {
    return new BuildQueue(args);
}
exports.getCommand = getCommand;
var BuildQueue = (function (_super) {
    __extends(BuildQueue, _super);
    function BuildQueue() {
        _super.apply(this, arguments);
        this.description = "Queue a build.";
    }
    BuildQueue.prototype.getHelpArgs = function () {
        return ["project", "definitionId", "definitionName"];
    };
    BuildQueue.prototype.exec = function () {
        var _this = this;
        var buildapi = this.webApi.getBuildApi();
        return this.commandArgs.project.val().then(function (project) {
            return _this.commandArgs.definitionId.val(true).then(function (definitionId) {
                var definitionPromise;
                if (definitionId) {
                    definitionPromise = buildapi.getDefinition(definitionId, project);
                }
                else {
                    definitionPromise = _this.commandArgs.definitionName.val().then(function (definitionName) {
                        trace.debug("No definition id provided, Searching for definitions with name: " + definitionName);
                        return buildapi.getDefinitions(project, definitionName).then(function (definitions) {
                            if (definitions.length > 0) {
                                var definition = definitions[0];
                                return definition;
                            }
                            else {
                                trace.debug("No definition found with name " + definitionName);
                                throw new Error("No definition found with name " + definitionName);
                            }
                        });
                    });
                }
                return definitionPromise.then(function (definition) {
                    return _this._queueBuild(buildapi, definition, project);
                });
            });
        });
    };
    BuildQueue.prototype.friendlyOutput = function (build) {
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
    BuildQueue.prototype._queueBuild = function (buildapi, definition, project) {
        trace.debug("Queueing build...");
        var build = {
            definition: definition
        };
        return buildapi.queueBuild(build, project);
    };
    return BuildQueue;
}(buildBase.BuildBase));
exports.BuildQueue = BuildQueue;
