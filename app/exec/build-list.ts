import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi')

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
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();

        var project: string = args[0] || options['project'];
        this.checkRequiredParameter(project, 'project', 'projectName');

        var status = options['status'];

        var top = null;
        if(options['top'])
            top = +options['top'];

        var definitions: number[] = null;
        var definitionId: number = +options['definitionId'];
        var definitionName: string = options['definitionName'];
        if (definitionId) {
            definitions = [+options['definitionId']];
        }
        else if(definitionName) {
            return buildapi.getDefinitions(project, definitionName).then((defs: buildifm.DefinitionReference[]) => {
                definitions = [defs[0].id];
                return this._getBuilds(buildapi, project, definitions, buildifm.BuildStatus[status], top);
            });
        }

        return this._getBuilds(buildapi, project, definitions, buildifm.BuildStatus[status], top);
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no build supplied');
        }

        if (!(data instanceof Array)) {
            throw new Error('expected an array of builds');
        }

        data.forEach((build) => {
            console.log();
            console.log('Queued new build:')
            console.log('id   : ' + build.id);
            console.log('definition name: ' + build.definition.name)
            console.log('requested by : ' + build.requestedBy.displayName);
            console.log('status : ' + buildifm.BuildStatus[build.status]);
            console.log('queue time : ' + build.queueTime);
        });
    }   

    private _getBuilds(buildapi: buildm.IQBuildApi, project: string, definitions: number[], status: string, top: number) {
        // I promise that this was as painful to write as it is to read
        return buildapi.getBuilds(project, definitions, null, null, null, null, null, null, buildifm.BuildStatus[status], null, null, null, null, top, null, null, null, null);
    }
}