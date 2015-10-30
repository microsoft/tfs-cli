import colors = require("colors");
import common = require("../lib/common");
import Q = require("q");
import qfs = require("../lib/qfs");
import path = require("path");
import trace = require("../lib/trace");
import {TfCommand} from "./tfcommand";

export interface CommandFactory {
    getCommand: (args: string[]) => TfCommand<any, any> | Q.Promise<TfCommand<any, any>>;
}

/**
 * Load the module given by execPath and instantiate a TfCommand using args.
 * @param {string[]} execPath: path to the module to load. This module must implement CommandFactory.
 * @param {string[]} args: args to pass to the command factory to instantiate the TfCommand
 * @return {Q.Promise<TfCommand>} Promise that is resolved with the module's command
 */
export function load(execPath: string[], args): Q.Promise<TfCommand<any, any>> {
    trace.debug('loader.load');
    let commandModulePath = path.resolve(common.APP_ROOT, "exec", execPath.join("/"));
    return qfs.exists(commandModulePath).then((exists) => {
        let resolveDefaultPromise = Q.resolve(commandModulePath);
        if (exists) {
            // If this extensionless path exists, it should be a directory.
            // If the path doesn't exist, for now we assume that a file with a .js extension
            // exists (if it doens't, we will find out below).
            resolveDefaultPromise = qfs.lstat(commandModulePath).then((stats) => {
                if (stats.isDirectory()) {
                    return commandModulePath + "\\default";
                }
                return commandModulePath;
            });
        }
        return resolveDefaultPromise.then((commandModulePath: string) => {
            let commandModule: CommandFactory;
            return qfs.exists(path.resolve(commandModulePath + ".js")).then((exists) => {
                if (!exists) {
                    throw new Error(commandModulePath + " is not a recognized command. Run with --help to see available commands.");
                }
                try {
                    commandModule = require(commandModulePath);
                } catch (e) {
                    trace.error(commandModulePath + " could not be fully loaded as a tfx command.");
                    throw e;
                }
                if (!commandModule.getCommand) {
                    throw new Error("Command modules must export a function, getCommand, that takes no arguments and returns an instance of TfCommand")
                }
                return common.promisify(commandModule.getCommand(args));
            });
        });
    });
}

// export function getHelp(execPath: string, scope: string, all: boolean) {
//     trace.debug('loader.getHelp');
//     var ssc = scope == '' ? 0 : scope.split('-').length;
//     var execCmds = execCmds = fs.readdirSync(execPath);
//     trace.debug(execCmds);

//     console.log();
//     console.log(colors.magenta('                        fTfs         '));   
//     console.log(colors.magenta('                      fSSSSSSSs      '));
//     console.log(colors.magenta('                    fSSSSSSSSSS     '));
//     console.log(colors.magenta('     TSSf         fSSSSSSSSSSSS      '));
//     console.log(colors.magenta('     SSSSSF     fSSSSSSST SSSSS      '));
//     console.log(colors.magenta('     SSfSSSSSsfSSSSSSSt   SSSSS      '));
//     console.log(colors.magenta('     SS  tSSSSSSSSSs      SSSSS      '));
//     console.log(colors.magenta('     SS   fSSSSSSST       SSSSS      '));
//     console.log(colors.magenta('     SS fSSSSSFSSSSSSf    SSSSS      '));
//     console.log(colors.magenta('     SSSSSST    FSSSSSSFt SSSSS      '));
//     console.log(colors.magenta('     SSSSt        FSSSSSSSSSSSS      '));
//     console.log(colors.magenta('                    FSSSSSSSSSS      '));
//     console.log(colors.magenta('                       FSSSSSSs      '));
//     console.log(colors.magenta('                        FSFs    (TM) '));
//     console.log();
//     console.log(colors.cyan('commands:'));

//     execCmds.forEach((cmd) => {
//         trace.debug('cmd: ' + cmd);
//         if (!cm.endsWith(cmd, '.js')) {
//             return;
//         }

//         cmd = path.basename(cmd, '.js');
//         //console.log('\n' + cmd);

//         //var show = false;
//         var cs = cmd.split('-');
//         var csc = cs.length;
//         //console.log(scope, ssc, csc, all);
//         var show = cmd.indexOf(scope) == 0 && (ssc + 1 == csc || all);
//         trace.debug('show? ' + show);

//         //console.log('show: ' + show);
//         if (show) {
//             var p = path.join(execPath, cmd);
            
//             // If we're listing all cmds - just show the cmds that have implementations.
//             // If not, we want to list the 'top level' no impl cmds
//             var mod = require(p);
//             var hasImplementation = mod.getCommand();
//             trace.debug('hasImplementation? ' + hasImplementation);
//             if (!all || hasImplementation) {
//                 var cmdLabel = '';
//                 for (var i = 0; i < cs.length; ++i) {
//                     if (i >= ssc) {
//                         cmdLabel += cs[i];
//                         if (i < cs.length - 1) {
//                             cmdLabel += ' ';
//                         }                        
//                     }
//                 }

//                 var description = mod.describe ? mod.describe() : '';
//                 trace.debug('description: ' + description);
//                 var listedArguments = '';
//                 if (hasImplementation) {
//                     listedArguments = hasImplementation.getArguments();
//                 }
//                 trace.debug(listedArguments);

//                 console.log(colors.yellow('   ' + cmdLabel));
//                 console.log(colors.white('\t' + description));
//                 if (hasImplementation) {
//                     console.log('\t' + cmdLabel + listedArguments);   
//                 }

//                 console.log();
//             }
//         }
//     })

//     console.log();
// }
