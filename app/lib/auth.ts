import inputs = require('./inputs');
import Q = require('q');

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
        this.token = creds;
        this.populated = true;
        return this;
    }

    public toString(): string {
        return this.token;
    }

    public promptCredentials(): Q.Promise<ICredentials> {
        var defer = Q.defer<ICredentials>();
        var promise = <Q.Promise<ICredentials>>defer.promise;

        var credInputs = [
            {
                name: 'token', description: 'personal access token', arg: 'token', type: 'string', req: true
            }
        ];

        inputs.get(credInputs, (err, result) => {
            if (err) {
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
        this.username = p[0];
        this.password = p[1];
        this.populated = true;
        return this;
    }

    public toString(): string {
        return this.username + ':' + this.password;
    }

    public promptCredentials(): Q.Promise<ICredentials> {
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


export function getCredentials(url: string, authtype): Q.Promise<ICredentials> {
    var defer = Q.defer<ICredentials>();

    // TODO: support other credential types

    var creds: ICredentials = null;
    switch(authtype) {
        case 'basic': 
            creds = new BasicCredentials();
            break;

        case 'pat': 
            creds = new PatCredentials();
            break;

        default:
            throw new Error('Unsupported auth type: ' + authtype);
    }

    return this.getCachedCredentials(url)
    .then((cachedData: string) => {
        return cachedData ? creds.fromString(cachedData) : creds;
    })
    .then((creds: ICredentials) => {
        return creds.populated ? creds : creds.promptCredentials();
    })

    return <Q.Promise<ICredentials>>defer.promise;
}

export function getCachedCredentials(url: string): Q.Promise<string> {
    var defer = Q.defer<string>();

    var cached = '';
    // TODO: implement cache

    defer.resolve(cached);
    
    return <Q.Promise<string>>defer.promise;
}
