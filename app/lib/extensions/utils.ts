import _ = require("lodash");
import os = require("os");
import xml = require("xml2js");

export function removeMetaKeys(obj: any): any {
    return _.omit(obj, (v, k) => _.startsWith(k, "__meta_"));
}

export function cleanAssetPath(assetPath: string) {
    if (!assetPath) {
        return null;
    }
    let cleanPath = assetPath.replace(/\\/g, "/");
    if (!_.startsWith(cleanPath, "/")) {
        cleanPath = "/" + cleanPath;
    }
    return cleanPath;
}

/**
 * OPC Convention implementation. See
 * http://www.ecma-international.org/news/TC45_current_work/tc45-2006-335.pdf §10.1.3.2 & §10.2.3
 */
export function toZipItemName(partName: string): string {
    let cleanPartName = cleanAssetPath(partName);
    if (_.startsWith(cleanPartName, "/")) {
        return cleanPartName.substr(1);
    } else {
        return cleanPartName;
    }
}

export function jsonToXml(json: any): string {
    let builder = new xml.Builder(DEFAULT_XML_BUILDER_SETTINGS);
    return builder.buildObject(json);
}

export function maxKey<T>(obj: {[key: string]: T}, func: (input: T) => number): string {
    let maxProp;
    for (let prop in obj) {
        if (!maxProp || func(obj[prop]) > func(obj[maxProp])) {
            maxProp = prop;
        }
    }
    return maxProp;
}

export var DEFAULT_XML_BUILDER_SETTINGS: xml.BuilderOptions = {
    indent: "    ",
    newline: os.EOL,
    pretty: true,
    xmldec: {
        encoding: "utf-8",
        standalone: null,
        version: "1.0"
    }
};