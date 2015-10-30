import trace = require('../lib/trace');

//TODO: add validity check (length, regex, etc...)
export abstract class Argument<T> {
	public name: string;
	public defaultValue: T;
	public friendlyName: string;
	public silent: boolean = false;
	
	constructor(name: string, 
		friendlyName: string = name, 
		defaultValue: T = null) {
			
		this.name = name;
		this.friendlyName = friendlyName;
		this.defaultValue = defaultValue;
	}
	
	public abstract getValueFromString(stringRepresentation: string): T;
}

export class ArrayArgument extends Argument<string[]> {
	public getValueFromString(stringRepresentation: string): string[] {
		var stripped = stringRepresentation.replace(/(^\[)|(\]$)/g, "")
		return stripped.split(',').map(s => s.trim());
	}
}

export class BooleanArgument extends Argument<boolean> {
	public defaultValue = false;
	
	public getValueFromString(stringRepresentation: string): boolean {
		return ((stringRepresentation.toLowerCase() === "true") || (stringRepresentation === "1"));
	}
}

export class FilePathArgument extends Argument<string> {
	public getValueFromString(stringRepresentation: string): string {
		return stringRepresentation.replace(/(^\")|(\"$)/g, "")
	}
}

export class IntArgument extends Argument<number> {
	public getValueFromString(stringRepresentation: string): number {
		let parseResult = parseInt(stringRepresentation, 10);
		if (isNaN(parseResult)) {
			trace.warn("Could not parse int argument '" + this.name + "'. Using NaN.");
		}
		return parseResult;
	}
}

export class JsonArgument extends Argument<any> {
	public getValueFromString(stringRepresentation: string): any {
		try {
			return JSON.parse(stringRepresentation);
		} catch (parseError) {
			let info: string = parseError.stack || parseError.message;
			throw new Error("Failed to parse JSON argument '" + this.name + "'. Info: " + info);
		}
	}
}

export class SilentStringArgument extends Argument<string> {
	public silent = true;
	public getValueFromString(stringRepresentation: string): string {
		return stringRepresentation;
	}
}

export class StringArgument extends Argument<string> {
	public getValueFromString(stringRepresentation: string): string {
		return stringRepresentation;
	}
}

export function identity<T>(arg: T): T {
	return arg;
}

///GENERAL
export var AUTHOR: StringArgument = new StringArgument('author');
export var DESCRIPTION: StringArgument = new StringArgument('description');
export var DISPLAY_NAME: StringArgument = new StringArgument('displayname');
export var FORCE: BooleanArgument = new BooleanArgument('force');
export var FRIENDLY_NAME: StringArgument = new StringArgument('friendlyname', 'friendly name');
export var OVERWRITE: BooleanArgument = new BooleanArgument('overwrite');
export var PROJECT_NAME: StringArgument = new StringArgument('project', 'projectName');
export var ROOT: StringArgument = new StringArgument('root', 'root', '.');

///CORE
export var AUTH_TYPE: StringArgument = new StringArgument('authtype', 'authtype', 'pat');
export var COLLECTION_URL: StringArgument = new StringArgument('collectionurl', 'collection url');
export var PASSWORD: SilentStringArgument = new SilentStringArgument('password');
export var PAT: SilentStringArgument = new SilentStringArgument('token', 'personal access token');
export var SAVE: BooleanArgument = new BooleanArgument('save');
export var SETTINGS: StringArgument = new StringArgument('settings', 'settings path', 'settings.vset.json');
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
export var EXTENSION_ID: StringArgument = new StringArgument('extensionid');
export var PUBLISHER_NAME: StringArgument = new StringArgument('publisher', 'publisher name');
export var MARKET_URL: StringArgument = new StringArgument('marketurl', 'market url', 'https://app.market.visualstudio.com');
export var MANIFEST_GLOB: ArrayArgument = new ArrayArgument('manifestglob', 'manifest glob', ['vss-extension.json']);
export var MANIFEST_PATH: FilePathArgument = new FilePathArgument('manifestpath', 'path to manifest');
export var OUTPUT_PATH: StringArgument = new StringArgument('outputpath', 'output path', '{auto}');
export var OVERRIDE: JsonArgument = new JsonArgument('override', 'overrides JSON', {});
export var SHARE_WITH: ArrayArgument = new ArrayArgument('with', 'accounts to share with', []);
export var UNSHARE_WITH: ArrayArgument = new ArrayArgument('with', 'accounts to unshare from', []);
export var VSIX_PATH: FilePathArgument = new FilePathArgument('vsix', 'path to vsix');
export var BYPASS_VALIDATION: BooleanArgument = new BooleanArgument("bypassvalidation", "bypass local validation during packaging", false);
export var MARKET: BooleanArgument = new BooleanArgument("market", "login to the Market", false);
export var LOC_ROOT: StringArgument = new StringArgument("locRoot", "root for localization files");

///WORK
export var WORKITEM_ID: IntArgument = new IntArgument('id', 'workitemid');
export var QUERY: StringArgument = new StringArgument('query');
export var TOP: IntArgument = new IntArgument('top');
export var TITLE: StringArgument = new StringArgument('title');
export var ASSIGNEDTO: StringArgument = new StringArgument('assignedto');
export var WORKITEMTYPE: StringArgument = new StringArgument('workitemtype');
