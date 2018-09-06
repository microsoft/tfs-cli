import common = require("./common");
import path = require("path");
import { lstat, readdir } from "fs";
import { promisify } from "util";

export interface TFXCommand {
	execPath: string[];
	args: string[];
	commandHierarchy: CommandHierarchy;
}

export interface CommandHierarchy {
	[command: string]: CommandHierarchy;
}

export function getCommand(): Promise<TFXCommand> {
	let args = process.argv.slice(2);
	return getCommandHierarchy(path.resolve(common.APP_ROOT, "exec")).then(hierarchy => {
		let execPath: string[] = [];
		let commandArgs: string[] = [];
		let currentHierarchy = hierarchy;
		let inArgs = false;
		args.forEach(arg => {
			if (arg.substr(0, 1) === "-" || inArgs) {
				commandArgs.push(arg);
				inArgs = true;
			} else if (currentHierarchy && currentHierarchy[arg] !== undefined) {
				currentHierarchy = currentHierarchy[arg];
				execPath.push(arg);
			} else {
				throw "Command '" + arg + "' not found. For help, type tfx " + execPath.join(" ") + " --help";
			}
		});
		return {
			execPath: execPath,
			args: commandArgs,
			commandHierarchy: hierarchy,
		};
	});
}

function getCommandHierarchy(root: string): Promise<CommandHierarchy> {
	let hierarchy: CommandHierarchy = {};
	return promisify(readdir)(root).then(files => {
		let filePromises = [];
		files.forEach(file => {
			if (file.startsWith("_") || file.endsWith(".map")) {
				return;
			}
			let fullPath = path.resolve(root, file);
			let parsedPath = path.parse(fullPath);

			let promise = promisify(lstat)(fullPath).then(stats => {
				if (stats.isDirectory()) {
					return getCommandHierarchy(fullPath).then(subHierarchy => {
						hierarchy[parsedPath.name] = subHierarchy;
					});
				} else {
					hierarchy[parsedPath.name] = null;
					return null;
				}
			});
			filePromises.push(promise);
		});
		return Promise.all(filePromises).then(() => {
			return hierarchy;
		});
	});
}
