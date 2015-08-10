import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import Q = require('q');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'get a list of build definitions';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildDefinitionsList;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildDefinitionsList extends cmdm.TfCommand {
    requiredArguments = [argm.PROJECT_NAME];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace("build-definitions-list.exec");
        var buildapi = this.getWebApi().getQBuildApi();
        return this.checkArguments(args, options).then( (allArguments) => {
            return buildapi.getDefinitions(allArguments[argm.PROJECT_NAME.name]);  
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no definitions supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of definitions');
        }

        data.forEach((definition) => {
            console.log();
            console.log('id   : ' + definition.id);
            console.log('name : ' + definition.name);
        });
    }   
}