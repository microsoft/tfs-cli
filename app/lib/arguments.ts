import _ = require("lodash");
import colors = require("colors");
import common = require("../lib/common");
import { DiskCache } from "../lib/diskcache";
import qfs = require("./qfs");
import path = require("path");
import Q = require("q");
import qread = require("./qread");
import trace = require("../lib/trace");

/**
 * Class that represents an argument with a value. Calling .val() will retrieve
 * the typed value, parsed from the givenValue (a string). If no givenValue
 * was provided, we will prompt the user.
 */
export abstract class Argument<T> {
	public silent: boolean = false;
	protected assignedValue: T;
	protected initializePromise: Q.Promise<void>;
	protected givenValue: string[];

	constructor(
		public name: string,
		public friendlyName: string = name,
		public description?: string,
		givenValue?: string[] | string,
		public hasDefaultValue?: boolean) {

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
	protected initialize(): Q.Promise<void> {
		let initPromise = Q.resolve<void>(null);
		if (this.assignedValue === undefined && (this.hasDefaultValue || this.givenValue === undefined)) {
			initPromise = getOptionsCache().then((cache) => {
				let cacheKey = path.resolve().replace("/\.\[\]/g", "-") + "." + 
					common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
				let cachedValue = _.get<string | string[]>(cache, cacheKey + "." + this.name);
				let cachedValueStringArray: string[];
				if (typeof cachedValue === "string") {
					cachedValueStringArray = [cachedValue];
				} else if (_.isArray(cachedValue)) {
					cachedValueStringArray = cachedValue;
				}
				if (cachedValue !== undefined) {
					return this.getValue(cachedValueStringArray).then((result) => {
						this.initializeAssignedValue(result);
					});
				} else if (this.givenValue !== null && this.givenValue !== undefined) {
					return this.getValue(this.givenValue).then((result) => {
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
				initPromise = this.getValue(this.givenValue).then((result) => {
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
		this.initializePromise = Q.resolve<void>(null);
	}

	/**
	 * Get the value of this argument by what was passed in. If nothing has
	 * been passed in, prompt the user. The resulting promise is resolved
	 * when a value is available.
	 */
	public val(noPrompt: boolean = false): Q.Promise<T> {
		return this.initializePromise.then(() => {
			if (this.assignedValue !== undefined) {
				return Q.resolve(this.assignedValue);
			} else {
				if (!noPrompt) {
					if (common.NO_PROMPT) {
						throw "Missing required value for argument '" + this.name + "'.";
					}
					return qread.read(this.name, this.friendlyName, this.silent).then((answer) => {
						// Split answer into args, just as if they were passed through command line
						let splitAnswer = answer.match(/".+?"|[^ ]+/g) || [""];
						let answerArgs = splitAnswer.map(a => {
							// trim quotes if needed
							if (a.substr(0, 1) === '"' && a.substr(a.length - 1, 1) === '"') {
								a = a.substr(1, a.length - 1);
							}
							return a;
						});
						return this.getValue(answerArgs).then((result) => {
							this.assignedValue = result;
							this.hasDefaultValue = false;
							return result;
						});
					});
				} else {
					return Q.resolve<T>(null);
				}
			}
		});
	}

	/**
	 * Arguments come in as a string array. The getValue method must
	 * be implemented by the type of argument to do the conversion
	 * from the given string  array to the argument's concrete type.
	 */
	protected abstract getValue(argParams: string[]): Q.Promise<T>;
}

/**
 * Argument that represents an array of comma-separated strings.
 */
export class ArrayArgument extends Argument<string[]> {
	protected getValue(argParams: string[]) {
		if (argParams.length === 1) {
			let stripped = argParams[0].replace(/(^\[)|(\]$)/g, "");
			return Q.resolve(stripped.split(",").map(s => s.trim()));
		} else {
			return Q.resolve(argParams);
		}
	}
}

/**
 * Argument that represents a set of file paths.
 * @TODO: Better validation of valid/invalid file paths (FS call?)
 */
export class FilePathsArgument extends Argument<string[]> {
	protected getValue(argParams: string[]) {
		return Q.resolve(argParams.map(p => path.resolve(p)));
	}
}

/**
 * Argument that represents a set of existing file paths
 */
export class ExistingFilePathsArgument extends FilePathsArgument {
	protected getValue(argParams: string[]) {
		return super.getValue(argParams).then((paths) => {
			let existencePromises: Q.Promise<string>[] = [];
			paths.forEach((p) => {
				let promise = qfs.exists(p).then((exists) => {
					if (!exists) {
						throw new Error("The file at path " + p + " does not exist.");
					} else {
						return p;
					}
				});
				existencePromises.push(promise);
			});
			return Q.all(existencePromises);
		});
	}
}

/**
 * Argument that represents a set of writable file paths.
 * Paths that refer to existing files are checked for writability
 * Paths that refer to non-existent files are assumed writable.
 */
export class WritableFilePathsArgument extends FilePathsArgument {
	protected getValue(argParams: string[]) {
		return super.getValue(argParams).then((paths) => {
			let canWritePromises: Q.Promise<string>[] = [];
			paths.forEach((p) => {
				let promise = qfs.canWriteTo(p).then((canWrite) => {
					if (canWrite) {
						return p;
					} else {
						throw new Error("The file at path " + p + " is not writable.");
					}
				});
				canWritePromises.push(promise);
			});
			return Q.all(canWritePromises);
		});
	}
}

/**
 * Argument that represents a set of readable file paths
 */
export class ReadableFilePathsArgument extends ExistingFilePathsArgument {
	protected getValue(argParams: string[]) {
		return super.getValue(argParams).then((paths) => {
			let canReadPromises: Q.Promise<string>[] = [];
			paths.forEach((p) => {
				let promise = qfs.fileAccess(p, qfs.R_OK).then((canRead) => {
					if (canRead) {
						return p;
					} else {
						throw new Error("The file at path " + p + " is not readable.");
					}
				});
				canReadPromises.push(promise);
			});
			return Q.all(canReadPromises);
		});
	}
}

/**
 * Argument that represents a set of existing directory file paths
 */
export class ExistingDirectoriesArgument extends ExistingFilePathsArgument {
	protected getValue(argParams: string[]) {
		return super.getValue(argParams).then((paths) => {
			let isDirectoryPromises: Q.Promise<string>[] = [];
			paths.forEach((p) => {
				let promise = qfs.lstat(p).then((stats) => {
					if (stats.isDirectory()) {
						return p;
					} else {
						throw new Error("The path " + p + " is not a directory.");
					}
				});
				isDirectoryPromises.push(promise);
			});
			return Q.all(isDirectoryPromises);
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
	protected initialize(): Q.Promise<void> {
		this.initializePromise = Q.resolve<void>(null);
		if (this.givenValue !== undefined) {
			if (this.givenValue === null) {
				this.assignedValue = false;
				this.initializePromise = Q.resolve<void>(null);
			} else {
				this.initializePromise = this.getValue(this.givenValue).then((result) => {
					this.assignedValue = result;
				});
			}
		}
		return this.initializePromise;
	}

	/**
	 * If there is no argument to this option, assume true.
	 */
	protected getValue(argParams: string[]) {
		if (argParams.length === 1) {
			let yes = ["true", "1", "yes", "y"].indexOf(argParams[0].toLowerCase()) >= 0;
			if (yes) {
				return Q.resolve(true);
			}
			let no = ["false", "0", "no", "n"].indexOf(argParams[0].toLowerCase()) >= 0;
			if (no) {
				return Q.resolve(false);
			}
			throw new Error("'" + argParams[0] + "' is not a recognized Boolean value.");
		} else if (argParams.length === 0) {
			return Q.resolve(true);
		} else {
			throw new Error("Multiple values provided for Boolean Argument " + this.name + ".");
		}
	}
}

/**
 * Argument that reprents an int value.
 */
export class IntArgument extends Argument<number> {
	protected getValue(argParams: string[]) {
		if (argParams.length === 1) {
			let parseResult = parseInt(argParams[0], 10);
			if (isNaN(parseResult)) {
				throw new Error("Could not parse int argument " + this.name + ".");
			}
			return Q.resolve(parseResult);
		} else if (argParams.length === 0) {
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
	protected getValue(argParams: string[]) {
		if (argParams.length === 1) {
			let parseResult = parseFloat(argParams[0]);
			if (isNaN(parseResult)) {
				throw new Error("Could not parse float argument " + this.name + ".");
			}
			return Q.resolve(parseResult);
		} else if (argParams.length === 0) {
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
	protected getValue(argParams: string[]) {
		try {
			return Q.resolve(<T>JSON.parse(argParams.join(" ")));
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
	protected getValue(argParams: string[]) {
		return Q.resolve(argParams.join(" "));
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

export function getOptionsCache(): Q.Promise<any> {
	let cache = new DiskCache("tfx");
	return cache.itemExists("cache", "command-options").then((cacheExists) => {
		let existingCache = Q.resolve("{}");
		if (cacheExists) {
			existingCache = cache.getItem("cache", "command-options");
		}
		return existingCache.then((cacheStr) => {
			try {
				return JSON.parse(cacheStr);
			} catch (ex) {
				return {};
			}
		});
	});
}