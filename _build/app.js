"use strict";
var command = require("./lib/command");
var common = require("./lib/common");
var errHandler = require("./lib/errorhandler");
var loader = require("./lib/loader");
// Set app root
common.APP_ROOT = __dirname;
var Bootstrap;
(function (Bootstrap) {
    function begin() {
        return command.getCommand().then(function (cmd) {
            common.EXEC_PATH = cmd.execPath;
            return loader.load(cmd.execPath, cmd.args).then(function (tfCommand) {
                return tfCommand.showBanner().then(function () {
                    return tfCommand.ensureInitialized().then(function (executor) {
                        return executor(cmd);
                    });
                });
            });
        });
    }
    Bootstrap.begin = begin;
})(Bootstrap || (Bootstrap = {}));
Bootstrap.begin().then(function () {
}).catch(function (reason) {
    errHandler.errLog(reason);
});
