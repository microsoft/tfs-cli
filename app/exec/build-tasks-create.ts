import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import argm = require('../lib/arguments');
import inputs = require('../lib/inputs');
import path = require('path');
import fs = require('fs');
import Q = require('q');
var shell = require('shelljs');
var trace = require('../lib/trace');
var uuid = require('node-uuid');
var check = require('validator');

export function describe(): string {
    return 'create files for new build task';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint([], []);
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildCreate();
}

// requires auth, connect etc...
export var isServerOperation: boolean = false;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildCreate extends cmdm.TfCommand {
    requiredArguments = [argm.TASK_NAME, argm.FRIENDLY_NAME, argm.DESCRIPTION, argm.AUTHOR];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('build-create.exec');
        var defer = Q.defer<any>();
        
		this.promptArguments(this.requiredArguments, this.optionalArguments).then( (allArguments) => {
   
            var tname = allArguments[argm.TASK_NAME.name];
            var tfriendly = allArguments[argm.FRIENDLY_NAME.name];
            var tdescription = allArguments[argm.DESCRIPTION.name];
            var tauthor = allArguments[argm.AUTHOR.name];
    
            if (!tname || !check.isAlphanumeric(tname)) {
                throw new Error('name is a required alphanumeric string with no spaces');
            }
    
            if (!tfriendly || !check.isLength(tfriendly, 1, 25)) {
                throw new Error('friendlyName is a required string <= 40 chars');
            }
    
            if (!tdescription || !check.isLength(tdescription, 1, 80)) {
                throw new Error('description is a required string <= 80 chars');
            }
    
            if (!tauthor || !check.isLength(tauthor, 1, 40)) {
                throw new Error('author is a required string <= 40 chars');
            }
    
            var ret: any = {};
            
            // create definition
            trace.debug('creating folder for task');
            var tp = path.join(process.cwd(), tname);
            trace.debug(tp);
            shell.mkdir('-p', tp);
            trace.debug('created folder');
            ret.taskPath = tp;
    
            trace.debug('creating definition');
            var def: any = {};
            def.id = uuid.v1();
            trace.debug('id: ' + def.id);
            def.name = tname;
            trace.debug('name: ' + def.name);
            def.friendlyName = tfriendly;
            trace.debug('friendlyName: ' + def.friendlyName);
            def.description = tdescription;
            trace.debug('description: ' + def.description);
            def.author = tauthor;
            trace.debug('author: ' + def.author);
    
            def.helpMarkDown = 'Replace with markdown to show in help';
            def.category = 'Utility';
            def.visibility = ['Build', 'Release'];
            def.demands = [];
            def.version = { Major: '0', Minor: '1', Patch: '0'};
            def.minimumAgentVersion = '1.83.0';
            def.instanceNameFormat = tname + ' $(message)';
    
            var cwdInput = {
                name: "cwd", 
                type: "filePath", 
                label: "Working Directory", 
                defaultValue: "", 
                required: false,
                helpMarkDown: "Current working directory when " + tname + " is run."   
            }
    
            var msgInput = {
                name: "msg", 
                type: "string", 
                label: "Message", 
                defaultValue: "Hello World", 
                required: true,
                helpMarkDown: "Message to echo out"   
            }
    
            def.inputs = [cwdInput, msgInput];
    
            def.execution = {
                Node: {
                    target: "sample.js",
                    argumentFormat: ""
                },        
                PowerShell: {
                    target: "$(currentDirectory)\\sample.ps1",
                    argumentFormat: "",
                    workingDirectory: "$(currentDirectory)"
                }
            }
    
            ret.definition = def;
    
            trace.debug('writing definition file');
            var defPath = path.join(tp, 'task.json');
            trace.debug(defPath);
            try {
                var defStr = JSON.stringify(def, null, 2);
                trace.debug(defStr);
                fs.writeFileSync(defPath, defStr);
            }
            catch(err) {
                throw new Error('Failed creating task: ' + err.message);
            }
            trace.debug('created definition file.');
    
            var copyResource = function(fileName) {
                var src = path.join(__dirname, 'resources', fileName);
                trace.debug('src: ' + src);
                var dest = path.join(tp, fileName);
                trace.debug('dest: ' + dest);
                shell.cp(src, dest);
                trace.debug(fileName + ' copied');
            }
    
            trace.debug('creating temporary icon');
            copyResource('icon.png');
            copyResource('sample.js');
            copyResource('sample.ps1');
    
            defer.resolve(ret);
        })
        .fail((err) => {
            trace.debug('Failed to gather inputs. Message: ' + err.message);
            defer.reject(err);
        });
        return <Q.Promise<any>>defer.promise;
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no results');
        }

        console.log();
        console.log('created task @ ' + data.taskPath);
        var def = data.definition;
        console.log('id   : ' + def.id);
        console.log('name: ' + def.name);
        console.log();
        console.log('A temporary task icon was created.  Replace with a 32x32 png with transparencies');

    }   
}