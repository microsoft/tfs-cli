import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import parameternames = require('../lib/parameternames');

export function describe(): string {
    return 'get a list of builds.';
}

export function getArguments(): string {
    return cmdm.formatArgumentsHint(
        [parameternames.PROJECT_NAME], 
        [parameternames.DEFINITION_ID, parameternames.DEFINITION_NAME, parameternames.STATUS, parameternames.TOP]
    );
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

        var project: string = args[0] || options[parameternames.PROJECT_NAME];
        this.checkRequiredParameter(project, parameternames.PROJECT_NAME, parameternames.PROJECT_FRIENDLY_NAME);

        var status = options[parameternames.STATUS];

        var top = null;
        if(options[parameternames.TOP]) {
            top = +options[parameternames.TOP];
        }

        var definitions: number[] = null;
        var definitionId: number = +options[parameternames.DEFINITION_ID];
        var definitionName: string = options[parameternames.DEFINITION_NAME];
        if (definitionId) {
            definitions = [+options[parameternames.DEFINITION_ID]];
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