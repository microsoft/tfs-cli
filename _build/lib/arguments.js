"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require("lodash");
var common = require("../lib/common");
var diskcache_1 = require("../lib/diskcache");
var qfs = require("./qfs");
var path = require("path");
var qread = require("./qread");
/**
 * Class that represents an argument with a value. Calling .val() will retrieve
 * the typed value, parsed from the givenValue (a string). If no givenValue
 * was provided, we will prompt the user.
 */
var Argument = (function () {
    function Argument(name, friendlyName, description, givenValue, hasDefaultValue) {
        if (friendlyName === void 0) { friendlyName = name; }
        this.name = name;
        this.friendlyName = friendlyName;
        this.description = description;
        this.hasDefaultValue = hasDefaultValue;
        this.silent = false;
        if (typeof givenValue === "string") {
            this.givenValue = [givenValue];
        }
        else {
            this.givenValue = givenValue;
        }
        this.initialize();
    }
    /**
     * If this argument was given a default value:
     *   check the cache
     *     if it's there, set assignedValue to the getValue(cachedValue)
     *     else set assigned value to given default
     * If this argument was given a default value of null
     *   set null as the assignedValue
     * If this argument was not given any value
     *   check the cache
     *     if it's there, set assignedValue to cachedValue
     *
     * Promise is resolved after any values that need parsing are parsed,
     * and there are no more calls to the cache.
     */
    Argument.prototype.initialize = function () {
        var _this = this;
        var initPromise = Promise.resolve(null);
        if (this.assignedValue === undefined && (this.hasDefaultValue || this.givenValue === undefined)) {
            initPromise = getOptionsCache().then(function (cache) {
                var cacheKey = path.resolve().replace("/\.\[\]/g", "-") + "." +
                    common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
                var cachedValue = _.get(cache, cacheKey + "." + _this.name);
                var cachedValueStringArray;
                if (typeof cachedValue === "string") {
                    cachedValueStringArray = [cachedValue];
                }
                else if (_.isArray(cachedValue)) {
                    cachedValueStringArray = cachedValue;
                }
                if (cachedValue !== undefined) {
                    return _this.getValue(cachedValueStringArray).then(function (result) {
                        _this.initializeAssignedValue(result);
                    });
                }
                else if (_this.givenValue !== null && _this.givenValue !== undefined) {
                    return _this.getValue(_this.givenValue).then(function (result) {
                        _this.initializeAssignedValue(result);
                    });
                }
                else if (_this.givenValue === null) {
                    _this.initializeAssignedValue(null);
                }
            });
        }
        else if (this.assignedValue === undefined) {
            if (this.givenValue === null) {
                this.initializeAssignedValue(null);
            }
            else if (this.givenValue !== undefined) {
                initPromise = this.getValue(this.givenValue).then(function (result) {
                    _this.initializeAssignedValue(result);
                });
            }
        }
        this.initializePromise = initPromise;
        return initPromise;
    };
    Argument.prototype.initializeAssignedValue = function (val) {
        if (this.assignedValue === undefined) {
            this.assignedValue = val;
        }
    };
    /**
     * Override whatever exists and give this argument a value.
     */
    Argument.prototype.setValue = function (value) {
        this.assignedValue = value;
        this.initializePromise = Promise.resolve(null);
    };
    /**
     * Get the value of this argument by what was passed in. If nothing has
     * been passed in, prompt the user. The resulting promise is resolved
     * when a value is available.
     */
    Argument.prototype.val = function (noPrompt) {
        var _this = this;
        if (noPrompt === void 0) { noPrompt = false; }
        return this.initializePromise.then(function () {
            if (_this.assignedValue !== undefined) {
                return Promise.resolve(_this.assignedValue);
            }
            else {
                if (!noPrompt) {
                    if (common.NO_PROMPT) {
                        throw "Missing required value for argument '" + _this.name + "'.";
                    }
                    return qread.read(_this.name, _this.friendlyName, _this.silent).then(function (answer) {
                        // Split answer into args, just as if they were passed through command line
                        var splitAnswer = answer.match(/".+?"|[^ ]+/g) || [""];
                        var answerArgs = splitAnswer.map(function (a) {
                            // trim quotes if needed
                            if (a.substr(0, 1) === '"' && a.substr(a.length - 1, 1) === '"') {
                                a = a.substr(1, a.length - 1);
                            }
                            return a;
                        });
                        return _this.getValue(answerArgs).then(function (result) {
                            _this.assignedValue = result;
                            _this.hasDefaultValue = false;
                            return result;
                        });
                    });
                }
                else {
                    return Promise.resolve(null);
                }
            }
        });
    };
    return Argument;
}());
exports.Argument = Argument;
/**
 * Argument that represents an array of comma-separated strings.
 */
