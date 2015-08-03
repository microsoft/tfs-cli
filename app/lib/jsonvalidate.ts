var fs = require('fs');
var shell = require('shelljs');
var check = require('validator');

export class JsonValidate {
	/*
	 * Checks a json file for correct formatting against some validation function
	 * @param jsonFilePath path to the json file being validated
	 * @param jsonValidationFunction function that validates parsed json data against some criteria
	 * @return the parsed json file
	 * @throws InvalidDirectoryException if json file doesn't exist, InvalidJsonException on failed parse or *first* invalid field in json
	*/
	public validateJson(jsonFilePath: string, jsonValidationFunction: (path: string, jsonData: any) => void, jsonMissingErrorMessage?: string): any {
		var jsonMissingErrorMsg: string = jsonMissingErrorMessage || 'specified json file does not exist.'
        this.exists(jsonFilePath, jsonMissingErrorMsg);

        var taskJson;
        try {
            taskJson = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        }
        catch (jsonError) {
            throw new InvalidJsonException("Invalid task json: " + jsonError);
        }
        try {
        	this.validateTask(jsonFilePath, taskJson);
        }
        catch (jsonFormatError) {
			throw new InvalidJsonException("Invalid task json: ", jsonFormatError);
        }
        return taskJson;
	}

	/*
	 * Wrapper for fs.existsSync that includes a user-specified errorMessage in an InvalidDirectoryException
	 */
	public exists(path: string, errorMessage: string) {
		if(!fs.existsSync(path)) {
			throw new InvalidDirectoryException(errorMessage);
		}
	}

	/*
     * Validates a parsed json file describing a build task
     * @param taskPath the path to the original json file
     * @param taskData the parsed json file
     */
	public validateTask(taskPath: string, taskData: any) {
        var vn = (taskData.name || taskPath);

        if (!taskData.id || !check.isUUID(taskData.id)) {
            throw new InvalidFieldException(vn + ': id is a required guid');
        }

        if (!taskData.name || !check.isAlphanumeric(taskData.name)) {
            throw new InvalidFieldException(vn + ': name is a required alphanumeric string');
        }

        if (!taskData.friendlyName || !check.isLength(taskData.friendlyName, 1, 40)) {
            throw new InvalidFieldException(vn + ': friendlyName is a required string <= 40 chars');
        }

        if (!taskData.instanceNameFormat) {
            throw new InvalidFieldException(vn + ': instanceNameFormat is required');
        }
	}
}

export class InvalidJsonException implements Error {
	name: string = 'InvalidJsonException';
	message: string;
	constructor(message: string, innerException?: Error) {
		this.message = message;
		if(innerException){
			this.message += "\n\t -> " + innerException.message; 
		}
	}
}

export class InvalidFieldException implements Error {
	name: string = 'InvalidFieldException';
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}

export class InvalidDirectoryException implements Error {
	name: string = "InvalidDirectoryException";
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}