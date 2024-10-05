import colors = require("colors");
import os = require("os");
let debugTracingEnvVar = process.env["TFX_TRACE"];

export const enum TraceLevel {
	None = 0,
	Info = 1,
	Debug = 2,
}

export let traceLevel: TraceLevel = debugTracingEnvVar ? TraceLevel.Debug : TraceLevel.Info;
export let debugLogStream = console.log;

export type printable = string | number | boolean;

export function println() {
	info("");
}

export function error(msg: any, ...replacements: printable[]): void {
	log("error: ", msg, colors.bgRed.white, replacements, console.error);
}

export function success(msg: any, ...replacements: printable[]): void {
	log("", msg, colors.green, replacements);
}

export function info(msg: any, ...replacements: printable[]): void {
	if (traceLevel >= TraceLevel.Info) {
		log("", msg, colors.white, replacements);
	}
}

export function warn(msg: any, ...replacements: printable[]): void {
	log("warning: ", msg, colors.bgYellow.black, replacements);
}

export function debugArea(msg: any, area: string) {
	debugTracingEnvVar = process.env["TFX_TRACE_" + area.toUpperCase()];
	if (debugTracingEnvVar) {
		log(colors.cyan(new Date().toISOString() + " : "), msg, colors.grey, [], debugLogStream);
	}
	debugTracingEnvVar = process.env["TFX_TRACE"];
}

export function debug(msg: any, ...replacements: printable[]) {
	if (traceLevel >= TraceLevel.Debug) {
		log(colors.cyan(new Date().toISOString() + " : "), msg, colors.grey, replacements, debugLogStream);
	}
}

function log(prefix: string, msg: any, color: any, replacements: printable[], method = console.log): void {
	var t = typeof msg;
	if (t === "string") {
		write(prefix, msg, color, replacements, method);
	} else if (msg instanceof Array) {
		msg.forEach(function(line) {
			if (typeof line === "string") {
				write(prefix, line, color, replacements, method);
			}
		});
	} else if (t === "object") {
		write(prefix, JSON.stringify(msg, null, 2), color, replacements, method);
	}
}

function write(prefix: string, msg: string, color: any, replacements: printable[], method = console.log) {
	let toLog = format(msg, ...replacements);
	toLog = toLog
		.split(/\n|\r\n/)
		.map(line => prefix + line)
		.join(os.EOL);
	method(color(toLog));
}

export function format(str: string, ...replacements: printable[]): string {
	let lcRepl = str.replace(/%S/g, "%s");
	let split = lcRepl.split("%s");
	if (split.length - 1 !== replacements.length) {
		throw new Error(
			"The number of replacements (" +
				replacements.length +
				") does not match the number of placeholders (" +
				(split.length - 1) +
				")",
		);
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
