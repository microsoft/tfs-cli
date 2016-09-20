"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var extension_composer_1 = require("../../extension-composer");
var vso_manifest_builder_1 = require("./vso-manifest-builder");
var Q = require("q");
var VSSExtensionComposer = (function (_super) {
    __extends(VSSExtensionComposer, _super);
    function VSSExtensionComposer() {
        _super.apply(this, arguments);
    }
    VSSExtensionComposer.prototype.getBuilders = function () {
        return _super.prototype.getBuilders.call(this).concat([new vso_manifest_builder_1.VsoManifestBuilder(this.settings.root)]);
    };
    VSSExtensionComposer.prototype.validate = function (components) {
        return _super.prototype.validate.call(this, components).then(function (result) {
            var data = components.builders.filter(function (b) { return b.getType() === vso_manifest_builder_1.VsoManifestBuilder.manifestType; })[0].getData();
            if (data.contributions.length === 0 && data.contributionTypes.length === 0) {
                result.push("Your extension must define at least one contribution or contribution type.");
            }
            return Q.resolve(result);
        });
    };
    return VSSExtensionComposer;
}(extension_composer_1.ExtensionComposer));
exports.VSSExtensionComposer = VSSExtensionComposer;
