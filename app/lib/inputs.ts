// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/// <reference path="../../definitions/q/Q.d.ts" />

import cm = require('./common');
import os = require('os');
import Q = require('q');
import argm = require('./arguments');

var readline = require("readline")
  , read = require('read')
  , async = require('async')
  , argparser = require('minimist')
  , trace = require('./trace');

var args = argparser(process.argv.slice(2));

export function Qcheck(args: string[], options: cm.IOptions, requiredArguments: argm.Argument[], optionalArguments: argm.Argument[]): Q.Promise<cm.IStringIndexer> {
    var defer = Q.defer<cm.IStringDictionary>();
    this.check(args, options, requiredArguments, optionalArguments, (err, result: cm.IStringDictionary) => {
        if (err) {
            defer.reject(err);
        }

        defer.resolve(result);
    });
    return defer.promise;
}

export function check(args: string[], options: cm.IOptions, requiredArguments: argm.Argument[], optionalArguments: argm.Argument[], done: (err:Error, result: cm.IStringIndexer) => void): void {
    trace('inputs.check');
    var allArguments: cm.IStringIndexer = {};
    for(var i = 0; i < requiredArguments.length; i++) {
        var arg: argm.Argument = requiredArguments[i];
        var name: string = arg.name;
        allArguments[name] = args[i] ? arg.getValueFromString(args[i].toString()) : (options[name] ? arg.getValueFromString(options[name].toString()) : arg.defaultValue);
        if(!allArguments[name]) {
            trace('Required parameter ' + name + ' not supplied.');
            done(new Error('Required parameter ' + name + ' not supplied.' + os.EOL + 'Try adding a switch to the end of your command: --' + name + ' <' + arg.friendlyName + '>'), null);
        }
    }
    for(var i = 0; i < optionalArguments.length; i++) {
        var arg: argm.Argument = optionalArguments[i];
        var name: string = arg.name;
        allArguments[name] = options[name] ? arg.getValueFromString(options[name].toString()) : arg.defaultValue;
    }
    done(null, allArguments);
}

// Q wrapper
export function Qprompt( requiredInputs: argm.Argument[], optionalInputs: argm.Argument[]): Q.Promise<cm.IStringDictionary> {
    var defer = Q.defer<cm.IStringDictionary>();

    this.prompt(requiredInputs, optionalInputs, (err, result: cm.IStringDictionary) => {
        if (err) {
            defer.reject(err);
        }

        defer.resolve(result);
    }); 

    return defer.promise;
}

// done(err, result)
export function prompt(requiredInputs: argm.Argument[], optionalInputs: argm.Argument[], done: (err: Error, result: cm.IStringIndexer) => void): void {
    trace('inputs.prompt');
    var result: cm.IStringIndexer = <cm.IStringIndexer>{};
    
    result['_'] = args['_'];
    
    var inputs = requiredInputs.concat(optionalInputs);

    // TODO: get rid of async and code just with Q

    async.forEachSeries(inputs, function (input: argm.Argument, inputDone) {
        if (args[input.name]) {
            result[input.name] = args[input.name];
            inputDone(null, null);
            return;
        }

        var msg = 'Enter ' + input.friendlyName;
        if (input.defaultValue) {
            msg += ' (enter sets ' + input.defaultValue + ') ';
        }
        msg += ' > ';

        read({ prompt: msg, silent: input.silent }, function(err, answer) {
            result[input.name] = answer ? input.getValueFromString(answer.toString()) : input.defaultValue;
            trace('read: ' + result[input.name]);
            inputDone(null, null);
        });
    }, function(err) {
        
        if (err) {
            trace('Input reading failed with message: ' + err.message);
            done(err, null);
            return;
        }

        // final validation
        requiredInputs.forEach(function(input) {

            if (!result[input.name]) {
                trace(input.name + ' is required.');
                done(new Error(input.name + ' is required.'), null);
                return;
            }
        });

        done(null, result);
    });
}
