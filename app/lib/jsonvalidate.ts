var fs = require("fs");
import * as path from 'path';
var check = require("validator");
var trace = require("./trace");
import * as jsonc from "jsonc-parser";
import { DiagnosticIssue, formatDiagnostic } from "./diagnostics";
import { escapeJsonPointerToken, offsetToLineCol, pointerLocation } from "./jsoncLocation";

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
export function validate(jsonFilePath: string, jsonMissingErrorMessage?: string, allMatchedPaths?: string[], json5?: boolean): TaskJson {
  trace.debug("Validating task json...");
  var jsonMissingErrorMsg: string = jsonMissingErrorMessage || "specified json file does not exist.";
  exists(jsonFilePath, jsonMissingErrorMsg);

  const sourceText = fs.readFileSync(jsonFilePath, "utf8");

  var taskJson;
  let pointerContext: any;
  try {
    const parseErrors: jsonc.ParseError[] = [];
    const root = jsonc.parseTree(sourceText, parseErrors, {
      allowTrailingComma: !!json5,
      disallowComments: !json5,
    });

    if (parseErrors.length > 0 || !root) {
      const parseErr: any = new Error("Invalid JSON/JSONC content.");
      parseErr.parseErrors = parseErrors;
      throw parseErr;
    }

    taskJson = jsonc.getNodeValue(root);
    pointerContext = {
      sourceText,
      root,
    };
  } catch (jsonError) {
    trace.debug("Invalid task json: %s", jsonError);
    const err: any = new Error("Invalid task json: " + jsonError);
    let line: number | null = null;
    let col: number | null = null;
    const parseErrors = jsonError && (<any>jsonError).parseErrors;
    if (Array.isArray(parseErrors) && parseErrors.length > 0 && typeof parseErrors[0].offset === "number") {
      const loc = offsetToLineCol(sourceText, parseErrors[0].offset);
      line = loc.line;
      col = loc.col;
    }
    err.validationIssues = [{ file: jsonFilePath, line, col, message: "Invalid task json." }];
    throw err;
  }

  const issues = validateTask(jsonFilePath, taskJson, pointerContext);
  if (issues.length > 0) {
    var output: string = "Invalid task json:";
    for (var i = 0; i < issues.length; i++) {
      output += "\n\t" + issues[i].message;
    }
    trace.debug(output);
    const err: any = new Error(output);
    err.validationIssues = issues;
    throw err;
  }

  trace.debug("Json is valid.");
  validateRunner(taskJson, allMatchedPaths, jsonFilePath, pointerContext);
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
 * @return the lowest number of valid (non-deprecated) runners across all execution handlers in the task, or 0 if no (prejob|postjob)execution is defined at all
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
export function validateRunner(taskData: any, allMatchedPaths?: string[], taskPath?: string, pointerContext?: any) {
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

    const messagePrefix =
      "Task " +
      (taskData.name || "?") +
      "@" +
      (taskData.version?.Major || "?") +
      " is dependent on a task runner that is end-of-life and will be removed in the future. Please visit https://aka.ms/node-runner-guidance to learn how to upgrade the task.";

    const executionProperties = ['execution', 'prejobexecution', 'postjobexecution'];
    const locations: Array<{ executionType: string; runner: string; line: number | null; col: number | null }> = [];

    for (const executionType of executionProperties) {
      if (taskData[executionType]) {
        Object.keys(taskData[executionType]).forEach(runner => {
          if (deprecatedRunners.indexOf(runner) !== -1) {
            const runnerLoc = pointerLocation(pointerContext, `/${escapeJsonPointerToken(executionType)}/${escapeJsonPointerToken(runner)}`);
            locations.push({
              executionType,
              runner,
              line: runnerLoc.line,
              col: runnerLoc.col,
            });
          }
        });
      }
    }

    if (locations.length === 0) {
      if (taskPath) {
        console.warn(`${taskPath}(1,1): warning: ${messagePrefix}`);
      } else {
        console.warn(`warning: ${messagePrefix}`);
      }
      return;
    }

    locations.forEach(location => {
      const detail = `${messagePrefix} Deprecated runner '${location.runner}' found in '${location.executionType}'.`;
      if (taskPath) {
        console.warn(
          formatDiagnostic(
            { file: taskPath, line: location.line ?? 1, col: location.col ?? 1, message: detail },
            "warning",
          ),
        );
      } else {
        console.warn(formatDiagnostic({ file: null, line: null, col: null, message: detail }, "warning"));
      }
    });
  }
}

