"use strict";
var common = require("../lib/common");
var qfs = require("../lib/qfs");
var path = require("path");
var trace = require("../lib/trace");
/**
 * Load the module given by execPath and instantiate a TfCommand using args.
 * @param {string[]} execPath: path to the module to load. This module must implement CommandFactory.
 * @param {string[]} args: args to pass to the command factory to instantiate the TfCommand
 * @return {Q.Promise<TfCommand>} Promise that is resolved with the module's command
 */
function load(execPath, args) {
    trace.debug('loader.load');
    var commandModulePath = path.resolve(common.APP_ROOT, "exec", execPath.join("/"));
    return qfs.exists(commandModulePath).then(function (exists) {
        var resolveDefaultPromise = Promise.resolve(commandModulePath);
        if (exists) {
            // If this extensionless path exists, it should be a directory.
            // If the path doesn't exist, for now we assume that a file with a .js extension
            // exists (if it doens't, we will find out below).
            resolveDefaultPromise = qfs.lstat(commandModulePath).then(function (stats) {
                if (stats.isDirectory()) {
                    return path.join(commandModulePath, "default");
                }
                return commandModulePath;
            });
        }
        return resolveDefaultPromise.then(function (commandModulePath) {
            var commandModule;
            return qfs.exists(path.resolve(commandModulePath + ".js")).then(function (exists) {
                if (!exists) {
                    throw new Error(commandModulePath + " is not a recognized command. Run with --help to see available commands.");
                }
                try {
                    commandModule = require(commandModulePath);
                }
                catch (e) {
                    trace.error(commandModulePath + " could not be fully loaded as a tfx command.");
                    throw e;
                }
                if (!commandModule.getCommand) {
                    throw new Error("Command modules must export a function, getCommand, that takes no arguments and returns an instance of TfCommand");
                }
                return Promise.resolve(commandModule.getCommand(args));
            });
        });
    });
}
exports.load = load;
