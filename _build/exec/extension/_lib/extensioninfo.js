"use strict";
var _ = require('lodash');
var Q = require('q');
var trace = require('../../../lib/trace');
var fs = require('fs');
var xml2js = require("xml2js");
var zip = require("jszip");
function getExtInfo(vsixPath, extensionId, publisherName, cachedInfo) {
    trace.debug('extensioninfo.getExtInfo');
    var vsixInfoPromise;
    if (cachedInfo) {
        return Q.resolve(cachedInfo);
    }
    else if (extensionId && publisherName) {
        vsixInfoPromise = Q.resolve({ id: extensionId, publisher: publisherName, version: null });
    }
    else if (vsixPath) {
        vsixInfoPromise = Q.Promise(function (resolve, reject, notify) {
            fs.readFile(vsixPath, function (err, data) {
                if (err)
                    reject(err);
                trace.debug(vsixPath);
                trace.debug("Read vsix as zip... Size (bytes): %s", data.length.toString());
                try {
                    resolve(new zip(data));
                }
                catch (err) {
                    reject(err);
                }
            });
        }).then(function (zip) {
            trace.debug("Files in the zip: %s", Object.keys(zip.files).join(", "));
            var vsixManifestFileNames = Object.keys(zip.files).filter(function (key) { return _.endsWith(key, "vsixmanifest"); });
            if (vsixManifestFileNames.length > 0) {
                return Q.nfcall(xml2js.parseString, zip.files[vsixManifestFileNames[0]].asText());
            }
            else {
                throw new Error("Could not locate vsix manifest!");
            }
        }).then(function (vsixManifestAsJson) {
            var foundExtId = extensionId || _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
            var foundPublisher = publisherName || _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
            var extensionVersion = _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Version");
            if (foundExtId && foundPublisher) {
                return { id: foundExtId, publisher: foundPublisher, version: extensionVersion };
            }
            else {
                throw new Error("Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property, or specify the necessary --publisher and/or --extension options.");
            }
        });
    }
    else {
        throw new Error("Either --vsix <path to vsix file> or BOTH of --extensionid <id> and --name <publisherName> is required");
    }
    return vsixInfoPromise;
}
exports.getExtInfo = getExtInfo;
