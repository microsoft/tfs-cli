import inputs = require('./inputs');
import Q = require('q');
import csm = require('./credstore');
import argm = require('./arguments');
var trace = require('./trace');

export interface ICredentials {
    type: string;
    populated: boolean;
    fromString(creds: string): ICredentials;
    toString(): string;
    promptCredentials(): Q.Promise<ICredentials>;
}

export class PatCredentials implements ICredentials {
    constructor() {
        this.type = 'pat';
    }

    public populated: boolean;
    public type: string;
    public token: string;

    public fromString(creds: string): ICredentials {
        // TODO: validate - it has a specific format
        this.token = creds.split(':')[1];
        this.populated = true;
        return this;
    }

    public toString(): string {
        return this.type + ':' + this.token;
    }

    public promptCredentials(): Q.Promise<ICredentials> {
        trace.debug('PatCredentials.promptCredentials');
        var credInputs = [ argm.PAT ];

        return inputs.Qprompt(credInputs, []).then((result) => {
            this.token = result['token'];
            return this;
        });
    }    
}

export class BasicCredentials implements ICredentials {
    constructor() {
        this.type = 'basic';
    }

    public populated: boolean;
    public type: string;
    public username: string;
    public password: string;

    public fromString(creds: string): ICredentials {
        var p = creds.split(':');
        this.username = p[1];
        this.password = p[2];
        this.populated = true;
        return this;
    }

    public toString(): string {
        return this.type + ':' + this.username + ':' + this.password;
    }

    public promptCredentials(): Q.Promise<ICredentials> {
        trace.debug('BasicCredentials.promptCredentials');
        var credInputs = [ argm.USERNAME, argm.PASSWORD ];

        return inputs.Qprompt(credInputs, []).then((result) => {
            this.username = result['username'];
            this.password = result['password'];
            return this;
        });
    }    
}


export function getCredentials(url: string, authType: string): Q.Promise<ICredentials> {
    trace.debug('auth.getCredentials');
    var defer = Q.defer<ICredentials>();

    // TODO: support other credential types

    var creds: ICredentials = null;
    return this.getCachedCredentials(url)
    .then((cachedData: string) => {
        var type = cachedData.split(':')[0] || authType;
        switch (type) {
            case 'basic':
                creds = new BasicCredentials();
                break;

            case 'pat':
                creds = new PatCredentials();
                break;

            default:
                throw new Error('Unsupported auth type: ' + type);
        }            
        return cachedData ? creds.fromString(cachedData) : creds;
    })
    .then((creds: ICredentials) => {
        return creds.populated ? creds : creds.promptCredentials();
    });

    return <Q.Promise<ICredentials>>defer.promise;
}

export function getCachedCredentials(url: string): Q.Promise<string> {
    trace.debug('auth.getCachedCredentials');
    var defer = Q.defer<string>();

    if (process.env['TFS_BYPASS_CACHE']) {
         trace.debug('Skipping checking cache for credentials');
        defer.resolve('');
    }

    var cs: csm.ICredentialStore = csm.getCredentialStore('tfx');
    cs.getCredential(url, 'allusers')
    .then((cred: string) => {
        trace.debug('Retrieved credentials from cache');
        defer.resolve(cred);
    })
    .fail((err) => {
        trace.debug('No credentials found in cache');
        defer.resolve('');
    });
    
    return <Q.Promise<string>>defer.promise;
}
