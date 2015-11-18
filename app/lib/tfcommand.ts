import { BasicCredentialHandler } from "vso-node-api/handlers/basiccreds";
import { DiskCache } from "../lib/diskcache";
import { getCredentialStore } from "../lib/credstore";
import { repeatStr } from "../lib/common";
import { TfsConnection } from "../lib/connection";
import { WebApi, getBasicHandler } from "vso-node-api/WebApi";
import { EOL as eol } from "os";
import _ = require("lodash");
import args = require("./arguments");
import {cyan, gray, green, yellow, magenta, reset as resetColors} from "colors";
import command = require("../lib/command");
import common = require("./common");
import copypaste = require("copy-paste");
import loader = require("../lib/loader");
import path = require("path");
import Q = require("q");
import qfs = require("./qfs");
import trace = require("./trace");
import version = require("./version");

export interface CoreArguments {
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
	help: args.BooleanArgument;
	noPrompt: args.BooleanArgument;
}

export interface Executor<TResult> {
	(cmd?: command.TFXCommand): Q.Promise<TResult>;
}

export abstract class TfCommand<TArguments extends CoreArguments, TResult> {
	protected commandArgs: TArguments = <TArguments>{};
	private groupedArgs: { [key: string]: string[] };
	private initialized: Q.Promise<Executor<any>>;
	protected webApi: WebApi;
	protected description: string = "A suite of command line tools to interact with Visual Studio Online.";
	public connection: TfsConnection;

	/**
	 * @param serverCommand True to initialize the WebApi object during init phase.
	 */
	constructor(public passedArgs: string[], private serverCommand: boolean = true) {
		this.setCommandArgs();
	}

	/**
	 * Returns a promise that is resolved when this command is initialized and
	 * ready to be executed.
	 */
	public ensureInitialized(): Q.Promise<Executor<any>> {
		return this.initialized || this.initialize();
	}

