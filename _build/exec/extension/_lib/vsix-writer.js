"use strict";
var vsix_manifest_builder_1 = require("./vsix-manifest-builder");
var utils_1 = require("./utils");
var _ = require("lodash");
var fs = require("fs");
var mkdirp = require("mkdirp");
var os = require("os");
var path = require("path");
var Q = require("q");
var trace = require('../../../lib/trace');
var zip = require("jszip");
/**
 * Facilitates packaging the vsix and writing it to a file
 */
var VsixWriter = (function () {
    /**
     * constructor
     * @param any vsoManifest JS Object representing a vso manifest
     * @param any vsixManifest JS Object representing the XML for a vsix manifest
     */
    function VsixWriter(settings, components) {
        this.settings = settings;
        this.manifestBuilders = components.builders;
        this.resources = components.resources;
    }
    /**
     * If outPath is {auto}, generate an automatic file name.
     * Otherwise, try to determine if outPath is a directory (checking for a . in the filename)
     * If it is, generate an automatic filename in the given outpath
     * Otherwise, outPath doesn't change.
     */
    VsixWriter.prototype.getOutputPath = function (outPath) {
        // Find the vsix manifest, if it exists
        var vsixBuilders = this.manifestBuilders.filter(function (b) { return b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType; });
        var autoName = "extension.vsix";
        if (vsixBuilders.length === 1) {
            var vsixManifest = vsixBuilders[0].getData();
            var pub = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
            var ns = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Id");
            var version = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Version");
            autoName = pub + "." + ns + "-" + version + ".vsix";
        }
        if (outPath === "{auto}") {
            return path.resolve(autoName);
        }
        else {
            var basename = path.basename(outPath);
            if (basename.indexOf(".") > 0) {
                return path.resolve(outPath);
            }
            else {
                return path.resolve(path.join(outPath, autoName));
            }
        }
    };
    VsixWriter.validatePartName = function (partName) {
        var segments = partName.split("/");
        if (segments.length === 1 && segments[0] === "[Content_Types].xml") {
            return true;
        }
        // matches most invalid segments.
        var re = /(%2f)|(%5c)|(^$)|(%[^0-9a-f])|(%.[^0-9a-f])|(\.$)|([^a-z0-9._~%!$&'()*+,;=:@-])/i;
        return segments.filter(function (segment) { return re.test(segment); }).length === 0;
    };
    /**
     * Write a vsix package to the given file name
     */
    VsixWriter.prototype.writeVsix = function () {
        var _this = this;
        var outputPath = this.getOutputPath(this.settings.outputPath);
        var vsix = new zip();
        var builderPromises = [];
        this.manifestBuilders.forEach(function (builder) {
            // Avoid the error EMFILE: too many open files
            var addPackageFilesBatch = function (paths, numBatch, batchSize, deferred) {
                deferred = deferred || Q.defer();
                var readFilePromises = [];
                var start = numBatch * batchSize;
                var end = Math.min(paths.length, start + batchSize);
                var _loop_1 = function(i) {
                    var path_1 = paths[i];
                    var itemName = utils_1.toZipItemName(builder.files[path_1].partName);
                    if (!VsixWriter.validatePartName(itemName)) {
                        var eol = require("os").EOL;
                        throw "Part Name '" + itemName + "' is invalid. Please check the following: " + eol + "1. No whitespace or any of these characters: #^[]<>?" + eol + "2. Cannot end with a period." + eol + "3. No percent-encoded / or \\ characters. Additionally, % must be followed by two hex characters.";
                    }
                    if (itemName.indexOf(" "))
                        if (!builder.files[path_1].content) {
                            var readFilePromise = Q.nfcall(fs.readFile, path_1).then(function (result) {
                                vsix.file(itemName, result);
                            });
                            readFilePromises.push(readFilePromise);
                        }
                        else {
                            vsix.file(itemName, builder.files[path_1].content);
                            readFilePromises.push(Promise.resolve(null));
                        }
                };
                for (var i = start; i < end; i++) {
                    _loop_1(i);
                }
                Promise.all(readFilePromises).then(function () {
                    if (end < paths.length) {
                        // Next batch
                        addPackageFilesBatch(paths, numBatch + 1, batchSize, deferred);
                    }
                    else {
                        deferred.resolve(null);
                    }
                }).catch(function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            // Add the package files in batches
            var builderPromise = addPackageFilesBatch(Object.keys(builder.files), 0, VsixWriter.VSIX_ADD_FILES_BATCH_SIZE).then(function () {
                // Add the manifest itself
                vsix.file(utils_1.toZipItemName(builder.getPath()), builder.getResult());
            });
            builderPromises.push(builderPromise);
        });
        return Promise.all(builderPromises).then(function () {
            return _this.addResourceStrings(vsix);
        }).then(function () {
            trace.debug("Writing vsix to: %s", outputPath);
            return Q.nfcall(mkdirp, path.dirname(outputPath)).then(function () {
                var buffer = vsix.generate({
                    type: "nodebuffer",
                    compression: "DEFLATE"
                });
                return Q.nfcall(fs.writeFile, outputPath, buffer).then(function () { return outputPath; });
            });
        });
    };
    /**
     * For each folder F under the localization folder (--loc-root),
     * look for a resources.resjson file within F. If it exists, split the
     * resources.resjson into one file per manifest. Add
     * each to the vsix archive as F/<manifest_loc_path> and F/Extension.vsixlangpack
     */
    VsixWriter.prototype.addResourceStrings = function (vsix) {
        // Make sure locRoot is set, that it refers to a directory, and
        // iterate each subdirectory of that.
        if (!this.settings.locRoot) {
            return Promise.resolve(null);
        }
        var stringsPath = path.resolve(this.settings.locRoot);
        return Q.Promise(function (resolve, reject, notify) {
            fs.exists(stringsPath, function (exists) {
                resolve(exists);
            });
        }).then(function (exists) {
            if (exists) {
                return Q.nfcall(fs.lstat, stringsPath).then(function (stats) {
                    if (stats.isDirectory()) {
                        return true;
                    }
                });
            }
            else {
                return Q.resolve(false);
            }
        }).then(function (stringsFolderExists) {
            if (!stringsFolderExists) {
                return Promise.resolve(null);
            }
            return Q.nfcall(fs.readdir, stringsPath).then(function (files) {
                var promises = [];
                files.forEach(function (languageTag) {
                    var filePath = path.join(stringsPath, languageTag);
                    var promise = Q.nfcall(fs.lstat, filePath).then(function (fileStats) {
                        if (fileStats.isDirectory()) {
                            var resourcePath_1 = path.join(filePath, "resources.resjson");
                            return Q.Promise(function (resolve, reject, notify) {
                                fs.exists(resourcePath_1, function (exists) {
                                    resolve(exists);
                                });
                            }).then(function (exists) {
                                if (exists) {
                                }
                                else {
                                    return Promise.resolve(null);
                                }
                            });
                        }
                    });
                    promises.push(promise);
                });
                return Promise.all(promises);
            });
        });
    };
    VsixWriter.VSIX_ADD_FILES_BATCH_SIZE = 20;
    VsixWriter.VSO_MANIFEST_FILENAME = "extension.vsomanifest";
    VsixWriter.VSIX_MANIFEST_FILENAME = "extension.vsixmanifest";
    VsixWriter.CONTENT_TYPES_FILENAME = "[Content_Types].xml";
    VsixWriter.DEFAULT_XML_BUILDER_SETTINGS = {
        indent: "    ",
        newline: os.EOL,
        pretty: true,
        xmldec: {
            encoding: "utf-8",
            standalone: null,
            version: "1.0"
        }
    };
    return VsixWriter;
}());
exports.VsixWriter = VsixWriter;
