"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../../lib/tfcommand");
var publish_1 = require("./_lib/publish");
var qfs_1 = require("../../lib/qfs");
var _ = require("lodash");
var args = require("../../lib/arguments");
var Q = require("q");
var trace = require("../../lib/trace");
function getCommand(args) {
    return new ExtensionBase(args);
}
exports.getCommand = getCommand;
var ManifestJsonArgument = (function (_super) {
    __extends(ManifestJsonArgument, _super);
    function ManifestJsonArgument() {
        _super.apply(this, arguments);
    }
    return ManifestJsonArgument;
}(args.JsonArgument));
exports.ManifestJsonArgument = ManifestJsonArgument;
var ExtensionBase = (function (_super) {
    __extends(ExtensionBase, _super);
    function ExtensionBase(passedArgs, serverCommand) {
        if (serverCommand === void 0) { serverCommand = true; }
        _super.call(this, passedArgs, serverCommand);
        this.description = "Commands to package, publish, and manage Extensions for Visual Studio Team Services.";
    }
    ExtensionBase.prototype.getHelpArgs = function () {
        return [];
    };
    ExtensionBase.prototype.setCommandArgs = function () {
        _super.prototype.setCommandArgs.call(this);
        this.registerCommandArgument("extensionId", "Extension ID", "Use this as the extension ID instead of what is specified in the manifest.", args.StringArgument);
        this.registerCommandArgument("publisher", "Publisher name", "Use this as the publisher ID instead of what is specified in the manifest.", args.StringArgument);
        this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, "https://marketplace.visualstudio.com");
        this.registerCommandArgument("manifests", "Manifests", "List of individual manifest files (space separated).", args.ArrayArgument, "vss-extension.json");
        this.registerCommandArgument("manifestGlobs", "Manifest globs", "List of globs to find manifests (space separated).", args.ArrayArgument, null);
        this.registerCommandArgument("outputPath", "Output path", "Path to write the VSIX.", args.StringArgument, "{auto}");
        this.registerCommandArgument("override", "Overrides JSON", "JSON string which is merged into the manifests, overriding any values.", ManifestJsonArgument, "{}");
        this.registerCommandArgument("overridesFile", "Overrides JSON file", "Path to a JSON file with overrides. This partial manifest will always take precedence over any values in the manifests.", args.ReadableFilePathsArgument, null);
        this.registerCommandArgument("shareWith", "Share with", "List of VSTS Accounts with which to share the extension (space separated).", args.ArrayArgument, null);
        this.registerCommandArgument("unshareWith", "Un-share with", "List of VSTS Accounts with which to un-share the extension (space separated).", args.ArrayArgument, null);
        this.registerCommandArgument("vsix", "VSIX path", "Path to an existing VSIX (to publish or query for).", args.ReadableFilePathsArgument);
        this.registerCommandArgument("bypassValidation", "Bypass local validation", null, args.BooleanArgument, "false");
        this.registerCommandArgument("locRoot", "Localization root", "Root of localization hierarchy (see README for more info).", args.ExistingDirectoriesArgument, null);
        this.registerCommandArgument("displayName", "Display name", null, args.StringArgument);
        this.registerCommandArgument("description", "Description", "Description of the Publisher.", args.StringArgument);
        this.registerCommandArgument("revVersion", "Rev version", "Rev the patch-version of the extension and save the result.", args.BooleanArgument, "false");
    };
    ExtensionBase.prototype.getMergeSettings = function () {
        return Promise.all([
            this.commandArgs.root.val(),
            this.commandArgs.manifests.val(),
            this.commandArgs.manifestGlobs.val(),
            this.commandArgs.override.val(),
            this.commandArgs.overridesFile.val(),
            this.commandArgs.revVersion.val(),
            this.commandArgs.bypassValidation.val(),
            this.commandArgs.publisher.val(true),
            this.commandArgs.extensionId.val(true)
        ]).then(function (values) {
            var root = values[0], manifests = values[1], manifestGlob = values[2], override = values[3], overridesFile = values[4], revVersion = values[5], bypassValidation = values[6], publisher = values[7], extensionId = values[8];
            if (publisher) {
                _.set(override, "publisher", publisher);
            }
            if (extensionId) {
                _.set(override, "extensionid", extensionId);
            }
            var overrideFileContent = Q.resolve("");
            if (overridesFile && overridesFile.length > 0) {
                overrideFileContent = qfs_1.readFile(overridesFile[0], "utf-8");
            }
            return overrideFileContent.then(function (contentStr) {
                var content = contentStr;
                if (content === "") {
                    content = "{}";
                    if (overridesFile && overridesFile.length > 0) {
                        trace.warn("Overrides file was empty. No overrides will be imported from " + overridesFile[0]);
                    }
                }
                var mergedOverrides = {};
                var contentJSON = "";
                try {
                    contentJSON = JSON.parse(content);
                }
                catch (e) {
                    throw "Could not parse contents of " + overridesFile[0] + " as JSON. \n" + e;
                }
                _.merge(mergedOverrides, contentJSON, override);
                return {
                    root: root[0],
                    manifests: manifests,
                    manifestGlobs: manifestGlob,
                    overrides: mergedOverrides,
                    bypassValidation: bypassValidation,
                    revVersion: revVersion
                };
            });
        });
    };
    ExtensionBase.prototype.getPackageSettings = function () {
        return Promise.all([
            this.commandArgs.outputPath.val(),
            this.commandArgs.locRoot.val()
        ]).then(function (values) {
            var outputPath = values[0], locRoot = values[1];
            return {
                outputPath: outputPath,
                locRoot: locRoot && locRoot[0]
            };
        });
    };
    ExtensionBase.prototype.identifyExtension = function () {
        var _this = this;
        return this.commandArgs.vsix.val(true).then(function (result) {
            var vsixPath = _.isArray(result) ? result[0] : null;
            var infoPromise;
            if (!vsixPath) {
                infoPromise = Promise.all([_this.commandArgs.publisher.val(), _this.commandArgs.extensionId.val()]).then(function (values) {
                    var publisher = values[0], extensionId = values[1];
                    return publish_1.GalleryBase.getExtInfo({ extensionId: extensionId, publisher: publisher });
                });
            }
            else {
                infoPromise = Promise.all([
                    _this.commandArgs.publisher.val(true),
                    _this.commandArgs.extensionId.val(true)
                ]).then(function (values) {
                    var publisher = values[0], extensionId = values[1];
                    return publish_1.GalleryBase.getExtInfo({ vsixPath: vsixPath, publisher: publisher, extensionId: extensionId });
                });
            }
            return infoPromise;
        });
    };
    ExtensionBase.prototype.getPublishSettings = function () {
        return Promise.all([
            this.commandArgs.serviceUrl.val(),
            this.commandArgs.vsix.val(true),
            this.commandArgs.publisher.val(true),
            this.commandArgs.extensionId.val(true),
            this.commandArgs.shareWith.val()
        ]).then(function (values) {
            var marketUrl = values[0], vsix = values[1], publisher = values[2], extensionId = values[3], shareWith = values[4];
            var vsixPath = _.isArray(vsix) ? vsix[0] : null;
            return {
                galleryUrl: marketUrl,
                vsixPath: vsixPath,
                publisher: publisher,
                extensionId: extensionId,
                shareWith: shareWith
            };
        });
    };
    ExtensionBase.prototype.exec = function (cmd) {
        return this.getHelp(cmd);
    };
    return ExtensionBase;
}(tfcommand_1.TfCommand));
exports.ExtensionBase = ExtensionBase;
