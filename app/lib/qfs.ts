

import fs = require("fs");
import Q = require("q");

// This is an fs lib that uses Q instead of callbacks.

export var W_OK = fs.constants ? fs.constants.W_OK : (fs as any).W_OK; // back-compat
export var R_OK = fs.constants ? fs.constants.R_OK : (fs as any).R_OK; // back-compat
export var X_OK = fs.constants ? fs.constants.X_OK : (fs as any).X_OK; // back-compat
export var F_OK = fs.constants ? fs.constants.F_OK : (fs as any).F_OK; // back-compat

export function readdir(path: string): Promise<string[]> {
	return Q.nfcall<string[]>(fs.readdir, path);
}

export function exists(path: string): Promise<boolean> {
	return Q.Promise<boolean>((resolve, reject, notify) => {
		fs.exists(path, (fileExists) => {
			resolve(fileExists);
		});
	});
}

export function lstat(path: string): Promise<fs.Stats> {
	return Q.nfcall<fs.Stats>(fs.lstat, path);
}

export function readFile(filename: string, encoding: string): Promise<string>
export function readFile(filename: string, options: { encoding: string, flag?: string }): Promise<string>
export function readFile(filename: string, options: { flag?: string }): Promise<Buffer>
export function readFile(filename: string): Promise<Buffer>
export function readFile(filename: string, options?: { encoding?: string, flag?: string} | string): Promise<string> & Promise<Buffer> {
	return Q.nfcall<string & Buffer>(fs.readFile, filename, options);
}

export function writeFile(filename: string, data: any): Promise<void> {
	return Q.nfcall<void>(fs.writeFile, filename, data);
};

//export function writeFile(filename: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;

/**
 * Returns a promise resolved true or false if a file is accessible
 * with the given mode (F_OK, R_OK, W_OK, X_OK)
 */
export function fileAccess(path: string, mode: number = F_OK): Promise<boolean> {
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
export function canWriteTo(path: string): Promise<boolean> {
	return exists(path).then((exists) => {
		if (exists) {
			return fileAccess(path, W_OK);
		} else {
			return true;
		}
	});
}