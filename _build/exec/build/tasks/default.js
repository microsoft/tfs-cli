"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var args = require("../../../lib/arguments");
var buildBase = require("../default");
function getCommand(args) {
    return new BuildTaskBase(args);
}
exports.getCommand = getCommand;
var BuildTaskBase = (function (_super) {
    __extends(BuildTaskBase, _super);
    function BuildTaskBase() {
        _super.apply(this, arguments);
        this.description = "Commands for managing Build Tasks.";
    }
    BuildTaskBase.prototype.setCommandArgs = function () {
        _super.prototype.setCommandArgs.call(this);
        this.registerCommandArgument("all", "All Tasks?", "Get all build tasks.", args.BooleanArgument, "false");
        this.registerCommandArgument("taskId", "Task ID", "Identifies a particular Build Task.", args.StringArgument);
        this.registerCommandArgument("taskPath", "Task path", "Local path to a Build Task.", args.ExistingDirectoriesArgument);
        this.registerCommandArgument("overwrite", "Overwrite?", "Overwrite existing Build Task.", args.BooleanArgument, "false");
        this.registerCommandArgument("taskName", "Task Name", "Name of the Build Task.", args.StringArgument);
        this.registerCommandArgument("friendlyName", "Friendly Task Name", null, args.StringArgument);
        this.registerCommandArgument("description", "Task Description", null, args.StringArgument);
        this.registerCommandArgument("author", "Task Author", null, args.StringArgument);
    };
    BuildTaskBase.prototype.exec = function (cmd) {
        return this.getHelp(cmd);
    };
    return BuildTaskBase;
}(buildBase.BuildBase));
exports.BuildTaskBase = BuildTaskBase;
