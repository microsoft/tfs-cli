import trace = require("./trace");

/**
 * Formats any error type into a readable string message.
 * Handles AggregateError, Error, strings, objects, and other types.
 */
function formatError(err: any): string {
	// Handle AggregateError (from Promise.all/Promise.any failures)
	if (err && err.name === "AggregateError" && Array.isArray(err.errors)) {
		const messages = err.errors.map((e: any, index: number) => 
			`  [${index + 1}] ${formatError(e)}`
		);
		return `Multiple errors occurred:\n${messages.join("\n")}`;
	}
	
	// Handle plain strings
	if (typeof err === "string") {
		return err;
	}
	
	// Handle Error instances - use toString() to preserve "Error: message" format
	if (err instanceof Error) {
		return err.toString();
	}
	
	// Handle objects with a custom toString method (not the default Object.prototype.toString)
	if (err !== null && typeof err === "object" && typeof err.toString === "function" && err.toString !== Object.prototype.toString) {
		const result = err.toString();
		// Make sure it's not returning "[object Object]" (the default)
		if (result !== "[object Object]") {
			return result;
		}
	}
	
	// Handle objects with a message property (error-like objects)
	if (typeof err?.message === "string") {
		return err.message;
	}
	
	// Handle plain objects - try JSON serialization
	if (typeof err === "object" && err !== null) {
		try {
			return JSON.stringify(err, null, 2);
		} catch (e) {
			return String(err);
		}
	}
	
	// Fallback for any other type
	return String(err);
}

export function httpErr(obj): any {
	let errorAsObj = obj;
	if (typeof errorAsObj === "string") {
		try {
			errorAsObj = JSON.parse(errorAsObj);
		} catch (parseError) {
			throw errorAsObj;
		}
	}
	let statusCode: number = errorAsObj.statusCode;
	if (statusCode === 401) {
		throw "Received response 401 (Not Authorized). Check that your personal access token is correct and hasn't expired.";
	}
	if (statusCode === 403) {
		throw "Received response 403 (Forbidden). Check that you have access to this resource. Message from server: " +
			errorAsObj.message;
	}
	let errorBodyObj = errorAsObj.body;
	if (errorBodyObj) {
		if (typeof errorBodyObj === "string") {
			try {
				errorBodyObj = JSON.parse(errorBodyObj);
			} catch (parseError) {
				throw errorBodyObj;
			}
		}
		if (errorBodyObj.message) {
			let message = errorBodyObj.message;
			if (message) {
				throw message;
			} else {
				throw errorBodyObj;
			}
		}
	} else {
		throw errorAsObj.message || "Encountered an unknown failure issuing an HTTP request.";
	}
}

export function errLog(arg: any): void {
	trace.debug(arg?.stack);
	trace.error(formatError(arg));
	process.exit(-1);
}
