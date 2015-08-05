import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import params = require('../lib/parameternames')

export function describe(): string {
    return 'get a build';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint([params.PROJECT_NAME, params.GENERIC_ID], []);
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildGetSingle;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildGetSingle extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();

        var project: string = args[0] || options[params.PROJECT_NAME];
        this.checkRequiredParameter(project, params.PROJECT_NAME, params.PROJECT_FRIENDLY_NAME);

        var buildId: number = +args[1] || +options[params.GENERIC_ID];
        this.checkRequiredParameter(buildId, params.GENERIC_ID, params.BUILD_ID);

        return buildapi.getBuild(buildId, project);
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