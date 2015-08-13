import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import buildifm = require('vso-node-api/interfaces/BuildInterfaces');
import buildm = require('vso-node-api/BuildApi');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

export function describe(): string {
    return 'get a list of builds';
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
    public requiredArguments = [argm.PROJECT_NAME];
    public optionalArguments = [argm.DEFINITION_ID, argm.DEFINITION_NAME, argm.STATUS, argm.TOP];
    
    public exec(args: string[], options: cm.IOptions): any {
        trace.debug('build-list.exec');
        var buildapi: buildm.IQBuildApi = this.getWebApi().getQBuildApi();
        
		return this.checkArguments(args, options).then( (allArguments) => {
            var project: string = allArguments[argm.PROJECT_NAME.name];
            var definitionName: string = allArguments[argm.DEFINITION_NAME.name];
            var top: number = allArguments[argm.TOP.name];
            var definitionId: number = allArguments[argm.DEFINITION_ID.name];
            var status: string = allArguments[argm.STATUS.name];
    
            var definitions: number[] = null;
            if (definitionId) {
                definitions = [definitionId];
            }
            else if(definitionName) {
                trace.debug('No definition Id provided, checking for definitions with name ' + definitionName);
                return buildapi.getDefinitions(project, definitionName).then((defs: buildifm.DefinitionReference[]) => {
                    if(defs.length > 0) {
                        definitions = [defs[0].id];
                        return this._getBuilds(buildapi, project, definitions, buildifm.BuildStatus[status], top);   
                    }
                    else {
                        trace.debug('No definition found with name ' + definitionName);
                        throw new Error('No definition found with name ' + definitionName);
                    }
                });
            }
            return this._getBuilds(buildapi, project, definitions, buildifm.BuildStatus[status], top);
        });
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