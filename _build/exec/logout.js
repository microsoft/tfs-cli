"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../lib/tfcommand");
var diskcache_1 = require("../lib/diskcache");
var credStore = require("../lib/credstore");
var trace = require("../lib/trace");
function getCommand(args) {
    return new Reset(args);
}
exports.getCommand = getCommand;
var Reset = (function (_super) {
    __extends(Reset, _super);
    function Reset(args) {
        _super.call(this, args, false);
        this.description = "Log out and clear cached credential.";
    }
    Reset.prototype.getHelpArgs = function () { return []; };
    Reset.prototype.exec = function () {
        return Promise.resolve(null);
    };
    Reset.prototype.dispose = function () {
        var diskCache = new diskcache_1.DiskCache("tfx");
        return diskCache.itemExists("cache", "connection").then(function (isCachedConnection) {
            if (isCachedConnection) {
                return diskCache.getItem("cache", "connection").then(function (cachedConnection) {
                    var store = credStore.getCredentialStore("tfx");
                    return store.credentialExists(cachedConnection, "allusers").then(function (isCredential) {
                        if (isCredential) {
                            return store.clearCredential(cachedConnection, "allusers");
                        }
                        else {
                            return Promise.resolve(null);
                        }
                    });
                }).then(function () {
                    return diskCache.deleteItem("cache", "connection");
                });
            }
            else {
                return Promise.resolve(null);
            }
        });
    };
    Reset.prototype.friendlyOutput = function () {
        trace.success("Successfully logged out.");
    };
    return Reset;
}(tfcommand_1.TfCommand));
exports.Reset = Reset;
