//TODO: add validity check (length, regex, etc...)
export class Argument {
	public name: string;
	public defaultValue: any;
	public friendlyName: string;
	public fromStringConversion: (value: string, ...variableArgs: any[]) => any = identity;
	public silent: boolean = false;
	
	constructor(name: string, 
		friendlyName: string = name, 
		defaultValue: any = null) {
			
		this.name = name;
		this.friendlyName = friendlyName;
		this.defaultValue = defaultValue;
	}
	
	public getValueFromString(stringRepresentation: string): any {
		return this.fromStringConversion(stringRepresentation);
	}
}

export class BooleanArgument extends Argument {
	public defaultValue = false;
}

export class IntArgument extends Argument {
	public fromStringConversion = parseInt;
}

export class SilentStringArgument extends Argument {
	public silent = true;
}

export class StringArgument extends Argument {
	
}

export function identity<T>(arg: T): T {
	return arg;
}

export var ALL: BooleanArgument = new BooleanArgument('all');
export var AUTH_TYPE: StringArgument = new StringArgument('authType', 'authType', 'pat');
export var AUTHOR: StringArgument = new StringArgument('author');
export var BUILD_ID: IntArgument = new IntArgument('id', 'buildId');
export var COLLECTION_URL: StringArgument = new StringArgument('collectionUrl', 'collection url');
export var DEFINITION_ID: IntArgument = new IntArgument('definitionId');
export var DEFINITION_NAME: StringArgument = new StringArgument('definitionName');
export var DESCRIPTION: StringArgument = new StringArgument('description');
export var JSON_FILTER: StringArgument = new StringArgument('jsonFilter');
export var PASSWORD: SilentStringArgument = new SilentStringArgument('password');
export var PAT: SilentStringArgument = new SilentStringArgument('token', 'personal access token');
export var PROJECT_NAME: StringArgument = new StringArgument('project', 'projectName');
export var REPOSITORY_ID: StringArgument = new StringArgument('id', 'repositoryId');
export var STATUS: StringArgument = new StringArgument('status');
export var TASK_FRIENDLY_NAME: StringArgument = new StringArgument('friendlyName', 'friendly name');
export var TASK_ID: IntArgument = new IntArgument('id', 'taskId');
export var TASK_NAME: StringArgument = new StringArgument('name', 'short name');
export var TASK_PATH: StringArgument = new StringArgument('taskPath');
export var TOP: IntArgument = new IntArgument('top');
export var USERNAME: StringArgument = new StringArgument('username');