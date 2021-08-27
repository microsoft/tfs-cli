"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var extBase = require("./default");
var publishUtils = require("./_lib/publish");
function getCommand(args) {
    return new ExtensionShow(args);
}
exports.getCommand = getCommand;
var ExtensionShow = (function (_super) {
    __extends(ExtensionShow, _super);
    function ExtensionShow() {
        _super.apply(this, arguments);
        this.description = "Show info about a published Visual Studio Services Extension.";
    }
    ExtensionShow.prototype.getHelpArgs = function () {
        return ["publisher", "extensionId", "vsix"];
    };
    ExtensionShow.prototype.exec = function () {
        var galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);
        return this.identifyExtension().then(function (extInfo) {
            var sharingMgr = new publishUtils.SharingManager({}, galleryApi, extInfo);
            return sharingMgr.getExtensionInfo();
        });
    };
    return ExtensionShow;
}(extBase.ExtensionBase));
exports.ExtensionShow = ExtensionShow;
