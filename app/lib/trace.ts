/// <reference path="../../definitions/tsd.d.ts" />

import colors = require("colors");
import os = require('os');
var traceEnabled = process.env['TFX_TRACE'];

export function println() {
	info('');
}

export function error(msg: any, ...replacements: string[]): void {
	log('', msg, colors.bgRed, replacements, console.error);
}

export function success(msg: any, ...replacements: string[]): void {
	log('', msg, colors.green, replacements);
}

export function info(msg: any, ...replacements: string[]): void {
	log('', msg, colors.white, replacements);
}

export function warn(msg: any, ...replacements: string[]): void {
	log('', msg, colors.bgYellow.black, replacements);
}

export function debugArea(msg: any, area: string) {
	traceEnabled = process.env['TFX_TRACE_' + area.toUpperCase()];
	if(traceEnabled) {
		log(colors.cyan(new Date().toISOString() + ' : '), msg, colors.grey, []);	
	}
	traceEnabled = process.env['TFX_TRACE'];
}

export function debug(msg: any, ...replacements: string[]) {
    if (traceEnabled) {
		log(colors.cyan(new Date().toISOString() + ' : '), msg, colors.grey, replacements);
    }
}

function log(prefix: string, msg: any, color: any, replacements: string[], method = console.log): void {
	var t = typeof(msg);
	if (t === 'string') {
		write(prefix, msg, color, replacements, method);
	}
	else if (msg instanceof Array) {
		msg.forEach(function(line) {
			if (typeof(line) === 'string') {
				write(prefix, line, color, replacements, method);
			}
		})
	}
	else if(t === 'object') {
		write(prefix, JSON.stringify(msg, null, 2), color, replacements, method);
	}
}

function write(prefix: string, msg: string, color: any, replacements: string[], method = console.log) {
	let toLog = doReplacements(msg, replacements);
	toLog = toLog.split(/\n|\r\n/).map(line => prefix + line).join(os.EOL);
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
