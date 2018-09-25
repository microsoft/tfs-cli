import { BasicCredentialHandler } from "vso-node-api/handlers/basiccreds";
import { DiskCache } from "../lib/diskcache";
import { getCredentialStore } from "../lib/credstore";
import { repeatStr } from "../lib/common";
import { TfsConnection } from "../lib/connection";
import { WebApi, getBasicHandler } from "vso-node-api/WebApi";
import { EOL as eol } from "os";
import _ = require("lodash");
import args = require("./arguments");
import { blue, cyan, gray, green, yellow, magenta, reset as resetColors, stripColors } from "colors";
import command = require("../lib/command");
import common = require("./common");
import clipboardy = require("clipboardy");
import { writeFile } from "fs";
import loader = require("../lib/loader");
import path = require("path");
import fsUtils = require("./fsUtils");
import { promisify } from "util";
import trace = require("./trace");
import version = require("./version");

export interface CoreArguments {
	[key: string]: args.Argument<any>;
	project: args.StringArgument;
	root: args.ExistingDirectoriesArgument;
	authType: args.StringArgument;
	serviceUrl: args.StringArgument;
	password: args.SilentStringArgument;
	token: args.SilentStringArgument;
	save: args.BooleanArgument;
	username: args.StringArgument;
	output: args.StringArgument;
	json: args.BooleanArgument;
	fiddler: args.BooleanArgument;
	proxy: args.StringArgument;
	help: args.BooleanArgument;
	noPrompt: args.BooleanArgument;
	noColor: args.BooleanArgument;
	debugLogStream: args.StringArgument;
}

export interface Executor<TResult> {
	(cmd?: command.TFXCommand): Promise<TResult>;
}

export abstract class TfCommand<TArguments extends CoreArguments, TResult> {
	protected commandArgs: TArguments = <TArguments>{};
	private groupedArgs: { [key: string]: string[] };
	private initialized: Promise<Executor<any>>;
	protected webApi: WebApi;
	protected description: string = "A suite of command line tools to interact with Azure DevOps Services.";
	public connection: TfsConnection;

	protected abstract serverCommand;

	/**
	 * @param serverCommand True to initialize the WebApi object during init phase.
	 */
	constructor(public passedArgs: string[]) {
		this.setCommandArgs();
	}

	/**
	 * Returns a promise that is resolved when this command is initialized and
	 * ready to be executed.
	 */
	public ensureInitialized(): Promise<Executor<any>> {
		return this.initialized || this.initialize();
	}

	protected initialize(): Promise<Executor<any>> {
		this.initialized = this.commandArgs.help.val().then(needHelp => {
			if (needHelp) {
				return this.run.bind(this, this.getHelp.bind(this));
			} else {
				// Set the fiddler proxy
				return this.commandArgs.fiddler
					.val()
					.then(useProxy => {
						if (useProxy) {
							process.env.HTTP_PROXY = "http://127.0.0.1:8888";
						}
					})
					.then(() => {
						// Set custom proxy
						return this.commandArgs.proxy.val(true).then(proxy => {
							if (proxy) {
								process.env.HTTP_PROXY = proxy;
							}
						});
					})
					.then(() => {
						// Set the no-prompt flag
						return this.commandArgs.noPrompt.val(true).then(noPrompt => {
							common.NO_PROMPT = noPrompt;
						});
					})
					.then(() => {
						// If --no-color specified, Patch console.log to never output color bytes
						return this.commandArgs.noColor.val(true).then(noColor => {
							if (noColor) {
								console.log = logNoColors;
							}
						});
					})
					.then(() => {
						// Set the cached service url
						return this.commandArgs.serviceUrl.val(true).then(serviceUrl => {
							if (!serviceUrl && !process.env["TFX_BYPASS_CACHE"] && common.EXEC_PATH.join("") !== "login") {
								let diskCache = new DiskCache("tfx");
								return diskCache.itemExists("cache", "connection").then(isConnection => {
									let connectionUrlPromise: Promise<string>;
									if (!isConnection) {
										connectionUrlPromise = Promise.resolve<string>(null);
									} else {
										connectionUrlPromise = diskCache.getItem("cache", "connection");
									}
									return connectionUrlPromise.then(url => {
										if (url) {
											this.commandArgs.serviceUrl.setValue(url);
										}
									});
								});
							} else {
								return Promise.resolve<void>(null);
							}
						});
					})
					.then(() => {
						let apiPromise = Promise.resolve<any>(null);
						if (this.serverCommand) {
							apiPromise = this.getWebApi().then(_ => {});
						}
						return apiPromise.then(() => {
							return this.run.bind(this, this.exec.bind(this));
						});
					});
			}
		});
		return this.initialized;
	}

