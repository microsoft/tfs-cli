/// <reference path="../../definitions/tsd.d.ts" />

import _ = require('lodash');
import Q = require('q');
import trace = require('./trace');
import fs = require('fs');
import xml2js = require("xml2js");
import zip = require("jszip");

export interface CoreExtInfo {
	id: string;
	publisher: string;
	version: string;
	published?: boolean;
}

export function getExtInfo(extensionId: string, vsixPath: string, publisherName: string, cachedInfo?: CoreExtInfo): Q.Promise<CoreExtInfo> {
	trace.debug('extensioninfo.getExtInfo');
	var vsixInfoPromise: Q.Promise<CoreExtInfo>;
	if(cachedInfo) {
		return Q.resolve(cachedInfo);
	}
	else if (extensionId && publisherName) {
		vsixInfoPromise = Q.resolve({id: extensionId, publisher: publisherName, version: null});
	} else {
		vsixInfoPromise = Q.Promise<JSZip>((resolve, reject, notify) => {
			console.log(vsixPath);
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
			let extensionId: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
			let extensionPublisher: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
			let extensionVersion: string = _.get<string>(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Version");
			if (extensionId && extensionPublisher) {
				return {id: extensionId, publisher: extensionPublisher, version: extensionVersion};
			} else {
				throw new Error("Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property.");
			}
		});
	} 
	return vsixInfoPromise;
}