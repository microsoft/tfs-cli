"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var manifest_1 = require("../../manifest");
var _ = require("lodash");
var VsoManifestBuilder = (function (_super) {
    __extends(VsoManifestBuilder, _super);
    function VsoManifestBuilder() {
        _super.apply(this, arguments);
    }
    /**
     * Gets the package path to this manifest.
     */
    VsoManifestBuilder.prototype.getPath = function () {
        return "extension.vsomanifest";
    };
    /**
     * Explains the type of manifest builder
     */
    VsoManifestBuilder.prototype.getType = function () {
        return VsoManifestBuilder.manifestType;
    };
    VsoManifestBuilder.prototype.getContentType = function () {
        return "application/json";
    };
    VsoManifestBuilder.prototype.finalize = function (files) {
        // Ensure some default values are set
        if (!this.data.contributions) {
            this.data.contributions = [];
        }
        if (!this.data.scopes) {
            this.data.scopes = [];
        }
        if (!this.data.contributionTypes) {
            this.data.contributionTypes = [];
        }
        if (!this.data.manifestVersion) {
            this.data.manifestVersion = 1;
        }
        return Promise.resolve(null);
    };
    /**
     * Some elements of this file are arrays, which would typically produce a localization
     * key like "contributions.3.name". We want to turn the 3 into the contribution id to
     * make it more friendly to translators.
     */
    VsoManifestBuilder.prototype.getLocKeyPath = function (path) {
        var pathParts = path.split(".").filter(function (p) { return !!p; });
        if (pathParts && pathParts.length >= 2) {
            var cIndex = parseInt(pathParts[1]);
            if (pathParts[0] === "contributions" && !isNaN(cIndex) && this.data.contributions[cIndex] && this.data.contributions[cIndex].id) {
                return "contributions" + this.data.contributions[cIndex].id;
            }
            else {
                return path;
            }
        }
    };
    VsoManifestBuilder.prototype.processKey = function (key, value, override) {
        switch (key.toLowerCase()) {
            case "eventcallbacks":
                if (_.isObject(value)) {
                    this.singleValueProperty("eventCallbacks", value, key, override);
                }
                break;
            case "manifestversion":
                var version = value;
                if (_.isString(version)) {
                    version = parseFloat(version);
                }
                this.singleValueProperty("manifestVersion", version, key, override);
                break;
            case "scopes":
                if (_.isArray(value)) {
                    if (!this.data.scopes) {
                        this.data.scopes = [];
                    }
                    this.data.scopes = _.uniq(this.data.scopes.concat(value));
                }
                break;
            case "baseuri":
                this.singleValueProperty("baseUri", value, key, override);
                break;
            case "contributions":
                if (_.isArray(value)) {
                    if (!this.data.contributions) {
                        this.data.contributions = [];
                    }
                    this.data.contributions = this.data.contributions.concat(value);
                }
                else {
                    throw "\"contributions\" must be an array of Contribution objects.";
                }
                break;
            case "contributiontypes":
                if (_.isArray(value)) {
                    if (!this.data.contributionTypes) {
                        this.data.contributionTypes = [];
                    }
                    this.data.contributionTypes = this.data.contributionTypes.concat(value);
                }
                break;
            // Ignore all the vsixmanifest keys so we can take a default case below.
            case "namespace":
            case "extensionid":
            case "id":
            case "version":
            case "name":
            case "description":
            case "icons":
            case "screenshots":
            case "details":
            case "targets":
            case "links":
            case "branding":
            case "public":
            case "publisher":
            case "releasenotes":
            case "tags":
            case "flags":
            case "vsoflags":
            case "galleryflags":
            case "categories":
            case "files":
            case "githubflavoredmarkdown":
                break;
            default:
                if (key.substr(0, 2) !== "__") {
                    this.singleValueProperty(key, value, key, override);
                }
                break;
        }
    };
    VsoManifestBuilder.manifestType = "Microsoft.VisualStudio.Services.Manifest";
    return VsoManifestBuilder;
}(manifest_1.ManifestBuilder));
exports.VsoManifestBuilder = VsoManifestBuilder;
