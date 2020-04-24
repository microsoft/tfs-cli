import _ = require("lodash");
import colors = require("colors");
import common = require("../lib/common");
import { DiskCache } from "../lib/diskcache";
import path = require("path");

import qread = require("./qread");
import trace = require("../lib/trace");

import { promisify } from "util";
import * as fsUtils from "./fsUtils";
import { lstat } from "fs";

/**
 * Class that represents an argument with a value. Calling .val() will retrieve
 * the typed value, parsed from the givenValue (a string). If no givenValue
 * was provided, we will prompt the user.
 */
export abstract class Argument<T> {
	public silent: boolean = false;
	protected assignedValue: T;
	protected initializePromise: Promise<void>;
	protected givenValue: string[] | Promise<string[]>;

	constructor(
		public name: string,
		public friendlyName: string = name,
		public description?: string,
		givenValue?: string[] | string | Promise<string[]>,
		public hasDefaultValue?: boolean,
		public aliases?: string[],
		public undocumented: boolean = false,
		public promptDefault?: string,
	) {
		if (typeof givenValue === "string") {
			this.givenValue = [givenValue];
		} else {
			this.givenValue = givenValue;
		}
		this.initialize();
	}

	/**
	 * If this argument was given a default value:
	 *   check the cache
	 *     if it's there, set assignedValue to the getValue(cachedValue)
	 *     else set assigned value to given default
	 * If this argument was given a default value of null
	 *   set null as the assignedValue
	 * If this argument was not given any value
	 *   check the cache
	 *     if it's there, set assignedValue to cachedValue
	 *
	 * Promise is resolved after any values that need parsing are parsed,
	 * and there are no more calls to the cache.
	 */
	protected initialize(): Promise<void> {
		let initPromise = Promise.resolve<void>(null);
		if (this.assignedValue === undefined && (this.hasDefaultValue || this.givenValue === undefined)) {
			initPromise = getOptionsCache().then(cache => {
				let cacheKey =
					path.resolve().replace("/.[]/g", "-") +
					"." +
					common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
				let cachedValue = _.get<any, string>(cache, cacheKey + "." + this.name);
				let cachedValueStringArray: string[];
				if (typeof cachedValue === "string") {
					cachedValueStringArray = [cachedValue];
				} else if (_.isArray(cachedValue)) {
					cachedValueStringArray = cachedValue;
				}
				if (cachedValue !== undefined) {
					return this.getValue(cachedValueStringArray).then(result => {
						this.initializeAssignedValue(result);
					});
				} else if (this.givenValue !== null && this.givenValue !== undefined) {
					return this.getValue(this.givenValue).then(result => {
						this.initializeAssignedValue(result);
					});
				} else if (this.givenValue === null) {
					this.initializeAssignedValue(null);
				}
			});
		} else if (this.assignedValue === undefined) {
			if (this.givenValue === null) {
				this.initializeAssignedValue(null);
			} else if (this.givenValue !== undefined) {
				initPromise = this.getValue(this.givenValue).then(result => {
					this.initializeAssignedValue(result);
				});
			}
		}
		this.initializePromise = initPromise;
		return initPromise;
	}

	private initializeAssignedValue(val: T) {
		if (this.assignedValue === undefined) {
			this.assignedValue = val;
		}
	}

	/**
	 * Override whatever exists and give this argument a value.
	 */
	public setValue(value: T): void {
		this.assignedValue = value;
		this.initializePromise = Promise.resolve<void>(null);
	}

