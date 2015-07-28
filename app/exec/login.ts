import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import am = require('../lib/auth');
import Q = require('q');
import csm = require('../lib/credstore');
import cam = require('../lib/diskcache');

export function describe(): string {
    return 'login and cache credentials. types: pat (default), basic';
}

export function argsFormat(): string {
    return '--collection <collectionUrl>  [--authtype pat | basic]';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new Login();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class Login extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): Q.Promise<am.ICredentials> {
        var defer = Q.defer();

        // TODO: validate valid url
        // TODO: do connect call

        var con = this.connection;
        var cache: cam.DiskCache = new cam.DiskCache('tfx');
        var cs: csm.ICredentialStore = csm.getCredentialStore('tfx');
        cs.storeCredential(con.collectionUrl, 'allusers', con.credentials.toString())
        .then(() => {
            return cache.setItem('cache', 'connection', con.collectionUrl);
        })
        .then(() => {
            defer.resolve(con.credentials);
        })
        .fail((err) => {
            defer.reject('Login Failed: ' + err.message);
        })
        
        return <Q.Promise<am.ICredentials>>defer.promise;
    }

    public output(creds: am.ICredentials): void {
        console.log('logged in successfully');
    }
}