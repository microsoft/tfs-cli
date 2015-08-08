import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import argm = require('../lib/arguments');
import os = require('os');
var trace = require('../lib/trace');

export function describe(): string {
    return 'queue a build';
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
    requiredArguments = [argm.PROJECT_NAME];
    optionalArguments = [argm.DEFINITION_ID, argm.DEFINITION_NAME];
    
    public getArguments(): string {
        return super.getArguments() 
            + os.EOL + '\tmust supply ' + argm.DEFINITION_ID + ' or ' + argm.DEFINITION_NAME;
    }
    
    public exec(args: string[], options: cm.IOptions): any {
        trace('build-queue.exec');
        trace('Initializing Build API...');
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();

        var allArguments = this.checkArguments(args, options);
        var project: string = allArguments[argm.PROJECT_NAME.name];
        var definitionName: string = allArguments[argm.DEFINITION_NAME.name];
        var definitionId: number = allArguments[argm.DEFINITION_ID.name];

        if(definitionId) {
            trace('Searching for definitions with id ' + definitionId);
            return buildapi.getDefinition(definitionId, project).then((definition: buildifm.DefinitionReference) => {
                return this._queueBuild(buildapi, definition, project);
            });
        }
        else if (definitionName) {
            trace('No definition id provided, Searching for definitions with name: ' + definitionName);
            return buildapi.getDefinitions(project, definitionName).then((definitions: buildifm.DefinitionReference[]) => {
                if(definitions.length > 0) {
                    var definition = definitions[0];
                    return this._queueBuild(buildapi, definition, project);
                }
                else {
                    trace('No definition found with name ' + definitionName);
                    throw new Error('No definition found with name ' + definitionName);
                }
            });
        }
        else {
            trace('neither definitionId nor definitionName provided.')
            throw new Error('definitionId or definitionName required. Try adding a switch to the end of your command --definitionId <definitionId>')
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
        trace('Queueing build...')
        var build = <buildifm.Build> {
            definition: definition
        };
        return buildapi.queueBuild(build, project);
    }
}