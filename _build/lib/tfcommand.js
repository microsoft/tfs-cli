"use strict";
var diskcache_1 = require("../lib/diskcache");
var credstore_1 = require("../lib/credstore");
var common_1 = require("../lib/common");
var connection_1 = require("../lib/connection");
var WebApi_1 = require("vso-node-api/WebApi");
var os_1 = require("os");
var _ = require("lodash");
var args = require("./arguments");
var colors_1 = require("colors");
var common = require("./common");
var copypaste = require("copy-paste");
var loader = require("../lib/loader");
var path = require("path");
var Q = require("q");
var qfs = require("./qfs");
var trace = require("./trace");
var version = require("./version");
var TfCommand = (function () {
    /**
     * @param serverCommand True to initialize the WebApi object during init phase.
     */
    function TfCommand(passedArgs, serverCommand) {
        if (serverCommand === void 0) { serverCommand = true; }
        this.passedArgs = passedArgs;
        this.serverCommand = serverCommand;
        this.commandArgs = {};
        this.description = "A suite of command line tools to interact with Visual Studio Team Services.";
        this.setCommandArgs();
    }
    /**
     * Returns a promise that is resolved when this command is initialized and
     * ready to be executed.
     */
    TfCommand.prototype.ensureInitialized = function () {
        return this.initialized || this.initialize();
    };
    TfCommand.prototype.initialize = function () {
        var _this = this;
        this.initialized = this.commandArgs.help.val().then(function (needHelp) {
            if (needHelp) {
                return _this.run.bind(_this, _this.getHelp.bind(_this));
            }
            else {
                // Set the fiddler proxy
                return _this.commandArgs.fiddler.val().then(function (useProxy) {
                    if (useProxy) {
                        process.env.HTTP_PROXY = "http://127.0.0.1:8888";
                    }
                }).then(function () {
                    // Set custom proxy 
                    return _this.commandArgs.proxy.val(true).then(function (proxy) {
                        if (proxy) {
                            process.env.HTTP_PROXY = proxy;
                        }
                    });
                }).then(function () {
                    // Set the no-prompt flag 
                    return _this.commandArgs.noPrompt.val(true).then(function (noPrompt) {
                        common.NO_PROMPT = noPrompt;
                    });
                }).then(function () {
                    // Set the cached service url
                    return _this.commandArgs.serviceUrl.val(true).then(function (serviceUrl) {
                        if (!serviceUrl && !process.env["TFX_BYPASS_CACHE"] && common.EXEC_PATH.join("") !== "login") {
                            var diskCache_1 = new diskcache_1.DiskCache("tfx");
                            return diskCache_1.itemExists("cache", "connection").then(function (isConnection) {
                                var connectionUrlPromise;
                                if (!isConnection) {
                                    connectionUrlPromise = Promise.resolve(null);
                                }
                                else {
                                    connectionUrlPromise = diskCache_1.getItem("cache", "connection");
                                }
                                return connectionUrlPromise.then(function (url) {
                                    if (url) {
                                        _this.commandArgs.serviceUrl.setValue(url);
                                    }
                                });
                            });
                        }
                        else {
                            return Promise.resolve(null);
                        }
                    });
                }).then(function () {
                    var apiPromise = Promise.resolve(null);
                    if (_this.serverCommand) {
                        apiPromise = _this.getWebApi().then(function (_) { });
                    }
                    return apiPromise.then(function () {
                        return _this.run.bind(_this, _this.exec.bind(_this));
                    });
                });
            }
        });
        return this.initialized;
    };
    TfCommand.prototype.getGroupedArgs = function () {
        if (!this.groupedArgs) {
            var group_1 = {};
            var currentArg_1 = null;
            this.passedArgs.forEach(function (arg) {
                if (_.startsWith(arg, "--")) {
                    currentArg_1 = _.camelCase(arg.substr(2));
                    group_1[currentArg_1] = [];
                    return;
                }
                if (currentArg_1) {
                    group_1[currentArg_1].push(arg);
                }
            });
            this.groupedArgs = group_1;
        }
        return this.groupedArgs;
    };
    TfCommand.prototype.registerCommandArgument = function (name, friendlyName, description, ctor, defaultValue) {
        var groupedArgs = this.getGroupedArgs();
        if (groupedArgs[name]) {
            this.commandArgs[name] = new ctor(name, friendlyName, description, groupedArgs[name]);
        }
        else {
            this.commandArgs[name] = new ctor(name, friendlyName, description, defaultValue, true);
        }
    };
    /**
     * Register arguments that may be used with this command.
     */
    TfCommand.prototype.setCommandArgs = function () {
        this.registerCommandArgument("project", "Project name", null, args.StringArgument);
        this.registerCommandArgument("root", "Root directory", null, args.ExistingDirectoriesArgument, ".");
        this.registerCommandArgument("authType", "Authentication Method", "Method of authentication ('pat' or 'basic').", args.StringArgument, "pat");
        this.registerCommandArgument("serviceUrl", "Service URL", "URL to the service you will connect to, e.g. https://youraccount.visualstudio.com/DefaultCollection.", args.StringArgument);
        this.registerCommandArgument("password", "Password", "Password to use for basic authentication.", args.SilentStringArgument);
        this.registerCommandArgument("token", "Personal access token", null, args.SilentStringArgument);
        this.registerCommandArgument("save", "Save settings", "Save arguments for the next time a command in this command group is run.", args.BooleanArgument, "false");
        this.registerCommandArgument("username", "Username", "Username to use for basic authentication.", args.StringArgument);
        this.registerCommandArgument("output", "Output destination", "Method to use for output. Options: friendly, json, clipboard.", args.StringArgument, "friendly");
        this.registerCommandArgument("json", "Output as JSON", "Alias for --output json.", args.BooleanArgument, "false");
        this.registerCommandArgument("fiddler", "Use Fiddler proxy", "Set up the fiddler proxy for HTTP requests (for debugging purposes).", args.BooleanArgument, "false");
        this.registerCommandArgument("proxy", "Proxy server", "Use the specified proxy server for HTTP traffic.", args.StringArgument, null);
        this.registerCommandArgument("help", "Help", "Get help for any command.", args.BooleanArgument, "false");
        this.registerCommandArgument("noPrompt", "No Prompt", "Do not prompt the user for input (instead, raise an error).", args.BooleanArgument, "false");
    };
    /**
     * Return a list of registered arguments that should be displayed when help is emitted.
     */
    TfCommand.prototype.getHelpArgs = function () {
        return [];
    };
    /**
     * Get a BasicCredentialHandler based on the command arguments:
     * If username & password are passed in, use those.
     * If token is passed in, use that.
     * Else, check the authType - if it is "pat", prompt for a token
     * If it is "basic", prompt for username and password.
     */
    TfCommand.prototype.getCredentials = function (serviceUrl, useCredStore) {
        var _this = this;
        if (useCredStore === void 0) { useCredStore = true; }
        return Promise.all([
            this.commandArgs.authType.val(),
            this.commandArgs.token.val(true),
            this.commandArgs.username.val(true),
            this.commandArgs.password.val(true)
        ]).then(function (values) {
            var authType = values[0], token = values[1], username = values[2], password = values[3];
            if (username && password) {
                return WebApi_1.getBasicHandler(username, password);
            }
            else {
                if (token) {
                    return WebApi_1.getBasicHandler("OAuth", token);
                }
                else {
                    var getCredentialPromise = void 0;
                    if (useCredStore) {
                        getCredentialPromise = credstore_1.getCredentialStore("tfx").getCredential(serviceUrl, "allusers");
                    }
                    else {
                        getCredentialPromise = Q.reject();
                    }
                    return getCredentialPromise.then(function (credString) {
                        if (credString.length <= 6) {
                            throw "Could not get credentials from credential store.";
                        }
                        if (credString.substr(0, 3) === "pat") {
                            return WebApi_1.getBasicHandler("OAuth", credString.substr(4));
                        }
                        else if (credString.substr(0, 5) === "basic") {
                            var rest = credString.substr(6);
                            var unpwDividerIndex = rest.indexOf(":");
                            var username_1 = rest.substr(0, unpwDividerIndex);
                            var password_1 = rest.substr(unpwDividerIndex + 1);
                            if (username_1 && password_1) {
                                return WebApi_1.getBasicHandler(username_1, password_1);
                            }
                            else {
                                throw "Could not get credentials from credential store.";
                            }
                        }
                    }).catch(function () {
                        if (authType.toLowerCase() === "pat") {
                            return _this.commandArgs.token.val().then(function (token) {
                                return WebApi_1.getBasicHandler("OAuth", token);
                            });
                        }
                        else if (authType.toLowerCase() === "basic") {
                            return _this.commandArgs.username.val().then(function (username) {
                                return _this.commandArgs.password.val().then(function (password) {
                                    return WebApi_1.getBasicHandler(username, password);
                                });
                            });
                        }
                        else {
                            throw new Error("Unsupported auth type. Currently, 'pat' and 'basic' auth are supported.");
                        }
                    });
                }
            }
        });
    };
    TfCommand.prototype.getWebApi = function () {
        var _this = this;
        return this.commandArgs.serviceUrl.val().then(function (url) {
            return _this.getCredentials(url).then(function (handler) {
                _this.connection = new connection_1.TfsConnection(url);
                _this.webApi = new WebApi_1.WebApi(url, handler);
                return _this.webApi;
            });
        });
    };
    TfCommand.prototype.run = function (main, cmd) {
        var _this = this;
        return main(cmd).then(function (result) {
            return _this.output(result).then(function () {
                return _this.dispose();
            });
        });
    };
    /**
     * Should be called after exec. In here we will write settings to fs if necessary.
     */
    TfCommand.prototype.dispose = function () {
        var _this = this;
        var newToCache = {};
        return this.commandArgs.save.val().then(function (shouldSave) {
            if (shouldSave) {
                var cacheKey_1 = path.resolve().replace("/\.\[\]/g", "-") + "." +
                    common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
                var getValuePromises_1 = [];
                Object.keys(_this.commandArgs).forEach(function (arg) {
                    var argObj = _this.commandArgs[arg];
                    if (!argObj.hasDefaultValue) {
                        var pr = argObj.val().then(function (value) {
                            // don"t cache these 5 options.
                            if (["username", "password", "save", "token", "help"].indexOf(arg) < 0) {
                                _.set(newToCache, cacheKey_1 + "." + arg, value);
                            }
                        });
                        getValuePromises_1.push(pr);
                    }
                });
                return Promise.all(getValuePromises_1).then(function () {
                    return args.getOptionsCache().then(function (existingCache) {
                        // custom shallow-ish merge of cache properties.
                        var newInThisCommand = _.get(newToCache, cacheKey_1);
                        if (!_.get(existingCache, cacheKey_1)) {
                            _.set(existingCache, cacheKey_1, {});
                        }
                        if (newInThisCommand) {
                            Object.keys(newInThisCommand).forEach(function (key) {
                                _.set(existingCache, cacheKey_1 + "." + key, newInThisCommand[key]);
                            });
                            new diskcache_1.DiskCache("tfx").setItem("cache", "command-options", JSON.stringify(existingCache, null, 4).replace(/\n/g, os_1.EOL));
                        }
                    });
                });
            }
            else {
                return Promise.resolve(null);
            }
        });
    };
    /**
     * Gets help (as a string) for the given command
     */
    TfCommand.prototype.getHelp = function (cmd) {
        var _this = this;
        this.commandArgs.output.setValue("help");
        var result = os_1.EOL;
        result += ["                        fTfs         ",
            "                      fSSSSSSSs      ",
            "                    fSSSSSSSSSS      ",
            "     TSSf         fSSSSSSSSSSSS      ",
            "     SSSSSF     fSSSSSSST SSSSS      ",
            "     SSfSSSSSsfSSSSSSSt   SSSSS      ",
            "     SS  tSSSSSSSSSs      SSSSS      ",
            "     SS   fSSSSSSST       SSSSS      ",
            "     SS fSSSSSFSSSSSSf    SSSSS      ",
            "     SSSSSST    FSSSSSSFt SSSSS      ",
            "     SSSSt        FSSSSSSSSSSSS      ",
            "                    FSSSSSSSSSS      ",
            "                       FSSSSSSs      ",
            "                        FSFs    (TM) "].
            map(function (l) { return colors_1.magenta(l); }).join(os_1.EOL) + os_1.EOL + os_1.EOL;
        var continuedHierarchy = cmd.commandHierarchy;
        cmd.execPath.forEach(function (segment) {
            continuedHierarchy = continuedHierarchy[segment];
        });
        if (continuedHierarchy === null) {
            // Need help with a particular command
            var singleArgData_1 = function (argName, maxArgLen) {
                var argKebab = _.kebabCase(argName);
                var argObj = _this.commandArgs[argName];
                return "  --" +
                    argKebab + "  " +
                    common_1.repeatStr(" ", maxArgLen - argKebab.length) +
                    colors_1.gray((argObj.description || (argObj.friendlyName + "."))) + os_1.EOL;
            };
            var commandName_1 = cmd.execPath[cmd.execPath.length - 1];
            result += colors_1.cyan("Syntax: ") + os_1.EOL +
                colors_1.cyan("tfx ") + colors_1.yellow(cmd.execPath.join(" ")) +
                colors_1.green(" --arg1 arg1val1 arg1val2[...]") +
                colors_1.gray(" --arg2 arg2val1 arg2val2[...]") + os_1.EOL + os_1.EOL;
            return loader.load(cmd.execPath, []).then(function (tfCommand) {
                result += colors_1.cyan("Command: ") + commandName_1 + os_1.EOL;
                result += tfCommand.description + os_1.EOL + os_1.EOL;
                result += colors_1.cyan("Arguments: ") + os_1.EOL;
                var uniqueArgs = _this.getHelpArgs();
                uniqueArgs = _.uniq(uniqueArgs);
                var maxArgLen = uniqueArgs.map(function (a) { return _.kebabCase(a); }).reduce(function (a, b) { return Math.max(a, b.length); }, 0);
                if (uniqueArgs.length === 0) {
                    result += "[No arguments for this command]" + os_1.EOL;
                }
                uniqueArgs.forEach(function (arg) {
                    result += singleArgData_1(arg, maxArgLen);
                });
                if (_this.serverCommand) {
                    result += os_1.EOL + colors_1.cyan("Global server command arguments:") + os_1.EOL;
                    ["authType", "username", "password", "token", "serviceUrl", "fiddler", "proxy"].forEach(function (arg) {
                        result += singleArgData_1(arg, 11);
                    });
                }
                result += os_1.EOL + colors_1.cyan("Global arguments:") + os_1.EOL;
                ["help", "save", "noPrompt", "output", "json"].forEach(function (arg) {
                    result += singleArgData_1(arg, 9);
                });
                result += os_1.EOL + colors_1.gray("To see more commands, type " + colors_1.reset("tfx " + cmd.execPath.slice(0, cmd.execPath.length - 1).join(" ") + " --help"));
            }).then(function () {
                return result;
            });
        }
        else {
            // Need help with a suite of commands
            // There is a weird coloring bug when colors are nested, so we don"t do that.
            result += colors_1.cyan("Available ") +
                "commands" +
                colors_1.cyan(" and ") +
                colors_1.yellow("command groups") +
                colors_1.cyan(" in " + ["tfx"].concat(cmd.execPath).join(" / ") + ":") + os_1.EOL;
            var commandDescriptionPromises_1 = [];
            Object.keys(continuedHierarchy).forEach(function (command) {
                if (command === "default") {
                    return;
                }
                var pr = loader.load(cmd.execPath.concat([command]), []).then(function (tfCommand) {
                    var coloredCommand = command;
                    if (continuedHierarchy[command] !== null) {
                        coloredCommand = colors_1.yellow(command);
                    }
                    result += " - " + coloredCommand + colors_1.gray(": " + tfCommand.description) + os_1.EOL;
                });
                commandDescriptionPromises_1.push(pr);
            });
            return Promise.all(commandDescriptionPromises_1).then(function () {
                result += os_1.EOL + os_1.EOL + colors_1.gray("For help with an individual command, type ") + colors_1.reset("tfx " + cmd.execPath.join(" ") + " <command> --help") + os_1.EOL;
            }).then(function () {
                return result;
            });
        }
    };
    /**
     * Display a copyright banner.
     */
    TfCommand.prototype.showBanner = function () {
        var _this = this;
        return this.commandArgs.json.val(true).then(function (useJson) {
            if (useJson) {
                _this.commandArgs.output.setValue("json");
            }
        }).then(function () {
            return _this.commandArgs.output.val(true).then(function (outputType) {
                return version.getTfxVersion().then(function (semVer) {
                    trace.outputType = outputType;
                    if (outputType === "friendly") {
                        trace.info(colors_1.gray("TFS Cross Platform Command Line Interface v" + semVer.toString()));
                        trace.info(colors_1.gray("Copyright Microsoft Corporation"));
                    }
                });
            });
        });
    };
    /**
     * Takes data and pipes it to the appropriate output mechanism
     */
    TfCommand.prototype.output = function (data) {
        var _this = this;
        return this.commandArgs.output.val().then(function (outputDestination) {
            switch (outputDestination.toLowerCase()) {
                case "friendly":
                    _this.friendlyOutput(data);
                    break;
                case "json":
                    _this.jsonOutput(data);
                    break;
                case "help":
                    _this.friendlyOutputConstant(data);
                    break;
                case "clip":
                case "clipboard":
                    var clipboardText = _this.getClipboardOutput(data);
                    return Q.nfcall(copypaste.copy, clipboardText);
                default:
                    return qfs.canWriteTo(path.resolve(outputDestination)).then(function (canWrite) {
                        if (canWrite) {
                            var fileContents = _this.getFileOutput(data);
                            return qfs.writeFile(outputDestination, fileContents);
                        }
                        else {
                            throw new Error("Cannot write output to " + outputDestination);
                        }
                    });
            }
            return Promise.resolve(null);
        });
    };
    /**
     * Given the output object, gets the string that is copied to the clipboard when
     * clipboard output is requested.
     */
    TfCommand.prototype.getClipboardOutput = function (data) {
        return this.getOutputString(data);
    };
    /**
     * Given the output object, gets the string that is written to a destination
     * file when a file name is given as the output destination
     */
    TfCommand.prototype.getFileOutput = function (data) {
        return this.getOutputString(data);
    };
    TfCommand.prototype.getOutputString = function (data) {
        var outputString = "";
        try {
            outputString = JSON.stringify(data, null, 4);
        }
        catch (e) {
            if (data && data.toString) {
                outputString = data.toString();
            }
            else {
                outputString = data + "";
            }
        }
        return outputString;
    };
    /**
     * Gets a nicely formatted output string for friendly output
     */
    TfCommand.prototype.friendlyOutput = function (data) {
        this.friendlyOutputConstant(data);
    };
    TfCommand.prototype.friendlyOutputConstant = function (data) {
        if (typeof data === "string") {
            console.log(data);
        }
        else {
            try {
                console.log(JSON.stringify(data, null, 4));
            }
            catch (e) {
                console.log(data + "");
            }
        }
    };
    /**
     * Gets a string of valid JSON when JSON output is requested.
     * Probably no need to override this one.
     */
    TfCommand.prototype.jsonOutput = function (data) {
        try {
            console.log(colors_1.reset(JSON.stringify(data, null, 4)));
        }
        catch (e) {
            throw new Error("Could not stringify JSON output.");
        }
    };
    return TfCommand;
}());
exports.TfCommand = TfCommand;
