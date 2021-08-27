"use strict";
var utils_1 = require("./utils");
var _ = require("lodash");
var common = require("../../../lib/common");
var os = require("os");
var path = require("path");
var trace = require('../../../lib/trace');
var ManifestBuilder = (function () {
    function ManifestBuilder(extRoot) {
        this.extRoot = extRoot;
        this.packageFiles = {};
        this.lcPartNames = {};
        this.data = {};
    }
    /**
     * Gets the path to the localized resource associated with this manifest
     */
    ManifestBuilder.prototype.getLocPath = function () {
        return this.getPath();
    };
    /**
     * Called just before the package is written to make any final adjustments.
     */
    ManifestBuilder.prototype.finalize = function (files, builders) {
        return Promise.resolve(null);
    };
    /**
     * Gives the manifest the chance to transform the key that is used when generating the localization
     * strings file. Path will be a dot-separated set of keys to address the string (or another
     * object/array) in question. See vso-manifest-builder for an example.
     */
    ManifestBuilder.prototype.getLocKeyPath = function (path) {
        return path;
    };
    /**
     * Write this manifest to a stream.
     */
    ManifestBuilder.prototype.getResult = function () {
        return JSON.stringify(utils_1.removeMetaKeys(this.data), null, 4).replace(/\n/g, os.EOL);
    };
    /**
     * Gets the contents of the file that will serve as localization for this asset.
     * Default implementation returns JSON with all strings replaced given by the translations/defaults objects.
     */
    ManifestBuilder.prototype.getLocResult = function (translations, defaults) {
        return JSON.stringify(this._getLocResult(this.expandResourceFile(translations), this.expandResourceFile(defaults)), null, 4);
    };
    ManifestBuilder.prototype._getLocResult = function (translations, defaults, locData, currentPath) {
        var _this = this;
        if (locData === void 0) { locData = {}; }
        if (currentPath === void 0) { currentPath = ""; }
        var currentData = currentPath ? _.get(this.data, currentPath) : this.data;
        // CurrentData should be guaranteed to be
        // This magically works for arrays too, just go with it.
        Object.keys(currentData).forEach(function (key) {
            var nextPath = currentPath + "." + key;
            if (_.isString(currentData[key])) {
                var translation = _.get(translations, nextPath);
                if (translation !== undefined) {
                    _.set(locData, nextPath, translation);
                }
                else {
                    var defaultString = _.get(defaults, nextPath);
                    if (defaultString !== undefined) {
                        _.set(locData, nextPath, defaultString);
                    }
                    else {
                        throw "Couldn't find a default string - this is definitely a bug.";
                    }
                }
            }
            else if (_.isObject(currentData[key])) {
                _this._getLocResult(translations, defaults, locData, nextPath);
            }
            else {
                // must be a number of boolean
                _.set(locData, nextPath, currentData[key]);
            }
        });
        return locData;
    };
    /**
     * Resource files are flat key-value pairs where the key is the json "path" to the original element.
     * This routine expands the resource files back into their original schema
     */
    ManifestBuilder.prototype.expandResourceFile = function (resources) {
        var expanded = {};
        Object.keys(resources).forEach(function (path) {
            _.set(expanded, path, resources[path]);
        });
        return expanded;
    };
    /**
     * Get the raw JSON data. Please do not modify it.
     */
    ManifestBuilder.prototype.getData = function () {
        return this.data;
    };
    Object.defineProperty(ManifestBuilder.prototype, "files", {
        /**
         * Get a list of files to be included in the package
         */
        get: function () {
            return this.packageFiles;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Set 'value' to data[path] in this manifest if it has not been set, or if override is true.
     * If it has been set, issue a warning.
     */
    ManifestBuilder.prototype.singleValueProperty = function (path, value, manifestKey, override) {
        if (override === void 0) { override = false; }
        var existingValue = _.get(this.data, path);
        if (!override && existingValue !== undefined) {
            trace.warn("Multiple values found for '%s'. Ignoring future occurrences and using the value '%s'.", manifestKey, JSON.stringify(existingValue, null, 4));
            return false;
        }
        else {
            _.set(this.data, path, value);
            return true;
        }
    };
    /**
     * Read a value as a delimited string or array and concat it to the existing list at data[path]
     */
    ManifestBuilder.prototype.handleDelimitedList = function (value, path, delimiter, uniq) {
        if (delimiter === void 0) { delimiter = ","; }
        if (uniq === void 0) { uniq = true; }
        if (_.isString(value)) {
            value = value.split(delimiter);
            _.remove(value, function (v) { return v === ""; });
        }
        var items = _.get(this.data, path, "").split(delimiter);
        _.remove(items, function (v) { return v === ""; });
        var val = items.concat(value);
        if (uniq) {
            val = _.uniq(val);
        }
        _.set(this.data, path, val.join(delimiter));
    };
    /**
     * Add a file to the vsix package
     */
    ManifestBuilder.prototype.addFile = function (file) {
        if (typeof file.assetType === "string") {
            file.assetType = [file.assetType];
        }
        file.path = utils_1.cleanAssetPath(file.path, this.extRoot);
        if (!file.partName) {
            file.partName = "/" + path.relative(this.extRoot, file.path);
        }
        if (!file.partName) {
            throw "Every file must have a path specified name.";
        }
        file.partName = utils_1.forwardSlashesPath(file.partName);
        // Default the assetType to the partName.
        if (file.addressable && !file.assetType) {
            file.assetType = [utils_1.toZipItemName(file.partName)];
        }
        if (this.packageFiles[file.path]) {
            if (_.isArray(this.packageFiles[file.path].assetType) && file.assetType) {
                file.assetType = (this.packageFiles[file.path].assetType).concat(file.assetType);
                this.packageFiles[file.path].assetType = file.assetType;
            }
        }
        // Files added recursively, i.e. from a directory, get lower
        // priority than those specified explicitly. Therefore, if
        // the file has already been added to the package list, don't
        // re-add (overwrite) with this file if it is an auto (from a dir)
        if (file.auto && this.packageFiles[file.path]) {
        }
        else {
            var existPartName = this.lcPartNames[file.partName.toLowerCase()];
            if (!existPartName || file.partName === existPartName) {
                // key off a guid if there is no file path.
                this.packageFiles[file.path || common.newGuid()] = file;
                this.lcPartNames[file.partName.toLowerCase()] = file.partName;
            }
            else {
                throw "All files in the package must have a case-insensitive unique filename. Trying to add " + file.partName + ", but " + existPartName + " was already added to the package.";
            }
        }
        if (file.contentType && this.packageFiles[file.path]) {
            this.packageFiles[file.path].contentType = file.contentType;
        }
    };
    return ManifestBuilder;
}());
exports.ManifestBuilder = ManifestBuilder;
