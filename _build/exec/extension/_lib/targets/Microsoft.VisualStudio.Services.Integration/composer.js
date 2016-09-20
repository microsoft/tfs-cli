"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var extension_composer_1 = require("../../extension-composer");
var vsix_manifest_builder_1 = require("../../vsix-manifest-builder");
var _ = require("lodash");
var VSSIntegrationComposer = (function (_super) {
    __extends(VSSIntegrationComposer, _super);
    function VSSIntegrationComposer() {
        _super.apply(this, arguments);
    }
    VSSIntegrationComposer.prototype.validate = function (components) {
        return _super.prototype.validate.call(this, components).then(function (result) {
            var vsixData = components.builders.filter(function (b) { return b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType; })[0].getData();
            // Ensure that an Action link or a Getstarted link exists.
            var properties = _.get(vsixData, "PackageManifest.Metadata[0].Properties[0].Property", []);
            var pIds = properties.map(function (p) { return _.get(p, "$.Id"); });
            if (_.intersection(["Microsoft.VisualStudio.Services.Links.Action", "Microsoft.VisualStudio.Services.Links.Getstarted"], pIds).length === 0) {
                result.push("An 'integration' extension must provide a 'getstarted' link.");
            }
            return result;
        });
    };
    return VSSIntegrationComposer;
}(extension_composer_1.ExtensionComposer));
exports.VSSIntegrationComposer = VSSIntegrationComposer;
