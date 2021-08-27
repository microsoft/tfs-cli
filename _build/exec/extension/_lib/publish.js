"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require("lodash");
var colors = require("colors");
var errHandler = require("../../../lib/errorhandler");
var fs = require("fs");
var GalleryInterfaces = require("vso-node-api/interfaces/GalleryInterfaces");
var Q = require("q");
var trace = require("../../../lib/trace");
var xml2js = require("xml2js");
var zip = require("jszip");
var GalleryBase = (function () {
    /**
     * Constructor
     * @param PublishSettings
     */
    function GalleryBase(settings, galleryClient, extInfo) {
        this.settings = settings;
        this.galleryClient = galleryClient;
        if (extInfo) {
            this.vsixInfoPromise = Q.resolve(extInfo);
        }
        // if (!settings.galleryUrl || !/^https?:\/\//.test(settings.galleryUrl)) {
        //     throw "Invalid or missing gallery URL.";
        // }
        // if (!settings.token || !/^[A-z0-9]{52}$/.test(settings.token)) {
        //     throw "Invalid or missing personal access token.";
        // }
    }
    GalleryBase.prototype.getExtInfo = function () {
        if (!this.vsixInfoPromise) {
            this.vsixInfoPromise = GalleryBase.getExtInfo({
                extensionId: this.settings.extensionId,
                publisher: this.settings.publisher,
                vsixPath: this.settings.vsixPath });
        }
        return this.vsixInfoPromise;
    };
    GalleryBase.getExtInfo = function (info) {
        var promise;
        if (info.extensionId && info.publisher) {
            promise = Q.resolve({ id: info.extensionId, publisher: info.publisher, version: null });
        }
        else {
            promise = Q.Promise(function (resolve, reject, notify) {
                fs.readFile(info.vsixPath, function (err, data) {
                    if (err)
                        reject(err);
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
                    throw "Could not locate vsix manifest!";
                }
            }).then(function (vsixManifestAsJson) {
                var extensionId = info.extensionId || _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Id");
                var extensionPublisher = info.publisher || _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
                var extensionVersion = _.get(vsixManifestAsJson, "PackageManifest.Metadata[0].Identity[0].$.Version");
                if (extensionId && extensionPublisher) {
                    return { id: extensionId, publisher: extensionPublisher, version: extensionVersion };
                }
                else {
                    throw "Could not locate both the extension id and publisher in vsix manfiest! Ensure your manifest includes both a namespace and a publisher property, or specify the necessary --publisher and/or --extension options.";
                }
            });
        }
        return promise;
    };
    return GalleryBase;
}());
exports.GalleryBase = GalleryBase;
/**
 * Class that handles creating and deleting publishers
 */
var PublisherManager = (function (_super) {
    __extends(PublisherManager, _super);
    /**
     * Constructor
     * @param PublishSettings
     */
    function PublisherManager(settings, galleryClient) {
        _super.call(this, settings, galleryClient);
        this.settings = settings;
        this.galleryClient = galleryClient;
    }
    /**
     * Create a a publisher with the given name, displayName, and description
     * @param string Publisher's unique name
     * @param string Publisher's display name
     * @param string Publisher description
     * @return Q.Promise that is resolved when publisher is created
     */
    PublisherManager.prototype.createPublisher = function (name, displayName, description) {
        return this.galleryClient.createPublisher({
            publisherName: name,
            displayName: displayName,
            longDescription: description,
            shortDescription: description
        }).catch(errHandler.httpErr);
    };
    /**
     * Delete the publisher with the given name
     * @param string Publisher's unique name
     * @return Q.promise that is resolved when publisher is deleted
     */
    PublisherManager.prototype.deletePublisher = function (name) {
        return this.galleryClient.deletePublisher(name).catch(errHandler.httpErr);
    };
    return PublisherManager;
}(GalleryBase));
exports.PublisherManager = PublisherManager;
var SharingManager = (function (_super) {
    __extends(SharingManager, _super);
    function SharingManager() {
        _super.apply(this, arguments);
    }
    SharingManager.prototype.shareWith = function (accounts) {
        var _this = this;
        return this.getExtInfo().then(function (extInfo) {
            return Promise.all(accounts.map(function (account) {
                trace.info("Sharing extension with %s.", account);
                return _this.galleryClient.shareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr);
            }));
        });
    };
    SharingManager.prototype.unshareWith = function (accounts) {
        var _this = this;
        return this.getExtInfo().then(function (extInfo) {
            return Promise.all(accounts.map(function (account) {
                return _this.galleryClient.unshareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr);
            }));
        });
    };
    SharingManager.prototype.unshareWithAll = function () {
        var _this = this;
        return this.getSharedWithAccounts().then(function (accounts) {
            return _this.unshareWith(accounts);
        });
    };
    SharingManager.prototype.getSharedWithAccounts = function () {
        return this.getExtensionInfo().then(function (ext) {
            return ext.sharedWith.map(function (acct) { return acct.name; });
        });
    };
    SharingManager.prototype.getExtensionInfo = function () {
        var _this = this;
        return this.getExtInfo().then(function (extInfo) {
            return _this.galleryClient.getExtension(extInfo.publisher, extInfo.id, null, GalleryInterfaces.ExtensionQueryFlags.IncludeVersions |
                GalleryInterfaces.ExtensionQueryFlags.IncludeFiles |
                GalleryInterfaces.ExtensionQueryFlags.IncludeCategoryAndTags |
                GalleryInterfaces.ExtensionQueryFlags.IncludeSharedAccounts).then(function (extension) {
                return extension;
            }).catch(errHandler.httpErr);
        });
    };
    return SharingManager;
}(GalleryBase));
exports.SharingManager = SharingManager;
var PackagePublisher = (function (_super) {
    __extends(PackagePublisher, _super);
    function PackagePublisher() {
        _super.apply(this, arguments);
    }
    PackagePublisher.prototype.checkVsixPublished = function () {
        var _this = this;
        return this.getExtInfo().then(function (extInfo) {
            return _this.galleryClient.getExtension(extInfo.publisher, extInfo.id).then(function (ext) {
                if (ext) {
                    extInfo.published = true;
                    return extInfo;
                }
                return extInfo;
            }).catch(function () { return extInfo; });
        });
    };
    /**
     * Publish the VSIX extension given by vsixPath
     * @param string path to a VSIX extension to publish
     * @return Q.Promise that is resolved when publish is complete
     */
    PackagePublisher.prototype.publish = function () {
        var _this = this;
        var extPackage = {
            extensionManifest: fs.readFileSync(this.settings.vsixPath, "base64")
        };
        trace.debug("Publishing %s", this.settings.vsixPath);
        // Check if the app is already published. If so, call the update endpoint. Otherwise, create.
        trace.info("Checking if this extension is already published");
        return this.createOrUpdateExtension(extPackage).then(function (ext) {
            trace.info("Waiting for server to validate extension package...");
            var versions = ext.versions;
            versions.sort(function (a, b) {
                var aTime = a.lastUpdated.getTime();
                var bTime = b.lastUpdated.getTime();
                return aTime < bTime ? 1 : (aTime === bTime ? 0 : -1);
            });
            return _this.waitForValidation(versions[0].version).then(function (result) {
                if (result === PackagePublisher.validated) {
                    return ext;
                }
                else {
                    throw "Extension validation failed. Please address the following issues and retry publishing.\n" + result;
                }
            });
        });
    };
    PackagePublisher.prototype.createOrUpdateExtension = function (extPackage) {
        var _this = this;
        return this.checkVsixPublished().then(function (extInfo) {
            var publishPromise;
            if (extInfo && extInfo.published) {
                trace.info("It is, %s the extension", colors.cyan("update").toString());
                publishPromise = _this.galleryClient.updateExtension(extPackage, extInfo.publisher, extInfo.id).catch(errHandler.httpErr);
            }
            else {
                trace.info("It isn't, %s a new extension.", colors.cyan("create").toString());
                publishPromise = _this.galleryClient.createExtension(extPackage).catch(errHandler.httpErr);
            }
            return publishPromise.then(function () {
                return _this.galleryClient.getExtension(extInfo.publisher, extInfo.id, null, GalleryInterfaces.ExtensionQueryFlags.IncludeVersions);
            });
        });
    };
    PackagePublisher.prototype.waitForValidation = function (version, interval, retries) {
        var _this = this;
        if (interval === void 0) { interval = PackagePublisher.validationInterval; }
        if (retries === void 0) { retries = PackagePublisher.validationRetries; }
        if (retries === 0) {
            throw "Validation timed out. There may be a problem validating your extension. Please try again later.";
        }
        else if (retries === 25) {
            trace.info("This is taking longer than usual. Hold tight...");
        }
        trace.debug("Polling for validation (%s retries remaining).", retries.toString());
        // Compiler nonsense below. Sorry.
        return (Q.delay(this.getValidationStatus(version), interval)).then(function (status) {
            trace.debug("--Retrieved validation status: %s", status);
            if (status === PackagePublisher.validationPending) {
                return _this.waitForValidation(version, interval, retries - 1);
            }
            else {
                return Q.resolve(status); // otherwise TypeScript gets upset... I don't really know why.
            }
        });
    };
    PackagePublisher.prototype.getValidationStatus = function (version) {
        var _this = this;
        return this.getExtInfo().then(function (extInfo) {
            return _this.galleryClient.getExtension(extInfo.publisher, extInfo.id, extInfo.version, GalleryInterfaces.ExtensionQueryFlags.IncludeVersions).then(function (ext) {
                if (!ext || ext.versions.length === 0) {
                    throw "Extension not published.";
                }
                var extVersion = ext.versions[0];
                if (version) {
                    extVersion = _this.getVersionedExtension(ext, version);
                }
                // If there is a validationResultMessage, validation failed and this is the error
                // If the validated flag is missing and there is no validationResultMessage, validation is pending
                // If the validated flag is present and there is no validationResultMessage, the extension is validated.
                if (extVersion.validationResultMessage) {
                    return extVersion.validationResultMessage;
                }
                else if ((extVersion.flags & GalleryInterfaces.ExtensionVersionFlags.Validated) === 0) {
                    return PackagePublisher.validationPending;
                }
                else {
                    return PackagePublisher.validated;
                }
            });
        });
    };
    PackagePublisher.prototype.getVersionedExtension = function (extension, version) {
        var matches = extension.versions.filter(function (ev) { return ev.version === version; });
        if (matches.length > 0) {
            return matches[0];
        }
        else {
            return null;
        }
    };
    PackagePublisher.validationPending = "__validation_pending";
    PackagePublisher.validated = "__validated";
    PackagePublisher.validationInterval = 1000;
    PackagePublisher.validationRetries = 50;
    return PackagePublisher;
}(GalleryBase));
exports.PackagePublisher = PackagePublisher;
