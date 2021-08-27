"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var check = require("validator");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var tasksBase = require("./default");
var trace = require("../../../lib/trace");
var uuid = require("node-uuid");
function getCommand(args) {
    return new TaskCreate(args);
}
exports.getCommand = getCommand;
var TaskCreate = (function (_super) {
    __extends(TaskCreate, _super);
    function TaskCreate(args) {
        _super.call(this, args, false);
        this.description = "Create files for new Build Task";
    }
    TaskCreate.prototype.getHelpArgs = function () {
        return ["taskName", "friendlyName", "description", "author"];
    };
    TaskCreate.prototype.exec = function () {
        trace.debug("build-create.exec");
        return Promise.all([
            this.commandArgs.taskName.val(),
            this.commandArgs.friendlyName.val(),
            this.commandArgs.description.val(),
            this.commandArgs.author.val(),
        ]).then(function (values) {
            var taskName = values[0], friendlyName = values[1], description = values[2], author = values[3];
            if (!taskName || !check.isAlphanumeric(taskName)) {
                throw new Error("name is a required alphanumeric string with no spaces");
            }
            if (!friendlyName || !check.isLength(friendlyName, 1, 40)) {
                throw new Error("friendlyName is a required string <= 40 chars");
            }
            if (!description || !check.isLength(description, 1, 80)) {
                throw new Error("description is a required string <= 80 chars");
            }
            if (!author || !check.isLength(author, 1, 40)) {
                throw new Error("author is a required string <= 40 chars");
            }
            var ret = {};
            // create definition
            trace.debug("creating folder for task");
            var tp = path.join(process.cwd(), taskName);
            trace.debug(tp);
            shell.mkdir("-p", tp);
            trace.debug("created folder");
            ret.taskPath = tp;
            trace.debug("creating definition");
            var def = {};
            def.id = uuid.v1();
            trace.debug("id: " + def.id);
            def.name = taskName;
            trace.debug("name: " + def.name);
            def.friendlyName = friendlyName;
            trace.debug("friendlyName: " + def.friendlyName);
            def.description = description;
            trace.debug("description: " + def.description);
            def.author = author;
            trace.debug("author: " + def.author);
            def.helpMarkDown = "Replace with markdown to show in help";
            def.category = "Utility";
            def.visibility = ["Build", "Release"];
            def.demands = [];
            def.version = { Major: "0", Minor: "1", Patch: "0" };
            def.minimumAgentVersion = "1.95.0";
            def.instanceNameFormat = taskName + " $(message)";
            var cwdInput = {
                name: "cwd",
                type: "filePath",
                label: "Working Directory",
                defaultValue: "",
                required: false,
                helpMarkDown: "Current working directory when " + taskName + " is run."
            };
            var msgInput = {
                name: "msg",
                type: "string",
                label: "Message",
                defaultValue: "Hello World",
                required: true,
                helpMarkDown: "Message to echo out"
            };
            def.inputs = [cwdInput, msgInput];
            def.execution = {
                Node: {
                    target: "sample.js",
                    argumentFormat: ""
                },
                PowerShell3: {
                    target: "sample.ps1"
                }
            };
            ret.definition = def;
            trace.debug("writing definition file");
            var defPath = path.join(tp, "task.json");
            trace.debug(defPath);
            try {
                var defStr = JSON.stringify(def, null, 2);
                trace.debug(defStr);
                fs.writeFileSync(defPath, defStr);
            }
            catch (err) {
                throw new Error("Failed creating task: " + err.message);
            }
            trace.debug("created definition file.");
            var copyResource = function (fileName) {
                var src = path.join(__dirname, "_resources", fileName);
                trace.debug("src: " + src);
                var dest = path.join(tp, fileName);
                trace.debug("dest: " + dest);
                shell.cp(src, dest);
                trace.debug(fileName + " copied");
            };
            trace.debug("creating temporary icon");
            copyResource("icon.png");
            copyResource("sample.js");
            copyResource("sample.ps1");
            return ret;
        });
    };
    TaskCreate.prototype.friendlyOutput = function (data) {
        if (!data) {
            throw new Error("no results");
        }
        trace.println();
        trace.success("created task @ %s", data.taskPath);
        var def = data.definition;
        trace.info("id   : %s", def.id);
        trace.info("name: %s", def.name);
        trace.println();
        trace.info("A temporary task icon was created.  Replace with a 32x32 png with transparencies");
    };
    return TaskCreate;
}(tasksBase.BuildTaskBase));
exports.TaskCreate = TaskCreate;
