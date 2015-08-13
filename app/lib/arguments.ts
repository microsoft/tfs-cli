//TODO: add validity check (length, regex, etc...)
export class Argument {
	public name: string;
	public defaultValue: any;
	public friendlyName: string;
	public silent: boolean = false;
	
	constructor(name: string, 
		friendlyName: string = name, 
		defaultValue: any = null) {
			
		this.name = name;
		this.friendlyName = friendlyName;
		this.defaultValue = defaultValue;
	}
	
	public getValueFromString(stringRepresentation: string): any {
		return stringRepresentation;
	}
}

export class ArrayArgument extends Argument {
	public getValueFromString(stringRepresentation: string): any {
		return [stringRepresentation]
	}
}

export class BooleanArgument extends Argument {
	public defaultValue = false;
	
	public getValueFromString(stringRepresentation: string): boolean {
		return ((stringRepresentation.toLowerCase() === "true") || (stringRepresentation === "1"));
	}
}

export class FilePathArgument extends Argument {
	public getValueFromString(stringRepresentation: string): string {
		return stringRepresentation.replace(/(^\")|(\"$)/g, "")
	}
}

export class IntArgument extends Argument {
	
	public getValueFromString(stringRepresentation: string): any {
		return parseInt(stringRepresentation) || stringRepresentation;
	}
}

export class SilentStringArgument extends Argument {
	public silent = true;
}

export class StringArgument extends Argument {
	
}

export function identity<T>(arg: T): T {
	return arg;
}

///GENERAL
export var AUTHOR: StringArgument = new StringArgument('author');
export var DESCRIPTION: StringArgument = new StringArgument('description');
export var DISPLAY_NAME: StringArgument = new StringArgument('displayname');
export var FRIENDLY_NAME: StringArgument = new StringArgument('friendlyname', 'friendly name');
export var OVERWRITE: BooleanArgument = new BooleanArgument('overwrite');
export var PROJECT_NAME: StringArgument = new StringArgument('project', 'projectName');
export var ROOT: StringArgument = new StringArgument('root', 'root', '.');

///CORE
export var AUTH_TYPE: StringArgument = new StringArgument('authtype', 'authtype', 'pat');
export var COLLECTION_URL: StringArgument = new StringArgument('collectionurl', 'collection url');
export var PASSWORD: SilentStringArgument = new SilentStringArgument('password');
export var PAT: SilentStringArgument = new SilentStringArgument('token', 'personal access token');
export var SETTINGS: StringArgument = new StringArgument('settings', 'settings path');
export var USERNAME: StringArgument = new StringArgument('username');

///BUILD
export var BUILD_ID: IntArgument = new IntArgument('id', 'buildId');
export var DEFINITION_ID: IntArgument = new IntArgument('definitionid');
export var DEFINITION_NAME: StringArgument = new StringArgument('definitionname');
export var STATUS: StringArgument = new StringArgument('status');
export var TOP: IntArgument = new IntArgument('top');

///TASKS
export var ALL: BooleanArgument = new BooleanArgument('all');
export var JSON_FILTER: StringArgument = new StringArgument('jsonfilter');
export var TASK_ID: StringArgument = new StringArgument('id', 'taskId');
export var TASK_NAME: StringArgument = new StringArgument('name', 'short task name');
export var TASK_PATH: FilePathArgument = new FilePathArgument('taskpath');

///VSIX
export var PUBLISHER_NAME: StringArgument = new StringArgument('name', 'publisher name');
export var GALLERY_URL: StringArgument = new StringArgument('galleryurl', 'gallery url', 'https://app.market.visualstudio.com');
export var MANIFEST_GLOB: ArrayArgument = new ArrayArgument('manifestglob', 'manifest glob', ['vss-extension.json']);
export var OUTPUT_PATH: StringArgument = new StringArgument('outputpath', 'output path', '{auto}');
export var OVERRIDE: StringArgument = new StringArgument('override', 'overrides JSON');