	protected initialize(): Q.Promise<Executor<any>> {
		this.initialized = this.commandArgs.help.val().then((needHelp) => {
			if (needHelp) {
				return this.run.bind(this, this.getHelp.bind(this));
			} else {
				// Set the fiddler proxy
				return this.commandArgs.fiddler.val().then((useProxy) => {
					if (useProxy) {
						process.env.HTTP_PROXY = "http://127.0.0.1:8888";
					}
				}).then(() => {
					// Set the no-prompt flag 
					return this.commandArgs.noPrompt.val(true).then((noPrompt) => {
						common.NO_PROMPT = noPrompt;
					});
				}).then(() => {
					// Set the cached service url
					return this.commandArgs.serviceUrl.val(true).then((serviceUrl) => {
						if (!serviceUrl && !process.env["TFX_BYPASS_CACHE"] && common.EXEC_PATH.join("") !== "login") {
							let diskCache = new DiskCache("tfx");
							return diskCache.itemExists("cache", "connection").then((isConnection) => {
								let connectionUrlPromise: Q.Promise<string>;
								if (!isConnection) {
									connectionUrlPromise = Q.resolve<string>(null);
								} else {
									connectionUrlPromise = diskCache.getItem("cache", "connection");
								}
								return connectionUrlPromise.then((url) => {
									if (url) {
										this.commandArgs.serviceUrl.setValue(url);
									}
								});
							});
						} else {
							return Q.resolve<void>(null);
						}
					});
				}).then(() => {
					let apiPromise = Q.resolve<any>(null);
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
			this.passedArgs.forEach((arg) => {
				if (_.startsWith(arg, "--")) {
					currentArg = _.camelCase(arg.substr(2));
					group[currentArg] = [];
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

	protected registerCommandArgument<T extends args.Argument<any>>(
		name: string,
		friendlyName: string,
		description: string,
		ctor: new (name: string, friendlyName: string, description: string, value: string | string[], hasDefaultValue?: boolean) => T,
		defaultValue?: string | string[]): void {

		let groupedArgs = this.getGroupedArgs();
		if (groupedArgs[name]) {
			this.commandArgs[name] = new ctor(name, friendlyName, description, groupedArgs[name]);
		} else {
			this.commandArgs[name] = new ctor(name, friendlyName, description, defaultValue, true);
		}
	}

	/**
	 * Register arguments that may be used with this command.
	 */
	protected setCommandArgs(): void {
		this.registerCommandArgument("project", "Project name", null, args.StringArgument);
		this.registerCommandArgument("root", "Root directory", null, args.ExistingDirectoriesArgument, ".");
		this.registerCommandArgument("authType", "Authentication Method", "Method of authentication ('pat' or 'basic').", args.StringArgument, "pat");
		this.registerCommandArgument("serviceUrl", "Service URL", "URL to the service you will connect to, e.g. https://youraccount.visualstudio.com/DefaultCollection.", args.StringArgument);
		this.registerCommandArgument("password", "Password", "Password to use for basic authentication.", args.SilentStringArgument);
		this.registerCommandArgument("token", "Personal access token", null, args.SilentStringArgument);
		this.registerCommandArgument("save", "Save settings", "Save arguments for the next time a command in this command group is run.", args.BooleanArgument, "false");
		this.registerCommandArgument("username", "Username", "Username to use for basic authentication.", args.StringArgument);
		this.registerCommandArgument("output", "Output destination", "Method to use for output. Options: friendly, json, clipboard.", args.StringArgument, "friendly");
		this.registerCommandArgument("json", "Output as JSON", "Alias for --output json.", args.BooleanArgument, "false");
		this.registerCommandArgument("fiddler", "Use Fiddler proxy", "Set up the fiddler proxy for HTTP requests (for debugging purposes).", args.BooleanArgument, "false");
		this.registerCommandArgument("help", "Help", "Get help for any command.", args.BooleanArgument, "false");
		this.registerCommandArgument("noPrompt", "No Prompt", "Do not prompt the user for input (instead, raise an error).", args.BooleanArgument, "false");
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
	protected getCredentials(serviceUrl: string, useCredStore: boolean = true): Q.Promise<BasicCredentialHandler> {
		return Q.all([
			this.commandArgs.authType.val(),
			this.commandArgs.token.val(true),
			this.commandArgs.username.val(true),
			this.commandArgs.password.val(true)
		]).spread((authType: string, token: string, username: string, password: string) => {
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
						getCredentialPromise = Q.reject();
					}
					return getCredentialPromise.then((credString: string) => {
						if (credString.length <= 6) {
							throw "Could not get credentials from credential store.";
						}
						if (credString.substr(0, 3) === "pat") {
							return getBasicHandler("OAuth", credString.substr(4));
						} else if (credString.substr(0, 5) === "basic") {
							let credParts = credString.split(":").slice(1);
							if (credParts.length === 3) {
								credParts = credParts.slice(1);
								return getBasicHandler(credParts[0], credParts[1]);
							} else {
								throw "Could not get credentials from credential store.";
							}
						}
					}).catch(() => {
						if (authType.toLowerCase() === "pat") {
							return this.commandArgs.token.val().then((token) => {
								return getBasicHandler("OAuth", token);
							});
						} else if (authType.toLowerCase() === "basic") {
							return this.commandArgs.username.val().then((username) => {
								return this.commandArgs.password.val().then((password) => {
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

	public getWebApi(): Q.Promise<WebApi> {
		return this.commandArgs.serviceUrl.val().then((url) => {
			return this.getCredentials(url).then((handler) => {
				this.connection = new TfsConnection(url);
				this.webApi = new WebApi(url, handler);
				return this.webApi;
			});
		});
	}

	public run(main: (cmd?: command.TFXCommand) => Q.Promise<any>, cmd?: command.TFXCommand): Q.Promise<void> {
		return main(cmd).then((result) => {
			return this.output(result).then(() => {
				return this.dispose();
			});
		});
	}

	/**
	 * exec does some work and resolves to some kind of output. This method may
	 * log/trace during execution, but produces one single output in the end.
	 */
	protected abstract exec(): Q.Promise<TResult>;

	/**
	 * Should be called after exec. In here we will write settings to fs if necessary.
	 */
	public dispose(): Q.Promise<void> {
		let newToCache = {};
		return this.commandArgs.save.val().then((shouldSave) => {
			if (shouldSave) {
				let cacheKey = path.resolve().replace("/\.\[\]/g", "-") + "." + 
					common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
				let getValuePromises: Q.Promise<void>[] = [];
				Object.keys(this.commandArgs).forEach((arg) => {
					let argObj = <args.Argument<any>>this.commandArgs[arg];
					if (!argObj.hasDefaultValue) {
						let pr = argObj.val().then((value) => {
							// don"t cache these 5 options.
							if (["username", "password", "save", "token", "help"].indexOf(arg) < 0) {
								_.set(newToCache, cacheKey + "." + arg, value);
							}
						});
						getValuePromises.push(pr);
					}
				});
				return Q.all(getValuePromises).then(() => {
					return args.getOptionsCache().then((existingCache) => {
						// custom shallow-ish merge of cache properties.
						let newInThisCommand = _.get(newToCache, cacheKey);
						if (!_.get(existingCache, cacheKey)) {
							_.set(existingCache, cacheKey, {});
						}
						Object.keys(newInThisCommand).forEach((key) => {
							_.set(existingCache, cacheKey + "." + key, newInThisCommand[key]);
						});
						new DiskCache("tfx").setItem("cache", "command-options", JSON.stringify(existingCache, null, 4).replace(/\n/g, eol));
					});
				});
			} else {
				return Q.resolve<void>(null);
			}
		});
	}

	/**
	 * Gets help (as a string) for the given command
	 */
	public getHelp(cmd: command.TFXCommand): Q.Promise<string> {		
		this.commandArgs.output.setValue("help");
		let result = eol;
		result += ["                        fTfs         ",
				   "                      fSSSSSSSs      ",
				   "                    fSSSSSSSSSS      ",
				   "     TSSf         fSSSSSSSSSSSS      ",
				   "     SSSSSF     fSSSSSSST SSSSS      ",
				   "     SSfSSSSSsfSSSSSSSt   SSSSS      ",
				   "     SS  tSSSSSSSSSs      SSSSS      ",
				   "     SS   fSSSSSSST       SSSSS      ",
				   "     SS fSSSSSFSSSSSSf    SSSSS      ",
				   "     SSSSSST    FSSSSSSFt SSSSS      ",
				   "     SSSSt        FSSSSSSSSSSSS      ",
				   "                    FSSSSSSSSSS      ",
				   "                       FSSSSSSs      ",
				   "                        FSFs    (TM) "].
				   map(l => magenta(l)).join(eol) + eol + eol;

		let continuedHierarchy: command.CommandHierarchy = cmd.commandHierarchy;
		cmd.execPath.forEach((segment) => {
			continuedHierarchy = continuedHierarchy[segment];
		});

		if (continuedHierarchy === null) {
			// Need help with a particular command
			let singleArgData = (argName: string, maxArgLen: number) => {
				let argKebab = _.kebabCase(argName);
				let argObj = this.commandArgs[argName];
				return "  --" +
					argKebab + "  " +
					repeatStr(" ", maxArgLen - argKebab.length) +
					gray((argObj.description || (argObj.friendlyName + "."))) + eol;
			};
			let commandName = cmd.execPath[cmd.execPath.length - 1];
			result += cyan("Syntax: ") + eol +
				cyan("tfx ") + yellow(cmd.execPath.join(" ")) +
				green(" --arg1 arg1val1 arg1val2[...]") +
				gray(" --arg2 arg2val1 arg2val2[...]") + eol + eol;
			
			return loader.load(cmd.execPath, []).then((tfCommand) => {
				result += cyan("Command: ") + commandName + eol;
				result += tfCommand.description + eol + eol
				result += cyan("Arguments: ") + eol;
				
				let uniqueArgs = this.getHelpArgs();
				uniqueArgs = _.uniq(uniqueArgs);
				let maxArgLen = uniqueArgs.map(a => _.kebabCase(a)).reduce((a, b) => Math.max(a, b.length), 0);
				if (uniqueArgs.length === 0) {
					result += "[No arguments for this command]" + eol;
				}
				uniqueArgs.forEach((arg) => {
					result += singleArgData(arg, maxArgLen);
				});
				
				if (this.serverCommand) {
					result += eol + cyan("Global server command arguments:") + eol;
					["authType", "username", "password", "token", "serviceUrl"].forEach((arg) => {
						result += singleArgData(arg, 11);
					});
				}
				
				result += eol + cyan("Global arguments:") + eol;
				["help", "save", "noPrompt", "output", "json"].forEach((arg) => {
					result += singleArgData(arg, 9);
				});
				
				result += eol + gray("To see more commands, type " + resetColors("tfx " + cmd.execPath.slice(0, cmd.execPath.length - 1).join(" ") + " --help"));
			}).then(() => {
				return result;
			});

		} else {
			// Need help with a suite of commands
			// There is a weird coloring bug when colors are nested, so we don"t do that.
			result += cyan("Available ") +
				"commands" +
				cyan(" and ") +
				yellow("command groups") +
				cyan(" in " + ["tfx"].concat(cmd.execPath).join(" / ") + ":") + eol;
			let commandDescriptionPromises: Q.Promise<void>[] = [];
			Object.keys(continuedHierarchy).forEach((command) => {
				if (command === "default") {
					return;
				}
				let pr = loader.load(cmd.execPath.concat([command]), []).then((tfCommand) => {
					let coloredCommand = command;
					if (continuedHierarchy[command] !== null) {
						coloredCommand = yellow(command);
					}
					result += " - " + coloredCommand + gray(": " + tfCommand.description) + eol;
				});
				commandDescriptionPromises.push(pr);
			});
			return Q.all(commandDescriptionPromises).then(() => {
				result += eol + eol + gray("For help with an individual command, type ") + resetColors("tfx " + cmd.execPath.join(" ") + " <command> --help") + eol;
			}).then(() => {
				return result;
			});
		}
	}

	/**
	 * Display a copyright banner.
	 */
	public showBanner(): Q.Promise<void> {
		return this.commandArgs.json.val(true).then((useJson) => {
			if (useJson) {
				this.commandArgs.output.setValue("json");
			}
		}).then(() => {
			return this.commandArgs.output.val(true).then((outputType) => {
				return version.getTfxVersion().then((semVer) => {
					trace.outputType = outputType;
					if (outputType === "friendly") {
						trace.info(gray("TFS Cross Platform Command Line Interface v" + semVer.toString()));
						trace.info(gray("Copyright Microsoft Corporation"));
					}
				});
			});
		});
	}

	/**
	 * Takes data and pipes it to the appropriate output mechanism
	 */
	public output(data: any): Q.Promise<void> {
		return this.commandArgs.output.val().then((outputDestination) => {
			switch(outputDestination.toLowerCase()) {
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
					return Q.nfcall<void>(copypaste.copy, clipboardText);
				default:
					return qfs.canWriteTo(path.resolve(outputDestination)).then((canWrite) => {
						if (canWrite) {
							let fileContents = this.getFileOutput(data);
							return qfs.writeFile(outputDestination, fileContents);
						} else {
							throw new Error("Cannot write output to " + outputDestination);
						}
					});
			}
			return Q.resolve<void>(null);
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
			console.log(resetColors(JSON.stringify(data, null, 4)));
		} catch (e) {
			throw new Error("Could not stringify JSON output.");
		}
	}
}