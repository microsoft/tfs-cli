"use strict";
var osHomedir = require('os-homedir');
var path = require('path');
var cm = require('./diskcache');
var cache = new cm.DiskCache('tfx');
function getCredentialStore(appName) {
    // TODO: switch on OS specific cred stores.
    var store = new FileStore();
    store.appName = appName;
    return store;
}
exports.getCredentialStore = getCredentialStore;
var FileStore = (function () {
    function FileStore() {
    }
    FileStore.prototype.escapeService = function (service) {
        service = service.replace(/:/g, '');
        service = service.replace(/\//g, '_');
        return service;
    };
    FileStore.prototype.credentialExists = function (service, user) {
        return cache.itemExists(this.escapeService(service), user);
    };
    FileStore.prototype.getCredential = function (service, user) {
        return cache.getItem(this.escapeService(service), user);
    };
    FileStore.prototype.storeCredential = function (service, user, password) {
        return cache.setItem(this.escapeService(service), user, password);
    };
    FileStore.prototype.clearCredential = function (service, user) {
        return cache.deleteItem(this.escapeService(service), user);
    };
    return FileStore;
}());
