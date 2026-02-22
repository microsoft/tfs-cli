import trace = require("./trace");

function shouldEmitJsonError(): boolean {
	const argv = process.argv || [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--json") {
			return true;
		}
		if (arg === "--output" && i + 1 < argv.length && argv[i + 1].toLowerCase() === "json") {
			return true;
		}
		if (arg.indexOf("--output=") === 0 && arg.substring("--output=".length).toLowerCase() === "json") {
			return true;
		}
	}
	return false;
}

function toStructuredIssues(err: any): any[] {
	if (!err || !Array.isArray(err.validationIssues)) {
		return null;
	}
	return err.validationIssues.map(issue => ({
		file: issue && issue.file !== undefined ? issue.file : null,
		line: issue && issue.line !== undefined ? issue.line : null,
		col: issue && issue.col !== undefined ? issue.col : null,
		message: issue && issue.message ? issue.message : String(issue),
	}));
}

function formatIssueForEditor(issue: any): string {
	const file = issue && issue.file ? String(issue.file) : null;
	const line = issue && typeof issue.line === "number" ? issue.line : null;
	const col = issue && typeof issue.col === "number" ? issue.col : null;
	const message = issue && issue.message ? String(issue.message) : String(issue);

	if (file && line !== null && col !== null) {
		return `${file}(${line},${col}): error: ${message}`;
	}
	if (file && line !== null) {
		return `${file}(${line}): error: ${message}`;
	}
	if (file) {
		return `${file}: error: ${message}`;
	}
	return `error: ${message}`;
}

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
	if (shouldEmitJsonError()) {
		const payload: any = {
			status: "error",
			message: formatError(arg),
		};
		const issues = toStructuredIssues(arg);
		if (issues) {
			payload.issues = issues;
		}
		console.log(JSON.stringify(payload, null, 4));
		process.exit(-1);
		return;
	}
	const issues = toStructuredIssues(arg);
	if (issues && issues.length > 0) {
		issues.forEach(issue => {
			console.error(formatIssueForEditor(issue));
		});
		process.exit(-1);
		return;
	}
	trace.error(formatError(arg));
	process.exit(-1);
}
