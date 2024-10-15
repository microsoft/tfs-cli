import * as common from "./common";
import * as fs from "fs";
import { defer } from "./promiseUtils";

var os = require('os');
var path = require("path");
var shell = require("shelljs");
var trace = require("./trace");

export class DiskCache {
	constructor(appName: string) {
		this.appName = appName;
	}

	public appName: string;

	private getFilePath(store: string, name: string): string {
		var storeFolder = path.join(os.homedir(), "." + this.appName, store);
		try {
			shell.mkdir("-p", storeFolder);
		} catch (e) {}
		return path.join(storeFolder, "." + name);
	}

	public itemExists(store: string, name: string): Promise<boolean> {
		var deferred = defer<boolean>();

		fs.exists(this.getFilePath(store, name), (exists: boolean) => {
			deferred.resolve(exists);
		});

		return <any>deferred.promise;
	}

	public getItem(store: string, name: string): Promise<string> {
		trace.debug("cache.getItem");
		var deferred = defer<string>();
		var fp = this.getFilePath(store, name);
		trace.debugArea("read: " + store + ":" + name, "CACHE");
		trace.debugArea(fp, "CACHE");
		fs.readFile(fp, (err: Error, contents: Buffer) => {
			if (err) {
				deferred.reject(err);
				return;
			}

			var str = contents.toString();
			trace.debugArea(str, "CACHE");
			deferred.resolve(str);
		});

		return <any>deferred.promise;
	}

	public setItem(store: string, name: string, data: string): Promise<void> {
		trace.debug("cache.setItem");
		var deferred = defer<void>();
		var fp = this.getFilePath(store, name);
		trace.debugArea("write: " + store + ":" + name + ":" + data, "CACHE");
		trace.debugArea(fp, "CACHE");
		fs.writeFile(fp, data, { flag: "w" }, (err: Error) => {
			if (err) {
				deferred.reject(err);
				return;
			}
			trace.debugArea("written", "CACHE");
			deferred.resolve(null);
		});

		return <any>deferred.promise;
	}

	public deleteItem(store: string, name: string): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.unlink(this.getFilePath(store, name), err => {
				if (err) {
					reject(err);
				} else {
					resolve(null);
				}
			});
		});
	}
}

export function parseSettingsFile(settingsPath: string, noWarn: boolean): Promise<common.IStringIndexer> {
	trace.debug("diskcache.parseSettings");
	trace.debug("reading settings from %s", settingsPath);
	return new Promise((resolve, reject) => {
		try {
			if (fs.existsSync(settingsPath)) {
				let settingsStr = fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, "");
				let settingsJSON;
				try {
					resolve(JSON.parse(settingsStr));
				} catch (err) {
					trace.warn("Could not parse settings file as JSON. No settings were read from %s.", settingsPath);
					resolve({});
				}
			} else {
				if (!noWarn) {
					trace.warn("No settings file found at %s.", settingsPath);
				}
				resolve({});
			}
		} catch (err) {
			reject(err);
		}
	});
}
