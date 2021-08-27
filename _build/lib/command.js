"use strict";
var common = require("./common");
var fs = require("./qfs");
var path = require("path");
function getCommand() {
    var args = process.argv.slice(2);
    return getCommandHierarchy(path.resolve(common.APP_ROOT, "exec")).then(function (hierarchy) {
        var execPath = [];
        var commandArgs = [];
        var currentHierarchy = hierarchy;
        var inArgs = false;
        args.forEach(function (arg) {
            if (currentHierarchy && currentHierarchy[arg] !== undefined) {
                currentHierarchy = currentHierarchy[arg];
                execPath.push(arg);
            }
            else if (arg.substr(0, 2) === "--" || inArgs) {
                commandArgs.push(arg);
                inArgs = true;
            }
            else {
                throw "Command '" + arg + "' not found. For help, type tfx " + execPath.join(" ") + " --help";
            }
        });
        return {
            execPath: execPath,
            args: commandArgs,
            commandHierarchy: hierarchy
        };
    });
}
exports.getCommand = getCommand;
function getCommandHierarchy(root) {
    var hierarchy = {};
    return fs.readdir(root).then(function (files) {
        var filePromises = [];
        files.forEach(function (file) {
            if (file.substr(0, 1) === "_") {
                return;
            }
            var fullPath = path.resolve(root, file);
            var parsedPath = path.parse(fullPath);
            var promise = fs.lstat(fullPath).then(function (stats) {
                if (stats.isDirectory()) {
                    return getCommandHierarchy(fullPath).then(function (subHierarchy) {
                        hierarchy[parsedPath.name] = subHierarchy;
                    });
                }
                else {
                    hierarchy[parsedPath.name] = null;
                    return null;
                }
            });
            filePromises.push(promise);
        });
        return Promise.all(filePromises).then(function () {
            return hierarchy;
        });
    });
}
