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
    trace.info('Options:');
    trace.info('   --help             : get help on a command');
    trace.info('   --json             : output in json format.  useful for scripting');
    trace.info('   --fiddler          : Use the fiddler proxy for REST API calls');
    trace.info("   --save             : save values of all options in a settings file -- then don't have to reenter for future commands");
    trace.info("   --settings <path>  : relative path to a settings file to save to and load from");
    trace.println();
    process.exit(1);
}

var previousProxy = process.env.HTTP_PROXY;
if(options.fiddler) {
    process.env.HTTP_PROXY = "http://127.0.0.1:8888";
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
            trace.println();
        }
    })
    .fail((err) => {
        trace.error('Error: %s', err.message);
        process.exit(1);
    })    
}
else {
    var connection: cnm.TfsConnection;
    var collectionUrl: string;

    cnm.getCollectionUrl()
    .then((url: string) => {
        trace.debug('url: ' + url);
        collectionUrl = url;
        return inputm.check(args, options, {}, [argm.AUTH_TYPE], []).then((allArguments) => {
            return am.getCredentials(url, allArguments[argm.AUTH_TYPE.name]);
        });
    })
    .then((creds: am.ICredentials) => {
        trace.debugArea(creds, 'CREDS');
        connection = new cnm.TfsConnection(collectionUrl, creds);
        cmd.connection = connection;
        return cmd.exec(args, options);
    })
    .then((result: any) => {
        if(options.fiddler) {
            process.env.HTTP_PROXY = previousProxy;
        }
        
        if (!result) {
            trace.error('Error: did not return results');
            process.exit(1);
        }

        if (options.json && result) {
            trace.info(JSON.stringify(result, null, 2));
        }
        else {
            cmd.output(result);
            trace.info('');
        }   
    })
    .fail((err) => {
        trace.error('Error: %s', err.message);
        process.exit(1);
    })    
}

process.on('uncaughtException', (err) => {
    trace.error('unhandled:');
    trace.error(err.stack);
});
