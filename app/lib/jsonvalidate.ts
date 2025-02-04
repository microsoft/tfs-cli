var fs = require("fs");
import * as path from 'path';
var check = require("validator");
var trace = require("./trace");

const deprecatedRunners = ["Node6", "Node10", "Node16"];

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
  if (taskData == undefined || taskData.execution == undefined)
    return

  const validRunnerCount = Object.keys(taskData.execution).filter(itm => deprecatedRunners.indexOf(itm) == -1) || 0;
  if (validRunnerCount == 0) {
    trace.warn("Task %s is dependent on a task runner that is end-of-life and will be removed in the future. Authors should review Node upgrade guidance: https://aka.ms/node-runner-guidance.", taskData.name)
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

  if (taskData.execution) {
    const supportedRunners = ["Node", "Node10", "Node16", "Node20_1", "PowerShell", "PowerShell3", "Process"]

    /*
    The exection object has the following structure:

    "execution":{"Node":{"target":"ping.js","argumentFormat":""},"PowerShell3":{"target":"ping.ps1","argumentFormat":""}}

    Do the following for each supported runner under execution
    - check for each child of exection whether it's in the list of supported runner
    - if the item is in the list of supported runners, check if the target file exists
    */

    for (var runner in taskData.execution) {
      if (supportedRunners.indexOf(runner) > -1) {
        var runnerData = taskData.execution[runner];
        if (!runnerData.target) {
          issues.push(vn + ": execution." + runner + ".target is required");
        } else {
          const target = runnerData.target.replace(/\$\(\s*currentdirectory\s*\)/i, ".");

          // target contains a variable
          if (target.match(/\$\([^)]+\)/)) {
            continue;
          }

          // check if the target file exists
          if (!fs.existsSync(path.join(path.dirname(taskPath), target))) {
            issues.push(vn + ": execution target for " + runner + " references file that does not exist: " + target);
          }
        }
      }
    }

    if (issues.length > 0) {
      return [taskPath, ...issues];
    }
  }
}
