import inputs = require('./inputs');
import Q = require('q');
import am = require('./auth');
import url = require('url');

export class TfsConnection {
    constructor(collectionUrl: string, credentials: am.ICredentials) {
        this.collectionUrl = collectionUrl;
        this.credentials = credentials;

        // TODO: validate url
        var purl = url.parse(collectionUrl);
        if (!purl.protocol || !purl.host) {
            throw new Error('Invalid url');
        }

        // TODO: handle on prem /tfs
        this.accountUrl = purl.protocol + '//' + purl.host;
    }

    public collectionUrl: string;
    public accountUrl: string;
    public credentials: am.ICredentials;
}

var result: string;

export function getCollectionUrl(): Q.Promise<string> {
    var defer = Q.defer<string>();

    // TODO: check is valid url
    result = null;

    return this.getCachedUrl()
    .then((url: string) => {
        result = url;
        return promptForUrl();
    })

    return <Q.Promise<string>>defer.promise;
}

export function getCachedUrl(): Q.Promise<string> {
    var defer = Q.defer<string>();

    var url: string  = null;
    // TODO: implement cache
    defer.resolve(url);
    
    return <Q.Promise<string>>defer.promise;
}

export function promptForUrl(): Q.Promise<string> {
    var defer = Q.defer<string>();
    var promise = <Q.Promise<string>>defer.promise;

    if (result) {
        defer.resolve(result);
        return promise;
    }

    var credInputs = [
        {
            name: 'collection', description: 'collection url', arg: 'collection', type: 'string', req: true
        }
    ];

    inputs.get(credInputs, (err, result) => {
        if (err) {
            defer.reject(err);
            return;
        }

        defer.resolve(result['collection']);
    });

    return promise;
}