"use strict";
var Q = require('q');
var fs = require('fs');
var osHomedir = require('os-homedir');
var path = require('path');
var shell = require('shelljs');
var trace = require('./trace');
var DiskCache = (function () {
    function DiskCache(appName) {
        this.appName = appName;
    }
    DiskCache.prototype.getFilePath = function (store, name) {
        var storeFolder = path.join(osHomedir(), '.' + this.appName, store);
        shell.mkdir('-p', storeFolder);
        return path.join(storeFolder, '.' + name);
    };
    DiskCache.prototype.itemExists = function (store, name) {
        var defer = Q.defer();
        fs.exists(this.getFilePath(store, name), function (exists) {
            defer.resolve(exists);
        });
        return defer.promise;
    };
    DiskCache.prototype.getItem = function (store, name) {
        trace.debug('cache.getItem');
        var defer = Q.defer();
        var fp = this.getFilePath(store, name);
        trace.debugArea('read: ' + store + ':' + name, 'CACHE');
        trace.debugArea(fp, 'CACHE');
        fs.readFile(fp, function (err, contents) {
            if (err) {
                defer.reject(err);
                return;
            }
            var str = contents.toString();
            trace.debugArea(str, 'CACHE');
            defer.resolve(str);
        });
        return defer.promise;
    };
    DiskCache.prototype.setItem = function (store, name, data) {
        trace.debug('cache.setItem');
        var defer = Q.defer();
        var fp = this.getFilePath(store, name);
        trace.debugArea('write: ' + store + ':' + name + ':' + data, 'CACHE');
        trace.debugArea(fp, 'CACHE');
        fs.writeFile(fp, data, { flag: 'w' }, function (err) {
            if (err) {
                defer.reject(err);
                return;
            }
            trace.debugArea('written', 'CACHE');
            defer.resolve(null);
        });
        return defer.promise;
    };
    DiskCache.prototype.deleteItem = function (store, name) {
        var _this = this;
        return Q.Promise(function (resolve, reject) {
            fs.unlink(_this.getFilePath(store, name), function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(null);
                }
            });
        });
    };
    return DiskCache;
}());
exports.DiskCache = DiskCache;
function parseSettingsFile(settingsPath, noWarn) {
    trace.debug("diskcache.parseSettings");
    trace.debug("reading settings from %s", settingsPath);
    return Q.Promise(function (resolve, reject, notify) {
        try {
            if (fs.existsSync(settingsPath)) {
                var settingsStr = fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, "");
                var settingsJSON = void 0;
                try {
                    resolve(JSON.parse(settingsStr));
                }
                catch (err) {
                    trace.warn("Could not parse settings file as JSON. No settings were read from %s.", settingsPath);
                    resolve({});
                }
            }
            else {
                if (!noWarn) {
                    trace.warn("No settings file found at %s.", settingsPath);
                }
                resolve({});
            }
        }
        catch (err) {
            reject(err);
        }
    });
}
exports.parseSettingsFile = parseSettingsFile;
