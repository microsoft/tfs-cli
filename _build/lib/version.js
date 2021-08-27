"use strict";
var common = require("./common");
var path = require("path");
var Q = require("q");
var SemanticVersion = (function () {
    function SemanticVersion(major, minor, patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
        if (major < 0 || minor < 0 || patch < 0) {
            throw "Version numbers must be positive.";
        }
        if (major === 0 && minor === 0 && patch === 0) {
            throw "Version must be greater than 0.0.0";
        }
    }
    /**
     * Parse a Semantic Version from a string.
     */
    SemanticVersion.parse = function (version) {
        try {
            var spl = version.split(".").map(function (v) { return parseInt(v); });
            if (spl.length === 3 && !spl.some(function (e) { return isNaN(e); })) {
                return new SemanticVersion(spl[0], spl[1], spl[2]);
            }
            else {
                throw "";
            }
        }
        catch (e) {
            throw "Could not parse '" + version + "' as a Semantic Version.";
        }
    };
    /**
     * Return a string-representation of this semantic version, e.g. 2.10.5
     */
    SemanticVersion.prototype.toString = function () {
        return [this.major, this.minor, this.patch].join(".");
    };
    /**
     * Return -1 if this version is less than other,
     * 1 if this version is greater than other,
     * and 0 if they are equal.
     */
    SemanticVersion.prototype.compareTo = function (other) {
        if (this.major < other.major) {
            return -1;
        }
        if (this.major > other.major) {
            return 1;
        }
        if (this.minor < other.minor) {
            return -1;
        }
        if (this.minor > other.minor) {
            return 1;
        }
        if (this.patch < other.patch) {
            return -1;
        }
        if (this.patch > other.patch) {
            return 1;
        }
        return 0;
    };
    return SemanticVersion;
}());
exports.SemanticVersion = SemanticVersion;
function getTfxVersion() {
    var packageJson = require(path.join(common.APP_ROOT, "package.json"));
    return Q.resolve(SemanticVersion.parse(packageJson.version));
}
exports.getTfxVersion = getTfxVersion;
