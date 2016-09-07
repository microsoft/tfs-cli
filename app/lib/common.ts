import fs = require("fs");

export let APP_ROOT: string;
export let NO_PROMPT: boolean;
export let EXEC_PATH: string[];

export interface IStringDictionary { [name: string]: string }
export interface IStringIndexer { [name: string]: any }
export interface IOptions { [name: string]: string }

export function endsWith(str: string, end:string): boolean {
	return str.slice(-end.length) == end;
}

/**
 * Generate a new rfc4122 version 4 compliant GUID.
 */
export function newGuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}

/**
 * Repeat a string <count> times.
 */
export function repeatStr(str: string, count: number): string {
	let result = [];
	for (let i = 0; i < count; ++i) {
		result.push(str);
	}
	return result.join("");
}