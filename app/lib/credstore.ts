import fs = require("fs");

var osHomedir = require("os-homedir");
var path = require("path");
var cm = require("./diskcache");
var cache = new cm.DiskCache("tfx");

export function getCredentialStore(appName: string): ICredentialStore {
    // TODO: switch on OS specific cred stores.
    var store: ICredentialStore = new FileStore();
    store.appName = appName;
    return store;
}

// TODO: break out into a separate
export interface ICredentialStore {
    appName: string;

    credentialExists(service: string, user: string): Promise<boolean>;
    getCredential(service: string, user: string): Promise<string>;
    storeCredential(service: string, user: string, password: string): Promise<void>;
    clearCredential(service: string, user: string): Promise<void>;
}

class FileStore {
    public appName: string;

    private escapeService(service: string): string {
        service = service.replace(/:/g, "");
        service = service.replace(/\//g, "_");
        return service;
    }

    public credentialExists(service: string, user: string): Promise<boolean> {
        return cache.itemExists(this.escapeService(service), user);
    }

    public getCredential(service: string, user: string): Promise<string> {
        return cache.getItem(this.escapeService(service), user);
    }

    public storeCredential(service: string, user: string, password: string): Promise<void> {
        return cache.setItem(this.escapeService(service), user, password);
    }

    public clearCredential(service: string, user: string): Promise<void> {
        return cache.deleteItem(this.escapeService(service), user);
    }
}
