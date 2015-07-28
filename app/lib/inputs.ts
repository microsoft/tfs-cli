// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/// <reference path="../../definitions/q/Q.d.ts" />

import cm = require('./common');
import Q = require('q');

var readline = require("readline")
  , read = require('read')
  , async = require('async')
  , argparser = require('minimist');

var args = argparser(process.argv.slice(2));

var getValueFromString = function (val, valtype, fallback) {
    var retVal = val;

    switch (valtype) {
        case "number":
            retVal = Number(val);
            if (isNaN(retVal))
                retVal = fallback;
            break;
        case "boolean":
            retVal = ((val.toLowerCase() === "true") || (val === "1"));
            break;
    }

    return retVal;
};

// Q wrapper
export function Qget(inputs: any): Q.Promise<cm.IStringDictionary> {
    var defer = Q.defer<cm.IStringDictionary>();

    this.get(inputs, (err, result: cm.IStringDictionary) => {
        if (err) {
            defer.reject(err);
            return;
        }

        defer.resolve(result);
    }); 

    return defer.promise;
}

// done(err, result)
export function get(inputs, done: (err: Error, result: cm.IStringDictionary) => void): void {
    var result: cm.IStringDictionary = <cm.IStringDictionary>{};
    
    result['_'] = args['_'];

    // TODO: get rid of async and code just with Q

    async.forEachSeries(inputs, function (input, inputDone) {
        if (args[input.arg]) {
            result[input.name] = args[input.arg];
            inputDone(null, null);
            return;
        }

        var msg = 'Enter ' + input.description;
        if (input.def) {
            msg += ' (enter sets ' + input.def + ') ';
        } 
        msg += ' > ';

        var silent = input.type === 'password';
        read({ prompt: msg, silent: silent }, function(err, answer) {
            var useVal = answer === "" ? input.def : answer;
            result[input.name] = getValueFromString(useVal, input.type, input.default);
            inputDone(null, null);
        });
    }, function(err) {
        
        if (err) {
            done(err, null);
            return;
        }

        // final validation
        inputs.forEach(function(input) {

            if (input.req && !result[input.name]) {
                done(new Error(input.description + ' is required.'), null);
                return;
            }
        });

        done(null, result);
    });
}
