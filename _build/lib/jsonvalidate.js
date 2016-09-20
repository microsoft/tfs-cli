"use strict";
var Q = require('q');
var fs = require('fs');
var shell = require('shelljs');
var check = require('validator');
var trace = require('./trace');
/*
 * Checks a json file for correct formatting against some validation function
 * @param jsonFilePath path to the json file being validated
 * @param jsonValidationFunction function that validates parsed json data against some criteria
 * @return the parsed json file
 * @throws InvalidDirectoryException if json file doesn't exist, InvalidJsonException on failed parse or *first* invalid field in json
*/
function validate(jsonFilePath, jsonMissingErrorMessage) {
    trace.debug('Validating task json...');
    var deferred = Q.defer();
    var jsonMissingErrorMsg = jsonMissingErrorMessage || 'specified json file does not exist.';
    this.exists(jsonFilePath, jsonMissingErrorMsg);
    var taskJson;
    try {
        taskJson = require(jsonFilePath);
    }
    catch (jsonError) {
        trace.debug('Invalid task json: %s', jsonError);
        throw new Error("Invalid task json: " + jsonError);
    }
    var issues = this.validateTask(jsonFilePath, taskJson);
    if (issues.length > 0) {
        var output = "Invalid task json:";
        for (var i = 0; i < issues.length; i++) {
            output += "\n\t" + issues[i];
        }
        trace.debug(output);
        deferred.reject(new Error(output));
    }
    trace.debug('Json is valid.');
    deferred.resolve(taskJson);
    return deferred.promise;
}
exports.validate = validate;
/*
 * Wrapper for fs.existsSync that includes a user-specified errorMessage in an InvalidDirectoryException
 */
function exists(path, errorMessage) {
    if (!fs.existsSync(path)) {
        trace.debug(errorMessage);
        throw new Error(errorMessage);
    }
}
exports.exists = exists;
/*
 * Validates a parsed json file describing a build task
 * @param taskPath the path to the original json file
 * @param taskData the parsed json file
 * @return list of issues with the json file
 */
function validateTask(taskPath, taskData) {
    var vn = (taskData.name || taskPath);
    var issues = [];
    if (!taskData.id || !check.isUUID(taskData.id)) {
        issues.push(vn + ': id is a required guid');
    }
    if (!taskData.name || !check.isAlphanumeric(taskData.name)) {
        issues.push(vn + ': name is a required alphanumeric string');
    }
    if (!taskData.friendlyName || !check.isLength(taskData.friendlyName, 1, 40)) {
        issues.push(vn + ': friendlyName is a required string <= 40 chars');
    }
    if (!taskData.instanceNameFormat) {
        issues.push(vn + ': instanceNameFormat is required');
    }
    return issues;
}
exports.validateTask = validateTask;
