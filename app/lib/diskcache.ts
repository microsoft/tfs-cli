import Q = require('q');
import fs = require('fs');
var osHomedir = require('os-homedir');
var path = require('path');
var shell = require('shelljs');

export class DiskCache {
    constructor(appName: string) {
        this.appName = appName;
    }

    public appName: string;

    private getFilePath(store: string, name: string): string {
        var storeFolder = path.join(osHomedir(), '.' + this.appName, store);
        shell.mkdir('-p', storeFolder);

        return path.join(storeFolder, '.' + name);
    }

    public itemExists(store: string, name: string): Q.Promise<boolean> {
        var defer = Q.defer<boolean>();

        fs.exists(this.getFilePath(store, name), (exists: boolean) => {
            defer.resolve(exists);
        });

        return <Q.Promise<boolean>>defer.promise;        
    }

    public getItem(store: string, name: string): Q.Promise<string> {
        var defer = Q.defer<string>();

        fs.readFile(this.getFilePath(store, name), (err: Error, contents: Buffer) => {
            if (err) {
                defer.reject(err);
                return;
            }

            defer.resolve(contents.toString());
        });

        return <Q.Promise<string>>defer.promise;
    }

    public setItem(store: string, name: string, data:string): Q.Promise<void> {
        var defer = Q.defer<void>();
        fs.writeFile(this.getFilePath(store, name), data, {flag: 'w'}, (err: Error) => {
            if (err) {
                defer.reject(err);
                return;
            }

            defer.resolve(null);
        });

        return <Q.Promise<void>>defer.promise;
    }

    public deleteItem(store: string, name: string): Q.Promise<void> {
        // TODO
        var defer = Q.defer<void>();
        defer.reject(new Error('Not implemented'));
        return <Q.Promise<void>>defer.promise;
    }
}
