import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import am = require('../lib/auth');
import Q = require('q');
import csm = require('../lib/credstore');
import cam = require('../lib/diskcache');
import params = require('../lib/parameternames');
import apim = require('vso-node-api/WebApi');
import agentm = require('vso-node-api/TaskAgentApi');
var trace = require('../lib/trace');

export function describe(): string {
    return 'login and cache credentials. types: pat (default), basic';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint(
        [params.COLLECTION_URL], 
        [params.AUTH_TYPE]
    );
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
        trace('Login.exec');
        var defer = Q.defer();

        // TODO: validate valid url

        var con = this.connection;
        var cache: cam.DiskCache = new cam.DiskCache('tfx');
        var cs: csm.ICredentialStore = csm.getCredentialStore('tfx');
        trace('Caching credentials...');
        cs.storeCredential(con.collectionUrl, 'allusers', con.credentials.toString())
        .then(() => {
            return cache.setItem('cache', 'connection', con.collectionUrl);
        })
        .then(() => {
            trace('Connecting to agent API to test credentials...');
            var agentapi: agentm.ITaskAgentApi = this.getWebApi().getTaskAgentApi();
            agentapi.connect((err, statusCode, obj) => {
                if (statusCode && statusCode == 401) {
                    trace('Connection failed. Invalid credentials');
                    defer.reject(new Error('Invalid credentials'));
                }
                defer.resolve(con.credentials);
            });
        })
        .fail((err) => {
            trace('Login Failed: ' + err.message);
            defer.reject('Login Failed: ' + err.message);
        })
        
        return <Q.Promise<am.ICredentials>>defer.promise;
    }

    public output(creds: am.ICredentials): void {
        console.log('logged in successfully');
    }
}