	/**
	 * Get the value of this argument by what was passed in. If nothing has
	 * been passed in, prompt the user. The resulting promise is resolved
	 * when a value is available.
	 */
	public val(noPrompt: boolean = false): Promise<T> {
		return this.initializePromise.then(() => {
			if (this.assignedValue !== undefined) {
				return Promise.resolve(this.assignedValue);
			} else {
				if (!noPrompt && !this.undocumented) {
					if (common.NO_PROMPT) {
						throw new Error("Missing required value for argument '" + this.name + "'.");
					}
					return qread.read(this.name, this.friendlyName, this.silent, this.promptDefault).then(answer => {
						// Split answer into args, just as if they were passed through command line
						let splitAnswer = answer.match(/".+?"|[^ ]+/g) || [""];
						let answerArgs = splitAnswer.map(a => {
							// trim quotes if needed
							if (a.substr(0, 1) === '"' && a.substr(a.length - 1, 1) === '"') {
								a = a.substr(1, a.length - 1);
							}
							return a;
						});
						return this.getValue(answerArgs).then(result => {
							this.assignedValue = result;
							this.hasDefaultValue = false;
							return result;
						});
					});
				} else {
					return Promise.resolve<T>(null);
				}
			}
		});
	}

	/**
	 * Arguments come in as a string array. The getValue method must
	 * be implemented by the type of argument to do the conversion
	 * from the given string  array to the argument's concrete type.
	 */
	protected abstract getValue(argParams: string[] | Promise<string[]>): Promise<T>;
}

/**
 * Argument that represents an array of comma-separated strings.
 */
export class ArrayArgument extends Argument<string[]> {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		if (params.length === 1) {
			let stripped = params[0].replace(/(^\[)|(\]$)/g, "");
			return Promise.resolve(stripped.split(",").map(s => s.trim()));
		} else {
			return Promise.resolve(params);
		}
	}
}

/**
 * Argument that represents a set of file paths.
 * @TODO: Better validation of valid/invalid file paths (FS call?)
 */
export class FilePathsArgument extends Argument<string[]> {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		return Promise.resolve(params.map(p => path.resolve(p)));
	}
}

/**
 * Argument that represents a set of existing file paths
 */
export class ExistingFilePathsArgument extends FilePathsArgument {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		return super.getValue(argParams).then(paths => {
			let existencePromises: Promise<string>[] = [];
			paths.forEach(p => {
				let promise = fsUtils.exists(p).then(exists => {
					if (!exists) {
						throw new Error("The file at path " + p + " does not exist.");
					} else {
						return p;
					}
				});
				existencePromises.push(promise);
			});
			return Promise.all(existencePromises);
		});
	}
}

/**
 * Argument that represents a set of writable file paths.
 * Paths that refer to existing files are checked for writability
 * Paths that refer to non-existent files are assumed writable.
 */
export class WritableFilePathsArgument extends FilePathsArgument {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		return super.getValue(argParams).then(paths => {
			let canWritePromises: Promise<string>[] = [];
			paths.forEach(p => {
				let promise = fsUtils.canWriteTo(p).then(canWrite => {
					if (canWrite) {
						return p;
					} else {
						throw new Error("The file at path " + p + " is not writable.");
					}
				});
				canWritePromises.push(promise);
			});
			return Promise.all(canWritePromises);
		});
	}
}

/**
 * Argument that represents a set of readable file paths
 */
export class ReadableFilePathsArgument extends ExistingFilePathsArgument {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		return super.getValue(argParams).then(paths => {
			let canReadPromises: Promise<string>[] = [];
			paths.forEach(p => {
				let promise = fsUtils.fileAccess(p, fsUtils.R_OK).then(canRead => {
					if (canRead) {
						return p;
					} else {
						throw new Error("The file at path " + p + " is not readable.");
					}
				});
				canReadPromises.push(promise);
			});
			return Promise.all(canReadPromises);
		});
	}
}

/**
 * Argument that represents a set of existing directory file paths
 */
export class ExistingDirectoriesArgument extends ExistingFilePathsArgument {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		return super.getValue(argParams).then(paths => {
			let isDirectoryPromises: Promise<string>[] = [];
			paths.forEach(p => {
				let promise = promisify(lstat)(p).then(stats => {
					if (stats.isDirectory()) {
						return p;
					} else {
						throw new Error("The path " + p + " is not a directory.");
					}
				});
				isDirectoryPromises.push(promise);
			});
			return Promise.all(isDirectoryPromises);
		});
	}
}

