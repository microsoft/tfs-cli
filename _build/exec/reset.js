"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../lib/tfcommand");
var diskcache_1 = require("../lib/diskcache");
var os_1 = require("os");
var args = require("../lib/arguments");
var path = require("path");
var trace = require("../lib/trace");
function getCommand(args) {
    return new Reset(args);
}
exports.getCommand = getCommand;
var Reset = (function (_super) {
    __extends(Reset, _super);
    function Reset(args) {
        _super.call(this, args, false);
        this.description = "Reset any saved options to their defaults.";
    }
    Reset.prototype.getHelpArgs = function () { return ["all"]; };
    Reset.prototype.setCommandArgs = function () {
        _super.prototype.setCommandArgs.call(this);
        this.registerCommandArgument("all", "All directories", "Pass this option to reset saved options for all directories.", args.BooleanArgument, "false");
    };
    Reset.prototype.exec = function () {
        return Promise.resolve(null);
    };
    Reset.prototype.dispose = function () {
        var currentPath = path.resolve();
        return this.commandArgs.all.val().then(function (allSettings) {
            return args.getOptionsCache().then(function (existingCache) {
                if (existingCache[currentPath]) {
                    existingCache[currentPath] = {};
                    return new diskcache_1.DiskCache("tfx").setItem("cache", "command-options", allSettings ? "" : JSON.stringify(existingCache, null, 4).replace(/\n/g, os_1.EOL));
                }
                else {
                    return Promise.resolve(null);
                }
            });
        });
    };
    Reset.prototype.friendlyOutput = function () {
        trace.success("Settings reset.");
    };
    return Reset;
}(tfcommand_1.TfCommand));
exports.Reset = Reset;
