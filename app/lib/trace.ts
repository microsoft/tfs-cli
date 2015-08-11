import colors = require("colors");
import os = require('os');
var traceEnabled = process.env['TFX_TRACE'];

export function error(str: string, ...replacements: string[]): void {
	doLog("error", str, colors.bgRed, replacements, console.error);
}

export function success(str: string, ...replacements: string[]): void {
	doLog("success", str, colors.green, replacements);
}

export function warn(str: string, ...replacements: string[]): void {
	doLog("warning", str, colors.bgYellow.black, replacements);
}

export function info(str: string, level: number, ...replacements: string[]): void {
	let logStr;
	switch (level) {
		case 1:
			console.log(); // empty line before a strong message
			logStr = colors.cyan(str);
			break;
		case 2: 
			logStr = "- " + str;
			break;
		case 3: 
			logStr = "-- " + str;
			break;
		default:
			logStr = str;
	}
	doLog("info", logStr, colors.white, replacements);
}

var write = function(msg, replacements: string[]) {
	doLog(colors.cyan(new Date().toISOString() + ' : '), msg, colors.grey, replacements);
}

module.exports = function trace (msg: any, area?:string, ...replacements: string[]) {
    var traceMsg = traceEnabled;

    if (area) {
        traceMsg = process.env['TFX_TRACE_' + area.toUpperCase()];
    }

    if (traceMsg) {
        var t = typeof(msg);
        if (t === 'string') {
            write(msg, replacements);
        }
        else if (msg instanceof Array) {
            msg.forEach(function(line) {
                if (typeof(line) === 'string') {
                    write(line, replacements);
                }
            })
        }
        else if(t === 'object') {
            write(JSON.stringify(msg, null, 2), replacements);
        } 
    }
};

function doLog(prefix: string, str: string, color: any, replacements: string[], method = console.log): void {
	let toLog = doReplacements(str, replacements);
	toLog = toLog.split(/\n|\r\n/).map(line => prefix + line).join(os.EOL);
	method(color(toLog));
}

function doReplacements(str: string, replacements: string[]): string {
	let lcRepl = str.replace(/%S/g, "%s");
	let split = lcRepl.split("%s");
	if (split.length - 1 !== replacements.length) {
		throw "The number of replacements (" + replacements.length + ") does not match the number of placeholders (" + (split.length - 1) + ")";
	}
	
	let resultArr = [];
	split.forEach((piece, index) => {
		resultArr.push(piece);
		if (index < split.length - 1) {
			resultArr.push(replacements[index]);
		}
	});
	return resultArr.join("");
}
