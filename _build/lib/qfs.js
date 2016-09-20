"use strict";
var fs = require("fs");
var Q = require("q");
// This is an fs lib that uses Q instead of callbacks.
exports.W_OK = fs.W_OK;
exports.R_OK = fs.R_OK;
exports.X_OK = fs.X_OK;
exports.F_OK = fs.F_OK;
function readdir(path) {
    return Q.nfcall(fs.readdir, path);
}
exports.readdir = readdir;
function exists(path) {
    return Q.Promise(function (resolve, reject, notify) {
        fs.exists(path, function (fileExists) {
            resolve(fileExists);
        });
    });
}
exports.exists = exists;
function lstat(path) {
    return Q.nfcall(fs.lstat, path);
}
exports.lstat = lstat;
function readFile(filename, options) {
    return Q.nfcall(fs.readFile, filename, options);
}
exports.readFile = readFile;
function writeFile(filename, data) {
    return Q.nfcall(fs.writeFile, filename, data);
}
exports.writeFile = writeFile;
;
//export function writeFile(filename: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;
/**
 * Returns a promise resolved true or false if a file is accessible
 * with the given mode (F_OK, R_OK, W_OK, X_OK)
 */
function fileAccess(path, mode) {
    if (mode === void 0) { mode = exports.F_OK; }
    return Q.Promise(function (resolve) {
        fs.access(path, mode, function (err) {
            if (err) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
exports.fileAccess = fileAccess;
/**
 * Given a valid path, resolves true if the file represented by the path
 * can be written to. Files that do not exist are assumed writable.
 */
function canWriteTo(path) {
    return exists(path).then(function (exists) {
        if (exists) {
            return fileAccess(path, fs.W_OK);
        }
        else {
            return true;
        }
    });
}
exports.canWriteTo = canWriteTo;