/*
 * Validates a parsed json file describing a build task
 * @param taskPath the path to the original json file
 * @param taskData the parsed json file
  * @return list of issues with the json file
 */
export function validateTask(taskPath: string, taskData: any, pointerContext: any): DiagnosticIssue[] {
  var vn = taskData.name || taskPath;
  var issues: DiagnosticIssue[] = [];

  const rootLoc = pointerLocation(pointerContext, "");
  const idLoc = pointerLocation(pointerContext, "/id");
  const nameLoc = pointerLocation(pointerContext, "/name");
  const friendlyNameLoc = pointerLocation(pointerContext, "/friendlyName");
  const instanceNameFormatLoc = pointerLocation(pointerContext, "/instanceNameFormat");

  if (!taskData.id || !check.isUUID(taskData.id)) {
    issues.push({ file: taskPath, line: idLoc.line ?? rootLoc.line, col: idLoc.col ?? rootLoc.col, message: "id is a required guid" });
  }

  if (!taskData.name || !check.matches(taskData.name, /^[A-Za-z0-9\-]+$/)) {
    issues.push({ file: taskPath, line: nameLoc.line ?? rootLoc.line, col: nameLoc.col ?? rootLoc.col, message: "name is a required alphanumeric string" });
  }

  if (!taskData.friendlyName || !check.isLength(taskData.friendlyName, 1, 40)) {
    issues.push({ file: taskPath, line: friendlyNameLoc.line ?? rootLoc.line, col: friendlyNameLoc.col ?? rootLoc.col, message: "friendlyName is a required string <= 40 chars" });
  }

  if (!taskData.instanceNameFormat) {
    issues.push({ file: taskPath, line: instanceNameFormatLoc.line ?? rootLoc.line, col: instanceNameFormatLoc.col ?? rootLoc.col, message: "instanceNameFormat is required" });
  }

  issues.push(...validateAllExecutionHandlers(taskPath, taskData, vn, pointerContext));

  // Fix: Return issues array regardless of whether execution block exists or not
  // Previously this return was inside the if(taskData.execution) block, causing
  // tasks without execution configuration to return undefined instead of validation issues
  return issues;
}

/**
   * Validates all execution/prejob/postjob handlers for a task
   * @param taskPath Path to the original json file
   * @param taskData The parsed json file
   * @param vn Name of the task or path
   * @returns Array of issues found for all handlers
   */
function validateAllExecutionHandlers(taskPath: string, taskData: any, vn: string, pointerContext: any): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const executionProperties = ['execution', 'prejobexecution', 'postjobexecution'];
  const supportedRunners = ["Node", "Node10", "Node16", "Node20_1", "Node24", "PowerShell", "PowerShell3", "Process"];
  executionProperties.forEach(executionType => {
    if (taskData[executionType]) {
      Object.keys(taskData[executionType]).forEach(runner => {
        if (supportedRunners.indexOf(runner) === -1) return;
        const target = taskData[executionType][runner]?.target;
        issues.push(...validateExecutionTarget(taskPath, vn, executionType, runner, target, pointerContext));
      });
    }
  });
  return issues;
}

/**
 * Validates the target property for a given execution handler
 * @param taskPath Path to the original json file
 * @param vn Name of the task or path
 * @param executionType Type of execution handler (execution, prejobexecution, postjobexecution)
 * @param runner Name of the runner
 * @param target Execution handler's target
 * @returns Array of issues found for this runner
 */
function validateExecutionTarget(taskPath: string, vn: string, executionType: string, runner: string, target: string | undefined, pointerContext: any): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const targetPointer = `/${escapeJsonPointerToken(executionType)}/${escapeJsonPointerToken(runner)}/target`;
  const targetLoc = pointerLocation(pointerContext, targetPointer);

  if (!target) {
    issues.push({ file: taskPath, line: targetLoc.line, col: targetLoc.col, message: `${executionType}.${runner}.target is required` });
  } else {
    const normalizedTarget = target.replace(/\$\(\s*currentdirectory\s*\)/i, ".");

    // target contains a variable
    if (normalizedTarget.match(/\$\([^)]+\)/)) {
      return issues;
    }

    // check if the target file exists
    if (!fs.existsSync(path.join(path.dirname(taskPath), normalizedTarget))) {
      issues.push({ file: taskPath, line: targetLoc.line, col: targetLoc.col, message: `${executionType}.${runner}.target references file that does not exist: ${normalizedTarget}` });
    }
  }
  return issues;
}