	private getGroupedArgs(): { [key: string]: string[] } {
		if (!this.groupedArgs) {
			let group: { [key: string]: string[] } = {};

			let currentArg = null;
			this.passedArgs.forEach(arg => {
				if (_.startsWith(arg, "--")) {
					currentArg = _.camelCase(arg.substr(2));
					group[currentArg] = [];
					return;
				}
				// short args/alias support - allow things like -abc "cat" "dog"
				// which means the same as --arg-a --arg-b --arg-c "cat" "dog"
				if (_.startsWith(arg, "-")) {
					const shorthandArgs = arg.substr(1).split("");
					for (const shArg of shorthandArgs) {
						const shorthandArg = "-" + shArg;
						group[shorthandArg] = [];
						currentArg = shorthandArg;
					}
					return;
				}
				if (currentArg) {
					group[currentArg].push(arg);
				}
			});

			this.groupedArgs = group;
		}
		return this.groupedArgs;
	}

	/**
	 * Registers an argument that this command can accept from the command line
	 *
	 * @param name Name of the argument. This is what is passed in on the command line, e.g. "authType"
	 *        is passed in with --auth-type. Can be an array for aliases, but the first item is how the
	 *        argument's value is accessed, e.g. this.commandArgs.authType.val().
	 *        An argument can have one shorthand argument: a dash followed by a single letter. This is
	 *        passed at the command line with a single dash, e.g. -u. Multiple boolean shorthand arguments
	 *        can be passed with a single dash: -abcd. See setCommandArgs for usage examples.
	 * @param friendlyName Name to display to the user in help.
	 * @param description Description to display in help.
	 * @param ctor Constructor for the type of argument this is (e.g. string, number, etc.)
	 * @param defaultValue Default value of the argument, null for no default, undefined to prompt the user.
	 */
	protected registerCommandArgument<T extends args.Argument<any>>(
		name: string | string[],
		friendlyName: string,
		description: string,
		ctor: new (
			name: string,
			friendlyName: string,
			description: string,
			value: string | string[] | Promise<string[]>,
			hasDefaultValue?: boolean,
			argAliases?: string[],
			undocumented?: boolean,
		) => T,
		defaultValue?: string | string[] | (() => Promise<string[]>),
		undocumented: boolean = false,
	): void {
		const fixedArgNames = (typeof name === "string" ? [name] : name).map(a => (a.substr(0, 2) === "--" ? a.substr(0, 2) : a));
		const argName = fixedArgNames[0];
		const argAliases = fixedArgNames.slice(1);

		let groupedArgs = this.getGroupedArgs();

		let argValue = groupedArgs[argName];
		if (argValue === undefined) {
			for (const alias of argAliases) {
				if (groupedArgs[alias]) {
					argValue = groupedArgs[alias];
					break;
				}
			}
		}

		if (argValue) {
			this.commandArgs[argName] = new ctor(argName, friendlyName, description, argValue, false, argAliases, undocumented);
		} else {
			let def: string | string[] | Promise<string[]> = null;
			if (typeof defaultValue === "function") {
				def = defaultValue();
			} else {
				def = defaultValue;
			}
			this.commandArgs[argName] = new ctor(argName, friendlyName, description, def, true, argAliases, undocumented);
		}
	}

