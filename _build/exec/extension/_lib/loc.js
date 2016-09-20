"use strict";
var vsix_manifest_builder_1 = require("./vsix-manifest-builder");
var _ = require("lodash");
var fs = require("fs");
var trace = require("../../../lib/trace");
var mkdirp = require('mkdirp');
var path = require("path");
var Q = require("q");
var LocPrep;
(function (LocPrep) {
    /**
     * Creates a deep copy of document, replacing resource keys with the values from
     * the resources object.
     * If a resource cannot be found, the same string from the defaults document will be substituted.
     * The defaults object must have the same structure/schema as document.
     */
    function makeReplacements(document, resources, defaults) {
        var locDocument = _.isArray(document) ? [] : {};
        for (var key in document) {
            if (propertyIsComment(key)) {
                continue;
            }
            else if (_.isObject(document[key])) {
                locDocument[key] = makeReplacements(document[key], resources, defaults);
            }
            else if (_.isString(document[key]) && _.startsWith(document[key], "resource:")) {
                var resourceKey = document[key].substr("resource:".length).trim();
                var replacement = resources[resourceKey];
                if (!_.isString(replacement)) {
                    replacement = defaults[resourceKey];
                    trace.warn("Could not find a replacement for resource key %s. Falling back to '%s'.", resourceKey, replacement);
                }
                locDocument[key] = replacement;
            }
            else {
                locDocument[key] = document[key];
            }
        }
        return locDocument;
    }
    LocPrep.makeReplacements = makeReplacements;
    /**
     * If the resjsonPath setting is set...
     * Check if the path exists. If it does, check if it's a directory.
     * If it's a directory, write to path + extension.resjson
     * All other cases just write to path.
     */
    function writeResourceFile(fullResjsonPath, resources) {
        return Q.Promise(function (resolve, reject, notify) {
            fs.exists(fullResjsonPath, function (exists) {
                resolve(exists);
            });
        }).then(function (exists) {
            if (exists) {
                return Q.nfcall(fs.lstat, fullResjsonPath).then(function (obj) {
                    return obj.isDirectory();
                }).then(function (isDir) {
                    if (isDir) {
                        return path.join(fullResjsonPath, "extension.resjson");
                    }
                    else {
                        return fullResjsonPath;
                    }
                });
            }
            else {
                return Q.resolve(fullResjsonPath);
            }
        }).then(function (determinedPath) {
            return Q.nfcall(mkdirp, path.dirname(determinedPath)).then(function () {
                return Q.nfcall(fs.writeFile, determinedPath, JSON.stringify(resources, null, 4), "utf8");
            });
        });
    }
    LocPrep.writeResourceFile = writeResourceFile;
    function propertyIsComment(property) {
        return _.startsWith(property, "_") && _.endsWith(property, ".comment");
    }
    LocPrep.propertyIsComment = propertyIsComment;
    var LocKeyGenerator = (function () {
        function LocKeyGenerator(manifestBuilders) {
            this.manifestBuilders = manifestBuilders;
            this.initStringObjs();
            // find the vsixmanifest and pull it out because we treat it a bit differently
            var vsixManifest = manifestBuilders.filter(function (b) { return b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType; });
            if (vsixManifest.length === 1) {
                this.vsixManifestBuilder = vsixManifest[0];
            }
            else {
                throw "Found " + vsixManifest.length + " vsix manifest builders (expected 1). Something is not right!";
            }
        }
        LocKeyGenerator.prototype.initStringObjs = function () {
            var _this = this;
            this.resourceFileMap = {};
            this.manifestBuilders.forEach(function (b) {
                _this.resourceFileMap[b.getType()] = {};
            });
            this.combined = {};
        };
        /**
         * Destructive method modifies the manifests by replacing i18nable strings with resource:
         * keys. Adds all the original resources to the resources object.
         */
        LocKeyGenerator.prototype.generateLocalizationKeys = function () {
            var _this = this;
            this.initStringObjs();
            this.manifestBuilders.forEach(function (builder) {
                if (builder.getType() !== vsix_manifest_builder_1.VsixManifestBuilder.manifestType) {
                    _this.jsonReplaceWithKeysAndGenerateDefaultStrings(builder);
                }
            });
            this.vsixGenerateDefaultStrings();
            return {
                manifestResources: this.resourceFileMap,
                combined: this.generateCombinedResourceFile()
            };
        };
        LocKeyGenerator.prototype.generateCombinedResourceFile = function () {
            var _this = this;
            var combined = {};
            var resValues = Object.keys(this.resourceFileMap).map(function (k) { return _this.resourceFileMap[k]; });
            // the .d.ts file falls short in this case
            var anyAssign = _.assign;
            anyAssign.apply(void 0, [combined].concat(resValues));
            return combined;
        };
        LocKeyGenerator.prototype.addResource = function (builderType, sourceKey, resourceKey, obj) {
            var resourceVal = this.removeI18nPrefix(obj[sourceKey]);
            this.resourceFileMap[builderType][resourceKey] = resourceVal;
            var comment = obj["_" + sourceKey + ".comment"];
            if (comment) {
                this.resourceFileMap[builderType]["_" + resourceKey + ".comment"] = comment;
            }
            obj[sourceKey] = "resource:" + resourceKey;
        };
        LocKeyGenerator.prototype.removeI18nPrefix = function (str) {
            if (_.startsWith(str, LocKeyGenerator.I18N_PREFIX)) {
                return str.substr(LocKeyGenerator.I18N_PREFIX.length);
            }
            return str;
        };
        LocKeyGenerator.prototype.vsixGenerateDefaultStrings = function () {
            var vsixManifest = this.vsixManifestBuilder.getData();
            var displayName = this.removeI18nPrefix(_.get(vsixManifest, "PackageManifest.Metadata[0].DisplayName[0]"));
            var description = this.removeI18nPrefix(_.get(vsixManifest, "PackageManifest.Metadata[0].Description[0]._"));
            var releaseNotes = this.removeI18nPrefix(_.get(vsixManifest, "PackageManifest.Metadata[0].ReleaseNotes[0]"));
            var vsixRes = {};
            if (displayName) {
                vsixRes["displayName"] = displayName;
                _.set(vsixManifest, "PackageManifest.Metadata[0].DisplayName[0]", displayName);
            }
            if (displayName) {
                vsixRes["description"] = description;
                _.set(vsixManifest, "PackageManifest.Metadata[0].Description[0]._", description);
            }
            if (releaseNotes) {
                vsixRes["releaseNotes"] = releaseNotes;
                _.set(vsixManifest, "PackageManifest.Metadata[0].ReleaseNotes[0]", releaseNotes);
            }
            this.resourceFileMap[this.vsixManifestBuilder.getType()] = vsixRes;
        };
        LocKeyGenerator.prototype.jsonReplaceWithKeysAndGenerateDefaultStrings = function (builder, json, path) {
            if (json === void 0) { json = null; }
            if (path === void 0) { path = ""; }
            if (!json) {
                json = builder.getData();
            }
            for (var key in json) {
                var val = json[key];
                if (_.isObject(val)) {
                    var nextPath = builder.getLocKeyPath(path + key + ".");
                    while (_.endsWith(nextPath, ".")) {
                        nextPath = nextPath.substr(0, nextPath.length - 1);
                    }
                    this.jsonReplaceWithKeysAndGenerateDefaultStrings(builder, val, nextPath);
                }
                else if (_.isString(val) && _.startsWith(val, LocKeyGenerator.I18N_PREFIX)) {
                    this.addResource(builder.getType(), key, path + key, json);
                }
            }
        };
        LocKeyGenerator.I18N_PREFIX = "i18n:";
        return LocKeyGenerator;
    }());
    LocPrep.LocKeyGenerator = LocKeyGenerator;
})(LocPrep = exports.LocPrep || (exports.LocPrep = {}));
