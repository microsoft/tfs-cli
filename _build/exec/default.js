"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../lib/tfcommand");
function getCommand(args) {
    return new DefaultCommand(args);
}
exports.getCommand = getCommand;
var DefaultCommand = (function (_super) {
    __extends(DefaultCommand, _super);
    function DefaultCommand(passedArgs) {
        _super.call(this, passedArgs, false);
    }
    DefaultCommand.prototype.exec = function (cmd) {
        return this.getHelp(cmd);
    };
    return DefaultCommand;
}(tfcommand_1.TfCommand));
exports.DefaultCommand = DefaultCommand;
