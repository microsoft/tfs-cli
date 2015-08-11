/// <reference path="../definitions/q/Q.d.ts"/>
/// <reference path="../definitions/node/node.d.ts"/>
import fs = require('fs');
import path = require('path');
import loader = require('./lib/loader');
import cm = require('./lib/common');
import am = require('./lib/auth');
import argm = require('./lib/arguments');
import cnm = require('./lib/connection');
import inputm = require('./lib/inputs');
var trace = require('./lib/trace');

var minimist = require('minimist');

var mopts = {
  boolean: 'help',
  default: { help: false }
};

var options = minimist(process.argv.slice(2), mopts);
var args: string[] = options['_'];
delete options['_'];
for(var key in options) {
    //convert all options flags to lowercase
    var temp = options[key];
    delete options[key];
    options[key.toLowerCase()] = temp;
}

var execPath = path.join(__dirname, 'exec');

var loaded = loader.load(execPath, args, 'help.js');
if (!loaded) {
    // should never get here since falls back to help.js
    console.error('no command found for: ' + args.toString());
    process.exit(1);
}

var cmdm = loaded.module;

if (!options.json && !cmdm.hideBanner) {
    console.log('Copyright Microsoft Corporation');
    console.log();
}

var cmd = cmdm.getCommand();

if (!cmd) {
    // implementation, list show help
    var scope = loaded.name == 'help' ? '' : loaded.name;
    console.log('tfx <command> [<subcommand(s)> ...] [<args>] [--version] [--help] [--json]');
    loader.getHelp(execPath, scope, options.all || false);
    console.log('Options:');
    console.log('   --version : output the version');
    console.log('   --help    : get help on a command');
    console.log('   --json    : output in json format.  useful for scripting');
    console.log();
    process.exit(1);
}

if (loaded.name == 'login') {
    process.env['TFS_BYPASS_CACHE'] = 1;
}

// remove the args for the cmd - pass everything else to cmd
var csegs = loaded.name.split('-');
csegs.forEach((seg) => {
    args.splice(args.indexOf(seg), 1);
});

if (!cmdm.isServerOperation) {
    cmd.exec(args, options)
    .then((result: any) => {
        if (result && cmd.output) {
            cmd.output(result);
            console.log();
        }
    })
    .fail((err) => {
        console.error('Error: ' + err.message);
        process.exit(1);
    })    
}
else {
    var connection: cnm.TfsConnection;
    var collectionUrl: string;

    cnm.getCollectionUrl()
    .then((url: string) => {
        trace('url: ' + url);
        collectionUrl = url;
        return inputm.Qcheck(args, options, [argm.AUTH_TYPE], []).then((allArguments) => {
            return am.getCredentials(url, allArguments[argm.AUTH_TYPE.name]);
        });
    })
    .then((creds: am.ICredentials) => {
        trace(creds, 'CREDS');
        connection = new cnm.TfsConnection(collectionUrl, creds);
        cmd.connection = connection;
        return cmd.exec(args, options);
    })
    .then((result: any) => {
        if (!result) {
            console.error('Error: did not return results');
            process.exit(1);
        }

        if (options.json && result) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            cmd.output(result);
            console.log();
        }   
    })
    .fail((err) => {
        console.error('Error: ' + err.message);
        process.exit(1);
    })    
}

process.on('uncaughtException', (err) => {
    console.error('unhandled:');
    console.error(err.stack);
});

