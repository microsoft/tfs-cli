"use strict";
var extension_composer_factory_1 = require("./extension-composer-factory");
var _ = require("lodash");
var fs = require("fs");
var glob = require("glob");
var jsonInPlace = require("json-in-place");
var loc = require("./loc");
var path = require("path");
var Q = require("q");
var qfs = require("../../../lib/qfs");
var trace = require("../../../lib/trace");
var version = require("../../../lib/version");
/**
 * Facilitates the gathering/reading of partial manifests and creating the merged
 * manifests (one for each manifest builder)
 */
var Merger = (function () {
    /**
     * constructor. Instantiates one of each manifest builder.
     */
    function Merger(settings) {
        this.settings = settings;
        this.manifestBuilders = [];
    }
    Merger.prototype.gatherManifests = function () {
        var _this = this;
        trace.debug('merger.gatherManifests');
        if (this.settings.manifestGlobs && this.settings.manifestGlobs.length > 0) {
            var globs = this.settings.manifestGlobs.map(function (p) { return path.isAbsolute(p) ? p : path.join(_this.settings.root, p); });
            trace.debug('merger.gatherManifestsFromGlob');
            var promises = globs.map(function (pattern) { return Q.nfcall(glob, pattern); });
            return Promise.all(promises)
                .then(function (results) { return _.uniq(_.flatten(results)); })
                .then(function (results) {
                if (results.length > 0) {
                    trace.debug("Merging %s manifests from the following paths: ", results.length.toString());
                    results.forEach(function (path) { return trace.debug(path); });
                }
                else {
                    throw new Error("No manifests found from the following glob patterns: \n" + _this.settings.manifestGlobs.join("\n"));
                }
                return results;
            });
        }
        else {
            var manifests = this.settings.manifests;
            if (!manifests || manifests.length === 0) {
                return Q.reject("No manifests specified.");
            }
            this.settings.manifests = _.uniq(manifests).map(function (m) { return path.resolve(m); });
            trace.debug("Merging %s manifest%s from the following paths: ", manifests.length.toString(), manifests.length === 1 ? "" : "s");
            manifests.forEach(function (path) { return trace.debug(path); });
            return Q.resolve(this.settings.manifests);
        }
    };
    /**
     * Finds all manifests and merges them into two JS Objects: vsoManifest and vsixManifest
     * @return Q.Promise<SplitManifest> An object containing the two manifests
     */
    Merger.prototype.merge = function () {
        var _this = this;
        trace.debug('merger.merge');
        return this.gatherManifests().then(function (files) {
            var overridesProvided = false;
            var manifestPromises = [];
            files.forEach(function (file) {
                manifestPromises.push(Q.nfcall(fs.readFile, file, "utf8").then(function (data) {
                    var jsonData = data.replace(/^\uFEFF/, '');
                    try {
                        var result = JSON.parse(jsonData);
                        result.__origin = file; // save the origin in order to resolve relative paths later.
                        return result;
                    }
                    catch (err) {
                        trace.error("Error parsing the JSON in %s: ", file);
                        trace.debug(jsonData, null);
                        throw err;
                    }
                }));
            });
            // Add the overrides if necessary
            if (_this.settings.overrides) {
                overridesProvided = true;
                manifestPromises.push(Q.resolve(_this.settings.overrides));
            }
            return Promise.all(manifestPromises).then(function (partials) {
                // Determine the targets so we can construct the builders
                var targets = [];
                partials.forEach(function (partial) {
                    if (_.isArray(partial["targets"])) {
                        targets = targets.concat(partial["targets"]);
                    }
                });
                _this.extensionComposer = extension_composer_factory_1.ComposerFactory.GetComposer(_this.settings, targets);
                _this.manifestBuilders = _this.extensionComposer.getBuilders();
                var updateVersionPromise = Promise.resolve(null);
                partials.forEach(function (partial, partialIndex) {
                    // Rev the version if necessary
                    if (_this.settings.revVersion) {
                        if (partial["version"] && partial.__origin) {
                            try {
                                var semver = version.SemanticVersion.parse(partial["version"]);
                                var newVersion = new version.SemanticVersion(semver.major, semver.minor, semver.patch + 1);
                                var newVersionString_1 = newVersion.toString();
                                partial["version"] = newVersionString_1;
                                updateVersionPromise = qfs.readFile(partial.__origin, "utf8").then(function (versionPartial) {
                                    try {
                                        var newPartial = jsonInPlace(versionPartial).set("version", newVersionString_1);
                                        return qfs.writeFile(partial.__origin, newPartial);
                                    }
                                    catch (e) {
                                        trace.warn("Failed to lex partial as JSON to update the version. Skipping version rev...");
                                    }
                                });
                            }
                            catch (e) {
                                trace.warn("Could not parse %s as a semantic version (major.minor.patch). Skipping version rev...", partial["version"]);
                            }
                        }
                    }
                    // Transform asset paths to be relative to the root of all manifests, verify assets
                    if (_.isArray(partial["files"])) {
                        partial["files"].forEach(function (asset) {
                            var keys = Object.keys(asset);
                            if (keys.indexOf("path") < 0) {
                                throw new Error("Files must have an absolute or relative (to the manifest) path.");
                            }
                            var absolutePath;
                            if (path.isAbsolute(asset.path)) {
                                absolutePath = asset.path;
                            }
                            else {
                                absolutePath = path.join(path.dirname(partial.__origin), asset.path);
                            }
                            asset.path = path.relative(_this.settings.root, absolutePath);
                        });
                    }
                    // Transform icon paths as above
                    if (_.isObject(partial["icons"])) {
                        var icons_1 = partial["icons"];
                        Object.keys(icons_1).forEach(function (iconKind) {
                            var absolutePath = path.join(path.dirname(partial.__origin), icons_1[iconKind]);
                            icons_1[iconKind] = path.relative(_this.settings.root, absolutePath);
                        });
                    }
                    // Expand any directories listed in the files array
                    if (_.isArray(partial["files"])) {
                        for (var i = partial["files"].length - 1; i >= 0; --i) {
                            var fileDecl = partial["files"][i];
                            var fsPath = path.join(_this.settings.root, fileDecl.path);
                            if (fs.lstatSync(fsPath).isDirectory()) {
                                Array.prototype.splice.apply(partial["files"], [i, 1].concat(_this.pathToFileDeclarations(fsPath, _this.settings.root, fileDecl.addressable)));
                            }
                        }
                    }
                    // Process each key by each manifest builder.
                    Object.keys(partial).forEach(function (key) {
                        var isOverridePartial = partials.length - 1 === partialIndex && overridesProvided;
                        if (partial[key] !== undefined && (partial[key] !== null || isOverridePartial)) {
                            // Notify each manifest builder of the key/value pair
                            _this.manifestBuilders.forEach(function (builder) {
                                builder.processKey(key, partial[key], isOverridePartial);
                            });
                        }
                    });
                });
                // Generate localization resources
                var locPrepper = new loc.LocPrep.LocKeyGenerator(_this.manifestBuilders);
                var resources = locPrepper.generateLocalizationKeys();
                // Build up a master file list
                var packageFiles = {};
                _this.manifestBuilders.forEach(function (builder) {
                    _.assign(packageFiles, builder.files);
                });
                var components = { builders: _this.manifestBuilders, resources: resources };
                // Finalize each builder
                return Promise.all([updateVersionPromise].concat(_this.manifestBuilders.map(function (b) { return b.finalize(packageFiles, _this.manifestBuilders); }))).then(function () {
                    // Let the composer do validation
                    return _this.extensionComposer.validate(components).then(function (validationResult) {
                        if (validationResult.length === 0 || _this.settings.bypassValidation) {
                            return components;
                        }
                        else {
                            throw new Error("There were errors with your extension. Address the following and re-run the tool.\n" + validationResult);
                        }
                    });
                });
            });
        });
    };
    /**
     * Recursively converts a given path to a flat list of FileDeclaration
     * @TODO: Async.
     */
    Merger.prototype.pathToFileDeclarations = function (fsPath, root, addressable) {
        var _this = this;
        var files = [];
        if (fs.lstatSync(fsPath).isDirectory()) {
            trace.debug("Path '%s` is a directory. Adding all contained files (recursive).", fsPath);
            fs.readdirSync(fsPath).forEach(function (dirChildPath) {
                trace.debug("-- %s", dirChildPath);
                files = files.concat(_this.pathToFileDeclarations(path.join(fsPath, dirChildPath), root, addressable));
            });
        }
        else {
            var relativePath = path.relative(root, fsPath);
            files.push({ path: relativePath, partName: "/" + relativePath, auto: true, addressable: addressable });
        }
        return files;
    };
    return Merger;
}());
exports.Merger = Merger;
