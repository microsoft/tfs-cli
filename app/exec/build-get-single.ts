import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');

export function describe(): string {
    return 'get build. args: buildId projectName';
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
        var buildId: number = +args[0];
        var project: string = args[1];
        if(!buildId) {
            throw new Error('build id not supplied.');
        }
        if(!project) {
            throw new Error('project name not supplied.');
        }
        var buildapi = this.getWebApi().getQBuildApi();
        return buildapi.getBuild(buildId, project);
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no build supplied');
        }

        console.log('id   : ' + data.id);
        console.log('requested by : ' + data.requestedBy.displayName);
        console.log('start time : ' + data.startTime);
        console.log('finish time : ' + data.finishTime);
    }   
}