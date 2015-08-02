var shell = require('shelljs');
var check = require('validator');

export class JsonValidate {
	public readJson(path: string) {

	}

	public validateTask(taskJson: any, taskPath: string) {
        var vn = (taskJson.name || taskPath);

        if (!taskJson.id || !check.isUUID(taskJson.id)) {
            throw new InvalidFieldException(vn + ': id is a required guid');
        }

        if (!taskJson.name || !check.isAlphanumeric(taskJson.name)) {
            throw new InvalidFieldException(vn + ': name is a required alphanumeric string');
        }

        if (!taskJson.friendlyName || !check.isLength(taskJson.friendlyName, 1, 40)) {
            throw new InvalidFieldException(vn + ': friendlyName is a required string <= 40 chars');
        }

        if (!taskJson.instanceNameFormat) {
            throw new InvalidFieldException(vn + ': instanceNameFormat is required');
        }
	}
}

export class InvalidFieldException implements NodeJS.ErrnoException {
	name: string = 'InvalidFieldException';
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}

export class InvalidDirectoryException implements NodeJS.ErrnoException {
	name: string = "InvalidDirectoryException";
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}