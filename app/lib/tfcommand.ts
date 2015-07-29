/// <reference path="../../definitions/vso-node-api/vso-node-api.d.ts"/>

import cm = require('./common');
import cnm = require('./connection');
import apim = require('vso-node-api/WebApi');

export class TfCommand {
    public connection: cnm.TfsConnection;
    
    // setConnection

    // getWebApi() 
    public getWebApi(): apim.WebApi {
        return new apim.WebApi(this.connection.collectionUrl, this.connection.authHandler);
    }

    //
    // should return a JSON data object which will be
    // - printed in json if --json, or
    // - passed back to output for readable text
    //
    public exec(args: string[], options: cm.IOptions): Q.Promise<any> {
        var defer = Q.defer();
        defer.reject(new Error('Not implemented.  Must override'));
        return <Q.Promise<any>>defer.promise;
    }

    public output(data: any): void {
        // should override and output to console results
        // in readable text based on data from exec call
    }

    public checkRequiredParameter(parameterValue: any, parameterName: string, friendlyName?: string) {
        var finalFriendlyName = friendlyName || parameterName;
        if(!parameterValue) {
            throw new Error('Required parameter ' + parameterName + ' not supplied. Try adding a switch to the end of your command: --' + parameterName + ' <' + finalFriendlyName + '>');
        }
    }
}