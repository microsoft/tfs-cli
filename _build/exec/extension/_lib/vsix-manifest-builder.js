"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var manifest_1 = require("./manifest");
var utils_1 = require("./utils");
var _ = require("lodash");
var childProcess = require("child_process");
var onecolor = require("onecolor");
var os = require("os");
var path = require("path");
var Q = require("q");
var trace = require("../../../lib/trace");
var winreg = require("winreg");
var VsixManifestBuilder = (function (_super) {
    __extends(VsixManifestBuilder, _super);
    function VsixManifestBuilder(extRoot) {
        _super.call(this, extRoot);
        _.set(this.data, "PackageManifest.$", {
            "Version": "2.0.0",
            "xmlns": "http://schemas.microsoft.com/developer/vsx-schema/2011",
            "xmlns:d": "http://schemas.microsoft.com/developer/vsx-schema-design/2011"
        });
        _.set(this.data, "PackageManifest.Metadata[0].Identity[0].$", { "Language": "en-US" });
        _.set(this.data, "PackageManifest.Dependencies", [""]);
    }
    /**
     * Explains the type of manifest builder
     */
    VsixManifestBuilder.prototype.getType = function () {
        return VsixManifestBuilder.manifestType;
    };
    VsixManifestBuilder.prototype.getContentType = function () {
        return "text/xml";
    };
    /**
     * Gets the package path to this manifest
     */
    VsixManifestBuilder.prototype.getPath = function () {
        return "extension.vsixmanifest";
    };
    /**
     * VSIX Manifest loc assets are vsixlangpack files.
     */
    VsixManifestBuilder.prototype.getLocPath = function () {
        return "Extension.vsixlangpack";
    };
    /**
     * Gets the contents of the vsixLangPack file for this manifest
     */
    VsixManifestBuilder.prototype.getLocResult = function (translations, defaults) {
        var langPack = this.generateVsixLangPack(translations, defaults);
        return utils_1.jsonToXml(langPack);
    };
    VsixManifestBuilder.prototype.generateVsixLangPack = function (translations, defaults) {
        return {
            VsixLanguagePack: {
                $: {
                    Version: "1.0.0",
                    xmlns: "http://schemas.microsoft.com/developer/vsx-schema-lp/2010"
                },
                LocalizedName: [translations["displayName"] || defaults["displayName"]],
                LocalizedDescription: [translations["description"] || defaults["description"]],
                LocalizedReleaseNotes: [translations["releaseNotes"] || defaults["releaseNotes"]],
                License: [null],
                MoreInfoUrl: [null]
            }
        };
    };
    /**
     * Add an asset: add a file to the vsix package and if there is an assetType on the
     * file, add an <Asset> entry in the vsixmanifest.
     */
    VsixManifestBuilder.prototype.addAsset = function (file) {
        this.addFile(file);
    };
    /**
     * Add an <Asset> entry to the vsixmanifest.
     */
    VsixManifestBuilder.prototype.addAssetToManifest = function (assetPath, type, addressable, lang) {
        var _this = this;
        if (addressable === void 0) { addressable = false; }
        if (lang === void 0) { lang = null; }
        var cleanAssetPath = utils_1.toZipItemName(assetPath);
        var types;
        if (typeof type === "string") {
            types = [type];
        }
        else {
            types = type;
        }
        types.forEach(function (type) {
            var asset = {
                "Type": type,
                "d:Source": "File",
                "Path": cleanAssetPath
            };
            if (addressable) {
                asset["Addressable"] = "true";
            }
            if (lang) {
                asset["Lang"] = lang;
            }
            var assetElem = _.get(_this.data, "PackageManifest.Assets[0].Asset", []);
            assetElem.push({
                "$": asset
            });
            _.set(_this.data, "PackageManifest.Assets[0].Asset", assetElem);
            if (type === "Microsoft.VisualStudio.Services.Icons.Default") {
                _.set(_this.data, "PackageManifest.Metadata[0].Icon[0]", cleanAssetPath);
            }
            if (type === "Microsoft.VisualStudio.Services.Content.License") {
                _.set(_this.data, "PackageManifest.Metadata[0].License[0]", cleanAssetPath);
            }
        });
    };
    /**
     * Add a property to the vsixmanifest.
     */
    VsixManifestBuilder.prototype.addProperty = function (id, value) {
        var defaultProperties = [];
        var existingProperties = _.get(this.data, "PackageManifest.Metadata[0].Properties[0].Property", defaultProperties);
        if (defaultProperties === existingProperties) {
            _.set(this.data, "PackageManifest.Metadata[0].Properties[0].Property", defaultProperties);
        }
        existingProperties.push({
            $: {
                Id: id,
                Value: value
            }
        });
    };
    /**
     * Given a key/value pair, decide how this effects the manifest
     */
    VsixManifestBuilder.prototype.processKey = function (key, value, override) {
        var _this = this;
        switch (key.toLowerCase()) {
            case "namespace":
            case "extensionid":
            case "id":
                if (_.isString(value)) {
                    this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Id", value, "namespace/extensionId/id", override);
                }
                break;
            case "version":
                this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Version", value, key, override);
                break;
            case "name":
                this.singleValueProperty("PackageManifest.Metadata[0].DisplayName[0]", value, key, override);
                break;
            case "description":
                _.set(this.data, "PackageManifest.Metadata[0].Description[0].$", { "xml:space": "preserve" });
                this.singleValueProperty("PackageManifest.Metadata[0].Description[0]._", value, key, override);
                break;
            case "icons":
                Object.keys(value).forEach(function (key) {
                    var iconType = _.startCase(key.toLowerCase());
                    var fileDecl = {
                        path: value[key],
                        addressable: true,
                        assetType: "Microsoft.VisualStudio.Services.Icons." + iconType
                    };
                    _this.addAsset(fileDecl);
                });
                break;
            case "screenshots":
                if (_.isArray(value)) {
                    var screenshotIndex_1 = 0;
                    value.forEach(function (screenshot) {
                        var fileDecl = {
                            path: screenshot.path,
                            addressable: true,
                            assetType: "Microsoft.VisualStudio.Services.Screenshots." + (++screenshotIndex_1),
                            contentType: screenshot.contentType
                        };
                        _this.addAsset(fileDecl);
                    });
                }
                break;
            case "content":
                Object.keys(value).forEach(function (key) {
                    var contentKey = _.startCase(key.toLowerCase());
                    if (value[key].path) {
                        var fileDecl = {
                            path: value[key].path,
                            addressable: true,
                            assetType: "Microsoft.VisualStudio.Services.Content." + contentKey
                        };
                        if (value[key].contentType) {
                            fileDecl.contentType = value[key].contentType;
                        }
                        _this.addAsset(fileDecl);
                    }
                    else {
                        trace.warn("Did not find 'path' property for content item '%s'. Ignoring.", key);
                    }
                });
                break;
            case "details":
                if (_.isObject(value) && value.path) {
                    var fileDecl = {
                        path: value.path,
                        addressable: true,
                        assetType: "Microsoft.VisualStudio.Services.Content.Details",
                        contentType: value.contentType
                    };
                    this.addAsset(fileDecl);
                }
                break;
            case "targets":
                if (_.isArray(value)) {
                    var existingTargets_1 = _.get(this.data, "PackageManifest.Installation[0].InstallationTarget", []);
                    value.forEach(function (target) {
                        if (!target.id) {
                            return;
                        }
                        var newTargetAttrs = {
                            Id: target.id
                        };
                        if (target.version) {
                            newTargetAttrs["Version"] = target.version;
                        }
                        existingTargets_1.push({
                            $: newTargetAttrs
                        });
                    });
                    _.set(this.data, "PackageManifest.Installation[0].InstallationTarget", existingTargets_1);
                }
                break;
            case "links":
                if (_.isObject(value)) {
                    Object.keys(value).forEach(function (linkType) {
                        var url = _.get(value, linkType + ".uri") || _.get(value, linkType + ".url");
                        if (url) {
                            var linkTypeCased = _.capitalize(_.camelCase(linkType));
                            _this.addProperty("Microsoft.VisualStudio.Services.Links." + linkTypeCased, url);
                        }
                        else {
                            trace.warn("'uri' property not found for link: '%s'... ignoring.", linkType);
                        }
                    });
                }
                break;
            case "repository":
                if (_.isObject(value)) {
                    var type = value.type, url = value.url;
                    if (!type) {
                        throw new Error("Repository must have a 'type' property.");
                    }
                    if (type !== "git") {
                        throw new Error("Currently 'git' is the only supported repository type.");
                    }
                    if (!url) {
                        throw new Error("Repository must contain a 'url' property.");
                    }
                    this.addProperty("Microsoft.VisualStudio.Services.Links.GitHub", url);
                }
                break;
            case "badges":
                if (_.isArray(value)) {
                    var existingBadges_1 = _.get(this.data, "PackageManifest.Metadata[0].Badges[0].Badge", []);
                    value.forEach(function (badge) {
                        existingBadges_1.push({
                            $: {
                                Link: badge.link,
                                ImgUri: badge.imgUri,
                                Description: badge.description
                            }
                        });
                    });
                    _.set(this.data, "PackageManifest.Metadata[0].Badges[0].Badge", existingBadges_1);
                }
                break;
            case "branding":
                if (_.isObject(value)) {
                    Object.keys(value).forEach(function (brandingType) {
                        var brandingTypeCased = _.capitalize(_.camelCase(brandingType));
                        var brandingValue = value[brandingType];
                        if (brandingTypeCased === "Color") {
                            try {
                                brandingValue = onecolor(brandingValue).hex();
                            }
                            catch (e) {
                                throw "Could not parse branding color as a valid color. Please use a hex or rgb format, e.g. #00ff00 or rgb(0, 255, 0)";
                            }
                        }
                        _this.addProperty("Microsoft.VisualStudio.Services.Branding." + brandingTypeCased, brandingValue);
                    });
                }
                break;
            case "githubflavoredmarkdown":
                if (typeof value !== "boolean") {
                    throw "Value for gitHubFlavoredMarkdown is invalid. Only boolean values are allowed.";
                }
                this.addProperty("Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown", value.toString());
            case "public":
                if (typeof value === "boolean") {
                    var flags = _.get(this.data, "PackageManifest.Metadata[0].GalleryFlags[0]", "").split(" ");
                    _.remove(flags, function (v) { return v === ""; });
                    if (value === true) {
                        flags.push("Public");
                    }
                    if (value === false) {
                        _.remove(flags, function (v) { return v === "Public"; });
                    }
                    _.set(this.data, "PackageManifest.Metadata[0].GalleryFlags[0]", _.uniq(flags).join(" "));
                }
                break;
            case "publisher":
                this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Publisher", value, key, override);
                break;
            case "releasenotes":
                this.singleValueProperty("PackageManifest.Metadata[0].ReleaseNotes[0]", value, key, override);
                break;
            case "tags":
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].Tags[0]");
                break;
            case "galleryflags":
                // Gallery Flags are space-separated since it's a Flags enum.
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].GalleryFlags[0]", " ", true);
                break;
            case "categories":
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].Categories[0]");
                break;
            case "files":
                if (_.isArray(value)) {
                    value.forEach(function (asset) {
                        _this.addAsset(asset);
                    });
                }
                break;
        }
    };
    /**
     * Get the id of the extension this vsixmanifest goes to
     */
    VsixManifestBuilder.prototype.getExtensionId = function () {
        return _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Id");
    };
    /**
     * Get the publisher this vsixmanifest goes to
     */
    VsixManifestBuilder.prototype.getExtensionPublisher = function () {
        return _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
    };
    /**
     * --Ensures an <Asset> entry is added for each file as appropriate
     * --Builds the [Content_Types].xml file
     */
    VsixManifestBuilder.prototype.finalize = function (files, builders) {
        var _this = this;
        // Default installation target to VSS if not provided (and log warning)
        var installationTarget = _.get(this.data, "PackageManifest.Installation[0].InstallationTarget");
        if (!(_.isArray(installationTarget) && installationTarget.length > 0)) {
            trace.warn("No 'target' provided. Defaulting to Microsoft.VisualStudio.Services.");
            _.set(this.data, "PackageManifest.Installation[0].InstallationTarget", [
                {
                    $: {
                        Id: "Microsoft.VisualStudio.Services"
                    }
                }
            ]);
        }
        Object.keys(files).forEach(function (fileName) {
            var file = files[fileName];
            // Add all assets to manifest except the vsixmanifest (duh)
            if (file.assetType && file.path !== _this.getPath()) {
                _this.addAssetToManifest(file.partName, file.assetType, file.addressable, file.lang);
            }
        });
        // Add the manifests as assets.
        builders.forEach(function (builder) {
            var builderType = builder.getType();
            if (builderType != VsixManifestBuilder.manifestType) {
                _this.addAssetToManifest(builder.getPath(), builder.getType(), true);
            }
        });
        // The vsixmanifest will be responsible for generating the [Content_Types].xml file
        // Obviously this is kind of strange, but hey ho.
        return this.genContentTypesXml(builders).then(function (result) {
            _this.addFile({
                path: null,
                content: result,
                partName: "/[Content_Types].xml"
            });
        });
    };
    /**
     * Gets the string representation (XML) of this manifest
     */
    VsixManifestBuilder.prototype.getResult = function () {
        return utils_1.jsonToXml(utils_1.removeMetaKeys(this.data)).replace(/\n/g, os.EOL);
    };
    /**
     * Generates the required [Content_Types].xml file for the vsix package.
     * This xml contains a <Default> entry for each different file extension
     * found in the package, mapping it to the appropriate MIME type.
     */
    VsixManifestBuilder.prototype.genContentTypesXml = function (builders) {
        var _this = this;
        var typeMap = VsixManifestBuilder.CONTENT_TYPE_MAP;
        trace.debug("Generating [Content_Types].xml");
        var contentTypes = {
            Types: {
                $: {
                    xmlns: "http://schemas.openxmlformats.org/package/2006/content-types"
                },
                Default: [],
                Override: []
            }
        };
        var windows = /^win/.test(process.platform);
        var contentTypePromise;
        var showWarningForExtensionMap = {};
        if (windows) {
            // On windows, check HKCR to get the content type of the file based on the extension
            var contentTypePromises_1 = [];
            var extensionlessFiles = [];
            var uniqueExtensions = _.uniq(Object.keys(this.files).map(function (f) {
                var extName = path.extname(f);
                var filename = path.basename(f);
                // Look in the best guess table. Or, default to text/plain if the file starts with a "."
                var bestGuess = VsixManifestBuilder.BEST_GUESS_CONTENT_TYPES[filename.toUpperCase()] || (filename[0] === "." ? "text/plain" : null);
                if (!extName && !_this.files[f].contentType && _this.files[f].addressable && !bestGuess) {
                    trace.warn("File %s does not have an extension, and its content-type is not declared. Defaulting to application/octet-stream.", path.resolve(f));
                    _this.files[f].contentType = "application/octet-stream";
                }
                else if (bestGuess) {
                    _this.files[f].contentType = bestGuess;
                }
                if (_this.files[f].contentType) {
                    // If there is an override for this file, ignore its extension
                    return "";
                }
                // Later, we will show warnings for extensions with unknown content types if there
                // was at least one file with this extension that was addressable.
                if (!showWarningForExtensionMap[extName] && _this.files[f].addressable) {
                    showWarningForExtensionMap[extName] = true;
                }
                return extName;
            }));
            uniqueExtensions.forEach(function (ext) {
                if (!ext.trim()) {
                    return;
                }
                if (typeMap[ext.toLowerCase()]) {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: typeMap[ext.toLowerCase()]
                        }
                    });
                    return;
                }
                var hkcrKey = new winreg({
                    hive: winreg.HKCR,
                    key: "\\" + ext.toLowerCase()
                });
                var regPromise = Q.ninvoke(hkcrKey, "get", "Content Type").then(function (type) {
                    trace.debug("Found content type for %s: %s.", ext, type.value);
                    var contentType = "application/octet-stream";
                    if (type) {
                        contentType = type.value;
                    }
                    return contentType;
                }).catch(function (err) {
                    if (showWarningForExtensionMap[ext]) {
                        trace.warn("Could not determine content type for extension %s. Defaulting to application/octet-stream. To override this, add a contentType property to this file entry in the manifest.", ext);
                    }
                    return "application/octet-stream";
                }).then(function (contentType) {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: contentType
                        }
                    });
                });
                contentTypePromises_1.push(regPromise);
            });
            contentTypePromise = Promise.all(contentTypePromises_1);
        }
        else {
            // If not on windows, run the file --mime-type command to use magic to get the content type.
            // If the file has an extension, rev a hit counter for that extension and the extension
            // If there is no extension, create an <Override> element for the element
            // For each file with an extension that doesn't match the most common type for that extension
            // (tracked by the hit counter), create an <Override> element.
            // Finally, add a <Default> element for each extension mapped to the most common type.
            var contentTypePromises_2 = [];
            var extTypeCounter_1 = {};
            Object.keys(this.files).filter(function (fileName) {
                return !_this.files[fileName].contentType;
            }).forEach(function (fileName) {
                var extension = path.extname(fileName);
                var mimePromise;
                if (typeMap[extension]) {
                    if (!extTypeCounter_1[extension]) {
                        extTypeCounter_1[extension] = {};
                    }
                    if (!extTypeCounter_1[extension][typeMap[extension]]) {
                        extTypeCounter_1[extension][typeMap[extension]] = [];
                    }
                    extTypeCounter_1[extension][typeMap[extension]].push(fileName);
                    mimePromise = Q.resolve(null);
                    return;
                }
                mimePromise = Q.Promise(function (resolve, reject, notify) {
                    var child = childProcess.exec("file --mime-type \"" + fileName + "\"", function (err, stdout, stderr) {
                        try {
                            if (err) {
                                reject(err);
                            }
                            var magicMime = _.trimEnd(stdout.substr(stdout.lastIndexOf(" ") + 1), "\n");
                            trace.debug("Magic mime type for %s is %s.", fileName, magicMime);
                            if (magicMime) {
                                if (extension) {
                                    if (!extTypeCounter_1[extension]) {
                                        extTypeCounter_1[extension] = {};
                                    }
                                    var hitCounters = extTypeCounter_1[extension];
                                    if (!hitCounters[magicMime]) {
                                        hitCounters[magicMime] = [];
                                    }
                                    hitCounters[magicMime].push(fileName);
                                }
                                else {
                                    if (!_this.files[fileName].contentType) {
                                        _this.files[fileName].contentType = magicMime;
                                    }
                                }
                            }
                            else {
                                if (stderr) {
                                    reject(stderr);
                                }
                                else {
                                    if (_this.files[fileName].addressable) {
                                        trace.warn("Could not determine content type for %s. Defaulting to application/octet-stream. To override this, add a contentType property to this file entry in the manifest.", fileName);
                                    }
                                    _this.files[fileName].contentType = "application/octet-stream";
                                }
                            }
                            resolve(null);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
                contentTypePromises_2.push(mimePromise);
            });
            contentTypePromise = Promise.all(contentTypePromises_2).then(function () {
                Object.keys(extTypeCounter_1).forEach(function (ext) {
                    var hitCounts = extTypeCounter_1[ext];
                    var bestMatch = utils_1.maxKey(hitCounts, (function (i) { return i.length; }));
                    Object.keys(hitCounts).forEach(function (type) {
                        if (type === bestMatch) {
                            return;
                        }
                        hitCounts[type].forEach(function (fileName) {
                            _this.files[fileName].contentType = type;
                        });
                    });
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: bestMatch
                        }
                    });
                });
            });
        }
        return contentTypePromise.then(function () {
            Object.keys(_this.files).forEach(function (filePath) {
                if (_this.files[filePath].contentType) {
                    contentTypes.Types.Override.push({
                        $: {
                            ContentType: _this.files[filePath].contentType,
                            PartName: "/" + utils_1.toZipItemName(_this.files[filePath].partName)
                        }
                    });
                }
            });
            // Add the Default entries for manifests.
            builders.forEach(function (builder) {
                var manifestExt = path.extname(builder.getPath());
                if (contentTypes.Types.Default.filter(function (t) { return t.$.Extension === manifestExt; }).length === 0) {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: manifestExt,
                            ContentType: builder.getContentType()
                        }
                    });
                }
            });
            return utils_1.jsonToXml(contentTypes).replace(/\n/g, os.EOL);
        });
    };
    /**
     * List of known file types to use in the [Content_Types].xml file in the VSIX package.
     */
    VsixManifestBuilder.CONTENT_TYPE_MAP = {
        ".md": "text/markdown",
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".bat": "application/bat",
        ".json": "application/json",
        ".vsixlangpack": "text/xml",
        ".vsixmanifest": "text/xml",
        ".vsomanifest": "application/json",
        ".ps1": "text/ps1",
        ".js": "application/javascript",
        ".css": "text/css"
    };
    VsixManifestBuilder.BEST_GUESS_CONTENT_TYPES = {
        "README": "text/plain",
        "LICENSE": "text/plain",
        "AUTHORS": "text/plain"
    };
    VsixManifestBuilder.manifestType = "vsix";
    return VsixManifestBuilder;
}(manifest_1.ManifestBuilder));
exports.VsixManifestBuilder = VsixManifestBuilder;
