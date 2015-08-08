export class Argument {
	public name: string;
	public defaultValue: any;
	public friendlyName: string;
	public fromStringConversion: (value: string, ...variableArgs: any[]) => any = identity;
	
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

export class StringArgument extends Argument {
	
}

export class IntArgument extends Argument {
	public fromStringConversion = parseInt;
}

export class BooleanArgument extends Argument {
	public defaultValue = false;
}

export function identity<T>(arg: T): T {
	return arg;
}

export var ALL: BooleanArgument = new BooleanArgument('all');
export var AUTH_TYPE: StringArgument = new StringArgument('authType', 'authType', 'pat');
export var BUILD_ID: IntArgument = new IntArgument('id', 'buildId');
export var COLLECTION_URL: StringArgument = new StringArgument('collectionUrl');
export var DEFINITION_ID: IntArgument = new IntArgument('definitionId');
export var DEFINITION_NAME: StringArgument = new StringArgument('definitionName');
export var GENERIC_ID: IntArgument = new IntArgument('id');
export var JSON_FILTER: StringArgument = new StringArgument('jsonFilter');
export var PROJECT_NAME: StringArgument = new StringArgument('project', 'projectName');
export var REPOSITORY_ID: StringArgument = new StringArgument('id', 'repositoryId');
export var STATUS: StringArgument = new StringArgument('status');
export var TASK_ID: IntArgument = new IntArgument('id', 'taskId');
export var TASK_PATH: StringArgument = new StringArgument('taskPath');
export var TOP: IntArgument = new IntArgument('top');