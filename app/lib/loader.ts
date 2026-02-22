import colors = require("colors");
import common = require("./common");
import path = require("path");
import trace = require("./trace");
import { TfCommand } from "./tfcommand";
import * as defaultCommand from "../exec/default";
import * as loginCommand from "../exec/login";
import * as logoutCommand from "../exec/logout";
import * as resetCommand from "../exec/reset";
import * as versionCommand from "../exec/version";
import * as buildDefaultCommand from "../exec/build/default";
import * as buildListCommand from "../exec/build/list";
import * as buildQueueCommand from "../exec/build/queue";
import * as buildShowCommand from "../exec/build/show";
import * as buildTasksCreateCommand from "../exec/build/tasks/create";
import * as buildTasksDefaultCommand from "../exec/build/tasks/default";
import * as buildTasksDeleteCommand from "../exec/build/tasks/delete";
import * as buildTasksListCommand from "../exec/build/tasks/list";
import * as buildTasksUploadCommand from "../exec/build/tasks/upload";
import * as extensionCreateCommand from "../exec/extension/create";
import * as extensionDefaultCommand from "../exec/extension/default";
import * as extensionInitCommand from "../exec/extension/init";
import * as extensionInstallCommand from "../exec/extension/install";
import * as extensionIsValidCommand from "../exec/extension/isvalid";
import * as extensionPublishCommand from "../exec/extension/publish";
import * as extensionResourcesCreateCommand from "../exec/extension/resources/create";
import * as extensionResourcesDefaultCommand from "../exec/extension/resources/default";
import * as extensionShareCommand from "../exec/extension/share";
import * as extensionShowCommand from "../exec/extension/show";
import * as extensionUnpublishCommand from "../exec/extension/unpublish";
import * as extensionUnshareCommand from "../exec/extension/unshare";
import * as workitemCreateCommand from "../exec/workitem/create";
import * as workitemDefaultCommand from "../exec/workitem/default";
import * as workitemQueryCommand from "../exec/workitem/query";
import * as workitemShowCommand from "../exec/workitem/show";
import * as workitemUpdateCommand from "../exec/workitem/update";

export interface CommandFactory {
	getCommand: (args: string[]) => TfCommand<any, any> | Promise<TfCommand<any, any>>;
}

const commandModules: { [key: string]: CommandFactory } = {
	"default": defaultCommand,
	"login": loginCommand,
	"logout": logoutCommand,
	"reset": resetCommand,
	"version": versionCommand,
	"build/default": buildDefaultCommand,
	"build/list": buildListCommand,
	"build/queue": buildQueueCommand,
	"build/show": buildShowCommand,
	"build/tasks/create": buildTasksCreateCommand,
	"build/tasks/default": buildTasksDefaultCommand,
	"build/tasks/delete": buildTasksDeleteCommand,
	"build/tasks/list": buildTasksListCommand,
	"build/tasks/upload": buildTasksUploadCommand,
	"extension/create": extensionCreateCommand,
	"extension/default": extensionDefaultCommand,
	"extension/init": extensionInitCommand,
	"extension/install": extensionInstallCommand,
	"extension/isvalid": extensionIsValidCommand,
	"extension/publish": extensionPublishCommand,
	"extension/resources/create": extensionResourcesCreateCommand,
	"extension/resources/default": extensionResourcesDefaultCommand,
	"extension/share": extensionShareCommand,
	"extension/show": extensionShowCommand,
	"extension/unpublish": extensionUnpublishCommand,
	"extension/unshare": extensionUnshareCommand,
	"workitem/create": workitemCreateCommand,
	"workitem/default": workitemDefaultCommand,
	"workitem/query": workitemQueryCommand,
	"workitem/show": workitemShowCommand,
	"workitem/update": workitemUpdateCommand,
};

function getCommandModule(execPath: string[]): CommandFactory {
	const commandKey = execPath.join("/");
	if (!commandKey) {
		return commandModules["default"];
	}

	return commandModules[commandKey] || commandModules[`${commandKey}/default`];
}

/**
 * Load the module given by execPath and instantiate a TfCommand using args.
 * @param {string[]} execPath: path to the module to load. This module must implement CommandFactory.
 * @param {string[]} args: args to pass to the command factory to instantiate the TfCommand
 * @return {Promise<TfCommand>} Promise that is resolved with the module's command
 */
export function load(execPath: string[], args): Promise<TfCommand<any, any>> {
	trace.debug("loader.load");
	let commandModulePath = path.resolve(common.APP_ROOT, "exec", execPath.join("/"));
	try {
		const commandModule = getCommandModule(execPath);
		if (!commandModule) {
			throw new Error(
				commandModulePath + " is not a recognized command. Run with --help to see available commands.",
			);
		}

		if (!commandModule.getCommand) {
			throw new Error(
				"Command modules must export a function, getCommand, that takes no arguments and returns an instance of TfCommand",
			);
		}

		return Promise.resolve(commandModule.getCommand(args));
	} catch (e) {
		trace.error(commandModulePath + " could not be fully loaded as a tfx command.");
		return Promise.reject(e);
	}
}
