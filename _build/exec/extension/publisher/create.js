"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var extPubBase = require("./default");
var trace = require('../../../lib/trace');
function getCommand(args) {
    // this just offers description for help and to offer sub commands
    return new ExtensionPublisherCreate(args);
}
exports.getCommand = getCommand;
var ExtensionPublisherCreate = (function (_super) {
    __extends(ExtensionPublisherCreate, _super);
    function ExtensionPublisherCreate() {
        _super.apply(this, arguments);
        this.description = "Create a Visual Studio Services Market publisher";
    }
    ExtensionPublisherCreate.prototype.getHelpArgs = function () {
        return ["publisher", "displayName", "description"];
    };
    ExtensionPublisherCreate.prototype.exec = function () {
        var galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);
        return Promise.all([
            this.commandArgs.publisher.val(),
            this.commandArgs.displayName.val(),
            this.commandArgs.description.val()
        ]).then(function (values) {
            var publisherName = values[0], displayName = values[1], description = values[2];
            return galleryApi.createPublisher({
                publisherName: publisherName,
                displayName: displayName,
                shortDescription: description,
                longDescription: description
            });
        });
    };
    ExtensionPublisherCreate.prototype.friendlyOutput = function (data) {
        trace.success("\n=== Completed operation: create publisher ===");
        trace.info(" - Name: %s", data.publisherName);
        trace.info(" - Display Name: %s", data.displayName);
        trace.info(" - Description: %s", data.longDescription);
    };
    return ExtensionPublisherCreate;
}(extPubBase.ExtensionPublisherBase));
exports.ExtensionPublisherCreate = ExtensionPublisherCreate;