	/**
	 * Register arguments that may be used with this command.
	 */
	protected setCommandArgs(): void {
		this.registerCommandArgument(["project", "-p"], "Project name", null, args.StringArgument);
		this.registerCommandArgument(["root", "-r"], "Root directory", null, args.ExistingDirectoriesArgument, ".");
		this.registerCommandArgument(
			["authType"],
			"Authentication Method",
			"Method of authentication ('pat' or 'basic').",
			args.StringArgument,
			"pat",
		);
		this.registerCommandArgument(
			["serviceUrl", "-u"],
			"Service URL",
			"URL to the service you will connect to, e.g. https://youraccount.visualstudio.com/DefaultCollection.",
			args.StringArgument,
		);
		this.registerCommandArgument(
			["password"],
			"Password",
			"Password to use for basic authentication.",
			args.SilentStringArgument,
		);
		this.registerCommandArgument(["token", "-t"], "Personal access token", null, args.SilentStringArgument);
		this.registerCommandArgument(
			["save"],
			"Save settings",
			"Save arguments for the next time a command in this command group is run.",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(["username"], "Username", "Username to use for basic authentication.", args.StringArgument);
		this.registerCommandArgument(
			["output"],
			"Output destination",
			"Method to use for output. Options: friendly, json, clipboard.",
			args.StringArgument,
			"friendly",
		);
		this.registerCommandArgument(["json"], "Output as JSON", "Alias for --output json.", args.BooleanArgument, "false");
		this.registerCommandArgument(
			["fiddler"],
			"Use Fiddler proxy",
			"Set up the fiddler proxy for HTTP requests (for debugging purposes).",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(
			["proxy"],
			"Proxy server",
			"Use the specified proxy server for HTTP traffic.",
			args.StringArgument,
			null,
		);
		this.registerCommandArgument(["help", "-h"], "Help", "Get help for any command.", args.BooleanArgument, "false");
		this.registerCommandArgument(
			["noPrompt"],
			"No Prompt",
			"Do not prompt the user for input (instead, raise an error).",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(
			"includeUndocumented",
			"Include undocumented commands?",
			"Show help for commands and options that are undocumented (use at your own risk!)",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(
			"traceLevel",
			"Trace Level",
			`Tracing threshold can be specified as "none", "info" (default), and "debug".`,
			args.StringArgument,
			null,
		);
		this.registerCommandArgument(
			"noColor",
			"No colored output",
			"Do not emit bytes that affect text color in any output.",
			args.BooleanArgument,
			"false",
		);
		this.registerCommandArgument(
			"debugLogStream",
			"Debug message logging stream (stdout | stderr)",
			"Stream used for writing debug logs (stdout or stderr)",
			args.StringArgument,
			"stdout",
		);
	}

	/**
	 * Return a list of registered arguments that should be displayed when help is emitted.
	 */
	protected getHelpArgs(): string[] {
		return [];
	}

	/**
	 * Get a BasicCredentialHandler based on the command arguments:
	 * If username & password are passed in, use those.
	 * If token is passed in, use that.
	 * Else, check the authType - if it is "pat", prompt for a token
	 * If it is "basic", prompt for username and password.
	 */
	protected getCredentials(serviceUrl: string, useCredStore: boolean = true): Promise<BasicCredentialHandler> {
		return Promise.all([
			this.commandArgs.authType.val(),
			this.commandArgs.token.val(true),
			this.commandArgs.username.val(true),
			this.commandArgs.password.val(true),
		]).then(values => {
			const [authType, token, username, password] = values;
			if (username && password) {
				return getBasicHandler(username, password);
			} else {
				if (token) {
					return getBasicHandler("OAuth", token);
				} else {
					let getCredentialPromise;
					if (useCredStore) {
						getCredentialPromise = getCredentialStore("tfx").getCredential(serviceUrl, "allusers");
					} else {
						getCredentialPromise = Promise.reject("not using cred store.");
					}
					return getCredentialPromise
						.then((credString: string) => {
							if (credString.length <= 6) {
								throw "Could not get credentials from credential store.";
							}
							if (credString.substr(0, 3) === "pat") {
								return getBasicHandler("OAuth", credString.substr(4));
							} else if (credString.substr(0, 5) === "basic") {
								let rest = credString.substr(6);
								let unpwDividerIndex = rest.indexOf(":");
								let username = rest.substr(0, unpwDividerIndex);
								let password = rest.substr(unpwDividerIndex + 1);
								if (username && password) {
									return getBasicHandler(username, password);
								} else {
									throw "Could not get credentials from credential store.";
								}
							}
						})
						.catch(() => {
							if (authType.toLowerCase() === "pat") {
								return this.commandArgs.token.val().then(token => {
									return getBasicHandler("OAuth", token);
								});
							} else if (authType.toLowerCase() === "basic") {
								return this.commandArgs.username.val().then(username => {
									return this.commandArgs.password.val().then(password => {
										return getBasicHandler(username, password);
									});
								});
							} else {
								throw new Error("Unsupported auth type. Currently, 'pat' and 'basic' auth are supported.");
							}
						});
				}
			}
		});
	}

	public getWebApi(): Promise<WebApi> {
		return this.commandArgs.serviceUrl.val().then(url => {
			return this.getCredentials(url).then(handler => {
				this.connection = new TfsConnection(url);
				this.webApi = new WebApi(url, handler);
				return this.webApi;
			});
		});
	}

	public run(main: (cmd?: command.TFXCommand) => Promise<any>, cmd?: command.TFXCommand): Promise<void> {
		return main(cmd).then(result => {
			return this.output(result).then(() => {
				return this.dispose();
			});
		});
	}

	/**
	 * exec does some work and resolves to some kind of output. This method may
	 * log/trace during execution, but produces one single output in the end.
	 */
	protected abstract exec(): Promise<TResult>;

	/**
	 * Should be called after exec. In here we will write settings to fs if necessary.
	 */
	public dispose(): Promise<void> {
		let newToCache = {};
		return this.commandArgs.save.val().then(shouldSave => {
			if (shouldSave) {
				let cacheKey =
					path.resolve().replace("/.[]/g", "-") +
					"." +
					common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
				let getValuePromises: Promise<void>[] = [];
				Object.keys(this.commandArgs).forEach(arg => {
					let argObj = <args.Argument<any>>this.commandArgs[arg];
					if (!argObj.hasDefaultValue) {
						let pr = argObj.val().then(value => {
							// don't cache these 5 options.
							if (["username", "password", "save", "token", "help"].indexOf(arg) < 0) {
								_.set(newToCache, cacheKey + "." + arg, value);
							}
						});
						getValuePromises.push(pr);
					}
				});
				return Promise.all(getValuePromises).then<void>(() => {
					return args.getOptionsCache().then(existingCache => {
						// custom shallow-ish merge of cache properties.
						let newInThisCommand = _.get(newToCache, cacheKey);
						if (!_.get(existingCache, cacheKey)) {
							_.set(existingCache, cacheKey, {});
						}
						if (newInThisCommand) {
							Object.keys(newInThisCommand).forEach(key => {
								_.set(existingCache, cacheKey + "." + key, newInThisCommand[key]);
							});
							new DiskCache("tfx").setItem(
								"cache",
								"command-options",
								JSON.stringify(existingCache, null, 4).replace(/\n/g, eol),
							);
						}
					});
				});
			} else {
				return Promise.resolve<void>(null);
			}
		});
	}

	/**
	 * Gets help (as a string) for the given command
	 */
	public async getHelp(cmd: command.TFXCommand): Promise<string> {
		const includeUndocumented = await this.commandArgs.includeUndocumented.val();

		this.commandArgs.output.setValue("help");
		let result = eol;
		let continuedHierarchy: command.CommandHierarchy = cmd.commandHierarchy;
		cmd.execPath.forEach(segment => {
			continuedHierarchy = continuedHierarchy[segment];
		});

		if (continuedHierarchy === null) {
			// Need help with a particular command
			let singleArgData = (argName: string, maxArgLen: number) => {
				let argKebab = _.kebabCase(argName);
				const argObj = this.commandArgs[argName];
				const shorthandArg = argObj.aliases.filter(a => a.length === 2 && a.substr(0, 1) === "-")[0];
				if (shorthandArg) {
					argKebab = `${argKebab}, ${shorthandArg}`;
				}

				if (argObj.undocumented && !includeUndocumented) {
					return "";
				}

				return (
					"  --" +
					argKebab +
					"  " +
					repeatStr(" ", maxArgLen - argKebab.length) +
					gray(argObj.description || argObj.friendlyName + ".") +
					eol
				);
			};
			let commandName = cmd.execPath[cmd.execPath.length - 1];
			result +=
				cyan("Syntax: ") +
				eol +
				cyan("tfx ") +
				yellow(cmd.execPath.join(" ")) +
				green(" --arg1 arg1val1 arg1val2[...]") +
				gray(" --arg2 arg2val1 arg2val2[...]") +
				eol +
				eol;

			return loader
				.load(cmd.execPath, [])
				.then(tfCommand => {
					result += cyan("Command: ") + commandName + eol;
					result += tfCommand.description + eol + eol;
					result += cyan("Arguments: ") + eol;

					let uniqueArgs = this.getHelpArgs();
					uniqueArgs = _.uniq(uniqueArgs);
					let maxArgLen = uniqueArgs.map(a => _.kebabCase(a)).reduce((a, b) => Math.max(a, b.length), 0);
					if (uniqueArgs.length === 0) {
						result += "[No arguments for this command]" + eol;
					}
					uniqueArgs.forEach(arg => {
						result += singleArgData(arg, maxArgLen);
					});

					if (this.serverCommand) {
						result += eol + cyan("Global server command arguments:") + eol;
						["authType", "username", "password", "token", "serviceUrl", "fiddler", "proxy"].forEach(arg => {
							result += singleArgData(arg, 11);
						});
					}

					result += eol + cyan("Global arguments:") + eol;
					["help", "save", "noColor", "noPrompt", "output", "json", "traceLevel", "debugLogStream"].forEach(arg => {
						result += singleArgData(arg, 9);
					});

					result +=
						eol +
						gray(
							"To see more commands, type " +
								resetColors("tfx " + cmd.execPath.slice(0, cmd.execPath.length - 1).join(" ") + " --help"),
						);
				})
				.then(() => {
					return result;
				});
		} else {
			// Need help with a suite of commands
			// There is a weird coloring bug when colors are nested, so we don't do that.
			result +=
				cyan("Available ") +
				"commands" +
				cyan(" and ") +
				yellow("command groups") +
				cyan(" in " + ["tfx"].concat(cmd.execPath).join(" / ") + ":") +
				eol;
			let commandDescriptionPromises: Promise<void>[] = [];
			Object.keys(continuedHierarchy).forEach(command => {
				if (command === "default") {
					return;
				}
				let pr = loader.load(cmd.execPath.concat([command]), []).then(tfCommand => {
					let coloredCommand = command;
					if (continuedHierarchy[command] !== null) {
						coloredCommand = yellow(command);
					}
					result += " - " + coloredCommand + gray(": " + tfCommand.description) + eol;
				});
				commandDescriptionPromises.push(pr);
			});
			return Promise.all(commandDescriptionPromises)
				.then(() => {
					result +=
						eol +
						eol +
						gray("For help with an individual command, type ") +
						resetColors("tfx " + cmd.execPath.join(" ") + " <command> --help") +
						eol;
				})
				.then(() => {
					return result;
				});
		}
	}

	/**
	 * Display a copyright banner.
	 */
	public showBanner(): Promise<void> {
		return this.commandArgs.json
			.val(true)
			.then(useJson => {
				if (useJson) {
					this.commandArgs.output.setValue("json");
				}
			})
			.then(() => {
				return version.getTfxVersion().then(async semVer => {
					const [outputType, traceLevel, debugLogStream] = await Promise.all([
						this.commandArgs.output.val(),
						this.commandArgs.traceLevel.val(),
						this.commandArgs.debugLogStream.val(),
					]);
					switch (debugLogStream) {
						case "stdout":
							trace.debugLogStream = console.log;
							break;
						case "stderr":
							trace.debugLogStream = console.error;
							break;
						default:
							throw new Error("Parameter --debug-log-stream must have value 'stdout' or 'stderr'.");
					}
					switch (traceLevel && traceLevel.toLowerCase()) {
						case "none":
							trace.traceLevel = trace.TraceLevel.None;
							break;
						case "debug":
							trace.traceLevel = trace.TraceLevel.Debug;
							break;
						case "info":
							trace.traceLevel = trace.TraceLevel.Info;
							break;
						default:
							trace.traceLevel = outputType === "friendly" ? trace.TraceLevel.Info : trace.TraceLevel.None;
					}
					trace.info(gray("TFS Cross Platform Command Line Interface v" + semVer.toString()));
					trace.info(gray("Copyright Microsoft Corporation"));
				});
			});
	}

	/**
	 * Takes data and pipes it to the appropriate output mechanism
	 */
	public output(data: any): Promise<void> {
		return this.commandArgs.output.val().then(outputDestination => {
			switch (outputDestination.toLowerCase()) {
				case "friendly":
					this.friendlyOutput(data);
					break;
				case "json":
					this.jsonOutput(data);
					break;
				case "help":
					this.friendlyOutputConstant(data);
					break;
				case "clip":
				case "clipboard":
					let clipboardText = this.getClipboardOutput(data);
					return clipboardy.write(clipboardText);
				default:
					return fsUtils.canWriteTo(path.resolve(outputDestination)).then(canWrite => {
						if (canWrite) {
							let fileContents = this.getFileOutput(data);
							return promisify(writeFile)(outputDestination, fileContents);
						} else {
							throw new Error("Cannot write output to " + outputDestination);
						}
					});
			}
			return Promise.resolve<void>(null);
		});
	}

	/**
	 * Given the output object, gets the string that is copied to the clipboard when
	 * clipboard output is requested.
	 */
	protected getClipboardOutput(data: any): string {
		return this.getOutputString(data);
	}

	/**
	 * Given the output object, gets the string that is written to a destination
	 * file when a file name is given as the output destination
	 */
	protected getFileOutput(data: any): string {
		return this.getOutputString(data);
	}

	private getOutputString(data: any): string {
		let outputString = "";
		try {
			outputString = JSON.stringify(data, null, 4);
		} catch (e) {
			if (data && data.toString) {
				outputString = data.toString();
			} else {
				outputString = data + "";
			}
		}
		return outputString;
	}

	/**
	 * Gets a nicely formatted output string for friendly output
	 */
	protected friendlyOutput(data: any): void {
		this.friendlyOutputConstant(data);
	}

	private friendlyOutputConstant(data: any): void {
		if (typeof data === "string") {
			console.log(data);
		} else {
			try {
				console.log(JSON.stringify(data, null, 4));
			} catch (e) {
				console.log(data + "");
			}
		}
	}

	/**
	 * Gets a string of valid JSON when JSON output is requested.
	 * Probably no need to override this one.
	 */
	protected jsonOutput(data: any): void {
		try {
			console.log(stripColors(JSON.stringify(data, null, 4)));
		} catch (e) {
			throw new Error("Could not stringify JSON output.");
		}
	}
}

const originalConsoleLog = console.log.bind(console);
function logNoColors(...args: string[]) {
	originalConsoleLog.apply(console, args.map(stripColors));
}
