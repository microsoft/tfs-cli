import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import am = require('../lib/auth');
import Q = require('q');
import fs = require('fs');
var trace = require('../lib/trace');

export function describe(): string {
    return 'output the version';
}

export function getCommand(): cmdm.TfCommand {
    return new Version();
}

export var isServerOperation: boolean = false;

export var hideBanner: boolean = false;

export class Version extends cmdm.TfCommand {
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<string> {
        trace('version.exec');
        var defer = Q.defer();
        var packagejson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        
        defer.resolve(packagejson.version);
        
        return <Q.Promise<string>>defer.promise;
    }

    public output(version: string): void {
        console.log('Version: ' + version);
    }
}