"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var args = require("../../lib/arguments");
var extBase = require("./default");
var extInfo = require("./_lib/extensioninfo");
var trace = require('../../lib/trace');
function getCommand(args) {
    return new ExtensionShare(args);
}
exports.getCommand = getCommand;
var ExtensionShare = (function (_super) {
    __extends(ExtensionShare, _super);
    function ExtensionShare(passedArgs) {
        _super.call(this, passedArgs);
        this.description = "Share a Visual Studio Services Extension with VSTS Accounts.";
        this.registerCommandArgument("shareWith", "Share with", "List of accounts with which to share the extension.", args.ArrayArgument);
    }
    ExtensionShare.prototype.getHelpArgs = function () {
        return ["publisher", "extensionId", "vsix", "shareWith"];
    };
    ExtensionShare.prototype.exec = function () {
        var _this = this;
        var galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);
        return this.commandArgs.vsix.val(true).then(function (vsixPath) {
            var extInfoPromise;
            if (vsixPath !== null) {
                extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
            }
            else {
                extInfoPromise = Promise.all([_this.commandArgs.publisher.val(), _this.commandArgs.extensionId.val()]).then(function (values) {
                    var publisher = values[0], extension = values[1];
                    return extInfo.getExtInfo(null, extension, publisher);
                });
            }
            return extInfoPromise.then(function (extInfo) {
                return _this.commandArgs.shareWith.val().then(function (shareWith) {
                    var sharePromises = [];
                    shareWith.forEach(function (account) {
                        sharePromises.push(galleryApi.shareExtension(extInfo.publisher, extInfo.id, account));
                    });
                    return Promise.all(sharePromises).then(function () { return shareWith; });
                });
            });
        });
    };
    ExtensionShare.prototype.friendlyOutput = function (data) {
        trace.success("\n=== Completed operation: share extension ===");
        trace.info(" - Shared with:");
        data.forEach(function (acct) {
            trace.info("   - " + acct);
        });
    };
    return ExtensionShare;
}(extBase.ExtensionBase));
exports.ExtensionShare = ExtensionShare;
