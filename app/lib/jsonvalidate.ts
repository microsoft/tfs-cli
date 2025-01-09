var fs = require("fs");
var check = require("validator");
var trace = require("./trace");

const deprecatedRunners = ["Node", "Node6", "Node10", "Node16"];

export interface TaskJson {
	id: string;
}

/*
 * Checks a json file for correct formatting against some validation function
 * @param jsonFilePath path to the json file being validated
 * @param jsonValidationFunction function that validates parsed json data against some criteria
 * @return the parsed json file
 * @throws InvalidDirectoryException if json file doesn't exist, InvalidJsonException on failed parse or *first* invalid field in json
*/
export function validate(jsonFilePath: string, jsonMissingErrorMessage?: string): TaskJson {
	trace.debug("Validating task json...");
	var jsonMissingErrorMsg: string = jsonMissingErrorMessage || "specified json file does not exist.";
	this.exists(jsonFilePath, jsonMissingErrorMsg);

	var taskJson;
	try {
		taskJson = require(jsonFilePath);
	} catch (jsonError) {
		trace.debug("Invalid task json: %s", jsonError);
		throw new Error("Invalid task json: " + jsonError);
	}

	var issues: string[] = this.validateTask(jsonFilePath, taskJson);
	if (issues.length > 0) {
		var output: string = "Invalid task json:";
		for (var i = 0; i < issues.length; i++) {
			output += "\n\t" + issues[i];
		}
		trace.debug(output);
		throw new Error(output);
	}

	trace.debug("Json is valid.");
	validateRunner(taskJson);
	return taskJson;
}

/*
 * Wrapper for fs.existsSync that includes a user-specified errorMessage in an InvalidDirectoryException
 */
export function exists(path: string, errorMessage: string) {
	if (!fs.existsSync(path)) {
		trace.debug(errorMessage);
		throw new Error(errorMessage);
	}
}

/*
 * Validates a task against deprecated runner
 * @param taskData the parsed json file
 */
export function validateRunner(taskData: any) {
	if(taskData == undefined || taskData.execution == undefined)
		return

	const validRunnerCount = Object.keys(taskData.execution).filter(itm=> deprecatedRunners.indexOf(itm) == -1) || 0;
	if(validRunnerCount == 0){
		trace.warn("Task %s is dependent on a task runner that is end-of-life and will be removed in the future. Authors should review Node upgrade guidance: https://aka.ms/node-runner-guidance.",taskData.name)
	}
}

/*
 * Validates a parsed json file describing a build task
 * @param taskPath the path to the original json file
 * @param taskData the parsed json file
 * @return list of issues with the json file
 */
export function validateTask(taskPath: string, taskData: any): string[] {
	var vn = taskData.name || taskPath;
	var issues: string[] = [];

	if (!taskData.id || !check.isUUID(taskData.id)) {
		issues.push(vn + ": id is a required guid");
	}

	if (!taskData.name || !check.matches(taskData.name, /^[A-Za-z0-9\-]+$/)) {
		issues.push(vn + ": name is a required alphanumeric string");
	}

	if (!taskData.friendlyName || !check.isLength(taskData.friendlyName, 1, 40)) {
		issues.push(vn + ": friendlyName is a required string <= 40 chars");
	}

	if (!taskData.instanceNameFormat) {
		issues.push(vn + ": instanceNameFormat is required");
	}
	return issues;
}
