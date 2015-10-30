import cmdm = require('../../lib/tfcommand');
import cm = require('../../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import argm = require('../../lib/arguments');
import os = require('os');
import trace = require('../../lib/trace');

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
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<buildifm.Build> {
        trace.debug('build-queue.exec');
        trace.debug('Initializing Build API...');
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();

        return this.checkArguments(args, options).then( (allArguments) => {
            var project: string = allArguments[argm.PROJECT_NAME.name];
            var definitionName: string = allArguments[argm.DEFINITION_NAME.name];
            var definitionId: number = allArguments[argm.DEFINITION_ID.name];
    
            if(definitionId) {
                trace.debug('Searching for definitions with id ' + definitionId);
                return buildapi.getDefinition(definitionId, project).then((definition: buildifm.DefinitionReference) => {
                    return this._queueBuild(buildapi, definition, project);
                });
            }
            else if (definitionName) {
                trace.debug('No definition id provided, Searching for definitions with name: ' + definitionName);
                return buildapi.getDefinitions(project, definitionName).then((definitions: buildifm.DefinitionReference[]) => {
                    if(definitions.length > 0) {
                        var definition = definitions[0];
                        return this._queueBuild(buildapi, definition, project);
                    }
                    else {
                        trace.debug('No definition found with name ' + definitionName);
                        throw new Error('No definition found with name ' + definitionName);
                    }
                });
            }
            else {
                trace.debug('neither definitionId nor definitionName provided.')
                throw new Error('definitionId or definitionName required. Try adding a switch to the end of your command --definitionId <definitionId>')
            }
        });
    }

    public output(build: buildifm.Build): void {
        if (!build) {
            throw new Error('no build supplied');
        }

        trace.println();
        trace.info('Queued new build:')
        trace.info('id              : %s', build.id);
        trace.info('definition name : %s', build.definition.name)
        trace.info('requested by    : %s', build.requestedBy.displayName);
        trace.info('status          : %s', buildifm.BuildStatus[build.status]);
        trace.info('queue time      : %s', build.queueTime.toJSON());
    }

    private _queueBuild(buildapi: buildm.IQBuildApi, definition: buildifm.DefinitionReference, project: string) {
        trace.debug('Queueing build...')
        var build = <buildifm.Build> {
            definition: definition
        };
        return buildapi.queueBuild(build, project);
    }
}