"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../../lib/tfcommand");
var args = require("../../lib/arguments");
function getCommand(args) {
    return new BuildBase(args);
}
exports.getCommand = getCommand;
var BuildBase = (function (_super) {
    __extends(BuildBase, _super);
    function BuildBase() {
        _super.apply(this, arguments);
        this.description = "Commands for managing Builds.";
    }
    BuildBase.prototype.setCommandArgs = function () {
        _super.prototype.setCommandArgs.call(this);
        this.registerCommandArgument("definitionId", "Build Definition ID", "Identifies a build definition.", args.IntArgument, null);
        this.registerCommandArgument("definitionName", "Build Definition Name", "Name of a Build Definition.", args.StringArgument, null);
        this.registerCommandArgument("status", "Build Status", "Build status filter.", args.StringArgument, null);
        this.registerCommandArgument("top", "Number of builds", "Maximum number of builds to return.", args.IntArgument, null);
        this.registerCommandArgument("buildId", "Build ID", "Identifies a particular Build.", args.IntArgument);
    };
    BuildBase.prototype.exec = function (cmd) {
        return this.getHelp(cmd);
    };
    return BuildBase;
}(tfcommand_1.TfCommand));
exports.BuildBase = BuildBase;
