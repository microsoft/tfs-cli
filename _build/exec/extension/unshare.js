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
    // this just offers description for help and to offer sub commands
    return new ExtensionShare(args);
}
exports.getCommand = getCommand;
var ExtensionShare = (function (_super) {
    __extends(ExtensionShare, _super);
    function ExtensionShare(passedArgs) {
        _super.call(this, passedArgs);
        this.description = "Unshare a Visual Studio Services Extension with VSTS Accounts.";
        // Override this argument so we are prompted (e.g. no default provided)
        this.registerCommandArgument("unshareWith", "Un-share with", "List of accounts with which to un-share the extension", args.ArrayArgument);
    }
    ExtensionShare.prototype.getHelpArgs = function () {
        return ["publisher", "extensionId", "vsix", "unshareWith"];
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
                return _this.commandArgs.unshareWith.val().then(function (unshareWith) {
                    var sharePromises = [];
                    unshareWith.forEach(function (account) {
                        sharePromises.push(galleryApi.unshareExtension(extInfo.publisher, extInfo.id, account));
                    });
                    return Promise.all(sharePromises).then(function () { return unshareWith; });
                });
            });
        });
    };
    ExtensionShare.prototype.friendlyOutput = function (data) {
        trace.success("\n=== Completed operation: un-share extension ===");
        trace.info(" - Removed sharing from:");
        data.forEach(function (acct) {
            trace.info("   - " + acct);
        });
    };
    return ExtensionShare;
}(extBase.ExtensionBase));
exports.ExtensionShare = ExtensionShare;
