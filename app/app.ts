/// <reference path="../definitions/Q.d.ts"/>
/// <reference path="../definitions/node.d.ts"/>
import fs = require('fs');
import path = require('path');
import loader = require('./lib/loader');
import cm = require('./lib/common');

var minimist = require('minimist');

var mopts = {
  boolean: 'help',
  default: { help: false, username: '', password: '' }
};

var options = minimist(process.argv.slice(2), mopts);
var args: string[] = options['_'];
delete options['_'];

var execPath = path.join(__dirname, 'exec');

var loaded = loader.load(execPath, args, 'help.js');
if (!loaded) {
    // should never get here since falls back to help.js
    console.error('no command found for: ' + args.toString());
    process.exit(1);
}

var cmdm = loaded.module;

if (!options.json) {
	console.log();
	console.log('running ' + loaded.name + ' : ' + cmdm.describe());	
}

var cmd = cmdm.getCommand();

if (!cmd) {
	// implementation, list show help
	var scope = loaded.name == 'help' ? '' : loaded.name;
	console.log('showing help for scope: ' + scope);
	loader.getHelp(execPath, scope, options.all || false);
	process.exit(0);
}

// remove the args for the cmd - pass everything else to cmd
var csegs = loaded.name.split('-');
csegs.forEach((seg) => {
	args.splice(args.indexOf(seg), 1);
});

var result = cmd.exec(args, options);
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
