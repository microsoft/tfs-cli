import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces')

export function describe(): string {
    return 'queue a build. args: definitionId projectName';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildQueue();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildQueue extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var definitionId: number = +args[0];
        var project: string = args[1];
        if(!definitionId) {
            throw new Error('definition id not supplied.');
        }
        if(!project) {
            throw new Error('project name not supplied.');
        }
        var buildapi = this.getWebApi().getQBuildApi();
        var build = <buildifm.Build>{
            definition: {
                id: definitionId
            }
        };
        return buildapi.queueBuild(build, project, false);
    }

    public output(data: any): void {

    }
}