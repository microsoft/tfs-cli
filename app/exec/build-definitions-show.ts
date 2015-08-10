import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import Q = require('q');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'get a single build definitions';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildDefinitionsShow;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildDefinitionsShow extends cmdm.TfCommand {
    requiredArguments = [argm.DEFINITION_ID, argm.PROJECT_NAME];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace("build-definitions-show.exec");
        var buildapi = this.getWebApi().getQBuildApi();
		var allArguments = this.checkArguments(args, options);
		return buildapi.getDefinition(allArguments[argm.DEFINITION_ID.name], allArguments[argm.PROJECT_NAME.name]);
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no definition supplied');
		}
        console.log();
        console.log('id   : ' + data.id);
        console.log('name : ' + data.name);
    }   
}