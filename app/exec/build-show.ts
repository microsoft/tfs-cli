import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'get a build';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildShow;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildShow extends cmdm.TfCommand {
    requiredArguments = [argm.PROJECT_NAME, argm.BUILD_ID];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('build-show.exec');
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();
		return this.checkArguments(args, options).then( (allArguments) => {
            return buildapi.getBuild(allArguments[argm.BUILD_ID.name], allArguments[argm.PROJECT_NAME.name]);
        });
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no build supplied');
        }

        var build: buildifm.Build = <buildifm.Build>data;
        console.log();
        console.log('id   : ' + build.id);
        console.log('definition name: ' + build.definition.name)
        console.log('requested by : ' + build.requestedBy.displayName);
        console.log('status : ' + buildifm.BuildStatus[build.status]);
        console.log('queue time : ' + build.queueTime);
    }   
}