var ArrayArgument = (function (_super) {
    __extends(ArrayArgument, _super);
    function ArrayArgument() {
        _super.apply(this, arguments);
    }
    ArrayArgument.prototype.getValue = function (argParams) {
        if (argParams.length === 1) {
            var stripped = argParams[0].replace(/(^\[)|(\]$)/g, "");
            return Promise.resolve(stripped.split(",").map(function (s) { return s.trim(); }));
        }
        else {
            return Promise.resolve(argParams);
        }
    };
    return ArrayArgument;
}(Argument));
exports.ArrayArgument = ArrayArgument;
/**
 * Argument that represents a set of file paths.
 * @TODO: Better validation of valid/invalid file paths (FS call?)
 */
var FilePathsArgument = (function (_super) {
    __extends(FilePathsArgument, _super);
    function FilePathsArgument() {
        _super.apply(this, arguments);
    }
    FilePathsArgument.prototype.getValue = function (argParams) {
        return Promise.resolve(argParams.map(function (p) { return path.resolve(p); }));
    };
    return FilePathsArgument;
}(Argument));
exports.FilePathsArgument = FilePathsArgument;
/**
 * Argument that represents a set of existing file paths
 */
var ExistingFilePathsArgument = (function (_super) {
    __extends(ExistingFilePathsArgument, _super);
    function ExistingFilePathsArgument() {
        _super.apply(this, arguments);
    }
    ExistingFilePathsArgument.prototype.getValue = function (argParams) {
        return _super.prototype.getValue.call(this, argParams).then(function (paths) {
            var existencePromises = [];
            paths.forEach(function (p) {
                var promise = qfs.exists(p).then(function (exists) {
                    if (!exists) {
                        throw new Error("The file at path " + p + " does not exist.");
                    }
                    else {
                        return p;
                    }
                });
                existencePromises.push(promise);
            });
            return Promise.all(existencePromises);
        });
    };
    return ExistingFilePathsArgument;
}(FilePathsArgument));
exports.ExistingFilePathsArgument = ExistingFilePathsArgument;
/**
 * Argument that represents a set of writable file paths.
 * Paths that refer to existing files are checked for writability
 * Paths that refer to non-existent files are assumed writable.
 */
var WritableFilePathsArgument = (function (_super) {
    __extends(WritableFilePathsArgument, _super);
    function WritableFilePathsArgument() {
        _super.apply(this, arguments);
    }
    WritableFilePathsArgument.prototype.getValue = function (argParams) {
        return _super.prototype.getValue.call(this, argParams).then(function (paths) {
            var canWritePromises = [];
            paths.forEach(function (p) {
                var promise = qfs.canWriteTo(p).then(function (canWrite) {
                    if (canWrite) {
                        return p;
                    }
                    else {
                        throw new Error("The file at path " + p + " is not writable.");
                    }
                });
                canWritePromises.push(promise);
            });
            return Promise.all(canWritePromises);
        });
    };
    return WritableFilePathsArgument;
}(FilePathsArgument));
exports.WritableFilePathsArgument = WritableFilePathsArgument;
/**
 * Argument that represents a set of readable file paths
 */
var ReadableFilePathsArgument = (function (_super) {
    __extends(ReadableFilePathsArgument, _super);
    function ReadableFilePathsArgument() {
        _super.apply(this, arguments);
    }
    ReadableFilePathsArgument.prototype.getValue = function (argParams) {
        return _super.prototype.getValue.call(this, argParams).then(function (paths) {
            var canReadPromises = [];
            paths.forEach(function (p) {
                var promise = qfs.fileAccess(p, qfs.R_OK).then(function (canRead) {
                    if (canRead) {
                        return p;
                    }
                    else {
                        throw new Error("The file at path " + p + " is not readable.");
                    }
                });
                canReadPromises.push(promise);
            });
            return Promise.all(canReadPromises);
        });
    };
    return ReadableFilePathsArgument;
}(ExistingFilePathsArgument));
exports.ReadableFilePathsArgument = ReadableFilePathsArgument;
/**
 * Argument that represents a set of existing directory file paths
 */
var ExistingDirectoriesArgument = (function (_super) {
    __extends(ExistingDirectoriesArgument, _super);
    function ExistingDirectoriesArgument() {
        _super.apply(this, arguments);
    }
    ExistingDirectoriesArgument.prototype.getValue = function (argParams) {
        return _super.prototype.getValue.call(this, argParams).then(function (paths) {
            var isDirectoryPromises = [];
            paths.forEach(function (p) {
                var promise = qfs.lstat(p).then(function (stats) {
                    if (stats.isDirectory()) {
                        return p;
                    }
                    else {
                        throw new Error("The path " + p + " is not a directory.");
                    }
                });
                isDirectoryPromises.push(promise);
            });
            return Promise.all(isDirectoryPromises);
        });
    };
    return ExistingDirectoriesArgument;
}(ExistingFilePathsArgument));
exports.ExistingDirectoriesArgument = ExistingDirectoriesArgument;
/**
 * Argument that represents a boolean value.
 */
