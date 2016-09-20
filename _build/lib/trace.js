"use strict";
var colors = require("colors");
var os = require('os');
var traceEnabled = process.env['TFX_TRACE'];
function println() {
    info('');
}
exports.println = println;
function error(msg) {
    var replacements = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        replacements[_i - 1] = arguments[_i];
    }
    log('', msg, colors.bgRed, replacements, console.error);
}
exports.error = error;
function success(msg) {
    var replacements = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        replacements[_i - 1] = arguments[_i];
    }
    log('', msg, colors.green, replacements);
}
exports.success = success;
function info(msg) {
    var replacements = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        replacements[_i - 1] = arguments[_i];
    }
    if (exports.outputType === "friendly" || traceEnabled) {
        log('', msg, colors.white, replacements);
    }
}
exports.info = info;
function warn(msg) {
    var replacements = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        replacements[_i - 1] = arguments[_i];
    }
    log('', msg, colors.bgYellow.black, replacements);
}
exports.warn = warn;
function debugArea(msg, area) {
    traceEnabled = process.env['TFX_TRACE_' + area.toUpperCase()];
    if (traceEnabled) {
        log(colors.cyan(new Date().toISOString() + ' : '), msg, colors.grey, []);
    }
    traceEnabled = process.env['TFX_TRACE'];
}
exports.debugArea = debugArea;
function debug(msg) {
    var replacements = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        replacements[_i - 1] = arguments[_i];
    }
    if (traceEnabled) {
        log(colors.cyan(new Date().toISOString() + ' : '), msg, colors.grey, replacements);
    }
}
exports.debug = debug;
function log(prefix, msg, color, replacements, method) {
    if (method === void 0) { method = console.log; }
    var t = typeof (msg);
    if (t === 'string') {
        write(prefix, msg, color, replacements, method);
    }
    else if (msg instanceof Array) {
        msg.forEach(function (line) {
            if (typeof (line) === 'string') {
                write(prefix, line, color, replacements, method);
            }
        });
    }
    else if (t === 'object') {
        write(prefix, JSON.stringify(msg, null, 2), color, replacements, method);
    }
}
function write(prefix, msg, color, replacements, method) {
    if (method === void 0) { method = console.log; }
    var toLog = doReplacements(msg, replacements);
    toLog = toLog.split(/\n|\r\n/).map(function (line) { return prefix + line; }).join(os.EOL);
    method(color(toLog));
}
function doReplacements(str, replacements) {
    var lcRepl = str.replace(/%S/g, "%s");
    var split = lcRepl.split("%s");
    if (split.length - 1 !== replacements.length) {
        throw new Error("The number of replacements (" + replacements.length + ") does not match the number of placeholders (" + (split.length - 1) + ")");
    }
    var resultArr = [];
    split.forEach(function (piece, index) {
        resultArr.push(piece);
        if (index < split.length - 1) {
            resultArr.push(replacements[index]);
        }
    });
    return resultArr.join("");
}
