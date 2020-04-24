import _ = require("lodash");
import trace = require("../../../lib/trace");
import fs = require("fs");
import xml2js = require("xml2js");
import zip = require("jszip");

import { promisify } from "util";
import { readFile } from "fs";

export interface CoreExtInfo {
	id: string;
	publisher: string;
	version: string;
	published?: boolean;
}

export function getExtInfo(
	vsixPath: string,
	extensionId: string,
	publisherName: string,
	cachedInfo?: CoreExtInfo,
): Promise<CoreExtInfo> {
	trace.debug("extensioninfo.getExtInfo with vsixpath: " + vsixPath + ", extId: " + extensionId + ", publisher: " + publisherName);
	var vsixInfoPromise: Promise<CoreExtInfo>;
	if (cachedInfo) {
		return Promise.resolve(cachedInfo);
	} else if (extensionId && publisherName) {
		vsixInfoPromise = Promise.resolve({ id: extensionId, publisher: publisherName, version: null });
	} else if (vsixPath) {
		vsixInfoPromise = promisify(readFile)(vsixPath)
			.then(async data => {
				trace.debug(vsixPath);
				trace.debug("Read vsix as zip... Size (bytes): %s", data.length.toString());
				const zipArchive = new zip();
				await zipArchive.loadAsync(data);
				return zipArchive;
			})
			.then(zip => {
				trace.debug("Files in the zip: %s", Object.keys(zip.files).join(", "));
				let vsixManifestFileNames = Object.keys(zip.files).filter(key => _.endsWith(key, "vsixmanifest"));
				if (vsixManifestFileNames.length > 0) {
					return new Promise(async (resolve, reject) => {
						xml2js.parseString(await zip.files[vsixManifestFileNames[0]].async("text"), (err, result) => {
							if (err) {
								reject(err);
							} else {
								resolve(result);
							}
						});
					});
				} else {
					throw new Error("Could not locate vsix manifest!");
				}
			})
			.then(vsixManifestAsJson => {
				let foundExtId: string =
					extensionId || _.get<any, string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
				let foundPublisher: string =
					publisherName ||
					_.get<any, string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
				let extensionVersion: string = _.get<any, string>(
					vsixManifestAsJson,
					"PackageManifest.Metadata[0].Identity[0].$.Version",
				);
				if (foundExtId && foundPublisher) {
					return { id: foundExtId, publisher: foundPublisher, version: extensionVersion };
				} else {
					throw new Error(
						"Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property, or specify the necessary --publisher and/or --extension options.",
					);
				}
			});
	} else {
		throw new Error("Either --vsix <path to vsix file> or BOTH of --extensionid <id> and --name <publisherName> is required");
	}
	return vsixInfoPromise;
}
