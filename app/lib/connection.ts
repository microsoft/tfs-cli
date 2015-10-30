// import Q = require('q');
// import am = require('./auth');
// import url = require('url');
// import apim = require('vso-node-api/WebApi');
// import apibasem = require('vso-node-api/interfaces/common/VsoBaseInterfaces');
// import cm = require('./diskcache');
// import argm = require('./arguments');
// var trace = require('./trace');

// var cache = new cm.DiskCache('tfx');

// export class TfsConnection {
//     constructor(collectionUrl: string, credentials: am.ICredentials) {
//         this.collectionUrl = collectionUrl;
//         this.credentials = credentials;
//         switch(credentials.type) {
//             case "basic":
//                 trace.debug('Using basic creds');
//                 var basicCreds: am.BasicCredentials = <am.BasicCredentials>credentials;
//                 this.authHandler = apim.getBasicHandler(basicCreds.username, basicCreds.password);
//                 break;
//             case "pat":
//                 trace.debug('Using PAT creds');
//                 var patCreds: am.PatCredentials = <am.PatCredentials>credentials;
//                 this.authHandler = apim.getBasicHandler("OAuth", patCreds.token);
//                 break;
//         }

//         var purl = url.parse(collectionUrl);
//         if (!purl.protocol || !purl.host) {
//             trace.debug('Invalid collection url - protocol and host are required');
//             throw new Error('Invalid collection url - protocol and host are required');
//         }
        
        
//         var splitPath: string[] = purl.path.split('/').slice(1);
//         this.accountUrl = purl.protocol + '//' + purl.host;
//         this.galleryUrl = 'https://app.market.visualstudio.com';
//         if(purl.host.indexOf('tfsallin.net') > -1) {
//             // devfabric
//             this.galleryUrl = purl.protocol + '//' + purl.host;
//         }
//         else if(splitPath.length === 2 && splitPath[0] === 'tfs') {
//             // on prem
//             this.accountUrl += '/' + 'tfs';
//         } 
//         else if(splitPath.length > 1) {
//             trace.debug('Invalid collection url - path is too long. Collection url should take the form [accounturl]/[collectionname]');
//             throw new Error('Invalid collection url - path is too long. Collection url should take the form [accounturl]/[collectionname]');
//         }
//         else if(splitPath.length === 0 || (splitPath.length === 1 && splitPath[0] === '')) {
//             trace.debug('Invalid collection url - collection name is required. Eg: [accounturl]/[collectionname]');
//             throw new Error('Invalid collection url - collection name is required. Eg: [accounturl]/[collectionname]');
//         }
//     }

//     public collectionUrl: string;
//     public accountUrl: string;
//     public galleryUrl: string;
//     public credentials: am.ICredentials;
//     public authHandler: apibasem.IRequestHandler;
// }

// var result: string;

// export function getCollectionUrl(): Q.Promise<string> {
//     trace.debug('connection.getCollectionUrl');
//     var defer = Q.defer<string>();

//     return this.getCachedUrl()
//     .then((url: string) => {
//         return url ? url : promptForUrl();
//     })

//     return <Q.Promise<string>>defer.promise;
// }

// export function getCachedUrl(): Q.Promise<string> {
//     trace.debug('connection.getCachedUrl');
//     var defer = Q.defer<string>();

//     if (process.env['TFS_BYPASS_CACHE']) {
//         trace.debug('Skipping checking cache for collection url');
//         defer.resolve('');
//     }
//     else {
//          cache.getItem('cache', 'connection')
//         .then(function(url) {
//             trace.debug('Retrieved collection url from cache');
//             defer.resolve(url);
//         })
//         .fail((err) => {
//             trace.debug('No collection url found in cache');
//             defer.resolve('');
//         });   
//     }

//     return <Q.Promise<string>>defer.promise;
// }