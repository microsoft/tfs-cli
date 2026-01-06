import trace = require("./trace");

/**
 * Extracts a readable error message from an AggregateError or returns null if not applicable.
 * AggregateError contains an 'errors' array with the individual errors.
 */
function formatAggregateError(err: any): string | null {
	if (err && err.name === "AggregateError" && Array.isArray(err.errors)) {
		const messages = err.errors.map((e: any, index: number) => {
			if (typeof e === "string") {
				return `  [${index + 1}] ${e}`;
			} else if (e instanceof Error) {
				return `  [${index + 1}] ${e.message}`;
			} else if (typeof e === "object" && e.message) {
				return `  [${index + 1}] ${e.message}`;
			} else {
				return `  [${index + 1}] ${String(e)}`;
			}
		});
		return `Multiple errors occurred:\n${messages.join("\n")}`;
	}
	return null;
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

export function errLog(arg) {
	// Check for AggregateError first (from Promise.all/Promise.any failures)
	const aggregateMessage = formatAggregateError(arg);
	if (aggregateMessage) {
		trace.debug(arg.stack);
		trace.error(aggregateMessage);
	} else if (typeof arg === "string") {
		trace.error(arg);
	} else if (typeof arg.toString === "function") {
		trace.debug(arg.stack);
		trace.error(arg.toString());
	} else if (typeof arg === "object") {
		try {
			trace.error(JSON.parse(arg));
		} catch (e) {
			trace.error(arg);
		}
	} else {
		trace.error(arg);
	}
	process.exit(-1);
}
