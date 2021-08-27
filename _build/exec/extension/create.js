"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var merger_1 = require("./_lib/merger");
var vsix_manifest_builder_1 = require("./_lib/vsix-manifest-builder");
var vsix_writer_1 = require("./_lib/vsix-writer");
var colors = require("colors");
var extBase = require("./default");
var trace = require('../../lib/trace');
function getCommand(args) {
    return new ExtensionCreate(args);
}
exports.getCommand = getCommand;
function createExtension(mergeSettings, packageSettings) {
    return new merger_1.Merger(mergeSettings).merge().then(function (components) {
        return new vsix_writer_1.VsixWriter(packageSettings, components).writeVsix().then(function (outPath) {
            var vsixBuilders = components.builders.filter(function (b) { return b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType; });
            var vsixBuilder;
            if (vsixBuilders.length > 0) {
                vsixBuilder = vsixBuilders[0];
            }
            return {
                path: outPath,
                extensionId: vsixBuilder ? vsixBuilder.getExtensionId() : null,
                publisher: vsixBuilder ? vsixBuilder.getExtensionPublisher() : null
            };
        });
    });
}
exports.createExtension = createExtension;
var ExtensionCreate = (function (_super) {
    __extends(ExtensionCreate, _super);
    function ExtensionCreate(passedArgs) {
        _super.call(this, passedArgs, false);
        this.description = "Create a vsix package for an extension.";
    }
    ExtensionCreate.prototype.getHelpArgs = function () {
        return ["root", "manifests", "manifestGlobs", "override", "overridesFile", "revVersion", "bypassValidation", "publisher", "extensionId", "outputPath", "locRoot"];
    };
    ExtensionCreate.prototype.exec = function () {
        var _this = this;
        return this.getMergeSettings().then(function (mergeSettings) {
            return _this.getPackageSettings().then(function (packageSettings) {
                return createExtension(mergeSettings, packageSettings);
            });
        });
    };
    ExtensionCreate.prototype.friendlyOutput = function (data) {
        trace.info(colors.green("\n=== Completed operation: create extension ==="));
        trace.info(" - VSIX: %s", data.path);
        trace.info(" - Extension ID: %s", data.extensionId);
        trace.info(" - Publisher: %s", data.publisher);
    };
    return ExtensionCreate;
}(extBase.ExtensionBase));
exports.ExtensionCreate = ExtensionCreate;
