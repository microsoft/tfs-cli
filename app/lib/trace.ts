import colors = require("colors");
import os = require('os');
var traceEnabled = process.env['TFX_TRACE'];

export function error(msg: string, ...replacements: string[]): void {
	doLog(msg, colors.bgRed, replacements, console.error);
}

export function success(msg: string, ...replacements: string[]): void {
	doLog(msg, colors.green, replacements);
}

export function info(msg: string = '', ...replacements: string[]): void {
	doLog(msg, colors.white, replacements);
}

export function warn(msg: string, ...replacements: string[]): void {
	doLog(msg, colors.bgYellow.black, replacements);
}

export function debugArea(msg: any, area: string) {
	traceEnabled = process.env['TFX_TRACE_' + area.toUpperCase()];
	debug(msg);
	traceEnabled = process.env['TFX_TRACE'];
}

export function debug(msg: any, ...replacements: string[]) {
    if (traceEnabled) {
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

var write = function(msg, replacements: string[]) {
	doLog(msg, colors.grey, replacements);
}

function doLog(str: string, color: any, replacements: string[], method = console.log): void {
	let toLog = doReplacements(str, replacements);
	toLog = toLog.split(/\n|\r\n/).map(line => colors.cyan(new Date().toISOString() + ' : ') + line).join(os.EOL);
	method(color(toLog));
}

function doReplacements(str: string, replacements: string[]): string {
	let lcRepl = str.replace(/%S/g, "%s");
	let split = lcRepl.split("%s");
	if (split.length - 1 !== replacements.length) {
		throw new Error("The number of replacements (" + replacements.length + ") does not match the number of placeholders (" + (split.length - 1) + ")");
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
