/// <reference path="../../definitions/node.d.ts"/>
import fs = require('fs');
import path = require('path');
import cm = require('./common');

export function load(execPath: string, cmds: string[], defaultCmd: string): any {   
    var module = null;

    var execCmds: string[] = null;
    try {
        execCmds = fs.readdirSync(execPath);
    }
    catch(err) {
        return module;
    }

    var match = this.match(execCmds, cmds) || defaultCmd;
    if (match) {
        module = require(path.join(execPath, match));
    }
    
    return { name: path.basename(match, '.js'), module: module };   
}

export function match(cmdList: string[], cmds: string[]): string {
    var candidates = [];

    for (var i = 0; i < cmds.length; i++) {
        var candidate = '';
        for (var j = 0; j <= i; j++) {
            if (j > 0) {
                candidate += '-';
            }

            candidate += cmds[j];
        }
        candidates.push(candidate);
    }

    // let's find the most specific command
    candidates = candidates.reverse();

    var match = null;
    candidates.some((candidate) => {
        var file = candidate + '.js';
        var i = cmdList.indexOf(file);
        if (i >= 0) {
            match = file;
            return true;
        }
    })

    return match;
}

export function getHelp(execPath: string, scope: string, all: boolean) {
    var ssc = scope == '' ? 0 : scope.split('-').length;
    var execCmds = execCmds = fs.readdirSync(execPath);

    console.log();
    console.log('commands:');

    execCmds.forEach((cmd) => {
        cmd = path.basename(cmd, '.js');
        //console.log('\n' + cmd);

        //var show = false;
        var cs = cmd.split('-');
        var csc = cs.length;
        //console.log(scope, ssc, csc, all);
        var show = cmd.indexOf(scope) == 0 && (ssc + 1 == csc || all);

        //console.log('show: ' + show);
        if (show) {
            var p = path.join(execPath, cmd);
            
            // If we're listing all cmds - just show the cmds that have implementations.
            // If not, we want to list the 'top level' no impl cmds
            var mod = require(p);
            var hasImplementation = mod.getCommand();
            if (!all || hasImplementation) {
                var cmdLabel = '';
                for (var i = 0; i < cs.length; ++i) {
                    if (i >= ssc) {
                        cmdLabel += cs[i];
                        if (i < cs.length - 1) {
                            cmdLabel += ' ';
                        }                        
                    }
                }

                var args = mod.argsFormat ? mod.argsFormat() : '';
                args = args.length > 0 ? ' ' + args : args;
                var description = mod.describe ? ' : ' + mod.describe() : '';
                var optionsLabel = hasImplementation ? ' [options]' : '';
                console.log('   ' + cmdLabel);
                console.log('\t' + description);
                if (hasImplementation) 
                    console.log('\t' + cmdLabel + args + optionsLabel);

                console.log();
            }
        }
    })

    console.log();
}
