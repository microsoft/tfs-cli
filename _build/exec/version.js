"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../lib/tfcommand");
var version = require("../lib/version");
var trace = require("../lib/trace");
function getCommand(args) {
    return new Version(args);
}
exports.getCommand = getCommand;
var Version = (function (_super) {
    __extends(Version, _super);
    function Version(args) {
        _super.call(this, args, false);
        this.description = "Output the version of this tool.";
    }
    Version.prototype.getHelpArgs = function () { return []; };
    Version.prototype.exec = function () {
        trace.debug("version.exec");
        return version.getTfxVersion();
    };
    Version.prototype.friendlyOutput = function (data) {
        trace.info("Version %s", data.toString());
    };
    return Version;
}(tfcommand_1.TfCommand));
exports.Version = Version;
