/// <reference path="../../../../typings/tsd.d.ts" />

import _ = require('lodash');
import Q = require('q');
import trace = require('../../../lib/trace');
import fs = require('fs');
import xml2js = require("xml2js");
import zip = require("jszip");

export interface CoreExtInfo {
	id: string;
	publisher: string;
	version: string;
	published?: boolean;
}

export function getExtInfo(vsixPath: string, extensionId: string, publisherName: string, cachedInfo?: CoreExtInfo): Q.Promise<CoreExtInfo> {
	trace.debug('extensioninfo.getExtInfo');
	var vsixInfoPromise: Q.Promise<CoreExtInfo>;
	if(cachedInfo) {
		return Q.resolve(cachedInfo);
	}
	else if (extensionId && publisherName) {
		vsixInfoPromise = Q.resolve({id: extensionId, publisher: publisherName, version: null});
	} 
	else if (vsixPath) {
		vsixInfoPromise = Q.Promise<JSZip>((resolve, reject, notify) => {
			fs.readFile(vsixPath, function(err, data) {
				if (err) reject(err);
				trace.debug(vsixPath);
				trace.debug("Read vsix as zip... Size (bytes): %s", data.length.toString());
				try {
					resolve(new zip(data));
				} catch (err) {
					reject(err);
				}
			});
		}).then((zip) => {
			trace.debug("Files in the zip: %s", Object.keys(zip.files).join(", "));
			let vsixManifestFileNames = Object.keys(zip.files).filter(key => _.endsWith(key, "vsixmanifest"));
			if (vsixManifestFileNames.length > 0) {
				return Q.nfcall(xml2js.parseString, zip.files[vsixManifestFileNames[0]].asText());
			} else {
				throw new Error("Could not locate vsix manifest!");
			}
		}).then((vsixManifestAsJson) => {
			let foundExtId: string = extensionId || _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
			let foundPublisher: string = publisherName || _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
			let extensionVersion: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Version");
			if (foundExtId && foundPublisher) {
				return {id: foundExtId, publisher: foundPublisher, version: extensionVersion};
			} else {
				throw new Error("Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property, or specify the necessary --publisher and/or --extension options.");
			}
		});
	} 
	else {
		throw new Error("Either --vsix <path to vsix file> or BOTH of --extensionid <id> and --name <publisherName> is required");
	}
	return vsixInfoPromise;
}