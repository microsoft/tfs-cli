"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var extPub = require("../default");
function getCommand(args) {
    return new ExtensionPublisherBase(args);
}
exports.getCommand = getCommand;
var ExtensionPublisherBase = (function (_super) {
    __extends(ExtensionPublisherBase, _super);
    function ExtensionPublisherBase() {
        _super.apply(this, arguments);
        this.description = "Commands for managing Visual Studio Services Marketplace Publishers.";
    }
    ExtensionPublisherBase.prototype.exec = function (cmd) {
        return this.getHelp(cmd);
    };
    return ExtensionPublisherBase;
}(extPub.ExtensionBase));
exports.ExtensionPublisherBase = ExtensionPublisherBase;
