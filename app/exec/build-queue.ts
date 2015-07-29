import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');

export function describe(): string {
    return 'queue a build.\n\targs: <project> [definitionId] [--definitionName <definitionName>]\n\tone of definitionId and definitionName is required.';
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
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();

        var project: string = args[0] || options['project'];
        this.checkRequiredParameter(project, 'project', 'projectName');

        var definitionId: number = +args[1] || +options['definitionId'];
        if(definitionId) {
            return buildapi.getDefinition(definitionId, project).then((definition: buildifm.DefinitionReference) => {
                return this._queueBuild(buildapi, definition, project);
            });
        }
        else {
            var definitionName = options['definitionName'];
            this.checkRequiredParameter(definitionName, 'definitionName');

            return buildapi.getDefinitions(project, definitionName).then((definitions: buildifm.DefinitionReference[]) => {
                var definition = definitions[0];
                return this._queueBuild(buildapi, definition, project);
            });

        }
    }

    public output(data: any): void {
        if (!data) {
            throw new Error('no build supplied');
        }

        var build: buildifm.Build = <buildifm.Build>data;
        console.log();
        console.log('Queued new build:')
        console.log('id   : ' + build.id);
        console.log('definition name: ' + build.definition.name)
        console.log('requested by : ' + build.requestedBy.displayName);
        console.log('status : ' + buildifm.BuildStatus[build.status]);
        console.log('queue time : ' + build.queueTime);
    }

    private _queueBuild(buildapi: buildm.IQBuildApi, definition: buildifm.DefinitionReference, project: string) {
        var build = <buildifm.Build> {
            definition: definition
        };
        return buildapi.queueBuild(build, project);
    }
}