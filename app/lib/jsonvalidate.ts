var fs = require("fs");
import * as path from 'path';
var check = require("validator");
var trace = require("./trace");

const deprecatedRunners = ["Node", "Node6", "Node10", "Node16"];

export interface TaskJson {
  id: string;
}

/*
 * Checks a json file for correct formatting against some validation function
 * @param jsonFilePath path to the json file being validated
 * @param jsonMissingErrorMessage error message if json file doesn't exist
 * @param allMatchedPaths optional array of all matched task.json paths for backwards compat detection
 * @return the parsed json file
 * @throws InvalidDirectoryException if json file doesn't exist, InvalidJsonException on failed parse or *first* invalid field in json
*/
export function validate(jsonFilePath: string, jsonMissingErrorMessage?: string, allMatchedPaths?: string[]): TaskJson {
  trace.debug("Validating task json...");
  var jsonMissingErrorMsg: string = jsonMissingErrorMessage || "specified json file does not exist.";
  exists(jsonFilePath, jsonMissingErrorMsg);

  var taskJson;
  try {
    taskJson = require(jsonFilePath);
  } catch (jsonError) {
    trace.debug("Invalid task json: %s", jsonError);
    throw new Error("Invalid task json: " + jsonError);
  }

  var issues: string[] = validateTask(jsonFilePath, taskJson);
  if (issues.length > 0) {
    var output: string = "Invalid task json:";
    for (var i = 0; i < issues.length; i++) {
      output += "\n\t" + issues[i];
    }
    trace.debug(output);
    throw new Error(output);
  }

  trace.debug("Json is valid.");
  validateRunner(taskJson, allMatchedPaths);
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
 * Counts the number of non-deprecated runners in a task's execution configuration
 * @param taskData the parsed json file
 * @return number of valid (non-deprecated) runners, or 0 if no execution is defined
 */
function countValidRunners(taskData: any): number {
  if (taskData == undefined)
    return 0;

  const executionProperties = ['execution', 'prejobexecution', 'postjobexecution'];
  const counts = [];

  for (const prop of executionProperties) {
    if (taskData[prop]) {
      const validRunnerCount = Object.keys(taskData[prop]).filter(itm => deprecatedRunners.indexOf(itm) == -1).length;
      counts.push(validRunnerCount);
    }
  }

  return counts.length > 0 ? Math.min(...counts) : 0;
}

/*
 * Validates a task against deprecated runner
 * @param taskData the parsed json file
 * @param allMatchedPaths optional array of all matched task.json paths for backwards compat detection
 */
export function validateRunner(taskData: any, allMatchedPaths?: string[]) {
  if (countValidRunners(taskData) == 0) {
    if (allMatchedPaths) {
      for (const matchedPath of allMatchedPaths) {
        let matchedTaskData;
        try {
          matchedTaskData = require(matchedPath);
        } catch {
          continue;
        }
        if (taskData.name == matchedTaskData.name && taskData.id == matchedTaskData.id && matchedTaskData.version?.Major > taskData.version?.Major) {
          // Return if the other task is using a non-deprecated task runner
          const otherValidRunnerCount = countValidRunners(matchedTaskData);
          if (otherValidRunnerCount > 0) {
            return;
          }
        }
      }
    }
    
    trace.warn("Task %s@%s is dependent on a task runner that is end-of-life and will be removed in the future. Please visit https://aka.ms/node-runner-guidance to learn how to upgrade the task.", taskData.name, taskData.version?.Major || "?")
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
  }
  // Fix: Return issues array regardless of whether execution block exists or not
  // Previously this return was inside the if(taskData.execution) block, causing
  // tasks without execution configuration to return undefined instead of validation issues
  return (issues.length > 0) ? [taskPath, ...issues] : [];
}
