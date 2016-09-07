// Type definitions for Prompt.js 0.2.14
// Project: https://github.com/flatiron/prompt

declare module "prompt" {
	
	type properties = string[] | p.PromptSchema | p.PromptPropertyOptions[];
	
	module p {
		interface PromptSchema {
			properties: PromptProperties;
		}
		
		interface PromptProperties {
			[propName: string]: PromptPropertyOptions;
		}
		
		interface PromptPropertyOptions {
			pattern?: RegExp;
			message?: string;
			required?: boolean;
			hidden?: boolean;
			description?: string;
			type?: string;
			default?: string;
			before?: (value: any) => any;
			conform?: (result: any) => boolean;
			name?: string;
		}
		
		export function start(): void;
		
		export function get(
			properties: properties, 
			callback: (err: Error, result: string) => void): void;
			
		export function get<T>(
			properties: properties, 
			callback: (err: Error, result: T) => void): void;
			
		export function addProperties(
			obj: any, properties: properties, 
			callback: (err: Error) => void): void;
			
		export function history(propertyName: string): any;
			
		export var override: any;
		export var colors: boolean;
		export var message: string;
		export var delimiter: string;
	}
	export = p;
}