import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import Q = require('q');
import csm = require('../lib/credstore');
import cam = require('../lib/diskcache');
var trace = require('../lib/trace');

export function describe(): string {
    return 'prints the status of the logged in connection';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new LoginStatus();
}

// requires auth, connect etc...
export var isServerOperation: boolean = false;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export interface ILoginStatus {
    url: string,
    creds: string
}

export class LoginStatus extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): Q.Promise<ILoginStatus> {
        trace('LoginStatus.exec');
        var defer = Q.defer();

        var cache: cam.DiskCache = new cam.DiskCache('tfx');
        var cs: csm.ICredentialStore = csm.getCredentialStore('tfx');

        var result: ILoginStatus = {url: null, creds: null};

        trace('Loading cached connection url');
        cache.itemExists('cache', 'connection')
        .then((exists) => {
            if (exists) {
                cache.getItem('cache', 'connection')
                .then((url) => {
                    if (url) {
                        result.url = url;
                        trace('Found url ' + url);
                        trace('Looking for cached credentials for ' + url);
                        return cs.credentialExists(url, 'allusers')
                        .then((result) => {
                            if (result)
                            {
                                trace('Found credentials in the cache');
                                return cs.getCredential(url, 'allusers');
                            }
                            trace('Did not find credentials in the cache');
                        })
                        .then((creds) => {
                            result.creds = creds;
                            defer.resolve(result);
                        });
                    }
                    else {
                        defer.resolve(result);
                    }
                })
            }
            else {
                trace('No cached connection file found');
                defer.resolve(result);
            }
        });

        return <Q.Promise<ILoginStatus>>defer.promise;
    }

    public output(status: ILoginStatus): void {
        if (status.url) {
            if (status.creds) {
                console.log("Logged in to collection '" + status.url + "' with credentials '" + status.creds + "'.");
            }
            else {
                console.log("Logged in to collection '" + status.url + "', but no credentials are cached");
            }
        }
        else {
            console.log("You are not logged in to any collection");
        }
    }
}