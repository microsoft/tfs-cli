"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tfcommand_1 = require("../lib/tfcommand");
var diskcache_1 = require("../lib/diskcache");
var credstore_1 = require("../lib/credstore");
var colors = require("colors");
var Q = require('q');
var os = require('os');
var trace = require('../lib/trace');
function getCommand(args) {
    // this just offers description for help and to offer sub commands
    return new Login(args);
}
exports.getCommand = getCommand;
/**
 * Facilitates a "log in" to a service by caching credentials.
 */
var Login = (function (_super) {
    __extends(Login, _super);
    function Login() {
        _super.apply(this, arguments);
        this.description = "Login and cache credentials using a PAT or basic auth.";
    }
    Login.prototype.exec = function () {
        var _this = this;
        trace.debug('Login.exec');
        var authHandler;
        return this.commandArgs.serviceUrl.val().then(function (collectionUrl) {
            return _this.getCredentials(collectionUrl, false).then(function (handler) {
                authHandler = handler;
                return _this.getWebApi();
            }).then(function (webApi) {
                var agentApi = webApi.getTaskAgentApi();
                return Q.Promise(function (resolve, reject) {
                    return agentApi.connect().then(function (obj) {
                        var tfxCredStore = credstore_1.getCredentialStore("tfx");
                        var tfxCache = new diskcache_1.DiskCache("tfx");
                        var credString;
                        if (authHandler.username === "OAuth") {
                            credString = "pat:" + authHandler.password;
                        }
                        else {
                            credString = "basic:" + authHandler.username + ":" + authHandler.password;
                        }
                        return tfxCredStore.storeCredential(collectionUrl, "allusers", credString).then(function () {
                            return tfxCache.setItem("cache", "connection", collectionUrl);
                        });
                    }).catch(function (err) {
                        if (err && err.statusCode && err.statusCode === 401) {
                            trace.debug("Connection failed: invalid credentials.");
                            throw "Invalid credentials.";
                        }
                        else if (err) {
                            trace.debug("Connection failed.");
                            throw "Connection failed. Check your internet connection & collection URL." + os.EOL + "Message: " + err.message;
                        }
                    });
                });
            });
        });
    };
    Login.prototype.friendlyOutput = function (data) {
        if (data.success) {
            trace.info(colors.green("Logged in successfully"));
        }
        else {
            trace.error("login unsuccessful.");
        }
    };
    return Login;
}(tfcommand_1.TfCommand));
exports.Login = Login;
