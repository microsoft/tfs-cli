/// <reference path="../../typings/tsd.d.ts" />

import fs = require("fs");
import Q = require("q");

// This is an fs lib that uses Q instead of callbacks.

export var W_OK = fs.W_OK;
export var R_OK = fs.R_OK;
export var X_OK = fs.X_OK;
export var F_OK = fs.F_OK;

export function readdir(path: string): Q.Promise<string[]> {
	return Q.nfcall<string[]>(fs.readdir, path);
}

export function exists(path: string): Q.Promise<boolean> {
	return Q.Promise<boolean>((resolve, reject, notify) => {
		fs.exists(path, (fileExists) => {
			resolve(fileExists);
		});
	});
}

export function lstat(path: string): Q.Promise<fs.Stats> {
	return Q.nfcall<fs.Stats>(fs.lstat, path);
}

export function readFile(filename: string, encoding: string): Q.Promise<string>
export function readFile(filename: string, options: { encoding: string, flag?: string }): Q.Promise<string>
export function readFile(filename: string, options: { flag?: string }): Q.Promise<Buffer>
export function readFile(filename: string): Q.Promise<Buffer>
export function readFile(filename: string, options?: { encoding?: string, flag?: string} | string): Q.Promise<string> & Q.Promise<Buffer> {
	return Q.nfcall<string & Buffer>(fs.readFile, filename, options);
}

export function writeFile(filename: string, data: any): Q.Promise<void> {
	return Q.nfcall<void>(fs.writeFile, filename, data);
};

//export function writeFile(filename: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;

/**
 * Returns a promise resolved true or false if a file is accessible
 * with the given mode (F_OK, R_OK, W_OK, X_OK)
 */
export function fileAccess(path: string, mode: number = F_OK): Q.Promise<boolean> {
	return Q.Promise<boolean>((resolve) => {
		fs.access(path, mode, (err) => {
			if (err) {
				resolve(false);
			} else {
				resolve(true);
			}
		});
	});
}

/**
 * Given a valid path, resolves true if the file represented by the path
 * can be written to. Files that do not exist are assumed writable.
 */
export function canWriteTo(path: string): Q.Promise<boolean> {
	return exists(path).then((exists) => {
		if (exists) {
			return fileAccess(path, fs.W_OK);
		} else {
			return true;
		}
	});
}