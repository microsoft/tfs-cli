import common = require("./common");
import fs = require("./qfs");
import path = require("path");
import Q = require("q");

export interface TFXCommand {
	execPath: string[];
	args: string[];
	commandHierarchy: CommandHierarchy;
}

export interface CommandHierarchy {
	[command: string]: CommandHierarchy;
}

export function getCommand(): Q.Promise<TFXCommand> {
	let args = process.argv.slice(2);
	return getCommandHierarchy(path.resolve(common.APP_ROOT, "exec")).then((hierarchy) => {
		let execPath: string[] = [];
		let commandArgs: string[] = [];
		let currentHierarchy = hierarchy;
		let inArgs = false;
		args.forEach((arg) => {
			if (currentHierarchy && currentHierarchy[arg] !== undefined) {
				currentHierarchy = currentHierarchy[arg];
				execPath.push(arg);
			} else if (arg.substr(0, 2) === "--" || inArgs) {
				commandArgs.push(arg);
				inArgs = true;
			} else {
				throw "Command '" + arg + "' not found. For help, type tfx " + execPath.join(" ") + " --help";
			}
		});
		return {
			execPath: execPath,
			args: commandArgs,
			commandHierarchy: hierarchy
		};
	});
}

function getCommandHierarchy(root: string): Q.Promise<CommandHierarchy> {
	let hierarchy: CommandHierarchy = { };
	return fs.readdir(root).then((files) => {
		let filePromises = [];
		files.forEach((file) => {
			if (file.substr(0, 1) === "_") {
				return;
			}
			let fullPath = path.resolve(root, file);
			let parsedPath = path.parse(fullPath);

			let promise = fs.lstat(fullPath).then((stats) => {
				if (stats.isDirectory()) {
					return getCommandHierarchy(fullPath).then((subHierarchy) => {
						hierarchy[parsedPath.name] = subHierarchy;
					});
				} else {
					hierarchy[parsedPath.name] = null;
					return null;
				}
			});
			filePromises.push(promise);
		});
		return Q.all(filePromises).then(() => {
			return hierarchy;
		});
	});
}