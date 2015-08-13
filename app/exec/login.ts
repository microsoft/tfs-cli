import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import am = require('../lib/auth');
import Q = require('q');
import csm = require('../lib/credstore');
import cam = require('../lib/diskcache');
import argm = require('../lib/arguments');
import apim = require('vso-node-api/WebApi');
import agentm = require('vso-node-api/TaskAgentApi');
import os = require('os');
var trace = require('../lib/trace');

export function describe(): string {
    return 'login and cache credentials. types: pat (default), basic';
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
    public requiredArguments = [argm.COLLECTION_URL];
    public optionalArguments = [argm.AUTH_TYPE];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<am.ICredentials> {
        trace.debug('Login.exec');
        var defer = Q.defer();

        // TODO: validate valid url

        var con = this.connection;
        var cache: cam.DiskCache = new cam.DiskCache('tfx');
        var cs: csm.ICredentialStore = csm.getCredentialStore('tfx');
        trace.debug('Caching credentials...');
        cs.storeCredential(con.collectionUrl, 'allusers', con.credentials.toString())
        .then(() => {
            return cache.setItem('cache', 'connection', con.collectionUrl);
        })
        .then(() => {
            trace.debug('Connecting to agent API to test credentials...');
            var agentapi: agentm.ITaskAgentApi = this.getWebApi().getTaskAgentApi();
            agentapi.connect((err, statusCode, obj) => {
                if (statusCode && statusCode == 401) {
                    trace.debug('Connection failed. Invalid credentials');
                    defer.reject(new Error('Invalid credentials'));
                }
                else if (err) {
                    trace.debug('Connection failed.')
                    defer.reject(new Error('Connection failed. Check your internet connection & collection URL.' + os.EOL + 'Message: ' + err.message));
                }
                defer.resolve(con.credentials);
            });
        })
        .fail((err) => {
            trace.debug('Login Failed: ' + err.message);
            defer.reject('Login Failed: ' + err.message);
        })
        
        return <Q.Promise<am.ICredentials>>defer.promise;
    }

    public output(creds: am.ICredentials): void {
        console.log('logged in successfully');
    }
}