/**
 * Argument that represents a boolean value.
 */
export class BooleanArgument extends Argument<boolean> {
	/**
	 * If a value is given, parse it and cache the value.
	 */
	protected initialize(): Promise<void> {
		this.initializePromise = Promise.resolve<void>(null);
		if (this.givenValue !== undefined) {
			if (this.givenValue === null) {
				this.assignedValue = false;
				this.initializePromise = Promise.resolve<void>(null);
			} else {
				this.initializePromise = this.getValue(this.givenValue).then(result => {
					this.assignedValue = result;
				});
			}
		}
		return this.initializePromise;
	}

	/**
	 * If there is no argument to this option, assume true.
	 */
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		if (params.length === 1) {
			let yes = ["true", "1", "yes", "y"].indexOf(params[0].toLowerCase()) >= 0;
			if (yes) {
				return Promise.resolve(true);
			}
			let no = ["false", "0", "no", "n"].indexOf(params[0].toLowerCase()) >= 0;
			if (no) {
				return Promise.resolve(false);
			}
			throw new Error("'" + params[0] + "' is not a recognized Boolean value.");
		} else if (params.length === 0) {
			return Promise.resolve(true);
		} else {
			throw new Error("Multiple values provided for Boolean Argument " + this.name + ".");
		}
	}
}

/**
 * Argument that reprents an int value.
 */
export class IntArgument extends Argument<number> {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		if (params.length === 1) {
			let parseResult = parseInt(params[0], 10);
			if (isNaN(parseResult)) {
				throw new Error("Could not parse int argument " + this.name + ".");
			}
			return Promise.resolve(parseResult);
		} else if (params.length === 0) {
			throw new Error("No number provided for Int Argument " + this.name + ".");
		} else {
			throw new Error("Multiple values provided for Int Argument " + this.name + ".");
		}
	}
}

/**
 * Argument that reprents a float value.
 */
export class FloatArgument extends Argument<number> {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		if (params.length === 1) {
			let parseResult = parseFloat(params[0]);
			if (isNaN(parseResult)) {
				throw new Error("Could not parse float argument " + this.name + ".");
			}
			return Promise.resolve(parseResult);
		} else if (params.length === 0) {
			throw new Error("No number provided for Float Argument " + this.name + ".");
		} else {
			throw new Error("Multiple values provided for Float Argument " + this.name + ".");
		}
	}
}

/**
 * Argument that represents a block of JSON.
 * Note: This class must be extended with a concrete type before its constructor
 * function can be referenced. See exec/extensions/default.ts for an example.
 */
export class JsonArgument<T> extends Argument<T> {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		try {
			return Promise.resolve(<T>JSON.parse(params.join(" ")));
		} catch (parseError) {
			let info: string = parseError.stack || parseError.message;
			throw new Error("Failed to parse JSON argument " + this.name + ". Info: " + info);
		}
	}
}

/**
 * Argument that represents a string. Multiple values are joined together
 * by a single space.
 */
export class StringArgument extends Argument<string> {
	protected async getValue(argParams: string[] | Promise<string[]>) {
		const params = Array.isArray(argParams) ? argParams : await argParams;
		return Promise.resolve(params.join(" "));
	}
}

/**
 * Argument that represents a string, however, if we ever have to
 * prompt the user for the value of this argument, we do not echo
 * out the value as it is typed. Good for passwords, tokens, etc.
 */
export class SilentStringArgument extends StringArgument {
	public silent = true;
}

export function getOptionsCache(): Promise<any> {
	let cache = new DiskCache("tfx");
	return cache.itemExists("cache", "command-options").then(cacheExists => {
		let existingCache = Promise.resolve("{}");
		if (cacheExists) {
			existingCache = cache.getItem("cache", "command-options");
		}
		return existingCache.then(cacheStr => {
			try {
				return JSON.parse(cacheStr);
			} catch (ex) {
				return {};
			}
		});
	});
}
