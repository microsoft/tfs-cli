import cmdm = require('../../lib/tfcommand');
import cm = require('../../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import argm = require('../../lib/arguments');
import trace = require('../../lib/trace');

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
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<buildifm.Build> {
        trace.debug('build-show.exec');
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();
		return this.checkArguments(args, options).then( (allArguments) => {
            return buildapi.getBuild(allArguments[argm.BUILD_ID.name], allArguments[argm.PROJECT_NAME.name]);
        });
    }

    public output(build: buildifm.Build): void {
        if (!build) {
            throw new Error('no build supplied');
        }

        trace.println();
        trace.info('id              : %s', build.id);
        trace.info('definition name : %s', build.definition.name)
        trace.info('requested by    : %s', build.requestedBy.displayName);
        trace.info('status          : %s', buildifm.BuildStatus[build.status]);
        trace.info('queue time      : %s', build.queueTime.toJSON());
    }   
}