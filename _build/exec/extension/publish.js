"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var create_1 = require("./create");
var colors = require("colors");
var extBase = require("./default");
var Q = require("q");
var publishUtils = require("./_lib/publish");
var trace = require('../../lib/trace');
function getCommand(args) {
    return new ExtensionPublish(args);
}
exports.getCommand = getCommand;
var ExtensionPublish = (function (_super) {
    __extends(ExtensionPublish, _super);
    function ExtensionPublish() {
        _super.apply(this, arguments);
        this.description = "Publish a Visual Studio Marketplace Extension.";
    }
    ExtensionPublish.prototype.getHelpArgs = function () {
        return ["root", "manifests", "manifestGlobs", "override", "overridesFile", "bypassValidation", "publisher", "extensionId", "outputPath", "locRoot",
            "vsix", "shareWith"];
    };
    ExtensionPublish.prototype.exec = function () {
        var _this = this;
        var galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);
        var result = {};
        return this.getPublishSettings().then(function (publishSettings) {
            var extensionCreatePromise;
            if (publishSettings.vsixPath) {
                result.packaged = null;
                extensionCreatePromise = Q.resolve(publishSettings.vsixPath);
            }
            else {
                extensionCreatePromise = _this.getMergeSettings().then(function (mergeSettings) {
                    return _this.getPackageSettings().then(function (packageSettings) {
                        return create_1.createExtension(mergeSettings, packageSettings);
                    });
                }).then(function (createResult) {
                    result.packaged = createResult.path;
                    return createResult.path;
                });
            }
            return extensionCreatePromise.then(function (vsixPath) {
                publishSettings.vsixPath = vsixPath;
                var packagePublisher = new publishUtils.PackagePublisher(publishSettings, galleryApi);
                return packagePublisher.publish().then(function (ext) {
                    result.published = true;
                    if (publishSettings.shareWith && publishSettings.shareWith.length >= 0) {
                        var sharingMgr = new publishUtils.SharingManager(publishSettings, galleryApi);
                        return sharingMgr.shareWith(publishSettings.shareWith).then(function () {
                            result.shared = publishSettings.shareWith;
                            return result;
                        });
                    }
                    else {
                        result.shared = null;
                        return result;
                    }
                });
            });
        });
    };
    ExtensionPublish.prototype.friendlyOutput = function (data) {
        trace.info(colors.green("\n=== Completed operation: publish extension ==="));
        var packagingStr = data.packaged ? colors.green(data.packaged) : colors.yellow("not packaged (existing package used)");
        var publishingStr = data.published ? colors.green("success") : colors.yellow("???");
        var sharingStr = data.shared ? "shared with " + data.shared.map(function (s) { return colors.green(s); }).join(", ") : colors.yellow("not shared (use --share-with to share)");
        trace.info(" - Packaging: %s", packagingStr);
        trace.info(" - Publishing: %s", publishingStr);
        trace.info(" - Sharing: %s", sharingStr);
    };
    return ExtensionPublish;
}(extBase.ExtensionBase));
exports.ExtensionPublish = ExtensionPublish;
