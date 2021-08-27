"use strict";
var vsix_manifest_builder_1 = require("./vsix-manifest-builder");
var _ = require("lodash");
var Q = require("q");
var ExtensionComposer = (function () {
    function ExtensionComposer(settings) {
        this.settings = settings;
    }
    ExtensionComposer.prototype.getBuilders = function () {
        return [new vsix_manifest_builder_1.VsixManifestBuilder(this.settings.root)];
    };
    /**
     * Return a string[] of validation errors
     */
    ExtensionComposer.prototype.validate = function (components) {
        // Take the validators and run each's method against the vsix manifest's data
        var errorMessages = Object.keys(ExtensionComposer.vsixValidators).map(function (path) { return ExtensionComposer.vsixValidators[path](_.get(components.builders.filter(function (b) { return b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType; })[0].getData(), path)); }).filter(function (r) { return !!r; });
        return Q.resolve(errorMessages);
    };
    // Basic/global extension validations.
    ExtensionComposer.vsixValidators = {
        "PackageManifest.Metadata[0].Identity[0].$.Id": function (value) {
            if (/^[A-z0-9_-]+$/.test(value)) {
                return null;
            }
            else {
                return "'extensionId' may only include letters, numbers, underscores, and dashes.";
            }
        },
        "PackageManifest.Metadata[0].Identity[0].$.Version": function (value) {
            if (typeof value === "string" && value.length > 0) {
                return null;
            }
            else {
                return "'version' must be provided.";
            }
        },
        "PackageManifest.Metadata[0].Description[0]._": function (value) {
            if (!value || value.length <= 200) {
                return null;
            }
            else {
                return "'description' must be less than 200 characters.";
            }
        },
        "PackageManifest.Metadata[0].DisplayName[0]": function (value) {
            if (typeof value === "string" && value.length > 0) {
                return null;
            }
            else {
                return "'name' must be provided.";
            }
        },
        "PackageManifest.Assets[0].Asset": function (value) {
            var usedAssetTypes = {};
            if (_.isArray(value)) {
                for (var i = 0; i < value.length; ++i) {
                    var asset = value[i].$;
                    if (asset) {
                        if (!asset.Path) {
                            return "All 'files' must include a 'path'.";
                        }
                        if (asset.Type && asset.Addressable) {
                            if (usedAssetTypes[asset.Type]) {
                                return "Cannot have multiple 'addressable' files with the same 'assetType'.\nFile1: " + usedAssetTypes[asset.Type] + ", File 2: " + asset.Path + " (asset type: " + asset.Type + ")";
                            }
                            else {
                                usedAssetTypes[asset.Type] = asset.Path;
                            }
                        }
                    }
                }
            }
            return null;
        },
        "PackageManifest.Metadata[0].Identity[0].$.Publisher": function (value) {
            if (typeof value === "string" && value.length > 0) {
                return null;
            }
            else {
                return "'publisher' must be provided.";
            }
        },
        "PackageManifest.Metadata[0].Categories[0]": function (value) {
            if (!value) {
                return null;
            }
            var categories = value.split(",");
            if (categories.length > 1) {
                return "For now, extensions are limited to a single category.";
            }
            var validCategories = [
                "Build and release",
                "Collaborate",
                "Code",
                "Test",
                "Plan and track",
                "Insights",
                "Integrate",
                "Developer samples"
            ];
            _.remove(categories, function (c) { return !c; });
            var badCategories = categories.filter(function (c) { return validCategories.indexOf(c) < 0; });
            return badCategories.length ? "The following categories are not valid: " + badCategories.join(", ") + ". Valid categories are: " + validCategories.join(", ") + "." : null;
        },
        "PackageManifest.Installation[0].InstallationTarget": function (value) {
            if (_.isArray(value) && value.length > 0) {
                return null;
            }
            return "Your manifest must include at least one 'target'.";
        }
    };
    return ExtensionComposer;
}());
exports.ExtensionComposer = ExtensionComposer;
