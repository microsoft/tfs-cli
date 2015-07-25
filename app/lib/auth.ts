import inputs = require('./inputs');
import Q = require('q');

export interface ICredentials {
    username: string;
    password: string;
    type: string;
}

var result: ICredentials;

export function getCredentials(url: string): Q.Promise<ICredentials> {
    var defer = Q.defer<ICredentials>();


    // TODO: check is valid url
    result = null;

    return this.getCachedCredentials(url)
    .then((creds: ICredentials) => {
    	result = creds;
    	return promptCredentials();
    })

    return <Q.Promise<ICredentials>>defer.promise;
}

export function getCachedCredentials(url: string): Q.Promise<ICredentials> {
    var defer = Q.defer<ICredentials>();

    var cred: ICredentials = null;
    // TODO: implement cache
    defer.resolve(cred);
    
    return <Q.Promise<ICredentials>>defer.promise;
}

export function promptCredentials(): Q.Promise<ICredentials> {
    var defer = Q.defer<ICredentials>();
    var promise = <Q.Promise<ICredentials>>defer.promise;

    if (result) {
    	defer.resolve(result);
    	return promise;
    }

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

        var cred: ICredentials = <ICredentials>{};
        cred.username = result['username'];
        cred.password = result['password'];
        defer.resolve(cred);
    });

    return promise;
}