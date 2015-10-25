import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import Q = require('q');
import cam = require('../lib/diskcache');
var trace = require('../lib/trace');

export function describe(): string {
    return 'Logs out of the logged in collection, if one is present';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new Logout();
}

// requires auth, connect etc...
export var isServerOperation: boolean = false;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class Logout extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): Q.Promise<string> {
        trace('Logout.exec');
        var defer = Q.defer();

        var cache: cam.DiskCache = new cam.DiskCache('tfx');

        trace('Checking for a cached connection...');
        cache.itemExists('cache', 'connection')
        .then((result) => {
            if (result) {
                cache.getItem('cache', 'connection')
                .then((url) => {
                    if (url) {
                        trace('Found a cached connection. Removing it.');
                        cache.setItem('cache', 'connection', '');
                        defer.resolve("Logged out successfully");
                    }
                    else {
                        trace('No cached connection to remove.');
                        defer.resolve("No cached connection to log out of");
                    }
                })
            }
            else {
                trace('No cached connection to remove.');
                defer.resolve("No cached connection to log out of");
            }
        });

        return <Q.Promise<string>>defer.promise;
    }

    public output(status: string): void {
        console.log(status);
    }
}