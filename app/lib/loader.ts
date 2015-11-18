import colors = require("colors");
import common = require("../lib/common");
import Q = require("q");
import qfs = require("../lib/qfs");
import path = require("path");
import trace = require("../lib/trace");
import {TfCommand} from "./tfcommand";

export interface CommandFactory {
	getCommand: (args: string[]) => TfCommand<any, any> | Q.Promise<TfCommand<any, any>>;
}

/**
 * Load the module given by execPath and instantiate a TfCommand using args.
 * @param {string[]} execPath: path to the module to load. This module must implement CommandFactory.
 * @param {string[]} args: args to pass to the command factory to instantiate the TfCommand
 * @return {Q.Promise<TfCommand>} Promise that is resolved with the module's command
 */
export function load(execPath: string[], args): Q.Promise<TfCommand<any, any>> {
	trace.debug('loader.load');
	let commandModulePath = path.resolve(common.APP_ROOT, "exec", execPath.join("/"));
	return qfs.exists(commandModulePath).then((exists) => {
		let resolveDefaultPromise = Q.resolve(commandModulePath);
		if (exists) {
			// If this extensionless path exists, it should be a directory.
			// If the path doesn't exist, for now we assume that a file with a .js extension
			// exists (if it doens't, we will find out below).
			resolveDefaultPromise = qfs.lstat(commandModulePath).then((stats) => {
				if (stats.isDirectory()) {
					return path.join(commandModulePath, "default");
				}
				return commandModulePath;
			});
		}
		return resolveDefaultPromise.then((commandModulePath: string) => {
			let commandModule: CommandFactory;
			return qfs.exists(path.resolve(commandModulePath + ".js")).then((exists) => {
				if (!exists) {
					throw new Error(commandModulePath + " is not a recognized command. Run with --help to see available commands.");
				}
				try {
					commandModule = require(commandModulePath);
				} catch (e) {
					trace.error(commandModulePath + " could not be fully loaded as a tfx command.");
					throw e;
				}
				if (!commandModule.getCommand) {
					throw new Error("Command modules must export a function, getCommand, that takes no arguments and returns an instance of TfCommand")
				}
				return common.promisify(commandModule.getCommand(args));
			});
		});
	});
}
