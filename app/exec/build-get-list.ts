import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');

export function describe(): string {
    return 'get build. args: buildId projectName';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildGetList;
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildGetList extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var project: string = args[0];
        if(!project) {
            throw new Error('project name not supplied.');
        }
        var buildapi = this.getWebApi().getQBuildApi();
        return buildapi.getBuilds(project);
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no build supplied');
        }

        data.forEach((build) => {
            console.log();
            console.log('id   : ' + build.id);
            console.log('requested by : ' + build.requestedBy.displayName);
            console.log('start time : ' + build.startTime);
            console.log('finish time : ' + build.finishTime);
        });
    }   
}