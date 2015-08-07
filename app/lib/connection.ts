/// <reference path="../../definitions/vso-node-api/vso-node-api.d.ts"/>

import inputs = require('./inputs');
import Q = require('q');
import am = require('./auth');
import url = require('url');
import apim = require('vso-node-api/WebApi');
import apibasem = require('vso-node-api/interfaces/common/VsoBaseInterfaces');
import cm = require('./diskcache');
var trace = require('./trace');

var cache = new cm.DiskCache('tfx');

export class TfsConnection {
    constructor(collectionUrl: string, credentials: am.ICredentials) {
        this.collectionUrl = collectionUrl;
        this.credentials = credentials;
        switch(credentials.type) {
            case "basic":
                trace('Using basic creds');
                var basicCreds: am.BasicCredentials = <am.BasicCredentials>credentials;
                this.authHandler = apim.getBasicHandler(basicCreds.username, basicCreds.password);
                break;
            case "pat":
                trace('Using PAT creds');
                var patCreds: am.PatCredentials = <am.PatCredentials>credentials;
                this.authHandler = apim.getBasicHandler("OAuth", patCreds.token);
                break;
        }

        // TODO: validate url
        var purl = url.parse(collectionUrl);
        if (!purl.protocol || !purl.host) {
            trace('Invalid collection url');
            throw new Error('Invalid collection url');
        }

        // TODO: handle on prem /tfs
        this.accountUrl = purl.protocol + '//' + purl.host;
    }

    public collectionUrl: string;
    public accountUrl: string;
    public credentials: am.ICredentials;
    public authHandler: apibasem.IRequestHandler;
}

var result: string;

export function getCollectionUrl(): Q.Promise<string> {
    trace('loader.getCollectionUrl');
    var defer = Q.defer<string>();

    return this.getCachedUrl()
    .then((url: string) => {
        return url ? url : promptForUrl();
    })

    return <Q.Promise<string>>defer.promise;
}

export function getCachedUrl(): Q.Promise<string> {
    trace('loader.getCachedUrl');
    var defer = Q.defer<string>();

    if (process.env['TFS_BYPASS_CACHE']) {
        trace('Skipping checking cache for collection url');
        defer.resolve('');
    }
    else {
         cache.getItem('cache', 'connection')
        .then(function(url) {
            trace('Retrieved collection url from cache');
            defer.resolve(url);
        })
        .fail((err) => {
            trace('No collection url found in cache');
            defer.resolve('');
        });   
    }

    return <Q.Promise<string>>defer.promise;
}

export function promptForUrl(): Q.Promise<string> {
    trace('loader.promptForUrl');
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
            trace('Url prompt failed: ' + err.message);
            defer.reject(err);
            return;
        }

        defer.resolve(result['collection']);
    });

    return promise;
}