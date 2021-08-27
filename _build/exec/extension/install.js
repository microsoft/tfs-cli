"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var args = require("../../lib/arguments");
var colors = require("colors");
var extBase = require("./default");
var extInfo = require("./_lib/extensioninfo");
var trace = require("../../lib/trace");
var SPS_INSTANCE_TYPE = "951917AC-A960-4999-8464-E3F0AA25B381";
function getCommand(args) {
    return new ExtensionInstall(args);
}
exports.getCommand = getCommand;
var AccountInstallReport = (function () {
    function AccountInstallReport(itemId, accountName, accountId, installed, reason) {
        if (installed === void 0) { installed = false; }
        this.itemId = itemId;
        this.accountName = accountName;
        this.accountId = accountId;
        this.installed = installed;
        this.reason = reason;
    }
    AccountInstallReport.prototype.setError = function (reason) {
        this.installed = false;
        this.reason = reason;
    };
    AccountInstallReport.prototype.setInstalled = function (reason) {
        this.installed = true;
        this.reason = reason;
    };
    return AccountInstallReport;
}());
exports.AccountInstallReport = AccountInstallReport;
var ExtensionInstall = (function (_super) {
    __extends(ExtensionInstall, _super);
    function ExtensionInstall(passedArgs) {
        _super.call(this, passedArgs);
        this.description = "Install a Visual Studio Services Extension to a list of VSTS Accounts.";
    }
    ExtensionInstall.prototype.setCommandArgs = function () {
        _super.prototype.setCommandArgs.call(this);
        this.registerCommandArgument("accounts", "Installation target accounts", "List of accounts where to install the extension.", args.ArrayArgument);
    };
    ExtensionInstall.prototype.getHelpArgs = function () {
        return ["publisher", "extensionId", "vsix", "accounts"];
    };
    ExtensionInstall.prototype.exec = function () {
        var _this = this;
        // Read extension info from arguments
        var result = { accounts: {}, extension: null };
        return this._getExtensionInfo()
            .then(function (extInfo) {
            var itemId = extInfo.publisher + "." + extInfo.id;
            var galleryApi = _this.webApi.getGalleryApi(_this.webApi.serverUrl);
            result.extension = itemId;
            // Read accounts from arguments and resolve them to get its accountIds
            return _this.commandArgs.accounts.val().then(function (accounts) {
                // Install extension in each account
                var installations = accounts.slice().map(function (account) {
                    var emsApi = _this.webApi.getExtensionManagementApi(_this.getEmsAccountUrl(_this.webApi.serverUrl, account));
                    return emsApi.installExtensionByName(extInfo.publisher, extInfo.id).then(function (installation) { return [account, installation]; });
                });
                return Promise.all(installations);
            }).then(function (installations) {
                installations.forEach(function (installation) {
                    var account = installation[0];
                    var installedExtension = installation[1];
                    var installationResult = { installed: true, issues: null };
                    if (installedExtension.installState.installationIssues && installedExtension.installState.installationIssues.length > 0) {
                        installationResult.installed = false;
                        installationResult.issues = "The following issues were encountered installing to " + account + ": \n" + installedExtension.installState.installationIssues.map(function (i) { return " - " + i; }).join("\n");
                    }
                    result.accounts[account] = installationResult;
                });
                return result;
            });
        });
    };
    ExtensionInstall.prototype.getEmsAccountUrl = function (marketplaceUrl, accountName) {
        if (marketplaceUrl.toLocaleLowerCase().indexOf("marketplace.visualstudio.com") >= 0) {
            return "https://" + accountName + ".extmgmt.visualstudio.com";
        }
        if (marketplaceUrl.toLocaleLowerCase().indexOf("me.tfsallin.net") >= 0) {
            return marketplaceUrl.toLocaleLowerCase().indexOf("https://") === 0 ?
                "https://" + accountName + ".me.tfsallin.net:8781" :
                "http://" + accountName + ".me.tfsallin.net:8780";
        }
        return marketplaceUrl;
    };
    ExtensionInstall.prototype.friendlyOutput = function (data) {
        trace.success("\n=== Completed operation: install extension ===");
        Object.keys(data.accounts).forEach(function (a) {
            trace.info("- " + a + ": " + (data.accounts[a].installed ? colors.green("success") : colors.red(data.accounts[a].issues)));
        });
    };
    ExtensionInstall.prototype._getExtensionInfo = function () {
        var _this = this;
        return this.commandArgs.vsix.val(true).then(function (vsixPath) {
            var extInfoPromise;
            if (vsixPath !== null) {
                extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
            }
            else {
                extInfoPromise = Promise.all([
                    _this.commandArgs.publisher.val(),
                    _this.commandArgs.extensionId.val()]).then(function (values) {
                    var publisher = values[0], extension = values[1];
                    return extInfo.getExtInfo(null, extension, publisher);
                });
            }
            return extInfoPromise;
        });
    };
    return ExtensionInstall;
}(extBase.ExtensionBase));
exports.ExtensionInstall = ExtensionInstall;
