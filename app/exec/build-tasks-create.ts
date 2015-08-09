import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import params = require('../lib/parameternames');
import inputs = require('../lib/inputs');
import path = require('path');
import fs = require('fs');
import Q = require('q');
var shell = require('shelljs');
var trace = require('../lib/trace');
var uuid = require('node-uuid');

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

/*
{
    "id": "7D831C3C-3C68-459A-A5C9-BDE6E659596C",
    "name": "CMake",
    "friendlyName": "CMake",
    "description": "Build with the CMake cross-platform build system",
    "helpMarkDown": "[More Information](http://go.microsoft.com/fwlink/?LinkID=613719)",
    "category": "Build",
    "visibility": [
                "Build"
                  ],    
    "author": "Microsoft Corporation",
    "demands" : [
        "cmake"
    ],
    "version": {
        "Major": 1,
        "Minor": 0,
        "Patch": 9
    },
    "minimumAgentVersion": "1.83.0",
    "instanceNameFormat": "CMake $(cmakeArgs)",
    "inputs": [
        { 
            "name": "cwd", 
            "type": "filePath", 
            "label": "Working Directory", 
            "defaultValue":"build", 
            "required":false,
            "helpMarkDown": "Current working directory when cmake is run."  
        },
        { 
            "name": "cmakeArgs", 
            "type": "string", 
            "label": "Arguments", 
            "defaultValue":"", 
            "required":false,
            "helpMarkDown": "Arguments passed to cmake" 
        }
    ],
    "execution": {
        "Node": {
            "target": "cmake2.js",
            "argumentFormat": ""
        },        
        "PowerShell": {
            "target": "$(currentDirectory)\\CMake.ps1",
            "argumentFormat": "",
            "workingDirectory": "$(currentDirectory)"
        }
    }
}
*/

export class BuildCreate extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        trace('build-create.exec');
        var defer = Q.defer<any>();

        var taskInputs = [
            {
                name: 'name', description: 'short name', arg: 'name', type: 'string', req: true
            },
            {
                name: 'displayName', description: 'display name', arg: 'displayName', type: 'string', req: true               
            },
            {
                name: 'description', description: 'description', arg: 'description', type: 'string', req: true
            }
        ];

        inputs.Qget(taskInputs)
        .then((result) => {
            
            // TODO: validate inputs

            var ret: any = {};
            var tname = result['name'];

            trace('creating folder for task');
            var tp = path.join(process.cwd(), tname);
            trace(tp);
            shell.mkdir('-p', tp);
            trace('created folder');
            ret.taskPath = tp;

            trace('creating definition');
            var def: any = {};
            def.id = uuid.v1();
            trace('id: ' + def.id);
            def.name = tname;
            trace('name: ' + def.name);
            def.displayName = result['displayName'];
            trace('displayName: ' + def.displayName);
            def.description = result['description'];
            trace('description: ' + def.description);

            ret.definition = def;

            trace('writing definition file');
            var defPath = path.join(tp, 'task.json');
            trace(defPath);
            try {
                var defStr = JSON.stringify(def, null, 2);
                trace(defStr);
                fs.writeFileSync(defPath, defStr);
            }
            catch(err) {
                throw new Error('Failed creating task: ' + err.message);
            }
            trace('created definition file.');

            trace('creating temporary icon');
            var iconSrc = path.join(__dirname, 'resources', 'icon.png');
            trace('src: ' + iconSrc);
            var iconDest = path.join(tp, 'icon.png');
            trace('dest: ' + iconDest);
            shell.cp(iconSrc, iconDest);
            trace('icon copied');

            defer.resolve(ret);
        })
        .fail((err) => {
            trace('Failed to gather inputs. Message: ' + err.message);
            defer.reject(err);
        })

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