import inputs = require('./inputs');
import Q = require('q');
import csm = require('./credstore');
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
        trace('PatCredentials.promptCredentials');
        var defer = Q.defer<ICredentials>();
        var promise = <Q.Promise<ICredentials>>defer.promise;

        var credInputs = [
            {
                name: 'token', description: 'personal access token', arg: 'token', type: 'password', req: true
            }
        ];

        inputs.get(credInputs, (err, result) => {
            if (err) {
                trace('Failed to process input for PAT token. Message: ' + err.message);
                defer.reject(err);
                return;
            }

            this.token = result['token'];
            defer.resolve(this);
        });

        return promise;
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
        trace('BasicCredentials.promptCredentials');
        var defer = Q.defer<ICredentials>();
        var promise = <Q.Promise<ICredentials>>defer.promise;

        var credInputs = [
            {
                name: 'username', description: 'username', arg: 'username', type: 'string', req: true
            },
            {
                name: 'password', description: 'password', arg: 'password', type: 'password', req: true
            }
        ];

        inputs.get(credInputs, (err, result) => {
            if (err) {
                trace('Failed to process input for basic creds. Message: ' + err.message)
                defer.reject(err);
                return;
            }

            this.username = result['username'];
            this.password = result['password'];
            defer.resolve(this);
        });

        return promise;
    }    
}


export function getCredentials(url: string, authType: string): Q.Promise<ICredentials> {
    trace('auth.getCredentials');
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
    trace('auth.getCachedCredentials');
    var defer = Q.defer<string>();

    if (process.env['TFS_BYPASS_CACHE']) {
         trace('Skipping checking cache for credentials');
        defer.resolve('');
    }

    var cs: csm.ICredentialStore = csm.getCredentialStore('tfx');
    cs.getCredential(url, 'allusers')
    .then((cred: string) => {
        trace('Retrieved credentials from cache');
        defer.resolve(cred);
    })
    .fail((err) => {
        trace('No credentials found in cache');
        defer.resolve('');
    });
    
    return <Q.Promise<string>>defer.promise;
}
