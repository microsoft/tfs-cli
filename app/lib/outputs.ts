/// <reference path="../../typings/tsd.d.ts" />

import path = require("path");
import Q = require("q");
import qfs = require("./qfs");
import qread = require("./qread");

export interface Outputter {
	processOutput: (data: any) => void | Q.Promise<void>;
}

export interface JsonOutputterOptions {
	minify?: boolean;
}

export class JsonOutputter implements Outputter {
	private minify: boolean = false;
	constructor(options?: JsonOutputterOptions) {
		if (options) {
			this.minify = options.minify;
		}
	}
	
	public processOutput(data: any): void {
		try {
			JSON.stringify(data, null, this.minify ? 0 : 4);
		} catch (e) {
			throw new Error("Error processing JSON");
		}
	}
}

export enum FileOverwriteOption {
	/**
	 * Prompt the user before overwriting
	 */
	Prompt,
	
	/**
	 * Throw an exception if the file exists
	 */
	Throw,
	
	/**
	 * Overwrite the file without warning/prompting
	 */
	Overwrite,
	
	/**
	 * Append output to the given file
	 */
	Append
}

export interface FileOutputterOptions {
	overwrite?: FileOverwriteOption;
}

export class FileOutputter implements Outputter {
	private overwriteSetting: FileOverwriteOption;
	
	constructor(private outputPath: string, options?: FileOutputterOptions) {
		if (options.overwrite === undefined || options.overwrite === null) {
			this.overwriteSetting = FileOverwriteOption.Prompt;
		} else {
			this.overwriteSetting = options.overwrite;
		}
	}
	
	/**
	 * Given a file path:
	 *   - Convert it to an absolute path
	 *   - If it exists, warn the user it will be overwritten
	 *   - If it does not exist and the original file path was relative, confirm the absolute path with user
	 *   - Otherwise continue.
	 * User has the option during confirmations to change path, in which the above process happens again.
	 * Once we have the file, check that we have write access. If not, ask for a new file name and re-do all of the above.
	 */
	private confirmPath(outPath: string, confirmRelative: boolean = false): Q.Promise<string> {
		let absPath = path.resolve(outPath);
		return qfs.exists(absPath).then((exists) => {
			if (!exists && (!confirmRelative || path.isAbsolute(outPath))) {
				return Q.resolve(absPath);
			}
			if (exists && this.overwriteSetting === FileOverwriteOption.Throw) {
				throw new Error("Cannot overwrite existing file " + this.outputPath);
			}
			if (exists && this.overwriteSetting === FileOverwriteOption.Overwrite || this.overwriteSetting === FileOverwriteOption.Append) {
				return Q.resolve(absPath);
			}
			let prompt = exists ? 
				"Warning: " + absPath + " will be overwritten. Continue? (y/n or provide another file name.)" :
				"Write to " + absPath + "? (y/n or provide another file name.)";
			return qread.read("overwrite", prompt).then((result: string) => {
				let lcResult = result.toLowerCase();
				if (["y", "yes"].indexOf(lcResult) >= 0) {
					return Q.resolve(result);
				} else if (["n", "no"].indexOf(lcResult) >= 0) {
					throw new Error("Operation canceled by user.");
				} else {
					return this.confirmPath(result, true);
				}
			});
		}).then((confirmedPath) => {
			return qfs.fileAccess(confirmedPath, qfs.W_OK).then((access) => {
				if (access) {
					return confirmedPath;
				} else {
					if (this.overwriteSetting === FileOverwriteOption.Throw) {
						throw new Error("Cannot write to file " + this.outputPath + " (access denied).");
					}
					return qread.read("filename", "No write access to file " + confirmedPath + ". Provide a new file name.").then((result: string) => {
						return this.confirmPath(result, true);
					});
				}
			});
		});
	}
	
	/**
	 * Write the given string of data to the file
	 */
	public processOutput(data: string): Q.Promise<void> {
		return this.confirmPath(this.outputPath).then((confirmed) => {
			let dataPromise = Q.resolve(data);
			if (this.overwriteSetting === FileOverwriteOption.Append) {
				dataPromise = qfs.readFile(confirmed, "utf8").then((result) => {
					return result + data;
				}).catch((e) => {
					return data;
				});
			}
			return dataPromise.then((data) => {
				return qfs.writeFile(confirmed, data);
			});
		});
	}
}