import fs = require("fs");
import { promisify } from "util";

// This is an fs lib that uses Q instead of callbacks.

export var W_OK = fs.constants ? fs.constants.W_OK : (fs as any).W_OK; // back-compat
export var R_OK = fs.constants ? fs.constants.R_OK : (fs as any).R_OK; // back-compat
export var X_OK = fs.constants ? fs.constants.X_OK : (fs as any).X_OK; // back-compat
export var F_OK = fs.constants ? fs.constants.F_OK : (fs as any).F_OK; // back-compat

export function exists(path: string): Promise<boolean> {
	return new Promise(resolve => {
		fs.exists(path, fileExists => {
			resolve(fileExists);
		});
	});
}

/**
 * Returns a promise resolved true or false if a file is accessible
 * with the given mode (F_OK, R_OK, W_OK, X_OK)
 */
export function fileAccess(path: string, mode: number = F_OK): Promise<boolean> {
	return new Promise(resolve => {
		fs.access(path, mode, err => {
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
	return exists(path).then(exists => {
		if (exists) {
			return fileAccess(path, W_OK);
		} else {
			return true;
		}
	});
}