var BooleanArgument = (function (_super) {
    __extends(BooleanArgument, _super);
    function BooleanArgument() {
        _super.apply(this, arguments);
    }
    /**
     * If a value is given, parse it and cache the value.
     */
    BooleanArgument.prototype.initialize = function () {
        var _this = this;
        this.initializePromise = Promise.resolve(null);
        if (this.givenValue !== undefined) {
            if (this.givenValue === null) {
                this.assignedValue = false;
                this.initializePromise = Promise.resolve(null);
            }
            else {
                this.initializePromise = this.getValue(this.givenValue).then(function (result) {
                    _this.assignedValue = result;
                });
            }
        }
        return this.initializePromise;
    };
    /**
     * If there is no argument to this option, assume true.
     */
    BooleanArgument.prototype.getValue = function (argParams) {
        if (argParams.length === 1) {
            var yes = ["true", "1", "yes", "y"].indexOf(argParams[0].toLowerCase()) >= 0;
            if (yes) {
                return Promise.resolve(true);
            }
            var no = ["false", "0", "no", "n"].indexOf(argParams[0].toLowerCase()) >= 0;
            if (no) {
                return Promise.resolve(false);
            }
            throw new Error("'" + argParams[0] + "' is not a recognized Boolean value.");
        }
        else if (argParams.length === 0) {
            return Promise.resolve(true);
        }
        else {
            throw new Error("Multiple values provided for Boolean Argument " + this.name + ".");
        }
    };
    return BooleanArgument;
}(Argument));
exports.BooleanArgument = BooleanArgument;
/**
 * Argument that reprents an int value.
 */
var IntArgument = (function (_super) {
    __extends(IntArgument, _super);
    function IntArgument() {
        _super.apply(this, arguments);
    }
    IntArgument.prototype.getValue = function (argParams) {
        if (argParams.length === 1) {
            var parseResult = parseInt(argParams[0], 10);
            if (isNaN(parseResult)) {
                throw new Error("Could not parse int argument " + this.name + ".");
            }
            return Promise.resolve(parseResult);
        }
        else if (argParams.length === 0) {
            throw new Error("No number provided for Int Argument " + this.name + ".");
        }
        else {
            throw new Error("Multiple values provided for Int Argument " + this.name + ".");
        }
    };
    return IntArgument;
}(Argument));
exports.IntArgument = IntArgument;
/**
 * Argument that reprents a float value.
 */
var FloatArgument = (function (_super) {
    __extends(FloatArgument, _super);
    function FloatArgument() {
        _super.apply(this, arguments);
    }
    FloatArgument.prototype.getValue = function (argParams) {
        if (argParams.length === 1) {
            var parseResult = parseFloat(argParams[0]);
            if (isNaN(parseResult)) {
                throw new Error("Could not parse float argument " + this.name + ".");
            }
            return Promise.resolve(parseResult);
        }
        else if (argParams.length === 0) {
            throw new Error("No number provided for Float Argument " + this.name + ".");
        }
        else {
            throw new Error("Multiple values provided for Float Argument " + this.name + ".");
        }
    };
    return FloatArgument;
}(Argument));
exports.FloatArgument = FloatArgument;
/**
 * Argument that represents a block of JSON.
 * Note: This class must be extended with a concrete type before its constructor
 * function can be referenced. See exec/extensions/default.ts for an example.
 */
var JsonArgument = (function (_super) {
    __extends(JsonArgument, _super);
    function JsonArgument() {
        _super.apply(this, arguments);
    }
    JsonArgument.prototype.getValue = function (argParams) {
        try {
            return Promise.resolve(JSON.parse(argParams.join(" ")));
        }
        catch (parseError) {
            var info = parseError.stack || parseError.message;
            throw new Error("Failed to parse JSON argument " + this.name + ". Info: " + info);
        }
    };
    return JsonArgument;
}(Argument));
exports.JsonArgument = JsonArgument;
/**
 * Argument that represents a string. Multiple values are joined together
 * by a single space.
 */
var StringArgument = (function (_super) {
    __extends(StringArgument, _super);
    function StringArgument() {
        _super.apply(this, arguments);
    }
    StringArgument.prototype.getValue = function (argParams) {
        return Promise.resolve(argParams.join(" "));
    };
    return StringArgument;
}(Argument));
exports.StringArgument = StringArgument;
/**
 * Argument that represents a string, however, if we ever have to
 * prompt the user for the value of this argument, we do not echo
 * out the value as it is typed. Good for passwords, tokens, etc.
 */
var SilentStringArgument = (function (_super) {
    __extends(SilentStringArgument, _super);
    function SilentStringArgument() {
        _super.apply(this, arguments);
        this.silent = true;
    }
    return SilentStringArgument;
}(StringArgument));
exports.SilentStringArgument = SilentStringArgument;
function getOptionsCache() {
    var cache = new diskcache_1.DiskCache("tfx");
    return cache.itemExists("cache", "command-options").then(function (cacheExists) {
        var existingCache = Promise.resolve("{}");
        if (cacheExists) {
            existingCache = cache.getItem("cache", "command-options");
        }
        return existingCache.then(function (cacheStr) {
            try {
                return JSON.parse(cacheStr);
            }
            catch (ex) {
                return {};
            }
        });
    });
}
exports.getOptionsCache = getOptionsCache;
