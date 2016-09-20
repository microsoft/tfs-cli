"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var extPubBase = require("./default");
var trace = require('../../../lib/trace');
function getCommand(args) {
    return new ExtensionPublisherDelete(args);
}
exports.getCommand = getCommand;
var ExtensionPublisherDelete = (function (_super) {
    __extends(ExtensionPublisherDelete, _super);
    function ExtensionPublisherDelete() {
        _super.apply(this, arguments);
        this.description = "Delete a Visual Studio Services Market publisher.";
    }
    ExtensionPublisherDelete.prototype.getArgs = function () {
        return ["publisher"];
    };
    ExtensionPublisherDelete.prototype.exec = function () {
        var galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);
        return this.commandArgs.publisher.val().then(function (publisherName) {
            return galleryApi.deletePublisher(publisherName).then(function () {
                return {
                    publisher: {
                        publisherName: publisherName
                    }
                };
            });
        });
    };
    ExtensionPublisherDelete.prototype.friendlyOutput = function (data) {
        trace.success("\n=== Completed operation: delete publisher ===");
        trace.info(" - Name: %s", data.publisher.publisherName);
    };
    return ExtensionPublisherDelete;
}(extPubBase.ExtensionPublisherBase));
exports.ExtensionPublisherDelete = ExtensionPublisherDelete;
